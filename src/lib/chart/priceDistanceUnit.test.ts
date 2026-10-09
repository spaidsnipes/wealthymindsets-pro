import { describe, expect, it } from "vitest";
import { priceDistanceWords } from "./priceDistanceUnit";

describe("a price distance wears its instrument's unit (sheriff 2026-10-08)", () => {
  it("spot FX reads in pips; JPY pairs use the 0.01 pip", () => {
    expect(priceDistanceWords("EURUSD", 0.00048, 5)).toBe("4.8 pips");
    expect(priceDistanceWords("USDJPY", 0.048, 3)).toBe("4.8 pips");
    expect(priceDistanceWords("GBPUSD", 0.0001, 5)).toBe("1 pip");
    expect(priceDistanceWords("EURUSD", 0, 5)).toBe("0 pips");
  });
  it("equities and USD crypto read in dollars", () => {
    expect(priceDistanceWords("AAPL", 0.28, 2)).toBe("$0.28");
    expect(priceDistanceWords("BTC-USD", 137.31, 2)).toBe("$137.31");
  });
  it("futures read in points, with ticks when the tick is on file", () => {
    const es = priceDistanceWords("ES1!", 4.5, 2, 7800);
    expect(es.startsWith("4.50 pts")).toBe(true);
    if (es.includes("/")) expect(es).toBe("4.50 pts / 18 ticks");
  });
  it("no symbol claims no unit", () => {
    expect(priceDistanceWords(null, 1.5, 2)).toBe("1.50");
  });
});
