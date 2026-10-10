/**
 * AN ALPACA PAPER FILL → A JOURNAL DRAFT, MARKED PAPER (coordinator ruling 2026-10-10). PURE.
 *
 * The paper account's own order readback (/api/alpaca-trading?action=orders) reports a FILLED order with its
 * side, quantity, average fill price and time. That becomes a draft through the SAME hand-off and save gate as
 * a live tastytrade fill, with ONE difference that matters everywhere: its environment is PAPER, so the one
 * predicate (paperEntry.isPaperEntry) keeps it out of every live result, Personal Edge and plan adherence, and
 * the Journal list shows it marked PAPER.
 *
 * What a paper order does not carry stays UNREPORTED: the decision, the plan, the quote at send — and whether a
 * SELL opened a short or closed a long (Alpaca reports the side only; the trader corrects it on the form).
 */
import type { CapturedField, JournalCaptureDraft } from "./journalCaptureFromFill";
import { PAPER_ENVIRONMENT } from "./paperEntry";

export interface AlpacaPaperOrder {
  readonly id: string;
  readonly symbol: string;
  readonly side: string;
  readonly type?: string | null;
  readonly status: string;
  readonly qty: string;
  readonly filled_qty: string;
  readonly filled_avg_price: string | null;
  readonly limit_price?: string | null;
  readonly submitted_at: string;
  readonly filled_at?: string | null;
}

export const ALPACA_PAPER_SOURCE = "Alpaca paper order readback";

/**
 * SAMPLE orders for a proof scene (ruling 2026-10-10): the paper panel shows them instead of reading the account,
 * so "Journal this PAPER trade" can be seen. Synthetic ids and prices; in a scene the button does nothing.
 */
export const ALPACA_PAPER_SAMPLE_ORDERS: readonly (AlpacaPaperOrder & { readonly type: string; readonly limit_price: string | null })[] = [
  { id: "SAMPLE-paper-1", symbol: "SAMPLE", side: "buy", type: "limit", status: "filled", qty: "10", filled_qty: "10", filled_avg_price: "100.00", limit_price: "100.05", submitted_at: "2026-01-05T14:31:00Z", filled_at: "2026-01-05T14:31:02Z" },
  { id: "SAMPLE-paper-2", symbol: "SAMPLE", side: "sell", type: "market", status: "filled", qty: "10", filled_qty: "10", filled_avg_price: "101.50", limit_price: null, submitted_at: "2026-01-05T15:02:00Z", filled_at: "2026-01-05T15:02:01Z" },
  { id: "SAMPLE-paper-3", symbol: "SAMPLE", side: "buy", type: "limit", status: "new", qty: "5", filled_qty: "0", filled_avg_price: null, limit_price: "99.00", submitted_at: "2026-01-05T15:10:00Z", filled_at: null },
];
export const ALPACA_PAPER_SAMPLE_LINE = "SAMPLE orders — proof scene. Nothing is read from or sent to Alpaca; the Journal button opens nothing.";

/** A draft for a FILLED paper order; null for anything Alpaca has not read back as filled with a price. */
export function journalCaptureFromAlpacaPaperOrder(o: AlpacaPaperOrder, nowMs: number): JournalCaptureDraft | null {
  const filledQty = Number(o.filled_qty), px = Number(o.filled_avg_price);
  if (o.status !== "filled" || !o.id || !(filledQty > 0) || !(px > 0)) return null;
  const br = (value: string | number | null, missing: string): CapturedField<never> =>
    (value === null || value === "" || (typeof value === "number" && !Number.isFinite(value))
      ? { value: null, provenance: "UNREPORTED", source: missing }
      : { value, provenance: "BROKER-REPORTED", source: ALPACA_PAPER_SOURCE }) as CapturedField<never>;
  const none = (why: string): CapturedField<never> => ({ value: null, provenance: "UNREPORTED", source: why }) as CapturedField<never>;
  const NOT = "a paper order readback does not carry this";
  const limit = o.limit_price != null && Number(o.limit_price) > 0 ? Number(o.limit_price) : null;
  const side = o.side.toLowerCase() === "buy" ? "Buy" : o.side.toLowerCase() === "sell" ? "Sell" : null;
  return {
    kind: "WM_FILL_CAPTURE", version: 1, capturedAtMs: nowMs,
    decisionId: none("no decision was recorded with this paper order"), orderIntentId: none(NOT), clientOrderId: none(NOT),
    view: none("no View recorded — write it in the review"), broker: br("Alpaca", NOT),
    environment: br(PAPER_ENVIRONMENT, NOT), account: br("paper", NOT), instrumentType: br("Equity", NOT), chartSymbol: none(NOT),
    contract: br(o.symbol.toUpperCase(), "no symbol"), datedContract: none("not a dated contract"),
    orderId: br(o.id, "no id"), orderStatus: br("FILLED", NOT), action: br(side, "Alpaca did not report the side"),
    orderType: br(o.type ? o.type.toUpperCase() : null, "no order type"),
    orderedQty: br(Number(o.qty), "no quantity"), filledQty: br(filledQty, "no filled quantity"), limitPx: br(limit, "no limit price"),
    fillPx: br(px, "no fill price"), filledAt: br(o.filled_at ?? null, "Alpaca did not report the fill time"),
    fees: none("Alpaca paper reports no commission"),
    quoteBid: none(NOT), quoteAsk: none(NOT), spread: none(NOT), quoteAgeAtSendMs: none(NOT), slippage: none(NOT), slippageUsd: none(NOT),
    stopPx: none("no planned stop recorded"), targetPx: none("no planned target recorded"), plannedRiskUsd: none("no plan, so no 1R"),
    pnlUsd: none("one fill is one side of a trade — write the exit"), realizedR: none("no plan, so no R"),
  } as JournalCaptureDraft;
}
