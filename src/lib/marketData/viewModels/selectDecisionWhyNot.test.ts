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
import {
  computeEvidenceDebt,
  type RightOfWay,
  type RightOfWayReading,
  type EvidenceDebt,
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
    contradictionDetectability: "COMPARABLE",
    missing: null,
    decision: over.decision ?? reading("WAIT"),
    debt: null,
    ...over,
  };
}

const debt = (missing: string[], warn: string[] = [], resolved = 1, payable = 9): EvidenceDebt => ({
  payable,
  watch: 0,
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

/**
 * `ruleCount` is the number of rules the trader CONFIGURED, which is the
 * denominator of engagement — it is deliberately a separate argument from the
 * engaged list so a fixture can express "six rules configured, none engaged"
 * (a real finding) distinctly from "no rules configured" (nothing to find).
 */
function permission(
  engagedRules: RuleEvaluation[],
  ruleCount: number = engagedRules.length,
): PermissionVM {
  return {
    verdict: engagedRules.some((r) => r.rule.kind === "HARD") ? "RESTRICTED" : "ALLOWED",
    evaluations: engagedRules,
    engagedRules,
    headline: "permission",
    reason: "permission reason",
    ruleCount,
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

  it("reports the engagement clearance WITH ITS DENOMINATOR when rules are configured and clean", () => {
    const vm = selectDecisionWhyNot(story({ decision: reading("ACTION") }), permission([], 6));
    expect(vm.clearances).toContain("0/6 trader rules engaged.");
  });

  it("falls back to oneStory.missing when there is no structured debt", () => {
    const vm = selectDecisionWhyNot(story({ missing: "order-flow confirmation", debt: null, decision: reading("WAIT") }));
    const b = vm.blockers.find((x) => x.kind === "EVIDENCE_DEBT");
    expect(b!.label).toBe("order-flow confirmation");
  });

  // canon §Phase 3 Market Canvas — WHAT WOULD INVALIDATE.
  describe("invalidators (canon §Phase 3 Market Canvas — WHAT WOULD INVALIDATE)", () => {
    it("null story reports no invalidators", () => {
      const vm = selectDecisionWhyNot(null);
      expect(vm.invalidators).toEqual([]);
    });

    it("non-ACTION verdicts report no invalidators (the blockers list is already the inverse)", () => {
      const vm = selectDecisionWhyNot(story({ decision: reading("WAIT"), debt: debt(["regime"], [], 3, 9) }));
      expect(vm.invalidators).toEqual([]);
    });

    it("ACTION verdict with no contradiction lists 'contradiction emerges' as an invalidator", () => {
      const vm = selectDecisionWhyNot(story({ decision: reading("ACTION"), debt: debt([], [], 9, 9) }));
      expect(vm.invalidators.some((s) => /contradiction emerges/i.test(s))).toBe(true);
    });

    it("ACTION verdict with all-paid debt lists 'evidence node degrades' as an invalidator", () => {
      const vm = selectDecisionWhyNot(story({ decision: reading("ACTION"), debt: debt([], [], 9, 9) }));
      expect(vm.invalidators.some((s) => /evidence node degrades/i.test(s))).toBe(true);
    });

    it("ACTION verdict with permission-present-and-clean lists 'HARD rule engages' as an invalidator", () => {
      const vm = selectDecisionWhyNot(
        story({ decision: reading("ACTION"), debt: debt([], [], 9, 9) }),
        permission([], 6),
      );
      expect(vm.invalidators.some((s) => /HARD trader rule engages/i.test(s))).toBe(true);
    });

    it("ACTION verdict without permission omits the rule-engagement invalidator (canon §Silence Is A Feature)", () => {
      const vm = selectDecisionWhyNot(story({ decision: reading("ACTION"), debt: debt([], [], 9, 9) }));
      expect(vm.invalidators.some((s) => /HARD trader rule/i.test(s))).toBe(false);
    });
  });
});

/**
 * ── A COUNT MAY NOT BE A SAMPLE SIZE ──────────────────────────────────────
 *
 * Measured live on /command-deck (2026-09-16), both in the same column:
 *
 *     WHY · DECISION EVIDENCE       6 BLOCKERS
 *     03 EVIDENCE DEBT              0 of 9 paid
 *
 * `blockers` is built one-per-label from `debt.missingLabels` /
 * `debt.warnLabels`, which `computeEvidenceDebt` caps at
 * EVIDENCE_LABEL_SAMPLE_LIMIT (3). So `blockers.length` maxed out at 6 and the
 * rail printed the CAP as if it were a measurement. Nine unpaid nodes and
 * ninety would both have read 6.
 *
 * This is the fourth head of the defect `hiddenRemainder()` was written for on
 * 2026-09-03 — the arithmetic restated by hand at a new site instead of derived
 * once. `blockerCount` is derived from the uncapped totals; surfaces print it.
 */
describe("selectDecisionWhyNot — A COUNT MAY NOT BE A SAMPLE SIZE", () => {
  // 9 unpaid nodes, exactly the live shape. `computeEvidenceDebt` caps the
  // LABELS at 3; `missing` stays 9. Built through the real compiler rather than
  // a hand-written fixture, so the cap under test is the shipped cap.
  const nineUnpaid = () =>
    computeEvidenceDebt(
      Array.from({ length: 9 }, (_, i) => ({
        key: `n${i}`,
        label: `node-${i}`,
        verdict: "UNKNOWN",
        resolution: "UNKNOWN" as const,
        narrative: "",
        indicator: "UNKNOWN" as const,
      })),
    )!;

  it("counts the 9 unpaid nodes, not the 3 labels it kept", () => {
    const d = nineUnpaid();
    expect(d.missing).toBe(9);
    expect(d.missingLabels).toHaveLength(3); // the cap, for reference

    const vm = selectDecisionWhyNot(story({ decision: reading("WAIT"), debt: d }));
    expect(vm.blockerCount).toBe(9);
    // The list stays a sample — that is what a row of detail is for.
    expect(vm.blockers).toHaveLength(3);
    // The exact live defect: the count must never equal the sample size here.
    expect(vm.blockerCount).not.toBe(vm.blockers.length);
  });

  it("counts warn nodes too — a capped warn bucket cannot hide either", () => {
    const d = computeEvidenceDebt(
      Array.from({ length: 7 }, (_, i) => ({
        key: `w${i}`,
        label: `warn-${i}`,
        verdict: "WARN",
        resolution: "UNKNOWN" as const,
        narrative: "",
        indicator: "WARN" as const,
      })),
    )!;
    const vm = selectDecisionWhyNot(story({ decision: reading("WAIT"), debt: d }));
    expect(d.warn).toBe(7);
    expect(vm.blockerCount).toBe(7);
    expect(vm.blockers).toHaveLength(3);
  });

  /**
   * The Orkin guard. The bug is not "missingLabels" and not "warnLabels" — it
   * is counting ANY list that a cap can shorten. So the invariant is asserted
   * across the cross-product of both buckets, at and either side of the cap,
   * rather than at the one shape that was observed live. A fifth head cannot
   * come back through the neighbour.
   */
  it("blockerCount always equals the true total across the missing × warn grid", () => {
    for (const nMissing of [0, 1, 3, 4, 9]) {
      for (const nWarn of [0, 1, 3, 4, 9]) {
        const nodes = [
          ...Array.from({ length: nMissing }, (_, i) => ({
            key: `m${i}`, label: `m-${i}`, verdict: "UNKNOWN",
            resolution: "UNKNOWN" as const, narrative: "", indicator: "UNKNOWN" as const,
          })),
          ...Array.from({ length: nWarn }, (_, i) => ({
            key: `w${i}`, label: `w-${i}`, verdict: "WARN",
            resolution: "UNKNOWN" as const, narrative: "", indicator: "WARN" as const,
          })),
        ];
        const d = computeEvidenceDebt(nodes);
        const label = `missing=${nMissing} warn=${nWarn}`;
        if (!d) {
          expect(nMissing + nWarn, label).toBe(0);
          continue;
        }
        const vm = selectDecisionWhyNot(story({ decision: reading("WAIT"), debt: d }));
        expect(vm.blockerCount, label).toBe(nMissing + nWarn);
        // The count is never SHORT of what is displayed, either — an
        // under-count would be the same lie pointing the other way.
        expect(vm.blockerCount, label).toBeGreaterThanOrEqual(vm.blockers.length);
      }
    }
  });

  it("adds engaged rules and an active contradiction to the same total", () => {
    const vm = selectDecisionWhyNot(
      story({
        decision: reading("NO TRADE"),
        contradiction: "Direction opposes structure.",
        debt: nineUnpaid(),
      }),
      permission([ruleEval("HARD", "Daily loss cap", "hit"), ruleEval("SOFT", "Low volume", "thin")], 6),
    );
    // 1 HARD + 1 contradiction + 9 unpaid + 1 SOFT.
    expect(vm.blockerCount).toBe(12);
  });

  it("agrees with the list exactly when nothing was capped", () => {
    const d = computeEvidenceDebt([
      { key: "a", label: "regime", verdict: "UNKNOWN", resolution: "UNKNOWN", narrative: "", indicator: "UNKNOWN" },
      { key: "b", label: "direction", verdict: "UNKNOWN", resolution: "UNKNOWN", narrative: "", indicator: "UNKNOWN" },
    ])!;
    const vm = selectDecisionWhyNot(story({ decision: reading("WAIT"), debt: d }));
    expect(vm.blockerCount).toBe(2);
    expect(vm.blockerCount).toBe(vm.blockers.length);
  });

  it("is 0 when nothing compiled — a null story cannot claim blockers", () => {
    expect(selectDecisionWhyNot(null).blockerCount).toBe(0);
  });

  it("is 0 on a clean ACTION verdict", () => {
    const vm = selectDecisionWhyNot(story({ decision: reading("ACTION"), debt: debt([], [], 9, 9) }));
    expect(vm.blockerCount).toBe(0);
    expect(vm.blockers).toEqual([]);
  });
});

/**
 * THE LEDGER IS PUBLISHED, NOT RE-COMPUTED.
 *
 * "X/N evidence nodes paid." goes into `clearances` — the affirmative column.
 * The VM now also carries the SHAPE of the same debt so the unpaid remainder
 * has somewhere to be seen. §24: one answer per question — the ledger is
 * partitioned from the very `oneStory.debt` the sentence is compiled from, and
 * is never derived a second way.
 */
describe("selectDecisionWhyNot — evidenceLedger", () => {
  it("publishes a ledger built from the same debt as the sentence", () => {
    const d = debt(["regime", "direction"], ["volume"], 6, 9);
    const vm = selectDecisionWhyNot(story({ decision: reading("WAIT"), debt: d }));
    expect(vm.evidenceLedger).not.toBeNull();
    expect(vm.evidenceLedger!.payable).toBe(9);
    expect(vm.evidenceLedger!.resolved).toBe(6);
    expect(vm.evidenceLedger!.unpaid).toBe(3);
    expect(vm.evidenceLedger!.marks).toHaveLength(9);
  });

  it("agrees with the clearance sentence it is drawn beside", () => {
    // If the strip and the sentence could disagree, the picture would be the
    // more persuasive of the two and the wrong one.
    const d = debt([], [], 9, 9);
    const vm = selectDecisionWhyNot(story({ decision: reading("ACTION"), debt: d }));
    const sentence = vm.clearances.find((c) => c.includes("evidence nodes paid"));
    expect(sentence).toBe("9/9 evidence nodes paid.");
    expect(vm.evidenceLedger!.resolved).toBe(9);
    expect(vm.evidenceLedger!.payable).toBe(9);
    expect(vm.evidenceLedger!.unpaid).toBe(0);
  });

  it("is null when nothing compiled — an absent story owes no ledger", () => {
    expect(selectDecisionWhyNot(null).evidenceLedger).toBeNull();
  });

  it("is null when the chain carries no debt at all", () => {
    expect(selectDecisionWhyNot(story({ decision: reading("WAIT") })).evidenceLedger).toBeNull();
  });
});
