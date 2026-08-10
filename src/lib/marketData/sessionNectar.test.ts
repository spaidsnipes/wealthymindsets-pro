import { describe, expect, it, vi } from "vitest";
import { MARKET_EVENT_SCHEMA_VERSION, type CanonicalMarketEvent } from "./marketEvent";
import { findSessionNectarChannel, SessionNectarCollector } from "./sessionNectar";

const trade = (overrides: Partial<CanonicalMarketEvent> = {}): CanonicalMarketEvent => ({
  schemaVersion: MARKET_EVENT_SCHEMA_VERSION,
  normalizationVersion: "wm-normalizer.v1",
  eventId: "coinbase:BTC-USD:100",
  sourceEventId: "100",
  symbol: "BTC",
  normalizedSymbol: "BTC",
  executableIdentity: "BTC-USD",
  assetClass: "crypto",
  exchange: "COINBASE",
  providerClass: "EXCHANGE",
  providerPath: "coinbase-client-ws",
  eventType: "TRADE",
  timestampExchange: 1_786_335_700_000,
  timestampProvider: 1_786_335_700_010,
  timestampReceived: 1_786_335_700_020,
  timestampProcessed: 1_786_335_700_025,
  availableAt: 1_786_335_700_025,
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
  rightsPolicyId: "wm.rights.unknown.v1",
  ...overrides,
});

describe("Session Nectar collection health", () => {
  it("turns an accepted canonical event into session-only channel coverage", () => {
    const collector = new SessionNectarCollector(1_786_335_600_000);
    expect(collector.ingest(trade()).status).toBe("ACCEPTED");

    const snapshot = collector.snapshot();
    expect(snapshot).toMatchObject({
      schemaVersion: "wm.session-nectar.v1",
      retentionState: "SESSION_ONLY_NO_RAW_PAYLOADS",
      unsupportedCapabilities: 0,
      receipts: { received: 1, accepted: 1, quarantined: 0 },
    });
    expect(snapshot.channels).toEqual([
      expect.objectContaining({
        instrumentId: "BTC-USD",
        normalizedSymbol: "BTC",
        channel: "trade",
        coverageState: "COLLECTING",
        memoryState: "SESSION_ONLY",
        persistenceRight: "UNKNOWN",
        rightsPolicyId: "wm.rights.unknown.v1",
        observedFrom: 1_786_335_700_000,
      }),
    ]);
  });

  it("resolves executable identities by normalized symbol without guessing aliases", () => {
    const collector = new SessionNectarCollector(1_786_335_600_000);
    collector.ingest(trade());

    expect(findSessionNectarChannel(collector.snapshot(), "btc", "trade")).toMatchObject({
      instrumentId: "BTC-USD",
      normalizedSymbol: "BTC",
      fidelity: "OBSERVED",
    });
    expect(findSessionNectarChannel(collector.snapshot(), "ETH", "trade")).toBeNull();
  });

  it("deduplicates repeated event identities before coverage changes", () => {
    const collector = new SessionNectarCollector(1_786_335_600_000);
    collector.ingest(trade());
    expect(collector.ingest(trade()).status).toBe("QUARANTINED");

    expect(collector.snapshot().receipts).toMatchObject({
      received: 2,
      accepted: 1,
      quarantined: 1,
      duplicates: 1,
    });
    expect(collector.snapshot().channels).toHaveLength(1);
  });

  it("surfaces a sequence gap in both receipts and coverage", () => {
    const collector = new SessionNectarCollector(1_786_335_600_000);
    collector.ingest(trade());
    collector.ingest(trade({
      eventId: "coinbase:BTC-USD:103",
      sourceEventId: "103",
      sequenceId: 103,
      timestampExchange: 1_786_335_701_000,
      timestampReceived: 1_786_335_701_020,
      timestampProcessed: 1_786_335_701_025,
      availableAt: 1_786_335_701_025,
    }));

    expect(collector.snapshot().receipts.sequenceGaps).toBe(1);
    expect(collector.snapshot().channels[0]).toMatchObject({
      coverageState: "GAPPED",
      gapCount: 1,
      observedThrough: 1_786_335_701_000,
    });
  });

  it("does not create trusted coverage for an unregistered provider capability", () => {
    const collector = new SessionNectarCollector(1_786_335_600_000);
    const result = collector.ingest(trade({
      eventId: "unknown:BTC:1",
      providerPath: "unreviewed-feed",
      sequenceId: undefined,
      sequenceState: "UNAVAILABLE",
    }));

    expect(result.status).toBe("UNSUPPORTED_CAPABILITY");
    expect(collector.snapshot().channels).toEqual([]);
    expect(collector.snapshot().unsupportedCapabilities).toBe(1);
  });

  it("notifies subscribers only when collection state changes", () => {
    const collector = new SessionNectarCollector(1_786_335_600_000);
    const listener = vi.fn();
    const unsubscribe = collector.subscribe(listener);

    collector.ingest(trade());
    collector.ingest(trade());
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    collector.ingest(trade({
      eventId: "coinbase:BTC-USD:101",
      sourceEventId: "101",
      sequenceId: 101,
    }));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid session timing", () => {
    expect(() => new SessionNectarCollector(0)).toThrow(/valid start timestamp/);
  });
});
