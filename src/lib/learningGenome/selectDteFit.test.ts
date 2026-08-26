import { describe, it, expect } from "vitest";

import { selectDteFit } from "./selectDteFit";

describe("selectDteFit — canon §8 DTE LAW", () => {
  it("INSUFFICIENT_INPUT when dteDays missing / non-positive", () => {
    for (const dte of [0, -1, Number.NaN, Infinity]) {
      const r = selectDteFit({ dteDays: dte, expectedHoldDays: 1 });
      expect(r.verdict).toBe("INSUFFICIENT_INPUT");
    }
  });

  it("INSUFFICIENT_INPUT when expectedHoldDays missing / non-positive", () => {
    const r = selectDteFit({ dteDays: 5, expectedHoldDays: 0 });
    expect(r.verdict).toBe("INSUFFICIENT_INPUT");
  });

  it("TOO_SHORT when dte < expected", () => {
    const r = selectDteFit({ dteDays: 1, expectedHoldDays: 3 });
    expect(r.verdict).toBe("TOO_SHORT");
    expect(r.ratio).toBeCloseTo(1 / 3);
  });

  it("OPTIMAL when dte === expected (ratio 1.0)", () => {
    const r = selectDteFit({ dteDays: 3, expectedHoldDays: 3 });
    expect(r.verdict).toBe("OPTIMAL");
    expect(r.ratio).toBe(1);
  });

  it("OPTIMAL when dte within 1.5x buffer", () => {
    const r = selectDteFit({ dteDays: 4, expectedHoldDays: 3 });
    expect(r.verdict).toBe("OPTIMAL");
  });

  it("OPTIMAL at exactly 1.5x boundary (inclusive)", () => {
    const r = selectDteFit({ dteDays: 3, expectedHoldDays: 2 });
    // ratio = 1.5, exactly at threshold — canon inclusive → OPTIMAL
    expect(r.ratio).toBe(1.5);
    expect(r.verdict).toBe("OPTIMAL");
  });

  it("OVER_TIMED just above 1.5x boundary", () => {
    const r = selectDteFit({ dteDays: 3.1, expectedHoldDays: 2 });
    expect(r.verdict).toBe("OVER_TIMED");
    expect(r.ratio).toBeGreaterThan(1.5);
  });

  it("OVER_TIMED for 30 DTE on a 1-day thesis (canonical example)", () => {
    const r = selectDteFit({ dteDays: 30, expectedHoldDays: 1 });
    expect(r.verdict).toBe("OVER_TIMED");
    expect(r.ratio).toBe(30);
  });

  it("Every verdict carries a canon anchor", () => {
    for (const input of [
      { dteDays: 0, expectedHoldDays: 1 },
      { dteDays: 1, expectedHoldDays: 3 },
      { dteDays: 3, expectedHoldDays: 3 },
      { dteDays: 10, expectedHoldDays: 1 },
    ]) {
      const r = selectDteFit(input);
      expect(r.canon.startsWith("§")).toBe(true);
    }
  });
});
