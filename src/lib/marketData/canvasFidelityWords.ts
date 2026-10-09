import type { FidelityReason, MarketFidelity } from "./marketFidelityAlgebra";
import type { CanvasUngraded } from "./readCanvasHonesty";

/*
  WHAT THE HONESTY PLAQUE GRADES, IN TRADER WORDS — one owner.

  Read on serving b94f28c at 390 (ticket lane, 2026-10-09): one band, two cells —
      MARKET   NQ1! · 5m · LIVE · asOf 1:22:18 PM CDT
      PLAQUE   UNMEASURED — No fidelity has been established for this canvas.
  and, a minute later on the same market —
      PLAQUE   INDICATIVE — No reason recorded against this reading.
  Each sentence was true about its own subject. Side by side they read as a
  contradiction, because the plaque never said WHAT it grades. The MARKET cell
  words the FEED (is a live quote arriving). The plaque grades the CANVAS: is
  the price drawn on this chart one you can act on, and what is missing.

  So the plaque names its subject ("Canvas fidelity"), every grade carries one
  sentence saying what it means and what is missing, and an ungraded canvas
  says which question is still open. These are the only spellings; the plaque
  and the phone chip both read them.
*/

/** The label that names the plaque's subject. */
export const CANVAS_FIDELITY_LABEL = "Canvas fidelity";

/** What the feed word beside the plaque is about — printed when the two could be confused. */
export const FEED_WORD_IS_SEPARATE = "The MARKET cell's word is about the feed; this grades the chart.";

/** One sentence per grade: what it means for the price on this chart, and what is missing. */
export const CANVAS_FIDELITY_MEANING: Readonly<Record<MarketFidelity, string>> = Object.freeze({
  INDICATIVE: "A real observed price to read. Not a price a connected broker has quoted for an order.",
  EXECUTABLE: "The price on this chart is the one the connected broker will use for an order.",
  PARTIAL: "The bars are sound; part of the picture is missing — a live quote or the full tape.",
  DEGRADED: "Admitted with a known fault — late, or from a narrower source than the full market.",
  STALE: "Too old to read as now. The chart is dimmed; do not act on it.",
});

/** A recorded reason, in trader words. The raw key stays in the test id. */
export const FIDELITY_REASON_WORDS: Readonly<Record<FidelityReason, string>> = Object.freeze({
  QUARANTINED: "Nothing was admitted — there is no price to draw.",
  CONFLICT: "Two sources disagreed; one was chosen.",
  SYNTHETIC: "Built from other prices, not printed by the market.",
  AGGREGATE: "Combined from several venues.",
  DELAYED: "Delayed by the data plan, not by a fault.",
  REPLAY_FROZEN: "Bar replay — the clock is held on history.",
  UNSUPPORTED: "This market does not carry that reading.",
  REFUSED: "The provider refused — sign-in, plan or policy.",
  PARTIAL_TAPE: "One exchange's prints, not the full market tape.",
});

/** No recorded reason. Literally true when printed: the reason list is empty. */
export const NO_FAULT_ON_FILE = "No fault on file for this price.";

/** An ungraded canvas says which question is open — never just "unmeasured". */
export const CANVAS_UNGRADED_WORDS: Readonly<Record<CanvasUngraded, string>> = Object.freeze({
  ASKING: "The chart's bars are still loading, so the chart is not graded yet. A live feed word beside this is about the quote.",
  NO_ANSWER: "No bars and no quote have arrived for this market, so there is nothing on the chart to grade.",
  NO_MOMENT: "Nothing on this chart carries a time yet, so the chart is not graded. A live feed word beside this is about the quote.",
});

/** The ungraded sentence when the caller attached no cause (a surface that never measures). */
export const CANVAS_UNGRADED_UNKNOWN = "This chart has not been graded.";
