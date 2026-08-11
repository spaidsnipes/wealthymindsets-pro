import { describe, expect, it } from "vitest";
import {
  produceCanonicalMarketStateInput,
  produceCanonicalMarketState,
} from "./produceCanonicalMarketState";
import type { MarketChannelCoverage } from "./coverageMap";

const baseCoverage = (overrides: Partial<MarketChannelCoverage> = {}): MarketChannelCoverage => ({
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
  detail: "test",
  ...overrides,
});

const baseInput = () => ({
  snapshotId: "snap-1",
  capturedAt: 1_786_000_130_000,
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
  coverage: [baseCoverage()],
});

describe("canonical market state producer", () => {
  it("marks LIVE when a channel is COLLECTING with a fresh event", () => {
    const out = produceCanonicalMarketStateInput(baseInput());
    expect(out.qualityState).toBe("LIVE");
    expect(out.price.availableAt).toBe(out.availableAt);
    expect(out.price.eventAt).toBe(1_786_000_120_000);
  });

  it("marks STALE when the freshest evidence is older than the stale window", () => {
    const in1 = baseInput();
    in1.capturedAt = 1_786_000_400_000;   // > 60s after lastEventAt
    const out = produceCanonicalMarketStateInput(in1);
    expect(out.qualityState).toBe("STALE");
  });

  it("marks PARTIAL when the only channel is GAPPED", () => {
    const in1 = baseInput();
    in1.coverage = [baseCoverage({ coverageState: "GAPPED", gapCount: 3 })];
    const out = produceCanonicalMarketStateInput(in1);
    expect(out.qualityState).toBe("PARTIAL");
  });

  it("marks UNAVAILABLE with no coverage and no price", () => {
    const in1 = baseInput();
    in1.coverage = [];
    in1.price = { last: null, bid: null, ask: null, eventAt: null };
    const out = produceCanonicalMarketStateInput(in1);
    expect(out.qualityState).toBe("UNAVAILABLE");
    expect(out.price.availableAt).toBeNull();
    expect(out.price.eventAt).toBeNull();
  });

  it("marks REPLAY whenever any relevant channel is in REPLAY", () => {
    const in1 = baseInput();
    in1.coverage = [baseCoverage({ coverageState: "REPLAY" })];
    const out = produceCanonicalMarketStateInput(in1);
    expect(out.qualityState).toBe("REPLAY");
  });

  it("leaves every analytical dimension UNKNOWN when the caller supplies no evidence", () => {
    const out = produceCanonicalMarketStateInput(baseInput());
    for (const key of ["direction", "location", "aggression", "regime",
                       "structure", "volatility", "profile", "orderFlow"] as const) {
      expect(out[key].resolution).toBe("UNKNOWN");
      expect(out[key].value).toBeNull();
      expect(out[key].unknowns.length).toBeGreaterThan(0);
    }
  });

  it("seals into an immutable snapshot with the right schema version", () => {
    const state = produceCanonicalMarketState(baseInput());
    expect(state.schemaVersion).toBe("wm.market-state.v1");
    expect(state.sealed).toBe(true);
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.direction)).toBe(true);
    expect(Object.isFrozen(state.coverage)).toBe(true);
  });

  it("caller can override qualityState only when they can name it truthfully (e.g. PROXY)", () => {
    const state = produceCanonicalMarketState(baseInput(), { qualityState: "PROXY" });
    expect(state.qualityState).toBe("PROXY");
  });

  it("throws when the sealed snapshot would violate chronology", () => {
    const in1 = baseInput();
    in1.capturedAt = 1;
    in1.price.eventAt = 2_000_000_000_000;
    expect(() => produceCanonicalMarketState(in1)).toThrow(/chronology|price/i);
  });
});
