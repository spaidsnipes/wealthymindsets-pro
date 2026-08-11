import { afterEach, describe, expect, it, vi } from "vitest";
import { MARKET_DATA_CAPABILITIES } from "./capabilityRegistry";
import { MARKET_EVENT_SCHEMA_VERSION, type CanonicalMarketEvent } from "./marketEvent";
import { SupabaseMarketObservationStore } from "./observationSupabaseStore";

const event: CanonicalMarketEvent = {
  schemaVersion: MARKET_EVENT_SCHEMA_VERSION,
  normalizationVersion: "wm.normalization.v1",
  eventId: "provider:event:1",
  symbol: "BTC-USD",
  normalizedSymbol: "BTC",
  assetClass: "crypto",
  providerClass: "EXCHANGE",
  providerPath: "coinbase-client-ws",
  eventType: "TRADE",
  timestampReceived: 1_800_000_000_000,
  timestampProcessed: 1_800_000_000_001,
  availableAt: 1_800_000_000_001,
  sequenceState: "UNAVAILABLE",
  price: 65_000,
  size: 0.1,
  aggressorMethod: "MAKER_SIDE_INVERTED",
  sourceClass: "PRIMARY",
  dataMode: "LIVE",
  fidelityClass: "OBSERVED",
  rightsPolicyId: "wm.rights.test.v1",
};

afterEach(() => vi.unstubAllGlobals());

describe("Supabase market-observation storage adapter", () => {
  it.each([
    ["PERSISTED_RAW", "INSERTED"],
    ["DUPLICATE", "DUPLICATE"],
    ["RIGHTS_BLOCKED", "RIGHTS_BLOCKED"],
    ["WRITE_FAILED", "WRITE_FAILED"],
  ] as const)("maps database %s without inventing success", async (status, expected) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ status }), { status: 200 })));
    const store = new SupabaseMarketObservationStore("owner", "https://database.invalid", "server-key");
    await expect(store.write(event, "RAW", MARKET_DATA_CAPABILITIES[0])).resolves.toBe(expected);
  });

  it("fails closed on transport errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const store = new SupabaseMarketObservationStore("owner", "https://database.invalid", "server-key");
    await expect(store.write(event, "RAW", MARKET_DATA_CAPABILITIES[0])).rejects.toThrow("offline");
  });
});
