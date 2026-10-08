/**
 * PLAN REVIEW, COMPOSED FOR ONE TRADE — Garden 19 §25–29, §31. PURE.
 *
 * Joins the Decision_ID lineage pieces Review needs: the frozen plan
 * (managementPlan), the plan-vs-actual findings (planVsActual), the
 * plan-alone reference (planCounterfactual) and SpaidBot's question
 * (spaidbotPlanReview). The trader's own "why did the plan change?" answer is
 * the only reason that ever reaches a finding.
 */

import { formatPlanReviewQuestion } from "@/lib/ai/spaidbotPlanReview";
import type { ManagementPlanSnapshot } from "./managementPlan";
import { planAloneReference, type PlanAloneReference } from "./planCounterfactual";
import { actualsFromJournalEntry, classifyPlanVsActual, findingsByDimension, type PlanDeviation, type PlanVsActualResult, type PricePath, type TradeActuals } from "./planVsActual";
import type { ReviewDimension } from "./storyReview";
import { sheriffColumns, type SheriffColumns } from "./planSheriff";
import { actualsFromBrokerStory, type StoryFillFact, type StoryOrderFact } from "./planActualsFromBroker";
import { actualsFromWebullStory, type WebullStoryFill } from "./planActualsFromWebull";

export interface PlanReviewInput {
  readonly plan: ManagementPlanSnapshot | null;
  readonly actuals: TradeActuals | null;
  readonly path?: PricePath | null;
  /** Why the trade facts could not be read for comparison (e.g. a multi-leg Webull order), said in Review. */
  readonly actualsRefusal?: string | null;
}

export interface ComposedPlanReview {
  readonly plan: ManagementPlanSnapshot | null;
  readonly result: PlanVsActualResult;
  readonly byDimension: Readonly<Partial<Record<ReviewDimension, readonly PlanDeviation[]>>>;
  readonly question: string;
  readonly planAlone: PlanAloneReference;
  /** §64: market / planned / actual, stated apart. */
  readonly sheriff: SheriffColumns;
}

export function composePlanReview(input: PlanReviewInput, traderReason?: string | null): ComposedPlanReview {
  const result = classifyPlanVsActual({ plan: input.plan, actuals: input.actuals, path: input.path ?? null, traderReason });
  return {
    plan: input.plan,
    result,
    byDimension: findingsByDimension(result),
    question: formatPlanReviewQuestion(input.plan, result, input.actuals),
    planAlone: planAloneReference({
      plan: input.plan,
      direction: input.actuals?.direction ?? null,
      entryAtMs: input.actuals?.entry?.atMs ?? null,
      entryPx: input.actuals?.entry?.px ?? null,
      path: input.path ?? null,
    }),
    sheriff: sheriffColumns(input),
  };
}

/** The Review input for a saved journal entry: its Decision_ID's frozen plan + its own prices. */
export function planReviewInputForJournalEntry(
  entry: Parameters<typeof actualsFromJournalEntry>[0] & { readonly capture?: { readonly decisionId: { readonly value: string | null } } | null },
  readPlan: (decisionId: string) => ManagementPlanSnapshot | null,
): PlanReviewInput | null {
  const id = entry.capture?.decisionId.value ?? null;
  if (!id) return null;
  let plan: ManagementPlanSnapshot | null = null;
  try { plan = readPlan(id); } catch { plan = null; }
  return { plan, actuals: actualsFromJournalEntry(entry), path: null };
}

/**
 * The Review input for a broker story (journal feed: tastytrade's order
 * readback + trade transactions under one Decision_ID). Fill times and stop /
 * target orders come from the broker, so the price path can be loaded for it.
 */
export function planReviewInputForBrokerStory(
  story: { readonly decisionId: string | null; readonly broker?: string; readonly orders: readonly (StoryOrderFact & { readonly symbol?: string | null })[]; readonly fills: readonly (StoryFillFact & WebullStoryFill & { readonly symbol?: string | null })[] },
  readPlan: (decisionId: string) => ManagementPlanSnapshot | null,
): (PlanReviewInput & { readonly symbol: string | null; readonly decisionId: string }) | null {
  if (!story.decisionId || (!story.fills.length && !story.orders.length)) return null;
  let plan: ManagementPlanSnapshot | null = null;
  try { plan = readPlan(story.decisionId); } catch { plan = null; }
  const symbol = story.fills.find(f => f.symbol)?.symbol ?? story.orders.find(o => o.symbol)?.symbol ?? null;
  if (story.broker === "webull") {
    // Webull: fills only, no open/close flag, no stop/target orders in the feed (planActualsFromWebull).
    const w = actualsFromWebullStory(story.fills);
    return w.ok
      ? { plan, actuals: w.actuals, path: null, symbol, decisionId: story.decisionId }
      : { plan, actuals: null, path: null, symbol, decisionId: story.decisionId, actualsRefusal: w.reason };
  }
  const actuals = actualsFromBrokerStory(story, { stopPx: plan?.base.stopPx.value ?? null, targetPx: plan?.base.targetPx.value ?? null });
  return { plan, actuals, path: null, symbol, decisionId: story.decisionId };
}
