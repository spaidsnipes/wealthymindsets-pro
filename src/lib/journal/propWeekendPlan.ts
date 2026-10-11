/**
 * SUNDAY STUDY · MONDAY PLAN — the owner's evaluation preparation (Founder G19 Supermax §19,
 * 2026-10-10: "Prepare a Sunday study and Monday execution checklist").
 *
 * PURE. It reads the prop desk's own inputs and its one engine's reading (propEvaluation.ts) and
 * returns two short ordered checklists. Each step says whether the desk already shows it done
 * (DONE), still owes it (OPEN), or is a standing rule the trader follows (RULE).
 *
 * WHAT IT NEVER DOES (same law as the desk and Morning Prep's card):
 *   · no amount is worded as something to make on a day; the requirement is restated as the
 *     engine's arithmetic, nothing more;
 *   · no pass is promised and no position size is suggested beyond "inside your contract limit";
 *   · nothing is written — the trader's own boxes are the desk's inputs.
 */
import { formatCents, type PropInputs, type PropReading } from "./propEvaluation";

export type PlanStepState = "DONE" | "OPEN" | "RULE";
export interface PlanStep {
  readonly id: string;
  readonly text: string;
  readonly state: PlanStepState;
  /** Why the step is open, or what the desk reads today. */
  readonly detail?: string;
}
export interface WeekendPlan {
  readonly sunday: readonly PlanStep[];
  readonly monday: readonly PlanStep[];
  /** How many Sunday steps the desk still owes. */
  readonly openCount: number;
}

export const PROP_PLAN_NO_TARGET_LINE = "A plan of process, not a target: no day has to make any amount, and no trade is required." as const;

export function propWeekendPlan(inputs: PropInputs, r: PropReading): WeekendPlan {
  const sunday: PlanStep[] = [
    r.verified
      ? { id: "read-back", text: "Read balances and rules back from the firm's dashboard", state: "DONE" }
      : { id: "read-back", text: "Read balances and rules back from the firm's dashboard", state: "OPEN", detail: "UNVERIFIED — every figure on the desk is as typed" },
    r.drawdownFloorCents.known
      ? { id: "floor", text: "Confirm the drawdown method and today's floor", state: "DONE", detail: `floor ${formatCents(r.drawdownFloorCents.value)}` }
      : { id: "floor", text: "Confirm the drawdown method and today's floor", state: "OPEN", detail: r.drawdownFloorCents.why },
    inputs.contractLimit != null
      ? { id: "contracts", text: "Confirm the contract limit", state: "DONE", detail: `${inputs.contractLimit} contracts (as entered)` }
      : { id: "contracts", text: "Confirm the contract limit", state: "OPEN", detail: "not entered" },
    r.requiredNetProfitCents.known && r.remainingCents.known
      ? { id: "arithmetic", text: "Re-read the consistency arithmetic", state: "DONE", detail: `required ${formatCents(r.requiredNetProfitCents.value)} · remaining ${formatCents(r.remainingCents.value)} · best-day limit ${Math.round(inputs.consistencyLimit * 100)}%` }
      : { id: "arithmetic", text: "Re-read the consistency arithmetic", state: "OPEN", detail: !r.requiredNetProfitCents.known ? r.requiredNetProfitCents.why : !r.remainingCents.known ? r.remainingCents.why : "" },
    { id: "review", text: "Review the week's traded days and fills in the Journal", state: r.daysTraded > 0 ? "DONE" : "OPEN", detail: `${r.daysTraded} traded day${r.daysTraded === 1 ? "" : "s"} entered` },
    { id: "risk-plan", text: "Write your own risk plan in dollars before the open: the most you will lose on one trade and on the day", state: "RULE" },
  ];
  const monday: PlanStep[] = [
    { id: "prep", text: "Read Morning Prep · Prop evaluation · today before the bell", state: "RULE" },
    { id: "size", text: inputs.contractLimit != null ? `Size every trade from its stop, inside the contract limit (${inputs.contractLimit})` : "Size every trade from its stop, inside the contract limit (enter it on the desk)", state: "RULE" },
    { id: "stop-day", text: "Stop for the day at your own daily loss limit, well before the firm's floor", state: "RULE", detail: r.drawdownHeadroomCents.known ? `headroom to the floor today: ${formatCents(r.drawdownHeadroomCents.value)}` : `headroom: ${r.drawdownHeadroomCents.why}` },
    { id: "no-trade", text: "No setup, no trade — a day without a trade is a valid day", state: "RULE" },
    { id: "after", text: "After the close: enter the day's net in Daily results, then read the firm's dashboard back", state: "RULE" },
  ];
  return { sunday, monday, openCount: sunday.filter(s => s.state === "OPEN").length };
}
