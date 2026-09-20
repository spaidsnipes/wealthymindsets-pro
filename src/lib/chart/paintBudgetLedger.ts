/**
 * paintBudgetLedger — B-801 PAINT BUDGET, made measurable.
 *
 * THE SHEET. Blueprint B-801 draws paint as a metered budget allocated per
 * room: the compositor frame rate is a fixed setting the budget must fit
 * inside, and WASTE IS A DECLARED LINE ITEM. Not "avoided" — declared. The
 * sheet's whole point is that an overrun you cannot read is not a budget, it
 * is a hope.
 *
 * WHAT WAS ALREADY TRUE, AND WHAT WAS NOT. `chartOverlayGovernor.ts` DECLARES
 * the allocation — 33ms standard, 50ms when a profile is active — and decides
 * per frame whether to paint. That half is sound and well-tested. The other
 * half did not exist: nothing measured what a paint actually COST, so the
 * running app could not be asked the only question that matters about a
 * budget —
 *
 *     is it being met, and when it is not, by how much and how often?
 *
 * A single overlay paint that takes 60ms cannot hold a 50ms cadence no matter
 * how correct the governor's arithmetic is. The governor would keep returning
 * DRAW, the frames would keep arriving late, and every receipt in the system
 * would keep saying everything was fine, because nothing was counting.
 *
 * THIS IS THE SAME FINDING B-501 ENDED ON, at a different scale: a law the
 * running app cannot be asked about is not enforceable, however carefully it
 * is written in the source. So this module exists to be READ OFF THE GLASS,
 * not to change what paints.
 *
 * PURE MODULE — no DOM, no clock, no React. Durations are INJECTED by the
 * caller, the same discipline `decisionIdentity.ts` uses for time and
 * randomness, and for the same reason: a ledger that reads its own clock
 * cannot be tested against an adversarial one.
 *
 * DELIBERATELY NOT A RUNNING AVERAGE OF EVERYTHING. The ledger is bounded by
 * a window and rolls over, because a chart left open for six hours would
 * otherwise report a mean dominated by a market that closed hours ago. A
 * budget receipt describes the paint happening NOW.
 */

import type { OverlaySkipReason } from "@/lib/chartOverlayGovernor";

/**
 * How many draws a ledger accumulates before it rolls over.
 *
 * At the standard 33ms allocation this is roughly four seconds of paint —
 * long enough that one unlucky frame cannot dominate the mean, short enough
 * that the receipt still describes the current market rather than a
 * remembered one.
 */
export const PAINT_LEDGER_WINDOW_DRAWS = 120;

export interface PaintBudgetLedger {
  /** The allocation these figures were measured against, in milliseconds. */
  readonly budgetMs: number;
  readonly drawn: number;
  readonly skippedByBudget: number;
  readonly skippedByHidden: number;
  readonly skippedByBadClock: number;
  /** Sum of measured draw durations in the current window. */
  readonly totalDrawMs: number;
  /** The single worst paint in the window. The mean hides exactly this. */
  readonly longestDrawMs: number;
  /**
   * Draws whose OWN duration exceeded the whole frame allocation.
   *
   * This is the declared line item B-801 asks for. A paint that costs more
   * than its frame cannot hold the cadence, and this is the only number that
   * says so — the governor cannot know it, because it decides BEFORE the
   * paint and this is only knowable after.
   */
  readonly overBudgetDraws: number;
  /** How many times the window has rolled over. Non-zero means "steady state". */
  readonly windowsCompleted: number;
}

function ledger(over: Partial<PaintBudgetLedger> & { budgetMs: number }): PaintBudgetLedger {
  return {
    drawn: 0,
    skippedByBudget: 0,
    skippedByHidden: 0,
    skippedByBadClock: 0,
    totalDrawMs: 0,
    longestDrawMs: 0,
    overBudgetDraws: 0,
    windowsCompleted: 0,
    ...over,
  };
}

export function emptyPaintLedger(budgetMs: number): PaintBudgetLedger {
  // A non-finite or non-positive allocation is not a budget. Zero is carried
  // forward honestly rather than substituted, so `budgetMet` below can refuse
  // to render a verdict instead of inventing a passing one.
  return ledger({ budgetMs: Number.isFinite(budgetMs) && budgetMs > 0 ? budgetMs : 0 });
}

/**
 * Re-base the ledger when the allocation itself changes.
 *
 * Toggling a Volume Profile moves the budget from 33ms to 50ms. Continuing to
 * accumulate across that boundary would produce a mean measured against two
 * different contracts and an `overBudgetDraws` count that silently changed its
 * definition halfway through — a number whose meaning depends on when you
 * started reading is worse than no number.
 */
export function withPaintBudget(current: PaintBudgetLedger, budgetMs: number): PaintBudgetLedger {
  const next = Number.isFinite(budgetMs) && budgetMs > 0 ? budgetMs : 0;
  return next === current.budgetMs ? current : emptyPaintLedger(next);
}

/** Record one completed paint and what it cost. */
export function recordPaint(current: PaintBudgetLedger, durationMs: number): PaintBudgetLedger {
  // An unmeasurable paint must not be scored as a free one. `performance.now()`
  // differences can be NaN across a clock adjustment, and a NaN folded into
  // totalDrawMs would poison every subsequent mean with no visible cause.
  if (!Number.isFinite(durationMs) || durationMs < 0) return current;

  const rolled = current.drawn >= PAINT_LEDGER_WINDOW_DRAWS
    ? ledger({ budgetMs: current.budgetMs, windowsCompleted: current.windowsCompleted + 1 })
    : current;

  return {
    ...rolled,
    drawn: rolled.drawn + 1,
    totalDrawMs: rolled.totalDrawMs + durationMs,
    longestDrawMs: Math.max(rolled.longestDrawMs, durationMs),
    overBudgetDraws:
      rolled.budgetMs > 0 && durationMs > rolled.budgetMs
        ? rolled.overBudgetDraws + 1
        : rolled.overBudgetDraws,
  };
}

/**
 * Record a frame that did NOT paint, keeping the three reasons distinct.
 *
 * The governor already refuses to collapse them and explains why; collapsing
 * them HERE would undo that at the reporting layer. A BUDGET skip is the
 * governor working. A HIDDEN skip is the tab backgrounded. A BAD_CLOCK skip
 * should never happen at all, and a receipt that shows any is reporting a
 * permanently frozen overlay disguised as ordinary pacing.
 */
export function recordSkip(current: PaintBudgetLedger, reason: OverlaySkipReason): PaintBudgetLedger {
  switch (reason) {
    case "BUDGET":    return { ...current, skippedByBudget: current.skippedByBudget + 1 };
    case "HIDDEN":    return { ...current, skippedByHidden: current.skippedByHidden + 1 };
    case "BAD_CLOCK": return { ...current, skippedByBadClock: current.skippedByBadClock + 1 };
    default:          return current;
  }
}

/** Mean cost of a paint in the current window, or null when nothing was painted. */
export function meanPaintMs(l: PaintBudgetLedger): number | null {
  return l.drawn === 0 ? null : l.totalDrawMs / l.drawn;
}

/**
 * Is the room living inside its allocation?
 *
 * `null` — not "true" — when there is no allocation or nothing has painted
 * yet. An unmeasured budget reported as MET is precisely the false green this
 * module was written to remove.
 */
export function budgetMet(l: PaintBudgetLedger): boolean | null {
  if (l.budgetMs <= 0 || l.drawn === 0) return null;
  return l.overBudgetDraws === 0;
}

/**
 * The receipt, as dataset attributes.
 *
 * Returned as a plain map rather than written here, so this module stays pure
 * and the renderer keeps sole ownership of its own canvas. Keys are returned
 * in `dataset` camelCase; the DOM spells them `data-paint-*`.
 *
 * Durations are rounded to a tenth of a millisecond — finer than that is noise
 * from the timer itself, and publishing noise as precision is its own small
 * overclaim.
 */
export function paintLedgerReceipt(l: PaintBudgetLedger): Record<string, string> {
  const mean = meanPaintMs(l);
  const met = budgetMet(l);
  const receipt: Record<string, string> = {
    paintBudgetMs: String(l.budgetMs),
    paintDrawn: String(l.drawn),
    paintSkippedBudget: String(l.skippedByBudget),
    paintOverBudget: String(l.overBudgetDraws),
    paintLongestMs: String(Math.round(l.longestDrawMs * 10) / 10),
    // UNMEASURED is a real answer and the honest one before the first paint.
    paintBudgetMet: met === null ? "UNMEASURED" : met ? "MET" : "EXCEEDED",
  };
  if (mean !== null) receipt.paintMeanMs = String(Math.round(mean * 10) / 10);
  // Only stamped when non-zero. A steady stream of `data-paint-hidden="0"` on
  // every chart would train a reader to ignore the attribute that matters on
  // the one occasion it does not say zero.
  if (l.skippedByHidden > 0) receipt.paintSkippedHidden = String(l.skippedByHidden);
  if (l.skippedByBadClock > 0) receipt.paintSkippedBadClock = String(l.skippedByBadClock);
  if (l.windowsCompleted > 0) receipt.paintWindows = String(l.windowsCompleted);
  return receipt;
}
