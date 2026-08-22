/**
 * Consolidated quote resolver — ONE canonical quote ladder for every UI
 * consumer (Founder Breakthrough Build Contract, P0: "no provider-specific
 * market truth in UI/domain logic"; "independent consumers must not disagree
 * on LIVE vs DELAYED").
 *
 * Before this module, TickerTape and WatchlistPanel each re-implemented the
 * same-looking fallback ladder — but with DIVERGENT rules:
 *   - TickerTape gated Yahoo through `yahooQuoteObserved()` and required the
 *     Alpaca branch to be `source === "alpaca"`; WatchlistPanel accepted any
 *     `price > 0` from either, so it could show a stale/misattributed price.
 *   - Their crypto/futures symbol SETS differed (e.g. ATOM/UNI, VX1!), so the
 *     SAME symbol was classified — and routed to a different provider — on the
 *     same screen. Both files' comments claimed "the same consolidated-first
 *     semantic" while demonstrably not sharing one.
 *
 * This is the single implementation. It applies the STRICTER (truthful) gates
 * uniformly, so two consumers of the same symbol resolve to the same price and
 * the same source. Provider names live here, never in the UI.
 *
 * PURE control flow with an injectable fetcher (`fetchJson`) so the ladder is
 * unit-testable without a network. Missing/failed observation resolves to
 * `null` — a blank is better than an invented or misattributed quote.
 */

import { yahooQuoteObserved } from "./yahooQuoteObserved";

export type QuoteSource = "yahoo" | "alpaca" | "finnhub";
export type QuoteSymbolClass = "crypto" | "futures" | "equity";

export interface ConsolidatedQuote {
  readonly price: number;
  readonly change: number;
  readonly changePct: number;
  readonly src: QuoteSource;
}

/** Canonical instrument-class sets — the UNION of every consumer's prior set,
 *  so no symbol is classified differently depending on which surface asks. */
export const CRYPTO_SYMS: ReadonlySet<string> = new Set([
  "BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX", "LINK", "DOT", "LTC", "ATOM", "UNI",
]);
export const FUTURES_SYMS: ReadonlySet<string> = new Set([
  "NQ1!", "ES1!", "RTY1!", "YM1!", "GC1!", "SI1!", "CL1!", "NG1!", "ZB1!", "ZN1!", "ZF1!", "ZT1!",
  "HG1!", "MNQ1!", "MES1!", "MYM1!", "M2K1!", "MGC1!", "MCL1!", "VX1!",
]);

export function classifyQuoteSymbol(sym: string): QuoteSymbolClass {
  const up = sym.toUpperCase();
  if (FUTURES_SYMS.has(up) || up.endsWith("1!")) return "futures";
  if (CRYPTO_SYMS.has(up)) return "crypto";
  return "equity";
}

/** Injectable fetch — returns parsed JSON, or null on any failure. */
export type FetchJson = (url: string) => Promise<unknown>;

const defaultFetchJson: FetchJson = async (url) => {
  try {
    return await fetch(url, { cache: "no-store" }).then((r) => r.json());
  } catch {
    return null;
  }
};

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** Yahoo quote → normalized, gated by the observed predicate. Change is
 *  computed from prevClose (self-contained, provider-independent). */
function fromYahoo(j: unknown): ConsolidatedQuote | null {
  const o = (j ?? {}) as { price?: unknown; prevClose?: unknown };
  const price = num(o.price);
  if (price <= 0 || !yahooQuoteObserved(j)) return null;
  const prev = num(o.prevClose) || price;
  const change = +(price - prev).toFixed(2);
  const changePct = prev ? +(((price - prev) / prev) * 100).toFixed(2) : 0;
  return { price, change, changePct, src: "yahoo" };
}

function fromAlpaca(j: unknown, requireSource: boolean): ConsolidatedQuote | null {
  const o = (j ?? {}) as { price?: unknown; change?: unknown; changePct?: unknown; source?: unknown };
  const price = num(o.price);
  if (price <= 0) return null;
  // Equity path only trusts Alpaca when it self-identifies as the source
  // (its equity quotes are otherwise IEX-only prints that must not be
  // presented as consolidated LIVE truth).
  if (requireSource && o.source !== "alpaca") return null;
  return { price, change: num(o.change), changePct: num(o.changePct), src: "alpaca" };
}

function fromFinnhub(j: unknown): ConsolidatedQuote | null {
  const o = (j ?? {}) as { price?: unknown; change?: unknown; changePct?: unknown };
  const price = num(o.price);
  if (price <= 0) return null;
  return { price, change: num(o.change), changePct: num(o.changePct), src: "finnhub" };
}

const YURL = (up: string) => `/api/yahoo?sym=${encodeURIComponent(up)}&type=quote`;
const AURL = (up: string) => `/api/alpaca?sym=${encodeURIComponent(up)}&type=quote`;
const FURL = (up: string) => `/api/finnhub?sym=${encodeURIComponent(up)}&type=quote`;

/**
 * Resolve the canonical consolidated quote for a symbol. Ladder by class:
 *   futures → Yahoo (observed) only
 *   crypto  → Alpaca → Yahoo (observed)
 *   equity  → Yahoo (observed) → Alpaca (source==="alpaca") → Finnhub
 * Returns the first source that yields a truthful quote, else null.
 */
export async function resolveConsolidatedQuote(
  sym: string,
  opts: { fetchJson?: FetchJson } = {},
): Promise<ConsolidatedQuote | null> {
  const fetchJson = opts.fetchJson ?? defaultFetchJson;
  const up = sym.toUpperCase();
  const cls = classifyQuoteSymbol(up);

  if (cls === "futures") {
    return fromYahoo(await fetchJson(YURL(up)));
  }

  if (cls === "crypto") {
    const a = fromAlpaca(await fetchJson(AURL(up)), false);
    if (a) return a;
    return fromYahoo(await fetchJson(YURL(up)));
  }

  // equity
  const y = fromYahoo(await fetchJson(YURL(up)));
  if (y) return y;
  const a = fromAlpaca(await fetchJson(AURL(up)), true);
  if (a) return a;
  return fromFinnhub(await fetchJson(FURL(up)));
}
