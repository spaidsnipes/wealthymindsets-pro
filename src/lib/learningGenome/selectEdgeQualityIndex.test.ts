import { describe, it, expect } from "vitest";

import { selectEdgeQualityIndex } from "./selectEdgeQualityIndex";
import type { LearningGenome, GenomeDimension } from "./selectLearningGenome";
import type { DayModelCoverage } from "./selectDayModelCoverage";

function d(score: number | undefined): GenomeDimension {
  return { score, sample_size: score === undefined ? 0 : 10, label: undefined };
}

function g(overrides: Partial<LearningGenome>): LearningGenome {
  return {
    perception: d(undefined),
    reasoning: d(undefined),
    process: d(undefined),
    transfer: d(undefined),
    strongest: undefined,
    weakest: undefined,
    headlineWeakness: undefined,
    ...overrides,
  };
}

const EMPTY_COVERAGE: DayModelCoverage = {
  m0: 0, m1: 0, m2: 0, unclassified: 0, sample_size: 0,
  classification_rate: undefined, m0_share: undefined, m1_share: undefined, m2_share: undefined,
};

describe("selectEdgeQualityIndex — canon §Personal Edge composite", () => {
  it("empty → index undefined", () => {
    const eqi = selectEdgeQualityIndex(g({}), EMPTY_COVERAGE);
    expect(eqi.index).toBeUndefined();
    expect(eqi.measured_max).toBe(0);
  });

  it("perfect all-dimensions → index 100", () => {
    const eqi = selectEdgeQualityIndex(
      g({
        reasoning: d(1),  // 30/30
        process: d(1),    // 30/30
        transfer: d(2),   // 20/20 (capped at +2R)
      }),
      { ...EMPTY_COVERAGE, sample_size: 10, classification_rate: 1 }, // 20/20
    );
    expect(eqi.index).toBe(100);
    expect(eqi.measured_max).toBe(100);
  });

  it("only plan adherence measured → index 100 * (score) with measured_max 30", () => {
    const eqi = selectEdgeQualityIndex(g({ reasoning: d(0.5) }), EMPTY_COVERAGE);
    // 15/30 * 100 = 50
    expect(eqi.index).toBe(50);
    expect(eqi.measured_max).toBe(30);
  });

  it("TRANSFER > +2R is capped at 20 points (no runaway inflation)", () => {
    const eqi = selectEdgeQualityIndex(g({ transfer: d(10) }), EMPTY_COVERAGE);
    // clamped to 2R → 20/20 * 100 = 100 (on a 20-max scale)
    expect(eqi.index).toBe(100);
    expect(eqi.components.live_r_capture!.points).toBe(20);
  });

  it("negative capture efficiency floors at 0 (canon: honest, not punished)", () => {
    const eqi = selectEdgeQualityIndex(g({ process: d(-0.5) }), EMPTY_COVERAGE);
    // clamped to 0 → 0/30 * 100 = 0
    expect(eqi.index).toBe(0);
    expect(eqi.components.capture_efficiency!.points).toBe(0);
  });

  it("negative TRANSFER floors at 0", () => {
    const eqi = selectEdgeQualityIndex(g({ transfer: d(-1) }), EMPTY_COVERAGE);
    expect(eqi.index).toBe(0);
    expect(eqi.components.live_r_capture!.points).toBe(0);
  });

  it("mixed measured / unmeasured → scaled to what is measured", () => {
    const eqi = selectEdgeQualityIndex(
      g({
        reasoning: d(1),  // 30/30 PASS
        process: d(0),    // 0/30
      }),
      EMPTY_COVERAGE,
    );
    // sum 30, max 60 → 50
    expect(eqi.index).toBe(50);
    expect(eqi.measured_max).toBe(60);
  });

  it("component reports its own points + max for tooltip rendering", () => {
    const eqi = selectEdgeQualityIndex(
      g({ reasoning: d(0.5), transfer: d(1) }),
      EMPTY_COVERAGE,
    );
    expect(eqi.components.plan_adherence).toEqual({ points: 15, max: 30 });
    expect(eqi.components.live_r_capture).toEqual({ points: 10, max: 20 });
  });

  it("sample_size = max of contributing dimensions", () => {
    const genome = g({
      perception: { score: 1, sample_size: 20, label: "" },
      reasoning: { score: 1, sample_size: 12, label: "" },
    });
    const coverage: DayModelCoverage = { ...EMPTY_COVERAGE, sample_size: 5, classification_rate: 1 };
    const eqi = selectEdgeQualityIndex(genome, coverage);
    expect(eqi.sample_size).toBe(20);
  });
});
