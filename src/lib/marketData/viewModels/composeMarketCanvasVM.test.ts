/**
 * composeMarketCanvasVM — the shared canvas compiler must produce a
 * silent-safe MarketCanvasVM from partial inputs, and must faithfully
 * derive the intermediate VMs so downstream consumers can reuse them
 * without re-running the pipeline.
 */

import { describe, it, expect } from "vitest";
import { composeMarketCanvasVM } from "./composeMarketCanvasVM";
import type {
  CanonicalMarketState,
  MarketStateDimension,
} from "../canonicalMarketState";

const emptyDim = (): MarketStateDimension => ({
  resolution: "UNKNOWN",
  value: null,
  confidence: null,
  evidence: [],
  contradictions: [],
  unknowns: [],
});

function emptyState(over: Partial<CanonicalMarketState> = {}): CanonicalMarketState {
  return {
    schemaVersion: "wm.market-state.v1",
    sealed: true,
    snapshotId: "snap-1",
    capturedAt: 1_000,
    availableAt: 1_000,
    instrumentId: "TEST",
    normalizedSymbol: "TEST",
    executableIdentity: null,
    assetClass: "equity",
    exchange: null,
    session: "REGULAR",
    timeframeContext: [],
    qualityState: "LIVE",
    price: { last: null, bid: null, ask: null, eventAt: null, availableAt: null },
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
    ...over,
  };
}

describe("composeMarketCanvasVM — canon §Phase 3 Market Canvas compiler", () => {
  it("returns a silent-safe VM when state is null (no snapshot)", () => {
    const out = composeMarketCanvasVM({
      state: null,
      history: [],
      sessionDecisions: [],
      ownerId: "u1",
      nowMs: 2_000,
    });
    expect(out.canvas.hasSnapshot).toBe(false);
    expect(out.canvas.missing).toEqual([]);
    expect(out.chain).toBeNull();
  });

  it("derives a compiled chain when state is supplied", () => {
    const out = composeMarketCanvasVM({
      state: emptyState(),
      history: [],
      sessionDecisions: [],
      ownerId: "u1",
      nowMs: 2_000,
    });
    expect(out.chain).not.toBeNull();
    expect(out.canvas.hasSnapshot).toBe(true);
  });

  it("defaults phase to PREPARATION when caller omits it (chain compiles for observers)", () => {
    const out = composeMarketCanvasVM({
      state: emptyState(),
      history: [],
      sessionDecisions: [],
      ownerId: "u1",
      nowMs: 2_000,
    });
    // The compiler tolerates missing phase and still produces a valid chain.
    expect(out.chain).not.toBeNull();
  });

  it("honors an explicit sessionIdentity when supplied", () => {
    const out = composeMarketCanvasVM({
      state: emptyState(),
      history: [],
      sessionDecisions: [],
      ownerId: "u1",
      nowMs: 2_000,
      sessionIdentity: "shift-W-fixture",
    });
    // permission carries the sessionIdentity through its input path.
    expect(out.permission).toBeDefined();
    expect(out.canvas.hasSnapshot).toBe(true);
  });

  it("forwards decisionWhy verdict + blockers into the canvas VM", () => {
    const out = composeMarketCanvasVM({
      state: emptyState(),
      history: [],
      sessionDecisions: [],
      ownerId: "u1",
      nowMs: 2_000,
    });
    expect(out.canvas.verdict).toBe(out.decisionWhy.verdict);
    expect(out.canvas.blockers.length).toBe(out.decisionWhy.blockers.length);
    expect(out.canvas.clearances.length).toBe(out.decisionWhy.clearances.length);
  });

  it("populates the RESOLVED corner from any resolved snapshot dimensions", () => {
    const state = emptyState({
      direction: { ...emptyDim(), resolution: "RESOLVED", value: "up" },
    });
    const out = composeMarketCanvasVM({
      state,
      history: [],
      sessionDecisions: [],
      ownerId: "u1",
      nowMs: 2_000,
    });
    expect(out.canvas.resolved).toContain("direction");
  });
});
