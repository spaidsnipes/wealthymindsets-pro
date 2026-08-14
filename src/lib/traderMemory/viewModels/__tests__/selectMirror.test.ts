import { describe, it, expect } from "vitest";
import { selectMirror } from "../selectMirror";
import type { DecisionMemorySnapshot } from "../selectProcessLandscape";

const NOW = 1_800_000_000_000;

const makeDecision = (over: Partial<DecisionMemorySnapshot> = {}): DecisionMemorySnapshot => ({
  decisionId: over.decisionId ?? "d",
  capturedAt: over.capturedAt ?? NOW - 30_000,
  ownerId: "owner-1",
  sessionIdentity: "session-1",
  marketStateSummary: {
    regime: null, direction: null, location: null, volatility: null, session: null,
  },
  playbookId: "p", playbookVersion: 1,
  plan: { action: "ENTER_LONG", expectedR: 2 },
  ruleAdherenceAtDecision: true,
  externalInfluenceFlagged: false,
  tradeNumberInSession: 1,
  ...over,
});

describe("selectMirror — Founder-doctrine detectors", () => {
  it("returns empty patterns when no decisions", () => {
    const r = selectMirror({ ownerId: "owner-1", decisions: [], nowMs: NOW });
    expect(r.patterns).toHaveLength(0);
    expect(r.reason).toMatch(/no decisions|nothing to reflect/i);
  });

  it("detects post-exit quick re-entry (winner → next trade within 5m)", () => {
    const winner = makeDecision({
      decisionId: "w1",
      capturedAt: NOW - 10 * 60_000,
      outcome: { closedAt: NOW - 8 * 60_000, realizedR: 2, reason: "TARGET" },
    });
    const reentry = makeDecision({
      decisionId: "r1",
      capturedAt: NOW - 7 * 60_000, // 1 min after prev exit
    });
    const r = selectMirror({ ownerId: "owner-1", decisions: [winner, reentry], nowMs: NOW });
    const pattern = r.patterns.find((p) => p.id === "post-exit-quick-reentry");
    expect(pattern).toBeDefined();
    expect(pattern!.evidenceClass).toBe("SYSTEM_CANDIDATE");
    expect(pattern!.direction).toBe("WATCH");
  });

  it("does NOT detect post-exit quick re-entry when re-entry outside window", () => {
    const winner = makeDecision({
      decisionId: "w1",
      capturedAt: NOW - 30 * 60_000,
      outcome: { closedAt: NOW - 28 * 60_000, realizedR: 2, reason: "TARGET" },
    });
    const reentry = makeDecision({
      decisionId: "r1",
      capturedAt: NOW - 10 * 60_000, // 18 min after prev exit — outside 5m window
    });
    const r = selectMirror({ ownerId: "owner-1", decisions: [winner, reentry], nowMs: NOW });
    expect(r.patterns.find((p) => p.id === "post-exit-quick-reentry")).toBeUndefined();
  });

  it("does NOT detect post-exit re-entry after a LOSER (different pattern)", () => {
    const loser = makeDecision({
      decisionId: "l1",
      capturedAt: NOW - 10 * 60_000,
      outcome: { closedAt: NOW - 8 * 60_000, realizedR: -1, reason: "STOP" },
    });
    const reentry = makeDecision({
      decisionId: "r1",
      capturedAt: NOW - 7 * 60_000,
    });
    const r = selectMirror({ ownerId: "owner-1", decisions: [loser, reentry], nowMs: NOW });
    expect(r.patterns.find((p) => p.id === "post-exit-quick-reentry")).toBeUndefined();
  });

  it("detects success-triggered rule bending (winner then rule violation)", () => {
    const winner = makeDecision({
      decisionId: "w1",
      capturedAt: NOW - 60 * 60_000,
      outcome: { closedAt: NOW - 55 * 60_000, realizedR: 2, reason: "TARGET" },
    });
    const violation = makeDecision({
      decisionId: "v1",
      capturedAt: NOW - 30 * 60_000,
      ruleAdherenceAtDecision: false,
    });
    const r = selectMirror({ ownerId: "owner-1", decisions: [winner, violation], nowMs: NOW });
    const pattern = r.patterns.find((p) => p.id === "success-triggered-rule-bending");
    expect(pattern).toBeDefined();
    expect(pattern!.direction).toBe("WATCH");
    expect(pattern!.evidenceClass).toBe("SYSTEM_CANDIDATE");
  });

  it("does NOT detect success-triggered rule bending when winner too small", () => {
    const smallWin = makeDecision({
      decisionId: "w1",
      capturedAt: NOW - 60 * 60_000,
      outcome: { closedAt: NOW - 55 * 60_000, realizedR: 0.3, reason: "MANUAL" },
    });
    const violation = makeDecision({
      decisionId: "v1",
      capturedAt: NOW - 30 * 60_000,
      ruleAdherenceAtDecision: false,
    });
    const r = selectMirror({ ownerId: "owner-1", decisions: [smallWin, violation], nowMs: NOW });
    expect(r.patterns.find((p) => p.id === "success-triggered-rule-bending")).toBeUndefined();
  });

  it("emits the existing rule-adherence pattern when threshold met", () => {
    const decisions = Array.from({ length: 3 }, (_, i) =>
      makeDecision({ decisionId: `d${i}`, ruleAdherenceAtDecision: true }),
    );
    const r = selectMirror({ ownerId: "owner-1", decisions, nowMs: NOW });
    expect(r.patterns.find((p) => p.id === "rule-adherence")).toBeDefined();
  });

  it("owner-scopes — never emits patterns for other-owner decisions", () => {
    const otherOwnerDecision = makeDecision({ ownerId: "owner-other" });
    const r = selectMirror({ ownerId: "owner-1", decisions: [otherOwnerDecision], nowMs: NOW });
    expect(r.totalDecisions).toBe(0);
    expect(r.patterns).toHaveLength(0);
  });

  it("deterministic — identical inputs → identical output", () => {
    const decisions = [
      makeDecision({ decisionId: "w1", outcome: { closedAt: NOW - 10_000, realizedR: 2, reason: "TARGET" }, capturedAt: NOW - 60_000 }),
    ];
    const r1 = selectMirror({ ownerId: "owner-1", decisions, nowMs: NOW });
    const r2 = selectMirror({ ownerId: "owner-1", decisions, nowMs: NOW });
    expect(r1.patterns.map((p) => p.id)).toEqual(r2.patterns.map((p) => p.id));
    expect(r1.evaluatedAt).toBe(r2.evaluatedAt);
  });
});
