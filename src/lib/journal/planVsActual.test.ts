import { describe, expect, it } from "vitest";

import { amendPlan, freezePlanSnapshot, type TraderPlanInput } from "./managementPlan";
import { planAloneReference } from "./planCounterfactual";
import { actualsFromJournalEntry, classifyPlanVsActual, findingsByDimension, type PathBar, type PricePath, type TradeActuals } from "./planVsActual";

import { traderClock } from "@/components/time/traderClock";
const tc = (ms: number) => traderClock(ms, { seconds: false });
const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const T0 = Date.parse("2026-10-07T14:30:00Z");
const M = 60_000;

const plan = (p: TraderPlanInput = {}) => freezePlanSnapshot({
  decisionId: "wmd_1", frozenAt: "TICKET_SEND", atMs: T0, source: "ticket at send",
  plan: { direction: "LONG", entryPx: 100, stopPx: 98, targetPx: 104, ...p },
})!;

/** One-minute bars from [low, high] pairs starting at T0. */
const path = (hl: [number, number][]): PricePath => ({
  barMs: M, source: "test 1m candles",
  bars: hl.map(([l, h], i): PathBar => ({ t: T0 + i * M, l, h, c: (l + h) / 2 })),
});

const act = (over: Partial<TradeActuals> = {}): TradeActuals => ({
  direction: "LONG", entry: { atMs: T0 + 1000, px: 100, qty: 1 }, exits: [], adds: [], stopMoves: [], targetMoves: [], source: "test fills", ...over,
});

const exitAt = (min: number, px: number) => [{ atMs: T0 + min * M + 30_000, px, qty: 1 }];

/** Words that diagnose a feeling or pass a verdict — never in a finding or a question. */
const FORBIDDEN = /\b(afraid|fear|feared|scared|panic\w*|greed\w*|impatien\w*|revenge|fomo|anxious|nervous|emotional(ly)?\b(?! reason)|undisciplined|lack of|should have|failed|failure|bad trade|mistake|weak (?!thesis))/i;

const allText = (r: ReturnType<typeof classifyPlanVsActual>) => r.findings.flatMap(f => [f.sentence, f.rule ?? "", ...f.facts.map(x => x.text)]).join(" \n ");

describe("§26 exits, with the price path", () => {
  it("EXITED BEFORE PLANNED CONDITION — neither target nor invalidation had printed", () => {
    const r = classifyPlanVsActual({ plan: plan(), actuals: act({ exits: exitAt(3, 100.5) }), path: path([[99.5, 100.4], [99.8, 100.9], [100.2, 100.8], [100.3, 100.7]]) });
    expect(r.findings.map(f => f.id)).toContain("EXITED_BEFORE_PLANNED_CONDITION");
    expect(r.exitDecidable).toBe(true);
    const f = r.findings.find(x => x.id === "EXITED_BEFORE_PLANNED_CONDITION")!;
    expect(f.sentence).toBe("You exited at 100.5 before the target 104 or the invalidation 98 recorded in your plan had printed.");
    expect(f.rule).toMatch(/no bar reached the plan's target or invalidation/);
  });

  it("EXITED DURING NORMAL RETRACEMENT — the rule is stated, with the numbers", () => {
    const r = classifyPlanVsActual({ plan: plan(), actuals: act({ exits: exitAt(3, 100.6) }), path: path([[99.9, 100.5], [100.4, 102.2], [101.0, 101.9], [100.5, 101.2]]) });
    expect(r.primary).toBe("EXITED_DURING_NORMAL_RETRACEMENT");
    const f = r.findings.find(x => x.id === "EXITED_DURING_NORMAL_RETRACEMENT")!;
    expect(f.sentence).toMatch(/reached 102.2, then pulled back to 100.6/);
    expect(f.rule).toMatch(/gave back at least 0.25R without touching the plan's invalidation/);
    expect(f.facts.some(x => x.layer === "MARKET TRUTH" && /0.80R/.test(x.text))).toBe(true);
  });

  it("EXITED AFTER THESIS INVALIDATION — within the bar it printed in or the next", () => {
    const r = classifyPlanVsActual({ plan: plan({ invalidationPx: 99 }), actuals: act({ exits: exitAt(2, 98.9) }), path: path([[99.5, 100.4], [99.4, 100.1], [98.8, 99.6]]) });
    expect(r.primary).toBe("EXITED_AFTER_THESIS_INVALIDATION");
  });

  it("HELD THROUGH INVALIDATION — still open more than a bar after it printed", () => {
    const r = classifyPlanVsActual({ plan: plan({ invalidationPx: 99 }), actuals: act({ exits: exitAt(6, 98.2) }), path: path([[99.5, 100.4], [98.9, 99.8], [98.6, 99.3], [98.4, 99.0], [98.3, 98.9], [98.2, 98.8], [98.1, 98.6]]) });
    expect(r.primary).toBe("HELD_THROUGH_INVALIDATION");
    const f = r.findings[0];
    expect(f.sentence).toMatch(new RegExp(`^The invalidation recorded in your plan \\(99\\) printed at ${esc(tc(T0 + (1) * M))}; the position stayed open \\d+ bars longer and closed at 98.2\\.$`));
    expect(findingsByDimension(r).DISCIPLINE?.[0].id).toBe("HELD_THROUGH_INVALIDATION");
  });

  it("PLAN FOLLOWED — exit at target; exit at the recorded time condition", () => {
    expect(classifyPlanVsActual({ plan: plan(), actuals: act({ exits: exitAt(2, 104) }) }).primary).toBe("PLAN_FOLLOWED");
    const timed = classifyPlanVsActual({ plan: plan({ conditions: ["time stop 3 min"] }), actuals: act({ exits: exitAt(3, 100.4) }), path: path([[99.5, 100.4], [99.8, 100.9], [100.2, 100.8], [100.3, 100.7]]) });
    expect(timed.primary).toBe("PLAN_FOLLOWED");
    expect(findingsByDimension(timed).ADHERENCE?.[0].sentence).toMatch(/time condition recorded in your plan \(3 min\)/);
  });

  it("the stop standing in for an unrecorded invalidation is named as the planned stop", () => {
    const r = classifyPlanVsActual({ plan: plan(), actuals: act({ exits: exitAt(1, 98) }) });
    expect(r.primary).toBe("EXITED_AFTER_THESIS_INVALIDATION");
    expect(r.findings[0].sentence).toMatch(/the planned stop \(your plan recorded no separate invalidation\)/);
  });
});

describe("§26 INSUFFICIENT EVIDENCE — says which fact is missing", () => {
  it("no plan", () => {
    const r = classifyPlanVsActual({ plan: null, actuals: act({ exits: exitAt(1, 101) }) });
    expect(r.primary).toBe("INSUFFICIENT_EVIDENCE");
    expect(r.findings[0].sentence).toMatch(/No plan was recorded/);
  });
  it("no exit yet", () => {
    expect(classifyPlanVsActual({ plan: plan(), actuals: act() }).findings[0].sentence).toMatch(/no exit fill/);
  });
  it("an exit between the levels without a price path is not called early", () => {
    const r = classifyPlanVsActual({ plan: plan(), actuals: act({ exits: exitAt(3, 101) }) });
    expect(r.primary).toBe("INSUFFICIENT_EVIDENCE");
    expect(r.exitDecidable).toBe(false);
    expect(r.findings[0].sentence).toMatch(/Without the price path for the hold, WM cannot say whether either condition printed first/);
  });
  it("a path that does not cover the hold is not used", () => {
    const r = classifyPlanVsActual({ plan: plan(), actuals: act({ exits: exitAt(9, 101) }), path: path([[99.5, 100.4], [99.8, 100.9]]) });
    expect(r.primary).toBe("INSUFFICIENT_EVIDENCE");
  });
  it("a plan with no stop, invalidation or target", () => {
    const p = freezePlanSnapshot({ decisionId: "d", frozenAt: "TICKET_SEND", atMs: T0, source: "t", plan: { direction: "LONG" } });
    expect(classifyPlanVsActual({ plan: p, actuals: act({ exits: exitAt(1, 101) }) }).findings[0].sentence).toMatch(/no stop, invalidation or target/);
  });
  it("a journal entry has prices but no times — so the hold is never guessed", () => {
    const a = actualsFromJournalEntry({ side: "long", entry: 100, exit: 101, size: 1 });
    expect(a.entry?.atMs).toBeNull();
    expect(classifyPlanVsActual({ plan: plan(), actuals: a, path: path([[99, 101]]) }).primary).toBe("INSUFFICIENT_EVIDENCE");
    expect(actualsFromJournalEntry({ side: undefined, entry: 0 }).entry).toBeNull();
  });
});

describe("§26 stop, target and add — plan basis", () => {
  const pth = path([[99.5, 100.4], [100.2, 101.2], [100.6, 102.3], [101.0, 102.0], [101.5, 104.2]]);
  it("breakeven after +1R is a plan basis only once +1R printed", () => {
    const p = plan({ conditions: ["move to breakeven after +1R"] });
    const early = classifyPlanVsActual({ plan: p, actuals: act({ exits: exitAt(4, 104), stopMoves: [{ atMs: T0 + 2 * M, fromPx: 98, toPx: 100 }] }), path: pth });
    expect(early.findings.map(f => f.id)).toContain("MOVED_STOP_WITHOUT_PLAN_BASIS");
    expect(early.findings.find(f => f.id === "MOVED_STOP_WITHOUT_PLAN_BASIS")!.sentence).toMatch(/condition was \+1R, and the best move before then was \+0.60R/);
    const later = classifyPlanVsActual({ plan: p, actuals: act({ exits: exitAt(4, 104), stopMoves: [{ atMs: T0 + 4 * M, fromPx: 98, toPx: 100 }] }), path: pth });
    // §26 (2026-10-08): the move by the rule is now NAMED, not silent.
    expect(later.findings.map(f => f.id)).toEqual(["PLAN_FOLLOWED", "MOVED_TO_BREAKEVEN_PER_RULE"]);
    expect(later.primary).toBe("PLAN_FOLLOWED");
  });
  it("a stop move with no condition and no amendment has no plan basis — and widening is named as more risk", () => {
    const r = classifyPlanVsActual({ plan: plan(), actuals: act({ exits: exitAt(1, 104), stopMoves: [{ atMs: T0 + M, fromPx: 98, toPx: 97 }] }) });
    const f = r.findings.find(x => x.id === "MOVED_STOP_WITHOUT_PLAN_BASIS")!;
    expect(f.facts.some(x => /away from the market \(more risk\)/.test(x.text))).toBe(true);
  });
  it("a trailing condition covers a stop moved toward the market", () => {
    const r = classifyPlanVsActual({ plan: plan({ conditions: ["trail under 1m lows"] }), actuals: act({ exits: exitAt(1, 104), stopMoves: [{ atMs: T0 + M, fromPx: 98, toPx: 99 }] }) });
    expect(r.findings.map(f => f.id)).toEqual(["PLAN_FOLLOWED"]);
  });
  it("MOVED TARGET without documented evidence; PLAN CHANGED WITH DOCUMENTED NEW EVIDENCE when amended", () => {
    const moved = classifyPlanVsActual({ plan: plan(), actuals: act({ exits: exitAt(1, 103), targetMoves: [{ atMs: T0 + M, fromPx: 104, toPx: 103 }] }) });
    expect(moved.findings.map(f => f.id)).toContain("MOVED_TARGET");
    const am = amendPlan(plan(), { atMs: T0 + 30_000, targetPx: 103, newEvidence: "NQ lost the opening range", note: null });
    if (!am.ok) throw new Error(am.reason);
    const r = classifyPlanVsActual({ plan: am.snapshot, actuals: act({ exits: exitAt(1, 103), targetMoves: [{ atMs: T0 + M, fromPx: 104, toPx: 103 }] }) });
    expect(r.findings.map(f => f.id).sort()).toEqual(["PLAN_CHANGED_WITH_DOCUMENTED_NEW_EVIDENCE", "PLAN_FOLLOWED"]);
    expect(r.findings[0].facts[0].text).toMatch(/New evidence: NQ lost the opening range/);
  });
  it("ADDED RISK AFTER THESIS WEAKENED — at ≥0.5R against the entry, with the rule stated", () => {
    const r = classifyPlanVsActual({ plan: plan(), actuals: act({ exits: exitAt(2, 98), adds: [{ atMs: T0 + M, px: 98.9, qty: 1 }] }) });
    const f = r.findings.find(x => x.id === "ADDED_RISK_AFTER_THESIS_WEAKENED")!;
    expect(f.sentence).toBe("You added 1 at 98.9, 0.55R against your entry and toward the planned stop (your plan recorded no separate invalidation).");
    expect(f.rule).toMatch(/at least 0.5R against the entry/);
    expect(classifyPlanVsActual({ plan: plan(), actuals: act({ exits: exitAt(2, 104), adds: [{ atMs: T0 + M, px: 99.5, qty: 1 }] }) }).findings.map(x => x.id)).toEqual(["PLAN_FOLLOWED"]);
  });
});

describe("§25 no shame — emotion unknown unless the trader wrote it", () => {
  const cases = [
    { plan: plan(), actuals: act({ exits: exitAt(3, 100.6) }), path: path([[99.9, 100.5], [100.4, 102.2], [101.0, 101.9], [100.5, 101.2]]) },
    { plan: plan({ invalidationPx: 99 }), actuals: act({ exits: exitAt(6, 98.2) }), path: path([[99.5, 100.4], [98.9, 99.8], [98.6, 99.3], [98.4, 99.0], [98.3, 98.9], [98.2, 98.8], [98.1, 98.6]]) },
    { plan: plan(), actuals: act({ exits: exitAt(2, 98), adds: [{ atMs: T0 + M, px: 98.9, qty: 1 }], stopMoves: [{ atMs: T0 + M, fromPx: 98, toPx: 97 }], targetMoves: [{ atMs: T0, fromPx: 104, toPx: 103 }] }) },
    { plan: null, actuals: null },
  ];
  it.each(cases.map((c, i) => [i, c] as const))("case %i: every finding says emotionalReason \"unknown\" and uses no diagnosing word", (_i, c) => {
    const r = classifyPlanVsActual(c);
    expect(r.emotionalReason).toBe("unknown");
    expect(r.emotionalReasonSource).toBe("NOT RECORDED");
    for (const f of r.findings) expect(f.emotionalReason).toBe("unknown");
    expect(allText(r)).not.toMatch(FORBIDDEN);
  });
  it("the trader's own words become the reason, marked TRADER RECORDED", () => {
    const r = classifyPlanVsActual({ ...cases[0], traderReason: "  I had a call at 10:35  " });
    expect(r.emotionalReason).toBe("I had a call at 10:35");
    expect(r.emotionalReasonSource).toBe("TRADER RECORDED");
    expect(r.findings.every(f => f.emotionalReason === "I had a call at 10:35")).toBe(true);
  });
  it("truth layers stay separate: plan = TRADER, fills/path = MARKET, rules = rule field", () => {
    const r = classifyPlanVsActual(cases[0]);
    const f = r.findings[0];
    expect(f.facts.find(x => /^Plan frozen/.test(x.text))?.layer).toBe("TRADER TRUTH");
    expect(f.facts.find(x => /^Exit /.test(x.text))?.layer).toBe("MARKET TRUTH");
    expect(f.facts.every(x => x.layer !== "EDUCATION TRUTH")).toBe(true);
  });
  it("a hindsight plan says so in its facts", () => {
    const p = freezePlanSnapshot({ decisionId: "d", frozenAt: "JOURNAL_ENTRY", atMs: T0, source: "journal", plan: { direction: "LONG", stopPx: 98, targetPx: 104 } });
    const r = classifyPlanVsActual({ plan: p, actuals: act({ exits: exitAt(1, 104) }) });
    expect(r.hindsightRisk).toBe(true);
    expect(allText(r)).toMatch(/after the trade — it is not a pre-trade record/);
  });
});

describe("§24 the plan alone — descriptive reference", () => {
  const base = { plan: plan(), entryAtMs: T0 + 1000, entryPx: 100 };
  it("target first / stop first / neither / same bar", () => {
    expect(planAloneReference({ ...base, path: path([[99.5, 100.4], [100, 104.1]]) }).outcome).toBe("TARGET_FIRST");
    expect(planAloneReference({ ...base, path: path([[99.5, 100.4], [97.9, 100]]) }).outcome).toBe("STOP_FIRST");
    expect(planAloneReference({ ...base, path: path([[99.5, 100.4], [99, 101]]) }).outcome).toBe("NEITHER_WITHIN_HORIZON");
    expect(planAloneReference({ ...base, path: path([[97.5, 104.5]]) }).outcome).toBe("SAME_BAR_AMBIGUOUS");
  });
  it("uses the plan's expected hold as the horizon, and a short path is incomplete", () => {
    const p = plan({ expectedHoldMin: 2 });
    const r = planAloneReference({ ...base, plan: p, path: path([[99.5, 100.4], [99, 101], [99, 101], [99, 104.5]]) });
    expect(r).toMatchObject({ outcome: "NEITHER_WITHIN_HORIZON", horizonSource: "PLAN EXPECTED HOLD" });
    const shortR = planAloneReference({ ...base, plan: plan({ expectedHoldMin: 30 }), path: path([[99.5, 100.4]]) });
    expect(shortR.outcome).toBe("INSUFFICIENT_PATH");
  });
  it("never claims edge; no levels or no path say so", () => {
    const r = planAloneReference({ ...base, path: path([[99.5, 100.4], [100, 104.1]]) });
    expect(r.claim).toBe("DESCRIPTIVE — one trade is not evidence of edge");
    expect(r.sentence).toMatch(/Descriptive only/);
    expect(r.sentence).not.toMatch(/edge (?:is|exists)|profitable|win rate|expectancy/i);
    expect(planAloneReference({ ...base, path: null }).outcome).toBe("INSUFFICIENT_PATH");
    expect(planAloneReference({ ...base, plan: plan({ targetPx: null }), path: null }).outcome).toBe("NO_PLAN_LEVELS");
  });
  it("uses the frozen base, not the amendments (the 'did nothing' reference)", () => {
    const am = amendPlan(plan(), { atMs: T0 + 1, targetPx: 101, newEvidence: "x", note: null });
    if (!am.ok) throw new Error();
    expect(planAloneReference({ ...base, plan: am.snapshot, path: path([[99.5, 100.4], [99, 101.5]]) }).outcome).toBe("NEITHER_WITHIN_HORIZON");
  });
});
