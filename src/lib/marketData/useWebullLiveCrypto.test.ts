import { describe, expect, it } from "vitest";

import { webullCryptoSymbolForChart } from "./useWebullLiveCrypto";

describe("webullCryptoSymbolForChart — coins only, never spot FX", () => {
  it("maps USD-quoted coins to Webull's crypto symbol", () => {
    for (const s of ["BTCUSD", "BTC-USD", "BTC/USD"]) expect(webullCryptoSymbolForChart(s), s).toBe("BTCUSD");
    expect(webullCryptoSymbolForChart("ETHUSD")).toBe("ETHUSD");
  });

  it("spot FX ending in USD is not sent to Webull's crypto feed (EURUSD read INVALID_SYMBOL, 2026-10-01)", () => {
    for (const s of ["EURUSD", "GBPUSD", "AUDUSD", "XAUUSD"]) expect(webullCryptoSymbolForChart(s), s).toBeNull();
  });
});
