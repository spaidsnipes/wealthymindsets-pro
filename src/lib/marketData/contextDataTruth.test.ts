/**
 * selectContextDataReading — truth-lock for the 2026-08-20 Market
 * Reality canon vocabulary adapter. Locks the 8-state × feed-on/off
 * matrix so a silent regression to fake LIVE (or accidentally
 * demoting a truthful DELAYED) is caught.
 */

import { describe, it, expect } from "vitest";
import {
  selectContextDataReading,
  CONTEXT_DATA_MAX_AGE_MS,
} from "./contextDataTruth";
import type {
  CanonicalMarketState,
  MarketStateDimension,
  MarketQualityState,
} from "./canonicalMarketState";

const emptyDim = (): MarketStateDimension => ({
  resolution: "UNKNOWN",
  value: null,
  confidence: null,
  evidence: [],
  contradictions: [],
  unknowns: [],
});

function state(quality: MarketQualityState, eventAt: number | null = 900): CanonicalMarketState {
  return {
    schemaVersion: "wm.market-state.v1",
    sealed: true,
    snapshotId: "snap-1",
    capturedAt: 1_000,
    availableAt: 1_000,
    instrumentId: "T",
    normalizedSymbol: "T",
    executableIdentity: null,
    assetClass: "equity",
    exchange: null,
    session: "REGULAR",
    timeframeContext: [],
    qualityState: quality,
    price: { last: 100, bid: null, ask: null, eventAt, availableAt: 1_000 },
    coverage: [],
    direction: emptyDim(),
    location: emptyDim(),
    aggression: emptyDim(),
    regime: emptyDim(),
    structure: emptyDim(),
    volatility: emptyDim(),
    profile: emptyDim(),
    orderFlow: emptyDim(),
    contradictions: [],
    unknowns: [],
  };
}

describe("selectContextDataReading — canon Market Reality (2026-08-20)", () => {
  it("returns UNKNOWN when no state supplied — with feed-on vs feed-off detail", () => {
    const on = selectContextDataReading(null, true, "polygon", 1_000);
    expect(on.value).toBe("UNKNOWN");
    expect(on.detail).toMatch(/feed connected/i);

    const off = selectContextDataReading(null, false, null, 1_000);
    expect(off.value).toBe("UNKNOWN");
    expect(off.detail).toMatch(/no feed/i);
  });

  it("LIVE + fresh event + feed on → LIVE", () => {
    const r = selectContextDataReading(state("LIVE", 950), true, "polygon", 1_000);
    expect(r.value).toBe("LIVE");
    expect(r.detail).toMatch(/fresh/i);
  });

  it("LIVE claim + feed OFF → DEGRADED (transport is evidence, not permission)", () => {
    const r = selectContextDataReading(state("LIVE", 950), false, null, 1_000);
    expect(r.value).toBe("DEGRADED");
    expect(r.detail).toMatch(/feed offline/i);
  });

  it("LIVE claim + stale event beyond MAX_AGE → DEGRADED", () => {
    const eventAt = 1_000 - CONTEXT_DATA_MAX_AGE_MS - 1;
    const r = selectContextDataReading(state("LIVE", eventAt), true, "polygon", 1_000);
    expect(r.value).toBe("DEGRADED");
    expect(r.detail).toMatch(/lacks a fresh event/i);
  });

  it("DELAYED + feed on → DELAYED; feed off → DEGRADED", () => {
    const on = selectContextDataReading(state("DELAYED"), true, "yahoo", 1_000);
    expect(on.value).toBe("DELAYED");

    const off = selectContextDataReading(state("DELAYED"), false, null, 1_000);
    expect(off.value).toBe("DEGRADED");
  });

  it("REPLAY → HISTORICAL", () => {
    expect(selectContextDataReading(state("REPLAY"), true, "replay", 1_000).value).toBe("HISTORICAL");
  });

  it("STALE / PARTIAL → DEGRADED", () => {
    expect(selectContextDataReading(state("STALE"), true, "polygon", 1_000).value).toBe("DEGRADED");
    expect(selectContextDataReading(state("PARTIAL"), true, "polygon", 1_000).value).toBe("DEGRADED");
  });

  it("PROXY / UNAVAILABLE → UNKNOWN (fidelity truthfully unresolved)", () => {
    expect(selectContextDataReading(state("PROXY"), true, "yahoo", 1_000).value).toBe("UNKNOWN");
    expect(selectContextDataReading(state("UNAVAILABLE"), false, null, 1_000).value).toBe("UNKNOWN");
  });

  it("treats source='unavailable' as feed off (never grants LIVE)", () => {
    const r = selectContextDataReading(state("LIVE", 950), true, "unavailable", 1_000);
    expect(r.value).toBe("DEGRADED");
  });

  it("null eventAt on LIVE claim → DEGRADED (age is +Infinity)", () => {
    const r = selectContextDataReading(state("LIVE", null), true, "polygon", 1_000);
    expect(r.value).toBe("DEGRADED");
  });
});
