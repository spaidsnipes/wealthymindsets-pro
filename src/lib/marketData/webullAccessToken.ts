/**
 * THE WEBULL ACCESS TOKEN IS A SESSION, NOT A SECRET.
 *
 * ── The three-month failure this module exists to end ───────────────────────
 *
 * WM Pro read `WEBULL_ACCESS_TOKEN` out of the deployment platform and sent it
 * forever. The Founder pasted one in. The broker lane went CONNECTED and
 * listed three real accounts. Some hours later every rung — including
 * `/trading/accounts/list` and `/trading/instruments/stocks/profiles/list`,
 * which need no market-data entitlement whatsoever — answered 401
 * INVALID_TOKEN. He was told the credential was missing. He re-pasted it. It
 * worked. It died. That loop ran for about three months.
 *
 * Nothing was wrong with his account, his key, his subscription, or his
 * signature. The category was wrong. From the official SDK he supplied:
 *
 *   - `bean/access_token.py`  — a token carries `token`, `expires`, `status`.
 *   - `token_manager.py`      — `init_token()` re-mints on EVERY client init,
 *                               and polls `check_token` while status is PENDING.
 *   - `token_storage.py`      — the SDK persists the token to a local file and
 *                               overwrites it "after successful 2FA verification".
 *
 * A value with an `expires` field is a session. `WEBULL_API_KEY` and
 * `WEBULL_API_SECRET` never expire; the access token always does. WM Pro was
 * asking a human to hand-maintain the one credential designed to be
 * machine-maintained, and asking a deployment platform to store the one value
 * that is guaranteed to be stale.
 *
 * ── THE REFUSAL AT THE CENTRE OF THIS FILE ──────────────────────────────────
 *
 * This module will not report a token it cannot vouch for as usable, and it
 * will not collapse the four token states into "auth failed". PENDING is not a
 * failure — it means a mint succeeded and is waiting on the Founder's 2FA tap,
 * which is the ONE step no amount of engineering can take for him. Reporting
 * that as a generic 401 is what sent him to Webull's billing page instead of to
 * his phone.
 *
 * It also refuses to GUESS the unit of `expires`. The SDK reads it with
 * `int(...)` and never divides or adds, so its unit is not established by the
 * code the Founder gave us. `interpretExpires` therefore returns a NAMED
 * interpretation alongside the instant, and an uninterpretable value yields a
 * token that is never treated as usable. A wrong guess here would silently
 * resurrect the exact bug: a token believed live, long after it died.
 *
 * Opens no socket at import time, reads no secret, and every decision below is
 * a pure function of values passed in — so the whole state machine is testable
 * on a laptop with no credentials.
 */

import { WEBULL_SDK_CONTRACT } from "./webullSdkContract";
import { buildWebullSignedHeaders, type WebullSigningProfile } from "./adapters/webullMarketData";

/**
 * The four states `token_manager.py` enumerates, verbatim:
 *   # PENDING -> 0 / NORMAL -> 1 / INVALID -> 2 / EXPIRED -> 3
 * Named rather than booleaned, because "not usable" spreads three very
 * different remedies — wait for 2FA, re-mint, re-authorise — across one word.
 */
export const WEBULL_TOKEN_STATUSES = {
  /** Minted, but not yet approved. Needs a 2FA tap in the Webull app. */
  PENDING: "PENDING",
  /** Verified and usable until it expires. */
  NORMAL: "NORMAL",
  /** Rejected by Webull. Re-minting is the remedy, not waiting. */
  INVALID: "INVALID",
  /** Lived and died. Re-minting is the remedy. */
  EXPIRED: "EXPIRED",
} as const;

export type WebullTokenStatus =
  (typeof WEBULL_TOKEN_STATUSES)[keyof typeof WEBULL_TOKEN_STATUSES];

/** How `expires` was read. Never inferred silently — see the header. */
export const EXPIRY_INTERPRETATIONS = {
  EPOCH_MILLIS: "EPOCH_MILLIS",
  EPOCH_SECONDS: "EPOCH_SECONDS",
  /** A lifetime in seconds counted from when we observed it. */
  DURATION_SECONDS: "DURATION_SECONDS",
  /** We could not tell. The token is then never called usable. */
  UNINTERPRETABLE: "UNINTERPRETABLE",
} as const;

export type ExpiryInterpretation =
  (typeof EXPIRY_INTERPRETATIONS)[keyof typeof EXPIRY_INTERPRETATIONS];

export interface WebullAccessToken {
  readonly token: string;
  readonly status: WebullTokenStatus;
  /** Absent when `expires` could not be interpreted. */
  readonly expiresAtMs?: number;
  readonly expiryInterpretation: ExpiryInterpretation;
  /** When WM Pro observed this token. Not when Webull minted it. */
  readonly observedAtMs: number;
}

/**
 * What WM Pro may DO about a token right now. This is the value callers branch
 * on; they may not branch on `status` directly, because the remedy for PENDING
 * (wait for a human) and the remedy for EXPIRED (re-mint immediately) differ
 * and share no code path.
 */
export const TOKEN_DISPOSITIONS = {
  /** Send it. */
  USABLE: "USABLE",
  /** Still valid, but close enough to expiry to renew before the next request. */
  NEEDS_REFRESH: "NEEDS_REFRESH",
  /** Minted and waiting on the Founder's 2FA approval. NOT a fault. */
  AWAITING_2FA: "AWAITING_2FA",
  /** Dead. Mint a new one. */
  NEEDS_MINT: "NEEDS_MINT",
  /** Nothing has ever been minted in this runtime. */
  ABSENT: "ABSENT",
} as const;

export type TokenDisposition =
  (typeof TOKEN_DISPOSITIONS)[keyof typeof TOKEN_DISPOSITIONS];

/** Renew this far ahead of expiry, so a token never dies mid-request. */
export const DEFAULT_REFRESH_MARGIN_MS = 5 * 60_000;

/** Below this, a number cannot be an epoch and must be a duration. */
const SMALLEST_PLAUSIBLE_EPOCH_SECONDS = 1_000_000_000; // 2001-09-09
const LARGEST_PLAUSIBLE_EPOCH_SECONDS = 4_000_000_000; // 2096-10-02

/**
 * Turn Webull's `expires` into an instant, and SAY HOW it was read.
 *
 * The SDK never does arithmetic on this field, so its unit is not settled by
 * the source the Founder gave us. Rather than pick one and be quietly wrong
 * for months — the failure mode this whole file is an apology for — every
 * reading is labelled, and anything that fits no shape is UNINTERPRETABLE and
 * is never treated as usable.
 */
export function interpretExpires(
  raw: unknown,
  observedAtMs: number,
): { readonly expiresAtMs?: number; readonly interpretation: ExpiryInterpretation } {
  const value = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw.trim()) : NaN;
  if (!Number.isFinite(value) || value <= 0) {
    return { interpretation: EXPIRY_INTERPRETATIONS.UNINTERPRETABLE };
  }

  // Epoch milliseconds: big enough that no sane lifetime-in-seconds reaches it.
  if (value >= SMALLEST_PLAUSIBLE_EPOCH_SECONDS * 1000 && value <= LARGEST_PLAUSIBLE_EPOCH_SECONDS * 1000) {
    return { expiresAtMs: value, interpretation: EXPIRY_INTERPRETATIONS.EPOCH_MILLIS };
  }
  if (value >= SMALLEST_PLAUSIBLE_EPOCH_SECONDS && value <= LARGEST_PLAUSIBLE_EPOCH_SECONDS) {
    return { expiresAtMs: value * 1000, interpretation: EXPIRY_INTERPRETATIONS.EPOCH_SECONDS };
  }
  // A plain lifetime. Bounded at one year: a "duration" larger than that is
  // more likely a misread epoch, and treating it as a lifetime would hand us a
  // token we believe in for a decade.
  if (value < SMALLEST_PLAUSIBLE_EPOCH_SECONDS && value <= 365 * 24 * 3600) {
    return {
      expiresAtMs: observedAtMs + value * 1000,
      interpretation: EXPIRY_INTERPRETATIONS.DURATION_SECONDS,
    };
  }
  return { interpretation: EXPIRY_INTERPRETATIONS.UNINTERPRETABLE };
}

/** Accept only the four statuses the SDK enumerates. Anything else is unusable. */
export function parseTokenStatus(raw: unknown): WebullTokenStatus | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toUpperCase();
  return normalized in WEBULL_TOKEN_STATUSES ? (normalized as WebullTokenStatus) : null;
}

/**
 * Read a `{token, expires, status}` envelope.
 *
 * Returns null rather than a half-built token. `token_manager.py` treats a
 * response missing any of the three as an error, and so does this: a token
 * object with an absent status is exactly the kind of value that gets sent
 * anyway by a caller that only checked for truthiness.
 */
export function parseTokenEnvelope(payload: unknown, observedAtMs: number): WebullAccessToken | null {
  if (!payload || typeof payload !== "object") return null;
  const envelope = payload as { token?: unknown; expires?: unknown; status?: unknown };
  const token = typeof envelope.token === "string" ? envelope.token.trim() : "";
  const status = parseTokenStatus(envelope.status);
  if (!token || !status) return null;

  const { expiresAtMs, interpretation } = interpretExpires(envelope.expires, observedAtMs);
  return { token, status, expiresAtMs, expiryInterpretation: interpretation, observedAtMs };
}

/**
 * What to do with this token, now.
 *
 * An UNINTERPRETABLE expiry yields NEEDS_REFRESH rather than USABLE: we hold a
 * token we cannot date, so we renew it rather than trust it. That is the
 * conservative direction — the opposite choice is how a dead token gets sent
 * for hours while the surface says CONNECTED.
 */
export function tokenDisposition(
  token: WebullAccessToken | null | undefined,
  nowMs: number,
  refreshMarginMs: number = DEFAULT_REFRESH_MARGIN_MS,
): TokenDisposition {
  if (!token) return TOKEN_DISPOSITIONS.ABSENT;
  if (token.status === WEBULL_TOKEN_STATUSES.PENDING) return TOKEN_DISPOSITIONS.AWAITING_2FA;
  if (token.status !== WEBULL_TOKEN_STATUSES.NORMAL) return TOKEN_DISPOSITIONS.NEEDS_MINT;
  if (token.expiresAtMs === undefined) return TOKEN_DISPOSITIONS.NEEDS_REFRESH;
  if (nowMs >= token.expiresAtMs) return TOKEN_DISPOSITIONS.NEEDS_MINT;
  if (nowMs >= token.expiresAtMs - Math.max(0, refreshMarginMs)) return TOKEN_DISPOSITIONS.NEEDS_REFRESH;
  return TOKEN_DISPOSITIONS.USABLE;
}

/**
 * The sentence a surface prints about the Webull session.
 *
 * Lives here, beside the state machine, because the alternative — a component
 * assembling it out of the fields — is how a UI ends up printing "connected"
 * over a token that expired forty minutes ago. AWAITING_2FA in particular must
 * name the Webull app, because that is an instruction only the Founder can
 * carry out and a generic auth error sends him to the wrong place entirely.
 */
export function describeTokenState(
  token: WebullAccessToken | null | undefined,
  nowMs: number,
  refreshMarginMs: number = DEFAULT_REFRESH_MARGIN_MS,
): string {
  const disposition = tokenDisposition(token, nowMs, refreshMarginMs);
  switch (disposition) {
    case TOKEN_DISPOSITIONS.ABSENT:
      return "No Webull session yet. WM Pro will mint one from the App Key and Secret on the next request; no manual step is required.";
    case TOKEN_DISPOSITIONS.AWAITING_2FA:
      return "Webull session minted and waiting for your 2FA approval in the Webull app. This is not an error and no credential is missing — approve it there and this clears by itself.";
    case TOKEN_DISPOSITIONS.NEEDS_MINT:
      return `Webull session is ${token?.status === WEBULL_TOKEN_STATUSES.INVALID ? "INVALID" : "EXPIRED"}. WM Pro will mint a replacement from the App Key and Secret; the deployment platform holds nothing that needs changing.`;
    case TOKEN_DISPOSITIONS.NEEDS_REFRESH:
      return token?.expiresAtMs === undefined
        ? "Webull session is live but Webull's expiry field could not be interpreted, so WM Pro will renew it rather than assume it is still good."
        : `Webull session expires in ${Math.max(0, Math.round((token.expiresAtMs - nowMs) / 1000))}s; WM Pro will renew it before the next request.`;
    default:
      return `Webull session is live${
        token?.expiresAtMs !== undefined
          ? ` for another ${Math.round((token.expiresAtMs - nowMs) / 60_000)}m`
          : ""
      }. WM Pro minted it from the App Key and Secret, so it renews itself.`;
  }
}

/**
 * Where a minted session is kept between requests.
 *
 * An interface rather than a concrete store because the Worker wants KV or a
 * Durable Object and the test suite wants a plain object, and because the
 * whole point of this module is that the token does NOT live in the deployment
 * platform's environment.
 */
export interface WebullTokenStore {
  read(): Promise<WebullAccessToken | null>;
  write(token: WebullAccessToken): Promise<void>;
}

/** An in-memory store. Correct for one isolate; loses the token on eviction. */
export function inMemoryTokenStore(initial: WebullAccessToken | null = null): WebullTokenStore {
  let held = initial;
  return {
    async read() {
      return held;
    },
    async write(token) {
      held = token;
    },
  };
}

export interface WebullTokenConfig {
  readonly appKey: string;
  readonly appSecret: string;
  readonly apiHost?: string;
  readonly timeoutMs?: number;
  readonly now?: () => Date;
  readonly nonce?: () => string;
  /** The SDK hard-selects HMAC-SHA256 for every request it signs. */
  readonly signingProfile?: WebullSigningProfile;
}

export const MINT_OUTCOMES = {
  MINTED: "MINTED",
  /** Webull answered, but not with a token we can use. */
  REFUSED: "REFUSED",
  /** We never got an answer. */
  UNREACHABLE: "UNREACHABLE",
} as const;

export type MintOutcome = (typeof MINT_OUTCOMES)[keyof typeof MINT_OUTCOMES];

export interface MintResult {
  readonly outcome: MintOutcome;
  readonly token: WebullAccessToken | null;
  /** Webull's own words where it gave any. Never interpreted here. */
  readonly note: string;
  readonly httpStatus?: number;
}

const DEFAULT_HOST = "api.webull.com";

function cleanHost(host: string | undefined): string {
  return (host || DEFAULT_HOST).replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function isoSeconds(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * `common.json_dumps_compact` — separators (',',':'), no ASCII escaping.
 * The body must be serialised ONCE and both signed and sent, or the digest
 * describes a payload that never went on the wire.
 */
export function compactJson(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * Mint or renew a session against Webull, signed with the App Key and Secret.
 *
 * `previousToken` is passed through to `/auth/tokens/create` exactly as
 * `token_manager.py` does — it hands the local token back so Webull can extend
 * the existing session rather than start a fresh 2FA cycle every time. Omitting
 * it is what would make the Founder re-approve 2FA on every cold start.
 */
export async function mintWebullAccessToken(
  fetchImpl: typeof fetch,
  config: WebullTokenConfig,
  previousToken?: string,
  endpoint: "CREATE_TOKEN" | "REFRESH_TOKEN" = "CREATE_TOKEN",
): Promise<MintResult> {
  const appKey = config.appKey?.trim();
  const appSecret = config.appSecret?.trim();
  if (!appKey || !appSecret) {
    return {
      outcome: MINT_OUTCOMES.REFUSED,
      token: null,
      note: "Webull App Key and Secret are not both configured, so no session could be minted. These two never expire and are the only Webull values that belong in the deployment platform.",
    };
  }

  const contract = WEBULL_SDK_CONTRACT[endpoint];
  const now = config.now || (() => new Date());
  const host = cleanHost(config.apiHost);
  const timeoutMs = Math.max(250, Math.min(30_000, config.timeoutMs ?? 8_000));
  const nonce = (config.nonce || (() => crypto.randomUUID()))();
  const body = compactJson(previousToken ? { token: previousToken } : {});

  const headers = buildWebullSignedHeaders({
    path: contract.path,
    query: {},
    appKey,
    appSecret,
    host,
    timestamp: isoSeconds(now()),
    nonce,
    body,
    apiVersion: contract.apiVersion,
    // The SDK's `_refresh_sign_headers` hard-assigns `sha_hmac256_new`,
    // discarding whatever signer the caller chose. SHA-1 is unreachable in
    // Webull's own client, so a token request must not offer it.
    profile: config.signingProfile ?? "sdk-sha256",
  });
  headers["Content-Type"] = "application/json";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`https://${host}${contract.path}`, {
      method: "POST",
      redirect: "manual",
      cache: "no-store",
      headers,
      body,
      signal: controller.signal,
    });

    const observedAtMs = now().getTime();
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const code = payload && typeof payload === "object"
        ? String((payload as Record<string, unknown>).code ?? "").trim()
        : "";
      return {
        outcome: MINT_OUTCOMES.REFUSED,
        token: null,
        httpStatus: response.status,
        note:
          `Webull refused to mint a session: HTTP ${response.status}` +
          (code ? ` (${code})` : " with no error code in the body") +
          ". Reported verbatim and not interpreted here — this is a statement about WM Pro's request or the App Key pair, not proof about any market-data subscription.",
      };
    }

    const token = parseTokenEnvelope(payload, observedAtMs);
    if (!token) {
      return {
        outcome: MINT_OUTCOMES.REFUSED,
        token: null,
        httpStatus: response.status,
        note: "Webull answered HTTP 200 but the body was not a usable {token, expires, status} envelope, so no session was accepted.",
      };
    }
    return {
      outcome: MINT_OUTCOMES.MINTED,
      token,
      httpStatus: response.status,
      note:
        token.status === WEBULL_TOKEN_STATUSES.PENDING
          ? "Session minted and PENDING your 2FA approval in the Webull app. Nothing is missing and no manual step is required beyond that approval."
          : `Session minted with status ${token.status}.`,
    };
  } catch {
    return {
      outcome: controller.signal.aborted ? MINT_OUTCOMES.UNREACHABLE : MINT_OUTCOMES.UNREACHABLE,
      token: null,
      note: controller.signal.aborted
        ? `Webull did not answer the session request within ${timeoutMs} ms; no session was minted.`
        : "Webull could not be reached for a session request; no session was minted.",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * ASK WEBULL WHETHER THE 2FA TAP HAS LANDED.
 *
 * ── The defect this closes ──────────────────────────────────────────────────
 *
 * `ensureWebullAccessToken` correctly refused to re-mint over a PENDING
 * session — re-minting would restart the 2FA cycle on every request and the
 * Founder would drown in approval prompts. But refusing to re-mint while ALSO
 * never asking `/auth/tokens/check` turned that caution into a dead end: the
 * isolate held PENDING forever and had no mechanism by which the Founder's tap
 * could ever become visible to it.
 *
 * Measured 2026-09-21. He approved the request in the Webull app and said so.
 * Both probes still answered AWAITING_2FA, because nothing in WM Pro was
 * capable of noticing. Not a stale cache — an absent question.
 *
 * `token_manager.py` polls `check_token` in a `while True` loop until status
 * leaves PENDING. WM Pro does NOT copy the loop: this runs inside a request
 * handler, and blocking one for a human to reach for their phone spends the
 * request budget on waiting. One check per request is enough — the next probe
 * asks again, and the state converges the moment he taps.
 *
 * ── What this refuses to do ─────────────────────────────────────────────────
 *
 * An unreachable Webull returns the token UNCHANGED, not a fault. "We could not
 * ask" and "the answer was no" are different facts, and collapsing them is the
 * same category error that cost three months.
 */
export async function checkWebullAccessToken(
  fetchImpl: typeof fetch,
  config: WebullTokenConfig,
  pendingToken: string,
): Promise<MintResult> {
  const appKey = config.appKey?.trim();
  const appSecret = config.appSecret?.trim();
  if (!appKey || !appSecret || !pendingToken?.trim()) {
    return {
      outcome: MINT_OUTCOMES.REFUSED,
      token: null,
      note: "No pending Webull session to check, or the App Key pair is not configured.",
    };
  }

  const contract = WEBULL_SDK_CONTRACT.CHECK_TOKEN;
  const now = config.now || (() => new Date());
  const host = cleanHost(config.apiHost);
  const timeoutMs = Math.max(250, Math.min(30_000, config.timeoutMs ?? 8_000));
  // check_token_request.py: POST, body_params={}, set_token() adds "token".
  const body = compactJson({ token: pendingToken });

  const headers = buildWebullSignedHeaders({
    path: contract.path,
    query: {},
    appKey,
    appSecret,
    host,
    timestamp: isoSeconds(now()),
    nonce: (config.nonce || (() => crypto.randomUUID()))(),
    body,
    apiVersion: contract.apiVersion,
    profile: config.signingProfile ?? "sdk-sha256",
  });
  headers["Content-Type"] = "application/json";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`https://${host}${contract.path}`, {
      method: "POST",
      redirect: "manual",
      cache: "no-store",
      headers,
      body,
      signal: controller.signal,
    });

    const observedAtMs = now().getTime();
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        outcome: MINT_OUTCOMES.REFUSED,
        token: null,
        httpStatus: response.status,
        // Deliberately not called a credential fault. This endpoint needs no
        // market data, so it says nothing about a subscription either.
        note: `Webull answered HTTP ${response.status} when asked whether the pending session had been approved. The session is unchanged; this is a statement about that one question, not about the App Key pair or any data package.`,
      };
    }

    const token = parseTokenEnvelope(payload, observedAtMs);
    if (!token) {
      return {
        outcome: MINT_OUTCOMES.REFUSED,
        token: null,
        httpStatus: response.status,
        note: "Webull answered HTTP 200 to the session check but the body was not a usable {token, expires, status} envelope, so the pending session was left as it was.",
      };
    }
    return {
      outcome: MINT_OUTCOMES.MINTED,
      token,
      httpStatus: response.status,
      note:
        token.status === WEBULL_TOKEN_STATUSES.PENDING
          ? "Checked with Webull: the session is still waiting on your 2FA approval in the Webull app."
          : `Checked with Webull: the session is now ${token.status}.`,
    };
  } catch {
    return {
      outcome: MINT_OUTCOMES.UNREACHABLE,
      token: null,
      note: "Webull could not be reached to check whether the pending session was approved. The session is unchanged and no conclusion is drawn.",
    };
  } finally {
    clearTimeout(timer);
  }
}

export interface EnsureTokenResult {
  readonly token: WebullAccessToken | null;
  readonly disposition: TokenDisposition;
  /** True when this call went to Webull rather than serving what was stored. */
  readonly minted: boolean;
  readonly note: string;
}

/**
 * The call every Webull request makes first.
 *
 * Serves the stored session when it is good, renews it when it is close to
 * expiry, mints a fresh one when it is dead, and — crucially — does NOT mint
 * while a session is PENDING. Re-minting over a pending token would restart
 * the 2FA cycle on every request, so the Founder would face an unending stream
 * of approval prompts and never reach NORMAL. That is a real failure mode, and
 * declining to act is the correct action.
 */
export async function ensureWebullAccessToken(
  fetchImpl: typeof fetch,
  config: WebullTokenConfig,
  store: WebullTokenStore,
  refreshMarginMs: number = DEFAULT_REFRESH_MARGIN_MS,
): Promise<EnsureTokenResult> {
  const nowMs = (config.now || (() => new Date()))().getTime();
  const held = await store.read();
  const disposition = tokenDisposition(held, nowMs, refreshMarginMs);

  if (disposition === TOKEN_DISPOSITIONS.USABLE) {
    return { token: held, disposition, minted: false, note: describeTokenState(held, nowMs, refreshMarginMs) };
  }
  if (disposition === TOKEN_DISPOSITIONS.AWAITING_2FA) {
    // Still does not re-mint — that would restart the 2FA cycle every request.
    // But it must ASK, or the Founder's tap has no route into this runtime.
    // Refusing to re-mint and refusing to check is not caution, it is a dead
    // end, and it is the one WM Pro sat in on 2026-09-21 while he waited.
    const checked = await checkWebullAccessToken(fetchImpl, config, held!.token);

    if (!checked.token) {
      // Could not ask. That is NOT evidence the approval failed — hold the
      // pending session and report it unchanged rather than inventing a fault.
      return {
        token: held,
        disposition,
        minted: false,
        note: `${describeTokenState(held, nowMs, refreshMarginMs)} (${checked.note})`,
      };
    }

    await store.write(checked.token);
    const rechecked = tokenDisposition(checked.token, nowMs, refreshMarginMs);

    // An approval that arrived on a session Webull has since retired leaves us
    // INVALID/EXPIRED. Minting immediately is the remedy, and doing it here
    // means the caller is not sent away holding a token nobody can use.
    if (rechecked === TOKEN_DISPOSITIONS.NEEDS_MINT) {
      const reminted = await mintWebullAccessToken(fetchImpl, config, undefined, "CREATE_TOKEN");
      if (reminted.token) await store.write(reminted.token);
      return {
        token: reminted.token,
        disposition: tokenDisposition(reminted.token, nowMs, refreshMarginMs),
        minted: true,
        note: reminted.note,
      };
    }

    return { token: checked.token, disposition: rechecked, minted: false, note: checked.note };
  }

  const result = await mintWebullAccessToken(
    fetchImpl,
    config,
    held?.token,
    disposition === TOKEN_DISPOSITIONS.NEEDS_REFRESH ? "REFRESH_TOKEN" : "CREATE_TOKEN",
  );
  if (result.token) await store.write(result.token);

  return {
    token: result.token,
    disposition: tokenDisposition(result.token, nowMs, refreshMarginMs),
    minted: true,
    note: result.note,
  };
}
