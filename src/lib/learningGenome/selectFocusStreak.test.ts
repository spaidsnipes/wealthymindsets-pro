import { describe, it, expect } from "vitest";

import { selectFocusStreak } from "./selectFocusStreak";
import type { EdgeEntry } from "../proofLane/selectSessionEdge";

function e(processQuality: EdgeEntry["processQuality"]): EdgeEntry {
  return { date: "2026-08-25", result: "win", processQuality };
}

describe("selectFocusStreak — canon §Public Blessing discipline signal", () => {
  it("empty input → zeros", () => {
    expect(selectFocusStreak([])).toEqual({ current: 0, best: 0, sample_size: 0 });
  });

  it("current = 0 when newest is BROKE_RULES", () => {
    const s = selectFocusStreak([
      e("BROKE_RULES"),
      e("FOLLOWED_PLAN"),
      e("FOLLOWED_PLAN"),
    ]);
    expect(s.current).toBe(0);
    expect(s.best).toBe(2);
  });

  it("current = 0 when newest is UNRESOLVED (canon: absence of proof is not proof)", () => {
    const s = selectFocusStreak([
      e("UNRESOLVED"),
      e("FOLLOWED_PLAN"),
      e("FOLLOWED_PLAN"),
    ]);
    expect(s.current).toBe(0);
    expect(s.best).toBe(2);
  });

  it("current counts consecutive FOLLOWED_PLAN from newest", () => {
    const s = selectFocusStreak([
      e("FOLLOWED_PLAN"),
      e("FOLLOWED_PLAN"),
      e("FOLLOWED_PLAN"),
      e("BROKE_RULES"),
      e("FOLLOWED_PLAN"),
    ]);
    expect(s.current).toBe(3);
    expect(s.best).toBe(3);
  });

  it("best captures the longest run anywhere", () => {
    const s = selectFocusStreak([
      e("FOLLOWED_PLAN"),
      e("BROKE_RULES"),
      e("FOLLOWED_PLAN"),
      e("FOLLOWED_PLAN"),
      e("FOLLOWED_PLAN"),
      e("FOLLOWED_PLAN"),
      e("BROKE_RULES"),
    ]);
    expect(s.current).toBe(1);
    expect(s.best).toBe(4);
  });

  it("all FOLLOWED_PLAN → current === best === sample_size", () => {
    const s = selectFocusStreak([
      e("FOLLOWED_PLAN"),
      e("FOLLOWED_PLAN"),
      e("FOLLOWED_PLAN"),
    ]);
    expect(s.current).toBe(3);
    expect(s.best).toBe(3);
    expect(s.sample_size).toBe(3);
  });

  it("UNRESOLVED in the middle breaks the streak", () => {
    const s = selectFocusStreak([
      e("FOLLOWED_PLAN"),
      e("FOLLOWED_PLAN"),
      e("UNRESOLVED"),
      e("FOLLOWED_PLAN"),
      e("FOLLOWED_PLAN"),
      e("FOLLOWED_PLAN"),
    ]);
    expect(s.current).toBe(2);
    expect(s.best).toBe(3);
  });
});
