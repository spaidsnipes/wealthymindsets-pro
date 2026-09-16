/**
 * selectRealityCells — the four canon cells of the MARKET REALITY CANVAS.
 *
 * Founder Visual Systems Canon (2026-09-15 COMPLETE VISUAL CUTOVER). Every
 * mockup that shows the deck shows the same frame: NUMBERED cells, each with a
 * letter-spaced small-caps label, a dominant value, and a quiet detail line.
 * `selectOneStory` already compiles all four facts. `OneStoryStrip` rendered
 * them as a 9–13px band explicitly designed "without competing with the chart"
 * — which is the same defect the ACTIVE QUESTION banner just fixed:
 *
 *     A CORRECT FACT RENDERED AT THE WRONG SIZE IS STILL A FAILED CUTOVER.
 *
 * THE TRUTH DEFECT THIS ALSO FIXES
 *
 * The strip hid the CONTRADICTION slot whenever `contradiction` was null. But
 * `OneStoryVM` carries TWO different nulls:
 *
 *   contradiction === null && detectability === "COMPARABLE"
 *       → a thesis existed, it was checked, nothing argued with it.
 *   contradiction === null && detectability === "NOTHING_TO_COMPARE"
 *       → no thesis existed, so nothing could have been checked.
 *
 * Rendering NOTHING for both collapses a resolved answer and an unasked
 * question into one blank. That is the new law this file pins:
 *
 *     AN ABSENT CELL CANNOT TELL "NOTHING FOUND" FROM "NOTHING LOOKED".
 *
 * Auto-Quiet says do not SHOUT what is quiet. It does not say erase the
 * difference between silence and absence — the canon's own "UNKNOWN has a
 * look" rule requires the opposite.
 *
 * ASSERTS NO MARKET FACT. Every string is either a constant or an echo of a
 * field `selectOneStory` already owns. The evidence detail line is `vm.missing`
 * verbatim — re-deriving it from `missingLabels` would mint a second owner of
 * one fact, and `missingLabels` is a CAPPED SAMPLE that must never be counted.
 *
 * PURE / DETERMINISTIC — no React, no I/O, no clock.
 */

import type { OneStoryVM } from "../marketData/viewModels/selectOneStory";

export const REALITY_CELLS_VERSION = "wm.reality-cells.v1" as const;

/**
 * How a cell must LOOK, compiled — never chosen by the renderer.
 *
 *   RESOLVED   the engine answered, and the answer is settled.
 *   OBJECTION  the engine answered, and the answer is an argument AGAINST.
 *   DEBT       the engine answered, and the answer is that it is owed evidence.
 *   UNRESOLVED the engine did not answer. Must never wear a resolved look.
 */
export type CellTone = "RESOLVED" | "OBJECTION" | "DEBT" | "UNRESOLVED";

export interface RealityCell {
  /** 1-based position in the canon frame. Stable — cells never reorder. */
  readonly n: 1 | 2 | 3 | 4;
  /** Small-caps eyebrow. Constant per slot. */
  readonly label: string;
  /** The dominant line. */
  readonly value: string;
  /** The quiet line beneath. Empty string when the slot has nothing to add. */
  readonly detail: string;
  readonly tone: CellTone;
}

export interface RealityCellsVM {
  readonly cells: readonly [RealityCell, RealityCell, RealityCell, RealityCell];
}

/** The engine resolved nothing at all — four honest blanks, zero invention. */
const UNRESOLVED_CELLS: RealityCellsVM = {
  cells: [
    { n: 1, label: "Market Posture", value: "Unresolved", detail: "No market story compiled yet.", tone: "UNRESOLVED" },
    { n: 2, label: "Strongest Contradiction", value: "Nothing to compare", detail: "No thesis exists to argue against.", tone: "UNRESOLVED" },
    { n: 3, label: "Evidence Debt", value: "—", detail: "No evidence ledger compiled.", tone: "UNRESOLVED" },
    { n: 4, label: "Right of Way", value: "UNKNOWN", detail: "No permission reading available.", tone: "UNRESOLVED" },
  ],
};

export function selectRealityCells(oneStory: OneStoryVM | null): RealityCellsVM {
  if (!oneStory) return UNRESOLVED_CELLS;

  const nothingToCompare = oneStory.contradictionDetectability === "NOTHING_TO_COMPARE";

  const posture: RealityCell = {
    n: 1,
    label: "Market Posture",
    value: oneStory.primary,
    detail: "",
    // When no chapter resolved, `primary` holds the engine's REASON for
    // silence. It is an honest sentence but it is NOT a market read, so it
    // may not borrow the confident look of one.
    tone: nothingToCompare ? "UNRESOLVED" : "RESOLVED",
  };

  const contradiction: RealityCell = oneStory.contradiction
    ? {
        n: 2,
        label: "Strongest Contradiction",
        value: oneStory.contradiction,
        detail: "",
        tone: "OBJECTION",
      }
    : nothingToCompare
      ? {
          n: 2,
          label: "Strongest Contradiction",
          value: "Nothing to compare",
          detail: "No thesis exists to argue against.",
          tone: "UNRESOLVED",
        }
      : {
          n: 2,
          label: "Strongest Contradiction",
          value: "None detected",
          detail: "The read was checked against the tape and nothing argued back.",
          tone: "RESOLVED",
        };

  const debt = oneStory.debt;
  const evidence: RealityCell =
    debt && debt.total > 0
      ? {
          n: 3,
          label: "Evidence Debt",
          // `resolved` and `total` are authoritative counts owned by
          // computeEvidenceDebt. `missingLabels` is a capped sample and is
          // never counted here.
          value: `${debt.resolved} of ${debt.total} paid`,
          // `missing` is already the compiled phrase. Echo it; do not re-derive.
          detail: oneStory.missing ?? "Ledger paid in full.",
          tone: oneStory.missing ? "DEBT" : "RESOLVED",
        }
      : UNRESOLVED_CELLS.cells[2];

  const rightOfWay: RealityCell = {
    n: 4,
    label: "Right of Way",
    value: oneStory.decision.value,
    detail: oneStory.decision.detail,
    tone:
      oneStory.decision.value === "UNKNOWN"
        ? "UNRESOLVED"
        : oneStory.decision.value === "ACTION"
          ? "RESOLVED"
          : "DEBT",
  };

  return { cells: [posture, contradiction, evidence, rightOfWay] };
}

export default selectRealityCells;
