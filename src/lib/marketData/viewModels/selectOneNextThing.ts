import {
  hiddenRemainder,
  type EvidenceDebt,
  type RightOfWay,
  type RightOfWayReading,
} from "./decisionPermissionCompiler";

/**
 * A NEXT THAT REPEATS NOW IS NOT A NEXT.
 *
 * `/charts` renders a decision rail whose last cell is labelled NEXT. It was
 * printing `oneStory.decision.value` — the Right-of-Way verdict. So the rail
 * read:
 *
 *     WAIT   (gold chip, from selectMarketCanvas → whyNot.verdict)
 *     ...
 *     NEXT
 *     WAIT   (from oneStory.decision.value)
 *
 * The same field, twice, under two labels. Both trace to one producer
 * (`computeRightOfWay`), so they could never DISAGREE — this was not a
 * two-owner defect. It was worse in a quieter way: a whole cell of a
 * seven-cell rail was spending itself restating a conclusion the trader had
 * already read, while the one thing NEXT exists to answer went unasked.
 *
 * The Founder canon is explicit about what NEXT is for:
 *
 *   "NOW  — current market/job state.
 *    NEXT — one decision-relevant thing capable of changing the job."
 *
 *   ONE-NEXT-THING ENGINE — "compile the single next market fact or human
 *   action capable of changing the trader's job. It never generates a
 *   buy/sell signal and never replaces the strategy contract."
 *
 * WAIT is not capable of changing the job. WAIT *is* the job. Naming it under
 * NEXT is a category error that happens to be true, which is the hardest kind
 * to see.
 *
 * This selector compiles the actual next thing from the SAME inputs the
 * verdict came from — no new owner, no second brain, no fetch, no clock. It
 * derives, it does not measure. If nothing can honestly be named, it says so
 * rather than inventing a task.
 *
 * SINGULAR ON PURPOSE. Nine unpaid evidence nodes produce ONE next thing —
 * the first one — with the remaining eight disclosed as a count, never as a
 * list. A "next thing" that is nine things is a backlog, and the trader is
 * back to scanning. The canon's word is *single*.
 *
 * Pure / deterministic. Renders elsewhere.
 */

export type OneNextThingKind =
  /** Evidence is unpaid. Paying the first one is the next thing. */
  | "PAY_EVIDENCE"
  /** A hard rule is engaged. Only the rule releasing changes the job. */
  | "AWAIT_RELEASE"
  /** Soft caution. Re-reading the flagged evidence changes the job. */
  | "REASSESS"
  /** Right of way is clear and nothing is attached. */
  | "CHOOSE_EXPRESSION"
  /** Right of way is clear and an expression is attached. */
  | "MANAGE_EXPRESSION"
  /** Nothing was evaluated. WM cannot name a next thing without lying. */
  | "ESTABLISH_EVIDENCE";

export interface OneNextThing {
  readonly kind: OneNextThingKind;
  /**
   * The single next thing capable of changing the job.
   *
   * INVARIANT: never a RightOfWay value. If this string can ever equal
   * "WAIT" / "ACTION" / "NO TRADE" / "CAUTION" / "UNKNOWN", the cell has
   * reverted to restating NOW and the Sentinel below fails by name.
   */
  readonly headline: string;
  /** What specifically, and why it is the one. Rendered, never decorative. */
  readonly detail: string;
}

export interface OneNextThingInput {
  /** The compiled Right-of-Way reading, or null when none was compiled. */
  readonly rightOfWay: RightOfWayReading | null;
  /** The evidence ledger the verdict was computed from, or null. */
  readonly debt: EvidenceDebt | null;
  /** True when an instrument expression is already attached to the decision. */
  readonly hasExpression: boolean;
}

/**
 * The set of words this selector may never emit as a headline.
 *
 * TOTAL over RightOfWay on purpose: a sixth verdict added to the compiler
 * fails the build here rather than silently becoming a legal "next thing"
 * and quietly restoring the exact defect this module was written to end.
 */
const VERDICT_WORDS: Record<RightOfWay, true> = {
  ACTION: true,
  WAIT: true,
  "NO TRADE": true,
  CAUTION: true,
  UNKNOWN: true,
};

/** True when `text` is merely a verdict wearing a NEXT label. */
export function isVerdictEcho(text: string): boolean {
  return Object.prototype.hasOwnProperty.call(VERDICT_WORDS, text.trim().toUpperCase());
}

function payEvidence(debt: EvidenceDebt): OneNextThing {
  const first = debt.missingLabels[0];
  if (first === undefined) {
    // The ledger counts a debt it cannot name. Report the gap honestly
    // rather than inventing a label to make the sentence read well.
    return {
      kind: "PAY_EVIDENCE",
      headline: "Resolve the unpaid evidence",
      detail: `${debt.missing} evidence node${debt.missing === 1 ? "" : "s"} unpaid — none is named by the ledger, so WM cannot say which to read first.`,
    };
  }
  // The remainder derives from the AUTHORITATIVE count, never the capped
  // sample array. See hiddenRemainder() — this is the "9 nodes … +1" defect.
  const rest = hiddenRemainder(debt.missing, 1);
  return {
    kind: "PAY_EVIDENCE",
    headline: `Resolve ${first.toLowerCase()}`,
    detail: `${first.toLowerCase()} is the first of ${debt.missing} unpaid evidence node${debt.missing === 1 ? "" : "s"}${rest ? ` (${rest.trim()} behind it)` : ""}. Resolving it does not authorise entry — it removes one block.`,
  };
}

/**
 * Compile the one next thing capable of changing the trader's job.
 *
 * Never returns a buy/sell instruction and never returns a verdict.
 */
export function selectOneNextThing(input: OneNextThingInput): OneNextThing {
  const { rightOfWay, debt, hasExpression } = input;

  if (rightOfWay === null) {
    return {
      kind: "ESTABLISH_EVIDENCE",
      headline: "Establish the evidence ledger",
      detail: "No right-of-way reading was compiled, so nothing is known about what would change the job.",
    };
  }

  switch (rightOfWay.value) {
    case "WAIT":
      // WAIT is produced by unpaid evidence (compiler Rule 1). The next
      // thing is the first unpaid node — not the waiting itself.
      if (debt && debt.missing > 0) return payEvidence(debt);
      return {
        kind: "ESTABLISH_EVIDENCE",
        headline: "Establish the evidence ledger",
        detail: `Right of way is withheld (${rightOfWay.detail}) but no evidence ledger explains it, so WM cannot name what would release it.`,
      };

    case "NO TRADE":
      return {
        kind: "AWAIT_RELEASE",
        headline: "Wait for the rule to release",
        detail: `A hard rule is engaged — ${rightOfWay.detail}. No market evidence changes this job; only the rule releasing does.`,
      };

    case "CAUTION":
      return {
        kind: "REASSESS",
        headline: "Re-read the flagged evidence",
        detail: `${rightOfWay.detail}. A watch node is observed but not blocking — reading it is what moves the job, not more waiting.`,
      };

    case "ACTION":
      return hasExpression
        ? {
            kind: "MANAGE_EXPRESSION",
            headline: "Manage the attached expression",
            detail: "Right of way is clear and an expression is attached. The job is now management, not entry.",
          }
        : {
            kind: "CHOOSE_EXPRESSION",
            headline: "Choose how to express the thesis",
            detail: `${rightOfWay.detail}. Nothing is attached yet — selecting an expression is what moves the job.`,
          };

    case "UNKNOWN":
      return {
        kind: "ESTABLISH_EVIDENCE",
        headline: "Establish the evidence ledger",
        detail: `${rightOfWay.detail}. Until the required evidence is evaluated, WM cannot name what would change the job — and will not guess.`,
      };
  }
}

export default selectOneNextThing;
