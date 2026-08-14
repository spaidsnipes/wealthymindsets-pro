import { describe, it, expect } from "vitest";
import { selectPlaybookDNA } from "../selectPlaybookDNA";
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

describe("selectPlaybookDNA", () => {
  it("empty input → empty output with reason", () => {
    const r = selectPlaybookDNA({ ownerId: "owner-1", decisions: [], nowMs: NOW });
    expect(r.playbooks).toHaveLength(0);
    expect(r.reason).toMatch(/no decisions/i);
  });

  it("EMBRYONIC when < threshold/2", () => {
    const decisions = Array.from({ length: 3 }, (_, i) => makeDecision({ decisionId: `d${i}`, pnlR: 1 }));
    const r = selectPlaybookDNA({ ownerId: "owner-1", decisions, nowMs: NOW, maturityThreshold: 20 });
    expect(r.playbooks[0].maturity).toBe("EMBRYONIC");
    // Below contextThreshold (5) → metrics UNKNOWN, not fabricated
    expect(r.playbooks[0].avgRealizedR).toBe("UNKNOWN");
    expect(r.playbooks[0].winRate).toBe("UNKNOWN");
  });

  it("MATURING when >= threshold/2", () => {
    const decisions = Array.from({ length: 10 }, (_, i) => makeDecision({ decisionId: `d${i}`, pnlR: 1 }));
    const r = selectPlaybookDNA({ ownerId: "owner-1", decisions, nowMs: NOW, maturityThreshold: 20 });
    expect(r.playbooks[0].maturity).toBe("MATURING");
  });

  it("ESTABLISHED when >= threshold", () => {
    const decisions = Array.from({ length: 20 }, (_, i) => makeDecision({ decisionId: `d${i}`, pnlR: 1 }));
    const r = selectPlaybookDNA({ ownerId: "owner-1", decisions, nowMs: NOW, maturityThreshold: 20 });
    expect(r.playbooks[0].maturity).toBe("ESTABLISHED");
  });

  it("HIGH_CONFIDENCE when >= 3× threshold", () => {
    const decisions = Array.from({ length: 60 }, (_, i) => makeDecision({ decisionId: `d${i}`, pnlR: 1 }));
    const r = selectPlaybookDNA({ ownerId: "owner-1", decisions, nowMs: NOW, maturityThreshold: 20 });
    expect(r.playbooks[0].maturity).toBe("HIGH_CONFIDENCE");
  });

  it("groups by playbookId — multiple playbooks emit multiple entries", () => {
    const decisions = [
      ...Array.from({ length: 10 }, (_, i) => makeDecision({ decisionId: `a${i}`, playbookId: "clc-long", pnlR: 1 })),
      ...Array.from({ length: 5 }, (_, i) => makeDecision({ decisionId: `b${i}`, playbookId: "vwap-reclaim", pnlR: -0.5 })),
    ];
    const r = selectPlaybookDNA({ ownerId: "owner-1", decisions, nowMs: NOW });
    expect(r.playbooks).toHaveLength(2);
    // Sorted by sample desc — clc-long (10) before vwap-reclaim (5)
    expect(r.playbooks[0].playbookId).toBe("clc-long");
    expect(r.playbooks[1].playbookId).toBe("vwap-reclaim");
  });

  it("owner scoping — cross-owner excluded", () => {
    const decisions = [
      makeDecision({ decisionId: "mine", ownerId: "owner-1" }),
      makeDecision({ decisionId: "theirs", ownerId: "owner-other" }),
    ];
    const r = selectPlaybookDNA({ ownerId: "owner-1", decisions, nowMs: NOW });
    expect(r.playbooks[0].decisionIds).toEqual(["mine"]);
  });

  it("bestContext / weakContext identified when threshold met", () => {
    const decisions = [
      ...Array.from({ length: 5 }, (_, i) => makeDecision({
        decisionId: `long${i}`, pnlR: 2,
        marketStateSummary: { regime: null, direction: null, location: null, volatility: null, session: "REGULAR" },
      })),
      ...Array.from({ length: 5 }, (_, i) => makeDecision({
        decisionId: `short${i}`, plan: { action: "ENTER_SHORT", expectedR: 2 }, pnlR: -1,
        marketStateSummary: { regime: null, direction: null, location: null, volatility: null, session: "PRE_MARKET" },
      })),
    ];
    const r = selectPlaybookDNA({ ownerId: "owner-1", decisions, nowMs: NOW, contextThreshold: 5 });
    expect(r.playbooks[0].bestContext?.avgR).toBeGreaterThan(0);
    expect(r.playbooks[0].weakContext?.avgR).toBeLessThan(0);
  });

  it("failureSignature identified when loser sample >= threshold", () => {
    const decisions = Array.from({ length: 5 }, (_, i) => makeDecision({
      decisionId: `l${i}`, pnlR: -1,
      outcome: { closedAt: NOW, realizedR: -1, reason: "STOP" },
    }));
    const r = selectPlaybookDNA({ ownerId: "owner-1", decisions, nowMs: NOW, contextThreshold: 5 });
    expect(r.playbooks[0].failureSignature).toMatch(/stop/i);
  });

  it("deterministic — same inputs → same output", () => {
    const decisions = Array.from({ length: 6 }, (_, i) => makeDecision({ decisionId: `d${i}`, pnlR: 1 }));
    const r1 = selectPlaybookDNA({ ownerId: "owner-1", decisions, nowMs: NOW });
    const r2 = selectPlaybookDNA({ ownerId: "owner-1", decisions, nowMs: NOW });
    expect(r1.playbooks[0].maturity).toBe(r2.playbooks[0].maturity);
    expect(r1.playbooks[0].sampleCount).toBe(r2.playbooks[0].sampleCount);
  });
});
