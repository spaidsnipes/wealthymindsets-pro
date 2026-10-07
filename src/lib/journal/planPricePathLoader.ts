"use client";
/**
 * Loads the hold's 1-minute bars from the ONE candle owner (tastytrade's
 * stream, the same door TradeReplay and the chart use). Read only; asked only
 * when the trader presses "Load the price path".
 */
import { requestTastyCandles } from "@/lib/broker/tastyQuoteStream";
import { tastyCandleStreamerFor } from "@/lib/broker/tastyFrontMonth";
import { optionStreamerFor } from "@/lib/journal/tradeReplay";
import { tastyCandleSymbol, tastyCandlesToBars } from "@/lib/marketData/adapters/tastytradeCandles";
import { pricePathFromBars, type PathWindow } from "./planPricePath";
import type { PricePath } from "./planVsActual";

/** tastytrade's OCC option symbol (`TSLA  261002C00305000`) → dxFeed's (`.TSLA261002C305`). */
export function occToStreamer(symbol: string): string | null {
  const m = /^([A-Z.]{1,6})\s+(\d{6})([CP])(\d{8})$/.exec(symbol.trim());
  if (!m) return null;
  return `.${m[1]}${m[2]}${m[3]}${String(Number(m[4]) / 1000)}`;
}

export async function loadPlanPricePath(symbol: string, w: PathWindow): Promise<{ path: PricePath } | { reason: string }> {
  const streamer = occToStreamer(symbol) ?? optionStreamerFor(symbol) ?? await tastyCandleStreamerFor(symbol).catch(() => null);
  if (!streamer) return { reason: `tastytrade names no candle stream for ${symbol}` };
  const rows = await requestTastyCandles(tastyCandleSymbol(streamer, "1m") ?? `${streamer}{=m}`, streamer, w.fromMs, 20_000).catch(() => null);
  if (!rows) return { reason: "tastytrade did not answer — the price path needs a connected tastytrade account" };
  const path = pricePathFromBars(tastyCandlesToBars(rows, 100_000), w, `tastytrade 1m bars for ${streamer}`);
  return path ? { path } : { reason: "tastytrade returned no 1-minute bars for this hold" };
}
