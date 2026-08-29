/**
 * truthStatusLabels — canon §TRUTH STATUS LABELS + §EVIDENCE BEFORE
 * CONFIDENCE (ATHOS Master Manual v2.0 — 2026-07-28).
 *
 * Canon verbatim:
 *   "ATHOS uses the following truth-status system:
 *    - VERIFIED — supported by direct evidence, a trusted source, a
 *      tool result, a test, or an authoritative record.
 *    - CORROBORATED — supported by multiple independent sources.
 *    - PROVISIONAL — currently supported but subject to meaningful
 *      revision.
 *    - ESTIMATED — a reasoned range based on known information.
 *    - INFERRED — a conclusion drawn from verified facts but not
 *      directly observed.
 *    - ASSUMED — temporarily accepted for planning and awaiting
 *      verification.
 *    - DISPUTED — credible evidence or interpretations conflict.
 *    - UNVERIFIED — claimed but not yet supported by sufficient
 *      evidence.
 *    - UNKNOWN — insufficient information exists.
 *    - FALSE OR CONTRADICTED — reliable evidence directly refutes
 *      the claim.
 *    - SUPERSEDED — previously accepted but replaced by newer
 *      approved truth."
 *
 * Canon §MASTER TRUTH COVENANT:
 *   "ATHOS will not protect its image at the expense of the truth.
 *    ATHOS will not protect a plan at the expense of the evidence.
 *    ATHOS will not protect a leader's ego at the expense of the
 *    organization. ATHOS will not protect speed at the expense of
 *    safety or integrity. ATHOS will not protect previous
 *    conclusions when stronger evidence requires correction."
 *
 * Canon §EVIDENCE BEFORE CONFIDENCE:
 *   "Claims supported only by rumor, speculation, incomplete memory,
 *    marketing language, or unverified assertions must be labeled
 *    accordingly. Confidence must rise and fall with the quality,
 *    relevance, freshness, independence, and completeness of the
 *    evidence."
 *
 * This module is the single source of truth for how WM Pro tags a
 * claim's evidentiary strength. Companion to canonicalFidelityLabels
 * (§Living Market Visual Systems — market-data fidelity) and
 * failureStateGrammar (§Failure + Recovery Grammar — subsystem
 * health). Different concern, same canon-locked pattern.
 *
 * Every module that produces a claim the trader will act on should
 * emit a TruthStatusReport carrying the canon label + evidence
 * summary. UI surfaces map the label to visual encoding without
 * inventing new categories.
 */

/**
 * The eleven canon-approved labels, in canonical order from strongest
 * evidence to weakest, with the two exit-categories (FALSE_OR_CONTRADICTED
 * and SUPERSEDED) at the tail.
 *
 * The key `FALSE_OR_CONTRADICTED` collapses the canon phrase "FALSE OR
 * CONTRADICTED" into a single TypeScript-safe identifier; the display
 * string preserves the canon spelling.
 */
export const CANONICAL_TRUTH_STATUS = {
  VERIFIED: "VERIFIED",
  CORROBORATED: "CORROBORATED",
  PROVISIONAL: "PROVISIONAL",
  ESTIMATED: "ESTIMATED",
  INFERRED: "INFERRED",
  ASSUMED: "ASSUMED",
  DISPUTED: "DISPUTED",
  UNVERIFIED: "UNVERIFIED",
  UNKNOWN: "UNKNOWN",
  FALSE_OR_CONTRADICTED: "FALSE OR CONTRADICTED",
  SUPERSEDED: "SUPERSEDED",
} as const;

export type TruthStatusKey = keyof typeof CANONICAL_TRUTH_STATUS;
export type TruthStatusLabel =
  (typeof CANONICAL_TRUTH_STATUS)[TruthStatusKey];

/** Exhaustive tuple — for iteration + Sentinel enforcement. */
export const ALL_TRUTH_STATUS_KEYS: readonly TruthStatusKey[] = Object.freeze([
  "VERIFIED",
  "CORROBORATED",
  "PROVISIONAL",
  "ESTIMATED",
  "INFERRED",
  "ASSUMED",
  "DISPUTED",
  "UNVERIFIED",
  "UNKNOWN",
  "FALSE_OR_CONTRADICTED",
  "SUPERSEDED",
]);

export const ALL_TRUTH_STATUS_LABELS: readonly TruthStatusLabel[] = Object.freeze(
  ALL_TRUTH_STATUS_KEYS.map((k) => CANONICAL_TRUTH_STATUS[k]),
);

/**
 * Rank the eleven labels on an ordinal 0..10 evidence strength axis:
 * 10 = VERIFIED, ↓, 0 = SUPERSEDED / FALSE. UI can use this for
 * visual weighting (e.g., quieter presentation for lower ranks per
 * canon §"The screen gets quieter when confidence is lower").
 */
export const TRUTH_STATUS_RANK: Record<TruthStatusKey, number> = Object.freeze({
  VERIFIED: 10,
  CORROBORATED: 9,
  PROVISIONAL: 7,
  ESTIMATED: 6,
  INFERRED: 6,
  ASSUMED: 4,
  DISPUTED: 3,
  UNVERIFIED: 2,
  UNKNOWN: 1,
  FALSE_OR_CONTRADICTED: 0,
  SUPERSEDED: 0,
});

/** Predicate — is this a canon-approved label? */
export function isCanonicalTruthStatusLabel(s: string): s is TruthStatusLabel {
  return (ALL_TRUTH_STATUS_LABELS as readonly string[]).includes(s);
}

/**
 * A TruthStatusReport is the canonical envelope every module emits
 * when tagging a claim. Canon §EVIDENCE BEFORE CONFIDENCE + §SIMPLICITY
 * STANDARD's six questions:
 *
 *   1. What is happening?        → `claim`
 *   2. Why is it happening?      → `reason`
 *   3. Why does it matter?       → `matters`
 *   4. What should happen next?  → `nextAction`
 *   5. Who owns the next action? → `owner`
 *   6. What evidence proves it?  → `evidence`
 *
 * The narrative fields are optional (a bare VERIFIED report is
 * permitted — canon: strong evidence needs no defence). Anything
 * weaker than PROVISIONAL SHOULD populate the narrative to satisfy
 * §Master Truth Covenant ("stronger evidence requires correction"
 * only if the current claim is trustworthy in the first place).
 */
export interface TruthStatusReport {
  readonly status: TruthStatusKey;
  readonly claim?: string;
  readonly reason?: string;
  readonly matters?: string;
  readonly nextAction?: string;
  readonly owner?: string;
  readonly evidence?: readonly string[];
  /**
   * ISO timestamp — when the report was authored. Canon §EVIDENCE
   * BEFORE CONFIDENCE: "Confidence must rise and fall with the
   * quality, relevance, FRESHNESS, independence, and completeness."
   */
  readonly asOfIso?: string;
}

export function verified(claim?: string, evidence?: readonly string[]): TruthStatusReport {
  return { status: "VERIFIED", claim, evidence };
}

export function unknown(reason?: string): TruthStatusReport {
  return { status: "UNKNOWN", reason };
}

/**
 * Assert-a-report guard for callers wanting to prove they only ever
 * emit a canon-shaped report. Throws when:
 *   - status is not one of the eleven canon keys
 *   - any report weaker than PROVISIONAL is missing `reason` or
 *     `nextAction` (canon: unverified claims must be labeled AND
 *     the human must know what happens next).
 */
export function assertTruthStatusReport(r: TruthStatusReport): void {
  if (!(r.status in CANONICAL_TRUTH_STATUS)) {
    throw new Error(`TruthStatusReport.status is not canonical: ${String(r.status)}`);
  }
  const rank = TRUTH_STATUS_RANK[r.status];
  // Below PROVISIONAL (rank 7) requires narrative — trader must know
  // WHY this claim is weak AND what to do about it.
  if (rank < 7) {
    if (!r.reason || r.reason.length === 0) {
      throw new Error(
        `TruthStatusReport(${r.status}) requires \`reason\` — canon §Evidence Before Confidence`,
      );
    }
    // For DISPUTED / UNVERIFIED / UNKNOWN / FALSE / SUPERSEDED, the
    // trader also needs the next honest action.
    if (rank <= 3 && (!r.nextAction || r.nextAction.length === 0)) {
      throw new Error(
        `TruthStatusReport(${r.status}) requires \`nextAction\` — canon §Master Truth Covenant`,
      );
    }
  }
}
