/**
 * DELTA LEVELS, LET OUT OF THE DRAWER.
 *
 * Child: DELTA LEVELS ON GLASS. Parent family: order flow / aggressor delta.
 * Class: CHART LANGUAGE. House surface: /charts main canvas. Plate H-702.
 *
 * ── WHY THIS IS THE CLEAREST REMAINING CASE ──────────────────────────────────
 *
 * `selectDeltaLevels` is the most price-honest module in this folder. It does
 * not cut the range into six equal parts; it reads the tick grid the prints
 * themselves establish, and its header explains at length why a bucket centre
 * of `lo + (i + 0.5) × span/6` is a price no order could ever have been placed
 * at. Every level it emits is a price that exists on the instrument.
 *
 * And its only consumer is `SmartMoneyPanel` — a drawer. Real, measured,
 * grid-native prices, rendered as bubbles in a side panel, next to a chart
 * that draws none of them. That is the exact shape three earlier readings were
 * sentinelled for: PRICES TRAPPED IN A DRAWER.
 *
 * ── WHAT A GLASS COMPILER IS FOR ─────────────────────────────────────────────
 *
 * It is the place the rules about what may touch the price axis are written
 * down ONCE, so the canvas code has nothing left to decide. Three rules here:
 *
 *   1. NO GRID, NO PAINT. `tickSize` null means the window never established
 *      where a level is. Drawing anyway would put marks at prices this module
 *      cannot vouch for — and it would look identical to a confident reading.
 *
 *   2. A LEVEL IS A PRICE. `delta` and `vol` are sizes, counted in contracts
 *      or shares, and neither may ever reach `priceToCoordinate`. This file
 *      emits them in a form that cannot be mistaken for one: a unit-interval
 *      `weight` for lane length, alongside the price, never instead of it.
 *
 *   3. ZERO IS NOT A READING. A level where buys and sells matched exactly is
 *      genuinely balanced, and a lane of length zero is indistinguishable from
 *      a level that was never drawn. It is dropped, and the count says so.
 *
 * ── §9, AND WHY DELTA IS NOT THE EXCEPTION ───────────────────────────────────
 *
 * The house now permits classic red/green for DIRECTIONAL PRICE PAINT — an up
 * candle may be green. Aggressor delta is not that. It is not where price went;
 * it is which side crossed the spread to get there, and the two disagree
 * constantly: price rises on net selling all day in a thin tape.
 *
 * Colouring buy delta green would therefore borrow the candle's meaning for a
 * reading that does not share it, and a trader who learns the hue would read
 * "price went up here" off a mark that says nothing of the kind. So the two
 * sides are told apart by WHICH WAY THE LANE GROWS from its centre line —
 * position, which survives a colour-blind eye and bright sun both.
 *
 * PURE. DETERMINISTIC. No React, no canvas, no IO, no clock.
 */

import type { DeltaLevelsVM } from "./selectDeltaLevels";

export type DeltaLaneSide = "BUY" | "SELL";

export interface DeltaLaneRung {
  /** A real price on the observed grid — the low edge of the group. */
  readonly price: number;
  /** Which side crossed the spread here. NOT which way price went. */
  readonly side: DeltaLaneSide;
  /**
   * |delta| ÷ the window's largest |delta|, in [0,1]. A LENGTH, for a lane of
   * fixed width in the chrome. It is not a price and never becomes one.
   */
  readonly weight: number;
}

export type DeltaLevelsGlass =
  | {
      readonly drawn: true;
      readonly reason: string;
      readonly rungs: readonly DeltaLaneRung[];
      /** Printed as words. Says what a level IS on this tape. */
      readonly gridNote: string;
      /** Levels that were measured and had exactly zero net delta. */
      readonly balanced: number;
    }
  | {
      readonly drawn: false;
      readonly reason: string;
      readonly rungs: readonly [];
      readonly gridNote: string | null;
      readonly balanced: number;
    };

const refuse = (reason: string): DeltaLevelsGlass =>
  ({ drawn: false, reason, rungs: [], gridNote: null, balanced: 0 });

/**
 * A window with hundreds of levels is not a reading a human takes in; it is a
 * texture. The cap is on the STRONGEST levels rather than the nearest ones,
 * because "where did one side push hardest" is the question this layer answers
 * and proximity to the last print is a different question with a different
 * owner.
 *
 * Exported because a reader of the canvas needs to know a cap exists — a
 * silently truncated ladder reads as a complete one.
 */
export const MAX_LANE_RUNGS = 24;

export function selectDeltaLevelsGlass(
  vm: DeltaLevelsVM | null | undefined,
): DeltaLevelsGlass {
  if (!vm) return refuse("NO_READING");

  // RULE 1. No measured grid, no paint. The window never established where a
  // level is on this instrument, and a mark drawn anyway is a price this
  // module cannot vouch for wearing the same ink as one it can.
  if (vm.tickSize == null) return refuse("NO_MEASURED_GRID");
  if (vm.levels.length === 0) return refuse("NO_LEVELS");

  // The scale every lane is drawn against. Zero here means every level netted
  // out exactly — real, and not a ladder.
  if (!(vm.maxAbsDelta > 0)) return refuse("NO_NET_DELTA");

  const balanced = vm.levels.filter(l => l.delta === 0).length;

  const rungs = vm.levels
    // RULE 3. A zero-length lane is indistinguishable from a level nobody
    // drew, so balance is counted and reported rather than rendered.
    .filter(l => l.delta !== 0 && Number.isFinite(l.price))
    .map((l): DeltaLaneRung => ({
      price: l.price,
      side: l.delta > 0 ? "BUY" : "SELL",
      weight: Math.min(1, Math.abs(l.delta) / vm.maxAbsDelta),
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_LANE_RUNGS)
    // Back to ladder order once the cap has chosen. A canvas reading them in
    // strength order would draw a ladder that is not one.
    .sort((a, b) => b.price - a.price);

  if (rungs.length === 0) return refuse("ALL_BALANCED");

  const ticks = vm.ticksPerLevel;
  const gridNote =
    `1 rung = ${ticks ?? "?"} tick${ticks === 1 ? "" : "s"} of ${vm.tickSize}, `
    + "measured off the prints";

  return { drawn: true, reason: "DRAWN", rungs, gridNote, balanced };
}

export default selectDeltaLevelsGlass;
