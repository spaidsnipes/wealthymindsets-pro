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
 *
 * ─────────────────────────────────────────────────────────────────────
 * WHAT THIS MODULE OWNS, AND WHAT IT REFUSED TO OWN (2026-09-11, same day)
 *
 * The first version of this file shipped its own `FUTURES_CONTRACTS` notation
 * table, its own `CRYPTO_BASES` set, and its own `toYahooSymbol`. All three
 * were duplicates, and it took less than an hour to find out: `src/lib/
 * yahooSymbol.ts` has owned WM-symbol→Yahoo-ticker for weeks, and it is
 * dramatically better than what was typed here. It carries twenty-one futures
 * contracts including every micro (MNQ, MES, MYM, M2K, MGC, MCL) this file
 * omitted; precious-metals spot; forex derivation; and eleven hand-verified
 * crypto pins recording that `SUI-USD` is Salmonation and `PEPE-USD` is
 * PEPEGOLD — collisions that print one coin's name over another coin's price.
 * This file's naive `${base}-USD` would have reintroduced every one of them.
 *
 * So the module that was written to end four hand-typed copies of a fact had
 * begun by creating a fifth, and a worse one. It is recorded here rather than
 * quietly rebased away, because the lesson is not "check for an owner" — that
 * was already known and written down — it is that KNOWING THE RULE DOES NOT
 * DETECT THE VIOLATION. Only looking does.
 *
 * The division that survived:
 *   - `yahooSymbol.ts` owns NOTATION — which Yahoo ticker a symbol resolves to.
 *   - `canonicalIdentity.ts` owns CRYPTO IDENTITY — what counts as a coin.
 *   - THIS module owns CLASS — what KIND of instrument a symbol is, a question
 *     neither of the others answers and every route was guessing at.
 */

import { cryptoBaseTicker } from "@/lib/marketData/canonicalIdentity";
import { toYahooSymbol as toCanonicalYahooNotation } from "@/lib/yahooSymbol";

export type AssetClass =
  | "EQUITY"
  | "INDEX"
  | "CRYPTO"
  | "FUTURES"
  | "FOREX"
  | "UNKNOWN";

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

  // A LEADING slash is the futures convention ("/ES"), and it is read from the
  // RAW symbol, BEFORE notation resolution, on purpose.
  //
  // This ordering was not a design choice; it was a regression caught by an
  // existing assertion the moment this function started delegating. The
  // notation owner's forex rule is "contains a slash → `${stripped}=X`", which
  // turns "/ES" into "ES=X", which reads back as FOREX. Borrowing a better
  // module does not mean inheriting its answer to a question it was never
  // asked: it owns which Yahoo TICKER a symbol resolves to, and "/ES" is not a
  // symbol anyone sends to Yahoo. Classification asks something else, and has
  // to ask it first.
  if (s.startsWith("/")) return "FUTURES";

  // Resolve to the canonical Yahoo notation, through the module that
  // owns notation, so "NQ1!" and "NQ=F" cannot land in different classes. That
  // resolution is the whole reason this function is reliable, and it is
  // borrowed rather than restated: see the header.
  //
  // Reading the resolved form is also what keeps "VX1!" honest. It resolves to
  // the INDEX "^VIX", not to a futures notation, so it lands in INDEX where it
  // belongs instead of being miscounted as a tradable futures contract.
  const canonical = toCanonicalYahooNotation(s);

  // Index notation, e.g. ^VIX, ^GSPC, ^DJI.
  if (canonical.startsWith("^")) return "INDEX";

  // Futures notation. `=F` is Yahoo's; a trailing `1!` is TradingView's
  // continuous-contract marker, which we honour even for contracts absent from
  // the table above — an unnamed contract is still a futures contract.
  if (canonical.endsWith("=F") || canonical.endsWith("1!")) return "FUTURES";

  // Forex. `=X` is Yahoo's pair notation; a slash is the conventional
  // "BASE/QUOTE" the product accepts from free-text entry.
  if (canonical.endsWith("=X")) return "FOREX";
  if (canonical.includes("/")) return "FOREX";

  // Crypto. Asked of `canonicalIdentity`, which owns the question "is this a
  // coin and what is its base" and knows the venue-pinned ("BTC.COINBASE") and
  // quote-suffixed ("DOGEUSD") forms the pickers actually offer. The original
  // hand-typed set here knew fourteen bases; that module knows the product's.
  if (cryptoBaseTicker(s) !== null) return "CRYPTO";

  // Plain alphabetic tickers up to five characters are US equities. Anything
  // else is honestly UNKNOWN rather than being swept into EQUITY, because
  // "unrecognised" and "a stock" are different facts and a caller may need to
  // treat them differently.
  if (/^[A-Z]{1,5}$/.test(canonical)) return "EQUITY";
  return "UNKNOWN";
}

/**
 * Translate a symbol into the notation Yahoo-backed routes speak.
 *
 * A RE-EXPORT, not an implementation. `src/lib/yahooSymbol.ts` owns this and
 * has for weeks; this name exists only so a caller that already imports the
 * classifier does not have to know there are two modules. If that convenience
 * ever tempts someone to add "just one special case" here, the special case
 * belongs in the owner — a second table is how `NQ=F` and `NQ1!` came to mean
 * different things to different routes in the first place.
 */
export { toYahooSymbol } from "@/lib/yahooSymbol";

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
 * Does this instrument trade on the US equity session clock — pre 04:00 ET,
 * regular 09:30–16:00 ET, post 16:00–20:00 ET?
 *
 * Asked by any surface that STRIPS bars outside regular hours. Getting it wrong
 * deletes real candles from a 24-hour instrument, which is why the answer for
 * an unrecognised symbol is FALSE: we hide observed prints only when we can
 * name the session that justifies hiding them. `MainChart` previously defaulted
 * the other way and read "/ES" as an equity, so a futures contract was being
 * RTH-filtered.
 *
 * Indices are true: a cash index is quoted on the same bell as the names in it.
 */
export function observesUsEquitySession(symbol: string): boolean {
  const k = classifySymbol(symbol);
  return k === "EQUITY" || k === "INDEX";
}

/**
 * A human-readable reason, so every route that declines gives the SAME reason
 * in the same words. A per-route sentence is how "not supported on free tier"
 * and "no data" came to mean the same thing to the code and different things
 * to the trader.
 *
 * The sentence states the CLASS fact and stops there. It used to end "This data
 * route carries US equities, indices and crypto only" — a claim about the
 * calling route, made by a module that is never told which route is calling,
 * and false as written: MEASURED 2026-09-12, `/api/market` returned an empty
 * quote for ^GSPC, ^DJI, ^IXIC and ^VIX in the same window it priced AAPL, SPY,
 * IWM, GLD and NVDA. A shared sentence may only assert what is true from every
 * caller; coverage is the caller's own fact and belongs in the caller.
 */
export function unsupportedAssetClassReason(symbol: string): string | null {
  const k = classifySymbol(symbol);
  if (k === "FUTURES") {
    return `${normalize(symbol)} is a futures contract. Free equity vendors do not carry futures — this is not absent right now, it is not carried on an equity lane at all.`;
  }
  if (k === "FOREX") {
    return `${normalize(symbol)} is a forex pair. Free equity vendors do not carry currency pairs — this is not absent right now, it is not carried on an equity lane at all.`;
  }
  return null;
}
