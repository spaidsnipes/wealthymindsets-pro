/**
 * "JOURNAL THIS TRADE" FOR AN IMPORTED ROUND TRIP (Supermax §8, 2026-10-10). PURE.
 *
 * The owner opened a fills file in the prop desk (propFillsImport). This reads its fills into ROUND TRIPS —
 * flat → open → flat, per account and contract, first-in-first-out — so the trader can pick one and hand it
 * to the Journal's new-entry form through the SAME hand-off the live ticket uses (journalCaptureHandoff),
 * where the Journal's own save gate applies and nothing is saved until he presses Save.
 *
 * Every fact wears IMPORTED-FILE with the file named; what is computed (average prices, P&L) wears DERIVED;
 * what a fills file cannot know — the plan, the decision, the quote at send — is UNREPORTED. No ticket intent
 * is needed and none is invented. A position still open at the end of the file is not a round trip.
 */
import { instrumentEconomics } from "@/lib/marketData/contractEconomics";

import type { CapturedField, JournalCaptureDraft } from "./journalCaptureFromFill";
import type { PropFillsImport, PropImportedFill } from "./propFillsImport";

export interface ImportedRoundTrip {
  /** Stable within the file: the first opening fill's id. */
  readonly id: string;
  readonly account: string | null;
  readonly symbol: string;
  readonly side: "LONG" | "SHORT";
  /** Largest position held during the trip. */
  readonly qty: number;
  readonly openedAt: string;
  readonly closedAt: string;
  readonly avgOpen: number;
  readonly avgClose: number;
  readonly fills: number;
  /** Price × point value, when the contract has one on file; null otherwise (said, not guessed). */
  readonly grossUsd: number | null;
  /** Sum of the file's commissions on these fills, or null when the file reports none. */
  readonly feesUsd: number | null;
  readonly netUsd: number | null;
  readonly orderIds: readonly string[];
}

const pointValueOf = (symbol: string): number | null => {
  for (const s of [symbol.startsWith("/") ? symbol : `/${symbol}`, symbol]) {
    const e = instrumentEconomics(s, null);
    if (e.status === "PRICED" && e.unit === "contract") return e.pointValue;
  }
  return null;
};
const r6 = (x: number) => Math.round(x * 1e6) / 1e6;
const r2 = (x: number) => Math.round(x * 100) / 100;

/** The file's closed round trips, oldest first. */
export function importedRoundTrips(imp: PropFillsImport): ImportedRoundTrip[] {
  const out: ImportedRoundTrip[] = [];
  const open = new Map<string, { pos: number; fills: PropImportedFill[]; maxQty: number }>();
  for (const f of imp.fills) {
    const key = `${f.account ?? ""}|${f.symbol}`;
    const signed = f.action === "Buy" ? f.quantity : -f.quantity;
    const cur = open.get(key) ?? { pos: 0, fills: [], maxQty: 0 };
    // A fill that flips the position through flat is split: the part that closes ends this trip, the rest opens the next.
    if (cur.pos !== 0 && Math.sign(cur.pos + signed) === -Math.sign(cur.pos)) {
      const closeQty = Math.abs(cur.pos);
      out.push(finish(cur.fills.concat({ ...f, quantity: closeQty }), cur.maxQty, f.account, f.symbol));
      const rest = f.quantity - closeQty;
      open.set(key, { pos: Math.sign(signed) * rest, fills: [{ ...f, id: `${f.id}#rest`, quantity: rest, fees: 0 }], maxQty: rest });
      continue;
    }
    cur.pos += signed; cur.fills.push(f); cur.maxQty = Math.max(cur.maxQty, Math.abs(cur.pos));
    if (cur.pos === 0) { out.push(finish(cur.fills, cur.maxQty, f.account, f.symbol)); open.delete(key); }
    else open.set(key, cur);
  }
  return out;
}

function finish(fills: readonly PropImportedFill[], maxQty: number, account: string | null, symbol: string): ImportedRoundTrip {
  const first = fills[0]!;
  const long = first.action === "Buy";
  const opens = fills.filter(f => (f.action === "Buy") === long);
  const closes = fills.filter(f => (f.action === "Buy") !== long);
  const avg = (xs: readonly PropImportedFill[]) => { const q = xs.reduce((n, f) => n + f.quantity, 0); return q ? xs.reduce((s, f) => s + f.price * f.quantity, 0) / q : 0; };
  const qOpen = opens.reduce((n, f) => n + f.quantity, 0);
  const avgOpen = avg(opens), avgClose = avg(closes);
  const pv = pointValueOf(symbol);
  const grossUsd = pv === null ? null : r2((long ? avgClose - avgOpen : avgOpen - avgClose) * qOpen * pv);
  const feesReported = fills.every(f => f.feesReported === true);
  const feesUsd = feesReported ? r2(fills.reduce((s, f) => s + f.fees, 0)) : null;
  return {
    id: first.id, account, symbol, side: long ? "LONG" : "SHORT", qty: maxQty, openedAt: first.executedAt, closedAt: fills[fills.length - 1]!.executedAt,
    avgOpen: r6(avgOpen), avgClose: r6(avgClose), fills: fills.length, grossUsd, feesUsd, netUsd: grossUsd === null ? null : feesUsd === null ? null : r2(grossUsd - feesUsd),
    orderIds: [...new Set(fills.map(f => f.orderId).filter((x): x is string => !!x))],
  };
}

/** The picker's line for one trip. */
export function importedTripLine(t: ImportedRoundTrip): string {
  const money = (x: number) => `${x < 0 ? "−" : "+"}$${Math.abs(x).toFixed(2)}`;
  const result = t.netUsd !== null ? `${money(t.netUsd)} net` : t.grossUsd !== null ? `${money(t.grossUsd)} before commissions (UNREPORTED in the file)` : "no point value on file — result not computed";
  return `${t.side} ${t.qty} ${t.symbol} · ${t.avgOpen} → ${t.avgClose} · ${result}`;
}

/** The trip as the Journal's capture draft: the same hand-off and the same save gate as a live fill. */
export function journalCaptureFromImportedTrip(t: ImportedRoundTrip, provenance: string, nowMs: number): JournalCaptureDraft {
  const file = (value: string | number | null, missing: string): CapturedField<never> =>
    (value === null || value === "" ? { value: null, provenance: "UNREPORTED", source: missing } : { value, provenance: "IMPORTED-FILE", source: provenance }) as CapturedField<never>;
  const derived = (value: number | null, how: string, missing: string): CapturedField<never> =>
    (value === null ? { value: null, provenance: "UNREPORTED", source: missing } : { value, provenance: "DERIVED", source: `${how} · from the ${provenance}` }) as CapturedField<never>;
  const none = (why: string): CapturedField<never> => ({ value: null, provenance: "UNREPORTED", source: why }) as CapturedField<never>;
  const NOT_IN_FILE = "a fills file does not carry this";
  return {
    kind: "WM_FILL_CAPTURE", version: 1, capturedAtMs: nowMs,
    decisionId: none("no decision was recorded with an imported trade"), orderIntentId: none(NOT_IN_FILE), clientOrderId: none(NOT_IN_FILE),
    view: none("no View recorded — write it in the review"), broker: file("imported file", NOT_IN_FILE), environment: none(NOT_IN_FILE),
    account: file(t.account, "the file has no account column"), instrumentType: file("Future", NOT_IN_FILE), chartSymbol: none(NOT_IN_FILE),
    contract: file(t.symbol, "no contract"), datedContract: none(NOT_IN_FILE),
    // The Journal needs an id for the draft: the platform's order id when the file has one, else the first fill's id.
    orderId: file(t.orderIds[0] ?? t.id, "no id"), orderStatus: file("CLOSED ROUND TRIP", NOT_IN_FILE),
    action: file(t.side === "LONG" ? "Buy to Open" : "Sell to Open", NOT_IN_FILE), orderType: none(NOT_IN_FILE),
    orderedQty: file(t.qty, "no quantity"), filledQty: file(t.qty, "no quantity"), limitPx: none(NOT_IN_FILE),
    fillPx: derived(t.avgOpen, "quantity-weighted average of the opening fills", "no opening price"),
    exitPx: derived(t.avgClose, "quantity-weighted average of the closing fills", "no closing price"),
    filledAt: file(t.openedAt, "no time"), fees: t.feesUsd === null ? none("commissions are UNREPORTED in this file") : file(t.feesUsd, "no commission"),
    quoteBid: none(NOT_IN_FILE), quoteAsk: none(NOT_IN_FILE), spread: none(NOT_IN_FILE), quoteAgeAtSendMs: none(NOT_IN_FILE),
    slippage: none(NOT_IN_FILE), slippageUsd: none(NOT_IN_FILE), stopPx: none("no planned stop — a fills file has no plan"), targetPx: none("no planned target — a fills file has no plan"),
    plannedRiskUsd: none("no plan, so no 1R"),
    pnlUsd: t.netUsd !== null ? derived(t.netUsd, "FIFO round trip × point value − the file's commissions", "") : t.grossUsd !== null ? derived(t.grossUsd, "FIFO round trip × point value, BEFORE commissions (UNREPORTED in the file)", "") : none("no point value on file for this contract"),
    realizedR: none("no plan, so no R"),
  } as JournalCaptureDraft;
}
