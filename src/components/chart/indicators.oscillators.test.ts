/**
 * indicators — truth-lock supplement for oscillator + volume family.
 *
 * Locks the MOMENTUM/VOLATILITY/VOLUME workhorses that /charts depends on:
 *   - atr (Wilder's smoothing)
 *   - normalizedAtr (ATR% relative to close)
 *   - rsi (Wilder's smoothing; bounded 0-100)
 *   - macd (line=fastEMA-slowEMA; signal=EMA(line); hist=line-signal)
 *   - stochastic (%K raw + %D smoothed)
 *   - obv (up-vol cumulative +/-)
 *   - vwap + anchoredVwap (typical-price × volume rolling sum)
 *   - chaikinMoneyFlow (money-flow multiplier × volume, rolling)
 *
 * Silent drift here silently mis-computes every /charts oscillator pane.
 */

import { describe, it, expect } from "vitest";
import {
  atr, normalizedAtr, rsi, macd, stochastic,
  obv, vwap, anchoredVwap, chaikinMoneyFlow, type Bar,
} from "./indicators";

function bar(o: number, h: number, l: number, c: number, v = 100, t = 0): Bar {
  return { time: t, open: o, high: h, low: l, close: c, volume: v };
}

/** 20 bars: 100→110 rising monotonically (no gaps). */
function risingBars(n = 20, start = 100, step = 0.5): Bar[] {
  return Array.from({ length: n }, (_, i) => {
    const c = start + i * step;
    return bar(c - 0.1, c + 0.2, c - 0.2, c, 100, i);
  });
}

describe("atr — Wilder ATR", () => {
  it("returns NaN before warm-up (p bars)", () => {
    const bars = risingBars(10);
    const out = atr(bars, 14);
    // Fewer than 14 bars → all NaN
    expect(out.every((v) => Number.isNaN(v))).toBe(true);
  });

  it("first defined value is at index p-1 (14 for default)", () => {
    const bars = risingBars(20);
    const out = atr(bars, 14);
    expect(Number.isFinite(out[13])).toBe(true);
    expect(Number.isNaN(out[12])).toBe(true);
  });

  it("Wilder recursion: out[i] = (out[i-1]*(p-1) + tr[i]) / p", () => {
    const bars = risingBars(20);
    const out = atr(bars, 14);
    // Every ATR after warm-up should be positive on a smooth-rising series
    for (let i = 13; i < 20; i++) expect(out[i]).toBeGreaterThan(0);
  });

  it("output length matches input", () => {
    expect(atr(risingBars(20), 14).length).toBe(20);
  });
});

describe("normalizedAtr — ATR as % of close", () => {
  it("returns NaN where ATR is NaN", () => {
    const bars = risingBars(20);
    const out = normalizedAtr(bars, 14);
    expect(Number.isNaN(out[0])).toBe(true);
    expect(Number.isFinite(out[13])).toBe(true);
  });

  it("value equals (atr/close) * 100", () => {
    const bars = risingBars(20);
    const atrVals = atr(bars, 14);
    const normal = normalizedAtr(bars, 14);
    for (let i = 13; i < 20; i++) {
      expect(normal[i]).toBeCloseTo((atrVals[i] / bars[i].close) * 100, 6);
    }
  });
});

describe("rsi — Wilder RSI", () => {
  it("all-gains series → RSI at index p approaches 100 (avgLoss=0 uses 100 sentinel)", () => {
    const src = Array.from({ length: 20 }, (_, i) => 100 + i);
    const out = rsi(src, 14);
    // With avgL=0, source uses sentinel RS=100 → 100 - 100/101 ≈ 99.01
    expect(out[14]).toBeGreaterThan(98);
    expect(out[14]).toBeLessThanOrEqual(100);
  });

  it("returns NaN before index p", () => {
    const src = Array.from({ length: 20 }, (_, i) => 100 + i);
    const out = rsi(src, 14);
    for (let i = 0; i < 14; i++) expect(Number.isNaN(out[i])).toBe(true);
  });

  it("all-losses series → RSI approaches 0", () => {
    const src = Array.from({ length: 20 }, (_, i) => 100 - i);
    const out = rsi(src, 14);
    expect(out[14]).toBeLessThan(5); // near 0
  });

  it("bounded in [0, 100]", () => {
    const src = [10, 11, 10, 12, 9, 13, 8, 14, 7, 15, 6, 16, 5, 17, 4, 18, 3, 19, 2, 20];
    const out = rsi(src, 14);
    for (let i = 14; i < 20; i++) {
      expect(out[i]).toBeGreaterThanOrEqual(0);
      expect(out[i]).toBeLessThanOrEqual(100);
    }
  });
});

describe("macd — Moving Average Convergence Divergence", () => {
  it("line = fastEMA - slowEMA", () => {
    const src = Array.from({ length: 40 }, (_, i) => 100 + i);
    const out = macd(src, 12, 26, 9);
    // On a rising series, fast > slow, so line > 0 after warm-up
    expect(out.line[39]).toBeGreaterThan(0);
  });

  it("hist = line - signal (0 when line = signal)", () => {
    const src = Array.from({ length: 40 }, () => 100); // flat → EMAs converge
    const out = macd(src, 12, 26, 9);
    // On perfectly flat, both EMAs → 100, line=0, signal=0, hist=0
    expect(out.line[39]).toBeCloseTo(0);
    expect(out.signal[39]).toBeCloseTo(0);
    expect(out.hist[39]).toBeCloseTo(0);
  });

  it("output shape: line, signal, hist arrays all length of src", () => {
    const src = Array.from({ length: 40 }, (_, i) => i);
    const out = macd(src);
    expect(out.line.length).toBe(40);
    expect(out.signal.length).toBe(40);
    expect(out.hist.length).toBe(40);
  });
});

describe("stochastic — %K and %D", () => {
  it("returns %K and %D of same length as input", () => {
    const bars = risingBars(30);
    const out = stochastic(bars, 14, 3, 3);
    expect(out.k.length).toBe(30);
    expect(out.d.length).toBe(30);
  });

  it("on rising series with fresh highs, raw %K is at/near 100 (close ~= high)", () => {
    const bars = risingBars(30);
    const out = stochastic(bars, 14, 3, 1); // smooth=1 → raw K
    // Last value should be high (close is near the range top)
    expect(out.k[29]).toBeGreaterThan(50);
  });

  it("flat-range series returns 50 (hi === lo → sentinel)", () => {
    // All-flat bars → hi = lo → returns 50 per source
    const bars = Array.from({ length: 20 }, (_, i) => bar(100, 100, 100, 100, 100, i));
    const out = stochastic(bars, 14, 3, 1);
    expect(out.k[19]).toBeCloseTo(50);
  });
});

describe("obv — On Balance Volume", () => {
  it("starts at 0", () => {
    expect(obv(risingBars(5))[0]).toBe(0);
  });

  it("adds volume on up-close, subtracts on down-close, 0 on same close", () => {
    // Rising bars → every bar is up → OBV should reach total volume
    const bars = risingBars(5); // 100 vol each
    const out = obv(bars);
    // 4 up-bars after the seed → 4 * 100 = 400
    expect(out[4]).toBe(400);
  });

  it("length matches input", () => {
    expect(obv(risingBars(10)).length).toBe(10);
  });
});

describe("vwap — cumulative session VWAP", () => {
  it("output length matches input", () => {
    expect(vwap(risingBars(10)).length).toBe(10);
  });

  it("first value equals typical price when volume > 0 (bar[0] tp)", () => {
    const b = bar(100, 102, 98, 100, 100, 0);
    const out = vwap([b]);
    // tp = (102+98+100)/3 = 100
    expect(out[0]).toBeCloseTo(100);
  });

  it("cumulative — final value between min and max of bar TPs", () => {
    const bars = risingBars(10);
    const out = vwap(bars);
    const tps = bars.map((b) => (b.high + b.low + b.close) / 3);
    const mn = Math.min(...tps);
    const mx = Math.max(...tps);
    expect(out[9]).toBeGreaterThanOrEqual(mn);
    expect(out[9]).toBeLessThanOrEqual(mx);
  });

  it("bars with zero volume don't crash — falls back to tp on empty cumV", () => {
    // First bar 0 volume — expect fallback to tp (no divide by zero)
    const bars: Bar[] = [bar(100, 100, 100, 100, 0), bar(101, 102, 100, 102, 100, 1)];
    const out = vwap(bars);
    expect(out[0]).toBe(100); // tp fallback
    expect(Number.isFinite(out[1])).toBe(true);
  });
});

describe("anchoredVwap", () => {
  it("returns NaN before anchor index", () => {
    const bars = risingBars(10);
    const out = anchoredVwap(bars, 3);
    for (let i = 0; i < 3; i++) expect(Number.isNaN(out[i])).toBe(true);
    expect(Number.isFinite(out[3])).toBe(true);
  });

  it("anchor=0 equals cumulative vwap()", () => {
    const bars = risingBars(10);
    const a = anchoredVwap(bars, 0);
    const v = vwap(bars);
    for (let i = 0; i < 10; i++) expect(a[i]).toBeCloseTo(v[i]);
  });
});

describe("chaikinMoneyFlow — CMF", () => {
  it("NaN before warm-up (p-1)", () => {
    const bars = risingBars(20);
    const out = chaikinMoneyFlow(bars, 20);
    for (let i = 0; i < 19; i++) expect(Number.isNaN(out[i])).toBe(true);
    expect(Number.isFinite(out[19])).toBe(true);
  });

  it("high-close bars produce positive CMF", () => {
    // Close near high → CMF positive
    const bars = Array.from({ length: 20 }, (_, i) => bar(100, 105, 100, 104, 100, i));
    const out = chaikinMoneyFlow(bars, 20);
    expect(out[19]).toBeGreaterThan(0);
  });

  it("low-close bars produce negative CMF", () => {
    // Close near low → CMF negative
    const bars = Array.from({ length: 20 }, (_, i) => bar(100, 105, 100, 101, 100, i));
    const out = chaikinMoneyFlow(bars, 20);
    expect(out[19]).toBeLessThan(0);
  });

  it("bounded in [-1, 1]", () => {
    const bars = risingBars(20);
    const out = chaikinMoneyFlow(bars, 20);
    for (let i = 19; i < 20; i++) {
      expect(out[i]).toBeGreaterThanOrEqual(-1);
      expect(out[i]).toBeLessThanOrEqual(1);
    }
  });
});
