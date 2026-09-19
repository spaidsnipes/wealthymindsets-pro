/*
 * THE YAHOO TIMEFRAME PLANNER NO LONGER DECLARES `YahooOhlcvBar` (2026-09-18).
 *
 * The third and last of the provenance-in-the-name cases, after `KrakenOHLC`
 * and `YahooCandle`. The identifier announced a source that the type could not
 * hold: a Kraken row, a synthetic row and a Yahoo row were all freely
 * assignable to `YahooOhlcvBar` and nothing in the type could object.
 *
 * SHARPER HERE THAN IN THE OTHER TWO, because this module is where bars get
 * RECONSTRUCTED: several plans below are `sourceMode: "reconstructed"`, meaning
 * the bars handed to `/api/yahoo`'s caller were folded from a finer interval
 * and never existed at the requested timeframe on any exchange. The old name
 * said "Yahoo" about both kinds. The new name says "six numbers" about both
 * kinds, which is less wrong and still not right — `sourceMode` is known right
 * here, at the planner, and there is nowhere on the bar to put it.
 * CanonicalBar has `fidelity`, `source` and `provenance`. Still owed.
 */
import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
export interface YahooTimeframePlan {
  interval: string;
  range: string;
  multiplier: number;
  baseSeconds?: number;
  calendarMonths?: number;
  sourceMode: "native" | "reconstructed";
}


const PLANS: Record<string, YahooTimeframePlan> = {
  "1m":  { interval: "1m",  range: "1d",   multiplier: 1,  sourceMode: "native" },
  "2m":  { interval: "2m",  range: "5d",   multiplier: 1,  sourceMode: "native" },
  "3m":  { interval: "1m",  range: "5d",   multiplier: 3,  baseSeconds: 60,   sourceMode: "reconstructed" },
  "5m":  { interval: "5m",  range: "5d",   multiplier: 1,  sourceMode: "native" },
  "10m": { interval: "5m",  range: "5d",   multiplier: 2,  baseSeconds: 300,  sourceMode: "reconstructed" },
  "15m": { interval: "15m", range: "60d",  multiplier: 1,  sourceMode: "native" },
  "30m": { interval: "30m", range: "60d",  multiplier: 1,  sourceMode: "native" },
  "1h":  { interval: "60m", range: "730d", multiplier: 1,  sourceMode: "native" },
  "2h":  { interval: "60m", range: "730d", multiplier: 2,  baseSeconds: 3600, sourceMode: "reconstructed" },
  "4h":  { interval: "60m", range: "730d", multiplier: 4,  baseSeconds: 3600, sourceMode: "reconstructed" },
  "1D":  { interval: "1d",  range: "5y",   multiplier: 1,  sourceMode: "native" },
  "1W":  { interval: "1wk", range: "10y",  multiplier: 1,  sourceMode: "native" },
  "1M":  { interval: "1mo", range: "max",  multiplier: 1,  sourceMode: "native" },
  "3M":  { interval: "3mo", range: "max",  multiplier: 1,  sourceMode: "native" },
  "6M":  { interval: "3mo", range: "max",  multiplier: 2,  calendarMonths: 6,  sourceMode: "reconstructed" },
  "1Y":  { interval: "1mo", range: "max",  multiplier: 12, calendarMonths: 12, sourceMode: "reconstructed" },
  "3Y":  { interval: "1mo", range: "max",  multiplier: 36, calendarMonths: 36, sourceMode: "reconstructed" },
  "5Y":  { interval: "1mo", range: "max",  multiplier: 60, calendarMonths: 60, sourceMode: "reconstructed" },
};

export function resolveYahooTimeframe(timeframe: string): YahooTimeframePlan | null {
  const legacyBoundary = timeframe === "D" ? "1D" : timeframe === "W" ? "1W" : timeframe === "M" ? "1M" : timeframe;
  return PLANS[legacyBoundary] ?? null;
}

function combine(bars: LegacyOhlcvTuple[]): LegacyOhlcvTuple {
  return {
    time: bars[0].time,
    open: bars[0].open,
    high: Math.max(...bars.map(bar => bar.high)),
    low: Math.min(...bars.map(bar => bar.low)),
    close: bars[bars.length - 1].close,
    volume: bars.reduce((sum, bar) => sum + bar.volume, 0),
  };
}

function calendarBucket(time: number, months: number): number {
  const date = new Date(time * 1000);
  const absoluteMonth = date.getUTCFullYear() * 12 + date.getUTCMonth();
  return Math.floor(absoluteMonth / months);
}

export function aggregateYahooBars(
  bars: LegacyOhlcvTuple[],
  plan: YahooTimeframePlan,
  limit: number,
): LegacyOhlcvTuple[] {
  if (plan.multiplier === 1) return bars.slice(-limit);
  if (!bars.length) return [];

  const output: LegacyOhlcvTuple[] = [];
  let bucket: LegacyOhlcvTuple[] = [];
  let bucketId: number | null = null;

  const flush = () => {
    if (bucket.length) output.push(combine(bucket));
    bucket = [];
  };

  for (const bar of bars) {
    if (plan.calendarMonths) {
      const nextBucketId = calendarBucket(bar.time, plan.calendarMonths);
      if (bucketId !== null && nextBucketId !== bucketId) flush();
      bucketId = nextBucketId;
    } else if (bucket.length) {
      const previous = bucket[bucket.length - 1];
      const gap = bar.time - previous.time;
      if ((plan.baseSeconds && gap > plan.baseSeconds * 1.5) || bucket.length >= plan.multiplier) {
        flush();
      }
    }
    bucket.push(bar);
  }
  flush();
  return output.slice(-limit);
}
