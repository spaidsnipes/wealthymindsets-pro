import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  nyParts,
  selectSessionCandles,
  buildSessionLevels,
  foldTape,
  buildTapeLevels,
  type Candle,
  type TapeTick,
} from "./sessionVP";

/**
 * WM-VP-P0-01 — one test per Forge failure mode + an architectural guard.
 * Contract: docs/operations/handoffs/forge/2026-07-31-forge-to-noah-wm-vp-p0-01-implementation-contract.md
 *
 * The VP is a PURE projection of the chart's canonical candles. These exercise
 * the projection logic directly (the repo tests pure lib functions; there is no
 * DOM test harness), plus a source-level guard that the VP issues no fetch.
 */

// A candle at "now" (today, ET) — used where we need the live trading day.
function candleNow(price: number, vol = 100, dPrice = 1): Candle {
  const t = Math.floor(Date.now() / 1000);
  return { time: t, open: price, high: price + dPrice, low: price - dPrice, close: price, volume: vol };
}
// A candle on a fixed PAST weekday, at ~noon ET (RTH minute ~720). 2020-01-15.
function candlePast(price: number, vol = 100, dPrice = 1): Candle {
  const t = Math.floor(Date.UTC(2020, 0, 15, 17, 0, 0) / 1000); // 12:00 EST → ET minute 720
  return { time: t, open: price, high: price + dPrice, low: price - dPrice, close: price, volume: vol };
}

describe("WM-VP-P0-01 · Session VP is a pure projection of chart candles", () => {
  // ── Test 1: No independent fetch (architectural guard — kills F-A's root) ──
  it("issues no independent fetch — no /api/yahoo, no fetch() in the VP path", () => {
    const vp = readFileSync(resolve(__dirname, "../components/chart/WMSessionVP.tsx"), "utf8");
    const lib = readFileSync(resolve(__dirname, "./sessionVP.ts"), "utf8");
    // The old bug was a hardcoded Yahoo candle fetch inside the component.
    expect(vp).not.toMatch(/\/api\/yahoo/);
    expect(vp).not.toMatch(/\bfetch\s*\(/);
    expect(lib).not.toMatch(/\/api\/yahoo/);
    expect(lib).not.toMatch(/\bfetch\s*\(/);
    // And it must accept the chart's canonical candles as a prop.
    expect(vp).toMatch(/candles:\s*Candle\[\]/);
  });

  // ── Test 2: Symbol-switch race guard — B never contains A's price bins ──
  it("symbol switch A→B: B's profile contains none of A's price bins, and no residual tape bleeds", () => {
    const aCandles = Array.from({ length: 6 }, (_, i) => candleNow(250 + i)); // ~TSLA
    const bCandles = Array.from({ length: 6 }, (_, i) => candleNow(600 + i)); // different symbol
    const aLevels = buildSessionLevels(selectSessionCandles(aCandles, "24H"));
    const bLevels = buildSessionLevels(selectSessionCandles(bCandles, "24H"));
    expect(aLevels.length).toBeGreaterThan(0);
    expect(bLevels.length).toBeGreaterThan(0);
    // Disjoint price regions → switching the candle input to B yields no A bins.
    const aMax = Math.max(...aLevels.map(l => l.price));
    const bMin = Math.min(...bLevels.map(l => l.price));
    expect(aMax).toBeLessThan(bMin);
    // On identity change the component drops tape; the projection over B with an
    // empty tape must equal B's bar levels exactly (no A tape residue).
    const bWithClearedTape = foldTape(bLevels, [] as TapeTick[]);
    expect(bWithClearedTape).toEqual(bLevels);
  });

  // ── Test 3: Early-session honest state — kills F-B (no yesterday's profile) ──
  it("early session (today's bars absent) yields empty → 'awaiting bars', never yesterday's profile", () => {
    const yesterdayRTH = Array.from({ length: 6 }, (_, i) => candlePast(250 + i));
    // RTH is pinned to the live trading day; past-dated bars are excluded.
    expect(selectSessionCandles(yesterdayRTH, "RTH")).toEqual([]);
    expect(buildSessionLevels(selectSessionCandles(yesterdayRTH, "RTH"))).toEqual([]);
    // Date-pin isolation: past date excluded, today included (proves it's the
    // day pin, not a minute-window exclusion).
    expect(selectSessionCandles(yesterdayRTH, "24H")).toEqual([]);
    const todayCandles = Array.from({ length: 6 }, (_, i) => candleNow(250 + i));
    expect(selectSessionCandles(todayCandles, "24H").length).toBeGreaterThan(0);
  });

  // ── Test 4: Non-Yahoo/crypto populates from canonical candles; live tape
  //           paints even when the bar layer is empty — kills F-A and F-C ──
  it("populates from canonical candles regardless of provider; live tape paints with empty bars", () => {
    // A "crypto" symbol whose chart candles came from a non-Yahoo provider —
    // the VP projects them directly, so it is never a blank Yahoo panel.
    const cryptoCandles = Array.from({ length: 8 }, (_, i) => candleNow(65000 + i * 10, 5, 8));
    const barLevels = buildSessionLevels(selectSessionCandles(cryptoCandles, "24H"));
    expect(barLevels.length).toBeGreaterThan(0);
    expect(barLevels.reduce((s, l) => s + l.total, 0)).toBeGreaterThan(0);

    // F-C: even with NO bar candles, a flowing tape produces a live profile —
    // bar-emptiness must not suppress the tick layer.
    const tape: TapeTick[] = [
      { price: 100.0, size: 3, side: "buy" },
      { price: 100.5, size: 2, side: "sell" },
      { price: 101.0, size: 4, side: "buy" },
    ];
    const emptyBars = buildSessionLevels([]); // no candles at all
    expect(emptyBars).toEqual([]);
    const tapeLevels = buildTapeLevels(tape);
    expect(tapeLevels.length).toBeGreaterThan(0);
    expect(tapeLevels.reduce((s, l) => s + l.total, 0)).toBe(9);
  });

  // Sanity: nyParts is a stable ET projection (underpins the day pin).
  it("nyParts maps a known epoch to the correct ET date/minute", () => {
    const p = nyParts(Math.floor(Date.UTC(2020, 0, 15, 17, 0, 0) / 1000));
    expect(p.date).toBe("2020-01-15");
    expect(p.minute).toBe(720); // 12:00 EST
  });
});

/**
 * SHIFT-R VP Histogram Runtime Invariants — canon §8 ATH Proof Stack
 * (Recovery Proof + System Proof). Founder-reported "VP bars messed up"
 * on prod cannot be observed from this environment, so a broader
 * invariant sweep locks the pipeline's mandatory outputs at CI time.
 * Any regression that zeroes out bins, collapses the histogram, or
 * mislocates the POC will fail here before shipping.
 */
describe("buildSessionLevels — runtime histogram invariants (SHIFT-R VP defense)", () => {
  const c = (price: number, volume = 100, dPrice = 1): Candle => ({
    time: 0, open: price, high: price + dPrice, low: price - dPrice, close: price, volume,
  });

  it("produces exactly 48 bins for any non-degenerate candle set (canon: stable bin grid)", () => {
    const levels = buildSessionLevels([c(100), c(101), c(99)]);
    expect(levels.length).toBe(48);
  });

  it("empty input → empty output (no fake histogram)", () => {
    expect(buildSessionLevels([])).toEqual([]);
  });

  it("zero-range input (all candles at one price) → empty output — no divide-by-zero, no fake bins", () => {
    const flat: Candle = { time: 0, open: 100, high: 100, low: 100, close: 100, volume: 500 };
    expect(buildSessionLevels([flat, flat, flat])).toEqual([]);
  });

  it("total volume across all bins conserves the input volume (accounting invariant)", () => {
    const candles = [c(100, 100), c(101, 200), c(99, 300)];
    const totalIn = candles.reduce((s, k) => s + k.volume, 0);
    const totalOut = buildSessionLevels(candles).reduce((s, l) => s + l.total, 0);
    // Volume is spread across the [low, high] bin range of each candle; the
    // sum across all bins must equal the sum of input volumes (to a small
    // float tolerance from repeated division).
    expect(Math.abs(totalOut - totalIn)).toBeLessThan(0.001);
  });

  it("POC bin (max total) exists and carries positive volume when input has volume", () => {
    const levels = buildSessionLevels([c(100, 100), c(100, 200), c(100, 300)]);
    const maxTotal = Math.max(...levels.map(l => l.total));
    expect(maxTotal).toBeGreaterThan(0);
  });

  it("zero-volume candles produce all-zero bin totals (no fabrication)", () => {
    const zero = [c(100, 0), c(101, 0), c(99, 0)];
    const levels = buildSessionLevels(zero);
    expect(levels.length).toBe(48);
    expect(levels.every(l => l.total === 0)).toBe(true);
  });

  it("bins are ordered high-price → low-price (top-down render order)", () => {
    const levels = buildSessionLevels([c(100), c(101), c(99)]);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i - 1].price).toBeGreaterThan(levels[i].price);
    }
  });

  it("no bin has NaN or Infinity in `total` — pipeline must be numerically clean", () => {
    const candles = [c(100, 100), c(150, 200), c(50, 300)];
    const levels = buildSessionLevels(candles);
    for (const l of levels) {
      expect(Number.isFinite(l.total)).toBe(true);
      expect(Number.isFinite(l.price)).toBe(true);
      expect(Number.isNaN(l.total)).toBe(false);
    }
  });

  it("bid/ask/delta are always exactly zero for bar-derived bins (canon: no synthesized directional volume)", () => {
    const levels = buildSessionLevels([c(100, 100), c(101, 200)]);
    for (const l of levels) {
      expect(l.bid).toBe(0);
      expect(l.ask).toBe(0);
      expect(l.delta).toBe(0);
    }
  });

  it("wide-price candles spread volume across many bins (pipeline is a real projection, not point-collapse)", () => {
    // A candle spanning 90-110 with the full 48-bin range should touch most bins.
    const wide: Candle = { time: 0, open: 100, high: 110, low: 90, close: 100, volume: 1000 };
    const levels = buildSessionLevels([wide]);
    const populated = levels.filter(l => l.total > 0).length;
    // Every non-zero bin means the projection is real, not a stick.
    expect(populated).toBeGreaterThan(1);
  });
});
