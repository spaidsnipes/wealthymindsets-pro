/**
 * Webull EXECUTIONS → the Journal's fills (Garden 18 §XC). Field names are
 * Webull's own (`/trading/orders/executions/list`): execution_id, order_id,
 * client_order_id, symbol, execution_time, side, filled_quantity,
 * filled_price. Webull reports no fees on an execution, so a Webull fill says
 * so (`feesReported: false`) instead of claiming zero. PURE.
 */
import type { TtFill } from "./tastytradeFills";

export interface WbFill extends TtFill {
  readonly clientOrderId: string | null;
  readonly feesReported: false;
}

const n = (v: unknown): number | null => {
  const x = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(x) ? x : null;
};
const s = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Webull times arrive as ISO strings or epoch milliseconds. */
function isoTime(v: unknown): string | null {
  if (typeof v === "number" && Number.isFinite(v)) return new Date(v > 1e12 ? v : v * 1000).toISOString();
  const t = s(v);
  if (!t) return null;
  if (/^\d{10,13}$/.test(t)) return isoTime(Number(t));
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? t : d.toISOString();
}

export function readWebullExecution(raw: unknown): WbFill | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const id = s(o.execution_id) ?? (o.execution_id != null ? String(o.execution_id) : null);
  if (!id) return null;
  const qty = n(o.filled_quantity) ?? n(o.total_filled_qty);
  const price = n(o.filled_price);
  if (!(qty && qty > 0) || price == null) return null;
  const side = (s(o.side) ?? "").toUpperCase();
  return {
    id,
    orderId: s(o.order_id) ?? (o.order_id != null ? String(o.order_id) : null),
    clientOrderId: s(o.client_order_id),
    symbol: s(o.symbol),
    instrumentType: s(o.instrument_type) ?? s(o.category),
    action: side ? side[0] + side.slice(1).toLowerCase() : null,
    quantity: qty,
    price,
    // Cash needs the contract multiplier, which an execution does not state.
    value: null,
    fees: 0,
    feesReported: false,
    executedAt: isoTime(o.execution_time),
  };
}

/** Executions (a `data` list or the list itself), deduped by execution id, oldest first. */
export function readWebullExecutions(payload: unknown): WbFill[] {
  const list = Array.isArray(payload) ? payload : Array.isArray((payload as { data?: unknown })?.data) ? (payload as { data: unknown[] }).data : [];
  const seen = new Map<string, WbFill>();
  for (const r of list) { const f = readWebullExecution(r); if (f && !seen.has(f.id)) seen.set(f.id, f); }
  return [...seen.values()].sort((a, b) => (a.executedAt ?? "").localeCompare(b.executedAt ?? ""));
}

/**
 * ORDER HISTORY → fills, for hosts that do not serve executions: one fill per
 * order that filled, at Webull's own filled price and time. Groups
 * (`{ orders: [...] }`) and bare orders are both read; nothing unfilled is
 * reported as a fill.
 */
export function readWebullOrderHistoryFills(payload: unknown): WbFill[] {
  const top = Array.isArray(payload) ? payload : Array.isArray((payload as { data?: unknown })?.data) ? (payload as { data: unknown[] }).data : [];
  const orders: Record<string, unknown>[] = [];
  for (const g of top) {
    const o = (g ?? {}) as Record<string, unknown>;
    if (Array.isArray(o.orders)) for (const d of o.orders) orders.push({ client_order_id: o.client_order_id, ...((d ?? {}) as Record<string, unknown>) });
    else orders.push(o);
  }
  const seen = new Map<string, WbFill>();
  for (const o of orders) {
    const id = s(o.order_id) ?? (o.order_id != null ? String(o.order_id) : null);
    const qty = n(o.filled_quantity);
    const price = n(o.filled_price);
    if (!id || !(qty && qty > 0) || price == null || seen.has(id)) continue;
    const side = (s(o.side) ?? "").toUpperCase();
    // An option order names its contract in its leg: "TSLA 2026-10-02 355C".
    const leg = (Array.isArray(o.legs) ? o.legs[0] : null) as Record<string, unknown> | null;
    const strike = leg ? n(leg.strike_price) : null;
    const right = leg ? (s(leg.option_type) ?? "").toUpperCase() : "";
    const expiry = leg ? s(leg.option_expire_date) : null;
    const contract = strike != null && expiry && (right === "CALL" || right === "PUT") ? `${s(o.symbol) ?? s(leg?.symbol) ?? ""} ${expiry} ${strike}${right[0]}`.trim() : null;
    seen.set(id, {
      id: `order:${id}`, orderId: id, clientOrderId: s(o.client_order_id), symbol: contract ?? s(o.symbol),
      instrumentType: s(o.instrument_type), action: side ? side[0] + side.slice(1).toLowerCase() : null,
      quantity: qty, price, value: null, fees: 0, feesReported: false,
      executedAt: isoTime(o.filled_time ?? o.filled_time_at ?? o.place_time),
    });
  }
  return [...seen.values()].sort((a, b) => (a.executedAt ?? "").localeCompare(b.executedAt ?? ""));
}
