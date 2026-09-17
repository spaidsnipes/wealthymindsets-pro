import { describe, it, expect } from "vitest";
import {
  selectDeltaLevels,
  TARGET_LEVELS,
  DELTA_LEVELS_VERSION,
} from "./selectDeltaLevels";
import type { AggressorTick } from "../selectAggressorFlow";

const t = (price: number, size: number, side: "buy" | "sell"): AggressorTick => ({
  price,
  size,
  side,
  trade: true,
});

/** A penny-grid tape from `from` to `to` inclusive, alternating sides. */
function grid(from: number, to: number, step: number): AggressorTick[] {
  const out: AggressorTick[] = [];
  let i = 0;
  for (let p = from; p <= to + step / 2; p += step) {
    out.push(t(Number(p.toFixed(10)), 100, i % 2 === 0 ? "buy" : "sell"));
    i++;
  }
  return out;
}

describe("selectDeltaLevels — honest empties", () => {
  it("returns no levels for null, empty, and quote-only tape", () => {
    for (const input of [null, undefined, [], [{ price: 10, size: 5, side: "buy" as const }]]) {
      const vm = selectDeltaLevels(input as AggressorTick[] | null);
      expect(vm.levels).toEqual([]);
      expect(vm.tickSize).toBeNull();
      expect(vm.maxAbsDelta).toBe(0);
      expect(vm.version).toBe(DELTA_LEVELS_VERSION);
    }
  });

  it("drops prints with no side, no size, or no price rather than guessing", () => {
    const vm = selectDeltaLevels([
      t(10, 100, "buy"),
      { price: 10.01, size: 100, trade: true },
      { price: 10.02, size: 0, side: "buy", trade: true },
      { price: 0, size: 100, side: "sell", trade: true },
    ] as AggressorTick[]);
    const total = vm.levels.reduce((s, l) => s + l.vol, 0);
    expect(total).toBe(100);
  });

  it("reports a one-price window as one level, not as a fabricated span", () => {
    const vm = selectDeltaLevels([t(50, 10, "buy"), t(50, 4, "sell")]);
    expect(vm.levels).toHaveLength(1);
    expect(vm.levels[0].price).toBe(50);
    expect(vm.levels[0].delta).toBe(6);
    expect(vm.levels[0].vol).toBe(14);
    expect(vm.tickSize).toBeNull();
    expect(vm.ticksPerLevel).toBeNull();
  });
});

describe("selectDeltaLevels — DEFECT: printed prices that never traded", () => {
  /**
   * The inline six-bucket version labelled each bubble `lo + (i+0.5)·span/6`,
   * which on a penny grid is a price no order could rest at. Every level this
   * module emits must be an exact multiple of the MEASURED tick.
   */
  it("every level price is an exact multiple of the observed tick", () => {
    const vm = selectDeltaLevels(grid(431.0, 431.5, 0.01));
    expect(vm.tickSize).toBeCloseTo(0.01, 10);
    expect(vm.levels.length).toBeGreaterThan(1);
    for (const l of vm.levels) {
      const ticks = l.price / vm.tickSize!;
      expect(Math.abs(ticks - Math.round(ticks))).toBeLessThan(1e-6);
    }
  });

  it("holds on a quarter-point futures grid too", () => {
    const vm = selectDeltaLevels(grid(1204.0, 1209.0, 0.25));
    expect(vm.tickSize).toBeCloseTo(0.25, 10);
    for (const l of vm.levels) {
      const ticks = l.price / 0.25;
      expect(Math.abs(ticks - Math.round(ticks))).toBeLessThan(1e-6);
    }
  });
});

describe("selectDeltaLevels — DEFECT: levels drifting on an unrelated print", () => {
  /**
   * Bucket width used to be `span/6`, so ONE new extreme rescaled every bucket
   * and slid every bubble to a new price — a level moving because of a trade
   * somewhere else. Levels are anchored to the grid, so the prices already on
   * screen must survive a new print at the top of the range.
   */
  it("keeps existing level prices when a new high arrives", () => {
    const base = grid(100.0, 100.1, 0.01);
    const before = selectDeltaLevels(base);
    const after = selectDeltaLevels([...base, t(100.11, 100, "buy")]);

    expect(after.ticksPerLevel).toBe(before.ticksPerLevel);
    const afterPrices = new Set(after.levels.map((l) => l.price));
    for (const l of before.levels) expect(afterPrices.has(l.price)).toBe(true);
  });

  /**
   * The sharper case, and the one the first version of this module still got
   * wrong: grouping was anchored at the window's LOW, so a new low re-cut
   * every group even though the boundaries were all on the grid. Levels are
   * anchored at grid index zero instead, so which ticks share a bubble is a
   * property of the PRICE and not of the window it was seen in.
   */
  it("keeps existing level prices when a new LOW arrives", () => {
    const base = grid(100.0, 100.1, 0.01);
    const before = selectDeltaLevels(base);
    const after = selectDeltaLevels([...base, t(99.99, 100, "buy")]);

    expect(after.ticksPerLevel).toBe(before.ticksPerLevel);
    const afterPrices = new Set(after.levels.map((l) => l.price));
    for (const l of before.levels) expect(afterPrices.has(l.price)).toBe(true);
  });

  it("puts every level edge on a whole multiple of the group width", () => {
    const vm = selectDeltaLevels(grid(100.0, 101.0, 0.01));
    const groupWidth = vm.ticksPerLevel! * vm.tickSize!;
    for (const l of vm.levels) {
      const n = l.price / groupWidth;
      expect(Math.abs(n - Math.round(n))).toBeLessThan(1e-6);
    }
  });

  /**
   * A wide window groups more ticks per bubble instead of growing the bubble
   * count without bound. The ceiling is TARGET_LEVELS + 1, not TARGET_LEVELS:
   * because the partition is anchored to the grid rather than to the window,
   * the window's low can sit mid-group and straddle one extra bubble. That
   * single extra bubble is the whole price of levels that do not move, and it
   * is bounded — the count cannot drift further than one.
   */
  it("groups more ticks per bubble rather than emitting more bubbles", () => {
    const wide = selectDeltaLevels(grid(100.0, 101.0, 0.01));
    expect(wide.levels.length).toBeLessThanOrEqual(TARGET_LEVELS + 1);
    expect(wide.ticksPerLevel!).toBeGreaterThan(1);
  });

  it("stays within the +1 bound across many window widths", () => {
    for (let ticks = 2; ticks <= 400; ticks++) {
      const vm = selectDeltaLevels(grid(100.0, 100 + ticks * 0.01, 0.01));
      expect(vm.levels.length).toBeLessThanOrEqual(TARGET_LEVELS + 1);
    }
  });
});

describe("selectDeltaLevels — arithmetic", () => {
  it("nets buy against sell at the same level and totals volume", () => {
    const vm = selectDeltaLevels([
      t(10.0, 300, "buy"),
      t(10.0, 100, "sell"),
      t(10.01, 50, "sell"),
    ]);
    const lvl = vm.levels.find((l) => Math.abs(l.price - 10.0) < 1e-9)!;
    expect(lvl.delta).toBe(200);
    expect(lvl.vol).toBe(400);
  });

  it("conserves total volume across all levels", () => {
    const ticks = grid(20.0, 20.4, 0.01);
    const vm = selectDeltaLevels(ticks);
    const total = vm.levels.reduce((s, l) => s + l.vol, 0);
    expect(total).toBe(ticks.length * 100);
  });

  it("maxAbsDelta is the largest magnitude actually present", () => {
    const vm = selectDeltaLevels([
      t(5.0, 900, "buy"),
      t(5.01, 100, "sell"),
      t(5.02, 50, "buy"),
    ]);
    expect(vm.maxAbsDelta).toBe(Math.max(...vm.levels.map((l) => Math.abs(l.delta))));
    expect(vm.maxAbsDelta).toBe(900);
  });

  it("sorts high price first, the way a ladder is read", () => {
    const vm = selectDeltaLevels(grid(7.0, 7.2, 0.01));
    const prices = vm.levels.map((l) => l.price);
    expect([...prices].sort((a, b) => b - a)).toEqual(prices);
  });

  it("is scale-invariant — the same tape ×100 gives the same shape", () => {
    const small = selectDeltaLevels(grid(1.0, 1.05, 0.01));
    const big = selectDeltaLevels(grid(100.0, 105.0, 1));
    expect(big.levels.map((l) => l.delta)).toEqual(small.levels.map((l) => l.delta));
    expect(big.levels.map((l) => l.vol)).toEqual(small.levels.map((l) => l.vol));
    expect(big.ticksPerLevel).toBe(small.ticksPerLevel);
  });
});
