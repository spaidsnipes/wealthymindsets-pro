import { describe, it, expect } from "vitest";
import {
  sealDecision,
  appendManagement,
  attachOutcome,
  attachReview,
  amendDecision,
  DECISION_MEMORY_SCHEMA_VERSION,
  type SealDecisionInput,
  type FrozenState,
  type DecisionPlan,
  type ManagementEvent,
  type Outcome,
  type Review,
} from "./decisionMemory";

const OWNER = "owner-1";

function frozen(): FrozenState {
  return {
    schemaVersion: DECISION_MEMORY_SCHEMA_VERSION,
    capturedAt: 1_000,
    marketStateSummary: {
      regime: "TREND", direction: "LONG", location: "AT_POC", volatility: "NORMAL",
      session: "RTH", structure: null, aggression: null, profile: null,
      unresolvedDimensionCount: 3, canonicalStateId: "cs-1",
    },
    marketProvenance: { providersUsed: [{ provider: "alpaca", coverageScope: "us-equity", freshness: "LIVE" }] },
    traderState: {
      ownerId: OWNER, capturedAt: 1_000, planStatus: "ACTIVE", ruleAdherenceAtDecision: true,
      externalInfluenceFlagged: false, tradeNumberInSession: 1, coachingShown: false,
    },
    playbook: { playbookId: "pb-1", playbookVersion: 1, genomeSnapshot: {} },
  };
}

function plan(): DecisionPlan {
  return {
    action: "ENTER_LONG", thesis: "reclaim", intendedSize: 1, intendedStop: 99, intendedTargets: [105],
    expectedR: 2, availableRAtDecision: 2, invalidationCriteria: "close below 99", expectedBehavior: ["hold to target"],
  };
}

function seal(overrides: Partial<SealDecisionInput> = {}) {
  return sealDecision({
    decisionId: "d-1", ownerId: OWNER, sessionIdentity: "s-1", frozen: frozen(), plan: plan(), ...overrides,
  });
}

const mgmt: ManagementEvent = { id: "m-1", type: "PARTIAL_EXIT", at: 1_500, detail: "trim half" };
const outcome: Outcome = { closedAt: 2_000, realizedR: 1.5, reason: "TARGET" };
const review: Review = {
  reviewedAt: 2_100, marketOpportunityQuality: 4, playbookMatch: 5, riskQuality: 4,
  executionQuality: 3, processAdherence: 5, lessons: ["sized well"],
};

describe("sealDecision — seals immutable pre-outcome truth (canon §11)", () => {
  it("returns a deeply frozen record", () => {
    const r = seal();
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.frozen)).toBe(true);
    expect(Object.isFrozen(r.frozen.marketStateSummary)).toBe(true);
    expect(r.management).toEqual([]);
    expect(r.amendments).toEqual([]);
  });

  it("mutating the sealed record throws (runtime immutability)", () => {
    const r = seal();
    expect(() => { (r as unknown as { decisionId: string }).decisionId = "hacked"; }).toThrow();
    expect(() => { (r.frozen.marketStateSummary as unknown as { regime: string }).regime = "FLIP"; }).toThrow();
  });

  it("throws on schema-version mismatch", () => {
    const bad = frozen();
    expect(() => seal({ frozen: { ...bad, schemaVersion: "wm.decision-memory.v0" as typeof DECISION_MEMORY_SCHEMA_VERSION } })).toThrow(/schema version/i);
  });

  it("throws on ownerId mismatch between input and frozen trader state", () => {
    expect(() => seal({ ownerId: "someone-else" })).toThrow(/ownerId mismatch/i);
  });
});

describe("append/attach — never rewrite, produce new frozen records", () => {
  it("appendManagement returns a NEW record; original is unchanged", () => {
    const r0 = seal();
    const r1 = appendManagement(r0, mgmt);
    expect(r0.management).toEqual([]);       // original untouched
    expect(r1.management).toHaveLength(1);
    expect(r1).not.toBe(r0);
    expect(Object.isFrozen(r1)).toBe(true);
  });

  it("attachOutcome refuses to overwrite an existing outcome (no rewrite)", () => {
    const r = attachOutcome(seal(), outcome);
    expect(r.outcome).toEqual(outcome);
    expect(() => attachOutcome(r, { ...outcome, realizedR: 9 })).toThrow(/already attached/i);
  });

  it("appendManagement after outcome is rejected (sealed post-outcome)", () => {
    const r = attachOutcome(seal(), outcome);
    expect(() => appendManagement(r, { ...mgmt, at: 3_000 })).toThrow(/after outcome/i);
  });

  it("attachReview requires an outcome and refuses a second review", () => {
    expect(() => attachReview(seal(), review)).toThrow(/without outcome/i);
    const withOutcome = attachOutcome(seal(), outcome);
    const reviewed = attachReview(withOutcome, review);
    expect(reviewed.review).toEqual(review);
    expect(() => attachReview(reviewed, { ...review, executionQuality: 1 })).toThrow(/already attached/i);
  });

  it("the FROZEN pre-outcome snapshot is identical before and after outcome/review", () => {
    const r0 = seal();
    const r1 = attachReview(attachOutcome(r0, outcome), review);
    expect(r1.frozen).toEqual(r0.frozen); // sealed truth never rewritten
    expect(r1.plan).toEqual(r0.plan);
  });
});

describe("amendDecision — corrections are APPEND-ONLY (canon §11)", () => {
  const amendment = { id: "a-1", at: 2_500, authorOwnerId: OWNER, reason: "typo in outcome", target: "outcome" as const, note: "R was 1.4 not 1.5" };

  it("appends to the amendments array; original unchanged", () => {
    const r0 = attachOutcome(seal(), outcome);
    const r1 = amendDecision(r0, amendment);
    expect(r0.amendments).toEqual([]);        // original untouched
    expect(r1.amendments).toHaveLength(1);
    expect(r1.amendments[0]).toEqual(amendment);
    expect(r1.outcome).toEqual(outcome);      // the sealed outcome is NOT rewritten
  });

  it("multiple amendments accumulate in order", () => {
    let r = amendDecision(attachOutcome(seal(), outcome), amendment);
    r = amendDecision(r, { ...amendment, id: "a-2", note: "second correction" });
    expect(r.amendments.map((a) => a.id)).toEqual(["a-1", "a-2"]);
  });

  it("only the decision owner may amend", () => {
    expect(() => amendDecision(seal(), { ...amendment, authorOwnerId: "intruder" })).toThrow(/only the decision owner/i);
  });
});
