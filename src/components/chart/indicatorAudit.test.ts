import { describe, expect, it } from "vitest";
import { ichimoku, isoWeekKey, periodPivots, pivotPoints, priorSessionOHLC } from "./indicators";
import { sessionWindowFor } from "@/lib/marketData/sessionWindow";
import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";

const bar = (t: number, o: number, h: number, l: number, c: number): LegacyOhlcvTuple => ({ time: t, open: o, high: h, low: l, close: c, volume: 1 } as LegacyOhlcvTuple);

describe("indicator audit (2026-10-08)", () => {
  it("pivots come from the PRIOR completed session, never the forming bar", () => {
    const win = sessionWindowFor("BTC-USD", "1h", false);
    // Day 1 (UTC-ish ET days): 3 bars; day 2: 1 forming bar far away in price.
    const d1 = Date.UTC(2026, 9, 6, 15) / 1000, d2 = Date.UTC(2026, 9, 7, 15) / 1000;
    const bars = [bar(d1, 10, 12, 9, 11), bar(d1 + 3600, 11, 15, 10, 14), bar(d1 + 7200, 14, 14, 8, 13), bar(d2, 100, 101, 99, 100)];
    const prior = priorSessionOHLC(bars, win);
    expect(prior).toEqual({ open: 10, high: 15, low: 8, close: 13 });
    const pv = pivotPoints(bars, "standard", win);
    expect(pv.pp).toBeCloseTo((15 + 8 + 13) / 3, 10);
    // Daily bars are whole sessions: the bar before the newest.
    const dwin = sessionWindowFor("BTC-USD", "1D", false);
    expect(priorSessionOHLC(bars, dwin)).toEqual({ open: 14, high: 14, low: 8, close: 13 });
    // No prior session → no levels (never the forming bar's).
    expect(Number.isNaN(pivotPoints([bar(d2, 1, 2, 0, 1)], "standard", win).pp)).toBe(true);
  });

  it("Ichimoku: spans plotted 26 ahead of their source, the lagging span 26 back", () => {
    const bars = Array.from({ length: 80 }, (_, i) => bar(i * 60, i, i + 1, i - 1, i));
    const ich = ichimoku(bars);
    expect(ich.senkouA.slice(0, 26).every(v => Number.isNaN(v))).toBe(true);
    expect(ich.chikou[0]).toBe(bars[26].close);
    expect(ich.chikou.slice(-26).every(v => Number.isNaN(v))).toBe(true);
  });
});

describe("Weekly / Monthly Pivots — the prior completed period (2026-10-08)", () => {
  const win = sessionWindowFor("BTC-USD", "1D", false);
  const day = (y: number, m: number, d: number, o: number, h: number, l: number, c: number) => bar(Date.UTC(y, m - 1, d) / 1000, o, h, l, c);

  it("ISO weeks: Monday starts the week; the Thursday decides the year", () => {
    expect(isoWeekKey("2026-10-05")).toBe("2026-W41"); // Monday
    expect(isoWeekKey("2026-10-11")).toBe("2026-W41"); // Sunday, same week
    expect(isoWeekKey("2026-10-12")).toBe("2026-W42");
    expect(isoWeekKey("2027-01-01")).toBe("2026-W53"); // a Friday: still 2026's last week
  });

  it("weekly: high / low / close of the prior ISO week, not the forming bar", () => {
    const bars = [
      day(2026, 9, 25, 5, 6, 4, 5),                                   // W39 — proves W40 is fully loaded
      day(2026, 9, 28, 10, 12, 9, 11), day(2026, 9, 30, 11, 20, 8, 15), day(2026, 10, 2, 15, 16, 10, 14), // W40
      day(2026, 10, 5, 100, 110, 90, 105),                             // W41, forming
    ];
    const pv = periodPivots(bars, win, "WEEK");
    expect(pv.drawn).toBe(true);
    if (pv.drawn) {
      expect(pv.period).toBe("2026-W40");
      expect(pv.pp).toBeCloseTo((20 + 8 + 14) / 3, 10);
      expect(pv.r1).toBeCloseTo(2 * pv.pp - 8, 10);
      expect(pv.s1).toBeCloseTo(2 * pv.pp - 20, 10);
    }
  });

  it("monthly: the prior calendar month", () => {
    const bars = [day(2026, 8, 31, 1, 2, 1, 2), day(2026, 9, 1, 10, 30, 9, 11), day(2026, 9, 30, 11, 12, 5, 20), day(2026, 10, 1, 100, 101, 99, 100)];
    const pv = periodPivots(bars, win, "MONTH");
    expect(pv).toMatchObject({ drawn: true, period: "2026-09" });
    if (pv.drawn) expect(pv.pp).toBeCloseTo((30 + 5 + 20) / 3, 10);
  });

  it("withholds by name: no prior period, a prior period not fully loaded, no session clock", () => {
    expect(periodPivots([day(2026, 10, 5, 1, 2, 1, 2), day(2026, 10, 6, 1, 2, 1, 2)], win, "WEEK")).toEqual({ drawn: false, reason: "NO_PRIOR_PERIOD" });
    expect(periodPivots([day(2026, 10, 2, 1, 2, 1, 2), day(2026, 10, 5, 1, 2, 1, 2)], win, "WEEK")).toEqual({ drawn: false, reason: "PRIOR_PERIOD_NOT_FULLY_LOADED" });
    expect(periodPivots([day(2026, 10, 5, 1, 2, 1, 2)], null, "WEEK")).toEqual({ drawn: false, reason: "NO_SESSION_CLOCK" });
  });
});
