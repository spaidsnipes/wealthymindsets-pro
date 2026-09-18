/**
 * selectRegime — closes the "Regime" node in the Founder decision chain:
 *   REGIME → Direction → Location → Auction → Aggression → CLC → Risk →
 *   Permission → Management.
 *
 * A regime view model looks at the current CanonicalMarketState + rolling
 * history to classify the market environment:
 *
 *   TREND       — direction resolved + volatility elevated + regime dim
 *                 says trend
 *   BALANCE     — regime dim says balance + volatility low/normal +
 *                 direction unresolved or oscillating
 *   TRANSITION  — regime dim not stable across recent snapshots (was
 *                 balance now trend, or vice versa)
 *   EXPANSION   — volatility shocked / expanding
 *   COMPRESSION — volatility trending DOWN over recent snapshots
 *   UNKNOWN     — insufficient evidence
 *
 * Founder doctrine: values live in state.regime.value as free-form strings
 * (verified against src/lib/marketData/canonicalMarketState.ts). Callers
 * pass matchers so the engine never invents producer vocabulary.
 */

import type {
  CanonicalMarketState,
  MarketStateDimension,
  MarketStateEvidenceRef,
  MarketStateResolution,
} from "../canonicalMarketState";
import { describeDimension } from "../canonicalMarketState";

export type RegimeVerdict = "TREND" | "BALANCE" | "TRANSITION" | "EXPANSION" | "COMPRESSION" | "UNKNOWN";

export interface RegimeMatcher {
  matches(dim: MarketStateDimension): boolean;
}

const looseMatch = (accepted: readonly string[]): RegimeMatcher => ({
  matches: (dim) => {
    if (dim.resolution !== "RESOLVED" || dim.value == null) return false;
    const v = String(dim.value).toLowerCase().replace(/[_\s-]+/g, "");
    return accepted.some((a) => a.toLowerCase().replace(/[_\s-]+/g, "") === v);
  },
});

export interface RegimeMatchers {
  regimeTrend: RegimeMatcher;
  regimeBalance: RegimeMatcher;
  regimeRotation: RegimeMatcher;
  volatilityLow: RegimeMatcher;
  volatilityNormal: RegimeMatcher;
  volatilityHigh: RegimeMatcher;
  volatilityShock: RegimeMatcher;
}

export const DEFAULT_REGIME_MATCHERS: RegimeMatchers = {
  regimeTrend:      looseMatch(["trend", "trending", "trendup", "trenddown"]),
  regimeBalance:    looseMatch(["balance", "balanced", "range", "ranging"]),
  regimeRotation:   looseMatch(["rotation", "rotating", "meanreversion"]),
  volatilityLow:    looseMatch(["low", "compressed", "quiet"]),
  volatilityNormal: looseMatch(["normal", "average", "typical"]),
  volatilityHigh:   looseMatch(["high", "elevated", "expansion"]),
  volatilityShock:  looseMatch(["shock", "extreme", "spike"]),
};

export interface RegimeVM {
  readonly verdict: RegimeVerdict;
  readonly resolution: MarketStateResolution;
  readonly confidence: number | null;
  readonly narrative: string;
  readonly evidence: readonly MarketStateEvidenceRef[];
  readonly contradictions: readonly string[];
  readonly reason?: string;
  readonly capturedAt: number;
}

export interface SelectRegimeInput {
  readonly state: CanonicalMarketState;
  readonly history?: readonly CanonicalMarketState[];
  readonly matchers?: Partial<RegimeMatchers>;
  /** Min history depth for TRANSITION/COMPRESSION detection. Default 3. */
  readonly minHistoryDepth?: number;
}

export function selectRegime(input: SelectRegimeInput): RegimeVM {
  const { state } = input;
  const m: RegimeMatchers = { ...DEFAULT_REGIME_MATCHERS, ...(input.matchers ?? {}) };
  const history = input.history ?? [];
  const minDepth = input.minHistoryDepth ?? 3;

  const regime = state.regime;
  const volatility = state.volatility;
  const evidence = [...regime.evidence, ...volatility.evidence];
  const contradictions = [...regime.contradictions, ...volatility.contradictions];

  // Both dimensions unresolved → UNKNOWN
  if (regime.resolution === "UNKNOWN" && volatility.resolution === "UNKNOWN") {
    return {
      verdict: "UNKNOWN",
      resolution: "UNKNOWN",
      confidence: null,
      narrative: "Regime cannot be resolved — both regime and volatility dimensions unresolved.",
      evidence,
      contradictions,
      reason: "Neither regime nor volatility dimension has verified evidence at snapshot time.",
      capturedAt: state.capturedAt,
    };
  }

  // EXPANSION / SHOCK take precedence — volatility signal dominates
  if (m.volatilityShock.matches(volatility)) {
    return {
      verdict: "EXPANSION",
      resolution: "RESOLVED",
      confidence: volatility.confidence,
      narrative: `Volatility ${volatility.value} — regime is expanding/shocking.`,
      evidence,
      contradictions,
      capturedAt: state.capturedAt,
    };
  }

  // TRANSITION: recent history shows regime value changed
  if (history.length >= minDepth && regime.resolution === "RESOLVED") {
    const recentValues = history
      .slice(-minDepth)
      .map((s) => s.regime.value)
      .filter((v): v is string => v != null);
    const distinct = new Set(recentValues.map((v) => v.toLowerCase()));
    if (distinct.size >= 2) {
      return {
        verdict: "TRANSITION",
        resolution: "PARTIAL",
        confidence: regime.confidence,
        narrative: `Regime value has changed across the last ${minDepth} snapshots (${Array.from(distinct).join(" → ")}).`,
        evidence,
        contradictions: [...contradictions, "Regime value not stable across recent history"],
        reason: "Regime dimension has flipped recently — treat as transitional, not stable.",
        capturedAt: state.capturedAt,
      };
    }
  }

  // COMPRESSION: volatility trending DOWN
  if (history.length >= minDepth && volatility.resolution === "RESOLVED") {
    const volTrend = history
      .slice(-minDepth)
      .map((s) => rankVolatility(s.volatility, m));
    if (volTrend.every((v, i) => (i === 0 ? true : v <= volTrend[i - 1]!)) && (volTrend[volTrend.length - 1] ?? 3) <= 1) {
      return {
        verdict: "COMPRESSION",
        resolution: "RESOLVED",
        confidence: volatility.confidence,
        narrative: `Volatility trending DOWN across the last ${minDepth} snapshots — compression regime.`,
        evidence,
        contradictions,
        capturedAt: state.capturedAt,
      };
    }
  }

  // TREND: regime dim says trend + volatility non-low
  //
  // `!m.volatilityLow.matches(volatility)` is satisfied by a volatility that is
  // MEASURED, and equally by one that was never measured at all — `looseMatch`
  // requires `resolution === "RESOLVED"`, so anything else fails to match. This
  // branch is therefore REACHABLE WITH NO VOLATILITY READING WHATSOEVER, and it
  // used to print `${volatility.value ?? "resolved"}`:
  //
  //     "Regime TREND with resolved volatility — trend environment."
  //
  // A fallback is not a place to name a standing you did not check. That one
  // asserted the STRONGEST of the three buckets for the emptiest of them. The
  // verdict itself stands — TREND rests on the regime dimension, not on
  // volatility — so only the sentence was lying, which is exactly what makes it
  // the kind of defect that survives review.
  if (m.regimeTrend.matches(regime) && !m.volatilityLow.matches(volatility)) {
    return {
      verdict: "TREND",
      resolution: "RESOLVED",
      confidence: regime.confidence,
      narrative: `Regime ${describeDimension(regime)} with ${describeDimension(volatility)} volatility — trend environment.`,
      evidence,
      contradictions,
      capturedAt: state.capturedAt,
    };
  }

  // BALANCE: regime dim says balance/rotation + volatility low/normal
  if (
    (m.regimeBalance.matches(regime) || m.regimeRotation.matches(regime)) &&
    (m.volatilityLow.matches(volatility) || m.volatilityNormal.matches(volatility))
  ) {
    return {
      verdict: "BALANCE",
      resolution: "RESOLVED",
      confidence: regime.confidence,
      // Unlike TREND above, BOTH guards here are `looseMatch`es, so volatility
      // is RESOLVED by construction and `describeDimension` returns the bare
      // value. Routed through it anyway: the next edit to this guard must not
      // silently re-open the hole TREND had.
      narrative: `Regime ${describeDimension(regime)} with ${describeDimension(volatility)} volatility — balanced environment.`,
      evidence,
      contradictions,
      capturedAt: state.capturedAt,
    };
  }

  // Partial resolution — one dimension resolved, no verdict rule matched
  return {
    verdict: "UNKNOWN",
    resolution: "PARTIAL",
    confidence: null,
    // This is the PARTIAL fall-through — by definition at least one dimension
    // here is MEASURED, which is the exact bucket `?? "unresolved"` could not
    // see. It printed a measured reading identically to a committed one.
    narrative: `Regime ${describeDimension(regime)} + volatility ${describeDimension(volatility)} — no verdict rule matched.`,
    evidence,
    contradictions,
    reason: "Regime + volatility combination did not match any known verdict pattern.",
    capturedAt: state.capturedAt,
  };
}

function rankVolatility(dim: MarketStateDimension, m: RegimeMatchers): number {
  if (m.volatilityLow.matches(dim)) return 1;
  if (m.volatilityNormal.matches(dim)) return 2;
  if (m.volatilityHigh.matches(dim)) return 3;
  if (m.volatilityShock.matches(dim)) return 4;
  return 0;
}
