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
 *
 * ── THE FOURTH STATE, MEASURED LIVE ───────────────────────────────────
 * Three states were one short. Sampled on wealthymindsetspro.com/charts at
 * 25ms resolution through a cold mount, 2026-09-17:
 *
 *   t=1111ms   NQ1!                          ← header price/change withheld
 *              …and the MARKET cell:  PRICE UNKNOWN
 *   t=2163ms   NQ1! · 29563.25 LAST 15m BAR CLOSE · +2.00 (+0.01%)
 *
 * At 1111ms the bars request had not come back. `NONE` was reached not
 * because WM had looked in both channels and found nothing, but because
 * nobody had finished asking. PRICE UNKNOWN is a FINDING — it sends a
 * trader to diagnose a pipeline — and it was printed over a request in
 * flight that resolved a second later into a perfectly good number.
 *
 * `AWAITING` is that fourth state, and it is the exact sibling of
 * `HeaderPriceKind`'s: same defect, same cure, same tri-state discipline.
 * It prints NOTHING, because "we have not finished asking" is not a reading
 * and the canon has no word for one (canon §silence-is-a-feature).
 */
import { quoteSourceNamesProvider } from "./quoteSourceNamesProvider";

export type SpinePriceProvenance =
  | "PRINT"
  | "BAR_CLOSE"
  /**
   * THE THIRD CHANNEL — a display quote from a named provider.
   *
   * MEASURED on the serving Worker, 2026-09-20, BTCUSDT · 5m, ONE viewport:
   *
   *     chart header    81738.08  +492.44 (+0.61%)
   *     MARKET cell     BTCUSDT · 5m · PRICE UNKNOWN
   *
   * Same instrument, same second, two owners — the identical shape this
   * module already closed once for the bar close, arriving through a door it
   * did not have. There were no bars at all on that chart (see
   * compileBarHistoryRefusal), so BAR_CLOSE could not speak, and nothing here
   * observed a per-trade print, so PRINT could not either. A provider's
   * answer was on the glass eleven hundred pixels to the left and this cell
   * had no slot to put it in, so it printed a FINDING over a fact WM held.
   *
   * RANKED LAST, DELIBERATELY. A vendor's display quote is a real reading but
   * a weaker one than a print we observed or a bar we sealed, and ranking it
   * above either would silently change what every existing surface renders.
   * It speaks only when the two stronger channels are both silent, which
   * makes this arm strictly additive: no caller that renders today renders
   * differently tomorrow. Whether a fresh quote should outrank a stale bar
   * close is a real question and it is NOT answered here — it is left open
   * rather than settled by a change that would be invisible in review.
   */
  | "QUOTE"
  /**
   * A DISPLAY QUOTE WM CANNOT ATTRIBUTE.
   *
   * MEASURED on the serving Worker 2026-09-20, BTCUSDT · 5m, ONE viewport,
   * screenshot-proved:
   *
   *     chart header    81226.01 SOURCE UNCERTIFIED  ↑ +136.90 (+0.17%)
   *     MARKET cell     BTCUSDT · 5m · PRICE UNKNOWN
   *
   * Canon Weakness #1 — multi-price disagreement in one viewport — AND IT WAS
   * REINTRODUCED BY THIS FILE, one commit earlier. The `QUOTE` arm above began
   * refusing `useWebSocket`'s `unavailable` sentinel, correctly, because
   * printing it after "LAST QUOTE ·" manufactures a citation. But refusing the
   * SOURCE was taken as grounds to drop the NUMBER, so the cell fell all the
   * way to `NONE` and printed PRICE UNKNOWN — a FINDING, the sentence that
   * sends a trader to diagnose a pipeline — over a figure WM was at that exact
   * moment rendering in 20px on the same screen.
   *
   * `chartHeaderPriceFact` had already settled this for the header slot, in
   * words this module is bound by: the number is real and withholding it is the
   * understatement defect; a bare figure states a print, which is the one thing
   * it is not. The cure is neither NONE nor a bare number — it is a DECLARED
   * PROVENANCE whose words travel beside the figure.
   *
   * RANKED BELOW `QUOTE`, and the ordering is the whole point: a quote WM can
   * attribute beats a quote it cannot. This arm speaks only where every other
   * channel is silent AND the source could not be named — which is exactly and
   * only the set of cases that printed PRICE UNKNOWN before it existed. No
   * caller that renders a price today renders a different one tomorrow.
   */
  | "UNCERTIFIED_QUOTE"
  | "NONE"
  | "AWAITING";

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
  /**
   * OPTIONAL and LAST, tri-state, and ONLY an explicit `false` changes a
   * verdict — the same discipline `sessionOpen` uses in `priceSource.ts` and
   * `barsSettled` uses in `chartHeaderPriceFact`. `undefined` means "nobody
   * told me", which is what every existing caller says, so every existing
   * caller and test keeps its exact behaviour.
   */
  barsSettled?: boolean,
  /**
   * The display quote and the PROVIDER THAT SAID IT. Both, or neither — a
   * number whose source cannot be named is exactly the uncheckable reading
   * this module exists to prevent, so a quote without a provider is dropped
   * rather than rendered anonymously.
   */
  quote?: { readonly last?: number | null; readonly source?: string | null },
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

  // THE THIRD CHANNEL, last. See `SpinePriceProvenance["QUOTE"]` for the
  // measurement and for why it is ranked below both of the above.
  const quoteSource = typeof quote?.source === "string" ? quote.source.trim() : "";
  // MEASURED 2026-09-20 on the serving host: this arm printed the string
  // "81781.82 LAST QUOTE · unavailable" for BTCUSDT. "unavailable" is not a
  // provider — it is `useWebSocket`'s sentinel for a quote whose provenance
  // this product DECLINED to certify (Finnhub returned no observation time, so
  // `source` was never promoted off its initial value). Rendering the sentinel
  // as if it were a vendor name turns a deliberate refusal to vouch into a
  // citation, which is the drawer-filed receipt in reverse: the disclosure
  // reaches the glass, but says the opposite of what the product knows.
  //
  // A sentinel is therefore treated as NO source at all, and the number is
  // dropped — the same outcome as an empty string, for the same reason.
  //
  // The rule itself lives in `quoteSourceNamesProvider` rather than inline
  // here, because the chart HEADER asks the same question about the same
  // field. Two inline copies would be two owners of one rule.
  if (usable(quote?.last) && quoteSourceNamesProvider(quoteSource)) {
    return {
      value: quote!.last!,
      provenance: "QUOTE",
      // The provider is part of the fact. "81738.08" alone states a print;
      // "81738.08 LAST QUOTE · finnhub" states exactly what WM has and names
      // who to check it against.
      qualifier: `LAST QUOTE · ${quoteSource}`,
    };
  }

  // THE SAME QUOTE, UNATTRIBUTED. Reached only when a usable number arrived and
  // the source could NOT be named — the case that fell to PRICE UNKNOWN until
  // the header proved WM can say both things at once. See the docblock on
  // `SpinePriceProvenance["UNCERTIFIED_QUOTE"]` for the measurement.
  //
  // The qualifier is not optional decoration and not a softer version of the
  // certified one. It says the opposite of a citation: there is nobody to check
  // this against. A reader who sees it knows precisely as much as WM does.
  if (usable(quote?.last)) {
    return {
      value: quote!.last!,
      provenance: "UNCERTIFIED_QUOTE",
      qualifier: "LAST QUOTE · SOURCE UNCERTIFIED",
    };
  }

  // EVERY CHANNEL IS EMPTY BECAUSE NONE HAS ANSWERED YET.
  //
  // Placed AFTER both evidence arms on purpose, so EVIDENCE OUTRANKS THE FLAG:
  // a caller that reports the bars request unsettled still gets its print or
  // its close if one is actually here. The flag may only ever decide what an
  // ABSENCE means — never overrule a reading.
  if (barsSettled === false) {
    return { value: null, provenance: "AWAITING", qualifier: null };
  }

  return { value: null, provenance: "NONE", qualifier: null };
}

/**
 * THE WORD UNDERNEATH THE NUMBER — and what it is actually grading.
 *
 * ── THE DEFECT, MEASURED LIVE ─────────────────────────────────────────
 * wealthymindsetspro.com/charts, NQ1! 15m, 2026-09-17, ONE two-line cell,
 * read top to bottom exactly as a trader reads it:
 *
 *     NQ1! · 15m · 29727 LAST 15m BAR CLOSE
 *     UNAVAILABLE · asOf 12:47:27Z
 *
 * …with `HISTORICAL BARS VERIFIED` in the masthead of the same viewport.
 *
 * `UNAVAILABLE` is `qualityFor`'s honest verdict on THE LIVE QUOTE CHANNEL:
 * no per-trade print matched, so canonical state seals no `price.last`. That
 * is true. But the sentence carries no scope, and it is set immediately
 * beneath a number that IS present and IS provenance-labelled — so the only
 * reading available to the trader is that the line above is the thing that is
 * unavailable. WM understates what it knows, which `deriveLastBarClose` names
 * in its own words as a truth defect in the same family as overclaiming.
 *
 * ── WHY THE CURE IS A SCOPE, NOT A DIFFERENT VERDICT ──────────────────
 * The verdict is not softened and the grade is not promoted: a bar close is
 * still not a print, and nothing here can make the quote channel healthy. All
 * that changes is that the clause SAYS WHICH CHANNEL IT GRADES, following the
 * rule this module already enforces one line up — the qualifier travels with
 * the reading or the reading states something it cannot prove.
 *
 * ── WHY ONLY THE BAR_CLOSE ARM ────────────────────────────────────────
 * Under `NONE` there is no number above the word, so `UNAVAILABLE` has
 * nothing to be mistaken for and is precisely right. Under `PRINT` the
 * quality state is grading the very number shown, which is the case the word
 * was written for. `AWAITING` prints no price line at all. BAR_CLOSE is the
 * single arm where the grade and the reading come from DIFFERENT channels,
 * and it is the only arm touched.
 *
 * Non-UNAVAILABLE grades pass through untouched. DELAYED / STALE / PARTIAL
 * each describe a reading that exists, and none of them reads as an erasure
 * of the line above.
 */
export function qualifyMarketQuality(
  quality: string | null | undefined,
  provenance: SpinePriceProvenance,
): string {
  const q = typeof quality === "string" ? quality.trim() : "";
  if (!q) return "QUALITY UNKNOWN";
  // QUOTE joins BAR_CLOSE for the identical reason: the grade is of the PRINT
  // channel, the number above it came from a different one, and an unscoped
  // UNAVAILABLE set beneath a present reading can only be read as erasing it.
  //
  // UNCERTIFIED_QUOTE joins them, and needs it MOST. Its own qualifier already
  // admits WM cannot name a provider; stacking a bare UNAVAILABLE underneath
  // would read as a second, larger claim that the number itself is not there —
  // two different doubts collapsing into one erasure of a figure that IS
  // present. The scope keeps them distinct: the print channel is empty, the
  // quote is unattributed, and the number is real.
  if (
    (provenance === "BAR_CLOSE" ||
      provenance === "QUOTE" ||
      provenance === "UNCERTIFIED_QUOTE") &&
    q === "UNAVAILABLE"
  ) {
    return "NO LIVE PRINT";
  }
  return q;
}

export function formatSpinePrice(
  last: number | null | undefined,
  lastBarClose: number | null | undefined,
  lastBarTimeframe?: string | null,
  /** See `selectPriceEvidence`. Optional, last, and only `false` speaks. */
  barsSettled?: boolean,
  quote?: { readonly last?: number | null; readonly source?: string | null },
): SpinePriceDisplay {
  const evidence = selectPriceEvidence(last, lastBarClose, lastBarTimeframe, barsSettled, quote);
  // An open question has no sentence. PRICE UNKNOWN is an ANSWER — it asserts
  // WM looked and found nothing — so it may not be printed over a request that
  // is still in flight. The empty string is the honest render; the cell's own
  // code is what must decide not to draw a separator around nothing.
  if (evidence.provenance === "AWAITING") return { text: "", provenance: "AWAITING" };
  if (evidence.value == null) return { text: "PRICE UNKNOWN", provenance: "NONE" };
  return {
    text: evidence.qualifier
      ? `${evidence.value} ${evidence.qualifier}`
      : String(evidence.value),
    provenance: evidence.provenance,
  };
}
