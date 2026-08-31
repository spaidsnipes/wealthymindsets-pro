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
 * Canon §Living Market Visual Systems (2026-08-27) — trader-facing
 * labels must come from the canon-approved seven-label set. Legacy
 * strings ("NO FEED", "DELAYED 15 MIN") are quarantined; this module
 * emits the canonical vocabulary for every consumer. Internal
 * comparisons use the `unresolved` flag, not the display string, so
 * a future label copy change cannot silently break the sentinel path.
 *
 * Public API: `priceSourceBadge(source, connected)` returns { label,
 * title, live, provenance, unresolved } — label is one of the canon
 * seven strings.
 */
import {
  CANONICAL_FIDELITY_LABELS,
  type CanonicalFidelityLabel,
} from "./marketData/canonicalFidelityLabels";
export type PriceSource =
  | "polygon" | "coinbase" | "binance" | "alpaca" | "finnhub" | "yahoo" | "unavailable" | string;

export interface PriceSourceBadge {
  /** Vendor-agnostic user-visible text. Canon §Living Market Visual
   *  Systems: one of the seven CANONICAL_FIDELITY_LABELS values. */
  label: CanonicalFidelityLabel;
  title: string;      // vendor-agnostic tooltip (freshness / caveat, not vendor)
  /** true only when the number is coming from a genuine real-time feed. */
  live: boolean;
  provenance: string; // INTERNAL only — never render in user chrome. Diagnostics inspector reads this.
  /** true when the price source is unresolved (no provider matched).
   *  Internal sentinel — replaces `label === "NO FEED"` filtering so
   *  callers stay decoupled from display copy. */
  unresolved: boolean;
}

export interface CandleDataStatus {
  /**
   * LIVE      = realtime tape flowing, recent tick within staleAfterMs.
   * DELAYED   = we have candle data, but no realtime tape (delayed provider,
   *             or realtime source unresolved). Label may be "HISTORICAL" when
   *             the historical OHLCV fetch succeeded but no realtime feed
   *             is configured — SHIFT-H P1 fix (H-Bkt 1): the chart chrome
   *             must never say NO FEED while it is rendering real candles.
   * STALE     = realtime source is live but ticks have stopped flowing.
   * UNAVAILABLE = no candles at all — genuinely nothing on the chart.
   */
  state: "LIVE" | "DELAYED" | "STALE" | "UNAVAILABLE";
  label: string;
  live: boolean;
}

export function priceSourceBadge(source: PriceSource, connected: boolean): PriceSourceBadge {
  const L = CANONICAL_FIDELITY_LABELS;
  switch (source) {
    case "polygon":
      return { label: L.LIVE_CERTIFIED_QUOTE, title: "Real-time trade stream", live: true, provenance: "polygon", unresolved: false };
    case "binance":
      return { label: L.LIVE_CERTIFIED_QUOTE, title: "Real-time crypto stream", live: true, provenance: "binance", unresolved: false };
    case "coinbase":
      return { label: L.LIVE_CERTIFIED_QUOTE, title: "Real-time crypto stream", live: true, provenance: "coinbase", unresolved: false };
    case "alpaca":
      return {
        label: connected ? L.LIVE_CERTIFIED_QUOTE : L.STALE_PIPELINE,
        title: connected
          ? "Real-time — IEX-only prints may diverge from consolidated tape in pre/post-market"
          : "Reconnecting to live feed",
        live: connected,
        provenance: "alpaca",
        unresolved: false,
      };
    case "finnhub":
      // A delayed consolidated quote is flowing, but NOTHING here has proven a
      // paid-tier entitlement is the cause — the certified realtime source is
      // simply not resolved for this symbol. Monday Test 2 law: never assert
      // "DELAYED BY ENTITLEMENT" without a provider-proven entitlement edge.
      // The honest verdict is a degraded-but-usable capability.
      return { label: L.ACTIVE_DEGRADED, title: "Delayed consolidated quote — no certified realtime source resolved. Act with reduced confidence.", live: false, provenance: "finnhub", unresolved: false };
    case "yahoo":
      return { label: L.ACTIVE_DEGRADED, title: "Delayed consolidated quote — no certified realtime source resolved. Act with reduced confidence.", live: false, provenance: "yahoo", unresolved: false };
    default:
      // No provider matched — we cannot claim a certified quote and
      // we cannot claim a closed session either. Canon-honest: the
      // pipeline is stale, and the internal `unresolved` sentinel
      // lets downstream code treat this case surgically.
      return { label: L.STALE_PIPELINE, title: "No live price source resolved yet", live: false, provenance: String(source ?? "unavailable"), unresolved: true };
  }
}

/**
 * resolveChartSurfaceBadge — the H-Bkt 1 / H-Bkt 8 truth guard as a pure
 * helper so future chart-chrome pills can't recreate the "NO FEED beside
 * rendered candles" contradiction. Callers who know whether candles are
 * on-screen pass hasCandles=true; if the raw badge label is NO FEED but
 * candles exist, the label is promoted to HISTORICAL with an honest
 * tooltip. Everything else passes through unchanged.
 */
export function resolveChartSurfaceBadge(
  source: PriceSource,
  connected: boolean,
  hasCandles: boolean,
): PriceSourceBadge {
  const b = priceSourceBadge(source, connected);
  // Canon §Living Market Visual Systems (2026-08-27): when we have
  // verified bars on screen but no live provider resolved, the honest
  // per-capability truth is HISTORICAL BARS VERIFIED — never STALE
  // PIPELINE (which implies active-session failure).
  if (b.unresolved && hasCandles) {
    return {
      ...b,
      label: CANONICAL_FIDELITY_LABELS.HISTORICAL_BARS_VERIFIED,
      title: "Historical OHLCV loaded. No realtime tape resolved yet — chart trustworthy for past-tense analysis only.",
      live: false,
    };
  }
  return b;
}

/** A recent UI update cannot promote a delayed provider into LIVE market data. */
export function candleDataStatus(
  source: PriceSource,
  connected: boolean,
  hasCandles: boolean,
  lastTickAt: number,
  now = Date.now(),
  staleAfterMs = 20_000,
): CandleDataStatus {
  const badge = priceSourceBadge(source, connected);
  const L = CANONICAL_FIDELITY_LABELS;
  // Genuine no-data — no candles rendered. Canon §"CLOSED IS NOT
  // DELAYED": the honest state is SESSION CLOSED — LAST VERIFIED when
  // this happens outside an active session. We surface the closed
  // label even without hasCandles because a red "NO FEED" bug alarm
  // is banned by canon.
  if (!hasCandles) {
    return { state: "UNAVAILABLE", label: L.SESSION_CLOSED_LAST_VERIFIED, live: false };
  }
  // Candles exist but no realtime feed is resolved — bars are the
  // verified capability.
  if (badge.unresolved) {
    return { state: "DELAYED", label: L.HISTORICAL_BARS_VERIFIED, live: false };
  }
  if (!badge.live) {
    return { state: "DELAYED", label: badge.label, live: false };
  }
  if (!Number.isFinite(lastTickAt) || lastTickAt <= 0 || now - lastTickAt >= staleAfterMs) {
    return { state: "STALE", label: L.STALE_PIPELINE, live: false };
  }
  return { state: "LIVE", label: L.LIVE_CERTIFIED_QUOTE, live: true };
}
