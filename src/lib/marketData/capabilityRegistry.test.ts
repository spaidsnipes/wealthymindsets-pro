import { describe, expect, it } from "vitest";
import {
  MARKET_DATA_CAPABILITIES,
  PUBLIC_DISPLAY_ONLY_RIGHTS,
  UNKNOWN_RIGHTS,
  canDoAction,
  canPersistDerived,
  canPersistRaw,
  getMarketDataCapability,
  getRuntimeTapeCapability,
  hasVerifiedAggressorTape,
  type MarketDataCapability,
  type MarketDataRights,
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
      rights: { ...MARKET_DATA_CAPABILITIES[0].rights, collect: "ALLOWED", raw: "ALLOWED" },
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

describe("rights registry v2 — granular per-action gating", () => {
  const actions: Array<keyof MarketDataRights> = [
    "collect", "display", "raw", "derived", "redistribute", "train", "commercial",
  ];

  it("every capability carries an explicit rights object", () => {
    for (const entry of MARKET_DATA_CAPABILITIES) {
      for (const action of actions) {
        expect(entry.rights[action]).toBeDefined();
      }
    }
  });

  it("fails closed on every UNKNOWN action", () => {
    for (const action of actions) {
      const unknownEntry: MarketDataCapability = {
        ...MARKET_DATA_CAPABILITIES[0],
        rights: { ...UNKNOWN_RIGHTS },
      };
      expect(canDoAction(unknownEntry, action)).toBe(false);
    }
  });

  it("fails closed on every PROHIBITED action, even if others are ALLOWED", () => {
    const mixed: MarketDataCapability = {
      ...MARKET_DATA_CAPABILITIES[0],
      rights: { ...UNKNOWN_RIGHTS, collect: "ALLOWED", raw: "PROHIBITED" },
    };
    expect(canDoAction(mixed, "raw")).toBe(false);
    expect(canDoAction(mixed, "collect")).toBe(true);
  });

  it("does not mistake operational public-feed access for reviewed rights", () => {
    expect(PUBLIC_DISPLAY_ONLY_RIGHTS.collect).toBe("UNKNOWN");
    expect(PUBLIC_DISPLAY_ONLY_RIGHTS.display).toBe("UNKNOWN");
    expect(PUBLIC_DISPLAY_ONLY_RIGHTS.raw).toBe("UNKNOWN");
    expect(PUBLIC_DISPLAY_ONLY_RIGHTS.derived).toBe("UNKNOWN");
    expect(PUBLIC_DISPLAY_ONLY_RIGHTS.redistribute).toBe("UNKNOWN");
    expect(PUBLIC_DISPLAY_ONLY_RIGHTS.train).toBe("UNKNOWN");
    expect(PUBLIC_DISPLAY_ONLY_RIGHTS.commercial).toBe("UNKNOWN");
  });

  it("no registered capability grants raw/derived/redistribute/train yet", () => {
    for (const entry of MARKET_DATA_CAPABILITIES) {
      expect(canDoAction(entry, "raw")).toBe(false);
      expect(canDoAction(entry, "derived")).toBe(false);
      expect(canDoAction(entry, "redistribute")).toBe(false);
      expect(canDoAction(entry, "train")).toBe(false);
      expect(canDoAction(entry, "commercial")).toBe(false);
    }
  });

  it("keeps v1 canPersistRaw in sync with rights.raw", () => {
    const allow: MarketDataCapability = {
      ...MARKET_DATA_CAPABILITIES[0],
      rights: { ...UNKNOWN_RIGHTS, collect: "ALLOWED", display: "ALLOWED", raw: "ALLOWED" },
      rawPersistenceRight: "ALLOWED",
    };
    expect(canPersistRaw(allow)).toBe(true);
    expect(canDoAction(allow, "raw")).toBe(true);
    expect(canPersistDerived(allow)).toBe(false);
  });

  it("UNAVAILABLE capabilities fail closed on every action regardless of rights", () => {
    const gone: MarketDataCapability = {
      ...MARKET_DATA_CAPABILITIES[0],
      availability: "UNAVAILABLE",
      rights: { collect: "ALLOWED", display: "ALLOWED", raw: "ALLOWED",
                derived: "ALLOWED", redistribute: "ALLOWED", train: "ALLOWED", commercial: "ALLOWED" },
    };
    for (const action of actions) expect(canDoAction(gone, action)).toBe(false);
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
