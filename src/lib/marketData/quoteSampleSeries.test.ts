import { describe, expect, it } from "vitest";

import { isQuoteSampleSeries, quoteSampleSentence } from "./quoteSampleSeries";

const flat = (px: number) => ({ open: px, high: px, low: px, close: px });
const real = (px: number) => ({ open: px, high: px + 1, low: px - 1, close: px });

describe("isQuoteSampleSeries", () => {
  it("names a series of range-less bars (Yahoo 1m EURUSD, 199/199 flat)", () => {
    expect(isQuoteSampleSeries(Array.from({ length: 199 }, (_, i) => flat(1.12 + i * 1e-5)))).toBe(true);
  });
  it("leaves real candles alone, including a few flat bars (Yahoo 5m EURUSD, 12/199 flat)", () => {
    const bars = Array.from({ length: 199 }, (_, i) => (i % 16 === 0 ? flat(1.12) : real(1.12)));
    expect(isQuoteSampleSeries(bars)).toBe(false);
  });
  it("says nothing on too few bars to judge", () => {
    expect(isQuoteSampleSeries([flat(1), flat(1), flat(1)])).toBe(false);
  });
  it("tells the trader what to do", () => {
    expect(quoteSampleSentence("1m")).toMatch(/quote samples.*5m or larger/);
  });
});
