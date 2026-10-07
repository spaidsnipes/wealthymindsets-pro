/**
 * BROKER INSTRUMENT SEARCH — "you should be able to search anything Webull and
 * tastytrade allow us to search" (Founder, 2026-10-01).
 *
 * The two brokers answer differently, and this module keeps each honest:
 *
 *   tastytrade  has real search: `/symbols/search/{q}` (equities, ETFs,
 *               indices), plus listable catalogues — every futures product
 *               (`/instruments/future-products`) with its live months
 *               (`/instruments/futures?product-code[]=`) and every crypto pair.
 *   Webull      has NO free-text search in its OpenAPI. It answers exact
 *               symbols per category (`/trading/instruments/stocks|crypto/
 *               profiles/list`, `/futures/contracts/list?code=`). So what is
 *               typed is asked as a symbol, never fuzzed.
 *
 * Every parser is pure and defensive: a field the provider did not send is not
 * invented. Typing MNQ shows MNQ1! (continuous, active month) AND every listed
 * month (/MNQZ6, /MNQH7 …) — a specific month charts and trades THAT contract.
 */

import type { InstrumentSearchHit } from "./instrumentSearch";
import { parseFuturesNotation } from "./futuresNotation";
import { reconcileSearchCategory } from "./searchResultCategory";
import { readFuturesOptionChain } from "@/lib/broker/tastytradeFuturesChain";

type Row = Record<string, unknown>;
const rows = (v: unknown): Row[] => (Array.isArray(v) ? v.filter((x): x is Row => !!x && typeof x === "object") : []);
const str = (...vs: unknown[]): string | null => {
  for (const v of vs) if (typeof v === "string" && v.trim()) return v.trim();
  return null;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_CODE: Readonly<Record<string, number>> = { F: 0, G: 1, H: 2, J: 3, K: 4, M: 5, N: 6, Q: 7, U: 8, V: 9, X: 10, Z: 11 };

/** "/MNQZ6" → "Dec 2026" (decade from the expiration date when present). */
export function contractMonthWords(symbol: string, expiresAt?: string | null): string | null {
  const m = /^\/[A-Z0-9]{1,4}?([FGHJKMNQUVXZ])(\d{1,2})$/.exec(symbol.toUpperCase());
  if (!m) return null;
  const month = MONTH_CODE[m[1]!];
  const yearFromExpiry = expiresAt ? Number(expiresAt.slice(0, 4)) : NaN;
  const year = Number.isFinite(yearFromExpiry) && yearFromExpiry > 2000 ? yearFromExpiry : 2020 + (Number(m[2]) % 10);
  return `${MONTHS[month]} ${year}`;
}

/** tastytrade `/symbols/search` items → hits. */
export function tastySymbolHits(items: unknown): InstrumentSearchHit[] {
  return rows(items).flatMap(o => {
    const sym = str(o.symbol);
    if (!sym || sym.startsWith(".")) return [];
    const type = (str(o["instrument-type"]) ?? "").toLowerCase();
    const opinion = type.includes("future") ? "Futures" : type.includes("etf") || o["is-etf"] === true ? "ETF" : type.includes("index") ? "Index" : type.includes("crypto") ? "Crypto" : "Stock";
    const cat = reconcileSearchCategory(sym, opinion);
    // SPOT FX IS NOT A TASTYTRADE INSTRUMENT HERE (FX lane, 2026-10-06):
    // "EUR/USD" answered "EUR 100,000 Contract · tastytrade" as the top row,
    // ahead of — and de-duplicating away — the canonical "EURUSD · Euro / US
    // Dollar". No tastytrade FX rail is wired and the chart prices spot FX
    // from its own quote source, so the row named a rail that does not exist.
    // The canonical pair row (instrumentSearch) answers the query instead.
    if (cat === "Forex") return [];
    return [{ sym: sym.toUpperCase(), label: str(o.description, o["short-description"]) ?? sym, cat, exchange: str(o["listed-market"]) ?? "tastytrade" }];
  });
}

/** Futures products whose code or name matches what was typed, closest first. */
export function matchFutureProducts(products: unknown, query: string, limit = 3): { code: string; description: string }[] {
  const q = parseFuturesNotation(query)?.root ?? query.trim().toUpperCase().replace(/^\//, "").replace(/1!$/, "");
  if (!q) return [];
  const scored = rows(products).flatMap(o => {
    const code = str(o.code)?.toUpperCase();
    if (!code) return [];
    const description = str(o.description) ?? code;
    const d = description.toUpperCase();
    const s = code === q ? 0 : code.startsWith(q) ? 1 : q.length >= 3 && d.includes(q) ? 2 : -1;
    return s < 0 ? [] : [{ code, description, s }];
  });
  return scored.sort((a, b) => a.s - b.s || a.code.length - b.code.length).slice(0, limit).map(({ code, description }) => ({ code, description }));
}

/** One product's listed months → hits, nearest first; the active month says so. */
export function tastyFutureContractHits(futures: unknown, product: { code: string; description: string }): InstrumentSearchHit[] {
  const live = rows(futures).flatMap(o => {
    const sym = str(o.symbol);
    if (!sym || o.active === false || o["is-closing-only"] === true) return [];
    const dte = Number(o["days-to-expiration"]);
    if (Number.isFinite(dte) && dte < 0) return [];
    return [{ sym: sym.toUpperCase(), dte: Number.isFinite(dte) ? dte : 1e9, active: o["active-month"] === true, exp: str(o["expiration-date"]) }];
  }).sort((a, b) => a.dte - b.dte);
  const months: InstrumentSearchHit[] = live.map(c => ({
    sym: c.sym,
    label: `${product.description} · ${contractMonthWords(c.sym, c.exp) ?? c.sym}${c.active ? " · active month" : ""}`,
    cat: "Futures",
    exchange: "tastytrade",
    aliases: [product.code],
  }));
  const continuous: InstrumentSearchHit = {
    sym: `${product.code}1!`,
    label: `${product.description} · continuous (active month)`,
    cat: "Futures",
    exchange: "tastytrade",
    aliases: [product.code, `/${product.code}`],
  };
  return [continuous, ...months];
}

/** tastytrade crypto pairs matching the typed base ("BTC" → BTC/USD). */
export function tastyCryptoHits(items: unknown, query: string): InstrumentSearchHit[] {
  const q = query.trim().toUpperCase().replace(/[-/]?USD$/, "");
  if (!q) return [];
  return rows(items).flatMap(o => {
    const sym = str(o.symbol)?.toUpperCase();
    if (!sym || !sym.startsWith(q)) return [];
    return [{ sym: sym.replace("/", ""), label: str(o.description, o["short-description"]) ?? sym, cat: "Crypto", exchange: "tastytrade", aliases: [sym] }];
  });
}

/** Webull instrument list payloads (`data` array or the array itself) → hits. */
export function webullInstrumentHits(payload: unknown, cat: "Stock" | "Futures" | "Crypto"): InstrumentSearchHit[] {
  const p = payload as Row | unknown[] | null;
  const list = Array.isArray(p) ? p : rows((p as Row | null)?.data ?? (p as Row | null)?.list ?? (p as Row | null)?.instruments);
  return rows(list).flatMap(o => {
    const sym = str(o.symbol, o.ticker, o.contract_symbol)?.toUpperCase();
    if (!sym) return [];
    const name = str(o.name, o.instrument_name, o.display_name, o.short_name) ?? sym;
    const isEtf = /ETF/i.test(str(o.instrument_type, o.sub_category, o.type) ?? "");
    const out = cat === "Futures" && !sym.startsWith("/") ? `/${sym}` : sym;
    return [{ sym: cat === "Crypto" ? out.replace(/[-/]/g, "") : out, label: name, cat: isEtf ? "ETF" : cat, exchange: str(o.exchange_code, o.exchange) ?? "Webull" }];
  });
}

/** Explicit options queries only; generic MNQ still discovers future months. */
export function futuresOptionQuery(query: string): { root: string; exact: string | null; right: "CALL" | "PUT" | null; strike: number | null } | null {
  const q = query.trim().toUpperCase();
  const exact = /^\.\/([A-Z0-9]{1,4}[FGHJKMNQUVXZ]\d{1,2})/.exec(q);
  if (exact) {
    const root = parseFuturesNotation(`/${exact[1]}`)?.root;
    return root ? { root, exact: q, right: null, strike: null } : null;
  }
  const words = /^([/A-Z0-9!=]{1,12})\s+(OPTIONS?|CALLS?|PUTS?)(?:\s+(\d+(?:\.\d+)?))?$/.exec(q);
  if (!words) return null;
  const root = parseFuturesNotation(words[1])?.root ?? words[1].replace(/^\//, "");
  return { root, exact: null, right: words[2].startsWith("CALL") ? "CALL" : words[2].startsWith("PUT") ? "PUT" : null, strike: words[3] ? Number(words[3]) : null };
}

/** Broker-supplied option symbols and exact parent identities; never manufacture a wire symbol. */
export function tastyFutureOptionHits(data: unknown, query: string, limit = 40): InstrumentSearchHit[] {
  const requested = futuresOptionQuery(query);
  if (!requested) return [];
  const chain = readFuturesOptionChain(data);
  const hits: InstrumentSearchHit[] = [];
  for (const expiration of chain.expirations) {
    if (expiration.dte != null && expiration.dte < 0) continue;
    if (parseFuturesNotation(expiration.parent)?.root !== requested.root) continue;
    for (const row of expiration.strikes) for (const right of ["CALL", "PUT"] as const) {
      const sym = right === "CALL" ? row.call : row.put;
      if (!sym || requested.right && requested.right !== right || requested.strike != null && requested.strike !== row.strike) continue;
      if (requested.exact && sym.trim().toUpperCase() !== requested.exact) continue;
      hits.push({ sym, label: `${expiration.parent} · ${expiration.expiration} · ${row.strike} ${right}`, cat: "Future Option", exchange: "tastytrade", aliases: [query], futureOption: { parent: expiration.parent, expiration: expiration.expiration, strike: row.strike, right } });
      if (hits.length >= limit) return hits;
    }
  }
  return hits;
}
