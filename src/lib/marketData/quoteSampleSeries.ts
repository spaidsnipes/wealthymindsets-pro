/**
 * QUOTE SAMPLES ARE NOT CANDLES (2026-10-01, serving).
 *
 * Yahoo's 1-minute spot FX (EURUSD) answers 199 of 199 bars with
 * open = high = low = close and volume 0 — one quote sampled per minute, no
 * range. Drawn, it is a row of dashes and the trader reads "nothing on the
 * chart". This names that series so the glass can say so, instead of
 * dressing samples as candles. PURE.
 */
import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";

/** True when at least 90% of the last `window` bars (20 minimum) carry no range. */
export function isQuoteSampleSeries(bars: readonly Pick<LegacyOhlcvTuple, "high" | "low">[], window = 120): boolean {
  const tail = bars.slice(-window);
  if (tail.length < 20) return false;
  const flat = tail.filter(b => b.high === b.low).length;
  return flat / tail.length >= 0.9;
}

/** The sentence the glass shows over such a series. */
export function quoteSampleSentence(timeframe: string): string {
  return `These ${timeframe} bars are quote samples — the source publishes no high or low at this size. Choose 5m or larger for real candles.`;
}
