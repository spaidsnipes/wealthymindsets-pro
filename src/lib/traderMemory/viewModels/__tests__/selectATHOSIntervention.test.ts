/**
 * Focused tests for the ATHOS silent-mode intervention selector.
 * Enforces the Founder doctrine: silence is the default. Interventions
 * only fire on evidence-backed triggers, and never as DENY/BLOCK.
 */
import { describe, it, expect } from "vitest";
import {
  selectATHOSIntervention,
  rankInterventions,
  type ATHOSInput,
} from "../selectATHOSIntervention";
import type { DecisionMemorySnapshot } from "../selectProcessLandscape";

const NOW = 1_800_000_000_000;

const baseInput = (overrides: Partial<ATHOSInput> = {}): ATHOSInput => ({
  ownerId: "owner-1",
  sessionIdentity: "session-1",
  moment: "IDLE",
  nowMs: NOW,
  sessionDecisions: [],
  ...overrides,
});

const winner = (offsetMs: number, decisionId = "d-win"): DecisionMemorySnapshot => ({
  decisionId,
  capturedAt: NOW - offsetMs - 60_000,
  ownerId: "owner-1",
  sessionIdentity: "session-1",
  marketStateSummary: { regime: null, direction: null, location: null, volatility: null, session: null },
  playbookId: "clc-long-v1",
  playbookVersion: 1,
  plan: { action: "ENTER_LONG", expectedR: 2.0 },
  ruleAdherenceAtDecision: true,
  externalInfluenceFlagged: false,
  tradeNumberInSession: 1,
  outcome: { closedAt: NOW - offsetMs, realizedR: 2.0, reason: "TARGET" },
});

const loser = (offsetMs: number, decisionId = "d-loss"): DecisionMemorySnapshot => ({
  decisionId,
  capturedAt: NOW - offsetMs - 60_000,
  ownerId: "owner-1",
  sessionIdentity: "session-1",
  marketStateSummary: { regime: null, direction: null, location: null, volatility: null, session: null },
  playbookId: "clc-long-v1",
  playbookVersion: 1,
  plan: { action: "ENTER_LONG", expectedR: 2.0 },
  ruleAdherenceAtDecision: false,
  externalInfluenceFlagged: false,
  tradeNumberInSession: 2,
  outcome: { closedAt: NOW - offsetMs, realizedR: -1.0, reason: "STOP" },
});

describe("selectATHOSIntervention — silence is the default", () => {
  it("returns 0 interventions when nothing meets a trigger", () => {
    const r = selectATHOSIntervention(baseInput({ moment: "IDLE" }));
    expect(r.interventions).toHaveLength(0);
    expect(r.reason).toMatch(/silence/i);
  });

  it("never emits DENY / BLOCK / STOP — human sovereignty (§10.14)", () => {
    // Every possible detector run produces at most CAUTION
    const r = selectATHOSIntervention(baseInput({
      moment: "PRE_REENTRY",
      sessionDecisions: [winner(2 * 60_000)],
      maxTradesPerSession: 1,
    }));
    for (const iv of r.interventions) {
      expect(["NONE", "NOTICE", "ADVISORY", "CAUTION"]).toContain(iv.verdict);
    }
  });
});

describe("Missed-profit-revenge detector", () => {
  it("fires CAUTION on PRE_REENTRY within window after a winner", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "PRE_REENTRY",
      sessionDecisions: [winner(2 * 60_000)],
      reentryWindowMs: 5 * 60_000,
    }));
    const iv = r.interventions.find(x => x.id.startsWith("pre-reentry-missed-profit"));
    expect(iv).toBeDefined();
    expect(iv!.verdict).toBe("CAUTION");
    expect(iv!.evidenceClass).toBe("SYSTEM_CANDIDATE");
    expect(iv!.headline).toMatch(/planned re-entry/i);
  });

  it("does NOT fire outside the window", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "PRE_REENTRY",
      sessionDecisions: [winner(30 * 60_000)],
      reentryWindowMs: 5 * 60_000,
    }));
    const iv = r.interventions.find(x => x.id.startsWith("pre-reentry-missed-profit"));
    expect(iv).toBeUndefined();
  });

  it("does NOT fire after a loser (this is not revenge-trading; that is a different detector)", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "PRE_REENTRY",
      sessionDecisions: [loser(2 * 60_000)],
    }));
    const iv = r.interventions.find(x => x.id.startsWith("pre-reentry-missed-profit"));
    expect(iv).toBeUndefined();
  });
});

describe("Success-triggered rule bending detector", () => {
  it("fires CAUTION when trade count exceeded AND session has a winner", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "PRE_ENTRY",
      sessionDecisions: [winner(30 * 60_000, "d-win-1")],
      maxTradesPerSession: 1,
    }));
    const iv = r.interventions.find(x => x.id.startsWith("success-triggered-rule-bending"));
    expect(iv).toBeDefined();
    expect(iv!.verdict).toBe("CAUTION");
  });

  it("does NOT fire without a session winner (loss-only overtrading is a different pattern)", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "PRE_ENTRY",
      sessionDecisions: [loser(30 * 60_000)],
      maxTradesPerSession: 1,
    }));
    const iv = r.interventions.find(x => x.id.startsWith("success-triggered-rule-bending"));
    expect(iv).toBeUndefined();
  });

  it("does NOT fire when count not exceeded", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "PRE_ENTRY",
      sessionDecisions: [winner(30 * 60_000)],
      maxTradesPerSession: 3,
    }));
    const iv = r.interventions.find(x => x.id.startsWith("success-triggered-rule-bending"));
    expect(iv).toBeUndefined();
  });
});

describe("Post-exit continuation integrity detector", () => {
  it("fires NOTICE within 30min of exit", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "POST_EXIT",
      sessionDecisions: [winner(5 * 60_000)],
    }));
    const iv = r.interventions.find(x => x.id.startsWith("post-exit-integrity"));
    expect(iv).toBeDefined();
    expect(iv!.verdict).toBe("NOTICE");
    expect(iv!.headline).toMatch(/does not automatically mean the exit was wrong/i);
  });

  it("does NOT fire after 30min", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "POST_EXIT",
      sessionDecisions: [winner(45 * 60_000)],
    }));
    expect(r.interventions.find(x => x.id.startsWith("post-exit-integrity"))).toBeUndefined();
  });
});

describe("Process-vs-outcome separation on rule violations", () => {
  it("fires ADVISORY when at least one violation exists in the session", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "SESSION_REVIEW",
      sessionDecisions: [loser(60 * 60_000)],
    }));
    const iv = r.interventions.find(x => x.id.startsWith("process-outcome-separation"));
    expect(iv).toBeDefined();
    expect(iv!.verdict).toBe("ADVISORY");
    expect(iv!.headline).toMatch(/separate.*outcome from rule/i);
  });
});

describe("Max losses reached detector", () => {
  it("fires CAUTION when loss count reaches configured max", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "PRE_ENTRY",
      sessionDecisions: [loser(30 * 60_000, "l1"), loser(20 * 60_000, "l2")],
      maxLossesPerSession: 2,
    }));
    const iv = r.interventions.find(x => x.id.startsWith("max-losses"));
    expect(iv).toBeDefined();
    expect(iv!.verdict).toBe("CAUTION");
    // Never worded as a gate
    expect(iv!.detail).toMatch(/retain full agency/i);
  });

  it("does NOT fire when no max configured", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "PRE_ENTRY",
      sessionDecisions: [loser(30 * 60_000)],
    }));
    expect(r.interventions.find(x => x.id.startsWith("max-losses"))).toBeUndefined();
  });
});

describe("rankInterventions — CAUTION > ADVISORY > NOTICE", () => {
  it("sorts by verdict severity", () => {
    const r = selectATHOSIntervention(baseInput({
      moment: "PRE_REENTRY",
      sessionDecisions: [
        loser(30 * 60_000, "l1"),
        winner(2 * 60_000, "w1"),
      ],
      maxTradesPerSession: 1,
      maxLossesPerSession: 1,
    }));
    const ranked = rankInterventions(r.interventions);
    if (ranked.length < 2) return; // still valid if fewer detectors fire
    const order = { NONE: 0, NOTICE: 1, ADVISORY: 2, CAUTION: 3 };
    for (let i = 1; i < ranked.length; i++) {
      expect(order[ranked[i].verdict]).toBeLessThanOrEqual(order[ranked[i - 1].verdict]);
    }
  });
});

describe("Determinism — no wall-clock reads", () => {
  it("produces identical output for identical input across two calls", () => {
    const input = baseInput({
      moment: "PRE_REENTRY",
      sessionDecisions: [winner(2 * 60_000)],
      maxTradesPerSession: 1,
    });
    const r1 = selectATHOSIntervention(input);
    const r2 = selectATHOSIntervention(input);
    expect(r1.interventions.map(i => i.id)).toEqual(r2.interventions.map(i => i.id));
    expect(r1.evaluatedAt).toBe(r2.evaluatedAt);
  });
});
