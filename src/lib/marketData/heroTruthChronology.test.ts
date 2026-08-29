import { describe, expect, it } from "vitest";
import type { CanonicalMarketState } from "./canonicalMarketState";
import { selectHeroPriceChronology } from "./heroTruthChronology";

function state(
  qualityState: CanonicalMarketState["qualityState"],
  overrides: Partial<CanonicalMarketState["price"]> = {},
): CanonicalMarketState {
  const unknownDimension: CanonicalMarketState["direction"] = {
    resolution: "UNKNOWN",
    value: null,
    confidence: null,
    evidence: [],
    contradictions: [],
    unknowns: ["fixture"],
  };
  return {
    schemaVersion: "wm.market-state.v1",
    sealed: true,
    snapshotId: "hero:fixture",
    capturedAt: 1_000_004,
    availableAt: 1_000_004,
    instrumentId: "TSLA",
    normalizedSymbol: "TSLA",
    executableIdentity: "TSLA",
    assetClass: "equity",
    exchange: null,
    session: "RTH",
    timeframeContext: ["5m"],
    qualityState,
    price: {
      last: 351.12,
      bid: null,
      ask: null,
      eventAt: 1_000_000,
      availableAt: 1_000_002,
      ...overrides,
    },
    coverage: [],
    direction: unknownDimension,
    location: unknownDimension,
    aggression: unknownDimension,
    regime: unknownDimension,
    structure: unknownDimension,
    volatility: unknownDimension,
    profile: unknownDimension,
    orderFlow: unknownDimension,
    contradictions: [],
    unknowns: [],
  };
}

describe("Command Deck hero price chronology", () => {
  it("withholds a misleading receipt-time delta from delayed evidence", () => {
    expect(selectHeroPriceChronology(state("DELAYED"))).toEqual({
      state: "UNVERIFIED",
      ageMs: null,
      label: "observation age unverified",
      detail: "delayed price evidence does not prove an exact market-observation age.",
    });
  });

  it("shows exact age only for LIVE evidence with valid chronology", () => {
    expect(selectHeroPriceChronology(state("LIVE"))).toMatchObject({
      state: "OBSERVED_AGE",
      ageMs: 4,
      label: "observed 4ms ago",
    });
  });

  it("fails closed when a LIVE packet lacks observation chronology", () => {
    expect(selectHeroPriceChronology(state("LIVE", { eventAt: null, availableAt: null }))).toMatchObject({
      state: "UNVERIFIED",
      ageMs: null,
      label: "observation age unverified",
    });
  });

  it("does not imply a price observation when price is absent", () => {
    expect(selectHeroPriceChronology(state("UNAVAILABLE", { last: null, eventAt: null, availableAt: null }))).toMatchObject({
      state: "MISSING",
      label: null,
    });
  });
});
