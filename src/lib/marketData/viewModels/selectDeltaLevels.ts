/**
 * DELTA LEVELS — net aggressor delta per price level, on the tape's OWN grid.
 *
 * WHY THIS MODULE EXISTS. The delta bubbles were computed inline in
 * `SmartMoneyPanel` by cutting the observed range into six equal parts. That
 * carried a comment promising "we never invent levels" directly above code
 * that invented them, and it produced two defects the promise was supposed to
 * rule out:
 *
 *   · THE PRICES PRINTED ON SCREEN NEVER TRADED. A bucket centre of
 *     `lo + (i + 0.5) × span/6` lands wherever the arithmetic puts it. On a
 *     penny grid that is a price no order could have been placed at, labelled
 *     as though it were a level.
 *
 *   · THE LEVELS MOVED WHEN NO TRADE HAPPENED AT THEM. Bucket width was a
 *     function of the window's extremes, so one new high anywhere rescaled
 *     every bucket and every bubble slid to a new price. A level that drifts
 *     because of a print somewhere else is not a level.
 *
 * The fix is not a better bucket count. It is that this codebase already has
 * exactly one place where "what is a level on this tape" gets decided —
 * `observeTickSize`, which MEASURES the grid off the prints instead of
 * assuming it from the symbol. `selectStackedImbalance` reads it, so the
 * bubbles read it too, and the two cannot disagree about where a level is.
 *
 * Bucket width is then a WHOLE NUMBER OF TICKS, chosen so the window lands
 * near `TARGET_LEVELS` bubbles. Widening the window changes how many ticks
 * one bubble spans; it does not move a bubble to a price that does not exist.
 *
 * ONE PROPERTY WORTH STATING PLAINLY: the partition is anchored at grid index
 * zero, not at the window's low, so the low can sit mid-group and the strip
 * can show TARGET_LEVELS + 1 bubbles rather than TARGET_LEVELS. That extra
 * bubble is the price of levels that do not move, it is bounded at exactly
 * one, and the test suite sweeps 400 window widths to hold it there.
 */

import { observeTickSize } from "./selectStackedImbalance";
import type { AggressorTick } from "../selectAggressorFlow";

export const DELTA_LEVELS_VERSION = "wm.delta-levels.v1" as const;

/**
 * How many bubbles the strip wants. NOT a grid — the grid is measured. This
 * only decides how many ticks get grouped into one bubble, and it is a
 * rendering preference, which is why it is the one tunable number here.
 */
export const TARGET_LEVELS = 6;

export interface DeltaLevel {
  /** A real price on the observed grid — the low edge of the group. */
  readonly price: number;
  /** Buy size minus sell size at this level. */
  readonly delta: number;
  /** Total size traded at this level. */
  readonly vol: number;
}

export interface DeltaLevelsVM {
  readonly version: typeof DELTA_LEVELS_VERSION;
  /** High price first — the way a ladder is read. */
  readonly levels: readonly DeltaLevel[];
  /** The measured grid. Null when the window could not establish one. */
  readonly tickSize: number | null;
  /** How many ticks one bubble spans. Null when there are no levels. */
  readonly ticksPerLevel: number | null;
  /** Largest |delta| across levels — the scale the bubbles are drawn against. */
  readonly maxAbsDelta: number;
}

const EMPTY: DeltaLevelsVM = {
  version: DELTA_LEVELS_VERSION,
  levels: [],
  tickSize: null,
  ticksPerLevel: null,
  maxAbsDelta: 0,
};

/** Significant-figure rounding — safe at any instrument scale. */
function roundSig(v: number, digits = 10): number {
  if (!Number.isFinite(v) || v === 0) return v;
  return Number(v.toPrecision(digits));
}

export function selectDeltaLevels(
  ticks: readonly AggressorTick[] | null | undefined,
): DeltaLevelsVM {
  if (!Array.isArray(ticks) || ticks.length === 0) return EMPTY;

  // Every real executed trade with a side. No lot floor: a 0.01 BTC print and
  // a 50-share TSLA print are both the whole of what happened at that price.
  const prints = ticks.filter(
    (t): t is AggressorTick & { price: number; size: number; side: "buy" | "sell" } =>
      t?.trade === true &&
      typeof t.price === "number" &&
      Number.isFinite(t.price) &&
      t.price > 0 &&
      typeof t.size === "number" &&
      Number.isFinite(t.size) &&
      t.size > 0 &&
      (t.side === "buy" || t.side === "sell"),
  );
  if (prints.length === 0) return EMPTY;

  const tickSize = observeTickSize(prints.map((p) => p.price));

  // A window where every print landed at one price HAS no grid to measure.
  // That is a real, reportable state — one level, honestly one level — and
  // not a reason to fabricate a span.
  if (tickSize == null) {
    let buy = 0;
    let sell = 0;
    for (const p of prints) {
      if (p.side === "buy") buy += p.size;
      else sell += p.size;
    }
    return {
      version: DELTA_LEVELS_VERSION,
      levels: [{ price: roundSig(prints[0].price), delta: buy - sell, vol: buy + sell }],
      tickSize: null,
      ticksPerLevel: null,
      maxAbsDelta: Math.abs(buy - sell),
    };
  }

  let lo = Infinity;
  let hi = -Infinity;
  for (const p of prints) {
    if (p.price < lo) lo = p.price;
    if (p.price > hi) hi = p.price;
  }

  // Index every print on the measured grid, then group a whole number of
  // ticks per bubble. `Math.ceil` rather than round: it keeps the bubble count
  // at or under the target instead of overshooting it on a wide window.
  const loIdx = Math.round(lo / tickSize);
  const hiIdx = Math.round(hi / tickSize);
  const spanTicks = hiIdx - loIdx + 1;
  const ticksPerLevel = Math.max(1, Math.ceil(spanTicks / TARGET_LEVELS));

  // ANCHORED TO THE GRID ITSELF, NOT TO THE WINDOW'S LOW. Grouping from
  // `loIdx` was the original defect in a subtler form: the boundaries were on
  // the grid, but WHICH ticks shared a bubble still depended on the lowest
  // print, so one new low re-partitioned levels that had not traded. Anchoring
  // the partition at grid index zero makes a level's identity a property of
  // the price, so the same price is the same bubble in every window that
  // groups at the same width.
  const acc = new Map<number, { buy: number; sell: number }>();
  for (const p of prints) {
    const group = Math.floor(Math.round(p.price / tickSize) / ticksPerLevel);
    const cur = acc.get(group) ?? { buy: 0, sell: 0 };
    if (p.side === "buy") cur.buy += p.size;
    else cur.sell += p.size;
    acc.set(group, cur);
  }

  const levels = [...acc.entries()]
    .map(([group, v]) => ({
      // The LOW EDGE of the group, which is an index on the measured grid and
      // therefore a price that exists. A midpoint would re-introduce exactly
      // the untradeable label this module was written to remove.
      price: roundSig(group * ticksPerLevel * tickSize),
      delta: v.buy - v.sell,
      vol: v.buy + v.sell,
    }))
    .filter((l) => l.vol > 0)
    .sort((a, b) => b.price - a.price);

  return {
    version: DELTA_LEVELS_VERSION,
    levels,
    tickSize,
    ticksPerLevel,
    maxAbsDelta: levels.reduce((m, l) => Math.max(m, Math.abs(l.delta)), 0),
  };
}

export default selectDeltaLevels;
