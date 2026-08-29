/**
 * kraken — truth-lock for the pure symbol-mapping helpers. Fetch
 * paths need a network stub and are covered by broader integration
 * tests; here we lock the pure predicates.
 */

import { describe, it, expect } from "vitest";
import { toKrakenPair, krakenWsPair } from "./kraken";

describe("toKrakenPair — symbol → Kraken REST pair mapping", () => {
  it("maps canonical crypto symbols to their Kraken pair", () => {
    expect(toKrakenPair("BTC")).toBe("XBT/USD");
    expect(toKrakenPair("ETH")).toBe("ETH/USD");
    expect(toKrakenPair("SOL")).toBe("SOL/USD");
    expect(toKrakenPair("XRP")).toBe("XRP/USD");
    expect(toKrakenPair("DOGE")).toBe("DOGE/USD");
  });

  it("uppercases input before lookup", () => {
    expect(toKrakenPair("btc")).toBe("XBT/USD");
    expect(toKrakenPair("Eth")).toBe("ETH/USD");
  });

  it("returns null for unknown symbols", () => {
    expect(toKrakenPair("NQ1!")).toBeNull();
    expect(toKrakenPair("TSLA")).toBeNull();
    expect(toKrakenPair("")).toBeNull();
    expect(toKrakenPair("SPY")).toBeNull();
  });
});

describe("krakenWsPair — WS v2 pair (BTC replaces the legacy XBT)", () => {
  it("returns null when the symbol is not on the map", () => {
    expect(krakenWsPair("NQ1!")).toBeNull();
  });

  it("BTC returns BTC/USD (not XBT/USD)", () => {
    expect(krakenWsPair("BTC")).toBe("BTC/USD");
  });

  it("ETH round-trips unchanged (no XBT substitution)", () => {
    expect(krakenWsPair("ETH")).toBe("ETH/USD");
    expect(krakenWsPair("SOL")).toBe("SOL/USD");
  });
});
