/** §26 coverage: every management behaviour the order names has one factual class, and fires on its sample. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { parseManagementCondition } from "./managementPlan";
import { behaviourCases, MANAGEMENT_BEHAVIOUR_COVERAGE } from "./managementBehaviours";
import { DEPARTURES } from "./planAdherence";
import { lessonForFinding } from "./planLoop";
import { classifyPlanVsActual, DEVIATION_LABEL, FINDING_DIMENSION, INTERFERENCE_MIN, type TradeActuals } from "./planVsActual";
import { freezePlanSnapshot } from "./managementPlan";

const FORBIDDEN = /\b(impulsive\w*|afraid|fear\w*|scared|panic\w*|greed\w*|impatien\w*|revenge|fomo|anxious|nervous|undisciplined|should have|failed|failure|bad trade|mistake)\b/i;
const text = (r: ReturnType<typeof classifyPlanVsActual>) => r.findings.flatMap(f => [f.label, f.sentence, f.rule ?? "", ...f.facts.map(x => x.text)]).join(" \n ");

describe("§26 — the order's eleven management behaviours, each a factual class", () => {
  it("coverage: 11 behaviours → 11 distinct classes, every class labelled, placed in a Review row and given a lesson", () => {
    expect(MANAGEMENT_BEHAVIOUR_COVERAGE).toHaveLength(11);
    expect(new Set(MANAGEMENT_BEHAVIOUR_COVERAGE.map(c => c.classId)).size).toBe(11);
    for (const c of MANAGEMENT_BEHAVIOUR_COVERAGE) {
      expect(DEVIATION_LABEL[c.classId], c.classId).toBeTruthy();
      expect(FINDING_DIMENSION[c.classId], c.classId).toBeTruthy();
      expect(lessonForFinding(c.classId), c.classId).not.toBeNull();
    }
    expect(DEVIATION_LABEL.MOVED_TARGET).toBe("Moved target without plan basis");
    expect(MANAGEMENT_BEHAVIOUR_COVERAGE.map(c => c.behaviour).join(" ")).not.toMatch(FORBIDDEN);
  });

  it("each sample trade, through the real classifier, names its behaviour", () => {
    const cases = behaviourCases();
    expect(cases).toHaveLength(11);
    for (const c of cases) expect(c.result.findings.map(f => f.id), c.behaviour).toContain(c.expect);
  });

  it("the words: factual, second person, no emotion and no 'impulsively' — in every finding of every sample", () => {
    const all = behaviourCases().map(c => text(c.result)).join("\n");
    expect(all.length).toBeGreaterThan(3_000);
    expect(all).not.toMatch(FORBIDDEN);
  });

  it("the departures count against adherence; the by-plan behaviours do not", () => {
    for (const id of ["TOOK_PROFIT_BEFORE_PLANNED_CONDITION", "INTERFERED_REPEATEDLY", "MOVED_TARGET"] as const) expect(DEPARTURES).toContain(id);
    for (const id of ["REDUCED_PER_PLAN", "MOVED_TO_BREAKEVEN_PER_RULE", "WALKED_AWAY_AFTER_PROTECTION_PER_PLAN", "PLAN_FOLLOWED"] as const) expect(DEPARTURES).not.toContain(id);
  });

  const cs = () => Object.fromEntries(behaviourCases().map(c => [c.expect, c.result]));
  it("took profit: the exit's gain and R are stated; a loss before the condition is NOT 'took profit'", () => {
    const r = cs().TOOK_PROFIT_BEFORE_PLANNED_CONDITION;
    expect(r.findings.find(f => f.id === "TOOK_PROFIT_BEFORE_PLANNED_CONDITION")!.sentence).toBe("You closed 1.9 (+0.95R) in your favour at 101.9, before the target 104 or the invalidation 98 recorded in your plan had printed.");
    expect(cs().EXITED_BEFORE_PLANNED_CONDITION.findings.map(f => f.id)).not.toContain("TOOK_PROFIT_BEFORE_PLANNED_CONDITION");
  });
  it("reduced: a partial at the target with a recorded reduce condition; the same partial WITHOUT the condition is not 'reduced'", () => {
    const r = cs().REDUCED_PER_PLAN;
    expect(r.findings.find(f => f.id === "REDUCED_PER_PLAN")!.sentence).toBe("You reduced 1 at 104, at or beyond the target 104; your plan recorded “reduce half at target 1”.");
    const plain = classifyPlanVsActual({ plan: freezePlanSnapshot({ decisionId: "x", frozenAt: "TICKET_SEND", atMs: 0, source: "t", plan: { direction: "LONG", entryPx: 100, stopPx: 98, targetPx: 104 } }), actuals: { direction: "LONG", entry: { atMs: 1, px: 100, qty: 2 }, exits: [{ atMs: 2, px: 104, qty: 1 }, { atMs: 3, px: 105, qty: 1 }], adds: [], stopMoves: [], targetMoves: [], source: "t" } as TradeActuals });
    expect(plain.findings.map(f => f.id)).not.toContain("REDUCED_PER_PLAN");
  });
  it("breakeven by rule names the R that printed first; too early stays 'without plan basis'", () => {
    expect(cs().MOVED_TO_BREAKEVEN_PER_RULE.findings.find(f => f.id === "MOVED_TO_BREAKEVEN_PER_RULE")!.sentence).toMatch(/^You moved the stop to about breakeven \(100\) at .+, after \+1\.15R had printed; your plan allowed it after \+1R\.$/);
    expect(cs().MOVED_TO_BREAKEVEN_PER_RULE.findings.map(f => f.id)).not.toContain("WALKED_AWAY_AFTER_PROTECTION_PER_PLAN");   // no walk-away condition recorded
  });
  it("walked away: only with the recorded condition, protection by rule, and NOTHING touched after", () => {
    const r = cs().WALKED_AWAY_AFTER_PROTECTION_PER_PLAN;
    expect(r.findings.find(f => f.id === "WALKED_AWAY_AFTER_PROTECTION_PER_PLAN")!.sentence).toMatch(/^After the stop reached 100 at .+, no order was changed and nothing was added until the exit at 104 \(.+\)\.$/);
    expect(parseManagementCondition("walk away once the stop is protected")?.kind).toBe("WALK_AWAY_AFTER_PROTECTION");
    expect(parseManagementCondition("move to breakeven after +1R")?.kind).toBe("BREAKEVEN_AFTER_R");
  });
  it(`changed orders repeatedly: ${INTERFERENCE_MIN} unbased changes fire it, ${INTERFERENCE_MIN - 1} do not`, () => {
    expect(cs().INTERFERED_REPEATEDLY.findings.find(f => f.id === "INTERFERED_REPEATEDLY")!.sentence).toBe("3 order changes during this hold had no basis in your plan (2 stop, 1 target).");
    expect(cs().MOVED_STOP_WITHOUT_PLAN_BASIS.findings.map(f => f.id)).not.toContain("INTERFERED_REPEATEDLY");
  });
  it("the planVsActual source never says 'impulsive'", () => {
    const src = readFileSync(path.resolve(__dirname, "planVsActual.ts"), "utf8") + readFileSync(path.resolve(__dirname, "managementBehaviours.ts"), "utf8");
    expect(src.length).toBeGreaterThan(10_000);
    expect(src.replace(/"impulsively" and every emotion word are never used/, "")).not.toMatch(/impulsiv/i);
  });
});
