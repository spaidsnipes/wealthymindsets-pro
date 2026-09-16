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

  it("guarantees a non-empty OPEN when it is NOT safe to leave (names the unmet criteria)", () => {
    const ramp = composeExitRamp({
      assessment: assess({ hasOpenPosition: true }),
      open: [],
    });
    expect(ramp.safeToLeave).toBe(false);
    expect(ramp.open.length).toBeGreaterThan(0);
    // An open position fails BOTH job-resolution and critical-state criteria.
    expect(ramp.open.join(" ")).toMatch(/neither complete nor truthfully blocked/i);
    expect(ramp.open.join(" ")).toMatch(/critical state is still unresolved/i);
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

  /**
   * ── AN OPEN ITEM MAY NOT SAY THAT NOTHING IS OPEN ─────────────────────────
   *
   * Measured live on /command-deck (2026-09-16): the card's chip read WAITING
   * (NOT safe to leave), its OPEN section listed exactly one thing — "Nothing
   * is required right now; the next useful action depends on new evidence." —
   * and its recap read "WAITING — 1 open". The count was 1 and the content was
   * zero: the guardrail was satisfied VACUOUSLY.
   *
   * `assessment.reason` explains the STATE; `assessment.criteria` explain the
   * VERDICT. OPEN is a statement about the verdict, so it is derived from the
   * criteria — which makes it non-vacuous by construction, since safeToLeave is
   * their conjunction.
   */
  describe("AN OPEN ITEM MAY NOT SAY THAT NOTHING IS OPEN", () => {
    it("never files the WAITING calm-sentence as the thing that is open", () => {
      const waiting = composeExitRamp({ assessment: assess({ statePreserved: false }) });
      expect(waiting.state).toBe("WAITING");
      expect(waiting.safeToLeave).toBe(false);
      expect(waiting.open.length).toBeGreaterThan(0);
      // The exact live string, and the shape of any restatement of it.
      expect(waiting.open).not.toContain(
        "Nothing is required right now; the next useful action depends on new evidence.",
      );
      for (const item of waiting.open) {
        expect(item, `OPEN item: ${item}`).not.toMatch(/nothing is required/i);
      }
      expect(waiting.open.join(" ")).toMatch(/not preserved/i);
    });

    it("names an unmet criterion for EVERY not-safe-to-leave state", () => {
      const cases: Array<Partial<CompletionSignals>> = [
        { hasOpenPosition: true },
        { hasUnreviewedClose: true },
        { hasActiveWork: true },
        { statePreserved: false },
        { statePreserved: false, jobComplete: true },
        { statePreserved: false, blockedReason: "no market data" },
        { statePreserved: false, lowValueRepetition: true },
        { statePreserved: false, returnCondition: "price reaches Location" },
      ];
      for (const c of cases) {
        const ramp = composeExitRamp({ assessment: assess(c) });
        if (ramp.safeToLeave) continue;
        const label = JSON.stringify(c);
        expect(ramp.open.length, `no OPEN item for ${label}`).toBeGreaterThan(0);
        for (const item of ramp.open) {
          expect(item, `vacuous OPEN item for ${label}: ${item}`).not.toMatch(
            /nothing is required|safe to (leave|disengage)/i,
          );
        }
      }
    });

    it("says one fact once — a lost ledger is not also a separate re-entry line", () => {
      const ramp = composeExitRamp({ assessment: assess({ statePreserved: false }) });
      expect(ramp.open.filter((i) => /preserved|reconstructing/i.test(i))).toHaveLength(1);
      expect(new Set(ramp.open).size).toBe(ramp.open.length);
    });

    /**
     * The deck's OS rail publishes "EVIDENCE DEBT · 9 OPEN" (unpaid evidence
     * nodes). This card's recap publishes its own count under the same word,
     * in the same uppercase chrome, counting a different set. Both owners are
     * correct, so the repair is a NOUN, never a re-derived number.
     */
    it("the recap says WHAT is open, so it cannot be read against the rail's count", () => {
      const ramp = composeExitRamp({ assessment: assess({ statePreserved: false }) });
      expect(ramp.recap).toBe("WAITING — 1 open item");
      expect(ramp.recap).not.toMatch(/\b1 open$/);
    });

    it("never prints a bare N-open in any recap it derives", () => {
      for (const n of [1, 2, 5]) {
        const ramp = composeExitRamp({
          assessment: assess({ jobComplete: true }),
          open: Array.from({ length: n }, (_, i) => `item ${i}`),
        });
        expect(ramp.recap, `n=${n}`).toMatch(new RegExp(`${n} open item${n === 1 ? "" : "s"}`));
        expect(ramp.recap, `n=${n}`).not.toMatch(new RegExp(`${n} open(?!\\s*item)`));
      }
    });

    it("still yields to a caller who named the open work itself", () => {
      const ramp = composeExitRamp({
        assessment: assess({ statePreserved: false }),
        open: ["Seal the decision receipt"],
      });
      expect(ramp.open).toEqual(["Seal the decision receipt"]);
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
