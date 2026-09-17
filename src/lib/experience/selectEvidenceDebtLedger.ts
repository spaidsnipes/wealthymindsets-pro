/**
 * THE EVIDENCE LEDGER, GIVEN A SHAPE.
 *
 * `selectDecisionWhyNot` compiles this sentence and pushes it into the
 * clearances list:
 *
 *     "5/8 evidence nodes paid."
 *
 * It is the most load-bearing number in the WHY panel and it is rendered as a
 * bare string in a column headed CLEARED — so a chain with three unpaid nodes
 * files its own shortfall under the affirmative half of the ledger. The
 * numerator and the denominator are both true; the placement is what flatters.
 *
 * ── WHY THE THREE-WAY SPLIT IS THE WHOLE POINT ───────────────────────────────
 *
 * `payable === resolved + missing + warn` is an invariant of `EvidenceDebt`,
 * and the three populations are not interchangeable:
 *
 *   · RESOLVED — the node carries a confirmed indicator. Paid.
 *   · WARN     — evidence is PRESENT but below confirmation. Not paid.
 *   · MISSING  — no indicator at all. Not paid, and nothing to argue with.
 *
 * The compiler's own header records what happens when WARN drifts toward the
 * paid side: on 2026-09-16 a WARN node sat in the denominator while appearing
 * in no numerator, and the deck rendered "0 of 9 paid" two lines above "8
 * evidence nodes unpaid" — a 9 with no owner anywhere on the screen. A picture
 * is a much easier place to make that mistake than a sentence, because a
 * picture can blend two segments into one run and nobody has to write the
 * wrong number down.
 *
 * So WARN gets its own mark, its own count, and a fill that is neither the paid
 * fill nor the missing fill.
 *
 * ── WHAT IT REFUSES ──────────────────────────────────────────────────────────
 *
 * 1. IT REFUSES TO DRAW NUMBERS THAT DISAGREE. If `payable` does not equal
 *    `resolved + missing + warn`, this returns null rather than drawing the
 *    part it can reconcile. That is the exact defect above: a surface that
 *    renders the agreeing portion of a disagreeing ledger hides the gap inside
 *    a shape, where no reader can subtract. A missing strip is a visible
 *    absence; a strip built from a broken invariant is an invisible lie.
 *
 * 2. AN EMPTY LEDGER DRAWS NOTHING. `payable === 0` means no node carries a
 *    gradeable indicator — there is nothing to pay, which is not the same as
 *    having paid. A full strip under "evidence paid" would say the opposite.
 *
 * 3. NO PERCENTAGE. Nodes are what a trader resolves; 62% of a node cannot be
 *    produced, and a percentage invites a passing mark (§15).
 *
 * 4. WATCH NODES ARE NOT MARKS, AND NOT DISCARDED EITHER. They are outside the
 *    ledger by design — `payable` excludes them, and that is the correction the
 *    compiler was renamed to make. But the count is carried through so a
 *    caption can NAME the difference between the ledger and the chain. An
 *    unexplained gap between two counts is how the original defect stayed
 *    invisible for as long as it did.
 *
 * Pure / deterministic / no clock. Renders elsewhere.
 */

import type { EvidenceDebt } from "../marketData/viewModels/decisionPermissionCompiler";

export type EvidenceStanding = "RESOLVED" | "WARN" | "MISSING";

export interface EvidenceMark {
  readonly standing: EvidenceStanding;
  /** True only for RESOLVED. WARN is present evidence, and still unpaid. */
  readonly paid: boolean;
}

export interface EvidenceDebtLedger {
  readonly marks: readonly EvidenceMark[];
  readonly resolved: number;
  readonly warn: number;
  readonly missing: number;
  /** `warn + missing`. The nodes still owed, however loudly each one argues. */
  readonly unpaid: number;
  /** The ledger's size — the only honest denominator for "X of N paid". */
  readonly payable: number;
  /** Observed but outside the ledger. Never drawn; carried so it can be named. */
  readonly watch: number;
}

export function selectEvidenceDebtLedger(
  debt: EvidenceDebt | null | undefined,
): EvidenceDebtLedger | null {
  if (!debt) return null;

  const { payable, resolved, warn, missing, watch } = debt;

  // Refusal 2 — nothing gradeable is not the same as everything paid.
  if (payable <= 0) return null;

  // Refusal 1. The invariant is enforced by a test on the compiler, which is
  // exactly why a surface must not quietly assume it: the day that test is
  // wrong, this is the code that would turn the discrepancy into a picture.
  if (resolved + warn + missing !== payable) return null;

  // A negative count cannot be drawn and cannot be true. Refusing is the only
  // response that does not invent a shape for it.
  if (resolved < 0 || warn < 0 || missing < 0) return null;

  // Paid leads, so the settled portion reads as one run from the left edge.
  // WARN follows — adjacent to RESOLVED because it is the stronger of the two
  // unpaid states, and told apart from it by FILL rather than by position,
  // since position is exactly what failed in 2026-09-16.
  const marks: EvidenceMark[] = [
    ...Array.from({ length: resolved }, () => ({ standing: "RESOLVED" as const, paid: true })),
    ...Array.from({ length: warn }, () => ({ standing: "WARN" as const, paid: false })),
    ...Array.from({ length: missing }, () => ({ standing: "MISSING" as const, paid: false })),
  ];

  return {
    marks,
    resolved,
    warn,
    missing,
    unpaid: warn + missing,
    payable,
    watch,
  };
}

export default selectEvidenceDebtLedger;
