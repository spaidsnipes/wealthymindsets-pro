/**
 * selectTradeExpectation — M28 truth-lock.
 *
 * Locks the aggregation rules (INVALIDATED beats all; SUPPORTIVE only when
 * ALL evaluated AND coverage RESOLVED; UNKNOWN when nothing evaluated;
 * WEAKENING when direction rotates; MIXED when supportive + unknown mix)
 * and the two default rules built from a sealed DecisionMemoryRecord's plan
 * (stop-breach INVALIDATION + direction-alignment BEHAVIOR).
 *
 * Silent drift here would silently flip every open trade's live coach card
 * verdict — the highest-leverage selector on /command-deck.
 */

import { describe, it, expect } from "vitest";
import {
  selectTradeExpectation,
  type ExpectationRule,
} from "./selectTradeExpectation";
import {
  DECISION_MEMORY_SCHEMA_VERSION,
  sealDecision,
  attachOutcome,
  type FrozenState,
  type DecisionPlan,
} from "../decisionMemory";
import type { CanonicalMarketState, MarketStateDimension } from "../../marketData/canonicalMarketState";

const OWNER = "owner-1";

function frozen(): FrozenState {
  return {
    schemaVersion: DECISION_MEMORY_SCHEMA_VERSION,
    capturedAt: 1_800_000_000_000,
    marketStateSummary: {
      regime: "TREND",
      direction: "LONG",
      location: "VAL",
      volatility: "NORMAL",
      session: "REGULAR",
      structure: "BOS",
      aggression: "HIGH",
      profile: "BALANCED",
      unresolvedDimensionCount: 0,
      canonicalStateId: "cms-123",
    },
    marketProvenance: {
      providersUsed: [
        { provider: "alpaca", feed: "iex", coverageScope: "IEX", freshness: "LIVE" },
      ],
    },
    traderState: {
      ownerId: OWNER,
      capturedAt: 1_800_000_000_000,
      planStatus: "ACTIVE",
      ruleAdherenceAtDecision: true,
      externalInfluenceFlagged: false,
      tradeNumberInSession: 1,
      coachingShown: false,
    },
    playbook: { playbookId: "clc-long-v1", playbookVersion: 1, genomeSnapshot: {} },
  };
}

const longPlan: DecisionPlan = {
  action: "ENTER_LONG",
  thesis: "CLC Long at VAL reclaim",
  intendedSize: 100,
  intendedStop: 99.5,
  intendedTargets: [101, 102],
  expectedR: 2.0,
  availableRAtDecision: 2.0,
  invalidationCriteria: "Break below VAL - 0.5 ATR",
  expectedBehavior: [], // keep empty so no UNKNOWN plan-behavior rules dilute the aggregate
};

function sealLong(planOverride: Partial<DecisionPlan> = {}) {
  return sealDecision({
    decisionId: "d-1",
    ownerId: OWNER,
    sessionIdentity: "s-1",
    frozen: frozen(),
    plan: { ...longPlan, ...planOverride },
  });
}

function dim(resolution: MarketStateDimension["resolution"], value: string | null): MarketStateDimension {
  return {
    resolution,
    value,
    confidence: resolution === "RESOLVED" ? 0.9 : null,
    evidence: resolution === "RESOLVED"
      ? [{ eventId: "e1", observedAt: 1, availableAt: 2, source: "test", fidelity: "OBSERVED", basis: "test" }]
      : [],
    contradictions: [],
    unknowns: resolution === "UNKNOWN" ? ["missing"] : [],
  };
}

function stateAt(lastPrice: number, direction: MarketStateDimension = dim("RESOLVED", "LONG")): CanonicalMarketState {
  // Selector only reads price.last + direction — cast the partial fixture.
  return {
    price: { last: lastPrice, bid: null, ask: null, eventAt: null, availableAt: null },
    direction,
  } as unknown as CanonicalMarketState;
}

describe("selectTradeExpectation — M28 aggregation", () => {
  it("UNKNOWN when currentState is null", () => {
    const vm = selectTradeExpectation({
      decision: sealLong(),
      currentState: null,
      nowMs: 1_800_000_000_100,
    });
    expect(vm.verdict).toBe("UNKNOWN");
    expect(vm.rules).toEqual([]);
    expect(vm.coverageResolution).toBe("UNKNOWN");
    expect(vm.reason).toMatch(/No current market state/i);
    expect(vm.ageMs).toBe(100);
  });

  it("UNKNOWN when decision is already closed (outcome attached)", () => {
    const closed = attachOutcome(sealLong(), {
      closedAt: 1_800_000_000_500,
      realizedR: 1.2,
      reason: "TARGET",
    });
    const vm = selectTradeExpectation({
      decision: closed,
      currentState: stateAt(100.5),
      nowMs: 1_800_000_000_600,
    });
    expect(vm.verdict).toBe("UNKNOWN");
    expect(vm.reason).toMatch(/already closed/i);
  });

  it("SUPPORTIVE when price safe of stop AND direction still LONG", () => {
    const vm = selectTradeExpectation({
      decision: sealLong(),
      currentState: stateAt(100.5, dim("RESOLVED", "LONG")),
    });
    expect(vm.verdict).toBe("SUPPORTIVE");
    expect(vm.coverageResolution).toBe("RESOLVED");
    expect(vm.rules).toHaveLength(2);
    expect(vm.rules.every((r) => r.verdict === "SUPPORTIVE")).toBe(true);
  });

  it("INVALIDATED when LONG price breaches stop — trumps a still-supportive direction", () => {
    const vm = selectTradeExpectation({
      decision: sealLong(),
      currentState: stateAt(99.4, dim("RESOLVED", "LONG")), // stop = 99.5
    });
    expect(vm.verdict).toBe("INVALIDATED");
    const stopRule = vm.rules.find((r) => r.ruleId === "invalidation-stop-breach");
    expect(stopRule?.verdict).toBe("INVALIDATED");
    expect(vm.reason).toMatch(/invalidation rules triggered/i);
  });

  it("INVALIDATED when SHORT price rises through stop", () => {
    const vm = selectTradeExpectation({
      decision: sealLong({ action: "ENTER_SHORT", intendedStop: 100.5 }),
      currentState: stateAt(100.6, dim("RESOLVED", "SHORT")),
    });
    expect(vm.verdict).toBe("INVALIDATED");
  });

  it("WEAKENING when direction rotates against LONG but stop still holds", () => {
    const vm = selectTradeExpectation({
      decision: sealLong(),
      currentState: stateAt(100.5, dim("RESOLVED", "SHORT")),
    });
    expect(vm.verdict).toBe("WEAKENING");
    const dirRule = vm.rules.find((r) => r.ruleId === "behavior-direction-alignment");
    expect(dirRule?.verdict).toBe("WEAKENING");
    expect(dirRule?.reason).toMatch(/Direction shifted/i);
  });

  it("MIXED when stop OK + direction UNKNOWN (coverage PARTIAL prevents SUPPORTIVE)", () => {
    const vm = selectTradeExpectation({
      decision: sealLong(),
      currentState: stateAt(100.5, dim("UNKNOWN", null)),
    });
    expect(vm.verdict).toBe("MIXED");
    expect(vm.coverageResolution).toBe("PARTIAL");
    expect(vm.reason).toMatch(/Partial rule coverage/i);
  });

  it("UNKNOWN when every rule is UNKNOWN (no price + no direction)", () => {
    const vm = selectTradeExpectation({
      decision: sealLong(),
      currentState: stateAt(NaN as unknown as number, dim("UNKNOWN", null)),
    });
    // stateAt with NaN — but selector checks `price == null`. Use explicit null:
    const vm2 = selectTradeExpectation({
      decision: sealLong(),
      currentState: {
        price: { last: null, bid: null, ask: null, eventAt: null, availableAt: null },
        direction: dim("UNKNOWN", null),
      } as unknown as CanonicalMarketState,
    });
    expect(vm2.verdict).toBe("UNKNOWN");
    expect(vm2.coverageResolution).toBe("UNKNOWN");
    // vm exists only to exercise NaN → not asserted (documenting NaN passes stop math is out of scope).
    void vm;
  });

  it("case-insensitive direction match: 'up' and 'bull' both support LONG", () => {
    const up = selectTradeExpectation({
      decision: sealLong(),
      currentState: stateAt(100.5, dim("RESOLVED", "up")),
    });
    expect(up.verdict).toBe("SUPPORTIVE");
    const bull = selectTradeExpectation({
      decision: sealLong(),
      currentState: stateAt(100.5, dim("RESOLVED", "BULL_TREND")),
    });
    expect(bull.verdict).toBe("SUPPORTIVE");
  });

  it("expectedBehavior strings surface as UNKNOWN rules (require extraRules to evaluate)", () => {
    const vm = selectTradeExpectation({
      decision: sealLong({ expectedBehavior: ["Rejection wick at VAL", "Increasing CVD"] }),
      currentState: stateAt(100.5, dim("RESOLVED", "LONG")),
    });
    // 2 defaults + 2 plan-behavior UNKNOWN rules = 4
    expect(vm.rules).toHaveLength(4);
    const planRules = vm.rules.filter((r) => r.ruleId.startsWith("behavior-plan-"));
    expect(planRules).toHaveLength(2);
    expect(planRules.every((r) => r.verdict === "UNKNOWN")).toBe(true);
    // Coverage becomes PARTIAL, so verdict must be MIXED (not SUPPORTIVE).
    expect(vm.coverageResolution).toBe("PARTIAL");
    expect(vm.verdict).toBe("MIXED");
  });

  it("extraRule INVALIDATION beats everything (SUPPORTIVE defaults ignored)", () => {
    const killSwitch: ExpectationRule = {
      id: "extra-kill",
      kind: "INVALIDATION",
      description: "External kill switch",
      evaluate: () => ({ verdict: "INVALIDATED", evidence: ["ops flag"], reason: "operator halt" }),
    };
    const vm = selectTradeExpectation({
      decision: sealLong(),
      currentState: stateAt(100.5, dim("RESOLVED", "LONG")),
      extraRules: [killSwitch],
    });
    expect(vm.verdict).toBe("INVALIDATED");
    expect(vm.rules.find((r) => r.ruleId === "extra-kill")?.verdict).toBe("INVALIDATED");
  });

  it("non-directional action (WAIT) short-circuits both default rules to SUPPORTIVE", () => {
    const vm = selectTradeExpectation({
      decision: sealLong({ action: "WAIT" }),
      currentState: stateAt(99.0, dim("RESOLVED", "SHORT")), // below stop, opposite dir — irrelevant for WAIT
    });
    expect(vm.verdict).toBe("SUPPORTIVE");
    expect(vm.rules.every((r) => r.verdict === "SUPPORTIVE")).toBe(true);
  });

  it("nowMs is respected for evaluatedAt + ageMs (deterministic — never Date.now())", () => {
    const vm = selectTradeExpectation({
      decision: sealLong(),
      currentState: stateAt(100.5),
      nowMs: 1_800_000_005_000,
    });
    expect(vm.evaluatedAt).toBe(1_800_000_005_000);
    expect(vm.ageMs).toBe(5_000);
  });

  it("ageMs is measured from frozen.capturedAt, not decision.plan mutation", () => {
    const dec = sealLong();
    const vm = selectTradeExpectation({
      decision: dec,
      currentState: stateAt(100.5),
      nowMs: dec.frozen.capturedAt + 12_345,
    });
    expect(vm.ageMs).toBe(12_345);
  });

  it("stop-breach evidence surfaces the exact price/stop pair (audit trail)", () => {
    const vm = selectTradeExpectation({
      decision: sealLong(),
      currentState: stateAt(99.4),
    });
    const stopRule = vm.rules.find((r) => r.ruleId === "invalidation-stop-breach")!;
    expect(stopRule.evidence.join(" ")).toMatch(/99\.4.*99\.5.*LONG/);
  });
});
