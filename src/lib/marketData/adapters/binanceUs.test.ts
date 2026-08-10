import { describe, expect, it } from "vitest";
import { MarketEventGuard } from "../marketEvent";
import { normalizeBinanceUsTrade } from "./binanceUs";

const rawTrade = {
  e: "trade",
  E: 1_786_335_700_010,
  s: "BTCUSDT",
  t: 4242,
  p: "65000.25",
  q: "0.125",
  T: 1_786_335_700_000,
  m: false,
};

describe("Binance.US canonical Market Event adapter", () => {
  it("preserves execution identity, timestamps, price, and size", () => {
    expect(normalizeBinanceUsTrade(rawTrade, "BTC", rawTrade.E + 10, rawTrade.E + 15)).toMatchObject({
      eventId: "binance-us:BTCUSDT:4242",
      sourceEventId: "4242",
      executableIdentity: "BTCUSDT",
      normalizedSymbol: "BTC",
      providerPath: "binance-us-client-ws",
      timestampExchange: rawTrade.T,
      timestampProvider: rawTrade.E,
      timestampReceived: rawTrade.E + 10,
      availableAt: rawTrade.E + 15,
      price: 65000.25,
      size: 0.125,
      sequenceState: "UNAVAILABLE",
      sourceClass: "FALLBACK",
      rightsPolicyId: "wm.rights.unknown.v1",
    });
  });

  it("labels maker-side inversion explicitly", () => {
    expect(normalizeBinanceUsTrade(rawTrade, "BTC", rawTrade.E + 10)?.aggressorSide).toBe("BUY");
    expect(normalizeBinanceUsTrade({ ...rawTrade, m: true }, "BTC", rawTrade.E + 10)?.aggressorSide).toBe("SELL");
    expect(normalizeBinanceUsTrade(rawTrade, "BTC", rawTrade.E + 10)?.aggressorMethod).toBe("MAKER_SIDE_INVERTED");
  });

  it("fails closed for non-trades and incomplete execution evidence", () => {
    expect(normalizeBinanceUsTrade({ ...rawTrade, e: "bookTicker" }, "BTC", rawTrade.E + 10)).toBeNull();
    expect(normalizeBinanceUsTrade({ ...rawTrade, t: undefined }, "BTC", rawTrade.E + 10)).toBeNull();
    expect(normalizeBinanceUsTrade({ ...rawTrade, T: undefined }, "BTC", rawTrade.E + 10)).toBeNull();
    expect(normalizeBinanceUsTrade({ ...rawTrade, p: "0" }, "BTC", rawTrade.E + 10)).toBeNull();
    expect(normalizeBinanceUsTrade({ ...rawTrade, q: "0" }, "BTC", rawTrade.E + 10)).toBeNull();
    expect(normalizeBinanceUsTrade({ ...rawTrade, m: undefined }, "BTC", rawTrade.E + 10)).toBeNull();
  });

  it("is accepted once and quarantined as a duplicate thereafter", () => {
    const event = normalizeBinanceUsTrade(rawTrade, "BTC", rawTrade.E + 10, rawTrade.E + 15)!;
    const guard = new MarketEventGuard();
    expect(guard.inspect(event).status).toBe("ACCEPTED");
    expect(guard.inspect(event).status).toBe("QUARANTINED");
  });
});
