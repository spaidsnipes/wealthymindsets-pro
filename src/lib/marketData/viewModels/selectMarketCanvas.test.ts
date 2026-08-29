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
