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

import { absorptionMeter, absorptionWords, deltaVelocity, deltaVelocityWords } from "./flowIndicators";

describe("plate 29 · Absorption Meter and Delta Velocity", () => {
  const base = Array.from({ length: 20 }, () => ({ open: 100, close: 101, high: 102, low: 100, volume: 100 }));
  it("heavy effort with little move reads high; a move on little effort reads low; ordinary ≈ 50 band", () => {
    expect(absorptionMeter([...base, { open: 100, close: 100.2, high: 101, low: 99.5, volume: 400 }])[20]).toBeGreaterThanOrEqual(90);
    expect(absorptionMeter([...base, { open: 100, close: 103, high: 103, low: 100, volume: 50 }])[20]).toBeLessThanOrEqual(30);
    expect(absorptionWords(72)).toBe("72 · heavy effort, little move");
  });
  it("delta per minute", () => {
    expect(deltaVelocity(300, 300)).toBe(60);
    expect(deltaVelocityWords(-42.25)).toBe("−42.3 /min");
  });
});
