/**
 * TASTYTRADE CANDLE HISTORY — real-time bars for futures (Garden 18 §XXIII/§XXIV).
 *
 * dxFeed's Candle event, subscribed with a `fromTime`, answers a snapshot of
 * the contract's own bars up to the current one. Proven on the owner's socket
 * 2026-10-01 for `/ESZ26:XCME` at 5s, 15s, 1m, 5m, 1h, 4h, d, w, mo — the
 * snapshot opens with eventFlags 4 (SNAPSHOT_BEGIN) and closes with a NaN row
 * flagged 10 (SNAPSHOT_END | REMOVE). dxFeed echoes the period in its short
 * form (`{=1m}` → `{=m}`), so the symbol is built in that form to match.
 *
 * These bars replace a ~10-minute-delayed vendor for futures: the history and
 * the live forming bar come from the same contract on the same stream. PURE.
 */

import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";

const PERIODS: Readonly<Record<string, { readonly period: string; readonly seconds: number }>> = {
  "5s": { period: "5s", seconds: 5 },
  "15s": { period: "15s", seconds: 15 },
  "30s": { period: "30s", seconds: 30 },
  "1m": { period: "m", seconds: 60 },
  "2m": { period: "2m", seconds: 120 },
  "3m": { period: "3m", seconds: 180 },
  "5m": { period: "5m", seconds: 300 },
  "10m": { period: "10m", seconds: 600 },
  "15m": { period: "15m", seconds: 900 },
  "30m": { period: "30m", seconds: 1800 },
  "1h": { period: "h", seconds: 3600 },
  "2h": { period: "2h", seconds: 7200 },
  "4h": { period: "4h", seconds: 14_400 },
  "1D": { period: "d", seconds: 86_400 },
  "1W": { period: "w", seconds: 604_800 },
  "1M": { period: "mo", seconds: 2_629_800 },
};

/** dxFeed's period for a chart timeframe, or null when tastytrade is not asked for it. */
export function tastyCandlePeriod(tf: string): string | null {
  return PERIODS[tf]?.period ?? null;
}

/** The bar size tastytrade serves for a chart timeframe, in seconds (a month counts as 30.4 days). */
export function tastyCandleSeconds(tf: string): number | null {
  return PERIODS[tf]?.seconds ?? null;
}

/** `/ESZ26:XCME{=5m}` — the contract's own streamer symbol with the period attribute. */
export function tastyCandleSymbol(streamer: string, tf: string): string | null {
  const p = tastyCandlePeriod(tf);
  return p ? `${streamer}{=${p}}` : null;
}

/**
 * How far back to ask so `bars` bars come back across the weekly close and the
 * daily maintenance break (futures trade ~23h × 5d): calendar span × 1.5.
 */
export function tastyCandleFromTime(tf: string, bars: number, nowMs: number): number | null {
  const p = PERIODS[tf];
  if (!p || !(bars > 0)) return null;
  return nowMs - Math.ceil(bars * p.seconds * 1000 * 1.5);
}

/**
 * One decoded Candle event's fields, exactly as tastyContractQuote decodes them.
 * Deliberately NOT a bar shape: a bar exists only once, as LegacyOhlcvTuple
 * below (canonicalBarAdoption M8 — no private pasts).
 */
export type TastyCandleRow = Readonly<Record<string, number | null>>;

/** Snapshot rows → chart bars (seconds), oldest first; the NaN end marker and broken rows are dropped. */
export function tastyCandlesToBars(rows: readonly TastyCandleRow[], count: number): LegacyOhlcvTuple[] {
  const byTime = new Map<number, LegacyOhlcvTuple>();
  for (const r of rows) {
    const t = r.time, o = r.open, h = r.high, l = r.low, c = r.close, v = r.volume;
    if (t == null || o == null || h == null || l == null || c == null) continue;
    if (!(o > 0 && h > 0 && l > 0 && c > 0)) continue;
    const time = Math.floor(t / 1000);
    // A later row for the same bar is the newer state of that bar.
    byTime.set(time, { time, open: o, high: h, low: l, close: c, volume: v != null && v >= 0 ? v : 0 });
  }
  return [...byTime.values()].sort((a, b) => a.time - b.time).slice(-count);
}

/** dxFeed eventFlags: the snapshot is complete when SNAPSHOT_END (0x08) or SNAPSHOT_SNIP (0x10) is set. */
export function isSnapshotEnd(flags: number | null): boolean {
  return flags != null && (flags & 0x18) !== 0;
}
