import { describe, it, expect } from "vitest";
import { selectPersonalEdge } from "../selectPersonalEdge";
import type { DecisionMemorySnapshot } from "../selectProcessLandscape";

const NOW = 1_800_000_000_000;

const makeDecision = (over: Partial<DecisionMemorySnapshot> & { pnlR?: number; adherence?: number } = {}): DecisionMemorySnapshot => {
  const { pnlR, adherence, ...rest } = over;
  return {
    decisionId: `d-${Math.random().toString(36).slice(2, 8)}`,
    capturedAt: NOW - 60_000,
    ownerId: "owner-1",
    sessionIdentity: "session-1",
    marketStateSummary: { regime: null, direction: null, location: null, volatility: null, session: null },
    playbookId: "clc-long",
    playbookVersion: 1,
    plan: { action: "ENTER_LONG", expectedR: 2 },
    ruleAdherenceAtDecision: true,
    externalInfluenceFlagged: false,
    tradeNumberInSession: 1,
    ...rest,
    outcome: pnlR !== undefined ? { closedAt: NOW, realizedR: pnlR, reason: pnlR > 0 ? "TARGET" : "STOP" } : rest.outcome,
    review: adherence !== undefined ? {
      reviewedAt: NOW,
      marketOpportunityQuality: adherence as 1|2|3|4|5,
      playbookMatch: adherence as 1|2|3|4|5,
      riskQuality: adherence as 1|2|3|4|5,
      executionQuality: adherence as 1|2|3|4|5,
      processAdherence: adherence as 1|2|3|4|5,
    } : rest.review,
  };
};

describe("selectPersonalEdge", () => {
  it("UNKNOWN when no decisions", () => {
    const r = selectPersonalEdge({ ownerId: "owner-1", decisions: [], nowMs: NOW });
    expect(r.resolution).toBe("UNKNOWN");
    expect(r.headline).toMatch(/no decisions/i);
  });

  it("UNKNOWN when below sample threshold — Founder 'never certainty from small samples'", () => {
    const decisions = Array.from({ length: 4 }, (_, i) => makeDecision({ decisionId: `d${i}`, pnlR: 2 }));
    const r = selectPersonalEdge({ ownerId: "owner-1", decisions, nowMs: NOW, sampleThreshold: 5 });
    expect(r.resolution).toBe("UNKNOWN");
    expect(r.topStrengths).toHaveLength(0);
    expect(r.headline).toMatch(/sample threshold/i);
  });

  it("PARTIAL when strength context found but overall < overallThreshold", () => {
    const decisions = Array.from({ length: 6 }, (_, i) => makeDecision({ decisionId: `d${i}`, pnlR: 2, adherence: 4 }));
    const r = selectPersonalEdge({ ownerId: "owner-1", decisions, nowMs: NOW, sampleThreshold: 5, overallThreshold: 10 });
    expect(r.resolution).toBe("PARTIAL");
    expect(r.topStrengths).toHaveLength(1);
    expect(r.topStrengths[0].avgRealizedR).toBeGreaterThan(0);
  });

  it("RESOLVED when threshold met + overall met + strength context present", () => {
    const decisions = Array.from({ length: 10 }, (_, i) => makeDecision({ decisionId: `d${i}`, pnlR: 1.5, adherence: 4 }));
    const r = selectPersonalEdge({ ownerId: "owner-1", decisions, nowMs: NOW, sampleThreshold: 5, overallThreshold: 10 });
    expect(r.resolution).toBe("RESOLVED");
    expect(r.overallAvgR).toBeGreaterThan(0);
    expect(r.topStrengths).toHaveLength(1);
  });

  it("topWatch identifies negative-avg contexts", () => {
    const decisions = [
      ...Array.from({ length: 5 }, (_, i) => makeDecision({ decisionId: `w${i}`, pnlR: -1 })),
      ...Array.from({ length: 5 }, (_, i) => makeDecision({
        decisionId: `s${i}`, pnlR: 2,
        marketStateSummary: { regime: null, direction: null, location: null, volatility: null, session: "REGULAR" },
      })),
    ];
    const r = selectPersonalEdge({ ownerId: "owner-1", decisions, nowMs: NOW, sampleThreshold: 5, overallThreshold: 5 });
    expect(r.topStrengths.length + r.topWatch.length).toBeGreaterThan(0);
    // The negative-avg bucket appears in topWatch
    expect(r.topWatch.some((b) => (b.avgRealizedR as number) < 0)).toBe(true);
  });

  it("owner scoping — cross-owner decisions excluded", () => {
    const decisions = [
      ...Array.from({ length: 5 }, (_, i) => makeDecision({ decisionId: `mine${i}`, pnlR: 1 })),
      ...Array.from({ length: 5 }, (_, i) => makeDecision({ decisionId: `other${i}`, pnlR: -5, ownerId: "owner-other" })),
    ];
    const r = selectPersonalEdge({ ownerId: "owner-1", decisions, nowMs: NOW, sampleThreshold: 5, overallThreshold: 5 });
    expect(r.totalDecisions).toBe(5);
    expect(r.topStrengths[0].avgRealizedR).toBeGreaterThan(0); // proves other-owner losses excluded
  });

  it("deterministic — same inputs → same output", () => {
    const decisions = Array.from({ length: 10 }, (_, i) => makeDecision({ decisionId: `d${i}`, pnlR: 1.2 }));
    const r1 = selectPersonalEdge({ ownerId: "owner-1", decisions, nowMs: NOW });
    const r2 = selectPersonalEdge({ ownerId: "owner-1", decisions, nowMs: NOW });
    expect(r1.overallAvgR).toBe(r2.overallAvgR);
    expect(r1.topStrengths.map((b) => b.key)).toEqual(r2.topStrengths.map((b) => b.key));
  });

  it("never fabricates when all contexts fail threshold", () => {
    const decisions = [
      makeDecision({ playbookId: "a", pnlR: 5 }),
      makeDecision({ playbookId: "b", pnlR: 5 }),
      makeDecision({ playbookId: "c", pnlR: 5 }),
    ];
    const r = selectPersonalEdge({ ownerId: "owner-1", decisions, nowMs: NOW, sampleThreshold: 5 });
    expect(r.resolution).toBe("UNKNOWN");
    expect(r.topStrengths).toHaveLength(0);
    expect(r.reason).toMatch(/never certainty/i);
  });
});
