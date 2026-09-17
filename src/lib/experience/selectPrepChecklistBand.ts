/**
 * THE PREP COUNT, GIVEN A SHAPE — AND THE FOUR TIMES IT MUST NOT BE DRAWN.
 *
 * `/command-deck` renders the trader's morning-prep count twice, on one screen:
 *
 *   · `OpeningBellSlot` → `selectPrepEvidence` → "You checked 7 of 11 items on
 *     your own prep list this morning." A careful sentence from the owner.
 *   · `TodayPrepBridge` → `{prep.checklistDone}/{prep.checklistTotal} checked`,
 *     read RAW off the adapter, in brass.
 *
 * Two computations of one fact (§24), and the raw one is in the wrong register:
 * the house grammar reserves brass for the one direction it may raise its
 * voice, and a count of items the trader ticked is a FINDING, which the house
 * renders in ivory. The bare fraction also carries none of the owner's
 * refusals — it is simply a different road to the same number, and a second
 * road is how two numbers on one screen start to disagree.
 *
 * This gives the count a shape, from the owner's own `PrepEvidence`, so the
 * bridge can stop doing arithmetic of its own.
 *
 * ── WHAT IT REFUSES ──────────────────────────────────────────────────────────
 *
 * 1. NOTHING OBSERVED DRAWS NOTHING. `UNREADABLE` means the browser could not
 *    read the trader's prep. A band of unlit marks would render "we could not
 *    look" as "you did nothing" — which is H1 exactly, and is the defect the
 *    owning module was written to end. `NO_PREP_TODAY` is refused for the same
 *    reason: it is a finding about STORAGE, and the trader may have prepared on
 *    paper, in another app, or in their head.
 *
 * 2. AN EMPTY LIST DRAWS NOTHING. `total === 0` is a prep entry with no
 *    checklist — an intention written without a list. That is a different SHAPE
 *    of prep, not a failed one, and a band with no marks under a count reads as
 *    zero-of-zero failure.
 *
 * 3. THE MARKS ARE ANONYMOUS, AND MUST STAY THAT WAY. The system knows HOW MANY
 *    items were ticked and never WHICH — `/morning-prep` stores the trader's own
 *    free text, and the owner's docblock refuses to invent the mapping. Marks
 *    carry no id, no label and no order derived from the list. It follows that
 *    this band MAY NOT BE DRAWN BESIDE A NAMED ITEM LIST: adjacency would invite
 *    the reader to map the third mark to the third row, which would fabricate
 *    exactly the mapping the owner declined to fabricate, and it would look like
 *    it came from the trader.
 *
 * 4. NO READINESS VERDICT AND NO PERCENTAGE (§15). Three of eleven items is not
 *    27% prepared, and a full band is not READY. The band reports a count; the
 *    room's refusal to grade it is stated in `PREP_VERDICT_WITHHELD` and is not
 *    weakened here.
 *
 * Pure / deterministic / no clock. Renders elsewhere.
 */

import type { PrepEvidence } from "./openingBellPrep";

export interface PrepChecklistMark {
  /** True for an item the trader ticked. Anonymous — never says WHICH. */
  readonly checked: boolean;
}

export interface PrepChecklistBand {
  readonly marks: readonly PrepChecklistMark[];
  readonly done: number;
  readonly total: number;
  /** `total - done`. Items still on the trader's own list. */
  readonly remaining: number;
}

export function selectPrepChecklistBand(
  evidence: PrepEvidence | null | undefined,
): PrepChecklistBand | null {
  if (!evidence) return null;

  // Refusal 1 — only an OBSERVED count may be drawn. The other two kinds carry
  // `null` counts precisely so they cannot be mistaken for zero.
  if (evidence.kind !== "OBSERVED") return null;

  const { done, total } = evidence;
  if (done == null || total == null) return null;

  // Refusal 2 — a list that does not exist has no shape.
  if (total <= 0) return null;

  // The owner already clamps and caps, so a disagreement here means the owner
  // was bypassed. Refusing is the only answer that does not draw the bypass as
  // if it were a reading.
  if (done < 0 || done > total) return null;

  return {
    marks: [
      ...Array.from({ length: done }, () => ({ checked: true })),
      ...Array.from({ length: total - done }, () => ({ checked: false })),
    ],
    done,
    total,
    remaining: total - done,
  };
}

export default selectPrepChecklistBand;
