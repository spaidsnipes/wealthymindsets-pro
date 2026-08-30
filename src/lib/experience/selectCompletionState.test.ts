/**
 * selectCompletionState — Completion Intelligence truth-lock.
 *
 * Canon: Cognitive Sovereignty Helicopter Audit (2026-08-29),
 * §Completion Intelligence States + §DONE-FOR-NOW criteria.
 *
 * Locks the seven-state ladder, the five DONE-FOR-NOW criteria math, and the
 * hard safety invariants: an open position can never be SAFE TO LEAVE;
 * unpreserved state can never be a clean checkpoint; RECOVERY and WAIT are
 * legitimate non-failure states.
 */

import { describe, it, expect } from "vitest";
import {
  selectCompletionState,
  COMPLETION_STATE_VERSION,
  COMPLETION_STATES,
  type CompletionSignals,
  type CompletionState,
} from "./selectCompletionState";

/** A fully-resolved, preserved, nothing-pending baseline (a clean DONE-ish base). */
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

describe("selectCompletionState — Completion Intelligence (truth-lock)", () => {
  it("stamps the schema version", () => {
    expect(selectCompletionState(base()).version).toBe(COMPLETION_STATE_VERSION);
    expect(COMPLETION_STATE_VERSION).toBe("wm.completion-state.v1");
  });

  it("exposes exactly the seven canonical states, spelled per canon", () => {
    expect(COMPLETION_STATES).toEqual([
      "ACTIVE",
      "WAITING",
      "CHECKPOINT",
      "DONE",
      "RECOVERY",
      "BLOCKED",
      "RETURN-READY",
    ]);
  });

  describe("state ladder — priority order", () => {
    it("1. an open position is ACTIVE and outranks everything else", () => {
      const r = selectCompletionState(
        base({
          hasOpenPosition: true,
          lowValueRepetition: true,
          blockedReason: "market closed",
          jobComplete: true,
        }),
      );
      expect(r.state).toBe("ACTIVE");
      expect(r.reason).toMatch(/live risk/i);
    });

    it("2. low-value repetition is RECOVERY (above a named blocker)", () => {
      const r = selectCompletionState(
        base({ lowValueRepetition: true, blockedReason: "data unavailable" }),
      );
      expect(r.state).toBe("RECOVERY");
    });

    it("3. a named blocker is BLOCKED and names the reason", () => {
      const r = selectCompletionState(base({ blockedReason: "market closed" }));
      expect(r.state).toBe("BLOCKED");
      expect(r.reason).toContain("market closed");
    });

    it("4a. an unreviewed close is ACTIVE (work owed)", () => {
      const r = selectCompletionState(base({ hasUnreviewedClose: true }));
      expect(r.state).toBe("ACTIVE");
      expect(r.reason).toMatch(/review/i);
    });

    it("4b. any other pending step is ACTIVE", () => {
      const r = selectCompletionState(base({ hasActiveWork: true }));
      expect(r.state).toBe("ACTIVE");
    });

    it("5. explicit completion with nothing pending is DONE", () => {
      const r = selectCompletionState(base({ jobComplete: true }));
      expect(r.state).toBe("DONE");
    });

    it("6. preserved state + a known return trigger is RETURN-READY", () => {
      const r = selectCompletionState(
        base({ returnCondition: "price reaches Location" }),
      );
      expect(r.state).toBe("RETURN-READY");
      expect(r.reason).toContain("price reaches Location");
    });

    it("7. preserved state with no return trigger is CHECKPOINT", () => {
      const r = selectCompletionState(base());
      expect(r.state).toBe("CHECKPOINT");
    });

    it("8. nothing pending and nothing preserved is WAITING (honest default)", () => {
      const r = selectCompletionState(base({ statePreserved: false }));
      expect(r.state).toBe("WAITING");
    });
  });

  describe("SAFE TO LEAVE invariants", () => {
    it("an open position is NEVER safe to leave", () => {
      const r = selectCompletionState(base({ hasOpenPosition: true }));
      expect(r.safeToLeave).toBe(false);
      expect(r.criteria.noCriticalStatePending).toBe(false);
    });

    it("an unreviewed close is NEVER safe to leave", () => {
      const r = selectCompletionState(base({ hasUnreviewedClose: true }));
      expect(r.safeToLeave).toBe(false);
    });

    it("unpreserved state is never safe to leave (no clean re-entry)", () => {
      const r = selectCompletionState(base({ jobComplete: true, statePreserved: false }));
      expect(r.safeToLeave).toBe(false);
      expect(r.criteria.statePreserved).toBe(false);
      expect(r.criteria.reentryWithoutReconstruction).toBe(false);
    });

    it("a truthfully-blocked, preserved, nothing-pending state IS safe to leave", () => {
      const r = selectCompletionState(base({ blockedReason: "market closed" }));
      expect(r.state).toBe("BLOCKED");
      expect(r.safeToLeave).toBe(true);
    });

    it("RETURN-READY with a known trigger and preserved state is safe to leave", () => {
      const r = selectCompletionState(base({ returnCondition: "market open" }));
      expect(r.state).toBe("RETURN-READY");
      expect(r.safeToLeave).toBe(true);
    });

    it("DONE with preserved state and nothing pending is safe to leave", () => {
      const r = selectCompletionState(base({ jobComplete: true }));
      expect(r.state).toBe("DONE");
      expect(r.safeToLeave).toBe(true);
    });
  });

  describe("DONE-FOR-NOW criteria math", () => {
    it("returnConditionKnownOrNone passes for null (none needed) and a non-empty label", () => {
      expect(selectCompletionState(base({ returnCondition: null })).criteria.returnConditionKnownOrNone).toBe(true);
      expect(selectCompletionState(base({ returnCondition: "market open" })).criteria.returnConditionKnownOrNone).toBe(true);
    });

    it("returnConditionKnownOrNone fails for an empty/whitespace label (a bug)", () => {
      expect(selectCompletionState(base({ returnCondition: "   " })).criteria.returnConditionKnownOrNone).toBe(false);
    });

    it("jobResolvedOrBlocked is true when nothing is pending even without explicit completion", () => {
      expect(selectCompletionState(base()).criteria.jobResolvedOrBlocked).toBe(true);
    });

    it("jobResolvedOrBlocked is false with pending work and no completion/blocker", () => {
      expect(selectCompletionState(base({ hasActiveWork: true })).criteria.jobResolvedOrBlocked).toBe(false);
    });
  });

  describe("totality + determinism", () => {
    it("always returns one of the seven canonical states", () => {
      const bools = [false, true];
      for (const hasOpenPosition of bools)
      for (const hasUnreviewedClose of bools)
      for (const hasActiveWork of bools)
      for (const jobComplete of bools)
      for (const statePreserved of bools)
      for (const lowValueRepetition of bools)
      for (const blockedReason of [null, "x"])
      for (const returnCondition of [null, "y"]) {
        const r = selectCompletionState({
          mode: "WAIT",
          hasOpenPosition, hasUnreviewedClose, hasActiveWork,
          jobComplete, statePreserved, lowValueRepetition,
          blockedReason, returnCondition,
        });
        expect(COMPLETION_STATES).toContain<CompletionState>(r.state);
        // safeToLeave must never contradict a live position.
        if (hasOpenPosition) expect(r.safeToLeave).toBe(false);
      }
    });

    it("is deterministic and does not mutate its input", () => {
      const input = base({ returnCondition: "market open" });
      const snapshot = JSON.stringify(input);
      const a = selectCompletionState(input);
      const b = selectCompletionState(input);
      expect(a).toEqual(b);
      expect(JSON.stringify(input)).toBe(snapshot);
    });
  });
});
