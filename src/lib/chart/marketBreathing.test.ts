import { describe, expect, it } from "vitest";

import { atrSeries, breathingSentence, breathRibbonHeight, MIN_BARS, readBreathRibbon, readMarketBreathing, type BreathBar } from "./marketBreathing";

const bar = (mid: number, range: number): BreathBar => ({ high: mid + range / 2, low: mid - range / 2, close: mid });
const series = (ranges: number[]) => ranges.map((r, i) => bar(100 + Math.sin(i / 3), r));

describe("Market Breathing", () => {
  it("says nothing below the minimum sample", () => {
    expect(readMarketBreathing(series(Array(MIN_BARS - 1).fill(1)))).toBeNull();
  });

  it("ATR seeds as the mean of the first true ranges", () => {
    const a = atrSeries(series(Array(20).fill(2)), 14);
    expect(a[12]).toBeNull();
    expect(a[13]).toBeGreaterThan(1.9);
  });

  it("reads a squeeze as COMPRESSED and drawing in", () => {
    const ranges = [...Array(80).fill(2), ...Array.from({ length: 30 }, (_, i) => 2 - i * 0.055)];
    const b = readMarketBreathing(series(ranges))!;
    expect(b.state).toBe("COMPRESSED");
    expect(b.phase).toBe("DRAWING IN");
    expect(b.atrRatio).toBeLessThan(0.75);
    expect(b.atrPercentile).toBeLessThan(10);
    expect(breathingSentence(b)).toMatch(/^Ranges are compressed: ATR 0\.\d\d× its median/);
  });

  it("reads a burst as EXPANDED and counts a completed compression → expansion cycle", () => {
    const ranges = [...Array(50).fill(2), ...Array(30).fill(0.8), ...Array(30).fill(4)];
    const b = readMarketBreathing(series(ranges))!;
    expect(b.state).toBe("EXPANDED");
    expect(b.cycles).toBeGreaterThanOrEqual(1);
    expect(b.barsInState).toBeGreaterThan(0);
  });

  it("a steady market is NORMAL and LEVEL", () => {
    const b = readMarketBreathing(series(Array(100).fill(2)))!;
    expect(b.state).toBe("NORMAL");
    expect(b.phase).toBe("LEVEL");
  });
});

describe("readBreathRibbon — F15 on the field (2026-10-07 night)", () => {
  const mk = (n: number, wide: (i: number) => number) => Array.from({ length: n }, (_, i) => ({ time: i * 60, high: 100 + wide(i), low: 100 - wide(i), close: 100 }));
  it("compressed bars read low, expanded tall, against the window's own median; changes are marked", () => {
    const bars = mk(200, i => (i < 150 ? 1 : 0.3));
    const r = readBreathRibbon(bars, 120, 199)!;
    expect(r).not.toBeNull();
    const early = r.points.find(p => p.time === 130 * 60)!;
    const late = r.points.find(p => p.time === 199 * 60)!;
    expect(late.ratio).toBeLessThan(early.ratio);
    expect(late.state).toBe("COMPRESSED");
    expect(r.changes.length).toBeGreaterThan(0);
    expect(breathRibbonHeight(late.ratio)).toBeLessThan(breathRibbonHeight(early.ratio));
    expect(breathRibbonHeight(0)).toBe(1);
    expect(breathRibbonHeight(99)).toBe(12);
  });
  it("silent with too few bars", () => {
    expect(readBreathRibbon(mk(20, () => 1), 0, 19)).toBeNull();
  });
});
