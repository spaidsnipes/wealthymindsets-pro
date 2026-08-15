import { describe, it, expect } from "vitest";
import { selectSessionEdge } from "../selectSessionEdge";
import type { DecisionMemorySnapshot } from "../selectProcessLandscape";

// A specific known UTC time so day-of-week / hour math is deterministic
// 2026-08-13T14:00:00Z is a Thursday.
const THU_14 = new Date("2026-08-13T14:00:00Z").getTime();

const makeDecision = (over: Partial<DecisionMemorySnapshot> & { pnlR?: number; adherence?: number; ts?: number } = {}): DecisionMemorySnapshot => {
  const { pnlR, adherence, ts, ...rest } = over;
  return {
    decisionId: `d-${Math.random().toString(36).slice(2, 8)}`,
    capturedAt: ts ?? THU_14,
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
    outcome: pnlR !== undefined ? { closedAt: (ts ?? THU_14) + 1000, realizedR: pnlR, reason: pnlR > 0 ? "TARGET" : "STOP" } : rest.outcome,
    review: adherence !== undefined ? {
      reviewedAt: ts ?? THU_14,
      marketOpportunityQuality: adherence as 1|2|3|4|5,
      playbookMatch: adherence as 1|2|3|4|5,
      riskQuality: adherence as 1|2|3|4|5,
      executionQuality: adherence as 1|2|3|4|5,
      processAdherence: adherence as 1|2|3|4|5,
    } : rest.review,
  };
};

describe("selectSessionEdge", () => {
  it("empty input", () => {
    const r = selectSessionEdge({ ownerId: "owner-1", decisions: [], nowMs: THU_14, metric: "sample_count" });
    expect(r.cells).toHaveLength(0);
    expect(r.reason).toMatch(/no decisions/i);
  });

  it("groups by day-of-week × hour and identifies Thursday 14:00 UTC", () => {
    const decisions = Array.from({ length: 3 }, (_, i) => makeDecision({ decisionId: `d${i}`, pnlR: 1 }));
    const r = selectSessionEdge({ ownerId: "owner-1", decisions, nowMs: THU_14, metric: "avg_realized_r" });
    expect(r.cells).toHaveLength(1);
    expect(r.cells[0].dayLabel).toBe("Thu");
    expect(r.cells[0].hour).toBe(14);
    expect(r.cells[0].value).toBe(1);
  });

  it("UNKNOWN when cell sample below threshold", () => {
    const decisions = Array.from({ length: 2 }, (_, i) => makeDecision({ decisionId: `d${i}`, pnlR: 1 }));
    const r = selectSessionEdge({ ownerId: "owner-1", decisions, nowMs: THU_14, metric: "avg_realized_r", sampleThreshold: 3 });
    expect(r.cells[0].value).toBe("UNKNOWN");
  });

  it("sample_count metric always resolves (no threshold gate)", () => {
    const decisions = [makeDecision({ decisionId: "d1" })];
    const r = selectSessionEdge({ ownerId: "owner-1", decisions, nowMs: THU_14, metric: "sample_count" });
    expect(r.cells[0].value).toBe(1);
  });

  it("bestCell / worstCell identified across multiple (day, hour) buckets", () => {
    const winThu = THU_14; // Thu 14
    const lossFri = new Date("2026-08-14T15:00:00Z").getTime(); // Fri 15
    const decisions = [
      ...Array.from({ length: 5 }, (_, i) => makeDecision({ decisionId: `w${i}`, pnlR: 2, ts: winThu })),
      ...Array.from({ length: 5 }, (_, i) => makeDecision({ decisionId: `l${i}`, pnlR: -1, ts: lossFri })),
    ];
    const r = selectSessionEdge({ ownerId: "owner-1", decisions, nowMs: THU_14, metric: "avg_realized_r" });
    expect(r.bestCell?.dayLabel).toBe("Thu");
    expect((r.bestCell?.value as number)).toBeGreaterThan(0);
    expect(r.worstCell?.dayLabel).toBe("Fri");
    expect((r.worstCell?.value as number)).toBeLessThan(0);
  });

  it("owner scoping — cross-owner excluded", () => {
    const decisions = [
      makeDecision({ decisionId: "mine" }),
      makeDecision({ decisionId: "theirs", ownerId: "owner-other" }),
    ];
    const r = selectSessionEdge({ ownerId: "owner-1", decisions, nowMs: THU_14, metric: "sample_count" });
    expect(r.totalDecisions).toBe(1);
    expect(r.cells[0].decisionIds).toEqual(["mine"]);
  });

  it("deterministic — same inputs → same output", () => {
    const decisions = Array.from({ length: 4 }, (_, i) => makeDecision({ decisionId: `d${i}`, pnlR: 1 }));
    const r1 = selectSessionEdge({ ownerId: "owner-1", decisions, nowMs: THU_14, metric: "avg_realized_r" });
    const r2 = selectSessionEdge({ ownerId: "owner-1", decisions, nowMs: THU_14, metric: "avg_realized_r" });
    expect(r1.cells).toEqual(r2.cells);
  });
});
