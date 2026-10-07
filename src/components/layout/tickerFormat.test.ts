import { describe, expect, it } from "vitest";
import { formatTickerChange, formatTickerPrice, tickerDecimals } from "./tickerFormat";

describe("ticker rail precision reads the display-precision owner", () => {
  it("NQ1! keeps its quarter tick", () => {
    const dp = tickerDecimals("NQ1!", 31385.25);
    expect(formatTickerPrice(31385.25, dp)).toBe("31,385.25");
  });
  it("CL1! prints cents, not four invented decimals", () => {
    const dp = tickerDecimals("CL1!", 88.16);
    expect(formatTickerPrice(88.16, dp)).toBe("88.16");
    expect(formatTickerChange(-1.28, dp)).toBe("-1.28");
  });
  it("equities print cents", () => {
    expect(formatTickerPrice(336.35, tickerDecimals("AAPL", 336.35))).toBe("336.35");
  });
  it("a large crypto change keeps thousands separators", () => {
    expect(formatTickerChange(-2225.4, 2)).toBe("-2,225.40");
    expect(formatTickerChange(0, 2)).toBe("+0.00");
  });
  it("a non-finite price falls back to cents rather than throwing", () => {
    expect(tickerDecimals("NQ1!", NaN)).toBe(2);
  });
});
