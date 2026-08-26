/**
 * selectAnalysisMaturity — canon §6 ANALYSIS MATURITY
 * (Top-Down Process amendment 2026-08-25 §6).
 *
 * Canon verbatim:
 *   "Do not reduce an analysis to RIGHT or WRONG. Preserve:
 *    WRONG      — thesis structurally invalidated.
 *    EARLY      — destination thesis remains alive but timing/
 *                 participation/permission absent.
 *    ACTIVE     — progression evidence now supports the declared
 *                 model.
 *    FULFILLED  — destination reached."
 *
 * Deterministic 4-state maturity classifier from post-hoc journal
 * evidence. This is the review-time answer for a declared plan:
 * did the thesis get INVALIDATED (WRONG), stay alive but never
 * ripen (EARLY), progress toward its destination (ACTIVE), or
 * arrive (FULFILLED)?
 *
 * Inputs (all optional; verdict scales with what's known):
 *   - structuralInvalidationHit  — did price violate the thesis stop?
 *   - destinationReached         — did price tag the declared destination?
 *   - progressionEvidenceCount   — how many pieces of progression
 *                                   evidence recorded during session
 *   - progressionEvidenceThreshold — canon-defined threshold above
 *                                     which progression is ACTIVE (default 2)
 *
 * Priority (canon-ordered):
 *   1. destinationReached=true       → FULFILLED
 *   2. structuralInvalidationHit=true → WRONG
 *   3. progressionEvidenceCount >= threshold → ACTIVE
 *   4. else                          → EARLY
 *
 * INSUFFICIENT_INPUT when nothing is provided at all.
 */

export interface AnalysisMaturityInput {
  structuralInvalidationHit?: boolean;
  destinationReached?: boolean;
  progressionEvidenceCount?: number;
  progressionEvidenceThreshold?: number;
}

export type AnalysisMaturityVerdict =
  | "INSUFFICIENT_INPUT"
  | "FULFILLED"
  | "WRONG"
  | "ACTIVE"
  | "EARLY";

export interface AnalysisMaturityResult {
  verdict: AnalysisMaturityVerdict;
  canon: string;
  progression_evidence_count: number | undefined;
  threshold: number;
}

const DEFAULT_PROGRESSION_THRESHOLD = 2;

export function selectAnalysisMaturity(
  input: AnalysisMaturityInput,
): AnalysisMaturityResult {
  const threshold =
    typeof input.progressionEvidenceThreshold === "number" &&
    Number.isFinite(input.progressionEvidenceThreshold) &&
    input.progressionEvidenceThreshold > 0
      ? input.progressionEvidenceThreshold
      : DEFAULT_PROGRESSION_THRESHOLD;

  const anySignal =
    input.structuralInvalidationHit !== undefined ||
    input.destinationReached !== undefined ||
    input.progressionEvidenceCount !== undefined;

  if (!anySignal) {
    return {
      verdict: "INSUFFICIENT_INPUT",
      canon: "§6 ANALYSIS MATURITY — no evidence provided",
      progression_evidence_count: undefined,
      threshold,
    };
  }

  if (input.destinationReached === true) {
    return {
      verdict: "FULFILLED",
      canon: "§6 FULFILLED — destination reached",
      progression_evidence_count: input.progressionEvidenceCount,
      threshold,
    };
  }

  if (input.structuralInvalidationHit === true) {
    return {
      verdict: "WRONG",
      canon: "§6 WRONG — thesis structurally invalidated",
      progression_evidence_count: input.progressionEvidenceCount,
      threshold,
    };
  }

  const count =
    typeof input.progressionEvidenceCount === "number" &&
    Number.isFinite(input.progressionEvidenceCount)
      ? input.progressionEvidenceCount
      : 0;

  if (count >= threshold) {
    return {
      verdict: "ACTIVE",
      canon: "§6 ACTIVE — progression evidence supports declared model",
      progression_evidence_count: count,
      threshold,
    };
  }

  return {
    verdict: "EARLY",
    canon: "§6 EARLY — destination alive but timing/permission absent",
    progression_evidence_count: count,
    threshold,
  };
}
