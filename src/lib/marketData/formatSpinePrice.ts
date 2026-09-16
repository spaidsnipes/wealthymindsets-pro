/**
 * The MARKET cell's price line — ONE owner for a three-state truth.
 *
 * Observed live on /charts, one viewport, one instrument, one moment:
 *
 *   chart header :  7,622.25  HISTORICAL BARS VERIFIED
 *   MARKET tile  :  ES1! · 1h · PRICE UNKNOWN
 *
 * Neither statement was false. The tile was right that no live trade print
 * existed with the cash session closed; the header was right that the last
 * loaded candle closed at 7,622.25. But the trader had to reconcile two
 * owners in their head, which is SCENE_FRAGMENTATION in the truth dimension.
 *
 * The repair is NOT to relax `price.last`. It is to give the second fact its
 * own sentence, with its own provenance word, and to keep PRICE UNKNOWN for
 * the case where we genuinely know nothing. Three states, never two:
 *
 *   PRINT      — a live trade printed, and canonical state holds the tick.
 *   BAR_CLOSE  — no print, but a loaded bar closed here. Say so, out loud.
 *   NONE       — no price evidence of any kind. PRICE UNKNOWN is the truth.
 *
 * Kept pure and separate from the component so the label cannot drift on one
 * surface and not another, and so it is testable without a DOM.
 */
export type SpinePriceProvenance = "PRINT" | "BAR_CLOSE" | "NONE";

export interface SpinePriceDisplay {
  readonly text: string;
  readonly provenance: SpinePriceProvenance;
}

const usable = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0;

/**
 * THE SAME THREE-STATE TRUTH, BEFORE IT BECOMES A SENTENCE.
 *
 * ── WHY THIS SPLIT EXISTS ─────────────────────────────────────────────
 * `formatSpinePrice` answers "what sentence does the spine print?". That is
 * the right question for the spine, whose price line is one row of small text.
 * It is the WRONG question for HeroTruth, which renders the number alone at
 * 36–48px serif and cannot put "356.58 LAST 15m BAR CLOSE" inside that glyph.
 *
 * Before this split there was no way for the hero to ask the question at all,
 * so it did not: it read `state.price.last` directly and printed `?` whenever
 * no live tick existed. That was survivable only while canonical state never
 * carried a bar close on that surface. The moment /command-deck started
 * publishing its chart's candles (2026-09-16), the deck had TWO price owners
 * reading TWO different fields, and they disagreed on sight:
 *
 *   HeroTruth (34px)     :  ?
 *   DecisionSpineBand    :  356.58 LAST 15m BAR CLOSE
 *
 * Canon Weakness #1 — multi-price disagreement in one viewport — reintroduced
 * by the very commit that removed it from the chart/hero pair.
 *
 * The fix is NOT to teach the hero the same precedence rule. Two copies of a
 * precedence rule agree exactly until one is edited. The fix is to have ONE
 * owner of "which price fact wins, and what is it called", and let each
 * surface decide only how to DRAW it. `formatSpinePrice` is now a renderer of
 * this selector, not a second brain beside it — so a change to precedence
 * moves both surfaces or neither.
 */
export interface PriceEvidence {
  /**
   * The number to display, or null when there is no price evidence at all.
   * Null is a real answer here; a caller that substitutes 0 is fabricating.
   */
  readonly value: number | null;
  readonly provenance: SpinePriceProvenance;
  /**
   * How the number must be qualified when shown. Null for a live print — a
   * print needs no apology. Non-null for a bar close, and it is NOT optional
   * decoration: rendering the close without this string states a print.
   */
  readonly qualifier: string | null;
}

export function selectPriceEvidence(
  last: number | null | undefined,
  lastBarClose: number | null | undefined,
  lastBarTimeframe?: string | null,
): PriceEvidence {
  // A print outranks a close. It is the stronger claim and it is the one the
  // trader is actually asking for; the close only speaks when it is silent.
  if (usable(last)) return { value: last, provenance: "PRINT", qualifier: null };

  if (usable(lastBarClose)) {
    // The timeframe is part of the fact, not decoration — "closed at 7622.25"
    // means something different on 1m than on 1D. It is included only when
    // canonical state actually carried one; never invented to look complete.
    const tf = typeof lastBarTimeframe === "string" ? lastBarTimeframe.trim() : "";
    return {
      value: lastBarClose,
      provenance: "BAR_CLOSE",
      qualifier: tf ? `LAST ${tf} BAR CLOSE` : "LAST BAR CLOSE",
    };
  }

  return { value: null, provenance: "NONE", qualifier: null };
}

export function formatSpinePrice(
  last: number | null | undefined,
  lastBarClose: number | null | undefined,
  lastBarTimeframe?: string | null,
): SpinePriceDisplay {
  const evidence = selectPriceEvidence(last, lastBarClose, lastBarTimeframe);
  if (evidence.value == null) return { text: "PRICE UNKNOWN", provenance: "NONE" };
  return {
    text: evidence.qualifier
      ? `${evidence.value} ${evidence.qualifier}`
      : String(evidence.value),
    provenance: evidence.provenance,
  };
}
