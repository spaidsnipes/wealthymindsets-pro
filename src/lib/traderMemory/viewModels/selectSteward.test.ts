/**
 * selectSteward — M30 truth-lock.
 *
 * Locks the "AM I OPERATING INSIDE MY PLAN?" diagnostic per Founder canon:
 *   - Steward is diagnostic, NEVER a permission gate.
 *   - Trade-count / daily-R / playbook-whitelist / preparation / rushing
 *     rules each emit IN_PLAN / DRIFT / BREACHED / UNKNOWN with evidence.
 *   - Aggregate priority: BREACHED > DRIFT > IN_PLAN, with UNKNOWN only
 *     when nothing evaluable OR every rule is UNKNOWN.
 *   - Human sovereignty: `advisory` on OUT_OF_PLAN must be advisory only.
 */

import { describe, it, expect } from "vitest";
import { selectSteward, type TraderDailyPlan } from "./selectSteward";
import {
  DECISION_MEMORY_SCHEMA_VERSION,
  sealDecision,
  attachOutcome,
  type FrozenState,
  type DecisionPlan,
  type DecisionMemoryRecord,
} from "../decisionMemory";

const OWNER = "owner-1";
const SESSION = "s-1";

function frozen(playbookId = "clc-long-v1"): FrozenState {
  return {
    schemaVersion: DECISION_MEMORY_SCHEMA_VERSION,
    capturedAt: 1_800_000_000_000,
    marketStateSummary: {
      regime: "TREND", direction: "LONG", location: "VAL",
      volatility: "NORMAL", session: "REGULAR", structure: "BOS",
      aggression: "HIGH", profile: "BALANCED",
      unresolvedDimensionCount: 0, canonicalStateId: "cms-1",
    },
    marketProvenance: {
      providersUsed: [{ provider: "alpaca", coverageScope: "IEX", freshness: "LIVE" }],
    },
    traderState: {
      ownerId: OWNER, capturedAt: 1_800_000_000_000,
      planStatus: "ACTIVE", ruleAdherenceAtDecision: true,
      externalInfluenceFlagged: false, tradeNumberInSession: 1,
      coachingShown: false,
    },
    playbook: { playbookId, playbookVersion: 1, genomeSnapshot: {} },
  };
}

const basePlan: DecisionPlan = {
  action: "ENTER_LONG",
  thesis: "t", intendedSize: 1, intendedStop: 99.5, intendedTargets: [101],
  expectedR: 1, availableRAtDecision: 1,
  invalidationCriteria: "x", expectedBehavior: [],
};

let idCounter = 0;
function seal(playbookId = "clc-long-v1"): DecisionMemoryRecord {
  idCounter += 1;
  return sealDecision({
    decisionId: `d-${idCounter}`,
    ownerId: OWNER, sessionIdentity: SESSION,
    frozen: frozen(playbookId), plan: basePlan,
  });
}

function sealWithR(realizedR: number, playbookId = "clc-long-v1"): DecisionMemoryRecord {
  return attachOutcome(seal(playbookId), {
    closedAt: 1_800_000_000_500, realizedR, reason: realizedR >= 0 ? "TARGET" : "STOP",
  });
}

function plan(over: Partial<TraderDailyPlan> = {}): TraderDailyPlan {
  return {
    ownerId: OWNER, sessionIdentity: SESSION, capturedAt: 1_800_000_000_000,
    maxTradesToday: null, maxOpenR: null, maxDailyR: null,
    approvedPlaybooks: [], requiredPreparation: [], completedPreparation: [],
    rushingFlagged: false,
    ...over,
  };
}

describe("selectSteward — M30 diagnostic (never a gate)", () => {
  it("UNKNOWN when the plan configures no constraints", () => {
    const vm = selectSteward({ plan: plan(), decisionsToday: [], openDecisions: [], nowMs: 1_800_000_001_000 });
    expect(vm.verdict).toBe("UNKNOWN");
    expect(vm.reason).toMatch(/No plan constraints/i);
    expect(vm.advisory).toBeUndefined();
    expect(vm.evaluatedAt).toBe(1_800_000_001_000);
  });

  it("trade-count IN_PLAN under limit", () => {
    const vm = selectSteward({
      plan: plan({ maxTradesToday: 3 }),
      decisionsToday: [seal(), seal()],
      openDecisions: [],
    });
    expect(vm.verdict).toBe("IN_PLAN");
    const r = vm.rules.find((x) => x.id === "trade-count-budget")!;
    expect(r.verdict).toBe("IN_PLAN");
    expect(r.evidence.join(" ")).toMatch(/2\/3/);
  });

  it("trade-count DRIFT at limit (one more breaches)", () => {
    const vm = selectSteward({
      plan: plan({ maxTradesToday: 2 }),
      decisionsToday: [seal(), seal()],
      openDecisions: [],
    });
    expect(vm.verdict).toBe("MINOR_DRIFT");
    expect(vm.rules[0].verdict).toBe("DRIFT");
    expect(vm.rules[0].reason).toMatch(/At trade-count limit/i);
    expect(vm.advisory).toMatch(/check-in/i);
  });

  it("trade-count BREACHED over limit → OUT_OF_PLAN", () => {
    const vm = selectSteward({
      plan: plan({ maxTradesToday: 1 }),
      decisionsToday: [seal(), seal(), seal()],
      openDecisions: [],
    });
    expect(vm.verdict).toBe("OUT_OF_PLAN");
    expect(vm.rules[0].verdict).toBe("BREACHED");
    expect(vm.rules[0].reason).toMatch(/Over by 2/);
    // Sovereignty advisory: never phrases as prohibition.
    expect(vm.advisory).toMatch(/sovereign to decide/i);
  });

  it("daily-R IN_PLAN when losses well under budget", () => {
    const vm = selectSteward({
      plan: plan({ maxTradesToday: 10, maxDailyR: 2 }),
      decisionsToday: [sealWithR(-0.3), sealWithR(0.5)],
      openDecisions: [],
    });
    expect(vm.verdict).toBe("IN_PLAN");
    expect(vm.rules.find((r) => r.id === "daily-r-budget")?.verdict).toBe("IN_PLAN");
  });

  it("daily-R DRIFT above 75% of budget", () => {
    // Budget 2R, losses = -1.6R, spentAbs=1.6, 1.6 > 0.75*2 (1.5) but not > 2
    const vm = selectSteward({
      plan: plan({ maxTradesToday: 10, maxDailyR: 2 }),
      decisionsToday: [sealWithR(-1.6)],
      openDecisions: [],
    });
    expect(vm.verdict).toBe("MINOR_DRIFT");
    const r = vm.rules.find((x) => x.id === "daily-r-budget")!;
    expect(r.verdict).toBe("DRIFT");
    expect(r.reason).toMatch(/Above 75%/i);
  });

  it("daily-R BREACHED when losses exceed budget", () => {
    const vm = selectSteward({
      plan: plan({ maxTradesToday: 10, maxDailyR: 1 }),
      decisionsToday: [sealWithR(-2.3)],
      openDecisions: [],
    });
    expect(vm.verdict).toBe("OUT_OF_PLAN");
    const r = vm.rules.find((x) => x.id === "daily-r-budget")!;
    expect(r.verdict).toBe("BREACHED");
    expect(r.reason).toMatch(/breached by 1\.30R/);
  });

  it("daily-R budget: WINS do not count against loss budget (only losses)", () => {
    const vm = selectSteward({
      plan: plan({ maxTradesToday: 10, maxDailyR: 1 }),
      decisionsToday: [sealWithR(5), sealWithR(3)], // net +8, no losses
      openDecisions: [],
    });
    expect(vm.rules.find((r) => r.id === "daily-r-budget")?.verdict).toBe("IN_PLAN");
  });

  it("playbook-whitelist IN_PLAN when all decisions use approved playbooks", () => {
    const vm = selectSteward({
      plan: plan({ maxTradesToday: 10, approvedPlaybooks: ["clc-long-v1", "bounce-v2"] }),
      decisionsToday: [seal("clc-long-v1"), seal("bounce-v2")],
      openDecisions: [],
    });
    expect(vm.verdict).toBe("IN_PLAN");
    expect(vm.rules.find((r) => r.id === "playbook-whitelist")?.verdict).toBe("IN_PLAN");
  });

  it("playbook-whitelist BREACHED when any off-list playbook used", () => {
    const vm = selectSteward({
      plan: plan({ maxTradesToday: 10, approvedPlaybooks: ["clc-long-v1"] }),
      decisionsToday: [seal("clc-long-v1"), seal("wildcard-v0")],
      openDecisions: [],
    });
    expect(vm.verdict).toBe("OUT_OF_PLAN");
    const r = vm.rules.find((x) => x.id === "playbook-whitelist")!;
    expect(r.verdict).toBe("BREACHED");
    expect(r.evidence.join(" ")).toMatch(/wildcard-v0/);
  });

  it("preparation DRIFT when incomplete + zero decisions taken", () => {
    const vm = selectSteward({
      plan: plan({
        requiredPreparation: ["news", "levels", "risk"],
        completedPreparation: ["news"],
      }),
      decisionsToday: [],
      openDecisions: [],
    });
    expect(vm.verdict).toBe("MINOR_DRIFT");
    const prep = vm.rules.find((r) => r.id === "preparation-checklist")!;
    expect(prep.verdict).toBe("DRIFT");
    expect(prep.evidence.join(" ")).toMatch(/levels.*risk/);
  });

  it("preparation BREACHED when incomplete AND trader already entered", () => {
    const vm = selectSteward({
      plan: plan({
        requiredPreparation: ["news", "levels"],
        completedPreparation: [],
      }),
      decisionsToday: [seal()],
      openDecisions: [],
    });
    expect(vm.verdict).toBe("OUT_OF_PLAN");
    const prep = vm.rules.find((r) => r.id === "preparation-checklist")!;
    expect(prep.verdict).toBe("BREACHED");
    expect(prep.reason).toMatch(/incomplete preparation/i);
  });

  it("preparation IN_PLAN when all required items completed", () => {
    const vm = selectSteward({
      plan: plan({
        requiredPreparation: ["news"],
        completedPreparation: ["news"],
      }),
      decisionsToday: [],
      openDecisions: [],
    });
    expect(vm.rules.find((r) => r.id === "preparation-checklist")?.verdict).toBe("IN_PLAN");
  });

  it("rushingFlagged emits DRIFT rule that promotes overall to MINOR_DRIFT", () => {
    const vm = selectSteward({
      plan: plan({ maxTradesToday: 10, rushingFlagged: true }),
      decisionsToday: [seal()],
      openDecisions: [],
    });
    expect(vm.verdict).toBe("MINOR_DRIFT");
    const r = vm.rules.find((x) => x.id === "behavioral-rushing")!;
    expect(r.verdict).toBe("DRIFT");
    expect(r.reason).toMatch(/slow down/i);
  });

  it("open-R rule stays UNKNOWN with open decisions (per selector NOTE — real computation not yet supplied)", () => {
    const vm = selectSteward({
      plan: plan({ maxOpenR: 2 }),
      decisionsToday: [],
      openDecisions: [seal()],
    });
    const r = vm.rules.find((x) => x.id === "open-r-exposure")!;
    expect(r.verdict).toBe("UNKNOWN");
    expect(r.reason).toMatch(/not yet supplied/i);
  });

  it("open-R rule IN_PLAN when no open decisions", () => {
    const vm = selectSteward({
      plan: plan({ maxOpenR: 2 }),
      decisionsToday: [],
      openDecisions: [],
    });
    expect(vm.rules.find((x) => x.id === "open-r-exposure")?.verdict).toBe("IN_PLAN");
  });

  it("BREACHED beats DRIFT beats IN_PLAN in aggregation", () => {
    // BREACHED trade-count + DRIFT rushing + IN_PLAN daily-R → OUT_OF_PLAN
    const vm = selectSteward({
      plan: plan({ maxTradesToday: 0, maxDailyR: 5, rushingFlagged: true }),
      decisionsToday: [seal(), seal()],
      openDecisions: [],
    });
    expect(vm.verdict).toBe("OUT_OF_PLAN");
    expect(vm.rules.some((r) => r.verdict === "BREACHED")).toBe(true);
    expect(vm.rules.some((r) => r.verdict === "DRIFT")).toBe(true);
  });

  it("evaluatedAt is the caller-supplied nowMs (deterministic — never Date.now())", () => {
    const vm = selectSteward({
      plan: plan({ maxTradesToday: 3 }),
      decisionsToday: [],
      openDecisions: [],
      nowMs: 42_424_242,
    });
    expect(vm.evaluatedAt).toBe(42_424_242);
  });

  it("advisory language never says 'not allowed' / 'blocked' / 'denied' (sovereignty)", () => {
    const vm = selectSteward({
      plan: plan({ maxTradesToday: 0 }),
      decisionsToday: [seal()],
      openDecisions: [],
    });
    const advisory = vm.advisory ?? "";
    expect(advisory).not.toMatch(/not allowed|blocked|denied|forbidden|prohibited/i);
  });
});
