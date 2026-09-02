/**
 * deriveOrderFlowDimension — bridge selectAggressorFlow → CanonicalMarketState
 * orderFlow dimension.
 *
 * FOUNDER-CANON P6 MARKET OBJECT PASSPORT: every material pixel has a real
 * owner. Real from-USE defect (2026-09-02): the OrderFlowCockpitStrip on
 * /charts renders live aggressor volumes (AGGRESSIVE BUY, AGGRESSIVE SELL,
 * IMB, VWAP) from selectAggressorFlow, but the Market Object Passport ORDER
 * FLOW dimension still shows "UNRESOLVED — No verified evidence supplied at
 * snapshot time." because no producer had wired selectAggressorFlow into the
 * canonical state.
 *
 * This pure derivation seals a real orderFlow MarketStateDimension from the
 * same per-trade ticks the strip already consumes, so the Passport reflects
 * the truth the trader can see one row above.
 *
 * PURE — no I/O, no clock. Never fabricates evidence: with too few real
 * trades, returns an honest UNKNOWN dimension.
 */

import {
  selectAggressorFlow,
  type AggressorTick,
} from "./selectAggressorFlow";
import type { MarketStateDimension, MarketStateEvidenceRef } from "./canonicalMarketState";

const UNKNOWN_DIMENSION: MarketStateDimension = {
  resolution: "UNKNOWN",
  value: null,
  confidence: null,
  evidence: [],
  contradictions: [],
  unknowns: ["No verified aggressor evidence supplied at snapshot time."],
};

/**
 * Minimum trade count before we call orderFlow "resolved". Below this the
 * aggregate is too noisy to seal as a canonical decision-grade dimension —
 * we still surface UNKNOWN honestly rather than a low-conviction claim.
 * Deliberately conservative — canon §Silence Is A Feature.
 */
export const ORDER_FLOW_RESOLVE_MIN_TRADES = 5;

export interface DeriveOrderFlowInput {
  readonly ticks: readonly AggressorTick[];
  readonly livePrice: number;
  /** Provider tag for the evidence ref (e.g. "coinbase", "webull", "alpaca"). */
  readonly source: string | null | undefined;
  /** Timestamp of the most recent tick in `ticks`, in ms. */
  readonly latestTickAtMs: number | null;
  /** Snapshot cutoff — evidence.availableAt must be ≤ this. */
  readonly capturedAt: number;
  /** Stable id used in the evidence eventId (typically the snapshot id). */
  readonly snapshotIdSeed: string;
}

/**
 * Map an AggressorFlowSnapshot to a human-readable canonical value string.
 * Kept trivial so the Passport's `value` line reads as one honest fact.
 */
function verdictFor(snap: ReturnType<typeof selectAggressorFlow>): string {
  if (!snap.hasFlow) return "NO AGGRESSOR VOLUME";
  // imbRatio is dominant/weaker × 100. Below 130% (i.e. 1.3:1) we call it
  // balanced — canon prefers explicit noise-honest labels over false lean.
  if (snap.imbRatio < 130) return "BALANCED AGGRESSOR FLOW";
  return snap.askDom ? "AGGRESSIVE BUY DOMINANT" : "AGGRESSIVE SELL DOMINANT";
}

/**
 * Confidence — bounded by observed trade count. Never claims high certainty
 * from a thin tape.
 *   ≥40 trades → 0.75, ≥15 → 0.55, ≥5 → 0.35, else 0.
 */
function confidenceFor(tradeCount: number): number {
  if (tradeCount >= 40) return 0.75;
  if (tradeCount >= 15) return 0.55;
  if (tradeCount >= ORDER_FLOW_RESOLVE_MIN_TRADES) return 0.35;
  return 0;
}

/**
 * Compile the sealed evidence ref. Aggregated derivation: a single ref that
 * summarises the aggregation, because embedding hundreds of per-trade refs
 * would balloon every snapshot. The basis carries the honest count so the
 * lineage is still auditable.
 */
function evidenceRefFor(input: DeriveOrderFlowInput, tradeCount: number): MarketStateEvidenceRef {
  const source = (input.source && input.source.trim()) || "chart-runtime";
  const observedAt = input.latestTickAtMs && input.latestTickAtMs > 0
    ? Math.min(input.latestTickAtMs, input.capturedAt)
    : input.capturedAt;
  const availableAt = input.capturedAt;
  return {
    eventId: `orderFlow:aggressor:${input.snapshotIdSeed}:${observedAt}`,
    observedAt,
    availableAt,
    source,
    fidelity: "DERIVED",
    basis: `${tradeCount} per-trade tick${tradeCount === 1 ? "" : "s"} classified by aggressor side`,
  };
}

/**
 * Compile a canonical orderFlow dimension from real per-trade ticks. Returns
 * UNKNOWN honestly when there is not enough evidence to seal a decision-grade
 * verdict. NEVER fabricates a resolution.
 */
export function deriveOrderFlowDimension(input: DeriveOrderFlowInput): MarketStateDimension {
  const snap = selectAggressorFlow(input.ticks, input.livePrice);
  if (!snap.hasFlow) return UNKNOWN_DIMENSION;

  // Count real trades that actually contributed to the aggregate — matches
  // selectAggressorFlow's own filter (trade === true, size>0, price>0).
  let tradeCount = 0;
  for (const t of input.ticks) {
    if (!t || t.trade !== true) continue;
    const size = Number(t.size) || 0;
    const price = Number(t.price) || 0;
    if (size > 0 && price > 0) tradeCount += 1;
  }

  if (tradeCount < ORDER_FLOW_RESOLVE_MIN_TRADES) {
    return {
      resolution: "PARTIAL",
      value: null,
      confidence: confidenceFor(tradeCount),
      evidence: [evidenceRefFor(input, tradeCount)],
      contradictions: [],
      unknowns: [
        `Only ${tradeCount} classified trade${tradeCount === 1 ? "" : "s"} observed — below the ${ORDER_FLOW_RESOLVE_MIN_TRADES}-trade seal threshold.`,
      ],
    };
  }

  return {
    resolution: "RESOLVED",
    value: verdictFor(snap),
    confidence: confidenceFor(tradeCount),
    evidence: [evidenceRefFor(input, tradeCount)],
    contradictions: [],
    unknowns: [],
  };
}
