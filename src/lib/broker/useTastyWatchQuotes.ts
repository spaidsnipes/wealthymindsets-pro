"use client";
/**
 * WATCHLIST LIVE TRUTH — Garden 18 §LIV/§LXXXIX. "One truth, many surfaces."
 *
 * The chart elects tastytrade's live lane for stocks and futures; the
 * Watchlist must not show the same symbol as ACTIVE DEGRADED beside it. This
 * resolves each row to its tastytrade streamer (a future → its contract) and
 * subscribes LIGHT QUOTES only — one shared socket, no depth, no tape — so a
 * long list costs a quote per symbol, never a chart's worth of data.
 */
import { useEffect, useMemo, useState } from "react";

import { tastyLiveContractFor } from "@/lib/broker/tastyFrontMonth";
import { useTastyQuotes } from "@/lib/broker/tastyQuoteStream";

export interface WatchLive { readonly price: number; readonly at: number }

/** Fresher than this is LIVE; older is left to the row's own source. */
export const WATCH_LIVE_FRESH_MS = 15_000;

export function useTastyWatchQuotes(symbols: readonly string[]): ReadonlyMap<string, WatchLive> {
  const key = useMemo(() => [...new Set(symbols.map(s => s.toUpperCase()))].sort().join(","), [symbols]);
  const [streamerOf, setStreamerOf] = useState<ReadonlyMap<string, string>>(new Map());
  useEffect(() => {
    let live = true;
    const syms = key ? key.split(",") : [];
    Promise.all(syms.map(s => tastyLiveContractFor(s).then(c => [s, c?.streamer ?? null] as const).catch(() => [s, null] as const)))
      .then(pairs => { if (live) setStreamerOf(new Map(pairs.filter((p): p is readonly [string, string] => !!p[1]))); });
    return () => { live = false; };
  }, [key]);
  const streamers = useMemo(() => [...streamerOf.values()], [streamerOf]);
  const snap = useTastyQuotes(streamers);
  return useMemo(() => {
    const out = new Map<string, WatchLive>();
    for (const [sym, st] of streamerOf) {
      const q = snap.quotes.get(st);
      if (!q) continue;
      // The LAST TRADE, as the chart prints it; the bid/ask midpoint only
      // when no trade has been heard (one number for one symbol, §LXXXIX).
      if (q.last != null && q.last > 0 && q.tradeAt != null) { out.set(sym, { price: q.last, at: Math.max(q.tradeAt, q.quoteAt ?? 0) }); continue; }
      if (q.quoteAt == null) continue;
      const price = q.bid != null && q.ask != null ? (q.bid + q.ask) / 2 : null;
      if (price != null && price > 0) out.set(sym, { price, at: q.quoteAt });
    }
    return out;
  }, [snap, streamerOf]);
}
