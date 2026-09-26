import { describe, expect, it } from "vitest";
import { priceFormatFor, pricePrecisionFromBars } from "./pricePrecision";

const bar = (o: number, h: number, l: number, c: number) => ({ open: o, high: h, low: l, close: c });

describe("pricePrecisionFromBars", () => {
  it("keeps two decimals for quarter-tick futures and cents", () => {
    expect(pricePrecisionFromBars([bar(30846.5, 30862.75, 30846.5, 30855.25)])).toBe(2);
    expect(pricePrecisionFromBars([bar(372.38, 375.18, 370.37, 372.82)])).toBe(2);
    expect(pricePrecisionFromBars([bar(30846, 30862, 30846, 30855)])).toBe(2);
  });

  it("states a forex pip (the EURUSD 1h defect: 1.14 everywhere)", () => {
    expect(pricePrecisionFromBars([bar(1.14235, 1.1431, 1.1418, 1.14262)])).toBe(5);
    expect(pricePrecisionFromBars([bar(1.1423, 1.1431, 1.1418, 1.1426)])).toBe(4);
  });

  it("reads the grid from every sampled price, not just the last close", () => {
    expect(pricePrecisionFromBars([bar(0.00001234, 0.00001240, 0.00001230, 0.00001236), bar(0.0000124, 0.0000125, 0.0000123, 0.0000124)])).toBe(8);
  });

  it("falls back on magnitude when feed floats carry adder noise", () => {
    const noisy = 1.1423 + 1e-11;
    expect(pricePrecisionFromBars([bar(noisy, noisy, noisy, noisy)])).toBe(4);
    const noisyBtc = 83843.71 + 3.3e-9;
    expect(pricePrecisionFromBars([bar(noisyBtc, noisyBtc, noisyBtc, noisyBtc)])).toBe(2);
  });

  it("float32 feed prices do not mint decimals (BTC read 83896.2600000 on serving)", () => {
    const f32 = (v: number) => Math.fround(v);
    expect(pricePrecisionFromBars([bar(f32(83947.24), f32(83947.24), f32(83874.62), f32(83896.26))])).toBe(2);
    expect(pricePrecisionFromBars([bar(83947.2421875, 83947.2421875, 83874.6200000, 83896.26)])).toBe(2);
    // EURUSD keeps its pips under the cap; a micro-priced coin keeps 8.
    expect(pricePrecisionFromBars([bar(f32(1.14235), f32(1.1431), f32(1.1418), f32(1.14262))])).toBeLessThanOrEqual(6);
    expect(pricePrecisionFromBars([bar(f32(1.14235), f32(1.1431), f32(1.1418), f32(1.14262))])).toBeGreaterThanOrEqual(4);
  });

  it("a few sub-penny prints do not move a stock off cents (TSLA read 377.000)", () => {
    const bars = Array.from({ length: 40 }, (_, i) => bar(373 + i * 0.01, 373.5 + i * 0.01, 372.9 + i * 0.01, 373.2 + i * 0.01));
    bars[7] = bar(373.805, 373.9, 373.7, 373.805);
    bars[21] = bar(374.115, 374.2, 374.0, 374.115);
    expect(pricePrecisionFromBars(bars)).toBe(2);
    // …but a market that genuinely quotes finer still gets its grid.
    const pips = Array.from({ length: 40 }, (_, i) => bar(1.14235 + i * 1e-5, 1.1431, 1.1418, 1.14262 + i * 1e-5));
    expect(pricePrecisionFromBars(pips)).toBe(5);
  });

  it("half-cent midpoint prints stay on the cents grid (TSLA axis read 388.000 on serving)", () => {
    // Measured shape: a quarter of the prices land exactly half a cent off.
    const bars = Array.from({ length: 40 }, (_, i) => i % 4 === 0
      ? bar(366.565 + i * 0.01, 366.9 + i * 0.01, 365.095 + i * 0.01, 366.525 + i * 0.01)
      : bar(366.56 + i * 0.01, 366.9 + i * 0.01, 365.09 + i * 0.01, 366.52 + i * 0.01));
    expect(pricePrecisionFromBars(bars)).toBe(2);
    // A genuine pipette feed does not hide behind the allowance.
    const pipettes = Array.from({ length: 40 }, (_, i) => bar(1.14235 + i * 1e-5, 1.14311 + i * 1e-5, 1.14187 + i * 1e-5, 1.14262 + i * 1e-5));
    expect(pricePrecisionFromBars(pipettes)).toBe(5);
    // Below $1 there is no cents grid to sit on.
    const sub = Array.from({ length: 40 }, (_, i) => bar(0.125 + i * 0.01, 0.135 + i * 0.01, 0.115 + i * 0.01, 0.125 + i * 0.01));
    expect(pricePrecisionFromBars(sub)).toBe(3);
  });

  it("float32 futures quote their own grid (Sentinel: CL1! read 91.730, ZN1! lost its 1/64ths)", () => {
    const f32 = (v: number) => Math.fround(v);
    const cl = Array.from({ length: 30 }, (_, i) => bar(f32(91.7 + i * 0.01), f32(91.75 + i * 0.01), f32(91.6 + i * 0.01), f32(91.73 + i * 0.01)));
    expect(pricePrecisionFromBars(cl)).toBe(2);
    const gc = Array.from({ length: 30 }, (_, i) => bar(f32(4331.4 + i * 0.1), f32(4332 + i * 0.1), f32(4330.1 + i * 0.1), f32(4331.5 + i * 0.1)));
    expect(pricePrecisionFromBars(gc)).toBe(2);
    const zn = Array.from({ length: 30 }, (_, i) => bar(104.9375 + (i % 4) * 0.015625, 105, 104.90625, 104.953125));
    expect(pricePrecisionFromBars(zn)).toBeGreaterThanOrEqual(4);
  });

  it("no bars → the floor", () => {
    expect(pricePrecisionFromBars([])).toBe(2);
  });

  // Garden 16, 2026-09-26: TSLA on Webull's consolidated bars — measured shape:
  // ~17% of recent prices are sub-penny executions off even the half-cent grid.
  const consolidatedTsla = Array.from({ length: 60 }, (_, i) => i % 6 === 0
    ? bar(367.3818 + i * 0.01, 367.9 + i * 0.01, 365.0001 + i * 0.01, 367.1725 + i * 0.01)
    : bar(367.38 + i * 0.01, 367.9 + i * 0.01, 365.1 + i * 0.01, 367.17 + i * 0.01));

  it("a US equity at or above $1 quotes in cents whatever sub-penny prints its tape carries (TSLA read 388.0000)", () => {
    expect(pricePrecisionFromBars(consolidatedTsla)).toBeGreaterThan(2); // the bars alone cannot see the grid
    expect(pricePrecisionFromBars(consolidatedTsla, "TSLA")).toBe(2);
    expect(pricePrecisionFromBars(consolidatedTsla, "tsla")).toBe(2);
  });

  it("the cents rule is the equity's alone: FX, crypto, futures and sub-dollar stocks keep their measured grid", () => {
    const pipettes = Array.from({ length: 40 }, (_, i) => bar(1.14235 + i * 1e-5, 1.14311 + i * 1e-5, 1.14187 + i * 1e-5, 1.14262 + i * 1e-5));
    expect(pricePrecisionFromBars(pipettes, "EURUSD")).toBe(5);
    expect(pricePrecisionFromBars(consolidatedTsla, "BTC-USD")).toBe(pricePrecisionFromBars(consolidatedTsla));
    expect(pricePrecisionFromBars(consolidatedTsla, "ES1!")).toBe(pricePrecisionFromBars(consolidatedTsla));
    const penny = Array.from({ length: 40 }, (_, i) => bar(0.4123 + i * 1e-4, 0.4133 + i * 1e-4, 0.4113 + i * 1e-4, 0.4125 + i * 1e-4));
    expect(pricePrecisionFromBars(penny, "ABCD")).toBe(4);
  });
});

describe("priceFormatFor", () => {
  it("minMove is one unit of the last decimal, clamped to 2..8", () => {
    expect(priceFormatFor(5)).toEqual({ type: "price", precision: 5, minMove: 0.00001 });
    expect(priceFormatFor(2)).toEqual({ type: "price", precision: 2, minMove: 0.01 });
    expect(priceFormatFor(12).precision).toBe(8);
    expect(priceFormatFor(0).precision).toBe(2);
  });
});
