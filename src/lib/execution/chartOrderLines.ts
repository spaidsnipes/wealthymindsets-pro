/**
 * ORDER LINES ON THE MARKET CANVAS — Garden 19 §23 "TRADE FROM CHART".
 *
 * One store between the trade ticket (TradePanel / TastytradeLiveOrder / the
 * broker readback) and the chart's paint. The ticket PUBLISHES lines; the chart
 * lane SUBSCRIBES (useChartOrderLines) and paints them as native price lines
 * with the words from `orderLineWords`. Nothing here sends anything.
 *
 * Every line says what it is, so a staged idea can never read as a working
 * order (§23 "No pretend ticket. No UI-only fill."):
 *   STAGED       picked on the chart, not sent                 — dotted, muted
 *   WORKING      tastytrade reads the order back as working    — solid
 *   RECONCILING  asking tastytrade what happened               — dashed, gold
 *   UNKNOWN      a send that did not answer clearly            — dashed, red
 *   POSITION     tastytrade's own position (avg open + signed P&L) — solid
 *
 * And the other direction: the ticket may ARM a one-shot price pick
 * (`armChartPricePick("ENTRY" | "STOP" | "TARGET")`); the chart, on the next
 * click on the glass, hands the clicked price to `deliverChartPricePick`,
 * which returns true when it consumed the click.
 */

import { useSyncExternalStore } from "react";

export type OrderLineRole = "ENTRY" | "STOP" | "TARGET" | "WORKING" | "POSITION";
export type OrderLineStatus = "STAGED" | "WORKING" | "PARTIALLY_FILLED" | "RECONCILING" | "UNKNOWN" | "CANCEL_PENDING" | "POSITION";

export interface ChartOrderLine {
  readonly id: string;
  readonly role: OrderLineRole;
  readonly status: OrderLineStatus;
  readonly price: number;
  /** The executable contract this line belongs to (`/NQZ6`), shown on the line. */
  readonly contract: string;
  /** e.g. "BUY 1", "SELL 1 STOP", "LONG 2 · avg 25010.25". */
  readonly detail: string;
  /** Signed USD at this line vs the entry (stop/target), or open P&L (position). */
  readonly pnlUsd?: number | null;
}

export interface OrderLineWords {
  readonly id: string;
  readonly price: number;
  readonly text: string;
  readonly ink: string;
  /** lightweight-charts LineStyle: 0 solid, 1 dotted, 2 dashed. */
  readonly lineStyle: 0 | 1 | 2;
  readonly lineWidth: 1 | 2;
}

const INK: Readonly<Record<OrderLineStatus, string>> = {
  STAGED: "#8a8271",
  WORKING: "#C9A55C",
  PARTIALLY_FILLED: "#C9A55C",
  RECONCILING: "#E8B54D",
  UNKNOWN: "#e0786b",
  CANCEL_PENDING: "#8a8271",
  POSITION: "#8B92AC",
};

const money = (n: number) => `${n < 0 ? "−" : "+"}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

/** The words and ink a chart paints for one line. PURE. */
export function orderLineWords(l: ChartOrderLine): OrderLineWords {
  const status = l.status === "POSITION" ? "" : `${l.status.replace(/_/g, " ")} · `;
  const pnl = l.pnlUsd != null && Number.isFinite(l.pnlUsd) ? ` · ${money(l.pnlUsd)}` : "";
  // The P&L's sign is carried by its WORD (+ / −), never by a colour the line picks for itself (§9).
  const ink = INK[l.status];
  return {
    id: l.id,
    price: l.price,
    text: `${status}${l.role} ${l.detail} ${l.contract}${pnl}`.replace(/\s+/g, " ").trim(),
    ink,
    lineStyle: l.status === "STAGED" || l.status === "CANCEL_PENDING" ? 1 : l.status === "RECONCILING" || l.status === "UNKNOWN" ? 2 : 0,
    lineWidth: l.status === "WORKING" || l.status === "PARTIALLY_FILLED" || l.status === "POSITION" ? 2 : 1,
  };
}

/**
 * HOW a draft price reached the ticket: an armed one-shot PICK, a DRAG of the
 * staged line on the glass, or the chart's "Trade at <price>" MENU item
 * (Founder P0 2026-10-09: "let the trader trade"). All three only ever edit
 * the ticket DRAFT — nothing here sends, and nothing here touches a working
 * broker order.
 */
export type DraftPriceSource = "PICK" | "DRAG" | "MENU";

/** Only a ticket's own un-sent line may be dragged: STAGED entry / stop / target. Broker readback never. */
export function chartOrderLineDraggable(l: ChartOrderLine): boolean {
  return l.status === "STAGED" && (l.role === "ENTRY" || l.role === "STOP" || l.role === "TARGET");
}

/** What a non-draggable line answers when the trader tries to move it. */
export const BROKER_LINE_NOT_MOVABLE = "Broker line — not movable from the chart. Change it in the ticket.";

/** The drag handle's words: role, the shown (snapped) price, and the TICKET's own money figure. PURE. */
export function draftHandleWords(l: ChartOrderLine, shownPrice: number, decimals: number): string {
  const pnl = l.pnlUsd != null && Number.isFinite(l.pnlUsd) ? ` · ${money(l.pnlUsd)}` : "";
  return `${l.role} ${shownPrice.toFixed(Math.max(0, Math.min(8, decimals)))}${pnl}`;
}

/* ── The store ───────────────────────────────────────────────────────────── */

interface State {
  /** Lines by publisher ("ticket", "broker") then chart symbol (upper-case). */
  readonly lines: ReadonlyMap<string, ReadonlyMap<string, readonly ChartOrderLine[]>>;
  readonly pick: { readonly role: "ENTRY" | "STOP" | "TARGET"; readonly armedAtMs: number } | null;
  readonly picked: { readonly role: "ENTRY" | "STOP" | "TARGET"; readonly symbol: string; readonly price: number; readonly seq: number; readonly source: DraftPriceSource } | null;
}

let state: State = { lines: new Map(), pick: null, picked: null };
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const key = (s: string) => s.trim().toUpperCase();

/** Replace one publisher's lines for one chart symbol (an empty array clears them). */
export function publishChartOrderLines(publisher: string, chartSymbol: string, lines: readonly ChartOrderLine[]): void {
  const byPub = new Map(state.lines);
  const bySym = new Map(byPub.get(publisher) ?? []);
  if (lines.length) bySym.set(key(chartSymbol), lines); else bySym.delete(key(chartSymbol));
  byPub.set(publisher, bySym);
  state = { ...state, lines: byPub };
  emit();
}

const EMPTY: readonly ChartOrderLine[] = [];
const cache = new Map<string, { src: State["lines"]; out: readonly ChartOrderLine[] }>();
/** Every publisher's lines for this chart symbol (stable identity between changes). */
export function chartOrderLinesFor(chartSymbol: string): readonly ChartOrderLine[] {
  const k = key(chartSymbol);
  const hit = cache.get(k);
  if (hit && hit.src === state.lines) return hit.out;
  const out = [...state.lines.values()].flatMap(m => m.get(k) ?? []);
  const value = out.length ? out : EMPTY;
  cache.set(k, { src: state.lines, out: value });
  return value;
}

/** For the chart lane: the lines to paint on this symbol. */
export function useChartOrderLines(chartSymbol: string): readonly ChartOrderLine[] {
  return useSyncExternalStore(subscribe, () => chartOrderLinesFor(chartSymbol), () => EMPTY);
}

/* ── One-shot price pick ─────────────────────────────────────────────────── */

/**
 * The ticket offers "pick on the chart" ONLY while a chart has said it will
 * deliver the click (no button that does nothing — LIVING-PIXEL LAW). The
 * chart lane calls this on mount and the returned function on unmount.
 */
let hosts = 0;
export function registerChartPricePickHost(): () => void {
  hosts += 1;
  emit();
  let done = false;
  return () => { if (done) return; done = true; hosts -= 1; if (hosts === 0) state = { ...state, pick: null }; emit(); };
}
const hostedSnapshot = () => hosts > 0;
export function useChartPricePickHosted(): boolean {
  return useSyncExternalStore(subscribe, hostedSnapshot, () => false);
}

export function armChartPricePick(role: "ENTRY" | "STOP" | "TARGET", nowMs = Date.now()): void {
  state = { ...state, pick: { role, armedAtMs: nowMs } };
  emit();
}
export function cancelChartPricePick(): void {
  if (!state.pick) return;
  state = { ...state, pick: null };
  emit();
}
/** For the chart lane: is the next click on the glass a price pick? (role, or null) */
export function chartPricePickArmed(): "ENTRY" | "STOP" | "TARGET" | null {
  return state.pick?.role ?? null;
}
/**
 * For the chart lane: the click's price. True = consumed (do not treat it as a
 * candle click); false = no pick armed or the price is not a price.
 */
export function deliverChartPricePick(chartSymbol: string, price: number): boolean {
  if (!state.pick || !Number.isFinite(price) || price <= 0) return false;
  state = { ...state, picked: { role: state.pick.role, symbol: key(chartSymbol), price, seq: ++seq, source: "PICK" }, pick: null };
  emit();
  return true;
}
/**
 * Chart → ticket: set a DRAFT price without arming a pick (a drag of the staged
 * line, or "Trade at <price>"). Writes the same `picked` record the ticket
 * already reads, stamped with its source. False for a non-price. An armed pick
 * is left armed — a drag is not a pick. Never sends.
 */
export function deliverChartDraftPrice(chartSymbol: string, role: "ENTRY" | "STOP" | "TARGET", price: number, source: DraftPriceSource): boolean {
  if (!Number.isFinite(price) || price <= 0) return false;
  state = { ...state, picked: { role, symbol: key(chartSymbol), price, seq: ++seq, source } };
  emit();
  return true;
}
const pickSnapshot = () => state.pick;
const pickedSnapshot = () => state.picked;
export function useChartPricePick() {
  const pick = useSyncExternalStore(subscribe, pickSnapshot, () => null);
  const picked = useSyncExternalStore(subscribe, pickedSnapshot, () => null);
  return { pick, picked };
}

/** Test seam. */
export function resetChartOrderLinesForTest(): void {
  state = { lines: new Map(), pick: null, picked: null };
  hosts = 0;
  cache.clear();
  emit();
}
