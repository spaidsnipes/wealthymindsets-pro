/**
 * PRICE PRECISION — how many decimals the market actually quotes, read from
 * the bars themselves.
 *
 * Found on serving (EURUSD 1h desktop, 2026-09-25): the candle series had no
 * `priceFormat`, so every instrument inherited the charting library's default
 * of two decimals. The axis read 1.15 / 1.14 / 1.13, the legend read
 * "1.14 +0.00 (+0.20%)" for a 0.0023 move, and O/H/L all read 1.14 — a
 * forex chart that could not state a forex price.
 *
 * The rule: the smallest decimal count (at least 2, at most 8) that states
 * every recent price exactly. NQ's quarter ticks and a stock's cents stay at
 * 2; EURUSD's pips come out at 4–5. If the feed's floats carry adder noise so
 * no count is exact, fall back on magnitude (4 significant figures below the
 * point), never below 2.
 *
 * PURE. DETERMINISTIC.
 */

import type { CanonicalBar } from "@/lib/marketData/canonicalBar";

export const MIN_PRICE_PRECISION = 2;
export const MAX_PRICE_PRECISION = 8;
/** How many of the newest bars are read — enough to see the quoting grid. */
export const PRECISION_SAMPLE_BARS = 300;
/** Beyond this many significant figures a price digit is float noise, not a quote. */
export const SIGNIFICANT_FIGURES = 7;
/** Share of recent prices a precision must state exactly — the grid, not the odd print. */
export const GRID_SHARE = 0.9;

/** Only the four prices of the one bar shape (M8: no private bar shapes). */
export type PrecisionBar = Pick<CanonicalBar, "open" | "high" | "low" | "close">;

const exactAt = (v: number, d: number): boolean => {
  const scaled = v * 10 ** d;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6 * Math.max(1, Math.abs(scaled)) ** 0.5;
};

export function pricePrecisionFromBars(bars: readonly PrecisionBar[]): number {
  const values: number[] = [];
  for (let i = bars.length - 1; i >= 0 && values.length < PRECISION_SAMPLE_BARS * 4; i--) {
    const b = bars[i];
    for (const v of [b.open, b.high, b.low, b.close]) if (Number.isFinite(v) && v !== 0) values.push(v);
  }
  if (values.length === 0) return MIN_PRICE_PRECISION;
  // SIGNIFICANT-FIGURE CAP. A feed that ships float32 prices (the BTC
  // backfill: 83947.2421875 is an exact binary fraction) is "exact" at 7
  // decimals, and the chart read 83896.2600000 (serving, 2026-09-25). No
  // venue quotes past ~7 significant figures, so the decimals stop there:
  // 5 integer digits → 2, EURUSD's 1 → up to 6, a sub-penny coin → 8.
  const maxAbs = Math.max(...values.map(v => Math.abs(v)));
  const intDigits = Math.floor(Math.log10(maxAbs)) + 1;
  const cap = Math.min(MAX_PRICE_PRECISION, Math.max(MIN_PRICE_PRECISION, SIGNIFICANT_FIGURES - intDigits));
  // THE QUOTING GRID, NOT THE ODD PRINT. A handful of sub-penny fills
  // (midpoint / dark-pool prints on TSLA: 373.805) put the whole axis on three
  // decimals — "377.000" (serving, 2026-09-25). The grid is the smallest count
  // that states nearly every recent price exactly.
  const need = Math.ceil(values.length * GRID_SHARE);
  for (let d = MIN_PRICE_PRECISION; d <= cap; d++) {
    let exact = 0;
    for (const v of values) if (exactAt(v, d)) exact++;
    if (exact >= need) return d;
  }
  // Noise: no count under the cap is exact. Four significant figures below
  // the point, never past the cap.
  const byMagnitude = 4 - Math.floor(Math.log10(maxAbs));
  return Math.min(cap, Math.max(MIN_PRICE_PRECISION, byMagnitude));
}

/** The series' `priceFormat` for that precision: the axis, last-price tag and crosshair read it. */
export function priceFormatFor(precision: number): { type: "price"; precision: number; minMove: number } {
  const p = Math.min(MAX_PRICE_PRECISION, Math.max(MIN_PRICE_PRECISION, Math.round(precision)));
  return { type: "price", precision: p, minMove: Number((10 ** -p).toFixed(p)) };
}
