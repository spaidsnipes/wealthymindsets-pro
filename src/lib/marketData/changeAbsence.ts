/**
 * changeAbsence — how the chart room SAYS it does not know the day change.
 *
 * ── THE DEFECT ────────────────────────────────────────────────────────
 * `chartHeaderChangeTruth.test.ts` already knew there were TWO sites that
 * decide whether to show a day change, and it locked them to one guard:
 *
 *   it("both change-display sites share the same guard shape", () => {
 *     const guard = "!(ticker.change === 0 && ticker.changePct === 0)";
 *     expect(src).toContain(guard);        // ChartsDashboard chrome header
 *     expect(mainChart).toContain(guard);  // MainChart price row
 *   });
 *
 * That Sentinel enforces agreement about WHEN to suppress and says nothing
 * about WHAT THE SUPPRESSION LOOKS LIKE. So the two sites agreed perfectly on
 * the decision and disagreed completely on the disclosure:
 *
 *   MainChart.tsx ~7017   always renders the span; on absence it reads
 *                         "— (change unavailable)" and carries a title naming
 *                         the reason. Reference-correct.
 *   ChartsDashboard ~1291 `{hasReal && <span …>}` — on absence it renders
 *                         NOTHING AT ALL.
 *
 * MEASURED LIVE on https://wealthymindsetspro.com/charts, TSLA, in one DOM
 * read of `div.wm-chart-market-summary`:
 *
 *   TSLA | — | HISTORICAL BARS VERIFIED
 *
 * and that `—` span carried NO title and NO aria-label. Two different absences
 * — no price, and no change — collapsed into one unexplained glyph plus one
 * silent omission, in the OUTER CHROME, which is the header a trader reads
 * before they read anything else.
 *
 * A silent omission is the worst shape an absence can take. A fabricated zero
 * at least makes a claim the trader can catch being wrong; a missing element
 * cannot be seen, questioned, or screenshotted. It reads exactly like a page
 * that has nothing to say on the subject.
 *
 * ── WHY A MODULE AND NOT A COPIED STRING ──────────────────────────────
 * Copying "— (change unavailable)" into the second site would have produced a
 * third owner of one sentence, agreeing with the other two in the default case
 * — the VACUOUS AGREEMENT shape this codebase keeps finding, where the copies
 * agree right up until one of them is edited. The sentence lives here once and
 * both render sites read it.
 *
 * ── CORRECTION, THE COMMIT AFTER ──────────────────────────────────────
 * The paragraphs above say "the TWO sites". A grep for the sentence run
 * immediately after that commit shipped found FOUR:
 *
 *   MainChart.tsx        "— (change unavailable)"   migrated
 *   ChartsDashboard.tsx  (was: nothing at all)      migrated
 *   StockInfoPanel:224   "— change unavailable"     NO PARENTHESES
 *   SymbolInfoHeader:142 "—"                        glyph only
 *
 * The last two each spelled `CHANGE_UNAVAILABLE_TITLE`'s exact wording as a
 * string literal of their own. So the VACUOUS AGREEMENT this module was
 * written to prevent HAD ALREADY HAPPENED, unobserved, before the module
 * existed: four copies of one sentence, three renderings of one absence, and
 * the divergence is visible in the punctuation. Nothing failed, because
 * nothing was watching the sentence — the Sentinel was watching two files it
 * had been told were the whole set.
 *
 * The lesson is not "migrate the other two". It is that a Sentinel which
 * names its subjects can only ever be as complete as the grep that wrote it,
 * and it will keep passing while the population grows behind it. The test now
 * COUNTS the literal across all of src/ instead of listing the files.
 *
 * PURE — no clock, no I/O, no React.
 */

/**
 * The glyph plus its parenthetical. The em-dash is INSIDE the constant on
 * purpose: a bare "—" is the defect this module exists to close, so the two
 * halves must not be separable at a call site.
 */
export const CHANGE_UNAVAILABLE_TEXT = "— (change unavailable)";

/**
 * The bare glyph, for the one legitimate case the full sentence cannot serve:
 * a compact slot (an 11px percent-only cell) where "— (change unavailable)"
 * would not fit and would push real numbers off the row.
 *
 * IT MAY ONLY BE RENDERED WITH `CHANGE_UNAVAILABLE_TITLE` ON BOTH `title` AND
 * `aria-label`. A dash on its own is the original defect — the thing that was
 * measured live carrying no attributes at all. Exporting the glyph as a named
 * constant is what lets the Sentinel tell "a considered compact rendering"
 * apart from "someone typed a dash", which is otherwise invisible in a diff.
 */
export const CHANGE_UNAVAILABLE_GLYPH = "—";

/**
 * WHY it is unavailable, not merely THAT it is. The guard both sites share
 * suppresses on exactly one condition — no verified reference close — so the
 * sentence can name that condition rather than apologising generically.
 */
export const CHANGE_UNAVAILABLE_TITLE =
  "Change unavailable — no verified reference close from the current quote provider.";

/**
 * The chrome header's PRICE fallback, which is a different absence and needs a
 * different sentence. It rendered as a bare "—" beside a HISTORICAL BARS
 * VERIFIED badge, which is actively confusing: the badge asserts bars were
 * verified while the number beside it says nothing at all.
 *
 * This does NOT claim the last bar close is unavailable. `deriveLastBarClose`
 * can often name one, and wiring it into this header is a real improvement
 * that belongs in its own change with its own proof. Until then the honest
 * statement is the narrow one: no live quote reached this header.
 */
export const PRICE_UNAVAILABLE_TITLE =
  "Price unavailable — no live quote has reached this header. The chart's own " +
  "price row may still show a verified bar close.";
