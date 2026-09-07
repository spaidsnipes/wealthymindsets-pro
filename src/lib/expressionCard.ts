/**
 * selectExpressionCard — BUILD ORDER §2/§3, the ATTACHED EXPRESSION OBJECT.
 *
 * Founding command: "MAKE UNDERLYING TRUTH AND DERIVATIVE EXECUTION FEEL LIKE
 * ONE CONTINUOUS DECISION."
 *
 * Today they are two worlds. Options live only on /paper; the underlying thesis
 * lives only on /charts; and /paper carries no structural invalidation or R at
 * all. The trader reconciles them in his head, in seconds, while a short-dated
 * contract moves. That is the translation burden this composes away.
 *
 * This is NOT a new engine or store (§6/§15). It joins owners that already
 * exist:
 *   riskKernel            → underlying thesis geometry, planned 1R
 *   selectResponseEnvelope→ honest premium band at the invalidation level
 *   selectProtectionState → protection grade + uncovered quantity
 *
 * Canon distinctions this refuses to blur:
 *   CONTRACT RETURN % != R              — separate fields, never merged
 *   CAPITAL DEPLOYED != PLANNED LOSS    — separate fields
 *   MID != guaranteed fill              — every price carries its role
 *   MODEL PRICE != FUTURE PRICE         — the envelope is a range, or UNKNOWN
 *
 * §21: "LONG OPTION EXIT REFERENCE = BID for conservative sell-now reference."
 * A long position's sell-now value uses the BID, and the role is stated.
 *
 * H4 — STOCK SESSION IS NOT OPTION SESSION. A quote having a role does not
 * make it actionable. The underlying can be printing in EXTENDED while the
 * contract's own market is shut, and a BID carried over from the close is a
 * memory, not an offer. Canon: "If optionTradableNow is NO: do not pretend
 * GET ME IN NOW is available. Say OPTION SESSION CLOSED or OPTION NOT
 * TRADABLE NOW." So the card now answers two separate questions —
 * WHAT IS IT WORTH (premium + role) and CAN I ACT (tradability) — and never
 * lets the first imply the second.
 *
 * PURE — no I/O, no clock.
 */

import { selectResponseEnvelope, type ResponseEnvelope } from "./responseEnvelope";
import { selectProtectionState, type ProtectionState } from "./protectionState";
import type { CanonicalSession } from "./marketData/canonicalIdentity";
import {
  selectOptionTradability,
  type OptionTradabilityVerdict,
} from "./marketData/optionTradability";

/** BUILD ORDER §7 quote roles. Any tradable number must name its role. */
export type QuoteRole = "LAST" | "BID" | "ASK" | "MID" | "LOCKED AT CLICK" | "MODELED" | "UNKNOWN";


export interface ExpressionCardInput {
  readonly underlyingSymbol: string;
  readonly contractLabel: string;
  readonly isCall: boolean;
  readonly strike: number;
  readonly expiryMs: number;
  readonly nowMs: number;

  readonly qtyRequested: number;
  readonly qtyFilled: number;
  readonly brokerAckedProtectedQty?: number;
  readonly brokerStateUnverified?: boolean;

  /** Premium paid per contract at entry. */
  readonly entryPremium: number;
  /** Current bid/ask if a real chain is available. */
  readonly bid?: number | null;
  readonly ask?: number | null;
  /** Modeled premium, used ONLY when no real quote exists. */
  readonly modeledPremium?: number | null;

  /** Underlying thesis geometry — the canonical owner's numbers. */
  readonly underlyingEntry: number;
  readonly underlyingInvalidation: number;
  /** Planned dollar loss defining 1R. Never derived from a desired R. */
  readonly plannedRDollars?: number | null;

  readonly iv?: number | null;
  readonly ivSource?: string;
  readonly contractMultiplier?: number;

  /**
   * H4 sessions. Both OPTIONAL, and both default to UNKNOWN — which resolves
   * to optionTradableNow: "UNKNOWN" and suppresses the sell-now claim.
   *
   * The optional-argument shape is the same one that let the CLOSED/DELAYED
   * defect survive a repair pass on /charts, so the polarity here is chosen
   * deliberately: dropping the argument fails CLOSED. A caller who forgets to
   * pass a session loses a capability; it cannot gain a permission.
   */
  readonly underlyingSession?: CanonicalSession | null;
  readonly optionSession?: CanonicalSession | null;
}

export interface ExpressionCard {
  readonly underlyingSymbol: string;
  readonly contractLabel: string;
  readonly qtyRequested: number;
  readonly qtyFilled: number;
  readonly entryPremium: number;

  /** Current sell-now reference and the role it came from. */
  readonly currentPremium: number | null;
  readonly currentPremiumRole: QuoteRole;

  /** H4 — the contract's own clock, kept separate from the stock's. */
  readonly tradability: OptionTradabilityVerdict;
  /**
   * Whether the trader can act on `currentPremium` RIGHT NOW.
   *
   * This is deliberately a different question from "is there a premium".
   * A number can be perfectly well-sourced and completely unactionable, and
   * conflating the two is how a closed-market screen grows a live-looking
   * exit button. MODELED is never actionable at any hour (H18).
   */
  readonly sellNowAvailable: boolean;

  /** Capital actually deployed (debit). NOT the planned loss. */
  readonly capitalDeployed: number | null;
  /** Planned structural loss defining 1R. NOT the debit. */
  readonly plannedLoss: number | null;

  /** Realized/open R against planned 1R, or null when 1R is undefined. */
  readonly currentR: number | null;
  /** Contract return %, a DIFFERENT measurement from R. */
  readonly contractReturnPct: number | null;

  readonly spreadAbs: number | null;
  readonly spreadPctOfMid: number | null;
  readonly spreadHealth: "TIGHT" | "NORMAL" | "WIDE" | "UNKNOWN";

  readonly protection: ProtectionState;
  /** Honest premium band if the underlying reaches invalidation. */
  readonly atInvalidation: ResponseEnvelope;

  readonly hoursToExpiry: number | null;
  readonly timeFit: "0DTE" | "SHORT" | "NORMAL" | "LONG" | "EXPIRED" | "UNKNOWN";
}

const HOUR_MS = 60 * 60 * 1000;

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function selectExpressionCard(input: ExpressionCardInput): ExpressionCard {
  const multiplier = finite(input.contractMultiplier) ? input.contractMultiplier : 100;

  // §21 — a long option's conservative sell-now reference is the BID. Fall back
  // through ASK/MID only when BID is absent, and never silently: the role is
  // reported alongside the number so no surface can present MID as executable.
  let currentPremium: number | null = null;
  let currentPremiumRole: QuoteRole = "UNKNOWN";
  if (finite(input.bid) && input.bid > 0) {
    currentPremium = input.bid;
    currentPremiumRole = "BID";
  } else if (finite(input.bid) && finite(input.ask) && input.bid >= 0 && input.ask > 0) {
    currentPremium = (input.bid + input.ask) / 2;
    currentPremiumRole = "MID";
  } else if (finite(input.modeledPremium) && input.modeledPremium > 0) {
    currentPremium = input.modeledPremium;
    currentPremiumRole = "MODELED";
  }

  const tradability = selectOptionTradability(input.underlyingSession, input.optionSession);
  // Two independent gates, both required: an open market does not make a
  // modeled number executable, and a real BID does not survive its market
  // closing.
  //
  // Stated as a DENY list, not an allow list. tsc proved an allow list here is
  // partly unreachable today (this selector emits only BID/MID/MODELED/UNKNOWN),
  // and an allow list also fails the wrong way: a QuoteRole added later would
  // silently become unactionable for reasons nobody wrote down. The real
  // invariant is narrower and permanent — MODELED and UNKNOWN are not prices
  // anyone can hit (H18), and every other role is an observed venue quote.
  const roleIsActionable = currentPremiumRole !== "MODELED" && currentPremiumRole !== "UNKNOWN";
  const sellNowAvailable = tradability.optionTradableNow === "YES" && roleIsActionable;

  const qtyFilled = finite(input.qtyFilled) && input.qtyFilled > 0 ? Math.floor(input.qtyFilled) : 0;
  const entryPremium = finite(input.entryPremium) && input.entryPremium >= 0 ? input.entryPremium : 0;

  // CAPITAL DEPLOYED — the debit. Explicitly NOT the planned loss.
  const capitalDeployed = qtyFilled > 0 ? entryPremium * qtyFilled * multiplier : null;
  // PLANNED LOSS — structural. Never inferred from the debit.
  const plannedLoss = finite(input.plannedRDollars) && input.plannedRDollars > 0
    ? input.plannedRDollars
    : null;

  // Open P&L on the position, then R against planned 1R. R is undefined when 1R
  // was not defined pre-entry — it is never back-filled from the debit.
  const openPnl = currentPremium != null && qtyFilled > 0
    ? (currentPremium - entryPremium) * qtyFilled * multiplier
    : null;
  const currentR = openPnl != null && plannedLoss != null ? openPnl / plannedLoss : null;

  // CONTRACT RETURN % — a different measurement from R, kept separate.
  const contractReturnPct = currentPremium != null && entryPremium > 0
    ? ((currentPremium - entryPremium) / entryPremium) * 100
    : null;

  let spreadAbs: number | null = null;
  let spreadPctOfMid: number | null = null;
  let spreadHealth: ExpressionCard["spreadHealth"] = "UNKNOWN";
  if (finite(input.bid) && finite(input.ask) && input.ask > 0 && input.ask >= input.bid) {
    spreadAbs = input.ask - input.bid;
    const mid = (input.ask + input.bid) / 2;
    if (mid > 0) {
      spreadPctOfMid = (spreadAbs / mid) * 100;
      spreadHealth = spreadPctOfMid <= 5 ? "TIGHT" : spreadPctOfMid <= 15 ? "NORMAL" : "WIDE";
    }
  }

  const msToExpiry = finite(input.expiryMs) && finite(input.nowMs) ? input.expiryMs - input.nowMs : null;
  const hoursToExpiry = msToExpiry != null ? msToExpiry / HOUR_MS : null;
  const timeFit: ExpressionCard["timeFit"] =
    hoursToExpiry == null ? "UNKNOWN"
    : hoursToExpiry <= 0 ? "EXPIRED"
    : hoursToExpiry <= 8 ? "0DTE"
    : hoursToExpiry <= 72 ? "SHORT"
    : hoursToExpiry <= 30 * 24 ? "NORMAL"
    : "LONG";

  return {
    underlyingSymbol: input.underlyingSymbol,
    contractLabel: input.contractLabel,
    qtyRequested: finite(input.qtyRequested) ? Math.max(0, Math.floor(input.qtyRequested)) : 0,
    qtyFilled,
    entryPremium,
    currentPremium,
    currentPremiumRole,
    tradability,
    sellNowAvailable,
    capitalDeployed,
    plannedLoss,
    currentR,
    contractReturnPct,
    spreadAbs,
    spreadPctOfMid,
    spreadHealth,
    protection: selectProtectionState({
      filledQty: qtyFilled,
      brokerAckedProtectedQty: input.brokerAckedProtectedQty ?? 0,
      brokerStateUnverified: input.brokerStateUnverified,
    }),
    atInvalidation: selectResponseEnvelope({
      underlyingAtLevel: input.underlyingInvalidation,
      strike: input.strike,
      isCall: input.isCall,
      expiryMs: input.expiryMs,
      evaluateAtMs: input.nowMs,
      iv: finite(input.iv) ? input.iv : Number.NaN,
      ivSource: input.ivSource,
    }),
    hoursToExpiry,
    timeFit,
  };
}
