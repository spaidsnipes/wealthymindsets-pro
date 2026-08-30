/**
 * composeExitRamp — Exit Ramp / Completion Receipt truth-lock.
 *
 * Canon: Cognitive Sovereignty Helicopter Audit (2026-08-29), §Exit Ramp.
 * Locks that the receipt COMPOSES the completion assessment (never fabricates
 * permission), normalizes item lists, guarantees a non-empty OPEN when it is
 * not safe to leave, and surfaces RETURN only for a known condition.
 */

import { describe, it, expect } from "vitest";
import { composeExitRamp, EXIT_RAMP_VERSION } from "./composeExitRamp";
import {
  selectCompletionState,
  type CompletionSignals,
  type CompletionAssessment,
} from "./selectCompletionState";

function base(overrides: Partial<CompletionSignals> = {}): CompletionSignals {
  return {
    mode: "OBSERVE",
    hasOpenPosition: false,
    hasUnreviewedClose: false,
    hasActiveWork: false,
    jobComplete: false,
    statePreserved: true,
    blockedReason: null,
    returnCondition: null,
    lowValueRepetition: false,
    ...overrides,
  };
}

function assess(overrides: Partial<CompletionSignals> = {}): CompletionAssessment {
  return selectCompletionState(base(overrides));
}

describe("composeExitRamp — Completion Receipt (truth-lock)", () => {
  it("stamps the schema version", () => {
    const ramp = composeExitRamp({ assessment: assess({ jobComplete: true }) });
    expect(ramp.version).toBe(EXIT_RAMP_VERSION);
    expect(EXIT_RAMP_VERSION).toBe("wm.exit-ramp.v1");
  });

  it("copies safeToLeave verbatim from the assessment — never fabricates permission", () => {
    const blocked = composeExitRamp({ assessment: assess({ hasOpenPosition: true }) });
    expect(blocked.safeToLeave).toBe(false);

    const clear = composeExitRamp({ assessment: assess({ jobComplete: true }) });
    expect(clear.safeToLeave).toBe(true);
  });

  it("normalizes DONE/SAVED/OPEN — trims and drops empty entries", () => {
    const ramp = composeExitRamp({
      assessment: assess({ jobComplete: true }),
      done: ["  Mapped session ", "", "   "],
      saved: ["Journal entry #12"],
      open: [],
    });
    expect(ramp.done).toEqual(["Mapped session"]);
    expect(ramp.saved).toEqual(["Journal entry #12"]);
  });

  it("guarantees a non-empty OPEN when it is NOT safe to leave (borrows the engine reason)", () => {
    const ramp = composeExitRamp({
      assessment: assess({ hasOpenPosition: true }),
      open: [],
    });
    expect(ramp.safeToLeave).toBe(false);
    expect(ramp.open.length).toBeGreaterThan(0);
    expect(ramp.open[0]).toMatch(/live risk/i);
  });

  it("does not inject a synthetic OPEN when the caller already named one", () => {
    const ramp = composeExitRamp({
      assessment: assess({ hasOpenPosition: true }),
      open: ["Close or protect the ES position"],
    });
    expect(ramp.open).toEqual(["Close or protect the ES position"]);
  });

  it("surfaces RETURN only for a known, non-empty condition", () => {
    const withReturn = composeExitRamp({
      assessment: assess({ returnCondition: "price reaches Location" }),
      returnCondition: "price reaches Location",
    });
    expect(withReturn.state).toBe("RETURN-READY");
    expect(withReturn.return).toBe("price reaches Location");

    const noReturn = composeExitRamp({
      assessment: assess({ jobComplete: true }),
      returnCondition: "   ",
    });
    expect(noReturn.return).toBeNull();
  });

  it("normalizes NEXT to null when blank", () => {
    expect(composeExitRamp({ assessment: assess({ jobComplete: true }), next: "  " }).next).toBeNull();
    expect(composeExitRamp({ assessment: assess({ jobComplete: true }), next: "Log the review" }).next).toBe("Log the review");
  });

  it("uses a caller recap when provided, else derives a truthful count summary", () => {
    const override = composeExitRamp({
      assessment: assess({ jobComplete: true }),
      recap: "Clean session close",
    });
    expect(override.recap).toBe("Clean session close");

    const derived = composeExitRamp({
      assessment: assess({ jobComplete: true }),
      done: ["a", "b"],
      saved: ["c"],
    });
    expect(derived.recap).toContain("DONE");
    expect(derived.recap).toContain("2 done");
    expect(derived.recap).toContain("1 saved");
  });

  describe("headline honesty", () => {
    it("safe-to-leave RECOVERY invites disengagement", () => {
      const ramp = composeExitRamp({ assessment: assess({ lowValueRepetition: true }) });
      expect(ramp.state).toBe("RECOVERY");
      expect(ramp.safeToLeave).toBe(true);
      expect(ramp.headline).toMatch(/disengage|recover/i);
    });

    it("an open position headline never says safe to leave", () => {
      const ramp = composeExitRamp({ assessment: assess({ hasOpenPosition: true }) });
      expect(ramp.headline).not.toMatch(/safe to leave/i);
      expect(ramp.headline).toMatch(/work remains|not done/i);
    });

    it("RETURN-READY headline offers leave-and-resume", () => {
      const ramp = composeExitRamp({
        assessment: assess({ returnCondition: "market open" }),
        returnCondition: "market open",
      });
      expect(ramp.headline).toMatch(/resume|leave/i);
    });
  });

  it("is deterministic and does not mutate caller-supplied arrays", () => {
    const done = ["x"];
    const input = { assessment: assess({ jobComplete: true }), done };
    const a = composeExitRamp(input);
    const b = composeExitRamp(input);
    expect(a).toEqual(b);
    expect(done).toEqual(["x"]); // input array untouched
  });
});
