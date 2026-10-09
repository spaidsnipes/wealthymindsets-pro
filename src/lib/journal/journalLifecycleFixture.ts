/**
 * THREE ROWS THAT NEEDED A FOUNDER ACTION, SHOWN ON A LABELLED SAMPLE (coordinator order 2026-10-09). PURE.
 *
 * WM never writes on the Founder's account, so three certificate rows stayed PARTIAL: they need a real
 * send, a real fill, or a real plan. Each is shown here on a SAMPLE, through the SAME owners and the
 * SAME components the real account uses, with zero writes to the browser's storage and zero network:
 *
 *   1. PLAN LIFECYCLE — freeze at a sample send (freezePlanOnce), a second freeze refused (first
 *      wins), a dated amendment with new evidence (appendPlanAmendment), reload, then ERASE
 *      (erasePlanForDecision: the plan and its amendments go, the "why did the plan change?" answer
 *      is cleared, the rest of the review stays) — in a throwaway in-memory Storage, the member's key.
 *   2. PLAN vs ACTUAL FROM A BROKER READBACK — a sample tastytrade story in the feed's own shapes
 *      (orders with received-at, fills with executed-at) through planReviewInputForBrokerStory,
 *      with its two readback UNKNOWNs; and a sample Webull story (fills only) with its UNKNOWNs.
 *   3. JOURNAL AUTO-CAPTURE FROM A BROKER FILL — a sample FILLED order + its trade transactions
 *      through journalCaptureFromFill, every field with its provenance.
 *
 * "PROVED ON FIXTURE" is not "proved on the account": the real-account read stays owed for each.
 */

import { journalCaptureFromFill, type JournalCaptureResult } from "./journalCaptureFromFill";
import { freezePlanSnapshot, type ManagementPlanSnapshot } from "./managementPlan";
import { erasePlanForDecision } from "./managementPlanErase";
import { appendPlanAmendment, freezePlanOnce, readPlanForDecision } from "./managementPlanStore";
import { planReviewInputForBrokerStory, type PlanReviewInput } from "./planReview";
import type { PathBar, PricePath } from "./planVsActual";
import { parseStoryReviews, storyReviewKey } from "./storyReview";

const T0 = Date.UTC(2026, 0, 8, 15, 0, 0);
const M = 60_000;
const iso = (ms: number) => new Date(ms).toISOString();
export const LIFECYCLE_DECISION = "SAMPLE-LIFECYCLE-1";
export const LIFECYCLE_BANNER = "SAMPLE — not your account; nothing is saved, fetched or sent";

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), keys: () => [...m.keys()] };
}

const samplePlan = (decisionId: string, atMs = T0 - M): ManagementPlanSnapshot => freezePlanSnapshot({
  decisionId, frozenAt: "TICKET_SEND", atMs, source: "sample ticket at send",
  plan: { symbol: "SAMPLE-FVG", direction: "LONG", entryPx: 100, stopPx: 98, targetPx: 104, thesis: "sample: the gap holds", conditions: ["move to breakeven after +1R"], expectedHoldMin: 30 },
})!;

/* ── 1 · plan lifecycle ─────────────────────────────────────────────────── */

export interface LifecycleStep {
  readonly step: string;
  readonly outcome: string;
  readonly ok: boolean;
}
export interface PlanLifecycleProof {
  readonly steps: readonly LifecycleStep[];
  readonly allOk: boolean;
  /** The storage keys the throwaway store held at the end (member-keyed in a browser). */
  readonly keysAtEnd: readonly string[];
}

export function planLifecycleRoundTrip(): PlanLifecycleProof {
  const st = memoryStorage();
  const steps: LifecycleStep[] = [];
  const add = (step: string, outcome: string, ok: boolean) => steps.push({ step, outcome, ok });
  const plan = samplePlan(LIFECYCLE_DECISION);

  const first = freezePlanOnce(st, plan);
  add("Freeze at the sample send", first === "FROZEN" ? "FROZEN on the Decision_ID" : first === "NOT_STORED" ? "NOT STORED — no member key (a guest keeps no plan)" : first, first === "FROZEN");
  if (first !== "FROZEN") return { steps, allOk: false, keysAtEnd: st.keys() };

  const again = freezePlanOnce(st, samplePlan(LIFECYCLE_DECISION, T0 + 10 * M));
  const kept = readPlanForDecision(st, LIFECYCLE_DECISION);
  add("A second freeze for the same decision", again === "ALREADY_FROZEN" && kept?.frozenAtMs === plan.frozenAtMs ? "REFUSED — the first freeze stands (same freeze time)" : `unexpected: ${again}`, again === "ALREADY_FROZEN" && kept?.frozenAtMs === plan.frozenAtMs);

  const early = appendPlanAmendment(st, LIFECYCLE_DECISION, { atMs: T0 - 5 * M, stopPx: 99, newEvidence: "x", note: null });
  add("An amendment dated BEFORE the freeze", !early.ok ? `REFUSED — ${early.reason}` : "unexpected: accepted", !early.ok);

  const amended = appendPlanAmendment(st, LIFECYCLE_DECISION, { atMs: T0 + 3 * M, stopPx: 99.5, newEvidence: "sample: a large seller printed at the gap's high", note: null });
  add("A dated amendment with new evidence", amended.ok ? "APPENDED — stop → 99.5, with its new evidence" : `refused: ${amended.reason}`, amended.ok);

  const reloaded = readPlanForDecision(st, LIFECYCLE_DECISION);
  const baseKept = reloaded?.base.stopPx.value === 98 && reloaded.amendments.length === 1 && reloaded.amendments[0].newEvidence === "sample: a large seller printed at the gap's high";
  add("Reload", baseKept ? "The frozen base is unchanged (stop 98); 1 amendment, with its evidence" : "unexpected plan after reload", !!baseKept);

  // A review answer tied to this plan, then ERASE: the plan and the answer go, the rest of the review stays.
  const rk = storyReviewKey();
  if (rk) st.setItem(rk, JSON.stringify({ [LIFECYCLE_DECISION]: { marks: { READ: "HELD" }, notes: {}, lesson: "sample lesson", repeat: "", planWhy: "sample: I saw the seller", updatedAt: T0 + 9 * M } }));
  const receipt = erasePlanForDecision(st, LIFECYCLE_DECISION);
  const gone = readPlanForDecision(st, LIFECYCLE_DECISION) === null;
  const review = rk ? parseStoryReviews(st.getItem(rk))[LIFECYCLE_DECISION] : undefined;
  const erasedOk = receipt.planRemoved && gone && receipt.planWhyCleared === 1 && review?.planWhy === undefined && review?.lesson === "sample lesson";
  add("Erase the plan", erasedOk ? "Plan and its amendment removed; the “why did the plan change?” answer cleared; the lesson and marks kept" : "unexpected state after erase", !!erasedOk);

  return { steps, allOk: steps.every(s => s.ok), keysAtEnd: st.keys() };
}

/* ── 2 · plan vs actual from a broker readback ──────────────────────────── */

const path = (hl: [number, number][]): PricePath => ({
  barMs: M, source: "sample 1m bars (proof scene)",
  bars: hl.map(([l, h], i): PathBar => ({ t: T0 + i * M, l, h, c: (l + h) / 2 })),
});

export interface BrokerStoryFixture {
  readonly broker: "tastytrade" | "webull";
  readonly title: string;
  readonly input: PlanReviewInput;
}

export function brokerStoryFixtures(): readonly BrokerStoryFixture[] {
  const plan = samplePlan("SAMPLE-BROKER-TT");
  // tastytrade's feed shapes: an opening fill, a protective Stop moved once, a closing fill.
  const tt = planReviewInputForBrokerStory({
    decisionId: "SAMPLE-BROKER-TT", broker: "tastytrade",
    orders: [
      { id: "8001", action: "Buy to Open", orderType: "Limit", price: "100", receivedAt: iso(T0), symbol: "SAMPLE-FVG" },
      { id: "8002", action: "Sell to Close", orderType: "Stop", stopTrigger: "98", receivedAt: iso(T0 + 20_000), symbol: "SAMPLE-FVG" },
      { id: "8003", action: "Sell to Close", orderType: "Stop", stopTrigger: "99", receivedAt: iso(T0 + 2 * M), symbol: "SAMPLE-FVG" },
    ],
    fills: [
      { orderId: "8001", action: "Buy to Open", quantity: 1, price: 100, executedAt: iso(T0 + 5_000), symbol: "SAMPLE-FVG" },
      { orderId: "8003", action: "Sell to Close", quantity: 1, price: 99, executedAt: iso(T0 + 4 * M + 30_000), symbol: "SAMPLE-FVG" },
    ],
  }, () => plan)!;
  const wbPlan = samplePlan("SAMPLE-BROKER-WB");
  // Webull's feed: fills only — no stop / target orders, no open / close flag.
  const wb = planReviewInputForBrokerStory({
    decisionId: "SAMPLE-BROKER-WB", broker: "webull", orders: [],
    fills: [
      { orderId: "w1", action: "BUY", quantity: 1, price: 100, executedAt: iso(T0 + 5_000), symbol: "SAMPLE-FVG" },
      { orderId: "w2", action: "SELL", quantity: 1, price: 101.2, executedAt: iso(T0 + 3 * M + 30_000), symbol: "SAMPLE-FVG" },
    ],
  }, () => wbPlan)!;
  const p = path([[99.6, 100.5], [100.2, 101.4], [100.1, 101.3], [99.2, 100.9], [98.9, 100.2], [98.7, 99.8]]);
  return [
    { broker: "tastytrade", title: "tastytrade readback · entry, a protective stop moved once, exit at the moved stop", input: { ...tt, path: p } },
    { broker: "webull", title: "Webull readback · fills only (no stop / target orders in the feed)", input: { ...wb, path: p } },
  ];
}

/* ── 3 · journal auto-capture from a broker fill ────────────────────────── */

export function captureFixture(): JournalCaptureResult {
  const filledAt = iso(T0 + 5_000);
  return journalCaptureFromFill({
    intent: {
      decisionId: "SAMPLE-CAPTURE-1", orderIntentId: null, view: "sample view", broker: "tastytrade", environment: "sample", accountTail: "SMPL",
      instrumentType: "Future", chartSymbol: "SAMPLE1!", action: "Buy to Open", qty: 1, orderType: "Limit", limitPx: 21400.25, protectiveStopPx: 21380,
      targetPx: 21450, quote: { bid: 21400, ask: 21400.25, atMs: T0 }, sentAtMs: T0 + 1_000, multiplier: 2,
    },
    order: { id: "9001", status: "Filled", state: "FILLED", symbol: "/MNQZ6", action: "Buy to Open", quantity: 1, filled: 1, price: "21400.25", orderType: "Limit", externalId: "wmo_sample", updatedAt: filledAt, legCount: 1 },
    fills: [{ id: "f1", orderId: "9001", quantity: 1, price: 21400.25, fees: 0.87, executedAt: filledAt, feesReported: true }],
    brokerAccountTail: "SMPL",
    nowMs: T0 + M,
  });
}
