/**
 * FL-06 ④ EFFORT vs RESULT, for one exhaustion mark — what the arrow pair may
 * claim, decided before a coordinate exists.
 *
 * The exhaustion owner (`selectExhaustion`) already measured everything; this
 * only picks the two facts the glass draws:
 *
 *   EFFORT — the push's opening effort, `effortFirstHalf`: a share of the
 *            window's peak effort (0..1), the fuel the push started with. The
 *            arrow points the way the push went; its length is this share.
 *   RESULT — the follow-through bar that reached FURTHEST toward continuing
 *            (highest high after an UP push, lowest low after a DOWN one), and
 *            how far short of the extreme that reach stopped, in PRICE. The
 *            arrow runs back from the stop line to that reach, on that bar.
 *
 * No follow-through bars → no RESULT (null), never a guessed one. A reach
 * beyond the extreme cannot occur on a mark (a mark requires follow-through 0);
 * if one arrives anyway the shortfall is reported as 0, never negative.
 *
 * PURE — no canvas, no clock.
 */

import type { ExhaustionReading } from "@/lib/marketData/viewModels/selectExhaustion";

export interface EffortResultPair {
  /** effortFirstHalf clamped to 0..1. */
  readonly effortFrac: number;
  /** The follow-through bar that reached furthest; null when none was measured. */
  readonly resultBar: { readonly time: number; readonly reach: number } | null;
  /** |extreme − that reach| in price; null with no result bar. */
  readonly shortfall: number | null;
}

export function exhaustionEffortResult(
  m: Pick<ExhaustionReading, "direction" | "price" | "effortFirstHalf" | "followBars">,
): EffortResultPair {
  const up = m.direction === "UP";
  const e = Number.isFinite(m.effortFirstHalf) ? m.effortFirstHalf : 0;
  const effortFrac = Math.max(0, Math.min(1, e));
  let best: { time: number; reach: number } | null = null;
  for (const f of m.followBars) {
    if (!Number.isFinite(f.reach)) continue;
    if (!best || (up ? f.reach > best.reach : f.reach < best.reach)) best = { time: f.time, reach: f.reach };
  }
  const shortfall = best == null ? null : Math.max(0, up ? m.price - best.reach : best.reach - m.price);
  return { effortFrac, resultBar: best, shortfall };
}

export default exhaustionEffortResult;
