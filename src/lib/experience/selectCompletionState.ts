/**
 * selectCompletionState — pure Completion Intelligence for the Experience Shell.
 *
 * Canon: "ATH/WOW Cognitive Sovereignty Helicopter Audit" (2026-08-29),
 * §Completion Intelligence States + §Exit Ramp. The shell already infers the
 * human's CURRENT job (inferJobMode → NOW/NEXT/WHY). This selector answers the
 * other half of the grammar — DONE: "Can I stop carrying this now?"
 *
 * It maps observable, defensible decision-state signals to one of the seven
 * canonical completion states and reports whether it is truthfully SAFE TO
 * LEAVE, with the five DONE-FOR-NOW criteria surfaced individually so the
 * receipt (composeExitRamp) and any UI can explain the verdict.
 *
 * Doctrine guardrails (mirrors inferJobMode):
 *  - NEVER fabricates completion. SAFE TO LEAVE is granted only when every
 *    DONE-FOR-NOW criterion holds — an open position (live risk) can never be
 *    "done for now", and unpreserved state can never be a clean checkpoint.
 *  - WAIT / NO-TRADE and RECOVERY are legitimate, non-failure states.
 *  - RECOVERY protects the human: continued low-value repetition earns a calm
 *    "safe to disengage", never a productivity nag. It is surfaced ABOVE a
 *    named blocker because the human's wellbeing signal outranks the mechanics
 *    of why work stalled — but never above live risk (an open position).
 *  - It observes; it never blocks, denies, or forces the human out. The UI may
 *    surface the state as a calm exit ramp, never as an auto-navigation.
 *
 * PURE — no React, no I/O, no clock. Deterministic and total.
 */

import type { ExperienceMode } from "./decisionContextBus";

export const COMPLETION_STATE_VERSION = "wm.completion-state.v1" as const;

/**
 * The seven canonical Completion Intelligence states. The literal spellings
 * match the canon exactly (including "RETURN-READY") so they can be rendered
 * verbatim.
 */
export type CompletionState =
  | "ACTIVE"       // useful work remains
  | "WAITING"      // next useful action depends on time / evidence / another party
  | "CHECKPOINT"   // safe stopping point with preserved state
  | "DONE"         // acceptance criteria are truthfully complete
  | "RECOVERY"     // continued effort adds low-value repetition; disengage
  | "BLOCKED"      // cannot safely continue until a named condition changes
  | "RETURN-READY"; // context preserved well enough to leave and resume later

export const COMPLETION_STATES: readonly CompletionState[] = [
  "ACTIVE",
  "WAITING",
  "CHECKPOINT",
  "DONE",
  "RECOVERY",
  "BLOCKED",
  "RETURN-READY",
] as const;

export interface CompletionSignals {
  /** The human's current job (for honest reason phrasing). */
  readonly mode: ExperienceMode;
  /** A live position is open (an ENTER_* with no outcome) — live risk. */
  readonly hasOpenPosition: boolean;
  /** A decision has closed but has not been reviewed yet — work owed. */
  readonly hasUnreviewedClose: boolean;
  /** Any other explicit pending step of the current job remains. */
  readonly hasActiveWork: boolean;
  /** The current job's acceptance criteria are truthfully complete. */
  readonly jobComplete: boolean;
  /** Important state / receipts are durably preserved (clean re-entry). */
  readonly statePreserved: boolean;
  /** A named condition preventing safe continuation, or null. */
  readonly blockedReason: string | null;
  /** A known trigger for a useful return (e.g. "price reaches Location"), or null. */
  readonly returnCondition: string | null;
  /** Continued effort is adding low-value repetition / error risk. */
  readonly lowValueRepetition: boolean;
}

/** The five DONE-FOR-NOW criteria, each evaluated independently. */
export interface DoneForNowCriteria {
  /** 1. The current job is complete or truthfully blocked. */
  readonly jobResolvedOrBlocked: boolean;
  /** 2. No unresolved critical state requires attention. */
  readonly noCriticalStatePending: boolean;
  /** 3. Important state and receipts are preserved. */
  readonly statePreserved: boolean;
  /** 4. The next return condition is known if one exists. */
  readonly returnConditionKnownOrNone: boolean;
  /** 5. Re-entry can restore context without memory reconstruction. */
  readonly reentryWithoutReconstruction: boolean;
}

export interface CompletionAssessment {
  readonly version: typeof COMPLETION_STATE_VERSION;
  readonly state: CompletionState;
  /** The single concrete signal that drove the state. */
  readonly reason: string;
  /** True only when every DONE-FOR-NOW criterion holds. */
  readonly safeToLeave: boolean;
  readonly criteria: DoneForNowCriteria;
}

function isKnownLabel(v: string | null): boolean {
  return v !== null && v.trim().length > 0;
}

/**
 * Assess completion. Priority runs from the highest-stakes concrete state (an
 * open position is live risk and can never be "done for now") down through the
 * human-protective RECOVERY signal, named blockers, remaining work, explicit
 * completion, and finally the preserved-state resting states. The honest
 * default when nothing is resolved and nothing is preserved is WAITING.
 */
export function selectCompletionState(signals: CompletionSignals): CompletionAssessment {
  const criteria: DoneForNowCriteria = {
    jobResolvedOrBlocked:
      signals.jobComplete ||
      isKnownLabel(signals.blockedReason) ||
      (!signals.hasOpenPosition && !signals.hasUnreviewedClose && !signals.hasActiveWork),
    noCriticalStatePending: !signals.hasOpenPosition && !signals.hasUnreviewedClose,
    statePreserved: signals.statePreserved,
    // "known if one exists": null (none needed) or a non-empty label both pass.
    returnConditionKnownOrNone:
      signals.returnCondition === null || isKnownLabel(signals.returnCondition),
    // Clean re-entry is only truthful when state was actually preserved.
    reentryWithoutReconstruction: signals.statePreserved,
  };

  const safeToLeave =
    criteria.jobResolvedOrBlocked &&
    criteria.noCriticalStatePending &&
    criteria.statePreserved &&
    criteria.returnConditionKnownOrNone &&
    criteria.reentryWithoutReconstruction;

  const state = resolveState(signals);
  const reason = reasonFor(state, signals);
  return { version: COMPLETION_STATE_VERSION, state, reason, safeToLeave, criteria };
}

function resolveState(s: CompletionSignals): CompletionState {
  // 1. Live risk outranks everything — an open position must be stewarded.
  if (s.hasOpenPosition) return "ACTIVE";
  // 2. Protect the human: low-value repetition earns a calm disengage.
  if (s.lowValueRepetition) return "RECOVERY";
  // 3. A named blocker — cannot safely continue until it changes.
  if (isKnownLabel(s.blockedReason)) return "BLOCKED";
  // 4. Work owed (an unreviewed close, or any pending step) — still ACTIVE.
  if (s.hasUnreviewedClose || s.hasActiveWork) return "ACTIVE";
  // 5. The job's acceptance criteria are truthfully complete.
  if (s.jobComplete) return "DONE";
  // 6. Nothing pending, state preserved, and a known return trigger — leave & resume.
  if (s.statePreserved && isKnownLabel(s.returnCondition)) return "RETURN-READY";
  // 7. Nothing pending and state preserved — a safe checkpoint.
  if (s.statePreserved) return "CHECKPOINT";
  // 8. Honest default: nothing to do now, nothing preserved yet — waiting.
  return "WAITING";
}

function reasonFor(state: CompletionState, s: CompletionSignals): string {
  switch (state) {
    case "ACTIVE":
      if (s.hasOpenPosition) return "An open position is live risk — steward it before leaving.";
      if (s.hasUnreviewedClose) return "A closed decision is awaiting your review.";
      return "The current job still has an open step.";
    case "RECOVERY":
      return "Continued effort is adding low-value repetition — safe to disengage and recover.";
    case "BLOCKED":
      return `Cannot safely continue: ${s.blockedReason}`;
    case "DONE":
      return "The current job's acceptance criteria are truthfully complete.";
    case "RETURN-READY":
      return `Nothing required now — your context is preserved. Return when: ${s.returnCondition}`;
    case "CHECKPOINT":
      return "A safe stopping point — your state is preserved.";
    case "WAITING":
      return "Nothing is required right now; the next useful action depends on new evidence.";
    default:
      return "";
  }
}

export default selectCompletionState;
