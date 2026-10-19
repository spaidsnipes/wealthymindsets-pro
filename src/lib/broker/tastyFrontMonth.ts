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
  const idx = cls === "INDEX" ? tastyIndexStreamer(sym) : null;
  // An index prints no trades with an aggressor; it takes the unsigned door like a stock.
  if (idx) return Promise.resolve({ symbol: idx, streamer: idx, equity: true });
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

/**
 * CASH INDICES on tastytrade's stream (2026-10-12, live-only order): the chart's index notations
 * (SPX, ^GSPC, ^SPX, NDX, ^NDX, VIX, ^VIX, RUT, ^RUT) → tastytrade's own index symbol. Anything else: null.
 */
const TASTY_INDEX: Readonly<Record<string, string>> = {
  SPX: "SPX", "^GSPC": "SPX", "^SPX": "SPX",
  NDX: "NDX", "^NDX": "NDX",
  VIX: "VIX", "^VIX": "VIX",
  RUT: "RUT", "^RUT": "RUT",
};
export function tastyIndexStreamer(chartSymbol: string): string | null {
  return TASTY_INDEX[chartSymbol.trim().toUpperCase()] ?? null;
}

export function tastyCandleStreamerFor(chartSymbol: string): Promise<string | null> {
  const cls = classifySymbol(chartSymbol);
  if (cls === "FUTURES") return tastyFrontMonthFor(chartSymbol).then(c => c?.streamer ?? null);
  const sym = chartSymbol.trim().toUpperCase();
  if (cls === "EQUITY" && /^[A-Z]{1,5}(\.[A-Z])?$/.test(sym)) return Promise.resolve(sym);
  if (cls === "CRYPTO") return Promise.resolve(tastyCryptoStreamer(sym));
  if (cls === "INDEX") return Promise.resolve(tastyIndexStreamer(sym));
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
      .then(j => (j?.state === "OK" ? (exact ? resolveTastyContract(j.data, exact) : resolveTastyFrontMonth(j.data)) ?? (exact ? null : feedOnlyFrontMonth(product, Date.now())) : null))
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

/*
 * FEED-ONLY CME CURRENCY FUTURES (Founder 2026-10-18: "every single forex pair"). Measured from his Chrome: tastytrade's
 * DXLink quotes /RP /RY /RF /6L /6Z live, but its futures chain lists no contract for them, so the chart had nothing to
 * open. For these roots ONLY, the active quarterly contract's streamer symbol is built directly (CME FX: Mar/Jun/Sep/Dec,
 * last trade two business days before the third Wednesday). Chart-only — tastytrade lists no tradable contract.
 */
export const FEED_ONLY_FX_ROOTS: ReadonlySet<string> = new Set(["RP", "RY", "RF", "6L", "6Z"]);
const QMONTHS: readonly [number, string][] = [[2, "H"], [5, "M"], [8, "U"], [11, "Z"]];
export function feedOnlyFrontMonth(root: string, nowMs: number): TastyFrontMonth | null {
  if (!FEED_ONLY_FX_ROOTS.has(root)) return null;
  const now = new Date(nowMs);
  for (let y = now.getUTCFullYear(); y <= now.getUTCFullYear() + 1; y++) {
    for (const [m, code] of QMONTHS) {
      // third Wednesday
      const first = new Date(Date.UTC(y, m, 1)).getUTCDay();
      const thirdWed = 1 + ((3 - first + 7) % 7) + 14;
      const lastTrade = Date.UTC(y, m, thirdWed - 2, 14, 16); // ~09:16 CT, two days before
      if (lastTrade > nowMs) {
        const sym = `/${root}${code}${String(y).slice(2)}`;
        return { symbol: sym, streamer: `${sym}:XCME` };
      }
    }
  }
  return null;
}
