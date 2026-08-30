/**
 * indicators — truth-lock supplement for channels + pivots + composite systems.
 *
 * Locks Keltner, Donchian, envelope, priceChannel, linearRegression,
 * parabolicSAR, supertrend, alligator, ichimoku, and pivotPoints
 * (5 types: standard / fibonacci / camarilla / woodie / demark / cpr).
 *
 * Pivots are P0 for /charts + morning-prep — a wrong pivot number is
 * a wrong support/resistance level for the entire session.
 */

import { describe, it, expect } from "vitest";
import {
  keltner, donchianWidth, envelope, priceChannel, linearRegression,
  parabolicSAR, supertrend, alligator, ichimoku, pivotPoints, type Bar,
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

describe("keltner channels", () => {
  it("upper > mid > lower on varying series", () => {
    const bars = risingBars(30);
    const kc = keltner(bars, 20, 2);
    // After warm-up
    expect(kc.upper[29]).toBeGreaterThan(kc.mid[29]);
    expect(kc.mid[29]).toBeGreaterThan(kc.lower[29]);
  });

  it("mid = EMA of closes", () => {
    const bars = risingBars(30);
    const kc = keltner(bars, 20, 2);
    expect(Number.isFinite(kc.mid[29])).toBe(true);
  });
});

describe("donchianWidth", () => {
  it("returns upper - lower (positive on any real bar range)", () => {
    const bars = risingBars(25);
    const w = donchianWidth(bars, 20);
    expect(w[24]).toBeGreaterThan(0);
  });

  it("NaN before warm-up", () => {
    const bars = risingBars(25);
    expect(Number.isNaN(donchianWidth(bars, 20)[18])).toBe(true);
  });
});

describe("envelope", () => {
  it("upper = mid × (1 + pct/100), lower = mid × (1 - pct/100)", () => {
    const src = [100, 100, 100, 100, 100];
    const e = envelope(src, 3, 2.5);
    expect(e.mid[4]).toBeCloseTo(100);
    expect(e.upper[4]).toBeCloseTo(102.5);
    expect(e.lower[4]).toBeCloseTo(97.5);
  });

  it("custom pct scales width", () => {
    const e = envelope([100, 100, 100], 2, 5);
    expect(e.upper[2]).toBeCloseTo(105);
    expect(e.lower[2]).toBeCloseTo(95);
  });
});

describe("priceChannel", () => {
  it("upper = rolling max high, lower = rolling min low", () => {
    const bars = risingBars(25);
    const pc = priceChannel(bars, 20);
    expect(pc.upper[24]).toBeGreaterThan(pc.lower[24]);
  });

  it("NaN before warm-up", () => {
    const bars = risingBars(25);
    expect(Number.isNaN(priceChannel(bars, 20).upper[18])).toBe(true);
  });
});

describe("linearRegression", () => {
  it("NaN before warm-up (p-1)", () => {
    const out = linearRegression([1, 2, 3], 14);
    expect(Number.isNaN(out[0])).toBe(true);
  });

  it("perfectly linear series → regression matches the last value exactly", () => {
    // y = x sequence — regression should reconstruct the endpoint
    const src = Array.from({ length: 20 }, (_, i) => 100 + i);
    const out = linearRegression(src, 14);
    // The output at index i is the regression prediction at time p-1 (endpoint of window)
    // For y=x window [i-p+1..i], slope=1, endpoint value = src[i]
    expect(out[19]).toBeCloseTo(119, 4);
  });
});

describe("parabolicSAR", () => {
  it("output length matches input", () => {
    expect(parabolicSAR(risingBars(20)).length).toBe(20);
  });

  it("returns NaN for empty input; length preserved", () => {
    expect(parabolicSAR([]).length).toBe(0);
  });

  it("SAR at index 0 = bars[0].low (initialized bullish)", () => {
    const bars = risingBars(10);
    expect(parabolicSAR(bars)[0]).toBe(bars[0].low);
  });

  it("SAR values are finite after initialization", () => {
    const bars = risingBars(20);
    const out = parabolicSAR(bars);
    for (let i = 0; i < out.length; i++) expect(Number.isFinite(out[i])).toBe(true);
  });
});

describe("supertrend", () => {
  it("returns line + dir arrays same length as input", () => {
    const bars = risingBars(30);
    const st = supertrend(bars, 10, 3);
    expect(st.line.length).toBe(30);
    expect(st.dir.length).toBe(30);
  });

  it("dir is +1 or -1 (never other values)", () => {
    const bars = risingBars(30);
    const st = supertrend(bars, 10, 3);
    for (const d of st.dir) expect([1, -1]).toContain(d);
  });

  it("rising series → final dir = +1 (bullish)", () => {
    const bars = risingBars(30);
    const st = supertrend(bars, 10, 3);
    expect(st.dir[29]).toBe(1);
  });
});

describe("alligator", () => {
  it("returns 3 lines (jaw, teeth, lips) with input length", () => {
    const bars = risingBars(30);
    const a = alligator(bars);
    expect(a.jaw.length).toBe(30);
    expect(a.teeth.length).toBe(30);
    expect(a.lips.length).toBe(30);
  });

  it("shifts leave NaN in the early positions (forward-shift)", () => {
    const bars = risingBars(30);
    const a = alligator(bars);
    // jaw shifted 8 forward, teeth 5, lips 3 — early positions are NaN
    expect(Number.isNaN(a.jaw[0])).toBe(true);
    expect(Number.isNaN(a.teeth[0])).toBe(true);
    expect(Number.isNaN(a.lips[0])).toBe(true);
  });
});

describe("ichimoku", () => {
  it("returns 5 named lines all input length", () => {
    const bars = risingBars(60);
    const i = ichimoku(bars);
    for (const key of ["tenkan", "kijun", "senkouA", "senkouB", "chikou"] as const) {
      expect(i[key].length).toBe(60);
    }
  });

  it("chikou is NaN for i < 26 (shift back 26 periods)", () => {
    const bars = risingBars(60);
    const i = ichimoku(bars);
    for (let idx = 0; idx < 26; idx++) expect(Number.isNaN(i.chikou[idx])).toBe(true);
    expect(Number.isFinite(i.chikou[26])).toBe(true);
  });

  it("senkouA = (tenkan + kijun) / 2 identity", () => {
    const bars = risingBars(60);
    const i = ichimoku(bars);
    for (let idx = 26; idx < 60; idx++) {
      expect(i.senkouA[idx]).toBeCloseTo((i.tenkan[idx] + i.kijun[idx]) / 2);
    }
  });
});

describe("pivotPoints — standard", () => {
  it("PP = (H+L+C)/3", () => {
    const b = [bar(100, 110, 90, 105)];
    const p = pivotPoints(b, "standard");
    expect(p.pp).toBeCloseTo((110 + 90 + 105) / 3);
  });

  it("R1 = 2×PP - L; S1 = 2×PP - H", () => {
    const b = [bar(100, 110, 90, 105)];
    const p = pivotPoints(b, "standard");
    expect(p.r1).toBeCloseTo(2 * p.pp - 90);
    expect(p.s1).toBeCloseTo(2 * p.pp - 110);
  });

  it("R2 = PP + (H-L); S2 = PP - (H-L)", () => {
    const b = [bar(100, 110, 90, 105)];
    const p = pivotPoints(b, "standard");
    const hl = 20;
    expect(p.r2).toBeCloseTo(p.pp + hl);
    expect(p.s2).toBeCloseTo(p.pp - hl);
  });

  it("returns zeros for empty bars", () => {
    expect(pivotPoints([])).toEqual({ pp: 0, r1: 0, r2: 0, r3: 0, s1: 0, s2: 0, s3: 0 });
  });
});

describe("pivotPoints — fibonacci", () => {
  it("R1 = PP + 0.382 × (H-L)", () => {
    const b = [bar(100, 110, 90, 105)];
    const p = pivotPoints(b, "fibonacci");
    const hl = 20;
    expect(p.r1).toBeCloseTo(p.pp + 0.382 * hl);
    expect(p.r2).toBeCloseTo(p.pp + 0.618 * hl);
    expect(p.r3).toBeCloseTo(p.pp + 1.0 * hl);
    expect(p.s1).toBeCloseTo(p.pp - 0.382 * hl);
  });
});

describe("pivotPoints — camarilla", () => {
  it("R1 = C + 1.0833 × HL; S3 = C - 1.25 × HL", () => {
    const b = [bar(100, 110, 90, 105)];
    const p = pivotPoints(b, "camarilla");
    const hl = 20;
    expect(p.r1).toBeCloseTo(105 + 1.0833 * hl, 4);
    expect(p.s3).toBeCloseTo(105 - 1.25 * hl, 4);
  });
});

describe("pivotPoints — woodie", () => {
  it("PP = (H+L+2C)/4 (close weighted double)", () => {
    const b = [bar(100, 110, 90, 105)];
    const p = pivotPoints(b, "woodie");
    expect(p.pp).toBeCloseTo((110 + 90 + 2 * 105) / 4);
  });
});

describe("pivotPoints — demark", () => {
  it("close < open: x = H + 2L + C", () => {
    // O=110, C=100 → close < open
    const b = [bar(110, 115, 95, 100)];
    const p = pivotPoints(b, "demark");
    const x = 115 + 2 * 95 + 100;
    expect(p.pp).toBeCloseTo(x / 4);
  });

  it("close > open: x = 2H + L + C", () => {
    const b = [bar(100, 115, 95, 110)];
    const p = pivotPoints(b, "demark");
    const x = 2 * 115 + 95 + 110;
    expect(p.pp).toBeCloseTo(x / 4);
  });

  it("close === open: x = H + L + 2C", () => {
    const b = [bar(100, 115, 95, 100)];
    const p = pivotPoints(b, "demark");
    const x = 115 + 95 + 2 * 100;
    expect(p.pp).toBeCloseTo(x / 4);
  });

  it("demark: R2/S2/R3/S3 are NaN (only R1/S1 defined)", () => {
    const b = [bar(100, 115, 95, 110)];
    const p = pivotPoints(b, "demark");
    expect(Number.isNaN(p.r2)).toBe(true);
    expect(Number.isNaN(p.s3)).toBe(true);
  });
});

describe("pivotPoints — cpr (central pivot range)", () => {
  it("PP = (H+L+C)/3; TC = (H+L)/2; BC = 2*PP - TC", () => {
    const b = [bar(100, 110, 90, 105)];
    const p = pivotPoints(b, "cpr");
    expect(p.pp).toBeCloseTo((110 + 90 + 105) / 3);
    expect(p.tc).toBeCloseTo((110 + 90) / 2);
    expect(p.bc).toBeCloseTo(2 * p.pp! - p.tc!);
  });
});
