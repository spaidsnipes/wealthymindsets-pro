/**
 * Focused tests for selectPermission — Founder decision-chain 'Permission'
 * node. Enforces:
 *   - Human sovereignty (no DENIED / BLOCKED verdict exists)
 *   - Hard vs soft rule distinction
 *   - Correct verdict ordering
 *   - Deterministic (nowMs required)
 *   - Explicit UNKNOWN when insufficient inputs
 */
import { describe, it, expect } from "vitest";
import {
  selectPermission,
  defaultFounderRules,
  type PermissionInput,
  type RuleConfiguration,
} from "../selectPermission";
import type { DecisionMemorySnapshot } from "../selectProcessLandscape";

const NOW = 1_800_000_000_000;
const base = (overrides: Partial<PermissionInput> = {}): PermissionInput => ({
  ownerId: "owner-1",
  sessionIdentity: "session-1",
  nowMs: NOW,
  rules: [],
  sessionDecisions: [],
  ...overrides,
});

const loss = (offsetMs: number, id = "l"): DecisionMemorySnapshot => ({
  decisionId: id,
  capturedAt: NOW - offsetMs - 60_000,
  ownerId: "owner-1",
  sessionIdentity: "session-1",
  marketStateSummary: { regime: null, direction: null, location: null, volatility: null, session: null },
  playbookId: "p", playbookVersion: 1,
  plan: { action: "ENTER_LONG", expectedR: 2 },
  ruleAdherenceAtDecision: true,
  externalInfluenceFlagged: false,
  tradeNumberInSession: 1,
  outcome: { closedAt: NOW - offsetMs, realizedR: -1, reason: "STOP" },
});

const trade = (offsetMs: number, id = "t"): DecisionMemorySnapshot => ({
  decisionId: id,
  capturedAt: NOW - offsetMs - 60_000,
  ownerId: "owner-1",
  sessionIdentity: "session-1",
  marketStateSummary: { regime: null, direction: null, location: null, volatility: null, session: null },
  playbookId: "p", playbookVersion: 1,
  plan: { action: "ENTER_LONG", expectedR: 2 },
  ruleAdherenceAtDecision: true,
  externalInfluenceFlagged: false,
  tradeNumberInSession: 1,
  outcome: { closedAt: NOW - offsetMs, realizedR: 1, reason: "TARGET" },
});

describe("selectPermission — verdict scale", () => {
  it("UNKNOWN when no rules configured", () => {
    const r = selectPermission(base());
    expect(r.verdict).toBe("UNKNOWN");
    expect(r.reason).toMatch(/no trading rules/i);
  });

  it("NEVER emits DENIED / BLOCKED — human sovereignty (§10.14)", () => {
    const rules: readonly RuleConfiguration[] = [
      { id: "mt", kind: "HARD", trigger: "MAX_TRADES_PER_SESSION", label: "Max trades", threshold: 1 },
    ];
    const r = selectPermission(base({
      rules,
      sessionDecisions: [trade(60_000), trade(30_000, "t2")],
    }));
    expect(["ALLOWED", "ADVISORY", "RESTRICTED", "UNKNOWN"]).toContain(r.verdict);
    // Not DENIED/BLOCKED — those verdicts don't exist in the type
  });
});

describe("Hard vs soft rule distinction", () => {
  it("hard rule engaged → RESTRICTED with override language", () => {
    const rules: readonly RuleConfiguration[] = [
      { id: "ml", kind: "HARD", trigger: "MAX_LOSSES_PER_SESSION", label: "Max losses", threshold: 2 },
    ];
    const r = selectPermission(base({
      rules,
      sessionDecisions: [loss(60_000, "l1"), loss(30_000, "l2")],
    }));
    expect(r.verdict).toBe("RESTRICTED");
    expect(r.reason).toMatch(/override capacity/i);
    expect(r.reason).not.toMatch(/gate|block|deny/i);
  });

  it("soft rule engaged → ADVISORY (not RESTRICTED)", () => {
    const rules: readonly RuleConfiguration[] = [
      { id: "cd", kind: "SOFT", trigger: "REENTRY_COOLDOWN", label: "Cooldown", windowMs: 5 * 60_000 },
    ];
    const r = selectPermission(base({
      rules,
      sessionDecisions: [trade(60_000)], // exit 1 min ago, inside 5 min cooldown
    }));
    expect(r.verdict).toBe("ADVISORY");
  });

  it("hard rule wins over soft (RESTRICTED overrides ADVISORY)", () => {
    const rules: readonly RuleConfiguration[] = [
      { id: "ml", kind: "HARD", trigger: "MAX_LOSSES_PER_SESSION", label: "Max losses", threshold: 1 },
      { id: "cd", kind: "SOFT", trigger: "REENTRY_COOLDOWN", label: "Cooldown", windowMs: 5 * 60_000 },
    ];
    const r = selectPermission(base({
      rules,
      sessionDecisions: [loss(60_000)],
    }));
    expect(r.verdict).toBe("RESTRICTED");
  });

  it("no rules engaged → ALLOWED", () => {
    const rules: readonly RuleConfiguration[] = [
      { id: "mt", kind: "HARD", trigger: "MAX_TRADES_PER_SESSION", label: "Max trades", threshold: 5 },
    ];
    const r = selectPermission(base({ rules, sessionDecisions: [] }));
    expect(r.verdict).toBe("ALLOWED");
  });
});

describe("Individual rule evaluators", () => {
  it("MAX_DAILY_DRAWDOWN engages when cum R <= threshold", () => {
    const rules: readonly RuleConfiguration[] = [
      { id: "dd", kind: "HARD", trigger: "MAX_DAILY_DRAWDOWN", label: "Drawdown", threshold: -2 },
    ];
    const r = selectPermission(base({ rules, cumulativeSessionR: -2.5 }));
    expect(r.engagedRules).toHaveLength(1);
  });

  it("MIN_RR does NOT engage when availableR is UNKNOWN — never gates on missing data", () => {
    const rules: readonly RuleConfiguration[] = [
      { id: "rr", kind: "SOFT", trigger: "MIN_RR", label: "Min R:R", threshold: 2 },
    ];
    const r = selectPermission(base({
      rules,
      availableR: {
        resolution: "UNKNOWN",
        conservativeR: "UNKNOWN",
        optimisticR: "UNKNOWN",
        riskPerUnit: "UNKNOWN",
        costDragR: "UNKNOWN",
        destination: null,
        missingInputs: ["entryPrice"],
        warnings: [],
      },
    }));
    expect(r.engagedRules).toHaveLength(0);
    expect(r.evaluations[0].reason).toMatch(/cannot evaluate|unresolved/i);
  });

  it("DATA_QUALITY_FLOOR engages on STALE / UNAVAILABLE", () => {
    const rules: readonly RuleConfiguration[] = [
      { id: "dq", kind: "HARD", trigger: "DATA_QUALITY_FLOOR", label: "Data quality" },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stale = selectPermission(base({ rules, marketState: { qualityState: "STALE" } as any }));
    expect(stale.engagedRules).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const live = selectPermission(base({ rules, marketState: { qualityState: "LIVE" } as any }));
    expect(live.engagedRules).toHaveLength(0);
  });

  it("REENTRY_COOLDOWN respects nowMs (deterministic)", () => {
    const rules: readonly RuleConfiguration[] = [
      { id: "cd", kind: "SOFT", trigger: "REENTRY_COOLDOWN", label: "Cooldown", windowMs: 60_000 },
    ];
    // Exit 30s ago — inside 60s cooldown
    const inside = selectPermission(base({ rules, sessionDecisions: [trade(30_000)] }));
    expect(inside.engagedRules).toHaveLength(1);
    // Exit 90s ago — outside
    const outside = selectPermission(base({ rules, sessionDecisions: [trade(90_000)] }));
    expect(outside.engagedRules).toHaveLength(0);
  });
});

describe("defaultFounderRules preset", () => {
  it("returns 8 rules covering the full chain", () => {
    const rules = defaultFounderRules();
    expect(rules).toHaveLength(8);
    const triggers = rules.map(r => r.trigger);
    expect(triggers).toContain("MAX_TRADES_PER_SESSION");
    expect(triggers).toContain("MAX_LOSSES_PER_SESSION");
    expect(triggers).toContain("MAX_DAILY_DRAWDOWN");
    expect(triggers).toContain("DATA_QUALITY_FLOOR");
  });

  it("evaluates cleanly with no session activity → ALLOWED", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = selectPermission(base({ rules: defaultFounderRules(), marketState: { qualityState: "LIVE" } as any }));
    expect(r.verdict).toBe("ALLOWED");
  });
});

describe("Determinism", () => {
  it("identical input → identical output", () => {
    const input = base({
      rules: defaultFounderRules(),
      sessionDecisions: [loss(60_000), trade(30_000, "t2")],
      cumulativeSessionR: -0.5,
    });
    const r1 = selectPermission(input);
    const r2 = selectPermission(input);
    expect(r1.verdict).toBe(r2.verdict);
    expect(r1.evaluatedAt).toBe(r2.evaluatedAt);
  });
});
