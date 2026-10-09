import { describe, expect, it } from "vitest";
import type { JournalFvgReference } from "./fvgDecisionReference";
import { FVG_STUDY_GROUPS, fvgStudyGroupsOf, fvgStudyList, OLD_GAP_AGE_BARS } from "./planFvgStudy";
import type { PlanVsActualResult } from "./planVsActual";

const ref = (interaction: string, mitigation: string, ageBars: number) => ({ objectId: "FVG|NQ1!|5m|1|BULLISH|v1", timeframe: "5m", snapshot: { interaction, mitigation, ageBars } }) as unknown as JournalFvgReference;
const res = (followed: boolean) => ({ decisionId: "d", exitDecidable: true, findings: [{ id: followed ? "PLAN_FOLLOWED" : "EXITED_BEFORE_PLANNED_CONDITION" }] }) as unknown as PlanVsActualResult;

describe("§23 FVG study list — every group listed, n≥20 to MEASURE", () => {
  it("groups each decision by WHEN / DEPTH / AGE (old gap = more than 50 bars)", () => {
    expect(OLD_GAP_AGE_BARS).toBe(50);
    expect(fvgStudyGroupsOf(ref("BEFORE_ANY_TOUCH", "NONE", 51))).toEqual({ WHEN: "Anticipatory (before any touch)", DEPTH: "Untouched or touched", AGE: "Old gap (> 50 bars)" });
    expect(fvgStudyGroupsOf(ref("DURING_LATER_INTERACTION", "DEEP", 50))).toEqual({ WHEN: "Later touch", DEPTH: "Deep or full mitigation", AGE: "Fresh gap" });
    expect(fvgStudyGroupsOf(ref("AFTER_FIRST_INTERACTION", "PARTIAL", 3)).WHEN).toBe("Between touches");
  });
  it("lists every group even when empty (nine + the four WAITED groups); R and adherence measured separately at ≥20", () => {
    const rows = fvgStudyList([
      ...Array.from({ length: 20 }, (_, i) => ({ ref: ref("DURING_FIRST_INTERACTION", "PARTIAL", 10), result: res(i < 12), realizedR: i < 10 ? 1 : -1 })),
      { ref: ref("BEFORE_ANY_TOUCH", "NONE", 90), result: null, realizedR: null },
    ]);
    // 2026-10-09: the WAITED dimension (§23 "confirmed entries" / §41 "did they wait?") joins the nine; every group is still listed.
    expect(rows.map(r => r.group)).toEqual([...FVG_STUDY_GROUPS.WHEN, ...FVG_STUDY_GROUPS.DEPTH, ...FVG_STUDY_GROUPS.AGE, ...FVG_STUDY_GROUPS.WAITED]);
    // These rows carry no stored context: the 20 touched ones are "Confirmation not recorded" (never placed by
    // guess); the one the REFERENCE itself records as before any touch is a fact and is placed there.
    expect(rows.find(r => r.group === "Confirmation not recorded")!.trades).toBe(20);
    expect(rows.find(r => r.group === "Entered before any touch")!.trades).toBe(1);
    const first = rows.find(r => r.group === "First touch")!;
    expect(first).toMatchObject({ trades: 20, withR: 20, meanR: 0, rState: "MEASURED" });
    expect(first.adherence).toMatchObject({ state: "MEASURED", followed: 12 });
    const later = rows.find(r => r.group === "Later touch")!;
    expect(later).toMatchObject({ trades: 0, rState: "INSUFFICIENT EVIDENCE", adherence: null });
    expect(rows.find(r => r.group === "Old gap (> 50 bars)")!.line).toBe("1 decision. Result: INSUFFICIENT EVIDENCE — 0 of 20 with a recorded R. Plan: no frozen plan among them");
    expect(JSON.stringify(rows)).not.toMatch(/afraid|fear|greed|chasing|revenge|edge (?:is|exists)/i);
  });
});
