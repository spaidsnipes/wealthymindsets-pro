/**
 * WHAT A /paper CANCEL NEVER HAD — a race.
 *
 * ── THE MEASURED GAP ──────────────────────────────────────────────────
 * Every order on /paper is born `pending`, INCLUDING market orders:
 *
 *   const order: Order = { id: uid(), symbol: sym, side, type, qty,
 *                          status: "pending", ts: Date.now(), ... };
 *
 * It stays pending until the fill loop next runs on a quote tick. The Cancel
 * control renders for every pending order, and `cancelOrder` resolves the
 * transition synchronously and locally:
 *
 *   setOrders(prev => prev.map(o =>
 *     o.id === id && canCancelOrder(o.status) ? { ...o, status: "cancelled" } : o));
 *
 * No quote is consulted. Nothing can arrive in between. So a /paper cancel
 * cannot lose — not to a fast market, not to a gap, not to anything.
 *
 * Two claims about real execution are therefore silently contradicted:
 *
 *   1. A cancel is a REQUEST, not a fact. It travels to the venue and races
 *      the order it is trying to pull. If the order is marketable when the
 *      request lands, you are filled anyway — and that is precisely the
 *      moment you most wanted out.
 *
 *   2. A MARKET order is not cancellable at all. It is gone the instant it is
 *      sent; there is nothing resting at the venue to take back. /paper holds
 *      it as pending until the next tick and offers a ✕ on it.
 *
 * Canon §13, paper execution state machine realism.
 *
 * ── LABEL, NOT MODEL ──────────────────────────────────────────────────
 * The cure is NOT to start refusing the trader's cancels, nor to roll dice on
 * whether a cancel "wins". A simulated race with an invented probability is a
 * fabricated number wearing the costume of realism, and refusing a cancel
 * enforces a policy the trader was never offered.
 *
 * This reads only `status` and `type` — two fields every order has carried
 * since the book was first written. Nothing is stored. No cancel is refused.
 * No status is ever written.
 *
 * ── AND NOT WALLPAPER ─────────────────────────────────────────────────
 * Nothing is said until the trader has actually cancelled something. Before
 * the first cancel there is no cancel to caveat, and the per-row note is
 * reserved for the genuinely surprising case — a cancelled MARKET order —
 * because a note under every row is a note nobody reads.
 */

/** The order fields this disclosure is allowed to read. Nothing else matters. */
export interface CancelCertaintyInput {
  readonly status: string;
  /** "market" | "limit" | "stop" | "stop-limit" — may be absent on old books. */
  readonly type?: string;
}

export interface CancelCertainty {
  /** Cancelled orders in this book. */
  readonly cancelledCount: number;
  /**
   * Of those, how many were MARKET orders.
   *
   * An order whose `type` is missing or unreadable is NOT counted here. Absence
   * is not evidence of "market" — the H1 rule. It still counts toward
   * `cancelledCount`, which only needs `status`.
   */
  readonly cancelledMarketCount: number;
  /** Null until the first cancel. */
  readonly heading: string | null;
  /** Empty until the first cancel. */
  readonly sentences: readonly string[];
}

const NONE: CancelCertainty = {
  cancelledCount: 0,
  cancelledMarketCount: 0,
  heading: null,
  sentences: [],
};

const RACE_SENTENCE =
  "A cancel here is decided locally, before any quote is consulted, so it can " +
  "never lose a race to a fill. At a real venue a cancel is a REQUEST: if your " +
  "order is marketable when the request lands, you are filled anyway — and " +
  "that is exactly the moment you most wanted out.";

/** Pure. Reads `status` and `type`; writes nothing, refuses nothing. */
export function selectCancelCertainty(
  orders: readonly CancelCertaintyInput[] | null | undefined,
): CancelCertainty {
  if (!orders || orders.length === 0) return NONE;

  let cancelledCount = 0;
  let cancelledMarketCount = 0;
  for (const o of orders) {
    if (o?.status !== "cancelled") continue;
    cancelledCount++;
    if (o.type === "market") cancelledMarketCount++;
  }

  if (cancelledCount === 0) return NONE;

  const sentences = [RACE_SENTENCE];
  if (cancelledMarketCount > 0) {
    sentences.push(
      cancelledMarketCount === 1
        ? "1 of them was a MARKET order. /paper holds a market order as pending " +
          "until the next quote tick, so it can be taken back. At a real broker " +
          "a market order is gone the moment you send it — there is nothing left " +
          "to cancel."
        : `${cancelledMarketCount} of them were MARKET orders. /paper holds a ` +
          `market order as pending until the next quote tick, so it can be taken ` +
          `back. At a real broker a market order is gone the moment you send it — ` +
          `there is nothing left to cancel.`,
    );
  }

  return {
    cancelledCount,
    cancelledMarketCount,
    heading:
      cancelledCount === 1
        ? "1 order was cancelled with certainty"
        : `${cancelledCount} orders were cancelled with certainty`,
    sentences,
  };
}

/**
 * The per-row note, or null when this row has nothing surprising to say.
 *
 * Reserved for a cancelled MARKET order. A cancelled limit or stop is already
 * covered by the book-level disclosure, and repeating it on every row is the
 * wallpaper this module exists to avoid.
 */
export function selectCancelledOrderNote(
  order: CancelCertaintyInput | null | undefined,
): string | null {
  if (order?.status !== "cancelled") return null;
  if (order.type !== "market") return null;
  return (
    "This was a MARKET order, and you took it back. At a real broker you could " +
    "not have: a market order is gone the moment it is sent, with nothing " +
    "resting at the venue to cancel."
  );
}
