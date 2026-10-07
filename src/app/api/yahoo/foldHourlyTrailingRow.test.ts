import { describe, expect, it } from "vitest";
import { foldHourlyTrailingRow } from "./foldHourlyTrailingRow";

const bar = (time: number, open: number, high: number, low: number, close: number, volume = 100) => ({ time, open, high, low, close, volume });
// serving AAPL 1h, 2026-10-07
const T1530 = 1791387000, T1630 = 1791390600, T172810 = 1791394090;

describe("Yahoo hourly trailing row folds into the bar it belongs to", () => {
  it("a 17:28:10Z row merges into the 16:30Z bar (no phantom 17:00Z candle)", () => {
    const { bars, folded } = foldHourlyTrailingRow([
      bar(T1530, 335.41, 335.6, 335.0, 335.17),
      bar(T1630, 335.14, 335.95, 335.1, 335.91, 900),
      bar(T172810, 335.93, 336.2, 335.9, 335.93, 7),
    ], "60m");
    expect(folded).toBe(true);
    expect(bars.map(b => b.time)).toEqual([T1530, T1630]);
    expect(bars[1]).toEqual({ time: T1630, open: 335.14, high: 336.2, low: 335.1, close: 335.93, volume: 900 });
  });
  it("a row at or past the previous bar's end is left alone", () => {
    const rows = [bar(T1530, 1, 1, 1, 1), bar(T1530 + 3600, 1, 1, 1, 1)];
    expect(foldHourlyTrailingRow(rows, "60m")).toEqual({ bars: rows, folded: false });
  });
  it("intervals it does not own are untouched", () => {
    const rows = [bar(0, 1, 1, 1, 1), bar(100, 1, 1, 1, 1)];
    expect(foldHourlyTrailingRow(rows, "5m").folded).toBe(false);
    expect(foldHourlyTrailingRow(rows, "1d").folded).toBe(false);
  });
});
