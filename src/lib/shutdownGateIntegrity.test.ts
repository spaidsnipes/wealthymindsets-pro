import { describe, it, expect } from "vitest";
import { evaluateShutdown } from "./proofLane/proofLaneR";

/**
 * Daily-loss shutdown gate — canon §4.
 *
 * This is the control that stops a spiralling session, so it must never return
 * the permissive "OPEN" from inputs it cannot resolve.
 *
 * Two latent gaps, both guarded by the single live caller (/journal filters
 * Number.isFinite before calling) but not by the primitive itself:
 *
 *  1. A non-finite R made BOTH comparisons false — `NaN <= -2` and `NaN >= 3`
 *     are each false — so the function returned "Session open." while the chip
 *     rendered "NaNR". The hard stop simply never fired.
 *  2. `maxDailyLossR: 2` (meaning "2R of loss") made `cumulative <= 2` true for
 *     almost any session, tripping the stop immediately.
 */
describe("daily-loss shutdown gate", () => {
  it("stops the session at the default -2R", () => {
    const r = evaluateShutdown({ closedRs: [-1, -1.2] });
    expect(r.state).toBe("AT_TWO_R_STOP");
    expect(r.cumulativeR).toBeCloseTo(-2.2, 5);
  });

  it("reports the +3R objective without treating it as a quota", () => {
    const r = evaluateShutdown({ closedRs: [1.5, 2] });
    expect(r.state).toBe("AT_THREE_R_TARGET");
    expect(r.reason).toContain("no daily quota");
  });

  it("stays open between the bounds", () => {
    expect(evaluateShutdown({ closedRs: [0.5, -0.75] }).state).toBe("OPEN");
    expect(evaluateShutdown({ closedRs: [] }).state).toBe("OPEN");
  });

  it("refuses to evaluate from a non-finite R instead of reporting OPEN", () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => evaluateShutdown({ closedRs: [-1, bad] })).toThrow(/non-finite/);
    }
  });

  it("a corrupted entry can never silently produce a permissive session", () => {
    // The exact old failure: NaN <= -2 is false AND NaN >= 3 is false.
    expect(Number.NaN <= -2).toBe(false);
    expect(Number.NaN >= 3).toBe(false);
    expect(() => evaluateShutdown({ closedRs: [Number.NaN] })).toThrow();
  });

  it("treats a positive maxDailyLossR as a loss magnitude, not a ceiling", () => {
    // "2R of loss" spelled positively must behave like -2.
    const positive = evaluateShutdown({ closedRs: [-2.5], maxDailyLossR: 2 });
    const negative = evaluateShutdown({ closedRs: [-2.5], maxDailyLossR: -2 });
    expect(positive.state).toBe("AT_TWO_R_STOP");
    expect(positive.state).toBe(negative.state);
  });

  it("a positive maxDailyLossR no longer trips the stop on a flat session", () => {
    // Old behaviour: cumulative 0 <= 2 was true → immediate hard stop.
    expect(evaluateShutdown({ closedRs: [0], maxDailyLossR: 2 }).state).toBe("OPEN");
    expect(evaluateShutdown({ closedRs: [0.5], maxDailyLossR: 2 }).state).toBe("OPEN");
  });

  it("honours an explicit custom target", () => {
    expect(evaluateShutdown({ closedRs: [4], shutdownTargetR: 5 }).state).toBe("OPEN");
    expect(evaluateShutdown({ closedRs: [5], shutdownTargetR: 5 }).state).toBe("AT_THREE_R_TARGET");
  });
});
