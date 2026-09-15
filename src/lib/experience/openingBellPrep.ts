/**
 * openingBellPrep — what the deck is actually allowed to say about your prep.
 *
 * WHY THIS EXISTS
 * ---------------
 * `/command-deck` rendered an Opening Bell readiness verdict built like this:
 *
 *     items: DEFAULT_PREPARATION_TEMPLATE.map((t) => ({ ...t, completed: false }))
 *
 * Every item hardcoded incomplete. `selectOpeningBell` is a good owner and did
 * exactly what it was told: six required items, at most one satisfiable from
 * data health, so the room returned **NOT_READY** with the advisory
 *
 *     "Preparation incomplete. Rushing preparation correlates with process failure."
 *
 * That sentence is a statement about the trader's behaviour this morning. It was
 * produced from **no observation of the trader whatsoever**. It rendered
 * identically for someone who finished every item and for someone whose browser
 * could not read their prep at all.
 *
 * This is H1 wearing a different coat. The export bug rendered absence as `0` in
 * a P&L column; this rendered absence as NOT DONE in a discipline column. Both
 * put an unearned value into a slot that promises a measurement — and this one
 * is worse in one specific way: a zero misstates the market, this misstates the
 * person, and then scolds them for it.
 *
 * It was also a room contradicting itself. `TodayPrepBridge`, a few hundred
 * lines away in the same file, already renders the trader's REAL count —
 * "7/11 checked" — from `useTodayPrep`. So the deck displayed the true number
 * and a verdict that ignored it, at the same moment, on the same screen.
 *
 * WHY THE FIX IS NOT "JUST PASS THE REAL CHECKLIST"
 * -------------------------------------------------
 * Because the two surfaces do not share a vocabulary, and one of them is
 * free-text:
 *
 *   · `DEFAULT_PREPARATION_TEMPLATE` is 8 items with stable ids
 *     (`htf-context`, `risk-budget`, `data-health`, …).
 *   · `/morning-prep` stores `{ id, text, done }` seeded from its own
 *     `STARTER_CHECKLIST`, and the trader can **add and remove items freely**.
 *
 * So we know a COUNT. We do not know WHICH. Mapping "7 of 11" onto eight named
 * rows would have to decide which named row the seventh tick was — and there is
 * no fact in the system that answers that. Inventing the mapping would be the
 * same defect again, one layer deeper and much harder to see, because this time
 * the fabricated per-item ticks would look like they came from the trader.
 *
 * LABEL-NOT-MODEL: a count is not a checklist. This module reports the count it
 * has, names the gap that stops it becoming a verdict, and stops there. No
 * inferred items, no partial credit, no readiness score.
 *
 * H1: `done` and `total` are `null` when nothing was observed — never `0`.
 *
 * PURE — no I/O, no clock, no DOM.
 */

/** Mirrors `MorningPrepReadState`; duplicated as a literal union so this owner takes no storage dependency. */
export type PrepReadState = "PRESENT" | "ABSENT" | "UNAVAILABLE";

export type PrepEvidenceKind =
  /** A prep entry for today was read. The count is real. */
  | "OBSERVED"
  /** Storage was readable and there is genuinely no entry for today. A finding. */
  | "NO_PREP_TODAY"
  /** Storage could not be read. NOT a finding — we know nothing. */
  | "UNREADABLE";

export interface PrepEvidenceInput {
  readonly readState: PrepReadState;
  readonly checklistDone: number;
  readonly checklistTotal: number;
}

export interface PrepEvidence {
  readonly kind: PrepEvidenceKind;
  /** Items the trader ticked. `null` — never 0 — unless actually observed. */
  readonly done: number | null;
  /** Items on the trader's list. `null` — never 0 — unless actually observed. */
  readonly total: number | null;
  /** What the room may say out loud. Always a full sentence, never a badge. */
  readonly sentence: string;
}

/**
 * Why the deck shows no READY / NOT READY verdict.
 *
 * Shipped as a named constant so the surface cannot quietly paraphrase it into
 * something softer, and so the Sentinel can assert the room actually renders it.
 */
export const PREP_VERDICT_WITHHELD =
  "No readiness verdict is shown. Your prep list lives in Morning Prep and uses " +
  "your own wording, so this room can count what you checked but cannot tell " +
  "which of the items below you checked — and it will not guess about you.";

function clampCount(n: unknown): number {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.trunc(n) : 0;
  return v < 0 ? 0 : v;
}

/**
 * Compile what is honestly known about this morning's preparation.
 *
 * Note the ordering: `UNAVAILABLE` is checked before anything else, because the
 * whole point of this module is that "we could not look" must never be allowed
 * to fall through into a sentence that sounds like "we looked and you failed".
 */
export function selectPrepEvidence(input: PrepEvidenceInput | null | undefined): PrepEvidence {
  if (input == null || input.readState === "UNAVAILABLE") {
    return {
      kind: "UNREADABLE",
      done: null,
      total: null,
      sentence:
        "Your morning prep could not be read in this browser. Nothing here is a " +
        "statement about what you did or did not do.",
    };
  }

  if (input.readState === "ABSENT") {
    // This one IS a finding: storage was readable and held no entry for today.
    // Said plainly, and without the word "incomplete" — the trader may have
    // prepared on paper, in another app, or in their head.
    return {
      kind: "NO_PREP_TODAY",
      done: null,
      total: null,
      sentence: "No morning prep was logged in WM today.",
    };
  }

  const done = clampCount(input.checklistDone);
  const total = clampCount(input.checklistTotal);

  if (total === 0) {
    // An entry exists but carries no checklist — the trader wrote an intention
    // without a list. Reporting "0 of 0 checked" would read as a failure; it is
    // simply a different shape of prep.
    return {
      kind: "OBSERVED",
      done: 0,
      total: 0,
      sentence: "Morning prep was logged today with no checklist items on it.",
    };
  }

  const capped = done > total ? total : done;
  return {
    kind: "OBSERVED",
    done: capped,
    total,
    sentence: `You checked ${capped} of ${total} item${total === 1 ? "" : "s"} on your own prep list this morning.`,
  };
}

export default selectPrepEvidence;
