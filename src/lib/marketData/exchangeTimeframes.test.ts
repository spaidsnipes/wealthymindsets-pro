import { describe, expect, it } from "vitest";
import { resolveExchangeTimeframe } from "./exchangeTimeframes";

describe("exchange candle timeframe contract", () => {
  it("accepts a native Coinbase interval", () => {
    expect(resolveExchangeTimeframe("coinbase", "15m")).toEqual({
      status: "SUPPORTED",
      timeframe: "15m",
      seconds: 900,
    });
  });

  it("fails closed instead of rounding Coinbase 2h to another interval", () => {
    const result = resolveExchangeTimeframe("coinbase", "2h");
    expect(result.status).toBe("UNAVAILABLE");
    if (result.status !== "UNAVAILABLE") throw new Error("expected unavailable timeframe");
    expect(result.reason).toMatch(/no substitute was used/i);
  });

  it("fails closed instead of replacing Gemini 4h with 15m", () => {
    const result = resolveExchangeTimeframe("gemini", "4h");
    expect(result.status).toBe("UNAVAILABLE");
    if (result.status !== "UNAVAILABLE") throw new Error("expected unavailable timeframe");
    expect(result.supported).not.toContain("4h");
  });

  it("rejects unknown timeframe identifiers", () => {
    expect(resolveExchangeTimeframe("binanceus", "3m").status).toBe("UNAVAILABLE");
  });

  it("preserves explicitly supported long intervals", () => {
    expect(resolveExchangeTimeframe("kraken", "W")).toMatchObject({ status: "SUPPORTED", seconds: 604_800 });
    expect(resolveExchangeTimeframe("bitstamp", "2h")).toMatchObject({ status: "SUPPORTED", seconds: 7_200 });
  });
});
