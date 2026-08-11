import { describe, expect, it, vi } from "vitest";
import type { MarketChannelCoverage } from "./coverageMap";
import { CanonicalMarketStateStore } from "./canonicalMarketStateStore";
import { publishCanonicalMarketState } from "./publishCanonicalMarketState";

const coverage = (overrides: Partial<MarketChannelCoverage> = {}): MarketChannelCoverage => ({
  schemaVersion: "wm.market-coverage.v1",
  instrumentId: "BTC",
  normalizedSymbol: "BTC",
  channel: "trade",
  providerPath: "coinbase-client-ws",
  coverageState: "COLLECTING",
  memoryState: "SESSION_ONLY",
  persistenceRight: "UNKNOWN",
  rightsPolicyId: "wm.rights.unknown.v1",
  observedFrom: 1_786_000_000_000,
  observedThrough: 1_786_000_120_000,
  lastEventAt: 1_786_000_120_000,
  observedEventCount: 100,
  gapCount: 0,
  fidelity: "OBSERVED",
  collectionScope: "FOREGROUND_TAB",
  detail: "test evidence",
  ...overrides,
});

const input = (snapshotId: string, capturedAt = 1_786_000_130_000) => ({
  snapshotId,
  capturedAt,
  instrumentId: "BTC",
  normalizedSymbol: "BTC",
  executableIdentity: "BTC-USD" as string | null,
  assetClass: "crypto",
  exchange: "COINBASE" as string | null,
  session: "24x7",
  timeframeContext: ["1m"] as readonly string[],
  price: {
    last: 65_000 as number | null,
    bid: 64_999 as number | null,
    ask: 65_001 as number | null,
    eventAt: 1_786_000_120_000 as number | null,
  },
  coverage: [coverage()],
});

describe("publishCanonicalMarketState", () => {
  it("produces, seals, and publishes through the injected canonical owner", () => {
    const store = new CanonicalMarketStateStore();
    const listener = vi.fn();
    store.subscribe({ instrumentId: "BTC", session: "24x7", timeframeContext: ["1m"] }, listener);

    const result = publishCanonicalMarketState(input("snap-1"), { store });

    expect(result.status).toBe("PUBLISHED");
    if (result.status !== "PUBLISHED") throw new Error("Expected publication.");
    expect(result.state.qualityState).toBe("LIVE");
    expect(Object.isFrozen(result.state)).toBe(true);
    expect(store.getBySnapshotId("snap-1")).toBe(result.state);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not notify consumers for an idempotent duplicate", () => {
    const store = new CanonicalMarketStateStore();
    const listener = vi.fn();
    store.subscribe({ instrumentId: "BTC", session: "24x7", timeframeContext: ["1m"] }, listener);

    expect(publishCanonicalMarketState(input("snap-1"), { store }).status).toBe("PUBLISHED");
    expect(publishCanonicalMarketState(input("snap-1"), { store }).status).toBe("DUPLICATE");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("rejects stale evidence without replacing the current state", () => {
    const store = new CanonicalMarketStateStore();
    const current = publishCanonicalMarketState(input("snap-current"), { store });
    if (current.status !== "PUBLISHED") throw new Error("Expected current publication.");
    const staleInput = input("snap-stale", 1_786_000_100_000);
    staleInput.coverage = [coverage({
      observedThrough: 1_786_000_090_000,
      lastEventAt: 1_786_000_090_000,
    })];
    staleInput.price.eventAt = 1_786_000_090_000;

    const result = publishCanonicalMarketState(staleInput, { store });

    expect(result.status).toBe("REJECTED_STALE");
    expect(store.getBySnapshotId("snap-current")).toBe(current.state);
    expect(store.getBySnapshotId("snap-stale")).toBeNull();
  });

  it("fails closed when the producer input is invalid", () => {
    const store = new CanonicalMarketStateStore();
    const invalid = input("snap-invalid");
    invalid.price.last = Number.NaN;

    expect(() => publishCanonicalMarketState(invalid, { store })).toThrow();
    expect(store.getBySnapshotId("snap-invalid")).toBeNull();
  });

  it("preserves an explicit provider-level delayed classification", () => {
    const store = new CanonicalMarketStateStore();
    const result = publishCanonicalMarketState(input("snap-delayed"), {
      store,
      qualityState: "DELAYED",
    });

    if (result.status !== "PUBLISHED") throw new Error("Expected delayed publication.");
    expect(result.state.qualityState).toBe("DELAYED");
  });
});
