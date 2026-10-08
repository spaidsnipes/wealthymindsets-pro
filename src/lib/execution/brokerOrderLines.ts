/**
 * TASTYTRADE'S OWN ORDERS AND POSITIONS, AS CHART LINES — Garden 19 §23. PURE.
 *
 * Built only from the broker's readback (/api/broker/tastytrade/orders and
 * /positions — read routes), never from what the ticket remembers sending.
 * "Broker acknowledgement and reconciliation determine execution truth."
 *
 *   · a working / partially filled order → a WORKING line at its limit (or
 *     its stop trigger for a Stop);
 *   · an order tastytrade reports in a status WM does not know → UNKNOWN;
 *   · a readback that failed or is older than READBACK_STALE_MS → every line
 *     drawn RECONCILING (the last thing the broker said, labelled as old);
 *   · a held position → a POSITION line at tastytrade's average open price,
 *     with open P&L only when a live mark for the same contract exists, and
 *     PROTECTED only when a closing Stop for that contract is WORKING.
 */

import type { TtOrderView } from "@/lib/broker/tastytradeOrderState";

import type { ChartOrderLine } from "./chartOrderLines";

export const READBACK_STALE_MS = 10_000;

export interface BrokerPositionRow {
  readonly symbol: string;
  readonly quantity: number;
  readonly direction: "Long" | "Short";
  readonly averageOpenPrice: number;
  readonly instrumentType: string | null;
}

/** tastytrade position item → the fields this file uses (null when it is not a position). */
export function readTastytradePosition(raw: unknown): BrokerPositionRow | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const symbol = typeof o.symbol === "string" ? o.symbol : "";
  const quantity = Number(o.quantity);
  const avg = Number(o["average-open-price"]);
  const dir = o["quantity-direction"];
  if (!symbol || !(quantity > 0) || !(avg > 0) || (dir !== "Long" && dir !== "Short")) return null;
  return { symbol, quantity, direction: dir, averageOpenPrice: avg, instrumentType: typeof o["instrument-type"] === "string" ? (o["instrument-type"] as string) : null };
}

export interface BrokerReadback {
  /** When the orders + positions were read; null = never read successfully. */
  readonly asOfMs: number | null;
  readonly ok: boolean;
  readonly orders: readonly TtOrderView[];
  readonly positions: readonly BrokerPositionRow[];
  /** Account tails (last 4) the read covered — named in the ticket's book line. */
  readonly tails?: readonly string[];
  /** Which account (index + tail) each order id was read from — a cancel needs the index. */
  readonly orderAccounts?: Readonly<Record<string, { readonly index: number; readonly tail: string }>>;
}

export interface BrokerLinesResult {
  readonly lines: readonly ChartOrderLine[];
  readonly readback: "FRESH" | "STALE" | "NEVER_READ";
  /** For the held position on this contract, if any. */
  readonly position: { readonly row: BrokerPositionRow; readonly protection: "PROTECTED" | "UNPROTECTED"; readonly pnlUsd: number | null } | null;
  /** Working orders on this contract (WORKING / PARTIALLY FILLED / ACKNOWLEDGED / pending), as read. */
  readonly working?: number;
  /** The working orders themselves (broker readback), for the ticket's cancel controls. */
  readonly workingOrders?: readonly TtOrderView[];
  readonly orderAccounts?: BrokerReadback["orderAccounts"];
  readonly asOfMs?: number | null;
  readonly tails?: readonly string[];
}

const WORKING = new Set(["WORKING", "PARTIALLY FILLED", "ACKNOWLEDGED", "CANCEL_PENDING", "REPLACE_PENDING"]);

export function selectBrokerOrderLines(rb: BrokerReadback, contract: string, mark: number | null, pointValue: number | null, nowMs: number): BrokerLinesResult {
  const readback = rb.asOfMs == null ? "NEVER_READ" : !rb.ok || nowMs - rb.asOfMs > READBACK_STALE_MS ? "STALE" : "FRESH";
  if (readback === "NEVER_READ") return { lines: [], readback, position: null, working: 0, workingOrders: [], orderAccounts: {}, asOfMs: null, tails: rb.tails ?? [] };
  const stale = readback === "STALE";
  const mine = rb.orders.filter(o => o.symbol === contract);
  const lines: ChartOrderLine[] = [];
  for (const o of mine) {
    const known = WORKING.has(o.state) || o.state === "UNKNOWN";
    if (!known) continue;
    const px = Number(o.orderType === "Stop" ? o.stopTrigger : o.price ?? o.stopTrigger);
    if (!(px > 0)) continue;
    const status: ChartOrderLine["status"] = stale ? "RECONCILING"
      : o.state === "UNKNOWN" ? "UNKNOWN"
      : o.state === "PARTIALLY FILLED" ? "PARTIALLY_FILLED"
      : o.state === "CANCEL_PENDING" ? "CANCEL_PENDING"
      : "WORKING";
    const side = o.action?.startsWith("Buy") ? "BUY" : "SELL";
    const fill = o.filled != null && o.quantity != null && o.filled > 0 ? ` ${o.filled}/${o.quantity}` : ` ${o.quantity ?? ""}`;
    lines.push({ id: `tt-order-${o.id}`, role: "WORKING", status, price: px, contract, detail: `${side}${fill} ${(o.orderType ?? "").toUpperCase()} #${o.id}`.trim() });
  }
  const row = rb.positions.find(p => p.symbol === contract) ?? null;
  let position: BrokerLinesResult["position"] = null;
  if (row) {
    const sign = row.direction === "Long" ? 1 : -1;
    const pnlUsd = !stale && mark != null && mark > 0 && pointValue != null ? (mark - row.averageOpenPrice) * sign * row.quantity * pointValue : null;
    const closingStop = mine.some(o => o.orderType === "Stop" && (o.state === "WORKING" || o.state === "PARTIALLY FILLED")
      && (row.direction === "Long" ? o.action === "Sell to Close" : o.action === "Buy to Close"));
    const protection = closingStop && !stale ? "PROTECTED" : "UNPROTECTED";
    position = { row, protection, pnlUsd };
    lines.push({
      id: `tt-position-${contract}`, role: "POSITION", status: stale ? "RECONCILING" : "POSITION", price: row.averageOpenPrice, contract,
      detail: `${row.direction.toUpperCase()} ${row.quantity} · avg ${row.averageOpenPrice} · ${protection === "PROTECTED" ? "STOP WORKING" : "UNPROTECTED"}`,
      pnlUsd,
    });
  }
  const workingOrders = mine.filter(o => WORKING.has(o.state));
  return { lines, readback, position, working: workingOrders.length, workingOrders, orderAccounts: rb.orderAccounts ?? {}, asOfMs: rb.asOfMs, tails: rb.tails ?? [] };
}

/**
 * FLATTEN, as a ticket — never a send. A closing MARKET order for exactly the
 * held quantity, which still goes through preview, the server gate and the
 * trader's confirmation like any other order.
 */
export function planFlatten(row: BrokerPositionRow): { action: "Sell to Close" | "Buy to Close"; qty: number; type: "Market"; symbol: string } {
  return { action: row.direction === "Long" ? "Sell to Close" : "Buy to Close", qty: row.quantity, type: "Market", symbol: row.symbol };
}
