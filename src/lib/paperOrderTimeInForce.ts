/**
 * WHAT A RESTING /paper ORDER NEVER HAD — a time-in-force.
 *
 * ── THE MEASURED GAP ──────────────────────────────────────────────────
 * Search this repo for `tif`, `timeInForce`, `GTC` or `expire` on the /paper
 * path and you will find nothing. There is no such field on `Order`, no such
 * control on the ticket, and no such branch in the fill loop. A pending order
 * is selected by exactly one predicate:
 *
 *   orders.filter(o => o.status === "pending" && !filledRef.current.has(o.id))
 *
 * and it stays in that set for as long as the persisted book survives — which
 * is indefinitely, because `loadPaperState` restores it verbatim on every
 * visit. A buy limit placed on a Friday afternoon is still working the
 * following Tuesday, and it will fill the moment a quote satisfies its level,
 * on a session the trader was not trading, at a price they last thought about
 * days ago.
 *
 * At a real broker that order does not exist. Every venue requires a
 * time-in-force, and the retail default is DAY: the order is cancelled at the
 * close of the session it was entered for. GTC is a deliberate choice, made
 * once per order, usually with a maximum lifetime attached.
 *
 * So /paper does not merely simulate GTC. It simulates something no venue
 * offers — an order that can never expire and was never elected to be that way.
 * Canon §13, paper execution state machine realism.
 *
 * ── LABEL, NOT MODEL ──────────────────────────────────────────────────
 * The cure is NOT to start cancelling the trader's orders at 16:00. That would
 * invent a policy they never chose and silently destroy working orders from the
 * book they have already saved. Nor is it to add a TIF dropdown and backfill a
 * value onto every order ever persisted — a stored field nobody set is a
 * fabricated one.
 *
 * This says out loud what is already true, using only `ts`, which every order
 * has carried since the beginning. Nothing is cancelled. Nothing is stored.
 *
 * ── WHY THE GRADE HAS FOUR STATES AND NOT TWO ─────────────────────────
 * The tempting sentence — "a real DAY order would already be dead" — is not
 * always true, and the case where it is false is common. An order entered at
 * 20:00 New York belongs to the NEXT session, so at 09:00 the following morning
 * a real DAY order is still working. One date boundary has been crossed and no
 * session close has yet passed over it.
 *
 * Certainty arrives one date later. Whatever session an order placed on New
 * York date D belonged to, that session was D or D+1, so its close has
 * certainly passed once the New York date reads D+2. That is the only point at
 * which this file is willing to say a DAY order could not still be working —
 * and it is a claim about the CALENDAR, which needs no market-status feed and
 * no holiday table to be true.
 *
 * ── AND NOT WALLPAPER ─────────────────────────────────────────────────
 * An order placed today gets no sentence. There is nothing surprising about a
 * working order on the day you placed it, and a caveat printed under every row
 * is a caveat nobody reads.
 */

/** The order fields this grading is allowed to read. Nothing else matters. */
export interface TimeInForceInput {
  readonly status: string;
  /** Epoch ms the order was created. */
  readonly ts?: number;
}

export type OrderRestBasis =
  /** Placed on today's New York date. A DAY order would still be working. */
  | "same-session"
  /** One date boundary crossed. A DAY order MAY still be working — see above. */
  | "overnight"
  /** Two or more crossed. No DAY order survives this long. */
  | "outlived-day-order"
  /** `ts` is missing or unreadable, so the rest cannot be measured at all. */
  | "age-unknown";

export interface OrderRest {
  readonly basis: OrderRestBasis;
  /** `YYYY-MM-DD` in New York, or null when `ts` was unreadable. */
  readonly placedOnNyDate: string | null;
  /** New York date boundaries crossed since placement; 0 when unknown. */
  readonly nyDatesCrossed: number;
  /** Null only for `same-session` — the one case with nothing to disclose. */
  readonly sentence: string | null;
}

const NY_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * The New York calendar date of `ms` as `YYYY-MM-DD`, or null if unreadable.
 *
 * New York and not UTC because the session boundary this is about is the US
 * equity close, and not the viewer's own zone because a trader in Tokyo did not
 * thereby place their order on a different trading day.
 */
export function nyDateOf(ms: number | null | undefined): string | null {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return null;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return NY_DATE.format(d);
}

/** Whole days between two `YYYY-MM-DD` strings, or null if either is malformed. */
function dateSpanDays(fromIso: string, toIso: string): number | null {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return Math.round((to - from) / 86_400_000);
}

const UNKNOWN_SENTENCE =
  "This order's placement time was not recorded, so how long it has rested " +
  "cannot be stated. What is certain is that /paper has no time-in-force: " +
  "nothing here will ever expire it.";

/**
 * Pure. `nowMs` is passed in rather than read from the clock so this is
 * testable and so no component is tempted to call `Date.now()` during render.
 */
export function selectOrderRest(
  order: TimeInForceInput | null | undefined,
  nowMs: number,
): OrderRest {
  const placedOnNyDate = nyDateOf(order?.ts);
  const today = nyDateOf(nowMs);

  if (placedOnNyDate == null || today == null) {
    return { basis: "age-unknown", placedOnNyDate, nyDatesCrossed: 0, sentence: UNKNOWN_SENTENCE };
  }

  const span = dateSpanDays(placedOnNyDate, today);
  if (span == null) {
    return { basis: "age-unknown", placedOnNyDate, nyDatesCrossed: 0, sentence: UNKNOWN_SENTENCE };
  }

  // A clock skewed backwards, or a ts stamped in the future, is not evidence
  // that the order is old. Clamp rather than report a negative rest.
  const nyDatesCrossed = span > 0 ? span : 0;

  if (nyDatesCrossed === 0) {
    return { basis: "same-session", placedOnNyDate, nyDatesCrossed: 0, sentence: null };
  }

  if (nyDatesCrossed === 1) {
    return {
      basis: "overnight",
      placedOnNyDate,
      nyDatesCrossed,
      sentence:
        `Placed ${placedOnNyDate} and still working. /paper has no ` +
        `time-in-force — nothing here will ever expire this order. A real ` +
        `broker makes you choose DAY or GTC, and a DAY order does not outlive ` +
        `the session it was entered for.`,
    };
  }

  return {
    basis: "outlived-day-order",
    placedOnNyDate,
    nyDatesCrossed,
    sentence:
      `Placed ${placedOnNyDate}, ${nyDatesCrossed} days ago, and still ` +
      `working. /paper has no time-in-force, so nothing will ever expire it — ` +
      `but no DAY order lives this long. If this fills, it fills on a session ` +
      `you were not trading.`,
  };
}

/**
 * A heading for the pending book, or null when every pending order was placed
 * today and there is nothing to say.
 *
 * Counts only the orders whose rest is MEASURED. An order with an unreadable
 * `ts` gets its own sentence on its own row and is deliberately not folded into
 * a number here, because a count is a claim about magnitude and that one
 * order's magnitude is exactly what is unknown.
 */
export function describeRestingBook(
  orders: readonly TimeInForceInput[] | null | undefined,
  nowMs: number,
): string | null {
  if (!orders || orders.length === 0) return null;

  let rested = 0;
  for (const o of orders) {
    if (o?.status !== "pending") continue;
    const basis = selectOrderRest(o, nowMs).basis;
    if (basis === "overnight" || basis === "outlived-day-order") rested++;
  }

  if (rested === 0) return null;
  return rested === 1
    ? "1 working order has outlasted the day you placed it"
    : `${rested} working orders have outlasted the day you placed them`;
}
