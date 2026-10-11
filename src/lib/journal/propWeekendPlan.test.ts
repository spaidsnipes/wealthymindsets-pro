import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EMPTY_PROP_INPUTS, propSampleInputs, readPropEvaluation } from "./propEvaluation";
import { PROP_PLAN_NO_TARGET_LINE, propWeekendPlan } from "./propWeekendPlan";

/** SUNDAY STUDY · MONDAY PLAN (Founder G19 §19): process steps from the desk's own state, never a target. */
describe("the plan reads the desk", () => {
  it("an empty desk owes every Sunday check and still states the rules", () => {
    const p = propWeekendPlan(EMPTY_PROP_INPUTS, readPropEvaluation(EMPTY_PROP_INPUTS));
    expect(p.sunday.find(s => s.id === "read-back")).toMatchObject({ state: "OPEN" });
    expect(p.sunday.find(s => s.id === "contracts")).toMatchObject({ state: "OPEN", detail: "not entered" });
    expect(p.openCount).toBeGreaterThanOrEqual(4);
    expect(p.monday.map(s => s.id)).toEqual(["prep", "size", "stop-day", "no-trade", "after"]);
    expect(p.monday.every(s => s.state === "RULE")).toBe(true);
  });
  it("the sample account restates the engine's arithmetic, nothing more", () => {
    const inputs = propSampleInputs();
    const r = readPropEvaluation(inputs);
    const p = propWeekendPlan(inputs, r);
    const arith = p.sunday.find(s => s.id === "arithmetic")!;
    expect(arith.state).toBe("DONE");
    expect(r.requiredNetProfitCents.known && arith.detail).toContain("required $3,333.34");
    expect(p.monday.find(s => s.id === "size")!.text).toContain(`(${inputs.contractLimit})`);
  });
});

describe("no step is a target (the desk / Morning Prep law)", () => {
  it("no amount is worded as something to make on a day; the plan line says so", () => {
    const inputs = propSampleInputs();
    const p = propWeekendPlan(inputs, readPropEvaluation(inputs));
    for (const s of [...p.sunday, ...p.monday]) {
      const words = `${s.text} ${s.detail ?? ""}`;
      expect(words, words).not.toMatch(/today'?s? (target|goal|quota)|to make today|need(ed)? today|\$[\d,.]+ today|make \$|per day target|pass (in|by)|guarantee/i);
    }
    expect(PROP_PLAN_NO_TARGET_LINE).toContain("no day has to make any amount");
  });
  it("the desk renders the fold with the line and each step's state", () => {
    const desk = readFileSync(path.join(process.cwd(), "src/components/journal/PropEvaluationDesk.tsx"), "utf8");
    expect(desk.length).toBeGreaterThan(5_000);
    expect(desk).toContain('title="Sunday study · Monday plan"');
    expect(desk).toContain('data-testid="prop-plan-line"');
    expect(desk).toContain('data-testid="prop-plan-step" data-step={st.id} data-state={st.state}');
  });
});
