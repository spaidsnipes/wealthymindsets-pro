/**
 * EFFORT → RESPONSE ACROSS THE CANDLE SEQUENCE — Garden 19 §7, PURE.
 *
 * The Response Matrix (effortEvidence.ts) already sorts every bar into a cell
 * and COUNTS them; the Effort panel reads ONE bar. Neither lets the trader see
 * the shape of the phenomenon THROUGH TIME. This module turns the same two
 * readings into one geometry per closed bar so the glass can draw it on the
 * volume band the candles already stand on:
 *
 *   EFFORT    the bar's traded volume — the volume bar itself. Nothing new is
 *             drawn for it; the histogram IS the effort (one owner).
 *   RESPONSE  the bar's displacement |close − open| in ATR(14) units, drawn as a
 *             narrow column INSIDE that volume bar, scaled so a bar whose
 *             response is exactly as ordinary as its effort fills its own
 *             volume bar to the top:
 *
 *                 responseHeight = effortHeight × (response ratio ÷ effort ratio)
 *
 *             (each ratio against the camera's own median). A tall volume bar
 *             with a short column = effort spent, little moved (ABSORBED). A
 *             full column = the effort bought displacement (INITIATIVE). A
 *             column climbing OUT of a short volume bar = response with no
 *             fuel (VACUUM). Read without a single number.
 *
 * Cells come from `cellFor` — the Response Matrix's own thresholds (one rule,
 * no second classifier). The medians are the CAMERA's (the bars in view), so
 * the field re-ranks on pan exactly as the trader's eye does; the matrix
 * card's newest-bar cell is ranked over its trailing 100 and is named as such.
 *
 * Only bars with REAL traded volume take part. A feed without it (spot FX, a
 * placeholder feed) returns a SILENT reading with the plain reason; no quote
 * count is fabricated into "effort".
 */

import { cellFor, type ResponseCell } from "@/lib/chart/effortEvidence";
import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";

/** The canonical bar's legacy shape (epoch SECONDS) — no private bar here (M8). */
export type FieldBar = Pick<LegacyOhlcvTuple, "time" | "open" | "high" | "low" | "close" | "volume">;

export interface EffortResponseBar {
  readonly time: number;
  readonly volume: number;
  /** Volume ÷ median volume of the bars read. */
  readonly effort: number;
  /** |close − open| ÷ ATR(14) at that bar. */
  readonly responseAtr: number;
  /** responseAtr ÷ median responseAtr of the bars read. */
  readonly response: number;
  /** response ÷ effort — 1 = the effort bought an ordinary displacement. */
  readonly efficiency: number;
  readonly cell: ResponseCell;
  readonly up: boolean;
}

export type EffortResponseField =
  | { readonly state: "DRAWN"; readonly bars: readonly EffortResponseBar[]; readonly counts: Readonly<Record<ResponseCell, number>> }
  | { readonly state: "SILENT"; readonly reason: "NEEDS_TRADED_VOLUME" | "TOO_FEW_BARS"; readonly why: string };

export const ATR_PERIOD = 14;
/** Fewer closed, volume-bearing bars in view than this cannot set a median. */
export const FIELD_MIN_BARS = 12;
/** A response column never climbs past this many effort-heights of a median bar. */
export const RESPONSE_CAP = 3;
export const EFFORT_RESPONSE_BUDGET_MS = 1.5;

const median = (xs: readonly number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Wilder ATR per index (NaN until the first period completes). */
export function atrSeries(bars: readonly FieldBar[], period = ATR_PERIOD): number[] {
  const out = new Array<number>(bars.length).fill(NaN);
  let atr = NaN, sum = 0;
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const pc = i > 0 ? bars[i - 1].close : b.open;
    const tr = Math.max(b.high - b.low, Math.abs(b.high - pc), Math.abs(b.low - pc));
    if (!Number.isFinite(tr)) { out[i] = atr; continue; }
    if (i < period) { sum += tr; if (i === period - 1) atr = sum / period; }
    else atr = (atr * (period - 1) + tr) / period;
    out[i] = atr;
  }
  return out;
}

/**
 * `atrSeries` continued from a previous result instead of re-walked (keel cost
 * peak, serving NQ1! 5m 2026-10-07: every new bar re-ran Wilder over all 5,000
 * bars inside the paint frame). `prev` was computed over bars that are still
 * the prefix of `bars` EXCEPT possibly its last entry (the bar that was forming
 * then), so the walk restarts at that entry from `prev`'s value before it.
 * Identical to `atrSeries(bars)` (test); falls back to it when the restart
 * point is inside the warm-up.
 */
export function extendAtrSeries(prev: readonly number[], bars: readonly FieldBar[], period = ATR_PERIOD): number[] {
  const start = prev.length - 1;
  if (start <= period || start > bars.length || !Number.isFinite(prev[start - 1])) return atrSeries(bars, period);
  const out = prev.slice(0, start);
  let atr = prev[start - 1];
  for (let i = start; i < bars.length; i++) {
    const b = bars[i];
    const pc = bars[i - 1].close;
    const tr = Math.max(b.high - b.low, Math.abs(b.high - pc), Math.abs(b.low - pc));
    if (!Number.isFinite(tr)) { out.push(atr); continue; }
    atr = (atr * (period - 1) + tr) / period;
    out.push(atr);
  }
  return out;
}

/**
 * Read the field over bars[from..to] (inclusive, indices into `bars`). `bars`
 * is the full chronological series so ATR has its warm-up behind the camera.
 * `formingTime` excludes the still-forming bar: a bar not finished has not
 * finished responding.
 */
export function readEffortResponseField(
  bars: readonly FieldBar[],
  from: number,
  to: number,
  opts: { readonly volumeReal: boolean; readonly volumeSilenceWhy?: string | null; readonly formingTime?: number | null },
): EffortResponseField {
  if (!opts.volumeReal) {
    return {
      state: "SILENT",
      reason: "NEEDS_TRADED_VOLUME",
      why: opts.volumeSilenceWhy ?? "This market reports no traded volume, so effort cannot be weighed — the field stays empty rather than guess.",
    };
  }
  const atr = atrSeries(bars);
  const lo = Math.max(0, from), hi = Math.min(bars.length - 1, to);
  const raw: { i: number; v: number; r: number }[] = [];
  for (let i = lo; i <= hi; i++) {
    const b = bars[i];
    if (opts.formingTime != null && b.time === opts.formingTime) continue;
    const a = atr[i];
    if (!(b.volume > 0) || !Number.isFinite(b.volume) || !(a > 0)) continue;
    const d = Math.abs(b.close - b.open);
    if (!Number.isFinite(d)) continue;
    raw.push({ i, v: b.volume, r: d / a });
  }
  if (raw.length < FIELD_MIN_BARS) {
    return { state: "SILENT", reason: "TOO_FEW_BARS", why: `Only ${raw.length} finished bars with volume in view — the field needs ${FIELD_MIN_BARS} to set its own median.` };
  }
  const vMed = median(raw.map(x => x.v));
  // A body median of zero (a run of dojis) would make every response infinite;
  // fall back to the mean so a flat camera reads flat, not explosive.
  let rMed = median(raw.map(x => x.r));
  if (!(rMed > 0)) rMed = raw.reduce((s, x) => s + x.r, 0) / raw.length;
  if (!(vMed > 0) || !(rMed > 0)) {
    return { state: "SILENT", reason: "TOO_FEW_BARS", why: "No displacement or no volume across the bars in view — nothing to weigh." };
  }
  const counts: Record<ResponseCell, number> = { ABSORBED: 0, INITIATIVE: 0, VACUUM: 0, QUIET: 0, ORDINARY: 0 };
  const out: EffortResponseBar[] = raw.map(({ i, v, r }) => {
    const b = bars[i];
    const effort = v / vMed, response = r / rMed;
    const cell = cellFor(effort, response);
    counts[cell]++;
    return {
      time: b.time, volume: v, effort, responseAtr: r, response,
      efficiency: effort > 0 ? response / effort : 0, cell, up: b.close >= b.open,
    };
  });
  return { state: "DRAWN", bars: out, counts };
}

/**
 * The response column's height in pixels, given the effort (volume) bar's own
 * painted height. Capped at RESPONSE_CAP median-effort heights so one shock bar
 * cannot spear the price pane.
 */
export function responseColumnHeight(effortPx: number, bar: Pick<EffortResponseBar, "effort" | "response">): number {
  if (!(effortPx > 0) || !(bar.effort > 0)) return 0;
  const medianPx = effortPx / bar.effort;
  return Math.min(medianPx * bar.response, medianPx * RESPONSE_CAP);
}

/** Inspect's plain words for one bar — numbers by disclosure, never on default glass. */
export function effortResponseWords(b: EffortResponseBar): string {
  const shape =
    b.cell === "ABSORBED" ? "large effort · small response" :
    b.cell === "INITIATIVE" ? "large effort · large response" :
    b.cell === "VACUUM" ? "small effort · large response" :
    b.cell === "QUIET" ? "small effort · small response" : "ordinary effort and response";
  return `${shape} · effort ${b.effort.toFixed(2)}× median volume · response ${b.responseAtr.toFixed(2)} ATR (${b.response.toFixed(2)}× median)`;
}
