import { describe, expect, it } from "vitest";
import { moveWords, tradeLineLabels } from "./tradeLines";

describe("plate 33 · trade lines speak the market's units", () => {
  it("futures: ticks and dollars per contract (NQ: 0.25 tick, $5)", () => {
    expect(moveWords("NQ1!", "LONG", 30100, 30160)).toBe("+240 ticks · +$1,200");
    expect(moveWords("NQ1!", "LONG", 30100, 30080)).toBe("−80 ticks · −$400");
    expect(moveWords("NQ1!", "SHORT", 30100, 30080)).toBe("+80 ticks · +$400");
  });
  it("forex: pips (JPY pairs at 0.01)", () => {
    expect(moveWords("EURUSD", "LONG", 1.086, 1.0896)).toBe("+36 pips");
    expect(moveWords("USDJPY", "SHORT", 150.2, 150.5)).toBe("−30 pips");
  });
  it("stocks: dollars per share", () => {
    expect(moveWords("TSLA", "LONG", 248.5, 252.5)).toBe("+$4 /share");
  });
  it("labels each line, the entry carrying R", () => {
    expect(tradeLineLabels("NQ1!", "LONG", 30100, 30160, 30080, 2)).toEqual({
      entry: "Long · Entry 30,100.00 · 3.0R",
      target: "Target 30,160.00 · +240 ticks · +$1,200",
      stop: "Stop 30,080.00 · −80 ticks · −$400",
    });
  });
});
