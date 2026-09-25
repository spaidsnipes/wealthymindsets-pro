/**
 * WEBULL CONTINUITY — reconnect, resubscribe, gap, reauthorize (finish-line
 * shift §23/§36). PURE. The one stream owner (WebullRealTimeStrip) asks this
 * module what to do when its stream ends; it never decides on its own.
 *
 *   · Credential rejected by Webull → REAUTHORIZE. One calm state, NO retry:
 *     a revoked/expired authorization cannot be fixed by knocking again, and
 *     a reconnect storm against a broker is its own defect.
 *   · Trader pressed Stop → STOPPED. Never reopened behind their back.
 *   · Anything else (socket drop, stream end, subscribe refused on a dead
 *     session) → RETRY after a bounded exponential backoff (1 s … 30 s),
 *     at most MAX_ATTEMPTS in a row, then PAUSED with a plain sentence.
 *     Every retry is a NEW stream request, so the server repeats the
 *     handshake AND the subscribe — resubscription is explicit, never assumed.
 *   · The attempt counter resets only after a connection STAYED UP for
 *     STABLE_MS — a stream that delivers one print and drops every second
 *     keeps backing off instead of hammering the broker.
 *   · GAP: when prints resume after a drop, the span from the last print
 *     before the drop to the first print after it is RECORDED. Nothing fills
 *     it — no synthetic tick is ever made.
 *
 * WHAT IS NOT A DROP (Garden 11 audit, 2026-09-25). "Anything else → RETRY"
 * was too wide: it retried answers that do not change on retry, and it could
 * not see answers the route gave before Webull was ever contacted.
 *
 *   · Subscribe refused with 403 (measured: MARKET_DATA_NOT_SUBSCRIBED, on
 *     every subType × category) → HELD. The same signed request gets the
 *     same answer; eight reconnects in a row against it is a small storm
 *     wearing a "Reconnecting…" label. Not REAUTHORIZE either — nothing about
 *     the credential was refused. Press Go live to ask again.
 *   · Route gate UNCONFIGURED / NO_SOCKETS → HELD. A deployment fact.
 *   · Route gate AWAITING_2FA → AWAITING_APPROVAL: a calm, slower re-ask
 *     (each re-ask lets the server CHECK the pending session — it never
 *     mints over it), bounded by the same attempt cap.
 *   · Session refused on subscribe (401 INVALID_TOKEN) → the server retires
 *     that session (webullSessionRejection.ts) and the RETRY carries a fresh
 *     one. Only when the route reports a freshly minted session was refused
 *     too does this become REAUTHORIZE.
 */

export const MAX_ATTEMPTS = 8;
export const BASE_DELAY_MS = 1_000;
export const MAX_DELAY_MS = 30_000;
/** A connection that lived this long counts as healthy again. */
export const STABLE_MS = 30_000;
/** How often a 2FA wait re-asks. Slow on purpose: a human is reaching for a phone. */
export const APPROVAL_POLL_MS = 15_000;

/**
 * A fact about THIS connection that changes what "next" means. Cleared when
 * the next connection opens — each attempt is judged on its own answers.
 */
export type ConnectionRefusal =
  | { readonly kind: "ENTITLEMENT"; readonly status: number; readonly providerCode: string | null }
  | { readonly kind: "GATE"; readonly gate: "UNCONFIGURED" | "NO_SOCKETS" }
  | { readonly kind: "AWAITING_2FA" }
  | { readonly kind: "SESSION_REAUTHORIZE" };

export interface ReconnectState {
  readonly attempts: number;
  readonly credentialRejected: boolean;
  /** receivedAt of the last print before the most recent drop, if any. */
  readonly dropAfter: string | null;
  readonly lastQuoteAt: string | null;
  readonly gaps: readonly { readonly from: string; readonly to: string }[];
  readonly refusal: ConnectionRefusal | null;
}

export const initialReconnectState: ReconnectState = {
  attempts: 0, credentialRejected: false, dropAfter: null, lastQuoteAt: null, gaps: [], refusal: null,
};

export type StreamSignal =
  /** A new connection is being opened; the previous one's answers no longer apply. */
  | { readonly kind: "opening" }
  | { readonly kind: "handshake"; readonly accepted: boolean; readonly credentialRejected: boolean }
  | { readonly kind: "subscribe"; readonly subscribed: boolean; readonly status: number; readonly providerCode: string | null }
  | { readonly kind: "gate"; readonly gate: "UNCONFIGURED" | "NO_SOCKETS" | "AWAITING_2FA" }
  | { readonly kind: "session"; readonly verdict: "REMINT" | "ALREADY_REPLACED" | "REAUTHORIZE" }
  | { readonly kind: "quote"; readonly receivedAt: string }
  | { readonly kind: "ended"; readonly upMs: number };

export function observe(state: ReconnectState, s: StreamSignal): ReconnectState {
  switch (s.kind) {
    case "opening":
      return { ...state, credentialRejected: false, refusal: null };
    case "handshake":
      return { ...state, credentialRejected: !s.accepted && s.credentialRejected };
    case "subscribe":
      // Only a 403 is an answer that repeats verbatim on retry. 401 (session:
      // retired server-side, so the retry carries a fresh one), 417 (socket
      // id: lifecycle), 429 and 5xx (transient) all stay on the RETRY path.
      return !s.subscribed && s.status === 403
        ? { ...state, refusal: { kind: "ENTITLEMENT", status: s.status, providerCode: s.providerCode } }
        : state;
    case "gate":
      return {
        ...state,
        refusal: s.gate === "AWAITING_2FA" ? { kind: "AWAITING_2FA" } : { kind: "GATE", gate: s.gate },
      };
    case "session":
      return s.verdict === "REAUTHORIZE" ? { ...state, refusal: { kind: "SESSION_REAUTHORIZE" } } : state;
    case "quote": {
      const gaps = state.dropAfter ? [...state.gaps, { from: state.dropAfter, to: s.receivedAt }].slice(-20) : state.gaps;
      return { ...state, dropAfter: null, lastQuoteAt: s.receivedAt, gaps };
    }
    case "ended":
      return { ...state, attempts: s.upMs >= STABLE_MS ? 0 : state.attempts, dropAfter: state.dropAfter ?? state.lastQuoteAt };
  }
}

export type NextStep =
  | { readonly kind: "REAUTHORIZE"; readonly note: string }
  | { readonly kind: "STOPPED" }
  | { readonly kind: "RETRY"; readonly delayMs: number; readonly attempt: number }
  /** Not a drop: an answer that repeats on retry. Nothing reconnects on its own. */
  | { readonly kind: "HELD"; readonly note: string }
  /** Webull is waiting on the Founder's tap; re-ask slowly, never re-mint. */
  | { readonly kind: "AWAITING_APPROVAL"; readonly delayMs: number; readonly attempt: number; readonly note: string }
  | { readonly kind: "PAUSED"; readonly note: string };

export function backoffDelay(attempt: number): number {
  return Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** Math.max(0, attempt));
}

/** True when the owner should schedule another open after `delayMs`. */
export function schedulesReopen(step: NextStep): step is Extract<NextStep, { readonly delayMs: number }> {
  return step.kind === "RETRY" || step.kind === "AWAITING_APPROVAL";
}

/** Called once each time the stream ends. */
export function nextStep(state: ReconnectState, userStopped: boolean): NextStep {
  if (userStopped) return { kind: "STOPPED" };
  if (state.credentialRejected) {
    return { kind: "REAUTHORIZE", note: "Webull no longer accepts this app's authorization. Reauthorize once; nothing retries until then." };
  }
  const refusal = state.refusal;
  if (refusal?.kind === "SESSION_REAUTHORIZE") {
    return {
      kind: "REAUTHORIZE",
      note: "Webull refused a freshly minted session as well, so the app's authorization itself needs attention. Reauthorize once; nothing retries until then.",
    };
  }
  if (refusal?.kind === "GATE") {
    return {
      kind: "HELD",
      note: refusal.gate === "UNCONFIGURED"
        ? "This deployment has no Webull key pair, so the real-time lane was never opened. Nothing reconnects until that changes."
        : "This runtime cannot open the socket Webull's real-time host needs, so it was never contacted. Nothing reconnects from here.",
    };
  }
  if (refusal?.kind === "ENTITLEMENT") {
    const code = refusal.providerCode ? ` ${refusal.providerCode}` : "";
    return {
      kind: "HELD",
      note:
        `Webull refused the real-time subscription (HTTP ${refusal.status}${code}). ` +
        "Not retried automatically: the same request gets the same answer, and this was not a connection drop. " +
        "It is Webull's answer to this request, not a statement that anything must be bought. Press Go live to ask again.",
    };
  }
  if (state.attempts >= MAX_ATTEMPTS) {
    return { kind: "PAUSED", note: `Reconnect paused after ${MAX_ATTEMPTS} attempts in a row. Press Go live to try again.` };
  }
  if (refusal?.kind === "AWAITING_2FA") {
    return {
      kind: "AWAITING_APPROVAL",
      delayMs: Math.max(APPROVAL_POLL_MS, backoffDelay(state.attempts)),
      attempt: state.attempts + 1,
      note: "Webull is waiting for your approval in the Webull app. WM Pro checks again on its own and never mints over a pending approval.",
    };
  }
  return { kind: "RETRY", delayMs: backoffDelay(state.attempts), attempt: state.attempts + 1 };
}

export function recordAttempt(state: ReconnectState): ReconnectState {
  return { ...state, attempts: state.attempts + 1 };
}
