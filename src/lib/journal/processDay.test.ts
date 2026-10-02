import { describe, expect, it } from "vitest";
import { gradeDay, parseProcessDays, processVsPnl, tradingDays } from "./processDay";
import type { Episode } from "@/lib/broker/webullLedger";

describe("Process Before P&L — the trader grades the day; P&L stays beside it", () => {
  it("grades only a fully scored day, on the §54 bands", () => {
    expect(gradeDay({ prep: 2, classify: 2 })).toBeNull();
    expect(gradeDay({ prep: 2, classify: 2, authorize: 2, risk: 1, journal: 1 })).toEqual({ total: 8, grade: "A PROCESS DAY" });
    expect(gradeDay({ prep: 1, classify: 1, authorize: 2, risk: 1, journal: 1 })).toEqual({ total: 6, grade: "B" });
    expect(gradeDay({ prep: 1, classify: 1, authorize: 1, risk: 1, journal: 0 })).toEqual({ total: 4, grade: "C" });
    expect(gradeDay({ prep: 0, classify: 1, authorize: 0, risk: 1, journal: 1 })).toEqual({ total: 3, grade: "PROCESS FAILURE / REVIEW" });
  });
  it("a red day can be an A day; a green day can be a failure", () => {
    const ep = (open: string, net: number) => ({ label: "RECONSTRUCTED", net, fees: 0.1, openedAt: open } as unknown as Episode);
    const days = tradingDays([ep("2026-10-01T14:00:00Z", -20), ep("2026-10-01T15:00:00Z", 5), ep("2026-10-02T14:00:00Z", 40)]);
    expect(days.map(d => [d.day, d.trades, d.net])).toEqual([["2026-10-02", 1, 40], ["2026-10-01", 2, -15]]);
    const scores = parseProcessDays(JSON.stringify({
      "2026-10-01": { prep: 2, classify: 2, authorize: 2, risk: 2, journal: 2 },
      "2026-10-02": { prep: 0, classify: 0, authorize: 1, risk: 0, journal: 1 },
      "bad-key": { prep: 2 },
    }));
    expect(processVsPnl(days, scores)).toEqual({ aRed: 1, aGreen: 0, failRed: 0, failGreen: 1, graded: 2 });
  });
});
