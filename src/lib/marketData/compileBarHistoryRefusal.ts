/**
 * WHY THIS CHART HAS NO BARS — the receipt that was being SHREDDED.
 *
 * ── THE DEFECT THIS CLOSES, FOUND ON THE SERVING CHART ─────────────────────
 *
 * BTCUSDT, 5m, wealthymindsetspro.com, 2026-09-20. Empty canvas, and the room
 * printed, in four separate places:
 *
 *     masthead      FEED UNKNOWN
 *     price line    — — (change unavailable)   ·   NEWEST BAR · TIME UNKNOWN
 *     right rail    BTCUSDT · 5m · PRICE UNKNOWN
 *     footer        SOURCE UNKNOWN
 *
 * At that same moment the product's OWN API answered
 * `/api/finnhub?sym=BTCUSDT&type=quote` with `price: 81608` from
 * `BINANCE:BTCUSDT`. So PRICE UNKNOWN was not merely unhelpful — one half of
 * the product was printing UNKNOWN about a number the other half was serving.
 *
 * And the bar history had REASONS, three different ones, all already known.
 * Probed against the serving host the same minute, BTCUSDT · 5m · bars=5:
 *
 *     /api/alpaca  → HTTP 200, `"candles":[]`        — asked, answered, EMPTY
 *     /api/finnhub → {"edge":"FORBIDDEN"}            — asked, REFUSED, classified
 *     /api/yahoo   → {"error":"Error: Yahoo HTTP 404"} — asked, REFUSED, 404
 *
 * Three distinct answers. One word on the glass: UNKNOWN.
 *
 * (A first draft of this docblock asserted the Yahoo lane refused BEFORE the
 * wire, on `yahooSymbol.ts`'s deliberate USDT rule. The probe above says
 * otherwise — it went out and came back 404. That rule is real and is a
 * NOT_ASKED reason for other call paths; it was not this one. Left in writing
 * because a module about not guessing may not ship a guess in its own header.)
 *
 * ── WHY THE TRADER NEVER SEES THAT ─────────────────────────────────────────
 *
 * Not because it is filed in the wrong drawer — this product's usual failure —
 * but because it is DESTROYED. Every candle fetcher in MainChart ends the same
 * way:
 *
 *     if (!res.ok) return null;          // fetchFinnhubCandles
 *     catch { return null; }             // fetchYahooCandles, and the rest
 *
 * A classified, deliberate, well-argued refusal is collapsed to `null` inside
 * the helper, one stack frame below anything that could render it. By the time
 * the cascade asks "why are there no bars?", there is nothing left to ask. The
 * room is not withholding the reason. It genuinely no longer has it.
 *
 * That is why this module takes ATTEMPTS, not a symbol. It cannot re-derive
 * what the helpers threw away, and it must not guess: the only honest fix is
 * for each attempt to survive the trip up, and for one owner to turn the set
 * of them into one sentence.
 *
 * ── THE DISTINCTION THIS MODULE EXISTS TO HOLD ─────────────────────────────
 *
 * Four outcomes, and a trader acts differently on each:
 *
 *   SERVED     — bars arrived. Nothing to explain.
 *   NOT_ASKED  — a rule in this product stopped the request before the wire.
 *                This is OUR decision and it must be owned out loud, never
 *                dressed up as the vendor's silence.
 *   REFUSED    — asked, and the vendor said no. The vendor's own classified
 *                edge token travels with it, verbatim.
 *   EMPTY      — asked, the vendor answered, and carried no bars. That is a
 *                fact about the market or the window, not a failure.
 *
 * Collapsing these is precisely how UNKNOWN got onto four pieces of glass at
 * once. "Nobody answered" and "we never asked" are not the same sentence and
 * only one of them is about the market.
 *
 * ── WHAT THIS MODULE REFUSES TO DO ─────────────────────────────────────────
 *
 * It does not grade. There is no "feed healthy", no hue ramp, no score — Build
 * Order §9. It reports which doors were tried and what each one said.
 *
 * It does not speak for the QUOTE. The quote lane is a different question with
 * a different owner, and on the very symbol that motivated this module the two
 * answers DISAGREE — price served, bars refused. A module that folded them
 * into one verdict would re-create the contradiction it was built to expose.
 *
 * It does not name a vendor the caller did not name. If an attempt never
 * reaches this compiler, it does not appear, and the headline counts only what
 * it was handed. A list that looks complete and is not is worse than a short
 * list that says how long it is.
 *
 * PURE. DETERMINISTIC. No React, no IO, no clock.
 */

export const BAR_HISTORY_REFUSAL_VERSION =
  "wm.bar-history-refusal.v1" as const;

export type VendorOutcome = "SERVED" | "NOT_ASKED" | "REFUSED" | "EMPTY";

export interface VendorAttempt {
  /** What the trader would call the source: "Finnhub", "Yahoo", "Alpaca". */
  readonly vendor: string;
  readonly outcome: VendorOutcome;
  /**
   * The vendor's OWN classified edge token when it refused ("FORBIDDEN",
   * "RATE LIMITED", "AUTH BLOCKED"), passed through untouched. Null when the
   * vendor did not classify, or was never asked.
   */
  readonly edge?: string | null;
  /**
   * For NOT_ASKED only: the reason OUR rule stopped the request. Required in
   * spirit — a skipped vendor with no stated rule is an unexplained silence,
   * which is the defect, so `compile` says so rather than hiding it.
   */
  readonly rule?: string | null;
}

export interface BarHistoryRefusalVM {
  readonly version: typeof BAR_HISTORY_REFUSAL_VERSION;
  /** True when at least one vendor supplied bars. Then there is nothing to explain. */
  readonly served: boolean;
  /** The vendor that supplied them, or null. */
  readonly servedBy: string | null;
  /** One line per attempt, in the order they were made. Always on the glass. */
  readonly lines: readonly string[];
  /** Counts only, never a verdict. Checkable against the network tab. */
  readonly headline: string;
  /** How many doors were actually knocked on, as opposed to skipped by a rule. */
  readonly askedCount: number;
  readonly attemptCount: number;
}

function line(a: VendorAttempt): string {
  switch (a.outcome) {
    case "SERVED":
      return `${a.vendor} supplied the bars on this chart.`;
    case "REFUSED":
      return a.edge
        ? `${a.vendor} was asked and refused — ${a.edge}.`
        : `${a.vendor} was asked and refused, without saying why.`;
    case "EMPTY":
      return `${a.vendor} answered and carried no bars for this window.`;
    case "NOT_ASKED":
      // An unexplained skip is reported AS unexplained. Inventing a plausible
      // rule here would be this module doing the exact thing it was written to
      // stop: presenting a guess in a reading's clothes.
      return a.rule
        ? `${a.vendor} was not asked — ${a.rule}`
        : `${a.vendor} was not asked, and this room cannot say which rule stopped it.`;
  }
}

export function compileBarHistoryRefusal(
  attempts: readonly VendorAttempt[],
): BarHistoryRefusalVM {
  const servedAttempt = attempts.find(a => a.outcome === "SERVED") ?? null;
  const askedCount = attempts.filter(a => a.outcome !== "NOT_ASKED").length;
  const lines = attempts.map(line);

  const headline = servedAttempt
    ? `Bar history served by ${servedAttempt.vendor}.`
    : attempts.length === 0
      ? "No source has been asked for bar history yet."
      : askedCount === 0
        ? `No bar history: none of the ${attempts.length} known sources was asked ` +
          `for this symbol.`
        : `No bar history: ${askedCount} of ${attempts.length} known ` +
          `${attempts.length === 1 ? "source" : "sources"} ` +
          `${askedCount === 1 ? "was" : "were"} asked, and none returned bars.`;

  return {
    version: BAR_HISTORY_REFUSAL_VERSION,
    served: servedAttempt !== null,
    servedBy: servedAttempt?.vendor ?? null,
    lines,
    headline,
    askedCount,
    attemptCount: attempts.length,
  };
}

export default compileBarHistoryRefusal;
