/**
 * optionChainCellFacts — the two bare glyphs left in the options chain table
 * and the one in its header.
 *
 * Same chain as pnlStatsFacts / tradeRowFacts / scannerMetricFacts /
 * marketMonitorFacts. This file's own header already promises the surface
 * "Never fabricates contracts when the provider returns no data" — and it does
 * keep that promise. What it does NOT do is say WHICH absence it is looking at,
 * and on this surface there are four of them wearing one dash.
 *
 * ── DEFECT ONE: ONE ROW, TWO VOCABULARIES ────────────────────────────────
 *
 *     {row.call ? (…reviewable ? "Review call" : "Timing unverified"…) : "—"}
 *
 * The cell speaks in WORDS when a contract exists but cannot be dated, and in
 * a GLYPH when the provider listed no contract at that strike at all. Two
 * different facts, and the one that got the glyph is the more actionable of
 * the two: "this chain has no call at this strike" is a statement about the
 * COVERAGE of what WM received, which no amount of waiting or refreshing on a
 * different field will change.
 *
 * ── DEFECT TWO: WM'S OWN CLOCK GAP WEARING THE CONTRACT'S CLOTHES ────────
 *
 *     optionContractObservationTiming(row.call, receiptClock ?? Number.NaN)
 *
 * `receiptClock` is `null` until the interval effect's first tick runs, which
 * is AFTER first paint. `optionsReceiptAge` is careful here — it distinguishes
 * "timestamp unavailable" (the CONTRACT carries no time) from "time comparison
 * unavailable" (WM has no clock to compare against) — but the component threw
 * that distinction away and rendered one sentence for both:
 *
 *     "Quote and trade timing are both unverified"
 *
 * That sentence is about the CONTRACT. When the cause is an unread clock it is
 * a false accusation: the provider may have sent a perfectly good timestamp
 * and WM simply has not looked at a clock yet. Worse, the button is DISABLED
 * in both cases, so WM's own bookkeeping gap disables every Review button in
 * the chain and attributes it to the data.
 *
 * ── DEFECT THREE: A SENTINEL ZERO STANDING FOR FOUR SITUATIONS ───────────
 *
 *     const spotPrice = spot?.symbol === symbol ? spot.price : 0;
 *     const hasObservedSpot = spotPrice > 0;
 *     Spot: {hasObservedSpot ? … : "—"}
 *
 * The `: 0` collapses four distinguishable situations into one number, and
 * then `> 0` collapses them again into one dash:
 *
 *   1. NO_SPOT_RECEIVED       — no underlying quote has arrived at all.
 *   2. SPOT_IS_ANOTHER_SYMBOL — WM HOLDS an identified quote, for a DIFFERENT
 *                               instrument. This is the symbol-transition
 *                               window the file already worries about at the
 *                               `spotBoundSymbol` ref, and it is the one a
 *                               trader most needs named: without it, a chain
 *                               for one company sits under a dash that hides
 *                               a live price for another.
 *   3. SPOT_NOT_NUMERIC       — a fault in the quote that arrived.
 *   4. AWAITING_FIRST_PRINT   — everything is bound and nothing has printed.
 *
 * Only (4) resolves itself by waiting, and only (2) resolves itself by the
 * next render. The dash told the trader nothing about which.
 *
 * ── WHAT IS DELIBERATELY *NOT* CLAIMED ───────────────────────────────────
 *
 * Nothing here says a strike is not trading. A strike absent from THIS chain
 * is absent from what this provider sent for this expiry; it is a fact about
 * WM's copy of the chain, not about the option's existence in the market.
 *
 * Nothing here reports a last-known spot. A stale underlying under a live
 * chain would let a trader price a contract against a price that is no longer
 * on the tape.
 *
 * The numeric `spotPrice` sentinel is left in place for the fetch-gating
 * control flow it already feeds; this owner is what the SCREEN reads.
 *
 * PURE — no clock, no I/O, no React.
 */

export type OptionSpotState =
  /** A finite, positive quote that belongs to the symbol on screen. */
  | "OBSERVED"
  /** No underlying quote has reached this panel at all. */
  | "NO_SPOT_RECEIVED"
  /** A quote is held, but it identifies a DIFFERENT instrument. */
  | "SPOT_IS_ANOTHER_SYMBOL"
  /** A quote arrived for this symbol and is not a usable number. */
  | "SPOT_NOT_NUMERIC"
  /** Bound and healthy; nothing has printed yet. */
  | "AWAITING_FIRST_PRINT";

export type StrikeCellState =
  /** A listed contract that WM can date. */
  | "REVIEWABLE"
  /** The provider listed no contract of this side at this strike. */
  | "NOT_LISTED"
  /** WM has not read a clock yet, so it cannot date ANY contract. */
  | "WM_CLOCK_UNREAD"
  /** Clock read, contract listed, and neither quote nor trade carries a time. */
  | "CONTRACT_UNDATED";

export interface OptionCellFact {
  /** What the cell says. Never a bare glyph. */
  readonly text: string;
  /** True only when this cell is a reading. Drives colour and weight. */
  readonly measured: boolean;
  /** True only when the Review button may be pressed. */
  readonly actionable: boolean;
  /** Carried on both `title` and `aria-label`. */
  readonly reason: string;
}

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** Normalised the same way optionsSpotIdentity normalises, so the two agree. */
function norm(s: unknown): string {
  return typeof s === "string" ? s.trim().toUpperCase() : "";
}

/**
 * THE FIX FOR DEFECT THREE — the `: 0` sentinel becomes a named state.
 *
 * Order is deliberate and is asserted by the Sentinel: an identity mismatch
 * outranks any statement about the price, because a price read off the wrong
 * instrument is not a price for this chain at any value.
 */
export function classifyOptionSpot(input: {
  symbol: string;
  spot: { symbol: string; price: unknown } | null | undefined;
}): OptionSpotState {
  if (input.spot == null) return "NO_SPOT_RECEIVED";
  const want = norm(input.symbol);
  const got = norm(input.spot.symbol);
  if (!want || !got || want !== got) return "SPOT_IS_ANOTHER_SYMBOL";
  if (input.spot.price != null && !finite(input.spot.price)) return "SPOT_NOT_NUMERIC";
  if (!finite(input.spot.price) || input.spot.price <= 0) return "AWAITING_FIRST_PRINT";
  return "OBSERVED";
}

/**
 * THE FIX FOR DEFECTS ONE AND TWO — one cell, one vocabulary, four states.
 *
 * Order is deliberate and is asserted by the Sentinel:
 *   - absence of a contract outranks everything downstream, because there is
 *     nothing to date;
 *   - WM's unread clock outranks a claim about the contract, because blaming
 *     the provider for WM's own bookkeeping is the worse lie.
 */
export function classifyStrikeCell(input: {
  contractPresent: boolean;
  clockMs: unknown;
  timingReviewable: boolean;
}): StrikeCellState {
  if (!input.contractPresent) return "NOT_LISTED";
  if (!finite(input.clockMs)) return "WM_CLOCK_UNREAD";
  if (!input.timingReviewable) return "CONTRACT_UNDATED";
  return "REVIEWABLE";
}

/**
 * The refusal sentence for a strike cell, in ONE vocabulary.
 *
 * A TOTAL switch with no `default`: a fifth StrikeCellState cannot be added
 * without giving it a sentence, because the function would stop compiling.
 */
export function strikeCellReason(
  state: StrikeCellState,
  side: "call" | "put",
  strike: number,
  symbol: string,
): string {
  const at = finite(strike) ? `the ${strike} strike` : "this strike";
  switch (state) {
    case "REVIEWABLE":
      return `This ${side} is listed at ${at} and carries a provider observation time WM can date. Reviewing it opens the indicative contract; it is not an executable quote.`;
    case "NOT_LISTED":
      return `The provider listed no ${side} at ${at} in the ${symbol} chain WM received for this expiry. This is a statement about WM's copy of the chain, not about whether such a contract exists or is trading — WM has no way to know that from an absence.`;
    case "WM_CLOCK_UNREAD":
      return `WM has not read a clock yet, so it cannot date ANY contract on this chain, including this ${side}. This is a gap in WM's own bookkeeping, NOT a fault in the provider's data: the contract may carry a perfectly good timestamp. It clears on WM's next clock tick without anything changing at the provider.`;
    case "CONTRACT_UNDATED":
      return `WM has a clock and this ${side} is listed at ${at}, but neither its quote nor its trade carries a usable observation time. WM will not let a contract be reviewed against a reference it cannot date, and it is not substituting its own arrival time for the provider's.`;
  }
}

/** The action cell. Was `"Review call" | "Timing unverified" | "—"`. */
export function strikeCellFact(
  state: StrikeCellState,
  side: "call" | "put",
  strike: number,
  symbol: string,
): OptionCellFact {
  const label: Record<StrikeCellState, string> = {
    REVIEWABLE: side === "call" ? "Review call" : "Review put",
    NOT_LISTED: side === "call" ? "No call listed" : "No put listed",
    WM_CLOCK_UNREAD: "Clock not read",
    CONTRACT_UNDATED: "Timing unverified",
  };
  return {
    text: label[state],
    measured: state === "REVIEWABLE",
    actionable: state === "REVIEWABLE",
    reason: strikeCellReason(state, side, strike, symbol),
  };
}

/**
 * The refusal sentence for the header Spot cell. Also a TOTAL switch.
 *
 * `heldSymbol` is the instrument the held quote actually belongs to. It is
 * named out loud in the mismatch case: a trader who is told only "no spot"
 * during a symbol transition cannot tell that a live price is on screen for
 * the company they just navigated away from.
 */
export function optionSpotReason(
  state: OptionSpotState,
  symbol: string,
  heldSymbol: string | null | undefined,
): string {
  switch (state) {
    case "OBSERVED":
      return `Observed underlying quote for ${symbol}, identity-matched to the chain below it.`;
    case "NO_SPOT_RECEIVED":
      return `No underlying quote has reached this panel for ${symbol} yet. WM will not price the chain against a last-known figure — a stale underlying under a live chain would let a contract be priced against something no longer on the tape.`;
    case "SPOT_IS_ANOTHER_SYMBOL":
      return `WM is holding an underlying quote, but it identifies ${norm(heldSymbol) || "a different instrument"}, not ${symbol}. This is the symbol-transition window: the chain on screen has already moved and the quote has not. WM refuses to show it rather than let a ${symbol} contract be priced off another company's last trade. It resolves on the next identified tick.`;
    case "SPOT_NOT_NUMERIC":
      return `An underlying quote arrived for ${symbol} that is not a usable number. This is a fault in the quote that arrived, not an absence of trading, and WM is naming it rather than formatting it or treating it as a quiet zero.`;
    case "AWAITING_FIRST_PRINT":
      return `The underlying quote for ${symbol} is bound to this chain and nothing has printed a usable price yet. This is the one refusal here that resolves itself: the next print fills it in.`;
  }
}

/** The header Spot cell. Was `hasObservedSpot ? price.toLocaleString(…) : "—"`. */
export function optionSpotFact(
  state: OptionSpotState,
  price: unknown,
  symbol: string,
  heldSymbol: string | null | undefined,
): OptionCellFact {
  if (state === "OBSERVED" && finite(price)) {
    return {
      text: price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      measured: true,
      actionable: false,
      reason: optionSpotReason(state, symbol, heldSymbol),
    };
  }
  const label: Record<Exclude<OptionSpotState, "OBSERVED">, string> = {
    NO_SPOT_RECEIVED: "No spot received",
    SPOT_IS_ANOTHER_SYMBOL: "Spot is another symbol",
    SPOT_NOT_NUMERIC: "Spot feed fault",
    AWAITING_FIRST_PRINT: "Spot not yet printed",
  };
  return {
    text: state === "OBSERVED" ? "Spot feed fault" : label[state],
    measured: false,
    actionable: false,
    reason: state === "OBSERVED"
      ? optionSpotReason("SPOT_NOT_NUMERIC", symbol, heldSymbol)
      : optionSpotReason(state, symbol, heldSymbol),
  };
}
