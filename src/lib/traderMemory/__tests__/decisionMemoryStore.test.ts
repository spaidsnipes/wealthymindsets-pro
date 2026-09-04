import { describe, it, expect, beforeEach } from "vitest";
import { DecisionMemoryStore } from "../decisionMemoryStore";
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

const frozen = (owner: string): FrozenState => ({
  schemaVersion: DECISION_MEMORY_SCHEMA_VERSION,
  capturedAt: 1_800_000_000_000,
  marketStateSummary: {
    regime: "TREND", direction: "LONG", location: "VAL", volatility: "NORMAL",
    session: "REGULAR", structure: "BOS", aggression: "HIGH", profile: "BALANCED",
    unresolvedDimensionCount: 0, canonicalStateId: "cms-123",
  },
  marketProvenance: {
    providersUsed: [{ provider: "alpaca", feed: "iex", coverageScope: "IEX", freshness: "LIVE" }],
  },
  traderState: {
    ownerId: owner, capturedAt: 1_800_000_000_000,
    planStatus: "ACTIVE", ruleAdherenceAtDecision: true, externalInfluenceFlagged: false,
    tradeNumberInSession: 1, coachingShown: false,
  },
  playbook: { playbookId: "clc-long-v1", playbookVersion: 1, genomeSnapshot: {} },
});

const plan: DecisionPlan = {
  action: "ENTER_LONG", thesis: "test", intendedSize: 100, intendedStop: 99, intendedTargets: [101],
  expectedR: 2, availableRAtDecision: 2, invalidationCriteria: "test", expectedBehavior: [],
};

describe("DecisionMemoryStore", () => {
  let store: DecisionMemoryStore;
  beforeEach(() => { store = new DecisionMemoryStore(); });

  it("put + get roundtrip", () => {
    const rec = sealDecision({ decisionId: "d1", ownerId: "o1", sessionIdentity: "s1", frozen: frozen("o1"), plan });
    store.put(rec);
    expect(store.get("o1", "d1")).toBe(rec);
  });

  it("get returns null for missing", () => {
    expect(store.get("o1", "missing")).toBeNull();
  });

  it("rejects replay that would erase an observed outcome", () => {
    const original = sealDecision({decisionId:"d1", ownerId:"o1", sessionIdentity:"s1", frozen:frozen("o1"), plan});
    const closed = attachOutcome(original, {closedAt:1_800_000_000_100, realizedR:1, reason:"MANUAL"});
    store.put(closed);
    expect(() => store.put(original)).toThrow(/outcome/);
    expect(store.get("o1", "d1")).toBe(closed);
  });

  it("rejects a same-ID plan rewrite without notifying or invalidating snapshots", () => {
    const original = sealDecision({decisionId:"d1", ownerId:"o1", sessionIdentity:"s1", frozen:frozen("o1"), plan});
    store.put(original);
    const snapshot = store.list("o1");
    let calls = 0;
    store.subscribe("o1", () => calls++);
    expect(() => store.put({...original, plan:{...plan, intendedSize:999}})).toThrow(/sealed/);
    expect(store.list("o1")).toBe(snapshot);
    expect(calls).toBe(1);
  });

  it("allows append-only management but rejects truncation or rewriting history", () => {
    const original = sealDecision({decisionId:"d1", ownerId:"o1", sessionIdentity:"s1", frozen:frozen("o1"), plan});
    const event = {id:"e1", type:"USER_NOTE" as const, at:1_800_000_000_001, detail:"first"};
    const advanced = appendManagement(original, event);
    store.put(original); store.put(advanced);
    expect(() => store.put(original)).toThrow(/management/);
    expect(() => store.put({...advanced, management:[{...event, detail:"rewritten"}]})).toThrow(/management/);
    expect(store.get("o1", "d1")).toBe(advanced);
  });

  it("treats an identical serialized replay as a no-op", () => {
    const original = sealDecision({decisionId:"d1", ownerId:"o1", sessionIdentity:"s1", frozen:frozen("o1"), plan});
    store.put(original);
    const list = store.list("o1");
    store.put(JSON.parse(JSON.stringify(original)));
    expect(store.get("o1", "d1")).toBe(original);
    expect(store.list("o1")).toBe(list);
  });

  it("freezes hydrated nested input so history cannot change behind the store", () => {
    const record = JSON.parse(JSON.stringify(sealDecision({decisionId:"d1", ownerId:"o1", sessionIdentity:"s1", frozen:frozen("o1"), plan})));
    Object.freeze(record);
    store.put(record);
    expect(Object.isFrozen(record.plan)).toBe(true);
    expect(() => { record.plan.intendedSize = 999; }).toThrow();
    expect(store.get("o1", "d1")?.plan.intendedSize).toBe(100);
  });

  it("rejects a forged inner owner without creating a bucket", () => {
    const record = sealDecision({decisionId:"d1", ownerId:"o1", sessionIdentity:"s1", frozen:frozen("o1"), plan});
    expect(() => store.put({...record, ownerId:"o2"})).toThrow(/owner/);
    expect(store.list("o2")).toEqual([]);
  });

  it("accepts serialized replays with different property order", () => {
    const original = sealDecision({decisionId:"d1", ownerId:"o1", sessionIdentity:"s1", frozen:frozen("o1"), plan});
    store.put(original);
    const reordered = Object.fromEntries(Object.entries(original).reverse()) as unknown as typeof original;
    store.put(reordered);
    expect(store.get("o1", "d1")).toBe(original);
  });

  it("preserves review and amendments while accepting a lawful amendment", () => {
    const original = sealDecision({decisionId:"d1", ownerId:"o1", sessionIdentity:"s1", frozen:frozen("o1"), plan});
    const closed = attachOutcome(original, {closedAt:1_800_000_000_100, realizedR:1, reason:"MANUAL"});
    const reviewed = attachReview(closed, {reviewedAt:1_800_000_000_200, marketOpportunityQuality:3,
      playbookMatch:3, riskQuality:3, executionQuality:3, processAdherence:3, lessons:["observed"]});
    const amended = amendDecision(reviewed, {id:"am1", at:1_800_000_000_300, authorOwnerId:"o1",
      reason:"correction", target:"review", note:"append-only clarification"});
    store.put(reviewed); store.put(amended);
    expect(() => store.put(reviewed)).toThrow(/amendments/);
    expect(() => store.put({...amended, review:undefined})).toThrow(/review/);
    expect(() => store.put({...amended, outcome:{...closed.outcome!, realizedR:99}})).toThrow(/outcome/);
    expect(store.get("o1", "d1")).toBe(amended);
  });

  it("rejects a same-ID session or frozen-state rewrite", () => {
    const original = sealDecision({decisionId:"d1", ownerId:"o1", sessionIdentity:"s1", frozen:frozen("o1"), plan});
    store.put(original);
    expect(() => store.put({...original, sessionIdentity:"s2"})).toThrow(/sealed/);
    expect(() => store.put({...original, frozen:{...original.frozen, capturedAt:1}})).toThrow(/sealed/);
    expect(store.get("o1", "d1")).toBe(original);
  });

  it("list is owner-scoped — never leaks across owners", () => {
    const a = sealDecision({ decisionId: "a", ownerId: "o1", sessionIdentity: "s1", frozen: frozen("o1"), plan });
    const b = sealDecision({ decisionId: "b", ownerId: "o2", sessionIdentity: "s2", frozen: frozen("o2"), plan });
    store.put(a); store.put(b);
    expect(store.list("o1").map(r => r.decisionId)).toEqual(["a"]);
    expect(store.list("o2").map(r => r.decisionId)).toEqual(["b"]);
  });

  it("snapshots returns compact projection", () => {
    const rec = sealDecision({ decisionId: "d1", ownerId: "o1", sessionIdentity: "s1", frozen: frozen("o1"), plan });
    store.put(rec);
    const snaps = store.snapshots("o1");
    expect(snaps).toHaveLength(1);
    expect(snaps[0].decisionId).toBe("d1");
    expect(snaps[0].playbookId).toBe("clc-long-v1");
    expect(snaps[0].plan.action).toBe("ENTER_LONG");
  });

  it("subscribe fires immediately with current state, then on mutation", () => {
    const rec = sealDecision({ decisionId: "d1", ownerId: "o1", sessionIdentity: "s1", frozen: frozen("o1"), plan });
    store.put(rec);
    const calls: number[] = [];
    const unsub = store.subscribe("o1", (records) => calls.push(records.length));
    expect(calls).toEqual([1]); // immediate initial fire
    store.put(sealDecision({ decisionId: "d2", ownerId: "o1", sessionIdentity: "s1", frozen: frozen("o1"), plan }));
    expect(calls).toEqual([1, 2]);
    unsub();
    store.put(sealDecision({ decisionId: "d3", ownerId: "o1", sessionIdentity: "s1", frozen: frozen("o1"), plan }));
    expect(calls).toEqual([1, 2]); // unsub silences
  });

  it("subscribe is owner-scoped — mutations on other owner do not fire", () => {
    const calls: number[] = [];
    store.subscribe("o1", (r) => calls.push(r.length));
    // initial fire
    expect(calls.length).toBe(1);
    store.put(sealDecision({ decisionId: "x", ownerId: "o2", sessionIdentity: "s2", frozen: frozen("o2"), plan }));
    // no additional call for o1
    expect(calls.length).toBe(1);
  });

  it("clearOwner does not affect other owners", () => {
    store.put(sealDecision({ decisionId: "a", ownerId: "o1", sessionIdentity: "s1", frozen: frozen("o1"), plan }));
    store.put(sealDecision({ decisionId: "b", ownerId: "o2", sessionIdentity: "s2", frozen: frozen("o2"), plan }));
    store.clearOwner("o1");
    expect(store.list("o1")).toEqual([]);
    expect(store.list("o2")).toHaveLength(1);
  });

  // REGRESSION: React #185 crash on /command-deck (fixed in c750df3).
  // useSyncExternalStore requires getSnapshot to return the SAME reference
  // between mutations — a fresh array each call causes infinite re-render.
  describe("snapshot identity stability (useSyncExternalStore contract)", () => {
    it("list() returns the same reference across reads until a mutation", () => {
      store.put(sealDecision({ decisionId: "a", ownerId: "o1", sessionIdentity: "s1", frozen: frozen("o1"), plan }));
      const r1 = store.list("o1");
      const r2 = store.list("o1");
      expect(r2).toBe(r1);
      store.put(sealDecision({ decisionId: "b", ownerId: "o1", sessionIdentity: "s1", frozen: frozen("o1"), plan }));
      const r3 = store.list("o1");
      expect(r3).not.toBe(r1);
      const r4 = store.list("o1");
      expect(r4).toBe(r3);
    });

    it("snapshots() returns the same reference across reads until a mutation", () => {
      store.put(sealDecision({ decisionId: "a", ownerId: "o1", sessionIdentity: "s1", frozen: frozen("o1"), plan }));
      const s1 = store.snapshots("o1");
      const s2 = store.snapshots("o1");
      expect(s2).toBe(s1);
      store.put(sealDecision({ decisionId: "b", ownerId: "o1", sessionIdentity: "s1", frozen: frozen("o1"), plan }));
      const s3 = store.snapshots("o1");
      expect(s3).not.toBe(s1);
    });

    it("empty-owner reads return a stable frozen empty array", () => {
      const e1 = store.snapshots("never-mutated-owner");
      const e2 = store.snapshots("never-mutated-owner");
      expect(e1).toBe(e2);
      expect(Object.isFrozen(e1)).toBe(true);
    });

    it("clearOwner invalidates the cache", () => {
      store.put(sealDecision({ decisionId: "a", ownerId: "o1", sessionIdentity: "s1", frozen: frozen("o1"), plan }));
      const before = store.snapshots("o1");
      store.clearOwner("o1");
      const after = store.snapshots("o1");
      expect(after).not.toBe(before);
      expect(after).toEqual([]);
    });
  });
});
