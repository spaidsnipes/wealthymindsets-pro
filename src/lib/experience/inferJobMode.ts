/**
 * inferJobMode — pure inference of the human's CURRENT job from decision state.
 *
 * The Experience Shell re-emphasises around the human's current job (see
 * selectDeckEmphasis). But the job itself is, until now, only ever set by the
 * human clicking the mode band. This selector completes the loop: given the
 * concrete decision-state signals the deck already holds, it infers which job
 * the human is most likely in and WHY — so the shell can gently SUGGEST it.
 *
 * Doctrine guardrails:
 *  - This NEVER switches the mode itself. It returns a suggestion; the human's
 *    manual selection always wins ("WM does not gate the action"). A caller may
 *    surface the suggestion as an accept-chip, never as an auto-commit.
 *  - It infers only from CONCRETE, defensible signals (an open position, an
 *    unreviewed close, the compiled right-of-way verdict, whether any market
 *    dimension has resolved). It never guesses from vibes; when signals are
 *    thin it says so with LOW confidence and falls back to PREP.
 *
 * PURE — no React, no I/O, no clock.
 */

import type { ExperienceMode } from "./decisionContextBus";
import type { RightOfWay } from "../marketData/viewModels/decisionPermissionCompiler";

export const INFER_JOB_MODE_VERSION = "wm.infer-job-mode.v1" as const;

export type InferenceConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface JobModeSignals {
  /** The trader holds an open position (an ENTER_* record with no outcome). */
  readonly hasOpenPosition: boolean;
  /** A decision has closed but the trader has not reviewed it yet. */
  readonly hasUnreviewedClose: boolean;
  /** The compiled right-of-way verdict, if the engine has one. */
  readonly decision: RightOfWay | null;
  /** At least one canonical market dimension has resolved at snapshot time. */
  readonly hasResolvedMarketState: boolean;
}

export interface JobModeInference {
  readonly version: typeof INFER_JOB_MODE_VERSION;
  /** The job the human is most likely in, given the signals. */
  readonly suggested: ExperienceMode;
  /** The single concrete signal that drove the suggestion. */
  readonly reason: string;
  readonly confidence: InferenceConfidence;
}

/**
 * Infer the current job. Priority runs from the most concrete, highest-stakes
 * state (an open position must be managed) down to the honest default (nothing
 * resolved yet → prepare). Deterministic and total.
 */
export function inferJobMode(signals: JobModeSignals): JobModeInference {
  // 1. An open position is the highest-stakes concrete state — steward it.
  if (signals.hasOpenPosition) {
    return build("MANAGE", "An open position needs stewarding.", "HIGH");
  }

  // 2. A closed-but-unreviewed decision — the review is owed next.
  if (signals.hasUnreviewedClose) {
    return build("REVIEW", "A closed decision is awaiting your review.", "HIGH");
  }

  // 3. The engine granted right-of-way — the planned decision is placeable.
  if (signals.decision === "ACTION") {
    return build("EXECUTE", "Right-of-way is granted — place the planned decision.", "MEDIUM");
  }

  // 4. The engine is withholding / cautioning — hold the thesis and wait.
  if (signals.decision === "WAIT" || signals.decision === "CAUTION") {
    return build("WAIT", "Right-of-way is withheld — hold the thesis and wait.", "MEDIUM");
  }

  // 5. Market state is resolving but there is no thesis yet — watch.
  if (signals.hasResolvedMarketState) {
    return build("OBSERVE", "Market state is resolving with no position — watch.", "LOW");
  }

  // 6. Nothing resolved yet — the honest default is to prepare.
  return build("PREP", "No market state or decision resolved yet — prepare.", "LOW");
}

function build(
  suggested: ExperienceMode,
  reason: string,
  confidence: InferenceConfidence,
): JobModeInference {
  return { version: INFER_JOB_MODE_VERSION, suggested, reason, confidence };
}

export default inferJobMode;
