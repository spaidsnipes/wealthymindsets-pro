import { describe, expect, it } from "vitest";
import { arrivalRipple, bigTradeTier, percentileFromSorted, sortedSessionSizes } from "./bigTradeTier";
import { sessionSizePercentile } from "./footprintCanon";

describe("big-trade tier — weight from a real statistic", () => {
  it("crowns the 95th and the whale at the 99th", () => {
    expect(bigTradeTier(0.987)).toBe("CROWN");
    expect(bigTradeTier(0.995)).toBe("WHALE");
    expect(bigTradeTier(0.5)).toBe("BASE");
  });
  it("never crowns on thin evidence", () => {
    expect(bigTradeTier(null)).toBe("BASE");
    expect(bigTradeTier(undefined)).toBe("BASE");
    expect(bigTradeTier(NaN)).toBe("BASE");
  });
  it("ripples only while arriving and only with motion on", () => {
    expect(arrivalRipple(1800, 1000, true, true)).toBeCloseTo(0.5);
    expect(arrivalRipple(1800, 1000, false, true)).toBeNull();
    expect(arrivalRipple(1800, 1000, true, false)).toBeNull();
  });
});

describe("sorted percentile = the canon owner's answer", () => {
  it("matches sessionSizePercentile on the same prints", () => {
    const bars = [[...Array(40)].map((_, i) => ({ bid: i, ask: (i * 7) % 13 }))];
    const sorted = sortedSessionSizes(bars);
    for (const size of [1, 5, 12, 30, 60]) {
      expect(percentileFromSorted(sorted, size)).toBe(sessionSizePercentile(size, bars as never).pct);
    }
  });
});
