import { describe, expect, it } from "vitest";
import { ttChartSymbol } from "./tastytradeLedger";

describe("ttChartSymbol — the ledger row's chart door", () => {
  it("opens equities and futures as themselves", () => {
    expect(ttChartSymbol({ symbol: "aapl", instrumentType: "Equity" })).toBe("AAPL");
    expect(ttChartSymbol({ symbol: "/MESZ6", instrumentType: "Future" })).toBe("/MESZ6");
  });
  it("opens an equity option on its underlying", () => {
    expect(ttChartSymbol({ symbol: "TSLA  261016C00400000", instrumentType: "Equity Option" })).toBe("TSLA");
  });
  it("opens a futures option on the futures contract it names", () => {
    expect(ttChartSymbol({ symbol: "./MNQZ6MN5CU6260930P30675", instrumentType: "Future Option" })).toBe("/MNQZ6");
    expect(ttChartSymbol({ symbol: "./ESZ6 E2AV6 261016C5800", instrumentType: "Future Option" })).toBe("/ESZ6");
    expect(ttChartSymbol({ symbol: "./M2KZ6 R2AV6 261016C2400", instrumentType: "Future Option" })).toBe("/M2KZ6");
  });
  it("gives unknown types no door", () => {
    expect(ttChartSymbol({ symbol: "./??", instrumentType: "Future Option" })).toBeNull();
    expect(ttChartSymbol({ symbol: "BTC/USD", instrumentType: "Cryptocurrency" })).toBeNull();
    expect(ttChartSymbol({ symbol: "X", instrumentType: null })).toBeNull();
  });
});
