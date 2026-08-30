/**
 * composeExitRamp — pure Completion Receipt / Exit Ramp compiler.
 *
 * Canon: Cognitive Sovereignty Helicopter Audit (2026-08-29), §Exit Ramp /
 * Completion Receipt: "When a useful stopping point is reached, show a calm
 * exit ramp rather than another dashboard."
 *
 *   DONE   — what was completed / proven
 *   SAVED  — what state / artifacts / decisions / evidence are preserved
 *   OPEN   — what remains unfinished or uncertain
 *   NEXT   — smallest meaningful next job, only if one exists
 *   RETURN — when / why returning becomes useful
 *   RECAP  — short human-readable summary
 *   SAFE TO LEAVE — explicit permission when no consequence requires presence
 *
 * This COMPOSES selectCompletionState (it never re-derives the completion
 * verdict): `safeToLeave` is taken verbatim from the assessment so the receipt
 * can never contradict the engine. It normalizes caller-supplied item lists
 * (trims, drops empties) and derives a calm headline + recap when none is
 * given.
 *
 * Truth guardrails:
 *  - SAFE TO LEAVE is copied from the assessment — the receipt cannot fabricate
 *    permission the engine withheld.
 *  - When it is NOT safe to leave, OPEN is guaranteed non-empty (a truthful
 *    exit ramp must name what still holds the human) — a synthetic reason is
 *    added if the caller supplied none.
 *  - RETURN is surfaced only for a known, non-empty return condition.
 *
 * PURE — no React, no I/O, no clock. Deterministic and total.
 */

import type { CompletionAssessment, CompletionState } from "./selectCompletionState";

export const EXIT_RAMP_VERSION = "wm.exit-ramp.v1" as const;

export interface ExitRampInput {
  readonly assessment: CompletionAssessment;
  /** What was completed / proven this session. */
  readonly done?: readonly string[];
  /** What state / artifacts / evidence are preserved. */
  readonly saved?: readonly string[];
  /** What remains unfinished or uncertain. */
  readonly open?: readonly string[];
  /** The smallest meaningful next job, if one exists. */
  readonly next?: string | null;
  /** The known return trigger (same label fed to selectCompletionState). */
  readonly returnCondition?: string | null;
  /** Optional recap override; a truthful default is derived when absent. */
  readonly recap?: string | null;
}

export interface ExitRamp {
  readonly version: typeof EXIT_RAMP_VERSION;
  readonly state: CompletionState;
  readonly done: readonly string[];
  readonly saved: readonly string[];
  readonly open: readonly string[];
  readonly next: string | null;
  readonly return: string | null;
  readonly recap: string;
  readonly safeToLeave: boolean;
  /** A calm one-line summary suitable for a header. */
  readonly headline: string;
}

function clean(items: readonly string[] | undefined): string[] {
  if (!items) return [];
  return items.map((s) => s.trim()).filter((s) => s.length > 0);
}

function knownLabel(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

/**
 * Compile the exit ramp. Deterministic and total; never contradicts the
 * completion assessment it is handed.
 */
export function composeExitRamp(input: ExitRampInput): ExitRamp {
  const { assessment } = input;
  const state = assessment.state;
  const safeToLeave = assessment.safeToLeave;

  const done = clean(input.done);
  const saved = clean(input.saved);
  const open = clean(input.open);
  const next = knownLabel(input.next);
  const ret = knownLabel(input.returnCondition);

  // A truthful exit ramp that is NOT safe to leave must name what still holds
  // the human. If the caller named nothing, borrow the engine's reason.
  if (!safeToLeave && open.length === 0) {
    open.push(assessment.reason);
  }

  const recap = knownLabel(input.recap) ?? deriveRecap(state, done, saved, open);
  const headline = deriveHeadline(state, safeToLeave, recap);

  return {
    version: EXIT_RAMP_VERSION,
    state,
    done,
    saved,
    open,
    next,
    return: ret,
    recap,
    safeToLeave,
    headline,
  };
}

function deriveRecap(
  state: CompletionState,
  done: readonly string[],
  saved: readonly string[],
  open: readonly string[],
): string {
  const parts: string[] = [];
  if (done.length > 0) parts.push(`${done.length} done`);
  if (saved.length > 0) parts.push(`${saved.length} saved`);
  if (open.length > 0) parts.push(`${open.length} open`);
  const tail = parts.length > 0 ? ` — ${parts.join(", ")}` : "";
  return `${state}${tail}`;
}

function deriveHeadline(
  state: CompletionState,
  safeToLeave: boolean,
  recap: string,
): string {
  if (safeToLeave) {
    if (state === "RECOVERY") return "Safe to disengage and recover.";
    if (state === "RETURN-READY") return "Nothing required now — safe to leave and resume later.";
    if (state === "DONE") return "Done — safe to leave.";
    return "Safe to leave.";
  }
  if (state === "ACTIVE") return "Useful work remains — not done yet.";
  if (state === "BLOCKED") return "Blocked — resolve the named condition to continue.";
  if (state === "WAITING") return "Waiting on new evidence before the next action.";
  // A non-safe checkpoint/recovery/etc. still owes the human its recap.
  return recap;
}

export default composeExitRamp;
