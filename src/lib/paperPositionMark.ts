/**
 * MARKING AN OPEN POSITION — and the green +0.00 that meant "we have no price".
 *
 * ── THE MEASURED DEFECT ───────────────────────────────────────────────
 * /paper marked every open position with
 *
 *     marketPx:  prices[pos.symbol] ?? pos.avgPx,
 *     unrealPnl: ((prices[pos.symbol] ?? pos.avgPx) - pos.avgPx) * pos.qty * mult,
 *
 * Two separate overclaims sit in that one expression.
 *
 * 1. `?? pos.avgPx` — WHEN THERE IS NO PRICE, MARK AT ENTRY. The subtraction
 *    then yields exactly 0, and `PositionRow` does `const up = pos.unrealPnl >= 0`,
 *    so an UNMARKED position renders a GREEN `+0.00` and a GREEN `+0.00%`. The
 *    page told the trader their position was flat. It did not know anything
 *    about their position. Absence rendered as zero — H1 — at the money line,
 *    wearing the colour reserved for "you are not losing".
 *
 * 2. `prices[...]` IS NOT THE PRICE PAPER MAY ACT ON. `useLivePrices` writes
 *    `snap[sym] = readiness.price` whenever the price is non-null, and
 *    `readiness.price` stays non-null across the STALE transition on purpose so
 *    the tape can keep rendering a last-known number.
 *    `actionablePaperQuotePrice` — whose docblock says it "returns the only
 *    price Paper execution/derivation code may act on" — was never consulted.
 *    So a quote past the freshness budget silently marked the book and moved
 *    the equity curve.
 *
 * The option branch two lines further down in the same function ALREADY calls
 * `actionablePaperQuotePrice` and refuses to synthesize a mark without one. One
 * function, two lines apart, two different standards of proof for the same
 * question. That is the tell.
 *
 * ── WHAT THIS DOES INSTEAD ────────────────────────────────────────────
 * A mark is `number | null`, and null is NOT the entry price.
 *
 * - `actionable` — a fresh quote. Mark it, no caveat.
 * - `stale`      — a real observation, past the freshness budget. STILL MARKED,
 *                  because a trader holding risk is better served by a labelled
 *                  old number than by a blank, and `ageMs` is carried so the
 *                  label can say how old. But it is NEVER silently equal to an
 *                  actionable mark: the basis travels with the number.
 * - `unmarked`   — no observation at all. `markPx`, `unrealPnl` and `pct` are
 *                  all null. The row renders "—", never "+0.00", and never in
 *                  green.
 *
 * ── LABEL, NOT MODEL ──────────────────────────────────────────────────
 * Nothing here invents a price. There is no interpolation, no decay toward
 * entry, no last-good-plus-drift. The cure for "we do not know" is to say so.
 */

/** How much proof stands behind a mark. */
export type PositionMarkBasis =
  /** A quote inside the freshness budget. */
  | "actionable"
  /** A real observation, past the budget. Marked, and labelled as old. */
  | "stale"
  /** No observation. NOT the entry price. */
  | "unmarked";

/** The only fields of a position this marking is permitted to read. */
export interface PositionMarkInput {
  readonly qty: number;
  readonly avgPx: number;
}

/**
 * The quote facts this marking needs. Deliberately a narrow structural type
 * rather than `PaperQuoteReadiness`, so the owner is testable without the
 * whole market-data stack — and so callers cannot pass a raw number by
 * accident and lose the actionability distinction.
 */
export interface PositionMarkQuote {
  readonly actionable: boolean;
  readonly price: number | null;
  readonly ageMs: number | null;
}

export interface PositionMark {
  readonly basis: PositionMarkBasis;
  /** Null when unmarked. NEVER defaulted to the entry price. */
  readonly markPx: number | null;
  /** Null when unmarked. NEVER 0 — 0 asserts a measured breakeven. */
  readonly unrealPnl: number | null;
  /** Percent move on the position's direction, or null when unmarked. */
  readonly pct: number | null;
  /** Age of the observation behind the mark, when known. */
  readonly ageMs: number | null;
}

const UNMARKED: PositionMark = {
  basis: "unmarked", markPx: null, unrealPnl: null, pct: null, ageMs: null,
};

function finitePositive(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

/**
 * Pure.
 *
 * `multiplier` is the contract point value. It scales the MONEY line only;
 * `markPx` stays a quoted price so the blotter matches the tape, and `pct` is a
 * price ratio and therefore multiplier-free.
 */
export function selectPositionMark(
  pos: PositionMarkInput,
  quote: PositionMarkQuote | null | undefined,
  multiplier = 1,
): PositionMark {
  if (!quote || !finitePositive(quote.price)) return UNMARKED;
  // A position with no usable entry price cannot produce a P&L either. Refusing
  // is the same rule as above, applied to the other operand.
  if (!finitePositive(pos.avgPx) || !Number.isFinite(pos.qty)) return UNMARKED;

  const markPx = quote.price;
  const ageMs =
    typeof quote.ageMs === "number" && Number.isFinite(quote.ageMs) && quote.ageMs >= 0
      ? quote.ageMs
      : null;

  return {
    basis: quote.actionable === true ? "actionable" : "stale",
    markPx,
    unrealPnl: (markPx - pos.avgPx) * pos.qty * multiplier,
    pct: ((markPx - pos.avgPx) / pos.avgPx) * 100 * (pos.qty < 0 ? -1 : 1),
    ageMs,
  };
}

/**
 * A caveat for the position row, or null when the mark needs no caveat.
 *
 * Returning null for the `actionable` case is deliberate: a badge on every row
 * is wallpaper, and a caveat that is always present stops being read. This
 * sentence only exists when there is something to say.
 */
export function describePositionMark(mark: PositionMark): string | null {
  if (mark.basis === "actionable") return null;
  if (mark.basis === "unmarked") return "No quote — this position is unmarked.";
  if (mark.ageMs == null) return "Marked on a stale quote.";
  const seconds = Math.round(mark.ageMs / 1000);
  if (seconds < 60) return `Marked on a quote ${seconds}s old.`;
  return `Marked on a quote ${Math.floor(seconds / 60)}m old.`;
}

/* ── THE SAME DEFECT, ONE SURFACE OVER ────────────────────────────────────
 *
 * Everything above governs the mark /paper computes IN MEMORY, from a live
 * quote, during its own render. It is never written back.
 *
 * What IS written to `wm_paper_state` is `paperTrade.applyFill`, and every one
 * of its five writers says the same thing:
 *
 *     marketPx: fillPx
 *
 * So the `marketPx` on a PERSISTED position is the price the position was
 * FILLED at. For a newly opened position that is exactly `avgPx` — the entry
 * price. It is not a quote, it is not an observation of current value, and it
 * does not become one by being stored under a field called `marketPx`.
 *
 * `/paper` never trips on this because it rebuilds a view-model with
 * `marketPx: positionMarks[i].markPx ?? pos.avgPx` before anything reads it.
 * Any OTHER surface that reads the saved book directly — and the REVIEW drawer
 * on /command-deck was the first — gets the fill price and presents it as a
 * mark. That is `?? pos.avgPx` again, the defect this whole module was written
 * to kill, wearing a different field name in a different room.
 *
 * The cure is the one already established at the top of this file: null is NOT
 * the entry price. A reader with no quote feed has no mark, so it must not
 * carry a number that looks like one — and it must say why, because a figure
 * that silently disappears is its own kind of lie.
 */

/**
 * The persisted book's positions, with the fill-price `marketPx` REMOVED.
 *
 * For a consumer that holds no quote feed this is the honest shape: downstream
 * owners already treat a missing `marketPx` correctly under H1 — they still
 * COUNT the position, and they value it at nothing rather than at zero.
 *
 * Pure. Allocates new objects; the input is never mutated.
 */
export function withoutPersistedMarks<T extends { readonly marketPx?: number }>(
  positions: readonly T[] | null | undefined,
): readonly Omit<T, "marketPx">[] {
  if (!positions) return [];
  return positions.map((p) => {
    if (p == null || typeof p !== "object") return p as Omit<T, "marketPx">;
    const { marketPx: _dropped, ...rest } = p;
    return rest as Omit<T, "marketPx">;
  });
}

/**
 * Why no dollar figure appears on a surface that read the saved book.
 *
 * Named as a constant so the sentence has exactly one author, and so a Sentinel
 * can assert that the surface which strips the mark is the same surface that
 * explains the absence.
 */
export const PERSISTED_MARK_CAVEAT =
  "No dollar value is shown here. Your saved book records the price each " +
  "position was filled at, not a current quote, and this room has no price " +
  "feed of its own — so it will not put a figure on a position it cannot " +
  "value. Open /paper to see these marked against the live tape.";

export interface PositionMarkSummary {
  readonly total: number;
  readonly actionable: number;
  readonly stale: number;
  readonly unmarked: number;
  /**
   * Sum of unrealized P&L across the positions that COULD be marked.
   *
   * Null when there are no marked positions at all — that is not a book worth
   * zero, it is a book whose value is unknown, and 0 would assert the first.
   *
   * When SOME positions are marked and others are not, this is a partial sum
   * and `complete` is false. It is not silently widened into a whole-book
   * number, and callers must render the disclosure rather than the figure
   * alone.
   */
  readonly unrealPnl: number | null;
  /** True only when every position carried a mark. */
  readonly complete: boolean;
}

/** Pure. */
export function summarisePositionMarks(marks: readonly PositionMark[]): PositionMarkSummary {
  let actionable = 0, stale = 0, unmarked = 0, sum = 0, marked = 0;
  for (const m of marks) {
    if (m.basis === "actionable") actionable++;
    else if (m.basis === "stale") stale++;
    else unmarked++;
    if (m.unrealPnl != null && Number.isFinite(m.unrealPnl)) { sum += m.unrealPnl; marked++; }
  }
  return {
    total: marks.length,
    actionable, stale, unmarked,
    unrealPnl: marked === 0 ? null : sum,
    complete: marks.length > 0 && unmarked === 0,
  };
}

/**
 * The disclosure line for the equity/P&L header, or null when the book is
 * fully and freshly marked and there is nothing to disclose.
 */
export function describePositionMarkSummary(s: PositionMarkSummary): string | null {
  if (s.total === 0) return null;
  const parts: string[] = [];
  if (s.unmarked > 0) {
    parts.push(
      s.unmarked === 1
        ? "1 position has no quote and is excluded from this number"
        : `${s.unmarked} positions have no quote and are excluded from this number`,
    );
  }
  if (s.stale > 0) {
    parts.push(
      s.stale === 1 ? "1 is marked on a stale quote" : `${s.stale} are marked on stale quotes`,
    );
  }
  if (parts.length === 0) return null;
  return `${parts.join("; ")}.`;
}
