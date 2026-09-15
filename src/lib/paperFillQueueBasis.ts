/**
 * WHAT A PAPER FILL COULD NOT KNOW — queue priority.
 *
 * ── THE OVERCLAIM ─────────────────────────────────────────────────────
 * /paper's fill loop asks `selectOrderFill` one question — did the observed
 * price satisfy this order's level? — and books a fill for the FULL quantity
 * the moment the answer is yes. For a buy limit at 100 the predicate is
 * `px <= limit`, so an observation of exactly 100.00 fills the order.
 *
 * That is the case a real queue would most often NOT give. The market touched
 * the level; it did not trade through it. Whether a real order filled there
 * depends on how much size rested ahead of it at that price — queue position —
 * and the quote pipeline behind /paper carries no size, no depth and no
 * per-print tape. It is not that the model gets queue position wrong. It has
 * no input from which queue position could be computed at all.
 *
 * Compare the same order filling because the observed price was 98: the market
 * traded straight THROUGH the level. A real resting order is filled there by
 * construction — no queue assumption is needed. Two fills, the same ledger row,
 * and radically different confidence.
 *
 * ── WHY THIS IS A LABEL AND NOT A MODEL ───────────────────────────────
 * The cure for "we assumed a fill a real queue might not give" is NOT to invent
 * a fill probability, a partial-fill schedule or a queue-depth estimate. Every
 * one of those mints a number no observation produced, which is the defect this
 * repo keeps closing, not the cure (see `selectOrderFill`'s note on slippage and
 * `d53abc6`'s refusal to add a spread model).
 *
 * So this grades the fill that already happened, using only fields that were
 * genuinely recorded, and says out loud which of the two it was. The fill stays.
 * The quantity stays. One word is added.
 *
 * ── WHAT "unconditioned" DOES NOT MEAN ────────────────────────────────
 * A market or stop order has no limit level, so the touch/through question does
 * not apply and this returns `unconditioned` with no sentence. That is NOT an
 * all-clear: a market order in a real book fills at a price the tape decides,
 * and /paper books it at the last observed price with no slippage. This selector
 * is scoped to ONE unknown — queue priority at a limit — and claims nothing
 * about the others.
 */

/** The order fields this grading is allowed to read. Nothing else matters. */
export interface FillQueueBasisInput {
  readonly side: "buy" | "sell";
  readonly type: "market" | "limit" | "stop" | "stop-limit";
  readonly limitPx?: number;
}

export type FillQueueBasis =
  /** The observed price traded THROUGH the level. A real order fills here. */
  | "marketable"
  /** The observed price EQUALLED the level. A real fill needed queue priority. */
  | "at-the-touch"
  /** No limit level constrained this fill, so there is no queue question here. */
  | "unconditioned";

/**
 * Pure. `fillPx` is the price actually booked — which, per `selectOrderFill`,
 * is always the OBSERVED price and never the limit level.
 *
 * Strict equality is deliberate. A tolerance band ("within a tick of the
 * limit") would be a modelling parameter invented here, and every value for it
 * would be a guess. A price either printed at the level or it did not.
 */
export function selectFillQueueBasis(
  order: FillQueueBasisInput,
  fillPx: number,
): FillQueueBasis {
  if (order.type !== "limit" && order.type !== "stop-limit") return "unconditioned";
  if (!Number.isFinite(fillPx)) return "unconditioned";

  const limit = order.limitPx;
  // A limit order whose level was never recorded cannot be graded against it.
  // `selectOrderFill` treats that order as unconstrained on the limit leg, and
  // grading it "at-the-touch" or "marketable" would both be inventions.
  if (typeof limit !== "number" || !Number.isFinite(limit)) return "unconditioned";

  if (fillPx === limit) return "at-the-touch";

  const through = order.side === "buy" ? fillPx < limit : fillPx > limit;
  // A fill on the wrong side of its own limit is a contradiction, not a grade.
  // Refuse rather than label it "marketable", which would read as reassurance.
  return through ? "marketable" : "unconditioned";
}

/**
 * The sentence for the blotter, or null when there is no queue caveat to make.
 *
 * Null is the ABSENCE OF THIS ONE CAVEAT, not a clean bill of health — see the
 * module note on `unconditioned`.
 */
export function describeFillQueueBasis(basis: FillQueueBasis): string | null {
  if (basis !== "at-the-touch") return null;
  return (
    "Filled at the limit price exactly — the market touched your level but " +
    "never traded through it. A real order would have needed queue priority " +
    "to fill here, and paper has no depth or tape data from which queue " +
    "position could be known."
  );
}
