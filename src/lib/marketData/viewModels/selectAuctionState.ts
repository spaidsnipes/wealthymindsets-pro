/**
 * selectAuctionState — closes the "Auction State" node in the Founder
 * decision chain:
 *   Regime → Direction → Location → AUCTION → Aggression → CLC → Risk →
 *   Permission → Management.
 *
 * From Founder super-directive: "Auction State should show whether price
 * is accepting, rejecting, balancing, expanding or failing."
 *
 * Verdicts:
 *   ACCEPTING       — price staying inside a new area (staying above VAH or
 *                     below VAL after a break; profile.value migrating)
 *   REJECTING       — price probes then leaves (structure sweep verdict +
 *                     price moving back inside)
 *   BALANCING       — regime says balance + structure not breaking
 *   EXPANDING       — structure breaks + direction resolves + response
 *                     displacement > ATR threshold
 *   FAILING         — attempted break followed by fade back inside prior
 *                     range (DLAR response verdict FADING)
 *   OPENING_ROTATION — early-session, session === REGULAR + no
 *                     established structure yet
 *   UNKNOWN         — insufficient evidence
 *
 * Pure selector. Reads CanonicalMarketState + optional DLAR VM (for
 * response verdict). Configurable matchers so the engine never invents
 * producer vocabulary.
 */

import type {
  CanonicalMarketState,
  MarketStateDimension,
  MarketStateEvidenceRef,
  MarketStateResolution,
} from "../canonicalMarketState";
import type { DLARVM } from "./selectDLAR";

export type AuctionVerdict =
  | "ACCEPTING"
  | "REJECTING"
  | "BALANCING"
  | "EXPANDING"
  | "FAILING"
  | "OPENING_ROTATION"
  | "UNKNOWN";

export interface AuctionMatcher {
  matches(dim: MarketStateDimension): boolean;
}

const looseMatch = (accepted: readonly string[]): AuctionMatcher => ({
  matches: (dim) => {
    if (dim.resolution !== "RESOLVED" || dim.value == null) return false;
    const v = String(dim.value).toLowerCase().replace(/[_\s-]+/g, "");
    return accepted.some((a) => a.toLowerCase().replace(/[_\s-]+/g, "") === v);
  },
});

export interface AuctionMatchers {
  structureBOS: AuctionMatcher;
  structureSweep: AuctionMatcher;
  structureNone: AuctionMatcher;
  regimeBalance: AuctionMatcher;
  profileMigrating: AuctionMatcher;
  profileStable: AuctionMatcher;
  locationInside: AuctionMatcher;
  locationEdge: AuctionMatcher;
}

export const DEFAULT_AUCTION_MATCHERS: AuctionMatchers = {
  structureBOS:    looseMatch(["bos", "breakofstructure", "break", "breakup", "breakdown"]),
  structureSweep:  looseMatch(["sweep", "liquiditysweep"]),
  structureNone:   looseMatch(["none", "unclear", "forming"]),
  regimeBalance:   looseMatch(["balance", "balanced", "range", "ranging"]),
  profileMigrating: looseMatch(["migrating", "shifting", "valuemigration"]),
  profileStable:   looseMatch(["stable", "balanced", "poc-centered", "poccentered"]),
  locationInside:  looseMatch(["insidevalue", "invalue", "poc", "mid", "balance"]),
  locationEdge:    looseMatch(["athigh", "atlow", "vah", "val", "edge", "extreme"]),
};

export interface AuctionStateVM {
  readonly verdict: AuctionVerdict;
  readonly resolution: MarketStateResolution;
  readonly confidence: number | null;
  readonly narrative: string;
  readonly evidence: readonly MarketStateEvidenceRef[];
  readonly contradictions: readonly string[];
  readonly reason?: string;
  readonly capturedAt: number;
}

export interface SelectAuctionStateInput {
  readonly state: CanonicalMarketState;
  readonly dlar?: DLARVM | null;
  readonly matchers?: Partial<AuctionMatchers>;
  /** Session-open in ms since session start below which OPENING_ROTATION
   *  detector applies. Default 15 minutes. */
  readonly openingWindowMs?: number;
  /** ms elapsed since session open — required for OPENING_ROTATION. */
  readonly msSinceSessionOpen?: number;
}

export function selectAuctionState(input: SelectAuctionStateInput): AuctionStateVM {
  const { state } = input;
  const m: AuctionMatchers = { ...DEFAULT_AUCTION_MATCHERS, ...(input.matchers ?? {}) };
  const openingWindow = input.openingWindowMs ?? 15 * 60_000;
  const evidence = [
    ...state.structure.evidence,
    ...state.location.evidence,
    ...state.regime.evidence,
    ...state.profile.evidence,
  ];
  const contradictions = [
    ...state.structure.contradictions,
    ...state.location.contradictions,
    ...state.regime.contradictions,
    ...state.profile.contradictions,
  ];

  // OPENING_ROTATION check — early in session + no structure resolved
  if (
    state.session === "REGULAR" &&
    input.msSinceSessionOpen != null &&
    input.msSinceSessionOpen < openingWindow &&
    state.structure.resolution !== "RESOLVED"
  ) {
    return {
      verdict: "OPENING_ROTATION",
      resolution: "PARTIAL",
      confidence: null,
      narrative: `Session ${state.session}, ${Math.round(input.msSinceSessionOpen / 60_000)}m in — structure not yet established. Opening rotation.`,
      evidence,
      contradictions,
      reason: "Early-session detector — structure has not yet resolved to a directional verdict.",
      capturedAt: state.capturedAt,
    };
  }

  // FAILING check — DLAR response says FADING
  if (input.dlar?.response.verdict === "FADING") {
    return {
      verdict: "FAILING",
      resolution: "RESOLVED",
      confidence: input.dlar.aggression.confidence,
      narrative: `Attempted move faded (${input.dlar.response.displacementRatio?.toFixed(2) ?? "?"}× ATR against direction) — auction failing.`,
      evidence: [...evidence, ...input.dlar.response.evidence],
      contradictions: [...contradictions, ...input.dlar.response.contradictions],
      capturedAt: state.capturedAt,
    };
  }

  // EXPANDING check — BOS structure + direction resolved + response responding
  if (
    m.structureBOS.matches(state.structure) &&
    state.direction.resolution === "RESOLVED" &&
    input.dlar?.response.verdict === "RESPONDING"
  ) {
    return {
      verdict: "EXPANDING",
      resolution: "RESOLVED",
      confidence: state.direction.confidence,
      narrative: `Structure ${state.structure.value} with ${state.direction.value} direction — auction expanding.`,
      evidence,
      contradictions,
      capturedAt: state.capturedAt,
    };
  }

  // REJECTING check — structure sweep
  if (m.structureSweep.matches(state.structure)) {
    return {
      verdict: "REJECTING",
      resolution: "RESOLVED",
      confidence: state.structure.confidence,
      narrative: `Structure ${state.structure.value} — liquidity sweep, price rejecting the level.`,
      evidence,
      contradictions,
      capturedAt: state.capturedAt,
    };
  }

  // ACCEPTING check — profile migrating + location inside new area
  if (m.profileMigrating.matches(state.profile) && m.locationInside.matches(state.location)) {
    return {
      verdict: "ACCEPTING",
      resolution: "RESOLVED",
      confidence: state.profile.confidence,
      narrative: `Profile ${state.profile.value}, price ${state.location.value} — auction accepting new area.`,
      evidence,
      contradictions,
      capturedAt: state.capturedAt,
    };
  }

  // BALANCING check — regime balance + structure not breaking
  if (m.regimeBalance.matches(state.regime) && !m.structureBOS.matches(state.structure)) {
    return {
      verdict: "BALANCING",
      resolution: "RESOLVED",
      confidence: state.regime.confidence,
      narrative: `Regime ${state.regime.value}, structure ${state.structure.value ?? "unresolved"} — auction balancing.`,
      evidence,
      contradictions,
      capturedAt: state.capturedAt,
    };
  }

  // Fallback — partial state without verdict
  const anyResolved =
    state.structure.resolution === "RESOLVED" ||
    state.location.resolution === "RESOLVED" ||
    state.regime.resolution === "RESOLVED" ||
    state.profile.resolution === "RESOLVED";
  return {
    verdict: "UNKNOWN",
    resolution: anyResolved ? "PARTIAL" : "UNKNOWN",
    confidence: null,
    narrative: anyResolved
      ? `Some dimensions resolved (structure ${state.structure.value ?? "?"}, location ${state.location.value ?? "?"}, regime ${state.regime.value ?? "?"}) but no auction verdict pattern matched.`
      : "Insufficient evidence — no auction verdict.",
    evidence,
    contradictions,
    reason: anyResolved
      ? "Combination of dimensions did not match a known verdict pattern."
      : "Structure, location, regime and profile all unresolved.",
    capturedAt: state.capturedAt,
  };
}
