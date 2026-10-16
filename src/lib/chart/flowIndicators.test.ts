import { describe, expect, it } from "vitest";
import { volumePace, volumePaceWords } from "./flowIndicators";

describe("plate 29 · Volume Pace", () => {
  it("reads each bar against the median of the bars before it", () => {
    const v = [...Array(20).fill(100), 160, 50];
    const p = volumePace(v);
    expect(p.slice(0, 20).every(Number.isNaN)).toBe(true);
    expect(p[20]).toBeCloseTo(1.6);
    expect(p[21]).toBeCloseTo(0.5);
  });
  it("one spike does not make the next bars look quiet (median, not mean)", () => {
    const v = [...Array(19).fill(100), 5000, 100];
    expect(volumePace(v)[20]).toBeCloseTo(1);
  });
  it("speaks as × normal", () => {
    expect(volumePaceWords(1.62)).toBe("1.6× normal");
    expect(volumePaceWords(NaN)).toBeNull();
  });
});
