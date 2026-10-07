/**
 * §56 LEARNING-LOOP HAND-OFF PROOF — one decision, walked through the whole
 * chain with the real owners (no stubs of the code under test; storage is an
 * in-memory port):
 *
 *   Morning Prep rules → ticket plan card draft → TICKET SEND freezes the plan
 *   on the Decision_ID → the paper fill of the same decision does NOT refreeze
 *   → journal capture from the broker fill + FVG reference saved and reloaded
 *   → Review (market / planned / actual) → Personal Edge counts → Academy
 *   "my examples" → SpaidBot plan line + question → back to Morning Prep.
 *
 * At every hop: the SAME Decision_ID, the plan AS FROZEN at the send (later
 * changes only as dated amendments), the FVG state AS OF the decision, and a
 * door that points at the next hop.
 */
import { describe, expect, it } from "vitest";

import { formatPlanReviewQuestion } from "@/lib/ai/spaidbotPlanReview";
import { withScenePlan } from "@/lib/ai/spaidbotContext";
import { fvgReferencedExamples } from "@/lib/academy/fvgCourse";
import { readTastytradeFills } from "@/lib/broker/tastytradeFills";
import { readTastytradeOrder } from "@/lib/broker/tastytradeOrderState";
import { formatChartContextNote } from "@/lib/marketData/formatChartContextNote";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";
import { JOURNAL_STORAGE_KEY, readJournalStorage } from "@/lib/traderMemory/adapters/journalStorage";
import { readJournalFvgReference } from "./fvgDecisionReference";
import { hydrateJournalEntries } from "./hydrateJournalEntries";
import { journalCaptureFromFill } from "./journalCaptureFromFill";
import { draftWithDayRules, readDayRules, writeDayRules } from "./managementDayRules";
import { freezePaperFillPlans, readDraft, writeDraft } from "./managementPlanDraft";
import { appendPlanAmendment, readPlanForDecision } from "./managementPlanStore";
import { DEPARTURES, planAdherenceBySetup } from "./planAdherence";
import { fvgStudyList } from "./planFvgStudy";
import { learnYourselfLinks, lessonForFinding, LOOP_DOORS } from "./planLoop";
import { composePlanReview, planReviewInputForJournalEntry } from "./planReview";
import type { PricePath } from "./planVsActual";
import { rememberTicketAtSend } from "./ticketAtSendStore";
import { journalReviewKey } from "./captureReviewEvidence";

const DEC = "wmd_loop_20261007_0001";
const SEND = Date.parse("2026-10-07T14:30:00Z"); // Wed 10:30 ET
const M = 60_000;
function mem() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}

describe("§56 one decision through the whole learning loop", () => {
  const device = mem(), session = mem();

  // 1 · MORNING PREP: today's rules (the trader's words), confirmed into the card's draft.
  writeDayRules(device, { conditions: ["move to breakeven after +1R"], expectedHoldMin: 20, sessionPlan: "NY open only" }, SEND - 90 * M);
  const rules = readDayRules(device, SEND)!;
  // 2 · TICKET PLAN CARD: the trader presses "Use today's rules" and adds an invalidation.
  writeDraft(device, "MNQ1!", { ...draftWithDayRules({ invalidationPx: 21390, invalidation: "loses the opening-range low" }, rules) }, SEND - 5 * M);
  // 3 · TICKET SEND freezes the plan on the Decision_ID.
  const intent = { decisionId: DEC, broker: "tastytrade" as const, accountTail: "6649", instrumentType: "Future", chartSymbol: "MNQ1!", action: "Buy to Open", qty: 1, orderType: "Limit", limitPx: 21400, protectiveStopPx: 21380, targetPx: 21450, view: "ORB reclaim", sentAtMs: SEND };
  rememberTicketAtSend(session, "coid-loop", intent, SEND, device);
  const frozen = readPlanForDecision(device, DEC)!;
  // 4 · PAPER FILL of the same decision (a rehearsal) must NOT refreeze it.
  writeDraft(device, "MNQ1!", { invalidationPx: 1 }, SEND + 30_000);
  const refrozen = freezePaperFillPlans(device, [{ symbol: "MNQ1!", side: "buy", px: 21401, ts: SEND + M, decisionId: DEC }]);
  // 5 · A dated amendment with new evidence during the trade.
  appendPlanAmendment(device, DEC, { atMs: SEND + 2 * M, targetPx: 21440, newEvidence: "NQ lost the opening-range high", note: null });
  // 6 · BROKER FILL → journal capture → the trader saves the entry with an FVG reference → reload.
  const order = readTastytradeOrder({ id: 91, status: "Filled", "order-type": "Limit", price: "21400", "external-identifier": "coid-loop", "updated-at": "2026-10-07T14:30:06Z", legs: [{ symbol: "/MNQZ6", action: "Buy to Open", quantity: 1, "remaining-quantity": 0 }] })!;
  const fills = readTastytradeFills([{ id: 1, "transaction-type": "Trade", "order-id": 91, symbol: "/MNQZ6", "instrument-type": "Future", action: "Buy to Open", quantity: "1", price: "21400", value: "0", "value-effect": "None", commission: "0.35", "executed-at": "2026-10-07T14:30:05Z" }]);
  const cap = journalCaptureFromFill({ intent, order, fills, brokerAccountTail: "6649", nowMs: SEND + 10_000 });
  const fvgRef = readJournalFvgReference({
    kind: "WM_FVG_REFERENCE", version: 1, objectId: "FVG|MNQ1!|5m|1791404100000|BULLISH|v1", definitionId: "FVG_3C", definitionVersion: 1, symbol: "MNQ1!", timeframe: "5m",
    decisionAtMs: SEND + 5_000, readAsOfMs: SEND, priceDp: 2,
    snapshot: { direction: "BULLISH", bottom: 21392, top: 21401.5, state: "TOUCHED", mitigation: "PARTIAL", maxPenetration: 0.35, remaining: { bottom: 21392, top: 21398 }, interaction: "DURING_FIRST_INTERACTION", interactionsSoFar: 1, ageBars: 12, evidence: [{ sense: "PRICE_GEOMETRY", state: "FULL", ref: "OHLC" }] },
  })!;
  if (!cap.ok) throw new Error(cap.reason);
  device.setItem(JOURNAL_STORAGE_KEY, JSON.stringify([{
    id: "j-loop", date: "2026-10-07", symbol: "MNQ1!", side: "long", entry: 21400, exit: 21412.25, size: 1, pnl: 24.5, pct: 0.06, tags: [], notes: "", mood: "neutral", result: "win",
    processQuality: "UNRESOLVED", processOutcome: "UNRESOLVED", starred: false, images: [], voiceSec: 0, setup: "ORB", mistakes: "", lessons: "", emojis: [], realizedR: 0.61,
    capture: cap.draft, fvgRef,
  }]));
  const [entry] = hydrateJournalEntries(readJournalStorage(device).records).entries;
  // 7 · REVIEW with the broker's times (entry + exit) and the price path over the hold.
  const input = planReviewInputForJournalEntry(entry, id => readPlanForDecision(device, id))!;
  const actuals = { ...input.actuals!, entry: { ...input.actuals!.entry!, atMs: SEND + 5_000 }, exits: [{ atMs: SEND + 4 * M + 30_000, px: 21412.25, qty: 1 }] };
  const path: PricePath = { barMs: M, source: "tastytrade 1m bars for /MNQZ26:XCME", bars: [[21396, 21404], [21401, 21419], [21408, 21422], [21409, 21416], [21407, 21413], [21410, 21431], [21420, 21452.5]].map(([l, h], i) => ({ t: SEND + i * M, l, h, c: h })) };
  const review = composePlanReview({ ...input, actuals, path });

  it("hop 1–3 · Morning Prep rules → card draft → frozen at the ticket's send, on the Decision_ID", () => {
    expect(frozen.base.decisionId).toBe(DEC);
    expect(frozen.frozenAt).toBe("TICKET_SEND");
    expect(frozen.frozenAtMs).toBe(SEND);
    expect(frozen.base.conditions.map(c => c.text)).toEqual(["move to breakeven after +1R"]);
    expect(frozen.base.expectedHoldMin.value).toBe(20);
    expect(frozen.base.session).toMatchObject({ value: "NY open only", source: "morning prep session plan" });
    expect(frozen.base.invalidationPx.value).toBe(21390);
    expect(frozen.base.stopPx.value).toBe(21380);
    expect(LOOP_DOORS.CHART).toBe(INSTRUMENT_VIEW_ROUTE);          // Morning Prep's door → the chart (and its ticket card)
  });

  it("hop 4 · the paper fill of the same decision leaves the frozen plan as it was (as-of the send)", () => {
    expect(refrozen).toBe(0);
    const now = readPlanForDecision(device, DEC)!;
    expect(now.frozenAt).toBe("TICKET_SEND");
    expect(now.base).toEqual(frozen.base);
    expect(now.amendments.map(a => [a.atMs, a.newEvidence])).toEqual([[SEND + 2 * M, "NQ lost the opening-range high"]]);
    expect(readDraft(device, "MNQ1!")?.plan.invalidationPx).toBe(1);   // the later draft was not eaten
  });

  it("hop 5 · journal: the capture and the FVG reference carry the same Decision_ID and as-of truth after reload", () => {
    expect(entry.capture?.decisionId.value).toBe(DEC);
    expect(entry.fvgRef).toEqual(fvgRef);
    expect(entry.fvgRef!.decisionAtMs).toBeGreaterThanOrEqual(frozen.frozenAtMs);
    expect(entry.fvgRef!.readAsOfMs).toBeLessThanOrEqual(entry.fvgRef!.decisionAtMs);  // never what the trader could not yet see
    expect(LOOP_DOORS.JOURNAL).toBe("/journal");                     // the plan card's door → the Journal
    expect(journalReviewKey(entry)).toBe(`tastytrade|6649|${DEC}`);   // Journal and Broker Truth share one review
  });

  it("hop 6 · Review: three columns on the same decision; deviations; each finding's door → an Academy lesson", () => {
    expect(review.result.decisionId).toBe(DEC);
    expect(review.sheriff.planned[0]).toMatch(new RegExp(`Decision_ID ${DEC}\\.$`));
    expect(review.sheriff.planned.some(l => l.startsWith("Amended") && l.includes("new evidence: NQ lost the opening-range high"))).toBe(true);
    expect(review.sheriff.actual.some(l => l.startsWith("Entry 1 @ 21,400"))).toBe(true);
    expect(review.sheriff.market.some(l => l.startsWith("During the hold: high 21,422"))).toBe(true);
    expect(review.result.findings.map(f => f.id)).toEqual(expect.arrayContaining(["PLAN_CHANGED_WITH_DOCUMENTED_NEW_EVIDENCE", "EXITED_BEFORE_PLANNED_CONDITION"]));
    for (const f of review.result.findings) expect(lessonForFinding(f.id, true)?.href).toMatch(/^\/education\?lesson=fvg-\d+$/);
    expect(review.result.emotionalReason).toBe("unknown");
  });

  it("hop 7 · Personal Edge counts this decision once, by setup and by FVG context", () => {
    const bySetup = planAdherenceBySetup([{ setup: entry.setup, result: review.result }]);
    expect(bySetup).toHaveLength(1);
    expect(bySetup[0]).toMatchObject({ setup: "ORB", sample: 1, departed: 1, state: "INSUFFICIENT EVIDENCE" });
    const study = fvgStudyList([{ ref: entry.fvgRef!, result: review.result, realizedR: entry.realizedR ?? null }]);
    expect(study.find(r => r.group === "First touch")).toMatchObject({ trades: 1, withR: 1 });
    expect(study.find(r => r.group === "Partial mitigation")?.trades).toBe(1);
    expect(study.find(r => r.group === "Fresh gap")?.trades).toBe(1);
  });

  it("hop 8 · Academy 'my examples' lists this decision as of the decision, with its plan adherence, and links back to the entry", () => {
    const departed = review.result.findings.find(f => DEPARTURES.includes(f.id));
    const ex = fvgReferencedExamples(readJournalStorage(device).records, id => (id === entry.id && departed ? `departed: ${departed.label.toLowerCase()}` : null));
    expect(ex).toHaveLength(1);
    expect(ex[0]).toMatchObject({ id: "j-loop", objectId: fvgRef.objectId, decisionAtMs: fvgRef.decisionAtMs, href: "/journal?entry=j-loop" });
    expect(ex[0].stateLine).toBe("First touch · partial mitigation · 12 bars old · bullish 5m");
    expect(ex[0].adherence).toMatch(/^departed: /);
  });

  it("hop 9 · SpaidBot: the same Decision_ID, the plan as frozen (+ amendments), and a question — then the loop's door back to Morning Prep", () => {
    const ctx = withScenePlan({ symbol: "MNQ1!", decisionId: DEC }, id => readPlanForDecision(device, id));
    expect(ctx.plan).toMatch(/^plan frozen at the ticket's send: thesis “ORB reclaim” · stop 21,380 · target 21,450 · invalidation 21,390/);
    expect(ctx.plan).toMatch(/session NY open only \(Morning Prep\) · 1 dated amendment$/);
    const note = formatChartContextNote({ symbol: "MNQ1!", decisionId: DEC, plan: ctx.plan }, SEND + 10 * M);
    expect(note).toContain(`[Decision_ID ${DEC} —`);
    expect(note).toContain("TRADER TRUTH, not market data");
    const q = formatPlanReviewQuestion(review.plan, review.result, actuals);
    expect(q).toBe("Your original plan targeted 21,450 and invalidated at 21,390. You exited at 21,412.25 before either condition occurred. What caused you to change the plan?");
    expect(learnYourselfLinks("fvg-18").map(l => l.href)).toEqual([LOOP_DOORS.MORNING_PREP, LOOP_DOORS.JOURNAL]);
  });
});
