import { describe, expect, it } from "vitest";
import { MarketEventGuard } from "../marketEvent";
import { normalizeLongbridgeTrade } from "./longbridgeTicks";
import { selectFreshLongbridgeObservedEvents } from "./longbridgeTicksBrowser";

const now = 1_800_000_000_000;
const event = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: "wm.market-event.v2",
  normalizationVersion: "longbridge-trades.v1",
  eventId: "longbridge:TSLA.US:1",
  symbol: "TSLA",
  normalizedSymbol: "TSLA",
  providerClass: "BROKER",
  providerPath: "longbridge-openapi-bridge",
  eventType: "TRADE",
  timestampProvider: now - 1_000,
  timestampReceived: now,
  timestampProcessed: now,
  availableAt: now,
  sequenceState: "UNAVAILABLE",
  price: 350,
  size: 10,
  aggressorMethod: "NONE",
  sourceClass: "PRIMARY",
  dataMode: "DELAYED",
  fidelityClass: "OBSERVED",
  rightsPolicyId: "rights-unknown",
  ...overrides,
});

const body = (overrides: Record<string, unknown> = {}) => ({
  source: "longbridge",
  label: "RECEIVING",
  symbol: "TSLA",
  receiving: true,
  events: [event()],
  ...overrides,
});

describe("Longbridge browser observation boundary", () => {
  it("admits current exact-symbol unsigned prints", () => {
    expect(selectFreshLongbridgeObservedEvents(body(), "tsla", now)).toHaveLength(1);
  });

  it("admits the server normalizer output through the canonical ingress guard", () => {
    const normalized = normalizeLongbridgeTrade(
      { price: "350.25", volume: "12", timestamp: now - 1_000, direction: "neutral" },
      "TSLA.US",
      "TSLA",
      "DELAYED",
      now,
      now,
      0,
    );
    expect(normalized).not.toBeNull();
    const selected = selectFreshLongbridgeObservedEvents(body({ events: [normalized] }), "TSLA", now);
    expect(selected).toHaveLength(1);
    expect(new MarketEventGuard().inspect(selected[0]!)).toMatchObject({ status: "ACCEPTED" });
  });

  it.each([
    ["auth blocker", { label: "AUTH BLOCKED", receiving: false }],
    ["not configured", { label: "NOT CONFIGURED", receiving: false }],
    ["no events", { label: "NO EVENTS RECEIVED", receiving: false, events: [] }],
    ["symbol mismatch", { symbol: "AAPL" }],
  ])("rejects %s receipts", (_name, override) => {
    expect(selectFreshLongbridgeObservedEvents(body(override), "TSLA", now)).toEqual([]);
  });

  it("rejects stale, invalid, or provider-sided events", () => {
    expect(selectFreshLongbridgeObservedEvents(body({ events: [event({ timestampProvider: now - 30_001 })] }), "TSLA", now)).toEqual([]);
    expect(selectFreshLongbridgeObservedEvents(body({ events: [event({ size: 0 })] }), "TSLA", now)).toEqual([]);
    expect(selectFreshLongbridgeObservedEvents(body({ events: [event({ aggressorSide: "BUY", aggressorMethod: "PROVIDER" })] }), "TSLA", now)).toEqual([]);
  });
});
