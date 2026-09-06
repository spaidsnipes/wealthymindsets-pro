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

export interface PriceObservationEvidence {
  /** A real price was received for this selection, not merely a configured source. */
  present: boolean;
  /** Provider/event timestamp is within budget; omitted means not established. */
  fresh?: boolean;
}

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
  /** No observation to grade. Availability is separate from the seven fidelity labels. */
  availability?: "unavailable";
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

/**
 * Continuous markets have no session to close. Honouring `sessionOpen: false`
 * for one of these would print SESSION CLOSED over a genuinely streaming
 * crypto tape — the mirror image of the defect this parameter exists to fix —
 * so the writer defends the invariant itself rather than trusting callers.
 */
const CONTINUOUS_MARKET_SOURCES: ReadonlySet<PriceSource> = new Set(["binance", "coinbase"]);

/**
 * @param sessionOpen Tri-state session truth. ONLY an explicit `false`
 *   changes the verdict; `undefined`/`null` mean "not established" and leave
 *   provider-derived labelling exactly as it was. An unknown session may
 *   never be rounded into a claim in either direction.
 */
export function priceSourceBadge(
  source: PriceSource,
  connected: boolean,
  sessionOpen?: boolean | null,
  observation?: PriceObservationEvidence,
): PriceSourceBadge {
  const L = CANONICAL_FIDELITY_LABELS;
  // Session closure does not manufacture a last observation. Keep unknown
  // providers unresolved before applying the closed-market presentation rule.
  const unresolved = !["polygon", "coinbase", "binance", "alpaca", "finnhub", "yahoo", "moomoo", "longbridge", "webull"].includes(source);
  if (unresolved || observation?.present !== true) {
    return {
      label: L.STALE_PIPELINE, // legacy internal fallback; availability governs rendering
      title: "No price observation received for this selection. Waiting for market data.",
      live: false, provenance: String(source ?? "unavailable"),
      unresolved, availability: "unavailable",
    };
  }
  // Canon "CLOSED IS NOT DELAYED" + §8 (the screen may never imply an active
  // session on a closed one). Closed dominates every provider verdict, exactly
  // as it does in resolveCanonicalFidelityLabel — where `sessionOpen === false`
  // is checked before entitlement, freshness and staleness. Without this the
  // yahoo/finnhub arms below assert ACTIVE DEGRADED every weekend.
  if (sessionOpen === false && !CONTINUOUS_MARKET_SOURCES.has(source)) {
    return {
      label: L.SESSION_CLOSED_LAST_VERIFIED,
      title: "Market session is closed. Showing the last verified values — nothing is streaming.",
      live: false,
      provenance: String(source ?? "unavailable"),
      unresolved: false,
    };
  }
  // Every recognized provider must honor an explicit freshness failure.
  // A fallback provider is not exempt from the observation's expiry budget.
  if (observation.fresh === false) {
    return {
      label: L.STALE_PIPELINE,
      title: "The received price is outside its freshness budget. Waiting for a current observation.",
      live: false, provenance: source, unresolved: false,
    };
  }
  // A transport flag or a provider name is not a freshness receipt.
  // Observed-but-ungraded prices remain usable without a LIVE certificate.
  if (["polygon", "coinbase", "binance", "alpaca"].includes(source)
      && (!connected || observation?.fresh !== true)) {
    return {
      label: L.ACTIVE_DEGRADED,
      title: "Price observed. Realtime freshness is not verified for this selection.",
      live: false, provenance: source, unresolved: false,
    };
  }
  switch (source) {
    case "moomoo":
    case "longbridge":
    case "webull":
      // These are active WM providers, not unresolved names. Observing their
      // price does not by itself certify every upstream fidelity requirement.
      return {
        label: L.ACTIVE_DEGRADED,
        title: "Price observed. Realtime feed certification is not yet established.",
        live: false, provenance: source, unresolved: false,
      };
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
  sessionOpen?: boolean | null,
): PriceSourceBadge {
  const b = priceSourceBadge(source, connected, sessionOpen, {present: hasCandles});
  // Canon §Living Market Visual Systems (2026-08-27): when we have
  // verified bars on screen but no live provider resolved, the honest
  // per-capability truth is HISTORICAL BARS VERIFIED — never STALE
  // PIPELINE (which implies active-session failure).
  if (b.unresolved && hasCandles) {
    return {
      ...b,
      availability: undefined,
      label: sessionOpen === false
        ? CANONICAL_FIDELITY_LABELS.SESSION_CLOSED_LAST_VERIFIED
        : CANONICAL_FIDELITY_LABELS.HISTORICAL_BARS_VERIFIED,
      title: sessionOpen === false
        ? "Market session is closed. Historical bars are loaded; no realtime tape is implied."
        : "Historical OHLCV loaded. No realtime tape resolved yet — chart trustworthy for past-tense analysis only.",
      live: false,
    };
  }
  return b;
}

/**
 * A recent UI update cannot promote a delayed provider into LIVE market data.
 *
 * `sessionOpen` is the same tri-state closure signal the badges take, and it
 * is LAST in the parameter list on purpose: every existing caller and test
 * keeps working untouched, and omitting it is indistinguishable from the
 * pre-closure behaviour. Only an explicit `false` can change a verdict.
 */
export function candleDataStatus(
  source: PriceSource,
  connected: boolean,
  hasCandles: boolean,
  lastTickAt: number,
  now = Date.now(),
  staleAfterMs = 20_000,
  sessionOpen?: boolean | null,
): CandleDataStatus {
  // Threaded, not re-implemented: closure precedence and the crypto
  // carve-out live in priceSourceBadge, so this chip can never disagree
  // with the rail above it. A proven-closed session yields
  // SESSION CLOSED — LAST VERIFIED with live=false and unresolved=false,
  // which falls through to the `!badge.live` branch below and prints
  // "SESSION CLOSED — LAST VERIFIED · LAST <time>" instead of the
  // canon-§8-banned "ACTIVE DEGRADED" on a closed session.
  const fresh = Number.isFinite(lastTickAt) && lastTickAt > 0
    && lastTickAt <= now && now - lastTickAt < staleAfterMs;
  const badge = priceSourceBadge(source, connected, sessionOpen, {present: hasCandles, fresh});
  const L = CANONICAL_FIDELITY_LABELS;
  // Neither a calendar nor provider configuration proves a last bar exists.
  if (!hasCandles) {
    return { state: "UNAVAILABLE", label: "DATA UNAVAILABLE", live: false };
  }
  // Candles exist but no realtime feed is resolved — bars are the
  // verified capability.
  if (badge.unresolved) {
    return { state: "DELAYED", label: sessionOpen === false
      ? L.SESSION_CLOSED_LAST_VERIFIED : L.HISTORICAL_BARS_VERIFIED, live: false };
  }
  if (badge.label === L.STALE_PIPELINE) return {state: "STALE", label: badge.label, live: false};
  if (!badge.live) {
    return { state: "DELAYED", label: badge.label, live: false };
  }
  if (!Number.isFinite(lastTickAt) || lastTickAt <= 0 || now - lastTickAt >= staleAfterMs) {
    return { state: "STALE", label: L.STALE_PIPELINE, live: false };
  }
  return { state: "LIVE", label: L.LIVE_CERTIFIED_QUOTE, live: true };
}
