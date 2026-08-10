import type {
  MarketDataCapability,
  MarketEventCapability,
  PersistenceRight,
} from "./capabilityRegistry";

export const MARKET_COVERAGE_SCHEMA_VERSION = "wm.market-coverage.v1" as const;

export type CoverageState =
  | "CONNECTING"
  | "COLLECTING"
  | "GAPPED"
  | "STALE"
  | "UNAVAILABLE"
  | "REPLAY";

export type MemoryState = "NO_MEMORY" | "SESSION_ONLY" | "RETAINED";

export interface MarketChannelCoverage {
  schemaVersion: typeof MARKET_COVERAGE_SCHEMA_VERSION;
  instrumentId: string;
  normalizedSymbol?: string;
  channel: MarketEventCapability;
  providerPath: string;
  coverageState: CoverageState;
  memoryState: MemoryState;
  persistenceRight: PersistenceRight;
  rightsPolicyId: string;
  observedFrom?: number;
  observedThrough?: number;
  lastEventAt?: number;
  gapCount: number;
  lastGapAt?: number;
  fidelity: MarketDataCapability["fidelityClass"];
  collectionScope: MarketDataCapability["collectionScope"];
  detail: string;
}

export interface CoverageObservation {
  eventAt: number;
  receivedAt: number;
  sequenceGap?: boolean;
}

export function createChannelCoverage(
  instrumentId: string,
  capability: MarketDataCapability,
): MarketChannelCoverage {
  if (!instrumentId.trim()) throw new Error("Coverage requires an instrument identity.");

  const unavailable = capability.availability === "UNAVAILABLE";
  return {
    schemaVersion: MARKET_COVERAGE_SCHEMA_VERSION,
    instrumentId,
    channel: capability.eventType,
    providerPath: capability.providerPath,
    coverageState: unavailable ? "UNAVAILABLE" : "CONNECTING",
    memoryState: "NO_MEMORY",
    persistenceRight: capability.rawPersistenceRight,
    rightsPolicyId: capability.rightsPolicyId,
    gapCount: 0,
    fidelity: capability.fidelityClass,
    collectionScope: capability.collectionScope,
    detail: unavailable
      ? "No verified channel implementation."
      : "No evidence observed in this runtime yet.",
  };
}

/** Records coverage facts only; raw market payloads are never stored here. */
export function observeChannel(
  coverage: MarketChannelCoverage,
  observation: CoverageObservation,
): MarketChannelCoverage {
  if (!Number.isFinite(observation.eventAt) || !Number.isFinite(observation.receivedAt) ||
      observation.eventAt <= 0 || observation.receivedAt <= 0) {
    throw new Error("Coverage observations require valid epoch-millisecond timestamps.");
  }
  if (coverage.coverageState === "UNAVAILABLE") return coverage;

  const observedFrom = Math.min(coverage.observedFrom ?? observation.eventAt, observation.eventAt);
  const observedThrough = Math.max(coverage.observedThrough ?? observation.eventAt, observation.eventAt);
  const sequenceGap = observation.sequenceGap === true;

  return {
    ...coverage,
    coverageState: sequenceGap ? "GAPPED" : "COLLECTING",
    // Current browser collectors retain only in-memory/session evidence. Rights
    // alone never promote a channel to durable memory.
    memoryState: "SESSION_ONLY",
    observedFrom,
    observedThrough,
    lastEventAt: observation.receivedAt,
    gapCount: coverage.gapCount + (sequenceGap ? 1 : 0),
    lastGapAt: sequenceGap ? observation.receivedAt : coverage.lastGapAt,
    detail: sequenceGap
      ? "Collection continues, but sequence coverage contains a known gap."
      : "Live evidence observed in this runtime; historical retention is not implied.",
  };
}

export function markCoverageStale(
  coverage: MarketChannelCoverage,
  now: number,
  staleAfterMs: number,
): MarketChannelCoverage {
  if (coverage.lastEventAt == null || coverage.coverageState === "UNAVAILABLE") return coverage;
  if (!Number.isFinite(now) || !Number.isFinite(staleAfterMs) || staleAfterMs < 0) {
    throw new Error("Staleness evaluation requires valid non-negative timing inputs.");
  }
  if (now - coverage.lastEventAt <= staleAfterMs) return coverage;
  return {
    ...coverage,
    coverageState: "STALE",
    detail: "No event arrived inside the configured freshness window.",
  };
}

export function canClaimRetainedCoverage(coverage: MarketChannelCoverage): boolean {
  return coverage.memoryState === "RETAINED" &&
    coverage.persistenceRight === "ALLOWED" &&
    coverage.observedFrom != null &&
    coverage.observedThrough != null &&
    coverage.gapCount === 0;
}
