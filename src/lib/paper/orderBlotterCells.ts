/**
 * orderBlotterCells — the two price columns of the /paper order blotter.
 *
 * ── THE DEFECT ────────────────────────────────────────────────────────
 * The blotter rendered both price columns like this:
 *
 *   {ord.limitPx ? "$"+fmt2(ord.limitPx) : "—"}
 *   {ord.fillPx  ? "$"+fmt2(ord.fillPx)  : "—"}
 *
 * Two expressions, one glyph, and FIVE different facts underneath it. This
 * is the /creator strip again — but on the surface that records the
 * Founder's orders, where flattening a state is flattening a receipt.
 *
 * ── LIMIT PX: "—" MEANT THREE THINGS ──────────────────────────────────
 *   market order       There IS NO LIMIT PRICE. Not unknown — NOT APPLICABLE.
 *                      A dash in a price column implies a price exists and is
 *                      being withheld. Nothing was withheld; nothing exists.
 *   stop order         Also has no limit — it has a STOP price, in `stopPx`,
 *                      which the blotter renders NOWHERE. So a stop order's
 *                      entire price constraint was invisible, shown as a dash.
 *                      The dash was not merely uninformative, it was HIDING A
 *                      FIELD WE HAVE.
 *   limit order with
 *   no limitPx         A limit order without a limit price is a BROKEN RECORD.
 *                      The dash made corruption look like routine absence.
 *
 * ── FILL PX: "—" MEANT THREE MORE ─────────────────────────────────────
 *   pending            No fill price YET. One may still arrive.
 *   cancelled/rejected No fill price EVER. This is not "missing" — the order
 *                      died. "Not yet" and "never" are opposite claims about
 *                      the future and they rendered identically.
 *   filled, no fillPx  THE ORDER SAYS IT FILLED AND CARRIES NO PRICE. That is
 *                      a data defect. Under the old code it was pixel-for-pixel
 *                      identical to a pending order. The dash was not hiding an
 *                      absence — IT WAS HIDING A BUG.
 *
 * ── AND A TRUTHINESS BUG ON MONEY ─────────────────────────────────────
 * `ord.limitPx ? …` and `ord.fillPx ? …` are TRUTHINESS tests, not presence
 * tests. A price of exactly `0` is falsy, so a recorded zero rendered as "—":
 * a fact we hold, displayed as a fact we lack. `Number.isFinite` is the test
 * that was meant. This is the H1 mirror from /creator in its most literal
 * form — a real zero erased into a dash.
 *
 * PURE — no clock, no I/O, no React.
 */

export type BlotterCellKind =
  /** A real recorded number, including zero. */
  | "VALUE"
  /** This order type has no such price. Not unknown — it does not exist. */
  | "NOT_APPLICABLE"
  /** Does not exist yet, and still may. */
  | "NOT_YET"
  /** Does not exist and never will — the order is terminal without one. */
  | "NEVER"
  /** The record claims it should exist and it does not. A defect, not an absence. */
  | "MISSING";

export interface BlotterCell {
  /** What the cell shows. Never a bare glyph. */
  text: string;
  kind: BlotterCellKind;
  /** WHY it reads the way it does. Carried on BOTH title and aria-label. */
  reason: string;
}

/** Only the fields these two cells are allowed to read. */
export interface BlotterOrderInput {
  readonly type: "market" | "limit" | "stop" | "stop-limit";
  readonly status: "pending" | "filled" | "cancelled" | "rejected";
  readonly limitPx?: number;
  readonly stopPx?: number;
  readonly fillPx?: number;
}

function usd(n: number): string {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** `Number.isFinite`, NOT truthiness — a price of 0 is a fact, not an absence. */
function recorded(n: number | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/**
 * The Limit Px column.
 *
 * A market order has no limit price and never did. Saying so is more
 * informative than a dash AND is checkable.
 */
export function limitPriceCell(order: BlotterOrderInput): BlotterCell {
  if (order.type === "market") {
    return {
      text: "n/a",
      kind: "NOT_APPLICABLE",
      reason:
        "A market order has no limit price — it accepts whatever price is available. This is not a missing value; no limit was ever set.",
    };
  }

  if (order.type === "stop") {
    // The stop price is the whole constraint on this order and the blotter
    // had no column for it, so the dash was hiding a field we hold.
    return recorded(order.stopPx)
      ? {
          text: `stop ${usd(order.stopPx)}`,
          kind: "VALUE",
          reason: `A stop order has no limit price. Its price constraint is the stop trigger at ${usd(order.stopPx)}, shown here rather than hidden behind a dash.`,
        }
      : {
          text: "no stop px",
          kind: "MISSING",
          reason:
            "This order is recorded as a stop order but carries no stop price. That is a broken record, not an absent value — the order has no price constraint at all.",
        };
  }

  if (recorded(order.limitPx)) {
    return {
      text: usd(order.limitPx),
      kind: "VALUE",
      reason: `Limit price recorded on this order: ${usd(order.limitPx)}. A limit is a constraint on WHETHER to fill, not the price that prints.`,
    };
  }

  return {
    text: "no limit px",
    kind: "MISSING",
    reason:
      "This order is recorded as a limit order but carries no limit price. That is a broken record, not an absent value — WM will not render corruption as routine absence.",
  };
}

/**
 * The Fill Px column.
 *
 * "Not yet" and "never" are opposite claims about the future. One glyph was
 * making them look the same.
 */
export function fillPriceCell(order: BlotterOrderInput): BlotterCell {
  if (recorded(order.fillPx)) {
    return {
      text: usd(order.fillPx),
      kind: "VALUE",
      reason: `Filled at ${usd(order.fillPx)} — the observed price at the moment the fill decision was made.`,
    };
  }

  if (order.status === "filled") {
    // The most important branch on this surface. Under the old code this was
    // pixel-identical to a pending order.
    return {
      text: "no fill px",
      kind: "MISSING",
      reason:
        "This order is recorded as FILLED and carries no fill price. That is a defect in the record, not a pending fill — the blotter will not let it look like one.",
    };
  }

  if (order.status === "pending") {
    return {
      text: "not yet",
      kind: "NOT_YET",
      reason:
        "This order has not filled. No fill price exists yet, and one may still arrive — this is a live order, not a failed one.",
    };
  }

  return {
    text: "never",
    kind: "NEVER",
    reason:
      order.status === "cancelled"
        ? "This order was cancelled before it filled. No fill price exists and none ever will — this is not a pending fill."
        : "This order was rejected and never reached the book. No fill price exists and none ever will — this is not a pending fill.",
  };
}
