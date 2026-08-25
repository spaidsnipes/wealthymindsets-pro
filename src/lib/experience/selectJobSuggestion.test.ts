/**
 * selectJobSuggestion tests — the suggestion must stay silent when the human is
 * already in the inferred job, present a full accept-chip only for a firm
 * (HIGH/MEDIUM) divergence, and drop to a quiet hint for a LOW-confidence
 * divergence — never nagging the human off their chosen job on a weak guess.
 */

import { describe, it, expect } from "vitest";
import { selectJobSuggestion, JOB_SUGGESTION_VERSION } from "./selectJobSuggestion";
import { INFER_JOB_MODE_VERSION, type JobModeInference } from "./inferJobMode";
import type { ExperienceMode } from "./decisionContextBus";
import type { InferenceConfidence } from "./inferJobMode";

function inference(
  suggested: ExperienceMode,
  confidence: InferenceConfidence,
): JobModeInference {
  return { version: INFER_JOB_MODE_VERSION, suggested, reason: "test", confidence };
}

describe("selectJobSuggestion", () => {
  it("exposes a stable version", () => {
    expect(JOB_SUGGESTION_VERSION).toBe("wm.job-suggestion.v1");
  });

  it("is silent (NONE, no inference) when the inferred job already matches", () => {
    for (const c of ["HIGH", "MEDIUM", "LOW"] as const) {
      const s = selectJobSuggestion(inference("OBSERVE", c), "OBSERVE");
      expect(s.strength).toBe("NONE");
      expect(s.inference).toBeNull();
    }
  });

  it("is a full ACTIONABLE chip for a HIGH-confidence divergence", () => {
    const s = selectJobSuggestion(inference("MANAGE", "HIGH"), "OBSERVE");
    expect(s.strength).toBe("ACTIONABLE");
    expect(s.inference?.suggested).toBe("MANAGE");
  });

  it("is a full ACTIONABLE chip for a MEDIUM-confidence divergence", () => {
    const s = selectJobSuggestion(inference("EXECUTE", "MEDIUM"), "WAIT");
    expect(s.strength).toBe("ACTIONABLE");
  });

  it("drops to a quiet HINT for a LOW-confidence divergence", () => {
    const s = selectJobSuggestion(inference("PREP", "LOW"), "OBSERVE");
    expect(s.strength).toBe("HINT");
    expect(s.inference?.suggested).toBe("PREP");
  });

  it("always carries the inference through when strength is not NONE", () => {
    for (const c of ["HIGH", "MEDIUM", "LOW"] as const) {
      const s = selectJobSuggestion(inference("WAIT", c), "OBSERVE");
      expect(s.strength).not.toBe("NONE");
      expect(s.inference).not.toBeNull();
    }
  });
});
