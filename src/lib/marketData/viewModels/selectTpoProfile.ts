/**
 * TPO — TIME AT PRICE, ON THE CANVAS. P-110 organism #10.
 *
 * Child: TPO / AUCTION DISTRIBUTION. Parent family: F09 Profiles. Class:
 * CHART LANGUAGE. House surface: /charts main canvas, switched from the one
 * Profiles door. Plate: WM_H_P110_PROFILE_ORGANISM ("10 · TPO · Time price
 * opportunity").
 *
 * ── WHY THIS IS NOT A SECOND VOLUME PROFILE ─────────────────────────────────
 *
 * The Living Profile answers "where did SIZE trade". TPO answers a different
 * question — "where did the market SPEND TIME" — and the two disagree in the
 * places a trader most needs to see: a fast print through a level with heavy
 * volume and no time is a rejection, and a slow drift through a level with
 * thin volume and lots of time is acceptance. Drawing only one of them hides
 * that disagreement.
 *
 * A TPO count is the number of PERIODS whose range touched a price. Here one
 * period is one chart bar — the same brick the candles are drawn from — and
 * the VM says so in `periodNote`, because a classic 30-minute letter grid and
 * a per-bar count are both TPO and are not the same number.
 *
 * ── THE RULES ───────────────────────────────────────────────────────────────
 *
 *   1. TIME ONLY. Volume and aggressor side are never read. That is what makes
 *      this reading deliverable on every feed the product can draw candles
 *      from, and it is why the menu never marks it NEEDS_SIDED_TAPE.
 *
 *   2. A ROW IS A PRICE. `count` and `share` are counts; neither reaches a
 *      coordinate function. The price is the bucket LOW edge on the grid.
 *
 *   3. NO PERIODS, NO PAINT. Fewer than MIN_TPO_PERIODS bars is not a
 *      distribution, and a flat range is not a shape. Both are refused by
 *      name, never drawn as a stub.
 *
 *   4. SINGLE PRINTS ARE INSIDE THE RANGE. A price touched by exactly one
 *      period, strictly between the extremes, is where the auction moved
 *      through without returning. The extremes themselves are tails, not
 *      single prints, and are not counted as such.
 *
 * PURE. DETERMINISTIC. No React, no canvas, no IO, no clock.
 */

import { chooseTickSize } from "@/lib/vpEngine";

export const TPO_PROFILE_VERSION = 1;

/** Below this, a count per price is a list, not a distribution. */
export const MIN_TPO_PERIODS = 8;
/** TPO rows are coarser than volume rows — a time count needs room to stack. */
export const TPO_TARGET_ROWS = 80;
/** Hard ceiling on rows so a pathological tick size cannot build a huge grid. */
export const MAX_TPO_ROWS = 400;
/** Classic value-area fraction, identical to the volume engine's default. */
export const TPO_VALUE_AREA_PCT = 0.7;

export interface TpoBarInput {
  readonly time: number;
  readonly high: number;
  readonly low: number;
}

export type TpoReason =
  | "DRAWN"
  | "NO_BARS"
  | "TOO_FEW_PERIODS"
  | "FLAT_RANGE";

export interface TpoRow {
  /** Bucket LOW edge — a real price on the grid. */
  readonly price: number;
  /** Periods whose range touched this bucket. */
  readonly count: number;
  /** count ÷ the busiest row's count, in [0,1]. A LENGTH, never a price. */
  readonly share: number;
  readonly insideValueArea: boolean;
  readonly isPoc: boolean;
  /** Touched by exactly one period, strictly inside the range. */
  readonly single: boolean;
}

export interface TpoProfileVM {
  readonly version: number;
  readonly drawn: boolean;
  readonly reason: TpoReason;
  /** One sentence the chrome prints verbatim. */
  readonly note: string;
  /** What one period means here, stated so the count is never mistaken. */
  readonly periodNote: string;
  readonly periods: number;
  readonly tickSize: number;
  readonly poc: number | null;
  readonly vah: number | null;
  readonly val: number | null;
  readonly totalTpo: number;
  readonly rows: readonly TpoRow[];
  readonly singlePrintCount: number;
  /** Unix seconds of the last period counted — the reading's asOf. */
  readonly asOf: number | null;
}

const PERIOD_NOTE = "one period = one chart bar";

function refuse(reason: Exclude<TpoReason, "DRAWN">, periods: number, note: string): TpoProfileVM {
  return {
    version: TPO_PROFILE_VERSION,
    drawn: false,
    reason,
    note,
    periodNote: PERIOD_NOTE,
    periods,
    tickSize: 0,
    poc: null,
    vah: null,
    val: null,
    totalTpo: 0,
    rows: [],
    singlePrintCount: 0,
    asOf: null,
  };
}

export function selectTpoProfile(
  bars: readonly TpoBarInput[] | null | undefined,
): TpoProfileVM {
  const valid = (bars ?? []).filter(
    b => Number.isFinite(b.high) && Number.isFinite(b.low) && b.high >= b.low,
  );
  if (valid.length === 0) {
    return refuse("NO_BARS", 0, "no bars loaded — nothing has spent time at any price yet");
  }
  if (valid.length < MIN_TPO_PERIODS) {
    return refuse(
      "TOO_FEW_PERIODS",
      valid.length,
      `${valid.length} of ${MIN_TPO_PERIODS} periods — too few to call it a distribution`,
    );
  }

  let hi = -Infinity;
  let lo = Infinity;
  let asOf = -Infinity;
  for (const b of valid) {
    if (b.high > hi) hi = b.high;
    if (b.low < lo) lo = b.low;
    if (Number.isFinite(b.time) && b.time > asOf) asOf = b.time;
  }
  const range = hi - lo;
  if (!(range > 0)) {
    return refuse("FLAT_RANGE", valid.length, "every period traded one price — no shape to draw");
  }

  // The grid is anchored at a tick multiple so every bucket edge is a readable
  // price. Indices are integers, not float keys: the bucket a bar touches must
  // be the same bucket on every run, and float division drifts at the edges.
  let tick = chooseTickSize(range, TPO_TARGET_ROWS);
  let base = Math.floor(lo / tick + 1e-9) * tick;
  const idx = (p: number) => Math.floor((p - base) / tick + 1e-9);
  while (idx(hi) + 1 > MAX_TPO_ROWS) {
    tick *= 2;
    base = Math.floor(lo / tick + 1e-9) * tick;
  }
  const n = idx(hi) + 1;

  const counts = new Array<number>(n).fill(0);
  for (const b of valid) {
    const a = idx(b.low);
    const z = idx(b.high);
    for (let i = a; i <= z; i++) counts[i] += 1;
  }

  // Bucket low edge, rounded so a label reads 101.25 and not 101.24999999.
  const priceAt = (i: number) => +((base + i * tick).toFixed(10));

  const totalTpo = counts.reduce((s, c) => s + c, 0);
  let maxCount = 0;
  for (const c of counts) if (c > maxCount) maxCount = c;

  // POC: the busiest row. Ties go to the row nearest the range centre (the
  // market-profile convention), then to the lower price, so the answer never
  // depends on iteration order.
  const centre = (n - 1) / 2;
  let pocIdx = -1;
  for (let i = 0; i < n; i++) {
    if (counts[i] !== maxCount) continue;
    if (pocIdx < 0 || Math.abs(i - centre) < Math.abs(pocIdx - centre)) pocIdx = i;
  }

  // Value area: grow from the POC, one row at a time, toward the busier side.
  // Same walk and tie rule (above wins) as the volume engine, so a trader who
  // compares the two value areas is comparing distributions and not methods.
  const target = TPO_VALUE_AREA_PCT * totalTpo;
  let vLo = pocIdx;
  let vHi = pocIdx;
  let acc = counts[pocIdx];
  while (acc < target && (vLo > 0 || vHi < n - 1)) {
    const above = vHi < n - 1 ? counts[vHi + 1] : -1;
    const below = vLo > 0 ? counts[vLo - 1] : -1;
    if (above >= below) { vHi += 1; acc += counts[vHi]; }
    else { vLo -= 1; acc += counts[vLo]; }
  }

  const rows: TpoRow[] = [];
  let singlePrintCount = 0;
  for (let i = 0; i < n; i++) {
    if (counts[i] === 0) continue; // a gap no period touched is not a row
    const single = counts[i] === 1 && i > 0 && i < n - 1;
    if (single) singlePrintCount++;
    rows.push({
      price: priceAt(i),
      count: counts[i],
      share: counts[i] / maxCount,
      insideValueArea: i >= vLo && i <= vHi,
      isPoc: i === pocIdx,
      single,
    });
  }

  return {
    version: TPO_PROFILE_VERSION,
    drawn: true,
    reason: "DRAWN",
    note: `time at price across ${valid.length} periods`,
    periodNote: PERIOD_NOTE,
    periods: valid.length,
    tickSize: tick,
    poc: priceAt(pocIdx),
    vah: priceAt(vHi),
    val: priceAt(vLo),
    totalTpo,
    rows,
    singlePrintCount,
    asOf: Number.isFinite(asOf) ? asOf : null,
  };
}

export default selectTpoProfile;
