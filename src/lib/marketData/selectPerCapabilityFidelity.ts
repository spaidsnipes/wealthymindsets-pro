/**
 * selectPerCapabilityFidelity — derive a canon PerCapabilityFidelityReport
 * from the signals WM Pro currently owns end-to-end.
 *
 * Canon anchors:
 *   §Provider Status Is Resolved Per Capability (Founding Contract
 *   2026-08-29 §Binding Legacy Data + Surface Cutover Law).
 *
 *   §"A CERTIFIED NEWER PROVIDER CAPABILITY MAY NOT BE SILENTLY
 *    OVERRIDDEN BY A LEGACY, MOCK, PROXY, CACHED, OR HARD-CODED
 *    FALLBACK."
 *
 * The single-symbol PriceSourceBadge historically collapsed seven
 * capabilities into one status. This selector reads what WM Pro
 * actually knows today and produces per-capability truth WITHOUT
 * silently pretending it knows more:
 *
 *   bars      — derived from resolveChartSurfaceBadge (bars + candle count)
 *   quotes    — derived from priceSourceBadge (source + connected)
 *   ticks     — populated only when the caller passes tapeConnected
 *   options   — undefined until an options provider signals
 *   greeks    — undefined until a Greeks provider signals
 *   depth     — undefined until an L2 provider signals
 *   orderFlow — undefined until a footprint / delta provider signals
 *
 * Everything undefined means "not evaluated" (silent-is-a-feature),
 * NOT "unknown-therefore-broken." The trader's surface renders only
 * evaluated capabilities by default.
 */

import { priceSourceBadge, resolveChartSurfaceBadge, type PriceSource } from "../priceSource";
import {
  CANONICAL_FIDELITY_LABELS,
  type CanonicalFidelityLabel,
} from "./canonicalFidelityLabels";
import type { PerCapabilityFidelityReport } from "./perCapabilityFidelity";

export interface PerCapabilityFidelityInput {
  /** Provider path currently serving quotes (polygon, alpaca, yahoo, etc.). */
  readonly source: PriceSource;
  /** Realtime transport connected? */
  readonly connected: boolean;
  /** Are candles rendered on the chart right now? */
  readonly hasCandles: boolean;
  /**
   * Optional — populated when a per-trade tape stream is active.
   * When undefined, the ticks capability is left undefined (silent
   * per canon; the caller doesn't KNOW ticks are unavailable, only
   * that they haven't been observed).
   */
  readonly tapeConnected?: boolean;
  /**
   * Optional — populated when a real L2 / depth feed is subscribed.
   * Same silence rule as tapeConnected.
   */
  readonly depthSubscribed?: boolean;
  /** True only when the provider response explicitly proves depth entitlement is the failed edge. */
  readonly depthEntitlementBlocked?: boolean;
  /**
   * Optional — populated when the trader is on an options symbol AND
   * an options provider is wired. Same silence rule.
   */
  readonly optionsSubscribed?: boolean;
  /** True only when the provider response explicitly proves options entitlement is the failed edge. */
  readonly optionsEntitlementBlocked?: boolean;
  /**
   * Optional — populated when a Greeks provider is producing values.
   * Same silence rule.
   */
  readonly greeksSubscribed?: boolean;
  /** True only when the provider response explicitly proves Greeks entitlement is the failed edge. */
  readonly greeksEntitlementBlocked?: boolean;
  /**
   * Optional — populated when derived order-flow (delta / footprint)
   * is being computed AND the input ticks are trustworthy enough
   * to derive it from. Same silence rule.
   */
  readonly orderFlowDerived?: boolean;
}

/**
 * Compose a per-capability report from what WM Pro actually knows.
 * Callers that observe additional capabilities (ticks / depth /
 * options / greeks / orderFlow) SHOULD pass the corresponding
 * subscribed flag; otherwise those slots stay undefined and the
 * surface stays silent about them (canon §Silence Is A Feature).
 */
export function selectPerCapabilityFidelity(
  input: PerCapabilityFidelityInput,
): PerCapabilityFidelityReport {
  const report: Record<string, CanonicalFidelityLabel> = {};

  // BARS — the H-Bkt 1/8 truth guard already lives in
  // resolveChartSurfaceBadge. Its output is per-bars.
  const barsBadge = resolveChartSurfaceBadge(input.source, input.connected, input.hasCandles);
  report.bars = barsBadge.label;

  // QUOTES — priceSourceBadge covers the quote fidelity independent
  // of whether candles are on-screen.
  const quotesBadge = priceSourceBadge(input.source, input.connected);
  report.quotes = quotesBadge.label;

  // TICKS — only when the caller confirms the tape channel exists.
  // Canon: undefined ≠ unavailable; caller must explicitly signal.
  if (input.tapeConnected === true) {
    report.ticks = CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE;
  } else if (input.tapeConnected === false) {
    report.ticks = CANONICAL_FIDELITY_LABELS.STALE_PIPELINE;
  }
  // undefined ⇒ ticks stays out of the report

  // DEPTH — a false subscription flag alone cannot identify WHY the
  // capability is absent. Entitlement requires an explicit provider receipt.
  if (input.depthSubscribed === true) {
    report.depth = CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE;
  } else if (input.depthEntitlementBlocked === true) {
    report.depth = CANONICAL_FIDELITY_LABELS.BLOCKED_BY_ENTITLEMENT;
  }

  // OPTIONS — only when an options provider is wired for the symbol.
  if (input.optionsSubscribed === true) {
    report.options = CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE;
  } else if (input.optionsEntitlementBlocked === true) {
    report.options = CANONICAL_FIDELITY_LABELS.BLOCKED_BY_ENTITLEMENT;
  }

  // GREEKS — same rule; undefined until a Greeks provider signals.
  if (input.greeksSubscribed === true) {
    report.greeks = CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE;
  } else if (input.greeksEntitlementBlocked === true) {
    report.greeks = CANONICAL_FIDELITY_LABELS.BLOCKED_BY_ENTITLEMENT;
  }

  // ORDER FLOW — derived from ticks. Only meaningful when ticks are
  // live AND the derivation runs; otherwise silent.
  if (input.orderFlowDerived === true && input.tapeConnected === true) {
    report.orderFlow = CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE;
  } else if (input.orderFlowDerived === true && input.tapeConnected !== true) {
    // Caller says they're deriving flow but we don't have live ticks
    // — that's degraded, not blocked. Canon: name the actual condition.
    report.orderFlow = CANONICAL_FIDELITY_LABELS.ACTIVE_DEGRADED;
  }

  return report as PerCapabilityFidelityReport;
}
