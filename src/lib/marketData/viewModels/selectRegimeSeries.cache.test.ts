import { describe, expect, it } from "vitest";
import { selectRegimeSeries } from "./selectRegimeSeries";

/**
 * PERF P0 2026-10-25: the per-bar regime readings are KEPT across calls (dimsCache). The series must
 * be identical to a fresh derivation at every step of a growing tape — the cache only skips work.
 */
const rnd = (seed: number) => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

describe("selectRegimeSeries with dimsCache = without it", () => {
  it("matches a fresh derivation while the tape grows and the forming bar moves", () => {
    const r = rnd(11);
    const barSec = 60;
    const t0 = 1_800_000_000; // epoch seconds
    const bars = Array.from({ length: 40 }, (_, i) => ({ time: t0 + i * barSec }));
    const ticks: { price: number; size: number; side: "buy" | "sell"; time: number; trade: true }[] = [];
    let px = 100, ms = t0 * 1000;
    const cache = new Map();
    let reused = 0;
    for (let step = 0; step < 25; step++) {
      for (let k = 0; k < 60; k++) {
        ms += Math.floor(r() * 1500);
        px = +(px + (r() - 0.5) * 0.4).toFixed(2);
        ticks.unshift({ price: px, size: +(r() * 2 + 0.01).toFixed(3), side: r() < 0.5 ? "buy" : "sell", time: ms, trade: true });
      }
      const now = ms + 10;
      const before = cache.size;
      const kept = selectRegimeSeries({ bars, barSec, ticks, source: "coinbase", now, dimsCache: cache });
      const fresh = selectRegimeSeries({ bars, barSec, ticks, source: "coinbase", now });
      expect(kept).toEqual(fresh);
      if (before > 0) reused++;
    }
    expect(reused).toBeGreaterThan(10);
    expect(cache.size).toBeGreaterThan(0);
  });
});
