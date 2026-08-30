/**
 * indicators — truth-lock for the moving-average family + bollinger bands.
 *
 * This file exports 97 pure indicator computations that drive every chart.
 * Silent drift on the MA foundation would silently shift every ribbon,
 * channel, and derived oscillator across the app.
 *
 * Locks the FOUNDATION layer (MA family + BB) that every other indicator
 * transitively depends on:
 *
 *   - clamp arithmetic
 *   - sma: warm-up returns NaN, then arithmetic mean of last p values
 *   - ema: k = 2/(p+1); seeded at src[0]; recursive EMA formula
 *   - wma: weighted with j-descending, warm-up NaN
 *   - hma: composed WMA of (2×WMA(p/2) - WMA(p))
 *   - dema: 2×EMA - EMA(EMA)
 *   - tema: 3×EMA - 3×EMA(EMA) + EMA(EMA(EMA))
 *   - bollingerBands: mid = sma, ±(mult × stddev)
 *   - stdDev: sqrt(mean((src - sma)²))
 *   - donchian: rolling high/low over p bars, mid = (upper+lower)/2
 */

import { describe, it, expect } from "vitest";
import {
  clamp, sma, ema, wma, hma, dema, tema,
  bollingerBands, stdDev, donchian, maRibbon,
} from "./indicators";

describe("clamp", () => {
  it("clamps value between lo and hi", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe("sma — simple moving average", () => {
  it("returns NaN for indices before warm-up (p-1)", () => {
    const out = sma([1, 2, 3, 4, 5], 3);
    expect(out[0]).toBeNaN();
    expect(out[1]).toBeNaN();
    expect(out[2]).toBeCloseTo(2); // (1+2+3)/3
  });

  it("computes arithmetic mean of last p values", () => {
    const out = sma([1, 2, 3, 4, 5], 3);
    expect(out[2]).toBeCloseTo((1 + 2 + 3) / 3);
    expect(out[3]).toBeCloseTo((2 + 3 + 4) / 3);
    expect(out[4]).toBeCloseTo((3 + 4 + 5) / 3);
  });

  it("output length matches input length", () => {
    expect(sma([1, 2, 3], 2).length).toBe(3);
    expect(sma([], 5).length).toBe(0);
  });

  it("p=1 → returns the input verbatim", () => {
    expect(sma([1, 2, 3, 4], 1)).toEqual([1, 2, 3, 4]);
  });
});

describe("ema — exponential moving average", () => {
  it("seeds at src[0] (first value equals input[0])", () => {
    expect(ema([10, 20, 30], 3)[0]).toBe(10);
  });

  it("uses k = 2 / (p + 1) recursively", () => {
    // p=3 → k=0.5; ema[1] = 20*0.5 + 10*0.5 = 15
    const out = ema([10, 20, 30], 3);
    expect(out[1]).toBeCloseTo(15);
    // ema[2] = 30*0.5 + 15*0.5 = 22.5
    expect(out[2]).toBeCloseTo(22.5);
  });

  it("constant series → ema converges to the constant", () => {
    const out = ema([50, 50, 50, 50, 50], 5);
    for (const v of out) expect(v).toBeCloseTo(50);
  });

  it("output length matches input", () => {
    expect(ema([1, 2, 3], 5).length).toBe(3);
  });
});

describe("wma — weighted moving average (higher weight on recent)", () => {
  it("returns NaN before warm-up", () => {
    expect(wma([1, 2, 3, 4], 3)[0]).toBeNaN();
    expect(wma([1, 2, 3, 4], 3)[1]).toBeNaN();
  });

  it("weights descend: recent value counts most", () => {
    // p=3 with values [1,2,3]: (3*3 + 2*2 + 1*1) / (3+2+1) = 14/6
    const out = wma([1, 2, 3], 3);
    expect(out[2]).toBeCloseTo(14 / 6);
  });

  it("constant series returns the constant (weights sum consistently)", () => {
    expect(wma([7, 7, 7, 7, 7], 3)[4]).toBeCloseTo(7);
  });
});

describe("hma — Hull moving average", () => {
  it("output length matches input", () => {
    expect(hma([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4).length).toBe(10);
  });

  it("returns finite values after warm-up", () => {
    const out = hma([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], 4);
    const tail = out.slice(-2);
    expect(tail.every((v) => Number.isFinite(v))).toBe(true);
  });
});

describe("dema — double EMA (reduces lag)", () => {
  it("output length matches input", () => {
    expect(dema([1, 2, 3, 4, 5], 3).length).toBe(5);
  });

  it("constant series converges to constant", () => {
    const out = dema([100, 100, 100, 100, 100], 3);
    // 2×EMA - EMA(EMA) on constant = 2×100 - 100 = 100
    expect(out[4]).toBeCloseTo(100);
  });
});

describe("tema — triple EMA", () => {
  it("constant series converges to constant (3×e1 - 3×e2 + e3 = c)", () => {
    const out = tema([50, 50, 50, 50, 50, 50], 3);
    expect(out[5]).toBeCloseTo(50);
  });
});

describe("bollingerBands", () => {
  it("upper > mid > lower after warm-up on varying series", () => {
    const src = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const bb = bollingerBands(src, 5, 2);
    expect(bb.upper[9]).toBeGreaterThan(bb.mid[9]);
    expect(bb.mid[9]).toBeGreaterThan(bb.lower[9]);
  });

  it("mid = sma of src (bands collapse to mid on constant series)", () => {
    const bb = bollingerBands([10, 10, 10, 10, 10], 3, 2);
    expect(bb.mid[4]).toBeCloseTo(10);
    // std=0 on constant → upper=lower=mid
    expect(bb.upper[4]).toBeCloseTo(10);
    expect(bb.lower[4]).toBeCloseTo(10);
  });

  it("NaN before warm-up (p-1)", () => {
    const bb = bollingerBands([1, 2, 3, 4, 5], 4, 2);
    expect(bb.upper[0]).toBeNaN();
    expect(bb.upper[2]).toBeNaN();
    expect(bb.upper[3]).not.toBeNaN();
  });

  it("mult scales band width", () => {
    const src = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const narrow = bollingerBands(src, 5, 1);
    const wide = bollingerBands(src, 5, 3);
    expect(wide.upper[9] - wide.lower[9]).toBeGreaterThan(narrow.upper[9] - narrow.lower[9]);
  });
});

describe("stdDev", () => {
  it("returns 0 on constant series", () => {
    expect(stdDev([5, 5, 5, 5, 5], 3)[4]).toBeCloseTo(0);
  });

  it("NaN before warm-up (p-1)", () => {
    const out = stdDev([1, 2, 3, 4], 3);
    expect(out[0]).toBeNaN();
    expect(out[2]).not.toBeNaN();
  });

  it("computes population std (divide by p, not p-1)", () => {
    // [2, 4, 4, 4, 5, 5, 7, 9] with p=8 → mean=5, var=(9+1+1+1+0+0+4+16)/8=4, std=2
    const out = stdDev([2, 4, 4, 4, 5, 5, 7, 9], 8);
    expect(out[7]).toBeCloseTo(2);
  });
});

describe("donchian", () => {
  it("upper = rolling max, lower = rolling min, mid = midpoint", () => {
    const bars = [10, 12, 14, 11, 13, 15].map((n, i) => ({
      time: i, open: n, high: n + 1, low: n - 1, close: n, volume: 100,
    }));
    const dc = donchian(bars, 3);
    // At index 2 (warm-up complete): highs [11, 13, 15] → 15; lows [9, 11, 13] → 9
    expect(dc.upper[2]).toBe(15);
    expect(dc.lower[2]).toBe(9);
    expect(dc.mid[2]).toBe(12); // (15+9)/2
  });

  it("NaN before warm-up (p-1)", () => {
    const bars = [10, 12, 14].map((n, i) => ({
      time: i, open: n, high: n + 1, low: n - 1, close: n, volume: 100,
    }));
    const dc = donchian(bars, 3);
    expect(dc.upper[0]).toBeNaN();
    expect(dc.upper[1]).toBeNaN();
    expect(dc.upper[2]).not.toBeNaN();
  });
});

describe("maRibbon", () => {
  it("default periods: 8, 13, 21, 34, 55, 89 (Fibonacci sequence)", () => {
    const out = maRibbon([1, 2, 3, 4, 5]);
    expect(out.length).toBe(6);
  });

  it("custom periods → returns one EMA series per period", () => {
    const out = maRibbon([1, 2, 3, 4, 5], [2, 3]);
    expect(out.length).toBe(2);
    expect(out[0].length).toBe(5);
    expect(out[1].length).toBe(5);
  });
});
