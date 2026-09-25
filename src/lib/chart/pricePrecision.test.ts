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

  it("no bars → the floor", () => {
    expect(pricePrecisionFromBars([])).toBe(2);
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
