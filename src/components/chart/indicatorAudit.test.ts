import { describe, expect, it } from "vitest";
import { ichimoku, pivotPoints, priorSessionOHLC } from "./indicators";
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
