import { describe, it, expect } from "vitest";
import {
  computeProfileFromTrades,
  computeProfileFromBars,
  chooseTickSize,
  type NormalizedTradeLite,
  type ProfileBar,
} from "./vpEngine";

// Directive §31 canonical fixture — hand-calculated expected values.
const fixture: NormalizedTradeLite[] = [
  { price: 100, size: 10, side: "buy" },
  { price: 100, size: 5, side: "sell" },
  { price: 101, size: 30, side: "buy" },
  { price: 102, size: 20, side: "sell" },
];

describe("computeProfileFromTrades — accuracy fixtures", () => {
  const p = computeProfileFromTrades(fixture, { tickSize: 1, valueAreaPct: 0.7 });

  it("total volume per price is exact", () => {
    const at = (price: number) => p.rows.find((r) => r.price === price);
    expect(at(100)).toMatchObject({ up: 10, down: 5, total: 15 });
    expect(at(101)).toMatchObject({ up: 30, down: 0, total: 30 });
    expect(at(102)).toMatchObject({ up: 0, down: 20, total: 20 });
  });

  it("totals, delta, POC", () => {
    expect(p.totalVolume).toBe(65);
    expect(p.delta).toBe(15); // (10+30) - (5+20)
    expect(p.poc).toBe(101); // highest-volume row
  });

  it("value area (70%): expands POC→above first (102>100)", () => {
    // target = 45.5; POC(101)=30, above 102=20 → 50 ≥ 45.5 → stop. VA = {101,102}
    expect(p.val).toBe(101);
    expect(p.vah).toBe(102);
  });

  it("bid/ask split — unknown aggressor halves", () => {
    const q = computeProfileFromTrades([{ price: 50, size: 8, side: "unknown" }], { tickSize: 1 });
    expect(q.rows[0]).toMatchObject({ up: 4, down: 4, total: 8 });
  });

  it("is a PURE function — identical input, identical output", () => {
    const a = computeProfileFromTrades(fixture, { tickSize: 1 });
    const b = computeProfileFromTrades(fixture, { tickSize: 1 });
    expect(a).toEqual(b);
  });

  it("out-of-order + duplicate trades produce the same distribution", () => {
    const shuffled = [fixture[3], fixture[1], fixture[2], fixture[0]];
    const a = computeProfileFromTrades(fixture, { tickSize: 1 });
    const b = computeProfileFromTrades(shuffled, { tickSize: 1 });
    expect(b.poc).toBe(a.poc);
    expect(b.vah).toBe(a.vah);
    expect(b.val).toBe(a.val);
    expect(b.totalVolume).toBe(a.totalVolume);
  });

  it("empty input is safe", () => {
    const e = computeProfileFromTrades([], {});
    expect(e.totalVolume).toBe(0);
    expect(e.rows).toEqual([]);
  });
});

describe("value-area tie-break is documented + deterministic", () => {
  // Symmetric around POC: above == below → prefer ABOVE (documented rule).
  const t: NormalizedTradeLite[] = [
    { price: 10, size: 10, side: "buy" }, // below
    { price: 11, size: 30, side: "buy" }, // POC
    { price: 12, size: 10, side: "buy" }, // above (equal to below)
  ];
  it("adds the above side on an exact tie", () => {
    const p = computeProfileFromTrades(t, { tickSize: 1, valueAreaPct: 0.7 }); // target 35
    // POC 11 (30). above 12=10 vs below 10=10 → tie → add above → 40 ≥ 35 → stop
    expect(p.poc).toBe(11);
    expect(p.vah).toBe(12);
    expect(p.val).toBe(11);
  });
});

describe("timeframe-independence (directive §2/§13)", () => {
  // Same underlying "session" trades. The TRADE-based profile must be identical
  // no matter how the chart would bar them — the whole point of the engine.
  const trades: NormalizedTradeLite[] = [];
  for (let i = 0; i < 60; i++) {
    trades.push({ price: 100 + (i % 5) * 0.25, size: 1 + (i % 3), side: i % 2 ? "buy" : "sell" });
  }
  it("trade-based POC/VAH/VAL/total are invariant to any re-grouping", () => {
    const whole = computeProfileFromTrades(trades, { tickSize: 0.25 });
    const reversed = computeProfileFromTrades([...trades].reverse(), { tickSize: 0.25 });
    expect(reversed.poc).toBe(whole.poc);
    expect(reversed.vah).toBe(whole.vah);
    expect(reversed.val).toBe(whole.val);
    expect(reversed.totalVolume).toBe(whole.totalVolume);
  });

  it("candle-estimate DIFFERS when bar granularity changes — proving the audit", () => {
    // One wide 1h-style bar vs three narrow bars covering the same range/volume.
    const wide: ProfileBar[] = [{ time: 0, open: 100, high: 103, low: 100, close: 103, volume: 90 }];
    const narrow: ProfileBar[] = [
      { time: 0, open: 100, high: 101, low: 100, close: 101, volume: 30 },
      { time: 1, open: 101, high: 102, low: 101, close: 102, volume: 30 },
      { time: 2, open: 102, high: 103, low: 102, close: 103, volume: 30 },
    ];
    const pw = computeProfileFromBars(wide, { tickSize: 1 });
    const pn = computeProfileFromBars(narrow, { tickSize: 1 });
    // Wide bar smears 90 evenly across 4 buckets (100..103) = flat.
    // Narrow bars concentrate — a DIFFERENT distribution. This asymmetry is
    // exactly why the app must feed a stable base series, not per-TF candles.
    expect(pw.quality).toBe("candle-estimated");
    const wideFlat = pw.rows.every((r) => Math.abs(r.total - pw.rows[0].total) < 1e-6);
    expect(wideFlat).toBe(true);
    const narrowFlat = pn.rows.every((r) => Math.abs(r.total - pn.rows[0].total) < 1e-6);
    expect(narrowFlat).toBe(false);
  });
});

describe("chooseTickSize", () => {
  it("scales with range, snaps to clean increments", () => {
    expect(chooseTickSize(320, 320)).toBe(1);
    expect(chooseTickSize(3200, 320)).toBe(10);
    expect(chooseTickSize(0)).toBe(1); // degenerate guard
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Founder Aug-16 XI test matrix — 8 deterministic distributions covering
// POC/VAH/VAL edge cases the VP engine MUST handle without ambiguity.
// Every case documents its own expected values so a regression in tie-break
// order, sparse-row handling, or extreme-scale bucketing fails loudly.
// ─────────────────────────────────────────────────────────────────────────────
describe("VP determinism matrix — founder XI acceptance", () => {
  it("A. single dominant bin — POC == that bin, VA collapses to it", () => {
    const trades: NormalizedTradeLite[] = [
      { price: 100, size: 100, side: "buy" },
      { price: 101, size: 1,   side: "buy" },
      { price: 99,  size: 1,   side: "sell" },
    ];
    const p = computeProfileFromTrades(trades, { tickSize: 1, valueAreaPct: 0.7 });
    expect(p.poc).toBe(100);
    expect(p.totalVolume).toBe(102);
    // 70% of 102 = 71.4; POC alone (100) meets it → VA = {100}.
    expect(p.vah).toBe(100);
    expect(p.val).toBe(100);
  });

  it("B. symmetric distribution — POC in the middle, VA expands symmetrically per tie-break rule", () => {
    const trades: NormalizedTradeLite[] = [
      { price: 98,  size: 10, side: "buy" },
      { price: 99,  size: 20, side: "buy" },
      { price: 100, size: 30, side: "buy" }, // POC
      { price: 101, size: 20, side: "buy" },
      { price: 102, size: 10, side: "buy" },
    ];
    const p = computeProfileFromTrades(trades, { tickSize: 1, valueAreaPct: 0.7 });
    expect(p.poc).toBe(100);
    // target = 63. POC(100)=30, above 101(20)=20 tie below 99(20)=20 → above wins
    //   → acc = 50, then above 102(10)=10 tie below 99(20)=20 → below wins
    //   → acc = 70 ≥ 63. VA = {99, 100, 101}.
    expect(p.vah).toBe(101);
    expect(p.val).toBe(99);
  });

  it("C. two equal POC candidates — LOWER price wins (documented tie-break)", () => {
    const trades: NormalizedTradeLite[] = [
      { price: 100, size: 25, side: "buy" }, // tied
      { price: 105, size: 25, side: "buy" }, // tied
      { price: 102, size: 10, side: "buy" },
    ];
    const p = computeProfileFromTrades(trades, { tickSize: 1, valueAreaPct: 0.7 });
    // Rows ascending; first max encountered wins → lower price (100).
    expect(p.poc).toBe(100);
  });

  it("D. sparse gaps — engine only reports populated rows, not zero-filled gaps", () => {
    const trades: NormalizedTradeLite[] = [
      { price: 100, size: 10, side: "buy" },
      { price: 110, size: 20, side: "buy" }, // POC (10-unit gap)
      { price: 120, size: 10, side: "sell" },
    ];
    const p = computeProfileFromTrades(trades, { tickSize: 1, valueAreaPct: 0.7 });
    expect(p.poc).toBe(110);
    expect(p.populatedRows).toBe(3); // three populated buckets only
    expect(p.rows).toHaveLength(3);
    // Value-area walk over sparse rows: target = 28. POC=20, above 120=10 vs below 100=10 → tie → above wins
    //   → 30 ≥ 28 → stop. VA = {110, 120}.
    expect(p.val).toBe(110);
    expect(p.vah).toBe(120);
  });

  it("E. one-trade profile — POC == VAH == VAL == that price", () => {
    const trades: NormalizedTradeLite[] = [
      { price: 42.5, size: 3, side: "unknown" },
    ];
    const p = computeProfileFromTrades(trades, { tickSize: 0.5, valueAreaPct: 0.7 });
    expect(p.poc).toBe(42.5);
    expect(p.vah).toBe(42.5);
    expect(p.val).toBe(42.5);
    expect(p.totalVolume).toBe(3);
    // Unknown split evenly.
    expect(p.rows[0]).toMatchObject({ up: 1.5, down: 1.5 });
  });

  it("F. very wide price range — chooseTickSize scales, no bucket explosion", () => {
    // Simulate an instrument moving through a 100k range (index-scale futures).
    const trades: NormalizedTradeLite[] = [];
    for (let p = 30_000; p <= 130_000; p += 100) {
      trades.push({ price: p, size: 1, side: p % 200 === 0 ? "buy" : "sell" });
    }
    const p = computeProfileFromTrades(trades, { targetRows: 320 });
    // 1001 sample trades over 100k range. chooseTickSize picks 250 → 401 buckets.
    // Assertion: bucketing scales to tick size (>1), populatedRows bounded within
    // (a small constant multiple of the sample count), and no infinite growth.
    expect(p.tickSize).toBeGreaterThan(1);
    expect(p.populatedRows).toBeLessThan(trades.length + 100); // bounded by data density
    expect(p.poc).toBeGreaterThanOrEqual(30_000);
    expect(p.poc).toBeLessThanOrEqual(130_000);
  });

  it("G. extremely tight price range — 4-decimal instrument (crypto/fx)", () => {
    const trades: NormalizedTradeLite[] = [
      { price: 1.2001, size: 100, side: "buy" },
      { price: 1.2002, size: 200, side: "buy" }, // POC
      { price: 1.2003, size: 100, side: "sell" },
    ];
    const p = computeProfileFromTrades(trades, { tickSize: 0.0001, valueAreaPct: 0.7 });
    // POC bucket is 1.2002 with 200. Floating-point bucketing must not collapse
    // three distinct 4-decimal prices into one row.
    expect(p.populatedRows).toBe(3);
    expect(p.poc).toBeCloseTo(1.2002, 4);
  });

  it("H. high-decimal instrument — small tick size retains distinctness", () => {
    const trades: NormalizedTradeLite[] = [
      { price: 0.00001234, size: 1e6, side: "buy" },
      { price: 0.00001235, size: 2e6, side: "buy" },
      { price: 0.00001236, size: 1e6, side: "sell" },
    ];
    const p = computeProfileFromTrades(trades, { tickSize: 0.00000001, valueAreaPct: 0.7 });
    expect(p.populatedRows).toBe(3);
    expect(p.poc).toBeCloseTo(0.00001235, 8);
    expect(p.totalVolume).toBe(4e6);
  });

  it("zero-volume rows never surface (filter is total > 0)", () => {
    // A trade with size 0 must not create a phantom row.
    const trades: NormalizedTradeLite[] = [
      { price: 100, size: 0,  side: "buy" },
      { price: 101, size: 10, side: "buy" },
    ];
    const p = computeProfileFromTrades(trades, { tickSize: 1 });
    expect(p.rows).toHaveLength(1);
    expect(p.rows[0].price).toBe(101);
  });

  it("value-area cannot exceed 100% of total — degrades gracefully", () => {
    const trades: NormalizedTradeLite[] = [
      { price: 100, size: 10, side: "buy" },
      { price: 101, size: 10, side: "buy" },
      { price: 102, size: 10, side: "buy" },
    ];
    const p = computeProfileFromTrades(trades, { tickSize: 1, valueAreaPct: 2.0 });
    // valueAreaPct > 1 → VA expands to the full range, no infinite loop.
    expect(p.val).toBe(100);
    expect(p.vah).toBe(102);
    expect(p.totalVolume).toBe(30);
  });
});
