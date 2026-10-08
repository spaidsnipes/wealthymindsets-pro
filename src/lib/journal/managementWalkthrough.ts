/**
 * §64 THE FOUNDER'S MANAGEMENT SHERIFF — a walkthrough (Garden 19, 2026-10-08). PURE.
 *
 * Three SAMPLE decisions, each walked from the frozen plan to Review through the real owners
 * (freezePlanSnapshot → amendPlan → broker-shaped readback → composePlanReview: the three Sheriff
 * columns, the factual findings, the plan-alone line, SpaidBot's question, the lesson door):
 *
 *   A. an exit before the plan's condition printed;
 *   B. a position held through the plan's invalidation;
 *   C. a plan changed mid-trade with the NEW EVIDENCE written down — the change is kept beside the
 *      frozen base, and the stop move it covers is not called "without plan basis".
 *
 * Nothing here reads or writes storage. `managementSheriff.integration.test.ts` holds the Sheriff's
 * laws over it; the journal proof scene shows it.
 */

import { amendPlan, freezePlanSnapshot, type ManagementPlanSnapshot } from "./managementPlan";
import { lessonForFinding } from "./planLoop";
import { composePlanReview, type ComposedPlanReview } from "./planReview";
import type { PathBar, PricePath, TradeActuals } from "./planVsActual";

export interface WalkthroughStep {
  readonly step: string;
  readonly lines: readonly string[];
}

export interface Walkthrough {
  readonly id: "EARLY_EXIT" | "HELD_THROUGH_INVALIDATION" | "DOCUMENTED_NEW_EVIDENCE";
  readonly title: string;
  readonly plan: ManagementPlanSnapshot;
  readonly actuals: TradeActuals;
  readonly path: PricePath;
  readonly review: ComposedPlanReview;
  readonly steps: readonly WalkthroughStep[];
}

const T0 = Date.UTC(2026, 0, 7, 15, 0, 0);
const M = 60_000;
const path = (hl: [number, number][]): PricePath => ({
  barMs: M, source: "sample 1m bars (proof scene)",
  bars: hl.map(([l, h], i): PathBar => ({ t: T0 + i * M, l, h, c: (l + h) / 2 })),
});
const freeze = (id: string, extra: Parameters<typeof freezePlanSnapshot>[0]["plan"]) => freezePlanSnapshot({
  decisionId: id, frozenAt: "TICKET_SEND", atMs: T0 - M, source: "sample ticket at send",
  plan: { symbol: "SAMPLE-FVG", direction: "LONG", entryPx: 100, stopPx: 98, targetPx: 104, thesis: "sample: the gap holds and price returns to the high", expectedHoldMin: 30, ...extra },
})!;
const fills = (over: Partial<TradeActuals>): TradeActuals => ({
  direction: "LONG", entry: { atMs: T0 + 1000, px: 100, qty: 1 }, exits: [], adds: [], stopMoves: [], targetMoves: [], source: "sample broker readback (proof scene)", ...over,
});

function walk(id: Walkthrough["id"], title: string, plan: ManagementPlanSnapshot, actuals: TradeActuals, p: PricePath): Walkthrough {
  const review = composePlanReview({ plan, actuals, path: p });
  const doors = review.result.findings.map(f => lessonForFinding(f.id)).filter((x): x is NonNullable<typeof x> => !!x);
  return {
    id, title, plan, actuals, path: p, review,
    steps: [
      { step: "1 · What you planned (frozen on the Decision_ID, never rewritten)", lines: review.sheriff.planned },
      { step: "2 · What you actually did (the broker's readback)", lines: review.sheriff.actual },
      { step: "3 · What the market did (the price path, stated apart)", lines: review.sheriff.market },
      { step: "4 · The comparison (each finding a fact, with its rule)", lines: review.result.findings.flatMap(f => [`${f.label}: ${f.sentence}`, ...(f.rule ? [`Rule: ${f.rule}`] : [])]) },
      { step: "5 · Why it changed — only your own words", lines: [review.result.emotionalReasonSource === "TRADER RECORDED" ? `You wrote: ${review.result.emotionalReason}` : "Not recorded. WM does not fill this in."] },
      { step: "6 · The plan alone, SpaidBot's question, and the lesson", lines: [review.question, ...[...new Map(doors.map(d => [d.href, d])).values()].map(d => `Study: ${d.label}`)] },
    ],
  };
}

let cached: readonly Walkthrough[] | null = null;

export function managementWalkthroughs(): readonly Walkthrough[] {
  if (cached) return cached;
  const up: [number, number][] = [[99.6, 100.5], [100.3, 101.5], [100.9, 102.2], [100.8, 101.9], [100.6, 101.4], [101, 102.4], [101.8, 103.2], [102.6, 104.3]];
  const A = walk("EARLY_EXIT", "A · An exit before the plan's condition printed",
    freeze("SAMPLE-SHERIFF-A", {}), fills({ exits: [{ atMs: T0 + 4 * M + 30_000, px: 100.8, qty: 1 }] }), path(up));
  const B = walk("HELD_THROUGH_INVALIDATION", "B · A position held through the plan's invalidation",
    freeze("SAMPLE-SHERIFF-B", { invalidationPx: 99, invalidation: "loses the gap's low" }),
    fills({ exits: [{ atMs: T0 + 5 * M + 30_000, px: 98.4, qty: 1 }] }),
    path([[99.5, 100.4], [98.8, 99.9], [98.6, 99.5], [98.5, 99.3], [98.3, 99.1], [98.2, 98.9]]));
  const baseC = freeze("SAMPLE-SHERIFF-C", {});
  const amended = amendPlan(baseC, { atMs: T0 + 2 * M + 10_000, stopPx: 99.5, newEvidence: "sample: a large seller printed at the gap's high; the move above it was absorbed", note: null });
  const C = walk("DOCUMENTED_NEW_EVIDENCE", "C · A plan changed mid-trade, with the new evidence written down",
    amended.ok ? amended.snapshot : baseC,
    fills({ stopMoves: [{ atMs: T0 + 2 * M + 20_000, fromPx: 98, toPx: 99.5 }], exits: [{ atMs: T0 + 3 * M + 30_000, px: 99.5, qty: 1 }] }),
    path([[99.6, 100.5], [100.3, 101.5], [100.9, 102.2], [99.4, 101.1]]));
  cached = [A, B, C];
  return cached;
}
