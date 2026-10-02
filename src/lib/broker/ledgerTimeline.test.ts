import { describe, expect, it } from "vitest";
import { ledgerTimeline, whatChanged } from "./ledgerTimeline";
import type { Episode } from "./webullLedger";

const ep = (i: number, day: string, net: number, bracket = false) => ({
  id: `e${i}`, label: "RECONSTRUCTED", net, openedAt: `${day}T14:${String(i % 60).padStart(2, "0")}:00Z`, closedAt: `${day}T15:${String(i % 60).padStart(2, "0")}:00Z`,
  entries: [{ comboType: bracket ? "MASTER" : "NORMAL" }],
} as unknown as Episode);

describe("temporal personal edge — recent windows beside the whole record", () => {
  it("windows say when they are too small; months carry behaviour, not verdicts", () => {
    const eps = [
      ...Array.from({ length: 30 }, (_, i) => ep(i, "2026-08-03", i % 3 === 0 ? 30 : -10)),       // Aug: one day, 30 trades
      ...Array.from({ length: 10 }, (_, i) => ep(100 + i, `2026-09-${String(1 + i).padStart(2, "0")}`, 15, true)), // Sep: 10 days, 1 each, bracketed wins
    ];
    const t = ledgerTimeline(eps);
    expect(t.windows.map(w => [w.label, w.n, w.enough])).toEqual([["Last 20 trades", 20, true], ["Last 50 trades", 40, false], ["Last 100 trades", 40, false], ["Whole record", 40, true]]);
    expect(t.windows[0].winRate).toBeCloseTo(13 / 20);
    expect(t.months).toEqual([
      expect.objectContaining({ month: "2026-08", trades: 30, days: 1, tradesPerDay: 30, pastSecondShare: 1, bracketShare: 0 }),
      expect.objectContaining({ month: "2026-09", trades: 10, days: 10, tradesPerDay: 1, pastSecondShare: 0, bracketShare: 1, winRate: 1 }),
    ]);
  });

  it("what changed: only between months with enough trades, past noise, both values named", () => {
    const m = (month: string, trades: number, bracketShare: number, tradesPerDay: number, avgLoss: number) => ({ month, trades, days: 10, tradesPerDay, winRate: 0.4, expectancy: -1, avgWin: 10, avgLoss, pastSecondShare: 0.5, bracketShare });
    const changes = whatChanged([m("2026-05", 55, 0, 4, -14), m("2026-06", 8, 1, 1, -2), m("2026-07", 101, 0.6, 1.5, -5)]);
    expect(changes.map(c => [c.from, c.month, c.measure, c.before, c.after])).toEqual([
      ["2026-05", "2026-07", "Entries with a bracket attached", "0%", "60%"],
      ["2026-05", "2026-07", "Trades per trading day", "4", "1.5"],
      ["2026-05", "2026-07", "Average losing trade", "−$14.00", "−$5.00"],
    ]);
  });
});
