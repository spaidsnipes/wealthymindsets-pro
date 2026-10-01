/**
 * Server half of broker instrument search: asks tastytrade and Webull in
 * parallel under one time budget. Each broker that cannot answer (not
 * configured, no session, slow) simply contributes nothing — search never
 * waits on, or fails because of, one provider (§LXXXVI failure locality).
 * Called only after the owner gate.
 */
import { webullBrokerConfigFromEnv } from "@/lib/broker/adapters/webullBrokerConnection";
import { webullInstrumentGet } from "@/lib/broker/adapters/webullOrders";
import { resolveWebullSessionToken, webullSessionStore, webullWorkerEnv } from "@/lib/marketData/webullSessionStore";
import {
  getTastytradeCryptocurrencies,
  getTastytradeFutureProducts,
  getTastytradeFutures,
  searchTastytradeSymbols,
  tastytradeConfigStatus,
} from "@/lib/tastytrade";

import type { InstrumentSearchHit } from "./instrumentSearch";
import { matchFutureProducts, tastyCryptoHits, tastyFutureContractHits, tastySymbolHits, webullInstrumentHits } from "./brokerInstrumentSearch";

const CATALOGUE_TTL_MS = 60 * 60_000;
let productsCache: { at: number; p: Promise<unknown[]> } | null = null;
let cryptoCache: { at: number; p: Promise<unknown[]> } | null = null;

function cached(slot: "products" | "crypto"): Promise<unknown[]> {
  const now = Date.now();
  const c = slot === "products" ? productsCache : cryptoCache;
  if (c && now - c.at < CATALOGUE_TTL_MS) return c.p;
  const p = (slot === "products" ? getTastytradeFutureProducts() : getTastytradeCryptocurrencies()).catch(() => {
    if (slot === "products") productsCache = null; else cryptoCache = null;
    return [] as unknown[];
  });
  if (slot === "products") productsCache = { at: now, p }; else cryptoCache = { at: now, p };
  return p;
}

const settle = <T,>(p: Promise<T[]>): Promise<T[]> => p.catch(() => [] as T[]);

async function tastytradeHits(q: string): Promise<InstrumentSearchHit[]> {
  if (!tastytradeConfigStatus().configured) return [];
  const [symbols, products, crypto] = await Promise.all([
    settle(searchTastytradeSymbols(q).then(tastySymbolHits)),
    settle(cached("products").then(list => matchFutureProducts(list, q))),
    settle(cached("crypto").then(list => tastyCryptoHits(list, q))),
  ]);
  const months = await Promise.all(products.map(p => settle(getTastytradeFutures(p.code).then(f => tastyFutureContractHits(f, p)))));
  return [...months.flat(), ...symbols, ...crypto];
}

async function webullHits(q: string): Promise<InstrumentSearchHit[]> {
  const sym = q.trim().toUpperCase().replace(/^\//, "");
  if (!/^[A-Z0-9.]{1,12}$/.test(sym)) return [];
  const cfg = webullBrokerConfigFromEnv(process.env);
  if (!cfg.appKey || !cfg.appSecret) return [];
  const session = await resolveWebullSessionToken(fetch, { appKey: cfg.appKey, appSecret: cfg.appSecret, apiHost: cfg.apiHost }, webullSessionStore(await webullWorkerEnv()));
  if (session.awaiting2fa || (!session.accessToken && !session.tokenless)) return [];
  const c = { appKey: cfg.appKey, appSecret: cfg.appSecret, apiHost: cfg.apiHost, accessToken: session.accessToken, timeoutMs: 2000 };
  const ask = (path: string, query: Record<string, string>, cat: "Stock" | "Futures" | "Crypto") =>
    settle(webullInstrumentGet(fetch, c, path, query).then(r => (r.ok ? webullInstrumentHits(r.payload, cat) : [])));
  const [stocks, futures, crypto] = await Promise.all([
    ask("/trading/instruments/stocks/profiles/list", { symbols: sym, category: "US_STOCK" }, "Stock"),
    ask("/trading/instruments/futures/contracts/list", { code: sym.replace(/1!$/, ""), category: "US_FUTURES" }, "Futures"),
    ask("/trading/instruments/crypto/profiles/list", { symbols: sym.replace(/USD$/, ""), category: "US_CRYPTO" }, "Crypto"),
  ]);
  return [...futures, ...stocks, ...crypto];
}

/** Everything both brokers answer for `q`, within `budgetMs`; late answers are dropped, never awaited. */
export async function brokerInstrumentSearch(q: string, opts: { tastytrade: boolean; webull: boolean; budgetMs?: number }): Promise<InstrumentSearchHit[]> {
  const budget = new Promise<InstrumentSearchHit[]>(resolve => setTimeout(() => resolve([]), opts.budgetMs ?? 2500));
  const race = (p: Promise<InstrumentSearchHit[]>) => Promise.race([settle(p), budget]);
  const [tt, wb] = await Promise.all([
    opts.tastytrade ? race(tastytradeHits(q)) : Promise.resolve([]),
    opts.webull ? race(webullHits(q)) : Promise.resolve([]),
  ]);
  return [...tt, ...wb];
}
