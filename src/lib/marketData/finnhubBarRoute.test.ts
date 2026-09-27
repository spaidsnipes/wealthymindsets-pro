/**
 * The Finnhub candle door asks the endpoint that serves the symbol (Garden 16
 * §1, 2026-09-27). A USDT pair was asked of /stock/candle, which does not
 * serve a Binance pair, while the ladder labelled its rungs NATIVE.
 */
import { describe, expect, it } from "vitest";
import { finnhubCandlePath, finnhubCandleUrl } from "./finnhubBarRoute";
import { toFinnhubSym } from "@/lib/finnhubSymbol";

describe("finnhubCandleUrl — the request /api/finnhub puts on the wire", () => {
  it("a USDT pair is asked of /crypto/candle with its Binance symbol", () => {
    const u = new URL(finnhubCandleUrl({ providerSym: toFinnhubSym("BTCUSDT")!, resolution: "D", from: 100, to: 200, token: "k" }));
    expect(u.origin + u.pathname).toBe("https://finnhub.io/api/v1/crypto/candle");
    expect(Object.fromEntries(u.searchParams)).toEqual({ symbol: "BINANCE:BTCUSDT", resolution: "D", from: "100", to: "200", token: "k" });
  });

  it("an equity is asked of /stock/candle", () => {
    const u = new URL(finnhubCandleUrl({ providerSym: toFinnhubSym("TSLA")!, resolution: "60", from: 1, to: 2, token: "k" }));
    expect(u.pathname).toBe("/api/v1/stock/candle");
    expect(u.searchParams.get("symbol")).toBe("TSLA");
  });

  it("every crypto symbol the ladder routes to Finnhub resolves to the crypto endpoint", () => {
    for (const sym of ["BTCUSDT", "ETHUSDT", "SOLUSDT", "SHIBUSDT", "BTC", "SUI"]) {
      expect(finnhubCandlePath(toFinnhubSym(sym)!), sym).toBe("/crypto/candle");
    }
    for (const sym of ["TSLA", "SPY", "AAPL"]) expect(finnhubCandlePath(toFinnhubSym(sym)!), sym).toBe("/stock/candle");
  });
});
