/**
 * Garden 19 slice 5 — the FVG reference adapter (as-of answers, ledger
 * context, answers from instants) and §24 market edge vs execution edge.
 */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PlanAdherenceBySetup } from "@/components/journal/PlanAdherenceBySetup";
import type { FvgInteraction, FvgLedger, FvgObject } from "@/lib/marketData/fvg/fvgEngine";
import type { JournalFvgReference } from "./fvgDecisionReference";
import { fvgAnswersFromReference, fvgContextFromLedger, fvgReviewAnswersAt, fvgTimeframeMs } from "./planFvgContext";
import { compareFvgTakenVsUntaken, type TakenFvgTrade } from "./planFvgCounterfactual";

const T0 = Date.parse("2026-10-07T14:30:00Z");
const M = 60_000;
const FORBIDDEN = /afraid|fear|panic|greed|impatien|undisciplined|failed|mistake|edge (?:is|exists)|profitable|win rate/i;

const ref = (interaction: JournalFvgReference["snapshot"]["interaction"], n: number, dp: number | null = 2): JournalFvgReference => ({
  kind: "WM_FVG_REFERENCE", version: 1, objectId: `FVG|NQ1!|5m|${T0}|BULLISH|v1`, definitionId: "FVG_3C", definitionVersion: 1,
  symbol: "NQ1!", timeframe: "5m", decisionAtMs: T0, readAsOfMs: T0, priceDp: dp,
  snapshot: { direction: "BULLISH", bottom: 21392, top: 21401.5, state: "TOUCHED", mitigation: "TOUCHED", maxPenetration: 0.3, remaining: null, interaction, interactionsSoFar: n, ageBars: 12, evidence: [] },
});

const inter = (episode: number, startAt: number, endAt: number | null, response: FvgInteraction["response"], displacementAtr = 1, complete = true) =>
  ({ episode, startAt, endAt, response, displacementAtr, displacementComplete: complete }) as unknown as FvgInteraction;
const obj = (objectId: string, interactions: FvgInteraction[], tradedThroughAt: number | null = null) =>
  ({ objectId, timeframe: "5m", direction: "BULLISH", bottom: 100, top: 101, interactions, tradedThrough: tradedThroughAt ? { at: tradedThroughAt, barIndex: 0, barId: "b", close: 99 } : null }) as unknown as FvgObject;
const ledger = (objects: FvgObject[], timeframe = "5m") => ({ timeframe, objects, barCount: 100, asOf: T0 }) as unknown as FvgLedger;

describe("fvgAnswersFromReference — as of the decision, from the stored snapshot", () => {
  it.each([
    ["BEFORE_ANY_TOUCH", 0, "BEFORE_ANY_TOUCH", "YES"],
    ["DURING_FIRST_INTERACTION", 1, "FIRST_TOUCH", "NO"],
    ["DURING_LATER_INTERACTION", 3, "LATER_TOUCH", "NO"],
    ["AFTER_FIRST_INTERACTION", 1, "BETWEEN_TOUCHES", "NO"],
    ["AFTER_LATER_INTERACTION", 2, "BETWEEN_TOUCHES", "NO"],
  ] as const)("%s → %s", (interaction, n, touch, acted) => {
    const a = fvgAnswersFromReference(ref(interaction, n));
    expect(a.touch.answer).toBe(touch);
    expect(a.actedBeforeCondition.answer).toBe(acted);
    expect(a.heldAfterTradedThrough.answer).toBe("UNKNOWN");
    expect(JSON.stringify(a)).not.toMatch(FORBIDDEN);
  });
  it("prints the zone at the instrument's decimals; later touch names its number", () => {
    expect(fvgAnswersFromReference(ref("DURING_LATER_INTERACTION", 3)).touch.sentence).toBe("Your decision came during touch 3 of the territory 21392.00–21401.50 (bullish FVG, 5m), not the first.");
  });
});

describe("fvgContextFromLedger — the one engine's object, or nothing", () => {
  const l = ledger([obj("A", [inter(1, T0, T0 + 10 * M, "REJECTED"), inter(2, T0 + 30 * M, null, "OPEN")], T0 + 50 * M)]);
  it("touch starts = knownAt − one bar; ends kept; traded-through time kept", () => {
    expect(fvgContextFromLedger(l, "A")).toMatchObject({ barMs: 5 * M, tradedThroughAt: T0 + 50 * M, touches: [{ episode: 1, atMs: T0 - 5 * M, endMs: T0 + 10 * M }, { episode: 2, atMs: T0 + 25 * M, endMs: null }] });
  });
  it("an object the ledger no longer holds, or a timeframe with no clock → null", () => {
    expect(fvgContextFromLedger(l, "B")).toBeNull();
    expect(fvgContextFromLedger(ledger([obj("A", [])], "tick"), "A")).toBeNull();
    expect([fvgTimeframeMs("1m"), fvgTimeframeMs("1H"), fvgTimeframeMs("1D"), fvgTimeframeMs("tick")]).toEqual([M, 3_600_000, 86_400_000, null]);
  });
  it("fvgReviewAnswersAt — first / between / later; held / exited-with / outside / unknown", () => {
    const ctx = fvgContextFromLedger(l, "A")!;
    expect(fvgReviewAnswersAt(ctx, T0 - M, T0 + M).touch.answer).toBe("FIRST_TOUCH");
    expect(fvgReviewAnswersAt(ctx, T0 + 20 * M, null).touch).toMatchObject({ answer: "BETWEEN_TOUCHES", episode: 1 });
    expect(fvgReviewAnswersAt(ctx, T0 + 26 * M, T0 + 70 * M).touch.answer).toBe("LATER_TOUCH");
    expect(fvgReviewAnswersAt(ctx, T0 + 26 * M, T0 + 70 * M).heldAfterTradedThrough.answer).toBe("HELD_AFTER_TRADED_THROUGH");
    expect(fvgReviewAnswersAt(ctx, T0 + 26 * M, T0 + 52 * M).heldAfterTradedThrough.answer).toBe("EXITED_AS_TRADED_THROUGH");
    expect(fvgReviewAnswersAt(ctx, T0 - M, T0 + M).heldAfterTradedThrough.answer).toBe("NOT_TRADED_THROUGH_WHILE_OPEN");
    expect(fvgReviewAnswersAt(ctx, T0 + 26 * M, null).heldAfterTradedThrough.answer).toBe("UNKNOWN");
    expect(fvgReviewAnswersAt(ctx, null, null).touch.answer).toBe("UNKNOWN");
  });
});

describe("§24 market edge vs execution edge — traded vs untraded touches", () => {
  const taken = (objectId: string, interaction: TakenFvgTrade["interaction"], n: number, realizedR: number | null = null, followedPlan: boolean | null = null): TakenFvgTrade =>
    ({ objectId, interaction, interactionsSoFar: n, decisionAtMs: T0, realizedR, followedPlan });
  it("splits first vs later touches, excludes OPEN and the taken interactions from the untaken side, keeps the same days", () => {
    const objects = [
      obj("T1", [inter(1, T0, T0 + M, "REJECTED", 2), inter(2, T0 + 60 * M, T0 + 61 * M, "ACCEPTED")]),
      obj("U1", [inter(1, T0 + 5 * M, T0 + 6 * M, "TRADED_THROUGH", 0.5), inter(2, T0 + 90 * M, null, "OPEN")]),
      obj("U2", [inter(1, T0 - 3 * 86_400_000, T0, "REJECTED")]), // another day
    ];
    const r = compareFvgTakenVsUntaken([ledger(objects)], [taken("T1", "DURING_FIRST_INTERACTION", 1, 1.5, true), taken("T1", "BEFORE_ANY_TOUCH", 0), taken("GONE", "DURING_FIRST_INTERACTION", 1)]);
    const first = r.market.find(m => m.group === "FIRST_TOUCH")!;
    expect(first.taken).toMatchObject({ n: 1, rejected: 1, meanDisplacementAtr: 2 });
    expect(first.untaken).toMatchObject({ n: 1, tradedThrough: 1 });
    expect(r.market.find(m => m.group === "LATER_TOUCH")!.untaken).toMatchObject({ n: 1, accepted: 1 });
    expect(r.notCompared).toEqual(expect.arrayContaining([{ state: "BEFORE_ANY_TOUCH", count: 1 }, { state: "NOT IN THE LEDGERS READ", count: 1 }]));
    expect(first.state).toBe("INSUFFICIENT EVIDENCE");
    expect(first.sentence).toBe("INSUFFICIENT EVIDENCE on first touches: 1 traded and 1 not traded (20 each side needed).");
    expect(r.days).toEqual(["2026-10-07"]);
    expect(r.claim).toBe("DESCRIPTIVE — not evidence of edge");
  });
  it("MEASURED only with ≥20 on BOTH sides", () => {
    const tObjs = Array.from({ length: 20 }, (_, i) => obj(`T${i}`, [inter(1, T0 + i * M, T0 + i * M + 1, i < 10 ? "REJECTED" : "ACCEPTED")]));
    const uObjs = Array.from({ length: 20 }, (_, i) => obj(`U${i}`, [inter(1, T0 + i * M, T0 + i * M + 1, i < 5 ? "REJECTED" : "NONE")]));
    const takenAll = tObjs.map(o => taken(o.objectId, "DURING_FIRST_INTERACTION", 1, 1, true));
    const r = compareFvgTakenVsUntaken([ledger([...tObjs, ...uObjs])], takenAll);
    const first = r.market[0];
    expect(first.state).toBe("MEASURED");
    expect(first.sentence).toBe("On first touches, the territory rejected on 50% of the 20 you traded and 25% of the 20 you did not. Descriptive only.");
    expect(compareFvgTakenVsUntaken([ledger([...tObjs, ...uObjs.slice(0, 19)])], takenAll).market[0].state).toBe("INSUFFICIENT EVIDENCE");
    expect(r.execution).toMatchObject({ withR: 20, meanR: 1, positiveShare: 1, decided: 20, followed: 20, state: "MEASURED" });
    expect(JSON.stringify(r)).not.toMatch(FORBIDDEN);
  });
  it("execution says INSUFFICIENT under 20 recorded R", () => {
    const r = compareFvgTakenVsUntaken([], [taken("X", "DURING_FIRST_INTERACTION", 1, -0.5, false)]);
    expect(r.execution.sentence).toBe("INSUFFICIENT EVIDENCE for execution: 1 of 20 FVG trades carry a recorded R; plan followed on 0 of 1 decided trades.");
  });
});

describe("Personal Edge render", () => {
  it("renders nothing for a book with no frozen plans and no FVG references", () => {
    expect(renderToStaticMarkup(React.createElement(PlanAdherenceBySetup, { entries: [] }))).toBe("");
  });
});

import { PlanAdherenceView } from "@/components/journal/PlanAdherenceBySetup";
import { planAdherenceBySetup } from "./planAdherence";
import type { PlanVsActualResult } from "./planVsActual";

describe("Personal Edge view — setup rows, FVG-context rows, market vs execution", () => {
  const res = (followed: boolean) => ({ decisionId: "d", exitDecidable: true, findings: [{ id: followed ? "PLAN_FOLLOWED" : "EXITED_BEFORE_PLANNED_CONDITION" }] }) as unknown as PlanVsActualResult;
  const rows = planAdherenceBySetup([...Array.from({ length: 20 }, (_, i) => ({ setup: "ORB", result: res(i < 14) })), { setup: "VWAP reclaim", result: res(false) }]);
  const edge = compareFvgTakenVsUntaken([ledger([obj("A", [inter(1, T0, T0 + M, "REJECTED")])])], [{ objectId: "A", interaction: "DURING_FIRST_INTERACTION", interactionsSoFar: 1, decisionAtMs: T0, realizedR: 1.2, followedPlan: true }]);
  it("before the compare: the button; after: the descriptive lines with their states", () => {
    const before = renderToStaticMarkup(React.createElement(PlanAdherenceView, { rows, fvgRows: [], edge: null, edgeNote: null, showEdge: true, onCompare: () => {} }));
    expect(before).toContain('data-testid="fvg-compare-untaken"');
    expect(before).toContain("Plan followed on 14 of 20 decided trades (70%).");
    const after = renderToStaticMarkup(React.createElement(PlanAdherenceView, { rows, fvgRows: [], edge, edgeNote: null, showEdge: true, onCompare: () => {} }));
    expect(after).toContain("INSUFFICIENT EVIDENCE on first touches: 1 traded and 0 not traded (20 each side needed).");
    expect(after).toContain("DESCRIPTIVE — not evidence of edge");
    expect(after).not.toMatch(FORBIDDEN);
  });
});

import { readFileSync } from "node:fs";
import path from "node:path";
import { FVG_LESSONS } from "@/lib/academy/fvgCourse";
import { learnYourselfLinks, lessonForFinding, LOOP_DOORS } from "./planLoop";
import { DEVIATION_LABEL } from "./planVsActual";

describe("§56 the loop's hand-offs name doors that exist", () => {
  const SRC = path.resolve(__dirname, "../..");
  it("every finding routes to a real Academy lesson (or none) — never an invented one", () => {
    const ids = new Set(FVG_LESSONS.map(l => `/education?lesson=${l.id}`));
    for (const id of Object.keys(DEVIATION_LABEL) as (keyof typeof DEVIATION_LABEL)[]) {
      for (const fvg of [false, true]) {
        const l = lessonForFinding(id, fvg);
        if (l) expect(ids.has(l.href)).toBe(true);
      }
    }
    expect(lessonForFinding("EXITED_BEFORE_PLANNED_CONDITION")?.label).toBe("Lesson 18 · Patience");
    expect(lessonForFinding("HELD_THROUGH_INVALIDATION", true)?.label).toBe("Lesson 14 · Failed FVG / trade-through");
  });
  it("the doors are real routes", () => {
    for (const href of Object.values(LOOP_DOORS)) expect(readFileSync(path.join(SRC, "app", href.slice(1), "page.tsx"), "utf8").length).toBeGreaterThan(100);
  });
  it("Academy patience / management / edge lessons lead back into the trader's own record; others do not", () => {
    expect(learnYourselfLinks("fvg-19").map(l => l.href)).toEqual(["/morning-prep", "/journal"]);
    expect(learnYourselfLinks("fvg-3")).toHaveLength(0);
  });
  it("each hand-off is wired on its surface", () => {
    const read = (f: string) => readFileSync(path.join(SRC, f), "utf8");
    expect(read("components/journal/TodayManagementRules.tsx")).toContain('data-testid="day-rules-to-chart"');
    expect(read("components/journal/ManagementPlanCard.tsx")).toContain('data-testid="plan-card-to-journal"');
    expect(read("components/journal/ManagementPlanCard.tsx")).toContain('data-testid="plan-card-to-prep"');
    expect(read("components/journal/BrokerTruthToday.tsx")).toContain('data-testid="plan-finding-study"');
    expect(read("components/journal/PlanAdherenceBySetup.tsx")).toContain('data-testid="plan-adherence-study"');
    expect(read("components/education/FvgLessonBody.tsx")).toContain('data-testid="fvg-learn-yourself"');
  });
});
