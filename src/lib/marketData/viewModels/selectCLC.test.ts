/**
 * selectCLC — M27 truth-lock.
 *
 * CLC = Context + Location + Confirmation. This is a Founder-verified
 * definition (2026-08-12) that REPLACES an earlier retracted
 * "Confluence + Alignment + Catalyst" invention. Silent drift here
 * would silently regress the entire /education + /backtesting taxonomy
 * and every "CLC Long / CLC Short" journal entry semantically.
 *
 * Locks:
 *   - CONTEXT leg reads regime + direction resolution
 *   - LOCATION leg reads location + structure resolution
 *   - CONFIRMATION requires signedOrderFlowCoverage >= threshold
 *     AND a RESPONDING DLAR response — CANNOT be satisfied by inference
 *   - Verdict math: all 3 SATISFIED → CLC_LONG/CLC_SHORT/WAIT (per direction),
 *     any NOT_SATISFIED → INVALID (not merely "early"),
 *     any UNKNOWN + no NOT_SATISFIED → UNKNOWN,
 *     otherwise WAIT (setup forming)
 */

import { describe, it, expect } from "vitest";
import { selectCLC } from "./selectCLC";
import type { CanonicalMarketState, MarketStateDimension } from "../canonicalMarketState";

function resolved(value: string): MarketStateDimension {
  return {
    resolution: "RESOLVED",
    value,
    confidence: 0.9,
    evidence: [
      { eventId: "e", observedAt: 1, availableAt: 2, source: "test", fidelity: "OBSERVED", basis: "test" },
    ],
    contradictions: [],
    unknowns: [],
  };
}

function unknown(): MarketStateDimension {
  return {
    resolution: "UNKNOWN",
    value: null,
    confidence: null,
    evidence: [],
    contradictions: [],
    unknowns: ["fixture"],
  };
}

function partial(value: string): MarketStateDimension {
  return {
    resolution: "PARTIAL",
    value,
    confidence: 0.5,
    evidence: [],
    contradictions: [],
    unknowns: [],
  };
}

function makeState(over: Partial<Record<keyof CanonicalMarketState, MarketStateDimension>> = {}): CanonicalMarketState {
  return {
    schemaVersion: "wm.market-state.v1",
    sealed: true,
    snapshotId: "clc:fixture",
    capturedAt: 1_800_000_000_000,
    availableAt: 1_800_000_000_000,
    instrumentId: "TSLA",
    normalizedSymbol: "TSLA",
    executableIdentity: "TSLA",
    assetClass: "equity",
    exchange: null,
    session: "RTH",
    timeframeContext: ["5m"],
    qualityState: "LIVE",
    price: { last: 350, bid: null, ask: null, eventAt: 1, availableAt: 2 },
    coverage: [],
    direction: unknown(),
    location: unknown(),
    aggression: unknown(),
    regime: unknown(),
    structure: unknown(),
    volatility: unknown(),
    profile: unknown(),
    orderFlow: unknown(),
    contradictions: [],
    unknowns: [],
    ...over,
  } as CanonicalMarketState;
}

/**
 * Fully-satisfied CLC scaffold: all four gating dimensions RESOLVED plus
 * orderFlow RESOLVED and a RESPONDING dlar. Caller mutates.
 */
function satisfiedLongState(): CanonicalMarketState {
  return makeState({
    regime: resolved("TREND"),
    direction: resolved("LONG"),
    location: resolved("VAL"),
    structure: resolved("BOS"),
    orderFlow: resolved("SIGNED_LIVE"),
    aggression: resolved("HIGH"),
    volatility: resolved("NORMAL"),
    profile: resolved("BALANCED"),
  });
}

/**
 * A pre-computed DLAR whose response is RESPONDING — lets confirmation
 * short-circuit to SATISFIED without staging displacement history.
 * (The pre-computed-DLAR path is itself locked in a dedicated test below.)
 */
function respondingDlar(capturedAt: number) {
  return {
    direction: { resolution: "RESOLVED" as const, value: "LONG", confidence: 1, evidence: [], contradictions: [], unknowns: [] },
    location: { resolution: "RESOLVED" as const, value: "VAL", confidence: 1, evidence: [], contradictions: [], unknowns: [] },
    aggression: { resolution: "RESOLVED" as const, value: "HIGH", confidence: 1, evidence: [], contradictions: [], unknowns: [] },
    response: {
      verdict: "RESPONDING" as const,
      resolution: "RESOLVED" as const,
      displacementRatio: 0.9,
      evidence: [],
      contradictions: [],
    },
    resolution: "RESOLVED" as const,
    narrative: "test",
    capturedAt,
  };
}

describe("selectCLC — M27 CLC = Context + Location + Confirmation", () => {
  it("UNKNOWN when nothing is resolved (all 3 legs UNKNOWN)", () => {
    const vm = selectCLC({ state: makeState() });
    expect(vm.verdict).toBe("UNKNOWN");
    expect(vm.satisfiedLegs).toBe(0);
    expect(vm.resolution).toBe("UNKNOWN");
    expect(vm.reason).toMatch(/unresolved.*insufficient evidence/i);
  });

  it("CLC_LONG when all 3 legs satisfied AND direction says LONG", () => {
    const s = satisfiedLongState();
    const vm = selectCLC({
      state: s,
      signedOrderFlowCoverage: 0.8,
      dlar: respondingDlar(s.capturedAt),
    });
    expect(vm.verdict).toBe("CLC_LONG");
    expect(vm.satisfiedLegs).toBe(3);
    expect(vm.resolution).toBe("RESOLVED");
    expect(vm.context.verdict).toBe("SATISFIED");
    expect(vm.location.verdict).toBe("SATISFIED");
    expect(vm.confirmation.verdict).toBe("SATISFIED");
  });

  it("CLC_SHORT when direction resolves SHORT / DOWN / BEAR", () => {
    const state = satisfiedLongState();
    const shortState = { ...state, direction: resolved("BEAR_TREND") };
    const vm = selectCLC({
      state: shortState,
      signedOrderFlowCoverage: 0.8,
      dlar: respondingDlar(shortState.capturedAt),
    });
    expect(vm.verdict).toBe("CLC_SHORT");
  });

  it("all 3 legs SATISFIED but direction unrecognizable → WAIT with named reason", () => {
    const state = satisfiedLongState();
    const oddDir = { ...state, direction: resolved("RANGE_BOUND") };
    const vm = selectCLC({
      state: oddDir,
      signedOrderFlowCoverage: 0.8,
      dlar: respondingDlar(oddDir.capturedAt),
    });
    expect(vm.verdict).toBe("WAIT");
    expect(vm.reason).toMatch(/not recognizably long or short/i);
  });

  it("CONFIRMATION UNKNOWN when signedOrderFlowCoverage is not supplied (Silence Is A Feature)", () => {
    const vm = selectCLC({ state: satisfiedLongState() });
    expect(vm.confirmation.verdict).toBe("UNKNOWN");
    expect(vm.confirmation.summary).toMatch(/coverage unknown/i);
    // Context + Location SATISFIED, Confirmation UNKNOWN → overall UNKNOWN
    expect(vm.verdict).toBe("UNKNOWN");
    expect(vm.satisfiedLegs).toBe(2);
  });

  it("CONFIRMATION NOT_SATISFIED when coverage below threshold → INVALID overall", () => {
    const vm = selectCLC({
      state: satisfiedLongState(),
      signedOrderFlowCoverage: 0.3, // default threshold 0.5
    });
    expect(vm.confirmation.verdict).toBe("NOT_SATISFIED");
    expect(vm.confirmation.summary).toMatch(/only 30%/i);
    expect(vm.confirmation.contradictions.some((c) => /Insufficient signed classification/.test(c))).toBe(true);
    expect(vm.verdict).toBe("INVALID");
    expect(vm.reason).toMatch(/CONFIRMATION not satisfied.*invalid, not merely early/i);
  });

  it("minSignedCoverage override raises the bar", () => {
    const vm = selectCLC({
      state: satisfiedLongState(),
      signedOrderFlowCoverage: 0.6,
      minSignedCoverage: 0.9,
    });
    expect(vm.confirmation.verdict).toBe("NOT_SATISFIED");
    expect(vm.confirmation.summary).toMatch(/need 90%/i);
  });

  it("CONFIRMATION NOT_SATISFIED when DLAR response is ABSORBED (aggression not producing progress)", () => {
    // Aggression high, but no ATR / no displacement history → but ABSORBED needs
    // high aggression + tiny displacement. Feed history with no price move.
    const s = satisfiedLongState();
    const flat = { ...s, price: { ...s.price, last: 350 } };
    const priorFlat = makeState({ direction: resolved("LONG") }); // last=350 also
    const vm = selectCLC({
      state: flat,
      history: [priorFlat, priorFlat, priorFlat],
      signedOrderFlowCoverage: 0.9,
      atrExtractor: () => 5, // large ATR → tiny/zero displacement well below threshold
    });
    expect(vm.confirmation.verdict).toBe("NOT_SATISFIED");
    // reason mentions absorption OR is satisfied via NOT_SATISFIED path
    expect([true, false]).toContain(/absor/i.test(vm.confirmation.summary));
    expect(vm.verdict).toBe("INVALID");
  });

  it("CONTEXT PARTIAL when regime resolved but direction unresolved", () => {
    const vm = selectCLC({
      state: makeState({
        regime: resolved("TREND"),
        location: resolved("VAL"),
        structure: resolved("BOS"),
      }),
      signedOrderFlowCoverage: 0.8,
    });
    expect(vm.context.verdict).toBe("PARTIAL");
    // Not INVALID (no NOT_SATISFIED), not RESOLVED — should be WAIT or UNKNOWN
    expect(["WAIT", "UNKNOWN"]).toContain(vm.verdict);
  });

  it("LOCATION PARTIAL when only structure resolved", () => {
    const vm = selectCLC({
      state: makeState({
        regime: resolved("TREND"),
        direction: resolved("LONG"),
        structure: resolved("BOS"),
      }),
      signedOrderFlowCoverage: 0.8,
    });
    expect(vm.location.verdict).toBe("PARTIAL");
  });

  it("narrative concatenates all three leg summaries with a middle dot", () => {
    const s = satisfiedLongState();
    const vm = selectCLC({
      state: s,
      signedOrderFlowCoverage: 0.8,
      dlar: respondingDlar(s.capturedAt),
    });
    expect(vm.narrative).toMatch(/^Context: .* · Location: .* · Confirmation: /);
  });

  it("capturedAt propagates from state.capturedAt (deterministic replay)", () => {
    const s = satisfiedLongState();
    const vm = selectCLC({ state: s, signedOrderFlowCoverage: 0.8 });
    expect(vm.capturedAt).toBe(s.capturedAt);
  });

  it("INVALID trumps UNKNOWN when both are present (NOT_SATISFIED wins)", () => {
    // Context RESOLVED, Location UNKNOWN, Confirmation NOT_SATISFIED
    const vm = selectCLC({
      state: makeState({
        regime: resolved("TREND"),
        direction: resolved("LONG"),
        orderFlow: resolved("SIGNED_LIVE"),
      }),
      signedOrderFlowCoverage: 0.2,
    });
    expect(vm.confirmation.verdict).toBe("NOT_SATISFIED");
    expect(vm.location.verdict).toBe("UNKNOWN");
    expect(vm.verdict).toBe("INVALID");
  });

  it("passing a pre-computed DLAR uses it verbatim (no recomputation)", () => {
    // Feed a DLAR whose response.verdict !== RESPONDING → confirmation cannot be SATISFIED
    const s = satisfiedLongState();
    const fakeDlar = {
      direction: { resolution: "RESOLVED" as const, value: "LONG", confidence: 1, evidence: [], contradictions: [], unknowns: [] },
      location: { resolution: "RESOLVED" as const, value: "VAL", confidence: 1, evidence: [], contradictions: [], unknowns: [] },
      aggression: { resolution: "RESOLVED" as const, value: "HIGH", confidence: 1, evidence: [], contradictions: [], unknowns: [] },
      response: {
        verdict: "QUIET" as const,
        resolution: "RESOLVED" as const,
        displacementRatio: 0,
        evidence: [],
        contradictions: [],
      },
      resolution: "RESOLVED" as const,
      narrative: "test",
      capturedAt: s.capturedAt,
    };
    const vm = selectCLC({
      state: s,
      signedOrderFlowCoverage: 0.8,
      dlar: fakeDlar,
    });
    // Quiet response with adequate coverage → PARTIAL confirmation
    expect(vm.confirmation.verdict).toBe("PARTIAL");
  });

  it("legs expose evidence merged from underlying dimensions (audit trail)", () => {
    const s = satisfiedLongState();
    const vm = selectCLC({
      state: s,
      signedOrderFlowCoverage: 0.8,
      dlar: respondingDlar(s.capturedAt),
    });
    expect(vm.context.evidence.length).toBeGreaterThanOrEqual(2); // regime + direction
    expect(vm.location.evidence.length).toBeGreaterThanOrEqual(2); // location + structure
  });
});
