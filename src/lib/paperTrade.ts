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

import type { CapitalStoreFacts } from "@/lib/experience/capitalReach";
import type { DecisionId } from "@/lib/traderMemory/decisionIdentity";

export const PAPER_KEY = "wm_paper_state";
export const STARTING_CASH = 100_000;

/**
 * PAPER_STORE_FACTS — what is TRUE about this store's reach, declared next to
 * the `window.localStorage` calls that make it true.
 *
 * These facts feed `selectCapitalReach` (src/lib/experience/capitalReach.ts),
 * which computes the CROSS-DEVICE verdict the shell and /paper display. They
 * live HERE, not in the consumer, for one reason: the day this store grows a
 * server authority, the code that changes and the facts that describe it are
 * in the same edit. A facts table maintained in the UI layer would go stale
 * the first time persistence moved, and a stale fact here is a lie on screen.
 *
 * `crossTabInvalidation` is true because `subscribePaperState` listens to the
 * `storage` event — that is a second TAB of the SAME browser profile on the
 * SAME machine, and it is recorded as such. It is not device parity and
 * `selectCapitalReach` is tested to never let it become that.
 *
 * `serverAuthority` is null and must stay null until a real table/endpoint
 * holds the book. Known Holes Owned H16 / BUILD ORDER §22A: "if no shared
 * store exists, status is CROSS-DEVICE BLOCKED, not simulated parity."
 */
export const PAPER_STORE_FACTS = {
  medium: "BROWSER_LOCAL",
  crossTabInvalidation: true,
  serverAuthority: null,
} as const satisfies CapitalStoreFacts;

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
 * Contract point value — the dollars one FULL POINT of price movement is worth
 * for one contract.
 *
 * /paper's universe carries five CME futures alongside equities, ETFs and
 * crypto, and every money path treated all of them as 1x:
 *
 *   applyFill      cashDelta = -signedQty * fillPx
 *   applyFill      realized  = closeQty * (fillPx - avgPx) * sign
 *   /paper page    unrealPnl = (mark - avgPx) * qty
 *   /paper page    equity    = cash + SUM(qty * marketPx)
 *   fill loop      buying power gate called with no multiplier
 *
 * So a 10-point move on one NQ contract showed $10 of P&L. It is worth $200.
 * Crude was the worst case at 1000x: a $1.00 move on one CL contract showed
 * $1 instead of $1,000.
 *
 * This is the H-Bkt 5 defect one surface over — the Journal shipped the same
 * bug for options ("computed 100x too low") and it was fixed there. The
 * options path here already applies OPT_MULTIPLIER correctly; futures were
 * simply never given a point value.
 *
 * Why it is the dangerous direction: canon weakness #9 PAPER-FILL
 * OVERCONFIDENCE, and the reason paper exists at all — position sizing is the
 * habit it is supposed to build. A trader practising on this sim read a
 * 10-point NQ stop as $10 of risk when it is $200, and a $1 crude stop as $1
 * when it is $1,000. That is not a rounding error, it is the wrong lesson
 * taught confidently, and it understates loss by up to three orders of
 * magnitude.
 *
 * Values are CME contract specifications, not estimates:
 *   NQ  E-mini Nasdaq-100     $20 x index
 *   ES  E-mini S&P 500        $50 x index
 *   RTY E-mini Russell 2000   $50 x index
 *   GC  Gold                  100 troy oz  -> $100 per $1
 *   CL  Crude Oil             1,000 barrels -> $1,000 per $1
 *
 * Anything absent is 1x: shares, ETFs and spot crypto quote in the same
 * dollars they settle in. Options do NOT belong here — they are contracts on
 * an underlying and are multiplied by OPT_MULTIPLIER on their own path.
 */
export const CONTRACT_MULTIPLIERS: Readonly<Record<string, number>> = Object.freeze({
  "NQ1!": 20,
  "ES1!": 50,
  "RTY1!": 50,
  "GC1!": 100,
  "CL1!": 1_000,
});

/**
 * Dollars per point for `symbol`. Unknown symbols are 1x.
 *
 * The 1x default is right for equities/ETFs/crypto but is NOT self-policing:
 * a futures contract added to the /paper universe without an entry above would
 * silently inherit 1x and under-report P&L exactly the way this fixes. The
 * Sentinel in paperContractMultiplier.test.ts cross-checks the universe
 * against this table so that omission fails the suite instead of the trader.
 */
export function contractMultiplier(symbol: string): number {
  const m = CONTRACT_MULTIPLIERS[symbol];
  return typeof m === "number" && Number.isFinite(m) && m > 0 ? m : 1;
}

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

/**
 * Size a flattening order against a position, accounting for market orders
 * that are already pending on the same symbol.
 *
 * /paper's closePosition() sized the close from the CURRENT position only:
 *
 *   qty: Math.abs(pos.qty), side: pos.qty > 0 ? "sell" : "buy"
 *
 * The Close control has no disabled state and fills happen on the next quote
 * tick, so two quick clicks on a long 10 produced TWO pending sell-10 orders —
 * the position is still 10 when the second is created. Both fill, and the
 * trader who asked to go flat ends up SHORT 10. Canon §13 reconciliation
 * realism: the ledger must not manufacture an opposite position out of a
 * close request.
 *
 * Only pending MARKET orders are netted. A resting limit or stop may never
 * fill, so counting it would under-size a genuine flatten.
 *
 * Returns null when nothing further is required — no position, or pending
 * market orders already cover it.
 */
/**
 * Reject a BUY the simulated account cannot fund.
 *
 * /paper had no buying-power check anywhere. submit() gated on quote
 * readiness and qty > 0; openOption() ran `setCash(c => c - cost)`
 * unconditionally; fills applied cashDelta unconditionally. A $100,000
 * simulated account could therefore buy millions of dollars of contracts and
 * simply go deeply negative.
 *
 * Canon weakness #9 PAPER-FILL OVERCONFIDENCE: paper that does not behave like
 * a funded account teaches the wrong lesson — position sizing is the habit
 * paper trading exists to build, and an account that can never run out of money
 * cannot teach it. The OrderStatus enum already declared "rejected" for exactly
 * this and nothing ever produced it.
 *
 * Deliberately narrow: this rejects only a BUY whose cost exceeds available
 * cash — unambiguous, since you cannot spend money you do not have. Short
 * selling needs a margin model, which is a separate decision and is NOT
 * invented here; sells are left alone.
 *
 * Returns a human reason for the reject, or null when the order may stand.
 */
export function selectOrderRejection(input: {
  readonly side: OrderSide;
  readonly qty: number;
  readonly price: number;
  readonly cash: number;
  /** 100 for options contracts, 1 for shares. */
  readonly multiplier?: number;
}): string | null {
  const { side, qty, price, cash } = input;
  const multiplier = input.multiplier ?? 1;

  if (!Number.isFinite(qty) || qty <= 0) return "Quantity must be greater than zero.";
  // Price is gated upstream by quote readiness; an unusable price is not a
  // funding failure, so do not manufacture a rejection reason for it.
  if (!Number.isFinite(price) || price <= 0) return null;
  if (side !== "buy") return null;

  if (!Number.isFinite(cash)) return "Available paper cash is unverified; this buy cannot be funded.";
  if (!Number.isFinite(multiplier) || multiplier <= 0) return "Contract multiplier is invalid; this buy cannot be valued.";
  const cost = qty * price * multiplier;
  if (!Number.isFinite(cost)) return "Order cost is invalid; this buy cannot be valued.";
  if (cost > cash) {
    return `Insufficient cash — this order costs ${cost.toLocaleString("en-US", {
      style: "currency", currency: "USD", maximumFractionDigits: 0,
    })} and the account holds ${cash.toLocaleString("en-US", {
      style: "currency", currency: "USD", maximumFractionDigits: 0,
    })}.`;
  }
  return null;
}

export function selectCloseOrderPlan(
  positionQty: number,
  pendingOrders: readonly Pick<Order, "symbol" | "side" | "type" | "qty" | "status">[],
  symbol: string,
): { side: OrderSide; qty: number } | null {
  if (!Number.isFinite(positionQty) || positionQty === 0) return null;

  let pendingNet = 0;
  for (const o of pendingOrders) {
    if (o.symbol !== symbol) continue;
    if (o.status !== "pending") continue;
    if (o.type !== "market") continue;          // resting orders may never fill
    const q = Math.abs(Number(o.qty) || 0);
    if (q <= 0) continue;
    pendingNet += o.side === "buy" ? q : -q;
  }

  const projected = positionQty + pendingNet;
  if (projected === 0) return null;             // already fully covered
  return { side: projected > 0 ? "sell" : "buy", qty: Math.abs(projected) };
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
  /**
   * Why a `rejected` order was rejected, in the trader's words.
   *
   * Only meaningful on `status:"rejected"`. Optional because orders persisted
   * before this field existed cannot have one — the blotter discloses that
   * absence rather than rendering silence, since a rejection with no reason
   * shown reads as "there was no reason".
   */
  rejectReason?: string;
  /**
   * The decision this order is an ATTEMPT AT — §4's DECISION_ID.
   *
   * `id` above is the order's own id: it dies at reject and the retry gets a
   * new one. This does not. A reject, a retry, a partial, a protect, a
   * replace, an exit and the final receipt all carry the same value, which is
   * what makes "the phone is the same position" (§5 step 9) a question with
   * an answer.
   *
   * OPTIONAL, AND IT MUST STAY OPTIONAL. Orders in the blotter from before
   * this field existed have no decision identity, and they cannot be given
   * one retroactively without inventing which decision they belonged to. H1:
   * absence is not zero, and it is not a fresh id either. Readers disclose
   * the absence; they never mint over it.
   */
  decisionId?: DecisionId;
}

/**
 * Stamp rejection reasons onto the orders they belong to.
 *
 * WHY THIS IS A FUNCTION AND NOT TWO LINES IN THE FILL LOOP. /paper computed a
 * real, human reason for every rejected order and then threw it away:
 *
 *   const reject = selectOrderRejection({ ... });
 *   if (reject) rejects.push({ id: ord.id, reason: reject });
 *   ...
 *   const byId = new Map(rejects.map(r => [r.id, r.reason]));
 *   setOrders(prev => prev.map(o =>
 *     byId.has(o.id) ? { ...o, status: "rejected" } : o));   // <- reason dropped
 *
 * The Map carried the reason and only `has()` was ever called on it. The
 * blotter then rendered the bare word "rejected" in a red chip and nothing
 * else, so the trader saw that something was refused and never learned what.
 *
 * That is the whole lesson, lost. Canon weakness #9 PAPER-FILL OVERCONFIDENCE:
 * position sizing is the habit paper trading exists to build. "Rejected" does
 * not teach it. "This order costs $435,000 and the account holds $100,000"
 * does. selectOrderRejection was written to return that sentence — its doc says
 * "Returns a human reason for the reject" — and the surface discarded it.
 *
 * The sibling options path did NOT have this bug (`setOptionReject(reject)`
 * renders the sentence in a role="alert" box), so one surface honoured the
 * owner's output and the other silently dropped it.
 *
 * Carrying the reason is now the function's only job, which is why it cannot
 * be re-lost by editing a `.map()` in place.
 *
 * Generic over the order shape because /paper declares its own structurally
 * identical `Order` locally.
 */
export function applyOrderRejections<T extends { id: string; status: OrderStatus }>(
  orders: readonly T[],
  rejects: readonly { readonly id: string; readonly reason: string }[],
): T[] {
  if (rejects.length === 0) return orders.slice();
  const byId = new Map(rejects.map(r => [r.id, r.reason]));
  return orders.map(o => {
    const reason = byId.get(o.id);
    if (reason === undefined) return o;
    // A settled order must never transition again (see TERMINAL_ORDER_STATUSES):
    // a filled order already moved cash and positions, so relabelling it
    // "rejected" would make the ledger contradict the account.
    if (isTerminalOrderStatus(o.status)) return o;
    return { ...o, status: "rejected" as OrderStatus, rejectReason: reason };
  });
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
  /**
   * The decision this fill was an ATTEMPT AT — the SAME §4 DECISION_ID the
   * originating Order carried.
   *
   * WHY THIS FIELD EXISTS (P0 artery, and the third instance of one failure
   * class). The artery is DECISION_ID → order → ACK/reject → FILL →
   * reconciliation → receipt. `Order.decisionId` was added and /paper's
   * `submit()` stamps a real one on every order; a later fix taught the
   * blotter to READ it back off the order. But the identity still died at the
   * fill: `applyFill` minted a Trade with no decision identity at all, so the
   * moment an order became a trade the answer to "which decision was this?"
   * was gone from the durable ledger. `trades[]` is what survives the order
   * blotter, what persistence carries, and what a receipt and any
   * reconciliation must read — so losing it here breaks receipt continuity
   * for exactly the orders that WORKED.
   *
   * OPTIONAL, AND IT MUST STAY OPTIONAL — the same H1 rule that governs
   * `Order.decisionId`. Trades in a persisted book from before this field
   * existed have no decision identity and cannot be given one retroactively
   * without inventing which decision they belonged to. Readers disclose the
   * absence; they never mint over it. This reducer forwards and never invents:
   * an order with no decisionId produces a trade with no decisionId.
   */
  decisionId?: DecisionId;
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
  /** The existing browser book cannot be safely replaced by a partial read. */
  | { status: "RECOVERY REQUIRED"; state: null }
  | { status: "FAILED"; state: null };

export type PaperExternalDisposition = "PERSISTED" | "CLEARED" | "INVALID";
export interface PaperSubscriptionUpdate {
  disposition: PaperExternalDisposition;
  state: PaperState;
  /**
   * What the incoming snapshot cost to read. A cross-tab write is exactly the
   * moment a stale build can hand this tab records it no longer understands,
   * so the disposition alone ("PERSISTED") is not the whole truth.
   */
  integrity: PaperBookIntegrity;
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
  /**
   * Dollars per point. Defaults to 1 so equities are unchanged and every
   * pre-existing caller keeps its exact semantics; futures callers pass
   * contractMultiplier(symbol).
   *
   * `avgPx` and `marketPx` stay QUOTED PRICES, never notional — the blotter
   * shows them to the trader and they must match the tape. Only the money
   * lines (cashDelta, realized) are scaled.
   */
  multiplier: number = 1,
): { positions: Position[]; trade: Trade; cashDelta: number; realized: number } {
  const mult = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
  const signedQty = ord.side === "buy" ? ord.qty : -ord.qty; // signed fill size
  const cashDelta = -signedQty * fillPx * mult;              // pay to buy, receive to sell
  const trade: Trade = {
    id: uid(), symbol: ord.symbol, side: ord.side,
    qty: ord.qty, px: fillPx, ts: Date.now(),
    // Carry the decision identity across the order→trade boundary. `id` above
    // is the TRADE's own id and is freshly minted; this is not minted, it is
    // FORWARDED. Conditional spread so an order without decision identity
    // yields a trade with no `decisionId` key at all rather than an explicit
    // `undefined` — persisted books are compared and serialized, and
    // "present but undefined" reads as a different fact from "absent".
    ...(ord.decisionId ? { decisionId: ord.decisionId } : {}),
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
    realized = closeQty * (fillPx - pos.avgPx) * Math.sign(pos.qty) * mult;
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

/* ── Book integrity ──────────────────────────────────────────
 *
 * OBSERVED DEFECT: the deserializer validated CONTAINERS, not CONTENTS.
 * `Array.isArray(s.positions) ? s.positions : []` accepts
 * `[{ symbol: null, qty: "abc" }]` and hands it downstream typed as
 * `Position[]`. Every money calculation in the app then trusts those fields,
 * so one malformed element — from a schema change, a partial write, or a hand
 * edit — becomes NaN cash and a NaN equity curve with no failure anywhere.
 *
 * The medium makes this reachable rather than theoretical: capitalReach
 * already establishes this book lives in BROWSER_LOCAL storage, which is to
 * say, in a place the user, an extension, or an older build of this app can
 * all write to.
 *
 * Elements that fail validation are DROPPED, not repaired — a coerced position
 * is an invented one. But dropping quietly is its own capital lie, so the
 * parse also counts what it rejected. The count deliberately does NOT live on
 * PaperState: savePaperState spreads the whole state into localStorage, so a
 * field there would round-trip and become permanent.
 */

const ORDER_SIDES: readonly string[] = ["buy", "sell"];
const ORDER_TYPES: readonly string[] = ["market", "limit", "stop", "stop-limit"];
const ORDER_STATUSES: readonly string[] = ["pending", "filled", "cancelled", "rejected"];

function num(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
function str(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}
/** Optional fields must be absent or valid — never present and junk. */
function optNum(v: unknown): boolean {
  return v === undefined || num(v);
}
function rec(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function isValidPosition(v: unknown): v is Position {
  return rec(v) && str(v.symbol) && num(v.qty) && num(v.avgPx)
    && num(v.unrealPnl) && num(v.marketPx);
}

export function isValidOrder(v: unknown): v is Order {
  return rec(v) && str(v.id) && str(v.symbol)
    && ORDER_SIDES.includes(v.side as string)
    && ORDER_TYPES.includes(v.type as string)
    && ORDER_STATUSES.includes(v.status as string)
    && num(v.qty) && num(v.ts)
    && optNum(v.limitPx) && optNum(v.stopPx) && optNum(v.fillPx)
    && (v.rejectReason === undefined || typeof v.rejectReason === "string");
}

export function isValidTrade(v: unknown): v is Trade {
  return rec(v) && str(v.id) && str(v.symbol)
    && ORDER_SIDES.includes(v.side as string)
    && num(v.qty) && num(v.px) && num(v.ts) && optNum(v.pnl);
}

export function isValidEquityPoint(v: unknown): v is EquityPoint {
  return rec(v) && num(v.ts) && num(v.equity);
}

/**
 * Option positions are stored as `unknown[]` by design — /paper owns their
 * shape. This validates only the invariant the STORE depends on: that an entry
 * is an object with an id, so the book can be counted and addressed. It
 * deliberately does not assert strike/expiry/premium; claiming to validate a
 * shape this module does not own is how a second owner is born (§24).
 */
export function isAddressableOptionRecord(v: unknown): boolean {
  return rec(v) && str(v.id);
}

/** What the parse refused, by book. Zero everywhere is the healthy state. */
export interface PaperBookIntegrity {
  readonly positions: number;
  readonly orders: number;
  readonly trades: number;
  readonly equity: number;
  readonly optionPositions: number;
  /** A present cash value that was not a finite number. */
  readonly cash: number;
  /** Total rejected records. 0 means the snapshot was fully readable. */
  readonly rejected: number;
  /** JSON or its root container could not be read at all. */
  readonly unreadable: boolean;
}

export const CLEAN_BOOK_INTEGRITY: PaperBookIntegrity = {
  positions: 0, orders: 0, trades: 0, equity: 0, optionPositions: 0, cash: 0,
  rejected: 0, unreadable: false,
};

export interface PaperSnapshot {
  readonly state: PaperState;
  readonly integrity: PaperBookIntegrity;
}

type PaperBookRecord = Exclude<keyof PaperBookIntegrity, "rejected" | "unreadable">;
const BOOK_LABELS: readonly (readonly [PaperBookRecord, string, string])[] = [
  ["positions", "position", "positions"],
  ["orders", "order", "orders"],
  ["trades", "trade", "trades"],
  ["equity", "equity point", "equity points"],
  ["optionPositions", "option position", "option positions"],
  ["cash", "cash value", "cash values"],
];

/**
 * The rejection stated in a trader's words, or null when the book was clean.
 *
 * Lives here rather than in JSX so the sentence is testable and so both the
 * count and the words describing it have one owner. It names WHAT was lost and
 * WHY it cannot be recovered, and it does not offer reassurance it has no
 * grounds for — WM genuinely cannot tell whether a refused record was a real
 * fill or noise, and saying "don't worry" would be inventing that answer.
 */
export function describePaperBookIntegrity(integrity: PaperBookIntegrity): string | null {
  if (integrity.unreadable) {
    return "Your saved paper book could not be read. WM preserved the stored bytes and blocked automatic saves, totals, and empty-book claims. Reset only after you decide the original book is no longer needed.";
  }
  if (integrity.rejected <= 0) return null;
  const parts = BOOK_LABELS
    .filter(([key]) => (integrity[key] as number) > 0)
    .map(([key, one, many]) => {
      const n = integrity[key] as number;
      return `${n} ${n === 1 ? one : many}`;
    });
  const list = parts.length === 1
    ? parts[0]
    : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return `${integrity.rejected === 1 ? "1 stored record" : `${integrity.rejected} stored records`} `
    + `could not be read and ${integrity.rejected === 1 ? "was" : "were"} REJECTED — ${list}. `
    + "Your saved book was written in a form this build does not recognise. "
    + "WM will not guess at the missing values, so those records are not shown "
    + "and are not counted in any total on this page.";
}

/**
 * THE EXIT FROM THE RECOVERY BARRIER.
 *
 * The barrier itself is right: bytes WM cannot read must never be overwritten
 * by a partial re-write. But the barrier as first shipped disabled saving,
 * every action, every total AND Reset, while the screen told the trader to
 * "recover the original book". Nothing in the product could do that. The
 * instruction named an owner that did not exist, so the honest-looking screen
 * was in fact a dead end whose only real exit was devtools.
 *
 * A refusal that leaves no legal move is not protection, it is a brick. So the
 * owner of the bytes now hands them back. WM still refuses to REPAIR the book —
 * it genuinely cannot tell a real fill from noise, and guessing would be the
 * capital lie the barrier exists to prevent — but "we will not guess for you"
 * only stays honest if "you may take it and look yourself" is real.
 */
export function readPreservedPaperBook(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(PAPER_KEY);
  } catch {
    // A storage read can throw on a locked-down or evicted origin. That is not
    // "the book is empty" — an empty string would claim we looked and found
    // nothing. null is the only truthful answer to a read that did not happen.
    return null;
  }
}

/** Names the rescued file after the moment it was rescued, not "paper-book". */
export function preservedPaperBookFilename(now: Date): string {
  const stamp = now.toISOString().replace(/[:.]/g, "-").replace(/Z$/, "");
  return `wm-paper-book-unreadable-${stamp}.json`;
}

/**
 * What the trader may do next, in their words.
 *
 * Two states, because the legal moves genuinely differ. Before a copy is taken
 * the only safe move is to take one; after it, discarding stops being data loss
 * and becomes a choice. The sentence never promises the copy can be repaired,
 * because WM does not know that.
 */
export function describePaperRecoveryExit(copyTaken: boolean): string {
  return copyTaken
    ? "You have downloaded the saved book in this session. Reset is now available: "
    + "it will overwrite the stored bytes with a fresh $100,000 account. "
    + "WM cannot tell you whether the downloaded file can be repaired — keep it "
    + "somewhere safe before you reset."
    : "Download the saved book before anything overwrites it. WM will not repair "
    + "it for you and will not guess at the records it could not read, so the "
    + "file is the only copy of what you had. Reset stays unavailable until you "
    + "have taken it.";
}

function keepValid<T>(
  value: unknown,
  isValid: (v: unknown) => boolean,
): { kept: T[]; dropped: number } {
  // An absent collection is a normal older-book omission. A present scalar or
  // object is corruption: counting it prevents a later write from turning it
  // into a clean-looking empty array.
  if (!Array.isArray(value)) return { kept: [], dropped: value === undefined ? 0 : 1 };
  const kept: T[] = [];
  let dropped = 0;
  for (const entry of value) {
    if (isValid(entry)) kept.push(entry as T);
    else dropped += 1;
  }
  return { kept, dropped };
}

export function parsePaperSnapshot(raw: string): PaperSnapshot | null {
  try {
    const s = JSON.parse(raw);
    if (!rec(s)) return null;

    const positions = keepValid<Position>(s.positions, isValidPosition);
    const orders = keepValid<Order>(s.orders, isValidOrder);
    const trades = keepValid<Trade>(s.trades, isValidTrade);
    const equity = keepValid<EquityPoint>(s.equity, isValidEquityPoint);
    const optionPositions = keepValid<unknown>(s.optionPositions, isAddressableOptionRecord);

    const cashRejected = s.cash === undefined || num(s.cash) ? 0 : 1;
    return {
      state: {
        revision: Number.isSafeInteger(s.revision) && (s.revision as number) >= 0
          ? (s.revision as number)
          : 0,
        cash: num(s.cash) ? s.cash : STARTING_CASH,
        positions: positions.kept,
        orders: orders.kept,
        trades: trades.kept,
        // An empty equity curve is not a reading — seed it so the chart has an
        // origin, exactly as before.
        equity: equity.kept.length
          ? equity.kept
          : [{ ts: Date.now(), equity: STARTING_CASH }],
        optionPositions: optionPositions.kept,
      },
      integrity: {
        positions: positions.dropped,
        orders: orders.dropped,
        trades: trades.dropped,
          equity: equity.dropped,
          optionPositions: optionPositions.dropped,
          cash: cashRejected,
          rejected: positions.dropped + orders.dropped + trades.dropped
          + equity.dropped + optionPositions.dropped + cashRejected,
          unreadable: false,
      },
    };
  } catch {
    return null;
  }
}

function parsePaperState(raw: string): PaperState | null {
  return parsePaperSnapshot(raw)?.state ?? null;
}

/**
 * Read the book AND what had to be refused to read it.
 *
 * `loadPaperState` remains the shape every existing caller uses; this is the
 * same read for callers that intend to DISCLOSE the rejection rather than
 * absorb it. Both go through one parse — the integrity report is a byproduct
 * of reading, never a second pass that could disagree with the first.
 */
export function loadPaperSnapshot(): PaperSnapshot {
  const fresh = { state: freshPaperState(), integrity: CLEAN_BOOK_INTEGRITY };
  if (typeof window === "undefined") return fresh;
  try {
    const raw = window.localStorage.getItem(PAPER_KEY);
    if (!raw) return fresh;
    return parsePaperSnapshot(raw) ?? {
      state: freshPaperState(),
      integrity: { ...CLEAN_BOOK_INTEGRITY, unreadable: true },
    };
  } catch {
    return fresh;
  }
}

export function loadPaperState(): PaperState {
  return loadPaperSnapshot().state;
}

/** Persist one canonical paper snapshot with compare-and-swap protection. */
export function savePaperState(
  state: PaperState,
  expectedRevision = state.revision,
): PaperPersistenceResult {
  if (typeof window === "undefined") return { status: "FAILED", state: null };
  try {
    const raw = window.localStorage.getItem(PAPER_KEY);
    const snapshot = raw == null ? null : parsePaperSnapshot(raw);
    // A reader must never rewrite bytes it only partially understood. This is
    // intentionally at the canonical writer, so chart and page callers get
    // the same recovery barrier.
    if (raw != null && (!snapshot || snapshot.integrity.rejected > 0)) {
      return { status: "RECOVERY REQUIRED", state: null };
    }
    const current = snapshot?.state ?? freshPaperState();
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

/**
 * Overwrite an unreadable book on purpose, after the trader has been given it.
 *
 * `savePaperState` must keep refusing — it is the general-purpose writer that
 * every incidental fill, bot tick and chart order flows through, and none of
 * those callers has any business destroying bytes WM could not read. The
 * refusal is not a bug to be relaxed; it is the whole barrier.
 *
 * So the discard gets its own door with its own name. A caller cannot arrive
 * here by accident or by forgetting an argument: it has to say the word
 * "replacePreserved". That is the difference between a guard with a documented
 * exception and a guard someone quietly turned off.
 */
export function replacePreservedPaperBook(state: PaperState): PaperPersistenceResult {
  if (typeof window === "undefined") return { status: "FAILED", state: null };
  try {
    // Revision restarts at 1. Continuing the old counter would inherit a number
    // read out of the very bytes we just declared unreadable.
    const accepted = { ...state, revision: 1 };
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
      listener({
        disposition: "CLEARED",
        state: freshPaperState(),
        integrity: CLEAN_BOOK_INTEGRITY,
      });
      return;
    }
    const parsed = parsePaperSnapshot(event.newValue);
    listener(parsed
      ? { disposition: "PERSISTED", state: parsed.state, integrity: parsed.integrity }
      : { disposition: "INVALID", state: freshPaperState(), integrity: { ...CLEAN_BOOK_INTEGRITY, unreadable: true } });
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

  /**
   * Buying-power gate — the SECOND door into the same ledger.
   *
   * /paper's fill loop consults selectOrderRejection before cash moves. This
   * path did not: it validated symbol, qty and price and then applied the fill
   * unconditionally, so a one-click chart BUY could drive the simulated
   * $100,000 account arbitrarily negative — precisely the defect
   * selectOrderRejection exists to prevent, reached through a different door.
   *
   * NOT A LIVE DEFECT, and this comment says so on purpose:
   * placeChartMarketOrder has ZERO production callers today. The Smart Money
   * one-click caller was removed in 8f71d9e, and chartOrderContractCoverage
   * .test.ts asserts the zero-caller state as a named blocker. So this was a
   * latent hole, not something a trader could reach. It is closed now so that
   * whoever wires this path up inherits the guard instead of having to
   * rediscover it — the same "Orkin nest" shape this repo has been bitten by
   * twice, where a fix lands on one surface and the second door stays open.
   *
   * Rejected before anything is written: the early returns above already
   * decline without touching the ledger, and an order that never reached the
   * book should not appear in it.
   */
  const funding = selectOrderRejection({
    side, qty, price: fillPx, cash: state.cash,
    multiplier: contractMultiplier(symbol),
  });
  if (funding) return { ...base, cash: state.cash, error: funding };

  const ord: Order = {
    id: uid(), symbol, side, type: "market", qty,
    fillPx, status: "filled", ts: Date.now(),
  };
  // Futures move contractMultiplier() dollars per point. Without this a
  // one-click chart BUY on NQ debited the account 1/20th of what it should.
  const { positions, trade, cashDelta, realized } =
    applyFill(state.positions, ord, fillPx, contractMultiplier(symbol));
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
