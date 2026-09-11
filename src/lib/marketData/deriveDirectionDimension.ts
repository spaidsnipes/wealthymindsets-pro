/**
 * deriveDirectionDimension — bridge recent per-trade ticks →
 * CanonicalMarketState direction dimension.
 *
 * FOUNDER-CANON P6 MARKET OBJECT PASSPORT extension. Third sibling of
 * deriveOrderFlowDimension (c66d926) and deriveVolatilityDimension.
 *
 * WHY THIS EXISTS (real from-USE defect, 2026-09-10): /command-deck renders
 * "UNKNOWN" in the largest type on the lead browser surface because
 * chartMarketStatePublisher hard-coded Direction as permanently unresolved —
 * not because the evidence was missing, but because no producer had ever been
 * written. The identical per-trade tape that already lights ORDER FLOW and
 * VOLATILITY carries a net-drift read. This seals it, or honestly refuses to.
 *
 * PURE — no I/O, no clock. Fabrication safeguards:
 *   - Empty / all-invalid ticks → UNKNOWN (never invents a direction).
 *   - Below the sample threshold → PARTIAL (never RESOLVED on thin tape).
 *   - Drift that does not dominate the observed range → PARTIAL. Chop is not
 *     a direction, and the honest answer to "which way" inside a balanced
 *     auction is "not established", not a coin flip.
 *   - Vocabulary is constrained to "UP" / "DOWN". Downstream consumers
 *     (selectCLC, selectDLAR, selectTradeExpectation) match direction by
 *     substring against long/up/bull and short/down/bear — a neutral verdict
 *     word like "BALANCED" would resolve the dimension while silently
 *     producing an unexplained CLC WAIT. Unresolved must stay unresolved.
 */

import type { MarketStateDimension, MarketStateEvidenceRef } from "./canonicalMarketState";

/** Structural subset of the chart-runtime Tick this derivation needs. */
export interface DirectionTick {
  readonly price?: number | null | undefined;
  readonly time?: number | null | undefined;
  readonly trade?: boolean;
}

const UNKNOWN_DIMENSION: MarketStateDimension = {
  resolution: "UNKNOWN",
  value: null,
  confidence: null,
  evidence: [],
  contradictions: [],
  unknowns: ["No verified price evidence supplied at snapshot time."],
};

/**
 * Below this trade count a net-drift read is tape noise, not a direction.
 * Deliberately higher than the volatility threshold — a range is a property
 * of a sample, but a direction is a claim about where the market is GOING,
 * and that claim carries more consequence downstream (CLC, DLAR, trade
 * expectation all branch on it). Canon §Silence Is A Feature.
 */
export const DIRECTION_RESOLVE_MIN_TRADES = 12;

/**
 * Net drift must be at least this share of the observed high-low range
 * before it counts as directional. At 0.5 the move has covered more than
 * half its own range in one net direction — below that the tape retraced
 * most of what it made, which is chop.
 */
export const DIRECTION_MIN_RANGE_SHARE = 0.5;

/**
 * Absolute floor so a dead-flat tape with one-tick noise cannot resolve on
 * range-share alone (a 1-cent range fully traversed is still 1 cent).
 * Expressed as percent of mean price.
 */
export const DIRECTION_MIN_DRIFT_PCT = 0.01;

export interface DeriveDirectionInput {
  readonly ticks: readonly DirectionTick[];
  /** Provider tag for the evidence ref. */
  readonly source: string | null | undefined;
  /** Latest tick timestamp (ms). Used as observedAt (clamped to capturedAt). */
  readonly latestTickAtMs: number | null;
  /** Snapshot cutoff — evidence.availableAt must be ≤ this. */
  readonly capturedAt: number;
  /** Stable id used in the evidence eventId (typically the snapshot id). */
  readonly snapshotIdSeed: string;
}

interface DirectionAggregate {
  readonly count: number;
  readonly first: number;
  readonly last: number;
  readonly mean: number;
  readonly range: number;
  readonly drift: number;
  readonly driftPct: number;
  readonly rangeShare: number;
}

function aggregateFor(ticks: readonly DirectionTick[]): DirectionAggregate | null {
  // Time-ordered, because "net drift" is meaningless on an unordered bag.
  // Ticks without a usable timestamp keep their arrival order via a stable
  // index tiebreak rather than being silently dropped.
  const usable: { price: number; time: number; idx: number }[] = [];
  ticks.forEach((t, idx) => {
    if (!t || t.trade !== true) return;
    const price = Number(t.price);
    if (!Number.isFinite(price) || price <= 0) return;
    const rawTime = Number(t.time);
    const time = Number.isFinite(rawTime) && rawTime > 0 ? rawTime : 0;
    usable.push({ price, time, idx });
  });
  if (usable.length === 0) return null;
  usable.sort((a, b) => (a.time - b.time) || (a.idx - b.idx));

  let sum = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const u of usable) {
    sum += u.price;
    if (u.price < min) min = u.price;
    if (u.price > max) max = u.price;
  }
  const count = usable.length;
  const mean = sum / count;
  if (!(mean > 0)) return null;

  const first = usable[0]!.price;
  const last = usable[count - 1]!.price;
  const drift = last - first;
  const range = max - min;
  return {
    count,
    first,
    last,
    mean,
    range,
    drift,
    driftPct: (drift / mean) * 100,
    rangeShare: range > 0 ? Math.abs(drift) / range : 0,
  };
}

function evidenceRefFor(input: DeriveDirectionInput, agg: DirectionAggregate): MarketStateEvidenceRef {
  const source = (input.source && input.source.trim()) || "chart-runtime";
  const observedAt = input.latestTickAtMs && input.latestTickAtMs > 0
    ? Math.min(input.latestTickAtMs, input.capturedAt)
    : input.capturedAt;
  return {
    eventId: `direction:drift:${input.snapshotIdSeed}:${observedAt}`,
    observedAt,
    availableAt: input.capturedAt,
    source,
    fidelity: "DERIVED",
    basis:
      `Net drift ${agg.drift >= 0 ? "+" : ""}${agg.driftPct.toFixed(3)}% ` +
      `(${(agg.rangeShare * 100).toFixed(0)}% of observed range) across ` +
      `${agg.count} per-trade tick${agg.count === 1 ? "" : "s"}`,
  };
}

function confidenceFor(count: number, rangeShare: number): number {
  // Sample size sets the ceiling; range dominance can only reduce it. Never
  // inferred from the size of the move itself — a big move is not a more
  // certain observation, just a bigger one.
  const bySample = count >= 60 ? 0.75 : count >= 24 ? 0.55 : 0.35;
  const damp = rangeShare >= 0.8 ? 1 : 0.85;
  return Math.round(bySample * damp * 100) / 100;
}

export function deriveDirectionDimension(input: DeriveDirectionInput): MarketStateDimension {
  const agg = aggregateFor(input.ticks);
  if (!agg) return UNKNOWN_DIMENSION;

  if (agg.count < DIRECTION_RESOLVE_MIN_TRADES) {
    return {
      resolution: "PARTIAL",
      value: null,
      confidence: 0,
      evidence: [evidenceRefFor(input, agg)],
      contradictions: [],
      unknowns: [
        `Only ${agg.count} classified trade${agg.count === 1 ? "" : "s"} observed — below the ${DIRECTION_RESOLVE_MIN_TRADES}-trade seal threshold.`,
      ],
    };
  }

  const directional =
    agg.rangeShare >= DIRECTION_MIN_RANGE_SHARE &&
    Math.abs(agg.driftPct) >= DIRECTION_MIN_DRIFT_PCT;

  if (!directional) {
    return {
      resolution: "PARTIAL",
      value: null,
      confidence: 0,
      evidence: [evidenceRefFor(input, agg)],
      contradictions: [],
      unknowns: [
        `Net drift ${agg.driftPct.toFixed(3)}% covers only ${(agg.rangeShare * 100).toFixed(0)}% of the observed range — two-sided tape, no direction established.`,
      ],
    };
  }

  return {
    resolution: "RESOLVED",
    value: agg.drift > 0 ? "UP" : "DOWN",
    confidence: confidenceFor(agg.count, agg.rangeShare),
    evidence: [evidenceRefFor(input, agg)],
    contradictions: [],
    unknowns: [],
  };
}
