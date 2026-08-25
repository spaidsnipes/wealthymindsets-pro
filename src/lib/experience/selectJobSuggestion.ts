/**
 * selectJobSuggestion — decide WHETHER and HOW INSISTENTLY to surface the
 * inferred job as a suggestion, given the human's current job.
 *
 * `inferJobMode` produces a job guess with a confidence. The deck surfaces it as
 * an accept-chip. But until now the chip nudged EQUALLY HARD whether the guess
 * was a certainty (an open position → MANAGE, HIGH) or a thin fallback
 * (nothing resolved → PREP, LOW). Presenting a weak guess as loudly as a
 * certainty is a subtle overclaim — the OS should not push the human off the
 * job they chose on a low-confidence hunch.
 *
 * Doctrine: "suggest, never gate" / "WM does not gate the action." This selector
 * refines the SUGGESTION only — it never switches the mode, and the chip stays
 * clickable at every strength (the human may always accept). It only scales how
 * insistently the suggestion is presented:
 *   - NONE       — the inferred job already matches the human's — say nothing.
 *   - ACTIONABLE — a HIGH/MEDIUM-confidence divergence — a full accept-chip.
 *   - HINT       — a LOW-confidence divergence — a quiet, non-insistent nudge.
 *
 * PURE — no React, no I/O, no clock.
 */

import type { ExperienceMode } from "./decisionContextBus";
import type { JobModeInference } from "./inferJobMode";

export const JOB_SUGGESTION_VERSION = "wm.job-suggestion.v1" as const;

export type SuggestionStrength = "NONE" | "HINT" | "ACTIONABLE";

export interface JobSuggestion {
  readonly version: typeof JOB_SUGGESTION_VERSION;
  /** How insistently to present the suggestion. */
  readonly strength: SuggestionStrength;
  /**
   * The inference to surface, or null when strength is NONE. Carried through so
   * the caller renders exactly what was decided here (no re-deriving).
   */
  readonly inference: JobModeInference | null;
}

/**
 * Resolve the suggestion strength. Deterministic and total: an inferred job
 * that matches the current mode is silent; a divergence is ACTIONABLE when the
 * inference is HIGH/MEDIUM confidence and a quiet HINT when it is LOW.
 */
export function selectJobSuggestion(
  inference: JobModeInference,
  currentMode: ExperienceMode,
): JobSuggestion {
  // The human is already in the inferred job — never nag.
  if (inference.suggested === currentMode) {
    return { version: JOB_SUGGESTION_VERSION, strength: "NONE", inference: null };
  }

  // A LOW-confidence guess is a quiet hint; a firmer read earns a full chip.
  const strength: SuggestionStrength =
    inference.confidence === "LOW" ? "HINT" : "ACTIONABLE";

  return { version: JOB_SUGGESTION_VERSION, strength, inference };
}

export default selectJobSuggestion;
