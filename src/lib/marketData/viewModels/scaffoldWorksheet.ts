/**
 * scaffoldWorksheet — Asset 12, the Progressive Scaffolding Path.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THE MOCKUP DREW
 *
 * `WM_Transformation_UI_12_Progressive_Scaffolding_Foundation_Intermediate_Pro`
 * shows ONE reading three times, at three widths:
 *
 *   FOUNDATION   "Full Scaffolding. Six Steps Fully Expanded"
 *                → "SAME SKILL. DEEPER MASTERY. LESS HAND-HOLDING."
 *   INTERMEDIATE "Compressed to Core Dynamics"
 *                → "SAME READ. LESS STEPS. HIGHER OWNERSHIP."
 *   ADVANCED     "Geometry & Efficiency Only"
 *                → "PURE SIGNAL. MAXIMUM DISCRETION."
 *
 * under the banner `SCAFFOLDING REMOVAL PATH — FROM DEPENDENCE TO DISCRETION`.
 *
 * That is a real invention and nothing in this product does it. Every other
 * surface here has exactly one density, so a trader who has internalised a
 * reading must keep re-reading the beginner's version of it forever.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE ONE LAW THIS MODULE EXISTS TO HOLD
 *
 *     COMPRESSION REMOVES WORDS. IT NEVER REMOVES FACTS.
 *
 * The mockup's middle panel literally promises "LESS STEPS". Taken at its word
 * that is a defect, not a feature, and it is the single most dangerous sentence
 * in the picture. The worksheet's whole claim is that YOU CAN AUDIT IT — seven
 * rungs, four of them typically blank, each blank naming the owner that would
 * have to answer it. A "pro" view that quietly drops the blanks does not give
 * the reader more discretion. It gives them a shorter page and a hidden debt,
 * and it teaches them the missing steps were never asked for.
 *
 * So the step COUNT is invariant across all three levels, asserted by test.
 * `readCount` and `unreadCount` are carried through untouched. What changes is
 * how much PROSE each rung spends, and every level states in one sentence
 * exactly what it stopped printing and which steps it stopped printing it for.
 *
 * A reader at ADVANCED can therefore always answer "how much of this was
 * actually measured" without stepping back down — which is the difference
 * between compression and concealment.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY `CATEGORY` RUNGS LEAVE THE GEOMETRY VIEW AND `QUANTITY` RUNGS DO NOT
 *
 * ADVANCED is "geometry & efficiency only". The rungs it keeps are the ones
 * whose OWNER declared them `QUANTITY` — a count, a displacement, a ratio.
 * Numbers survive having their sentences removed; an experienced reader can
 * still check them.
 *
 * A verdict cannot. `selectRegime` answering `EXPANSION` or
 * `selectContinuationHealth` answering `COHERENT` is a conclusion, and a
 * conclusion stripped of its reasoning is precisely the "handed down answer"
 * this worksheet was built to refuse. Printing those two bare at the most
 * advanced level would invert the whole idea: the reader who has earned the
 * most independence would be the one shown the least evidence. So they are
 * withheld, counted, and named.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE MOCKUP'S `62%` IS NOT IN HERE
 *
 * The ADVANCED panel prints `EFFICIENCY RATIO 62%` over a red/green pressure
 * diagram with the verdict `MODERATE DEFENSIVE SETUP`. There is no owner for
 * that percentage, the diagram is a verdict graded in hue (Build Order §9), and
 * `MODERATE DEFENSIVE SETUP` is a right-of-way claim that belongs to
 * `decisionPermissionCompiler`, which is not in the chart room. None of the
 * three are minted. What survives is the real efficiency rung the worksheet
 * already computes, in its owner's own units.
 *
 * PURE MODULE — no DOM, no clock, no React. It rewrites a compiled worksheet
 * and adds nothing to it; it cannot reach a market fact even by accident,
 * because it never receives one.
 */

import type {
  DivisionWorksheetVM,
  WorksheetRung,
} from "@/lib/marketData/viewModels/selectDivisionWorksheet";

/**
 * Ordered from most scaffolding to least. The order is load-bearing: the UI
 * renders the path in this sequence, and `SCAFFOLD_LEVELS.indexOf` is the only
 * place that knows which way "down" is.
 */
export const SCAFFOLD_LEVELS = ["FOUNDATION", "INTERMEDIATE", "ADVANCED"] as const;

export type ScaffoldLevel = (typeof SCAFFOLD_LEVELS)[number];

/** The level a reader who has never seen the worksheet must land on. */
export const DEFAULT_SCAFFOLD_LEVEL: ScaffoldLevel = "FOUNDATION";

/**
 * Which of a rung's voices this level prints.
 *
 * `value` and `label` are absent from this list deliberately — they are printed
 * at EVERY level and are not negotiable. A rung that printed neither would be a
 * rung the reader cannot identify, which is a removed fact wearing compression's
 * clothes.
 */
export interface RungVoices {
  /** "What actually arrived?" — the step's question, above its answer. */
  readonly question: boolean;
  /** The owner's own sentence about the answer it produced. */
  readonly basis: boolean;
  /** "divided: the bars from step 1 …" — the line that makes it long division. */
  readonly dividend: boolean;
  /** The greppable module name. */
  readonly owner: boolean;
  /** Why this room could not work the step. See the note on `absence` below. */
  readonly absence: boolean;
}

export interface ScaffoldedRung {
  readonly rung: WorksheetRung;
  readonly voices: RungVoices;
}

export interface ScaffoldedWorksheetVM {
  readonly level: ScaffoldLevel;
  /** The mockup's own panel title, kept verbatim. */
  readonly title: string;
  /** The mockup's own one-line promise for this level, kept verbatim. */
  readonly promise: string;
  /** The rungs this level draws, in worksheet order. */
  readonly shown: readonly ScaffoldedRung[];
  /**
   * Steps whose PROSE this level compressed away entirely — they are not drawn.
   * Never a fact the reader loses: the count below is stated on the surface and
   * this array names every one of them by number.
   */
  readonly withheldSteps: readonly number[];
  /** Carried from the source worksheet UNCHANGED at every level. */
  readonly readCount: number;
  /** Carried from the source worksheet UNCHANGED at every level. */
  readonly unreadCount: number;
  /** Total steps in the division. Identical at every level, by law. */
  readonly totalSteps: number;
  /**
   * The sentence that keeps this level honest — what it stopped printing, and
   * for which steps. Never empty, including at FOUNDATION, where it says so.
   */
  readonly disclosure: string;
}

const ALL_VOICES: RungVoices = {
  question: true,
  basis: true,
  dividend: true,
  owner: true,
  absence: true,
};

/**
 * INTERMEDIATE keeps `absence` and drops `question` / `dividend` / `owner`.
 *
 * That asymmetry is the whole decision. `question` and `dividend` are teaching
 * scaffolds — they explain what a step IS, which a returning reader already
 * knows. `absence` is not a teaching scaffold. It is the reason a rung is
 * blank, and a blank rung with no reason is indistinguishable from a zero.
 * Dropping it would be the first removed fact.
 */
const CORE_VOICES: RungVoices = {
  question: false,
  basis: true,
  dividend: false,
  owner: false,
  absence: true,
};

/**
 * ADVANCED prints the number and nothing else — no sentence, no owner, no
 * question. It is reached only by rungs that were actually READ, so `absence`
 * has nothing to say here and the flag is false rather than merely unused.
 */
const BARE_VOICES: RungVoices = {
  question: false,
  basis: false,
  dividend: false,
  owner: false,
  absence: false,
};

const TITLES: Record<ScaffoldLevel, string> = {
  FOUNDATION: "Full scaffolding — every step expanded",
  INTERMEDIATE: "Compressed to core dynamics",
  ADVANCED: "Geometry and efficiency only",
};

const PROMISES: Record<ScaffoldLevel, string> = {
  FOUNDATION: "Same skill. Deeper mastery. Less hand-holding.",
  INTERMEDIATE: "Same read. Same steps. Fewer words.",
  ADVANCED: "Pure signal. Maximum discretion.",
};

/**
 * `PROMISES.INTERMEDIATE` is the ONE line in Asset 12 that was rewritten.
 *
 * The mockup says "SAME READ. LESS STEPS. HIGHER OWNERSHIP." This surface does
 * not have fewer steps at any level and must never claim to, so the middle
 * clause is corrected to "Same steps. Fewer words." — which is both what the
 * code does and the promise a trader can actually hold it to. The refusal is
 * recorded here rather than silently applied, because the next operator reading
 * the mockup beside the running app will otherwise think it drifted.
 */
export const INTERMEDIATE_PROMISE_REFUSAL =
  'Asset 12 promises "LESS STEPS" at the intermediate level. This worksheet ' +
  "draws every step at every level — the count is the audit — so the promise is " +
  "printed as fewer WORDS instead. Compression removes words, never facts.";

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

function stepList(steps: readonly number[]): string {
  if (steps.length === 1) return `step ${steps[0]}`;
  return `steps ${steps.slice(0, -1).join(", ")} and ${steps[steps.length - 1]}`;
}

/**
 * Re-draw an already-compiled worksheet at one of the three scaffolding levels.
 *
 * Takes the compiled VM rather than the worksheet's inputs, so it is structurally
 * incapable of computing a market fact of its own — the reading at ADVANCED is
 * the SAME reading as at FOUNDATION, and there is no code path by which it could
 * be a different one.
 */
export function scaffoldWorksheet(
  vm: DivisionWorksheetVM,
  level: ScaffoldLevel,
): ScaffoldedWorksheetVM {
  const totalSteps = vm.rungs.length;

  // ADVANCED is the only level that draws a subset. It keeps the rungs whose
  // owner declared them QUANTITY **and** that were actually read — a blank
  // number rung at this level would be a bare label with nothing beside it,
  // which teaches nothing and is still counted in `unreadCount` below.
  const shownRungs: readonly WorksheetRung[] =
    level === "ADVANCED"
      ? vm.rungs.filter((r) => r.measures === "QUANTITY" && r.state === "READ")
      : vm.rungs;

  const voices =
    level === "FOUNDATION" ? ALL_VOICES : level === "INTERMEDIATE" ? CORE_VOICES : BARE_VOICES;

  const shownSteps = new Set(shownRungs.map((r) => r.step));
  const withheldSteps = vm.rungs.map((r) => r.step).filter((s) => !shownSteps.has(s));

  return {
    level,
    title: TITLES[level],
    promise: PROMISES[level],
    shown: shownRungs.map((rung) => ({ rung, voices })),
    withheldSteps,
    // THE INVARIANT. Read straight off the source at every level, never
    // recomputed from `shown` — recomputing is exactly how a compressed view
    // would start quietly reporting a smaller debt than the reading has.
    readCount: vm.readCount,
    unreadCount: vm.unreadCount,
    totalSteps,
    disclosure: disclosureFor(level, totalSteps, withheldSteps, vm.unreadCount),
  };
}

function disclosureFor(
  level: ScaffoldLevel,
  totalSteps: number,
  withheldSteps: readonly number[],
  unreadCount: number,
): string {
  if (level === "FOUNDATION") {
    return `All ${totalSteps} steps are drawn in full — question, answer, the owner's own words, and what each step divided.`;
  }

  if (level === "INTERMEDIATE") {
    return (
      `All ${totalSteps} steps are still drawn. Each step's question, the input it ` +
      "divided, and the module that owns it are not printed at this level — the " +
      "answers and the reasons behind them are."
    );
  }

  // ADVANCED — the only level that withholds whole rungs, so it is the only one
  // that owes the reader an exact account of which.
  const kept = totalSteps - withheldSteps.length;
  if (kept === 0) {
    return (
      `No step in this division produced a measured quantity, so this level has ` +
      `nothing to draw. All ${totalSteps} steps remain in the reading — ` +
      `${unreadCount} of them ${plural(unreadCount, "was", "were")} not worked in ` +
      "this room. Step back to see why."
    );
  }

  return (
    `${kept} of ${totalSteps} steps measured a quantity and are drawn as numbers ` +
    `only. The other ${withheldSteps.length} — ${stepList(withheldSteps)} — are ` +
    "still part of this reading and are not shown here: they answer in verdicts " +
    "or were not worked, and a verdict without its reasoning is the one thing " +
    `this worksheet refuses. ${unreadCount} of ${totalSteps} ` +
    `${plural(unreadCount, "step was", "steps were")} not worked in this room. ` +
    "Step back to see why."
  );
}
