import { MIN_PRINTS_FOR_PERCENTILE } from "@/lib/marketData/viewModels/selectBigTradeIntelligence";
/**
 * BIG-TRADE DISC TIER — the visual weight a print earns from a real statistic.
 *
 * Founder 2026-10-03: "make the bubbles look more wow ath". The disc already
 * encodes size by radius; the tier adds the canon's G04 language (98.7th
 * percentile · top 1.3% of session trades) to the glass itself:
 *   WHALE  ≥ 99th percentile of every print this chart captured this session
 *   CROWN  ≥ 95th
 *   BASE   everything else — and ALWAYS when the percentile is unknown (too few
 *          prints yet): a crown is never awarded on thin evidence.
 */
export type BigTradeTier = "WHALE" | "CROWN" | "BASE";

export function bigTradeTier(pct: number | null | undefined): BigTradeTier {
  if (pct == null || !Number.isFinite(pct)) return "BASE";
  if (pct >= 0.99) return "WHALE";
  if (pct >= 0.95) return "CROWN";
  return "BASE";
}

/**
 * Arrival shockwave: 0 → 1 over one cycle, or null when the print is no longer
 * arriving or motion is off (STILL / reduced motion never ripple).
 */
export function arrivalRipple(nowMs: number, bornMs: number, arriving: boolean, motionOn: boolean, cycleMs = 1600): number | null {
  if (!arriving || !motionOn) return null;
  const t = ((nowMs - bornMs) % cycleMs + cycleMs) % cycleMs;
  return t / cycleMs;
}


/** Every session print's size (bid + ask), ascending — built once per change of print count. */
export function sortedSessionSizes(bars: Iterable<readonly { bid: number; ask: number }[]>): number[] {
  const out: number[] = [];
  for (const prints of bars) for (const p of prints) {
    const s = (Number.isFinite(p.bid) && p.bid > 0 ? p.bid : 0) + (Number.isFinite(p.ask) && p.ask > 0 ? p.ask : 0);
    if (s > 0) out.push(s);
  }
  return out.sort((a, b) => a - b);
}

/** The same answer as footprintCanon.sessionSizePercentile (share strictly below), by binary search. */
export function percentileFromSorted(sorted: readonly number[], size: number): number | null {
  const n = sorted.length;
  if (n < MIN_PRINTS_FOR_PERCENTILE || n === 0) return null;
  let lo = 0, hi = n;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < size) lo = mid + 1; else hi = mid; }
  return lo / n;
}
