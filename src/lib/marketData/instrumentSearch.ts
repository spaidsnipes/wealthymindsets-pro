import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";
import { rankSymbolHits, normalizeSymbolToken } from "./symbolSearchRank";
import { cryptoBaseTicker } from "./canonicalIdentity";
import { FX_CURRENCY_CODES } from "./canonicalIdentity";
import { matchCuratedSymbols } from "./curatedSymbolCatalog";

export type InstrumentSearchHit = { sym: string; label: string; cat: string; exchange?: string; aliases?: readonly string[]; futureOption?: { parent: string; expiration: string; strike: number; right: "CALL" | "PUT" } };

// Currency identity comes from the canonical owner; human names come from
// the platform's currency display names, not a second hardcoded pair universe.
const currencyNames = new Intl.DisplayNames(["en"], { type: "currency" });
const fiatNames = [...FX_CURRENCY_CODES].filter(code => code !== "XAU" && code !== "XAG")
  .map(code => ({ code, name: currencyNames.of(code) ?? code }));

export function matchCanonicalInstruments(query: string, limit = 20): InstrumentSearchHit[] {
  const q = normalizeSymbolToken(query);
  if (!q) return [];
  const fx: InstrumentSearchHit[] = [];
  for (const base of fiatNames) for (const quote of fiatNames) {
    if (base.code === quote.code) continue;
    const sym = `${base.code}${quote.code}`;
    const label = `${base.name} / ${quote.name}`;
    const aliases = [`${base.name} ${quote.name}`];
    if (normalizeSymbolToken(sym) === q || aliases.some(alias => normalizeSymbolToken(alias) === q)) {
      fx.push({ sym, label, cat: "Forex", aliases });
    }
  }
  // SPOT CRYPTO BY ITS OWN NAME (garden pass 2026-10-04). Typing "BTC" ranked
  // /BTC, BTC1! and three contract months as exact matches and put spot
  // Bitcoin 19th as "BTC/USD"; Enter opened the CME future. The bare base is
  // the symbol the chart itself routes to spot crypto (canonicalAssetClass),
  // so that row leads — and a same-ticker equity row ("SOL · Stock") that the
  // chart would open as crypto anyway stops wearing the wrong label.
  const coin = cryptoBaseTicker(query);
  const spot: InstrumentSearchHit[] = coin && coin === query.trim().toUpperCase()
    ? [{ sym: coin, label: `${CRYPTO_NAMES[coin] ?? coin} · spot crypto (USD)`, cat: "Crypto", aliases: [`${coin}-USD`, `${coin}/USD`] }]
    : [];
  return mergeInstrumentSearch(query, [...spot, ...fx], matchCuratedSymbols(query, limit), limit);
}

const CRYPTO_NAMES: Readonly<Record<string, string>> = {
  BTC: "Bitcoin", ETH: "Ethereum", SOL: "Solana", XRP: "XRP", DOGE: "Dogecoin", ADA: "Cardano",
  AVAX: "Avalanche", LINK: "Chainlink", LTC: "Litecoin", DOT: "Polkadot", BNB: "BNB", SHIB: "Shiba Inu",
  PEPE: "Pepe", SUI: "Sui", TON: "Toncoin", TRX: "TRON", UNI: "Uniswap", NEAR: "NEAR", XLM: "Stellar",
};

/** Rank the whole answer, so a local substring cannot bury a remote exact ticker. */
export function mergeInstrumentSearch(query: string, local: readonly InstrumentSearchHit[], remote: readonly InstrumentSearchHit[], limit = 30): InstrumentSearchHit[] {
  const unique = new Map<string, InstrumentSearchHit>();
  for (const hit of [...local, ...remote]) {
    const key = normalizeSymbolToken(hit.sym);
    const existing = unique.get(key);
    if (!existing) unique.set(key, hit);
    else if (!existing.exchange && hit.exchange) unique.set(key, { ...existing, exchange: hit.exchange });
  }
  return rankSymbolHits(query, [...unique.values()], limit, { dropUnmatched: false });
}

export function instrumentSearchSelection(query: string, hits: readonly InstrumentSearchHit[]): string | null {
  // Raw text has a separate, explicit "Open as entered" action in both UIs.
  // Enter cannot mistake an unanswered human name for a canonical ticker.
  return query.trim() ? hits[0]?.sym ?? null : null;
}

/** A futures option opens its parent market plus the exact chain ticket, never OHLC for its wire symbol. */
export function instrumentSearchDestination(hit: InstrumentSearchHit): { symbol: string; href: string } | null {
  if (hit.sym.startsWith("./") && !hit.futureOption) return null;
  if (hit.futureOption) {
    const p = new URLSearchParams({ symbol: hit.futureOption.parent, futuresOption: hit.sym });
    return { symbol: hit.futureOption.parent, href: `${INSTRUMENT_VIEW_ROUTE}?${p}` };
  }
  return { symbol: hit.sym, href: INSTRUMENT_VIEW_ROUTE };
}

/** Cancellation also gates delivery when a transport ignores AbortSignal. */
export async function fetchInstrumentSearch(query: string, signal: AbortSignal): Promise<InstrumentSearchHit[] | null> {
  const response = await fetch(`/api/symbol-search?q=${encodeURIComponent(query)}`, { cache: "no-store", signal });
  const json = await response.json() as { results?: InstrumentSearchHit[]; error?: string };
  if (signal.aborted) return null;
  if (!response.ok || json.error) throw new Error(json.error ?? `Search answered HTTP ${response.status}`);
  return (json.results ?? []).filter(hit => Boolean(hit.sym && hit.label));
}
