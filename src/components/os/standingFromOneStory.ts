/**
 * standingFromOneStory — ONE reading of "what a compiled story means to the
 * chrome above it."
 *
 * ── The measured failure ─────────────────────────────────────────────────────
 *
 * Observed live on https://wealthymindsetspro.com/charts after the shell
 * collapse. The ROOM said, in its own pixels:
 *
 *     DECISION … WAIT
 *     9 unpaid evidence nodes
 *     Right-of-way is withheld
 *
 * while the OS masthead and rail — the chrome drawn AROUND that room — said:
 *
 *     EVIDENCE DEBT   UNKNOWN   no ledger compiled
 *     RIGHT OF WAY    UNKNOWN   no permission reading
 *
 * The frame was LESS confident than the room feeding it. The canon treats that
 * as the exact mirror of an overclaim, not as a safe default: a screen that
 * says UNKNOWN beside its own answer has two owners of one fact and is wrong in
 * whichever direction the reader believes.
 *
 * Root cause: `/charts` never called `usePublishOsStanding`. `/command-deck`
 * did, and it derived the standing INLINE.
 *
 * ── Why a function and not a copy ────────────────────────────────────────────
 *
 * The obvious repair was to paste the deck's three-line expression into
 * ChartsDashboard. That would have made every room its own author of "how a
 * debt reads as a standing" — five rooms, five chances for the null-vs-zero
 * rule below to drift apart. Same defect class as the shells, one layer down.
 *
 * So the derivation is extracted, exported, and tested as a pure function. Both
 * rooms call it; a room added tomorrow calls it too. Nothing here touches React
 * — it takes a compiled story and returns the part of `OsStanding` that a story
 * can actually justify, leaving `surface` (which only the room knows) to the
 * caller.
 */

import type { OneStoryVM } from "@/lib/marketData/viewModels/selectOneStory";

import type { OsStanding } from "./osStandingContext";

/**
 * The portion of the OS standing that a compiled ONE STORY can justify.
 *
 * `surface` is deliberately absent: only the room knows its own name, and a
 * shared function inventing one would be the same two-owners mistake in the
 * other direction.
 */
export type StoryDerivedStanding = Pick<
  OsStanding,
  "openEvidenceItems" | "rightOfWay" | "rightOfWayResolved"
>;

/**
 * A room with no compiled story publishes IGNORANCE, not zero.
 *
 * `openEvidenceItems: 0` would render as "EVIDENCE DEBT 0 OPEN" — a paid
 * ledger. A ledger that was never opened is not a paid one.
 */
export function standingFromOneStory(oneStory: OneStoryVM | null | undefined): StoryDerivedStanding {
  if (!oneStory) {
    return {
      openEvidenceItems: null,
      rightOfWay: "UNKNOWN",
      rightOfWayResolved: false,
    };
  }

  const debt = oneStory.debt;

  return {
    // `debt.payable === 0` means the chain produced no GRADEABLE dimensions to
    // owe against, which is an unopened ledger — not a settled one. Only a chain
    // that actually has payable dimensions can report how many are unpaid.
    //
    // `payable`, not the chain length: a chain of nothing but WATCH nodes has
    // graded nothing, and must not read as a paid ledger.
    //
    // ── The third head of the same defect (2026-09-16, found by USE) ─────────
    //
    // This read `debt.missing`. On one screenshot of the live deck:
    //
    //     rail  ·  EVIDENCE DEBT   8 OPEN     unpaid information
    //     cell  ·  EVIDENCE DEBT   0 of 9 paid
    //              9 evidence nodes unpaid: regime + direction +6;
    //              1 warned: permission
    //
    // ONE label, ONE set, TWO numbers. Unlike the passport band's "8
    // dimensions" beside the ledger's "9 nodes" — where both counts were
    // correct because they counted different sets — these two claim the same
    // set, so one of them is simply wrong. This one was.
    //
    // `debt.missing` omits the WARN bucket. `payable = resolved + missing +
    // warn` is definitional, so UNPAID is `payable - resolved`, which is
    // `missing + warn`. A contested node is a debt; it is counted with the
    // unknowns even though it is NAMED apart from them (see `missingPhrase`).
    //
    // This is the third place the identical omission surfaced: the ledger
    // sentence (2026-09-03), the lead count (99a87fd), and now the frame. The
    // Orkin reading is that the bucket was never the bug — the arithmetic was
    // restated by hand at every site instead of being derived once. The new
    // guard is written against `payable - resolved`, so a fourth bucket cannot
    // revive it here either.
    //
    // It is worth naming WHERE this one landed. This file exists because the
    // frame once said UNKNOWN while the room beneath it had an answer, and the
    // canon treats a frame less confident than its room as an overclaim's exact
    // mirror. A frame quietly SOFTER by one node is the same failure wearing a
    // smaller coat.
    openEvidenceItems: debt && debt.payable > 0 ? debt.payable - debt.resolved : null,
    rightOfWay: oneStory.decision.value,
    // UNKNOWN is a reading the compiler can legitimately return. It is still
    // not a RESOLVED one, so the chrome must not present it as settled.
    rightOfWayResolved: oneStory.decision.value !== "UNKNOWN",
  };
}
