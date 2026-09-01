import { describe, expect, it } from "vitest";
import { MARKET_EVENT_SCHEMA_VERSION, type CanonicalMarketEvent } from "../marketEvent";
import { selectFreshMoomooTapeEvents } from "./moomooTicksBrowser";

const NOW = 1_788_180_010_000;
const event: CanonicalMarketEvent = {
  schemaVersion: MARKET_EVENT_SCHEMA_VERSION,
  normalizationVersion: "moomoo-ticker.v1",
  eventId: "moomoo:US.TSLA:1",
  symbol: "TSLA",
  normalizedSymbol: "TSLA",
  assetClass: "equity",
  providerClass: "BROKER",
  providerPath: "moomoo-opend-bridge",
  eventType: "TRADE",
  timestampProvider: NOW - 1_000,
  timestampReceived: NOW,
  timestampProcessed: NOW,
  availableAt: NOW,
  sequenceState: "UNAVAILABLE",
  price: 250,
  size: 4,
  aggressorSide: "BUY",
  aggressorMethod: "PROVIDER",
  sourceClass: "PRIMARY",
  dataMode: "DELAYED",
  fidelityClass: "OBSERVED",
  rightsPolicyId: "wm.rights.unknown.v1",
};

const receipt = (events: unknown[]) => ({ source: "moomoo", label: "RECEIVING", receiving: true, symbol: "TSLA", events });

describe("selectFreshMoomooTapeEvents", () => {
  it("accepts a current symbol-matched provider-sided executed print", () => {
    expect(selectFreshMoomooTapeEvents(receipt([event]), "TSLA", NOW)).toEqual([event]);
  });

  it("rejects stale, wrong-symbol, unknown-side, and non-receiving receipts", () => {
    expect(selectFreshMoomooTapeEvents(receipt([{ ...event, timestampProvider: NOW - 30_001 }]), "TSLA", NOW)).toEqual([]);
    expect(selectFreshMoomooTapeEvents(receipt([{ ...event, normalizedSymbol: "SPY" }]), "TSLA", NOW)).toEqual([]);
    expect(selectFreshMoomooTapeEvents(receipt([{ ...event, aggressorSide: undefined, aggressorMethod: "NONE" }]), "TSLA", NOW)).toEqual([]);
    expect(selectFreshMoomooTapeEvents({ ...receipt([event]), label: "STALE", receiving: false }, "TSLA", NOW)).toEqual([]);
  });
});
