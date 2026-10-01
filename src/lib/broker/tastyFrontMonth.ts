"use client";

/**
 * ONE answer per futures product to "which tastytrade contract feeds this
 * chart?" — the active month from `/api/broker/tastytrade/chain?futures=` —
 * shared by the live lane (useWebSocket) and the history load (MainChart), and
 * asked once per page per product. A refusal (not the owner, not connected) is
 * remembered as null so neither consumer keeps asking.
 */

import { futuresProductFor } from "@/lib/broker/tastytradeFuturesChain";
import { resolveTastyContract, resolveTastyFrontMonth, type TastyFrontMonth } from "@/lib/marketData/adapters/tastytradeFuturesTicks";
import { classifySymbol } from "@/lib/marketData/symbolAssetClass";
import { parseFuturesNotation } from "@/lib/marketData/futuresNotation";

const cache = new Map<string, Promise<TastyFrontMonth | null>>();

/**
 * Garden 18 §LXXXI/§LXXXIII — LIVE SOURCE ELECTION for the price lane: a
 * future resolves to its contract (above); a US stock or ETF streams under its
 * own ticker on tastytrade's consolidated feed. Anything else: null (the other
 * lanes keep their own honest labels). `equity` tells the lane that these
 * prints carry no exchange aggressor and must take the unsigned door.
 */
export function tastyLiveContractFor(chartSymbol: string): Promise<(TastyFrontMonth & { readonly equity: boolean }) | null> {
  const cls = classifySymbol(chartSymbol);
  if (cls === "FUTURES") return tastyFrontMonthFor(chartSymbol).then(c => (c ? { ...c, equity: false } : null));
  const sym = chartSymbol.trim().toUpperCase();
  if (cls === "EQUITY" && /^[A-Z]{1,5}(\.[A-Z])?$/.test(sym)) return Promise.resolve({ symbol: sym, streamer: sym, equity: true });
  return Promise.resolve(null);
}

export function tastyFrontMonthFor(chartSymbol: string): Promise<TastyFrontMonth | null> {
  const product = classifySymbol(chartSymbol) === "FUTURES" ? futuresProductFor(chartSymbol) : null;
  if (!product) return Promise.resolve(null);
  // A specific month (/MNQH7) charts THAT contract; a continuous symbol
  // (MNQ1!) charts tastytrade's active month.
  const exact = parseFuturesNotation(chartSymbol)?.exactSymbol ?? null;
  const key = exact ?? product;
  let p = cache.get(key);
  if (!p) {
    p = fetch(`/api/broker/tastytrade/chain?futures=${encodeURIComponent(product)}`, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(j => (j?.state === "OK" ? (exact ? resolveTastyContract(j.data, exact) : resolveTastyFrontMonth(j.data)) : null))
      .catch(() => null);
    cache.set(key, p);
  }
  return p;
}
