import { describe, expect, it, vi } from "vitest";
import { MARKET_EVENT_SCHEMA_VERSION, type CanonicalMarketEvent } from "./marketEvent";
import { persistMarketObservation, type MarketObservationStore } from "./observationPersistence";

const event = (overrides: Partial<CanonicalMarketEvent> = {}): CanonicalMarketEvent => ({
  schemaVersion: MARKET_EVENT_SCHEMA_VERSION,
  normalizationVersion: "wm.normalization.v1",
  eventId: "coinbase:btc:trade:1",
  sourceEventId: "1",
  symbol: "BTC-USD",
  normalizedSymbol: "BTC",
  assetClass: "crypto",
  exchange: "Coinbase",
  providerClass: "EXCHANGE",
  providerPath: "coinbase-client-ws",
  eventType: "TRADE",
  timestampExchange: 1_800_000_000_000,
  timestampProvider: 1_800_000_000_000,
  timestampReceived: 1_800_000_000_010,
  timestampProcessed: 1_800_000_000_011,
  availableAt: 1_800_000_000_011,
  sequenceState: "UNAVAILABLE",
  price: 65_000,
  size: 0.01,
  aggressorSide: "BUY",
  aggressorMethod: "MAKER_SIDE_INVERTED",
  aggressorConfidence: 1,
  sourceClass: "PRIMARY",
  dataMode: "LIVE",
  fidelityClass: "OBSERVED",
  rightsPolicyId: "wm.rights.unknown.v1",
  ...overrides,
});

const store = (): MarketObservationStore => ({ write: vi.fn().mockResolvedValue("INSERTED") });

describe("rights-gated market observation persistence", () => {
  it("blocks every currently UNKNOWN raw provider policy before storage", async () => {
    const target = store();
    const result = await persistMarketObservation(event(), "RAW", target);
    expect(result.status).toBe("RIGHTS_BLOCKED");
    expect(target.write).not.toHaveBeenCalled();
  });

  it("blocks derived persistence independently from raw persistence", async () => {
    const target = store();
    const result = await persistMarketObservation(event({ fidelityClass: "DERIVED" }), "DERIVED", target);
    expect(result.status).toBe("RIGHTS_BLOCKED");
    expect(target.write).not.toHaveBeenCalled();
  });

  it("rejects invalid evidence before consulting storage", async () => {
    const target = store();
    const result = await persistMarketObservation(event({ price: -1 }), "RAW", target);
    expect(result.status).toBe("INVALID");
    expect(target.write).not.toHaveBeenCalled();
  });

  it("fails closed for an unregistered provider path", async () => {
    const target = store();
    const result = await persistMarketObservation(event({ providerPath: "mystery-feed" }), "RAW", target);
    expect(result).toMatchObject({ status: "RIGHTS_BLOCKED", rightsPolicyId: "wm.rights.unregistered.v1" });
    expect(target.write).not.toHaveBeenCalled();
  });
});
