/**
 * selectDLAR — M26. DIRECTION × LOCATION × AGGRESSION × RESPONSE.
 *
 * Founder doctrine (2026-08-13):
 *   DIRECTION:  where the larger auction is leaning.
 *   LOCATION:   where price is relative to value / structure / liquidity.
 *   AGGRESSION: who appears to be pressing.
 *   RESPONSE:   does price actually move appropriately in response?
 *
 *   "AGGRESSION WITHOUT RESPONSE can be more important than aggression
 *    alone."
 *
 * This is WM's most reusable explanatory lens. It feeds Story, Trade
 * Expectation, Decision Memory, Auction Destination, Absorption and UI
 * explanation — all from ONE view model so those surfaces cannot drift
 * apart.
 *
 * Pure selector. Reads CanonicalMarketState (values are `string | null`
 * free-form, so vocabulary matching is caller-configurable — never
 * hardcoded producer tokens).
 */

import type {
  CanonicalMarketState,
  MarketStateDimension,
  MarketStateEvidenceRef,
  MarketStateResolution,
} from "../canonicalMarketState";

export interface DimensionMatcher {
  matches(dim: MarketStateDimension): boolean;
}

const looseMatch = (accepted: readonly string[]): DimensionMatcher => ({
  matches: (dim) => {
    if (dim.resolution !== "RESOLVED" || dim.value == null) return false;
    const v = String(dim.value).toLowerCase().replace(/[_\s-]+/g, "");
    return accepted.some((a) => a.toLowerCase().replace(/[_\s-]+/g, "") === v);
  },
});

export interface DLARMatchers {
  aggressionHigh: DimensionMatcher;
  aggressionLow: DimensionMatcher;
  locationAtValueEdge: DimensionMatcher;
  locationInsideValue: DimensionMatcher;
}

export const DEFAULT_DLAR_MATCHERS: DLARMatchers = {
  aggressionHigh:      looseMatch(["high", "elevated", "strong", "aggressive"]),
  aggressionLow:       looseMatch(["low", "weak", "muted", "passive"]),
  locationAtValueEdge: looseMatch(["athigh", "atlow", "vah", "val", "edge", "extreme"]),
  locationInsideValue: looseMatch(["insidevalue", "invalue", "poc", "mid", "balance"]),
};

// ── Response — the distinguishing WM concept ───────────────────────────

export type ResponseVerdict =
  | "RESPONDING"       // aggression is producing displacement in its direction
  | "ABSORBED"         // high aggression, minimal displacement — someone is taking it
  | "FADING"           // displacement reversing against the aggressor
  | "QUIET"            // low aggression, low displacement — nothing to read
  | "UNKNOWN";

export interface DLARComponent {
  readonly resolution: MarketStateResolution;
  readonly value: string | null;
  readonly confidence: number | null;
  readonly evidence: readonly MarketStateEvidenceRef[];
  readonly contradictions: readonly string[];
  readonly unknowns: readonly string[];
}

export interface DLARVM {
  readonly direction: DLARComponent;
  readonly location: DLARComponent;
  readonly aggression: DLARComponent;
  readonly response: {
    readonly verdict: ResponseVerdict;
    readonly resolution: MarketStateResolution;
    /** Displacement normalized by ATR — dimensionless, cross-asset safe. */
    readonly displacementRatio: number | null;
    readonly evidence: readonly MarketStateEvidenceRef[];
    readonly contradictions: readonly string[];
    readonly reason?: string;
  };
  /** Overall resolution across all four. */
  readonly resolution: MarketStateResolution;
  /** One-line explanation the UI can render verbatim. */
  readonly narrative: string;
  readonly capturedAt: number;
}

export interface SelectDLARInput {
  readonly state: CanonicalMarketState;
  readonly history?: readonly CanonicalMarketState[];
  readonly matchers?: Partial<DLARMatchers>;
  /** ATR extractor for dimensionless displacement. Return null if unknown. */
  readonly atrExtractor?: (state: CanonicalMarketState) => number | null;
  /** How many snapshots back to measure displacement. Default 3. */
  readonly responseWindow?: number;
  /** Displacement ratio below this counts as "no meaningful move". Default 0.2. */
  readonly absorbedThreshold?: number;
}

const toComponent = (dim: MarketStateDimension): DLARComponent => ({
  resolution: dim.resolution,
  value: dim.value,
  confidence: dim.confidence,
  evidence: dim.evidence,
  contradictions: dim.contradictions,
  unknowns: dim.unknowns,
});

export function selectDLAR(input: SelectDLARInput): DLARVM {
  const { state } = input;
  const m: DLARMatchers = { ...DEFAULT_DLAR_MATCHERS, ...(input.matchers ?? {}) };
  const history = input.history ?? [];
  const windowSize = input.responseWindow ?? 3;
  const absorbedThreshold = input.absorbedThreshold ?? 0.2;

  const direction = toComponent(state.direction);
  const location = toComponent(state.location);
  const aggression = toComponent(state.aggression);

  // ── Response derivation ──────────────────────────────────────────────
  let verdict: ResponseVerdict = "UNKNOWN";
  let displacementRatio: number | null = null;
  let responseResolution: MarketStateResolution = "UNKNOWN";
  let responseReason: string | undefined;
  const responseContradictions: string[] = [];

  const atr = input.atrExtractor?.(state) ?? null;
  const window = history.slice(-windowSize);
  const prices = window.map((s) => s.price.last).filter((p): p is number => p != null);

  if (atr == null || atr <= 0) {
    responseReason = "ATR unresolved — displacement cannot be normalized across assets";
    responseContradictions.push("No ATR basis for response measurement");
  } else if (prices.length < 2) {
    responseReason = `Insufficient price history (${prices.length} of ${windowSize} snapshots)`;
  } else {
    const start = prices[0];
    const end = prices[prices.length - 1];
    const signedDisplacement = end - start;
    displacementRatio = Math.abs(signedDisplacement) / atr;

    const highAggression = m.aggressionHigh.matches(state.aggression);
    const lowAggression = m.aggressionLow.matches(state.aggression);
    const aggressionResolved = state.aggression.resolution === "RESOLVED";

    if (!aggressionResolved) {
      responseReason = "Aggression unresolved — cannot judge whether price is responding to it";
    } else if (highAggression && displacementRatio < absorbedThreshold) {
      verdict = "ABSORBED";
      responseResolution = "RESOLVED";
      responseReason = `High aggression with displacement ${displacementRatio.toFixed(2)}× ATR — pressure is not producing progress`;
    } else if (highAggression && displacementRatio >= absorbedThreshold) {
      // Is displacement in the direction the aggression implies?
      const dirValue = state.direction.value?.toLowerCase() ?? "";
      const dirIsLong = dirValue.includes("long") || dirValue.includes("up") || dirValue.includes("bull");
      const dirIsShort = dirValue.includes("short") || dirValue.includes("down") || dirValue.includes("bear");
      const movedUp = signedDisplacement > 0;
      if ((dirIsLong && movedUp) || (dirIsShort && !movedUp)) {
        verdict = "RESPONDING";
        responseResolution = "RESOLVED";
        responseReason = `Aggression producing ${displacementRatio.toFixed(2)}× ATR displacement in the direction of the auction`;
      } else if (dirIsLong || dirIsShort) {
        verdict = "FADING";
        responseResolution = "RESOLVED";
        responseReason = `Displacement ${displacementRatio.toFixed(2)}× ATR is moving against the stated direction`;
        responseContradictions.push("Price direction contradicts auction direction");
      } else {
        verdict = "RESPONDING";
        responseResolution = "PARTIAL";
        responseReason = `Displacement ${displacementRatio.toFixed(2)}× ATR present, but direction unresolved so its sign cannot be judged`;
      }
    } else if (lowAggression && displacementRatio < absorbedThreshold) {
      verdict = "QUIET";
      responseResolution = "RESOLVED";
      responseReason = "Low aggression, low displacement — no participation to read";
    } else {
      verdict = "UNKNOWN";
      responseResolution = "PARTIAL";
      responseReason = `Aggression ${state.aggression.value ?? "unresolved"} with ${displacementRatio.toFixed(2)}× ATR displacement — no clear pattern`;
    }
  }

  // ── Overall resolution ───────────────────────────────────────────────
  const parts: MarketStateResolution[] = [
    direction.resolution,
    location.resolution,
    aggression.resolution,
    responseResolution,
  ];
  const resolvedCount = parts.filter((p) => p === "RESOLVED").length;
  const resolution: MarketStateResolution =
    resolvedCount === 4 ? "RESOLVED" : resolvedCount === 0 ? "UNKNOWN" : "PARTIAL";

  // ── Narrative — verbatim-renderable, never fabricated ────────────────
  const narrative = buildNarrative(direction, location, aggression, verdict, displacementRatio);

  return {
    direction,
    location,
    aggression,
    response: {
      verdict,
      resolution: responseResolution,
      displacementRatio,
      evidence: [...state.aggression.evidence, ...state.orderFlow.evidence, ...state.volatility.evidence],
      contradictions: responseContradictions,
      reason: responseReason,
    },
    resolution,
    narrative,
    capturedAt: state.capturedAt,
  };
}

function buildNarrative(
  direction: DLARComponent,
  location: DLARComponent,
  aggression: DLARComponent,
  response: ResponseVerdict,
  ratio: number | null,
): string {
  const d = direction.resolution === "RESOLVED" ? direction.value : null;
  const l = location.resolution === "RESOLVED" ? location.value : null;
  const a = aggression.resolution === "RESOLVED" ? aggression.value : null;

  if (!d && !l && !a && response === "UNKNOWN") {
    return "Market state cannot be resolved — no direction, location, aggression or response evidence.";
  }

  const clauses: string[] = [];
  clauses.push(d ? `Auction leaning ${d}` : "Direction unresolved");
  clauses.push(l ? `price at ${l}` : "location unresolved");
  clauses.push(a ? `${a} aggression` : "aggression unresolved");

  const responseClause =
    response === "ABSORBED"   ? `but price is not moving (${ratio?.toFixed(2) ?? "?"}× ATR) — participation is being absorbed`
  : response === "RESPONDING" ? `and price is responding (${ratio?.toFixed(2) ?? "?"}× ATR)`
  : response === "FADING"     ? `but price is fading against it (${ratio?.toFixed(2) ?? "?"}× ATR)`
  : response === "QUIET"      ? "with no meaningful participation"
  :                             "response unresolved";

  return `${clauses.join(", ")}, ${responseClause}.`;
}
