import { describe, it, expect } from "vitest";
import { shellEmphasis, MIN_CANVAS_WEIGHT } from "./shellLayout";
import { EXPERIENCE_MODES } from "./decisionContextBus";

describe("shellLayout — emphasis reorganises around the human's job, never below chart-sacred", () => {
  it("the chart canvas is sacred in EVERY mode (>= MIN_CANVAS_WEIGHT)", () => {
    for (const mode of EXPERIENCE_MODES) {
      expect(shellEmphasis(mode).canvasWeight).toBeGreaterThanOrEqual(MIN_CANVAS_WEIGHT);
      expect(shellEmphasis(mode).canvasWeight).toBeLessThanOrEqual(1);
    }
  });

  it("live-market jobs keep the guest rail closed (chart sacred); reflection jobs open it", () => {
    // EXECUTE / MANAGE / OBSERVE / WAIT are live — rail closed by default.
    expect(shellEmphasis("EXECUTE").railDefaultOpen).toBe(false);
    expect(shellEmphasis("MANAGE").railDefaultOpen).toBe(false);
    expect(shellEmphasis("OBSERVE").railDefaultOpen).toBe(false);
    expect(shellEmphasis("WAIT").railDefaultOpen).toBe(false);
    // PREP / REVIEW / LEARN are reflection — context alongside is welcome.
    expect(shellEmphasis("PREP").railDefaultOpen).toBe(true);
    expect(shellEmphasis("REVIEW").railDefaultOpen).toBe(true);
    expect(shellEmphasis("LEARN").railDefaultOpen).toBe(true);
  });

  it("liveFocus is true only for the live-market modes", () => {
    const live = new Set(["OBSERVE", "WAIT", "EXECUTE", "MANAGE"]);
    for (const mode of EXPERIENCE_MODES) {
      expect(shellEmphasis(mode).liveFocus).toBe(live.has(mode));
    }
  });

  it("EXECUTE is the most chart-dominant live job", () => {
    const execute = shellEmphasis("EXECUTE").canvasWeight;
    for (const mode of EXPERIENCE_MODES) {
      expect(execute).toBeGreaterThanOrEqual(shellEmphasis(mode).canvasWeight);
    }
  });

  it("every mode has a non-empty one-line job caption", () => {
    for (const mode of EXPERIENCE_MODES) {
      expect(shellEmphasis(mode).job.trim().length).toBeGreaterThan(0);
    }
  });
});
