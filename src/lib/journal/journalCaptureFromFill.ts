/**
 * JOURNAL AUTO-CAPTURE FROM A BROKER-CONFIRMED FILL — Garden 18 snapshot
 * 10-02 §J; Constitution OPEN item "Journal/Review do not yet receive the
 * order/fill lifecycle". PURE.
 *
 * A live order that tastytrade reads back as FILLED becomes a journal DRAFT:
 * the machine facts of the trade, each field labelled with where it came from.
 *
 *   BROKER-REPORTED  tastytrade said it (the order readback, or its own trade
 *                    transactions keyed by the order id).
 *   TICKET-INTENT    the ticket said it before the send (Decision_ID, the
 *                    ORDER_INTENT_ID, the planned stop / target, the quote the
 *                    ticket priced against, the account the trader chose).
 *   DERIVED          WM computed it from fields above, and only from them
 *                    (spread, slippage vs the touch, planned risk, R).
 *   UNREPORTED       nobody reported it. The value is null — NEVER 0. A fee
 *                    the broker did not report is not a free trade, and a
 *                    result that does not exist yet is not breakeven.
 *
 * This file never writes anything. The trader opens the draft in the Journal
 * and saves it himself; the Journal's own save gate (selectJournalSaveMoney)
 * still refuses an entry with no exit, so an open position can never be
 * scored as a breakeven trade.
 */

import { datedFuturesContract } from "@/lib/execution/liveOrderPreflight";

export type CaptureProvenance = "BROKER-REPORTED" | "TICKET-INTENT" | "DERIVED" | "UNREPORTED";

export const CAPTURE_PROVENANCES: readonly CaptureProvenance[] = ["BROKER-REPORTED", "TICKET-INTENT", "DERIVED", "UNREPORTED"];

export interface CapturedField<T> {
  /** null exactly when provenance is UNREPORTED. */
  readonly value: T | null;
  readonly provenance: CaptureProvenance;
  /** Where it came from, in words ("tastytrade order readback", "ticket at send"). */
  readonly source: string;
}

/** What the ticket knew before the send. Everything optional is UNREPORTED when absent. */
export interface FillCaptureIntent {
  readonly decisionId: string | null;
  readonly orderIntentId?: string | null;
  /** The trader's View / thesis words for this decision, when the ticket carried them. */
  readonly view?: string | null;
  readonly broker: "tastytrade";
  readonly environment?: string | null;
  /** The account the trader chose on the ticket (last four only). */
  readonly accountTail?: string | null;
  readonly instrumentType: string;
  /** The chart symbol the trader was looking at (`NQ1!`). */
  readonly chartSymbol?: string | null;
  readonly action: string;
  readonly qty: number;
  readonly orderType?: string | null;
  readonly limitPx?: number | null;
  /** Entry stop trigger of a Stop / Stop Limit entry. */
  readonly entryTriggerPx?: number | null;
  readonly protectiveStopPx?: number | null;
  /**
   * The plan's stop when this ticket does not carry it as `protectiveStopPx`
   * (a closing ticket, or the resting protective Stop itself). Used for the
   * planned stop field and, on a closing fill, the planned 1R.
   */
  readonly plannedStopPx?: number | null;
  readonly targetPx?: number | null;
  /** The touch the ticket priced against and when WM received it. */
  readonly quote?: { readonly bid: number | null; readonly ask: number | null; readonly atMs: number | null } | null;
  /** When the one POST left WM (the ticket's SUBMITTING moment), if recorded. */
  readonly sentAtMs?: number | null;
  /** $ per 1.0 of price per unit: futures point value, 100 for an equity option, 1 for shares. */
  readonly multiplier?: number | null;
}

/** The subset of tastytrade's order readback (TtOrderView) capture reads. */
export interface FillCaptureOrder {
  readonly id: string;
  readonly status: string;
  readonly state: string;
  readonly symbol: string | null;
  readonly action: string | null;
  readonly quantity: number | null;
  readonly filled: number | null;
  readonly price: string | null;
  readonly orderType: string | null;
  readonly externalId: string | null;
  readonly updatedAt: string | null;
  /** Legs tastytrade reported; > 1 is a multi-leg order (refused — not one instrument). */
  readonly legCount?: number;
}

/** The subset of tastytrade's trade transaction (TtFill) capture reads. */
export interface FillCaptureFill {
  readonly id: string;
  readonly orderId: string | null;
  readonly quantity: number | null;
  readonly price: number | null;
  readonly fees: number;
  readonly executedAt: string | null;
  /** False when tastytrade sent no fee field on this transaction (fees UNREPORTED, never 0). */
  readonly feesReported?: boolean;
}

/** tastytrade's own round-trip result, when a closing fill completes one (tastytradeLedger). */
export interface FillCaptureBrokerResult {
  readonly net: number;
  readonly fees: number;
  readonly closedAt: string | null;
  /** Quantity-weighted price of the round trip's OPENING fills (tastytrade's), when known. */
  readonly openAvgPx?: number | null;
  /** The round trip's largest position (tastytrade's quantities). */
  readonly qty?: number | null;
}

export interface FillCaptureInput {
  readonly intent: FillCaptureIntent;
  readonly order: FillCaptureOrder;
  /** tastytrade trade transactions (any order); only those with this order's id are read. */
  readonly fills?: readonly FillCaptureFill[];
  /** The account tail the broker listed this order / its fills under. */
  readonly brokerAccountTail?: string | null;
  readonly brokerResult?: FillCaptureBrokerResult | null;
  /** Fallback clock for dating the contract when tastytrade reported no fill time. */
  readonly nowMs: number;
}

export interface JournalCaptureDraft {
  readonly kind: "WM_FILL_CAPTURE";
  readonly version: 1;
  readonly capturedAtMs: number;
  readonly decisionId: CapturedField<string>;
  readonly orderIntentId: CapturedField<string>;
  readonly clientOrderId: CapturedField<string>;
  readonly view: CapturedField<string>;
  readonly broker: CapturedField<string>;
  readonly environment: CapturedField<string>;
  readonly account: CapturedField<string>;
  readonly instrumentType: CapturedField<string>;
  readonly chartSymbol: CapturedField<string>;
  readonly contract: CapturedField<string>;
  readonly datedContract: CapturedField<string>;
  readonly orderId: CapturedField<string>;
  readonly orderStatus: CapturedField<string>;
  readonly action: CapturedField<string>;
  readonly orderType: CapturedField<string>;
  readonly orderedQty: CapturedField<number>;
  readonly filledQty: CapturedField<number>;
  readonly limitPx: CapturedField<number>;
  readonly fillPx: CapturedField<number>;
  readonly filledAt: CapturedField<string>;
  readonly fees: CapturedField<number>;
  readonly quoteBid: CapturedField<number>;
  readonly quoteAsk: CapturedField<number>;
  readonly spread: CapturedField<number>;
  readonly quoteAgeAtSendMs: CapturedField<number>;
  readonly slippage: CapturedField<number>;
  readonly slippageUsd: CapturedField<number>;
  readonly stopPx: CapturedField<number>;
  readonly targetPx: CapturedField<number>;
  readonly plannedRiskUsd: CapturedField<number>;
  readonly pnlUsd: CapturedField<number>;
  readonly realizedR: CapturedField<number>;
}

export type JournalCaptureResult =
  | { readonly ok: true; readonly draft: JournalCaptureDraft }
  | { readonly ok: false; readonly reason: string };

/* ── field constructors ─────────────────────────────────────────────────── */

const unreported = <T,>(source: string): CapturedField<T> => ({ value: null, provenance: "UNREPORTED", source });
const field = <T,>(value: T | null | undefined, provenance: Exclude<CaptureProvenance, "UNREPORTED">, source: string, missing: string): CapturedField<T> =>
  value == null || (typeof value === "number" && !Number.isFinite(value)) || (typeof value === "string" && value.trim() === "")
    ? unreported<T>(missing)
    : { value, provenance, source };

const num = (v: string | number | null | undefined): number | null => {
  if (v == null) return null;
  const x = typeof v === "number" ? v : v.trim() === "" ? NaN : Number(v);
  return Number.isFinite(x) ? x : null;
};
const round = (x: number, dp = 6) => Math.round(x * 10 ** dp) / 10 ** dp;
const isBuy = (action: string | null | undefined) => (action ?? "").toLowerCase().startsWith("buy");
const isClosing = (action: string | null | undefined) => /to close/i.test(action ?? "");

const BROKER_ORDER = "tastytrade order readback";
const BROKER_FILLS = "tastytrade trade transactions for this order";
const TICKET = "ticket at send";

/**
 * A broker-confirmed FILLED order → a journal draft with provenance per field.
 * Refuses anything tastytrade has not read back as FILLED.
 */
export function journalCaptureFromFill(input: FillCaptureInput): JournalCaptureResult {
  const { intent, order } = input;
  if (!order || !order.id) return { ok: false, reason: "No broker readback for this order — nothing to capture." };
  if ((order.legCount ?? 1) > 1) {
    return { ok: false, reason: `tastytrade reports ${order.legCount} legs on this order. A multi-leg order is not one instrument, so WM does not capture it as one trade — journal each leg yourself (UNKNOWN to WM how the legs pair).` };
  }
  const mine = (input.fills ?? []).filter(f => f.orderId === order.id);
  // A partial fill that was then cancelled / expired / removed is still a real fill: tastytrade
  // reports the filled quantity and its own transactions. Anything still working waits.
  const partialThenEnded = (order.state === "CANCELED" || order.state === "CLOSED") && (order.filled ?? 0) > 0 && mine.length > 0;
  if (order.state !== "FILLED" && !partialThenEnded) {
    return { ok: false, reason: `tastytrade reads this order as ${order.state.replace(/_/g, " ")}, not FILLED. A journal draft waits for the broker's fill.` };
  }

  const priced = mine.filter(f => num(f.price) != null && num(f.quantity) != null && (f.quantity as number) > 0);
  const fillQty = priced.reduce((s, f) => s + (f.quantity as number), 0);

  // Fill price: one transaction is the broker's own number; several are averaged by
  // quantity (DERIVED from broker numbers). Never the order's limit price.
  let fillPx: CapturedField<number>;
  if (priced.length === 1) fillPx = { value: priced[0].price as number, provenance: "BROKER-REPORTED", source: BROKER_FILLS };
  else if (priced.length > 1 && fillQty > 0) {
    fillPx = { value: round(priced.reduce((s, f) => s + (f.price as number) * (f.quantity as number), 0) / fillQty), provenance: "DERIVED", source: `quantity-weighted average of ${priced.length} tastytrade fills` };
  } else fillPx = unreported("tastytrade has not reported a fill transaction for this order yet (the order's limit is not its fill price)");

  // Fees are BROKER-REPORTED only when every fill of this order carried a fee field; a fill
  // with none is UNREPORTED, and a partial sum would understate the cost — so it is not given.
  const feeKnown = mine.filter(f => f.feesReported !== false);
  const fees: CapturedField<number> = !mine.length
    ? unreported("tastytrade has not reported fees for this order yet")
    : feeKnown.length < mine.length
      ? unreported(`tastytrade reported fees on ${feeKnown.length} of ${mine.length} fills for this order — the total is UNKNOWN, not the partial sum`)
      : { value: round(mine.reduce((s, f) => s + (Number.isFinite(f.fees) ? f.fees : 0), 0), 4), provenance: "BROKER-REPORTED", source: `${BROKER_FILLS} (commission + clearing + regulatory, each reported separately)` };

  const executedTimes = mine.map(f => f.executedAt).filter((t): t is string => !!t).sort();
  const filledAt = field(executedTimes[0] ?? null, "BROKER-REPORTED", BROKER_FILLS, "tastytrade did not report when it filled");

  const filledQty: CapturedField<number> = order.filled != null
    ? { value: order.filled, provenance: "BROKER-REPORTED", source: BROKER_ORDER }
    : fillQty > 0 ? { value: fillQty, provenance: "DERIVED", source: "sum of tastytrade fill quantities" }
    : unreported("tastytrade did not report the filled quantity");

  const contractSym = order.symbol ?? null;
  const fillMs = executedTimes[0] ? Date.parse(executedTimes[0]) : NaN;
  const dated = contractSym && /future/i.test(intent.instrumentType) && !/option/i.test(intent.instrumentType)
    ? datedFuturesContract(contractSym, Number.isFinite(fillMs) ? fillMs : input.nowMs)
    : null;

  const bid = num(intent.quote?.bid ?? null);
  const ask = num(intent.quote?.ask ?? null);
  const spread: CapturedField<number> = bid != null && ask != null && ask >= bid
    ? { value: round(ask - bid), provenance: "DERIVED", source: "ask − bid of the ticket's quote at send" }
    : unreported("no two-sided quote at send");
  const quoteAge: CapturedField<number> = intent.quote?.atMs != null && intent.sentAtMs != null && intent.sentAtMs >= intent.quote.atMs
    ? { value: intent.sentAtMs - intent.quote.atMs, provenance: "DERIVED", source: "send time − quote time" }
    : unreported("the send time or the quote time was not recorded");

  const buy = isBuy(order.action ?? intent.action);
  // Slippage against the touch you would cross: the ask for a buy, the bid for a sell.
  // Positive = paid worse than the touch.
  const touch = buy ? ask : bid;
  const fp = fillPx.value;
  const slippage: CapturedField<number> = fp != null && touch != null
    ? { value: round(buy ? fp - touch : touch - fp), provenance: "DERIVED", source: `fill − ${buy ? "ask" : "bid"} at send (positive = worse than the touch)` }
    : unreported(fp == null ? "no broker fill price" : "no touch at send to compare against");
  const mult = num(intent.multiplier ?? null);
  const qtyForMoney = filledQty.value;
  const slippageUsd: CapturedField<number> = slippage.value != null && mult != null && mult > 0 && qtyForMoney != null
    ? { value: round(slippage.value * mult * qtyForMoney, 2), provenance: "DERIVED", source: "slippage × multiplier × filled quantity" }
    : unreported("slippage, the multiplier or the filled quantity is unknown");

  const stop = num(intent.protectiveStopPx ?? intent.plannedStopPx ?? null);
  const target = num(intent.targetPx ?? null);
  const res = input.brokerResult;
  const closing = isClosing(intent.action);
  const openPx = num(res?.openAvgPx ?? null);
  const tripQty = num(res?.qty ?? null);
  // An opening fill's 1R is measured from its own fill; a closing fill's from the
  // round trip's opening fills (tastytrade's), against the same planned stop.
  const plannedRisk: CapturedField<number> = !closing
    ? (fp != null && stop != null && mult != null && mult > 0 && qtyForMoney != null && Math.abs(fp - stop) > 0
      ? { value: round(Math.abs(fp - stop) * mult * qtyForMoney, 2), provenance: "DERIVED", source: "|fill − planned stop| × multiplier × filled quantity" }
      : unreported("the fill, the planned stop or the multiplier is unknown"))
    : (openPx != null && stop != null && mult != null && mult > 0 && tripQty != null && tripQty > 0 && Math.abs(openPx - stop) > 0
      ? { value: round(Math.abs(openPx - stop) * mult * tripQty, 2), provenance: "DERIVED", source: "|tastytrade opening average − planned stop| × multiplier × round-trip quantity" }
      : unreported("needs tastytrade's round trip (opening fills) and the planned stop"));

  const pnl: CapturedField<number> = res && Number.isFinite(res.net)
    ? { value: round(res.net, 2), provenance: "BROKER-REPORTED", source: "tastytrade round trip (net after fees)" }
    : unreported(closing ? "tastytrade has not reported the round trip's result yet" : "the position is open — there is no result yet (not breakeven)");
  const realizedR: CapturedField<number> = pnl.value != null && plannedRisk.value != null && plannedRisk.value > 0
    ? { value: round(pnl.value / plannedRisk.value, 4), provenance: "DERIVED", source: "broker P&L ÷ planned risk" }
    : unreported("needs both a broker result and a planned risk");

  const brokerTail = input.brokerAccountTail ?? null;
  const account: CapturedField<string> = brokerTail
    ? { value: `…${brokerTail}`, provenance: "BROKER-REPORTED", source: "the tastytrade account the order was read back under" }
    : field(intent.accountTail ? `…${intent.accountTail}` : null, "TICKET-INTENT", "the account chosen on the ticket", "no account recorded");

  return {
    ok: true,
    draft: {
      kind: "WM_FILL_CAPTURE",
      version: 1,
      capturedAtMs: input.nowMs,
      decisionId: field(intent.decisionId, "TICKET-INTENT", TICKET, "no Decision_ID on the ticket"),
      orderIntentId: field(intent.orderIntentId ?? null, "TICKET-INTENT", TICKET, "the ticket carried no ORDER_INTENT_ID"),
      clientOrderId: field(order.externalId, "BROKER-REPORTED", BROKER_ORDER, "tastytrade did not echo a client order id"),
      view: field(intent.view ?? null, "TICKET-INTENT", TICKET, "no View recorded on the ticket"),
      broker: { value: intent.broker, provenance: "TICKET-INTENT", source: TICKET },
      environment: field(intent.environment ?? null, "TICKET-INTENT", "server environment at send", "environment unknown"),
      account,
      instrumentType: field(intent.instrumentType, "TICKET-INTENT", TICKET, "instrument type unknown"),
      chartSymbol: field(intent.chartSymbol ?? null, "TICKET-INTENT", TICKET, "no chart symbol recorded"),
      contract: field(contractSym, "BROKER-REPORTED", BROKER_ORDER, "tastytrade did not report the contract"),
      datedContract: dated ? { value: dated.label, provenance: "DERIVED", source: "contract code → month and year" } : unreported(contractSym ? "not a dated futures contract" : "no contract reported"),
      orderId: { value: order.id, provenance: "BROKER-REPORTED", source: BROKER_ORDER },
      orderStatus: field(order.status, "BROKER-REPORTED", BROKER_ORDER, "no status reported"),
      action: field(order.action, "BROKER-REPORTED", BROKER_ORDER, "tastytrade did not report the action"),
      orderType: field(order.orderType, "BROKER-REPORTED", BROKER_ORDER, "tastytrade did not report the order type"),
      orderedQty: field(order.quantity, "BROKER-REPORTED", BROKER_ORDER, "tastytrade did not report the order quantity"),
      filledQty,
      limitPx: field(num(order.price), "BROKER-REPORTED", BROKER_ORDER, "no limit price (not a limit order, or not reported)"),
      fillPx,
      filledAt,
      fees,
      quoteBid: field(bid, "TICKET-INTENT", "WM's quote the ticket priced against", "no bid at send"),
      quoteAsk: field(ask, "TICKET-INTENT", "WM's quote the ticket priced against", "no ask at send"),
      spread,
      quoteAgeAtSendMs: quoteAge,
      slippage,
      slippageUsd,
      stopPx: field(stop, "TICKET-INTENT", "planned protective stop on the ticket", "no planned stop on the ticket"),
      targetPx: field(target, "TICKET-INTENT", "planned target on the ticket", "no planned target on the ticket"),
      plannedRiskUsd: plannedRisk,
      pnlUsd: pnl,
      realizedR,
    },
  };
}

/* ── the draft → the Journal's own form ─────────────────────────────────── */

/** The JournalEntry fields a draft can honestly prefill. Absent = the trader writes it. */
export interface JournalFormPrefill {
  readonly symbol?: string;
  readonly side?: "long" | "short";
  readonly entry?: number;
  readonly size?: number;
  readonly date?: string;
  readonly contractType?: "stock" | "option";
  readonly plannedRDollars?: number;
  readonly capture: JournalCaptureDraft;
}

/**
 * Prefill only what the draft knows. Exit and P&L are never prefilled for an
 * opening fill — the Journal's save gate then refuses it until the trader
 * writes the exit, so it can never be saved as a breakeven trade.
 */
export function captureToJournalForm(draft: JournalCaptureDraft, dayKeyOf: (d: Date) => string): JournalFormPrefill {
  const action = draft.action.value ?? "";
  const closing = isClosing(action);
  const buy = isBuy(action);
  // Opening buy = long; opening sell = short; a closing order journals the position it closed.
  const side: "long" | "short" | undefined = action ? (closing ? (buy ? "short" : "long") : (buy ? "long" : "short")) : undefined;
  const type = draft.instrumentType.value ?? "";
  const filledAtMs = draft.filledAt.value ? Date.parse(draft.filledAt.value) : NaN;
  const out: { -readonly [K in keyof JournalFormPrefill]: JournalFormPrefill[K] } = { capture: draft };
  const symbol = draft.chartSymbol.value ?? draft.contract.value;
  if (symbol) out.symbol = symbol.toUpperCase();
  if (side) out.side = side;
  if (!closing && draft.fillPx.value != null && draft.fillPx.value > 0) out.entry = draft.fillPx.value;
  if (draft.filledQty.value != null && draft.filledQty.value > 0) out.size = draft.filledQty.value;
  if (Number.isFinite(filledAtMs)) out.date = dayKeyOf(new Date(filledAtMs));
  if (/^equity option$/i.test(type)) out.contractType = "option";
  else if (/^equity$/i.test(type)) out.contractType = "stock";
  if (draft.plannedRiskUsd.value != null && draft.plannedRiskUsd.value > 0) out.plannedRDollars = draft.plannedRiskUsd.value;
  return out;
}

/* ── reading a stored draft back (journal records, the hand-off) ────────── */

const DRAFT_FIELDS = [
  "decisionId", "orderIntentId", "clientOrderId", "view", "broker", "environment", "account", "instrumentType", "chartSymbol",
  "contract", "datedContract", "orderId", "orderStatus", "action", "orderType", "orderedQty", "filledQty", "limitPx", "fillPx",
  "filledAt", "fees", "quoteBid", "quoteAsk", "spread", "quoteAgeAtSendMs", "slippage", "slippageUsd", "stopPx", "targetPx",
  "plannedRiskUsd", "pnlUsd", "realizedR",
] as const satisfies readonly (keyof JournalCaptureDraft)[];

const NUMERIC: ReadonlySet<string> = new Set([
  "orderedQty", "filledQty", "limitPx", "fillPx", "fees", "quoteBid", "quoteAsk", "spread", "quoteAgeAtSendMs", "slippage",
  "slippageUsd", "stopPx", "targetPx", "plannedRiskUsd", "pnlUsd", "realizedR",
]);

function readField(raw: unknown, numeric: boolean): CapturedField<string | number> {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const p = CAPTURE_PROVENANCES.includes(o.provenance as CaptureProvenance) ? (o.provenance as CaptureProvenance) : "UNREPORTED";
  const source = typeof o.source === "string" ? o.source.slice(0, 240) : "";
  const v = o.value;
  const ok = numeric ? typeof v === "number" && Number.isFinite(v) : typeof v === "string" && v.trim() !== "";
  // A stored value without a known provenance, or a provenance without a value, reads UNREPORTED.
  if (p === "UNREPORTED" || !ok) return { value: null, provenance: "UNREPORTED", source: source || "not reported" };
  return { value: numeric ? (v as number) : (v as string).slice(0, 240), provenance: p, source };
}

/** A stored capture, or null. Unknown provenance degrades to UNREPORTED, never to a value. */
export function readJournalCapture(raw: unknown): JournalCaptureDraft | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.kind !== "WM_FILL_CAPTURE" || o.version !== 1) return null;
  const out: Record<string, unknown> = { kind: "WM_FILL_CAPTURE", version: 1, capturedAtMs: typeof o.capturedAtMs === "number" && Number.isFinite(o.capturedAtMs) ? o.capturedAtMs : 0 };
  for (const k of DRAFT_FIELDS) out[k] = readField(o[k], NUMERIC.has(k));
  const draft = out as unknown as JournalCaptureDraft;
  return draft.orderId.value != null ? draft : null;
}

/** Field labels, in the order the Journal prints them. */
export const CAPTURE_FIELD_LABELS: readonly (readonly [keyof JournalCaptureDraft, string])[] = [
  ["decisionId", "Decision_ID"], ["orderIntentId", "ORDER_INTENT_ID"], ["view", "View"],
  ["broker", "Broker"], ["environment", "Environment"], ["account", "Account"],
  ["contract", "Contract"], ["datedContract", "Dated contract"], ["chartSymbol", "Chart symbol"],
  ["orderId", "Order id"], ["clientOrderId", "Client order id"], ["orderStatus", "Order status"], ["action", "Action"], ["orderType", "Order type"],
  ["orderedQty", "Ordered qty"], ["filledQty", "Filled qty"], ["limitPx", "Limit"], ["fillPx", "Fill price"], ["filledAt", "Filled at"], ["fees", "Fees"],
  ["quoteBid", "Bid at send"], ["quoteAsk", "Ask at send"], ["spread", "Spread at send"], ["quoteAgeAtSendMs", "Quote age at send (ms)"],
  ["slippage", "Slippage vs touch"], ["slippageUsd", "Slippage $"],
  ["stopPx", "Planned stop (SL)"], ["targetPx", "Planned target (TP)"], ["plannedRiskUsd", "Planned risk $ (1R)"],
  ["pnlUsd", "P&L"], ["realizedR", "R"],
];
