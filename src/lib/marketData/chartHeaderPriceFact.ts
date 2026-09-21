import type { LastBarCloseEvidence } from "./deriveLastBarClose";
import { quoteSourceNamesProvider } from "./quoteSourceNamesProvider";

/**
 * chartHeaderPriceFact — what the /charts chrome header is entitled to print
 * where the price goes.
 *
 * ── THE DEFECT: UNDERSTATING KNOWLEDGE IS A TRUTH DEFECT ──────────────
 * MEASURED LIVE on https://wealthymindsetspro.com/charts, TSLA, reading
 * `div.wm-chart-market-summary` in one DOM read:
 *
 *     TSLA | — | HISTORICAL BARS VERIFIED
 *
 * The dash is an owned, considered rendering — it carries a `title` and an
 * `aria-label` (both confirmed present live, 121 chars). That part works. The
 * defect is WHAT IT SAYS NEXT TO, and it is a contradiction sitting inside one
 * 44-pixel row:
 *
 *   - The badge asserts HISTORICAL BARS VERIFIED. That badge is gated on
 *     `chartBars.length > 0`, so its presence is PROOF that loaded, verified
 *     bars exist in this very component.
 *   - `usePublishChartMarketState` is handed those SAME `chartBars` and
 *     publishes a last bar close from them under its own provenance.
 *   - And between the two, the price cell says nothing at all.
 *
 * So WM knew a number, published it to one consumer, and declined to say it to
 * the trader — while a badge two elements over announced that the evidence for
 * it had been verified. `deriveLastBarClose`'s own header names this family:
 * "Understating knowledge is a truth defect in the same family as overclaiming
 * it." `changeAbsence.ts` flagged this exact repair and deferred it: "wiring it
 * into this header is a real improvement that belongs in its own change with
 * its own proof." This is that change.
 *
 * ── THE RULE THAT MAKES THE REPAIR SAFE ───────────────────────────────
 * A BAR CLOSE MAY NEVER WEAR A LIVE QUOTE'S CLOTHES.
 *
 * The easy version of this fix — fall back to the bar close and render it in
 * the same font, the same colour, the same slot — would be far worse than the
 * dash. It would silently UPGRADE provenance: a trader reads the header price
 * as "what it is trading at now", and a 15-minute-old candle close rendered in
 * that position is a fabricated freshness claim. That is the precise failure
 * `deriveLastBarClose` refused when it declined to widen `price.last`.
 *
 * So the bar-close arm is a DIFFERENT READING, not a fallback value:
 *   - it carries its own provenance word in the text — the timeframe and the
 *     phrase BAR CLOSE — so the number is never alone;
 *   - it is a distinct `kind`, so colour and weight are chosen from a declared
 *     provenance rather than from "is the number present";
 *   - and `measured` stays true, because it IS a measurement — just of a
 *     different question than the live cell asks.
 *
 * ── WHAT IS DELIBERATELY *NOT* CLAIMED ────────────────────────────────
 *   - Nothing claims the bar close is current. It is stamped with the
 *     timeframe precisely so the reader can price its age themselves.
 *   - Nothing claims the live quote is real-time either — only that a live
 *     quote reached this header.
 *   - Nothing reconciles the two. When both exist the live quote wins the slot
 *     because it answers the question the slot asks; the bar close is not
 *     thereby declared wrong, it is declared a different reading.
 *   - When neither exists the cell does NOT say "price unavailable" and stop.
 *     It says which of the two channels was empty, because "no quote AND no
 *     bars" and "no quote but bars are loading" are different situations.
 *
 * PURE — no clock, no I/O, no React.
 */

/**
 * The provenance of the number in the header's price slot.
 *
 * `AWAITING` finishes a sentence this file's own docblock started and never
 * delivered: "'no quote AND no bars' and 'no quote but bars are loading' are
 * different situations." They were different in the prose and identical in the
 * code — both fell to `NONE` and both printed "No price". So on every page
 * load the header of the primary trading surface opened by telling the trader
 * their instrument had no price, seconds before printing 29,567.25.
 *
 * `AWAITING` prints NOTHING. A blank slot for one second is not a claim; "No
 * price" is.
 */
export type HeaderPriceKind =
  | "LIVE_QUOTE"
  | "UNCERTIFIED_QUOTE"
  | "BAR_CLOSE"
  | "NONE"
  | "AWAITING";

export interface HeaderPriceFact {
  readonly text: string;
  /** True when this cell is showing an actual reading of something. */
  readonly measured: boolean;
  /** The ONLY thing colour and weight may be derived from. */
  readonly kind: HeaderPriceKind;
  readonly reason: string;
}

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

const NO_LIVE_QUOTE =
  "No live quote has reached this header from the current provider.";

export function chartHeaderPriceFact(
  livePrice: unknown,
  barClose: LastBarCloseEvidence | null | undefined,
  /**
   * OPTIONAL and LAST, tri-state, and only an explicit `false` changes a
   * verdict — the same discipline `sessionOpen` uses in `priceSource.ts`.
   * Every existing caller and test keeps its exact behaviour untouched.
   */
  barsSettled?: boolean,
  /**
   * How many decimals this instrument's prices carry.
   *
   * OPTIONAL and LAST, defaulting to the 2 every existing caller already gets,
   * for the same reason `chartHeaderChangeFact` takes its `minDecimals`: this
   * module is pure and cannot know an instrument's tick. A chart that knows
   * its instrument trades in ten-thousandths and hands that knowledge to a
   * formatter hardcoded at 2 does not render an approximation — it renders
   * `0.00`, a flat price manufactured by the formatter rather than observed in
   * the market. That is the failure mode this parameter exists to prevent, and
   * it is the only reason MainChart could adopt this owner at all.
   */
  decimals: number = 2,
  /**
   * The `source` this product attached to that live price, if it attached one.
   *
   * OPTIONAL and LAST, for the same reason as the two parameters above: every
   * existing caller keeps its exact behaviour when it says nothing.
   *
   * ── THE DEFECT THIS CLOSES ──────────────────────────────────────────
   * MEASURED on the serving host 2026-09-20, BTCUSDT, one viewport:
   *
   *     header : 81822.00 +632.00 (+0.78%)
   *     footer : SOURCE UNKNOWN
   *     rail   : BTCUSDT · 5m · PRICE UNKNOWN
   *
   * Three owners of one fact, and the biggest number on the screen was the
   * only one making no claim about where it came from. `useWebSocket` had
   * DECLINED to certify that quote's provenance (Finnhub returned no
   * observation time, so `source` was left at its `"unavailable"` sentinel) —
   * the product knew it could not vouch for the number, said so twice
   * elsewhere, and printed it bare here in 20px.
   *
   * This file already holds the law that fixes it, written for the bar close:
   * "a bare figure in this slot would be read as a live price, which is the
   * one thing it is not." An uncertified quote is in exactly that position.
   * So it is NOT downgraded to NONE — the number is real and withholding it
   * would be the understatement defect this file was built to end — and it is
   * NOT printed bare either. It becomes its own declared provenance, with its
   * own words travelling beside the number.
   *
   * SILENCE IS NOT CERTIFICATION. A caller that passes nothing is a caller
   * that has not been taught to ask, so its behaviour is unchanged; only a
   * caller that hands over a source is judged on it.
   */
  quoteSource?: unknown,
): HeaderPriceFact {
  if (finite(livePrice) && livePrice > 0) {
    // Only a caller that actually passed something gets judged. `undefined`
    // means "nobody told me", which is the pre-existing world.
    const sourceWasOffered = quoteSource !== undefined;
    if (sourceWasOffered && !quoteSourceNamesProvider(quoteSource)) {
      return {
        // The provenance travels WITH the number, exactly as it does for the
        // bar close two arms down. The trader sees the price AND sees that WM
        // will not put a name to it.
        text: `${livePrice.toFixed(decimals)} SOURCE UNCERTIFIED`,
        // It IS a measurement. WM received this number; what it cannot do is
        // attribute it.
        measured: true,
        kind: "UNCERTIFIED_QUOTE",
        reason:
          `A quote of ${livePrice.toFixed(decimals)} reached this header, but WM CANNOT NAME THE PROVIDER IT CAME FROM, so it will not put a vendor's name to it. ` +
          "This happens when a quote arrives without the observation time WM uses to certify provenance — the number is real and is shown for that reason, but it is unattributed and you cannot check it against a source. " +
          "WM prints the number rather than hiding it, and prints the doubt rather than hiding that.",
      };
    }
    return {
      text: livePrice.toFixed(decimals),
      measured: true,
      kind: "LIVE_QUOTE",
      reason:
        "Last price this header received from the live quote provider. " +
        "WM does not claim how stale it is — this cell can see that a quote arrived, not when it was struck at the exchange.",
    };
  }

  if (
    barClose &&
    finite(barClose.close) &&
    barClose.close > 0 &&
    typeof barClose.timeframe === "string" &&
    barClose.timeframe.trim() !== ""
  ) {
    const tf = barClose.timeframe.trim();
    return {
      // The provenance travels WITH the number. A bare figure in this slot
      // would be read as a live price, which is the one thing it is not.
      text: `${barClose.close.toFixed(decimals)} LAST ${tf} BAR CLOSE`,
      measured: true,
      kind: "BAR_CLOSE",
      reason:
        `${NO_LIVE_QUOTE} What WM does have is a bar that has PROVABLY CLOSED: the last ${tf} candle loaded on this chart closed at ${barClose.close.toFixed(decimals)}. ` +
        "That is a DIFFERENT READING, not a substitute for a live price, and it is labelled as one so it can never be mistaken for what the instrument is trading at now. " +
        "WM will not render a candle close in a live price's clothes. " +
        "The badge beside this cell says the bars were verified; this is the number those bars actually produced, said out loud instead of withheld.",
    };
  }

  // The question is still open. An open question has no answer to print, and
  // "No price" is an answer — it asserts that WM looked in both channels and
  // found nothing. Only an explicit `false` gets here; `undefined` (nobody told
  // me) still falls through to NONE exactly as every existing caller expects.
  if (barsSettled === false) {
    return {
      text: "",
      measured: false,
      kind: "AWAITING",
      reason:
        "The bars request for this instrument has not come back yet, so this cell has nothing to report and says nothing. " +
        "This is NOT a finding that the price is unavailable — WM has not finished asking. " +
        "A blank slot for a moment is not a claim; \"No price\" over an instrument that is about to paint 400 candles is.",
    };
  }

  return {
    text: "No price",
    measured: false,
    kind: "NONE",
    reason:
      `${NO_LIVE_QUOTE} WM also cannot name a last bar close: either no candles are loaded on this chart yet, or none of them has provably finished its interval — a bar that is still forming has no close, only the value it was born with. ` +
      "This is an absence of both channels, not a price of zero and not a refusal to say.",
  };
}
