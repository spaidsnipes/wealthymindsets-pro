import { describe, expect, it } from "vitest";
import { foldYahooLastRow } from "./yahooLastRow";

const bar = (time: number, o: number, h: number, l: number, c: number, v = 10) => ({ time, open: o, high: h, low: l, close: c, volume: v });

describe("Yahoo's last-trade row folds into its interval (serving ES1! 15m, 2026-09-28)", () => {
  it("merges into the bar already open at its bucket — no phantom candle, no added volume", () => {
    const r = foldYahooLastRow([bar(1790621100, 1, 2, 0.5, 1.5), bar(1790622000, 7756.5, 7757, 7755, 7756.5, 40), bar(1790622196, 7756, 7758, 7754, 7756, 3)], "15m");
    expect(r.folded).toBe("MERGED");
    expect(r.bars).toHaveLength(2);
    expect(r.bars[1]).toEqual(bar(1790622000, 7756.5, 7758, 7754, 7756, 40));
  });
  it("re-stamps to the bucket's open when that bucket has no bar yet", () => {
    const r = foldYahooLastRow([bar(1790621100, 1, 2, 0.5, 1.5), bar(1790622196, 7756, 7758, 7754, 7756)], "15m");
    expect(r.folded).toBe("RESTAMPED");
    expect(r.bars[1].time).toBe(1790622000);
  });
  it("leaves aligned bars, and intervals where off-grid means nothing, alone", () => {
    const aligned = [bar(1790621100, 1, 2, 0.5, 1.5), bar(1790622000, 1, 2, 0.5, 1.5)];
    expect(foldYahooLastRow(aligned, "15m").folded).toBe("NONE");
    const hourlyEquity = [bar(1790602200, 1, 2, 0.5, 1.5), bar(1790605800, 1, 2, 0.5, 1.5)]; // :30 opens
    expect(foldYahooLastRow(hourlyEquity, "60m").folded).toBe("NONE");
  });
});
