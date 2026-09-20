/**
 * selectScaffoldDependence — Asset 13, THE PATH IS THE TRAINING.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS NOT A SECOND COPY OF ASSET 12
 *
 * `WM_Transformation_UI_13_Progressive_Scaffolding_Mastery_Path` draws the same
 * three panels Asset 12 draws — FOUNDATION expanded, INTERMEDIATE compressed,
 * PRO geometry-only, all on one market moment. `scaffoldWorksheet` already
 * ships that, and re-implementing it would give this OS two scaffolding ladders
 * free to disagree about what "advanced" means.
 *
 * ONE line in Asset 13 is not in Asset 12, and it is repeated under every panel:
 *
 *     DEPENDENCE: High   | Guidance: Full Process
 *     DEPENDENCE: Medium | Guidance: Compressed Judgment
 *     DEPENDENCE: Low    | Guidance: Discretionary Edge
 *
 * Asset 12's captions describe THE VIEW — what it prints, how densely. Asset 13's
 * line describes THE READER — what the view is doing on their behalf, and by
 * subtraction what they are now expected to do themselves. That is a different
 * claim about a different subject, and it is the one that turns three display
 * densities into a path someone can be walking.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RULE THAT MAKES IT HONEST: DEPENDENCE IS COUNTED, NOT ASSERTED
 *
 * A label reading "DEPENDENCE: LOW" is a badge. A badge is worth nothing,
 * because nothing on the page has to agree with it, and the day someone changes
 * what ADVANCED prints the badge will keep saying LOW regardless.
 *
 * So this module COUNTS. It walks the rungs at the requested level and tallies
 * the explanations actually printed — the question above a step, the input it
 * divided, the owner's own sentence, the owner's name, the reason a blank rung
 * is blank — and it walks them again at FOUNDATION to get the total this
 * worksheet is capable of giving. The difference is what the reader is carrying
 * unaided. Change what a level prints and both numbers move by themselves.
 *
 * Labels and values are deliberately NOT counted. They are printed at every
 * level and they are THE READING — not explanation, not scaffolding, not
 * negotiable. Counting them would let a level look generous for showing the
 * reader the thing it is not allowed to withhold.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE READING DOES NOT MOVE
 *
 * `readCount`, `unreadCount` and the step count are identical at all three
 * levels — `scaffoldWorksheet` carries them off the source and this module
 * re-states them beside the dependence figure for exactly one reason: a reader
 * being told they now have "discretion" must be able to see, in the same glance,
 * that the evidence underneath them did not shrink to grant it. Discretion over
 * a smaller reading is not mastery. It is a smaller reading.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IS REFUSED FROM THIS MOCKUP
 *
 * Asset 13's PRO panel closes with `Bias: Defensive | Wait | Reduce Size` and
 * grades an efficiency ratio `Sub-Optimal` over a red/green effort-vs-result
 * diagram. Three separate violations in one corner: the bias line is right of
 * way and belongs to `decisionPermissionCompiler`; `Sub-Optimal` grades a ratio
 * that no owner in this room graded; and the diagram states a verdict in hue,
 * which Build Order §9 forbids outright. None are minted. The bias refusal is
 * NAMED on every input rather than silently dropped, because the most advanced
 * panel is exactly where a reader has been told to trust their own judgment and
 * is therefore least likely to notice an instruction arriving inside it.
 *
 * The mockup also counts SIX steps. This division has seven. The seventh is the
 * one the mockup does not draw, and it is the one that names what is missing.
 *
 * PURE MODULE — no DOM, no clock, no React, no market input. It receives an
 * already-compiled worksheet and counts words on a page.
 */

import type { DivisionWorksheetVM, WorksheetRung } from "./selectDivisionWorksheet";
import {
  scaffoldWorksheet,
  type RungVoices,
  type ScaffoldLevel,
} from "./scaffoldWorksheet";

export const SCAFFOLD_DEPENDENCE_VERSION = 1;

/** The owner of the instruction Asset 13's PRO panel issues and this one will not. */
export const DEPENDENCE_REFUSAL_OWNER = "decisionPermissionCompiler";

export const BIAS_REFUSAL =
  'Asset 13 ends its most advanced panel with "Bias: Defensive | Wait | Reduce ' +
  'Size", and grades its efficiency ratio "Sub-Optimal". Neither is drawn here. ' +
  "A bias is right of way and belongs to " +
  `${DEPENDENCE_REFUSAL_OWNER}, an owner this room does not have; a grade is a ` +
  "verdict on a number whose owner supplied no verdict. This level removes the " +
  "explaining, not the evidence — it does not also hand down a conclusion in " +
  "place of the words it stopped printing.";

/** How much of the reader's own judgment this level is standing in for. */
export type DependenceTier = "HIGH" | "MEDIUM" | "LOW";

const TIERS: Record<ScaffoldLevel, DependenceTier> = {
  FOUNDATION: "HIGH",
  INTERMEDIATE: "MEDIUM",
  ADVANCED: "LOW",
};

/** The mockup's own name for the mode of help, kept verbatim. */
const GUIDANCE: Record<ScaffoldLevel, string> = {
  FOUNDATION: "Full process",
  INTERMEDIATE: "Compressed judgment",
  ADVANCED: "Discretionary edge",
};

export interface ScaffoldDependenceVM {
  readonly version: typeof SCAFFOLD_DEPENDENCE_VERSION;
  readonly level: ScaffoldLevel;
  readonly tier: DependenceTier;
  readonly guidance: string;
  /** Explanations actually printed at this level. */
  readonly supplied: number;
  /** Explanations this worksheet is capable of printing, i.e. the FOUNDATION total. */
  readonly available: number;
  /** `available - supplied`. What the reader is carrying without help. */
  readonly carried: number;
  /** The sentence a reader can hold the level to. Never empty. */
  readonly statement: string;
  /** The reading, re-stated so a reader can see it did not shrink. */
  readonly readingUnchanged: string;
  /** Always present. The instruction this level declines to issue. */
  readonly biasRefusal: string;
}

/**
 * Count the explanation strings a rung would actually PRINT under these voices.
 *
 * "Actually" is load-bearing. A voice flag being true does not mean there is
 * anything to say: `basis` is null on a rung that was never worked, `absence` is
 * null on one that was. Counting the flags instead of the content would credit a
 * level for explanations that are not on the page, and the whole figure would
 * drift the moment a rung went unread.
 */
function explanationsOn(rung: WorksheetRung, voices: RungVoices): number {
  let n = 0;
  if (voices.question && rung.question) n += 1;
  if (voices.dividend && rung.dividend) n += 1;
  if (voices.basis && rung.basis) n += 1;
  if (voices.owner && rung.owner) n += 1;
  if (voices.absence && rung.absence) n += 1;
  return n;
}

function totalExplanations(vm: DivisionWorksheetVM, level: ScaffoldLevel): number {
  return scaffoldWorksheet(vm, level).shown.reduce(
    (sum, s) => sum + explanationsOn(s.rung, s.voices),
    0,
  );
}

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);

export function selectScaffoldDependence(
  vm: DivisionWorksheetVM,
  level: ScaffoldLevel,
): ScaffoldDependenceVM {
  const supplied = totalExplanations(vm, level);
  // FOUNDATION is the ceiling by construction: it prints every voice of every
  // rung. Measuring against it rather than against a constant means the figure
  // stays true when the worksheet gains or loses a step.
  const available = totalExplanations(vm, "FOUNDATION");
  const carried = Math.max(0, available - supplied);

  const scaffolded = scaffoldWorksheet(vm, level);

  const statement =
    carried === 0
      ? `This level prints every explanation this worksheet has — ${supplied} of ` +
        `${available}, across all ${scaffolded.totalSteps} steps. Nothing is being ` +
        "asked of you yet except that you read them."
      : `This level prints ${supplied} of the ${available} ${plural(available, "explanation", "explanations")} ` +
        `this worksheet can give. The other ${carried} ${plural(carried, "is", "are")} ` +
        "not missing from the reading — only from the page. They are what you are " +
        "now carrying yourself, which is the whole of what this level means by " +
        `${GUIDANCE[level].toLowerCase()}.`;

  const readingUnchanged =
    `The reading is the same at every level: ${scaffolded.readCount} of ` +
    `${scaffolded.totalSteps} steps worked, ${scaffolded.unreadCount} not worked in ` +
    "this room. Those two numbers are read off the source worksheet and never " +
    "recomputed from what is on screen, so moving along this path cannot make the " +
    "evidence underneath you look larger or smaller than it is.";

  return {
    version: SCAFFOLD_DEPENDENCE_VERSION,
    level,
    tier: TIERS[level],
    guidance: GUIDANCE[level],
    supplied,
    available,
    carried,
    statement,
    readingUnchanged,
    biasRefusal: BIAS_REFUSAL,
  };
}

export default selectScaffoldDependence;
