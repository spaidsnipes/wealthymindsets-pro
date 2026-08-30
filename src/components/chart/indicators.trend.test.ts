/**
 * indicators — truth-lock supplement for trend/directional family.
 *
 * Locks CCI / Williams %R / ADX / Aroon / Chande / Balance-of-Power /
 * Elder Ray / Choppiness / Vortex indicators. These drive the trend +
 * strength panes and Regime detection.
 *
 * Silent drift here silently mis-tells traders whether the market is
 * trending or ranging — one of the most consequential regime signals.
 */

import { describe, it, expect } from "vitest";
import {
  cci, williamsR, adx, aroon, chandeMomentum,
  balanceOfPower, elderRayIndex, choppinessIndex, vortex, type Bar,
} from "./indicators";

function bar(o: number, h: number, l: number, c: number, v = 100, t = 0): Bar {
  return { time: t, open: o, high: h, low: l, close: c, volume: v };
}

function risingBars(n: number, start = 100, step = 0.5): Bar[] {
  return Array.from({ length: n }, (_, i) => {
    const c = start + i * step;
    return bar(c - 0.1, c + 0.2, c - 0.2, c, 100, i);
  });
}

function fallingBars(n: number, start = 200, step = 0.5): Bar[] {
  return Array.from({ length: n }, (_, i) => {
    const c = start - i * step;
    return bar(c + 0.1, c + 0.2, c - 0.2, c, 100, i);
  });
}

describe("cci — Commodity Channel Index", () => {
  it("NaN before warm-up (p-1)", () => {
    const out = cci(risingBars(30), 20);
    for (let i = 0; i < 19; i++) expect(Number.isNaN(out[i])).toBe(true);
    expect(Number.isFinite(out[19])).toBe(true);
  });

  it("rising series pushes CCI positive (above the mean)", () => {
    const out = cci(risingBars(30), 20);
    expect(out[29]).toBeGreaterThan(0);
  });

  it("flat series → CCI = 0 (mean deviation = 0)", () => {
    const bars = Array.from({ length: 25 }, (_, i) => bar(100, 100, 100, 100, 100, i));
    const out = cci(bars, 20);
    expect(out[19]).toBe(0);
    expect(out[24]).toBe(0);
  });
});

describe("williamsR — %R oscillator (inverted stochastic)", () => {
  it("bounded in [-100, 0]", () => {
    const out = williamsR(risingBars(20), 14);
    for (let i = 13; i < 20; i++) {
      expect(out[i]).toBeGreaterThanOrEqual(-100);
      expect(out[i]).toBeLessThanOrEqual(0);
    }
  });

  it("close at range high → %R near 0", () => {
    const out = williamsR(risingBars(20), 14);
    // On rising series, close near high → %R close to 0
    expect(out[19]).toBeGreaterThan(-50);
  });

  it("flat range → %R = -50 sentinel (hi === lo)", () => {
    const bars = Array.from({ length: 20 }, (_, i) => bar(100, 100, 100, 100, 100, i));
    expect(williamsR(bars, 14)[19]).toBe(-50);
  });

  it("NaN before warm-up", () => {
    const out = williamsR(risingBars(20), 14);
    expect(Number.isNaN(out[0])).toBe(true);
    expect(Number.isNaN(out[12])).toBe(true);
    expect(Number.isFinite(out[13])).toBe(true);
  });
});

describe("adx — Average Directional Index", () => {
  it("returns adx + diPlus + diMinus arrays same length as input", () => {
    const bars = risingBars(30);
    const out = adx(bars, 14);
    expect(out.adx.length).toBe(30);
    expect(out.diPlus.length).toBe(30);
    expect(out.diMinus.length).toBe(30);
  });

  it("rising series → diPlus > diMinus (bullish directional dominance)", () => {
    const bars = risingBars(30);
    const out = adx(bars, 14);
    expect(out.diPlus[29]).toBeGreaterThan(out.diMinus[29]);
  });

  it("falling series → diMinus > diPlus (bearish directional dominance)", () => {
    const bars = fallingBars(30);
    const out = adx(bars, 14);
    expect(out.diMinus[29]).toBeGreaterThan(out.diPlus[29]);
  });

  it("ADX values are non-negative (percent)", () => {
    const out = adx(risingBars(30), 14);
    for (let i = 14; i < 30; i++) expect(out.adx[i]).toBeGreaterThanOrEqual(0);
  });
});

describe("aroon — up/down/osc", () => {
  it("NaN before warm-up (p bars needed)", () => {
    const bars = risingBars(30);
    const out = aroon(bars, 25);
    expect(Number.isNaN(out.up[24])).toBe(true);
    expect(Number.isFinite(out.up[25])).toBe(true);
  });

  it("perfectly rising series → aroon.up = 100, aroon.down < 100 (osc >= 0)", () => {
    const bars = risingBars(30);
    const out = aroon(bars, 25);
    expect(out.up[29]).toBe(100);
    expect(out.osc[29]).toBeGreaterThanOrEqual(0);
  });

  it("perfectly falling series → aroon.down = 100", () => {
    const bars = fallingBars(30);
    const out = aroon(bars, 25);
    expect(out.down[29]).toBe(100);
  });

  it("aroon.osc = up - down (identity)", () => {
    const bars = risingBars(30);
    const out = aroon(bars, 25);
    for (let i = 25; i < 30; i++) {
      expect(out.osc[i]).toBeCloseTo(out.up[i] - out.down[i]);
    }
  });
});

describe("chandeMomentum — CMO", () => {
  it("NaN before warm-up (needs p+1 lookback)", () => {
    const out = chandeMomentum([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], 14);
    expect(Number.isNaN(out[0])).toBe(true);
    expect(Number.isNaN(out[13])).toBe(true);
    expect(Number.isFinite(out[14])).toBe(true);
  });

  it("all-gains → CMO = 100", () => {
    const src = Array.from({ length: 20 }, (_, i) => 100 + i);
    expect(chandeMomentum(src, 14)[15]).toBe(100);
  });

  it("all-losses → CMO = -100", () => {
    const src = Array.from({ length: 20 }, (_, i) => 100 - i);
    expect(chandeMomentum(src, 14)[15]).toBe(-100);
  });

  it("bounded in [-100, 100]", () => {
    const src = [10, 12, 11, 13, 14, 15, 14, 13, 12, 11, 12, 13, 14, 15, 16, 17];
    const out = chandeMomentum(src, 14);
    for (let i = 14; i < 16; i++) {
      expect(out[i]).toBeGreaterThanOrEqual(-100);
      expect(out[i]).toBeLessThanOrEqual(100);
    }
  });
});

describe("balanceOfPower — BOP", () => {
  it("bullish bar (close > open) → BOP > 0", () => {
    const b = [bar(100, 105, 99, 104)];
    expect(balanceOfPower(b)[0]).toBeGreaterThan(0);
  });

  it("bearish bar (close < open) → BOP < 0", () => {
    const b = [bar(105, 106, 99, 100)];
    expect(balanceOfPower(b)[0]).toBeLessThan(0);
  });

  it("doji (close === open) → BOP = 0", () => {
    const b = [bar(100, 102, 98, 100)];
    expect(balanceOfPower(b)[0]).toBe(0);
  });

  it("zero-range bar (high === low) → BOP = 0 (no divide by zero)", () => {
    const b = [bar(100, 100, 100, 100)];
    expect(balanceOfPower(b)[0]).toBe(0);
  });

  it("bounded in [-1, 1]", () => {
    const bars = risingBars(20);
    for (const v of balanceOfPower(bars)) {
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe("elderRayIndex — bull/bear power", () => {
  it("returns bull + bear arrays same length as input", () => {
    const out = elderRayIndex(risingBars(20), 13);
    expect(out.bull.length).toBe(20);
    expect(out.bear.length).toBe(20);
  });

  it("bull power (high - EMA) is >= bear power (low - EMA) on any bar", () => {
    const bars = risingBars(20);
    const out = elderRayIndex(bars, 13);
    for (let i = 0; i < 20; i++) {
      expect(out.bull[i]).toBeGreaterThanOrEqual(out.bear[i]);
    }
  });
});

describe("choppinessIndex — CI (100=choppy, 0=trending)", () => {
  it("NaN before warm-up", () => {
    const bars = risingBars(20);
    const out = choppinessIndex(bars, 14);
    for (let i = 0; i < 13; i++) expect(Number.isNaN(out[i])).toBe(true);
    expect(Number.isFinite(out[13])).toBe(true);
  });

  it("flat-range series → 50 sentinel (hi === lo)", () => {
    const bars = Array.from({ length: 20 }, (_, i) => bar(100, 100, 100, 100, 100, i));
    expect(choppinessIndex(bars, 14)[19]).toBe(50);
  });
});

describe("vortex — VI+ / VI-", () => {
  it("returns viPlus + viMinus arrays same length as input", () => {
    const out = vortex(risingBars(30), 14);
    expect(out.viPlus.length).toBe(30);
    expect(out.viMinus.length).toBe(30);
  });

  it("NaN before warm-up (p bars)", () => {
    const out = vortex(risingBars(30), 14);
    expect(Number.isNaN(out.viPlus[13])).toBe(true);
    expect(Number.isFinite(out.viPlus[14])).toBe(true);
  });

  it("rising series → VI+ > VI- (bullish)", () => {
    const out = vortex(risingBars(30), 14);
    expect(out.viPlus[29]).toBeGreaterThan(out.viMinus[29]);
  });

  it("falling series → VI- > VI+ (bearish)", () => {
    const out = vortex(fallingBars(30), 14);
    expect(out.viMinus[29]).toBeGreaterThan(out.viPlus[29]);
  });
});
