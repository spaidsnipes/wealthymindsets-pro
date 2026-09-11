/**
 * deriveVolatilityDimension — bridge recent per-trade ticks →
 * CanonicalMarketState volatility dimension.
 *
 * FOUNDER-CANON P6 MARKET OBJECT PASSPORT extension. Sibling of
 * deriveOrderFlowDimension (2026-09-02, c66d926). Passport VOLATILITY
 * node was UNRESOLVED for every symbol because no producer sealed it.
 * The chart runtime already has real per-trade tick data — the same
 * evidence lane that lit ORDER FLOW is enough for a first-pass
 * observed-range volatility read.
 *
 * PURE — no I/O, no clock. Fabrication safeguards:
 *   - Empty / all-invalid ticks → UNKNOWN (never invents a range).
 *   - Below the sample threshold → PARTIAL (never RESOLVED on thin tape).
 *   - Confidence is bucketed by sample count, never inferred from
 *     the range value itself.
 */

import type {
  AggressorTick,
} from "./selectAggressorFlow";
import type { MarketStateDimension, MarketStateEvidenceRef } from "./canonicalMarketState";

const UNKNOWN_DIMENSION: MarketStateDimension = {
  resolution: "UNKNOWN",
  value: null,
  confidence: null,
  evidence: [],
  contradictions: [],
  unknowns: ["No verified price evidence supplied at snapshot time."],
};

/**
 * Below this trade count the aggregate is too thin to seal as a
 * decision-grade volatility read. Deliberately conservative — canon
 * §Silence Is A Feature.
 */
export const VOLATILITY_RESOLVE_MIN_TRADES = 8;

/**
 * Relative range thresholds. Range % = (max - min) / mean × 100.
 * Below 0.05% → LOW, 0.05%–0.30% → NORMAL, above → HIGH. The bands are
 * intentionally coarse for a first-pass observed-range read — the canon
 * regime engine will supersede this once its own evidence lane exists.
 */
export const VOLATILITY_LOW_MAX_PCT = 0.05;
export const VOLATILITY_HIGH_MIN_PCT = 0.30;

export interface DeriveVolatilityInput {
  readonly ticks: readonly AggressorTick[];
  /** Provider tag for the evidence ref. */
  readonly source: string | null | undefined;
  /** Latest tick timestamp (ms). Used as observedAt (clamped to capturedAt). */
  readonly latestTickAtMs: number | null;
  /** Snapshot cutoff — evidence.availableAt must be ≤ this. */
  readonly capturedAt: number;
  /** Stable id used in the evidence eventId (typically the snapshot id). */
  readonly snapshotIdSeed: string;
}

interface VolatilityAggregate {
  readonly count: number;
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly rangePct: number;
}

function aggregateFor(ticks: readonly AggressorTick[]): VolatilityAggregate | null {
  let count = 0;
  let sum = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const t of ticks) {
    if (!t || t.trade !== true) continue;
    const price = Number(t.price) || 0;
    if (price <= 0 || !Number.isFinite(price)) continue;
    count += 1;
    sum += price;
    if (price < min) min = price;
    if (price > max) max = price;
  }
  if (count === 0) return null;
  const mean = sum / count;
  if (!(mean > 0)) return null;
  const rangePct = ((max - min) / mean) * 100;
  return { count, min, max, mean, rangePct };
}

/**
 * THE ENTIRE VOCABULARY THIS PRODUCER CAN EMIT.
 *
 * Named as data, not as three string literals buried in a branch, because the
 * only consumer that matters — `selectMarketStory`'s DEFAULT_MATCHERS — reads
 * this dimension BY VALUE. When the matcher list and the producer's words drift
 * apart nothing throws, nothing fails tsc, and no test turns red: the chapter
 * guard simply never fires, and /command-deck prints UNKNOWN in its largest
 * type forever. That is exactly how the BALANCE chapter came to be unreachable
 * (the matcher accepted "low"; this file has always said "LOW VOLATILITY").
 *
 * Exporting the vocabulary lets the matcher side be tested against THIS list
 * rather than against a second hand-written copy of it — the same symmetry
 * discipline the DecisionId mint/reader pair uses. Adding a fourth verdict here
 * fails the symmetry Sentinel until a matcher claims it or a test declares it
 * deliberately unmatched.
 */
export const VOLATILITY_VERDICTS = {
  LOW: "LOW VOLATILITY",
  NORMAL: "NORMAL VOLATILITY",
  HIGH: "HIGH VOLATILITY",
} as const;

export type VolatilityVerdict = (typeof VOLATILITY_VERDICTS)[keyof typeof VOLATILITY_VERDICTS];

function verdictFor(rangePct: number): VolatilityVerdict {
  if (rangePct <= VOLATILITY_LOW_MAX_PCT) return VOLATILITY_VERDICTS.LOW;
  if (rangePct >= VOLATILITY_HIGH_MIN_PCT) return VOLATILITY_VERDICTS.HIGH;
  return VOLATILITY_VERDICTS.NORMAL;
}

function confidenceFor(count: number): number {
  if (count >= 60) return 0.75;
  if (count >= 20) return 0.55;
  if (count >= VOLATILITY_RESOLVE_MIN_TRADES) return 0.35;
  return 0;
}

function evidenceRefFor(input: DeriveVolatilityInput, agg: VolatilityAggregate): MarketStateEvidenceRef {
  const source = (input.source && input.source.trim()) || "chart-runtime";
  const observedAt = input.latestTickAtMs && input.latestTickAtMs > 0
    ? Math.min(input.latestTickAtMs, input.capturedAt)
    : input.capturedAt;
  return {
    eventId: `volatility:range:${input.snapshotIdSeed}:${observedAt}`,
    observedAt,
    availableAt: input.capturedAt,
    source,
    fidelity: "DERIVED",
    basis: `Range ${agg.rangePct.toFixed(3)}% observed across ${agg.count} per-trade tick${agg.count === 1 ? "" : "s"}`,
  };
}

export function deriveVolatilityDimension(input: DeriveVolatilityInput): MarketStateDimension {
  const agg = aggregateFor(input.ticks);
  if (!agg) return UNKNOWN_DIMENSION;

  if (agg.count < VOLATILITY_RESOLVE_MIN_TRADES) {
    return {
      resolution: "PARTIAL",
      value: null,
      confidence: confidenceFor(agg.count),
      evidence: [evidenceRefFor(input, agg)],
      contradictions: [],
      unknowns: [
        `Only ${agg.count} classified trade${agg.count === 1 ? "" : "s"} observed — below the ${VOLATILITY_RESOLVE_MIN_TRADES}-trade seal threshold.`,
      ],
    };
  }

  return {
    resolution: "RESOLVED",
    value: verdictFor(agg.rangePct),
    confidence: confidenceFor(agg.count),
    evidence: [evidenceRefFor(input, agg)],
    contradictions: [],
    unknowns: [],
  };
}
