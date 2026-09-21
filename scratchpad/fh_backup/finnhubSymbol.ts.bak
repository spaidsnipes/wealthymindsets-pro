/**
 * WM internal symbol → Finnhub symbol.
 *
 * Extracted from `/api/finnhub` so the resolution can be tested directly, for
 * the same reason `yahooSymbol.ts` was: a route module cannot export a helper
 * for a test to call, and an untested symbol table is exactly where "the
 * product offers it but the provider is asked the wrong question" hides.
 *
 * ── The defect this closed ──────────────────────────────────────────────────
 *
 * The final branch of `toFinnhubSym` is `return up` — "plain stock/ETF, use
 * as-is". Every crypto symbol absent from the old thirteen-row table reached
 * that branch, so the route asked Finnhub for an EQUITY by that name.
 *
 * That is worse than the Yahoo gap it mirrors. There, an unmapped coin came
 * back empty. Here, Finnhub is the REAL-TIME US equity provider, and several
 * coins the product offers under its own "Crypto" category are also live US
 * tickers: `SUI` is Sun Communities, `W` is Wayfair, `WEN` is Wendy's. The
 * screen would have printed a REIT's real-time price under a coin's name —
 * a LIVING-PIXEL violation where the label and the number have different
 * owners and neither is wrong on its own.
 *
 * So the question "is this crypto, and what is its base" is asked of
 * `canonicalIdentity`, the module that already owns it and that decides what
 * the screen SAYS, rather than answered by a second hand-written list free to
 * disagree with it. That is Canon Weakness #1 — two owners, one pixel.
 */

import { cryptoBaseTicker } from "@/lib/marketData/canonicalIdentity";

/**
 * Explicit overrides. Deliberately empty of crypto: the thirteen coins this
 * table used to carry all followed the single pattern `BINANCE:{BASE}USDT`,
 * which is now derived, and every coin it did NOT carry fell through to the
 * equity branch. It is kept because an override that cannot be derived must
 * still have somewhere to live, and a hit here wins.
 *
 * Futures are absent on purpose — Finnhub does not serve them on the free
 * plan, so they resolve to `null` and the caller falls back to Yahoo.
 */
export const FH_MAP: Record<string, string> = {};

/**
 * Resolve a WM symbol to the string Finnhub should be asked for, or `null`
 * when Finnhub cannot serve it and the caller must fall back to Yahoo.
 *
 * A `null` is honest: it routes the request to a provider that CAN answer.
 * Guessing an equity of the same name is not.
 */
export function toFinnhubSym(sym: string): string | null {
  const up = sym.trim().toUpperCase();
  if (FH_MAP[up]) return FH_MAP[up];

  // Crypto is resolved BEFORE the slash guard for the same reason
  // `canonicalAssetClass` orders them that way: "BTC/USD" contains a slash but
  // is not a currency pair. "EUR/USD" strips to "EUR", which is not a declared
  // crypto base, so FX still falls through and is correctly refused below.
  const base = cryptoBaseTicker(up);
  if (base) {
    // Venue-pinned rows ("BTC.COINBASE") name an exchange this route cannot
    // honour: Finnhub's per-venue crypto symbols are not the Binance form and
    // are not verifiable from here. Answering a Coinbase request with a Binance
    // price is a venue substitution, so the venue row is refused outright
    // rather than silently re-pointed at a different exchange.
    if (up.includes(".")) return null;
    // Finnhub's free crypto tier is Binance, which quotes in USDT. A bare base
    // ("BTC") named no quote currency, so nothing is substituted. A request
    // that DID name USD ("BTCUSD") is answered with the USDT pair — a real
    // quote-currency substitution, disclosed rather than hidden: the route
    // returns the resolved provider symbol on every response.
    return `BINANCE:${base}USDT`;
  }

  // Futures and currency pairs are not supported on this lane.
  if (up.endsWith("1!") || up.includes("=F") || up.includes("/")) return null;
  // Plain stock/ETF — use as-is
  return up;
}
