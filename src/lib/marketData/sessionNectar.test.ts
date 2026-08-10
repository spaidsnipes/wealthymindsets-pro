import { describe, expect, it, vi } from "vitest";
import { MARKET_EVENT_SCHEMA_VERSION, type CanonicalMarketEvent } from "./marketEvent";
import {
  findSessionNectarChannel,
  getOrCreateSessionNectarRuntime,
  SessionNectarCollector,
} from "./sessionNectar";

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
        observedEventCount: 1,
      }),
    ]);
  });

  it("selects the active provider and marks stale coverage unavailable to callers", () => {
    const collector = new SessionNectarCollector(1_786_335_600_000);
    collector.ingest(trade());
    collector.ingest(trade({
      eventId: "binance:BTCUSDT:101",
      sourceEventId: "101",
      executableIdentity: "BTC-USDT",
      providerClass: "EXCHANGE",
      providerPath: "binance-us-client-ws",
      exchange: "BINANCE_US",
      sequenceId: 101,
      timestampExchange: 1_786_335_701_000,
      timestampProvider: 1_786_335_701_005,
      timestampReceived: 1_786_335_701_020,
      timestampProcessed: 1_786_335_701_025,
      availableAt: 1_786_335_701_025,
    }));

    expect(findSessionNectarChannel(
      collector.snapshot(), "BTC", "trade", "coinbase-client-ws", 1_786_335_701_021, 2_000,
    )?.providerPath).toBe("coinbase-client-ws");
    expect(findSessionNectarChannel(
      collector.snapshot(), "BTC", "trade", "coinbase-client-ws", 1_786_335_720_000, 2_000,
    )?.coverageState).toBe("STALE");
    expect(findSessionNectarChannel(
      collector.snapshot(), "BTC", "trade", "binance-us-client-ws", 1_786_335_701_021, 2_000,
    )?.providerPath).toBe("binance-us-client-ws");
  });

  it("restores summary coverage without claiming retained raw tape", () => {
    const original = new SessionNectarCollector(1_786_335_600_000);
    original.ingest(trade());
    const restored = new SessionNectarCollector(1_786_335_800_000);
    expect(restored.restoreCoverageSummaries(original.snapshot().channels.map(channel => ({
      ...channel,
      coverageState: "STALE" as const,
      memoryState: "SUMMARY_ONLY" as const,
    })))).toBe(1);
    expect(restored.snapshot()).toMatchObject({
      retentionState: "BROWSER_LOCAL_SUMMARY_NO_RAW_PAYLOADS",
      channels: [expect.objectContaining({
        coverageState: "STALE",
        memoryState: "SUMMARY_ONLY",
        observedEventCount: 1,
      })],
    });
  });

  it("marks server-restored operational coverage as durable without claiming raw tape", () => {
    const original = new SessionNectarCollector(1_786_335_600_000);
    original.ingest(trade());
    const restored = new SessionNectarCollector(1_786_335_800_000);
    restored.restoreCoverageSummaries(original.snapshot().channels.map(channel => ({
      ...channel,
      coverageState: "STALE" as const,
      memoryState: "SUMMARY_ONLY" as const,
    })), "server");
    expect(restored.snapshot().retentionState).toBe("SERVER_DURABLE_SUMMARY_NO_RAW_PAYLOADS");
  });

  it("resumes a restored channel instead of creating an uppercase event-type duplicate", () => {
    const collector = new SessionNectarCollector(1_786_335_800_000);
    collector.restoreCoverageSummaries([{
      schemaVersion: "wm.market-coverage.v1",
      instrumentId: "BTC-USD",
      normalizedSymbol: "BTC",
      channel: "trade",
      providerPath: "coinbase-client-ws",
      coverageState: "STALE",
      memoryState: "SUMMARY_ONLY",
      persistenceRight: "UNKNOWN",
      rightsPolicyId: "wm.rights.unknown.v1",
      observedFrom: 1_786_335_600_000,
      observedThrough: 1_786_335_650_000,
      lastEventAt: 1_786_335_650_020,
      observedEventCount: 1_732,
      gapCount: 0,
      fidelity: "OBSERVED",
      collectionScope: "FOREGROUND_TAB",
      detail: "Restored operational summary only.",
    }]);

    expect(collector.ingest(trade()).status).toBe("ACCEPTED");
    expect(collector.snapshot().channels).toEqual([
      expect.objectContaining({
        channel: "trade",
        coverageState: "COLLECTING",
        observedEventCount: 1_733,
        fidelity: "OBSERVED",
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

  it("shares one collector across duplicate client-module evaluations", () => {
    const browserRealm: Record<PropertyKey, unknown> = {};
    const createCollector = vi.fn(() => new SessionNectarCollector(1_786_335_600_000));

    const feedRuntime = getOrCreateSessionNectarRuntime(browserRealm, createCollector);
    const uiRuntime = getOrCreateSessionNectarRuntime(browserRealm, createCollector);

    expect(feedRuntime).toBe(uiRuntime);
    expect(feedRuntime.collector).toBe(uiRuntime.collector);
    expect(createCollector).toHaveBeenCalledTimes(1);
    feedRuntime.collector.ingest(trade());
    expect(uiRuntime.collector.snapshot().receipts.accepted).toBe(1);
  });
});
