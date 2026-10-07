/**
 * Garden 19 — Journal save → reload proof (FVG reference + frozen plan as one
 * unit) and §47–51 erasure: deleting a plan leaves no orphan amendments,
 * Review rows, Personal Edge counts or "why" answers referencing it.
 */
import { beforeEach, describe, expect, it } from "vitest";

import { readTastytradeFills } from "@/lib/broker/tastytradeFills";
import { readTastytradeOrder } from "@/lib/broker/tastytradeOrderState";
import { JOURNAL_STORAGE_KEY, readJournalStorage } from "@/lib/traderMemory/adapters/journalStorage";
import { readJournalFvgReference, type JournalFvgReference } from "./fvgDecisionReference";
import { hydrateJournalEntries } from "./hydrateJournalEntries";
import { journalCaptureFromFill } from "./journalCaptureFromFill";
import { planSnapshotFromTicket } from "./managementPlan";
import { erasePlanForDecision, reviewKeyBelongsTo } from "./managementPlanErase";
import { appendPlanAmendment, freezePlanOnce, MANAGEMENT_PLAN_KEY, readAllPlans, readPlanForDecision } from "./managementPlanStore";
import { planAdherenceBySetup } from "./planAdherence";
import { fvgStudyList } from "./planFvgStudy";
import { composePlanReview, planReviewInputForJournalEntry } from "./planReview";
import { formatPlanContextLine } from "@/lib/ai/spaidbotPlanReview";
import { withScenePlan } from "@/lib/ai/spaidbotContext";
import { parseStoryReviews, STORY_REVIEW_STORAGE_KEY } from "./storyReview";

const T0 = Date.parse("2026-10-07T14:31:00Z");
const M = 60_000;
const DEC = "wmd_persist_0001";

function mem() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}

const order = readTastytradeOrder({ id: 77, status: "Filled", "order-type": "Limit", price: "21400", "external-identifier": "wmo_x", "updated-at": "2026-10-07T14:31:05Z",
  legs: [{ symbol: "/MNQZ6", action: "Buy to Open", quantity: 1, "remaining-quantity": 0 }] })!;
const fills = readTastytradeFills([{ id: 1, "transaction-type": "Trade", "order-id": 77, symbol: "/MNQZ6", "instrument-type": "Future", action: "Buy to Open", quantity: "1", price: "21400", value: "0", "value-effect": "None", commission: "0.35", "executed-at": "2026-10-07T14:31:04Z" }]);
const intent = { decisionId: DEC, broker: "tastytrade" as const, accountTail: "6649", instrumentType: "Future", chartSymbol: "MNQ1!", action: "Buy to Open", qty: 1, limitPx: 21400, protectiveStopPx: 21380, targetPx: 21450, sentAtMs: T0 - 2000 };
const cap = journalCaptureFromFill({ intent, order, fills, brokerAccountTail: "6649", nowMs: T0 });
if (!cap.ok) throw new Error(cap.reason);

const fvgRef: JournalFvgReference = readJournalFvgReference({
  kind: "WM_FVG_REFERENCE", version: 1, objectId: "FVG|MNQ1!|5m|1791404100000|BULLISH|v1", definitionId: "FVG_3C", definitionVersion: 1,
  symbol: "MNQ1!", timeframe: "5m", decisionAtMs: T0, readAsOfMs: T0 - 60_000, priceDp: 2,
  snapshot: { direction: "BULLISH", bottom: 21392, top: 21401.5, state: "TOUCHED", mitigation: "PARTIAL", maxPenetration: 0.35, remaining: { bottom: 21392, top: 21398 },
    interaction: "DURING_FIRST_INTERACTION", interactionsSoFar: 1, ageBars: 12, evidence: [{ sense: "PRICE_GEOMETRY", state: "FULL", ref: "OHLC" }, { sense: "ORDER_FLOW", state: "NOT_ATTACHED", ref: null }] },
})!;

const entry = {
  id: "j1", date: "2026-10-07", symbol: "MNQ1!", side: "long", entry: 21400, exit: 21412.25, size: 1, pnl: 24.5, pct: 0.06, tags: ["FVG"], notes: "", mood: "neutral",
  result: "win", processQuality: "UNRESOLVED", processOutcome: "UNRESOLVED", starred: false, images: [], voiceSec: 0, setup: "ORB", mistakes: "", lessons: "", emojis: [],
  realizedR: 0.61, capture: cap.draft, fvgRef,
};

function seed() {
  const st = mem();
  st.setItem(JOURNAL_STORAGE_KEY, JSON.stringify([entry]));                         // the Journal's save
  freezePlanOnce(st, planSnapshotFromTicket(intent, { conditions: ["move to breakeven after +1R"], invalidationPx: 21390 }));
  const amendments = [
    { atMs: T0 + M, stopPx: 21400, newEvidence: "breadth turned", note: null },
    { atMs: T0 + 2 * M, targetPx: 21440, newEvidence: null, note: "tighter" },
    { atMs: T0 + 3 * M, expectedHoldMin: 15, newEvidence: "news at 10:45", note: null },
  ];
  for (const a of amendments) {
    const r = appendPlanAmendment(st, DEC, a);
    if (!r.ok) throw new Error(r.reason);
  }
  st.setItem(STORY_REVIEW_STORAGE_KEY, JSON.stringify({
    [`tastytrade|6649|${DEC}`]: { marks: { MANAGEMENT: "BROKE" }, notes: { MANAGEMENT: "left early" }, lesson: "wait for the condition", repeat: "", planWhy: "phone call", updatedAt: 1 },
    "journal|other": { marks: {}, lesson: "", repeat: "", planWhy: "unrelated", updatedAt: 1 },
  }));
  return st;
}

describe("Journal save → reload: the FVG reference and the frozen plan come back identical, as one unit", () => {
  let st: ReturnType<typeof mem>;
  beforeEach(() => { st = seed(); });

  it("the journal entry reloads with an identical fvgRef and capture", () => {
    const reloaded = hydrateJournalEntries(readJournalStorage(st).records).entries;
    expect(reloaded).toHaveLength(1);
    expect(reloaded[0].fvgRef).toEqual(fvgRef);
    expect(reloaded[0].capture?.decisionId.value).toBe(DEC);
  });

  it("the plan reloads byte-identical through a fresh store read; amendments in time order", () => {
    const first = readPlanForDecision(st, DEC)!;
    const copy = mem();
    copy.setItem(MANAGEMENT_PLAN_KEY, st.getItem(MANAGEMENT_PLAN_KEY)!);       // a reload: nothing but the stored bytes
    const again = readPlanForDecision(copy, DEC)!;
    expect(again).toEqual(first);
    expect(JSON.stringify(again)).toBe(JSON.stringify(first));
    expect(again.amendments.map(a => a.atMs)).toEqual([T0 + M, T0 + 2 * M, T0 + 3 * M]);
    expect(again.amendments.map(a => a.newEvidence)).toEqual(["breadth turned", null, "news at 10:45"]);
    expect(again.base.conditions.map(c => c.kind)).toEqual(["BREAKEVEN_AFTER_R"]);
    expect(again.base.invalidationPx.value).toBe(21390);
  });

  it("after reload the entry still finds its plan by Decision_ID, and Review composes from both", () => {
    const [e] = hydrateJournalEntries(readJournalStorage(st).records).entries;
    const input = planReviewInputForJournalEntry(e, id => readPlanForDecision(st, id))!;
    expect(input.plan?.base.decisionId).toBe(DEC);
    const c = composePlanReview(input);
    expect(c.sheriff.planned.some(l => l.startsWith("Amended") && l.includes("new evidence: breadth turned"))).toBe(true);
    expect(fvgStudyList([{ ref: e.fvgRef!, result: c.result, realizedR: e.realizedR ?? null }]).find(r => r.group === "First touch")?.trades).toBe(1);
  });
});

describe("§47–51 erasure — deleting a plan leaves nothing referencing it", () => {
  it("removes the plan with all its amendments; other decisions' plans untouched", () => {
    const st = seed();
    freezePlanOnce(st, planSnapshotFromTicket({ ...intent, decisionId: "wmd_other" }));
    const receipt = erasePlanForDecision(st, DEC);
    expect(receipt).toEqual({ planRemoved: true, planWhyCleared: 1 });
    expect(readPlanForDecision(st, DEC)).toBeNull();
    expect(Object.keys(readAllPlans(st))).toEqual(["wmd_other"]);
    expect(st.getItem(MANAGEMENT_PLAN_KEY)).not.toContain(DEC);
    expect(st.getItem(MANAGEMENT_PLAN_KEY)).not.toContain("breadth turned");      // no orphan amendment text
    expect(erasePlanForDecision(st, DEC)).toEqual({ planRemoved: false, planWhyCleared: 0 });
  });

  it("clears only that decision's 'why did the plan change?' answer; keeps the trader's marks, notes and lesson", () => {
    const st = seed();
    erasePlanForDecision(st, DEC);
    const reviews = parseStoryReviews(st.getItem(STORY_REVIEW_STORAGE_KEY));
    const mine = reviews[`tastytrade|6649|${DEC}`];
    expect(mine.planWhy).toBeUndefined();
    expect(mine).toMatchObject({ marks: { MANAGEMENT: "BROKE" }, notes: { MANAGEMENT: "left early" }, lesson: "wait for the condition" });
    expect(reviews["journal|other"].planWhy).toBe("unrelated");
    expect(reviewKeyBelongsTo(DEC, DEC)).toBe(true);
    expect(reviewKeyBelongsTo(`x|${DEC}x`, DEC)).toBe(false);
  });

  it("Review rows, Personal Edge counts, the FVG study list and SpaidBot's plan line all stop referencing it", () => {
    const st = seed();
    const [e] = hydrateJournalEntries(readJournalStorage(st).records).entries;
    const before = composePlanReview(planReviewInputForJournalEntry(e, id => readPlanForDecision(st, id))!);
    expect(planAdherenceBySetup([{ setup: e.setup, result: before.result }]).length).toBe(1);
    expect(withScenePlan({ symbol: "MNQ1!", decisionId: DEC }, id => readPlanForDecision(st, id)).plan).toMatch(/^plan frozen/);

    erasePlanForDecision(st, DEC);
    const input = planReviewInputForJournalEntry(e, id => readPlanForDecision(st, id))!;
    expect(input.plan).toBeNull();
    const after = composePlanReview(input);
    expect(after.result.primary).toBe("INSUFFICIENT_EVIDENCE");
    expect(after.sheriff.planned).toEqual(["No plan was frozen for this decision."]);
    expect(JSON.stringify(after)).not.toContain("breadth turned");
    // Personal Edge counts only entries whose plan exists (the panel's own rule): none now.
    const reviewed = [e].flatMap(x => { const i = planReviewInputForJournalEntry(x, id => readPlanForDecision(st, id)); return i?.plan ? [{ setup: x.setup, result: composePlanReview(i).result }] : []; });
    expect(planAdherenceBySetup(reviewed).length).toBe(0);
    expect(fvgStudyList([{ ref: e.fvgRef!, result: null, realizedR: e.realizedR ?? null }]).find(r => r.group === "First touch")?.adherence).toBeNull();
    expect(withScenePlan({ symbol: "MNQ1!", decisionId: DEC }, id => readPlanForDecision(st, id)).plan).toBeNull();
    expect(formatPlanContextLine(readPlanForDecision(st, DEC))).toBeNull();
    // The journal entry and its FVG reference are the trader's and are untouched.
    expect(e.fvgRef).toEqual(fvgRef);
    expect(hydrateJournalEntries(readJournalStorage(st).records).entries[0].fvgRef).toEqual(fvgRef);
  });
});

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ManagementPlanCard } from "@/components/journal/ManagementPlanCard";

describe("§47–51 the trader can delete a plan from the Review card (two presses, no dialog)", () => {
  it("a frozen plan's card offers 'Delete this plan'; no plan → no delete control", () => {
    const st = seed();
    const html = renderToStaticMarkup(React.createElement(ManagementPlanCard, { mode: "story", decisionId: DEC, initial: readPlanForDecision(st, DEC) }));
    expect(html).toContain('data-testid="plan-erase"');
    expect(html).toContain("Delete this plan");
    expect(renderToStaticMarkup(React.createElement(ManagementPlanCard, { mode: "story", decisionId: DEC, initial: null }))).not.toContain("plan-erase");
  });
});
