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
import { cryptoBaseTicker } from "@/lib/marketData/canonicalIdentity";

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

/** Coins tastytrade lists against USD (its crypto venue streams `COIN/USD:CXTALP`). */
export const TASTY_CRYPTO_COINS: ReadonlySet<string> = new Set(["BTC", "ETH", "LTC", "BCH", "SOL", "DOGE", "AVAX", "LINK", "UNI", "AAVE", "DOT", "ADA", "XLM"]);

/**
 * WHICH TASTYTRADE STREAM DRAWS THIS CHART'S CANDLES — every market tastytrade
 * carries, one answer (Garden 18 §LXXXIII "Tasty is sensor"):
 *   futures (index, metals, energy, grains, FX futures, any listed product)
 *     → the contract (continuous = active month, a specific month = itself)
 *   stocks / ETFs → the ticker itself
 *   crypto tastytrade lists → the USD pair (BTC → BTC/USD:CXTALP)
 * Spot FX and anything tastytrade does not list → null: the next door serves,
 * with its own provenance on the glass.
 */
/**
 * The tastytrade crypto stream for a chart symbol — bare or USD-quoted coins
 * only (BTC, BTCUSD, BTC-USD, BTC/USD). A USDT/USDC pair is a different
 * market and is never answered with USD bars. PURE.
 */
export function tastyCryptoStreamer(chartSymbol: string): string | null {
  const sym = chartSymbol.trim().toUpperCase();
  if (sym.includes(":") || /USD[TC]$/.test(sym)) return null;
  const base = cryptoBaseTicker(sym);
  if (!base || !TASTY_CRYPTO_COINS.has(base)) return null;
  const quote = sym.slice(base.length).replace(/^[-/]/, "");
  return quote === "" || quote === "USD" ? `${base}/USD:CXTALP` : null;
}

export function tastyCandleStreamerFor(chartSymbol: string): Promise<string | null> {
  const cls = classifySymbol(chartSymbol);
  if (cls === "FUTURES") return tastyFrontMonthFor(chartSymbol).then(c => c?.streamer ?? null);
  const sym = chartSymbol.trim().toUpperCase();
  if (cls === "EQUITY" && /^[A-Z]{1,5}(\.[A-Z])?$/.test(sym)) return Promise.resolve(sym);
  if (cls === "CRYPTO") return Promise.resolve(tastyCryptoStreamer(sym));
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
    // A refusal or a failed read is not an answer to keep: the next ask
    // retries (garden pass 2026-10-04 — a failure was cached for the tab's life).
    void p.then(v => { if (v == null && cache.get(key) === p) cache.delete(key); });
  }
  return p;
}

/** Sign-out: the next account resolves its own contracts. */
export function forgetTastyFrontMonths(): void { cache.clear(); }
