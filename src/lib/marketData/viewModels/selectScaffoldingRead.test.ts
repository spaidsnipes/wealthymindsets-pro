import { describe, expect, it } from "vitest";

import selectScaffoldingRead from "./selectScaffoldingRead";
import type { AbsorptionAnatomyVM, AnatomyBar } from "@/lib/marketData/selectAbsorptionAnatomy";
import type { MarketStructureVM } from "./selectMarketStructure";

const bar = (i: number, close: number, effortNorm: number, displacementNorm: number, delta: number | null = null): AnatomyBar => ({
  time: i * 60, open: close - 0.5, high: close + 0.5, low: close - 1, close,
  effort: effortNorm * 100, effortNorm, delta, displacement: 0.5, displacementNorm, absorbing: false,
});
const anatomy = (bars: AnatomyBar[], over: Partial<AbsorptionAnatomyVM> = {}) => ({
  basis: "VOLUME", measured: true, bars, zones: [], windowBars: bars.length,
  effortConcentration: null, effortQualifyingBars: 0, zoneQualificationPossible: true, effortSpreadNote: null, ...over,
} as AbsorptionAnatomyVM);
const structure = (over: Partial<MarketStructureVM> = {}): MarketStructureVM => ({
  measured: true, lookback: 3, barCount: 20, unconfirmedBars: 3, confirmationLagNote: "",
  swingHighs: [], swingLows: [], lastSwingHigh: null, lastSwingLow: null,
  bias: "HIGHER_HIGHS", biasNote: "the last two highs each printed higher", insufficientNote: null, ...over,
});
// Effort rises, displacement slows: the plate's own story.
const story = Array.from({ length: 20 }, (_, i) => bar(i, 100 + i, i < 10 ? 0.3 : 0.8, i < 10 ? 0.8 : 0.3));

describe("one read, three depths", () => {
  it("refuses honestly without measured effort", () => {
    expect(selectScaffoldingRead({ structure: null, absorption: null, exhaustion: null }).reason).toBe("UNMEASURED_EFFORT");
    expect(selectScaffoldingRead({ structure: null, absorption: anatomy(story.slice(0, 4)), exhaustion: null }).reason).toBe("TOO_FEW_BARS");
  });

  it("FOUNDATION: six steps, each with a verdict and the fact behind it", () => {
    const v = selectScaffoldingRead({ structure: structure(), absorption: anatomy(story), exhaustion: null });
    expect(v.steps.map(s => s.n)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(v.steps[0].verdict).toBe("HIGHER HIGHS & LOWS");
    expect(v.steps[1].verdict).toBe("EFFORT RISING");
    expect(v.steps[2].verdict).toBe("DISPLACEMENT SLOWING");
    for (const s of v.steps) expect(s.evidence.length).toBeGreaterThan(5);
  });

  it("INTERMEDIATE compresses the SAME verdicts into three dynamics", () => {
    const v = selectScaffoldingRead({ structure: structure(), absorption: anatomy(story), exhaustion: null });
    expect(v.dynamics.map(d => d.label)).toEqual(["EFFORT", "RESULT", "LOCATION"]);
    expect(v.dynamics[0].trend).toBe("UP");
    expect(v.dynamics[1].trend).toBe("DOWN");
    expect(v.caution).toBe(true);
    expect(v.cautionFlags).toContain("effort rising without result");
    expect(v.posture).toBe("CAUTION");
  });

  it("PRO: curves run 0→1 and result-per-effort is a plain measured ratio", () => {
    const v = selectScaffoldingRead({ structure: structure(), absorption: anatomy(story), exhaustion: null });
    expect(v.effortCurve).toHaveLength(20);
    expect(v.effortCurve.at(-1)).toBeCloseTo(1);
    expect(v.resultCurve.at(-1)).toBeCloseTo(1);
    // recent half: effort share 8/11, result share 3/11 → 0.375
    expect(v.resultPerEffort).toBeCloseTo(0.375);
    expect(v.conversion).toBe("NOT CONVERTING");
  });

  it("names a side ONLY on a delta basis", () => {
    const vol = selectScaffoldingRead({ structure: structure(), absorption: anatomy(story), exhaustion: null });
    expect(vol.steps[1].evidence).toMatch(/side unknown/);
    const sided = story.map(b => ({ ...b, delta: 10 }));
    const d = selectScaffoldingRead({ structure: structure(), absorption: anatomy(sided, { basis: "SIGNED_DELTA" }), exhaustion: null });
    expect(d.steps[1].verdict).toBe("BUYERS OUT-TRADING");
    expect(d.dynamics[0].label).toBe("BUYER EFFORT");
  });

  it("LOCATION reads the nearest confirmed swing on this timeframe, never an HTF", () => {
    const v = selectScaffoldingRead({
      structure: structure({ swingHighs: [{ time: 0, price: 120 }], swingLows: [{ time: 60, price: 101 }] }),
      absorption: anatomy(story), exhaustion: null,
    });
    // last close 119, median range 1.5 → 0.7 ranges below 120
    expect(v.steps[3].verdict).toBe("AT A SWING ABOVE");
    expect(v.swingAbove).toBe(120);
    expect(v.cautionFlags).toContain("pushing into a swing above");
    expect(JSON.stringify(v)).not.toMatch(/HTF/);
  });

  it("carries no probability, star or score field — and says so in step 6", () => {
    const v = selectScaffoldingRead({ structure: structure(), absorption: anatomy(story), exhaustion: null });
    expect(Object.keys(v).some(k => /prob|star|score|confidence/i.test(k))).toBe(false);
    expect(v.steps[5].task).toMatch(/no probability/);
    expect(JSON.stringify(v)).not.toMatch(/★|%\s*confidence/);
  });
});
