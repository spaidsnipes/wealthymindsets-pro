import { describe, expect, it } from "vitest";
import { developmentTimeline } from "./developmentTimeline";

describe("Development Timeline — chapters from evidence, numbers on every line", () => {
  it("assembles five chapters; says so when evidence is missing", () => {
    const ch = developmentTimeline({
      months: [{ month: "2025-01", trades: 28, days: 6, tradesPerDay: 4.7, winRate: 0.32, expectancy: -0.45, avgWin: 40, avgLoss: -19.8, pastSecondShare: 1, bracketShare: 0 }],
      windows: [{ label: "Last 100 trades", n: 100, winRate: 0.28, expectancy: -1.66, avgWin: 6, avgLoss: -4.8, net: -166, enough: true }, { label: "Whole record", n: 975, winRate: 0.37, expectancy: -2.91, avgWin: 12.7, avgLoss: -12, net: -2838, enough: true }],
      changes: [],
      patterns: [{ id: "ABOVE_USUAL_SIZE", label: "Size at least twice the usual", n: 131, expectancy: -9.64, withoutExpectancy: -1.87, supporting: 90, contradicting: 41, firstSeen: "2025-01-27T00:00:00Z", lastSeen: "2026-09-21T00:00:00Z", recentShare: 0.08, earlierShare: 0.14, evidence: "SUPPORTED" }],
      edge: { universe: 975, overallExpectancy: -2.91, daily: {} as never, dimensions: [] },
    });
    expect(ch.map(c => c.id)).toEqual(["who", "kept", "changed", "breaks", "edge"]);
    expect(ch[0].lines[0]).toBe("2025-01: 28 trades on 6 days (4.7/day), win 32%, −$0.45 per trade, bracket at entry 0%.");
    expect(ch[1].lines[0]).toMatch(/Size at least twice the usual: 131 trades/);
    expect(ch[2].lines).toEqual(["No large month-to-month shift yet."]);
    expect(ch[3].lines).toEqual(["No supported costly pattern is as frequent lately as before."]);   // 8% < 14%: rarer lately
    expect(ch[4].lines[1]).toMatch(/a measured edge has not shown up/);
  });
});
