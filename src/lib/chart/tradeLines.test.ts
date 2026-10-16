import { describe, expect, it } from "vitest";
import { moveWords, optionPremiumAt, optionPremiumNow, optionTradeLineLabels, tradeLineLabels } from "./tradeLines";

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

describe("plate 33 · options read as premium plus the stock trigger", () => {
  const call = { underlying: "TSLA", contractType: "call" as const, strike: 250, bid: 4.9, ask: 5.1, delta: 0.5, gamma: 0.02 };
  it("the premium now is the mid, else the last; none without either", () => {
    expect(optionPremiumNow(call)).toBeCloseTo(5);
    expect(optionPremiumNow({ ...call, bid: undefined, ask: undefined, last: 4.2 })).toBe(4.2);
    expect(optionPremiumNow({ ...call, bid: undefined, ask: undefined })).toBeNull();
  });
  it("estimates from Δ and Γ, never under intrinsic, and refuses without Δ", () => {
    expect(optionPremiumAt(call, 248.5, 252.5)).toBeCloseTo(5 + 0.5 * 4 + 0.5 * 0.02 * 16);
    expect(optionPremiumAt(call, 248.5, 230)).toBe(Math.max(0.01, 5 + 0.5 * -18.5 + 0.5 * 0.02 * 18.5 * 18.5));
    expect(optionPremiumAt({ ...call, delta: 0.05, gamma: 0 }, 248.5, 300)).toBe(50);
    expect(optionPremiumAt({ ...call, delta: undefined }, 248.5, 252.5)).toBeNull();
  });
  it("labels: trigger on the entry, premium ≈ on target and stop", () => {
    const l = optionTradeLineLabels(call, 248.5, 252.5, 244.2, 2);
    expect(l.entry).toBe("Trigger 248.50 · buy call");
    expect(l.target).toMatch(/^Target 252\.50 · premium ≈ \d+\.\d\d$/);
    expect(l.stop).toMatch(/^Stop 244\.20 · premium ≈ \d+\.\d\d$/);
    expect(optionTradeLineLabels({ ...call, delta: undefined }, 248.5, 252.5, null, 2).target).toBe("Target 252.50");
  });
});
