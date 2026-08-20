import { describe, expect, it } from "vitest";
import type { CanonicalMarketState } from "./marketData/canonicalMarketState";
import {
  CONTEXT_DATA_MAX_AGE_MS,
  selectContextDataReading,
} from "./marketData/contextDataTruth";

const NOW = 1_000_500;

function state(
  qualityState: CanonicalMarketState["qualityState"],
  eventAt: number | null = 1_000_000,
): CanonicalMarketState {
  return {
    schemaVersion: "wm.market-state.v1",
    sealed: true,
    snapshotId: "test:snapshot",
    capturedAt: 1_000_500,
    availableAt: 1_000_500,
    instrumentId: "TSLA",
    normalizedSymbol: "TSLA",
    executableIdentity: "TSLA",
    assetClass: "equity",
    exchange: null,
    session: "RTH",
    timeframeContext: ["1m"],
    qualityState,
    price: { last: eventAt == null ? null : 351.12, bid: null, ask: null, eventAt, availableAt: eventAt },
    coverage: [],
    direction: unknownDimension(),
    location: unknownDimension(),
    aggression: unknownDimension(),
    regime: unknownDimension(),
    structure: unknownDimension(),
    volatility: unknownDimension(),
    profile: unknownDimension(),
    orderFlow: unknownDimension(),
    contradictions: [],
    unknowns: [],
  };
}

function unknownDimension(): CanonicalMarketState["direction"] {
  return {
    resolution: "UNKNOWN",
    value: null,
    confidence: null,
    evidence: [],
    contradictions: [],
    unknowns: ["test fixture"],
  };
}

describe("Command Context DATA truth", () => {
  it("never promotes delayed, stale, partial, or unavailable canonical states to LIVE", () => {
    for (const quality of ["DELAYED", "STALE", "PARTIAL", "UNAVAILABLE"] as const) {
      expect(selectContextDataReading(state(quality), true, "yahoo", NOW).value).not.toBe("LIVE");
    }
    expect(selectContextDataReading(state("DELAYED"), true, "yahoo", NOW).detail).toBe(
      "canonical delayed state · not live",
    );
  });

  it("requires a connected eligible source and a fresh canonical event for LIVE", () => {
    expect(selectContextDataReading(state("LIVE"), true, "alpaca", NOW).value).toBe("LIVE");
    expect(selectContextDataReading(state("LIVE"), false, "alpaca", NOW).value).toBe("DEGRADED");
    expect(selectContextDataReading(state("LIVE", 900_000), true, "alpaca", NOW).value).toBe("DEGRADED");
    expect(selectContextDataReading(state("LIVE", null), true, "alpaca", NOW).value).toBe("DEGRADED");
  });

  it("expires a once-fresh LIVE snapshot as current time advances", () => {
    const live = state("LIVE");
    expect(selectContextDataReading(live, true, "alpaca", 1_000_000 + CONTEXT_DATA_MAX_AGE_MS).value).toBe("LIVE");
    expect(selectContextDataReading(live, true, "alpaca", 1_000_001 + CONTEXT_DATA_MAX_AGE_MS).value).toBe("DEGRADED");
  });

  it("fails closed when the current clock predates the market event", () => {
    expect(selectContextDataReading(state("LIVE"), true, "alpaca", 999_999).value).toBe("DEGRADED");
  });

  it("maps replay and proxy evidence without inventing live fidelity", () => {
    expect(selectContextDataReading(state("REPLAY"), true, "yahoo", NOW).value).toBe("HISTORICAL");
    expect(selectContextDataReading(state("PROXY"), true, "yahoo", NOW).value).toBe("UNKNOWN");
  });

  it("keeps a connected transport with no canonical state UNKNOWN", () => {
    expect(selectContextDataReading(null, true, "alpaca", NOW)).toEqual({
      value: "UNKNOWN",
      detail: "feed connected · state unresolved",
    });
  });
});
