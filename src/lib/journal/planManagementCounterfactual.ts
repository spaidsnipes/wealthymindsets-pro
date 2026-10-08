/**
 * DID MANAGEMENT HELP? — Garden 19 §24, two descriptive questions. PURE.
 *
 *   1. "Did management destroy a valid plan?" For every decided trade where
 *      the trader DEPARTED from the frozen plan (an exit before its condition,
 *      a stop or target moved without basis, risk added), compare what the
 *      trader got (realised R) with what the plan ALONE would have got on the
 *      same price path (planCounterfactual: target first → +target R, stop
 *      first → −1R, neither → the close at the plan's horizon, same bar → not
 *      counted). Counted: plan alone better, trader better, the same.
 *   2. "Did restraint improve outcomes?" Realised R of trades where the plan
 *      was FOLLOWED beside trades where it was departed from.
 *
 * Both are counts and means with their n. A comparison is MEASURED only when
 * every side it compares holds ≥ STAT_SAMPLE_MIN (20); below that it says
 * INSUFFICIENT EVIDENCE. One path, one plan: descriptive, never a claim that
 * management (or restraint) causes anything, and never a grade of the trader.
 */

import { effectivePlanAt, type ManagementPlanSnapshot } from "./managementPlan";
import { DEPARTURES } from "./planAdherence";
import { planAloneReference } from "./planCounterfactual";
import type { PlanVsActualResult, PricePath, TradeActuals } from "./planVsActual";
import { INSUFFICIENT, isMeasured, STAT_SAMPLE_MIN } from "./statGuard";

export interface ManagementTrade {
  readonly plan: ManagementPlanSnapshot | null;
  readonly actuals: TradeActuals | null;
  readonly path: PricePath | null;
  readonly result: PlanVsActualResult;
  readonly realizedR: number | null;
}

/** The plan alone's R on this path, or null when it cannot be stated (no levels, no path, same-bar ambiguity). */
export function planAloneR(t: ManagementTrade): number | null {
  const plan = t.plan, a = t.actuals;
  if (!plan || !a?.entry || a.entry.atMs == null || !t.path) return null;
  const base = effectivePlanAt(plan, plan.frozenAtMs);
  const dir = plan.base.direction.value ?? a.direction;
  if (base.stopPx == null || base.targetPx == null || !dir) return null;
  const sgn = dir === "LONG" ? 1 : -1;
  const risk = Math.abs(a.entry.px - base.stopPx);
  if (!(risk > 0)) return null;
  const ref = planAloneReference({ plan, direction: dir, entryAtMs: a.entry.atMs, entryPx: a.entry.px, path: t.path });
  if (ref.outcome === "TARGET_FIRST") return round((sgn * (base.targetPx - a.entry.px)) / risk);
  if (ref.outcome === "STOP_FIRST") return -1;
  if (ref.outcome === "NEITHER_WITHIN_HORIZON" && ref.horizonEndMs != null) {
    const inH = t.path.bars.filter(b => b.t < ref.horizonEndMs!).sort((x, y) => x.t - y.t);
    const last = inH[inH.length - 1];
    return last ? round((sgn * (last.c - a.entry.px)) / risk) : null;
  }
  return null;
}

const round = (x: number) => Math.round(x * 100) / 100;
const mean = (xs: readonly number[]) => (xs.length ? round(xs.reduce((s, x) => s + x, 0) / xs.length) : null);

export interface ManagementCounterfactual {
  readonly departed: {
    readonly n: number;
    readonly planAloneBetter: number;
    readonly traderBetter: number;
    readonly same: number;
    readonly meanTraderR: number | null;
    readonly meanPlanAloneR: number | null;
    readonly state: "MEASURED" | "INSUFFICIENT EVIDENCE";
    readonly line: string;
  };
  readonly restraint: {
    readonly followed: number;
    readonly departed: number;
    readonly meanFollowedR: number | null;
    readonly meanDepartedR: number | null;
    readonly state: "MEASURED" | "INSUFFICIENT EVIDENCE";
    readonly line: string;
  };
  readonly claim: "DESCRIPTIVE — one path per trade; not evidence that management or restraint causes a result";
}

export function managementCounterfactual(trades: readonly ManagementTrade[]): ManagementCounterfactual {
  const decided = trades.filter(t => t.result.exitDecidable && typeof t.realizedR === "number" && Number.isFinite(t.realizedR));
  const departs = (t: ManagementTrade) => t.result.findings.some(f => DEPARTURES.includes(f.id));
  const dep = decided.filter(departs);
  const pairs = dep.map(t => ({ trader: t.realizedR as number, alone: planAloneR(t) })).filter((p): p is { trader: number; alone: number } => p.alone != null);
  const tol = 0.05;
  const planAloneBetter = pairs.filter(p => p.alone - p.trader > tol).length;
  const traderBetter = pairs.filter(p => p.trader - p.alone > tol).length;
  const dState = isMeasured(pairs.length) ? "MEASURED" as const : "INSUFFICIENT EVIDENCE" as const;
  const mT = mean(pairs.map(p => p.trader)), mA = mean(pairs.map(p => p.alone));
  const fol = decided.filter(t => !departs(t)).map(t => t.realizedR as number);
  const dr = dep.map(t => t.realizedR as number);
  const rState = isMeasured(fol.length) && isMeasured(dr.length) ? "MEASURED" as const : "INSUFFICIENT EVIDENCE" as const;
  return {
    departed: {
      n: pairs.length, planAloneBetter, traderBetter, same: pairs.length - planAloneBetter - traderBetter,
      meanTraderR: dState === "MEASURED" ? mT : null, meanPlanAloneR: dState === "MEASURED" ? mA : null, state: dState,
      line: dState === "MEASURED"
        ? `Where you departed from the plan (${pairs.length} trades), the plan alone on the same path would have done better on ${planAloneBetter}, worse on ${traderBetter}, about the same on ${pairs.length - planAloneBetter - traderBetter} — mean ${mT}R taken vs ${mA}R for the plan alone. Descriptive only.`
        : `Did departing from the plan cost or help? ${INSUFFICIENT} — ${pairs.length} of ${STAT_SAMPLE_MIN} departed trades with a plan-alone result (so far: plan alone better ${planAloneBetter}, you better ${traderBetter}).`,
    },
    restraint: {
      followed: fol.length, departed: dr.length, meanFollowedR: rState === "MEASURED" ? mean(fol) : null, meanDepartedR: rState === "MEASURED" ? mean(dr) : null, state: rState,
      line: rState === "MEASURED"
        ? `Plan followed: mean ${mean(fol)}R over ${fol.length}; departed: mean ${mean(dr)}R over ${dr.length}. Descriptive only.`
        : `Did following the plan go with better results? ${INSUFFICIENT} — ${fol.length} followed and ${dr.length} departed decided trades (${STAT_SAMPLE_MIN} each side needed).`,
    },
    claim: "DESCRIPTIVE — one path per trade; not evidence that management or restraint causes a result",
  };
}
