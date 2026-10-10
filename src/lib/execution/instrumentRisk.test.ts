import { describe, expect, it } from "vitest";

import { FX_LOT_UNITS, fxPipSize, fxPipValueUsd, instrumentRisk, RISK_ESTIMATE_CAVEAT } from "./instrumentRisk";

const priced = (a: ReturnType<typeof instrumentRisk>) => {
  expect(a.status, a.status === "REFUSED" ? a.reason : "").toBe("PRICED");
  return a as Extract<typeof a, { status: "PRICED" }>;
};

describe("instrument-aware risk — reference cases per family", () => {
  it("STOCK: shares × distance (100 AAPL, 2.50 to the stop = $250)", () => {
    const a = priced(instrumentRisk({ family: "STOCK", symbol: "AAPL", qty: 100, entry: 200, stop: 197.5, target: 205 }));
    expect(a.riskUsd).toBeCloseTo(250, 6);
    expect(a.rewardUsd).toBeCloseTo(500, 6);
    expect(a.caveat).toBe(RISK_ESTIMATE_CAVEAT);
  });

  it("FUTURE: ticks × tick value × contracts (MES 1 pt = 4 ticks × $1.25 × 2 = $10; ES 1 pt = $50; MNQ 10 pts = $20)", () => {
    expect(priced(instrumentRisk({ family: "FUTURE", symbol: "MES1!", qty: 2, entry: 6000, stop: 5999 })).riskUsd).toBeCloseTo(10, 6);
    expect(priced(instrumentRisk({ family: "FUTURE", symbol: "ES1!", qty: 1, entry: 6000, stop: 5999 })).riskUsd).toBeCloseTo(50, 6);
    const mnq = priced(instrumentRisk({ family: "FUTURE", symbol: "MNQ1!", qty: 1, entry: 21000, stop: 20990 }));
    expect(mnq.riskUsd).toBeCloseTo(20, 6);
    expect(mnq.basis).toContain("40 ticks");
  });

  it("FUTURE: a root with no published spec is REFUSED — never priced with the stock formula", () => {
    const a = instrumentRisk({ family: "FUTURE", symbol: "ZZ1!", qty: 1, entry: 100, stop: 99 });
    expect(a.status).toBe("REFUSED");
  });

  it("EQUITY_OPTION: contracts × 100 × premium distance (2 × 100 × 1.60 = $320)", () => {
    const a = priced(instrumentRisk({ family: "EQUITY_OPTION", symbol: "SPY", qty: 2, entry: 3.2, stop: 1.6, target: 6.4 }));
    expect(a.riskUsd).toBeCloseTo(320, 6);
    expect(a.rewardUsd).toBeCloseTo(640, 6);
  });

  it("FUTURE_OPTION: needs the expiry's own multiplier from the chain; with it, contracts × multiplier × premium", () => {
    expect(instrumentRisk({ family: "FUTURE_OPTION", symbol: "", qty: 1, entry: 40, stop: 20 }).status).toBe("REFUSED");
    expect(priced(instrumentRisk({ family: "FUTURE_OPTION", symbol: "", qty: 1, entry: 40, stop: 20, multiplier: 50 })).riskUsd).toBeCloseTo(1000, 6);
  });

  it("FX: pip 0.0001, JPY pairs 0.01", () => {
    expect(fxPipSize("EUR/USD")).toBe(0.0001);
    expect(fxPipSize("USDJPY")).toBe(0.01);
    expect(fxPipSize("EUR_JPY")).toBe(0.01);
    expect(fxPipSize("ES1!")).toBeNull();
  });

  it("FX: EUR/USD 1 standard lot, 20 pips = $200 ($10 a pip)", () => {
    const a = priced(instrumentRisk({ family: "FX", symbol: "EUR/USD", qty: FX_LOT_UNITS.STANDARD, entry: 1.1, stop: 1.098 }));
    expect(a.riskUsd).toBeCloseTo(200, 6);
  });

  it("FX: USD/JPY at 150, 1 standard lot, 30 pips = $200 (pip value ÷ price)", () => {
    const pv = fxPipValueUsd("USD/JPY", FX_LOT_UNITS.STANDARD, 150);
    expect("usd" in pv && pv.usd).toBeCloseTo(6.6667, 3);
    expect(priced(instrumentRisk({ family: "FX", symbol: "USD/JPY", qty: FX_LOT_UNITS.STANDARD, entry: 150, stop: 149.7 })).riskUsd).toBeCloseTo(200, 6);
  });

  it("FX: a cross needs the quote→USD rate (EUR/GBP, GBP→USD 1.25: $12.50 a pip); without it, REFUSED", () => {
    expect(instrumentRisk({ family: "FX", symbol: "EUR/GBP", qty: FX_LOT_UNITS.STANDARD, entry: 0.86, stop: 0.859 }).status).toBe("REFUSED");
    const a = priced(instrumentRisk({ family: "FX", symbol: "EUR/GBP", qty: FX_LOT_UNITS.STANDARD, entry: 0.86, stop: 0.859, quoteToUsd: 1.25 }));
    expect(a.riskUsd).toBeCloseTo(125, 6);
  });

  it("CRYPTO: coins × distance, USD products only (0.01 BTC, $1,000 = $10; BTCUSDT refused)", () => {
    expect(priced(instrumentRisk({ family: "CRYPTO", symbol: "BTC/USD", qty: 0.01, entry: 60000, stop: 59000 })).riskUsd).toBeCloseTo(10, 6);
    expect(instrumentRisk({ family: "CRYPTO", symbol: "BTCUSDT", qty: 0.01, entry: 60000, stop: 59000 }).status).toBe("REFUSED");
  });

  it("no entry or no size is refused, never $0", () => {
    expect(instrumentRisk({ family: "STOCK", symbol: "AAPL", qty: 10, entry: null, stop: 1 }).status).toBe("REFUSED");
    expect(instrumentRisk({ family: "STOCK", symbol: "AAPL", qty: 0, entry: 10, stop: 9 }).status).toBe("REFUSED");
  });
});
