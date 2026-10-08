/** §55 residency: the Journal shows today's management rules READ ONLY; Morning Prep is the one editor. */
import { readFileSync } from "node:fs";
import path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TodayRulesLine } from "@/components/journal/TodayManagementRules";
import { dayRulesSummaryLine } from "./managementDayRules";

const SRC = path.resolve(__dirname, "../..");
const rules = { day: "2026-10-07", conditions: ["move to breakeven after +1R", "reduce at target 1"], expectedHoldMin: 20, sessionPlan: "NY open only", updatedAtMs: 1 };

describe("Journal · today's rules line", () => {
  it("summarises the saved rules in one line and links to the one editor", () => {
    expect(dayRulesSummaryLine(rules)).toBe("move to breakeven after +1R; reduce at target 1 · hold 20 min · session: NY open only");
    const html = renderToStaticMarkup(React.createElement(TodayRulesLine, { rules }));
    expect(html).toContain('data-saved="YES"');
    expect(html).toContain('href="/morning-prep"');
    expect(html).toContain("Edit in Morning Prep →");
  });
  it("nothing saved: says so and names the next action — never a blank strip", () => {
    const html = renderToStaticMarkup(React.createElement(TodayRulesLine, { rules: null }));
    expect(html).toContain("No management rules saved for today.");
    expect(html).toContain("Set them in Morning Prep →");
  });
  it("is read only (no input, textarea or save) and mounted on /journal for a signed-in trader", () => {
    const html = renderToStaticMarkup(React.createElement(TodayRulesLine, { rules }));
    expect(html).not.toMatch(/<input|<textarea|<button/);
    const page = readFileSync(path.join(SRC, "app/journal/page.tsx"), "utf8");
    expect(page).toContain('{mainTab === "journal" && authCtx?.user?.id ? <TodayRulesLine /> : null}');
    expect(page).not.toMatch(/<TodayManagementRules\b/);   // no second editor on the Journal
  });
});
