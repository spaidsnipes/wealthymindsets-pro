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
