/**
 * SHERIFF SWEEP 2026-10-07 — YAHOO'S HOURLY TRAILING ROW.
 *
 * `foldYahooLastRow` (lib/marketData/yahooLastRow) folds Yahoo's last-trade
 * row only for intervals ≤ 30m, because an hourly equity bar opens at :30 and
 * "off the epoch grid" is no evidence there. But the row still arrives:
 *
 *   serving /api/yahoo?sym=AAPL&type=candles&tf=1h, 2026-10-07 17:28Z
 *     … 15:30:00Z, 16:30:00Z, 17:28:10Z      ← the last row is a QUOTE
 *
 * Passed through, the chart bucketed 17:28:10 to the clock hour and drew a
 * phantom 17:00Z candle overlapping the real 16:30Z bar; the header read
 * "BAR OPENED 12:00 PM CDT · FORMING · 0h 32m left" while the venue's bar had
 * opened 11:30 CDT and closed in 2 minutes. The 2h/4h reconstruction counted
 * the row as one of its source bars.
 *
 * The evidence that IS sufficient at any interval: a row stamped INSIDE the
 * previous bar's own interval is that bar's latest state. It is merged (high /
 * low widen, close is the newer price, volume NOT added — the same rule as
 * the ≤30m fold). A row at or beyond the previous bar's end is left alone: it
 * may be a genuinely new bar whose anchor this function cannot prove.
 *
 * PURE. DETERMINISTIC.
 */
import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";

export const YAHOO_HOURLY_SECONDS: Readonly<Record<string, number>> = Object.freeze({
  "60m": 3600, "1h": 3600, "90m": 5400,
});

export function foldHourlyTrailingRow(bars: readonly LegacyOhlcvTuple[], interval: string): { bars: LegacyOhlcvTuple[]; folded: boolean } {
  const step = YAHOO_HOURLY_SECONDS[interval];
  const out = bars.slice();
  const last = out[out.length - 1];
  const prev = out[out.length - 2];
  if (!step || !last || !prev) return { bars: out, folded: false };
  const into = last.time - prev.time;
  if (!(into > 0 && into < step)) return { bars: out, folded: false };
  out.splice(out.length - 2, 2, {
    time: prev.time,
    open: prev.open,
    high: Math.max(prev.high, last.high),
    low: Math.min(prev.low, last.low),
    close: last.close,
    volume: prev.volume,
  });
  return { bars: out, folded: true };
}
