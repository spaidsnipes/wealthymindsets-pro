/**
 * selectFootprintWorksheet — Asset 18, ORDER FLOW LONG-DIVISION WORKSHEET.
 *
 * `WM_Transformation_UI_18_Order_Flow_Long_Division_Worksheet`
 *
 * THE MOCKUP IS ASSET 01 POINTED AT A SMALLER THING. Its seven steps are the
 * same seven — RAW EVIDENCE, PARTICIPATION, RESPONSE, EFFICIENCY, CONTEXT,
 * INTERPRETATION, MISSING EVIDENCE — and its footer is the same refused
 * `CAUTION + RIGHT OF WAY: WAIT`. The one genuinely new idea is the DIVIDEND:
 * Asset 01 divides the whole loaded window, Asset 18 divides ONE PRICE LEVEL.
 *
 * That is why this module emits `DivisionWorksheetVM` rather than a shape of
 * its own. The worksheet renderer and the Asset 12 scaffolding levels are
 * already correct for these seven steps; forking them would give the OS two
 * long-division surfaces that could drift apart, which is the failure the
 * worksheet exists to make visible. **One renderer, two divisions.**
 *
 * ── WHAT WAS TAKEN FROM THE PICTURE, AND WHAT WAS NOT ───────────────────────
 *
 * `421 × 532` is in this mockup too. It is not a market reading: Asset 01's
 * ledger already established those are the image generator's own canvas
 * dimensions, repeated across the asset set. The digits are banned from this
 * compiler's output by test, as they are in Asset 01.
 *
 * REFUSED, each with the reason:
 *
 *  · `ASK AGGRESSIVE (Likely Initiative)` — the tape states a SIDE. It does not
 *    state an INTENT. "Likely initiative" is a claim about what a participant
 *    was trying to do, and no feed in this repo carries it. The side survives;
 *    the intent does not.
 *  · `EFFICIENCY RATIO 0.68 (High Effort/Low Result)` — the ratio survives with
 *    its units named. The parenthetical grade does not: "high" and "low" are a
 *    verdict on a number whose scale nobody in this room has established.
 *  · `PREMIUM ZONE (Above Weekly VWAP)` — there is no weekly-VWAP owner here.
 *    Printing a zone name off an anchor this room cannot compute would be a
 *    fabricated location. What survives is where the level sits inside the
 *    range this room actually captured, which is arithmetic on observed prices.
 *  · `BEARISH ORDER BLOCK` — an unowned structure verdict.
 *  · `NET DELTA -111`, `VOLUME 953`, `CUM. VOL 7,312`, `18,552.25` — the
 *    mockup's footer figures. No owner, and they belong to the same fabricated
 *    set as the canvas dimensions.
 *  · `RIGHT OF WAY WAIT` — same owner, same absence, same refusal as Asset 01.
 *    Reused verbatim from that compiler rather than restated, so there is one
 *    place to change it.
 *
 * ── THE HONESTY THAT MATTERS MOST HERE ──────────────────────────────────────
 *
 * A footprint needs a SIGNED tape — every print carrying which side crossed the
 * spread. Most symbols this OS can reach do not carry one; crypto does, because
 * the venue states it. A worksheet whose every term reads `—` teaches nothing,
 * so when the tape is unsigned this compiler does not estimate a side. It reads
 * UNREAD on the rungs that need one and says which fact was missing. The
 * evidence debt is the product.
 */

import {
  DIVISION_WORKSHEET_VERSION,
  type DivisionWorksheetVM,
  type RungMeasure,
  type RungState,
  type WorksheetRung,
} from "@/lib/marketData/viewModels/selectDivisionWorksheet";

/**
 * The mockup's own words for the thing it refuses to let go of, kept so the
 * refusal can be asserted against the source rather than against a paraphrase.
 */
export const ASSET_18_INTENT_REFUSAL =
  'Asset 18 labels the imbalanced side "ASK AGGRESSIVE (Likely Initiative)". A ' +
  "tape states which side crossed the spread; it does not state what that " +
  "participant intended. The side is printed. The intent is not.";

export const ASSET_18_EFFICIENCY_GRADE_REFUSAL =
  'Asset 18 grades its efficiency ratio "(High Effort/Low Result)". The ratio ' +
  "is printed with its units named. The grade is not: nobody in this room has " +
  "established the scale that would make high and low mean anything.";

/**
 * ── BOTH CONSTANTS BELOW ARE SET BY A CEILING THIS MODULE DOES NOT OWN ──────
 *
 * `useWebSocket` retains `RECENT_TICK_RETENTION` prints — 2,000 — through
 * `retainRecentTicks`, the one named rule, locked by its own test. That is the
 * entire tape any consumer in the chart room can see, and it bounds this
 * worksheet completely.
 *
 * It is written down here because the numbers below are meaningless without it.
 * A later reader who widens the ladder to the mockup's apparent depth must
 * check that the held tape still puts enough prints in each bin — more bins
 * over the same evidence is a more confident-looking picture of less of it,
 * which is the precise failure this file exists to refuse. **If the retention
 * changes, re-check these two together and say so.**
 *
 * Both were sized against a 50-print ceiling. At 2,000 they are CONSERVATIVE,
 * not wrong: each is a floor on evidence, and a larger tape only clears the
 * floor more often. Widening the ladder is therefore now possible — and is a
 * decision about the product, not a correction owed by this file.
 */

/**
 * Six levels, not the deeper ladder the mockup draws. Sized so that, on a
 * thin tape, a level is still several prints and not one print with a grid
 * drawn over it.
 */
export const FOOTPRINT_LEVEL_COUNT = 6;

/**
 * Fewer prints than this and a per-level ladder is noise: a single trade in a
 * bin becomes a "100% one-sided level". Low enough that the worksheet appears
 * on a healthy tape rather than only on a saturated one. The threshold is a
 * reading about the tape, not a style preference, so it is named and exported.
 */
export const MIN_PRINTS_FOR_LADDER = 24;

export interface FootprintPrint {
  readonly price?: number | null;
  readonly size?: number | null;
  /** `buy` = buyer crossed (ask side). `sell` = seller crossed (bid side). */
  readonly side?: "buy" | "sell" | null | undefined;
  /** Only executed trades divide. Quotes and book updates are not prints. */
  readonly trade?: boolean;
}

export interface FootprintWorksheetInput {
  /**
   * The per-trade tape this room is holding, OLDEST-FIRST. Step 3 divides
   * against the last element as "the most recent print", so a newest-first
   * array silently divides against the oldest one. The stream holds its tape
   * newest-first by contract; `chronologicalTape` is the one owner of turning
   * it around.
   */
  readonly prints?: readonly FootprintPrint[] | null;
}

/** One rung of the price ladder — the shape Asset 18's right column draws. */
export interface FootprintLadderLevel {
  readonly priceLevel: number;
  /** Seller-initiated volume at this level. */
  readonly bid: number;
  /** Buyer-initiated volume at this level. */
  readonly ask: number;
  readonly total: number;
  /** 0 at the bottom of the captured range, 1 at the top. */
  readonly relPos: number;
}

export interface FootprintWorksheetVM extends DivisionWorksheetVM {
  /** The ladder the division was performed on. Empty when nothing was read. */
  readonly ladder: readonly FootprintLadderLevel[];
  /**
   * Index into `ladder` of the level this worksheet divided, or `null`. Stated
   * as an index rather than a copy so the surface cannot draw a selected level
   * that is not in the ladder beside it.
   */
  readonly selectedIndex: number | null;
  /** Why that level was the one divided. Never empty. */
  readonly selectionBasis: string;
}

/** Same absent owner as Asset 01. Named as a string, deliberately not imported. */
const ABSENT_OWNER = "decisionPermissionCompiler";

const RIGHT_OF_WAY_NOTE =
  "The mockup ends on CAUTION and RIGHT OF WAY: WAIT. Both are compiled by " +
  `${ABSENT_OWNER} from decision nodes this room has never held, so they are ` +
  "drawn here as a named absence rather than printed as a verdict.";

/**
 * FORMAT A QUANTITY WITHOUT EVER ROUNDING A REAL ONE AWAY.
 *
 * ── THE DEFECT THIS EXISTS TO FIX, AND HOW IT WAS FOUND ─────────────────────
 *
 * This was `maximumFractionDigits: 2`, which is correct for share counts and
 * silently wrong for every instrument whose size is fractional. On BTC it
 * rendered a level holding 0.0007 as `0`, so the LIVE worksheet read:
 *
 *     step 1  RAW EVIDENCE   bid 0 × ask 0
 *     step 2  PARTICIPATION  bid larger · 1,422.21×
 *
 * Both rungs were computed from the same two numbers, and they contradicted
 * each other on screen: step 1 said nothing traded, step 2 measured a
 * thousand-fold imbalance in the nothing. Step 2 was right. Step 1 was a
 * formatter.
 *
 * **It was found by Asset 11 reading the worksheet out loud.** The rungs sat
 * in separate boxes where the contradiction was easy to scroll past; the
 * teaching paragraph put them in one sentence, and one sentence cannot hold
 * both. That is the argument for the block, made by the block, on its first
 * live frame.
 *
 * ── THE RULE ────────────────────────────────────────────────────────────────
 *
 * A quantity that is not zero must never PRINT as zero. Rounding is a display
 * convenience; turning evidence into its own absence is not a convenience, it
 * is a false reading, and every downstream rung inherits it. So below one unit
 * the precision follows the magnitude instead of a fixed cap.
 */
export const formatQuantity = (n: number): string => {
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "0";
  if (Number.isInteger(n)) return n.toLocaleString("en-US");

  const magnitude = Math.abs(n);
  if (magnitude >= 1) {
    return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }

  // Below one unit, keep four significant digits. `0.0007` stays `0.0007`
  // rather than collapsing to `0`, and `0.00000031` still survives as a
  // number a reader can see is small but present.
  return n.toLocaleString("en-US", { maximumSignificantDigits: 4 });
};

const price = (n: number): string =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Bin signed prints into a price ladder.
 *
 * Exported because the ladder is a reading in its own right — the surface draws
 * it beside the worksheet — and because a binning rule that only exists inside
 * a compiler is a rule nobody can test against a hand-worked example.
 */
export function buildFootprintLadder(
  prints: readonly FootprintPrint[],
  levelCount: number = FOOTPRINT_LEVEL_COUNT,
): readonly FootprintLadderLevel[] {
  const signed = prints.filter(
    (p) =>
      p.trade !== false &&
      typeof p.price === "number" &&
      Number.isFinite(p.price) &&
      typeof p.size === "number" &&
      Number.isFinite(p.size) &&
      p.size > 0 &&
      (p.side === "buy" || p.side === "sell"),
  );
  if (signed.length < MIN_PRINTS_FOR_LADDER) return [];

  let lo = Infinity;
  let hi = -Infinity;
  for (const p of signed) {
    const v = p.price as number;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = hi - lo;
  // Every print at one price is a real tape, but it has no ladder — there is
  // one level and dividing it says nothing about where in the range it sat.
  if (!(span > 0)) return [];

  const bins = Math.max(1, Math.floor(levelCount));
  const width = span / bins;
  const acc = Array.from({ length: bins }, () => ({ bid: 0, ask: 0 }));
  for (const p of signed) {
    const i = Math.min(bins - 1, Math.floor(((p.price as number) - lo) / width));
    if (p.side === "buy") acc[i].ask += p.size as number;
    else acc[i].bid += p.size as number;
  }

  const out: FootprintLadderLevel[] = [];
  for (let i = 0; i < bins; i++) {
    const { bid, ask } = acc[i];
    if (bid + ask <= 0) continue;
    out.push({
      priceLevel: lo + i * width,
      bid,
      ask,
      total: bid + ask,
      relPos: bins === 1 ? 0 : i / (bins - 1),
    });
  }
  // Highest price first, the way a ladder is read.
  return out.sort((a, b) => b.priceLevel - a.priceLevel);
}

/**
 * THE SELECTION RULE, STATED RATHER THAN IMPLIED.
 *
 * The mockup shows "SELECTED FOOTPRINT" with no account of how it was chosen —
 * a picture can do that; a running surface cannot. Until a trader can click a
 * level, something must choose, and a surface that divides an arbitrary level
 * while calling it "selected" is lying by omission.
 *
 * The rule: the level whose two sides are furthest apart in absolute volume.
 * That is the level where the auction was most one-sided, which is the only
 * level where the remaining six steps have anything to divide. It is arithmetic
 * on observed volume — no ranking, no score, no hue.
 */
function selectLevel(ladder: readonly FootprintLadderLevel[]): number | null {
  if (ladder.length === 0) return null;
  let best = 0;
  let bestGap = -1;
  for (let i = 0; i < ladder.length; i++) {
    const gap = Math.abs(ladder[i].ask - ladder[i].bid);
    if (gap > bestGap) {
      bestGap = gap;
      best = i;
    }
  }
  return best;
}

interface RungSpec {
  readonly step: number;
  readonly label: string;
  readonly question: string;
  readonly dividend: string;
  readonly carriedFrom: number | null;
  readonly measures: RungMeasure;
  readonly owner: string;
}

/**
 * The seven steps, in the mockup's own order and with its own labels. Declared
 * as data so an UNREAD reading and a READ one cannot disagree about what the
 * division IS — only about how much of it was worked.
 */
const SPECS: readonly RungSpec[] = [
  {
    step: 1,
    label: "RAW EVIDENCE",
    question: "What actually traded at this price?",
    dividend: "the signed per-trade tape this room captured, binned to price levels",
    carriedFrom: null,
    measures: "QUANTITY",
    owner: "buildFootprintLadder",
  },
  {
    step: 2,
    label: "PARTICIPATION",
    question: "Which side crossed the spread here, and by how much?",
    dividend: "the bid and ask volume from step 1",
    carriedFrom: 1,
    measures: "QUANTITY",
    owner: "selectFootprintWorksheet",
  },
  {
    step: 3,
    label: "RESPONSE",
    question: "Where did price go after this level traded?",
    dividend: "the selected price against the last price on the captured tape",
    carriedFrom: 1,
    measures: "QUANTITY",
    owner: "selectFootprintWorksheet",
  },
  {
    step: 4,
    label: "EFFICIENCY",
    question: "How much displacement did that effort buy?",
    dividend: "the displacement from step 3 over the volume from step 1",
    carriedFrom: 3,
    measures: "QUANTITY",
    owner: "selectFootprintWorksheet",
  },
  {
    step: 5,
    label: "CONTEXT",
    question: "Where in the captured range did this happen?",
    dividend: "the selected price against the high and low of the captured tape",
    carriedFrom: 1,
    measures: "QUANTITY",
    owner: "selectFootprintWorksheet",
  },
  {
    step: 6,
    label: "INTERPRETATION",
    question: "What is the market communicating here?",
    dividend: "a narrative synthesis of steps 1 to 5",
    carriedFrom: 5,
    measures: "CATEGORY",
    owner: ABSENT_OWNER,
  },
  {
    step: 7,
    label: "MISSING EVIDENCE",
    question: "What do we still not know?",
    dividend: "the decision nodes this reading never had",
    carriedFrom: null,
    measures: "NONE",
    owner: ABSENT_OWNER,
  },
];

const rung = (
  spec: RungSpec,
  state: RungState,
  value: string | null,
  basis: string | null,
  absence: string | null,
): WorksheetRung => ({
  step: spec.step,
  label: spec.label,
  question: spec.question,
  dividend: spec.dividend,
  carriedFrom: spec.carriedFrom,
  measures: spec.measures,
  state,
  value,
  basis,
  owner: spec.owner,
  absence,
});

/**
 * Step 6 is UNREAD on every input and step 7 is UNREAD on every input. They are
 * drawn WHERE THE MOCKUP PUT THEM rather than omitted, because a worksheet that
 * silently stops at five steps teaches that the reading was complete.
 */
const INTERPRETATION_ABSENCE =
  `A narrative synthesis is a verdict, and it belongs to ${ABSENT_OWNER}, which ` +
  "compiles from decision nodes this room has never held. The five steps above " +
  "are the evidence it would have read; drawing a conclusion here without it " +
  "would mean inventing the one thing this worksheet exists to show the working of.";

const MISSING_EVIDENCE_ABSENCE =
  "The mockup names three gaps — delta, time of execution, follow-through " +
  "confirmation — as a fixed list. Which evidence is actually missing depends " +
  `on what a decision needed, and ${ABSENT_OWNER} is the owner of that question. ` +
  "A hardcoded list of three would be a picture of humility rather than the thing.";

export function selectFootprintWorksheet(
  input: FootprintWorksheetInput = {},
): FootprintWorksheetVM {
  const prints = input.prints ?? [];
  const ladder = buildFootprintLadder(prints);
  const selectedIndex = selectLevel(ladder);

  const tradeCount = prints.filter((p) => p.trade !== false).length;
  const signedCount = prints.filter(
    (p) => p.trade !== false && (p.side === "buy" || p.side === "sell"),
  ).length;

  // WHY THE LADDER IS EMPTY MATTERS. "No tape at all" and "a tape that does not
  // state a side" are different facts about the feed, and a trader repairs them
  // differently — one by waiting, one by changing symbol or venue.
  const absence =
    tradeCount === 0
      ? "No per-trade tape has reached this room yet, so there is nothing to divide. This view reads the live tape; bars loaded before the tape opened carry no prints."
      : signedCount === 0
        ? `${formatQuantity(tradeCount)} prints arrived, but none states which side crossed the spread. A footprint cannot be built from an unsigned tape, and estimating the side would make every number below a guess wearing the clothes of a measurement.`
        : signedCount < MIN_PRINTS_FOR_LADDER
          ? `${formatQuantity(signedCount)} signed prints is below the ${MIN_PRINTS_FOR_LADDER} this room requires before dividing a single price level. Under that, one trade in a bin reads as a wholly one-sided level.`
          : "The captured tape traded at a single price, so there is a tape but no ladder — every print landed in one level and the range steps have nothing to divide.";

  if (selectedIndex === null) {
    const rungs = SPECS.map((s) =>
      rung(s, "UNREAD", null, null, s.step >= 6 ? (s.step === 6 ? INTERPRETATION_ABSENCE : MISSING_EVIDENCE_ABSENCE) : absence),
    );
    return {
      version: DIVISION_WORKSHEET_VERSION,
      rungs,
      readCount: 0,
      unreadCount: rungs.length,
      reason: `None of the ${rungs.length} steps could be worked. ${absence}`,
      rightOfWayNote: RIGHT_OF_WAY_NOTE,
      ladder,
      selectedIndex: null,
      selectionBasis:
        "No level was selected, because no ladder was built. The reason is printed on every step rather than summarised once.",
    };
  }

  const lv = ladder[selectedIndex];
  const lo = ladder[ladder.length - 1].priceLevel;
  const hi = ladder[0].priceLevel;
  const span = hi - lo;

  // Step 3 divides against the LAST price on the captured tape — the most
  // recent thing this room actually saw. Not a close, not a quote: a print.
  const lastPrint = [...prints]
    .reverse()
    .find((p) => p.trade !== false && typeof p.price === "number" && Number.isFinite(p.price));
  const lastPrice = (lastPrint?.price ?? null) as number | null;

  const larger = lv.ask > lv.bid ? "ask" : lv.bid > lv.ask ? "bid" : null;
  const smallerVol = Math.min(lv.ask, lv.bid);
  const largerVol = Math.max(lv.ask, lv.bid);
  const ratio = smallerVol > 0 ? largerVol / smallerVol : null;

  const displacement = lastPrice === null ? null : lastPrice - lv.priceLevel;

  const rungs: WorksheetRung[] = [
    rung(
      SPECS[0],
      "READ",
      `bid ${formatQuantity(lv.bid)} × ask ${formatQuantity(lv.ask)}`,
      `at ${price(lv.priceLevel)} — ${formatQuantity(lv.total)} traded here out of ${formatQuantity(signedCount)} signed prints across ${ladder.length} levels`,
      null,
    ),
    larger === null
      ? rung(
          SPECS[1],
          "READ",
          "neither side larger",
          `bid and ask both took ${formatQuantity(lv.bid)} at this level — the auction balanced exactly`,
          null,
        )
      : rung(
          SPECS[1],
          "READ",
          ratio === null
            ? `${larger} only`
            : `${larger} larger · ${ratio.toLocaleString("en-US", { maximumFractionDigits: 2 })}×`,
          ratio === null
            ? `every unit at this level crossed on the ${larger}; the other side is absent, not small. The tape states the side it crossed on and nothing about intent.`
            : `the ${larger} side took ${formatQuantity(largerVol)} against ${formatQuantity(smallerVol)}. The tape states which side crossed the spread; it does not state what that participant was trying to do.`,
          null,
        ),
    displacement === null
      ? rung(
          SPECS[2],
          "UNREAD",
          null,
          null,
          "The captured tape carries no usable last price, so there is nothing to measure the level against.",
        )
      : rung(
          SPECS[2],
          "READ",
          `${displacement >= 0 ? "+" : "−"}${price(Math.abs(displacement))}`,
          `the last print on the captured tape came in at ${price(lastPrice as number)}, ${displacement >= 0 ? "above" : "below"} this level. This is where price IS, not where it went and returned from — the tape in this room is not replayed step by step.`,
          null,
        ),
    displacement === null || lv.total <= 0
      ? rung(
          SPECS[3],
          "UNREAD",
          null,
          null,
          "Efficiency divides step 3 by step 1, and step 3 was not worked.",
        )
      : rung(
          SPECS[3],
          "READ",
          `${((Math.abs(displacement) / lv.total) * 1000).toLocaleString("en-US", { maximumFractionDigits: 3 })} per 1,000`,
          `${price(Math.abs(displacement))} of displacement for ${formatQuantity(lv.total)} traded at this level. The unit is price per thousand units of volume, this tape only — there is no cross-symbol scale here, so the number ranks against nothing and is not graded.`,
          null,
        ),
    !(span > 0)
      ? rung(SPECS[4], "UNREAD", null, null, "The captured range has no height, so a position within it is undefined.")
      : rung(
          SPECS[4],
          "READ",
          `${(lv.relPos * 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}% of the captured range`,
          `${price(lo)} to ${price(hi)} is everything this room saw trade. The level sits ${lv.relPos >= 0.5 ? "above" : "below"} the middle of it. This is location inside the observed tape — not a premium or discount zone, which would need an anchor no owner here computes.`,
          null,
        ),
    rung(SPECS[5], "UNREAD", null, null, INTERPRETATION_ABSENCE),
    rung(SPECS[6], "UNREAD", null, null, MISSING_EVIDENCE_ABSENCE),
  ];

  const readCount = rungs.filter((r) => r.state === "READ").length;

  return {
    version: DIVISION_WORKSHEET_VERSION,
    rungs,
    readCount,
    unreadCount: rungs.length - readCount,
    reason: `${readCount} of ${rungs.length} steps were worked on one price level out of ${ladder.length}. The remaining ${rungs.length - readCount} name the owners that would have to answer them.`,
    rightOfWayNote: RIGHT_OF_WAY_NOTE,
    ladder,
    selectedIndex,
    selectionBasis:
      `Of ${ladder.length} levels on the captured ladder, this is the one whose two sides are furthest apart — ` +
      `${formatQuantity(largerVol)} against ${formatQuantity(smallerVol)}. Nothing clicked it; the rule is arithmetic on observed volume and is stated here because a surface that divides an arbitrary level while calling it "selected" is lying by omission.`,
  };
}

export default selectFootprintWorksheet;
