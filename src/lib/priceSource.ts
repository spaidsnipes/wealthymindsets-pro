/**
 * priceSource — honest provenance labelling for a displayed quote.
 *
 * WM-CHART-PROV-EMERG-01 (2026-08-06 Founder emergency): user-visible labels
 * MUST NOT name the underlying provider. Founder verbatim:
 *   "stop exposing where our api keys are from … it can say delayed
 *    but stop telling people where the apis come from"
 * Vendor identity is preserved in `provenance` for internal diagnostics, but
 * never rendered as normal trading chrome.
 *
 * Public API: `priceSourceBadge(source, connected)` returns { label, title,
 * live } where label is one of LIVE / DELAYED / DELAYED 15 MIN / NO FEED.
 */
export type PriceSource =
  | "polygon" | "coinbase" | "binance" | "alpaca" | "finnhub" | "yahoo" | "unavailable" | string;

export interface PriceSourceBadge {
  label: string;      // vendor-agnostic user-visible text
  title: string;      // vendor-agnostic tooltip (freshness / caveat, not vendor)
  /** true only when the number is coming from a genuine real-time feed. */
  live: boolean;
  provenance: string; // INTERNAL only — never render in user chrome. Diagnostics inspector reads this.
}

export function priceSourceBadge(source: PriceSource, connected: boolean): PriceSourceBadge {
  switch (source) {
    case "polygon":
      return { label: "LIVE", title: "Real-time trade stream", live: true, provenance: "polygon" };
    case "binance":
      return { label: "LIVE", title: "Real-time crypto stream", live: true, provenance: "binance" };
    case "coinbase":
      return { label: "LIVE", title: "Real-time crypto stream", live: true, provenance: "coinbase" };
    case "alpaca":
      return {
        label: connected ? "LIVE" : "DELAYED",
        title: connected
          ? "Real-time — IEX-only prints may diverge from consolidated tape in pre/post-market"
          : "Reconnecting to live feed",
        live: connected,
        provenance: "alpaca",
      };
    case "finnhub":
      return { label: "DELAYED 15 MIN", title: "Free-tier feed lags the live consolidated tape", live: false, provenance: "finnhub" };
    case "yahoo":
      return { label: "DELAYED", title: "Consolidated quote — may lag the live tape", live: false, provenance: "yahoo" };
    default:
      return { label: "NO FEED", title: "No live price source resolved yet", live: false, provenance: String(source ?? "unavailable") };
  }
}
