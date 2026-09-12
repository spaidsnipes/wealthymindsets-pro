/**
 * finnhubQuoteTime — canonical owner of "when did Finnhub say this trade
 * happened".
 *
 * MEASURED on prod 2026-09-12 08:22 UTC (03:22 ET, market closed), from the
 * Founder's own authenticated session, same symbol and same minute:
 *
 *   /api/finnhub?sym=AAPL  → price 332.27, ts 2026-09-11T20:00:00Z  (12.38h old)
 *   /api/market?symbol=AAPL → price 332.27, timestamp = NOW          ( 0.00h old)
 *
 * Same vendor, same number, two answers about WHEN that differ by twelve and a
 * half hours. `/api/market` stamped `timestamp: Date.now()` and discarded the
 * `t` field Finnhub sends with every quote, so a consumer computing age from
 * that envelope sees a price that is always, by construction, brand new.
 *
 * The price was never wrong. The FRESHNESS was manufactured by us — which is
 * exactly the "fake-fresh" failure SF-D01 already forbids one lane over, where
 * `yahooQuoteObserved` refuses to let a day/meta close be presented as a live
 * observation. Finnhub's lane simply never got the equivalent owner, so the
 * rule held on Yahoo and was silently absent here.
 *
 * `null` is the honest answer when the vendor did not say. It is NOT the same
 * fact as `Date.now()`, and collapsing the two is the whole defect: "I do not
 * know when this was observed" must never be spelled "observed just now".
 */

/** Finnhub sends the quote's trade time as `t`, in WHOLE SECONDS. */
export function finnhubQuoteObservedAt(raw: unknown): number | null {
  const t = (raw as { t?: unknown } | null | undefined)?.t;
  if (typeof t !== "number" || !Number.isFinite(t) || t <= 0) return null;
  return Math.round(t * 1000);
}
