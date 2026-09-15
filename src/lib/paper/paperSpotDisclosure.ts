/**
 * paperSpotDisclosure — the Spot tile on the /paper options chain.
 *
 * ── THE DEFECT: THE EXECUTION BOUNDARY WAS USED AS THE DISPLAY BOUNDARY ──
 *
 * `OptionsChain` computed its spot as
 *
 *     const spot = actionablePaperQuotePrice(readiness);
 *     if (spot == null) { …render `Spot —`… }
 *
 * and `actionablePaperQuotePrice` has a docblock that says exactly what it is:
 *
 *     "Returns the only price Paper execution/derivation code may act on."
 *
 * IT IS A PERMISSION, NOT AN OBSERVATION. It answers "may this number
 * authorize a fill", and the header asked it "does WM hold a number at all".
 * Those are different questions and they have different answers.
 *
 * `selectPaperQuoteReadiness` is explicit about this in its own contract:
 *
 *     "A previously accepted price may remain visible as STALE, but can never
 *      authorize a fill, preview, or bot decision."
 *
 * and `priorAsStale` deliberately SPREADS THE PRIOR so `price` and `observedAt`
 * survive the downgrade. The owner goes out of its way to keep the observation,
 * and the consumer erased it — printing a bare `—` over a price WM measured, at
 * a time WM knows, and still holds in memory.
 *
 * ── THIS IS THE SAME SHAPE AS THE ACCOUNT-STRIP OVER-CORRECTION ──────────
 *
 * The /paper account strip had just been repaired for this: a true `+$0.00` was
 * erased because the FIGURE and the CLAIM were decided by one expression. Here
 * the one expression is `spot == null`, and it decides both
 *
 *     "can the trader act on this?"   — correctly NO
 *     "does WM know the price?"       — wrongly ALSO NO
 *
 * Withholding the ACTION is right and is not touched: no strikes, no modeled
 * premiums, no Greeks, no marks are produced, and nothing here re-enables them.
 * Withholding the OBSERVATION is the defect.
 *
 * A stale price is DANGEROUS TO ACT ON and INFORMATIVE TO SEE. The trader who
 * can see "last observed $412.50, 23 minutes ago" knows the market is roughly
 * there and that WM's feed has fallen behind. The trader shown `—` learns
 * nothing and cannot tell a stalled feed from a symbol that never loaded.
 *
 * ── AND ABSENCE IS STILL NOT ZERO, NOR IS IT STALENESS ───────────────────
 *
 * Three states are collapsed into one glyph today and they are three different
 * facts, so this returns three different sentences:
 *
 *   STALE    WM holds a price and it is too old to trade on.
 *   LOADING  WM has not asked yet. Not absent — pending.
 *   UNKNOWN  WM asked and could not obtain a canonical observation.
 *
 * PURE — no clock, no I/O, no React. The caller supplies `now` so the age
 * sentence is testable.
 */

import type { PaperQuoteReadiness } from "../marketData/viewModels/selectPaperQuoteReadiness";
import type { PaperStat } from "./paperAccountStats";

/** Human age for an observation, deliberately coarse — this is not a clock. */
export function describeObservationAge(ageMs: number): string {
  if (!Number.isFinite(ageMs) || ageMs < 0) return "an unknown time ago";
  const s = Math.floor(ageMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

function usd2(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * The Spot tile.
 *
 * `label` changes with the state on purpose. "Spot" is a claim about NOW; a
 * price WM last saw 23 minutes ago is not that, and calling it "Spot" beside a
 * STALE badge asks the trader to reconcile two contradictory words. "Last spot"
 * is the honest noun.
 */
export function paperSpotStat(
  readiness: PaperQuoteReadiness,
  symbol: string,
  now: number,
): PaperStat {
  const hasPrice =
    typeof readiness.price === "number" &&
    Number.isFinite(readiness.price) &&
    readiness.price > 0;

  // ACTIONABLE — the ordinary case. Nothing withheld.
  if (readiness.actionable && hasPrice) {
    return {
      label: "Spot",
      value: usd2(readiness.price as number),
      kind: "MEASURED",
      tone: "NEUTRAL",
      reason: `Canonical delayed observation for ${symbol}, accepted for paper simulation. ${readiness.reason}`,
    };
  }

  // STALE — WM HOLDS THIS NUMBER. It may not authorize anything, and that is a
  // statement about PERMISSION, not about knowledge. The figure survives; the
  // tint goes ALERT and the noun changes so it can never read as current.
  if (hasPrice) {
    const age =
      typeof readiness.ageMs === "number" ? describeObservationAge(readiness.ageMs) : "an unknown time ago";
    return {
      label: "Last spot",
      value: usd2(readiness.price as number),
      kind: "MEASURED",
      tone: "ALERT",
      reason: `This is the last canonical observation WM holds for ${symbol}, made ${age}. It is shown because WM genuinely measured it — not because it may be traded on. It is too old to authorize any option strike, premium, Greek, mark, or fill, and none are produced from it. ${readiness.reason}`,
    };
  }

  // LOADING — pending is not absent. Saying UNKNOWN here would claim WM tried
  // and failed, when WM has not finished asking.
  if (readiness.status === "LOADING") {
    return {
      label: "Spot",
      value: "Loading…",
      kind: "UNDEFINED",
      tone: "NEUTRAL",
      reason: `WM is still waiting for its first canonical observation of ${symbol}. No price has been measured yet, so there is nothing to show — this is pending, not missing. ${readiness.reason}`,
    };
  }

  // UNKNOWN — WM asked and could not obtain a canonical observation. This is
  // the ONLY one of the four states in which WM truly holds no number, and it
  // still says so in a word rather than a glyph.
  return {
    label: "Spot",
    value: "UNKNOWN",
    kind: "UNKNOWN",
    tone: "ALERT",
    reason: `WM has no canonical observation of ${symbol} it can stand behind — not a price that is merely old, but none at all. ${readiness.reason}`,
  };
}
