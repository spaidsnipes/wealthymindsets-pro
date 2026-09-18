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

/**
 * A LABEL IS A NAME. LOWERCASING A NAME CAN DESTROY IT.
 *
 * ── The measured defect ───────────────────────────────────────────────────
 *
 * Production /charts?symbol=TSLA, immediately after the venue-blocking atom
 * landed. The NEXT cell read:
 *
 *     Resolve available r
 *     available r is the first directly-resolvable of 7 unpaid evidence nodes…
 *
 * The node's label is `"Available R"`. The R is the R-multiple — the unit the
 * entire Proof Lane, the journal's Planned/Realized columns and the shutdown
 * gate are denominated in. `.toLowerCase()` applied to the whole string turned
 * a named unit into a stray letter, and "available r" is not a thing the
 * product has ever called anything.
 *
 * `CLC` had the same fate waiting one node further on.
 *
 * ── Why the rule is per-WORD and not per-LABEL ─────────────────────────────
 *
 * Mid-sentence, "Direction" genuinely should read "direction" — sentence case
 * is what makes these sentences read as prose rather than as a form. The
 * defect is not lowercasing; it is lowercasing INDISCRIMINATELY.
 *
 * So each word is judged on its own shape. A plain capitalised word
 * (`/^[A-Z][a-z]+$/`) is an ordinary noun and is lowered. Anything else — an
 * acronym (`CLC`), a bare unit (`R`), an internally-capitalised name — was
 * capitalised ON PURPOSE by whoever authored the label, and this function has
 * no standing to overrule that. "Available R" becomes "available R".
 *
 * WHY NOT A LIST OF EXCEPTIONS: a hard-coded set of acronyms is a second place
 * to remember when a node is added, and the node author would have no reason
 * to look here. The shape of the word already carries the intent.
 */
export function inSentence(label: string): string {
  return label
    .split(" ")
    .map((w) => (/^[A-Z][a-z]+$/.test(w) ? w.toLowerCase() : w))
    .join(" ");
}

/**
 * A COMPOSITION IS NOT A DEBT THE TRADER CAN PAY.
 *
 * ── The measured defect ───────────────────────────────────────────────────
 *
 * Production /charts?symbol=TSLA, 12:06Z. The NEXT cell read:
 *
 *     Resolve regime
 *     regime is the first of 7 unpaid evidence nodes (+6 behind it).
 *
 * Regime mints no evidence — `deriveRegimeDimension` says so in its own
 * capitals. It resolves when direction and volatility resolve, and by no other
 * route. So the one cell on the rail whose entire job is to name an ACTION had
 * named something no action can reach, and told the trader it was FIRST.
 *
 * "First" was reporting the order regime happens to be declared in the node
 * array. The word read as priority and owned nothing (LIVING-PIXEL LAW).
 *
 * The rule below is deliberately the weakest one that fixes it: prefer a node
 * something can actually pay, keeping the ledger's existing order WITHIN that
 * preference. No new priority is invented — WM does not claim to know which
 * payable node matters most, and saying so would be a second fabrication
 * replacing the first. When nothing payable is unpaid, it says THAT, out loud,
 * rather than falling back to instructing the impossible.
 */
function payEvidence(debt: EvidenceDebt): OneNextThing {
  const payableFirst = debt.missingPayableLabels[0];
  const blocked = debt.venueBlocked ?? 0;
  const blockedFirst = debt.venueBlockedLabels?.[0];

  if (payableFirst === undefined) {
    // THE FEED IS THE BLOCKER, AND THAT IS A HUMAN ACTION, NOT A WAIT.
    //
    // Checked BEFORE the composition branch below, because when both kinds are
    // present the venue block is the one the trader can actually do something
    // about — and "wait for the compositions" would be advice with no end.
    //
    // The canon's ONE-NEXT-THING ENGINE names this lane explicitly: "the single
    // next market fact OR HUMAN ACTION capable of changing the trader's job."
    // Connecting a tape source is exactly such an action. This is the first
    // time the engine has had grounds to emit one.
    //
    // It names no vendor and no price. WM knows THAT the lane is absent because
    // the publisher established it; WM does not know which venue this trader
    // should buy, and inventing a recommendation here would be a fresh
    // fabrication in place of the one removed.
    if (blocked > 0 && blockedFirst !== undefined) {
      return {
        kind: "ESTABLISH_EVIDENCE",
        headline: "Connect a per-trade data source",
        detail: `${blocked} unpaid node${blocked === 1 ? "" : "s"} — ${inSentence(blockedFirst)} among them — ${blocked === 1 ? "is" : "are"} measured directly, but this feed does not carry the lane they read. Waiting will not resolve them; only a venue that publishes that data will.`,
      };
    }

    const named = debt.missingLabels[0];
    if (named === undefined) {
      // The ledger counts a debt it cannot name. Report the gap honestly
      // rather than inventing a label to make the sentence read well.
      return {
        kind: "PAY_EVIDENCE",
        headline: "Resolve the unpaid evidence",
        detail: `${debt.missing} evidence node${debt.missing === 1 ? "" : "s"} unpaid — none is named by the ledger, so WM cannot say which to read first.`,
      };
    }
    // Every unpaid node is a composition (or was never classified). There is
    // no action. Naming one anyway is what this branch exists to refuse.
    return {
      kind: "ESTABLISH_EVIDENCE",
      headline: "Nothing here can be worked on",
      detail: `All ${debt.missing} unpaid node${debt.missing === 1 ? "" : "s"} — ${inSentence(named)} among them — are composed from other readings rather than measured directly. None can be resolved by any action; each clears only when its own inputs do.`,
    };
  }

  // The remainder derives from the AUTHORITATIVE count, never the capped
  // sample array. See hiddenRemainder() — this is the "9 nodes … +1" defect.
  // It counts ALL unpaid nodes, not just payable ones: the trader is owed the
  // true size of the debt even though only some of it is workable.
  const rest = hiddenRemainder(debt.missing, 1);
  // TWO DIFFERENT REASONS A NODE CANNOT BE WORKED ON, AND THEY ARE NOT
  // INTERCHANGEABLE. Before venueBlocked existed, `missing - missingPayable`
  // was entirely compositions, so one sentence covered it. It no longer is, and
  // calling a venue-blocked node "composed from other readings" would be a
  // brand-new false statement — direction IS measured directly; the feed simply
  // does not carry the lane. Each count now gets its own clause, and a count of
  // zero gets no clause at all.
  const derived = debt.missing - debt.missingPayable - (debt.venueBlocked ?? 0);
  const blockedNote = blocked > 0
    ? ` ${blocked} of them cannot be resolved on this feed at all — they are measured directly, but this venue does not publish the lane they read.`
    : "";
  const derivedNote = derived > 0
    ? ` ${derived} of them cannot be worked on at all — they are composed from other readings and clear on their own.`
    : "";
  return {
    kind: "PAY_EVIDENCE",
    headline: `Resolve ${inSentence(payableFirst)}`,
    detail: `${inSentence(payableFirst)} is the first directly-resolvable of ${debt.missing} unpaid evidence node${debt.missing === 1 ? "" : "s"}${rest ? ` (${rest.trim()} behind it)` : ""}.${blockedNote}${derivedNote} Resolving it does not authorise entry — it removes one block.`,
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
