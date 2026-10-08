/**
 * §26 MANAGEMENT BEHAVIOURS — the order's list, each named by ONE factual class of planVsActual
 * (Garden 19, 2026-10-08). PURE.
 *
 * Every behaviour is read from the broker readback (fills, stop / target order changes, adds) and
 * the frozen plan (stop, target, invalidation, the trader's own management conditions) — never from
 * a feeling. "Without plan basis" is the phrase; "impulsively" and every emotion word are never used.
 * `behaviourCases()` is a deterministic SAMPLE of one trade per behaviour, run through the real
 * classifier — the journal proof scene shows it, and the tests pin it.
 */

import { freezePlanSnapshot, type TraderPlanInput } from "./managementPlan";
import { classifyPlanVsActual, type DeviationId, type PathBar, type PlanVsActualResult, type PricePath, type TradeActuals } from "./planVsActual";

export interface BehaviourCoverage {
  /** The behaviour as the order names it (wording kept factual). */
  readonly behaviour: string;
  readonly classId: DeviationId;
  /** Read from: broker readback and / or the frozen plan. */
  readonly readFrom: string;
}

export const MANAGEMENT_BEHAVIOUR_COVERAGE: readonly BehaviourCoverage[] = [
  { behaviour: "Exited before planned invalidation", classId: "EXITED_BEFORE_PLANNED_CONDITION", readFrom: "exit fill + price path vs the plan's target / invalidation" },
  { behaviour: "Moved stop without plan basis", classId: "MOVED_STOP_WITHOUT_PLAN_BASIS", readFrom: "stop order changes vs the plan's conditions and amendments" },
  { behaviour: "Moved target without plan basis", classId: "MOVED_TARGET", readFrom: "target order changes vs amendments with new evidence" },
  { behaviour: "Took profit before planned condition", classId: "TOOK_PROFIT_BEFORE_PLANNED_CONDITION", readFrom: "a closing fill at a gain before the plan's target printed (price path)" },
  { behaviour: "Held beyond invalidation", classId: "HELD_THROUGH_INVALIDATION", readFrom: "price path: invalidation printed, position open more than a bar later" },
  { behaviour: "Added risk after thesis weakened", classId: "ADDED_RISK_AFTER_THESIS_WEAKENED", readFrom: "add fills vs the invalidation / 0.5R against the entry" },
  { behaviour: "Changed orders repeatedly without plan basis", classId: "INTERFERED_REPEATEDLY", readFrom: "3 or more stop / target changes in one hold with no plan basis" },
  { behaviour: "Followed plan", classId: "PLAN_FOLLOWED", readFrom: "exit at the target, on the invalidation, or at the plan's time condition" },
  { behaviour: "Reduced according to plan", classId: "REDUCED_PER_PLAN", readFrom: "a partial close at the target named by a recorded reduce condition" },
  { behaviour: "Moved to breakeven according to rule", classId: "MOVED_TO_BREAKEVEN_PER_RULE", readFrom: "stop to the entry after the plan's +R had printed (price path)" },
  { behaviour: "Walked away after protection, according to plan", classId: "WALKED_AWAY_AFTER_PROTECTION_PER_PLAN", readFrom: "after protection by rule: no stop, target, add or partial until the exit" },
];

/* ── the SAMPLE: one synthetic trade per behaviour ─────────────────────── */

const T0 = Date.UTC(2026, 0, 6, 15, 0, 0);
const M = 60_000;
const path = (hl: [number, number][]): PricePath => ({
  barMs: M, source: "sample 1m bars (proof scene)",
  bars: hl.map(([l, h], i): PathBar => ({ t: T0 + i * M, l, h, c: (l + h) / 2 })),
});
const plan = (p: TraderPlanInput = {}) => freezePlanSnapshot({
  decisionId: "SAMPLE-BEHAVIOUR", frozenAt: "TICKET_SEND", atMs: T0 - M, source: "sample ticket at send",
  plan: { symbol: "SAMPLE-FVG", direction: "LONG", entryPx: 100, stopPx: 98, targetPx: 104, ...p },
})!;
const act = (over: Partial<TradeActuals>): TradeActuals => ({
  direction: "LONG", entry: { atMs: T0 + 1000, px: 100, qty: 2 }, exits: [], adds: [], stopMoves: [], targetMoves: [], source: "sample fills", ...over,
});
const at = (min: number, px: number, qty = 2) => ({ atMs: T0 + min * M + 30_000, px, qty });
const UP: [number, number][] = [[99.6, 100.5], [100.3, 101.5], [101.2, 102.3], [101.8, 103], [102.5, 103.6], [103.2, 104.2], [103.8, 105.2]];
const FLAT: [number, number][] = [[99.4, 100.4], [99.3, 100.3], [99.4, 100.2], [99.4, 100.1]];

export interface BehaviourCase {
  readonly behaviour: string;
  readonly expect: DeviationId;
  readonly result: PlanVsActualResult;
}

let cached: readonly BehaviourCase[] | null = null;

export function behaviourCases(): readonly BehaviourCase[] {
  if (cached) return cached;
  const c = (expect: DeviationId, p: TraderPlanInput, a: Partial<TradeActuals>, hl: [number, number][]) => ({
    behaviour: MANAGEMENT_BEHAVIOUR_COVERAGE.find(x => x.classId === expect)!.behaviour,
    expect,
    result: classifyPlanVsActual({ plan: plan(p), actuals: act(a), path: path(hl) }),
  });
  cached = [
    c("EXITED_BEFORE_PLANNED_CONDITION", {}, { exits: [at(3, 99.5)] }, FLAT),
    c("MOVED_STOP_WITHOUT_PLAN_BASIS", {}, { exits: [at(5, 104)], stopMoves: [{ atMs: T0 + M, fromPx: 98, toPx: 99 }] }, UP),
    c("MOVED_TARGET", {}, { exits: [at(6, 105)], targetMoves: [{ atMs: T0 + 2 * M, fromPx: 104, toPx: 105 }] }, UP),
    c("TOOK_PROFIT_BEFORE_PLANNED_CONDITION", {}, { exits: [at(2, 101.9)] }, UP.slice(0, 3)),
    c("HELD_THROUGH_INVALIDATION", { invalidationPx: 99 }, { exits: [at(4, 98.6)] }, [[99.5, 100.4], [98.8, 99.9], [98.6, 99.6], [98.5, 99.4], [98.4, 99.2]]),
    c("ADDED_RISK_AFTER_THESIS_WEAKENED", {}, { exits: [at(5, 104)], adds: [{ atMs: T0 + 30_000, px: 98.9, qty: 1 }] }, [[98.8, 100.5], ...UP.slice(1)]),
    c("INTERFERED_REPEATEDLY", {}, { exits: [at(5, 104)], stopMoves: [{ atMs: T0 + M, fromPx: 98, toPx: 98.5 }, { atMs: T0 + 2 * M, fromPx: 98.5, toPx: 99 }], targetMoves: [{ atMs: T0 + 3 * M, fromPx: 104, toPx: 103.8 }] }, UP),
    c("PLAN_FOLLOWED", {}, { exits: [at(5, 104)] }, UP),
    c("REDUCED_PER_PLAN", { conditions: ["reduce half at target 1"] }, { exits: [{ atMs: T0 + 5 * M + 20_000, px: 104, qty: 1 }, at(6, 105, 1)] }, UP),
    c("MOVED_TO_BREAKEVEN_PER_RULE", { conditions: ["move to breakeven after +1R"] }, { exits: [at(5, 104)], stopMoves: [{ atMs: T0 + 3 * M, fromPx: 98, toPx: 100 }] }, UP),
    c("WALKED_AWAY_AFTER_PROTECTION_PER_PLAN", { conditions: ["move to breakeven after +1R", "walk away once the stop is protected"] }, { exits: [at(5, 104)], stopMoves: [{ atMs: T0 + 3 * M, fromPx: 98, toPx: 100 }] }, UP),
  ];
  return cached;
}
