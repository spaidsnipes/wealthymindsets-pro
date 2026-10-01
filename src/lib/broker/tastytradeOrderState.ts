/**
 * tastytrade ORDER STATUS → the WM order state machine (Garden 18 §LXXVI).
 *
 * tastytrade's documented statuses (developer.tastytrade.com, Order Flow):
 * Received, Routed, In Flight, Live, Cancel Requested, Replace Requested,
 * Contingent, Filled, Cancelled, Expired, Rejected, Removed, Partially Removed.
 * An unknown status is UNKNOWN — never guessed into WORKING or FILLED. PURE.
 */

export type WmOrderState =
  | "SUBMITTING" | "ACKNOWLEDGED" | "WORKING" | "PARTIALLY FILLED" | "FILLED"
  | "CANCEL_PENDING" | "CANCELED" | "REPLACE_PENDING" | "REJECTED" | "CLOSED" | "UNKNOWN";

const MAP: Readonly<Record<string, WmOrderState>> = {
  Received: "ACKNOWLEDGED",
  Routed: "ACKNOWLEDGED",
  "In Flight": "ACKNOWLEDGED",
  Contingent: "ACKNOWLEDGED",
  Live: "WORKING",
  "Cancel Requested": "CANCEL_PENDING",
  "Replace Requested": "REPLACE_PENDING",
  Filled: "FILLED",
  Cancelled: "CANCELED",
  Expired: "CLOSED",
  Rejected: "REJECTED",
  Removed: "CLOSED",
  "Partially Removed": "CLOSED",
};

export interface TtOrderView {
  readonly id: string;
  readonly status: string;
  readonly state: WmOrderState;
  readonly symbol: string | null;
  readonly action: string | null;
  readonly quantity: number | null;
  readonly filled: number | null;
  readonly price: string | null;
  readonly orderType: string | null;
  readonly externalId: string | null;
  readonly cancellable: boolean;
  readonly rejectReason: string | null;
  readonly updatedAt: string | null;
}

export function readTastytradeOrder(raw: unknown): TtOrderView | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  if (!id) return null;
  const status = typeof o.status === "string" ? o.status : "";
  const legs = Array.isArray(o.legs) ? (o.legs as Record<string, unknown>[]) : [];
  const leg = legs[0] ?? {};
  const qty = Number(leg.quantity);
  const remaining = Number(leg["remaining-quantity"]);
  const filled = Number.isFinite(qty) && Number.isFinite(remaining) ? qty - remaining : null;
  let state = MAP[status] ?? "UNKNOWN";
  if (state === "WORKING" && filled != null && filled > 0) state = "PARTIALLY FILLED";
  return {
    id,
    status: status || "—",
    state,
    symbol: typeof leg.symbol === "string" ? leg.symbol : null,
    action: typeof leg.action === "string" ? leg.action : null,
    quantity: Number.isFinite(qty) ? qty : null,
    filled,
    price: o.price != null ? String(o.price) : null,
    orderType: typeof o["order-type"] === "string" ? (o["order-type"] as string) : null,
    externalId: typeof o["external-identifier"] === "string" ? (o["external-identifier"] as string) : null,
    cancellable: o.cancellable === true,
    rejectReason: typeof o["reject-reason"] === "string" ? (o["reject-reason"] as string) : null,
    updatedAt: typeof o["updated-at"] === "string" ? (o["updated-at"] as string) : null,
  };
}

/** Terminal states end the lifecycle; nothing more will change at the broker. */
export function isTerminal(s: WmOrderState): boolean {
  return s === "FILLED" || s === "CANCELED" || s === "REJECTED" || s === "CLOSED";
}
