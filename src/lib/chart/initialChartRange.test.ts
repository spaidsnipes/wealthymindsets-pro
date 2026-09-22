import { describe, expect, it } from "vitest";
import { initialChartRange } from "./initialChartRange";

describe("initialChartRange", () => {
  const base = {
    synthetic: false,
    intraday: true,
    intervalSec: 900,
    barCount: 100,
    barSpacing: 9,
    viewportWidth: 1200,
  };

  it("keeps a naturally fitting intraday session in view", () => {
    expect(initialChartRange(base)).toBe("fit");
  });

  it("does not flatten deep 15-minute futures history", () => {
    expect(initialChartRange({ ...base, barCount: 2296 })).toBe("latest");
  });

  it("preserves the complete one-minute RTH session", () => {
    expect(initialChartRange({ ...base, intervalSec: 60, barCount: 389, barSpacing: 11 })).toBe("fit");
  });

  it("does not fit several sessions of one-minute bars", () => {
    expect(initialChartRange({ ...base, intervalSec: 60, barCount: 800, barSpacing: 11 })).toBe("latest");
  });

  it("keeps synthetic bricks together and daily history near the latest bar", () => {
    expect(initialChartRange({ ...base, synthetic: true, barCount: 2296 })).toBe("fit");
    expect(initialChartRange({ ...base, intraday: false })).toBe("latest");
  });

  it("does not assume a pane width before measurement", () => {
    expect(initialChartRange({ ...base, viewportWidth: 0 })).toBe("latest");
  });
});
