/**
 * selectMentalGate — canon §17 MENTAL GATE (Top-Down Process 2026-08-24).
 *
 * Canon verbatim:
 *   "Before ACTION ask:
 *    - Am I calm and clear enough to follow the plan?
 *    - Would I take this same setup if I were already financially ahead today?
 *    - Would I still skip it if CLC failed?
 *    - Is this evidence or need?
 *    If money pressure changes the answer: WAIT."
 *
 * Deterministic gate that turns four boolean self-checks into a
 * canon-defined output: PASS (all four answers align with discipline)
 * or WAIT (one or more answers reveal money-pressure decision-making).
 *
 * The trader must answer honestly; the selector cannot detect a lie.
 * Its job is to make the four checks mechanical and refuse to authorize
 * ACTION when any single check fails.
 *
 * This is a PRE-TRADE selector — it's meant to be called from the
 * Log-New-Trade modal before a trade is submitted, not post-hoc.
 */

export interface MentalGateInput {
  /** "Am I calm and clear enough to follow the plan?" */
  calmAndClear?: boolean;
  /** "Would I take this same setup if I were already financially ahead today?" */
  takenIfAlreadyAhead?: boolean;
  /** "Would I still skip it if CLC failed?" (i.e. rules discipline is intact) */
  skippedIfClcFailed?: boolean;
  /** "Is this evidence or need?" — TRUE = evidence, FALSE = need. */
  drivenByEvidenceNotNeed?: boolean;
}

export type MentalGateVerdict = "PASS" | "WAIT" | "INSUFFICIENT_INPUT";

export interface MentalGateResult {
  verdict: MentalGateVerdict;
  /** Which specific checks failed (empty when PASS). */
  failed: readonly (keyof MentalGateInput)[];
  /** Which specific checks are unanswered (empty when fully-input). */
  unanswered: readonly (keyof MentalGateInput)[];
  /** Human-readable one-liner the UI can surface. */
  reason: string | undefined;
}

const CHECKS: readonly (keyof MentalGateInput)[] = [
  "calmAndClear",
  "takenIfAlreadyAhead",
  "skippedIfClcFailed",
  "drivenByEvidenceNotNeed",
];

const REASON_ON_FAIL: Record<keyof MentalGateInput, string> = {
  calmAndClear:
    "Emotional state is not calm enough to follow the plan.",
  takenIfAlreadyAhead:
    "You would not take this if you were already ahead — canon: needing the trade to work.",
  skippedIfClcFailed:
    "You would not skip if CLC failed — canon: rules discipline is bent.",
  drivenByEvidenceNotNeed:
    "This is need, not evidence — canon: money pressure is driving the decision.",
};

export function selectMentalGate(input: MentalGateInput): MentalGateResult {
  const unanswered = CHECKS.filter((k) => input[k] === undefined);
  if (unanswered.length === CHECKS.length) {
    return {
      verdict: "INSUFFICIENT_INPUT",
      failed: [],
      unanswered,
      reason: "None of the four gates have been answered.",
    };
  }
  const failed = CHECKS.filter((k) => input[k] === false);
  if (unanswered.length > 0 && failed.length === 0) {
    // Some blank + none actively failed → still not authorized.
    return {
      verdict: "INSUFFICIENT_INPUT",
      failed: [],
      unanswered,
      reason: `${unanswered.length} of 4 gates unanswered.`,
    };
  }
  if (failed.length > 0) {
    return {
      verdict: "WAIT",
      failed,
      unanswered,
      // Prefer the first failed check's reason for the headline.
      reason: REASON_ON_FAIL[failed[0]!],
    };
  }
  // All four answered TRUE.
  return {
    verdict: "PASS",
    failed: [],
    unanswered: [],
    reason: "All four Mental Gate checks pass — ACTION authorized on discipline.",
  };
}
