import { describe, expect, it } from "vitest";

import { contractMonthWords, matchFutureProducts, tastyCryptoHits, tastyFutureContractHits, tastySymbolHits, webullInstrumentHits } from "./brokerInstrumentSearch";

describe("broker instrument search — what each broker actually answers", () => {
  it("typing MNQ finds the MNQ product before NQ-ish names", () => {
    const products = [
      { code: "NQ", description: "E-mini Nasdaq-100" },
      { code: "MNQ", description: "Micro E-mini Nasdaq-100" },
      { code: "ES", description: "E-mini S&P 500" },
    ];
    expect(matchFutureProducts(products, "MNQ").map(p => p.code)).toEqual(["MNQ"]);
    expect(matchFutureProducts(products, "nasdaq").map(p => p.code)).toEqual(["NQ", "MNQ"]);
    expect(matchFutureProducts(products, "MNQ1!").map(p => p.code)).toEqual(["MNQ"]);
  });

  it("lists the continuous symbol and every live month, nearest first, active month named", () => {
    const hits = tastyFutureContractHits([
      { symbol: "/MNQH7", "days-to-expiration": 168, "expiration-date": "2027-03-19" },
      { symbol: "/MNQZ6", "days-to-expiration": 77, "active-month": true, "expiration-date": "2026-12-18" },
      { symbol: "/MNQU6", "days-to-expiration": -14 },
    ], { code: "MNQ", description: "Micro E-mini Nasdaq-100" });
    expect(hits.map(h => h.sym)).toEqual(["MNQ1!", "/MNQZ6", "/MNQH7"]);
    expect(hits[1]!.label).toBe("Micro E-mini Nasdaq-100 · Dec 2026 · active month");
    expect(hits[2]!.label).toBe("Micro E-mini Nasdaq-100 · Mar 2027");
  });

  it("month words come from the code and the expiration's own year", () => {
    expect(contractMonthWords("/ESZ6", "2026-12-18")).toBe("Dec 2026");
    expect(contractMonthWords("MNQ1!")).toBeNull();
  });

  it("tastytrade symbol search keeps equities and ETFs, drops option roots", () => {
    expect(tastySymbolHits([
      { symbol: "TSLA", description: "Tesla Inc", "instrument-type": "Equity" },
      { symbol: "SPY", description: "SPDR S&P 500", "is-etf": true },
      { symbol: ".TSLA", description: "x" },
    ]).map(h => `${h.sym}:${h.cat}`)).toEqual(["TSLA:Stock", "SPY:ETF"]);
  });

  it("crypto pairs match by base", () => {
    expect(tastyCryptoHits([{ symbol: "BTC/USD", description: "Bitcoin" }, { symbol: "ETH/USD" }], "btc").map(h => h.sym)).toEqual(["BTCUSD"]);
  });

  it("Webull answers exact symbols; futures get their slash", () => {
    expect(webullInstrumentHits({ data: [{ symbol: "MNQZ6", name: "Micro Nasdaq Dec26" }] }, "Futures")[0]!.sym).toBe("/MNQZ6");
    expect(webullInstrumentHits([{ symbol: "TSLA", name: "Tesla" }], "Stock")[0]!.label).toBe("Tesla");
    expect(webullInstrumentHits({ nothing: true }, "Stock")).toEqual([]);
  });
});
