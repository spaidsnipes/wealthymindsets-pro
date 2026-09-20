/**
 * selectTeachingEmphasis — Asset 11, the one element of the APP VIEW that is
 * an invention rather than a layout.
 *
 * WHAT ASSET 11 ACTUALLY ADDS.
 *
 * `WM_Transformation_UI_11_Long_Division_Worksheet_App_View` draws the same
 * seven-step worksheet Assets 01 and 18 already render, wrapped in page chrome
 * (a top nav, a left rail of icons, a masthead quote). Chrome is not an
 * invention — this OS already has a shell, and cloning the mockup's navigation
 * would add a second way to reach surfaces that already have doorways.
 *
 * ONE block in that mockup is not chrome and is not in Assets 01 or 18:
 *
 *   TEACHING EMPHASIS — "Stronger ask-side participation with minimal price
 *   advance at resistance suggests absorption. Look for confirmation before
 *   committing capital."
 *
 * That is the worksheet SAID OUT LOUD. A trader who can read seven rungs of
 * arithmetic does not need it; a trader learning to read them does, and this
 * product's stated purpose is to move a person from the second group to the
 * first. So the paragraph is the asset, and the chrome is not.
 *
 * ── WHY THIS IS COMPOSITION AND NOT FABRICATION ─────────────────────────────
 *
 * Writing prose from data is one short step away from inventing a verdict, so
 * the rules here are narrow and mechanical:
 *
 * 1. **Only READ rungs may speak.** The paragraph quotes each rung's own
 *    `value` — the string an owner already computed and the worksheet already
 *    prints — and never restates, rounds, or re-grades it. If the sentence and
 *    the rung ever disagree, that is a bug with one cause, because there is one
 *    string.
 *
 * 2. **The unread rungs are NAMED, not dropped.** A summary that silently
 *    omits what it could not read is how a partial reading becomes a confident
 *    one. The absence is part of the lesson.
 *
 * 3. **Two rungs minimum.** One reading is a number, not a lesson. Below the
 *    floor the block says why instead of stretching a single term into a
 *    paragraph.
 *
 * 4. **THE MOCKUP'S LAST SENTENCE IS REFUSED.** "Look for confirmation before
 *    committing capital" is not a teaching note — it is RIGHT OF WAY, and right
 *    of way belongs to `decisionPermissionCompiler`, an owner this room has
 *    never had. The mockup puts an instruction in the mouth of a paragraph that
 *    has no standing to give one. So the block ends by naming the instruction
 *    it is declining to issue, which is the same move the seventh rung makes.
 *
 * 5. **No adjective grades anything.** No "strong", "weak", "healthy". The
 *    rungs' own values carry whatever the owners computed; this module supplies
 *    only conjunctions.
 */

import type { DivisionWorksheetVM, WorksheetRung } from "./selectDivisionWorksheet";

export const TEACHING_EMPHASIS_VERSION = 1;

/**
 * Fewer READ rungs than this and there is no paragraph.
 *
 * Two is the smallest number that can carry the shape the worksheet teaches —
 * one term set against another. At one, the only honest sentence is the rung
 * itself, which is already on screen directly above.
 */
export const MIN_READ_RUNGS_FOR_EMPHASIS = 2;

/**
 * The owner of the sentence this module refuses to write. Named as a STRING so
 * the module does not enter the bundle and invite someone to wire it in a hurry
 * to make the paragraph feel finished.
 */
export const WITHHELD_INSTRUCTION_OWNER = "decisionPermissionCompiler";

export const WITHHELD_INSTRUCTION =
  'The mockup closes this block with "Look for confirmation before committing ' +
  'capital." That is a right-of-way instruction, not a teaching note, and it ' +
  `belongs to ${WITHHELD_INSTRUCTION_OWNER} — an owner this room does not yet ` +
  "have. It is named here rather than printed, because a paragraph that tells " +
  "you what to do with your capital should be answerable for it.";

export interface TeachingEmphasisVM {
  readonly version: typeof TEACHING_EMPHASIS_VERSION;
  /** The composed lesson, or null when too little was read to compose one. */
  readonly paragraph: string | null;
  /** Why there is no paragraph. Non-null exactly when `paragraph` is null. */
  readonly absence: string | null;
  /** Labels of the rungs that spoke, in step order. */
  readonly spokeFor: readonly string[];
  /** Labels of the rungs that could not be read, in step order. */
  readonly silentOn: readonly string[];
  /** Always present. The instruction this block declines to issue. */
  readonly withheldInstruction: string;
}

/** A rung speaks only if it was READ and actually carries a value string. */
const speaks = (r: WorksheetRung): boolean =>
  r.state === "READ" && typeof r.value === "string" && r.value.trim().length > 0;

/**
 * Join label:value pairs into English without inventing a relationship between
 * them. "and" is a conjunction; "therefore" would be a claim.
 */
const sentenceFrom = (rungs: readonly WorksheetRung[]): string => {
  const clauses = rungs.map((r) => `${r.label.toLowerCase()} reads ${r.value}`);
  if (clauses.length === 1) return clauses[0];
  const head = clauses.slice(0, -1).join("; ");
  return `${head}; and ${clauses[clauses.length - 1]}`;
};

export function selectTeachingEmphasis(vm: DivisionWorksheetVM): TeachingEmphasisVM {
  const spoken = vm.rungs.filter(speaks);
  const silent = vm.rungs.filter((r) => !speaks(r));

  const spokeFor = spoken.map((r) => r.label);
  const silentOn = silent.map((r) => r.label);

  if (spoken.length < MIN_READ_RUNGS_FOR_EMPHASIS) {
    return {
      version: TEACHING_EMPHASIS_VERSION,
      paragraph: null,
      absence:
        `This reading has ${spoken.length} of ${vm.rungs.length} steps worked, ` +
        `and a lesson needs at least ${MIN_READ_RUNGS_FOR_EMPHASIS}. ` +
        "One worked step is a number, and the number is already printed above — " +
        "writing a paragraph around it would add confidence without adding evidence. " +
        (silentOn.length > 0
          ? `Still unread: ${silentOn.join(", ").toLowerCase()}.`
          : ""),
      spokeFor,
      silentOn,
      withheldInstruction: WITHHELD_INSTRUCTION,
    };
  }

  const missing =
    silent.length === 0
      ? "Every step was worked, so nothing is being left out of this reading."
      : `What this reading does NOT have: ${silent
          .map((r) => r.label.toLowerCase())
          .join(", ")}. ` +
        "A reading is only as good as the steps behind it, so the gaps are named " +
        "rather than passed over.";

  return {
    version: TEACHING_EMPHASIS_VERSION,
    paragraph:
      `Read straight down, this worksheet says: ${sentenceFrom(spoken)}. ` +
      `That is ${spoken.length} of ${vm.rungs.length} steps carrying a value, ` +
      "each one quoted from the step above rather than restated here, so the " +
      `sentence cannot drift from the arithmetic. ${missing}`,
    absence: null,
    spokeFor,
    silentOn,
    withheldInstruction: WITHHELD_INSTRUCTION,
  };
}

export default selectTeachingEmphasis;
