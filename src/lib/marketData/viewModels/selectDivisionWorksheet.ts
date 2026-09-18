/**
 * selectDivisionWorksheet — Asset 01, the Long-Division Market Worksheet.
 *
 * WHAT THE MOCKUP ASKS FOR, AND WHAT IT ACTUALLY DRAWS
 *
 * Asset 01 draws seven labelled rungs — RAW EVIDENCE, PARTICIPATION, RESPONSE,
 * EFFICIENCY, CONTEXT, INTERPRETATION, MISSING EVIDENCE — each with an arrow
 * pointing at a value, under the footer `CAUTION + RIGHT OF WAY: WAIT`.
 *
 * The values it prints are `421 × 532`, `421 × 532`, `421 × 423`, `421 × 532`,
 * `421 × 532`, `421 × 532`, `421 × 432`. Those are not readings. They are the
 * generator's own canvas dimensions, repeated seven times with two digits
 * transposed. **The mockup has no data in it at all.** Building "what the
 * picture shows" would have meant building seven identical placeholders.
 *
 * So what was taken from Asset 01 is its ONE real idea, which is a good one and
 * which nothing in this repo does yet: LONG DIVISION SHOWS ITS WORKING. Every
 * other surface in the chart room prints a conclusion. This one prints the
 * steps, in order, and — the part that makes it long division rather than a
 * list — each step NAMES WHAT IT DIVIDED. A trader can read down the page and
 * see the reading assembled out of the one before it.
 *
 * THE SEVENTH RUNG IS PERMANENTLY UNREAD, AND THAT IS THE POINT
 *
 * MISSING EVIDENCE and the `RIGHT OF WAY` footer are both owned by
 * `decisionPermissionCompiler`, which **is not in this room**. `ChartsDashboard`
 * does not import it; nothing on /charts compiles an evidence debt or a right
 * of way. Drawing either one here would mean minting a second owner of a fact
 * that already has one on /command-deck — the exact two-owners-of-one-fact
 * defect this codebase keeps paying for.
 *
 * Wiring the compiler into the chart room to fill the rung in would also be
 * wrong, and wrong in a way that is hard to see: the debt is compiled from
 * decision NODES the chart room has never had. It would have had to be
 * invented, and an invented input is worse than a blank rung.
 *
 * So the rung stays, labelled, with its owner named and a sentence saying where
 * that owner lives. A worksheet that quietly drew six of seven steps would
 * teach the reader the seventh was never asked for. It was asked for.
 *
 * THE EFFICIENCY RUNG MAY ONLY EVER CARRY ONE RATIO
 *
 * `selectAggressionResponse.ts` states in its own source that its `efficiency`
 * and `AbsorptionZone.efficiencyRatio` are reciprocal readings of a single
 * relationship and "must never be printed under the same label". Both owners
 * are in scope on this worksheet, so the prohibition is live here and is
 * asserted by test. This file reads `response.efficiency` and never touches
 * `anatomy.conviction.ratio`.
 */

import { formatMagnitude, formatRatio } from "@/lib/marketData/viewModels/measuredNumber";
import type { AbsorptionAnatomyViewVM } from "@/lib/marketData/viewModels/selectAbsorptionAnatomyView";
import type { AggressionResponseVM } from "@/lib/marketData/viewModels/selectAggressionResponse";
import type { ContinuationHealthVM } from "@/lib/marketData/viewModels/selectContinuationHealth";
import type { RegimeVM } from "@/lib/marketData/viewModels/selectRegime";

export const DIVISION_WORKSHEET_VERSION = 1;

export type RungState = "READ" | "UNREAD";

export interface WorksheetRung {
  /** 1-based position in the division, and the number the arrow carries. */
  readonly step: number;
  /** The mockup's own label, kept verbatim. */
  readonly label: string;
  /** The question this step answers, in a trader's words. */
  readonly question: string;
  /**
   * WHAT THIS STEP DIVIDED. The named input it consumed — the dividend. Stated
   * on every rung including the unread ones, because "what would have gone in
   * here" is exactly what a blank step needs to say.
   */
  readonly dividend: string;
  /**
   * The step whose output this one carried down, or `null` on the first rung
   * and on any rung that reads the raw window rather than a prior answer.
   */
  readonly carriedFrom: number | null;
  readonly state: RungState;
  /** The answer, in the owner's own terms. Null on an UNREAD rung. */
  readonly value: string | null;
  /** The owner's own sentence about that answer. Null on an UNREAD rung. */
  readonly basis: string | null;
  /** The module a reviewer can grep. Named on UNREAD rungs too. */
  readonly owner: string;
  /** Why this room could not work the step. Non-null exactly when UNREAD. */
  readonly absence: string | null;
}

export interface DivisionWorksheetVM {
  readonly version: typeof DIVISION_WORKSHEET_VERSION;
  readonly rungs: readonly WorksheetRung[];
  readonly readCount: number;
  readonly unreadCount: number;
  /** One honest line about the worksheet as a whole. Never empty. */
  readonly reason: string;
  /**
   * The mockup's `CAUTION + RIGHT OF WAY: WAIT` footer, refused and named.
   * A constant, because the refusal does not depend on the reading — the owner
   * is absent from this room no matter what the market is doing.
   */
  readonly rightOfWayNote: string;
}

export interface DivisionWorksheetInput {
  /** Candles loaded in the room. `null` when the series has not arrived. */
  readonly barCount?: number | null;
  /** Per-trade prints held in the room. `0` is a reading; `null` is not. */
  readonly tickCount?: number | null;
  readonly anatomy?: AbsorptionAnatomyViewVM | null;
  readonly response?: AggressionResponseVM | null;
  readonly regime?: RegimeVM | null;
  readonly continuation?: ContinuationHealthVM | null;
}

/**
 * The owner of MISSING EVIDENCE and of the footer. Named as a string rather
 * than imported, deliberately: importing it to name it would put the module in
 * the chart room's bundle and invite the next reader to "just call it".
 */
const ABSENT_OWNER = "decisionPermissionCompiler";

const ABSENT_OWNER_HOME =
  `${ABSENT_OWNER} compiles an evidence debt from decision nodes, and this room ` +
  "has none — it is wired on /command-deck, not on the chart. Nothing here can " +
  "state what is missing without inventing it.";

export const RIGHT_OF_WAY_NOTE =
  "Asset 01 ends on CAUTION + RIGHT OF WAY: WAIT. That verdict is owned by " +
  `computeRightOfWay in ${ABSENT_OWNER}, which reads an evidence debt this room ` +
  "does not compile. It is left blank rather than guessed: a permission printed " +
  "without its evidence is the one number on the worksheet a trader would act on.";

function read(
  base: Omit<WorksheetRung, "state" | "value" | "basis" | "absence">,
  value: string,
  basis: string,
): WorksheetRung {
  return { ...base, state: "READ", value, basis, absence: null };
}

function unread(
  base: Omit<WorksheetRung, "state" | "value" | "basis" | "absence">,
  absence: string,
): WorksheetRung {
  return { ...base, state: "UNREAD", value: null, basis: null, absence };
}

export function selectDivisionWorksheet(
  input: DivisionWorksheetInput = {},
): DivisionWorksheetVM {
  const { anatomy, response, regime, continuation } = input;
  const barCount = input.barCount ?? null;
  const tickCount = input.tickCount ?? null;

  const rungs: WorksheetRung[] = [];

  // ── 1. RAW EVIDENCE ──────────────────────────────────────────────────────
  // The only rung with no dividend. Nothing has been interpreted yet; this is
  // the pile everything below is divided out of.
  const rawBase = {
    step: 1,
    label: "RAW EVIDENCE",
    question: "What actually arrived?",
    dividend: "the symbol and timeframe you selected",
    carriedFrom: null,
    owner: "ChartsDashboard loaded series",
  };
  // COUNTS ARE FORMATTED HERE, NOT BY `measuredNumber`. That module owns
  // quantities whose SCALE the surface cannot know, and says so in its own
  // header: counts are explicitly disclaimed. A bar count is an integer and
  // grouping is the whole job.
  rungs.push(
    barCount == null
      ? unread(rawBase, "No candle series has loaded for this symbol yet.")
      : read(
          rawBase,
          tickCount == null
            ? `${barCount.toLocaleString("en-US")} bars`
            : `${barCount.toLocaleString("en-US")} bars, ${tickCount.toLocaleString("en-US")} prints`,
          tickCount === 0
            ? "candles arrived; this feed carried no per-trade prints"
            : "nothing here has been interpreted — it is what the feed delivered",
        ),
  );

  // ── 2. PARTICIPATION ─────────────────────────────────────────────────────
  // The bars, split by which side initiated. Null on an unsigned tape, and an
  // unsigned tape is a FACT about the venue rather than a failure to try.
  const partBase = {
    step: 2,
    label: "PARTICIPATION",
    question: "Who was pressing, and how hard?",
    dividend: "the bars from step 1, split by which side initiated each trade",
    carriedFrom: 1,
    owner: "selectAbsorptionAnatomyView",
  };
  const buy = anatomy?.aggression.buyInitiated ?? null;
  const sell = anatomy?.aggression.sellInitiated ?? null;
  if (anatomy && buy != null && sell != null) {
    const led = buy === sell ? "neither side led" : buy > sell ? "buyers led" : "sellers led";
    rungs.push(
      read(
        partBase,
        `${formatMagnitude(buy)} bought / ${formatMagnitude(sell)} sold`,
        // The owner's own line, carried verbatim after the finding. It opens
        // with the effort provenance, which is the disclosure that keeps a
        // reconstructed side from reading as a stated one.
        `${led} across ${anatomy.windowBars} bars — ${anatomy.reason}`,
      ),
    );
  } else {
    rungs.push(
      unread(
        partBase,
        anatomy
          ? "This tape does not state which side initiated, so the bars cannot be split into buyers and sellers."
          : "No absorption reading is available for this window.",
      ),
    );
  }

  // ── 3. RESPONSE ──────────────────────────────────────────────────────────
  const respBase = {
    step: 3,
    label: "RESPONSE",
    question: "What did price DO about it?",
    dividend: "the same bars, measured for signed displacement",
    carriedFrom: 2,
    owner: "selectAggressionResponse",
  };
  if (response?.measured && response.meanResponse != null) {
    const dir =
      response.meanResponse > 0 ? "up" : response.meanResponse < 0 ? "down" : "nowhere";
    rungs.push(
      read(
        respBase,
        `${formatMagnitude(response.meanResponse)} per bar, ${dir}`,
        response.aggressionAxisNote,
      ),
    );
  } else {
    rungs.push(
      unread(
        respBase,
        "No bar in this window carried enough to measure a displacement against.",
      ),
    );
  }

  // ── 4. EFFICIENCY ────────────────────────────────────────────────────────
  // ONE ratio. See the file header — the reciprocal on `anatomy.conviction` is
  // never read here, and a test asserts it.
  const effBase = {
    step: 4,
    label: "EFFICIENCY",
    question: "Was the move paid for?",
    dividend: "step 3 divided by step 2, both normalised to this window",
    carriedFrom: 3,
    owner: "selectAggressionResponse",
  };
  if (response?.efficiency != null) {
    rungs.push(
      read(effBase, `${formatRatio(response.efficiency)}×`, response.efficiencyScaleNote),
    );
  } else {
    rungs.push(
      unread(
        effBase,
        "The window spent no measurable effort, and dividing by nothing is not a zero.",
      ),
    );
  }

  // ── 5. CONTEXT ───────────────────────────────────────────────────────────
  const ctxBase = {
    step: 5,
    label: "CONTEXT",
    question: "What KIND of market was that in?",
    dividend: "the same window, read against the regime it printed in",
    carriedFrom: null,
    owner: "selectRegime",
  };
  if (regime && regime.verdict !== "UNKNOWN") {
    rungs.push(read(ctxBase, regime.verdict, regime.narrative));
  } else {
    rungs.push(
      unread(
        ctxBase,
        regime?.reason ?? "No dimension has verified evidence, so no regime was reached.",
      ),
    );
  }

  // ── 6. INTERPRETATION ────────────────────────────────────────────────────
  const interpBase = {
    step: 6,
    label: "INTERPRETATION",
    question: "Does any of it hang together?",
    dividend: "step 5 read against the swing sequence the candles printed",
    carriedFrom: 5,
    owner: "selectContinuationHealth",
  };
  if (continuation && continuation.health !== "UNREADABLE") {
    rungs.push(read(interpBase, continuation.health, continuation.reason));
  } else {
    rungs.push(
      unread(
        interpBase,
        continuation?.reason ??
          "Neither owner produced a reading, so there is no continuation to judge.",
      ),
    );
  }

  // ── 7. MISSING EVIDENCE ──────────────────────────────────────────────────
  // UNREAD unconditionally. Not a state — a fact about which room this is.
  rungs.push(
    unread(
      {
        step: 7,
        label: "MISSING EVIDENCE",
        question: "What would change the answer if you had it?",
        dividend: "the decision nodes a permission is compiled from",
        carriedFrom: null,
        owner: ABSENT_OWNER,
      },
      ABSENT_OWNER_HOME,
    ),
  );

  const readCount = rungs.filter((r) => r.state === "READ").length;
  const unreadCount = rungs.length - readCount;

  return {
    version: DIVISION_WORKSHEET_VERSION,
    rungs,
    readCount,
    unreadCount,
    reason:
      readCount === 0
        ? `None of the ${rungs.length} steps could be worked in this room; each blank rung names the owner that would have to answer it.`
        : `${readCount} of ${rungs.length} steps were worked here. The remaining ${unreadCount} ${
            unreadCount === 1
              ? "names the owner that would have to answer it."
              : "name the owners that would have to answer them."
          }`,
    rightOfWayNote: RIGHT_OF_WAY_NOTE,
  };
}
