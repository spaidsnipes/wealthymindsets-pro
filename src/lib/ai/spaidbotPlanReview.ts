/**
 * SPAIDBOT'S PLAN REVIEW WORDS — Garden 19 §31 (Founder order 2026-10-07). PURE.
 *
 * SpaidBot compares the plan the trader froze with what happened, and ASKS.
 * It never tells the trader what they felt ("You were afraid" is forbidden):
 * the facts are the plan's own levels and the broker's fills, and the question
 * hands the reason back to the trader. When the trader has already written
 * their reason, SpaidBot quotes it as theirs.
 *
 * Two faces:
 *   formatPlanReviewQuestion — the Review's question for one trade, from the
 *     frozen plan + the plan-vs-actual result;
 *   formatPlanContextLine — the plan as a chart-context line for /api/spaidbot,
 *     labelled TRADER TRUTH so the model never mistakes it for market data.
 */

import { effectivePlanAt, fmtPx, planLine, type ManagementPlanSnapshot } from "@/lib/journal/managementPlan";
import type { PlanVsActualResult, TradeActuals } from "@/lib/journal/planVsActual";

const lastExitPx = (a: TradeActuals | null | undefined): number | null => {
  const ex = (a?.exits ?? []).filter(e => Number.isFinite(e.px) && e.px > 0);
  if (!ex.length) return null;
  const timed = ex.every(e => e.atMs != null);
  return (timed ? ex.reduce((x, y) => ((y.atMs as number) >= (x.atMs as number) ? y : x)) : ex[ex.length - 1]).px;
};

/** "Your original plan targeted X and invalidated at Y." — only the levels actually recorded. */
function planOpening(plan: ManagementPlanSnapshot): string {
  const e = effectivePlanAt(plan, plan.frozenAtMs);
  const t = e.targetPx != null ? `targeted ${fmtPx(e.targetPx)}` : null;
  const inv = e.invalidationPx != null ? `invalidated at ${fmtPx(e.invalidationPx)}` : null;
  const parts = [t, inv].filter(Boolean);
  if (!parts.length) return "Your original plan recorded no target or invalidation price.";
  return `Your original plan ${parts.join(" and ")}.`;
}

export function formatPlanReviewQuestion(plan: ManagementPlanSnapshot | null, result: PlanVsActualResult, actuals?: TradeActuals | null): string {
  if (!plan) return "No plan was recorded for this decision. What was the plan when you entered?";
  const open = planOpening(plan);
  const z = lastExitPx(actuals);
  const exitAt = z != null ? `You exited at ${fmtPx(z)}` : "You exited";
  const own = result.emotionalReasonSource === "TRADER RECORDED" ? ` You wrote: “${result.emotionalReason}”.` : "";
  const hindsight = plan.hindsightRisk ? " (This plan was written after the trade.)" : "";
  const f = (id: string) => result.findings.find(x => x.id === id);
  let body: string;
  switch (result.primary) {
    case "EXITED_DURING_NORMAL_RETRACEMENT":
    case "EXITED_BEFORE_PLANNED_CONDITION":
      body = `${open} ${exitAt} before either condition occurred. What caused you to change the plan?`;
      break;
    case "HELD_THROUGH_INVALIDATION":
      body = `${open} ${f("HELD_THROUGH_INVALIDATION")?.sentence ?? ""} What did you see that kept the position open after that level printed?`;
      break;
    case "ADDED_RISK_AFTER_THESIS_WEAKENED":
      body = `${open} ${f("ADDED_RISK_AFTER_THESIS_WEAKENED")?.sentence ?? ""} What evidence supported adding at that point?`;
      break;
    case "MOVED_STOP_WITHOUT_PLAN_BASIS":
      body = `${open} ${f("MOVED_STOP_WITHOUT_PLAN_BASIS")?.sentence ?? ""} What did you see that led to the move?`;
      break;
    case "MOVED_TARGET":
      body = `${open} ${f("MOVED_TARGET")?.sentence ?? ""} What did you see that led to the new target?`;
      break;
    case "PLAN_CHANGED_WITH_DOCUMENTED_NEW_EVIDENCE":
      body = `${open} You changed the plan during the trade and recorded the new evidence. Looking back, did that evidence hold up?`;
      break;
    case "EXITED_AFTER_THESIS_INVALIDATION":
      body = `${open} ${exitAt} after the invalidation printed, as the plan described. What would you keep the same next time?`;
      break;
    case "PLAN_FOLLOWED":
      body = `${open} ${exitAt} at the condition your plan recorded. What would you keep the same next time?`;
      break;
    case "INSUFFICIENT_EVIDENCE":
    default:
      body = `${open} ${exitAt}. WM does not hold enough facts to say whether either condition printed first. What did you see at the exit?`;
  }
  return `${body.replace(/\s+/g, " ").trim()}${hindsight}${own}`;
}

const clean = (s: string) => s.replace(/[[\]]/g, "").replace(/\s+/g, " ").trim();

/** The plan, one line, for SpaidBot's context — TRADER TRUTH, never market data. */
export function formatPlanContextLine(plan: ManagementPlanSnapshot | null): string | null {
  if (!plan) return null;
  const at = plan.frozenAt === "TICKET_SEND" ? "at the ticket's send" : plan.frozenAt === "PAPER_FILL" ? "at the paper fill" : "when the journal entry was saved (after the trade)";
  const thesis = plan.base.thesis.value ? `thesis “${plan.base.thesis.value}” · ` : "";
  const amend = plan.amendments.length ? ` · ${plan.amendments.length} dated amendment${plan.amendments.length === 1 ? "" : "s"}` : "";
  return clean(`plan frozen ${at}: ${thesis}${planLine(plan)}${amend}`).slice(0, 600);
}
