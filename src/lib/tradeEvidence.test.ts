import { describe, expect, it } from "vitest";
import { hasResolvedTradeOutcome } from "./tradeEvidence";

describe("hasResolvedTradeOutcome", () => {
  it("accepts a finite realized outcome with entry and exit evidence", () => {
    expect(hasResolvedTradeOutcome({ entryPrice: 100, exitPrice: 104, pnl: 400 })).toBe(true);
  });

  it("rejects a P&L claim without its price basis", () => {
    expect(hasResolvedTradeOutcome({ pnl: -3040 })).toBe(false);
  });

  it("rejects open or partially recorded outcomes", () => {
    expect(hasResolvedTradeOutcome({ entryPrice: 100, pnl: 25 })).toBe(false);
  });

  it("rejects non-finite and non-positive prices", () => {
    expect(hasResolvedTradeOutcome({ entryPrice: 0, exitPrice: 104, pnl: 0 })).toBe(false);
    expect(hasResolvedTradeOutcome({ entryPrice: 100, exitPrice: Number.NaN, pnl: 0 })).toBe(false);
  });
});
