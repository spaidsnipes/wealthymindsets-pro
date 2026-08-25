import { describe, it, expect } from "vitest";

import { selectDayModelCoverage } from "./selectDayModelCoverage";
import type { DayModelEntry } from "./selectDayModelCoverage";

function e(dayModel?: DayModelEntry["dayModel"]): DayModelEntry {
  return { date: "2026-08-25", result: "win", processQuality: "FOLLOWED_PLAN", dayModel };
}

describe("selectDayModelCoverage — canon §3 Model 0/1/2 distribution", () => {
  it("empty → all zeros, ratios undefined", () => {
    const c = selectDayModelCoverage([]);
    expect(c.m0).toBe(0);
    expect(c.m1).toBe(0);
    expect(c.m2).toBe(0);
    expect(c.unclassified).toBe(0);
    expect(c.classification_rate).toBeUndefined();
    expect(c.m1_share).toBeUndefined();
  });

  it("all unclassified → 0% classification, share ratios undefined", () => {
    const c = selectDayModelCoverage([e(), e(), e()]);
    expect(c.unclassified).toBe(3);
    expect(c.classification_rate).toBe(0);
    expect(c.m1_share).toBeUndefined();
  });

  it("balanced 1/1/1 → shares 33/33/33, 100% classified", () => {
    const c = selectDayModelCoverage([e("M0"), e("M1"), e("M2")]);
    expect(c.classification_rate).toBe(1);
    expect(c.m0_share).toBeCloseTo(1 / 3);
    expect(c.m1_share).toBeCloseTo(1 / 3);
    expect(c.m2_share).toBeCloseTo(1 / 3);
  });

  it("mixed classified + unclassified → classification_rate < 1", () => {
    const c = selectDayModelCoverage([e("M1"), e("M1"), e(), e()]);
    expect(c.classification_rate).toBe(0.5);
    expect(c.m1_share).toBe(1); // 2/2 classified are M1
  });

  it("M1-heavy trader → high m1_share (Personal Edge signal)", () => {
    const c = selectDayModelCoverage([e("M1"), e("M1"), e("M1"), e("M2")]);
    expect(c.m1_share).toBe(0.75);
    expect(c.m2_share).toBe(0.25);
    expect(c.m0_share).toBe(0);
  });

  it("counts always sum to sample_size", () => {
    const c = selectDayModelCoverage([e("M0"), e("M1"), e("M2"), e()]);
    expect(c.m0 + c.m1 + c.m2 + c.unclassified).toBe(c.sample_size);
  });
});
