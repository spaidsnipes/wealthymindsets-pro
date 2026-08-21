import type { MarketFidelityClass } from "./marketEvent";
import type { MarketStateResolution } from "./canonicalMarketState";

/**
 * ProvenanceEnvelope — Founder canon A04: "A number without coverage is not
 * full truth. Every aggregate metric carries provenance."
 *
 * Wraps a computed value with WHERE it came from (fidelity + source), WHEN it
 * was observed, and HOW COMPLETE its coverage is — then DERIVES a truthful
 * resolution (RESOLVED / PARTIAL / UNKNOWN). A consumer renders the value
 * alongside its resolution instead of presenting a bare number as full truth.
 *
 * Reuses the canonical MarketFidelityClass + MarketStateResolution vocab — no
 * new truth enum. PURE — the resolution is derived deterministically from the
 * provenance, never asserted by the caller.
 */

export interface CoverageRatio {
  /** How many contributing sources/channels were actually observed. */
  readonly observed: number;
  /** How many were expected, or null when the expected total is itself unknown. */
  readonly expected: number | null;
}

export interface Provenance {
  readonly fidelity: MarketFidelityClass;
  readonly source: string;
  /** Observation time in epoch ms, or null when it is not known. */
  readonly observedAt: number | null;
  readonly coverage: CoverageRatio;
}

export interface ProvenanceEnvelope<T> {
  readonly value: T;
  readonly fidelity: MarketFidelityClass;
  readonly source: string;
  readonly observedAt: number | null;
  readonly coverage: CoverageRatio;
  /** DERIVED truth tier — never claimed by the caller. */
  readonly resolution: MarketStateResolution;
}

/**
 * Derive the truth resolution from provenance. Rules (fail-closed):
 *   · fidelity UNAVAILABLE, or observed coverage 0 → UNKNOWN.
 *   · expected known and observed < expected → PARTIAL (incomplete coverage).
 *   · fidelity not directly OBSERVED (DERIVED/PROXY/INFERRED/SIMULATED) → PARTIAL
 *     (a real number, but not fully-observed truth).
 *   · OBSERVED with complete (or unbounded-but-present) coverage → RESOLVED.
 */
export function deriveResolution(p: Provenance): MarketStateResolution {
  if (p.fidelity === "UNAVAILABLE") return "UNKNOWN";
  if (!(p.coverage.observed > 0)) return "UNKNOWN";
  if (p.coverage.expected != null && p.coverage.observed < p.coverage.expected) return "PARTIAL";
  if (p.fidelity !== "OBSERVED") return "PARTIAL";
  return "RESOLVED";
}

/** Wrap a value with its provenance, deriving the resolution. */
export function envelope<T>(value: T, provenance: Provenance): ProvenanceEnvelope<T> {
  return {
    value,
    fidelity: provenance.fidelity,
    source: provenance.source,
    observedAt: provenance.observedAt,
    coverage: provenance.coverage,
    resolution: deriveResolution(provenance),
  };
}

/** True only when the envelope is fully-observed truth. */
export function isFullTruth<T>(env: ProvenanceEnvelope<T>): boolean {
  return env.resolution === "RESOLVED";
}

/** A short, honest coverage label for a surface: "4/7", "3", or "none". */
export function coverageLabel(coverage: CoverageRatio): string {
  if (!(coverage.observed > 0)) return "none";
  return coverage.expected != null ? `${coverage.observed}/${coverage.expected}` : `${coverage.observed}`;
}
