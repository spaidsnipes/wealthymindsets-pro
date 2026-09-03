/**
 * paperTrade — shared paper-trading primitives for placing simulated orders
 * from anywhere in the app (e.g. one-click BUY/SELL from the chart's Smart
 * Money panel) into the SAME store the /paper brokerage page reads.
 *
 * This module is the sole browser-persistence owner for `wm_paper_state`.
 * Charts and /paper share its read, verified write, reset, and cross-tab
 * subscription functions so an open page cannot silently overwrite a newer
 * chart-originated order with a stale React snapshot.
 */

export const PAPER_KEY = "wm_paper_state";
export const STARTING_CASH = 100_000;

/**
 * clearPaperState — hard reset of the browser-local paper-trading store.
 * Called on sign-out to prevent cross-owner paper-trading state leaks
 * on shared browsers (User B would otherwise inherit User A's cash,
 * positions, and blotter). Never throws; safe to call from auth flow.
 *
 * Does NOT touch server-side paper-trading state (none exists today).
 */
export function clearPaperState(): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(PAPER_KEY); } catch { /* noop */ }
}

export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit" | "stop" | "stop-limit";
export type OrderStatus = "pending" | "filled" | "cancelled" | "rejected";

/**
 * Terminal order states. Once an order reaches one of these it is settled and
 * must never transition again — a filled order moved cash and positions, so
 * relabelling it later makes the ledger contradict the account.
 */
export const TERMINAL_ORDER_STATUSES: readonly OrderStatus[] = ["filled", "cancelled", "rejected"];

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return TERMINAL_ORDER_STATUSES.includes(status);
}

/**
 * Whether an order may still be cancelled.
 *
 * /paper renders its Cancel control only for `pending` orders, but this module
 * already holds the principle that UI gating must not be the sole guard —
 * selectPaperQuoteReadiness exists specifically to stop "UI-disabled controls
 * from becoming the sole guard against ... direct handler invocation".
 * The order state machine had no such guard: cancelOrder() relabelled ANY
 * order, so a filled order could be marked "cancelled" while its cash movement
 * and position stayed on the books.
 *
 * Canon §13 "paper execution state machine / order ledger / reconciliation
 * realism": a real venue rejects a cancel against a settled order.
 */
export function canCancelOrder(status: OrderStatus): boolean {
  return status === "pending";
}

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  qty: number;
  limitPx?: number;
  stopPx?: number;
  fillPx?: number;
  status: OrderStatus;
  ts: number;
}

export interface Position {
  symbol: string;
  qty: number; // negative = short
  avgPx: number;
  unrealPnl: number;
  marketPx: number;
}

export interface Trade {
  id: string;
  symbol: string;
  side: OrderSide;
  qty: number;
  px: number;
  ts: number;
  pnl?: number;
}

export interface EquityPoint { ts: number; equity: number; }

export interface PaperState {
  revision: number;
  cash: number;
  positions: Position[];
  orders: Order[];
  trades: Trade[];
  equity: EquityPoint[];
  // Options are marked/managed exclusively by the /paper page; we preserve the
  // array untouched so chart equity orders never disturb an open options book.
  optionPositions?: unknown[];
}

export type PaperPersistenceResult =
  | { status: "PERSISTED"; state: PaperState }
  | { status: "CONFLICT"; state: PaperState }
  | { status: "FAILED"; state: null };

export type PaperExternalDisposition = "PERSISTED" | "CLEARED" | "INVALID";
export interface PaperSubscriptionUpdate {
  disposition: PaperExternalDisposition;
  state: PaperState;
}

function uid() { return Math.random().toString(36).slice(2, 9); }

/**
 * Pure position-fill reducer with correct long/short realized-P&L accounting.
 * VERBATIM from src/app/paper/page.tsx — see file header note on syncing.
 */
export function applyFill(
  positions: Position[],
  ord: Order,
  fillPx: number,
): { positions: Position[]; trade: Trade; cashDelta: number; realized: number } {
  const signedQty = ord.side === "buy" ? ord.qty : -ord.qty; // signed fill size
  const cashDelta = -signedQty * fillPx;                     // pay to buy, receive to sell
  const trade: Trade = {
    id: uid(), symbol: ord.symbol, side: ord.side,
    qty: ord.qty, px: fillPx, ts: Date.now(),
  };

  const idx = positions.findIndex(p => p.symbol === ord.symbol);
  if (idx === -1 || positions[idx].qty === 0) {
    const next = idx === -1
      ? [...positions, { symbol: ord.symbol, qty: signedQty, avgPx: fillPx, unrealPnl: 0, marketPx: fillPx }]
      : positions.map((p, i) => i === idx ? { ...p, qty: signedQty, avgPx: fillPx, marketPx: fillPx } : p);
    return { positions: next, trade, cashDelta, realized: 0 };
  }

  const pos = positions[idx];
  const sameDir = Math.sign(signedQty) === Math.sign(pos.qty);
  let realized = 0;
  let newPos: Position | null;

  if (sameDir) {
    const newQty = pos.qty + signedQty;
    const newAvg = (pos.avgPx * pos.qty + fillPx * signedQty) / newQty;
    newPos = { ...pos, qty: newQty, avgPx: newAvg, marketPx: fillPx };
  } else {
    const closeQty = Math.min(Math.abs(signedQty), Math.abs(pos.qty));
    realized = closeQty * (fillPx - pos.avgPx) * Math.sign(pos.qty);
    const newQty = pos.qty + signedQty;
    if (newQty === 0) {
      newPos = null;
    } else if (Math.sign(newQty) === Math.sign(pos.qty)) {
      newPos = { ...pos, qty: newQty, marketPx: fillPx };
    } else {
      newPos = { ...pos, qty: newQty, avgPx: fillPx, marketPx: fillPx };
    }
  }

  if (realized !== 0) trade.pnl = realized;
  const next = newPos
    ? positions.map((p, i) => (i === idx ? newPos! : p))
    : positions.filter((_, i) => i !== idx);
  return { positions: next, trade, cashDelta, realized };
}

/** Read the shared paper state, tolerating a missing/corrupt payload. */
function freshPaperState(): PaperState {
  return {
    revision: 0, cash: STARTING_CASH, positions: [], orders: [], trades: [],
    equity: [{ ts: Date.now(), equity: STARTING_CASH }], optionPositions: [],
  };
}

function parsePaperState(raw: string): PaperState | null {
  try {
    const s = JSON.parse(raw);
    return {
      revision: Number.isSafeInteger(s.revision) && s.revision >= 0 ? s.revision : 0,
      cash: typeof s.cash === "number" ? s.cash : STARTING_CASH,
      positions: Array.isArray(s.positions) ? s.positions : [],
      orders: Array.isArray(s.orders) ? s.orders : [],
      trades: Array.isArray(s.trades) ? s.trades : [],
      equity: Array.isArray(s.equity) && s.equity.length ? s.equity : [{ ts: Date.now(), equity: STARTING_CASH }],
      optionPositions: Array.isArray(s.optionPositions) ? s.optionPositions : [],
    };
  } catch {
    return null;
  }
}

export function loadPaperState(): PaperState {
  if (typeof window === "undefined") return freshPaperState();
  try {
    const raw = window.localStorage.getItem(PAPER_KEY);
    if (!raw) return freshPaperState();
    return parsePaperState(raw) ?? freshPaperState();
  } catch {
    return freshPaperState();
  }
}

/** Persist one canonical paper snapshot with compare-and-swap protection. */
export function savePaperState(
  state: PaperState,
  expectedRevision = state.revision,
): PaperPersistenceResult {
  if (typeof window === "undefined") return { status: "FAILED", state: null };
  try {
    const current = loadPaperState();
    if (current.revision !== expectedRevision) {
      return { status: "CONFLICT", state: current };
    }
    const accepted = { ...state, revision: expectedRevision + 1 };
    const serialized = JSON.stringify(accepted);
    window.localStorage.setItem(PAPER_KEY, serialized);
    return window.localStorage.getItem(PAPER_KEY) === serialized
      ? { status: "PERSISTED", state: accepted }
      : { status: "FAILED", state: null };
  } catch {
    return { status: "FAILED", state: null };
  }
}

/** Re-read the canonical snapshot when another tab changes the paper key. */
export function subscribePaperState(listener: (update: PaperSubscriptionUpdate) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key !== PAPER_KEY) return;
    if (event.storageArea && event.storageArea !== window.localStorage) return;
    if (event.newValue === null) {
      listener({ disposition: "CLEARED", state: freshPaperState() });
      return;
    }
    const parsed = parsePaperState(event.newValue);
    listener(parsed
      ? { disposition: "PERSISTED", state: parsed }
      : { disposition: "INVALID", state: freshPaperState() });
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

export interface ChartOrderResult {
  ok: boolean;
  error?: string;
  symbol: string;
  side: OrderSide;
  qty: number;
  fillPx: number;
  realized: number;
  cash: number;
  position: Position | null;
}

/**
 * Place a one-click MARKET paper order at the given live price and persist it to
 * the shared store. Written `status:"filled"` so the /paper page won't re-fill.
 * Returns a result summary (position after fill, realized P&L on any close, cash).
 */
export function placeChartMarketOrder(
  symbol: string,
  side: OrderSide,
  qty: number,
  fillPx: number,
): ChartOrderResult {
  const base: ChartOrderResult = { ok: false, symbol, side, qty, fillPx, realized: 0, cash: 0, position: null };
  if (!symbol) return { ...base, error: "No symbol" };
  if (!(qty > 0)) return { ...base, error: "Quantity must be greater than 0" };
  if (!Number.isFinite(fillPx) || fillPx <= 0) return { ...base, error: "No live price yet" };

  const state = loadPaperState();
  const ord: Order = {
    id: uid(), symbol, side, type: "market", qty,
    fillPx, status: "filled", ts: Date.now(),
  };
  const { positions, trade, cashDelta, realized } = applyFill(state.positions, ord, fillPx);
  const cash = state.cash + cashDelta;

  const next: PaperState = {
    ...state,
    cash,
    positions,
    orders: [ord, ...state.orders].slice(0, 500),
    trades: [trade, ...state.trades].slice(0, 500),
    // Leave `equity` untouched — the /paper page samples the curve on its own
    // 10s timer and reprices marks (incl. options), so we avoid writing an
    // equity point that would ignore an open options book.
  };

  const persisted = savePaperState(next, state.revision);
  if (persisted.status !== "PERSISTED") {
    return {
      ...base,
      cash,
      error: persisted.status === "CONFLICT"
        ? "Paper state changed in another tab. Review the latest account and try again."
        : "Could not save paper state",
    };
  }

  const position = positions.find(p => p.symbol === symbol) ?? null;
  return { ok: true, symbol, side, qty, fillPx, realized, cash, position };
}
