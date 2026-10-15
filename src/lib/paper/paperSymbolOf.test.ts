import { describe, expect, it } from "vitest";
import { paperSymbolOf } from "./paperSymbolOf";

const U = { "NQ1!": 1, BTC: 1, ETH: 1, AAPL: 1 };

describe("paperSymbolOf — the chart's symbol, as /paper's book names it", () => {
  it("keeps a symbol paper trades as is", () => {
    expect(paperSymbolOf("NQ1!", U)).toBe("NQ1!");
    expect(paperSymbolOf("aapl", U)).toBe("AAPL");
  });
  it("reads the chart's crypto pair as the coin", () => {
    expect(paperSymbolOf("BTC-USD", U)).toBe("BTC");
    expect(paperSymbolOf("ETH/USDT", U)).toBe("ETH");
  });
  it("answers null for a market paper does not trade (never a near miss)", () => {
    expect(paperSymbolOf("SOL-USD", U)).toBeNull();
    expect(paperSymbolOf("TSLA", U)).toBeNull();
  });
});
