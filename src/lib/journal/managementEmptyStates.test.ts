/**
 * Guest / empty-state pass for every management surface: signed-out, no
 * broker, no plans — each says what is missing and names the next action.
 * No blank card, no zero dressed as a measurement, no "0%".
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PLAN_ABSENT_JOURNAL, PLAN_ABSENT_OUTSIDE_WM, StoryReviewRow } from "@/components/journal/BrokerTruthToday";
import { ManagementPlanCard } from "@/components/journal/ManagementPlanCard";
import { PLAN_ADHERENCE_EMPTY_LINE, PlanAdherenceBySetup, PlanAdherenceView } from "@/components/journal/PlanAdherenceBySetup";
import { TodayManagementRules } from "@/components/journal/TodayManagementRules";
import { FounderAnalytics } from "@/components/journal/FounderAnalytics";
import { FVG_EXAMPLES_EMPTY_LINE } from "@/lib/academy/fvgCourse";
import { buildTtRoundTrips } from "@/lib/broker/tastytradeLedger";
import { readTastytradeFills } from "@/lib/broker/tastytradeFills";
import { dayRulesSession } from "./managementDayRules";
import { mistakePatterns } from "./founderAnalytics";

const SRC = path.resolve(__dirname, "../..");
const text = (el: React.ReactElement) => renderToStaticMarkup(el).replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const NO_FAKE_ZERO = /\b0(\.0+)?\s?%|\b0 of 0\b|NaN|undefined/;

describe("empty states name what is missing and the next action", () => {
  it("Personal Edge with no frozen plan: one honest line, no 0%", () => {
    const t = text(React.createElement(PlanAdherenceView, { rows: [], fvgRows: [], edge: null, edgeNote: null, showEdge: false, onCompare: () => {} }));
    expect(t).toContain(PLAN_ADHERENCE_EMPTY_LINE);
    expect(PLAN_ADHERENCE_EMPTY_LINE).toMatch(/Write the plan on the ticket's plan card before your next trade/);
    expect(t).not.toMatch(NO_FAKE_ZERO);
    // A book with no entries at all (a guest): the stateful panel renders nothing before it reads.
    expect(renderToStaticMarkup(React.createElement(PlanAdherenceBySetup, { entries: [] }))).toBe("");
  });

  it("Review of a story placed outside WM / a journal entry not from a WM ticket says why there is no plan", () => {
    const a = text(React.createElement(StoryReviewRow, { storyKey: "x", planAbsent: PLAN_ABSENT_OUTSIDE_WM, defaultOpen: true }));
    expect(a).toContain("Placed outside WM, so no plan was frozen with this order. Send from the ticket's plan card next time");
    const b = text(React.createElement(StoryReviewRow, { storyKey: "y", planAbsent: PLAN_ABSENT_JOURNAL, defaultOpen: true }));
    expect(b).toContain("did not come from a WM ticket");
    for (const t of [a, b]) expect(t).not.toMatch(NO_FAKE_ZERO);
    const btt = readFileSync(path.join(SRC, "components/journal/BrokerTruthToday.tsx"), "utf8");
    expect(btt).toContain("planAbsent={pin ? null : PLAN_ABSENT_OUTSIDE_WM}");
    expect(readFileSync(path.join(SRC, "app/journal/page.tsx"), "utf8")).toContain("planAbsent={selected.capture?.decisionId.value ? null : PLAN_ABSENT_JOURNAL}");
  });

  it("plan card with nothing written: blanks stay UNRECORDED; the Review card with no plan offers to record one", () => {
    const ticket = text(React.createElement(ManagementPlanCard, { mode: "ticket", symbol: "MNQ1!" }));
    expect(ticket).toMatch(/Anything left blank stays UNRECORDED — WM never fills it in/);
    const story = text(React.createElement(ManagementPlanCard, { mode: "story", decisionId: "d", initial: null }));
    expect(story).toMatch(/No plan was frozen for this decision — record it now/);
    for (const t of [ticket, story]) expect(t).not.toMatch(NO_FAKE_ZERO);
  });

  it("Morning Prep rules with nothing saved: names the action; only a signed-in owner sees the section", () => {
    const t = text(React.createElement(TodayManagementRules));
    expect(t).toContain("Nothing saved for today. Write one rule above and press Save");
    expect(readFileSync(path.join(SRC, "app/morning-prep/page.tsx"), "utf8")).toContain("{ownerId ? <TodayManagementRules /> : null}");
  });

  it("Academy examples with no FVG reference: names the action", () => {
    expect(FVG_EXAMPLES_EMPTY_LINE).toMatch(/once a Journal entry references an FVG \(use "Reference an FVG"/);
  });

  it("Founder analytics: a pattern with nothing to count says so; below 20 no percentage is printed", () => {
    const trips = buildTtRoundTrips(readTastytradeFills([
      { id: 1, "transaction-type": "Trade", "order-id": 1, symbol: "/MNQZ6", action: "Buy to Open", quantity: "1", price: "1", value: "0", "executed-at": "2026-10-06T14:00:00Z" },
      { id: 2, "transaction-type": "Trade", "order-id": 2, symbol: "/MNQZ6", action: "Sell to Close", quantity: "1", price: "2", value: "2", "value-effect": "Credit", "executed-at": "2026-10-06T14:05:00Z" },
    ]));
    const html = renderToStaticMarkup(React.createElement(FounderAnalytics, { episodes: [], ttAccounts: [{ tail: "5678", fills: 2, trips }] }));
    expect(html).toContain('data-testid="pattern-nothing-yet"');
    expect(html.replace(/<[^>]+>/g, " ")).not.toMatch(/\(\d+%\)/);
    expect(html).not.toMatch(/0 of 0/);
    expect(mistakePatterns({ trips: [], webullTags: new Map(), marks: {}, journal: [] }).every(p => p.state === "INSUFFICIENT EVIDENCE")).toBe(true);
    // No broker (a guest): nothing renders at all.
    expect(renderToStaticMarkup(React.createElement(FounderAnalytics, { episodes: [], ttAccounts: [] }))).toBe("");
  });
});

describe("Morning Prep on a closed day: the rules line reads the one session owner and says CLOSED with its basis", () => {
  const at = (iso: string) => Date.parse(iso);
  it("Saturday: both reference markets CLOSED, with basis; the holiday calendar is said to be not loaded", () => {
    const s = dayRulesSession(at("2026-10-10T15:00:00Z")); // Sat 11:00 ET
    expect(s.allClosed).toBe(true);
    expect(s.equities?.verdict).toBe("CLOSED");
    expect(s.futures?.basis).toMatch(/CME Globex weekend close Fri 17:00 → Sun 18:00 ET/);
    expect(s.line).toMatch(/^US listed equities: CLOSED — .*holiday calendar not loaded.* · CME futures: CLOSED — .*\. Markets are CLOSED now — rules saved here are kept for today's date only; write them again on your next trading morning\.$/);
    const t = text(React.createElement(TodayManagementRules, { nowMs: at("2026-10-10T15:00:00Z") }));
    expect(t).toContain("Markets are CLOSED now");
  });
  it("a weekday at 10:00 ET: OPEN with basis, no closed note; Sunday evening futures OPEN while equities CLOSED", () => {
    const wed = dayRulesSession(at("2026-10-07T14:00:00Z"));
    expect(wed.equities?.verdict).toBe("OPEN");
    expect(wed.allClosed).toBe(false);
    expect(wed.line).not.toMatch(/Markets are CLOSED now/);
    const sunEve = dayRulesSession(at("2026-10-11T23:00:00Z")); // Sun 19:00 ET
    expect(sunEve.futures?.verdict).toBe("OPEN");
    expect(sunEve.equities?.verdict).toBe("CLOSED");
    expect(sunEve.allClosed).toBe(false);
  });
  it("a market holiday is NOT claimed: the basis names the missing calendar instead", () => {
    const thanksgiving = dayRulesSession(at("2026-11-26T15:00:00Z"));
    expect(thanksgiving.equities?.basis).toMatch(/holiday calendar not loaded/);
  });
});
