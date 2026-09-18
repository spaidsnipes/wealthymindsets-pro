/**
 * selectContinuationQuestion — the ONE question the Continuation Health view
 * is answering.
 *
 * ASSET 15, "Question-Driven Continuation Health". The mockup puts a single
 * sentence in the chrome at the top of the screen — `QUESTION: Is this
 * continuation healthy?` — and everything beneath it is evidence bearing on
 * that sentence. This selector compiles that sentence from the reading
 * `selectContinuationHealth` already produced, in the shape the canonical
 * `ActiveQuestionBar` consumes.
 *
 * ── WHY THE MOCKUP'S EXACT STRING IS NOT THE ANSWER ─────────────────────────
 *
 * `Is this continuation healthy?` is a fine banner over a chart that HAS a
 * continuation. Rendered unchanged over a market that is rotating, it presumes
 * its own subject: it asks how healthy a move is, on a screen whose own
 * evidence says no move is in progress. The trader answers the question they
 * were asked, not the one they should have been.
 *
 * So the ROTATING state gets a different sentence — `Is anything continuing
 * here at all?` — and only the UNREADABLE state falls back to the mockup's
 * bare wording, because when nothing was compiled the general question is the
 * only honest one left to ask.
 *
 * ── THE FOCUS IS A SUBJECT, NEVER THE VERDICT ───────────────────────────────
 *
 * `QuestionFocusVM.focus` is contractually "a short noun phrase naming the
 * subject of the question. Never a claim." `vm.reason` already owns the
 * finding and renders on the same surface, so a focus reading "Contested
 * continuation" would put one fact under two owners on one screen — the defect
 * `ActiveQuestionBar`'s own docblock refuses by name. The focus names WHAT IS
 * BEING ASKED ABOUT; the reading answers it.
 *
 * ── NO SCORE REACHES THIS FILE ──────────────────────────────────────────────
 *
 * `selectContinuationHealth` mints no percentage, so there is none here to
 * render. The mockup's `CONTINUATION HEALTH SCORE 85%` has no owner and the
 * banner is the largest type on the canvas — the worst possible place for an
 * unauditable number.
 *
 * PURE / DETERMINISTIC — no React, no I/O, no clock. Asserts no market fact
 * that `selectContinuationHealth` has not already compiled.
 */

import type { ContinuationHealthVM } from "../marketData/viewModels/selectContinuationHealth";
import type { QuestionFocusVM } from "./selectQuestionFocus";

export const CONTINUATION_QUESTION_VERSION = "wm.continuation-question.v1" as const;

export interface ContinuationQuestionVM {
  /** The dominant question, ready to render at banner size. */
  readonly question: string;
  /** Its subject, in the shape `ActiveQuestionBar` already consumes. */
  readonly focus: QuestionFocusVM;
}

/**
 * The sequence in the words the structure owner uses, lowered for mid-sentence
 * use. Read off the reading rather than re-derived, so the banner and the rail
 * beneath it can never name different sequences.
 */
function sequencePhrase(vm: ContinuationHealthVM): string | null {
  const swing = vm.readings.find((r) => r.owner === "selectMarketStructure");
  if (!swing) return null;
  return swing.value.toLowerCase();
}

export function selectContinuationQuestion(
  vm: ContinuationHealthVM | null | undefined,
): ContinuationQuestionVM {
  if (!vm || vm.health === "UNREADABLE") {
    return {
      // The mockup's own wording, kept for exactly the case where nothing more
      // specific can honestly be asked.
      question: "Is this continuation healthy?",
      focus: {
        focus: "Continuation health — no sequence in hand",
        basis: "CONTINUATION_UNREADABLE",
        unresolved: true,
      },
    };
  }

  if (vm.health === "ROTATING") {
    // Both owners agree nothing is moving. Asking how healthy the continuation
    // is would presume a continuation the surface's own evidence denies.
    return {
      question: "Is anything continuing here at all?",
      focus: {
        focus: "Continuation health of a rotating market",
        basis: "CONTINUATION_ROTATING",
        unresolved: false,
      },
    };
  }

  const sequence = sequencePhrase(vm);
  const subject = sequence ? `the ${sequence} sequence` : "this sequence";

  // COHERENT and CONTESTED ask the SAME question on purpose. The question a
  // trader brings to the screen does not change because the answer did, and
  // `basis` keeps the two states distinguishable for anyone auditing which
  // reading drove the line.
  return {
    question: `Is ${subject} healthy enough to continue, or is the move already spent?`,
    focus: {
      focus: `Continuation health of ${subject}`,
      basis: vm.health === "COHERENT" ? "CONTINUATION_COHERENT" : "CONTINUATION_CONTESTED",
      unresolved: false,
    },
  };
}

export default selectContinuationQuestion;
