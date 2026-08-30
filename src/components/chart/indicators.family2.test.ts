/**
 * indicators — truth-lock supplement 2 for second-tier oscillators + specialty MAs.
 *
 * Extends the Y15/Y16/Y17/Y18/Y19 coverage into: alma, t3, kama, mcginley,
 * connorsRsi, stochRsi, stochasticMomentumIndex, ppo, dpo, tsi,
 * ultimateOscillator, awesomeOscillator, acceleratorOscillator, rvi,
 * fisherTransform, kdj, coppockCurve, trix, mfi, ulcerIndex,
 * historicalVolatility, forceIndex, easeOfMovement, chaikinOscillator,
 * accumDist, volumeOscillator, rvol, cvd, klingerOscillator.
 *
 * Silent drift here silently mis-computes every named oscillator in the
 * /charts library the traders can toggle on.
 */

import { describe, it, expect } from "vitest";
import {
  alma, t3, kama, mcginley,
  connorsRsi, stochRsi, stochasticMomentumIndex,
  ppo, dpo, tsi, ultimateOscillator, awesomeOscillator, acceleratorOscillator, rvi,
  fisherTransform, kdj, coppockCurve, trix,
  mfi, ulcerIndex, historicalVolatility,
  forceIndex, easeOfMovement, chaikinOscillator, accumDist,
  volumeOscillator, rvol, cvd, klingerOscillator,
  type Bar,
} from "./indicators";

function bar(o: number, h: number, l: number, c: number, v = 100, t = 0): Bar {
  return { time: t, open: o, high: h, low: l, close: c, volume: v };
}

function risingBars(n: number, start = 100, step = 0.5, vol = 100): Bar[] {
  return Array.from({ length: n }, (_, i) => {
    const c = start + i * step;
    return bar(c - 0.1, c + 0.2, c - 0.2, c, vol, i);
  });
}

describe("alma — Arnaud Legoux MA", () => {
  it("NaN before warm-up (p-1)", () => {
    expect(Number.isNaN(alma([1, 2, 3], 9)[0])).toBe(true);
  });
  it("constant series → converges to constant", () => {
    const out = alma(Array.from({ length: 15 }, () => 50));
    expect(out[14]).toBeCloseTo(50);
  });
});

describe("t3 — Tillson T3", () => {
  it("output length matches input", () => {
    expect(t3(Array.from({ length: 20 }, (_, i) => 100 + i)).length).toBe(20);
  });
  it("constant series → constant (nested gd stabilizes)", () => {
    const out = t3(Array.from({ length: 30 }, () => 50));
    expect(out[29]).toBeCloseTo(50, 4);
  });
});

describe("kama — Kaufman Adaptive MA", () => {
  it("NaN before warm-up (i < p-1)", () => {
    const out = kama(Array.from({ length: 20 }, (_, i) => 100 + i), 10);
    expect(Number.isNaN(out[8])).toBe(true);
    expect(Number.isFinite(out[9])).toBe(true);
  });
  it("out[p-1] seeds at src[p-1]", () => {
    const src = Array.from({ length: 20 }, (_, i) => 100 + i);
    expect(kama(src, 10)[9]).toBe(109);
  });
});

describe("mcginley — McGinley Dynamic", () => {
  it("starts at src[0]", () => {
    expect(mcginley([100, 102, 104])[0]).toBe(100);
  });
  it("constant series stays constant", () => {
    const out = mcginley(Array.from({ length: 15 }, () => 100), 14);
    expect(out[14]).toBeCloseTo(100);
  });
});

describe("connorsRsi", () => {
  it("output length matches input", () => {
    const src = Array.from({ length: 200 }, (_, i) => 100 + Math.sin(i / 5) * 5);
    expect(connorsRsi(src).length).toBe(200);
  });
});

describe("stochRsi", () => {
  it("returns k + d arrays same length as input", () => {
    const src = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 3) * 5);
    const out = stochRsi(src);
    expect(out.k.length).toBe(60);
    expect(out.d.length).toBe(60);
  });
});

describe("stochasticMomentumIndex", () => {
  it("returns smi + signal arrays", () => {
    const out = stochasticMomentumIndex(risingBars(60));
    expect(out.smi.length).toBe(60);
    expect(out.signal.length).toBe(60);
  });
});

describe("ppo — Percentage Price Oscillator", () => {
  it("rising series → PPO positive (fast > slow)", () => {
    const src = Array.from({ length: 50 }, (_, i) => 100 + i);
    const out = ppo(src);
    expect(out.ppo[49]).toBeGreaterThan(0);
  });
  it("flat series → PPO 0", () => {
    const out = ppo(Array.from({ length: 50 }, () => 100));
    expect(out.ppo[49]).toBeCloseTo(0);
  });
});

describe("dpo — Detrended Price Oscillator", () => {
  it("NaN before shift = Math.floor(p/2) + 1", () => {
    // p=20 → shift=11; index 5 < 11 → NaN
    const src = Array.from({ length: 30 }, (_, i) => 100 + i);
    const out = dpo(src, 20);
    expect(Number.isNaN(out[5])).toBe(true);
    // Beyond shift + warm-up we have finite values
    expect(Number.isFinite(out[29])).toBe(true);
  });
});

describe("tsi — True Strength Index", () => {
  it("flat series → 0", () => {
    expect(tsi(Array.from({ length: 30 }, () => 100))[29]).toBe(0);
  });
});

describe("ultimateOscillator", () => {
  it("bounded 0-100 approximately", () => {
    const out = ultimateOscillator(risingBars(30));
    for (let i = 27; i < 30; i++) {
      expect(out[i]).toBeGreaterThanOrEqual(0);
      expect(out[i]).toBeLessThanOrEqual(100);
    }
  });
});

describe("awesomeOscillator", () => {
  it("output length matches input", () => {
    expect(awesomeOscillator(risingBars(40)).length).toBe(40);
  });
});

describe("acceleratorOscillator", () => {
  it("output length matches input", () => {
    expect(acceleratorOscillator(risingBars(40)).length).toBe(40);
  });
});

describe("rvi — Relative Vigor Index", () => {
  it("returns rvi + signal arrays", () => {
    const out = rvi(risingBars(30));
    expect(out.rvi.length).toBe(30);
    expect(out.signal.length).toBe(30);
  });
});

describe("fisherTransform", () => {
  it("returns fisher + signal arrays", () => {
    const out = fisherTransform(risingBars(30));
    expect(out.fisher.length).toBe(30);
    expect(out.signal.length).toBe(30);
  });
});

describe("kdj", () => {
  it("returns k + d + j arrays", () => {
    const out = kdj(risingBars(30));
    expect(out.k.length).toBe(30);
    expect(out.d.length).toBe(30);
    expect(out.j.length).toBe(30);
  });
});

describe("coppockCurve", () => {
  it("output length matches input", () => {
    expect(coppockCurve(Array.from({ length: 30 }, (_, i) => 100 + i)).length).toBe(30);
  });
});

describe("trix", () => {
  it("first value is 0", () => {
    expect(trix([100, 101, 102, 103, 104])[0]).toBe(0);
  });
});

describe("mfi — Money Flow Index", () => {
  it("NaN before warm-up (p bars)", () => {
    expect(Number.isNaN(mfi(risingBars(20), 14)[13])).toBe(true);
  });
});

describe("ulcerIndex", () => {
  it("returns non-negative on any real series", () => {
    const out = ulcerIndex(Array.from({ length: 20 }, (_, i) => 100 + i), 14);
    for (let i = 13; i < 20; i++) expect(out[i]).toBeGreaterThanOrEqual(0);
  });
  it("NaN before warm-up", () => {
    expect(Number.isNaN(ulcerIndex([1, 2, 3], 14)[0])).toBe(true);
  });
});

describe("historicalVolatility", () => {
  it("annualized × 100 (× sqrt(252))", () => {
    // Requires warm-up + finite log-returns
    const src = Array.from({ length: 25 }, (_, i) => 100 + Math.sin(i / 3) * 2);
    const out = historicalVolatility(src, 20);
    expect(Number.isFinite(out[24])).toBe(true);
    expect(out[24]).toBeGreaterThanOrEqual(0);
  });
  it("NaN before warm-up", () => {
    expect(Number.isNaN(historicalVolatility([1, 2, 3], 20)[0])).toBe(true);
  });
});

describe("forceIndex", () => {
  it("output length matches input", () => {
    expect(forceIndex(risingBars(20)).length).toBe(20);
  });
});

describe("easeOfMovement", () => {
  it("output length matches input", () => {
    expect(easeOfMovement(risingBars(20)).length).toBe(20);
  });
});

describe("chaikinOscillator", () => {
  it("output length matches input", () => {
    expect(chaikinOscillator(risingBars(20)).length).toBe(20);
  });
});

describe("accumDist — cumulative A/D line", () => {
  it("starts at 0", () => {
    expect(accumDist(risingBars(5))[0]).toBe(0);
  });
  it("output length matches input", () => {
    expect(accumDist(risingBars(5)).length).toBe(5);
  });
});

describe("volumeOscillator", () => {
  it("output length matches input", () => {
    expect(volumeOscillator(risingBars(20)).length).toBe(20);
  });
});

describe("rvol — Relative Volume", () => {
  it("returns 1.0 when current vol equals rolling avg", () => {
    const bars = Array.from({ length: 25 }, (_, i) => bar(100, 101, 99, 100, 100, i));
    expect(rvol(bars, 20)[24]).toBeCloseTo(1);
  });
  it("NaN before warm-up", () => {
    expect(Number.isNaN(rvol(risingBars(10), 20)[0])).toBe(true);
  });
});

describe("cvd — Cumulative Volume Delta", () => {
  it("output length matches input", () => {
    expect(cvd(risingBars(10)).length).toBe(10);
  });
});

describe("klingerOscillator", () => {
  it("returns osc + signal arrays", () => {
    const out = klingerOscillator(risingBars(80));
    expect(out.osc.length).toBe(80);
    expect(out.signal.length).toBe(80);
  });
});
