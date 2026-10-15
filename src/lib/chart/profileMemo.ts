/**
 * ONE PROFILE BUILD PER BAR READING (perf pass 2026-10-15).
 *
 * The chart's volume-profile columns (WM Fixed VP, Session VP) rebuilt their profile from the
 * whole bar history on EVERY paint — ~5,000 bars, each spread over its price buckets with a
 * string rounding per bucket — although the answer only changes when a bar does. On a busy
 * BTC-USD 15s tape the paint lap that holds them read 6.5 ms of an ~8 ms paint.
 *
 * `memoProfile` keys the build on what can change it: the symbol, the build options, how many
 * bars, the first bar's time and the last bar's full reading (the forming bar is the only one
 * a live tick moves; a new bar changes the count and the last time). Same key → the same
 * snapshot object, identical to a fresh build. A closed bar corrected in place after the next
 * bar opened is picked up on the next tick, which changes the forming bar.
 */
import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";

const MAX_ENTRIES = 8;
const cache = new Map<string, unknown>();

export function profileMemoKey(symbol: string, bars: readonly LegacyOhlcvTuple[], opts: object): string {
  const n = bars.length;
  const first = n ? bars[0] : null;
  const last = n ? bars[n - 1] : null;
  return [
    symbol, JSON.stringify(opts), n, first?.time,
    last?.time, last?.open, last?.high, last?.low, last?.close, last?.volume,
  ].join("|");
}

export function memoProfile<T>(key: string, build: () => T): T {
  if (cache.has(key)) return cache.get(key) as T;
  const value = build();
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
  cache.set(key, value);
  return value;
}

/** Test seam. */
export function resetProfileMemo(): void {
  cache.clear();
}
