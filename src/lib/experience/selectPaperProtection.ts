/**
 * selectPaperProtection — the paper book's answer to BUILD ORDER Step 7.
 *
 * ── Why this file exists ─────────────────────────────────────────────────────
 *
 * `selectProtectionState` (src/lib/protectionState.ts) has been the owner of
 * "PROTECTION IS A STATE, NOT A LINE" since the Reality Baseline named Step 7
 * ownerless. It is pure, tested, and it is ALREADY on a screen: `ContractStance`
 * revived it from the screen-reach ledger on 2026-09-08. This file does not
 * claim to be its first caller and the ledger is not shrunk by it.
 *
 * What this file closes is narrower and real. Every existing caller hands the
 * owner a LITERAL for the covered quantity — /paper passes
 * `brokerAckedProtectedQty: 0` — so the grade is decided before the book is
 * read, and no amount of actual protection could move it. Nothing in the
 * product has ever answered the owner's actual question from evidence:
 *
 *     given these positions and these resting orders, how much size is covered?
 *
 * That is the one question this selector answers, and the only one. It computes
 * no grade and invents no vocabulary — it is an adapter between the paper
 * book's shapes and the owner, not a second protection engine (§15).
 *
 * ── What counts as coverage ──────────────────────────────────────────────────
 *
 * Three conditions, all required, none of them cosmetic:
 *
 *   1. **Type is `stop` or `stop-limit`.** A resting `limit` order on the
 *      closing side is a TARGET, not protection. Counting it would let a
 *      trader's profit objective masquerade as a floor, which reads in the
 *      reassuring direction and is therefore the dangerous one.
 *
 *   2. **Status is `pending`.** Only a working order protects. A filled,
 *      cancelled or rejected stop covers nothing, and `TERMINAL_ORDER_STATUSES`
 *      already names that set — this file defers to it rather than re-listing
 *      the statuses, so a new terminal status cannot silently become coverage.
 *
 *   3. **Side closes the position.** A long (`qty > 0`) is protected by a SELL
 *      stop; a short by a BUY stop. A stop on the SAME side as the position is
 *      an ADD — it increases exposure when it triggers. Netting it as coverage
 *      would be precisely backwards, so side is checked rather than assumed
 *      from the presence of a stop.
 *
 * ── What this does not promise ───────────────────────────────────────────────
 *
 * `BROKER-WORKING` here means the paper venue is holding a working order, and
 * the owner's own docstring is already explicit that even that grade "is a
 * statement of fact, not a safety promise — the stop can still gap". That
 * disclaimer does real work for `stop-limit`, which can gap THROUGH its limit
 * and not fill at all. Such an order is genuinely working, so it is genuinely
 * counted; the grade is a report on order state, never a prediction of fill.
 *
 * Environment is not laundered. This reads the paper book and nothing else; a
 * surface rendering it is responsible for saying which book it is (§environment
 * firewall). This file never claims a live broker acknowledged anything.
 *
 * PURE — no React, no I/O, no clock.
 */

import {
  isTerminalOrderStatus,
  type Order,
  type Position,
} from "../paperTrade";
import {
  selectProtectionState,
  type ProtectionState,
} from "../protectionState";

/** Order types that can protect an open position. A `limit` is a target. */
const PROTECTIVE_TYPES: ReadonlySet<Order["type"]> = new Set(["stop", "stop-limit"]);

export interface PaperProtectionInput {
  /** The position being graded. Null/absent means there is nothing to protect. */
  readonly position: Position | null | undefined;
  /** Every order in the book. Filtered here by symbol, side, type and status. */
  readonly orders: readonly Order[];
  /**
   * True when the stored book could not be read this cycle (integrity
   * `unreadable`, or rejected records pending recovery). Forwarded to the owner
   * as `brokerStateUnverified`, which outranks every optimistic grade — an
   * unreadable book must not be allowed to render `BROKER-WORKING` off a
   * position list it could not fully parse.
   */
  readonly bookUnverified?: boolean;
  /**
   * True when WM is actively supervising and able to send a protective order.
   * Defaults to FALSE. There is no supervisor process on the paper route today,
   * and defaulting this true would print `WM-SUPERVISED` — a claim that
   * something is watching — on a surface where nothing is.
   */
  readonly wmSupervising?: boolean;
}

/**
 * True when `order` is working protection for `position`.
 *
 * Exported for the guard test: the three conditions are the whole safety
 * argument of this module and are asserted directly, not only through the grade.
 */
export function isProtectiveOrder(order: Order, position: Position): boolean {
  if (order.symbol !== position.symbol) return false;
  if (!PROTECTIVE_TYPES.has(order.type)) return false;
  if (isTerminalOrderStatus(order.status)) return false;
  // Closing side only. A long is closed by a sell; a short by a buy.
  const closingSide: Order["side"] = position.qty > 0 ? "sell" : "buy";
  return order.side === closingSide;
}

/**
 * Grade the protection on one paper position.
 *
 * Returns the canonical `ProtectionState` — the §7 sentence, the counts, and a
 * grade drawn only from the owner's vocabulary.
 */
export function selectPaperProtection(input: PaperProtectionInput): ProtectionState {
  const { position, orders, bookUnverified, wmSupervising } = input;

  // No position is not an error and not an absence of knowledge — it is FLAT,
  // and the owner already renders that. Passing zero keeps one code path.
  if (!position || !Number.isFinite(position.qty) || position.qty === 0) {
    return selectProtectionState({ filledQty: 0, brokerAckedProtectedQty: 0 });
  }

  const coveredQty = orders.reduce((sum, order) => {
    if (!isProtectiveOrder(order, position)) return sum;
    const q = Math.abs(Number(order.qty) || 0);
    return sum + (Number.isFinite(q) ? q : 0);
  }, 0);

  // The owner clamps protected-to-filled itself (§14.3) and is the only place
  // that clamp should live, so over-coverage is handed over rather than hidden
  // here — two clamps in two files is how they drift apart.
  return selectProtectionState({
    filledQty: Math.abs(position.qty),
    brokerAckedProtectedQty: coveredQty,
    wmSupervising: wmSupervising === true,
    brokerStateUnverified: bookUnverified === true,
  });
}

export default selectPaperProtection;
