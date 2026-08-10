import { describe, expect, it } from "vitest";
import {
  MARKET_DATA_CAPABILITIES,
  canPersistRaw,
  getMarketDataCapability,
  getRuntimeTapeCapability,
  hasVerifiedAggressorTape,
  type MarketDataCapability,
} from "./capabilityRegistry";

describe("market-data capability and persistence-rights registry", () => {
  it("defaults every current raw persistence right to UNKNOWN", () => {
    expect(MARKET_DATA_CAPABILITIES.length).toBeGreaterThan(0);
    expect(MARKET_DATA_CAPABILITIES.every(entry => entry.rawPersistenceRight === "UNKNOWN")).toBe(true);
    expect(MARKET_DATA_CAPABILITIES.every(entry => entry.rightsPolicyId === "wm.rights.unknown.v1")).toBe(true);
  });

  it("fails closed when persistence rights are unknown", () => {
    expect(MARKET_DATA_CAPABILITIES.every(entry => canPersistRaw(entry) === false)).toBe(true);
  });

  it("fails closed when persistence is prohibited", () => {
    const entry: MarketDataCapability = {
      ...MARKET_DATA_CAPABILITIES[0],
      rawPersistenceRight: "PROHIBITED",
    };
    expect(canPersistRaw(entry)).toBe(false);
  });

  it("requires both explicit permission and an available capability", () => {
    const allowed: MarketDataCapability = {
      ...MARKET_DATA_CAPABILITIES[0],
      rawPersistenceRight: "ALLOWED",
    };
    expect(canPersistRaw(allowed)).toBe(true);
    expect(canPersistRaw({ ...allowed, availability: "UNAVAILABLE" })).toBe(false);
  });

  it("returns an explicit UNAVAILABLE cell for unsupported combinations", () => {
    const cell = getMarketDataCapability("coinbase-client-ws", "futures", "depth");
    expect(cell.availability).toBe("UNAVAILABLE");
    expect(cell.fidelityClass).toBe("UNAVAILABLE");
    expect(cell.evidence).toMatch(/No matching/);
    expect(canPersistRaw(cell)).toBe(false);
  });

  it("records foreground collection honestly instead of implying durability", () => {
    const coinbaseTrades = getMarketDataCapability("coinbase-client-ws", "crypto", "trade");
    expect(coinbaseTrades.collectionScope).toBe("FOREGROUND_TAB");
    expect(coinbaseTrades.timestampFields).toContain("EXCHANGE");
    expect(coinbaseTrades.sequenceSupported).toBe(false);
  });
});

describe("runtime aggressor tape capability", () => {
  it.each(["coinbase", "binance", "alpaca"] as const)("accepts reviewed %s trade evidence", source => {
    expect(hasVerifiedAggressorTape(source)).toBe(true);
    expect(getRuntimeTapeCapability(source)?.eventType).toBe("trade");
  });

  it.each(["finnhub", "polygon", null] as const)("fails closed for %s", source => {
    expect(hasVerifiedAggressorTape(source)).toBe(false);
    expect(getRuntimeTapeCapability(source)).toBeNull();
  });
});
