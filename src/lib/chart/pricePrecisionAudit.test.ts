/**
 * GP12 §27 — "Audit the recent 7-significant-figure fix to ensure it removes
 * float noise without destroying real valid precision." Each case is a real
 * quoting grid; the rule must return the venue's own decimals.
 */
import { describe, expect, it } from "vitest";
import { pricePrecisionFromBars } from "./pricePrecision";

const bars = (prices: number[]) => prices.map(p => ({ open: p, high: p, low: p, close: p }));

describe("precision audit: noise removed, real decimals kept", () => {
  it("BTC above 100k keeps cents (7 sig figs would leave one decimal)", () => {
    expect(pricePrecisionFromBars(bars([101234.56, 101234.57, 101240.12, 101199.99]))).toBe(2);
  });
  it("USDJPY quotes three decimals", () => {
    expect(pricePrecisionFromBars(bars([150.123, 150.127, 150.118, 150.131]))).toBe(3);
  });
  it("EURUSD quotes five", () => {
    expect(pricePrecisionFromBars(bars([1.17234, 1.17241, 1.17229, 1.17252]))).toBe(5);
  });
  it("ZN's 1/64ths state exactly", () => {
    expect(pricePrecisionFromBars(bars([112.015625, 112.03125, 112.046875, 112.0625]))).toBeGreaterThanOrEqual(4);
  });
  it("CL float32 noise is removed: 91.7300033569336 reads two decimals", () => {
    expect(pricePrecisionFromBars(bars([91.7300033569336, 91.7699966430664, 91.8099975585938]))).toBe(2);
  });
  it("a sub-penny coin keeps its digits", () => {
    expect(pricePrecisionFromBars(bars([0.00001234, 0.00001241, 0.00001229]))).toBe(8);
  });
});
