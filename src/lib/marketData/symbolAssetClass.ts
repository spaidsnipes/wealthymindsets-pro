/**
 * symbolAssetClass — the one place that answers "what KIND of instrument is
 * this symbol, and is it the same contract as that other symbol?"
 *
 * ─────────────────────────────────────────────────────────────────────
 * FIVE ANSWERS TO ONE QUESTION (2026-09-11)
 *
 * Before this module, four route files each hand-typed their own predicate for
 * "is this futures", and a fifth privately owned the fact that two notations
 * name the SAME contract. Each was written on a different day and none could
 * see the others:
 *
 *   /api/market            symbol.includes("1!") || symbol.includes("/")
 *   /api/alpaca            sym.endsWith("1!") || sym.includes("=F")
 *   /api/alpaca-trading    /^\/|[!]$|^(ES|NQ|RTY|YM|GC|CL|SI|ZB|ZN|6[A-Z])\d?$/
 *   /api/heatmap           YF_MAP: { "NQ1!": "NQ=F", ... }
 *
 * They disagree, and the disagreement is observable in production. MEASURED
 * against the live host on 2026-09-11:
 *
 *   GET /api/market?symbol=NQ1!  → 200 {"error":"Futures/forex not supported"}
 *   GET /api/market?symbol=NQ=F  → falls through to the equity vendor
 *
 * Those are the SAME CONTRACT. `/api/heatmap` knows it — it maps one to the
 * other on line 45 — but that knowledge is trapped in a private const, so
 * `/api/market` cannot use it. The trader who asks for `NQ=F` is told the
 * symbol has "No data", which reads as "not right now" when the truth is "this
 * venue never carries this asset class at all". Same for `EURUSD=X` and `^VIX`.
 *
 * That is this shift's defect class: a fact with no owner gets restated by
 * every consumer, each restatement correct on the day it was typed, none able
 * to notice when another one changes or when the world adds a notation.
 *
 * ─────────────────────────────────────────────────────────────────────
 * WHY A TABLE AND NOT A REGEX
 *
 * The `1!` ↔ `=F` equivalence is not a pattern, it is a FACT about specific
 * contracts, so it is stated once, in one table, and both the classifier and
 * the notation-normaliser read it. Adding a contract is one row, and every
 * consumer gets it — including consumers that do not exist yet.
 *
 * Pattern rules still exist below for the open-ended cases (any `=F` is a
 * futures notation whether or not we have named that contract), but they are
 * written once, here, where a future reader can see all of them at the same
 * time and notice that they disagree.
 */

export type AssetClass =
  | "EQUITY"
  | "INDEX"
  | "CRYPTO"
  | "FUTURES"
  | "FOREX"
  | "UNKNOWN";

/**
 * Contracts we can name, in both notations the product uses.
 *
 * LEFT is the TradingView-style notation the UI and watchlists speak
 * ("NQ1!"). RIGHT is the Yahoo notation the data routes speak ("NQ=F").
 * `/api/heatmap` used to own this privately; it is the same table, moved
 * where everyone can read it.
 */
export const FUTURES_CONTRACTS: ReadonlyArray<readonly [tv: string, yahoo: string]> = [
  ["NQ1!", "NQ=F"],
  ["ES1!", "ES=F"],
  ["YM1!", "YM=F"],
  ["RTY1!", "RTY=F"],
  ["GC1!", "GC=F"],
  ["CL1!", "CL=F"],
  ["SI1!", "SI=F"],
  ["HG1!", "HG=F"],
  ["ZB1!", "ZB=F"],
  ["ZN1!", "ZN=F"],
  ["NG1!", "NG=F"],
  // VX1! maps to the INDEX ^VIX, not to a futures notation. Kept here because
  // the product speaks of it alongside the others, but `classifySymbol` reads
  // the RIGHT-hand side, so it lands in INDEX where it belongs rather than
  // being silently miscounted as a tradable futures contract.
  ["VX1!", "^VIX"],
];

/** Crypto bases the product speaks, in the bare notation the UI uses. */
export const CRYPTO_BASES: ReadonlySet<string> = new Set([
  "BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA",
  "AVAX", "LINK", "DOT", "LTC", "MATIC", "UNI", "ATOM",
]);

const TV_TO_YAHOO = new Map(FUTURES_CONTRACTS.map(([tv, y]) => [tv, y]));

function normalize(symbol: string): string {
  return (symbol ?? "").trim().toUpperCase();
}

/**
 * What kind of instrument is this?
 *
 * Deliberately total: every input gets an answer, and the answer for "we do not
 * recognise this" is `UNKNOWN`, never a guess. A caller that needs "is this
 * tradable here" must ask its own venue, not this function — this module owns
 * what the symbol IS, not who will trade it.
 */
export function classifySymbol(symbol: string): AssetClass {
  const s = normalize(symbol);
  if (!s) return "UNKNOWN";

  // Resolve a known TradingView contract to its canonical notation first, so
  // "NQ1!" and "NQ=F" cannot land in different classes. This is the whole
  // point of the table.
  const canonical = TV_TO_YAHOO.get(s) ?? s;

  // Index notation, e.g. ^VIX, ^GSPC, ^DJI.
  if (canonical.startsWith("^")) return "INDEX";

  // Futures notation. `=F` is Yahoo's; a trailing `1!` is TradingView's
  // continuous-contract marker, which we honour even for contracts absent from
  // the table above — an unnamed contract is still a futures contract.
  if (canonical.endsWith("=F") || canonical.endsWith("1!")) return "FUTURES";

  // Forex. `=X` is Yahoo's pair notation; a slash is the conventional
  // "BASE/QUOTE" the product accepts from free-text entry.
  if (canonical.endsWith("=X")) return "FOREX";
  if (canonical.includes("/") && !canonical.startsWith("/")) return "FOREX";
  // A LEADING slash is the futures convention ("/ES"), not forex. The trading
  // route already treated it that way; the read routes treated it as forex.
  // They cannot both be right, and rejecting a futures order is the safe
  // reading, so the futures reading wins.
  if (canonical.startsWith("/")) return "FUTURES";

  // Crypto, in either the bare ("BTC") or paired ("BTC-USD") notation.
  if (CRYPTO_BASES.has(canonical)) return "CRYPTO";
  const dash = canonical.indexOf("-");
  if (dash > 0 && CRYPTO_BASES.has(canonical.slice(0, dash))) return "CRYPTO";

  // Plain alphabetic tickers up to five characters are US equities. Anything
  // else is honestly UNKNOWN rather than being swept into EQUITY, because
  // "unrecognised" and "a stock" are different facts and a caller may need to
  // treat them differently.
  if (/^[A-Z]{1,5}$/.test(canonical)) return "EQUITY";
  return "UNKNOWN";
}

/**
 * Translate a symbol into the notation Yahoo-backed routes speak. Returns the
 * input unchanged when no translation is known — the caller's vendor can then
 * fail honestly rather than being handed an invented symbol.
 */
export function toYahooSymbol(symbol: string): string {
  const s = normalize(symbol);
  const mapped = TV_TO_YAHOO.get(s);
  if (mapped) return mapped;
  if (CRYPTO_BASES.has(s)) return `${s}-USD`;
  return s || symbol;
}

/**
 * Asset classes that free equity vendors (Finnhub's free tier, Alpaca's equity
 * feed) do not carry at all.
 *
 * The distinction this exists to protect: "no data right now" and "this venue
 * has never carried this asset class" are different sentences, and only one of
 * them is true when a trader asks for NQ=F. Routing on this predicate lets the
 * caller say the true one.
 */
export function isUnsupportedByEquityVendors(symbol: string): boolean {
  const k = classifySymbol(symbol);
  return k === "FUTURES" || k === "FOREX";
}

/**
 * A human-readable reason, so every route that declines gives the SAME reason
 * in the same words. A per-route sentence is how "not supported on free tier"
 * and "no data" came to mean the same thing to the code and different things
 * to the trader.
 */
export function unsupportedAssetClassReason(symbol: string): string | null {
  const k = classifySymbol(symbol);
  if (k === "FUTURES") {
    return `${normalize(symbol)} is a futures contract. This data route carries US equities, indices and crypto only — futures are not absent right now, they are not carried here at all.`;
  }
  if (k === "FOREX") {
    return `${normalize(symbol)} is a forex pair. This data route carries US equities, indices and crypto only — forex is not absent right now, it is not carried here at all.`;
  }
  return null;
}
