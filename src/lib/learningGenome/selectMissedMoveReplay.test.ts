import { describe, it, expect } from "vitest";

import { selectMissedMoveReplay } from "./selectMissedMoveReplay";

const HR = 60 * 60 * 1000;
const OPEN = Date.UTC(2026, 7, 25, 14, 30);
const WINDOW = [{ startMs: OPEN, endMs: OPEN + 2 * HR }];

describe("selectMissedMoveReplay — canon §11 MFE Clock / Missed-Move Replay", () => {
  it("NO_PLAN when planDeclared=false", () => {
    const r = selectMissedMoveReplay({
      planDeclared: false,
      availabilityWindows: WINDOW,
      executed: false,
    });
    expect(r.verdict).toBe("NO_PLAN");
  });

  it("NEVER_QUALIFIED when planDeclared + no firstQualifiedAtMs", () => {
    const r = selectMissedMoveReplay({
      planDeclared: true,
      availabilityWindows: WINDOW,
      executed: false,
    });
    expect(r.verdict).toBe("NEVER_QUALIFIED");
  });

  it("EXECUTED wins verdict regardless of window", () => {
    const r = selectMissedMoveReplay({
      planDeclared: true,
      firstQualifiedAtMs: OPEN + 30 * 60 * 1000,
      availabilityWindows: WINDOW,
      executed: true,
    });
    expect(r.verdict).toBe("EXECUTED");
  });

  it("MISSED_INSIDE_WINDOW when qualified inside window + not executed", () => {
    const r = selectMissedMoveReplay({
      planDeclared: true,
      firstQualifiedAtMs: OPEN + HR,
      availabilityWindows: WINDOW,
      executed: false,
      postQualifiedMfeR: 3.5,
      postQualifiedMaeR: -0.5,
    });
    expect(r.verdict).toBe("MISSED_INSIDE_WINDOW");
    expect(r.inside_availability).toBe(true);
    expect(r.post_qualified_mfe_r).toBe(3.5);
  });

  it("MISSED_OUTSIDE_WINDOW when qualified outside declared window", () => {
    const r = selectMissedMoveReplay({
      planDeclared: true,
      firstQualifiedAtMs: OPEN + 4 * HR, // after window
      availabilityWindows: WINDOW,
      executed: false,
    });
    expect(r.verdict).toBe("MISSED_OUTSIDE_WINDOW");
    expect(r.inside_availability).toBe(false);
    expect(r.canon).toContain("§2");
  });

  it("no availability declared + qualified + not executed → MISSED_INSIDE_WINDOW (canon-safe default)", () => {
    const r = selectMissedMoveReplay({
      planDeclared: true,
      firstQualifiedAtMs: OPEN + HR,
      availabilityWindows: [], // no window declared
      executed: false,
    });
    expect(r.verdict).toBe("MISSED_INSIDE_WINDOW");
    expect(r.inside_availability).toBeUndefined();
  });

  it("qualified exactly at window start = inside (start-inclusive)", () => {
    const r = selectMissedMoveReplay({
      planDeclared: true,
      firstQualifiedAtMs: OPEN,
      availabilityWindows: WINDOW,
      executed: false,
    });
    expect(r.inside_availability).toBe(true);
    expect(r.verdict).toBe("MISSED_INSIDE_WINDOW");
  });

  it("qualified exactly at window end = outside (end-exclusive)", () => {
    const r = selectMissedMoveReplay({
      planDeclared: true,
      firstQualifiedAtMs: OPEN + 2 * HR,
      availabilityWindows: WINDOW,
      executed: false,
    });
    expect(r.inside_availability).toBe(false);
    expect(r.verdict).toBe("MISSED_OUTSIDE_WINDOW");
  });

  it("preserves MFE/MAE fields when present", () => {
    const r = selectMissedMoveReplay({
      planDeclared: true,
      firstQualifiedAtMs: OPEN + HR,
      availabilityWindows: WINDOW,
      executed: false,
      postQualifiedMfeR: 5.2,
      postQualifiedMaeR: -0.3,
    });
    expect(r.post_qualified_mfe_r).toBe(5.2);
    expect(r.post_qualified_mae_r).toBe(-0.3);
  });

  it("every verdict carries a canon anchor", () => {
    for (const input of [
      { planDeclared: false, availabilityWindows: [], executed: false },
      { planDeclared: true, availabilityWindows: [], executed: false },
      { planDeclared: true, firstQualifiedAtMs: OPEN, availabilityWindows: WINDOW, executed: true },
      { planDeclared: true, firstQualifiedAtMs: OPEN, availabilityWindows: WINDOW, executed: false },
      { planDeclared: true, firstQualifiedAtMs: OPEN + 4 * HR, availabilityWindows: WINDOW, executed: false },
    ]) {
      const r = selectMissedMoveReplay(input);
      expect(r.canon.startsWith("§")).toBe(true);
    }
  });
});
