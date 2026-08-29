/**
 * selectMarketCanvas — Phase 3 Market Canvas compositor tests.
 * Locks the four-corner shape (WHY / WHY NOT / MISSING / WHAT WOULD
 * INVALIDATE) so downstream renderers agree.
 */

import { describe, it, expect } from "vitest";
import {
  selectMarketCanvas,
  MARKET_CANVAS_VERSION,
} from "./selectMarketCanvas";
import type {
  CanonicalMarketState,
  MarketStateDimension,
} from "../canonicalMarketState";
import type { DecisionWhyVM } from "./selectDecisionWhyNot";

const emptyDim = (): MarketStateDimension => ({
  resolution: "UNKNOWN",
  value: null,
  confidence: null,
  evidence: [],
  contradictions: [],
  unknowns: [],
});

const emptyState = (unknowns: string[] = []): CanonicalMarketState => ({
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
  unknowns,
});

const why = (over: Partial<DecisionWhyVM> = {}): DecisionWhyVM => ({
  version: "wm.decision-why.v1",
  verdict: "ACTION",
  clear: true,
  headline: "Right-of-way is granted — the path is clear.",
  blockers: [],
  clearances: [],
  invalidators: [],
  ...over,
});

describe("selectMarketCanvas — canon §Phase 3 Market Canvas", () => {
  it("exposes a stable version", () => {
    expect(MARKET_CANVAS_VERSION).toBe("wm.market-canvas.v1");
  });

  it("returns an honest silent VM when nothing is supplied", () => {
    const vm = selectMarketCanvas(null, null);
    expect(vm.verdict).toBe("UNKNOWN");
    expect(vm.clear).toBe(false);
    expect(vm.hasSnapshot).toBe(false);
    expect(vm.missing).toEqual([]);
    expect(vm.blockers).toEqual([]);
    expect(vm.invalidators).toEqual([]);
    expect(vm.headline).toMatch(/no market snapshot/i);
  });

  it("reports snapshot-present-decision-uncompiled distinctly from no-snapshot", () => {
    const vm = selectMarketCanvas(emptyState(), null);
    expect(vm.hasSnapshot).toBe(true);
    expect(vm.headline).toMatch(/decision has not compiled/i);
  });

  it("forwards the WhyNot headline verbatim when a decision is compiled", () => {
    const vm = selectMarketCanvas(emptyState(), why({ headline: "custom headline" }));
    expect(vm.headline).toBe("custom headline");
  });

  it("copies unknowns from the snapshot into the MISSING panel", () => {
    const vm = selectMarketCanvas(emptyState(["direction:unresolved", "regime:unresolved"]), null);
    expect(vm.missing).toEqual(["direction:unresolved", "regime:unresolved"]);
  });

  it("RESOLVED corner is empty when every dimension is UNKNOWN", () => {
    const vm = selectMarketCanvas(emptyState(), null);
    expect(vm.resolved).toEqual([]);
  });

  it("RESOLVED corner is silent when no snapshot supplied (canon §Silence)", () => {
    const vm = selectMarketCanvas(null, null);
    expect(vm.resolved).toEqual([]);
  });

  it("RESOLVED corner names each dimension whose resolution is not UNKNOWN", () => {
    const s = emptyState();
    // Cast to mutate for test fixture only.
    const withResolved = {
      ...s,
      direction: { ...s.direction, resolution: "RESOLVED" as const, value: "up" },
      regime: { ...s.regime, resolution: "PARTIAL" as const },
    };
    const vm = selectMarketCanvas(withResolved, null);
    expect(vm.resolved).toContain("direction");
    expect(vm.resolved).toContain("regime");
    expect(vm.resolved).not.toContain("location");
  });

  it("RESOLVED order matches the canonical dimension order (direction, location, aggression, regime, structure, volatility, profile, orderFlow)", () => {
    const s = emptyState();
    const allResolved = {
      ...s,
      direction: { ...s.direction, resolution: "RESOLVED" as const },
      location: { ...s.location, resolution: "RESOLVED" as const },
      aggression: { ...s.aggression, resolution: "RESOLVED" as const },
      regime: { ...s.regime, resolution: "RESOLVED" as const },
      structure: { ...s.structure, resolution: "RESOLVED" as const },
      volatility: { ...s.volatility, resolution: "RESOLVED" as const },
      profile: { ...s.profile, resolution: "RESOLVED" as const },
      orderFlow: { ...s.orderFlow, resolution: "RESOLVED" as const },
    };
    const vm = selectMarketCanvas(allResolved, null);
    expect(vm.resolved).toEqual([
      "direction", "location", "aggression", "regime",
      "structure", "volatility", "profile", "orderFlow",
    ]);
  });

  it("copies WhyNot clearances into the CLEARED panel", () => {
    const vm = selectMarketCanvas(
      emptyState(),
      why({ clearances: ["No active contradiction to the thesis.", "3/9 evidence nodes paid."] }),
    );
    expect(vm.clearances).toEqual([
      "No active contradiction to the thesis.",
      "3/9 evidence nodes paid.",
    ]);
  });

  it("leaves CLEARED empty when no whyNot is compiled (canon §Silence)", () => {
    const vm = selectMarketCanvas(emptyState(), null);
    expect(vm.clearances).toEqual([]);
  });

  it("maps WhyNot blockers to their labels for the WHY NOT panel", () => {
    const vm = selectMarketCanvas(
      emptyState(),
      why({
        verdict: "WAIT",
        clear: false,
        blockers: [
          { kind: "CONTRADICTION", label: "Active contradiction", detail: "sellers absorbing" },
          { kind: "EVIDENCE_DEBT", label: "regime", detail: "unpaid" },
        ],
      }),
    );
    expect(vm.blockers).toEqual(["Active contradiction", "regime"]);
  });

  it("populates invalidators only from the ACTION-path WhyNot output", () => {
    const vm = selectMarketCanvas(
      emptyState(),
      why({ invalidators: ["A contradiction emerges against the thesis."] }),
    );
    expect(vm.invalidators).toEqual(["A contradiction emerges against the thesis."]);
    expect(vm.verdict).toBe("ACTION");
    expect(vm.clear).toBe(true);
  });

  it("leaves invalidators empty for non-ACTION verdicts (canon §Silence Is A Feature)", () => {
    const vm = selectMarketCanvas(
      emptyState(),
      why({ verdict: "WAIT", clear: false, invalidators: [] }),
    );
    expect(vm.invalidators).toEqual([]);
  });

  it("preserves the version signature (renderers can lock on it)", () => {
    const vm = selectMarketCanvas(null, null);
    expect(vm.version).toBe(MARKET_CANVAS_VERSION);
  });
});
