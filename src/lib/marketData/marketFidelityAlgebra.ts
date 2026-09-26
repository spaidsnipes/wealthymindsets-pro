/**
 * THE FIDELITY ALGEBRA — what a surface is ALLOWED to do, given what the house
 * actually knows.
 *
 * Source: SUPPORT — Truth Resolver Fidelity + MarketObject Attachments
 * (2026-09-18), §1. The canon states the algebra in five lines:
 *
 *     paint?     fidelity ∈ {INDICATIVE, EXECUTABLE, PARTIAL, DEGRADED}
 *     intent?    fidelity == EXECUTABLE AND broker ≠ UNVERIFIED
 *     GO?        intent allowed AND gates not in debt AND Available R known
 *     WAIT?      always legal
 *
 * Four lines of prose that, left as prose, every surface re-derives slightly
 * differently — which is the shape of every defect this house keeps finding.
 * So they are a function, once, here.
 *
 * ── WHY THIS IS NOT canonicalFidelityLabels ──────────────────────────────────
 *
 * It is not a second copy and it is not a rename. They answer different
 * questions and the canon separates them explicitly:
 *
 *   canonicalFidelityLabels  — the PIPELINE's sentence about a capability.
 *                              "DELAYED BY ENTITLEMENT", "STALE PIPELINE".
 *                              Seven labels. Provider-facing.
 *   marketFidelityAlgebra    — the RESOLVER's sentence about a BAR, and what
 *                              that sentence permits. Five values. Trader-facing.
 *
 * The canon is emphatic that the seven must not be promoted to peer badges:
 * "Reasons belong in SHOW RAW. They do not earn a sixth plaque." So the seven
 * map INTO the five, carrying their reason with them — `fidelityFromPipelineLabel`
 * below is that door, and it is the only one.
 *
 * ── THE LIE THIS EXISTS TO STOP ──────────────────────────────────────────────
 *
 * "An EXECUTABLE badge on a canvas the adapter does not own is a lie."
 *
 * That sentence is on the automatic-reject list in SUPPORT — Last Mile (§2).
 * It is a lie of COMPOSITION: the market domain and the broker domain are each
 * telling the truth, and the flattening of the two into one badge is the
 * falsehood. So the three domains are three parameters here and there is no
 * function in this module that reduces them to a single label. There must not
 * ever be one.
 *
 * ── FALSE_RIPENESS ───────────────────────────────────────────────────────────
 *
 * "STALE + pretty Clarity is FALSE_RIPENESS. Dim it."
 *
 * The house has already been caught by this once (ff40d5f — /api/market stamped
 * a 12h-old close as now). A STALE bar that paints at full strength is a nothing
 * drawn as a something, which is H1 in the place a trader reads fastest. STALE
 * therefore does not merely fail `canCompileIntent`; it changes the TREATMENT,
 * and `paintTreatment` is the owner of that so no surface has to remember.
 *
 * ── "FIDELITY WITHOUT asOf IS A MOOD" ────────────────────────────────────────
 *
 * The canon's phrase, and it is load-bearing rather than decorative. A fidelity
 * is a claim about a moment; without the moment it is a vibe with a typeface.
 * `readMarketFidelity` refuses to build a reading that has no asOf — it returns
 * null rather than defaulting, because a default asOf is precisely the invented
 * timestamp that ff40d5f was.
 */

import type { EvidenceDebtLedger } from "../experience/selectEvidenceDebtLedger";
import {
  CANONICAL_FIDELITY_LABELS,
  type CanonicalFidelityLabel,
} from "./canonicalFidelityLabels";

/* ── THE CLOSED FIVE ───────────────────────────────────────────────────────── */

/**
 * The market domain's whole vocabulary. Five, closed, and the canon names the
 * closure as the point: "A closed algebra helps. An open zoo does not."
 *
 * A sixth value is not a small change. It is the fidelity-soup failure mode the
 * canon rejects by name — "12 badges, trader needs a legend" — and Hick's law
 * has already lost by the time a plaque needs one.
 */
export const MARKET_FIDELITIES = {
  /** Lawful observation, not broker-backed. Paint Clarity, objects, flow. */
  INDICATIVE: "INDICATIVE",
  /** This surface's price is the one the adapter will use. */
  EXECUTABLE: "EXECUTABLE",
  /** Bar exists; some attachments missing. Paint owned parts, debt on the rest. */
  PARTIAL: "PARTIAL",
  /** Admitted with a known wound. Paint with the wound visible. */
  DEGRADED: "DEGRADED",
  /** asOf too old for the job. Freeze or dim; no new GO. */
  STALE: "STALE",
} as const;

export type MarketFidelity = (typeof MARKET_FIDELITIES)[keyof typeof MARKET_FIDELITIES];

export const ALL_MARKET_FIDELITIES: readonly MarketFidelity[] = Object.freeze(
  Object.values(MARKET_FIDELITIES) as MarketFidelity[],
);

/**
 * REASONS, which are not fidelities.
 *
 * The canon's exact instruction: "Do not promote these to peer badges. Keep
 * them as reasons under DEGRADED / PARTIAL / STALE, inspectable, not chrome."
 *
 * They live in the type system so a reason cannot be passed where a fidelity is
 * expected — the promotion the canon forbids becomes a compile error rather
 * than a code review someone has to win.
 */
export const FIDELITY_REASONS = {
  /** Never admitted. There is no candle — this is not a dim candle. */
  QUARANTINED: "QUARANTINED",
  /** Vendors disagreed; the Resolver picked one. */
  CONFLICT: "CONFLICT",
  SYNTHETIC: "SYNTHETIC",
  AGGREGATE: "AGGREGATE",
  DELAYED: "DELAYED",
  /** A special asOf, and deliberately NOT a live fidelity. */
  REPLAY_FROZEN: "REPLAY_FROZEN",
  UNSUPPORTED: "UNSUPPORTED",
  /** The provider refused: auth, entitlement, policy. A wall, not a stale tick. */
  REFUSED: "REFUSED",
  /**
   * IEX only · one exchange's prints, not the consolidated tape. Real and
   * current, and not the market: price and volume can differ from the full
   * tape, most in pre/post-market. Added 2026-09-26 because the Alpaca IEX
   * path folded to DEGRADED beside "No reason recorded against this reading."
   */
  PARTIAL_TAPE: "PARTIAL_TAPE",
} as const;

export type FidelityReason = (typeof FIDELITY_REASONS)[keyof typeof FIDELITY_REASONS];

/* ── THE OTHER TWO DOMAINS ─────────────────────────────────────────────────── */

/**
 * The broker's own sentence. It reports capability and capital, and the canon
 * forbids it one thing: "must not paint candles."
 */
export type BrokerHonesty = "CAPABLE" | "ACK" | "REJECT" | "FILL" | "UNVERIFIED";

/**
 * The teaching domain. Forbidden one thing: "must not mint a thesis."
 * Carried here so the three domains are visibly three, and never quietly two.
 */
export type ExplanationHonesty = "EXPLAINS" | "SCAFFOLD" | "SILENT";

/* ── A READING ─────────────────────────────────────────────────────────────── */

export interface MarketFidelityReading {
  readonly fidelity: MarketFidelity;
  /** Mandatory. The canon: "Fidelity without asOf is a mood." */
  readonly asOf: number;
  /** Inspectable under SHOW RAW. Never chrome, never a badge. */
  readonly reasons: readonly FidelityReason[];
}

/**
 * The only constructor. Refuses rather than defaults.
 *
 * A caller with no asOf has not observed a fidelity — it has an opinion about
 * one — and the correct rendering of that is nothing at all. Defaulting to
 * `Date.now()` here is the exact move that stamped a 12-hour-old close as now.
 */
export function readMarketFidelity(
  fidelity: MarketFidelity,
  asOf: number | null | undefined,
  reasons: readonly FidelityReason[] = [],
): MarketFidelityReading | null {
  if (typeof asOf !== "number" || !Number.isFinite(asOf)) return null;
  return { fidelity, asOf, reasons: Object.freeze([...reasons]) };
}

/* ── THE ALGEBRA ───────────────────────────────────────────────────────────── */

/**
 * `paint? fidelity ∈ {INDICATIVE, EXECUTABLE, PARTIAL, DEGRADED}`
 *
 * STALE is the one excluded, and note what that means: a stale bar is still
 * DRAWN — `paintTreatment` returns DIM, not nothing. "Freeze or dim" is the
 * canon's wording. What STALE loses is the right to paint as if it were now.
 */
export function canPaint(reading: MarketFidelityReading | null | undefined): boolean {
  if (!reading) return false;
  return reading.fidelity !== MARKET_FIDELITIES.STALE;
}

export type PaintTreatment = "FULL" | "WOUNDED" | "DIM" | "NONE";

/**
 * How the canvas is allowed to carry it — the treatment, owned once.
 *
 * WOUNDED is not a colour and not an alarm. §9 governs here as everywhere: the
 * wound is VISIBLE, which is a different instruction from the wound is RED.
 * A surface renders WOUNDED by showing what is missing, not by going loud about
 * it, because nothing has failed — the house declined to guess.
 */
export function paintTreatment(
  reading: MarketFidelityReading | null | undefined,
): PaintTreatment {
  if (!reading) return "NONE";
  switch (reading.fidelity) {
    case MARKET_FIDELITIES.STALE:
      return "DIM";
    case MARKET_FIDELITIES.PARTIAL:
    case MARKET_FIDELITIES.DEGRADED:
      return "WOUNDED";
    case MARKET_FIDELITIES.INDICATIVE:
    case MARKET_FIDELITIES.EXECUTABLE:
      return "FULL";
  }
}

/**
 * `intent? fidelity == EXECUTABLE AND broker ≠ UNVERIFIED`
 *
 * Both halves, and this is the whole reason the module exists. A live
 * INDICATIVE chart beside an UNVERIFIED broker is HONEST and common; it simply
 * may not compile an intent. Surfaces that check only one half are how the
 * forbidden badge gets drawn.
 */
export function canCompileIntent(
  reading: MarketFidelityReading | null | undefined,
  broker: BrokerHonesty | null | undefined,
): boolean {
  if (!reading) return false;
  if (reading.fidelity !== MARKET_FIDELITIES.EXECUTABLE) return false;
  if (broker == null) return false;
  return broker !== "UNVERIFIED";
}

export interface GoInputs {
  readonly reading: MarketFidelityReading | null | undefined;
  readonly broker: BrokerHonesty | null | undefined;
  /** Null means no ledger was computed — which is not the same as no debt. */
  readonly debt: Pick<EvidenceDebtLedger, "unpaid"> | null | undefined;
  /** Planned 1R. Unknown R is not zero R. */
  readonly availableR: number | null | undefined;
}

/**
 * `GO? intent allowed AND gates not in debt AND Available R known`
 *
 * The canon's guard rail, stated twice because it is the one that gets lost:
 * "Fidelity never overrides Evidence Debt." An EXECUTABLE bar and a CAPABLE
 * broker do not buy their way past an unanswered gate.
 *
 * A NULL ledger refuses too. "We did not compute the debt" and "there is no
 * debt" are the two states H1 is about, and reading the first as the second is
 * how a GO gets issued on an unasked question.
 */
export function canGo(inputs: GoInputs): boolean {
  if (!canCompileIntent(inputs.reading, inputs.broker)) return false;
  if (inputs.debt == null) return false;
  if (inputs.debt.unpaid > 0) return false;
  if (typeof inputs.availableR !== "number" || !Number.isFinite(inputs.availableR)) return false;
  return true;
}

/**
 * `WAIT? always legal`
 *
 * A constant, and deliberately a function so that it reads as the fourth line
 * of the same algebra rather than as a fact about the codebase. There is no
 * state of the market, the broker or the ledger in which the house may refuse
 * a trader the right to wait — and a WAIT arrived at with full information is
 * a FINISHED state, not an incomplete GO.
 */
export function canWait(): true {
  return true;
}

/* ── EXECUTION OWNERSHIP — THE INPUT EXECUTABLE WAS MISSING ────────────────── */

/**
 * What the caller KNOWS about execution for the price on its canvas.
 *
 * Found on /charts 2026-09-26 (audit at 3ff5cd7): the door below mapped
 * LIVE — CERTIFIED QUOTE to EXECUTABLE with no other argument, so the Honesty
 * Plaque printed EXECUTABLE over any fresh crypto tape — while the Webull live
 * place path (`submitWebullOrderOnce`) had zero production callers and
 * `liveOrdersEnabled` was never true anywhere. A fresh quote is a MARKET fact.
 * "The adapter will route at this price" is an EXECUTION fact, and the header
 * of this file already names the flattening of the two as the lie. The door
 * could not tell them apart because execution was not in its argument list.
 *
 * Garden 16 §13: CONNECTED / ENTITLED / FRESH / AUTHORIZED / EXECUTABLE /
 * RECOVERABLE stay separate. FRESH is what the pipeline label proves; this
 * object is the only way EXECUTABLE enters.
 */
export interface ExecutionOwnership {
  /**
   * True ONLY when an execution adapter owned by this surface will route an
   * order at the price this canvas shows. A connected broker is not this; a
   * preview endpoint is not this; a configured key is not this.
   */
  readonly adapterOwnsCanvasPrice: boolean;
}

/**
 * What the caller knows about the TAPE behind the price. `partial: true` means
 * one venue's prints (e.g. IEX), not the consolidated tape. `null` means not
 * established and adds no reason — absence is never promoted to a wound.
 */
export interface TapeScope {
  readonly partial: boolean;
}

/* ── THE ONE DOOR FROM THE PIPELINE VOCABULARY ─────────────────────────────── */

/**
 * The seven pipeline labels, folded into the five with their reason preserved.
 *
 * This is the only sanctioned crossing. Without it every surface invents its
 * own mapping, the seven become de-facto badges, and the canon's "they do not
 * earn a sixth plaque" is lost to drift rather than to a decision.
 *
 * SESSION_CLOSED_LAST_VERIFIED is the interesting one. It is NOT stale: the
 * canon is explicit that "closed is not delayed", and a closed session showing
 * its last verified picture is a correct reading of a market that is not
 * trading. It is INDICATIVE with no wound.
 *
 * `execution` is REQUIRED so no caller can reach EXECUTABLE by forgetting to
 * say what it knows, and `null` is the honest value for "not established".
 * Anything but an explicit `adapterOwnsCanvasPrice: true` folds a certified
 * live quote into INDICATIVE — the strongest non-executable fidelity, which
 * still paints FULL: the quote is sound, it is simply not an order price.
 */
export function fidelityFromPipelineLabel(
  label: CanonicalFidelityLabel,
  execution: ExecutionOwnership | null,
  tape: TapeScope | null = null,
): { readonly fidelity: MarketFidelity; readonly reasons: readonly FidelityReason[] } {
  switch (label) {
    case CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE:
      // `=== true`, not truthiness: a JS caller handing `undefined` or a
      // stringly "false" must land on the refusal, never on EXECUTABLE.
      return execution?.adapterOwnsCanvasPrice === true
        ? { fidelity: MARKET_FIDELITIES.EXECUTABLE, reasons: [] }
        : { fidelity: MARKET_FIDELITIES.INDICATIVE, reasons: [] };

    case CANONICAL_FIDELITY_LABELS.SESSION_CLOSED_LAST_VERIFIED:
      // Closed is not delayed, and it is not stale either.
      return { fidelity: MARKET_FIDELITIES.INDICATIVE, reasons: [] };

    case CANONICAL_FIDELITY_LABELS.HISTORICAL_BARS_VERIFIED:
      // The bar is sound; a richer capability is absent. That is PARTIAL by
      // definition — and the canon forbids stamping the symbol as a whole.
      return { fidelity: MARKET_FIDELITIES.PARTIAL, reasons: [] };

    case CANONICAL_FIDELITY_LABELS.DELAYED_BY_ENTITLEMENT:
      // Delayed by CONTRACT, not by pipeline failure — a wound the house knows
      // the shape of, which is exactly DEGRADED rather than STALE.
      return { fidelity: MARKET_FIDELITIES.DEGRADED, reasons: [FIDELITY_REASONS.DELAYED] };

    case CANONICAL_FIDELITY_LABELS.STALE_PIPELINE:
      return { fidelity: MARKET_FIDELITIES.STALE, reasons: [] };

    case CANONICAL_FIDELITY_LABELS.ACTIVE_DEGRADED:
      // ACTIVE DEGRADED is shared by several wounds (a delayed consolidated
      // quote, an uncertified broker feed, the IEX relay), so the label alone
      // cannot name the reason. Only a caller that KNOWS the tape is partial
      // may say so; `=== true` so a JS caller's junk never invents one.
      return {
        fidelity: MARKET_FIDELITIES.DEGRADED,
        reasons: tape?.partial === true ? [FIDELITY_REASONS.PARTIAL_TAPE] : [],
      };

    case CANONICAL_FIDELITY_LABELS.BLOCKED_BY_ENTITLEMENT:
      // A wall. Nothing was admitted, so there is nothing to paint — and
      // QUARANTINED is the reason that says so rather than a dimmed candle.
      return {
        fidelity: MARKET_FIDELITIES.STALE,
        reasons: [FIDELITY_REASONS.REFUSED, FIDELITY_REASONS.QUARANTINED],
      };
  }
}
