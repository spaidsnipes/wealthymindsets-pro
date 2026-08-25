import { describe, it, expect } from "vitest";

import { selectRuleAdherenceStreak } from "./selectRuleAdherenceStreak";
import type { EdgeEntry } from "../proofLane/selectSessionEdge";

function e(date: string, processQuality: EdgeEntry["processQuality"]): EdgeEntry {
  return { date, result: "win", processQuality };
}

describe("selectRuleAdherenceStreak — canon §Loss-as-Data day discipline", () => {
  it("empty → zeros", () => {
    const s = selectRuleAdherenceStreak([]);
    expect(s).toEqual({ current: 0, best: 0, days_measured: 0, newest_day: undefined });
  });

  it("single clean day → current 1, best 1", () => {
    const s = selectRuleAdherenceStreak([e("2026-08-25", "FOLLOWED_PLAN")]);
    expect(s.current).toBe(1);
    expect(s.best).toBe(1);
    expect(s.newest_day).toBe("2026-08-25");
  });

  it("newest day BROKEN → current 0, older streaks preserved in best", () => {
    const s = selectRuleAdherenceStreak([
      e("2026-08-25", "BROKE_RULES"),
      e("2026-08-24", "FOLLOWED_PLAN"),
      e("2026-08-23", "FOLLOWED_PLAN"),
    ]);
    expect(s.current).toBe(0);
    expect(s.best).toBe(2);
  });

  it("multiple entries same day all FOLLOWED_PLAN → day counts as CLEAN once", () => {
    const s = selectRuleAdherenceStreak([
      e("2026-08-25", "FOLLOWED_PLAN"),
      e("2026-08-25", "FOLLOWED_PLAN"),
      e("2026-08-24", "FOLLOWED_PLAN"),
    ]);
    expect(s.current).toBe(2); // 2 distinct clean days
    expect(s.days_measured).toBe(2);
  });

  it("any BROKE_RULES on a day breaks the day's classification", () => {
    const s = selectRuleAdherenceStreak([
      e("2026-08-25", "FOLLOWED_PLAN"),
      e("2026-08-25", "BROKE_RULES"), // this poisons the day
      e("2026-08-24", "FOLLOWED_PLAN"),
    ]);
    expect(s.current).toBe(0);
    expect(s.best).toBe(1);
  });

  it("all-UNRESOLVED day breaks the streak (canon: absence of proof is not proof)", () => {
    const s = selectRuleAdherenceStreak([
      e("2026-08-25", "UNRESOLVED"),
      e("2026-08-24", "FOLLOWED_PLAN"),
      e("2026-08-23", "FOLLOWED_PLAN"),
    ]);
    expect(s.current).toBe(0);
    expect(s.best).toBe(2);
  });

  it("best captures the longest run anywhere in history", () => {
    const s = selectRuleAdherenceStreak([
      e("2026-08-25", "FOLLOWED_PLAN"),
      e("2026-08-24", "BROKE_RULES"),
      e("2026-08-23", "FOLLOWED_PLAN"),
      e("2026-08-22", "FOLLOWED_PLAN"),
      e("2026-08-21", "FOLLOWED_PLAN"),
      e("2026-08-20", "FOLLOWED_PLAN"),
      e("2026-08-19", "BROKE_RULES"),
    ]);
    expect(s.current).toBe(1);
    expect(s.best).toBe(4);
  });

  it("mixed FOLLOWED_PLAN + UNRESOLVED same day → CLEAN (any followed-plan wins)", () => {
    const s = selectRuleAdherenceStreak([
      e("2026-08-25", "FOLLOWED_PLAN"),
      e("2026-08-25", "UNRESOLVED"),
    ]);
    expect(s.current).toBe(1); // day counts as CLEAN
  });
});
