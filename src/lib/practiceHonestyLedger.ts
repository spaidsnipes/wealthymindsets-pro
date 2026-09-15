/**
 * practiceHonestyLedger — the REVIEW-mode layer of the decision room.
 *
 * WHY THIS EXISTS
 * ---------------
 * Four separate atoms already measure the ways /paper is easier than a real
 * venue: resting-order expiry (`paperOrderTimeInForce`), cancel certainty
 * (`paperCancelCertainty`), stop realism (`paperStopRealism`) and short realism
 * (`paperShortRealism`), with fill realism (`paperExecutionRealism`) older than
 * all of them. Every one of those truths is rendered EXCLUSIVELY inside the
 * legacy /paper page's tab chrome.
 *
 * The Founder's visual canon (CURRENT WM VISUAL REPAIR LAW, 2026-09-13) names
 * the dominant failure as SCENE_FRAGMENTATION — "the new parent exists, but
 * NOW / MARKET / RISK / WHY / NEXT can still behave like separate screens,
 * cards, chrome or mini-apps" — and the Visual Implementation Pack's coverage
 * matrix names REVIEW / RECEIPT as an outright GAP. The Asset Ledger's own next
 * move is stated in one line: THE NEXT HIGH-VALUE MOVE IS THE NEW SCENE
 * CONSUMING THE REAL TRUTH.
 *
 * This module is that consumption. It is a COMPILER, not a fifth measurement:
 * it computes NOTHING about the book itself. Every number and every sentence it
 * returns was produced by the module that already owns that claim, and this
 * file only decides ORDER and PRESENCE. If a claim is wrong, it is wrong in its
 * owner, and fixing it there fixes it here — which is the single-writer rule the
 * deck already lives under.
 *
 * WHAT IT REFUSES
 * ---------------
 * · It mints no number. There is no total, no score, no percentage, no grade.
 *   A "practice realism: 62%" figure would be exactly the invented model the
 *   LABEL-NOT-MODEL law forbids, and there is no measurement behind it.
 * · It refuses nothing and blocks nothing. This is a REVIEW layer; it has no
 *   opinion about whether the trader should have done any of it.
 * · It returns NOTHING for an empty book. The anti-wallpaper rule: a trader who
 *   has not yet placed an order is owed silence, not a disclosure about fills
 *   that never happened.
 *
 * PURE — no React, no I/O, no clock of its own (`nowMs` is a parameter, because
 * a `Date.now()` in a render body was a traced root cause of React #418 here).
 */

import { selectExecutionRealism, type ExecutionRealismInput } from "./paperExecutionRealism";
import { selectCancelCertainty, type CancelCertaintyInput } from "./paperCancelCertainty";
import { selectStopRealism, type StopRealismInput } from "./paperStopRealism";
import { selectShortRealism, type ShortRealismInput } from "./paperShortRealism";
import {
  describeRestingBook,
  selectOrderRest,
  type TimeInForceInput,
} from "./paperOrderTimeInForce";

/**
 * Stable identity of each line, in room order.
 *
 * Ordered by WHEN IN THE TRADE'S LIFE the easement happened — entry, then rest,
 * then exit-by-cancel, then exit-by-stop — because that is the order the trader
 * lived it, not the order the modules were written in.
 */
export type PracticeEasementId =
  /** A position was opened that a real broker might not have allowed at all. */
  | "short-located"
  /** The fill itself was easier than a real one. */
  | "fill"
  /** The order sat in the book past a boundary a real venue would have enforced. */
  | "rest"
  /** The cancel could not lose its race. */
  | "cancel"
  /** The stop was a floor rather than a trigger. */
  | "stop";

export interface PracticeEasement {
  readonly id: PracticeEasementId;
  /** The owning module's own heading. Never rewritten here. */
  readonly heading: string;
  /** The owning module's own sentences. Never rewritten, never truncated. */
  readonly sentences: readonly string[];
}

export interface PracticeHonestyLedger {
  /**
   * The easements that ACTUALLY OCCURRED in this book, in room order.
   *
   * Empty is the normal state of a fresh book and is not an error.
   */
  readonly easements: readonly PracticeEasement[];
  /**
   * The room's one-line caption, or null when there is nothing to say.
   *
   * It names a COUNT OF KINDS, which is the only number in this file, and it is
   * `easements.length` — an honest fact about the list immediately below it,
   * not a claim about the market or about the trader.
   */
  readonly caption: string | null;
}

const EMPTY: PracticeHonestyLedger = { easements: [], caption: null };

export interface PracticeBook {
  readonly orders?: readonly (ExecutionRealismInput &
    CancelCertaintyInput &
    StopRealismInput &
    TimeInForceInput)[];
  readonly positions?: readonly ShortRealismInput[];
}

/**
 * Compile the REVIEW ledger for a practice book.
 *
 * `nowMs` is only forwarded to the resting-order owner, which is the single
 * claim here that depends on the calendar.
 */
export function selectPracticeHonestyLedger(
  book: PracticeBook | null | undefined,
  nowMs: number,
): PracticeHonestyLedger {
  if (!book) return EMPTY;
  const orders = book.orders ?? [];
  const positions = book.positions ?? [];
  if (orders.length === 0 && positions.length === 0) return EMPTY;

  const easements: PracticeEasement[] = [];

  // 1. ENTRY — could the position have been opened at all?
  const short = selectShortRealism(positions);
  if (short.heading != null && short.sentences.length > 0) {
    easements.push({ id: "short-located", heading: short.heading, sentences: short.sentences });
  }

  // 2. FILL — was the fill itself easier than a real one?
  //
  // `paperExecutionRealism` owns assumptions but no heading: it predates the
  // heading convention the later three share. Rather than reach into it and
  // change a shipped owner to satisfy this consumer, the caption is written
  // here from its OWN measured field (`filledCount`). No new measurement.
  const exec = selectExecutionRealism(orders);
  if (exec.assumptions.length > 0 && exec.filledCount > 0) {
    easements.push({
      id: "fill",
      heading:
        exec.filledCount === 1
          ? "1 fill was easier than a real one would have been"
          : `${exec.filledCount} fills were easier than real ones would have been`,
      sentences: exec.assumptions.map((a) => a.sentence),
    });
  }

  // 3. REST — did the order survive a boundary a real venue would have enforced?
  //
  // The resting owner is shaped differently from the other three: it publishes
  // a book-level HEADING (`describeRestingBook`) and a PER-ORDER SENTENCE
  // (`selectOrderRest(...).sentence`), because what an order's rest means
  // depends on how many session boundaries THAT order crossed. So the ledger
  // collects the distinct sentences the book actually produced, in first-seen
  // order, and de-duplicates them — five overnight orders say one thing once,
  // not five times. Nothing is rewritten and nothing is summarised: every
  // string below came out of the owner verbatim.
  const restHeading = describeRestingBook(orders, nowMs);
  if (restHeading != null) {
    const seen = new Set<string>();
    const restSentences: string[] = [];
    for (const o of orders) {
      if (o?.status !== "pending") continue;
      const r = selectOrderRest(o, nowMs);
      if (r.basis !== "overnight" && r.basis !== "outlived-day-order") continue;
      if (r.sentence == null || seen.has(r.sentence)) continue;
      seen.add(r.sentence);
      restSentences.push(r.sentence);
    }
    if (restSentences.length > 0) {
      easements.push({ id: "rest", heading: restHeading, sentences: restSentences });
    }
  }

  // 4. CANCEL — could the cancel have lost?
  const cancel = selectCancelCertainty(orders);
  if (cancel.heading != null && cancel.sentences.length > 0) {
    easements.push({ id: "cancel", heading: cancel.heading, sentences: cancel.sentences });
  }

  // 5. STOP — was the stop a floor rather than a trigger?
  const stop = selectStopRealism(orders);
  if (stop.heading != null && stop.sentences.length > 0) {
    easements.push({ id: "stop", heading: stop.heading, sentences: stop.sentences });
  }

  if (easements.length === 0) return EMPTY;

  return {
    easements,
    caption:
      easements.length === 1
        ? "1 way this practice book was easier than a real venue"
        : `${easements.length} ways this practice book was easier than a real venue`,
  };
}
