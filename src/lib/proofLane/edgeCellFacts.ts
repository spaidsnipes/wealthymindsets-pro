/**
 * edgeCellFacts — the MEASURED JOURNAL block on /proof-lane.
 *
 * Same chain as pnlStatsFacts / tradeRowFacts / scannerMetricFacts /
 * marketMonitorFacts / optionChainCellFacts. This block is harder to excuse
 * than any of those, because the page it sits on is called the PROOF LANE and
 * the paragraph directly beneath it promises:
 *
 *     "Entries without R are counted but excluded from expectancy —
 *      never fabricated."
 *
 * That sentence is true of expectancy. It is not true of the line four rows
 * above it, and it is the exclusion itself — disclosed in one place, silent in
 * another — that does the damage.
 *
 * ── DEFECT ONE: TWO POPULATIONS WEARING ONE SENTENCE ─────────────────────
 *
 *     Winners: {measured.winners} · avg +{measured.avgWinnerR.toFixed(2)}R
 *
 * `winners` counts `result === "win"` over ALL entries.
 * `avgWinnerR` averages over R-TAGGED entries whose realizedR is positive.
 *
 * Two different denominators, rendered as one sentence with one count in front
 * of it. A trader with five winners of which two carry R reads
 * "Winners: 5 · avg +1.40R" and believes 1.40R is the average of five trades.
 * It is the average of two. Nothing on the screen says otherwise.
 *
 * The two populations can also DISAGREE outright rather than merely differ: an
 * entry graded "win" that carries realizedR = -0.2 is counted in `winners` and
 * averaged into `avgLoserR`. The grade and the arithmetic are separate facts
 * and WM is not entitled to let one stand in for the other.
 *
 * ROOT CAUSE: the denominator never left `selectSessionEdge`. `rWinners.length`
 * was computed and discarded. The surface could not have told the truth here
 * even if it had wanted to — which is why the fix begins in the selector.
 *
 * ── DEFECT TWO: A ZERO IS A SIGNED WIN ───────────────────────────────────
 *
 *     ${cumulativeR >= 0 ? "text-emerald-300" : "text-rose-300"}
 *     {cumulativeR >= 0 ? "+" : ""}{cumulativeR.toFixed(2)}R
 *
 * One `>= 0` drives BOTH the sign and the colour, so a session that closed
 * exactly flat — +1R and -1R, or a single scratch — renders
 *
 *     +0.00R   in GREEN
 *
 * A plus sign and a profit colour manufactured out of a null result. This is
 * the ZERO IS THE EMPTY STATE *AND* A MEASUREMENT defect in its second form:
 * here zero is not "no data", it is a REAL READING OF FLAT, and flat is
 * neither a win nor a loss. `>= 0` is not `> 0`, and neither one is "flat".
 * The same `>= 0` governs the Expectancy cell.
 *
 * ── DEFECT THREE: AN ABSENT EXPECTANCY PAINTED AS A LOSS ─────────────────
 *
 *     expectancyR != null && expectancyR >= 0 ? "text-emerald-300"
 *                                             : "text-rose-300"
 *
 * When `expectancyR` is undefined the `&&` is false and the ternary falls into
 * the ROSE branch: the cell renders "—" IN RED. An unknown expectancy coloured
 * as a losing one, on the page whose entire job is proof.
 *
 * HONEST NOTE ON REACHABILITY: the section is gated on `rTaggedEntries > 0`
 * and `expectancyR` is undefined exactly when `rTagged.length === 0`, so WM has
 * NOT observed this on screen and does not claim it has. It is a latent colour
 * claim living one gate-edit away from the display, and it is fixed here
 * because COLOUR IS A CLAIM whether or not today's gate happens to hide it.
 *
 * ── DEFECT FOUR: AN `&&` THAT DELETES THE CELL ───────────────────────────
 *
 *     {measured.avgWinnerR != null && (<> · avg …</>)}
 *
 * When there are winners but none of them carry R, the whole "· avg" clause
 * VANISHES. Not a dash, not a word — nothing. An absence rendered as no pixels
 * at all is the most invisible form of the em dash this chain has found: the
 * reader cannot tell that anything was withheld, so they cannot know to ask.
 *
 * ── DEFECT FIVE: A SCOPE UNSTATED IS A SCOPE ASSUMED ─────────────────────
 *
 *     Max Drawdown        0.00R
 *
 * This is peak-to-trough on the ordered R path of BROWSER-LOCAL, R-TAGGED
 * entries inside a 7-day window. It is labelled "Max Drawdown", which a trader
 * reads as their account's. And 0.00R is a genuine reading — it means no
 * trough formed among the entries WM could measure — so it cannot be refused;
 * it must be SCOPED.
 *
 * ── WHAT IS DELIBERATELY *NOT* CLAIMED ───────────────────────────────────
 *
 * Nothing here claims an edge exists, or that a positive expectancy over a
 * handful of browser-local entries predicts anything. Sample size is printed
 * beside every average for exactly that reason.
 *
 * Nothing here reconciles the `result` grade with the R arithmetic. When they
 * disagree WM reports both denominators and says they are different questions.
 * Silently preferring either one would be WM choosing which of the trader's
 * own records to believe.
 *
 * PURE — no clock, no I/O, no React.
 */

/** What a signed R figure is allowed to claim about itself. Drives colour. */
export type RTone =
  /** A measured figure strictly above zero. */
  | "GAIN"
  /** A measured figure strictly below zero. */
  | "LOSS"
  /** A measured figure of exactly zero. Neither a win nor a loss. */
  | "FLAT"
  /** Not a measurement at all. Must never be coloured as a result. */
  | "NONE";

export interface EdgeCellFact {
  /** What the cell says. Never a bare glyph, never a bare absence. */
  readonly text: string;
  /** True only when this cell is a reading. */
  readonly measured: boolean;
  /** The ONLY thing colour may be derived from. */
  readonly tone: RTone;
  /** Carried on both `title` and `aria-label`. */
  readonly reason: string;
}

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * THE FIX FOR DEFECT TWO — sign and colour stop sharing a `>= 0`.
 *
 * Exactly zero gets its own tone and its own prefix. A flat result is printed
 * as "0.00R", never "+0.00R", and is never coloured as a gain.
 */
export function rTone(value: unknown): RTone {
  if (!finite(value)) return "NONE";
  if (value > 0) return "GAIN";
  if (value < 0) return "LOSS";
  return "FLAT";
}

/** "+1.40R" / "-0.75R" / "0.00R". The `+` is earned, not assumed. */
export function formatR(value: number): string {
  const tone = rTone(value);
  return `${tone === "GAIN" ? "+" : ""}${value.toFixed(2)}R`;
}

/**
 * Cumulative R. A TOTAL switch with no `default`: a sixth tone cannot be
 * added without giving it a sentence.
 */
export function cumulativeRFact(cumulativeR: unknown, rTaggedEntries: number): EdgeCellFact {
  const tone = rTone(cumulativeR);
  const scope = `Summed over the ${rTaggedEntries} browser-local journal ${
    rTaggedEntries === 1 ? "entry that carries" : "entries that carry"
  } a realized R inside the 7-day window. Entries without R are not counted here at all — they are neither wins nor losses in this figure.`;
  switch (tone) {
    case "NONE":
      return {
        text: "No R to sum",
        measured: false,
        tone,
        reason: `WM has no usable realized-R total to report. ${scope}`,
      };
    case "FLAT":
      return {
        text: "0.00R",
        measured: true,
        tone,
        reason: `This session's R-tagged entries sum to exactly zero. That is a MEASUREMENT of flat, not an absence of one and not a gain: WM will not print a "+" in front of it or colour it as a profit. ${scope}`,
      };
    case "GAIN":
    case "LOSS":
      return {
        text: formatR(cumulativeR as number),
        measured: true,
        tone,
        reason: `Realized R summed across R-tagged entries. ${scope} This is a process figure in R units, not a currency result and not a brokerage-certified receipt.`,
      };
  }
}

/**
 * THE FIX FOR DEFECT THREE — an absent expectancy is not a losing one.
 */
export function expectancyFact(expectancyR: unknown, rTaggedEntries: number): EdgeCellFact {
  const tone = rTone(expectancyR);
  if (tone === "NONE") {
    return {
      text: "No R-tagged sample",
      measured: false,
      tone,
      reason: `Expectancy is R summed divided by the number of R-tagged entries, and WM has no R-tagged entries to divide by. This is an ABSENCE of a measurement, NOT a negative one: WM will not colour an unknown expectancy as a loss. Log a trade with a Planned R defined before entry and this fills in.`,
    };
  }
  const over = `Averaged over ${rTaggedEntries} R-tagged ${rTaggedEntries === 1 ? "entry" : "entries"} — a sample this small describes what WM recorded, not an edge it can vouch for.`;
  if (tone === "FLAT") {
    return {
      text: "0.00R",
      measured: true,
      tone,
      reason: `Expectancy is exactly zero across the R-tagged sample: the wins and losses cancel. That is a reading of flat, not a gain and not missing data. ${over}`,
    };
  }
  return {
    text: formatR(expectancyR as number),
    measured: true,
    tone,
    reason: `Expected value in R per R-tagged trade. ${over}`,
  };
}

/**
 * THE FIX FOR DEFECT FIVE — the scope is said out loud, including at zero.
 */
export function maxDrawdownFact(maxDrawdownR: unknown, rTaggedEntries: number): EdgeCellFact {
  if (!finite(maxDrawdownR) || rTaggedEntries <= 0) {
    return {
      text: "No R path to trace",
      measured: false,
      tone: "NONE",
      reason: `Drawdown is peak-to-trough along an ordered R path, and WM has no R-tagged entries to order. This is not a drawdown of zero — it is the absence of a path to measure one on.`,
    };
  }
  const scope = `Peak-to-trough along the ordered R path of the ${rTaggedEntries} browser-local R-tagged ${rTaggedEntries === 1 ? "entry" : "entries"} in the 7-day window. This is NOT an account drawdown and NOT a brokerage figure: it cannot see trades WM has no record of, positions still open, or anything outside this browser.`;
  if (maxDrawdownR === 0) {
    return {
      text: "0.00R",
      measured: true,
      tone: "FLAT",
      reason: `No trough formed: every point on the measured R path was at or above its running peak. That is a real reading, and it is only as wide as what WM could see. ${scope}`,
    };
  }
  return {
    text: `${maxDrawdownR.toFixed(2)}R`,
    measured: true,
    tone: "LOSS",
    reason: scope,
  };
}

/**
 * THE FIX FOR DEFECTS ONE AND FOUR — both denominators, always, out loud.
 *
 * `gradedCount` is the `result === "win" | "loss"` grade count over ALL
 * entries. `rSampleSize` is how many R-tagged entries actually went into the
 * average. They are printed together and never collapsed, and when they
 * differ the reason says which question each one answers.
 */
export function winLossLineFact(
  side: "win" | "loss",
  gradedCount: number,
  rSampleSize: number,
  avgR: unknown,
): EdgeCellFact {
  const noun = side === "win" ? "winner" : "loser";
  const plural = gradedCount === 1 ? noun : `${noun}s`;
  const head = `${gradedCount} ${plural} graded`;

  if (!finite(avgR) || rSampleSize <= 0) {
    return {
      text: `${head} · no R-tagged ${noun} to average`,
      measured: false,
      tone: "NONE",
      reason: `${gradedCount} ${plural === noun ? "entry is" : "entries are"} graded "${side}", but none of them carry a realized R, so there is nothing to average. WM is saying so rather than dropping the average silently — an average that simply disappears cannot be questioned by the reader who never saw it go.`,
    };
  }

  const avg = formatR(avgR as number);
  const mismatch =
    rSampleSize !== gradedCount
      ? ` THE TWO NUMBERS ON THIS LINE HAVE DIFFERENT DENOMINATORS: ${gradedCount} ${plural} by the grade recorded on the entry, ${rSampleSize} by realized R sign. The average is over the ${rSampleSize}, NOT the ${gradedCount}. A grade and an R figure are separate records and WM will not let one stand in for the other.`
      : ` Both numbers on this line share a denominator of ${gradedCount} here, but they answer different questions — the count is by the grade recorded on the entry, the average is by realized R sign — and they can diverge on the next entry.`;

  return {
    text: `${head} · avg ${avg} over ${rSampleSize} with R`,
    measured: true,
    tone: side === "win" ? "GAIN" : "LOSS",
    reason: `Average realized R across the R-tagged entries that closed ${side === "win" ? "positive" : "negative"}.${mismatch}`,
  };
}
