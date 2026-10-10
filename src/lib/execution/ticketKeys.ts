/**
 * THE TICKET'S KEYBOARD (order §6, 2026-10-10). PURE.
 *
 *   B / S   choose BUY / SELL — only while focus is not in a text field, and only before a send
 *   Esc     closes the ticket — never while an order is in flight (its state must stay in view)
 *   ↑ / ↓   on a focused price field: one tick up / down (snapped to the tick)
 *   Enter   NEVER sends. It is swallowed everywhere inside the ticket — including on a focused button, where it
 *           would otherwise "click" Preview or Send. A send is a deliberate press of the button (pointer or Space).
 */

export type TicketPriceField = "LIMIT" | "TRIGGER" | "STOP" | "TARGET";
export const PRICE_FIELD_BY_LABEL: Readonly<Record<string, TicketPriceField>> = {
  "Limit price": "LIMIT", "Entry stop trigger": "TRIGGER", "Stop price": "STOP", "Target price": "TARGET",
};

export type TicketKeyAction =
  | { readonly kind: "SIDE"; readonly side: "BUY" | "SELL" }
  | { readonly kind: "CLOSE" }
  | { readonly kind: "STEP"; readonly field: TicketPriceField; readonly dir: 1 | -1 }
  | { readonly kind: "SWALLOW_ENTER" }
  | null;

export interface TicketKey {
  readonly key: string;
  readonly ctrl?: boolean; readonly meta?: boolean; readonly alt?: boolean;
  readonly composing?: boolean;
  /** The focused element: its tag ("INPUT", "BUTTON", …) and aria-label. */
  readonly tag: string;
  readonly label: string | null;
  /** True before a send: the ticket may change side or close. */
  readonly preSend: boolean;
}

export function ticketKeyAction(k: TicketKey): TicketKeyAction {
  if (k.composing) return null;
  if (k.key === "Enter") return { kind: "SWALLOW_ENTER" };
  if (k.ctrl || k.meta || k.alt) return null;
  const typing = k.tag === "INPUT" || k.tag === "TEXTAREA" || k.tag === "SELECT";
  if (k.key === "Escape") return k.preSend ? { kind: "CLOSE" } : null;
  if ((k.key === "ArrowUp" || k.key === "ArrowDown") && k.tag === "INPUT" && k.label && PRICE_FIELD_BY_LABEL[k.label]) {
    return { kind: "STEP", field: PRICE_FIELD_BY_LABEL[k.label]!, dir: k.key === "ArrowUp" ? 1 : -1 };
  }
  if (!typing && k.preSend && (k.key === "b" || k.key === "B")) return { kind: "SIDE", side: "BUY" };
  if (!typing && k.preSend && (k.key === "s" || k.key === "S")) return { kind: "SIDE", side: "SELL" };
  return null;
}

/** One tick from the field's text, snapped; null when there is no number or no tick. */
export function stepPriceText(text: string, dir: 1 | -1, tick: number | null, dp: number): string | null {
  const v = Number(text);
  if (!(tick && tick > 0) || !text.trim() || !Number.isFinite(v) || v <= 0) return null;
  const next = Math.round((v + dir * tick) / tick) * tick;
  return next > 0 ? next.toFixed(dp) : null;
}
