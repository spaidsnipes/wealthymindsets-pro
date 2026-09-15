/**
 * priceAbsence — how a chart surface SAYS it has no price, and why.
 *
 * ── THE DEFECT, WHICH IS TWO DEFECTS WEARING ONE COAT ─────────────────
 *
 * (1) A REASON CARRIED ONLY IN `title` IS NOT SAID ON A PHONE.
 *
 * The previous chain established that an absence must be SAID at every site
 * that shows one. Three of the four sites it touched ended up carrying the
 * reason on BOTH `title` and `aria-label`. One did not:
 *
 *   MainChart.tsx:7025   title={hasProviderChange ? undefined : CHANGE_UNAVAILABLE_TITLE}
 *
 * That is the one site the phone hide-rule in globals.css made LOAD-BEARING.
 * `@media (max-width: 639px)` hides the chrome header's copy of the sentence
 * precisely because MainChart renders it — so on the primary device, MainChart
 * is the ONLY statement of the absence on the page, and it was the only one
 * that did not announce itself.
 *
 * `title` is not a disclosure on a touch device. There is no hover. The
 * attribute is reachable by a mouse and by some screen readers and by nothing
 * else. A glyph whose reason lives only in `title` is, on a phone, a bare
 * glyph — WHICH IS EXACTLY THE DEFECT THE CHAIN STARTED FROM, restored by
 * omission rather than by edit.
 *
 * The three sites that got it right are not evidence the pattern was
 * understood. They are evidence that whoever wrote them happened to type two
 * attributes, and nothing was watching whether they did.
 *
 * (2) THE PRICE REFUSAL SENTENCE HAD ALREADY DRIFTED — AGAIN.
 *
 * Two sites spelled a two-branch price-absence sentence of their own:
 *
 *   MainChart.tsx:6993      "…A quote provider answered and WM declined the
 *                            answer: …  This is a refusal, not a delay — WM
 *                            looked and said no."
 *   StockInfoPanel.tsx:208  "…A provider answered and WM declined the answer:
 *                            …  This is a refusal, not a delay."
 *
 * `A quote provider` → `A provider`. The clause `— WM looked and said no` is
 * gone. Neither drift is visible unless the two strings are read side by side,
 * which nothing in the tree ever did. This is the SECOND time in one chain
 * that a sentence found to have "two owners" turned out to have already
 * diverged before anyone looked.
 *
 * ── WHY A FUNCTION AND NOT A CONSTANT ─────────────────────────────────
 * The refusal branch is genuinely one sentence and belongs to one owner. The
 * no-observation branch is NOT: MainChart has a candle source and can honestly
 * say no candle has loaded; StockInfoPanel has none and would be claiming to
 * have looked somewhere it never looks. Merging those two into one literal
 * would have made one of the two sites lie in order to deduplicate.
 *
 * So the difference is a PARAMETER, not a second copy. That distinction is the
 * whole point: deduplication that erases a real difference is not a fix, it is
 * a fabrication with better hygiene.
 *
 * PURE — no clock, no I/O, no React.
 */

/**
 * The bare glyph a price absence renders. Same law as the change glyph: it may
 * only appear with `priceAbsenceReason(...)` on BOTH `title` and `aria-label`.
 */
export const PRICE_ABSENCE_GLYPH = "—";

export interface PriceAbsenceInput {
  /**
   * The provider's answer that WM declined, if there was one. A refusal is a
   * stronger and more useful statement than a silence, so it is said first.
   */
  quoteRefusal?: string | null;
  /**
   * Whether this surface has a candle series it could have drawn a close from.
   * MainChart does. StockInfoPanel does not, and must not imply it looked.
   */
  hasCandleSource: boolean;
}

/**
 * WHY there is no price, not merely THAT there is none.
 *
 * The refusal branch is deliberately emphatic. "No data" reads to a trader as
 * a product that is broken or asleep; "WM looked and said no" reads as a
 * product exercising judgement. Those are opposite impressions of the same
 * state, and only the second one is true.
 */
export function priceAbsenceReason({
  quoteRefusal,
  hasCandleSource,
}: PriceAbsenceInput): string {
  if (quoteRefusal) {
    return (
      "No price to show. A quote provider answered and WM declined the answer: " +
      `${quoteRefusal}` +
      "\n\nThis is a refusal, not a delay — WM looked and said no."
    );
  }
  return hasCandleSource
    ? "No price to show. No quote has been observed and no candle has loaded for this symbol."
    : "No price to show. No quote has been observed for this symbol yet.";
}
