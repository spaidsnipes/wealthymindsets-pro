/**
 * §63/§64 MANAGEMENT SHERIFF — one sweep over every management / patience
 * surface. Fails if any string shown to the trader:
 *   1. names an emotion or motive (only the trader's own words may), shames,
 *      or says "should have";
 *   2. claims an edge, a score or a rate below n = 20 (MEASURED only at ≥ 20);
 *   3. prints a time that is not the trader's local time with its zone
 *      (traderClock) — no bare UTC "14:31Z", no zone-less clock;
 *   4. prints money outside the shared formatter (contractEconomics.formatMoney).
 * Source checks run on comment-stripped code; runtime checks run the real
 * builders with samples below and at the threshold.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StoryReviewRow } from "@/components/journal/BrokerTruthToday";
import { ManagementPlanCard } from "@/components/journal/ManagementPlanCard";
import { PlanAdherenceView } from "@/components/journal/PlanAdherenceBySetup";
import { TodayManagementRules } from "@/components/journal/TodayManagementRules";
import { formatPlanContextLine, formatPlanReviewQuestion } from "@/lib/ai/spaidbotPlanReview";
import type { FvgInteraction, FvgLedger, FvgObject } from "@/lib/marketData/fvg/fvgEngine";
import type { JournalFvgReference } from "./fvgDecisionReference";
import { mistakePatterns } from "./founderAnalytics";
import { amendPlan, freezePlanSnapshot } from "./managementPlan";
import { planAdherenceBySetup } from "./planAdherence";
import { fvgAnswersFromReference } from "./planFvgContext";
import { compareFvgTakenVsUntaken } from "./planFvgCounterfactual";
import { fvgStudyList } from "./planFvgStudy";
import { learnYourselfLinks, lessonForFinding } from "./planLoop";
import { composePlanReview } from "./planReview";
import { DEVIATION_LABEL, type PlanVsActualResult, type PricePath, type TradeActuals } from "./planVsActual";

const SRC = path.resolve(__dirname, "../..");
const SURFACES = [
  "components/journal/ManagementPlanCard.tsx", "components/journal/TodayManagementRules.tsx", "components/journal/PlanAdherenceBySetup.tsx",
  "components/journal/BrokerTruthToday.tsx", "lib/journal/planLoop.ts", "lib/ai/spaidbotPlanReview.ts",
  "lib/journal/planVsActual.ts", "lib/journal/planSheriff.ts", "lib/journal/planCounterfactual.ts", "lib/journal/planFvgContext.ts",
  "lib/journal/planFvgCounterfactual.ts", "lib/journal/planFvgStudy.ts", "lib/journal/planAdherence.ts", "lib/journal/managementPlan.ts",
];
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
const code = SURFACES.map(f => ({ f, src: strip(readFileSync(path.join(SRC, f), "utf8")) }));

const EMOTION = /\b(afraid|fear(ful|ed)?|scared|panick?(ed|y)?|greed(y)?|impatien(t|ce)|revenge|anxious|nervous|emotional(ly)?|tilt(ed)?|frustrat\w*|undisciplined|impulsive|by feeling|overconfiden\w*|you were (?:too )?\w+ed)\b/i;
const SHAME = /\b(should(?:n'?t)? have|failed|failure|mistake|bad trade|lazy|sloppy|careless|reckless|weak(?! ?ened)|lack of discipline|no discipline|again\?!)\b/i;
const EDGE_CLAIM = /\b(edge (?:is|exists|of \d)|profitable|win rate|winning setup|beats? the market|guarantee[ds]?|\d+% (?:win|edge|accuracy)|score[ds]? \d)/i;
const BARE_UTC = /\b\d{1,2}:\d{2}(?::\d{2})?Z\b/;
const ZONED = /\b\d{1,2}:\d{2}(?::\d{2})?\s?(AM|PM)\s?[A-Z]{2,5}\b|\bGMT[+-]\d/;

/* ── runtime samples: every builder, below and at the threshold ─────────── */
const T0 = Date.parse("2026-10-07T14:30:00Z"), M = 60_000;
const plan = (() => {
  const b = freezePlanSnapshot({ decisionId: "wmd_sh", frozenAt: "TICKET_SEND", atMs: T0 - 1000, source: "t",
    plan: { direction: "LONG", stopPx: 98, targetPx: 104, invalidationPx: 99, thesis: "reclaim", conditions: ["move to breakeven after +1R"], expectedHoldMin: 20, session: "NY open", riskUsd: 250 } })!;
  const a = amendPlan(b, { atMs: T0 + 2 * M, targetPx: 103, newEvidence: "breadth rolled over", note: null });
  return a.ok ? a.snapshot : b;
})();
const actuals = (exit: number, extra: Partial<TradeActuals> = {}): TradeActuals => ({ direction: "LONG", entry: { atMs: T0 + 10_000, px: 100, qty: 2 }, adds: [], stopMoves: [], targetMoves: [],
  exits: [{ atMs: T0 + 4 * M + 30_000, px: exit, qty: 2 }], source: "tastytrade", ...extra });
const path0: PricePath = { barMs: M, source: "tastytrade 1m", bars: [[99.6, 100.4], [100.1, 101.9], [100.8, 102.2], [100.9, 101.6], [100.7, 101.3], [101.0, 103.1], [98.5, 104.2]].map(([l, h], i) => ({ t: T0 + i * M, l, h, c: h })) };
const cases = [
  composePlanReview({ plan, actuals: actuals(101.2), path: path0 }),
  composePlanReview({ plan, actuals: actuals(98.2, { adds: [{ atMs: T0 + M, px: 98.9, qty: 1 }], stopMoves: [{ atMs: T0 + 3 * M, fromPx: 98, toPx: 97 }], targetMoves: [{ atMs: T0 + 3 * M, fromPx: 104, toPx: 105 }] }), path: path0 }),
  composePlanReview({ plan, actuals: actuals(104) }),
  composePlanReview({ plan: null, actuals: actuals(101) }),
  composePlanReview({ plan, actuals: actuals(101) }, "kids called"),
];
const res = (followed: boolean): PlanVsActualResult => ({ decisionId: "d", exitDecidable: true, findings: [{ id: followed ? "PLAN_FOLLOWED" : "EXITED_BEFORE_PLANNED_CONDITION", label: "", sentence: "", facts: [], rule: null, emotionalReason: "unknown" }], primary: "PLAN_FOLLOWED", hindsightRisk: false, emotionalReason: "unknown", emotionalReasonSource: "NOT RECORDED" }) as unknown as PlanVsActualResult;
const ref = (interaction: string, ageBars: number) => ({ kind: "WM_FVG_REFERENCE", version: 1, objectId: "FVG|NQ1!|5m|1|BULLISH|v1", definitionId: "FVG_3C", definitionVersion: 1, symbol: "NQ1!", timeframe: "5m", decisionAtMs: T0, readAsOfMs: T0, priceDp: 2,
  snapshot: { direction: "BULLISH", bottom: 1, top: 2, state: "TOUCHED", mitigation: "PARTIAL", maxPenetration: 0.3, remaining: null, interaction, interactionsSoFar: 1, ageBars, evidence: [] } }) as unknown as JournalFvgReference;
const inter = (ep: number, at: number, r: string) => ({ episode: ep, startAt: at, endAt: at + M, response: r, displacementAtr: 1, displacementComplete: true }) as unknown as FvgInteraction;
const ledger = (n: number) => ({ timeframe: "5m", objects: Array.from({ length: n }, (_, i) => ({ objectId: `O${i}`, interactions: [inter(1, T0 + i * M, i % 2 ? "REJECTED" : "ACCEPTED")] }) as unknown as FvgObject) }) as unknown as FvgLedger;
const small = Array.from({ length: 19 }, (_, i) => ({ setup: "ORB", result: res(i < 10) }));
const enough = Array.from({ length: 20 }, (_, i) => ({ setup: "ORB", result: res(i < 10) }));
const taken = (n: number) => Array.from({ length: n }, (_, i) => ({ objectId: `O${i}`, interaction: "DURING_FIRST_INTERACTION" as const, interactionsSoFar: 1, decisionAtMs: T0, realizedR: 1, followedPlan: true }));

const runtimeText: string[] = [
  ...cases.flatMap(c => [c.question, c.planAlone.sentence, ...c.sheriff.market, ...c.sheriff.planned, ...c.sheriff.actual, ...c.result.findings.flatMap(f => [f.label, f.sentence, f.rule ?? "", ...f.facts.map(x => x.text)])]),
  formatPlanContextLine(plan) ?? "", formatPlanReviewQuestion(plan, cases[0].result, actuals(101.2)),
  ...Object.values(DEVIATION_LABEL), ...Object.keys(DEVIATION_LABEL).map(id => lessonForFinding(id as keyof typeof DEVIATION_LABEL)?.label ?? ""),
  ...["fvg-18", "fvg-19", "fvg-21"].flatMap(l => learnYourselfLinks(l).map(x => x.label)),
  ...planAdherenceBySetup(small).map(r => r.line), ...planAdherenceBySetup(enough).map(r => r.line),
  ...fvgStudyList([{ ref: ref("DURING_FIRST_INTERACTION", 60), result: res(true), realizedR: 1 }]).map(r => `${r.group} ${r.line}`),
  ...(["BEFORE_ANY_TOUCH", "DURING_FIRST_INTERACTION", "DURING_LATER_INTERACTION", "AFTER_FIRST_INTERACTION"]).flatMap(i => { const a = fvgAnswersFromReference(ref(i, 3)); return [a.touch.sentence, a.actedBeforeCondition.sentence, a.heldAfterTradedThrough.sentence]; }),
  ...(() => { const c = compareFvgTakenVsUntaken([ledger(40)], taken(5)); return [...c.market.map(m => m.sentence), c.execution.sentence, c.claim]; })(),
  ...(() => { const c = compareFvgTakenVsUntaken([ledger(60)], taken(20)); return [...c.market.map(m => m.sentence), c.execution.sentence]; })(),
  ...mistakePatterns({ trips: [], webullTags: new Map(), marks: {}, journal: [], planReviews: small.map(s => s.result) }).slice(-2).flatMap(p => [p.label, p.basis]),
];
const html = [
  renderToStaticMarkup(React.createElement(StoryReviewRow, { storyKey: "k", plan: { plan, actuals: actuals(101.2), path: path0 }, planDecisionId: "wmd_sh", defaultOpen: true })),
  renderToStaticMarkup(React.createElement(ManagementPlanCard, { mode: "ticket", symbol: "MNQ1!" })),
  renderToStaticMarkup(React.createElement(ManagementPlanCard, { mode: "story", decisionId: "wmd_sh", initial: plan })),
  renderToStaticMarkup(React.createElement(ManagementPlanCard, { mode: "story", decisionId: "wmd_sh", initial: null })),
  renderToStaticMarkup(React.createElement(TodayManagementRules)),
  renderToStaticMarkup(React.createElement(PlanAdherenceView, { rows: planAdherenceBySetup(small), fvgRows: fvgStudyList([{ ref: ref("BEFORE_ANY_TOUCH", 80), result: null, realizedR: null }]), edge: compareFvgTakenVsUntaken([ledger(40)], taken(5)), edgeNote: null, showEdge: true, onCompare: () => {} })),
].map(h => h.replace(/<[^>]+>/g, " "));

describe("§63/§64 management Sheriff sweep", () => {
  it("swept real material (anti-vacuity)", () => {
    expect(code.length).toBeGreaterThan(12);
    expect(runtimeText.filter(Boolean).length).toBeGreaterThan(120);
    expect(html.join(" ").length).toBeGreaterThan(5_000);
  });

  it("positive controls — each detector still catches its shape", () => {
    expect(EMOTION.test("You were afraid to hold")).toBe(true);
    expect(SHAME.test("You should have held")).toBe(true);
    expect(EDGE_CLAIM.test("This setup is profitable")).toBe(true);
    expect(BARE_UTC.test("printed at 14:31Z")).toBe(true);
    expect(ZONED.test("printed at 9:31 AM CDT")).toBe(true);
    expect(ZONED.test("printed at 14:31")).toBe(false);
  });

  it("1 · no emotion label and no shaming word, anywhere a trader reads", () => {
    const all = [...runtimeText, ...html];
    const emotion = all.filter(t => EMOTION.test(t.replace(/You wrote: “[^”]*”/g, "").replace(/Reason \(your words\): [^.]*/g, "")));
    expect(emotion).toEqual([]);
    expect(all.filter(t => SHAME.test(t))).toEqual([]);
    // The trader's own words are shown as theirs — and only when they wrote them.
    expect(cases[4].question).toMatch(/You wrote: “kids called”\.$/);
    expect(cases[0].result.emotionalReason).toBe("unknown");
  });

  it("2 · no edge, score or rate claim; below n = 20 every count says INSUFFICIENT EVIDENCE", () => {
    expect([...runtimeText, ...html].filter(t => EDGE_CLAIM.test(t))).toEqual([]);
    for (const r of planAdherenceBySetup(small)) { expect(r.state).toBe("INSUFFICIENT EVIDENCE"); expect(r.line).not.toMatch(/%/); }
    expect(planAdherenceBySetup(enough)[0].state).toBe("MEASURED");
    const c5 = compareFvgTakenVsUntaken([ledger(40)], taken(5));
    for (const m of c5.market) { expect(m.state).toBe("INSUFFICIENT EVIDENCE"); expect(m.sentence).not.toMatch(/%/); }
    expect(c5.execution.sentence).not.toMatch(/%|averaged/);
    for (const r of fvgStudyList([{ ref: ref("DURING_FIRST_INTERACTION", 3), result: res(true), realizedR: 2 }])) expect(r.line).not.toMatch(/mean|%/);
    for (const p of mistakePatterns({ trips: [], webullTags: new Map(), marks: {}, journal: [], planReviews: small.map(s => s.result) })) if (p.sample < 20) expect(p.state).toBe("INSUFFICIENT EVIDENCE");
  });

  it("3 · every time a trader reads is local time with its zone — no bare UTC, no zone-less clock in source", () => {
    expect([...runtimeText, ...html].filter(t => BARE_UTC.test(t))).toEqual([]);
    const timed = runtimeText.filter(t => /\b\d{1,2}:\d{2}\b/.test(t) && !/\d{1,2}:\d{2}\s?ET\b|by \d{1,2}:\d{2}/.test(t));
    expect(timed.length).toBeGreaterThan(5);
    expect(timed.filter(t => !ZONED.test(t))).toEqual([]);
    for (const { f, src } of code) {
      expect(src, `${f} prints bare UTC`).not.toMatch(/toISOString\(\)\.slice\(11/);
      for (const m of src.matchAll(/toLocale(?:Time)?String\(([^)]*\{[^}]*\})?\)/g)) {
        if (/minimumFractionDigits|maximumFractionDigits/.test(m[0])) continue;
        expect(m[0], `${f} prints a clock without its zone`).toMatch(/timeZoneName/);
      }
    }
  });

  it("4 · money only through the shared formatter", () => {
    for (const { f, src } of code) {
      expect(src, `${f} hand-rolls a $ amount`).not.toMatch(/\$\$\{[^}]*(toFixed|toLocaleString)/);
      expect(src, `${f} hand-rolls a $ amount`).not.toMatch(/["'`]\$["'`]\s*\+/);
    }
    const btt = code.find(c => c.f.endsWith("BrokerTruthToday.tsx"))!.src;
    expect(btt).toMatch(/const money = \(v: number\) => formatMoney\(v\)/);
  });
});
