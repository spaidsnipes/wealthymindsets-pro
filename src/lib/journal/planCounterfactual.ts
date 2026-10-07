/**
 * THE PLAN ALONE — Garden 19 §24 counterfactual hook (Founder order
 * 2026-10-07). PURE. Design + data shape, descriptive only.
 *
 * For one trade: had nothing been done after entry — no early exit, no stop
 * move, no add — which of the FROZEN plan's own conditions would the price
 * path have reached first within the plan's horizon? Target, stop, neither,
 * or both inside one bar (ambiguous: a bar does not say which printed first).
 *
 * It uses the frozen base plan only (amendments are what was DONE, and this is
 * the "did nothing" reference). It makes no claim of edge: one trade, one path,
 * and the line it prints says so. The full study (many trades, same-condition
 * cohorts) is a later slice; this record is its row.
 */

import { traderClock } from "@/components/time/traderClock";
import { fmtPx, type ManagementPlanSnapshot, type PlanDirection } from "./managementPlan";
import type { PricePath } from "./planVsActual";

export type PlanAloneOutcome =
  | "TARGET_FIRST"
  | "STOP_FIRST"
  | "NEITHER_WITHIN_HORIZON"
  | "SAME_BAR_AMBIGUOUS"
  | "INSUFFICIENT_PATH"
  | "NO_PLAN_LEVELS";

export interface PlanAloneReference {
  readonly kind: "WM_PLAN_ALONE_REFERENCE";
  readonly version: 1;
  readonly decisionId: string | null;
  readonly outcome: PlanAloneOutcome;
  /** The bar (open time) in which the first condition printed, when one did. */
  readonly atMs: number | null;
  readonly entryAtMs: number | null;
  readonly entryPx: number | null;
  readonly stopPx: number | null;
  readonly targetPx: number | null;
  readonly horizonEndMs: number | null;
  readonly horizonSource: "PLAN EXPECTED HOLD" | "END OF PRICE PATH" | "NONE";
  readonly barsRead: number;
  readonly pathSource: string | null;
  /** Always descriptive. */
  readonly claim: "DESCRIPTIVE — one trade is not evidence of edge";
  readonly sentence: string;
}

export interface PlanAloneInput {
  readonly plan: ManagementPlanSnapshot | null;
  readonly direction?: PlanDirection | null;
  readonly entryAtMs: number | null;
  readonly entryPx: number | null;
  readonly path: PricePath | null;
}

const CLAIM = "DESCRIPTIVE — one trade is not evidence of edge" as const;
/** Times the trader reads are the viewer's local time with its zone (traderClock), never bare UTC. */
const clock = (ms: number) => traderClock(ms, { seconds: false });

export function planAloneReference(input: PlanAloneInput): PlanAloneReference {
  const plan = input.plan;
  const stop = plan?.base.stopPx.value ?? null;
  const target = plan?.base.targetPx.value ?? null;
  const dir = plan?.base.direction.value ?? input.direction ?? null;
  const entryPx = input.entryPx ?? plan?.base.entryPx.value ?? null;
  const holdMin = plan?.base.expectedHoldMin.value ?? null;
  const base = {
    kind: "WM_PLAN_ALONE_REFERENCE" as const, version: 1 as const,
    decisionId: plan?.base.decisionId ?? null,
    entryAtMs: input.entryAtMs, entryPx, stopPx: stop, targetPx: target,
    pathSource: input.path?.source ?? null, claim: CLAIM,
  };
  if (!plan || stop == null || target == null || !dir) {
    return { ...base, outcome: "NO_PLAN_LEVELS", atMs: null, horizonEndMs: null, horizonSource: "NONE", barsRead: 0,
      sentence: "The plan recorded no stop and target pair (or no direction), so there is no plan-alone reference." };
  }
  const path = input.path;
  if (!path || !path.bars.length || path.barMs <= 0 || input.entryAtMs == null) {
    return { ...base, outcome: "INSUFFICIENT_PATH", atMs: null, horizonEndMs: null, horizonSource: holdMin != null ? "PLAN EXPECTED HOLD" : "NONE", barsRead: 0,
      sentence: "No price path after entry is held for this trade, so the plan-alone reference cannot be read." };
  }
  const bars = [...path.bars].sort((a, b) => a.t - b.t);
  const lastEnd = bars[bars.length - 1].t + path.barMs;
  const horizonEndMs = holdMin != null ? input.entryAtMs + holdMin * 60_000 : lastEnd;
  const horizonSource = holdMin != null ? "PLAN EXPECTED HOLD" : "END OF PRICE PATH";
  if (bars[0].t > input.entryAtMs) {
    return { ...base, outcome: "INSUFFICIENT_PATH", atMs: null, horizonEndMs, horizonSource, barsRead: 0,
      sentence: "The price path starts after the entry, so the plan-alone reference cannot be read." };
  }
  const inWindow = bars.filter(b => b.t + path.barMs > (input.entryAtMs as number) && b.t < horizonEndMs);
  const up = dir === "LONG";
  for (const b of inWindow) {
    const hitT = up ? b.h >= target : b.l <= target;
    const hitS = up ? b.l <= stop : b.h >= stop;
    if (hitT && hitS) {
      return { ...base, outcome: "SAME_BAR_AMBIGUOUS", atMs: b.t, horizonEndMs, horizonSource, barsRead: inWindow.length,
        sentence: `The plan alone: both the target ${fmtPx(target)} and the stop ${fmtPx(stop)} printed inside the bar opening ${clock(b.t)}; the bar does not say which came first. Descriptive only.` };
    }
    if (hitT || hitS) {
      return { ...base, outcome: hitT ? "TARGET_FIRST" : "STOP_FIRST", atMs: b.t, horizonEndMs, horizonSource, barsRead: inWindow.length,
        sentence: `The plan alone would have reached the ${hitT ? `target ${fmtPx(target)}` : `stop ${fmtPx(stop)}`} first (bar opening ${clock(b.t)}). Descriptive only — one trade is not evidence of edge.` };
    }
  }
  const short = holdMin != null && lastEnd < horizonEndMs;
  if (short) {
    return { ...base, outcome: "INSUFFICIENT_PATH", atMs: null, horizonEndMs, horizonSource, barsRead: inWindow.length,
      sentence: `Neither level printed in the ${inWindow.length} bars held, but the path ends before the plan's ${holdMin}-minute horizon, so the reference is incomplete.` };
  }
  return { ...base, outcome: "NEITHER_WITHIN_HORIZON", atMs: null, horizonEndMs, horizonSource, barsRead: inWindow.length,
    sentence: `The plan alone would have reached neither the target ${fmtPx(target)} nor the stop ${fmtPx(stop)} within ${horizonSource === "PLAN EXPECTED HOLD" ? `the plan's ${holdMin}-minute horizon` : "the price path held"}. Descriptive only.` };
}
