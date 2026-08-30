/**
 * indicators — truth-lock for Smart Money Concepts + pattern detection.
 *
 * Locks the SMC visuals (fairValueGaps, swingHighLow, orderBlocks) that
 * traders read as market structure, plus classic pattern detectors
 * (dojiDetector, engulfingPattern, hammerShootingStar) and the
 * statistical primitives (zScore, percentileRank, linearRegressionSlope,
 * roc, momentum). Silent drift here silently mis-marks structural
 * levels across every /charts session.
 */

import { describe, it, expect } from "vitest";
import {
  fairValueGaps, swingHighLow, orderBlocks,
  dojiDetector, engulfingPattern, hammerShootingStar,
  zScore, percentileRank, linearRegressionSlope, roc, momentum,
  REQUIRES_FEED, MTF_INDICATORS, type Bar,
} from "./indicators";

function bar(o: number, h: number, l: number, c: number, v = 100, t = 0): Bar {
  return { time: t, open: o, high: h, low: l, close: c, volume: v };
}

describe("fairValueGaps — 3-candle gap detector", () => {
  it("detects a bullish FVG when candle[i-2].high < candle[i].low", () => {
    // FVG at index 2: prev2.high=100 < curr.low=105 → bullish gap
    const bars = [
      bar(99, 100, 98, 99, 100, 1),   // i-2
      bar(101, 103, 101, 102, 100, 2), // i-1 (the "gap" candle)
      bar(105, 107, 105, 106, 100, 3), // i
    ];
    const g = fairValueGaps(bars);
    expect(g.length).toBe(1);
    expect(g[0].bull).toBe(true);
    expect(g[0].top).toBe(105);
    expect(g[0].bot).toBe(100);
    expect(g[0].time).toBe(2); // i-1 time
  });

  it("detects a bearish FVG when candle[i-2].low > candle[i].high", () => {
    const bars = [
      bar(106, 108, 105, 107, 100, 1),
      bar(104, 105, 102, 103, 100, 2),
      bar(99, 100, 98, 99, 100, 3),
    ];
    const g = fairValueGaps(bars);
    expect(g.length).toBe(1);
    expect(g[0].bull).toBe(false);
  });

  it("empty input → empty gaps array", () => {
    expect(fairValueGaps([])).toEqual([]);
    expect(fairValueGaps([bar(100, 101, 99, 100)])).toEqual([]);
  });
});

describe("swingHighLow — fractal pivot detector", () => {
  it("finds pivot high in the middle of a triangle series", () => {
    // 5 bars up, 1 pivot bar with highest high, 5 bars down
    const bars: Bar[] = [];
    for (let i = 0; i < 5; i++) bars.push(bar(100 + i, 101 + i, 99 + i, 100 + i, 100, i));
    bars.push(bar(110, 120, 108, 118, 100, 5)); // pivot high
    for (let i = 0; i < 5; i++) bars.push(bar(105 - i, 106 - i, 104 - i, 105 - i, 100, 6 + i));
    const { highs, lows } = swingHighLow(bars, 5);
    expect(highs.length).toBeGreaterThanOrEqual(1);
    // The pivot bar at index 5 should be identified
    expect(highs[0].price).toBe(120);
  });

  it("empty when input too small for lookback", () => {
    const bars = Array.from({ length: 3 }, (_, i) => bar(100, 101, 99, 100, 100, i));
    const { highs, lows } = swingHighLow(bars, 5);
    expect(highs).toEqual([]);
    expect(lows).toEqual([]);
  });
});

describe("orderBlocks", () => {
  it("detects bearish OB: down candle followed by strong up move (close > down.high)", () => {
    const bars = [
      bar(100, 100, 100, 100, 100, 0), // seed
      bar(100, 100, 95, 96, 100, 1),   // down candle: open=100, close=96, high=100
      bar(96, 105, 96, 104, 100, 2),   // next: close 104 > bar[1].high 100 → bearish OB
    ];
    const obs = orderBlocks(bars);
    expect(obs.some((o) => !o.bull && o.time === 1)).toBe(true);
  });

  it("detects bullish OB: up candle followed by strong down move (close < up.low)", () => {
    const bars = [
      bar(100, 100, 100, 100, 100, 0),
      bar(100, 104, 100, 103, 100, 1), // up candle: low=100
      bar(103, 103, 95, 96, 100, 2),   // next: close 96 < bar[1].low 100 → bullish OB
    ];
    const obs = orderBlocks(bars);
    expect(obs.some((o) => o.bull && o.time === 1)).toBe(true);
  });

  it("empty input → empty blocks", () => {
    expect(orderBlocks([])).toEqual([]);
  });
});

describe("dojiDetector — body < 10% of range", () => {
  it("true for tiny body / wide range", () => {
    // body = |101 - 100| = 1, range = 105-95 = 10, 1/10 = 0.1 — NOT < 0.1
    // Make even smaller: body = 0.5, range = 10 → 0.05 < 0.1 → true
    expect(dojiDetector([bar(100, 105, 95, 100.5)])[0]).toBe(true);
  });

  it("false when body dominates", () => {
    // body = 4, range = 5 → 0.8 → false
    expect(dojiDetector([bar(100, 104, 99, 103)])[0]).toBe(false);
  });

  it("false when total range is 0 (no candle at all)", () => {
    expect(dojiDetector([bar(100, 100, 100, 100)])[0]).toBe(false);
  });
});

describe("engulfingPattern", () => {
  it("detects bullish engulfing: prev bearish, curr bull opens below prev close + closes above prev open", () => {
    const bars = [
      bar(100, 100, 95, 96, 100, 0),   // bearish
      bar(94, 105, 94, 104, 100, 1),   // bullish, opens 94 < prev.close 96, closes 104 > prev.open 100
    ];
    const eng = engulfingPattern(bars);
    expect(eng.length).toBe(1);
    expect(eng[0].bull).toBe(true);
  });

  it("detects bearish engulfing", () => {
    const bars = [
      bar(95, 100, 95, 100, 100, 0),   // bullish
      bar(102, 102, 90, 92, 100, 1),   // bearish, opens 102 > prev.close 100, closes 92 < prev.open 95
    ];
    const eng = engulfingPattern(bars);
    expect(eng.length).toBe(1);
    expect(eng[0].bull).toBe(false);
  });

  it("no pattern when candles are not engulfing", () => {
    const bars = [bar(100, 101, 99, 100, 100, 0), bar(100, 101, 99, 100, 100, 1)];
    expect(engulfingPattern(bars)).toEqual([]);
  });
});

describe("hammerShootingStar", () => {
  it("detects hammer: long lower wick, small body, minimal upper wick", () => {
    // open=100, close=101, high=101.1, low=95 → body=1, lowerWick=5, upperWick=0.1
    // lowerWick 5 > 2*body 2 ✓; upperWick 0.1 < body 1 ✓
    const out = hammerShootingStar([bar(100, 101.1, 95, 101)]);
    expect(out.length).toBe(1);
    expect(out[0].type).toBe("hammer");
  });

  it("detects shooting star: long upper wick, small body, minimal lower wick", () => {
    // open=100, close=99, high=106, low=98.9 → body=1, upperWick=6, lowerWick=0.1
    const out = hammerShootingStar([bar(100, 106, 98.9, 99)]);
    expect(out.length).toBe(1);
    expect(out[0].type).toBe("shooting_star");
  });

  it("skips zero-range bars (total = 0) without throwing", () => {
    expect(() => hammerShootingStar([bar(100, 100, 100, 100)])).not.toThrow();
    expect(hammerShootingStar([bar(100, 100, 100, 100)])).toEqual([]);
  });
});

describe("zScore", () => {
  it("returns 0 on constant series (std = 0)", () => {
    const out = zScore([100, 100, 100, 100, 100], 3);
    expect(out[4]).toBe(0);
  });

  it("positive when current value is above the rolling mean", () => {
    // src: 1,2,3,4,100 with p=5 → last is way above mean
    const out = zScore([1, 2, 3, 4, 100], 5);
    expect(out[4]).toBeGreaterThan(0);
  });
});

describe("percentileRank", () => {
  it("NaN before warm-up (p-1)", () => {
    expect(Number.isNaN(percentileRank([1, 2, 3], 100)[0])).toBe(true);
  });

  it("100% when current value is the max of the window", () => {
    // Value 10 with p=5 window [6,7,8,9,10] → count 5 → 100%
    const out = percentileRank([6, 7, 8, 9, 10], 5);
    expect(out[4]).toBe(100);
  });

  it("bounded in [0, 100]", () => {
    const out = percentileRank([1, 2, 3, 4, 5, 4, 3, 2, 1], 5);
    for (let i = 4; i < 9; i++) {
      expect(out[i]).toBeGreaterThanOrEqual(0);
      expect(out[i]).toBeLessThanOrEqual(100);
    }
  });
});

describe("linearRegressionSlope", () => {
  it("NaN before warm-up", () => {
    expect(Number.isNaN(linearRegressionSlope([1, 2, 3], 14)[0])).toBe(true);
  });

  it("slope = 1 on a y=x sequence", () => {
    const src = Array.from({ length: 20 }, (_, i) => 100 + i);
    const out = linearRegressionSlope(src, 14);
    expect(out[19]).toBeCloseTo(1, 4);
  });

  it("slope = -1 on descending y=-x sequence", () => {
    const src = Array.from({ length: 20 }, (_, i) => 100 - i);
    const out = linearRegressionSlope(src, 14);
    expect(out[19]).toBeCloseTo(-1, 4);
  });

  it("slope = 0 on constant series", () => {
    const src = Array.from({ length: 20 }, () => 100);
    const out = linearRegressionSlope(src, 14);
    expect(out[19]).toBeCloseTo(0, 4);
  });
});

describe("roc — Rate of Change ((v/src[i-p] - 1) × 100)", () => {
  it("returns NaN before index p", () => {
    expect(Number.isNaN(roc([100, 102, 104], 12)[0])).toBe(true);
  });

  it("computes correct % change: 100 → 110 with p=1 → +10%", () => {
    const out = roc([100, 110], 1);
    expect(out[1]).toBeCloseTo(10);
  });

  it("NaN when src[i-p] = 0 (no divide by zero)", () => {
    expect(Number.isNaN(roc([0, 100], 1)[1])).toBe(true);
  });

  it("output length matches input", () => {
    expect(roc([100, 101, 102], 1).length).toBe(3);
  });
});

describe("momentum — v - src[i-p]", () => {
  it("returns NaN before index p", () => {
    expect(Number.isNaN(momentum([100, 102], 1)[0])).toBe(true);
  });

  it("computes absolute change: 100 → 105 with p=1 → +5", () => {
    expect(momentum([100, 105], 1)[1]).toBe(5);
  });

  it("output length matches input", () => {
    expect(momentum([100, 101, 102, 103], 2).length).toBe(4);
  });
});

describe("REQUIRES_FEED sentinel set (canon §Product Truth)", () => {
  it("contains breadth indicators that cannot be computed without external data", () => {
    expect(REQUIRES_FEED.has("VIX Overlay")).toBe(true);
    expect(REQUIRES_FEED.has("McClellan Oscillator")).toBe(true);
    expect(REQUIRES_FEED.has("TICK Index")).toBe(true);
  });

  it("size > 20 (comprehensive coverage)", () => {
    expect(REQUIRES_FEED.size).toBeGreaterThan(20);
  });
});

describe("MTF_INDICATORS sentinel set", () => {
  it("contains MTF-prefixed indicator identifiers", () => {
    expect(MTF_INDICATORS.has("MTF EMA")).toBe(true);
    expect(MTF_INDICATORS.has("MTF RSI")).toBe(true);
    expect(MTF_INDICATORS.has("MTF VWAP")).toBe(true);
  });
});
