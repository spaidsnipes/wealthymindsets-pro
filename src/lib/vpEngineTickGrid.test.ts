import { describe, expect, it } from "vitest";
import { bucketOnTickGrid, computeProfileFromBars, computeProfileFromTrades } from "./vpEngine";
import { instrumentTickFor } from "@/lib/chart/pricePrecision";
import { buildLivingProfileSnapshot } from "@/lib/marketData/viewModels/selectLivingProfile";

const onTick = (p: number, tick: number) => Math.abs(p / tick - Math.round(p / tick)) < 1e-6;

// Serving NQ1! 1m, 2026-10-06 09:13 CDT: "VAH 31548.74" — a 0.02 bucket on a 0.25-tick contract.
describe("P0.2 · profile levels land on the instrument's tick grid", () => {
  it("the tick comes from the ONE owner: NQ 0.25, ES 0.25, GC 0.10, stocks 0.01, crypto none", () => {
    expect(instrumentTickFor("NQ1!", 31548)).toBe(0.25);
    expect(instrumentTickFor("ES1!", 6800)).toBe(0.25);
    expect(instrumentTickFor("GC1!", 4300)).toBe(0.1);
    expect(instrumentTickFor("TSLA", 440)).toBe(0.01);
    expect(instrumentTickFor("BTC-USD", 124000)).toBeNull();
  });

  it("the bucket is a whole multiple of the tick, never finer than one tick; no tick → unchanged", () => {
    expect(bucketOnTickGrid(0.02, 0.25)).toBe(0.25);
    expect(bucketOnTickGrid(0.5, 0.25)).toBe(0.5);
    expect(bucketOnTickGrid(2.5, 0.25)).toBe(2.5);
    expect(bucketOnTickGrid(0.024, 0.01)).toBe(0.02);
    expect(bucketOnTickGrid(0.026, 0.01)).toBe(0.03);
    expect(bucketOnTickGrid(0.23, 0.1)).toBe(0.2);
    expect(bucketOnTickGrid(0.02, null)).toBe(0.02);
  });

  const tape = (base: number, tick: number, n = 60) =>
    Array.from({ length: n }, (_, i) => ({ price: +(base + (i % 17) * tick).toFixed(4), size: 1 + (i % 5), side: (i % 2 ? "buy" : "sell") as "buy" | "sell" }));

  for (const [sym, base, ref] of [["NQ1!", 31545, 31545], ["ES1!", 6812.5, 6812.5], ["GC1!", 4301.3, 4301.3], ["TSLA", 438.21, 438.21]] as const) {
    it(`${sym}: a few minutes of tape — every row, POC, VAH and VAL is on the tick grid`, () => {
      const tick = instrumentTickFor(sym, ref)!;
      const snap = computeProfileFromTrades(tape(base, tick), { instrumentTick: tick });
      for (const r of snap.rows) expect(onTick(r.price, tick), `row ${r.price}`).toBe(true);
      for (const p of [snap.poc, snap.vah, snap.val]) expect(onTick(p, tick), `level ${p}`).toBe(true);
      expect(snap.tickSize / tick).toBeCloseTo(Math.round(snap.tickSize / tick), 9);
    });
  }

  it("the bar path (candle-estimated) obeys the same rule", () => {
    const bars = Array.from({ length: 30 }, (_, i) => ({ time: i * 60, open: 31540 + i * 0.25, high: 31542 + i * 0.25, low: 31539 + i * 0.25, close: 31541 + i * 0.25, volume: 100 + i }));
    const snap = computeProfileFromBars(bars as never, { instrumentTick: 0.25 });
    for (const p of [snap.poc, snap.vah, snap.val, ...snap.rows.map(r => r.price)]) expect(onTick(p, 0.25), `${p}`).toBe(true);
  });

  it("the Living Profile snapshot takes the tick and its levels are on grid", () => {
    const prints = tape(31545, 0.25, 80).map(t => ({ ...t, trade: true, time: 0 }));
    const snap = buildLivingProfileSnapshot(prints as never, [], 0.25);
    for (const p of [snap.poc, snap.vah, snap.val]) expect(onTick(p, 0.25), `${p}`).toBe(true);
  });

  it("crypto (no tick on file): the derived bucket stands, nothing is guessed", () => {
    const t = Array.from({ length: 60 }, (_, i) => ({ price: 124000 + i * 0.37, size: 0.01, side: "buy" as const }));
    const a = computeProfileFromTrades(t, { instrumentTick: instrumentTickFor("BTC-USD", 124000) });
    const b = computeProfileFromTrades(t);
    expect(a.tickSize).toBe(b.tickSize);
    expect(a.poc).toBe(b.poc);
  });
});

import { selectTpoProfile } from "@/lib/marketData/viewModels/selectTpoProfile";
describe("P0.2 · TPO rows on the tick grid (a stock's narrow session)", () => {
  it("TSLA, a $2 range: every row edge, POC, VAH, VAL is a whole cent", () => {
    const bars = Array.from({ length: 40 }, (_, i) => ({ time: i * 60, high: 438 + (i % 9) * 0.21 + 0.4, low: 438 + (i % 9) * 0.21 }));
    const vm = selectTpoProfile(bars, 0.01) as unknown as { rows?: { price: number }[]; poc?: number | null; vah?: number | null; val?: number | null };
    const prices = [...(vm.rows ?? []).map(r => r.price), vm.poc, vm.vah, vm.val].filter((p): p is number => typeof p === "number");
    expect(prices.length).toBeGreaterThan(3);
    for (const p of prices) expect(onTick(p, 0.01), `${p}`).toBe(true);
  });
});
