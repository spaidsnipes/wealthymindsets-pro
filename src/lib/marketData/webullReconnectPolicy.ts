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
 */

export const MAX_ATTEMPTS = 8;
export const BASE_DELAY_MS = 1_000;
export const MAX_DELAY_MS = 30_000;
/** A connection that lived this long counts as healthy again. */
export const STABLE_MS = 30_000;

export interface ReconnectState {
  readonly attempts: number;
  readonly credentialRejected: boolean;
  /** receivedAt of the last print before the most recent drop, if any. */
  readonly dropAfter: string | null;
  readonly lastQuoteAt: string | null;
  readonly gaps: readonly { readonly from: string; readonly to: string }[];
}

export const initialReconnectState: ReconnectState = {
  attempts: 0, credentialRejected: false, dropAfter: null, lastQuoteAt: null, gaps: [],
};

export type StreamSignal =
  | { readonly kind: "handshake"; readonly accepted: boolean; readonly credentialRejected: boolean }
  | { readonly kind: "quote"; readonly receivedAt: string }
  | { readonly kind: "ended"; readonly upMs: number };

export function observe(state: ReconnectState, s: StreamSignal): ReconnectState {
  switch (s.kind) {
    case "handshake":
      return { ...state, credentialRejected: !s.accepted && s.credentialRejected };
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
  | { readonly kind: "PAUSED"; readonly note: string };

export function backoffDelay(attempt: number): number {
  return Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** Math.max(0, attempt));
}

/** Called once each time the stream ends. */
export function nextStep(state: ReconnectState, userStopped: boolean): NextStep {
  if (userStopped) return { kind: "STOPPED" };
  if (state.credentialRejected) {
    return { kind: "REAUTHORIZE", note: "Webull no longer accepts this app's authorization. Reauthorize once; nothing retries until then." };
  }
  if (state.attempts >= MAX_ATTEMPTS) {
    return { kind: "PAUSED", note: `Reconnect paused after ${MAX_ATTEMPTS} attempts in a row. Press Go live to try again.` };
  }
  return { kind: "RETRY", delayMs: backoffDelay(state.attempts), attempt: state.attempts + 1 };
}

export function recordAttempt(state: ReconnectState): ReconnectState {
  return { ...state, attempts: state.attempts + 1 };
}
