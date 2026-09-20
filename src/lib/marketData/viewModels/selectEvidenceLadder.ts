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
  /**
   * WHICH CONDITION THIS IS — present only when the debt carried a roll.
   *
   * ABSENT IS A REAL ANSWER, not a hole to paper over. A debt built without a
   * roll genuinely has no identity in it, and a renderer that invented a name
   * for an unnamed node would be fabricating the exact thing this field was
   * added to stop fabricating. Renderers must fall back to the anonymous
   * shape, which is what the ledger has always drawn.
   */
  readonly key?: string;
  /** The node's own label, verbatim. Never composed, never abbreviated here. */
  readonly label?: string;
  /**
   * MISSING-only, and only when something can actually pay it. A surface may
   * use this to tell "owed and workable" apart from "owed and not yours to
   * work on" — never to hide the second kind.
   */
  readonly payableNow?: boolean;
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
 * ORDER IS A PRESENTATION, NOT A CLAIM. IDENTITY IS A CLAIM, AND IT IS NOW
 * SUPPLIED.
 *
 * ── What changed, and why the old refusal was right until it wasn't ─────────
 *
 * This block used to end: "EvidenceDebt carries counts, not a sequence, so
 * this bar cannot and does not claim node-by-node identity." That was a true
 * statement about the INPUT, and refusing was the correct response to it. It
 * is no longer true. `computeEvidenceDebt` now emits `roll` — one named entry
 * per observed node — so the identity the bar was refusing to invent is now
 * MEASURED and merely has to be carried. See EvidenceDebt.roll for the live
 * measurement that forced it (seven anonymous dots on /charts, four of them
 * owed, none of them saying what they were).
 *
 * The refusal is lifted ONLY as far as the input actually reaches: when `roll`
 * is absent the segments come out unnamed exactly as before. Lifting it
 * further — deriving names from the truncated label samples, say — would put
 * back a fabrication under the appearance of a fix.
 *
 * ORDER, HOWEVER, IS STILL NOT A CLAIM. The bar groups by state — settled,
 * flagged, outstanding — and does NOT emit the roll in chain order, because
 * chain order is SOURCE-FILE order, and source-file order reading as priority
 * is a defect this codebase has already paid for once (see
 * DecisionChainNode.payableBy: "the word 'first' was reporting SOURCE-FILE
 * ORDER while reading as PRIORITY"). Within a group the roll's own order is
 * preserved, because rearranging it would be a second invention.
 *
 * The `isNext` mark rides the first outstanding segment because "the first
 * unpaid one" is exactly how the sentence beside it selects its subject.
 */
export function selectEvidenceLadder(debt: EvidenceDebt | null): EvidenceLadder | null {
  if (!debt) return null;
  if (debt.payable <= 0 && debt.watch <= 0) return null;

  // THE ROLL IS USED ONLY IF IT AGREES WITH THE COUNTS.
  //
  // The counts stay authoritative — they are what every sentence on the screen
  // is compiled from. If a roll ever disagreed with them, drawing the roll
  // would silently make the bar and the sentence two different ledgers, which
  // is the precise failure `payable` was renamed to end. So the roll is
  // matched against each count, and on any mismatch the bar falls back to the
  // anonymous shape it has always drawn: fewer words, zero contradiction.
  const roll = debt.roll;
  const named = (state: EvidenceLadderState, n: number) => {
    if (!roll) return null;
    const entries = roll.filter((e) => e.standing === state);
    return entries.length === n ? entries : null;
  };
  const namedResolved = named("RESOLVED", debt.resolved);
  const namedWarn = named("WARN", debt.warn);
  const namedMissing = named("MISSING", debt.missing);
  const namedWatch = named("WATCH", debt.watch);

  const segments: EvidenceLadderSegment[] = [];
  for (let i = 0; i < debt.resolved; i += 1) {
    const e = namedResolved?.[i];
    segments.push({
      state: "RESOLVED",
      isNext: false,
      ...(e ? { key: e.key, label: e.label } : null),
    });
  }
  for (let i = 0; i < debt.warn; i += 1) {
    const e = namedWarn?.[i];
    segments.push({
      state: "WARN",
      isNext: false,
      ...(e ? { key: e.key, label: e.label } : null),
    });
  }
  for (let i = 0; i < debt.missing; i += 1) {
    const e = namedMissing?.[i];
    segments.push({
      state: "MISSING",
      isNext: i === 0,
      ...(e ? { key: e.key, label: e.label, payableNow: e.payableNow } : null),
    });
  }

  const watch: EvidenceLadderSegment[] = [];
  for (let i = 0; i < debt.watch; i += 1) {
    const e = namedWatch?.[i];
    watch.push({
      state: "WATCH",
      isNext: false,
      ...(e ? { key: e.key, label: e.label } : null),
    });
  }

  return {
    segments,
    watch,
    payable: debt.payable,
    resolved: debt.resolved,
  };
}

export default selectEvidenceLadder;
