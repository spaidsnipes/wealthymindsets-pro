/**
 * priceSource — honest provenance labelling for a displayed quote.
 *
 * WM-CHART-P0-05: multiple surfaces on /charts each resolve their own quote and
 * can legitimately differ by a provider or a poll. Rendering "$X.XX" with no
 * indication of WHICH feed produced it is the truthfulness violation. This
 * helper turns the `source` the data hook already knows into a small badge.
 *
 * It asserts ONLY what we can stand behind: the provider identity and whether a
 * live feed is connected. It deliberately does NOT invent a precise delay figure
 * we cannot guarantee per provider/session — the tooltip explains the honest
 * caveat instead.
 */
export type PriceSource =
  | "polygon" | "binance" | "alpaca" | "finnhub" | "yahoo" | "unavailable" | string;

export interface PriceSourceBadge {
  label: string;
  title: string;
  /** true only when the number is coming from a genuine real-time feed. */
  live: boolean;
}

export function priceSourceBadge(source: PriceSource, connected: boolean): PriceSourceBadge {
  switch (source) {
    case "polygon":
      return { label: "POLYGON", title: "Price via Polygon.io real-time trade stream", live: true };
    case "binance":
      return { label: "LIVE", title: "Price via Coinbase / Binance.US real-time crypto stream", live: true };
    case "alpaca":
      return {
        label: "ALPACA",
        title: "Price via Alpaca (IEX) — real-time in regular hours; IEX-only prints may diverge from the consolidated tape in pre/post-market",
        live: connected,
      };
    case "finnhub":
      return { label: "FINNHUB", title: "Price via Finnhub — free tier is delayed, not the live consolidated tape", live: false };
    case "yahoo":
      return { label: "YAHOO", title: "Price via Yahoo Finance consolidated quote — may lag the live tape", live: false };
    default:
      return { label: "NO FEED", title: "No live price source resolved yet", live: false };
  }
}
