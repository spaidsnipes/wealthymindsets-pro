import { describe, expect, it } from "vitest";

import { latestShares, pickConcept, quarterValues, secDividends, secQuarters, type SecFactRow } from "./secEdgar";

const q = (start: string, end: string, val: number, filed = "2026-01-01"): SecFactRow => ({ start, end, val, filed, form: "10-Q" });
const year = (start: string, end: string, val: number): SecFactRow => ({ start, end, val, filed: "2026-01-30", form: "10-K" });

const REV: SecFactRow[] = [
  q("2025-01-01", "2025-03-31", 100),
  q("2025-04-01", "2025-06-30", 110),
  q("2025-07-01", "2025-09-30", 120),
  year("2025-01-01", "2025-12-31", 470),
  // nine-month year-to-date rows are neither quarters nor years
  { start: "2025-01-01", end: "2025-09-30", val: 330, filed: "2025-10-20" },
];

describe("SEC quarters", () => {
  it("derives the fourth quarter as the year minus three filed quarters, and marks it", () => {
    const m = quarterValues(REV, true);
    expect(m.get("2025-12-31")).toEqual({ val: 140, derived: true });
    expect(m.get("2025-09-30")).toEqual({ val: 120, derived: false });
    expect(m.size).toBe(4);
  });

  it("never derives per-share figures", () => {
    const eps = [q("2025-01-01", "2025-03-31", 0.1), q("2025-04-01", "2025-06-30", 0.1), q("2025-07-01", "2025-09-30", 0.1), year("2025-01-01", "2025-12-31", 0.5)];
    const out = secQuarters({ revenue: REV, grossProfit: [], operatingIncome: [], netIncome: [], epsDiluted: eps });
    expect(out[0]).toMatchObject({ end: "2025-12-31", revenue: 140, epsDiluted: null, derived: ["revenue"] });
    expect(out[1]).toMatchObject({ end: "2025-09-30", epsDiluted: 0.1, derived: [] });
  });

  it("a later filing restates an earlier one for the same period", () => {
    const m = quarterValues([q("2025-01-01", "2025-03-31", 100, "2025-04-20"), q("2025-01-01", "2025-03-31", 95, "2026-04-20")], false);
    expect(m.get("2025-03-31")?.val).toBe(95);
  });

  it("picks the revenue name filed most recently", () => {
    const old = [q("2017-01-01", "2017-03-31", 1)];
    expect(pickConcept({ SalesRevenueNet: old, Revenues: REV, Missing: null })).toBe(REV);
  });

  it("dividends newest first; shares from the latest cover page", () => {
    expect(secDividends([q("2025-01-01", "2025-03-31", 0.24), q("2025-04-01", "2025-06-30", 0.25)])).toEqual([{ end: "2025-06-30", perShare: 0.25 }, { end: "2025-03-31", perShare: 0.24 }]);
    expect(latestShares([{ end: "2026-04-01", val: 10 }, { end: "2026-07-16", val: 12 }])).toEqual({ shares: 12, asOf: "2026-07-16" });
    expect(latestShares([])).toBeNull();
  });
});
