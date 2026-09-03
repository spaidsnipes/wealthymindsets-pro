import { describe, expect, it } from "vitest";
import {
  UNOBSERVED,
  formatOptionCount,
  formatOptionNumber,
  formatOptionPercent,
} from "./optionCellFormat";

describe("option cell format — absence is not a measurement", () => {
  it("renders an unquoted price as a dash, never 0.00", () => {
    expect(formatOptionNumber(undefined, 2)).toBe(UNOBSERVED);
    expect(formatOptionNumber(null, 2)).toBe(UNOBSERVED);
    // 0.00 on an ask reads as "free to buy" — the most dangerous fabrication.
    expect(formatOptionNumber(undefined, 2)).not.toBe("0.00");
  });

  it("rejects NaN, which `??` would have passed straight through", () => {
    expect(formatOptionNumber(Number.NaN, 2)).toBe(UNOBSERVED);
    expect(formatOptionPercent(Number.NaN)).toBe(UNOBSERVED);
    expect(formatOptionCount(Number.NaN)).toBe(UNOBSERVED);
  });

  it("rejects Infinity", () => {
    expect(formatOptionNumber(Number.POSITIVE_INFINITY, 2)).toBe(UNOBSERVED);
  });

  it("still renders a genuinely observed value", () => {
    expect(formatOptionNumber(1.234, 2)).toBe("1.23");
    expect(formatOptionNumber(0.00012, 4)).toBe("0.0001");
    expect(formatOptionPercent(0.2456)).toBe("24.6%");
    expect(formatOptionCount(12345)).toBe("12,345");
  });

  it("preserves an observed zero — it is a fact, not an absence", () => {
    // Open interest 0 means nobody holds it. Blanking that would destroy
    // real information just as surely as inventing it.
    expect(formatOptionCount(0)).toBe("0");
    expect(formatOptionNumber(0, 2)).toBe("0.00");
    expect(formatOptionPercent(0)).toBe("0.0%");
  });

  it("renders a negative greek correctly — puts have negative delta", () => {
    expect(formatOptionNumber(-0.42, 2)).toBe("-0.42");
  });
});

import { summariseOpenInterest } from "./optionCellFormat";

describe("open interest summary — totals only from what was observed", () => {
  it("skips unquoted strikes instead of counting them as zero", () => {
    const s = summariseOpenInterest([
      { cOI: 100, pOI: 50 },
      { cOI: undefined, pOI: 25 },
    ]);
    expect(s.callsOI).toBe(100);
    expect(s.putsOI).toBe(75);
    expect(s.observedCalls).toBe(1);
    expect(s.totalRows).toBe(2);
    expect(s.complete).toBe(false);
  });

  it("withholds the P/C ratio when no call interest was observed", () => {
    // The old code divided by Math.max(1, 0) and printed the put total as a
    // ratio — a sentiment reading conjured from nothing.
    const s = summariseOpenInterest([{ cOI: 0, pOI: 500 }]);
    expect(s.putCallRatio).toBeUndefined();
  });

  it("computes a real ratio when both sides are present", () => {
    const s = summariseOpenInterest([{ cOI: 200, pOI: 100 }]);
    expect(s.putCallRatio).toBe(0.5);
    expect(s.complete).toBe(true);
  });

  it("reports incomplete for an empty chain rather than complete-by-vacuity", () => {
    expect(summariseOpenInterest([]).complete).toBe(false);
    expect(summariseOpenInterest([]).putCallRatio).toBeUndefined();
  });

  it("ignores NaN open interest", () => {
    const s = summariseOpenInterest([{ cOI: Number.NaN, pOI: 10 }]);
    expect(s.callsOI).toBe(0);
    expect(s.observedCalls).toBe(0);
  });
});
