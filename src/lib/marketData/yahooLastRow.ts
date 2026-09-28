/**
 * YAHOO'S LAST ROW IS A QUOTE, NOT A BAR OPEN.
 *
 * Yahoo's intraday chart answers with every interval's bar stamped at its OPEN
 * — and then, while the market trades, one more row stamped at the LAST TRADE
 * (serving /api/yahoo ES1! 15m, 2026-09-28: …18:45:00, 19:00:00, 19:03:16).
 * Drawn as-is that row is a phantom extra candle, and the header read
 * "BAR OPENED 02:02 PM" — a time no 15-minute bar ever opens at.
 *
 * The row is the forming bar's latest state. It is FOLDED into its interval's
 * bucket: merged into the bar already open at that bucket (its high/low widen,
 * its close is the newer price; the volume is NOT added — the row's volume is
 * Yahoo's and may already be inside the bar's), or, when that bucket has no
 * bar yet, re-stamped to the bucket's open.
 *
 * Only intervals ≤ 30m, whose opens fall on epoch multiples for every venue on
 * this feed. An hourly equity bar opens at :30 and daily bars at session
 * opens, so there "off-grid" is not evidence of anything.
 *
 * PURE. DETERMINISTIC.
 */
import type { LegacyOhlcvTuple } from "./canonicalBar";

export const YAHOO_GRID_SECONDS: Readonly<Record<string, number>> = Object.freeze({
  "1m": 60, "2m": 120, "5m": 300, "15m": 900, "30m": 1800,
});

export function foldYahooLastRow(bars: readonly LegacyOhlcvTuple[], interval: string): { bars: LegacyOhlcvTuple[]; folded: "NONE" | "MERGED" | "RESTAMPED" } {
  const step = YAHOO_GRID_SECONDS[interval];
  const out = bars.slice();
  const last = out[out.length - 1];
  if (!step || !last || last.time % step === 0) return { bars: out, folded: "NONE" };
  const bucket = Math.floor(last.time / step) * step;
  const prev = out[out.length - 2];
  if (prev && prev.time === bucket) {
    out.splice(out.length - 2, 2, {
      time: bucket,
      open: prev.open,
      high: Math.max(prev.high, last.high),
      low: Math.min(prev.low, last.low),
      close: last.close,
      volume: prev.volume,
    });
    return { bars: out, folded: "MERGED" };
  }
  if (prev && prev.time > bucket) return { bars: out.slice(0, -1), folded: "MERGED" };
  out[out.length - 1] = { ...last, time: bucket };
  return { bars: out, folded: "RESTAMPED" };
}
