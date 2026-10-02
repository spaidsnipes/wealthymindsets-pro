/**
 * VALUE CANDLE PER BAR, OVER THE WHOLE HELD TAPE (cross-market run BTC 1m,
 * 2026-10-01: Value Candle ON, receipt DRAWN, yet it stood on the forming bar
 * alone — the readings were compiled from the live tick ring (2,000 prints,
 * a few minutes), while the 40,000-print backfill lived only in the chart's
 * per-bar print store). Readings the ring holds win; every other bar the
 * store can read is added, in time order. PURE.
 */
import type { ValueCandleBar, ValueCandleBarsVM } from "./selectValueCandle";

export function mergeValueCandleBars(
  ring: ValueCandleBarsVM | null | undefined,
  extra: readonly ValueCandleBar[],
): ValueCandleBarsVM | null | undefined {
  if (!ring || ring.reason !== "PER_BAR" || extra.length === 0) return ring;
  const have = new Set(ring.bars.map(b => b.time));
  const add = extra.filter(b => !have.has(b.time));
  if (add.length === 0) return ring;
  return { ...ring, bars: [...add, ...ring.bars].sort((a, b) => a.time - b.time) };
}
