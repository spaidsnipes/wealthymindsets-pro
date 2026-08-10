import { describe, expect, it } from "vitest";
import {
  createDecisionMemoryAmendment,
  sealDecisionMemory,
  validateDecisionMemory,
  type DecisionMemoryInput,
} from "./decisionMemory";

const unknown = (reason: string) => ({
  state: "UNKNOWN" as const,
  confidence: null,
  evidence: [],
  unknownReason: reason,
});

const waitDecision = (overrides: Partial<DecisionMemoryInput> = {}): DecisionMemoryInput => ({
  decisionMemoryId: "dm-btc-001",
  decidedAt: 10_000,
  availableAt: 10_010,
  action: "WAIT",
  symbol: "BTC",
  session: "24X7",
  timeframeContext: ["5m", "1h"],
  marketStateSnapshotId: "ms-btc-001",
  marketStateCapturedAt: 9_900,
  marketStateAvailableAt: 9_910,
  direction: unknown("Structure evidence is incomplete."),
  location: unknown("No resolved structural barrier."),
  aggression: unknown("No certified trade channel."),
  regime: null,
  playbookId: null,
  playbookVersion: null,
  thesis: "Wait until location and aggression are observable.",
  trigger: null,
  contradictions: [],
  unknowns: ["Location", "Aggression"],
  risk: {
    structuralInvalidation: null,
    plannedStop: null,
    plannedTarget: null,
    availableR: { status: "UNKNOWN", reason: "Structural risk is unresolved." },
    plannedPosition: null,
    plannedAccountRisk: null,
    managementRules: [],
  },
  dataQuality: "PARTIAL",
  orderFlowCapability: "UNAVAILABLE",
  userDecision: "WAIT",
  ...overrides,
});

describe("sealed Decision Memory", () => {
  it("seals a truthful WAIT without manufacturing risk geometry", () => {
    const memory = sealDecisionMemory(waitDecision(), 10_020);
    expect(memory).toMatchObject({ schemaVersion: "wm.decision-memory.v1", sealed: true, action: "WAIT" });
    expect(Object.isFrozen(memory)).toBe(true);
    expect(Object.isFrozen(memory.risk)).toBe(true);
  });

  it("rejects ENTER without structural invalidation, stop, and target", () => {
    const errors = validateDecisionMemory(waitDecision({ action: "ENTER" }));
    expect(errors.join(" ")).toMatch(/structural invalidation/i);
    expect(errors.join(" ")).toMatch(/planned target/i);
  });

  it("seals ENTER only when evidence and risk geometry are resolved", () => {
    const evidence = (evidenceId: string) => ({
      state: "SUPPORTED" as const,
      confidence: 0.75,
      evidence: [{
        evidenceId,
        observedAt: 9_800,
        availableAt: 9_900,
        source: "canonical-market-state",
        fidelity: "OBSERVED" as const,
        summary: "Evidence available before the decision cutoff.",
      }],
    });
    const memory = sealDecisionMemory(waitDecision({
      action: "ENTER",
      direction: evidence("direction-1"),
      location: evidence("location-1"),
      aggression: evidence("aggression-1"),
      trigger: "Acceptance above the declared level.",
      risk: {
        structuralInvalidation: 64_500,
        plannedStop: 64_450,
        plannedTarget: 66_000,
        availableR: { status: "AVAILABLE", value: 2.5, barrier: 66_000, estimatedCosts: 5 },
        plannedPosition: 0.1,
        plannedAccountRisk: 155,
        managementRules: ["Exit if structural invalidation is confirmed."],
      },
      userDecision: "ENTER",
    }), 10_020);
    expect(memory.action).toBe("ENTER");
    expect(memory.risk.availableR.status).toBe("AVAILABLE");
  });

  it("rejects evidence that was unavailable when the decision was made", () => {
    const input = waitDecision({
      direction: {
        state: "SUPPORTED",
        confidence: 0.7,
        evidence: [{
          evidenceId: "future-1",
          observedAt: 10_005,
          availableAt: 10_011,
          source: "market-state",
          fidelity: "OBSERVED",
          summary: "Arrived after the decision cutoff.",
        }],
      },
    });
    expect(validateDecisionMemory(input).join(" ")).toMatch(/not available at decision time/i);
  });

  it("requires explicit reasons when evidence or Available R is unknown", () => {
    const input = waitDecision({
      aggression: { state: "UNKNOWN", confidence: null, evidence: [] },
      risk: { ...waitDecision().risk, availableR: { status: "UNKNOWN", reason: "" } },
    });
    expect(validateDecisionMemory(input).join(" ")).toMatch(/UNKNOWN requires an explanation/i);
    expect(validateDecisionMemory(input).join(" ")).toMatch(/requires an explanation/i);
  });

  it("appends a frozen amendment without mutating the original", () => {
    const memory = sealDecisionMemory(waitDecision(), 10_020);
    const amendment = createDecisionMemoryAmendment(memory, {
      amendmentId: "dma-001",
      createdAt: 10_030,
      author: "USER",
      reason: "Clarify wording",
      note: "The original decision remains WAIT.",
    });
    expect(amendment).toMatchObject({ decisionMemoryId: memory.decisionMemoryId, schemaVersion: "wm.decision-amendment.v1" });
    expect(memory).not.toHaveProperty("amendments");
    expect(Object.isFrozen(amendment)).toBe(true);
  });
});
