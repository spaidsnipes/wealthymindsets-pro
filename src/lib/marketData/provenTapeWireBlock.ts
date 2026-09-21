/**
 * provenTapeWireBlock — the ONE place WM is allowed to conclude that a missing
 * per-trade tape is the WIRE's doing rather than the CLOCK's.
 *
 * ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
 * `selectOrderFlowStanding` compiles the NO TAPE sentence from facts HANDED
 * DOWN to it; it derives nothing, on purpose, so that two rooms cannot reach
 * two different verdicts off the same feed. That doctrine only works if the
 * derivation lives somewhere — once, named, and tested. This is that place.
 *
 * ── THE DEFECT THIS CURES, MEASURED ───────────────────────────────────────
 * MEASURED 2026-09-21 on the dev host, from an authenticated session:
 *
 *   GET /api/market-data/webull/entitlement
 *   { "verdict": "APP_KEY_ENTITLEMENT_ISOLATED",
 *     "rungs": [ ACCOUNTS 200 OK, PROFILES 200 OK,
 *                SNAPSHOT 403 MARKET_DATA_NOT_SUBSCRIBED (legacy-sha1),
 *                TICKS    403 MARKET_DATA_NOT_SUBSCRIBED (legacy-sha1),
 *                SNAPSHOT 403 MARKET_DATA_NOT_SUBSCRIBED (sdk-sha256),
 *                TICKS    403 MARKET_DATA_NOT_SUBSCRIBED (sdk-sha256) ] }
 *
 * A weekday, mid-session, so `provenSessionClosure` returns `null` — closure
 * is NOT proven. The order-flow preview therefore fell through to its general
 * middle sentence and said:
 *
 *   "No per-trade buy/sell tape for SPY yet. Stock tape streams during market
 *    hours."
 *
 * Every word of that is a true general rule and the whole sentence is useless
 * here, because the reason there is no tape has nothing to do with hours. The
 * trader is told to wait. Waiting is exactly the thing that cannot work: the
 * app key WM signs with is not entitled to market data, and it will be just as
 * unentitled at the opening bell. This is the same defect the crypto branch of
 * that file was already built to prevent — the clock offered as the
 * explanation for an absence the clock does not control — reappearing on the
 * one asset class where the clock USUALLY is the explanation.
 *
 * ── WHAT COUNTS AS PROOF, AND WHY THE BAR IS THIS HIGH ────────────────────
 * Two facts must hold at once, and a quiet market satisfies neither:
 *
 *   1. NO AGGRESSOR TAPE IS ARRIVING — `tapeSource` is null. That field is set
 *      only by trade sockets and is never downgraded by a REST quote, so null
 *      means no per-trade wire has ever delivered for this symbol.
 *
 *   2. THE FEED IS DEMONSTRABLY ALIVE ANYWAY — the provider stamped a price
 *      observation within `FRESH_OBSERVATION_MS`. `lastObservedAtMs` is taken
 *      from the print's OWN timestamp at every accept site, never from
 *      `Date.now()`, so it measures the market rather than our polling.
 *
 * Together those say: this provider is talking to us RIGHT NOW and is not
 * sending prints. That is a statement about the wire, and it survives the
 * bell. Either fact alone proves nothing — a closed session also has no tape,
 * and a feed with no observations at all might simply not have started.
 *
 * ── ONE-SIDED, LIKE `provenSessionClosure` ────────────────────────────────
 * Returns `true` or `null`, never `false`. `null` means "not established", and
 * the consumer's behaviour on `null` is precisely what it shipped before this
 * file existed. So this can only ever SHARPEN a vague sentence; it can never
 * introduce a wrong one, and it can never be read backwards as a claim that a
 * lane is HEALTHY. Absence of a complaint is not a receipt.
 */

import type { MarketState } from "@/hooks/useWebSocket";

/**
 * How recent a price observation must be to count as "the provider is talking
 * to us right now".
 *
 * Generous on purpose. A too-tight window would flicker the headline between
 * two true sentences as quotes arrive, and a preview that changes its mind
 * every few seconds teaches a trader to stop reading it. Thirty seconds is far
 * inside any polling cadence WM runs, and far outside the gap that would let a
 * yesterday's-close REST seed masquerade as a live conversation.
 */
export const FRESH_OBSERVATION_MS = 30_000;

/** Exactly the fields this judgement reads — nothing else is consulted. */
export interface TapeWireEvidence {
  readonly tapeSource: MarketState["tapeSource"];
  readonly lastObservedAtMs: MarketState["lastObservedAtMs"];
}

/**
 * `true` only when the wire is PROVEN to be the reason there is no tape.
 * `null` everywhere else, including every form of "we cannot tell".
 *
 * @param nowMs injected so tests state their own clock rather than racing one.
 */
export function provenTapeWireBlock(
  evidence: TapeWireEvidence | null | undefined,
  nowMs: number,
): true | null {
  if (!evidence) return null;

  // An aggressor tape IS arriving. Whatever else is true, the wire is not the
  // thing standing between the trader and per-trade prints.
  if (evidence.tapeSource != null) return null;

  const observedAt = evidence.lastObservedAtMs;
  if (observedAt == null || !Number.isFinite(observedAt)) return null;

  // A timestamp from the future is a provider clock we do not trust to prove
  // anything. Declining to conclude is the correct answer to bad evidence.
  const age = nowMs - observedAt;
  if (age < 0) return null;
  if (age > FRESH_OBSERVATION_MS) return null;

  return true;
}

export default provenTapeWireBlock;
