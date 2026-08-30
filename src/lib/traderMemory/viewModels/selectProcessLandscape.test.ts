/**
 * selectProcessLandscape — truth-lock.
 *
 * The Founder's "put it all together" loop compiled as a pure selector.
 * Silent drift here silently mis-tallies the /profile Growth heatmap —
 * a P0 self-mirror surface.
 *
 * Locks:
 *   - Axis extractors (time_of_day, day_of_week, session, trade_number
 *     bucketing, playbook, regime, direction, location, volatility,
 *     outcome R-thresholds, adherence, external_influence)
 *   - Sample threshold gating (default 3, custom respected)
 *   - Confidence tiers (HIGH >= 3× threshold, MEDIUM >= threshold, LOW below)
 *   - Metric aggregators — each formula
 *   - Owner + time-window filtering (never cross owners)
 *   - Bucketing + decisionIds surface (Heatmap→Memory bridge)
 *   - Overall resolution (RESOLVED/PARTIAL/UNKNOWN)
 *   - selectMemoryExamplesForCell bridge
 *   - UNKNOWN never masquerades as 0 (canon: sample size)
 */

import { describe, it, expect } from "vitest";
import {
  selectProcessLandscape,
  selectMemoryExamplesForCell,
  type DecisionMemorySnapshot,
} from "./selectProcessLandscape";

type DecisionOver = Partial<Omit<DecisionMemorySnapshot, "marketStateSummary" | "plan" | "outcome" | "review">> & {
  marketStateSummary?: Partial<DecisionMemorySnapshot["marketStateSummary"]>;
  plan?: Partial<DecisionMemorySnapshot["plan"]>;
  outcome?: DecisionMemorySnapshot["outcome"];
  review?: DecisionMemorySnapshot["review"];
};

let counter = 0;
function mkDecision(over: DecisionOver = {}): DecisionMemorySnapshot {
  counter += 1;
  return {
    decisionId: over.decisionId ?? `d-${counter}`,
    capturedAt: over.capturedAt ?? 1_800_000_000_000,
    ownerId: over.ownerId ?? "owner-1",
    sessionIdentity: over.sessionIdentity ?? "session-1",
    marketStateSummary: {
      regime: "TREND",
      direction: "LONG",
      location: "VAL",
      volatility: "NORMAL",
      session: "REGULAR",
      ...(over.marketStateSummary ?? {}),
    },
    playbookId: over.playbookId ?? "clc-long-v1",
    playbookVersion: over.playbookVersion ?? 1,
    plan: {
      action: "ENTER_LONG",
      expectedR: 2,
      ...(over.plan ?? {}),
    },
    ruleAdherenceAtDecision: over.ruleAdherenceAtDecision ?? true,
    externalInfluenceFlagged: over.externalInfluenceFlagged ?? false,
    tradeNumberInSession: over.tradeNumberInSession ?? 1,
    outcome: over.outcome,
    review: over.review,
  };
}

describe("selectProcessLandscape — empty + owner/window filters", () => {
  it("empty decisions → UNKNOWN resolution + empty cells", () => {
    const vm = selectProcessLandscape({
      decisions: [],
      rowAxis: "regime",
      colAxis: "direction",
      metric: "sample_count",
    });
    expect(vm.resolution).toBe("UNKNOWN");
    expect(vm.cells).toEqual([]);
    expect(vm.totalDecisions).toBe(0);
    expect(vm.reason).toMatch(/No decisions in scope/i);
  });

  it("ownerId filter — never crosses owners", () => {
    const decisions = [
      mkDecision({ ownerId: "owner-A" }),
      mkDecision({ ownerId: "owner-B" }),
      mkDecision({ ownerId: "owner-A" }),
    ];
    const vm = selectProcessLandscape({
      decisions, rowAxis: "regime", colAxis: "direction",
      metric: "sample_count", ownerId: "owner-A",
    });
    expect(vm.totalDecisions).toBe(2);
  });

  it("windowStartMs/windowEndMs are inclusive", () => {
    const decisions = [
      mkDecision({ capturedAt: 100 }),
      mkDecision({ capturedAt: 200 }),
      mkDecision({ capturedAt: 300 }),
      mkDecision({ capturedAt: 400 }),
    ];
    const vm = selectProcessLandscape({
      decisions, rowAxis: "regime", colAxis: "direction",
      metric: "sample_count", windowStartMs: 200, windowEndMs: 300,
    });
    expect(vm.totalDecisions).toBe(2);
  });
});

describe("selectProcessLandscape — axis extractors", () => {
  it("time_of_day extracts UTC hour", () => {
    // capturedAt at UTC 14:00
    const utc14 = Date.UTC(2026, 7, 30, 14, 0, 0);
    const vm = selectProcessLandscape({
      decisions: [mkDecision({ capturedAt: utc14 })],
      rowAxis: "time_of_day", colAxis: "regime",
      metric: "sample_count", sampleThreshold: 1,
    });
    expect(vm.cells[0].rowValue).toBe(14);
    expect(vm.cells[0].rowKey).toBe("14:00 UTC");
  });

  it("day_of_week names Sun–Sat", () => {
    // Sunday 2026-08-30 UTC
    const sun = Date.UTC(2026, 7, 30);
    const vm = selectProcessLandscape({
      decisions: [mkDecision({ capturedAt: sun })],
      rowAxis: "day_of_week", colAxis: "regime",
      metric: "sample_count", sampleThreshold: 1,
    });
    expect(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).toContain(vm.cells[0].rowKey);
  });

  it("trade_number buckets: 1 → 1st, 2-3 → 2nd–3rd, 4-6 → 4th–6th, 7+ → 7th+", () => {
    const decisions = [
      mkDecision({ tradeNumberInSession: 1 }),
      mkDecision({ tradeNumberInSession: 3 }),
      mkDecision({ tradeNumberInSession: 5 }),
      mkDecision({ tradeNumberInSession: 9 }),
    ];
    const vm = selectProcessLandscape({
      decisions, rowAxis: "trade_number", colAxis: "regime",
      metric: "sample_count", sampleThreshold: 1,
    });
    const rows = new Set(vm.cells.map((c) => c.rowKey));
    expect(rows).toEqual(new Set(["1st", "2nd–3rd", "4th–6th", "7th+"]));
  });

  it("outcome buckets: >0.1R → WIN, <-0.1R → LOSS, in-between → BREAKEVEN, no outcome → PENDING", () => {
    const decisions = [
      mkDecision({ outcome: { closedAt: 1, realizedR: 1.5, reason: "TARGET" } }),
      mkDecision({ outcome: { closedAt: 1, realizedR: -0.5, reason: "STOP" } }),
      mkDecision({ outcome: { closedAt: 1, realizedR: 0.05, reason: "MANUAL" } }),
      mkDecision(),
    ];
    const vm = selectProcessLandscape({
      decisions, rowAxis: "outcome", colAxis: "regime",
      metric: "sample_count", sampleThreshold: 1,
    });
    const rows = new Set(vm.cells.map((c) => c.rowKey));
    expect(rows).toEqual(new Set(["Win", "Loss", "Breakeven", "Pending"]));
  });

  it("direction extracted from plan.action (LONG/SHORT/NONE)", () => {
    const decisions = [
      mkDecision({ plan: { action: "ENTER_LONG", expectedR: 1 } }),
      mkDecision({ plan: { action: "ENTER_SHORT", expectedR: 1 } }),
      mkDecision({ plan: { action: "WAIT", expectedR: 0 } }),
    ];
    const vm = selectProcessLandscape({
      decisions, rowAxis: "direction", colAxis: "regime",
      metric: "sample_count", sampleThreshold: 1,
    });
    const rows = new Set(vm.cells.map((c) => c.rowKey));
    expect(rows).toEqual(new Set(["LONG", "SHORT", "NONE"]));
  });

  it("adherence extracts Y/N", () => {
    const decisions = [
      mkDecision({ ruleAdherenceAtDecision: true }),
      mkDecision({ ruleAdherenceAtDecision: false }),
    ];
    const vm = selectProcessLandscape({
      decisions, rowAxis: "adherence", colAxis: "regime",
      metric: "sample_count", sampleThreshold: 1,
    });
    expect(vm.cells.find((c) => c.rowKey === "Followed")).toBeDefined();
    expect(vm.cells.find((c) => c.rowKey === "Violated")).toBeDefined();
  });

  it("regime/session/location null → UNKNOWN label", () => {
    const vm = selectProcessLandscape({
      decisions: [mkDecision({ marketStateSummary: { regime: null, direction: null, location: null, volatility: null, session: null } })],
      rowAxis: "regime", colAxis: "session",
      metric: "sample_count", sampleThreshold: 1,
    });
    expect(vm.cells[0].rowKey).toBe("UNKNOWN");
    expect(vm.cells[0].colKey).toBe("UNKNOWN");
  });
});

describe("selectProcessLandscape — sample threshold + confidence tiers", () => {
  it("sample_count reports raw count regardless of threshold", () => {
    const decisions = Array.from({ length: 5 }, () => mkDecision({ marketStateSummary: { regime: "TREND" }, plan: { action: "ENTER_LONG", expectedR: 1 } }));
    const vm = selectProcessLandscape({
      decisions, rowAxis: "regime", colAxis: "direction",
      metric: "sample_count", sampleThreshold: 3,
    });
    expect(vm.cells[0].value).toBe(5);
    expect(vm.cells[0].confidence).toBe("HIGH");
  });

  it("cell UNKNOWN when sampleCount below threshold", () => {
    const decisions = Array.from({ length: 2 }, () => mkDecision());
    const vm = selectProcessLandscape({
      decisions, rowAxis: "regime", colAxis: "direction",
      metric: "rule_adherence", sampleThreshold: 3,
    });
    expect(vm.cells[0].value).toBe("UNKNOWN");
    expect(vm.cells[0].confidence).toBe("LOW");
    expect(vm.cells[0].reason).toMatch(/below threshold 3/i);
  });

  it("confidence: MEDIUM when count in [threshold, 3×threshold)", () => {
    // threshold 3, count 5 → 3 <= 5 < 9 → MEDIUM
    const decisions = Array.from({ length: 5 }, () => mkDecision({ ruleAdherenceAtDecision: true }));
    const vm = selectProcessLandscape({
      decisions, rowAxis: "regime", colAxis: "direction",
      metric: "rule_adherence", sampleThreshold: 3,
    });
    expect(vm.cells[0].confidence).toBe("MEDIUM");
  });

  it("confidence: HIGH when count >= 3× threshold", () => {
    const decisions = Array.from({ length: 9 }, () => mkDecision({ ruleAdherenceAtDecision: true }));
    const vm = selectProcessLandscape({
      decisions, rowAxis: "regime", colAxis: "direction",
      metric: "rule_adherence", sampleThreshold: 3,
    });
    expect(vm.cells[0].confidence).toBe("HIGH");
  });

  it("custom sampleThreshold honored", () => {
    // threshold 1 → 1 decision reaches HIGH
    const vm = selectProcessLandscape({
      decisions: [mkDecision()],
      rowAxis: "regime", colAxis: "direction",
      metric: "sample_count", sampleThreshold: 1,
    });
    expect(vm.cells[0].value).toBe(1);
    expect(vm.cells[0].confidence).toBe("HIGH");
  });
});

describe("selectProcessLandscape — metric aggregators", () => {
  it("rule_adherence: fraction of decisions with adherence=true", () => {
    const decisions = [
      mkDecision({ ruleAdherenceAtDecision: true }),
      mkDecision({ ruleAdherenceAtDecision: true }),
      mkDecision({ ruleAdherenceAtDecision: false }),
    ];
    const vm = selectProcessLandscape({
      decisions, rowAxis: "regime", colAxis: "direction",
      metric: "rule_adherence", sampleThreshold: 3,
    });
    expect(vm.cells[0].value).toBeCloseTo(2 / 3, 6);
  });

  it("outcome_r: average realized R across CLOSED decisions", () => {
    const decisions = [
      mkDecision({ outcome: { closedAt: 1, realizedR: 2, reason: "TARGET" } }),
      mkDecision({ outcome: { closedAt: 1, realizedR: 1, reason: "TARGET" } }),
      mkDecision({ outcome: { closedAt: 1, realizedR: -1, reason: "STOP" } }),
    ];
    const vm = selectProcessLandscape({
      decisions, rowAxis: "regime", colAxis: "direction",
      metric: "outcome_r", sampleThreshold: 3,
    });
    expect(vm.cells[0].value).toBeCloseTo((2 + 1 - 1) / 3, 6);
  });

  it("outcome_r: UNKNOWN when closed count < threshold (open decisions don't count)", () => {
    const decisions = [
      mkDecision({ outcome: { closedAt: 1, realizedR: 2, reason: "TARGET" } }),
      mkDecision(), // open
      mkDecision(), // open
    ];
    const vm = selectProcessLandscape({
      decisions, rowAxis: "regime", colAxis: "direction",
      metric: "outcome_r", sampleThreshold: 3,
    });
    expect(vm.cells[0].value).toBe("UNKNOWN");
    expect(vm.cells[0].reason).toMatch(/Only 1 closed/i);
  });

  it("unknown_rate: fraction of decisions with >=2 unresolved dimensions", () => {
    // 3 decisions: 0-unresolved / 3-unresolved / 3-unresolved → 2/3 above threshold
    const decisions = [
      mkDecision({ marketStateSummary: { regime: "TREND", direction: "LONG", location: "VAL", volatility: "NORMAL", session: "REGULAR" } }),
      mkDecision({ marketStateSummary: { regime: null, direction: null, location: null, volatility: "NORMAL", session: "REGULAR" } }),
      mkDecision({ marketStateSummary: { regime: "UNKNOWN", direction: "UNKNOWN", location: "VAL", volatility: "NORMAL", session: "REGULAR" } }),
    ];
    const vm = selectProcessLandscape({
      decisions, rowAxis: "playbook", colAxis: "direction",
      metric: "unknown_rate", sampleThreshold: 3,
    });
    expect(vm.cells[0].value).toBeCloseTo(2 / 3, 6);
  });

  it("execution_quality: average 1-5 across REVIEWED decisions", () => {
    const decisions = [
      mkDecision({ review: { reviewedAt: 1, marketOpportunityQuality: 3, playbookMatch: 3, riskQuality: 3, executionQuality: 5, processAdherence: 4 } }),
      mkDecision({ review: { reviewedAt: 1, marketOpportunityQuality: 3, playbookMatch: 3, riskQuality: 3, executionQuality: 3, processAdherence: 4 } }),
      mkDecision({ review: { reviewedAt: 1, marketOpportunityQuality: 3, playbookMatch: 3, riskQuality: 3, executionQuality: 4, processAdherence: 4 } }),
    ];
    const vm = selectProcessLandscape({
      decisions, rowAxis: "regime", colAxis: "direction",
      metric: "execution_quality", sampleThreshold: 3,
    });
    expect(vm.cells[0].value).toBeCloseTo((5 + 3 + 4) / 3, 6);
  });

  it("review metrics: UNKNOWN when reviewed count < threshold (open reviews ignored)", () => {
    const decisions = [
      mkDecision({ review: { reviewedAt: 1, marketOpportunityQuality: 3, playbookMatch: 3, riskQuality: 3, executionQuality: 5, processAdherence: 4 } }),
      mkDecision(), // no review
      mkDecision(), // no review
    ];
    const vm = selectProcessLandscape({
      decisions, rowAxis: "regime", colAxis: "direction",
      metric: "process_adherence", sampleThreshold: 3,
    });
    expect(vm.cells[0].value).toBe("UNKNOWN");
    expect(vm.cells[0].reason).toMatch(/Only 1 reviewed/i);
  });
});

describe("selectProcessLandscape — bucketing + resolution + decisionIds bridge", () => {
  it("cells bucket by (row, col) — decisionIds surface for Heatmap→Memory bridge", () => {
    const decisions = [
      mkDecision({ decisionId: "d-a", marketStateSummary: { regime: "TREND", direction: null, location: null, volatility: null, session: null } }),
      mkDecision({ decisionId: "d-b", marketStateSummary: { regime: "TREND", direction: null, location: null, volatility: null, session: null } }),
      mkDecision({ decisionId: "d-c", marketStateSummary: { regime: "BALANCE", direction: null, location: null, volatility: null, session: null } }),
    ];
    const vm = selectProcessLandscape({
      decisions, rowAxis: "regime", colAxis: "direction",
      metric: "sample_count", sampleThreshold: 1,
    });
    const trend = vm.cells.find((c) => c.rowKey === "TREND")!;
    expect(trend.decisionIds).toEqual(["d-a", "d-b"]);
    expect(trend.sampleCount).toBe(2);
  });

  it("overall resolution: RESOLVED when all cells resolved", () => {
    const decisions = Array.from({ length: 5 }, () => mkDecision());
    const vm = selectProcessLandscape({
      decisions, rowAxis: "regime", colAxis: "direction",
      metric: "sample_count", sampleThreshold: 3,
    });
    expect(vm.resolution).toBe("RESOLVED");
  });

  it("overall resolution: PARTIAL when some cells resolved", () => {
    const decisions = [
      // 5 TREND/LONG (resolved), 1 BALANCE/LONG (below threshold 3)
      ...Array.from({ length: 5 }, () => mkDecision({ marketStateSummary: { regime: "TREND", direction: null, location: null, volatility: null, session: null } })),
      mkDecision({ marketStateSummary: { regime: "BALANCE", direction: null, location: null, volatility: null, session: null } }),
    ];
    const vm = selectProcessLandscape({
      decisions, rowAxis: "regime", colAxis: "direction",
      metric: "rule_adherence", sampleThreshold: 3,
    });
    expect(vm.resolution).toBe("PARTIAL");
  });

  it("overall resolution: UNKNOWN when no cells resolved", () => {
    const decisions = [mkDecision(), mkDecision()]; // below threshold 3
    const vm = selectProcessLandscape({
      decisions, rowAxis: "regime", colAxis: "direction",
      metric: "rule_adherence", sampleThreshold: 3,
    });
    expect(vm.resolution).toBe("UNKNOWN");
    expect(vm.reason).toMatch(/No cells reached sample threshold/i);
  });

  it("windowStartMs/windowEndMs default to min/max of decisions when unset", () => {
    const decisions = [
      mkDecision({ capturedAt: 100 }),
      mkDecision({ capturedAt: 500 }),
      mkDecision({ capturedAt: 300 }),
    ];
    const vm = selectProcessLandscape({
      decisions, rowAxis: "regime", colAxis: "direction",
      metric: "sample_count", sampleThreshold: 1,
    });
    expect(vm.windowStartMs).toBe(100);
    expect(vm.windowEndMs).toBe(500);
  });
});

describe("selectMemoryExamplesForCell — Heatmap → Memory bridge", () => {
  it("returns only decisions whose IDs match the cell's decisionIds", () => {
    const all = [
      mkDecision({ decisionId: "d-1" }),
      mkDecision({ decisionId: "d-2" }),
      mkDecision({ decisionId: "d-3" }),
    ];
    const cell = {
      rowKey: "TREND", colKey: "LONG", rowValue: "TREND", colValue: "LONG",
      metric: "sample_count" as const, value: 2, confidence: "MEDIUM" as const,
      sampleCount: 2, decisionIds: ["d-1", "d-3"] as const,
    };
    const matched = selectMemoryExamplesForCell(cell, all);
    expect(matched.map((d) => d.decisionId)).toEqual(["d-1", "d-3"]);
  });

  it("returns empty when no matching IDs", () => {
    const cell = {
      rowKey: "x", colKey: "y", rowValue: "x", colValue: "y",
      metric: "sample_count" as const, value: 0, confidence: "UNKNOWN" as const,
      sampleCount: 0, decisionIds: [] as const,
    };
    expect(selectMemoryExamplesForCell(cell, [mkDecision()]).length).toBe(0);
  });
});
