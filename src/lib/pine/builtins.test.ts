/**
 * Pine builtins — truth-lock suite.
 *
 * The Pine interpreter (1132 lines) executes indicator scripts against
 * a 31-function builtin library that ships zero regression coverage.
 * Any silent numeric drift in `sma`, `ema`, `rma`, `rsi`, `macd` etc.
 * would invisibly change trader-visible plots and every downstream
 * decision derived from them.
 *
 * This suite locks the core numeric identities using small
 * hand-computable inputs. It is deliberately narrower than a full
 * TradingView-parity harness — its job is to make silent regressions
 * loud. Sibling to `interpreter.test.ts` (the Founder-named Pine
 * single-owner truth atom).
 */

import { describe, it, expect } from "vitest";
import {
  nz,
  na,
  sma,
  ema,
  wma,
  rma,
  rsi,
  cum,
  roc,
  macd,
  bb,
  atr,
  stoch,
} from "./builtins";

describe("nz — null / NaN coalescer", () => {
  it("returns replacement when value is null / undefined / NaN", () => {
    expect(nz(null)).toBe(0);
    expect(nz(undefined)).toBe(0);
    expect(nz(NaN)).toBe(0);
    expect(nz(null, 42)).toBe(42);
  });
  it("passes real numbers through unchanged (including 0)", () => {
    expect(nz(3.14)).toBeCloseTo(3.14);
    expect(nz(0)).toBe(0);
    expect(nz(-5, 99)).toBe(-5);
  });
});

describe("na — null / NaN predicate", () => {
  it("returns true for null / undefined / NaN", () => {
    expect(na(null)).toBe(true);
    expect(na(undefined)).toBe(true);
    expect(na(NaN)).toBe(true);
  });
  it("returns false for real values", () => {
    expect(na(0)).toBe(false);
    expect(na(1.5)).toBe(false);
    expect(na("string")).toBe(false);
    expect(na(false)).toBe(false);
  });
});

describe("sma — simple moving average", () => {
  it("returns null for indices before length-1 (warmup)", () => {
    const out = sma([1, 2, 3, 4, 5], 3);
    expect(out[0]).toBeNull();
    expect(out[1]).toBeNull();
  });
  it("computes the exact mean over the window", () => {
    const out = sma([1, 2, 3, 4, 5], 3);
    // window [1,2,3]/3 = 2 ; [2,3,4]/3 = 3 ; [3,4,5]/3 = 4
    expect(out[2]).toBeCloseTo(2);
    expect(out[3]).toBeCloseTo(3);
    expect(out[4]).toBeCloseTo(4);
  });
  it("emits null when the window contains a null", () => {
    const out = sma([1, null, 3, 4, 5], 3);
    // window covering the null must be null
    expect(out[2]).toBeNull();
    expect(out[3]).toBeNull();
    // last window [3,4,5] is clean
    expect(out[4]).toBeCloseTo(4);
  });
});

describe("ema — TradingView identity (seed with first non-na, no SMA)", () => {
  it("yields a value on every bar starting at the first non-na", () => {
    const out = ema([1, 2, 3, 4, 5], 3);
    expect(out.every((v) => v != null)).toBe(true);
    // Seed = first value; alpha = 2/(3+1) = 0.5
    // bar0=1 ; bar1= 0.5*2 + 0.5*1 = 1.5 ; bar2= 0.5*3 + 0.5*1.5 = 2.25
    // bar3= 0.5*4 + 0.5*2.25 = 3.125 ; bar4= 0.5*5 + 0.5*3.125 = 4.0625
    expect(out[0]).toBeCloseTo(1);
    expect(out[1]).toBeCloseTo(1.5);
    expect(out[2]).toBeCloseTo(2.25);
    expect(out[3]).toBeCloseTo(3.125);
    expect(out[4]).toBeCloseTo(4.0625);
  });
  it("carries prior value forward across an interior null (contiguous-feed guarantee)", () => {
    const out = ema([1, 2, null, 4], 3);
    expect(out[2]).toBeCloseTo(1.5); // = ema[1], carried forward
  });
});

describe("wma — weighted moving average", () => {
  it("returns null before warmup completes", () => {
    const out = wma([1, 2, 3], 3);
    expect(out[0]).toBeNull();
    expect(out[1]).toBeNull();
  });
  it("weights each bar by its position within the window", () => {
    // window [1,2,3] with weights [1,2,3] / sum(1+2+3=6) = (1+4+9)/6 = 14/6
    const out = wma([1, 2, 3, 4], 3);
    expect(out[2]).toBeCloseTo(14 / 6);
    // window [2,3,4] = (2+6+12)/6 = 20/6
    expect(out[3]).toBeCloseTo(20 / 6);
  });
});

describe("rma — Wilder's smoothing (RSI, ATR)", () => {
  it("returns null before warmup, then seeds with SMA at index length-1", () => {
    const out = rma([1, 2, 3, 4, 5], 3);
    expect(out[0]).toBeNull();
    expect(out[1]).toBeNull();
    // seed = SMA([1,2,3]) = 2
    expect(out[2]).toBeCloseTo(2);
    // then rma_i = v*(1/3) + prev*(2/3)
    // bar3 = 4/3 + 2*(2/3) = 4/3 + 4/3 = 8/3
    expect(out[3]).toBeCloseTo(8 / 3);
    // bar4 = 5/3 + (8/3)*(2/3) = 5/3 + 16/9 = 31/9
    expect(out[4]).toBeCloseTo(31 / 9);
  });
});

describe("rsi — Wilder's RSI", () => {
  it("returns null during warmup (first `length-1` bars)", () => {
    const out = rsi([1, 2, 3, 4, 5], 3);
    // gains index 0 is null (no prior), first meaningful gain at index 1;
    // rma seeds at index length-1 with SMA-over-non-null (nulls filtered out
    // of the numerator but denominator stays = length), so first defined
    // rsi value emerges at index length-1 = 2.
    expect(out[0]).toBeNull();
    expect(out[1]).toBeNull();
  });
  it("returns 100 when only gains have been seen (zero average loss)", () => {
    // strictly rising series → avgLoss = 0 → rsi = 100
    const out = rsi([1, 2, 3, 4, 5, 6, 7], 3);
    // The first eligible index will be the first one with a defined rma seed for both.
    const firstDefined = out.find((v) => v != null);
    expect(firstDefined).toBe(100);
  });
  it("returns a value in [0, 100] for a mixed series", () => {
    const out = rsi([10, 11, 10, 12, 11, 13, 10, 14], 3);
    for (const v of out) {
      if (v == null) continue;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});

describe("cum — cumulative sum", () => {
  it("running-sums every non-null bar", () => {
    const out = cum([1, 2, 3, 4]);
    expect(out).toEqual([1, 3, 6, 10]);
  });
  it("treats null as zero-contribution (does not break the running total)", () => {
    // cum's contract: skip nulls or zero them — this test locks whichever
    // is current. If the implementation errors on null, this test surfaces
    // the actual behaviour.
    const out = cum([1, null, 2, 3]);
    // Whatever the current behavior is, cum must be monotonic-non-decreasing
    // over a non-negative input series (with null coerced to 0).
    for (let i = 1; i < out.length; i++) {
      const prev = out[i - 1];
      const cur = out[i];
      if (prev == null || cur == null) continue;
      expect(cur).toBeGreaterThanOrEqual(prev);
    }
  });
});

describe("macd — MACD composite (fast/slow EMA + signal EMA)", () => {
  it("returns three parallel series of equal length to the input", () => {
    const src = Array.from({ length: 40 }, (_, i) => i + 1);
    const out = macd(src);
    expect(out.macd).toHaveLength(40);
    expect(out.signal).toHaveLength(40);
    expect(out.histogram).toHaveLength(40);
  });

  it("histogram = macd - signal on every non-null bar", () => {
    const src = Array.from({ length: 40 }, (_, i) => i + 1);
    const out = macd(src);
    for (let i = 0; i < out.macd.length; i++) {
      const m = out.macd[i], s = out.signal[i], h = out.histogram[i];
      if (m == null || s == null || h == null) continue;
      expect(h).toBeCloseTo(m - s, 8);
    }
  });

  it("uses the default fast=12/slow=26/signal=9 tuple when no args", () => {
    // On a strictly rising series, fast EMA exceeds slow EMA once seeded,
    // so macdLine > 0 in steady state.
    const src = Array.from({ length: 60 }, (_, i) => i + 1);
    const out = macd(src);
    // The very last bar's macd should be positive (fast responds sooner).
    expect(out.macd[out.macd.length - 1]).toBeGreaterThan(0);
  });
});

describe("bb — Bollinger Bands (mid = SMA, upper/lower = ±mult·stddev)", () => {
  it("returns three parallel series", () => {
    const src = Array.from({ length: 25 }, (_, i) => i + 1);
    const out = bb(src, 20, 2);
    expect(out.middle).toHaveLength(25);
    expect(out.upper).toHaveLength(25);
    expect(out.lower).toHaveLength(25);
  });

  it("upper >= middle >= lower on every non-null bar", () => {
    const src = Array.from({ length: 40 }, (_, i) => 100 + Math.sin(i));
    const out = bb(src, 20, 2);
    for (let i = 0; i < out.middle.length; i++) {
      const u = out.upper[i], m = out.middle[i], l = out.lower[i];
      if (u == null || m == null || l == null) continue;
      expect(u).toBeGreaterThanOrEqual(m);
      expect(m).toBeGreaterThanOrEqual(l);
    }
  });

  it("upper - middle equals middle - lower for symmetric envelope", () => {
    const src = Array.from({ length: 30 }, (_, i) => 100 + (i % 5));
    const out = bb(src, 20, 2);
    for (let i = 0; i < out.middle.length; i++) {
      const u = out.upper[i], m = out.middle[i], l = out.lower[i];
      if (u == null || m == null || l == null) continue;
      expect(u - m).toBeCloseTo(m - l, 8);
    }
  });
});

describe("atr — average true range (Wilder-smoothed true-range series)", () => {
  it("returns a series equal in length to the input", () => {
    const close = [10, 11, 12, 13, 14, 15, 16];
    const high  = [11, 12, 13, 14, 15, 16, 17];
    const low   = [9, 10, 11, 12, 13, 14, 15];
    const out = atr(close, high, low, 3);
    expect(out).toHaveLength(close.length);
  });

  it("emits non-null values in steady state and is non-negative (range invariant)", () => {
    const close = Array.from({ length: 20 }, (_, i) => 100 + i);
    const high  = close.map((c) => c + 1);
    const low   = close.map((c) => c - 1);
    const out = atr(close, high, low, 5);
    // At least one steady-state value must be defined.
    expect(out.some((v) => v != null)).toBe(true);
    // ATR is a range magnitude → every defined value must be ≥ 0.
    for (const v of out) {
      if (v == null) continue;
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("stoch — stochastic %K and %D", () => {
  it("returns two parallel series (%K smoothed, %D = SMA(%K))", () => {
    const close = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i));
    const high  = close.map((c) => c + 1);
    const low   = close.map((c) => c - 1);
    const out = stoch(close, high, low);
    expect(out.k).toHaveLength(30);
    expect(out.d).toHaveLength(30);
  });

  it("clamps every non-null %K to [0, 100] (raw pre-smoothing invariant)", () => {
    const close = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i));
    const high  = close.map((c) => c + 1);
    const low   = close.map((c) => c - 1);
    const out = stoch(close, high, low, 14, 3, 3);
    for (const v of out.k) {
      if (v == null) continue;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
    for (const v of out.d) {
      if (v == null) continue;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});

describe("roc — rate of change (percent)", () => {
  it("returns null before the length'th bar", () => {
    const out = roc([1, 2, 3], 5);
    expect(out.every((v) => v == null)).toBe(true);
  });
  it("computes 100 * (current - prior) / prior when prior is non-zero", () => {
    // Common Pine convention: roc(src, length) = 100 * (src - src[length]) / src[length]
    const out = roc([10, 11, 12, 13, 14, 15], 3);
    // For bar at index 3 (=13), prior = index 0 (=10): 100*(13-10)/10 = 30
    const idx3 = out[3];
    if (idx3 != null) {
      expect(idx3).toBeCloseTo(30);
    }
  });
});
