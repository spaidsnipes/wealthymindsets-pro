import { describe, expect, it } from "vitest";
import { journalRecordsToEdgeEntries } from "./journalEdgeAdapter";

describe("Journal to Proof Lane edge adapter", () => {
  it("preserves truthful current fields and source order", () => {
    const result = journalRecordsToEdgeEntries([
      { date: "2026-08-23", result: "win", realizedR: 1.5, processQuality: "FOLLOWED_PLAN", mfeR: 2, maeR: -0.4 },
      { date: "2026-08-24", result: "loss", realizedR: -1, processQuality: "BROKE_RULES" },
    ]);
    expect(result).toEqual([
      { date: "2026-08-23", result: "win", realizedR: 1.5, processQuality: "FOLLOWED_PLAN", mfeR: 2, maeR: -0.4 },
      { date: "2026-08-24", result: "loss", realizedR: -1, processQuality: "BROKE_RULES", mfeR: undefined, maeR: undefined },
    ]);
  });

  it("drops invalid records/results and never coerces them to breakeven", () => {
    expect(journalRecordsToEdgeEntries([null, {}, { date: "", result: "win" }, { date: "2026-08-23", result: "profit" }])).toEqual([]);
  });

  it("omits nonfinite measurements, keeps missing R unclassified, and never proxies from P&L", () => {
    expect(journalRecordsToEdgeEntries([{
      date: "2026-08-23", result: "win", processQuality: "OLD_VALUE",
      realizedR: Number.NaN, mfeR: Number.POSITIVE_INFINITY, maeR: "-1", pnl: 500, entry: 100, size: 1,
    }])).toEqual([{
      date: "2026-08-23", result: "win", processQuality: "UNRESOLVED",
      realizedR: undefined, mfeR: undefined, maeR: undefined,
    }]);
  });

  it("is deterministic for identical input", () => {
    const input = [{ date: "2026-08-23", result: "be", processQuality: "UNRESOLVED", realizedR: 0 }];
    expect(journalRecordsToEdgeEntries(input)).toEqual(journalRecordsToEdgeEntries(input));
  });
});

