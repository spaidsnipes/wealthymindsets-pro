/**
 * EQUITY AGGRESSOR, INFERRED — Lee–Ready on tastytrade's consolidated tape.
 *
 * Serving /charts TSLA, 2026-10-01 23:10 CDT: every stock chart read "ORDER
 * FLOW · WAITING FOR SIDED PRINTS" forever. A consolidated equity print states
 * no exchange aggressor (dxFeed `aggressorSide` UNDEFINED), so Imbalance Stack,
 * Delta Divergence, Delta Levels and the footprint never had a side to read —
 * for every stock trader, all session.
 *
 * The print DOES carry the NBBO at the moment it traded (TimeAndSale bid /
 * ask). The standard lawful inference is Lee–Ready:
 *   1. QUOTE TEST — at or above the ask: the buyer lifted it (BUY); at or
 *      below the bid: the seller hit it (SELL).
 *   2. TICK RULE — between the quotes: above the prior print BUY, below SELL.
 *   3. Neither decides (a zero tick inside the spread): UNKNOWN, unsided.
 *
 * Every inferred print is stamped with ITS OWN method (QUOTE_TEST / TICK_RULE)
 * and a confidence below 1, so every reading built on it is disclosed as
 * INFERRED by the weakest-link provenance (selectAggressorFlow), never as the
 * exchange's word — including a side the consolidated feed itself carries.
 *
 * PURE.
 */
import type { CanonicalMarketEvent } from "@/lib/marketData/marketEvent";

export function inferEquityAggressor(
  print: CanonicalMarketEvent,
  priorPrice: number | null,
  priorSide: "BUY" | "SELL" | null = null,
): CanonicalMarketEvent {
  // A side the CONSOLIDATED stock tape carries is not an exchange's word
  // (serving TSLA premarket 2026-10-02 04:04 ET: prints arrived BUY/SELL and the
  // rail read "VENUE-STAMPED SIDES"). It is re-derived here and labelled
  // INFERRED, never passed through as PROVIDER.
  //
  // LEE–READY BY THE MIDPOINT (serving NVDA premarket 04:50 ET: sub-penny
  // prints INSIDE the spread — 232.898 in 232.80 / 232.90 — were left unsigned
  // by an at-the-quote test, 801 of 852): above the midpoint is a buy, below a
  // sell; exactly at the midpoint the tick rule decides, and a repeated price
  // keeps the previous side (zero tick).
  const price = print.price;
  if (price == null || !(price > 0)) return print;
  const bid = print.bid != null && print.bid > 0 ? print.bid : null;
  const ask = print.ask != null && print.ask > 0 ? print.ask : null;
  const quoted = bid != null && ask != null && ask >= bid;
  const tag = (side: "BUY" | "SELL" | "UNKNOWN", method: "QUOTE_TEST" | "TICK_RULE" | "NONE", conf?: number): CanonicalMarketEvent =>
    side === "UNKNOWN"
      ? { ...print, assetClass: "equity", aggressorSide: "UNKNOWN", aggressorMethod: "NONE", aggressorConfidence: undefined }
      : { ...print, assetClass: "equity", aggressorSide: side, aggressorMethod: method, aggressorConfidence: conf };
  if (quoted) {
    const mid = (bid! + ask!) / 2;
    if (price > mid) return tag("BUY", "QUOTE_TEST", price >= ask! ? 0.7 : 0.6);
    if (price < mid) return tag("SELL", "QUOTE_TEST", price <= bid! ? 0.7 : 0.6);
  }
  if (priorPrice != null && priorPrice > 0) {
    if (price > priorPrice) return tag("BUY", "TICK_RULE", 0.5);
    if (price < priorPrice) return tag("SELL", "TICK_RULE", 0.5);
    if (priorSide) return tag(priorSide, "TICK_RULE", 0.4);
  }
  return tag("UNKNOWN", "NONE");
}
