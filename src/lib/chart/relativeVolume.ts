/**
 * RELATIVE VOLUME TONE — Garden 19 census C-03 (revised §3a), PURE.
 *
 * "Was this bar unusually busy for its time of day?" The answer is a
 * PERCENTILE, and it is shown as tone on the bar's own VOLUME bar (the effort
 * owner) — never on the candle body, which belongs to Clarity (F05A).
 *
 * Basis ladder, named in the receipt:
 *   SLOT     the same time-of-day slot over ≥ SLOT_MIN_SESSIONS earlier
 *            sessions in the loaded history (the honest RVOL baseline)
 *   ROLLING  not enough sessions loaded: the trailing ROLLING_BARS bars —
 *            a weaker baseline, labelled as such, never passed off as SLOT
 * No real traded volume (spot FX, placeholder feeds) → SILENT. No quote count
 * is relabelled as volume.
 */

import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";

export type RvolBasis = "SLOT" | "ROLLING";

export interface RvolBar {
  readonly time: number;
  /** 0..1 — share of the baseline sample this bar's volume exceeds. */
  readonly pct: number;
  readonly basis: RvolBasis;
  readonly sample: number;
}

export const SLOT_MIN_SESSIONS = 10;
export const SLOT_MAX_SESSIONS = 20;
export const ROLLING_BARS = 40;
export const ROLLING_MIN = 20;
/** Bars below this percentile take no tone (ordinary is silent). */
export const TONE_FLOOR = 0.6;
export const RVOL_BUDGET_MS = 1.5;

type Bar = Pick<LegacyOhlcvTuple, "time" | "volume">;

/**
 * RVOL percentile per bar in [from..to]. `bars` is the full chronological
 * series (the baseline reads history behind the camera). `barSec` must be
 * intraday for SLOT; daily+ uses ROLLING.
 */
export function readRelativeVolume(bars: readonly Bar[], from: number, to: number, barSec: number): RvolBar[] {
  const out: RvolBar[] = [];
  const intraday = barSec > 0 && barSec < 86_400;
  // Slot index: time-of-day → volumes of earlier bars at that slot (newest last).
  const bySlot = new Map<number, number[]>();
  const lo = Math.max(0, from), hi = Math.min(bars.length - 1, to);
  for (let i = 0; i <= hi; i++) {
    const b = bars[i];
    const v = b.volume;
    const ok = Number.isFinite(v) && v > 0;
    if (i >= lo && ok) {
      let sample: number[] | null = null;
      let basis: RvolBasis = "ROLLING";
      if (intraday) {
        const prior = bySlot.get(((b.time % 86_400) + 86_400) % 86_400);
        if (prior && prior.length >= SLOT_MIN_SESSIONS) { sample = prior.slice(-SLOT_MAX_SESSIONS); basis = "SLOT"; }
      }
      if (!sample) {
        const r: number[] = [];
        for (let j = i - 1; j >= 0 && r.length < ROLLING_BARS; j--) { const w = bars[j].volume; if (Number.isFinite(w) && w > 0) r.push(w); }
        if (r.length >= ROLLING_MIN) sample = r;
      }
      if (sample) {
        let below = 0;
        for (const w of sample) if (w < v) below++;
        out.push({ time: b.time, pct: below / sample.length, basis, sample: sample.length });
      }
    }
    if (intraday && ok) {
      const slot = ((b.time % 86_400) + 86_400) % 86_400;
      let arr = bySlot.get(slot);
      if (!arr) { arr = []; bySlot.set(slot, arr); }
      arr.push(v);
    }
  }
  return out;
}

/** Tone alpha for a percentile: silent below TONE_FLOOR, rising to 0.42 at the top. */
export function rvolToneAlpha(pct: number): number {
  if (!(pct >= TONE_FLOOR)) return 0;
  return Math.round((0.12 + 0.3 * ((pct - TONE_FLOOR) / (1 - TONE_FLOOR))) * 1000) / 1000;
}
