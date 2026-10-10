/**
 * SECONDS BARS FROM THE VENUE'S OWN PRINTS (PURE).
 *
 * Coinbase publishes no candle under one minute (/api/exchange answers 15s
 * with "coinbase does not provide 15s candles"), so BTC-USD 5s / 15s / 30s drew
 * history only when tastytrade's DXLink candle snapshot happened to answer —
 * serving 2026-10-10: one load 137 bars, the next "NO BAR HISTORY · 4 of 5
 * sources". The live tape IS Coinbase; its public trades endpoint returns the
 * same prints (same trade_id). Bucketing those prints is the bar the tape
 * would have built had the tab been open: no estimate, no other venue.
 */
import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import { liveBarStartSec } from "@/lib/marketData/liveBarPolicy";

import type { Tick } from "@/hooks/useWebSocket";

/** A print as the tape carries it (Tick), plus the venue's trade id for dedupe. */
type VenuePrint = Pick<Tick, "time" | "price" | "size"> & { readonly id?: string };

/** Oldest-first OHLCV for `intervalSec` from prints (ms timestamps). Duplicate ids count once. */
export function barsFromPrints(prints: readonly VenuePrint[], intervalSec: number): LegacyOhlcvTuple[] {
  if (!(intervalSec > 0)) return [];
  const seen = new Set<string>();
  const sorted = [...prints]
    .filter(p => Number.isFinite(p.time) && p.price > 0 && p.size >= 0)
    .sort((a, b) => a.time - b.time);
  const out: LegacyOhlcvTuple[] = [];
  for (const p of sorted) {
    if (p.id) { if (seen.has(p.id)) continue; seen.add(p.id); }
    const t = liveBarStartSec(p.time / 1000, intervalSec);
    const last = out[out.length - 1];
    if (last && last.time === t) {
      out[out.length - 1] = { ...last, high: Math.max(last.high, p.price), low: Math.min(last.low, p.price), close: p.price, volume: last.volume + p.size };
    } else out.push({ time: t, open: p.price, high: p.price, low: p.price, close: p.price, volume: p.size });
  }
  return out;
}
