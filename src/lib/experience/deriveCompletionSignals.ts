/**
 * deriveCompletionSignals — pure adapter: Command Deck decision state →
 * {@link CompletionSignals}.
 *
 * Canon: "ATH/WOW Cognitive Sovereignty Helicopter Audit" (2026-08-29),
 * §Completion Intelligence + §Exit Ramp. The /command-deck surface owns a lot
 * of concrete decision state (open positions, unreviewed closes, a sealed
 * receipt, a resolved-object passport, the current job mode). This adapter maps
 * that observable state into the nine CompletionSignals the engine consumes, so
 * the mapping is a TESTABLE pure function instead of untested logic buried in a
 * React useMemo.
 *
 * Truth guardrails (mirror the engine's doctrine):
 *  - `hasOpenPosition` is a live ENTER_* with no outcome — live risk.
 *  - `hasUnreviewedClose` is a closed decision (outcome) with no review — work
 *    owed.
 *  - `jobComplete` is granted ONLY when a receipt is sealed AND nothing is
 *    pending — a sealed receipt can never manufacture completion while a
 *    position is still open or a close is unreviewed.
 *  - `statePreserved` is true when there is durable state to re-enter (records
 *    or resolved objects); without it the engine cannot call a clean checkpoint.
 *  - A return condition is surfaced only for the honest WAIT job (a thesis
 *    waiting for the market to grant permission), never fabricated otherwise.
 *
 * PURE — no React, no I/O, no clock. Deterministic and total.
 */

import type { ExperienceMode } from "./decisionContextBus";
import type { CompletionSignals } from "./selectCompletionState";

export const DERIVE_COMPLETION_SIGNALS_VERSION = "wm.derive-completion-signals.v1" as const;

/** The minimal shape of a decision record this adapter reads. */
export interface DeckDecisionRecord {
  readonly plan: { readonly action: string };
  /** Present once the decision has closed. */
  readonly outcome?: unknown;
  /** Present once the closed decision has been reviewed. */
  readonly review?: unknown;
}

/** The Command Deck state this adapter reads (a narrow, defensible slice). */
export interface DeckCompletionInput {
  /** The human's current job mode. */
  readonly mode: ExperienceMode;
  /** All decision records for the current context. */
  readonly decisionRecords: readonly DeckDecisionRecord[];
  /** Count of durably-resolved market objects (passport). */
  readonly resolvedObjectCount: number;
  /** True when the decision receipt is empty (nothing sealed). */
  readonly receiptEmpty: boolean;
  /** The One Story decision verdict (e.g. "WAIT"), for honest return phrasing. */
  readonly decision: string | null;
}

/** The label surfaced as the return trigger for an honest WAIT job. */
export const WAIT_RETURN_CONDITION =
  "the market grants permission (your thesis triggers)" as const;

function isOpenEntry(action: string): boolean {
  return action === "ENTER_LONG" || action === "ENTER_SHORT";
}

/**
 * Map deck state to the engine's CompletionSignals. Deterministic and total;
 * never fabricates completion or a return trigger.
 */
export function deriveCompletionSignals(input: DeckCompletionInput): CompletionSignals {
  const hasOpenPosition = input.decisionRecords.some(
    (r) => isOpenEntry(r.plan.action) && !r.outcome,
  );
  const hasUnreviewedClose = input.decisionRecords.some(
    (r) => !!r.outcome && !r.review,
  );
  const statePreserved =
    input.decisionRecords.length > 0 || input.resolvedObjectCount > 0;

  // A sealed receipt only means DONE when nothing is still pending. Live risk
  // or an unreviewed close outranks a receipt — completion is never fabricated.
  const jobComplete = !input.receiptEmpty && !hasOpenPosition && !hasUnreviewedClose;

  // Only the honest WAIT job carries a return trigger (a thesis waiting for the
  // market). Every other job leaves it null so the receipt never invents one.
  const returnCondition =
    input.mode === "WAIT" && input.decision === "WAIT" ? WAIT_RETURN_CONDITION : null;

  return {
    mode: input.mode,
    hasOpenPosition,
    hasUnreviewedClose,
    hasActiveWork: false,
    jobComplete,
    statePreserved,
    blockedReason: null,
    returnCondition,
    lowValueRepetition: false,
  };
}

export default deriveCompletionSignals;
