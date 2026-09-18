/**
 * selectQuestionFocus — the SUBJECT of the one dominant question.
 *
 * Founder Visual Systems Canon (2026-09-15 COMPLETE VISUAL CUTOVER): every
 * concept still in the canon opens with an ACTIVE QUESTION banner that carries
 * THREE things, not one:
 *
 *     ACTIVE QUESTION   "Is seller effort being absorbed into this level?"
 *     QUESTION FOCUS    Absorption of Seller Effort
 *     STATE             Evidence Debt / Right of Way
 *
 * `routeQuestion` already compiles the QUESTION. Nothing compiled the FOCUS —
 * the short noun phrase naming what the question is actually about — so the
 * deck rendered the question as a bare 13px italic subtitle with no subject.
 *
 * THIS SELECTOR ASSERTS NO MARKET FACT. It only names which already-compiled
 * canonical field is driving the current question, and echoes that field's own
 * words back. `basis` is the audit trail: every rendered focus phrase must be
 * traceable to the canonical producer named there. That is LIVING-PIXEL LAW —
 * a pixel with no owner is not allowed on the canvas.
 *
 * PURE / DETERMINISTIC — no React, no I/O, no clock.
 *
 * ── 2026-09-18: SAYING NOTHING NUMERIC BECAME SAYING NOTHING AT ALL ───────
 *
 * The EVIDENCE_DEBT branch showed two labels out of a list that is itself
 * capped at EVIDENCE_LABEL_SAMPLE_LIMIT, and marked the truncation nowhere.
 * Read live on production /command-deck?symbol=BTC at one instant:
 *
 *     EVIDENCE DEBT     5 OPEN · unpaid information
 *     QUESTION FOCUS    Unpaid evidence: Location + Auction
 *
 * Five are unpaid; two are named; nothing on the line says so. A trader reads
 * that as the complete list and believes paying two nodes clears the debt.
 * The adjacent cell says 5. Canon Weakness #1, two cells apart.
 *
 * The old rule — "names the sample and says nothing numeric" — was written to
 * prevent a REAL defect (a count derived from the capped array, which once
 * rendered "9 evidence nodes unpaid: regime + direction +1"). But it banned
 * the cure along with the disease. `hiddenRemainder(debt.missing, shown)`
 * derives the remainder from the AUTHORITATIVE count, so its number has an
 * owner and cannot contradict the cell that owns it.
 *
 * `selectOneStory.missingPhrase` had this exactly right, with the same
 * `slice(0, 2)`, one directory away. A law applied in one place and missed in
 * its sibling — the same species this repo has now named three times. Both
 * sites call ONE owner (§24: a second CALLER is fine, a second ANSWER is not).
 */

import { hiddenRemainder } from "../marketData/viewModels/decisionPermissionCompiler";
import type { OneStoryVM } from "../marketData/viewModels/selectOneStory";

export const QUESTION_FOCUS_VERSION = "wm.question-focus.v1" as const;

/**
 * Which canonical field the focus phrase was read from.
 *
 * Deliberately an enum and not a free string: a reviewer can grep every
 * possible origin, and a future field cannot be quietly rendered without
 * appearing here first.
 */
export type QuestionFocusBasis =
  | "CONTRADICTION" // oneStory.contradiction — the strongest evidence against
  | "EVIDENCE_DEBT" // oneStory.debt.missingLabels — unpaid evidence nodes
  | "DECISION" //      oneStory.decision.detail — the right-of-way reading
  | "PRIMARY" //       oneStory.primary — the resolved market chapter
  | "UNRESOLVED"; //   nothing compiled at all

export interface QuestionFocusVM {
  /** Short noun phrase naming the subject of the question. Never a claim. */
  readonly focus: string;
  /** The canonical field `focus` was derived from. Audit trail. */
  readonly basis: QuestionFocusBasis;
  /**
   * True when the engine resolved nothing, so the surface must render its
   * honest UNRESOLVED look rather than a confident-looking subject line.
   */
  readonly unresolved: boolean;
}

/** Strip a trailing period so the focus reads as a label, not a sentence. */
function asLabel(text: string): string {
  return text.replace(/\s*[.!?]+\s*$/, "").trim();
}

/**
 * The focus tracks the SAME precedence `routeQuestion` uses to pick the
 * question, so the banner's two lines can never disagree about their subject.
 *
 * A contradiction outranks evidence debt because an active objection to a
 * resolved thesis is a louder subject than a gap; debt outranks the decision
 * because canon rejection #1 makes a WAIT verdict a CONSEQUENCE of the debt,
 * and naming the consequence would hide the cause.
 */
export function selectQuestionFocus(oneStory: OneStoryVM | null): QuestionFocusVM {
  if (!oneStory) {
    return { focus: "Market state unresolved", basis: "UNRESOLVED", unresolved: true };
  }

  if (oneStory.contradiction) {
    return {
      focus: asLabel(oneStory.contradiction),
      basis: "CONTRADICTION",
      unresolved: false,
    };
  }

  const debt = oneStory.debt;
  if (debt && debt.missing > 0 && debt.missingLabels.length > 0) {
    // Name the unpaid nodes themselves, and DISCLOSE the ones not named.
    //
    // The AUTHORITATIVE count is `missing`. `missingLabels` is capped at
    // EVIDENCE_LABEL_SAMPLE_LIMIT and must never be used as a count — that is
    // the "+1 contradicting the 9" defect `hiddenRemainder` was written for.
    // The remainder below is derived from `missing`, so it is not a minted
    // number: it is the owner's own count, minus what this line showed.
    const shown = debt.missingLabels.slice(0, 2);
    const rest = hiddenRemainder(debt.missing, shown.length);
    return {
      focus: `Unpaid evidence: ${asLabel(shown.join(" + "))}${rest}`,
      basis: "EVIDENCE_DEBT",
      unresolved: false,
    };
  }

  if (oneStory.decision.value !== "UNKNOWN" && oneStory.decision.detail) {
    return {
      focus: asLabel(oneStory.decision.detail),
      basis: "DECISION",
      unresolved: false,
    };
  }

  // `primary` always holds a sentence — but when no chapter resolved it holds
  // the engine's own REASON for silence, which is an honest subject, not a
  // market claim. `story.current` is what distinguishes the two, and by this
  // point selectOneStory has already encoded that in contradictionDetectability.
  if (oneStory.contradictionDetectability === "NOTHING_TO_COMPARE") {
    return { focus: asLabel(oneStory.primary), basis: "UNRESOLVED", unresolved: true };
  }

  return { focus: asLabel(oneStory.primary), basis: "PRIMARY", unresolved: false };
}

export default selectQuestionFocus;
