/**
 * THE TICKET AS IT LEFT, KEPT FOR THIS TAB — §J 2026-10-07.
 *
 * The live ticket records what it knew at the moment of the send (Decision_ID,
 * View, planned stop / target, quote, account) so the "Add to Journal" offer
 * survives a reload: after a reload the ticket no longer holds the order, but
 * the broker still does, and the record is found again by the client order id
 * tastytrade echoes back (`external-identifier`).
 *
 * sessionStorage (this tab only), 24 h, at most 20 records, cleared at
 * sign-out by logoutIsolation. It is not a journal store: nothing here is a
 * trade until the trader saves a draft in /journal, and an opened draft
 * removes its record. Storage is injected so this stays testable.
 */

import type { FillCaptureIntent } from "./journalCaptureFromFill";
import { freezeAtTicketSend } from "./managementPlanDraft";

export const TICKET_AT_SEND_KEY = "wm:journal-ticket-at-send:v1";
export const TICKET_AT_SEND_TTL_MS = 24 * 3_600_000;
export const TICKET_AT_SEND_MAX = 20;

type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;

export interface TicketAtSend {
  readonly clientOrderId: string;
  readonly atMs: number;
  readonly ticket: FillCaptureIntent;
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.slice(0, 240) : null);
const fin = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** A stored ticket, or null. Every optional field reads back as null when unreadable — never a default value. */
export function readTicketIntent(raw: unknown): FillCaptureIntent | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const instrumentType = str(o.instrumentType);
  const action = str(o.action);
  const qty = fin(o.qty);
  if (o.broker !== "tastytrade" || !instrumentType || !action || qty == null) return null;
  const q = o.quote && typeof o.quote === "object" ? (o.quote as Record<string, unknown>) : null;
  return {
    decisionId: str(o.decisionId),
    orderIntentId: str(o.orderIntentId),
    view: str(o.view),
    broker: "tastytrade",
    environment: str(o.environment),
    accountTail: str(o.accountTail),
    instrumentType,
    chartSymbol: str(o.chartSymbol),
    action,
    qty,
    orderType: str(o.orderType),
    limitPx: fin(o.limitPx),
    entryTriggerPx: fin(o.entryTriggerPx),
    protectiveStopPx: fin(o.protectiveStopPx),
    plannedStopPx: fin(o.plannedStopPx),
    targetPx: fin(o.targetPx),
    quote: q ? { bid: fin(q.bid), ask: fin(q.ask), atMs: fin(q.atMs) } : null,
    sentAtMs: fin(o.sentAtMs),
    multiplier: fin(o.multiplier),
  };
}

function readAll(storage: Storage, nowMs: number): TicketAtSend[] {
  let raw: string | null = null;
  try { raw = storage.getItem(TICKET_AT_SEND_KEY); } catch { return []; }
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return [];
    const out: TicketAtSend[] = [];
    for (const r of list) {
      const o = (r ?? {}) as Record<string, unknown>;
      const clientOrderId = str(o.clientOrderId);
      const atMs = fin(o.atMs);
      const ticket = readTicketIntent(o.ticket);
      if (!clientOrderId || atMs == null || !ticket || nowMs - atMs > TICKET_AT_SEND_TTL_MS) continue;
      out.push({ clientOrderId, atMs, ticket });
    }
    return out;
  } catch { return []; }
}

function writeAll(storage: Storage, list: readonly TicketAtSend[]): void {
  try {
    if (list.length) storage.setItem(TICKET_AT_SEND_KEY, JSON.stringify(list.slice(-TICKET_AT_SEND_MAX)));
    else storage.removeItem(TICKET_AT_SEND_KEY);
  } catch { /* this visit only */ }
}

const deviceStorage = (): Pick<globalThis.Storage, "getItem" | "setItem"> | null => {
  try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; }
};

/**
 * Keep the ticket as it left — and, Garden 19 §27, FREEZE the plan it carried
 * on its Decision_ID (stop, target, View, plus the trader's pre-trade plan-card
 * draft for that market; everything else UNRECORDED). The
 * first freeze for a decision wins; a re-send never rewrites it. The freeze
 * can never throw into the send.
 */
export function rememberTicketAtSend(
  storage: Storage,
  clientOrderId: string,
  ticket: FillCaptureIntent,
  nowMs: number,
  planStorage: Pick<globalThis.Storage, "getItem" | "setItem"> | null = deviceStorage(),
): void {
  const rest = readAll(storage, nowMs).filter(r => r.clientOrderId !== clientOrderId);
  writeAll(storage, [...rest, { clientOrderId, atMs: nowMs, ticket }]);
  try { freezeAtTicketSend(planStorage, ticket, nowMs); } catch { /* the send never waits on the plan */ }
}

export function ticketsAtSend(storage: Storage, nowMs: number): readonly TicketAtSend[] {
  return readAll(storage, nowMs);
}

export function ticketForOrder(storage: Storage, clientOrderId: string | null | undefined, nowMs: number): FillCaptureIntent | null {
  if (!clientOrderId) return null;
  return readAll(storage, nowMs).find(r => r.clientOrderId === clientOrderId)?.ticket ?? null;
}

export function forgetTicketAtSend(storage: Storage, clientOrderId: string, nowMs: number): void {
  writeAll(storage, readAll(storage, nowMs).filter(r => r.clientOrderId !== clientOrderId));
}
