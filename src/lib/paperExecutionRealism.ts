/**
 * WHAT /paper's FILLS ASSUMED — the disclosure the trader was never given.
 *
 * ── THE MEASURED GAP ──────────────────────────────────────────────────
 * /paper discloses a great deal, and all of it is about the MONEY:
 *
 *   "PAPER SIMULATION · BROWSER-LOCAL. Your existing $100,000 simulated
 *    account is preserved; this does not create a … funded account …"
 *   "⚠ Paper simulation only. … it never trades real money."
 *
 * Every one of those sentences says the same thing: the dollars are not real.
 * Not one of them says the FILL is not real. Those are different claims, and
 * only the first was ever made.
 *
 * The second claim is written down — but in a comment, where no trader will
 * ever read it. `selectOrderFill`'s docblock says the fill is deliberately
 * "no slippage, no spread, no queue position". `FillQueueBasisNote`'s docblock
 * says silence "is NOT a claim that the fill was realistic — a market order
 * still books at the last observed price with no slippage". Both are correct.
 * Both are invisible.
 *
 * That is canon weakness #9, PAPER-FILL OVERCONFIDENCE, in its purest form: a
 * simulator that is candid in its source and confident on its screen.
 *
 * ── WHY THE TWO SENTENCES BELOW, AND NOT FIVE ─────────────────────────
 * Most of what a paper fill cannot know is ALREADY owned and ALREADY rendered:
 *
 *   - queue priority at a limit  -> `paperFillQueueBasis.ts`, rendered per
 *                                   order by `FillQueueBasisNote`, and only on
 *                                   the `at-the-touch` fills it is true of.
 *   - the age of the price filled on -> `quoteObservedAt` / `fillPriceAgeMs` /
 *                                   `describeFillPriceAge`.
 *
 * Hoisting those into a standing panel would state them about fills they are
 * not true of, which is the overclaim this file exists to close, pointed the
 * other way. So they stay where they are, and this owns only the two
 * assumptions that are UNIVERSAL to every fill /paper has ever booked and that
 * have no home at all:
 *
 *   1. NO SPREAD WAS CROSSED. The fill price is a trade print. A real buy
 *      lifts the offer; a real sell hits the bid. Every paper fill is
 *      therefore at least the spread better than the market would have given,
 *      in the trader's favour, systematically, every time.
 *   2. SIZE WAS FREE. Any quantity fills in full at one price. The quote
 *      pipeline behind /paper carries `price`, `observedAt` and nothing else —
 *      see `PaperQuoteReadiness`, which has no bid, no ask and no depth. It is
 *      not that the model sizes badly; there is no input from which size impact
 *      could be computed at all.
 *
 * ── LABEL, NOT MODEL ──────────────────────────────────────────────────
 * Nothing here estimates a spread, a slippage, a fill probability or a depth
 * curve. We cannot: no bid, no ask, no book. Naming the DIRECTION and the
 * CERTAINTY of an advantage needs no number. Minting the number would be the
 * defect, not the cure.
 *
 * ── AND NOT WALLPAPER ─────────────────────────────────────────────────
 * This returns nothing at all until the trader has actually taken a fill.
 * Before that there is no fill to caveat, and a permanent banner is a banner
 * nobody reads.
 */

/** The order fields this disclosure is allowed to read. Nothing else matters. */
export interface ExecutionRealismInput {
  readonly status: string;
  readonly qty: number;
}

export type ExecutionAssumptionId =
  /** Booked at a trade print; a real order would have crossed the spread. */
  | "no-spread"
  /** Any size filled in full at one price; there is no depth data. */
  | "unbounded-size";

export interface ExecutionAssumption {
  readonly id: ExecutionAssumptionId;
  readonly sentence: string;
}

export interface ExecutionRealism {
  /** How many orders in this book actually filled. */
  readonly filledCount: number;
  /**
   * The largest single filled quantity, or null when nothing filled.
   *
   * DERIVED, never stored: read off orders that were already persisted, so a
   * fill booked before this disclosure existed is described by exactly the same
   * rule as one booked today.
   */
  readonly largestFillQty: number | null;
  /** Empty until at least one order has filled. */
  readonly assumptions: readonly ExecutionAssumption[];
}

const NONE: ExecutionRealism = {
  filledCount: 0, largestFillQty: null, assumptions: [],
};

/** Pure. */
export function selectExecutionRealism(
  orders: readonly ExecutionRealismInput[] | null | undefined,
): ExecutionRealism {
  if (!orders || orders.length === 0) return NONE;

  let filledCount = 0;
  let largest = 0;
  for (const o of orders) {
    if (o?.status !== "filled") continue;
    filledCount++;
    const q = Math.abs(Number(o.qty));
    if (Number.isFinite(q) && q > largest) largest = q;
  }

  if (filledCount === 0) return NONE;

  const largestFillQty = largest > 0 ? largest : null;

  const sizeSentence =
    largestFillQty == null
      // A filled order whose quantity did not survive is still a filled order,
      // and the assumption still held for it. Refusing to say so because one
      // field is unreadable would hide a true statement behind a missing digit.
      ? "Size was free. Any quantity fills in full at a single price — /paper " +
        "has no order-book depth, so your size never moved the price against you."
      : `Size was free. Your largest fill was ${largestFillQty}, booked in full ` +
        `at a single price — /paper has no order-book depth, so your size never ` +
        `moved the price against you.`;

  return {
    filledCount,
    largestFillQty,
    assumptions: [
      {
        id: "no-spread",
        sentence:
          "No spread was crossed. Fills are booked at a trade print, but a real " +
          "buy pays the offer and a real sell hits the bid — so every fill here " +
          "was at least the spread better than the market would have given you.",
      },
      { id: "unbounded-size", sentence: sizeSentence },
    ],
  };
}

/**
 * The heading for the disclosure, or null when there is nothing to disclose.
 *
 * Null before the first fill is the whole point — see the note on wallpaper.
 */
export function describeExecutionRealism(r: ExecutionRealism): string | null {
  if (r.filledCount === 0) return null;
  return r.filledCount === 1
    ? "Your 1 fill was easier than a real one would have been"
    : `Your ${r.filledCount} fills were easier than real ones would have been`;
}
