import { describe, it, expect } from "vitest";
import { shouldLeadOpeningBell } from "./phaseSurfaceGate";
import { EXPERIENCE_MODES, type ExperienceMode } from "./decisionContextBus";
import type { TradePhase } from "@/lib/marketData/viewModels/selectDecisionChain";

const ALL_PHASES: readonly TradePhase[] = [
  "PREPARATION", "APPROACH", "DECISION", "POSITION", "POST_EXIT", "REVIEW",
];

describe("phaseSurfaceGate.shouldLeadOpeningBell", () => {
  it("leads ONLY for (PREP mode, PREPARATION phase)", () => {
    expect(shouldLeadOpeningBell("PREP", "PREPARATION")).toBe(true);
  });

  it("does NOT lead for OBSERVE + PREPARATION — the cold-mount default pair (the reported bug)", () => {
    // Both axes default on their first value (OBSERVE + PREPARATION); merely
    // watching must never render the big 'Not ready — Preparation incomplete'.
    expect(shouldLeadOpeningBell("OBSERVE", "PREPARATION")).toBe(false);
  });

  it("does NOT lead for any non-PREP mode even while phase is PREPARATION", () => {
    for (const mode of EXPERIENCE_MODES) {
      if (mode === "PREP") continue;
      expect(shouldLeadOpeningBell(mode, "PREPARATION")).toBe(false);
    }
  });

  it("does NOT lead for PREP mode when the phase is not PREPARATION", () => {
    for (const phase of ALL_PHASES) {
      if (phase === "PREPARATION") continue;
      expect(shouldLeadOpeningBell("PREP", phase)).toBe(false);
    }
  });

  it("is a total boolean over every ExperienceMode × TradePhase, true in exactly one cell", () => {
    let trueCount = 0;
    for (const mode of EXPERIENCE_MODES) {
      for (const phase of ALL_PHASES) {
        const r = shouldLeadOpeningBell(mode as ExperienceMode, phase);
        expect(typeof r).toBe("boolean");
        if (r) trueCount += 1;
      }
    }
    expect(trueCount).toBe(1); // exactly (PREP, PREPARATION)
  });
});
