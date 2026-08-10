export interface ClcEvidence {
  context: boolean;
  location: boolean;
  confirmation: boolean;
}

export type ClcDecision =
  | { status: "READY_FOR_RISK_REVIEW"; label: "EVIDENCE COMPLETE"; missing: readonly [] }
  | { status: "INSUFFICIENT_EVIDENCE"; label: "INSUFFICIENT EVIDENCE"; missing: readonly (keyof ClcEvidence)[] };

/** CLC may advance only when all three independent evidence legs resolve. */
export function evaluateClcEvidence(evidence: ClcEvidence): ClcDecision {
  const missing = (Object.entries(evidence) as [keyof ClcEvidence, boolean][])
    .filter(([, available]) => !available)
    .map(([key]) => key);
  return missing.length === 0
    ? { status: "READY_FOR_RISK_REVIEW", label: "EVIDENCE COMPLETE", missing: [] }
    : { status: "INSUFFICIENT_EVIDENCE", label: "INSUFFICIENT EVIDENCE", missing };
}
