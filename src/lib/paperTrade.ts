/**
 * paperTrade — shared paper-trading primitives for placing simulated orders
 * from anywhere in the app (e.g. one-click BUY/SELL from the chart's Smart
 * Money panel) into the SAME store the /paper brokerage page reads.
 *
 * DESIGN — zero regression on the working /paper page:
 *   The /paper page keeps its own copy of this fill math. This module is a
 *   schema-compatible, self-contained writer that targets the identical
 *   `wm_paper_state` localStorage key. Orders placed here are written already
 *   `status:"filled"` with a `fillPx`, so the /paper page's pending-order
 *   processor (which only touches `status:"pending"`) never re-applies them —
 *   no double-fill, no double-counted cash.
 *
 *   `applyFill` below is a VERBATIM copy of the verified reducer in
 *   src/app/paper/page.tsx (correct long/short realized-P&L accounting). Keep
 *   the two in sync if either changes. Duplication is a deliberate trade to
 *   avoid refactoring money-adjacent code that real users depend on.
 *
 * KNOWN LIMITATION: if /paper and /charts are open in two tabs at once, the
 * /paper page's persist effect can overwrite an order placed from the chart on
 * its next state change (last-writer-wins on localStorage). For the common
 * single-active-page flow it is correct: place from chart → open /paper → the
 * position, blotter trade and cash are all there.
 */

export const PAPER_KEY = "wm_paper_state";
export const STARTING_CASH = 100_000;

export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit" | "stop" | "stop-limit";
export type OrderStatus = "pending" | "filled" | "cancelled" | "rejected";

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
  cash: number;
  positions: Position[];
  orders: Order[];
  trades: Trade[];
  equity: EquityPoint[];
  // Options are marked/managed exclusively by the /paper page; we preserve the
  // array untouched so chart equity orders never disturb an open options book.
  optionPositions?: unknown[];
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
export function loadPaperState(): PaperState {
  const fresh = (): PaperState => ({
    cash: STARTING_CASH, positions: [], orders: [], trades: [],
    equity: [{ ts: Date.now(), equity: STARTING_CASH }], optionPositions: [],
  });
  if (typeof window === "undefined") return fresh();
  try {
    const raw = window.localStorage.getItem(PAPER_KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw);
    return {
      cash: typeof s.cash === "number" ? s.cash : STARTING_CASH,
      positions: Array.isArray(s.positions) ? s.positions : [],
      orders: Array.isArray(s.orders) ? s.orders : [],
      trades: Array.isArray(s.trades) ? s.trades : [],
      equity: Array.isArray(s.equity) && s.equity.length ? s.equity : [{ ts: Date.now(), equity: STARTING_CASH }],
      optionPositions: Array.isArray(s.optionPositions) ? s.optionPositions : [],
    };
  } catch {
    return fresh();
  }
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

  try {
    window.localStorage.setItem(PAPER_KEY, JSON.stringify(next));
  } catch {
    return { ...base, cash, error: "Could not save paper state" };
  }

  const position = positions.find(p => p.symbol === symbol) ?? null;
  return { ok: true, symbol, side, qty, fillPx, realized, cash, position };
}
