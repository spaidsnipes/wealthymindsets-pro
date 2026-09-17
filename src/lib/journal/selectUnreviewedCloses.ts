/**
 * "A CLOSED DECISION IS AWAITING YOUR REVIEW" — SAID FROM A SOURCE THAT CAN SAY IT.
 *
 * THE DEFECT. /command-deck derives `hasUnreviewedClose` from `decisionRecords`
 * alone. That array comes from `decisionMemoryStore`, whose only ingress —
 * `DecisionMemoryStore.put()` — has ZERO production callers; the reachability
 * suite pins this. So the boolean is not "usually false", it is STRUCTURALLY
 * false for every owner, forever. Two consequences, both visible:
 *
 *   · `inferJobMode` can never suggest REVIEW by way of a closed decision.
 *   · `selectCompletionState` walks past its step-4 ACTIVE branch and can
 *     reach DONE — "The current job's acceptance criteria are truthfully
 *     complete" — or CHECKPOINT, to a trader with closed trades sitting in
 *     their Journal that they have not yet judged themselves on.
 *
 * That is the same shape as the `hasOpenPosition` repair one line above it:
 * a `false` that was a DEFAULT, not a FINDING. §14.1.
 *
 * WHY THIS IS NOT THE FORBIDDEN RUSH-WIRE. The instruction on Decision Memory
 * is to SURFACE the orphaned capability, not to invent a caller for it. This
 * module invents nothing: it does not write to the store, does not seal a
 * decision, and does not claim the store is reachable. It reads the Journal —
 * a real book, written by the trader through a real form, already read on this
 * same surface for the Learning Genome — and answers the review question from
 * the only evidence that exists today. When somebody does wire decision
 * sealing, this stays correct and the two sources union.
 *
 * WHAT COUNTS AS UNREVIEWED. `processQuality === "UNRESOLVED"`. That is the
 * field the Journal's own review flow writes when the trader judges whether
 * they followed their plan, and `hydrateJournalEntries` defaults it to
 * UNRESOLVED precisely so an unanswered question reads as unanswered rather
 * than as a pass. It is never inferred from P&L — money is not process.
 *
 * WHAT DOES NOT COUNT. An M0 no-trade day. The trader deliberately did not
 * take a directional decision, so there is no decision to review, and counting
 * it would tell a disciplined day of sitting on his hands that he owes
 * homework.
 *
 * WHY TODAY IS SEPARATED FROM THE BACKLOG. An unreviewed close from March must
 * not pin the Exit Ramp to ACTIVE for the rest of the trader's life — a
 * blocker that can never clear is indistinguishable from a broken gate, and
 * the trader learns to ignore it. Only TODAY's unreviewed closes block the
 * ramp. Older ones are returned as `backlog` so a surface can disclose them
 * without holding the door shut.
 *
 * PURE. No clock, no storage, no React. The caller owns "what day is it".
 */
import type { JournalEntry } from "./hydrateJournalEntries";

export interface UnreviewedCloses {
  /** Unreviewed closes dated today — work genuinely owed before leaving. */
  readonly today: number;
  /** Unreviewed closes from any earlier day — disclosed, never blocking. */
  readonly backlog: number;
  /** today + backlog. */
  readonly total: number;
  /** Reviewable closes considered, reviewed or not. Excludes M0 days. */
  readonly reviewable: number;
  /**
   * The signal `inferJobMode` and `deriveCompletionSignals` consume. TRUE only
   * for today's unreviewed closes — see the backlog note above.
   */
  readonly hasUnreviewedClose: boolean;
}

const NONE: UnreviewedCloses = Object.freeze({
  today: 0,
  backlog: 0,
  total: 0,
  reviewable: 0,
  hasUnreviewedClose: false,
});

/**
 * An M0 day is a recorded decision NOT to trade. There is no close to review.
 * Absent `dayModel` is not M0 — absent means the record does not say, and a
 * record that does not say still describes a trade with an entry and an exit.
 */
function isReviewableClose(e: JournalEntry): boolean {
  return e.dayModel !== "M0";
}

export function selectUnreviewedCloses(
  entries: readonly JournalEntry[] | null | undefined,
  todayIso: string,
): UnreviewedCloses {
  if (!Array.isArray(entries) || entries.length === 0) return NONE;

  let today = 0;
  let backlog = 0;
  let reviewable = 0;

  for (const e of entries) {
    if (!isReviewableClose(e)) continue;
    reviewable += 1;
    if (e.processQuality !== "UNRESOLVED") continue;
    // A date the reader could not make sense of is not evidence that the close
    // happened today. It falls to the backlog, which discloses without blocking.
    if (e.date === todayIso) today += 1;
    else backlog += 1;
  }

  return {
    today,
    backlog,
    total: today + backlog,
    reviewable,
    hasUnreviewedClose: today > 0,
  };
}
