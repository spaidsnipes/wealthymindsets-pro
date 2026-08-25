/**
 * selectDecisionReceipt tests — the Decision Receipt compiler must project a
 * sealed DecisionMemoryRecord into verbatim commitment + defensible process
 * facts, treat WAIT / NO_TRADE as a COMPLETE disciplined decision, forward the
 * trader's own review split without inventing one, and never fabricate a grade.
 */

import { describe, it, expect } from "vitest";
import {
  selectDecisionReceipt,
  DECISION_RECEIPT_VERSION,
} from "./selectDecisionReceipt";
import {
  DECISION_MEMORY_SCHEMA_VERSION,
  sealDecision,
  appendManagement,
  attachOutcome,
  attachReview,
  amendDecision,
  type FrozenState,
  type DecisionPlan,
} from "../decisionMemory";

const OWNER = "owner-1";

function frozen(over: Partial<FrozenState["traderState"]> = {}, msOver: Partial<FrozenState["marketStateSummary"]> = {}): FrozenState {
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
      ...msOver,
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
      ...over,
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
  expectedBehavior: ["Rejection wick at VAL", "Increasing CVD"],
};

const waitPlan: DecisionPlan = {
  ...longPlan,
  action: "WAIT",
  thesis: "No confirmed CLC — stand aside.",
  intendedTargets: [],
};

function sealLong(fr: FrozenState = frozen(), plan: DecisionPlan = longPlan) {
  return sealDecision({ decisionId: "d-1", ownerId: OWNER, sessionIdentity: "s-1", frozen: fr, plan });
}

describe("selectDecisionReceipt", () => {
  it("exposes a stable version", () => {
    expect(DECISION_RECEIPT_VERSION).toBe("wm.decision-receipt.v1");
  });

  it("is honest when nothing is sealed (null record)", () => {
    const vm = selectDecisionReceipt(null);
    expect(vm.empty).toBe(true);
    expect(vm.decisionId).toBeNull();
    expect(vm.commitment).toHaveLength(0);
    expect(vm.headline).toMatch(/nothing to receipt/i);
  });

  it("compiles the verbatim commitment for a sealed trade", () => {
    const vm = selectDecisionReceipt(sealLong());
    expect(vm.empty).toBe(false);
    expect(vm.stage).toBe("SEALED");
    expect(vm.action).toBe("ENTER_LONG");
    expect(vm.thesis).toBe("CLC Long at VAL reclaim");
    expect(vm.commitment.find((c) => c.label === "Available R")!.value).toBe("2R");
    expect(vm.commitment.find((c) => c.label === "Targets")!.value).toBe("101 · 102");
  });

  it("treats a WAIT as a COMPLETE disciplined decision, not a debt", () => {
    const vm = selectDecisionReceipt(sealLong(frozen(), waitPlan));
    expect(vm.isNonTrade).toBe(true);
    expect(vm.pending).toContain("No position by design — a disciplined non-trade.");
    // A non-trade never demands an outcome.
    expect(vm.pending).not.toContain("Outcome not yet attached.");
    expect(vm.headline).toMatch(/disciplined wait/i);
  });

  it("flags a missing invalidation and a rule breach as process facts", () => {
    const noInval: DecisionPlan = { ...longPlan, invalidationCriteria: "   " };
    const vm = selectDecisionReceipt(
      sealLong(frozen({ ruleAdherenceAtDecision: false, externalInfluenceFlagged: true }), noInval),
    );
    const inval = vm.processFacts.find((f) => f.label === "Invalidation")!;
    expect(inval.value).toBe("None declared");
    expect(inval.tone).toBe("flag");
    const adh = vm.processFacts.find((f) => f.label === "Rule adherence")!;
    expect(adh.value).toBe("Breached");
    const ext = vm.processFacts.find((f) => f.label === "External influence")!;
    expect(ext.value).toBe("Flagged");
    expect(ext.tone).toBe("flag");
  });

  it("affirms a clean process (invalidation declared, in adherence, no influence)", () => {
    const vm = selectDecisionReceipt(sealLong());
    expect(vm.processFacts.find((f) => f.label === "Invalidation")!.tone).toBe("affirm");
    expect(vm.processFacts.find((f) => f.label === "Rule adherence")!.tone).toBe("affirm");
    expect(vm.processFacts.find((f) => f.label === "External influence")!.tone).toBe("affirm");
  });

  it("surfaces unresolved market dimensions as a flagged process fact", () => {
    const vm = selectDecisionReceipt(sealLong(frozen({}, { unresolvedDimensionCount: 3 })));
    const ms = vm.processFacts.find((f) => f.label === "Market state")!;
    expect(ms.value).toBe("3 dimensions UNRESOLVED");
    expect(ms.tone).toBe("flag");
  });

  it("advances stage to MANAGED once a management event is appended", () => {
    const rec = appendManagement(sealLong(), {
      id: "m-1",
      type: "PARTIAL_EXIT",
      at: 1_800_000_100_000,
      detail: "Took 1/3 at first target",
    });
    const vm = selectDecisionReceipt(rec);
    expect(vm.stage).toBe("MANAGED");
    expect(vm.managementTrail).toHaveLength(1);
    expect(vm.managementTrail[0].type).toBe("PARTIAL_EXIT");
  });

  it("classifies a STOP exit as BY_RULE and a MANUAL exit as DISCRETIONARY", () => {
    const stopped = attachOutcome(sealLong(), {
      closedAt: 1_800_000_200_000,
      realizedR: -1,
      reason: "STOP",
    });
    expect(selectDecisionReceipt(stopped).outcome!.exitDiscipline).toBe("BY_RULE");

    const manual = attachOutcome(sealLong(), {
      closedAt: 1_800_000_200_000,
      realizedR: 0.5,
      reason: "MANUAL",
    });
    expect(selectDecisionReceipt(manual).outcome!.exitDiscipline).toBe("DISCRETIONARY");
  });

  it("marks CLOSED and pends a review once outcome is attached", () => {
    const closed = attachOutcome(sealLong(), {
      closedAt: 1_800_000_200_000,
      realizedR: 2,
      reason: "TARGET",
    });
    const vm = selectDecisionReceipt(closed);
    expect(vm.stage).toBe("CLOSED");
    expect(vm.outcome!.realizedR).toBe(2);
    expect(vm.pending).toContain("Review not yet attached.");
  });

  it("forwards the trader's own review split verbatim and never invents one", () => {
    const open = selectDecisionReceipt(sealLong());
    expect(open.qualitySplit).toBeNull(); // no review → no numbers invented

    const closed = attachOutcome(sealLong(), { closedAt: 1_800_000_200_000, realizedR: 2, reason: "TARGET" });
    const reviewed = attachReview(closed, {
      reviewedAt: 1_800_000_300_000,
      marketOpportunityQuality: 5,
      playbookMatch: 4,
      riskQuality: 5,
      executionQuality: 3,
      processAdherence: 5,
      lessons: ["Sized correctly", "Held to target"],
    });
    const vm = selectDecisionReceipt(reviewed);
    expect(vm.stage).toBe("REVIEWED");
    expect(vm.qualitySplit).toEqual({
      marketOpportunityQuality: 5,
      playbookMatch: 4,
      riskQuality: 5,
      executionQuality: 3,
      processAdherence: 5,
    });
    expect(vm.lessons).toEqual(["Sized correctly", "Held to target"]);
    expect(vm.headline).toMatch(/reviewed/i);
  });

  it("never fabricates a composite grade — no total/score/grade field is exposed", () => {
    const closed = attachOutcome(sealLong(), { closedAt: 1_800_000_200_000, realizedR: 2, reason: "TARGET" });
    const reviewed = attachReview(closed, {
      reviewedAt: 1_800_000_300_000,
      marketOpportunityQuality: 5,
      playbookMatch: 5,
      riskQuality: 5,
      executionQuality: 5,
      processAdherence: 5,
      lessons: [],
    });
    const vm = selectDecisionReceipt(reviewed) as unknown as Record<string, unknown>;
    expect("grade" in vm).toBe(false);
    expect("score" in vm).toBe(false);
    expect("total" in vm).toBe(false);
    expect("compositeQuality" in vm).toBe(false);
  });

  it("counts amendments without rewriting history", () => {
    const closed = attachOutcome(sealLong(), { closedAt: 1_800_000_200_000, realizedR: 2, reason: "TARGET" });
    const amended = amendDecision(closed, {
      id: "a-1",
      at: 1_800_000_400_000,
      authorOwnerId: OWNER,
      reason: "Corrected realized R after fill reconciliation",
      target: "outcome",
      note: "realizedR 2 → 1.8",
    });
    expect(selectDecisionReceipt(amended).amendmentCount).toBe(1);
  });
});
