/**
 * WAIT IS A FINISHED STATE — OR IT ISN'T, AND THE DIFFERENCE IS THE WHOLE JOB.
 *
 * ── The canon ────────────────────────────────────────────────────────────────
 *
 * Three independent mockups say the same sentence in three ways:
 *
 *   WM_NewMockup_064 — "SUCCESS STATE — No action required. Stand by."
 *   WM_NewMockup_094 — "SUCCESS — DECISION FINAL / NO FURTHER ANALYSIS REQUIRED"
 *   WM_NewMockup_123 — "WAIT AS A FINISHED STATE"
 *
 * The live rail (MEASURED 2026-09-20, /charts, BTC · 1h) says only:
 *
 *     NOW · STATE
 *     WAIT
 *     24X7
 *
 * A trader reading that cannot tell whether the product has FINISHED THINKING
 * and is telling them to stand down, or is still mid-sentence and expects them
 * to go and do something. Those are opposite instructions printed identically.
 * That ambiguity is the reason traders over-trade a WAIT: an unexplained wait
 * reads as an unfinished one, and an unfinished one invites poking at it.
 *
 * ── WHY THIS IS NOT A LABEL, AND WHERE THE ANSWER COMES FROM ─────────────────
 *
 * "No action required" is a CLAIM about the trader's job, and LIVING-PIXEL LAW
 * says it needs an owner. It has one, and the owner already exists:
 * `EvidenceDebt.missingPayable` — the count of outstanding nodes that something
 * can actually pay, built on `DecisionChainNode.payableBy`, which exists
 * precisely because the product once printed "Resolve regime" — an instruction
 * that was unfollowable 100% of the time.
 *
 * So the standing is DERIVED, never asserted:
 *
 *   WORKABLE      — `missingPayable > 0`. Something is owed AND payable. This
 *                   wait is not finished; there is a next act and it is the
 *                   trader's. Saying "stand by" here would tell a trader to sit
 *                   still in front of work only they can do.
 *
 *   VENUE_BLOCKED — nothing payable, but `venueBlocked > 0`. Measured directly,
 *                   and not on this feed. NOT finished and NOT workable: the
 *                   compiler's own doc says telling the trader to wait here "is
 *                   a lie with no expiry date". The act exists — change feed —
 *                   and it is not the one a finished wait implies.
 *
 *   FINISHED      — nothing payable and nothing venue-blocked. Whatever remains
 *                   outstanding is a COMPOSITION, which "mints nothing" and
 *                   "resolves only as a side effect of its inputs resolving",
 *                   or the ledger is clear and permission is withheld for a
 *                   reason the verdict already carries. Either way there is no
 *                   act, by this trader, on this venue, that shortens this
 *                   wait. THAT is a finished state, and it is the only case in
 *                   which this product may say so.
 *
 * ── WHAT IT REFUSES ──────────────────────────────────────────────────────────
 *
 * 1. IT ANSWERS ONLY FOR WAIT. ACTION, NO TRADE, CAUTION and UNKNOWN are other
 *    verdicts with other meanings; dressing any of them as "finished" would be
 *    this selector inventing a second permission compiler.
 *
 * 2. NO DEBT, NO ANSWER. A WAIT with no evidence ledger has nothing to derive
 *    from, so it returns null and the rail says only WAIT. A default of
 *    FINISHED would mean an unevaluated chain reads as a completed one — the
 *    single most flattering error available here.
 *
 * 3. IT NEVER SAYS "SUCCESS". The canon's word, and the wrong word for a
 *    product that must not congratulate a trader for an outcome it did not
 *    measure. A wait is finished or it is not; whether it was the right wait is
 *    a question only the journal can answer later.
 *
 * Pure / deterministic. No clock, no I/O. Renders elsewhere.
 */

import type { EvidenceDebt, RightOfWayReading } from "./decisionPermissionCompiler";

export type WaitStanding = "FINISHED" | "WORKABLE" | "VENUE_BLOCKED";

export interface WaitStandingVM {
  readonly standing: WaitStanding;
  /** The word the rail prints beside WAIT. Short enough to sit on one line. */
  readonly headline: string;
  /** One sentence naming WHY this wait is or is not finished. */
  readonly detail: string;
  /** Outstanding and payable now. Authoritative — never a label-array length. */
  readonly payable: number;
  /** Outstanding and not supplied by this venue. */
  readonly venueBlocked: number;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

export function selectWaitStanding(
  decision: RightOfWayReading | null | undefined,
  debt: EvidenceDebt | null | undefined,
): WaitStandingVM | null {
  // Refusal 1 — this selector speaks for exactly one verdict.
  if (!decision || decision.value !== "WAIT") return null;
  // Refusal 2 — nothing to derive from is not the same as nothing to do.
  if (!debt) return null;

  const payable = debt.missingPayable;
  const venueBlocked = debt.venueBlocked ?? 0;

  if (payable > 0) {
    return {
      standing: "WORKABLE",
      headline: `${payable} TO RESOLVE`,
      detail: `${payable} outstanding ${plural(payable, "condition", "conditions")} can be paid now. This wait is not finished.`,
      payable,
      venueBlocked,
    };
  }

  if (venueBlocked > 0) {
    return {
      standing: "VENUE_BLOCKED",
      headline: "VENUE CANNOT SUPPLY",
      detail: `${venueBlocked} outstanding ${plural(venueBlocked, "condition is", "conditions are")} measured directly and not on this feed. Waiting does not end this; changing feed does.`,
      payable,
      venueBlocked,
    };
  }

  return {
    standing: "FINISHED",
    headline: "FINISHED",
    detail:
      debt.missing > 0
        ? "Nothing outstanding can be worked on — what remains resolves when its own inputs do. No action required."
        : "The ledger is clear and permission is still withheld. No action required.",
    payable,
    venueBlocked,
  };
}

export default selectWaitStanding;
