import { describe, it, expect } from "vitest";
import { captureEfficiency, averageCapture } from "./captureEfficiency";

describe("captureEfficiency — canon §7 Management Studio", () => {
  it("70% capture — realizedR 1.4 / mfeR 2.0", () => {
    expect(captureEfficiency({ realizedR: 1.4, mfeR: 2.0 })).toBeCloseTo(0.7, 6);
  });
  it("100% capture — trader nailed the exit at the MFE", () => {
    expect(captureEfficiency({ realizedR: 2.0, mfeR: 2.0 })).toBe(1);
  });
  it("negative capture — printed favorable, gave it back + took a loss", () => {
    expect(captureEfficiency({ realizedR: -0.5, mfeR: 2.0 })).toBeCloseTo(-0.25, 6);
  });
  it("undefined when realizedR missing (canon §4 opt-in R math)", () => {
    expect(captureEfficiency({ mfeR: 2.0 })).toBeUndefined();
  });
  it("undefined when mfeR missing (nothing to divide against)", () => {
    expect(captureEfficiency({ realizedR: 1.4 })).toBeUndefined();
  });
  it("undefined when mfeR is zero (never returns 0/0 = NaN)", () => {
    expect(captureEfficiency({ realizedR: 1.4, mfeR: 0 })).toBeUndefined();
  });
  it("undefined when mfeR is negative (nonsensical: max favorable can't be negative)", () => {
    expect(captureEfficiency({ realizedR: 1.4, mfeR: -1 })).toBeUndefined();
  });
  it("undefined when either value is NaN / Infinity", () => {
    expect(captureEfficiency({ realizedR: NaN, mfeR: 2 })).toBeUndefined();
    expect(captureEfficiency({ realizedR: 1, mfeR: Infinity })).toBeUndefined();
  });
});

describe("averageCapture — sample rollup", () => {
  it("empty sample → avgCapture undefined + sampleSize 0", () => {
    expect(averageCapture([])).toEqual({ avgCapture: undefined, sampleSize: 0 });
  });
  it("excludes entries missing R or MFE (canon: never fabricate)", () => {
    const r = averageCapture([
      { realizedR: 1.0, mfeR: 2.0 }, // 50% ✓
      { realizedR: 0.5, mfeR: 1.0 }, // 50% ✓
      { realizedR: 1.0 },            // missing MFE — excluded
      { mfeR: 2.0 },                 // missing R — excluded
    ]);
    expect(r.sampleSize).toBe(2);
    expect(r.avgCapture).toBeCloseTo(0.5, 6);
  });
  it("Founder-realistic Week-One M1 sample (70% avg)", () => {
    const r = averageCapture([
      { realizedR: 1.4, mfeR: 2.0 },   // 70%
      { realizedR: 1.5, mfeR: 2.0 },   // 75%
      { realizedR: 0.9, mfeR: 1.5 },   // 60%
      { realizedR: -0.5, mfeR: 2.0 },  // -25% (gave it all back)
    ]);
    expect(r.sampleSize).toBe(4);
    const expected = (0.7 + 0.75 + 0.6 + -0.25) / 4;
    expect(r.avgCapture).toBeCloseTo(expected, 6);
  });
});
