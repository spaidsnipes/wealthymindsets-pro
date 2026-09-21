/**
 * selectEffortVsResult — FL-06, plate object ④.
 *
 * `WM_FL_06_ORDERFLOW_ON_CHART.jpg` draws a small two-line callout against a
 * candle:
 *
 *   Effort: High
 *   Result: Weak
 *
 * That is the oldest reading in tape analysis and the plate is right to want it
 * on the glass. It is also the reading that is easiest to fake, for a reason
 * worth stating before any code: **"high" and "weak" are not properties of a
 * bar.** They are comparisons. A bar trading 4,000 contracts is enormous on one
 * instrument and a rounding error on another, and enormous at 03:00 is ordinary
 * at the open. A compiler that hard-coded a threshold would be printing a
 * verdict about a cohort it never looked at.
 *
 * So this module refuses to read a single bar. It reads a bar AGAINST A COHORT
 * of the bars before it, and if the cohort is not there, it says so instead of
 * falling back to a constant.
 *
 * ── WHAT EFFORT IS, AND WHAT RESULT IS ─────────────────────────────────────
 *
 * EFFORT is the bar's traded volume. It comes from the bar, which this room has
 * in abundance — unlike the per-trade tape, which `selectInspectTicket` must
 * refuse on nearly every bar because `useWebSocket` retains 50 live prints.
 * That is precisely why this atom is worth building now: it READS where the
 * tape-bound atoms must refuse.
 *
 * RESULT is NET DISPLACEMENT — `|close − open|` — not range. The distinction is
 * the entire reading. A bar that travels forty points and closes where it
 * opened has spent its effort and achieved nothing; scoring it by range would
 * call that a strong result and inverts the meaning of the panel.
 *
 * Both are then compared to the MEDIAN of the cohort, not the mean. One
 * halt-reopen print or one news bar drags a mean far enough to relabel every
 * bar around it; a median shrugs. And the subject bar is EXCLUDED from its own
 * cohort — otherwise a genuinely enormous bar inflates the baseline it is being
 * judged against and grades itself down toward ordinary.
 *
 * ── THE REFUSAL THAT MATTERS MOST: THIS DOES NOT DIAGNOSE ──────────────────
 *
 * High effort with a weak result is the pattern traders call absorption. This
 * compiler will not say that word, and the restraint is deliberate.
 *
 * Volume and displacement cannot distinguish absorption — a passive side
 * soaking an aggressive one — from an auction with no interest on either side,
 * from a bar cut in half by a halt, from two large participants crossing with
 * each other. Those have different futures and the same footprint in these two
 * numbers. `selectAbsorption.ts` owns that diagnosis and reads the inputs that
 * can support it.
 *
 * What this module emits is an OBSERVATION with a named shape, plus a sentence
 * saying what it does not know. A trader told "effort was high and the result
 * was weak, and this reading cannot tell you why" is armed. A trader told
 * "absorption" by a module that measured no aggressor is misled by the most
 * confident-sounding word on the chart.
 *
 * ── REFUSED FROM THE PLATE, WITH REASONS ───────────────────────────────────
 *
 *  · The plate shows the callout with no cohort and no window stated. A reading
 *    that is a comparison must publish what it compared against, so this emits
 *    `cohortSize` and `lookbackNote` and the renderer is expected to show it.
 *  · No percentage is emitted for either axis. The ratio behind the verdict IS
 *    published (`effortRatio`, `resultRatio`) because a reviewer must be able
 *    to audit the grade — but the VERDICT is a word, per Build Order §9, and a
 *    verdict may never be graded in hue.
 *
 * PURE. DETERMINISTIC. No React, no IO, no clock. Nothing here renders.
 */

export const EFFORT_VS_RESULT_VERSION = 1;

/** The same two-state vocabulary the ticket and the worksheets use. */
export type EffortResultState = "READ" | "UNREAD";

/** Where the subject bar sits against its cohort, in words. */
export type EffortGrade = "HIGH" | "AVERAGE" | "LOW";
export type ResultGrade = "STRONG" | "AVERAGE" | "WEAK";

/**
 * The named shapes this reading can take. `NOTABLE_*` are the two corners the
 * plate's callout exists to catch; the rest are stated plainly so the panel
 * never implies significance it did not find.
 */
export type EffortResultShape =
  /** Much was spent, little was achieved. The plate's own case. */
  | "HIGH_EFFORT_WEAK_RESULT"
  /** Little was spent, much was achieved — a thin, unopposed move. */
  | "LOW_EFFORT_STRONG_RESULT"
  /** Effort and result agree. Ordinary, and said so. */
  | "PROPORTIONATE"
  /** Read, but neither axis stood out. */
  | "UNREMARKABLE"
  /** Not read at all. */
  | "UNREAD";

export interface EffortResultRow {
  readonly id: "EFFORT" | "RESULT";
  readonly label: string;
  readonly state: EffortResultState;
  /** The verdict WORD. Non-null exactly when READ. Never a percentage. */
  readonly value: string | null;
  /** What was measured to get it, in this module's own words. */
  readonly basis: string | null;
  /** Why it could not be read. Non-null exactly when UNREAD. */
  readonly absence: string | null;
  readonly owner: string;
}

export interface EffortVsResultVM {
  readonly version: typeof EFFORT_VS_RESULT_VERSION;
  readonly state: EffortResultState;
  readonly shape: EffortResultShape;
  /** One line naming the reading. Never empty, READ or not. */
  readonly headline: string;
  readonly rows: readonly EffortResultRow[];
  readonly effort: EffortGrade | null;
  readonly result: ResultGrade | null;
  /** Subject volume ÷ cohort median volume. Published so the grade is auditable. */
  readonly effortRatio: number | null;
  /** Subject displacement ÷ cohort median displacement. */
  readonly resultRatio: number | null;
  /** How many bars the comparison actually used, excluding the subject. */
  readonly cohortSize: number;
  /** What this was compared against. Never empty — a comparison must say so. */
  readonly lookbackNote: string;
  /**
   * WHAT THIS READING CANNOT TELL YOU. Never empty, even when READ — especially
   * when READ, because that is when a trader is most likely to over-read it.
   */
  readonly limitNote: string;
}

export interface EffortResultBar {
  /** The bar's traded volume. EFFORT. */
  readonly volume?: number | null;
  readonly open?: number | null;
  readonly close?: number | null;
}

export interface EffortVsResultInput {
  /** The bar being judged. */
  readonly bar?: EffortResultBar | null;
  /**
   * The bars BEFORE the subject, most recent last. The subject must not appear
   * here; see the header on self-inflated baselines.
   */
  readonly priorBars?: readonly EffortResultBar[] | null;
  /**
   * TRUE WHEN THE SUBJECT BAR HAS NOT CLOSED YET.
   *
   * Found from use, on the serving chart: the live bar was 37 seconds old and
   * the panel read "Effort: LOW — this bar traded 0, the median of the 1051
   * bars before it is 793." Every word of that arithmetic was correct and the
   * conclusion was false. The bar had not traded 0 because effort was low; it
   * had traded 0 because it had barely begun.
   *
   * A forming bar's volume is a PARTIAL count being compared against 1051
   * COMPLETED counts, and a partial compared against completed is not a
   * comparison — it is a category error with a confident face on it. The
   * product's own truth law names this one: PARTIAL != COMPLETE.
   *
   * It is the caller's job to know this, because the compiler may not read a
   * clock. Callers that cannot tell should pass `true`: the cost of being
   * wrong in that direction is a refusal, and the cost of being wrong in the
   * other direction is a fabricated verdict.
   */
  readonly subjectIsForming?: boolean | null;
}

/**
 * A median needs enough bars that one outlier cannot be the median. Twenty is
 * the smallest cohort at which the middle value is a description of the session
 * rather than an accident of which two bars happened to load — and on a 5m
 * chart it is a little over an hour and a half, which is a window a trader can
 * actually hold in mind when reading the verdict.
 *
 * Exported because it is a property of the reading, not a preference.
 */
export const MIN_BARS_FOR_COHORT = 20;

/**
 * How far from the median a bar must sit before it earns a word other than
 * AVERAGE. These are wide on purpose. A boundary at 1.1× would relabel the
 * panel on noise, and a verdict that flickers teaches a trader to ignore it.
 */
export const HIGH_RATIO = 1.5;
export const LOW_RATIO = 0.6;

const OWNER = "selectEffortVsResult";

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

/** Median of a non-empty ascending-sortable list. Even counts average the pair. */
const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

const row = (
  id: "EFFORT" | "RESULT",
  label: string,
  read: { value: string; basis: string } | null,
  absence: string,
): EffortResultRow =>
  read
    ? { id, label, state: "READ", value: read.value, basis: read.basis, absence: null, owner: OWNER }
    : { id, label, state: "UNREAD", value: null, basis: null, absence, owner: OWNER };

/**
 * THE SENTENCE THIS MODULE IS MOST AT RISK OF NOT SAYING.
 *
 * See the header. High effort with a weak result is the absorption pattern, and
 * naming it here would be asserting a mechanism these two numbers cannot
 * separate from three other mechanisms with the same signature.
 */
const LIMIT_NOTE =
  "This reading compares volume and net displacement. It cannot tell you WHY " +
  "they disagreed — a passive side absorbing, an auction nobody wanted, or a " +
  "halt cutting the bar short all look the same in these two numbers.";

const gradeEffort = (ratio: number): EffortGrade =>
  ratio >= HIGH_RATIO ? "HIGH" : ratio <= LOW_RATIO ? "LOW" : "AVERAGE";

const gradeResult = (ratio: number): ResultGrade =>
  ratio >= HIGH_RATIO ? "STRONG" : ratio <= LOW_RATIO ? "WEAK" : "AVERAGE";

const unread = (
  headline: string,
  effortAbsence: string,
  resultAbsence: string,
  cohortSize: number,
  lookbackNote: string,
): EffortVsResultVM => ({
  version: EFFORT_VS_RESULT_VERSION,
  state: "UNREAD",
  shape: "UNREAD",
  headline,
  rows: [
    row("EFFORT", "Effort", null, effortAbsence),
    row("RESULT", "Result", null, resultAbsence),
  ],
  effort: null,
  result: null,
  effortRatio: null,
  resultRatio: null,
  cohortSize,
  lookbackNote,
  limitNote: LIMIT_NOTE,
});

export function selectEffortVsResult(input: EffortVsResultInput): EffortVsResultVM {
  const bar = input.bar ?? null;
  const priorRaw = Array.isArray(input.priorBars) ? input.priorBars : [];

  /* ── THE SUBJECT ────────────────────────────────────────────────────────── */

  const subjVolume =
    bar && isFiniteNumber(bar.volume) && bar.volume >= 0 ? bar.volume : null;
  const subjDisplacement =
    bar && isFiniteNumber(bar.open) && isFiniteNumber(bar.close)
      ? Math.abs((bar.close as number) - (bar.open as number))
      : null;

  if (bar === null) {
    return unread(
      "No bar selected, so there is nothing to weigh effort against.",
      "No bar was supplied to read a volume from.",
      "No bar was supplied to read an open and a close from.",
      0,
      "Nothing was compared, because there was no subject bar.",
    );
  }

  /* ── THE COHORT ─────────────────────────────────────────────────────────── */

  const cohortVolumes = priorRaw
    .map(b => (isFiniteNumber(b.volume) && b.volume >= 0 ? b.volume : null))
    .filter((v): v is number => v !== null);

  const cohortDisplacements = priorRaw
    .map(b =>
      isFiniteNumber(b.open) && isFiniteNumber(b.close)
        ? Math.abs((b.close as number) - (b.open as number))
        : null,
    )
    .filter((v): v is number => v !== null);

  const cohortSize = Math.min(cohortVolumes.length, cohortDisplacements.length);

  const lookbackNote =
    cohortSize > 0
      ? `Compared against the median of the ${cohortSize} bars before it on this chart.`
      : "Nothing was compared, because no earlier bars on this chart carried a volume and a close.";

  /*
    THE BAR THAT HAS NOT FINISHED HAPPENING YET.

    This refusal is placed AFTER the cohort is counted so the note can still
    name what WOULD have been compared — a trader waiting on a bar deserves to
    know the comparison is ready and only the subject is not.

    Unlike the thin-cohort refusal below, this one RESOLVES ON ITS OWN, and the
    sentence says so. The distinction is the whole reason this product writes
    absences as sentences instead of spinners: "wait" and "this will never
    resolve" are opposite instructions and a spinner means both.
  */
  if (input.subjectIsForming === true) {
    const why =
      "This bar has not closed yet. Its volume and its move so far are a " +
      `partial count, and weighing a partial bar against ${cohortSize} finished ` +
      "ones would grade it low for being young rather than for being weak. " +
      "This resolves on its own when the bar closes — or hover a finished " +
      "candle to weigh that one now.";
    return unread(
      "This bar is still forming, so there is nothing settled to weigh yet.",
      why,
      why,
      cohortSize,
      lookbackNote,
    );
  }

  if (cohortSize < MIN_BARS_FOR_COHORT) {
    /*
      NOT A LOADING STATE, AND THE SENTENCE SAYS WHICH. A trader who scrolls to
      the first bars of a series will sit here forever; one who just opened the
      chart will not. The difference matters, so it is stated rather than left
      to a spinner that means "wait" in both cases.
    */
    const why =
      `A high or low reading is a comparison, and this chart is holding ` +
      `${cohortSize} earlier ${cohortSize === 1 ? "bar" : "bars"} — fewer than the ` +
      `${MIN_BARS_FOR_COHORT} needed for a median that describes the session ` +
      `rather than an accident. Scroll back or load more history; this will not ` +
      `resolve on its own.`;
    return unread(
      "Effort and result are comparisons, and there is not enough chart to compare against.",
      why,
      why,
      cohortSize,
      lookbackNote,
    );
  }

  const medVolume = median(cohortVolumes);
  const medDisplacement = median(cohortDisplacements);

  /* ── EFFORT ─────────────────────────────────────────────────────────────── */

  /*
    THE CASE THE LIVE CHART HANDED US. On a futures symbol whose bars carry no
    volume the median is 0, and every ratio would be a division by zero — which
    in JavaScript is `Infinity`, a number that would have graded every single
    bar HIGH without ever throwing. A silent Infinity is exactly the shape of
    defect this product keeps repairing: confident, well-formed, and false.
  */
  let effortRow: EffortResultRow;
  let effort: EffortGrade | null = null;
  let effortRatio: number | null = null;

  if (subjVolume === null) {
    effortRow = row("EFFORT", "Effort", null, "This bar carries no volume, so no effort was recorded to weigh.");
  } else if (medVolume <= 0) {
    effortRow = row(
      "EFFORT",
      "Effort",
      null,
      "Every earlier bar on this chart reports zero volume, so there is no " +
        "scale to call this bar's effort high or low against.",
    );
  } else {
    effortRatio = subjVolume / medVolume;
    effort = gradeEffort(effortRatio);
    effortRow = row(
      "EFFORT",
      "Effort",
      {
        value: effort,
        basis: `This bar traded ${subjVolume}; the median of the ${cohortSize} bars before it is ${medVolume}.`,
      },
      "",
    );
  }

  /* ── RESULT ─────────────────────────────────────────────────────────────── */

  let resultRow: EffortResultRow;
  let result: ResultGrade | null = null;
  let resultRatio: number | null = null;

  if (subjDisplacement === null) {
    resultRow = row(
      "RESULT",
      "Result",
      null,
      "This bar is missing an open or a close, so the distance price actually " +
        "travelled cannot be measured.",
    );
  } else if (medDisplacement <= 0) {
    resultRow = row(
      "RESULT",
      "Result",
      null,
      "Every earlier bar on this chart opened and closed at the same price, so " +
        "there is no scale to call this bar's result strong or weak against.",
    );
  } else {
    resultRatio = subjDisplacement / medDisplacement;
    result = gradeResult(resultRatio);
    resultRow = row(
      "RESULT",
      "Result",
      {
        value: result,
        basis:
          `This bar closed ${subjDisplacement} from where it opened; the median ` +
          `move of the ${cohortSize} bars before it is ${medDisplacement}.`,
      },
      "",
    );
  }

  /* ── THE SHAPE, AND WHAT IT IS NOT ──────────────────────────────────────── */

  if (effort === null || result === null) {
    return {
      version: EFFORT_VS_RESULT_VERSION,
      state: "UNREAD",
      shape: "UNREAD",
      headline:
        "Only one side of this reading could be taken, and one side is not a comparison.",
      rows: [effortRow, resultRow],
      effort,
      result,
      effortRatio,
      resultRatio,
      cohortSize,
      lookbackNote,
      limitNote: LIMIT_NOTE,
    };
  }

  let shape: EffortResultShape;
  let headline: string;

  if (effort === "HIGH" && result === "WEAK") {
    shape = "HIGH_EFFORT_WEAK_RESULT";
    headline =
      "Heavy volume moved price less than usual. Something met this bar, and " +
      "this reading cannot tell you what.";
  } else if (effort === "LOW" && result === "STRONG") {
    shape = "LOW_EFFORT_STRONG_RESULT";
    headline =
      "Price moved further than usual on lighter volume than usual. Little " +
      "stood in the way, and this reading cannot tell you whether that lasts.";
  } else if (effort === result || (effort === "AVERAGE" && result === "AVERAGE")) {
    /* HIGH/STRONG and LOW/WEAK never satisfy `effort === result` — the two
       vocabularies do not share words on purpose, so agreement is named. */
    shape = "PROPORTIONATE";
    headline = "Effort and result were proportionate for this chart.";
  } else if (
    (effort === "HIGH" && result === "STRONG") ||
    (effort === "LOW" && result === "WEAK")
  ) {
    shape = "PROPORTIONATE";
    headline = "Effort and result were proportionate for this chart.";
  } else {
    shape = "UNREMARKABLE";
    headline = "Neither the effort nor the result stood out against this chart.";
  }

  return {
    version: EFFORT_VS_RESULT_VERSION,
    state: "READ",
    shape,
    headline,
    rows: [effortRow, resultRow],
    effort,
    result,
    effortRatio,
    resultRatio,
    cohortSize,
    lookbackNote,
    limitNote: LIMIT_NOTE,
  };
}

export default selectEffortVsResult;
