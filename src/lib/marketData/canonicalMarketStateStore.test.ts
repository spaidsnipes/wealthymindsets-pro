import { describe, expect, it, vi } from "vitest";
import {
  sealCanonicalMarketState,
  type CanonicalMarketState,
  type CanonicalMarketStateInput,
  type MarketStateDimension,
} from "./canonicalMarketState";
import { CanonicalMarketStateStore, canonicalMarketStateKey } from "./canonicalMarketStateStore";

const unknown = (reason: string): MarketStateDimension => ({
  resolution: "UNKNOWN",
  value: null,
  confidence: null,
  evidence: [],
  contradictions: [],
  unknowns: [reason],
});

function state(overrides: Partial<CanonicalMarketStateInput> = {}): CanonicalMarketState {
  const capturedAt = overrides.capturedAt ?? 10_000;
  return sealCanonicalMarketState({
    snapshotId: "ms-btc-1",
    capturedAt,
    availableAt: overrides.availableAt ?? capturedAt + 5,
    instrumentId: "BTC-USD",
    normalizedSymbol: "BTC",
    executableIdentity: "BTC-USD",
    assetClass: "crypto",
    exchange: "COINBASE",
    session: "24X7",
    timeframeContext: ["5m", "1h"],
    qualityState: "PARTIAL",
    price: { last: 65_000, bid: null, ask: null, eventAt: capturedAt - 10, availableAt: capturedAt - 5 },
    coverage: [],
    direction: unknown("Direction unresolved."),
    location: unknown("Location unresolved."),
    aggression: unknown("Aggression unresolved."),
    regime: unknown("Regime unresolved."),
    structure: unknown("Structure unresolved."),
    volatility: unknown("Volatility unresolved."),
    profile: unknown("Profile unresolved."),
    orderFlow: unknown("Order flow unresolved."),
    contradictions: [],
    unknowns: ["Direction", "Location"],
    ...overrides,
  });
}

describe("Canonical Market State runtime store", () => {
  it("publishes one sealed state and resolves it by decision context or snapshot", () => {
    const store = new CanonicalMarketStateStore();
    const snapshot = state();

    expect(store.publish(snapshot).status).toBe("PUBLISHED");
    expect(store.get(snapshot)).toBe(snapshot);
    expect(store.getBySnapshotId(snapshot.snapshotId)).toBe(snapshot);
  });

  it("does not notify twice for an idempotent snapshot", () => {
    const store = new CanonicalMarketStateStore();
    const snapshot = state();
    const listener = vi.fn();
    store.subscribe(snapshot, listener);

    expect(store.publish(snapshot).status).toBe("PUBLISHED");
    expect(store.publish(snapshot).status).toBe("DUPLICATE");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("rejects out-of-order state without rolling consumers backward", () => {
    const store = new CanonicalMarketStateStore();
    const current = state({ snapshotId: "current", capturedAt: 20_000, availableAt: 20_005 });
    const stale = state({ snapshotId: "stale", capturedAt: 19_000, availableAt: 19_005 });
    store.publish(current);

    expect(store.publish(stale)).toMatchObject({ status: "REJECTED_STALE", current, rejected: stale });
    expect(store.get(current)).toBe(current);
    expect(store.getBySnapshotId(stale.snapshotId)).toBeNull();
  });

  it("keeps timeframe contexts independent instead of overwriting by symbol", () => {
    const store = new CanonicalMarketStateStore();
    const intraday = state({ snapshotId: "intraday", timeframeContext: ["2m", "15m"] });
    const higherTimeframe = state({ snapshotId: "higher", timeframeContext: ["1D", "4H", "1H"] });
    store.publish(intraday);
    store.publish(higherTimeframe);

    expect(canonicalMarketStateKey(intraday)).not.toBe(canonicalMarketStateKey(higherTimeframe));
    expect(store.get(intraday)).toBe(intraday);
    expect(store.get(higherTimeframe)).toBe(higherTimeframe);
  });

  it("rejects snapshot identity reuse across contexts", () => {
    const store = new CanonicalMarketStateStore();
    const original = state({ snapshotId: "immutable-id" });
    const conflicting = state({ snapshotId: "immutable-id", timeframeContext: ["1D"] });
    store.publish(original);

    expect(() => store.publish(conflicting)).toThrow(/snapshotId already belongs/i);
  });

  it("unsubscribes without affecting the canonical state", () => {
    const store = new CanonicalMarketStateStore();
    const first = state({ snapshotId: "first" });
    const next = state({ snapshotId: "next", capturedAt: 11_000, availableAt: 11_005 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(first, listener);
    store.publish(first);
    unsubscribe();
    store.publish(next);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.get(first)).toBe(next);
  });
});
