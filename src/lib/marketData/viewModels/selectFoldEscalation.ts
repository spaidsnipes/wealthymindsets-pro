/**
 * A HANDLE THAT READS THE SAME IN EVERY STATE IS A MOLE.
 *
 * ── What was measured ────────────────────────────────────────────────────────
 *
 * MEASURED on prod /charts, desktop 1440x900, serving eb63292b, 2026-09-22.
 * The decision rail (`[data-presentation="rail"]`, h:821) renders four cells.
 * The third is 51px tall and its entire visible text is:
 *
 *     Risk · Why · Detail ▸
 *
 * Behind that one line, closed, sat every one of these already-compiled facts:
 *
 *     Chart integrity · WOUNDED
 *     Honesty plaque · one market fidelity — DEGRADED, asOf 12:52:43
 *     Available R UNKNOWN
 *     Right-of-way is withheld — the market has not earned entry.
 *
 * The chart was painting the whole time. A trader glancing at that rail saw a
 * live candle chart and a neutral grey label, and had no way to know the house
 * had already concluded the canvas was wounded. THE DISCLOSURE EXISTED AND WAS
 * UNREACHABLE IN PRACTICE, which is the specific failure the S-501 fold comment
 * warns about in its own words: "a handle that under-names its contents is how
 * a fact becomes unreachable in practice while staying reachable in the DOM."
 *
 * S-501 named the handle's REGIONS. It never made the handle name its STATE.
 *
 * ── Why the fold is NOT being opened ─────────────────────────────────────────
 *
 * The obvious repair is to promote the six folded organs onto the rail and let
 * them fill the 430px the column currently draws nothing into. That is refused.
 * S-501's attention budget is four chunks, and it exists because this very rail
 * once measured EIGHT. Spending unused pixels is not a reason to re-spend an
 * attention budget; empty space is cheap and a crowded decision rail is not.
 * Wall Law 5 governs: the experience must stay calm.
 *
 * So nothing moves. The fold keeps all six organs. What changes is that the
 * CLOSED handle stops being mute about whether what it hides is nominal.
 *
 * (2026-09-25, H-101 plaque pass: the fold now also holds the DECISION_ID
 * birth and NEXT with its GO interlock — the rail at rest is one WAIT plaque
 * plus this handle. The escalation law is unchanged and matters MORE now: the
 * handle is the only other thing on the rail at rest.)
 *
 * ── Calm when calm is true, and only then ────────────────────────────────────
 *
 * This is an escalation, not a badge. INTACT produces NOTHING — no chip, no
 * word, no colour, byte-identical to the handle shipping today. A rail that
 * wore a green "INTEGRITY INTACT" plaque in the calm case would be decoration
 * bidding for a glance it has not earned, and would train the trader to ignore
 * the slot exactly when it finally says WOUNDED.
 *
 * ── It computes nothing ──────────────────────────────────────────────────────
 *
 * There is no second evidence engine here and no new reading. The one input is
 * the SAME `MarketFidelityReading` the plaque behind the fold already renders,
 * put through the SAME `paintTreatment` owner. If the chip and the plaque ever
 * disagreed it would be a bug in the algebra, not a disagreement between two
 * surfaces — which is the only kind of disagreement this codebase permits.
 *
 * That is also why `INTEGRITY_WORD` lives HERE and is imported by the plaque,
 * rather than being copied. Two spellings of WOUNDED in two files is a drift
 * waiting for a rename to land on only one of them.
 *
 * ── The one distinction that matters ─────────────────────────────────────────
 *
 * `undefined` and `null` are NOT the same input and must not produce the same
 * output:
 *
 *   undefined — the caller attached no fidelity to this rail at all. There is
 *               no plaque behind the fold, so there is nothing for a handle to
 *               escalate ABOUT. Escalating here would invent a claim the
 *               surface never made. CALM.
 *
 *   null      — the house looked and has not established a fidelity. That is
 *               UNMEASURED, a real and disclosable state, and the plaque behind
 *               the fold renders it as such. An unmeasured canvas must not read
 *               like a certified one. ESCALATES.
 *
 * `paintTreatment` flattens both to "NONE", so the undefined case is settled
 * BEFORE the algebra is consulted rather than after.
 */

import {
  paintTreatment,
  type MarketFidelityReading,
  type PaintTreatment,
} from "@/lib/marketData/marketFidelityAlgebra";

/**
 * What the treatment means in words. THE ONLY SPELLING of these four states.
 *
 * NONE is "NOT PAINTED" rather than blank, for the plaque's long-standing
 * reason: an empty integrity slot reads as integrity.
 */
export const INTEGRITY_WORD: Readonly<Record<PaintTreatment, string>> = Object.freeze({
  FULL: "INTACT",
  WOUNDED: "WOUNDED",
  DIM: "DIMMED",
  NONE: "NOT PAINTED",
});

export interface FoldEscalation {
  /**
   * CALM — the handle renders exactly as it always has.
   * DISCLOSED — the handle additionally carries `word`.
   */
  readonly level: "CALM" | "DISCLOSED";
  /** The escalated word, or null when calm. Never an empty string. */
  readonly word: string | null;
  /** The treatment this was derived from, for `data-` attribution. */
  readonly treatment: PaintTreatment | null;
  /** A full sentence for `title` / `aria-label`. Always present. */
  readonly detail: string;
}

const CALM: FoldEscalation = Object.freeze({
  level: "CALM",
  word: null,
  treatment: "FULL",
  detail: "Detail: decision identity, the next act and its permission, market provenance, data fidelity, risk, why, and the evidence ledger.",
});

const NO_PLAQUE: FoldEscalation = Object.freeze({
  level: "CALM",
  word: null,
  treatment: null,
  detail: "Detail: decision identity, the next act and its permission, market provenance, risk, why, and the evidence ledger.",
});

/**
 * Derive whether the closed fold handle must name the state of what it hides.
 *
 * @param reading the fidelity the fold's plaque renders. `undefined` means the
 *        caller attached none and no plaque is drawn; `null` means UNMEASURED.
 */
export function selectFoldEscalation(
  reading: MarketFidelityReading | null | undefined,
): FoldEscalation {
  // Settled before the algebra, because paintTreatment cannot tell these apart.
  if (reading === undefined) return NO_PLAQUE;

  const treatment = paintTreatment(reading);
  if (treatment === "FULL") return CALM;

  const word = INTEGRITY_WORD[treatment];
  return Object.freeze({
    level: "DISCLOSED",
    word,
    treatment,
    detail:
      treatment === "NONE"
        ? `Chart integrity ${word}. No fidelity has been established for this canvas. Open for decision identity, the next act, market provenance, risk, why, and the evidence ledger.`
        : `Chart integrity ${word}. Open for decision identity, the next act, the fidelity reading, market provenance, risk, why, and the evidence ledger.`,
  });
}

export default selectFoldEscalation;
