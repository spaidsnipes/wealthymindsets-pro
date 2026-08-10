import { describe, expect, it } from "vitest";
import {
  MARKET_EVENT_SCHEMA_VERSION,
  MarketEventGuard,
  validateMarketEvent,
  type CanonicalMarketEvent,
} from "./marketEvent";

const trade = (overrides: Partial<CanonicalMarketEvent> = {}): CanonicalMarketEvent => ({
  schemaVersion: MARKET_EVENT_SCHEMA_VERSION,
  normalizationVersion: "wm-normalizer.v1",
  eventId: "coinbase:BTC-USD:100",
  sourceEventId: "100",
  symbol: "BTC",
  normalizedSymbol: "BTC",
  assetClass: "crypto",
  exchange: "COINBASE",
  providerClass: "EXCHANGE",
  providerPath: "coinbase-client-ws",
  eventType: "TRADE",
  timestampExchange: 1_786_335_700_000,
  timestampProvider: 1_786_335_700_010,
  timestampReceived: 1_786_335_700_020,
  timestampProcessed: 1_786_335_700_025,
  sequenceId: 100,
  sequenceState: "CONTIGUOUS",
  price: 65_000,
  size: 0.25,
  aggressorSide: "BUY",
  aggressorMethod: "MAKER_SIDE_INVERTED",
  aggressorConfidence: 1,
  sourceClass: "PRIMARY",
  dataMode: "LIVE",
  fidelityClass: "OBSERVED",
  ...overrides,
});

describe("canonical Market Event validation", () => {
  it("accepts a complete observed trade without rewriting it", () => {
    const event = trade();
    expect(validateMarketEvent(event)).toEqual([]);
    const result = new MarketEventGuard().inspect(event);
    expect(result.status).toBe("ACCEPTED");
    if (result.status === "ACCEPTED") expect(result.event).toBe(event);
  });

  it("allows unavailable optional source timestamps to stay missing", () => {
    expect(validateMarketEvent(trade({ timestampExchange: undefined, timestampProvider: undefined }))).toEqual([]);
  });

  it("quarantines impossible chronology instead of correcting history", () => {
    const result = new MarketEventGuard().inspect(trade({ timestampProcessed: 1_786_335_699_000 }));
    expect(result.status).toBe("QUARANTINED");
    if (result.status === "QUARANTINED") expect(result.reasons).toContain("PROCESSING_BEFORE_RECEIPT");
  });

  it("quarantines invalid trade values and confidence", () => {
    const reasons = validateMarketEvent(trade({ price: -1, size: 0, aggressorConfidence: 1.2 }));
    expect(reasons).toEqual(expect.arrayContaining(["INVALID_PRICE", "INVALID_SIZE", "INVALID_CONFIDENCE"]));
  });

  it("quarantines duplicate IDs", () => {
    const guard = new MarketEventGuard();
    expect(guard.inspect(trade()).status).toBe("ACCEPTED");
    const duplicate = guard.inspect(trade());
    expect(duplicate.status).toBe("QUARANTINED");
    if (duplicate.status === "QUARANTINED") expect(duplicate.reasons).toContain("DUPLICATE_EVENT");
  });

  it("surfaces a sequence gap without inventing the missing events", () => {
    const guard = new MarketEventGuard();
    guard.inspect(trade());
    const result = guard.inspect(trade({ eventId: "coinbase:BTC-USD:103", sourceEventId: "103", sequenceId: 103 }));
    expect(result.status).toBe("ACCEPTED");
    if (result.status === "ACCEPTED") expect(result.warnings).toContain("SEQUENCE_GAP");
  });

  it("quarantines an out-of-order sequence", () => {
    const guard = new MarketEventGuard();
    guard.inspect(trade());
    const result = guard.inspect(trade({ eventId: "coinbase:BTC-USD:99", sourceEventId: "99", sequenceId: 99 }));
    expect(result.status).toBe("QUARANTINED");
    if (result.status === "QUARANTINED") expect(result.reasons).toContain("OUT_OF_ORDER_SEQUENCE");
  });

  it("marks streams without a sequence as explicitly unavailable", () => {
    const result = new MarketEventGuard().inspect(trade({ sequenceId: undefined, sequenceState: "UNAVAILABLE" }));
    expect(result.status).toBe("ACCEPTED");
    if (result.status === "ACCEPTED") expect(result.warnings).toContain("SEQUENCE_UNAVAILABLE");
  });

  it("produces a deterministic collection-health receipt", () => {
    const guard = new MarketEventGuard();
    guard.inspect(trade());
    guard.inspect(trade());
    guard.inspect(trade({ eventId: "coinbase:BTC-USD:103", sourceEventId: "103", sequenceId: 103 }));
    guard.inspect(trade({ eventId: "coinbase:BTC-USD:99", sourceEventId: "99", sequenceId: 99 }));
    expect(guard.snapshot()).toEqual({
      received: 4,
      accepted: 2,
      quarantined: 2,
      duplicates: 1,
      outOfOrder: 1,
      sequenceGaps: 1,
      sequenceUnavailable: 0,
    });
  });

  it("bounds the dedupe window for long-running collectors", () => {
    const guard = new MarketEventGuard(2);
    guard.inspect(trade({ eventId: "event-1", sequenceId: undefined, sequenceState: "UNAVAILABLE" }));
    guard.inspect(trade({ eventId: "event-2", sequenceId: undefined, sequenceState: "UNAVAILABLE" }));
    guard.inspect(trade({ eventId: "event-3", sequenceId: undefined, sequenceState: "UNAVAILABLE" }));
    expect(guard.inspect(trade({ eventId: "event-1", sequenceId: undefined, sequenceState: "UNAVAILABLE" })).status).toBe("ACCEPTED");
    expect(guard.snapshot().accepted).toBe(4);
  });

  it("fails closed on an invalid dedupe capacity", () => {
    expect(() => new MarketEventGuard(0)).toThrow(/positive integer/);
  });
});
