/**
 * Paper order lifecycle — guarded status transitions (Founder canon §11:
 * "Every state change must be legal and explainable; truth is never silently
 * rewritten.").
 *
 * The /paper surface mutates `order.status` inline at several call sites
 * (pending → filled on fill, pending → cancelled on cancel). Nothing enforced
 * that a transition was LEGAL: an already-filled order could be re-filled, a
 * cancelled order could be resurrected to filled, or an order could be filled
 * after cancellation — each silently corrupting the paper P&L with no error.
 *
 * This module is the single source of truth for which order transitions are
 * legal. It is PURE (no I/O, no time) and returns a NEW order on success,
 * never mutating the input, and an explicit refusal (never a throw, never a
 * silent no-op that looks like success) on an illegal transition.
 */

export type OrderLifecycleStatus = "pending" | "filled" | "cancelled" | "rejected";

/** The events that can move an order between states. */
export type OrderLifecycleEvent = "FILL" | "CANCEL" | "REJECT";

/** Only a resting (pending) order can transition; the rest are terminal. */
const LEGAL: Readonly<Record<OrderLifecycleStatus, ReadonlyArray<OrderLifecycleEvent>>> = {
  pending: ["FILL", "CANCEL", "REJECT"],
  filled: [],
  cancelled: [],
  rejected: [],
};

const RESULT: Readonly<Record<OrderLifecycleEvent, OrderLifecycleStatus>> = {
  FILL: "filled",
  CANCEL: "cancelled",
  REJECT: "rejected",
};

/** A terminal order is settled truth — it can never transition again. */
export function isTerminal(status: OrderLifecycleStatus): boolean {
  return LEGAL[status]?.length === 0;
}

/** Whether `event` is a legal transition from `from`. */
export function canTransition(from: OrderLifecycleStatus, event: OrderLifecycleEvent): boolean {
  return LEGAL[from]?.includes(event) ?? false;
}

/** The status an event moves an order to (independent of legality). */
export function statusAfter(event: OrderLifecycleEvent): OrderLifecycleStatus {
  return RESULT[event];
}

export type TransitionResult<T> =
  | { readonly ok: true; readonly order: T }
  | { readonly ok: false; readonly reason: string; readonly order: T };

/**
 * Apply `event` to an order. On a legal transition returns a NEW order object
 * with the updated status (plus any `patch` fields, e.g. `{ fillPx }`), leaving
 * the input untouched. On an illegal transition returns the ORIGINAL order
 * unchanged with `ok: false` and a human-readable reason — the caller decides
 * whether to skip or surface it, but the corruption never lands.
 */
export function transitionOrder<T extends { status: OrderLifecycleStatus }>(
  order: T,
  event: OrderLifecycleEvent,
  patch: Partial<T> = {},
): TransitionResult<T> {
  if (!canTransition(order.status, event)) {
    return {
      ok: false,
      order,
      reason: isTerminal(order.status)
        ? `order is already ${order.status} (terminal) — cannot ${event}`
        : `cannot ${event} an order in status ${order.status}`,
    };
  }
  return { ok: true, order: { ...order, ...patch, status: statusAfter(event) } };
}
