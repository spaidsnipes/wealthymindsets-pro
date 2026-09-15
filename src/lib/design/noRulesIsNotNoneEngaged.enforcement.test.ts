/**
 * SENTINEL — "no rules configured" is not "no rules engaged".
 *
 * H1 shape 1 (fabricated absence), the Orkin NEST of dispatch 2368. The very
 * same function, two branches down, made the very same mistake against a
 * different subject:
 *
 *   if (engaged.length === 0 && permission) {
 *     clearances.push("No trader rules engaged.");
 *   }
 *
 * `clearances` is documented on `DecisionWhyVM` as *"What IS satisfied — the
 * affirmative side of the ledger."* With ZERO rules configured that condition
 * is VACUOUSLY true: nothing could have engaged, so nothing engaging is not a
 * finding. It is the absence of a SUBJECT reported as the absence of an
 * OBJECTION — exactly the shape sealed in 2368.
 *
 * `selectPermission` reaches `ruleCount: 0` by an early return whose own
 * headline is "No trading rules configured." — so the state is reachable and
 * the engine already knows the truth. Only this consumer was guessing.
 *
 * THE CURE has two halves, because the denominator law cuts both ways:
 *   1. ruleCount === 0            → emit NOTHING (no subject to affirm about).
 *   2. ruleCount > 0, none engaged → emit the count WITH ITS DENOMINATOR,
 *      "0/6 trader rules engaged.", matching the house form already used by
 *      the Steward panel (`N/M engaged`) and by the evidence-debt clearance
 *      two branches up (`N/M evidence nodes paid.`).
 *
 * The bare sentence "No trader rules engaged." is now unprintable in either
 * state: under (1) because there is no subject, under (2) because a count must
 * state its denominator.
 *
 * LABEL-NOT-MODEL: no rule evaluation changed, no rule invented, no verdict
 * moved. Only which sentences WM is entitled to print.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { selectDecisionWhyNot } from "@/lib/marketData/viewModels/selectDecisionWhyNot";
import type { OneStoryVM } from "@/lib/marketData/viewModels/selectOneStory";
import type { RightOfWayReading } from "@/lib/marketData/viewModels/decisionPermissionCompiler";
import type {
  PermissionVM,
  RuleEvaluation,
} from "@/lib/traderMemory/viewModels/selectPermission";

const OLD_SENTENCE = "No trader rules engaged.";

const reading = (value: RightOfWayReading["value"] = "ACTION"): RightOfWayReading => ({
  value,
  detail: "test",
  tone: "pending",
});

function oneStory(over: Partial<OneStoryVM> = {}): OneStoryVM {
  return {
    primary: "Market is in balance around a fair-value zone.",
    contradiction: null,
    contradictionDetectability: "COMPARABLE",
    missing: null,
    decision: reading(),
    debt: null,
    ...over,
  };
}

function ruleEval(kind: "HARD" | "SOFT", label: string): RuleEvaluation {
  return {
    rule: { id: `r-${label}`, kind, trigger: "DATA_QUALITY_FLOOR", label },
    engaged: true,
    reason: `${label} engaged`,
    evidenceIds: [],
  } as unknown as RuleEvaluation;
}

/** `ruleCount` is the CONFIGURED count — the denominator of engagement. */
function permission(engagedRules: RuleEvaluation[], ruleCount: number): PermissionVM {
  return {
    verdict: "ALLOWED",
    evaluations: engagedRules,
    engagedRules,
    headline: "permission",
    reason: "permission reason",
    ruleCount,
    evaluatedAt: 1_000,
  } as unknown as PermissionVM;
}

describe("SENTINEL — no rules configured is not no rules engaged", () => {
  // ---------------------------------------------------------------- THE DEFECT

  it("THE DEFECT: with ZERO rules configured, no engagement clearance is printed", () => {
    const vm = selectDecisionWhyNot(oneStory(), permission([], 0));
    expect(vm.clearances).not.toContain(OLD_SENTENCE);
    // And it must not smuggle the same claim in under different wording.
    expect(vm.clearances.some((c) => /rule/i.test(c))).toBe(false);
  });

  it("THE DEFECT: the bare denominator-less sentence is unprintable in EVERY state", () => {
    const states: PermissionVM[] = [
      permission([], 0),
      permission([], 6),
      permission([ruleEval("HARD", "data floor")], 6),
      permission([ruleEval("SOFT", "clc")], 2),
    ];
    for (const perm of states) {
      const vm = selectDecisionWhyNot(oneStory(), perm);
      expect(vm.clearances).not.toContain(OLD_SENTENCE);
    }
  });

  it("THE DEFECT: with ZERO rules configured, no HARD-rule invalidator is named", () => {
    // An invalidator is documented as an observation that, if it became true
    // RIGHT NOW, would flip the verdict. With no rules configured no HARD rule
    // can engage right now — naming it invents a tripwire that does not exist.
    const vm = selectDecisionWhyNot(oneStory({ decision: reading("ACTION") }), permission([], 0));
    expect(vm.invalidators.some((s) => /HARD trader rule/i.test(s))).toBe(false);
  });

  it("THE DEFECT: the clearance is not pushed from a bare presence check", () => {
    // Source-level lock. The cure is a GATE on the denominator; a refactor that
    // restored `engaged.length === 0 && permission` would silently revive the
    // overclaim, and every behavioural test that uses a configured fixture
    // would still pass.
    const src = readFileSync(
      join(process.cwd(), "src/lib/marketData/viewModels/selectDecisionWhyNot.ts"),
      "utf8",
    );
    expect(src).toMatch(/permission\.ruleCount > 0/);
    expect(src).not.toMatch(/clearances\.push\("No trader rules engaged/);
  });

  // ------------------------------------------------------- THE DENOMINATOR LAW

  it("states the denominator when rules ARE configured and none engaged", () => {
    const vm = selectDecisionWhyNot(oneStory(), permission([], 6));
    expect(vm.clearances).toContain("0/6 trader rules engaged.");
  });

  it("the denominator is the CONFIGURED count, not the engaged count", () => {
    // The whole defect was reading a denominator off the wrong list. A fixture
    // with 6 configured and 0 engaged must say 6, never 0/0.
    const vm = selectDecisionWhyNot(oneStory(), permission([], 6));
    expect(vm.clearances).not.toContain("0/0 trader rules engaged.");
  });

  // --------------------------------------------------------- OVER-CORRECTIONS

  it("OVER-CORRECTION GUARD: engaged rules are STILL blockers when ruleCount is 0", () => {
    // Finding an engaged rule PROVES rules exist; a denominator claim can never
    // suppress an observation. Same guard as 2367 and 2368.
    const vm = selectDecisionWhyNot(
      oneStory({ decision: reading("NO TRADE") }),
      permission([ruleEval("HARD", "data floor")], 0),
    );
    expect(vm.blockers.some((b) => b.kind === "HARD_RULE")).toBe(true);
  });

  it("OVER-CORRECTION GUARD: a REAL clean rule set still earns its clearance", () => {
    // The cure must not make the affirmative unprintable. Six rules configured
    // and none engaged IS a finding the trader is entitled to read.
    const vm = selectDecisionWhyNot(oneStory(), permission([], 6));
    expect(vm.clearances.length).toBeGreaterThan(0);
  });

  it("OVER-CORRECTION GUARD: the HARD-rule invalidator survives when rules ARE configured", () => {
    const vm = selectDecisionWhyNot(
      oneStory({ decision: reading("ACTION") }),
      permission([], 6),
    );
    expect(vm.invalidators.some((s) => /HARD trader rule engages/i.test(s))).toBe(true);
  });

  it("OVER-CORRECTION GUARD: the thesis clearance from 2368 is untouched", () => {
    const vm = selectDecisionWhyNot(oneStory(), permission([], 0));
    expect(vm.clearances).toContain("No active contradiction to the thesis.");
  });

  it("OVER-CORRECTION GUARD: absent permission still emits nothing, as before", () => {
    // Undefined permission was never the defect — it already emitted nothing.
    const vm = selectDecisionWhyNot(oneStory());
    expect(vm.clearances.some((c) => /trader rules engaged/i.test(c))).toBe(false);
  });
});
