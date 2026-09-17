/**
 * THE EVIDENCE LEDGER, DRAWN.
 *
 * The NEXT cell of the decision rail says, in words:
 *
 *     "regime is the first of 9 unpaid evidence nodes +6"
 *
 * That sentence is true and it is also unreadable at a glance, which is the
 * whole complaint the Founder raised against this column: prose where the
 * mockups draw. A trader reading a rail at speed needs to see the SHAPE of the
 * debt — how much of the ledger is settled, how much is outstanding — before
 * reading a single word.
 *
 * ── WHAT THIS IS AND IS NOT ──────────────────────────────────────────────────
 *
 * This compiler INVENTS NOTHING. Every segment it emits is one node already
 * counted by `computeEvidenceDebt`. The denominator is `payable`, the same
 * denominator the sentence uses, for the same reason that field was renamed
 * from `total`: WATCH nodes can never appear in a numerator, so they can never
 * sit in the ledger bar. They are emitted in a SEPARATE trailing group, so the
 * difference between the chain's length and the ledger's length keeps a visible
 * owner instead of becoming an unexplained gap.
 *
 * "No number becomes truth because it was drawn." Nothing here is measured.
 * It is a re-presentation of one producer's counts, and the invariant test
 * `payable === resolved + missing + warn` is what keeps it honest: if the
 * segments and the sentence could ever disagree, this function is wrong, not
 * the sentence.
 *
 * ── WHY UNPAID SEGMENTS ARE DIMMED AND NEVER REMOVED ─────────────────────────
 *
 * A bar that shows only what is paid shrinks its own denominator as evidence
 * goes missing, so a collapsing ledger looks like a complete one. Unpaid nodes
 * hold their width and lose their light. The bar's total width is the ledger's
 * size and does not move.
 *
 * Pure / deterministic. No clock, no I/O. Renders elsewhere.
 */

import type { EvidenceDebt } from "./decisionPermissionCompiler";

export type EvidenceLadderState =
  /** Indicator graded and settled. */
  | "RESOLVED"
  /** Indicator graded, flagged. Paid, but paid in a currency that argues back. */
  | "WARN"
  /** Indicator UNKNOWN. Outstanding. */
  | "MISSING"
  /** Observed but ungradeable — outside the ledger entirely. */
  | "WATCH";

export interface EvidenceLadderSegment {
  readonly state: EvidenceLadderState;
  /**
   * True for exactly one segment, at most: the first MISSING node — the one
   * the NEXT sentence names by label. If nothing is missing, no segment is
   * marked and the rail names no next evidence.
   */
  readonly isNext: boolean;
}

export interface EvidenceLadder {
  /** Ledger segments, in ledger order: settled, flagged, outstanding. */
  readonly segments: readonly EvidenceLadderSegment[];
  /** Ungradeable observations, drawn apart from the ledger. */
  readonly watch: readonly EvidenceLadderSegment[];
  /** The ledger's size — the only honest denominator. Equals segments.length. */
  readonly payable: number;
  readonly resolved: number;
}

/**
 * ORDER IS A PRESENTATION, NOT A CLAIM.
 *
 * `EvidenceDebt` carries counts, not a sequence, so this bar cannot and does
 * not claim node-by-node identity. It groups by state — settled, flagged,
 * outstanding — which is the only ordering the input actually supports. The
 * `isNext` mark rides the first outstanding segment because "the first unpaid
 * one" is exactly how the sentence beside it selects its subject.
 */
export function selectEvidenceLadder(debt: EvidenceDebt | null): EvidenceLadder | null {
  if (!debt) return null;
  if (debt.payable <= 0 && debt.watch <= 0) return null;

  const segments: EvidenceLadderSegment[] = [];
  for (let i = 0; i < debt.resolved; i += 1) {
    segments.push({ state: "RESOLVED", isNext: false });
  }
  for (let i = 0; i < debt.warn; i += 1) {
    segments.push({ state: "WARN", isNext: false });
  }
  for (let i = 0; i < debt.missing; i += 1) {
    segments.push({ state: "MISSING", isNext: i === 0 });
  }

  const watch: EvidenceLadderSegment[] = [];
  for (let i = 0; i < debt.watch; i += 1) {
    watch.push({ state: "WATCH", isNext: false });
  }

  return {
    segments,
    watch,
    payable: debt.payable,
    resolved: debt.resolved,
  };
}

export default selectEvidenceLadder;
