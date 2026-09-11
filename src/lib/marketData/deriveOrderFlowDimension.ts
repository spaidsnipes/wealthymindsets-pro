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
 *
 * ─────────────────────────────────────────────────────────────────────
 * COUNTING A GUESS MORE TIMES DOES NOT MAKE IT KNOWLEDGE (2026-09-11)
 *
 * This module is the most dangerous consumer of `selectAggressorFlow`,
 * because it does not merely PAINT the flow — it SEALS it into canonical
 * state as a decision-grade dimension that other surfaces then trust.
 *
 * It scaled `confidence` on `tradeCount` alone: 40 classified trades earned
 * `resolution: "RESOLVED"`, `value: "AGGRESSIVE BUY DOMINANT"`,
 * `confidence: 0.75`, `fidelity: "DERIVED"` and — most sharply —
 * `unknowns: []`, which is not silence but an affirmative claim that nothing
 * about this verdict is unknown.
 *
 * On a live US equity chart every one of those 40 sides came from the Alpaca
 * relay, which has no aggressor flag and reconstructs each one by comparing
 * the print to the prior price. It says so honestly on the event:
 * `aggressorMethod: "TICK_RULE"`, `aggressorConfidence: 0.5`,
 * `fidelityClass: "PROXY"`. This bridge read none of it.
 *
 * So the sealed Passport claimed MORE certainty than its own source claimed,
 * and claimed it in a field (`confidence`) whose only input was volume. That
 * is the shift's defect class in its costliest form: a consumer restating
 * what an owner publishes, minus the qualifier that made it true — except
 * here the restatement is DURABLE, because it is sealed.
 *
 * Three corrections, all sourced from the flow's own `provenance`:
 *
 *   1. `confidence` is CAPPED by method. More prints narrow the sampling
 *      error of a heuristic; they do not turn the heuristic into an
 *      observation. A tick-rule tape cannot outrank the per-print confidence
 *      its own producer stamps on it.
 *   2. `fidelity` is `INFERRED`, not `DERIVED`, when the sides were
 *      reconstructed. `MarketFidelityClass` has published that distinction
 *      all along; this module hard-coded `DERIVED` past it.
 *   3. `unknowns` carries the disclosure even when RESOLVED. An empty
 *      `unknowns` on an inferred verdict is the lie; the verdict itself is
 *      still useful and still ships.
 *
 * The verdict STRING is deliberately unchanged. Direction is what the tape
 * says; provenance is how well it says it. Weakening "AGGRESSIVE BUY
 * DOMINANT" into a hedge would hide a real observation, which is the
 * opposite error and equally forbidden.
 */

import {
  selectAggressorFlow,
  type AggressorProvenance,
  type AggressorTick,
} from "./selectAggressorFlow";
import type { MarketStateDimension, MarketStateEvidenceRef } from "./canonicalMarketState";
import type { MarketFidelityClass } from "./marketEvent";

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
 * The most confidence a flow may earn, given HOW its sides were established.
 *
 * `PROVIDER` is uncapped (1) — the venue asserted the side, so only trade
 * count limits us, exactly as before.
 *
 * `INFERRED` is capped at 0.5. That ceiling is not arbitrary and it is not a
 * copy of a constant: the producers of inferred sides stamp `0.5` on each
 * individual print because a tick rule is right about half the time it is
 * tested against a real flag. An AGGREGATE of such prints may be more stable
 * than any one of them, but it cannot be more TRUSTWORTHY than the method
 * that produced every input — there is no independent observation anywhere in
 * the chain to raise it.
 *
 * `MIXED` shares the `INFERRED` ceiling, weakest-link: a blend of one venue
 * print and thirty-nine guesses is not "mostly observed".
 *
 * `UNDISCLOSED` is capped hardest. A tape that will not say how it knows has
 * given us no basis to rank it above an admitted heuristic.
 */
const CONFIDENCE_CEILING: Record<AggressorProvenance, number> = {
  PROVIDER: 1,
  INFERRED: 0.5,
  MIXED: 0.5,
  UNDISCLOSED: 0.35,
};

/**
 * Confidence — bounded by observed trade count, then capped by method.
 *   ≥40 trades → 0.75, ≥15 → 0.55, ≥5 → 0.35, else 0.
 *
 * The count ladder is unchanged; the cap is the new floor-of-honesty applied
 * over it. A PROVIDER tape is numerically identical to what this function
 * returned before, so the fix costs nothing where nothing was wrong.
 */
function confidenceFor(tradeCount: number, provenance: AggressorProvenance): number {
  const byCount =
    tradeCount >= 40 ? 0.75
    : tradeCount >= 15 ? 0.55
    : tradeCount >= ORDER_FLOW_RESOLVE_MIN_TRADES ? 0.35
    : 0;
  return Math.min(byCount, CONFIDENCE_CEILING[provenance]);
}

/**
 * `DERIVED` means "computed from observed facts". A tick-rule side is not an
 * observed fact, and `MarketFidelityClass` already publishes the word for what
 * it is. Stamping `DERIVED` on a reconstruction was the qualifier going
 * missing at the seam.
 */
function fidelityFor(provenance: AggressorProvenance): MarketFidelityClass {
  return provenance === "PROVIDER" ? "DERIVED" : "INFERRED";
}

/**
 * The disclosure this dimension owes even when it RESOLVES.
 *
 * Returned as an `unknowns` entry rather than folded into `value`, because the
 * DIRECTION is genuinely known — buyers really did lift more than sellers on
 * the prints we saw. What is unknown is how the sides were attributed. Those
 * are different facts and the Passport has separate homes for them.
 */
function provenanceUnknowns(provenance: AggressorProvenance): string[] {
  switch (provenance) {
    case "PROVIDER":
      return [];
    case "INFERRED":
      return [
        "No venue supplied an aggressor flag — every side was reconstructed by " +
        "tick rule, so this verdict is directional, not ground truth.",
      ];
    case "MIXED":
      return [
        "Some sides were venue-asserted and some were reconstructed by tick rule — " +
        "this verdict is only as strong as its weakest print.",
      ];
    case "UNDISCLOSED":
    default:
      return ["The tape did not state how these aggressor sides were established."];
  }
}

/**
 * Compile the sealed evidence ref. Aggregated derivation: a single ref that
 * summarises the aggregation, because embedding hundreds of per-trade refs
 * would balloon every snapshot. The basis carries the honest count so the
 * lineage is still auditable.
 */
function evidenceRefFor(
  input: DeriveOrderFlowInput,
  tradeCount: number,
  provenance: AggressorProvenance,
): MarketStateEvidenceRef {
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
    fidelity: fidelityFor(provenance),
    // The basis is the audit trail. "classified by aggressor side" answered
    // WHAT was counted and left HOW to the reader's assumption — and the
    // assumption a reader makes about a sealed canonical dimension is
    // "the venue told us". Name the method so the lineage cannot be misread.
    basis:
      `${tradeCount} per-trade tick${tradeCount === 1 ? "" : "s"} classified by ` +
      `aggressor side (method: ${provenance})`,
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
      confidence: confidenceFor(tradeCount, snap.provenance),
      evidence: [evidenceRefFor(input, tradeCount, snap.provenance)],
      contradictions: [],
      unknowns: [
        `Only ${tradeCount} classified trade${tradeCount === 1 ? "" : "s"} observed — below the ${ORDER_FLOW_RESOLVE_MIN_TRADES}-trade seal threshold.`,
        ...provenanceUnknowns(snap.provenance),
      ],
    };
  }

  return {
    resolution: "RESOLVED",
    value: verdictFor(snap),
    confidence: confidenceFor(tradeCount, snap.provenance),
    evidence: [evidenceRefFor(input, tradeCount, snap.provenance)],
    contradictions: [],
    // NOT `[]`. An empty `unknowns` is an affirmative claim that nothing about
    // this verdict is unknown — false for a tick-rule reconstruction.
    unknowns: provenanceUnknowns(snap.provenance),
  };
}
