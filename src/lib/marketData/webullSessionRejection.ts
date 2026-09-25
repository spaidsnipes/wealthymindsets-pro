/**
 * WHEN WEBULL REFUSES THE SESSION WE SENT.
 *
 * ── The continuity gap this closes (Garden 11: reuse valid authorization,
 *    calm REAUTHORIZE only when truly required) ─────────────────────────────
 *
 * `ensureWebullAccessToken` decides what to do with a held session from the
 * session's OWN fields — status and expiry. It never hears what Webull said
 * when the session was actually USED. So a session that Webull has retired
 * early (revoked in the app, superseded by another client, reset on Webull's
 * side) still reads NORMAL-and-unexpired in the store, and every lane keeps
 * sending it:
 *
 *   ticks   → 401 INVALID_TOKEN, next poll → the SAME session → 401 …
 *   stream  → CONNACK 0, subscribe 401 INVALID_TOKEN, reconnect → SAME → 401 …
 *   account → 401, next status probe → SAME → 401 …
 *
 * until the stored expiry finally passes — hours, for a token that died in
 * minutes. The reconnect policy dutifully retries, but a retry that re-sends a
 * dead session is not a retry, it is a loop.
 *
 * ── What this module does, and the three things it refuses to do ─────────────
 *
 * On an answer that NAMES the session (`INVALID_TOKEN`, the code Webull was
 * measured sending on 2026-09-12, 09-20 and 09-21) and only when WM Pro
 * actually SENT one, the held session is marked INVALID in the shared store.
 * The next request through `ensureWebullAccessToken` then mints — the SDK's
 * own remedy, with no human step unless Webull asks for its 2FA tap.
 *
 *   1. It never retires on an answer that does not name the session. A 403
 *      (MARKET_DATA_NOT_SUBSCRIBED or otherwise), a 417 INVALID_SESSION (that
 *      is the MQTT socket id, not the token), a 429, a 5xx, a timeout, or a
 *      bare 401 with no code — none of them is evidence against the session,
 *      and throwing a good session away can cost the Founder a 2FA prompt.
 *   2. It never clobbers a session it did not see rejected. The write is
 *      compare-and-retire: if the store already holds a different session
 *      (another request re-minted first), nothing is written.
 *   3. It never re-mints in a loop. At most one retirement per cooldown per
 *      runtime. A session minted AFTER a retirement that is refused again
 *      inside the cooldown means the app's authorization itself is in
 *      question — that, and only that, is REAUTHORIZE: one calm state, with
 *      nothing retried behind the Founder's back.
 *
 * No token value is ever placed in a note, a verdict or a log.
 */
import {
  WEBULL_TOKEN_STATUSES,
  type WebullTokenStore,
} from "./webullAccessToken";

/**
 * The provider codes that name the SESSION (`x-access-token`) rather than the
 * app key, the signature, the socket, or the entitlement. Exactly the code
 * Webull has been measured returning; widening it needs a new measurement.
 */
export const WEBULL_SESSION_REJECTION_CODES: ReadonlySet<string> = new Set(["INVALID_TOKEN"]);

export type WebullAuthAnswer =
  /** Not an answer about the session at all. Nothing to retire. */
  | "NOT_SESSION"
  /** Webull named the session, and WM Pro sent one: that session is dead. */
  | "SESSION_REJECTED"
  /** Webull named the session, but WM Pro sent none. Minting is the remedy. */
  | "NO_SESSION_SENT";

export function classifyWebullAuthAnswer(input: {
  readonly httpStatus: number;
  readonly providerCode: string | null | undefined;
  readonly sessionSent: boolean;
}): WebullAuthAnswer {
  const code = typeof input.providerCode === "string" ? input.providerCode.trim().toUpperCase() : "";
  if (!WEBULL_SESSION_REJECTION_CODES.has(code)) return "NOT_SESSION";
  // A 2xx carrying the code in a body is not a rejection of anything.
  if (input.httpStatus >= 200 && input.httpStatus < 300) return "NOT_SESSION";
  return input.sessionSent ? "SESSION_REJECTED" : "NO_SESSION_SENT";
}

/** One retirement per this window per runtime; a second refusal inside it is REAUTHORIZE. */
export const SESSION_RETIRE_COOLDOWN_MS = 10 * 60_000;

export type SessionRejectionVerdict =
  | { readonly kind: "NOT_SESSION"; readonly note: string }
  | { readonly kind: "REMINT"; readonly note: string }
  | { readonly kind: "ALREADY_REPLACED"; readonly note: string }
  | { readonly kind: "REAUTHORIZE"; readonly note: string };

/** Mutable, per-runtime memory of the last retirement. Injected for tests. */
export interface SessionRetirementLedger {
  lastRetiredAtMs: number | null;
}

const runtimeLedger: SessionRetirementLedger = { lastRetiredAtMs: null };

export function webullSessionRetirementLedger(): SessionRetirementLedger {
  return runtimeLedger;
}

/**
 * Apply one Webull answer to the shared session store.
 *
 * `rejectedToken` is the exact session value that was sent with the refused
 * request. It is compared, never printed.
 */
export async function retireRejectedWebullSession(
  store: WebullTokenStore,
  input: {
    readonly answer: WebullAuthAnswer;
    readonly rejectedToken: string | undefined;
    readonly nowMs: number;
    readonly ledger?: SessionRetirementLedger;
    readonly cooldownMs?: number;
  },
): Promise<SessionRejectionVerdict> {
  if (input.answer === "NOT_SESSION") {
    return { kind: "NOT_SESSION", note: "This answer does not name the session, so the held session was kept." };
  }
  if (input.answer === "NO_SESSION_SENT" || !input.rejectedToken) {
    return {
      kind: "NOT_SESSION",
      note: "Webull named the session, but this request carried none — there was nothing to retire. The lane mints one before its next request.",
    };
  }

  const ledger = input.ledger ?? runtimeLedger;
  const cooldownMs = Math.max(0, input.cooldownMs ?? SESSION_RETIRE_COOLDOWN_MS);

  let held;
  try {
    held = await store.read();
  } catch {
    held = null;
  }
  if (!held || held.token !== input.rejectedToken) {
    return {
      kind: "ALREADY_REPLACED",
      note: "Webull refused a session that is no longer the one held — it was already replaced, so nothing was retired.",
    };
  }
  if (held.status === WEBULL_TOKEN_STATUSES.INVALID) {
    return {
      kind: "REMINT",
      note: "This session was already retired; the next request mints a fresh one.",
    };
  }

  if (ledger.lastRetiredAtMs !== null && input.nowMs - ledger.lastRetiredAtMs < cooldownMs) {
    // A session minted after the last retirement was refused again, inside
    // the window. Minting a third would be a loop against the broker and,
    // if Webull answers PENDING, a stream of 2FA prompts on the Founder's
    // phone. The honest state is the calm one: the authorization itself
    // needs his attention. Nothing is retried until the window passes.
    return {
      kind: "REAUTHORIZE",
      note:
        "Webull refused a freshly minted session as well, so the app's authorization itself is in question. " +
        "Reauthorize WM Pro in Webull once; nothing re-mints automatically until then.",
    };
  }

  try {
    await store.write({ ...held, status: WEBULL_TOKEN_STATUSES.INVALID });
  } catch {
    // A store that cannot be written keeps serving the dead session; say so
    // rather than claim a retirement that did not happen.
    return {
      kind: "NOT_SESSION",
      note: "Webull refused the session, but the session store could not be updated, so it could not be retired.",
    };
  }
  ledger.lastRetiredAtMs = input.nowMs;
  return {
    kind: "REMINT",
    note:
      "Webull refused the session this request carried (INVALID_TOKEN). It was retired, and the next request mints a fresh one from the App Key and Secret — " +
      "no re-entry by anyone, and only Webull's own 2FA tap if it asks for one.",
  };
}

/**
 * The one call a Webull lane makes after a refused request: classify the
 * answer and, only if it names the session WM Pro sent, retire that session.
 */
export async function settleWebullRefusal(
  store: WebullTokenStore,
  input: {
    readonly httpStatus: number;
    readonly providerCode: string | null | undefined;
    /** The session value that went out as `x-access-token`, if any. Compared, never printed. */
    readonly sessionToken: string | undefined;
    readonly nowMs: number;
    readonly ledger?: SessionRetirementLedger;
  },
): Promise<SessionRejectionVerdict> {
  const answer = classifyWebullAuthAnswer({
    httpStatus: input.httpStatus,
    providerCode: input.providerCode,
    sessionSent: Boolean(input.sessionToken),
  });
  return retireRejectedWebullSession(store, {
    answer,
    rejectedToken: input.sessionToken,
    nowMs: input.nowMs,
    ledger: input.ledger,
  });
}
