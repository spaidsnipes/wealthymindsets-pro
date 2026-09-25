/**
 * EXHAUSTION ANATOMY — the right half of the Founder's plate.
 *
 * Child: EXHAUSTION (declining aggression + extension + loss of follow-
 * through). Parent: F06 Order Flow › Effort → Response. Class: OVERLAY on the
 * candle it happened at. Plate: "ABSORPTION vs EXHAUSTION — The Anatomy of
 * Impact · The Cost of Mismanagement" (Founder, 2026-09-24).
 *
 * ── ONE EFFORT OWNER, TWO READINGS ─────────────────────────────────────────
 *
 * Absorption is HIGH EFFORT + WEAK DISPLACEMENT. Exhaustion is a push whose
 * effort FADES as it EXTENDS and then fails to FOLLOW THROUGH. Both are read
 * from the same per-bar series `selectAbsorptionAnatomy` already publishes —
 * `effortNorm` on its tiered basis (SIGNED_DELTA / INFERRED_DELTA / VOLUME),
 * `displacementNorm` — so the two halves of the plate can never be computed
 * from two different ideas of effort. This module invents no effort.
 *
 * ── THE FOUR METRICS, AS THE PLATE NAMES THEM ──────────────────────────────
 *
 * For a push = a run of ≥ MIN_PUSH_BARS consecutive closes in one direction:
 *
 *   AGGRESSION LEVEL — mean effort of the push's second half ÷ first half.
 *                      Printed as EFFORT 2ND ÷ 1ST: effort is unsigned, so it
 *                      is not an aggressor-side reading.
 *                      "Declining" below DECLINING_AT.
 *   EXTENSION        — how far the push travelled, in multiples of the
 *                      window's median bar range. "Extended" at EXTENDED_AT.
 *   FOLLOW-THROUGH   — of the next FT_BARS bars, how many made a new extreme
 *                      beyond the push's. "Lost" at zero; PENDING while fewer
 *                      than FT_BARS bars exist after it.
 *   ENERGY TRANSFER  — displacement per unit effort, second half ÷ first half.
 *
 * EXHAUSTION = declining AND extended AND follow-through lost. Declining needs
 * effort REPORTED on every bar of the push (see `effortReported`): a data gap
 * is not a fade, so such a push publishes aggressionLevel null and never
 * exhausts. All four are
 * published whether or not the verdict fires, so Inspect can show a near
 * miss honestly. No probability; no "strength score"; no direction call —
 * an exhausted up-push is a fact about the push, not a forecast of a fall.
 *
 * ── WHERE IT HAPPENED ──────────────────────────────────────────────────────
 *
 * The mark hangs at the extreme, and the extreme is not always the push's
 * last bar (a push can close higher on a bar with a lower high). So the push's
 * own first and last bar and the bars follow-through was counted on are
 * published too. A reader that rebuilt the push backwards from the extreme
 * would put fuel on the origin bar, drop the push's last bar, and grade
 * follow-through on bars this module never measured.
 *
 * PURE. DETERMINISTIC.
 */

import type { AbsorptionAnatomyVM, AnatomyBar, EffortBasis } from "@/lib/marketData/selectAbsorptionAnatomy";

export const EXHAUSTION_VERSION = 1;
export const MIN_PUSH_BARS = 4;
export const DECLINING_AT = 0.75;
export const EXTENDED_AT = 3;
export const FT_BARS = 3;
export const MAX_MARKS = 3;

export type PushDirection = "UP" | "DOWN";

export interface ExhaustionReading {
  readonly direction: PushDirection;
  /** The push's extreme bar (unix seconds) — where the mark hangs. */
  readonly time: number;
  /** The extreme price itself: the push's high (UP) or low (DOWN). */
  readonly price: number;
  readonly pushBars: number;
  /** The push's first bar (unix seconds). */
  readonly pushStartTime: number;
  /** The push's last bar; follow-through is counted on the bars after it. */
  readonly pushEndTime: number;
  /** The bars follow-through was measured on, oldest first: FT_BARS of them,
   *  or fewer while PENDING. */
  readonly followThroughTimes: readonly number[];
  /** The same bars with how far each reached (its high on an UP push, its low
   *  on a DOWN one) and whether that went beyond the extreme. `followThrough`
   *  is the count of `beyond`, once all FT_BARS exist. */
  readonly followBars: readonly { readonly time: number; readonly reach: number; readonly beyond: boolean }[];
  /** Where the push started from: the bar before it — its low (UP) or high
   *  (DOWN). `extension` is measured from here to `price`. */
  readonly originPrice: number;
  /** Mean `effortNorm` of the push's first and second halves — fractions of
   *  the window's peak effort. `aggressionLevel` is second ÷ first. */
  readonly effortFirstHalf: number;
  readonly effortSecondHalf: number;
  /** second-half effort ÷ first-half effort. null when the comparison has
   *  nothing to stand on: a bar of the push carried no reported effort, or the
   *  first half's effort is zero — "declining" from nothing is not a decline. */
  readonly aggressionLevel: number | null;
  /** Bars of the push whose effort was not reported: on a VOLUME basis a bar
   *  with no volume (price moved, so trades happened — the feed just did not
   *  say how many); on a delta basis a bar without an observed split. */
  readonly effortUnreportedBars: number;
  /** push travel ÷ median bar range. */
  readonly extension: number;
  /** bars (of FT_BARS) that exceeded the extreme; null while PENDING. */
  readonly followThrough: number | null;
  /** (disp/effort) second half ÷ first half. null when effort is zero. */
  readonly energyTransfer: number | null;
  readonly exhausted: boolean;
}

export interface ExhaustionVM {
  readonly version: number;
  readonly measured: boolean;
  readonly basis: EffortBasis;
  readonly reason: "MEASURED" | "UNMEASURED_EFFORT" | "TOO_FEW_BARS";
  /** Exhausted pushes, newest last, capped. */
  readonly marks: readonly ExhaustionReading[];
  /** Every push in the window, newest last, exhausted or not and uncapped —
   *  so Inspect can find a selected mark's push after it stops being drawn
   *  (a near miss, or an exhausted push the cap left off the glass). */
  readonly pushes: readonly ExhaustionReading[];
  /** The newest push's reading even when it did not exhaust (for Inspect). */
  readonly latestPush: ExhaustionReading | null;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Did the feed report this bar's effort? VOLUME: a positive volume (a bar
 *  that exists traded something, so 0 means "not reported"). Delta bases: an
 *  observed aggressor split — a balanced split (delta 0) IS reported effort. */
export function effortReported(bar: Pick<AnatomyBar, "effort" | "delta">, basis: EffortBasis): boolean {
  if (basis === "VOLUME") return bar.effort > 0;
  if (basis === "SIGNED_DELTA" || basis === "INFERRED_DELTA") return bar.delta != null;
  return false;
}

export function selectExhaustion(anatomy: AbsorptionAnatomyVM | null | undefined): ExhaustionVM {
  const basis: EffortBasis = anatomy?.basis ?? "UNMEASURED";
  const base = { version: EXHAUSTION_VERSION, basis };
  if (!anatomy || !anatomy.measured || basis === "UNMEASURED") {
    return { ...base, measured: false, reason: "UNMEASURED_EFFORT", marks: [], pushes: [], latestPush: null };
  }
  const bars = anatomy.bars;
  if (bars.length < MIN_PUSH_BARS + 1) {
    return { ...base, measured: false, reason: "TOO_FEW_BARS", marks: [], pushes: [], latestPush: null };
  }

  const ranges = bars.map(b => b.high - b.low).filter(r => r > 0).sort((a, b) => a - b);
  const medRange = ranges.length ? ranges[Math.floor(ranges.length / 2)] : 0;

  const readings: ExhaustionReading[] = [];
  let i = 1;
  while (i < bars.length) {
    const dir = Math.sign(bars[i].close - bars[i - 1].close);
    if (dir === 0) { i++; continue; }
    let j = i;
    while (j + 1 < bars.length && Math.sign(bars[j + 1].close - bars[j].close) === dir) j++;
    const len = j - i + 1;
    if (len >= MIN_PUSH_BARS) {
      const push = bars.slice(i, j + 1);
      const half = Math.floor(len / 2);
      const first = push.slice(0, half);
      const second = push.slice(len - half);
      const effFirst = mean(first.map(b => b.effortNorm));
      const effSecond = mean(second.map(b => b.effortNorm));
      const dispFirst = mean(first.map(b => b.displacementNorm));
      const dispSecond = mean(second.map(b => b.displacementNorm));
      const up = dir > 0;
      const extremeIdx = push.reduce((k, b, n) => (up ? (b.high > push[k].high ? n : k) : (b.low < push[k].low ? n : k)), 0);
      const extreme = push[extremeIdx];
      const extremePrice = up ? extreme.high : extreme.low;
      const origin = up ? bars[i - 1].low : bars[i - 1].high;
      const extension = medRange > 0 ? Math.abs(extremePrice - origin) / medRange : 0;
      const after = bars.slice(j + 1, j + 1 + FT_BARS);
      const followThrough = after.length < FT_BARS
        ? null
        : after.filter(b => (up ? b.high > extremePrice : b.low < extremePrice)).length;
      // Effort the feed did not report is not zero effort. A zero-volume bar
      // that moved price still traded; grading its "fade" would mint an
      // exhaustion out of a data gap (measured on serving, 2026-09-25: BTC 1m
      // marks EXHAUSTED at EFFORT 2ND÷1ST 0% on bars whose volume was 0).
      const effortUnreportedBars = push.filter(b => !effortReported(b, basis)).length;
      const aggressionLevel = effortUnreportedBars === 0 && effFirst > 0 ? effSecond / effFirst : null;
      const energyTransfer = aggressionLevel != null && effSecond > 0 && dispFirst > 0
        ? (dispSecond / effSecond) / (dispFirst / effFirst)
        : null;
      const exhausted = aggressionLevel != null && aggressionLevel < DECLINING_AT
        && extension >= EXTENDED_AT && followThrough === 0;
      readings.push({
        direction: up ? "UP" : "DOWN",
        time: extreme.time,
        price: extremePrice,
        pushBars: len,
        pushStartTime: push[0].time,
        pushEndTime: push[len - 1].time,
        followThroughTimes: after.map(b => b.time),
        followBars: after.map(b => {
          const reach = up ? b.high : b.low;
          return { time: b.time, reach, beyond: up ? reach > extremePrice : reach < extremePrice };
        }),
        originPrice: origin,
        effortFirstHalf: effFirst,
        effortSecondHalf: effSecond,
        aggressionLevel,
        effortUnreportedBars,
        extension,
        followThrough,
        energyTransfer,
        exhausted,
      });
    }
    i = j + 1;
  }

  return {
    ...base,
    measured: true,
    reason: "MEASURED",
    marks: readings.filter(r => r.exhausted).slice(-MAX_MARKS),
    pushes: readings,
    latestPush: readings.at(-1) ?? null,
  };
}

export default selectExhaustion;
