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
 *                      "Declining" below DECLINING_AT.
 *   EXTENSION        — how far the push travelled, in multiples of the
 *                      window's median bar range. "Extended" at EXTENDED_AT.
 *   FOLLOW-THROUGH   — of the next FT_BARS bars, how many made a new extreme
 *                      beyond the push's. "Lost" at zero; PENDING while fewer
 *                      than FT_BARS bars exist after it.
 *   ENERGY TRANSFER  — displacement per unit effort, second half ÷ first half.
 *
 * EXHAUSTION = declining AND extended AND follow-through lost. All four are
 * published whether or not the verdict fires, so Inspect can show a near
 * miss honestly. No probability; no "strength score"; no direction call —
 * an exhausted up-push is a fact about the push, not a forecast of a fall.
 *
 * PURE. DETERMINISTIC.
 */

import type { AbsorptionAnatomyVM, EffortBasis } from "@/lib/marketData/selectAbsorptionAnatomy";

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
  /** second-half effort ÷ first-half effort. */
  readonly aggressionLevel: number;
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
  /** The newest push's reading even when it did not exhaust (for Inspect). */
  readonly latestPush: ExhaustionReading | null;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function selectExhaustion(anatomy: AbsorptionAnatomyVM | null | undefined): ExhaustionVM {
  const basis: EffortBasis = anatomy?.basis ?? "UNMEASURED";
  const base = { version: EXHAUSTION_VERSION, basis };
  if (!anatomy || !anatomy.measured || basis === "UNMEASURED") {
    return { ...base, measured: false, reason: "UNMEASURED_EFFORT", marks: [], latestPush: null };
  }
  const bars = anatomy.bars;
  if (bars.length < MIN_PUSH_BARS + 1) {
    return { ...base, measured: false, reason: "TOO_FEW_BARS", marks: [], latestPush: null };
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
      const aggressionLevel = effFirst > 0 ? effSecond / effFirst : 0;
      const energyTransfer = effFirst > 0 && effSecond > 0 && dispFirst > 0
        ? (dispSecond / effSecond) / (dispFirst / effFirst)
        : null;
      const exhausted = aggressionLevel < DECLINING_AT && extension >= EXTENDED_AT && followThrough === 0;
      readings.push({
        direction: up ? "UP" : "DOWN",
        time: extreme.time,
        price: extremePrice,
        pushBars: len,
        aggressionLevel,
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
    latestPush: readings.at(-1) ?? null,
  };
}

export default selectExhaustion;
