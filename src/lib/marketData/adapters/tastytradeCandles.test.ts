import { describe, expect, it } from "vitest";

import { isSnapshotEnd, tastyCandleFromTime, tastyCandlePeriod, tastyCandleSymbol, tastyCandlesToBars } from "./tastytradeCandles";

describe("tastytrade candle history", () => {
  it("builds the period in dxFeed's echoed short form", () => {
    expect(tastyCandleSymbol("/ESZ26:XCME", "1m")).toBe("/ESZ26:XCME{=m}");
    expect(tastyCandleSymbol("/ESZ26:XCME", "5m")).toBe("/ESZ26:XCME{=5m}");
    expect(tastyCandleSymbol("/ESZ26:XCME", "1h")).toBe("/ESZ26:XCME{=h}");
    expect(tastyCandleSymbol("/ESZ26:XCME", "4h")).toBe("/ESZ26:XCME{=4h}");
    expect(tastyCandleSymbol("/ESZ26:XCME", "1D")).toBe("/ESZ26:XCME{=d}");
    expect(tastyCandleSymbol("/ESZ26:XCME", "1W")).toBe("/ESZ26:XCME{=w}");
    expect(tastyCandleSymbol("/ESZ26:XCME", "1M")).toBe("/ESZ26:XCME{=mo}");
    expect(tastyCandlePeriod("45m")).toBeNull();
    expect(tastyCandleSymbol("/ESZ26:XCME", "6M")).toBeNull();
  });

  it("asks far enough back to cover closed hours", () => {
    expect(tastyCandleFromTime("1m", 100, 1_000_000_000)).toBe(1_000_000_000 - 9_000_000);
    expect(tastyCandleFromTime("45m", 100, 0)).toBeNull();
    expect(tastyCandleFromTime("1m", 0, 0)).toBeNull();
  });

  it("drops the NaN end marker, dedupes by bar time (latest wins), sorts, and caps", () => {
    const bars = tastyCandlesToBars([
      { time: 1790834520000, open: 7766.5, high: 7766.5, low: 7765.5, close: 7766, volume: 282 },
      { time: 1790823767100, open: null, high: null, low: null, close: null, volume: null },
      { time: 1790834460000, open: 7765, high: 7767, low: 7764.75, close: 7766.5, volume: null },
      { time: 1790834520000, open: 7766.5, high: 7767, low: 7765.5, close: 7766.75, volume: 301 },
    ], 10);
    expect(bars).toEqual([
      { time: 1790834460, open: 7765, high: 7767, low: 7764.75, close: 7766.5, volume: 0 },
      { time: 1790834520, open: 7766.5, high: 7767, low: 7765.5, close: 7766.75, volume: 301 },
    ]);
    expect(tastyCandlesToBars([{ time: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 }, { time: 2000, open: 1, high: 1, low: 1, close: 1, volume: 1 }], 1)).toHaveLength(1);
  });

  it("reads the snapshot's end from its flags (observed: 4 begin, 0 rows, 10 end)", () => {
    expect(isSnapshotEnd(4)).toBe(false);
    expect(isSnapshotEnd(0)).toBe(false);
    expect(isSnapshotEnd(10)).toBe(true);
    expect(isSnapshotEnd(16)).toBe(true);
    expect(isSnapshotEnd(null)).toBe(false);
  });
});
