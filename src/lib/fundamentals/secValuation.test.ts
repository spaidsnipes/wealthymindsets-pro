import { describe, expect, it } from "vitest";
import { secValuation } from "./secValuation";

const q = (end: string, revenue: number | null, netIncome: number, grossProfit = revenue! / 2, operatingIncome = revenue! / 4) =>
  ({ end, label: end, revenue, grossProfit, operatingIncome, netIncome, epsDiluted: null, derived: [] });

describe("secValuation — filings × price, nothing estimated", () => {
  it("computes TTM figures from the four newest quarters", () => {
    const v = secValuation([q("2026-03-31", 100, 20), q("2026-06-30", 100, 20), q("2025-12-31", 100, 20), q("2025-09-30", 100, 20), q("2025-06-30", 999, 999)], 10, 32, [
      { end: "2026-06-30", perShare: 0.25 }, { end: "2026-03-31", perShare: 0.25 }, { end: "2025-12-31", perShare: 0.25 }, { end: "2025-09-30", perShare: 0.25 }]);
    expect(v.ttmQuarters).toEqual(["2026-06-30", "2026-03-31", "2025-12-31", "2025-09-30"]);
    expect(v.marketCap).toBe(320);
    expect(v.ttmRevenue).toBe(400);
    expect(v.pe).toBe(4);
    expect(v.ps).toBe(0.8);
    expect(v.grossMargin).toBe(0.5);
    expect(v.netMargin).toBe(0.2);
    expect(v.dividendYield).toBeCloseTo(1 / 32);
  });
  it("leaves a figure null when an input is missing or a loss makes P/E meaningless", () => {
    const v = secValuation([q("2026-06-30", null, 5), q("2026-03-31", 100, -50), q("2025-12-31", 100, 5), q("2025-09-30", 100, 5)], 10, 32);
    expect(v.ttmRevenue).toBeNull();
    expect(v.ps).toBeNull();
    expect(v.pe).toBeNull();
    expect(v.dividendYield).toBeNull();
    expect(secValuation([], 10, 0).marketCap).toBeNull();
  });
});
