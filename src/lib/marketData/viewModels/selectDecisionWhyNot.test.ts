/**
 * selectDecisionWhyNot tests — the WHY / WHY NOT compiler must reverse the
 * RightOfWay verdict to its concrete canonical causes, ordered by severity,
 * and never invent a reason. ACTION clears; null is honest.
 */

import { describe, it, expect } from "vitest";
import {
  selectDecisionWhyNot,
  DECISION_WHY_VERSION,
} from "./selectDecisionWhyNot";
import type { OneStoryVM } from "./selectOneStory";
import type {
  RightOfWay,
  RightOfWayReading,
  EvidenceDebt,
} from "./decisionPermissionCompiler";
import type {
  PermissionVM,
  RuleEvaluation,
} from "@/lib/traderMemory/viewModels/selectPermission";

function reading(value: RightOfWay): RightOfWayReading {
  return { value, detail: `${value} detail`, tone: "pending" };
}

function story(over: Partial<OneStoryVM> & { decision?: RightOfWayReading } = {}): OneStoryVM {
  return {
    primary: "Market is in balance.",
    contradiction: null,
    missing: null,
    decision: over.decision ?? reading("WAIT"),
    debt: null,
    ...over,
  };
}

const debt = (missing: string[], warn: string[] = [], resolved = 1, total = 9): EvidenceDebt => ({
  total,
  resolved,
  missing: missing.length,
  warn: warn.length,
  missingLabels: missing,
  warnLabels: warn,
});

function ruleEval(kind: "HARD" | "SOFT", label: string, reason: string): RuleEvaluation {
  return {
    rule: { id: `r-${label}`, kind, trigger: "DATA_QUALITY_FLOOR", label },
    engaged: true,
    reason,
    evidenceIds: [],
  };
}

function permission(engagedRules: RuleEvaluation[]): PermissionVM {
  return {
    verdict: engagedRules.some((r) => r.rule.kind === "HARD") ? "RESTRICTED" : "ALLOWED",
    evaluations: engagedRules,
    engagedRules,
    headline: "permission",
    reason: "permission reason",
    ruleCount: engagedRules.length,
    evaluatedAt: 1_000,
  };
}

describe("selectDecisionWhyNot", () => {
  it("exposes a stable version", () => {
    expect(DECISION_WHY_VERSION).toBe("wm.decision-why.v1");
  });

  it("is honest when nothing is compiled (null story)", () => {
    const vm = selectDecisionWhyNot(null);
    expect(vm.verdict).toBe("UNKNOWN");
    expect(vm.clear).toBe(false);
    expect(vm.blockers).toHaveLength(0);
    expect(vm.headline).toMatch(/not resolved right-of-way/i);
  });

  it("clears on ACTION with no blockers", () => {
    const vm = selectDecisionWhyNot(story({ decision: reading("ACTION"), debt: debt([], [], 9, 9) }));
    expect(vm.clear).toBe(true);
    expect(vm.verdict).toBe("ACTION");
    expect(vm.blockers).toHaveLength(0);
    expect(vm.headline).toMatch(/granted/i);
  });

  it("lists unpaid evidence debt as blockers and reports paid clearance", () => {
    const vm = selectDecisionWhyNot(story({ decision: reading("WAIT"), debt: debt(["regime", "direction"], [], 3, 9) }));
    const debtBlockers = vm.blockers.filter((b) => b.kind === "EVIDENCE_DEBT");
    expect(debtBlockers.map((b) => b.label)).toEqual(["regime", "direction"]);
    expect(vm.clearances).toContain("3/9 evidence nodes paid.");
  });

  it("surfaces an active contradiction as a blocker", () => {
    const vm = selectDecisionWhyNot(story({ contradiction: "sellers absorbing", decision: reading("WAIT") }));
    const c = vm.blockers.find((b) => b.kind === "CONTRADICTION");
    expect(c).toBeTruthy();
    expect(c!.detail).toBe("sellers absorbing");
  });

  it("reports no-contradiction as a clearance when none present", () => {
    const vm = selectDecisionWhyNot(story({ contradiction: null }));
    expect(vm.clearances).toContain("No active contradiction to the thesis.");
  });

  it("includes engaged HARD and SOFT trader rules as blockers", () => {
    const perm = permission([
      ruleEval("HARD", "Trustworthy market data required", "Market data quality is UNAVAILABLE."),
      ruleEval("SOFT", "CLC setup evidence required", "CLC verdict is UNKNOWN."),
    ]);
    const vm = selectDecisionWhyNot(story({ decision: reading("NO TRADE") }), perm);
    expect(vm.blockers.some((b) => b.kind === "HARD_RULE")).toBe(true);
    expect(vm.blockers.some((b) => b.kind === "SOFT_RULE")).toBe(true);
  });

  it("orders blockers by severity: HARD_RULE → CONTRADICTION → EVIDENCE_DEBT → EVIDENCE_WARN → SOFT_RULE", () => {
    const perm = permission([
      ruleEval("SOFT", "soft rule", "soft reason"),
      ruleEval("HARD", "hard rule", "hard reason"),
    ]);
    const vm = selectDecisionWhyNot(
      story({
        contradiction: "counterevidence",
        decision: reading("NO TRADE"),
        debt: debt(["regime"], ["volatility"], 1, 9),
      }),
      perm,
    );
    expect(vm.blockers.map((b) => b.kind)).toEqual([
      "HARD_RULE",
      "CONTRADICTION",
      "EVIDENCE_DEBT",
      "EVIDENCE_WARN",
      "SOFT_RULE",
    ]);
  });

  it("reports 'no rules engaged' clearance when permission present and clean", () => {
    const vm = selectDecisionWhyNot(story({ decision: reading("ACTION") }), permission([]));
    expect(vm.clearances).toContain("No trader rules engaged.");
  });

  it("falls back to oneStory.missing when there is no structured debt", () => {
    const vm = selectDecisionWhyNot(story({ missing: "order-flow confirmation", debt: null, decision: reading("WAIT") }));
    const b = vm.blockers.find((x) => x.kind === "EVIDENCE_DEBT");
    expect(b!.label).toBe("order-flow confirmation");
  });
});
