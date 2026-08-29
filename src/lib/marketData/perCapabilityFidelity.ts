/**
 * perCapabilityFidelity — canon §PROVIDER STATUS IS RESOLVED PER
 * CAPABILITY (Founding Execution Contract 2026-08-29, Binding Legacy
 * Data + Surface Cutover Law).
 *
 * Canon verbatim:
 *   "PROVIDER STATUS IS RESOLVED PER CAPABILITY. Bars, quotes, ticks,
 *    options, Greeks, depth and derived order-flow may have different
 *    providers and fidelity states."
 *
 *   "OHLC/OHLCV IS A BAR FORMAT; `OHLC-ONLY` MAY NOT BE USED AS A
 *    BLANKET SYMBOL STATE WHEN OTHER VERIFIED CAPABILITIES EXIST."
 *
 *   "A CERTIFIED NEWER PROVIDER CAPABILITY MAY NOT BE SILENTLY
 *    OVERRIDDEN BY A LEGACY, MOCK, PROXY, CACHED, OR HARD-CODED
 *    FALLBACK."
 *
 * Prior model: one `PriceSourceBadge` per symbol carrying a single
 * `CanonicalFidelityLabel`. That model collapses seven independent
 * capabilities into one status, which is the exact "blanket symbol
 * state" the canon prohibits.
 *
 * New model: a `PerCapabilityFidelityReport` — a typed record whose
 * seven keys each carry an independent canon fidelity label. UI
 * surfaces can render:
 *   - the strongest capability (Level-1 quick chip),
 *   - a per-capability grid (Level-3 semantic zoom), or
 *   - the specific capability the trader's current job needs.
 *
 * The seven capabilities come from the canon list verbatim. The
 * labels come from `canonicalFidelityLabels` (the same seven-string
 * canon vocabulary, single source of truth).
 */

import {
  CANONICAL_FIDELITY_LABELS,
  type CanonicalFidelityLabel,
} from "./canonicalFidelityLabels";

/**
 * The seven canon capabilities, verbatim from the 2026-08-29
 * Founding Contract §Binding Legacy Data + Surface Cutover Law:
 * "Bars, quotes, ticks, options, Greeks, depth and derived
 *  order-flow may have different providers and fidelity states."
 */
export const CANONICAL_CAPABILITIES = [
  "bars",
  "quotes",
  "ticks",
  "options",
  "greeks",
  "depth",
  "orderFlow",
] as const;

export type CanonicalCapability = (typeof CANONICAL_CAPABILITIES)[number];

/**
 * The canonical per-capability report. Each capability carries its
 * OWN fidelity label — no blanket. Undefined = the capability has
 * not been evaluated (silent; not a hidden UNKNOWN).
 */
export type PerCapabilityFidelityReport = {
  readonly [K in CanonicalCapability]?: CanonicalFidelityLabel;
};

/**
 * Convenience: build an empty report — all capabilities undefined.
 * Callers set individual capabilities as they evaluate them.
 */
export function emptyCapabilityReport(): PerCapabilityFidelityReport {
  return {};
}

/**
 * Score a fidelity label on an ordinal 0..6 strength axis so the
 * "strongest capability" can be selected without hard-coding
 * priority per-site. Order matches the canon LIVE > CLOSED >
 * HISTORICAL > DELAYED > DEGRADED > STALE > BLOCKED health ladder.
 */
const LABEL_STRENGTH: Record<CanonicalFidelityLabel, number> = {
  [CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE]:         6,
  [CANONICAL_FIDELITY_LABELS.SESSION_CLOSED_LAST_VERIFIED]: 5,
  [CANONICAL_FIDELITY_LABELS.HISTORICAL_BARS_VERIFIED]:     4,
  [CANONICAL_FIDELITY_LABELS.DELAYED_BY_ENTITLEMENT]:       3,
  [CANONICAL_FIDELITY_LABELS.ACTIVE_DEGRADED]:              2,
  [CANONICAL_FIDELITY_LABELS.STALE_PIPELINE]:               1,
  [CANONICAL_FIDELITY_LABELS.BLOCKED_BY_ENTITLEMENT]:       0,
};

/**
 * Return the strongest evaluated capability + its label — used by
 * Level-1 (one-glance) surfaces that need to pick ONE chip. Returns
 * null when no capability has been evaluated (silent — canon:
 * silence-is-a-feature).
 */
export function strongestCapability(
  report: PerCapabilityFidelityReport,
): { capability: CanonicalCapability; label: CanonicalFidelityLabel } | null {
  let best: { capability: CanonicalCapability; label: CanonicalFidelityLabel; score: number } | null = null;
  for (const cap of CANONICAL_CAPABILITIES) {
    const label = report[cap];
    if (!label) continue;
    const score = LABEL_STRENGTH[label];
    if (best === null || score > best.score) {
      best = { capability: cap, label, score };
    }
  }
  return best ? { capability: best.capability, label: best.label } : null;
}

/**
 * Return the WEAKEST evaluated capability + label — used by
 * Sentinel-style surfaces (Evidence Debt tile, degraded-state
 * dashboards) that want to show the trader what's currently
 * blocking a decision.
 */
export function weakestCapability(
  report: PerCapabilityFidelityReport,
): { capability: CanonicalCapability; label: CanonicalFidelityLabel } | null {
  let worst: { capability: CanonicalCapability; label: CanonicalFidelityLabel; score: number } | null = null;
  for (const cap of CANONICAL_CAPABILITIES) {
    const label = report[cap];
    if (!label) continue;
    const score = LABEL_STRENGTH[label];
    if (worst === null || score < worst.score) {
      worst = { capability: cap, label, score };
    }
  }
  return worst ? { capability: worst.capability, label: worst.label } : null;
}

/**
 * Given the (legacy) single-symbol PriceSourceBadge label, translate
 * to a per-capability report where the label applies ONLY to bars +
 * quotes. Historically, providers only returned one status per symbol
 * — this bridge lets callers migrate incrementally without pretending
 * the legacy label covers ticks / options / Greeks / depth / order-flow.
 *
 * Canon: "A certified newer provider capability may not be silently
 * overridden by a legacy fallback." So we do NOT propagate the
 * legacy label to ticks / options / etc. — those stay undefined
 * until a real per-capability signal arrives.
 */
export function fromLegacyBadgeLabel(
  label: CanonicalFidelityLabel,
): PerCapabilityFidelityReport {
  return {
    bars: label,
    quotes: label,
    // ticks, options, greeks, depth, orderFlow: intentionally undefined
    // — canon §Do not silently override with legacy fallback.
  };
}

/**
 * List of capabilities NOT covered by the report (undefined slots).
 * Useful for surfaces that want to render "capability X evidence
 * missing" for transparency.
 */
export function unevaluatedCapabilities(
  report: PerCapabilityFidelityReport,
): readonly CanonicalCapability[] {
  return CANONICAL_CAPABILITIES.filter((c) => report[c] === undefined);
}

/**
 * Count of capabilities the report has evaluated. Useful for
 * coverage metrics on internal telemetry surfaces (never surfaced
 * as a synthetic score to the trader — canon §Vector, not god score).
 */
export function evaluatedCapabilityCount(
  report: PerCapabilityFidelityReport,
): number {
  return CANONICAL_CAPABILITIES.length - unevaluatedCapabilities(report).length;
}
