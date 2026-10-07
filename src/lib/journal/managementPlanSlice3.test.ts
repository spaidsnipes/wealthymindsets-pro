/**
 * Garden 19 slice 3 — §55 Morning Prep management rules → plan-card defaults
 * (trader-confirmed) + session-plan line on the Decision_ID; Personal Edge
 * plan adherence by setup (MEASURED only at ≥20 decided trades).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TodayManagementRules } from "@/components/journal/TodayManagementRules";
import type { FillCaptureIntent } from "./journalCaptureFromFill";
import { draftWithDayRules, MANAGEMENT_DAY_RULES_KEY, readDayRules, sessionPlanForFreeze, writeDayRules } from "./managementDayRules";
import { planLine } from "./managementPlan";
import { freezeAtTicketSend, freezePaperFillPlans, writeDraft } from "./managementPlanDraft";
import { readPlanForDecision } from "./managementPlanStore";
import { planAdherenceBySetup, UNNAMED_SETUP } from "./planAdherence";
import type { PlanVsActualResult } from "./planVsActual";

const T0 = Date.parse("2026-10-07T14:30:00Z"); // 10:30 ET
const M = 60_000;
const SRC = path.resolve(__dirname, "../..");
function mem() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}
const ticket: FillCaptureIntent = { decisionId: "wmd_d", broker: "tastytrade", instrumentType: "Future", chartSymbol: "MNQ1!", action: "Buy to Open", qty: 1, limitPx: 21400, protectiveStopPx: 21380, targetPx: 21450, sentAtMs: T0 };

describe("§55 today's management rules (Morning Prep)", () => {
  it("kept for today's New York market day only", () => {
    const st = mem();
    writeDayRules(st, { conditions: ["move to breakeven after +1R", " "], expectedHoldMin: 20, sessionPlan: "NY open only" }, T0 - 60 * M);
    expect(readDayRules(st, T0)).toMatchObject({ conditions: ["move to breakeven after +1R"], expectedHoldMin: 20, sessionPlan: "NY open only" });
    expect(readDayRules(st, T0 + 24 * 60 * M)).toBeNull();
    expect(writeDayRules(st, { conditions: [], expectedHoldMin: null, sessionPlan: "" }, T0)).toBeNull();
    expect(readDayRules(st, T0)).toBeNull();
  });
  it("the card's 'Use today's rules' only fills what the draft left blank, without duplicates", () => {
    const rules = { day: "x", conditions: ["move to breakeven after +1R", "reduce at target 1"], expectedHoldMin: 20, sessionPlan: null, updatedAtMs: 0 };
    expect(draftWithDayRules({ conditions: ["Move to breakeven after +1R"], expectedHoldMin: 5 }, rules)).toEqual({ conditions: ["Move to breakeven after +1R", "reduce at target 1"], expectedHoldMin: 5 });
    expect(draftWithDayRules({}, null)).toEqual({});
  });
  it("rules are NOT a plan: nothing joins a freeze unless the trader confirmed them into the draft", () => {
    const st = mem();
    writeDayRules(st, { conditions: ["move to breakeven after +1R"], expectedHoldMin: 20, sessionPlan: null }, T0 - M);
    freezeAtTicketSend(st, ticket, T0);
    const s = readPlanForDecision(st, "wmd_d")!;
    expect(s.base.conditions.length).toBe(0);
    expect(s.base.expectedHoldMin.state).toBe("UNRECORDED");
  });
  it("the session-plan line rides onto the Decision_ID at its freeze, sourced to Morning Prep, only if written before", () => {
    const st = mem();
    writeDayRules(st, { conditions: [], expectedHoldMin: null, sessionPlan: "NY open only; flat by 11:00 ET" }, T0 - M);
    freezeAtTicketSend(st, ticket, T0);
    const s = readPlanForDecision(st, "wmd_d")!;
    expect(s.base.session).toMatchObject({ value: "NY open only; flat by 11:00 ET", source: "morning prep session plan" });
    expect(planLine(s)).toMatch(/session NY open only; flat by 11:00 ET \(Morning Prep\)$/);
    expect(sessionPlanForFreeze(st, T0 - 2 * M)).toBeNull();
  });
  it("a session the trader wrote on the card wins over the Morning Prep line; paper freezes carry it too", () => {
    const st = mem();
    writeDayRules(st, { conditions: [], expectedHoldMin: null, sessionPlan: "NY open" }, T0 - 2 * M);
    writeDraft(st, "MNQ1!", { session: "lunch scalp" }, T0 - M);
    freezeAtTicketSend(st, ticket, T0);
    expect(readPlanForDecision(st, "wmd_d")?.base.session.value).toBe("lunch scalp");
    writeDraft(st, "AAPL", { invalidationPx: 180 }, T0 - M);
    freezePaperFillPlans(st, [{ symbol: "AAPL", side: "buy", px: 185, ts: T0, decisionId: "wmd_pp" }]);
    expect(readPlanForDecision(st, "wmd_pp")?.base.session).toMatchObject({ value: "NY open", source: "morning prep session plan" });
  });
  it("the Morning Prep section renders its fields; mounted on /morning-prep for a signed-in owner; key purged at sign-out", () => {
    const html = renderToStaticMarkup(React.createElement(TodayManagementRules));
    expect(html.length).toBeGreaterThan(200);
    for (const id of ["today-management-rules", "day-rules-conditions", "day-rules-hold", "day-rules-session", "day-rules-save"]) expect(html).toContain(`data-testid="${id}"`);
    expect(html).not.toMatch(/streak|score|discipline grade/i);
    expect(readFileSync(path.join(SRC, "app/morning-prep/page.tsx"), "utf8")).toContain("{ownerId ? <TodayManagementRules /> : null}");
    expect(readFileSync(path.join(SRC, "lib/logoutIsolation.ts"), "utf8")).toContain(`"${MANAGEMENT_DAY_RULES_KEY}"`);
  });
});

describe("§28/§29 Personal Edge — plan adherence by setup", () => {
  const r = (ids: string[], decidable = true): PlanVsActualResult => ({
    decisionId: "d", findings: ids.map(id => ({ id, label: "", sentence: "", facts: [], rule: null, emotionalReason: "unknown" })),
    primary: ids[0], exitDecidable: decidable, hindsightRisk: false, emotionalReason: "unknown", emotionalReasonSource: "NOT RECORDED",
  }) as unknown as PlanVsActualResult;
  it("groups by setup; counts only decided trades; INSUFFICIENT EVIDENCE under 20", () => {
    const rows = planAdherenceBySetup([
      { setup: "ORB", result: r(["PLAN_FOLLOWED"]) },
      { setup: "ORB", result: r(["EXITED_BEFORE_PLANNED_CONDITION", "EXITED_DURING_NORMAL_RETRACEMENT"]) },
      { setup: "ORB", result: r(["INSUFFICIENT_EVIDENCE"], false) },
      { setup: "", result: r(["PLAN_FOLLOWED"]) },
    ]);
    const orb = rows.find(x => x.setup === "ORB")!;
    expect(orb).toMatchObject({ sample: 2, followed: 1, departed: 1, insufficient: 1, state: "INSUFFICIENT EVIDENCE", commonDeparture: { id: "EXITED_BEFORE_PLANNED_CONDITION", count: 1 } });
    expect(orb.line).toBe("INSUFFICIENT EVIDENCE — 2 of 20 decided trades so far; 1 more could not be compared.");
    expect(rows.some(x => x.setup === UNNAMED_SETUP)).toBe(true);
  });
  it("MEASURED at 20 decided trades, with the share", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ setup: "VWAP reclaim", result: r(i < 15 ? ["PLAN_FOLLOWED"] : ["HELD_THROUGH_INVALIDATION"]) }));
    const [row] = planAdherenceBySetup(many);
    expect(row).toMatchObject({ state: "MEASURED", followedShare: 0.75 });
    expect(row.line).toBe("Plan followed on 15 of 20 decided trades (75%).");
  });
  it("wording is factual — no grade, no emotion", () => {
    const rows = planAdherenceBySetup([{ setup: "X", result: r(["MOVED_TARGET"]) }]);
    expect(JSON.stringify(rows)).not.toMatch(/afraid|fear|panic|greed|impatien|undisciplined|failed|bad|mistake/i);
  });
  it("mounted in the journal's Personal Edge block", () => {
    expect(readFileSync(path.join(SRC, "app/journal/page.tsx"), "utf8")).toMatch(/<PersonalEdgeChip vm=\{personalEdgeVm\} \/>\s*\{\/\*[^*]*\*\/\}\s*<PlanAdherenceBySetup entries=\{entries\} \/>/);
  });
});
