import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(
  path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8",
)
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * Delta Bubble level ownership — Founding Contract §13 open gate,
 * and §5 SYSTEM TRUTH LAW (order-flow evidence must not be silently lost).
 *
 * getDeltaBubbleLevels assigned ticks to price buckets with
 *   Math.abs(price - center) < half
 * a STRICT comparison against the bucket half-width. A tick landing exactly
 * on a bucket edge satisfied NO bucket and vanished from bid, ask and delta.
 *
 * Market prices are quantised to tick size (0.25 futures, 0.01 equities), so
 * whenever levelStep is a multiple of that tick, real traded prices land on
 * boundaries systematically — and the bar's own low and high are ALWAYS
 * boundaries. The extremes, where absorption and rejection evidence lives,
 * were dropped from every bar.
 *
 * The old code only looked correct on decimal prices because floating-point
 * error nudged |price - center| just under `half`.
 */

/** Old behaviour, reproduced exactly. */
function assignStrict(price: number, lo: number, step: number, numLev: number): number | null {
  const half = step / 2;
  for (let i = 0; i < numLev; i++) {
    const center = lo + i * step + step / 2;
    if (Math.abs(price - center) < half) return i;
  }
  return null;
}

/** New behaviour: half-open [start, end), last bucket inclusive of hi. */
function assignHalfOpen(price: number, lo: number, step: number, numLev: number): number {
  const raw = Math.floor((price - lo) / step);
  return Math.max(0, Math.min(numLev - 1, raw));
}

describe("delta bubble level binning", () => {
  it("the old strict comparison dropped exact bucket edges (regression record)", () => {
    const lo = 0, hi = 1, numLev = 4, step = (hi - lo) / numLev;
    for (const edge of [0.0, 0.25, 0.5, 1.0]) {
      expect(assignStrict(edge, lo, step, numLev)).toBeNull();
    }
  });

  it("half-open binning places every exact edge, including bar low and high", () => {
    const lo = 0, hi = 1, numLev = 4, step = (hi - lo) / numLev;
    for (const edge of [0.0, 0.25, 0.5, 0.75, 1.0]) {
      const idx = assignHalfOpen(edge, lo, step, numLev);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(numLev);
    }
    // Bar low → first bucket; bar high → last bucket.
    expect(assignHalfOpen(0.0, lo, step, numLev)).toBe(0);
    expect(assignHalfOpen(1.0, lo, step, numLev)).toBe(numLev - 1);
  });

  it("conserves total volume — no tick is lost at any tick size", () => {
    for (const [lo, hi, tick] of [[100, 101, 0.25], [4500, 4502, 0.25], [10, 10.5, 0.01]] as const) {
      const numLev = 8;
      const step = (hi - lo) / numLev;
      const prices: number[] = [];
      for (let p = lo; p <= hi + 1e-9; p += tick) prices.push(+p.toFixed(6));

      const binned = new Array(numLev).fill(0);
      for (const p of prices) binned[assignHalfOpen(p, lo, step, numLev)] += 1;

      // Every price accounted for exactly once.
      expect(binned.reduce((a, b) => a + b, 0)).toBe(prices.length);
      // And the strict version would have lost some of them.
      const lost = prices.filter(p => assignStrict(p, lo, step, numLev) === null).length;
      expect(lost).toBeGreaterThan(0);
    }
  });

  it("never returns an out-of-range index for prices outside [lo, hi]", () => {
    const lo = 100, hi = 101, numLev = 6, step = (hi - lo) / numLev;
    expect(assignHalfOpen(99, lo, step, numLev)).toBe(0);
    expect(assignHalfOpen(500, lo, step, numLev)).toBe(numLev - 1);
  });

  it("MainChart no longer uses the strict-centre comparison", () => {
    expect(src).not.toContain("Math.abs(t.price - priceLevel) < half");
    expect(src).toContain("Math.floor((t.price - bucketLo) / levelStep)");
    expect(src).toContain("Math.min(numLev - 1, raw)");
  });
});
