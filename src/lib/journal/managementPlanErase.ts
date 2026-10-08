/**
 * ERASING A PLAN LEAVES NOTHING BEHIND — Garden 19 §47–51. Storage injected.
 *
 * A plan is one record per Decision_ID (managementPlanStore); its dated
 * amendments live inside it. Everything else that READS it — the Review's
 * plan-vs-actual rows, Personal Edge's adherence counts, the FVG study list,
 * SpaidBot's plan line — is derived on read, so once the record is gone they
 * have nothing to show. The one piece of trader text tied to the plan is the
 * "why did the plan change?" answer (StoryReview.planWhy) on the review keyed
 * by that decision; erasing the plan clears it too, so no answer is left
 * pointing at a plan that no longer exists. The rest of the review (marks,
 * notes, lesson) is the trader's and is kept.
 */

import { deletePlanForDecision } from "./managementPlanStore";
import { parseStoryReviews, storyReviewKey } from "./storyReview";

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;

/** Review keys that belong to a decision: the Decision_ID itself, or `broker|tail|<id>`. */
export function reviewKeyBelongsTo(key: string, decisionId: string): boolean {
  return key === decisionId || key.endsWith(`|${decisionId}`);
}

export interface EraseReceipt {
  readonly planRemoved: boolean;
  readonly planWhyCleared: number;
}

export function erasePlanForDecision(storage: Storage | null | undefined, decisionId: string): EraseReceipt {
  if (!storage || !decisionId) return { planRemoved: false, planWhyCleared: 0 };
  const planRemoved = deletePlanForDecision(storage, decisionId);
  let cleared = 0;
  const reviewKey = storyReviewKey();
  if (!reviewKey) return { planRemoved, planWhyCleared: 0 };
  try {
    const all = { ...parseStoryReviews(storage.getItem(reviewKey)) };
    for (const [k, r] of Object.entries(all)) {
      if (!reviewKeyBelongsTo(k, decisionId) || r.planWhy == null) continue;
      const { planWhy: _gone, ...rest } = r;
      all[k] = rest;
      cleared++;
    }
    if (cleared) storage.setItem(reviewKey, JSON.stringify(all));
  } catch { /* the plan is still removed */ }
  return { planRemoved, planWhyCleared: cleared };
}
