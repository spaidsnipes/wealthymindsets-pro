/**
 * selectProtectionState — BUILD ORDER Step 7, "PROTECTION IS A STATE, NOT A LINE".
 *
 * Binding canon: "WM Pro — Operating System BUILD ORDER — Natural Language —
 * September 3, 2026". Step 7 verbatim requirements:
 *
 *   Show grade and uncovered quantity.
 *   BROKER-WORKING requires broker ACK of a working order.
 *   WM-SUPERVISED means WM is watching and may send, and that is said in words.
 *   MANUAL-DEGRADED means a human is the protection.
 *   UNPROTECTED means uncovered size exists and is numbered.
 *   POSITION 3 PROTECTED 2 UNPROTECTED 1 is the grammar.
 *   No green badge that means safe.
 *
 * The Reality Baseline recorded that Step 7 had NO owner — riskKernel computes
 * Available R (the DECISION owner), and nothing else modelled protection at all.
 * A position could be open with zero stop coverage and the product had no way to
 * say so.
 *
 * This is the missing owner, not a seventh engine (§15): pure state derivation
 * over facts other owners already hold. It stores nothing and sends nothing.
 *
 * Two §14 invariants are enforced structurally rather than by convention:
 *   §14.2  the UI never says BROKER-WORKING without an ACK
 *   §14.3  protected quantity never exceeds filled quantity
 *
 * PURE — no I/O, no clock, no randomness.
 */

/** Protection vocabulary — BUILD ORDER §7. No synonyms, no "SAFE". */
export type ProtectionGrade =
  /** No position is open. Nothing to protect. */
  | "FLAT"
  /** A protective order is acknowledged working at the broker. */
  | "BROKER-WORKING"
  /** WM is watching and may send. Said in words, never implied. */
  | "WM-SUPERVISED"
  /** A human is the protection. */
  | "MANUAL-DEGRADED"
  /** Uncovered size exists and is numbered. */
  | "UNPROTECTED"
  /** Broker state could not be read; last known shown, certainty not increased. */
  | "UNVERIFIED — LAST KNOWN";

export interface ProtectionInput {
  /** Quantity the broker reports filled. Only reconciliation owns this. */
  readonly filledQty: number;
  /**
   * Quantity covered by protective orders the broker has ACKNOWLEDGED as
   * working. An intent that has not been acknowledged does NOT count here.
   */
  readonly brokerAckedProtectedQty: number;
  /** True when WM is actively supervising and able to send a protective order. */
  readonly wmSupervising?: boolean;
  /** True when broker state could not be read this cycle. */
  readonly brokerStateUnverified?: boolean;
}

export interface ProtectionState {
  readonly grade: ProtectionGrade;
  readonly positionQty: number;
  readonly protectedQty: number;
  readonly uncoveredQty: number;
  /** BUILD ORDER §7 grammar, e.g. "POSITION 3 PROTECTED 2 UNPROTECTED 1". */
  readonly sentence: string;
  /** True only when every filled unit is covered by an ACKed working order. */
  readonly fullyCovered: boolean;
}

function nonNegativeInt(v: number): number {
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.floor(Math.abs(v));
}

export function selectProtectionState(input: ProtectionInput): ProtectionState {
  const positionQty = nonNegativeInt(input.filledQty);

  // §14.3 — protected can never exceed filled. Enforced by clamping rather than
  // trusting the caller: a reconciliation lag that reported more protection than
  // position would otherwise render a negative uncovered count and read as
  // over-covered, which is the reassuring direction and therefore the dangerous
  // one.
  const protectedQty = Math.min(nonNegativeInt(input.brokerAckedProtectedQty), positionQty);
  const uncoveredQty = Math.max(0, positionQty - protectedQty);
  const fullyCovered = positionQty > 0 && uncoveredQty === 0;

  const sentence = positionQty === 0
    ? "FLAT"
    : `POSITION ${positionQty} PROTECTED ${protectedQty} UNPROTECTED ${uncoveredQty}`;

  const base = { positionQty, protectedQty, uncoveredQty, sentence, fullyCovered };

  if (positionQty === 0) return { ...base, grade: "FLAT" };

  // Unverified broker state must not increase certainty (§9 DEGRADED: "Do not
  // increase certainty"). It outranks every optimistic grade below.
  if (input.brokerStateUnverified === true) {
    return { ...base, grade: "UNVERIFIED — LAST KNOWN" };
  }

  // §14.2 — BROKER-WORKING is reachable ONLY from acknowledged coverage, and
  // only when it covers the whole position. Partial coverage is not protection.
  if (fullyCovered) return { ...base, grade: "BROKER-WORKING" };

  // Uncovered size exists from here down. The grade names who is holding it.
  if (input.wmSupervising === true) return { ...base, grade: "WM-SUPERVISED" };

  return { ...base, grade: uncoveredQty === positionQty ? "UNPROTECTED" : "MANUAL-DEGRADED" };
}

/**
 * Grades that must never be rendered as a reassuring/green state.
 * BUILD ORDER §9: "No green shield. No green means safe. Verified truth is a
 * sentence." Even BROKER-WORKING is a statement of fact, not a safety promise —
 * the stop can still gap. Exported so surfaces can assert against it.
 */
export const NEVER_GREEN_GRADES: readonly ProtectionGrade[] = [
  "UNPROTECTED",
  "MANUAL-DEGRADED",
  "WM-SUPERVISED",
  "UNVERIFIED — LAST KNOWN",
];
