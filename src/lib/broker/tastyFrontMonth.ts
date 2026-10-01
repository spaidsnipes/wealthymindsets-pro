"use client";

/**
 * ONE answer per futures product to "which tastytrade contract feeds this
 * chart?" — the active month from `/api/broker/tastytrade/chain?futures=` —
 * shared by the live lane (useWebSocket) and the history load (MainChart), and
 * asked once per page per product. A refusal (not the owner, not connected) is
 * remembered as null so neither consumer keeps asking.
 */

import { futuresProductFor } from "@/lib/broker/tastytradeFuturesChain";
import { resolveTastyFrontMonth, type TastyFrontMonth } from "@/lib/marketData/adapters/tastytradeFuturesTicks";
import { classifySymbol } from "@/lib/marketData/symbolAssetClass";

const cache = new Map<string, Promise<TastyFrontMonth | null>>();

export function tastyFrontMonthFor(chartSymbol: string): Promise<TastyFrontMonth | null> {
  const product = classifySymbol(chartSymbol) === "FUTURES" ? futuresProductFor(chartSymbol) : null;
  if (!product) return Promise.resolve(null);
  let p = cache.get(product);
  if (!p) {
    p = fetch(`/api/broker/tastytrade/chain?futures=${encodeURIComponent(product)}`, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(j => (j?.state === "OK" ? resolveTastyFrontMonth(j.data) : null))
      .catch(() => null);
    cache.set(product, p);
  }
  return p;
}
