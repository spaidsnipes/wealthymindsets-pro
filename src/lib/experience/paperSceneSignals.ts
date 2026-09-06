/**
 * paperSceneSignals — the first adapter that gives `compileScene` a REAL
 * capital column.
 *
 * ── The gap this closes ──────────────────────────────────────────────────────
 *
 * `compileScene` (BUILD ORDER §10) can name ten scenes. Until this file, WM Pro
 * could reach four of them. `deckSceneSignals` — the only adapter that existed —
 * hard-codes the entire capital column to its UNOBSERVED shape, and says so
 * honestly in its own doc:
 *
 *     "When a broker-aware surface adopts the compiler it must supply those
 *      from `selectPositionTruth` and the execution owner — NOT by relaxing the
 *      constants below."
 *
 * So MANAGE, PENDING, DEGRADED, RECEIPT and DONE-after-a-trade were unreachable
 * in the running product. Not withheld — unreachable. The compiler's most
 * important branches, the ones that exist precisely because money is exposed,
 * had never rendered for a human. A scene compiler that can only ever compile
 * the quiet scenes is a scene compiler in name.
 *
 * This adapter supplies that column from the paper ledger, which is a real
 * observed book: `/paper` holds positions, working orders and a persistence
 * disposition that a human's actions actually move.
 *
 * ── Why the paper ledger is allowed to be an authority ───────────────────────
 *
 * §B5 ENVIRONMENT FIREWALL: `Decision.environment` is immutable and PAPER is one
 * of the three. Paper capital is not pretend capital-truth; it is the true book
 * OF THE PAPER ENVIRONMENT. Reading it and reporting what it says is not
 * fabrication. What WOULD be fabrication is letting a PAPER book answer a
 * question about LIVE money, so the caller owns the environment label and this
 * module never claims one.
 *
 * The report is filed at `RANK_RECONCILIATION` because within the paper
 * environment the ledger IS the broker's book — there is no higher source that
 * a client snapshot could be outranked by. Filing it at `RANK_CLIENT` would be
 * the false modesty version of the same lie: it would leave the position
 * permanently outrankable by a source that does not exist.
 *
 * ── What this module refuses to invent ───────────────────────────────────────
 *
 * `hadCapitalEvent` and `receiptWritten` are reported `false`, and that is a
 * claim, not a shrug: the paper ledger has no DECISION_ID and therefore no
 * per-decision episode boundary (§B1), and `/paper` writes no §5-STEP-10
 * receipt. So "no receipt has been written" is TRUE, and "a capital event
 * occurred on THIS decision" cannot be established at all.
 *
 * Reporting `hadCapitalEvent: true` from the lifetime trade list would be the
 * tempting move and it is wrong twice: it would make RECEIPT permanent for any
 * symbol ever traded (a receipt owed forever, for no identifiable decision), and
 * it would let a lifetime fact masquerade as an episode fact. RECEIPT and
 * receipt-earned DONE therefore remain UNREACHABLE from paper, and that stays
 * true until a decision episode owner exists. Named here so it cannot be
 * mistaken for a bug later.
 *
 * PURE — no React, no I/O, no clock, no storage. `now` is injected.
 */

import {
  RANK_RECONCILIATION,
  selectPositionTruth,
  type PositionLabel,
  type PositionConfidence,
} from "../positionTruth";
import type { RightOfWay } from "../marketData/viewModels/decisionPermissionCompiler";
import type { SceneSignals } from "./compileScene";
import {
  SIGNAL_GROUPS,
  rightOfWayFrom,
  sessionOpenFrom,
  type DeckSceneSignals,
  type SignalGroup,
  type SignalProvenance,
} from "./deckSceneSignals";

/**
 * Neutral name for the projection shape every scene adapter returns.
 *
 * Structurally identical to `DeckSceneSignals` on purpose: `SceneAdmissionPanel`
 * takes provenance + counts, and a second shape would mean a second panel and a
 * second definition of "observed" (§24 — no seventh owner).
 */
export type SceneSignalProjection = DeckSceneSignals;

/** The name the ledger reports under. Shown as the position authority. */
export const PAPER_LEDGER_SOURCE = "paper-ledger";

/**
 * The paper ledger's own answer about whether its last write survived.
 *
 * This is the LINK signal for the paper environment and it has a real producer:
 * `savePaperState` returns PERSISTED / CONFLICT / FAILED, and `/paper` already
 * tracks the result. CONFLICT means another tab wrote a newer revision, i.e.
 * this client's view may be superseded — §14.4 is the whole reason that matters.
 */
export type PaperPersistenceDisposition =
  | "PERSISTED"
  | "CONFLICT"
  | "FAILED"
  /** Nothing has been written yet this session, so nothing is proven either way. */
  | "UNKNOWN";

/** The minimum a caller must show us. Structural, so `/paper`'s local types fit. */
export interface PaperPositionView {
  readonly symbol: string;
  /** Signed net quantity. Negative is short. */
  readonly qty: number;
}

export interface PaperOrderView {
  readonly symbol: string;
  readonly side: "buy" | "sell";
  readonly status: "pending" | "filled" | "cancelled" | "rejected";
}

export interface PaperLedgerView {
  /**
   * Has the ledger actually been read yet? Before hydration there is no
   * observation, and an empty positions array is NOT evidence of flatness
   * (§14.1 — FLAT is a finding, never a default). This flag is what keeps the
   * initial `useState([])` from compiling to DONE.
   */
  readonly hydrated: boolean;
  readonly persistence: PaperPersistenceDisposition;
  readonly positions: readonly PaperPositionView[];
  readonly orders: readonly PaperOrderView[];
}

export interface PaperSceneInput {
  /** PRESENTED session token — see `DeckSceneInput.session`, same rules. */
  readonly session: string | null | undefined;
  readonly rightOfWay: RightOfWay | null | undefined;
  /**
   * The one symbol the room is about (§H8 ONE SYMBOL FOCUS). The scene is a
   * statement about a room, and a room is about one underlying; summing a
   * multi-symbol book into one LONG/SHORT label would be a number no trader
   * holds. `null` means no symbol is in focus, which makes the capital column
   * unobservable rather than flat.
   */
  readonly symbol: string | null | undefined;
  readonly ledger: PaperLedgerView | null | undefined;
  /** Injected clock, used as the observation time of the ledger read. */
  readonly now: number;
  /** The human has the order ticket open and is composing an intent. */
  readonly composingIntent?: boolean;
}

function sameSymbol(a: string, b: string): boolean {
  return a.trim().toUpperCase() === b.trim().toUpperCase();
}

/** Net signed quantity the ledger holds in `symbol`. */
export function netQtyFor(
  positions: readonly PaperPositionView[],
  symbol: string,
): number {
  let net = 0;
  for (const p of positions) {
    if (!p || typeof p.symbol !== "string") continue;
    if (!sameSymbol(p.symbol, symbol)) continue;
    const qty = Number(p.qty);
    if (!Number.isFinite(qty)) continue;
    net += qty;
  }
  return net;
}

/**
 * Count working orders that could INCREASE exposure in `symbol` (§B14).
 *
 * Direction matters and getting it backwards is the exact §21 failure: a
 * pending SELL against a long position REDUCES risk, and counting it as
 * exposure-increasing would hold the screen in PENDING/"NOT DONE" while the
 * trader was actually closing out. So:
 *
 *   net > 0 (long)  — buys add, sells reduce
 *   net < 0 (short) — sells add, buys reduce
 *   net = 0 (flat)  — either side OPENS exposure, so both count
 *
 * Only `pending` counts. `filled`, `cancelled` and `rejected` are terminal
 * (`TERMINAL_ORDER_STATUSES`) and cannot reopen anything.
 */
export function isExposureIncreasingOrder(
  order: PaperOrderView | null | undefined,
  symbol: string,
  net: number,
): boolean {
  if (!order || typeof order.symbol !== "string") return false;
  if (order.status !== "pending") return false;
  if (!sameSymbol(order.symbol, symbol)) return false;
  if (net > 0 && order.side !== "buy") return false;
  if (net < 0 && order.side !== "sell") return false;
  return true;
}

/**
 * The COUNT of those orders — the number `compileScene` reads.
 *
 * Deliberately a thin wrapper over the predicate rather than a second walk of
 * the same rules. §B14 draws a line between CANCEL EXPOSURE-INCREASING ORDERS
 * and FLATTEN POSITION, which means a surface offering the cancel control must
 * select exactly the orders this count is counting. Two implementations of
 * "exposure-increasing" would let the banner say 2 while the button cancelled 1
 * — a screen that states a risk and then does not act on it.
 */
export function exposureIncreasingWorkingOrders(
  orders: readonly PaperOrderView[],
  symbol: string,
  net: number,
): number {
  let count = 0;
  for (const o of orders) {
    if (isExposureIncreasingOrder(o, symbol, net)) count++;
  }
  return count;
}

/**
 * Map the ledger's persistence disposition to the compiler's link tri-state.
 *
 * CONFLICT and FAILED both compile to `false` — "not verified" — and that is
 * deliberate. §9: a failure may reduce capability, it may not increase
 * certainty. A ledger that could not be written, or that lost a revision race
 * with another tab, cannot prove what the book holds; if a position is open at
 * that moment the scene must fall to DEGRADED rather than keep narrating
 * MANAGE from a view that may already be superseded.
 */
export function linkVerifiedFrom(
  disposition: PaperPersistenceDisposition,
): boolean | null {
  if (disposition === "PERSISTED") return true;
  if (disposition === "CONFLICT" || disposition === "FAILED") return false;
  return null;
}

/**
 * Compile the scene signals `/paper` can honestly support.
 *
 * The capital column is OBSERVED here — the first place in WM Pro where that is
 * true — and every field still routes through a canonical owner:
 * `selectPositionTruth` for the label and confidence, the ledger's own orders
 * for working exposure, the ledger's own persistence result for the link.
 */
export function paperSceneSignals(input: PaperSceneInput): SceneSignalProjection {
  const sessionOpen = sessionOpenFrom(input.session);
  const rightOfWay = rightOfWayFrom(input.rightOfWay);

  const symbol = typeof input.symbol === "string" && input.symbol.trim()
    ? input.symbol.trim()
    : null;
  const ledger = input.ledger ?? null;
  // A ledger that has not hydrated has not been read. Its empty arrays are the
  // absence of an observation, not the observation of an absence.
  const readable = ledger !== null && ledger.hydrated === true && symbol !== null;

  const net = readable ? netQtyFor(ledger.positions, symbol) : 0;

  const truth = selectPositionTruth({
    reports: readable
      ? [{
          source: PAPER_LEDGER_SOURCE,
          qty: net,
          observedAt: input.now,
          // Within PAPER, the ledger IS the book. See the file doc.
          rank: RANK_RECONCILIATION,
        }]
      : [],
    unobservedSources: readable ? [] : [PAPER_LEDGER_SOURCE],
    now: input.now,
  });

  const working = readable
    ? exposureIncreasingWorkingOrders(ledger.orders, symbol, net)
    : 0;

  const linkVerified = readable ? linkVerifiedFrom(ledger.persistence) : null;

  const signals: SceneSignals = {
    position: truth.label satisfies PositionLabel,
    positionConfidence: truth.confidence satisfies PositionConfidence,
    // Paper fills resolve in-process; there is no broker round-trip that could
    // leave an intent unanswered. Working limit/stop orders are reported as
    // working exposure above, which is what they actually are.
    intentInFlight: false,
    exposureIncreasingWorkingOrders: working,
    linkVerified,
    composingIntent: input.composingIntent === true,
    // See the file doc: no DECISION_ID means no episode, and no episode means
    // neither of these can be established. Never derive them from lifetime
    // trades.
    hadCapitalEvent: false,
    receiptWritten: false,
    sessionOpen,
    rightOfWay,
  };

  const provenance: Record<SignalGroup, SignalProvenance> = {
    SESSION: sessionOpen === null ? "UNOBSERVED" : "OBSERVED",
    DECISION: rightOfWay === null ? "UNOBSERVED" : "OBSERVED",
    POSITION: readable ? "OBSERVED" : "UNOBSERVED",
    ORDERS: readable ? "OBSERVED" : "UNOBSERVED",
    LINK: linkVerified === null ? "UNOBSERVED" : "OBSERVED",
  };

  let observedCount = 0;
  for (const group of SIGNAL_GROUPS) {
    if (provenance[group] === "OBSERVED") observedCount++;
  }

  return {
    signals,
    provenance,
    observedCount,
    totalCount: SIGNAL_GROUPS.length,
  };
}

export default paperSceneSignals;
