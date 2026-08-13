/**
 * selectAvailableR — M29 pure selector.
 *
 * Answers: "WHAT CLEAN REWARD EXISTS RELATIVE TO STRUCTURAL RISK?"
 *
 * Founder doctrine (2026-08-13):
 *   Inputs: thesis, structural invalidation, stop, destination,
 *           liquidity, spread, slippage, cost.
 *   Never shrink stop to manufacture prettier R.
 *   If clean reward cannot be determined: UNKNOWN.
 *
 * The stop is an INPUT, never an output. This selector will refuse to
 * emit a number when the structural invalidation is unknown — it will
 * not "solve for" a stop that makes R look acceptable.
 */

import type { CanonicalMarketState } from "../../marketData/canonicalMarketState";

export type AvailableRResolution = "RESOLVED" | "PARTIAL" | "UNKNOWN";

export interface DestinationRegion {
  /** Region low/high — a REGION, never a magic single target price. */
  readonly low: number;
  readonly high: number;
  readonly basis: string;              // "HVN above value" | "prior swing high" | ...
  readonly confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface CostAssumptions {
  /** Half-spread in price units, per side. */
  readonly halfSpread: number | null;
  /** Expected slippage in price units, per side. */
  readonly slippagePerSide: number | null;
  /** Commission + fees in price units, round trip, per unit. */
  readonly feesPerUnit: number | null;
}

export interface AvailableRInput {
  readonly side: "LONG" | "SHORT";
  readonly entryPrice: number | null;
  /** STRUCTURAL invalidation level. NEVER derived from a desired R. */
  readonly structuralStop: number | null;
  readonly destination: DestinationRegion | null;
  readonly costs?: CostAssumptions;
  readonly state?: CanonicalMarketState | null;
}

export interface AvailableRVM {
  readonly resolution: AvailableRResolution;
  /** Conservative R using the NEAR edge of the destination region. */
  readonly conservativeR: number | "UNKNOWN";
  /** Optimistic R using the FAR edge of the destination region. */
  readonly optimisticR: number | "UNKNOWN";
  /** Risk in price units (entry → structural stop), always positive. */
  readonly riskPerUnit: number | "UNKNOWN";
  /** Net of costs. */
  readonly costDragR: number | "UNKNOWN";
  readonly destination: DestinationRegion | null;
  readonly missingInputs: readonly string[];
  readonly reason?: string;
  /** Warnings that don't block computation but matter (thin liquidity etc). */
  readonly warnings: readonly string[];
}

const UNKNOWN_VM = (missing: readonly string[], reason: string): AvailableRVM => ({
  resolution: "UNKNOWN",
  conservativeR: "UNKNOWN",
  optimisticR: "UNKNOWN",
  riskPerUnit: "UNKNOWN",
  costDragR: "UNKNOWN",
  destination: null,
  missingInputs: missing,
  reason,
  warnings: [],
});

export function selectAvailableR(input: AvailableRInput): AvailableRVM {
  const missing: string[] = [];
  if (input.entryPrice == null || !Number.isFinite(input.entryPrice)) missing.push("entryPrice");
  if (input.structuralStop == null || !Number.isFinite(input.structuralStop)) missing.push("structuralStop");
  if (!input.destination) missing.push("destination");

  if (missing.length > 0) {
    return UNKNOWN_VM(
      missing,
      `Cannot compute Available R without: ${missing.join(", ")}. Stop is an INPUT — this selector will not solve for a stop that produces an attractive R.`,
    );
  }

  const entry = input.entryPrice!;
  const stop = input.structuralStop!;
  const dest = input.destination!;
  const isLong = input.side === "LONG";

  // Risk per unit — always the real distance to the structural stop
  const riskPerUnit = Math.abs(entry - stop);
  if (riskPerUnit <= 0) {
    return UNKNOWN_VM(
      ["structuralStop"],
      "Structural stop equals entry — no measurable risk distance. Re-derive the invalidation level.",
    );
  }

  // Stop must be on the correct side of entry
  const stopOnCorrectSide = isLong ? stop < entry : stop > entry;
  if (!stopOnCorrectSide) {
    return UNKNOWN_VM(
      ["structuralStop"],
      `Structural stop ${stop} is on the wrong side of entry ${entry} for a ${input.side}. Check the invalidation logic.`,
    );
  }

  // Destination must be in the direction of the trade
  const nearEdge = isLong ? dest.low : dest.high;
  const farEdge = isLong ? dest.high : dest.low;
  const destInDirection = isLong ? nearEdge > entry : nearEdge < entry;
  const warnings: string[] = [];

  if (!destInDirection) {
    return UNKNOWN_VM(
      ["destination"],
      `Destination region [${dest.low}, ${dest.high}] is not ahead of entry ${entry} for a ${input.side}. No clean reward space.`,
    );
  }

  // Cost drag
  const c = input.costs;
  const halfSpread = c?.halfSpread ?? null;
  const slip = c?.slippagePerSide ?? null;
  const fees = c?.feesPerUnit ?? null;
  const costsKnown = halfSpread != null && slip != null && fees != null;
  const totalCostPerUnit = costsKnown ? (halfSpread! + slip!) * 2 + fees! : null;

  if (!costsKnown) {
    warnings.push("Cost assumptions incomplete — R shown is GROSS of spread/slippage/fees");
  }

  const grossConservative = Math.abs(nearEdge - entry);
  const grossOptimistic = Math.abs(farEdge - entry);
  const netConservative = totalCostPerUnit != null ? grossConservative - totalCostPerUnit : grossConservative;
  const netOptimistic = totalCostPerUnit != null ? grossOptimistic - totalCostPerUnit : grossOptimistic;

  const conservativeR = netConservative / riskPerUnit;
  const optimisticR = netOptimistic / riskPerUnit;
  const costDragR = totalCostPerUnit != null ? totalCostPerUnit / riskPerUnit : "UNKNOWN";

  if (conservativeR <= 0) {
    warnings.push("Conservative R is non-positive after costs — near edge of destination does not clear the cost floor");
  }
  if (dest.confidence === "LOW") {
    warnings.push("Destination confidence LOW — treat R range as indicative only");
  }
  if (input.state && input.state.qualityState !== "LIVE") {
    warnings.push(`Market data quality is ${input.state.qualityState} — R inputs may be stale`);
  }

  const resolution: AvailableRResolution =
    costsKnown && dest.confidence === "HIGH" ? "RESOLVED" : "PARTIAL";

  return {
    resolution,
    conservativeR: Number(conservativeR.toFixed(3)),
    optimisticR: Number(optimisticR.toFixed(3)),
    riskPerUnit: Number(riskPerUnit.toFixed(4)),
    costDragR: typeof costDragR === "number" ? Number(costDragR.toFixed(3)) : "UNKNOWN",
    destination: dest,
    missingInputs: [],
    reason: resolution === "PARTIAL"
      ? `Partial: ${!costsKnown ? "cost assumptions incomplete" : ""}${!costsKnown && dest.confidence !== "HIGH" ? "; " : ""}${dest.confidence !== "HIGH" ? `destination confidence ${dest.confidence}` : ""}`
      : undefined,
    warnings,
  };
}
