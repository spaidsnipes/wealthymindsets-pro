/**
 * Focused tests for Decision Memory immutability + attach-once invariants.
 *
 * These enforce the Founder's Decision Memory doctrine at the type level:
 *  - seal → frozen at decision time, never rewritten
 *  - append-only management events
 *  - attach-once outcome
 *  - attach-once review
 *  - amendments preserve history via a separate list
 *  - owner scoping never crosses users
 *
 * Cannot execute here (disk below 2 GiB start floor). Runnable moment
 * disk clears.
 */
import { describe, it, expect } from "vitest";
import {
  DECISION_MEMORY_SCHEMA_VERSION,
  sealDecision,
  appendManagement,
  attachOutcome,
  attachReview,
  amendDecision,
  scopeToOwner,
  toDecisionSnapshot,
  type FrozenState,
  type DecisionPlan,
  type Outcome,
  type Review,
  type ManagementEvent,
} from "../decisionMemory";

const OWNER = "owner-1";
const OTHER_OWNER = "owner-2";

const frozen: FrozenState = {
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
  playbook: {
    playbookId: "clc-long-v1",
    playbookVersion: 1,
    genomeSnapshot: {},
  },
};

const plan: DecisionPlan = {
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

const seal = () =>
  sealDecision({
    decisionId: "d-1",
    ownerId: OWNER,
    sessionIdentity: "session-1",
    frozen,
    plan,
  });

describe("sealDecision", () => {
  it("returns a deeply frozen record", () => {
    const r = seal();
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.frozen)).toBe(true);
    expect(Object.isFrozen(r.frozen.marketStateSummary)).toBe(true);
    expect(Object.isFrozen(r.plan)).toBe(true);
    expect(Object.isFrozen(r.management)).toBe(true);
  });

  it("rejects schema-version mismatch", () => {
    expect(() =>
      sealDecision({
        decisionId: "d-1",
        ownerId: OWNER,
        sessionIdentity: "session-1",
        frozen: { ...frozen, schemaVersion: "wm.decision-memory.v0" as any },
        plan,
      }),
    ).toThrow(/schema version mismatch/);
  });

  it("rejects owner mismatch between input and frozen.traderState", () => {
    expect(() =>
      sealDecision({
        decisionId: "d-1",
        ownerId: OTHER_OWNER,
        sessionIdentity: "session-1",
        frozen,
        plan,
      }),
    ).toThrow(/ownerId mismatch/);
  });
});

describe("appendManagement", () => {
  const event: ManagementEvent = {
    id: "m-1",
    type: "PARTIAL_EXIT",
    at: 1_800_000_060_000,
    detail: "Took half at first target",
    numeric: { exitSize: 50, exitPrice: 101 },
  };

  it("returns a new record with the event appended", () => {
    const r0 = seal();
    const r1 = appendManagement(r0, event);
    expect(r1.management).toHaveLength(1);
    expect(r0.management).toHaveLength(0); // r0 unchanged
    expect(r1.management[0]).toEqual(event);
  });

  it("rejects appending management AFTER outcome close time", () => {
    const r0 = seal();
    const outcome: Outcome = {
      closedAt: 1_800_000_120_000,
      realizedR: 1.5,
      reason: "TARGET",
    };
    const r1 = attachOutcome(r0, outcome);
    expect(() =>
      appendManagement(r1, { ...event, at: 1_800_000_180_000 }),
    ).toThrow(/cannot append management event after outcome/);
  });
});

describe("attachOutcome", () => {
  const outcome: Outcome = {
    closedAt: 1_800_000_120_000,
    realizedR: 1.5,
    reason: "TARGET",
  };

  it("attaches outcome and returns frozen record", () => {
    const r1 = attachOutcome(seal(), outcome);
    expect(r1.outcome).toEqual(outcome);
    expect(Object.isFrozen(r1.outcome!)).toBe(true);
  });

  it("throws when outcome already attached", () => {
    const r1 = attachOutcome(seal(), outcome);
    expect(() => attachOutcome(r1, outcome)).toThrow(/already attached/);
  });
});

describe("attachReview", () => {
  const outcome: Outcome = { closedAt: 1_800_000_120_000, realizedR: 1.5, reason: "TARGET" };
  const review: Review = {
    reviewedAt: 1_800_000_600_000,
    marketOpportunityQuality: 4,
    playbookMatch: 5,
    riskQuality: 5,
    executionQuality: 4,
    processAdherence: 5,
    lessons: ["Held target patiently"],
  };

  it("requires outcome before review", () => {
    expect(() => attachReview(seal(), review)).toThrow(/cannot review a decision without outcome/);
  });

  it("attaches review after outcome", () => {
    const r1 = attachOutcome(seal(), outcome);
    const r2 = attachReview(r1, review);
    expect(r2.review).toEqual(review);
  });

  it("throws on second attach — enforces attach-once", () => {
    const r1 = attachOutcome(seal(), outcome);
    const r2 = attachReview(r1, review);
    expect(() => attachReview(r2, review)).toThrow(/already attached/);
  });

  it("does NOT enforce arbitrary time lock (per Founder 2026-08-13 directive)", () => {
    const r1 = attachOutcome(seal(), outcome);
    // Even reviewing after a year should succeed — no 7-day arbitrary lock
    const veryLateReview: Review = { ...review, reviewedAt: 1_800_000_120_000 + 366 * 86_400_000 };
    const r2 = attachReview(r1, veryLateReview);
    expect(r2.review!.reviewedAt).toBe(veryLateReview.reviewedAt);
  });
});

describe("amendDecision", () => {
  it("only the owner may amend", () => {
    const r1 = seal();
    expect(() =>
      amendDecision(r1, {
        id: "a-1",
        at: Date.now(),
        authorOwnerId: OTHER_OWNER,
        reason: "test",
        target: "outcome",
        note: "attempted cross-owner amendment",
      }),
    ).toThrow(/only the decision owner may amend/);
  });

  it("appends amendment without rewriting the target", () => {
    const outcome: Outcome = { closedAt: 1_800_000_120_000, realizedR: 1.5, reason: "TARGET" };
    const r1 = attachOutcome(seal(), outcome);
    const r2 = amendDecision(r1, {
      id: "a-1",
      at: Date.now(),
      authorOwnerId: OWNER,
      reason: "typo in reason",
      target: "outcome",
      note: "reason was actually TIME not TARGET",
    });
    expect(r2.amendments).toHaveLength(1);
    // Original outcome preserved verbatim
    expect(r2.outcome).toEqual(outcome);
  });
});

describe("scopeToOwner", () => {
  it("never crosses owners", () => {
    const r1 = seal();
    const rOther = sealDecision({
      decisionId: "d-2",
      ownerId: OTHER_OWNER,
      sessionIdentity: "session-2",
      frozen: {
        ...frozen,
        traderState: { ...frozen.traderState, ownerId: OTHER_OWNER },
      },
      plan,
    });
    const scoped = scopeToOwner([r1, rOther], OWNER);
    expect(scoped).toHaveLength(1);
    expect(scoped[0].ownerId).toBe(OWNER);
  });
});

describe("toDecisionSnapshot", () => {
  it("produces the compact projection selectProcessLandscape expects", () => {
    const outcome: Outcome = { closedAt: 1_800_000_120_000, realizedR: 1.5, reason: "TARGET" };
    const r1 = attachOutcome(seal(), outcome);
    const snap = toDecisionSnapshot(r1);
    expect(snap.decisionId).toBe("d-1");
    expect(snap.ownerId).toBe(OWNER);
    expect(snap.marketStateSummary.regime).toBe("TREND");
    expect(snap.playbookId).toBe("clc-long-v1");
    expect(snap.plan.action).toBe("ENTER_LONG");
    expect(snap.outcome?.realizedR).toBe(1.5);
    expect(snap.review).toBeUndefined();
  });
});
