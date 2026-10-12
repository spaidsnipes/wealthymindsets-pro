/**
 * LIVE CANDLES FOR EVERY SURFACE THAT IS NOT THE CHART (Founder 2026-10-12: "remove
 * anything delayed and dead").
 *
 * The watchlist grid, the scanner map, the Command Deck chart and the journal's
 * unsettled estimate each used to read `/api/yahoo` candles — delayed intraday bars.
 * They now take the same two live doors the chart takes (MainChart's history load,
 * chartBarRoute.ts): the crypto venue's own candles, then tastytrade's contract candles
 * over the shared DXLink socket. Nothing else. A symbol neither door serves answers
 * null, and the surface says it has no live bars — never a delayed picture.
 */
import type { CanonicalBarIdentity, LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import { ingestTastytradeCandles } from "@/lib/marketData/tastytradeCandleIngress";
import { coinbaseProduct } from "@/lib/marketData/coinbaseProduct";
import { resolveExchangeTimeframe } from "@/lib/marketData/exchangeTimeframes";
import { parseExchangeSymbol } from "@/lib/exchanges";
import {
  tastyCandleFromTime, tastyCandlePeriod, tastyCandleSymbol, tastyCandlesToBars, tastyServedTimeframe,
} from "@/lib/marketData/adapters/tastytradeCandles";
import { tastyCandleStreamerFor } from "@/lib/broker/tastyFrontMonth";
import { requestTastyCandles } from "@/lib/broker/tastyQuoteStream";

export type LiveCandleSource = "COINBASE" | "KRAKEN" | "BINANCE" | "TASTYTRADE" | string;

export interface LiveCandles {
  readonly candles: readonly LegacyOhlcvTuple[];
  /** Which live door served them. */
  readonly source: LiveCandleSource;
  /** Each bar's canonical identity, minted by the door that served it (FVG objects need them). */
  readonly identities: readonly CanonicalBarIdentity[];
  /** The symbol id those identities carry (a tastytrade contract, a venue product). */
  readonly symbolId: string | null;
}

/** The crypto venue the chart would open for this symbol, as `{ exchange, coin }`, or null. */
export function liveCandleVenue(symbol: string): { exchange: string; coin: string } | null {
  const pinned = parseExchangeSymbol(symbol);
  if (pinned) return { exchange: pinned.exchange, coin: pinned.coin };
  const product = coinbaseProduct(symbol);
  return product ? { exchange: "coinbase", coin: product.split("-")[0] } : null;
}

/**
 * The live door `fetchLiveCandles` asks first for this symbol and size — the venue that
 * will have printed the bars ("coinbase", "kraken", …) or "tastytrade". For a receipt
 * that must cite the bars' venue (the Command Deck's candle-only dimensions).
 */
export function liveCandleSourceFor(symbol: string, tf: string): string {
  const venue = liveCandleVenue(symbol.trim().toUpperCase());
  return venue && resolveExchangeTimeframe(venue.exchange as never, tf).status === "SUPPORTED" ? venue.exchange : "tastytrade";
}

/**
 * `count` bars of `tf` for `symbol` from a live door, oldest first, or null when no
 * live door serves it. Never throws.
 */
export async function fetchLiveCandles(symbol: string, tf: string, count: number, signal?: AbortSignal): Promise<LiveCandles | null> {
  const sym = symbol.trim().toUpperCase();
  if (!sym || !(count > 0)) return null;

  // 1. The venue's own candles (crypto), when it publishes this size.
  const venue = liveCandleVenue(sym);
  if (venue && resolveExchangeTimeframe(venue.exchange as never, tf).status === "SUPPORTED") {
    try {
      const res = await fetch(`/api/exchange?ex=${venue.exchange}&coin=${encodeURIComponent(venue.coin)}&type=candles&tf=${encodeURIComponent(tf)}&bars=${count}`, { cache: "no-store", signal });
      const j = await res.json() as { candles?: LegacyOhlcvTuple[]; barIdentities?: CanonicalBarIdentity[] };
      if (Array.isArray(j.candles) && j.candles.length) {
        const identities = Array.isArray(j.barIdentities) ? j.barIdentities : [];
        return { candles: j.candles.slice(-count), source: venue.exchange.toUpperCase(), identities, symbolId: identities[0]?.symbolId ?? null };
      }
    } catch { /* fall to tastytrade */ }
    if (signal?.aborted) return null;
  }

  // 2. tastytrade's own contract candles (futures, stocks/ETFs, the coins it lists).
  const served = tastyServedTimeframe(tf);
  if (!served || !tastyCandlePeriod(served)) return null;
  try {
    const streamer = await tastyCandleStreamerFor(sym);
    if (!streamer || signal?.aborted) return null;
    const candleSymbol = tastyCandleSymbol(streamer, served);
    const fromTime = tastyCandleFromTime(served, count, Date.now());
    if (!candleSymbol || fromTime == null) return null;
    const rows = await requestTastyCandles(candleSymbol, streamer, fromTime);
    if (!rows || signal?.aborted) return null;
    const candles = tastyCandlesToBars(rows, count);
    if (!candles.length) return null;
    const identities = ingestTastytradeCandles({ streamer, timeframe: served, tuples: candles, receivedAt: Date.now() }).identities;
    return { candles, source: "TASTYTRADE", identities, symbolId: identities[0]?.symbolId ?? null };
  } catch {
    return null;
  }
}
