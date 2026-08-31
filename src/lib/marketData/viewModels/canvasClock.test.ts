import { describe, it, expect } from "vitest";
import { quantizeClock, CANVAS_CLOCK_BUCKET_MS } from "./canvasClock";

describe("quantizeClock", () => {
  it("floors a timestamp to the bucket boundary below it", () => {
    expect(quantizeClock(0, 5_000)).toBe(0);
    expect(quantizeClock(4_999, 5_000)).toBe(0);
    expect(quantizeClock(5_000, 5_000)).toBe(5_000);
    expect(quantizeClock(5_001, 5_000)).toBe(5_000);
    expect(quantizeClock(12_345, 5_000)).toBe(10_000);
  });

  it("is monotonic non-decreasing as time advances (age can never go backwards)", () => {
    let prev = -Infinity;
    for (let t = 0; t <= 60_000; t += 137) {
      const q = quantizeClock(t, CANVAS_CLOCK_BUCKET_MS);
      expect(q).toBeGreaterThanOrEqual(prev);
      prev = q;
    }
  });

  it("advances by exactly one bucket after one bucket of real time", () => {
    const base = 1_700_000_000_000; // arbitrary real-ish epoch ms
    const b = CANVAS_CLOCK_BUCKET_MS;
    const q0 = quantizeClock(base, b);
    const q1 = quantizeClock(base + b, b);
    expect(q1 - q0).toBe(b);
  });

  it("holds steady within a single bucket (no re-render churn mid-bucket)", () => {
    const b = 5_000;
    const start = quantizeClock(20_000, b);
    // every sub-bucket sample maps to the same quantized value
    for (const delta of [0, 1, 999, 2_500, 4_999]) {
      expect(quantizeClock(20_000 + delta, b)).toBe(start);
    }
  });

  it("degrades safely on non-finite / non-positive inputs (no NaN timestamps)", () => {
    expect(quantizeClock(Number.NaN, 5_000)).toBe(0);
    expect(quantizeClock(Infinity, 5_000)).toBe(0);
    expect(quantizeClock(10_000, 0)).toBe(10_000);
    expect(quantizeClock(10_000, -5_000)).toBe(10_000);
    expect(quantizeClock(10_000, Number.NaN)).toBe(10_000);
  });

  it("ships a sane default cadence (advances within a few seconds, not minutes)", () => {
    expect(CANVAS_CLOCK_BUCKET_MS).toBeGreaterThan(0);
    expect(CANVAS_CLOCK_BUCKET_MS).toBeLessThanOrEqual(15_000);
  });
});
