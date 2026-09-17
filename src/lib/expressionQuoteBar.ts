/**
 * THE SPREAD, DRAWN — what crossing the book costs before the thesis is tested.
 *
 * `ShortlistTile` prints the quote as three numbers in a row:
 *
 *     bid 1.20 · ask 1.85 · last 1.40
 *
 * Every figure is real and the most important fact on the line is not stated
 * anywhere: the trader pays 1.85 and can immediately only sell at 1.20, so
 * thirty-five percent of the premium is gone the instant the ticket fills. The
 * direction can be right and the contract still lose — which is the exact
 * failure `expressionShortlist`'s own header refuses to hide, and which two
 * adjacent decimals do not communicate to a human eye scanning three tiles.
 *
 * This compiles the proportion so FAST, BALANCED and MORE TIME can be RANKED
 * against each other on the one axis that is pure cost.
 *
 * ── WHAT THIS REFUSES ────────────────────────────────────────────────────────
 *
 * 1. NO VERDICT. There is no `wide` flag, no WIDE/TIGHT badge, no colour that
 *    means "good fill". A threshold separating an acceptable spread from an
 *    unacceptable one is a market judgement about liquidity, horizon and size,
 *    and this module holds none of those. §8 bans prophecy; a bar that graded
 *    the book would be prophecy with a smaller vocabulary. It draws the
 *    proportion and lets the trader rank three tiles by eye.
 *
 * 2. A MISSING SIDE IS NOT ZERO. An absent bid does not mean nobody bids — it
 *    means this snapshot did not observe one. Coercing it to 0 would draw a
 *    100%-spread bar, the loudest possible claim, out of an absence. Returns
 *    null instead, and the tile keeps saying "not observed" in words.
 *
 * 3. A CROSSED OR NON-POSITIVE BOOK REFUSES TO DRAW. ask < bid is not a
 *    negative spread to be rendered mirror-image; it is a book this module
 *    cannot read. ask <= 0 has no axis to divide by. Both return null.
 *
 * Pure / deterministic / no clock. Freshness is the age gate's job and is
 * already rendered beside this as the quote and trade observation sentences —
 * this bar deliberately does not restate it, because a proportion that looked
 * fresh would be making a claim it cannot support.
 */

import type { OptionContract } from "./optionContractResponse";

export interface ExpressionQuoteBar {
  readonly bid: number;
  readonly ask: number;
  /** Midpoint of the observed book. Not a fill, not a fair value. */
  readonly mid: number;
  /** ask − bid, in premium. */
  readonly spread: number;
  /**
   * The spread as a share of the ASK, 0–100 — the axis the bar is drawn on.
   *
   * Ask rather than mid is deliberate. The ask is what the buyer actually
   * hands over, so "share of ask" answers the trader's real question: of the
   * money I am about to spend, how much of it is the gap? Dividing by mid
   * would report a smaller number for the same book, and this line may never
   * round in the flattering direction.
   */
  readonly spreadPctOfAsk: number;
  /** Share of the ask that is NOT the gap. Always 100 − spreadPctOfAsk. */
  readonly bidPctOfAsk: number;
}

function observed(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function selectExpressionQuoteBar(
  contract: OptionContract | null,
): ExpressionQuoteBar | null {
  if (!contract) return null;

  const bid = observed(contract.bid);
  const ask = observed(contract.ask);
  // An unobserved side is UNKNOWN, never zero. See refusal 2.
  if (bid === null || ask === null) return null;
  // No axis, or a book this module cannot read. See refusal 3.
  if (ask <= 0 || bid < 0 || ask < bid) return null;

  const spread = ask - bid;
  const spreadPctOfAsk = (spread / ask) * 100;

  return {
    bid,
    ask,
    mid: (bid + ask) / 2,
    spread,
    spreadPctOfAsk,
    // Subtraction rather than a second division, so the two shares cannot
    // round into a gap or an overlap that belongs to nobody.
    bidPctOfAsk: 100 - spreadPctOfAsk,
  };
}

export default selectExpressionQuoteBar;
