/**
 * stockInfoSessionFacts — the Quotes stats grid on StockInfoPanel.
 *
 * Six rows sat in that grid (High, Low, Open, Prev Close, Volume, Turnover)
 * and FOUR DIFFERENT FACTS were being printed with the SAME `—`.
 *
 * ── DEFECT ONE: A CAPABILITY GAP WORE A DATA GAP'S CLOTHES ───────────────
 *
 *     const turn = "—";
 *
 * Turnover was not missing. Turnover was NEVER COMPUTED. The row existed, it
 * had a label, and it printed the same glyph the other five rows print when a
 * fetch fails — so a trader reading the panel would conclude the provider was
 * having a bad morning, and would come back later expecting a number that WM
 * has no code to produce. A permanent absence was disguised as a transient
 * one. That is the most expensive kind of glyph: it does not merely withhold,
 * it makes a promise.
 *
 * ── DEFECT TWO: A TRUTHINESS TEST OVER A NUMBER ──────────────────────────
 *
 *     const vol = realOHLC?.volume ? fmt(realOHLC.volume) : "—";
 *
 * `0` is falsy. A genuinely-observed zero-volume session — a halted name, a
 * thin pre-market, a freshly-listed ticker — was rendered as though WM had
 * observed nothing at all. And upstream the panel wrote `volume: j.volume ??
 * 0`, so a volume the provider DID NOT CARRY had already been laundered into
 * a number before it ever reached the test. Two layers, each destroying the
 * distinction the other needed.
 *
 * ── DEFECT THREE: NOT_OBSERVED AND NOT_REPORTED WERE ONE GLYPH ───────────
 *
 * `realOHLC === null` means the Yahoo quote was refused, or the observation
 * gate declined it — WM never got the session. A field absent from a quote WM
 * DID receive is a different fact. Both printed `—`.
 *
 * ── WHAT IS DELIBERATELY *NOT* CLAIMED ───────────────────────────────────
 *
 * Nothing here computes turnover. Turnover is price × volume ONLY if you have
 * a volume-weighted price for the same window, and WM has a last price and a
 * daily volume — multiplying those would produce a plausible-looking number
 * that is not turnover. So the row says WM does not compute it, and says why.
 * Shipping the wrong formula because the row looked empty is exactly how the
 * original glyph got there.
 *
 * PURE — no clock, no I/O, no React.
 */

export type SessionFactState =
  /** WM observed the figure in a quote it received. */
  | "OBSERVED"
  /** WM received the quote; it did not carry this field. */
  | "NOT_REPORTED"
  /** WM never received a usable quote for this symbol. */
  | "NOT_OBSERVED"
  /** WM does not compute this figure at all. Not a data gap. */
  | "NOT_COMPUTED";

export interface SessionFact {
  /** What the row says. Never a bare glyph. */
  readonly text: string;
  readonly state: SessionFactState;
  /** Carried on `title` and `aria-label`. */
  readonly reason: string;
}

/** Coarse volume magnitude — unchanged in spirit from the original inline code. */
export function formatVolumeMagnitude(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  return (n / 1e3).toFixed(0) + "K";
}

/**
 * A price-shaped session fact (High / Low / Open / Prev Close).
 *
 * `quoteObserved` is the panel's own `realOHLC !== null` — it answers "did WM
 * get a session at all", which is a different question from "did the session
 * carry this number", and both answers are now sayable.
 */
export function priceSessionFact(
  raw: unknown,
  decimals: number,
  label: string,
  symbol: string,
  quoteObserved: boolean,
): SessionFact {
  if (!quoteObserved) {
    return {
      text: "Not observed",
      state: "NOT_OBSERVED",
      reason: `WM holds no usable quote for ${symbol} right now, so it has not observed the ${label.toLowerCase()}. The quote was refused or did not pass WM's observation gate. This is a gap in what WM has seen, not a statement about the market.`,
    };
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return {
      text: raw.toFixed(decimals),
      state: "OBSERVED",
      reason: `${label} for ${symbol} as carried in the quote WM observed. It is a provider figure, not a WM calculation.`,
    };
  }
  return {
    text: "Not reported",
    state: "NOT_REPORTED",
    reason: `WM observed a quote for ${symbol}, and it did not carry a usable ${label.toLowerCase()}. WM will not substitute a nearby number for it.`,
  };
}

/**
 * Volume. Separate from the price facts because ZERO IS A REAL ANSWER HERE and
 * the old truthiness test threw it away.
 */
export function volumeSessionFact(
  raw: unknown,
  symbol: string,
  quoteObserved: boolean,
): SessionFact {
  if (!quoteObserved) {
    return {
      text: "Not observed",
      state: "NOT_OBSERVED",
      reason: `WM holds no usable quote for ${symbol} right now, so it has not observed the session volume. This is a gap in what WM has seen, not a claim that nothing traded.`,
    };
  }
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
    return {
      text: formatVolumeMagnitude(raw),
      state: "OBSERVED",
      reason:
        raw === 0
          ? `The quote WM observed for ${symbol} reports zero volume for this session. WM is showing the reported zero rather than hiding it behind a dash — a halted, thin or newly-listed name genuinely trades nothing, and that is worth seeing.`
          : `Session volume for ${symbol} as carried in the quote WM observed. It is a provider figure, not a WM calculation.`,
    };
  }
  return {
    text: "Not reported",
    state: "NOT_REPORTED",
    reason: `WM observed a quote for ${symbol}, and it did not carry a session volume. WM will not write this as zero: a volume the provider omitted and a session that genuinely traded nothing are different facts.`,
  };
}

/**
 * Turnover. THE FIX FOR DEFECT ONE.
 *
 * This is not a fetch that failed. WM has no turnover figure and no sound way
 * to derive one from what it holds, and the row now says exactly that instead
 * of implying a provider outage.
 */
export function turnoverSessionFact(symbol: string): SessionFact {
  return {
    text: "Not computed",
    state: "NOT_COMPUTED",
    reason: `WM does not compute session turnover for ${symbol}. Turnover needs a volume-weighted price over the same window as the volume; WM holds a last price and a daily volume, and multiplying those would produce a plausible number that is not turnover. This row is a WM capability gap, not a provider outage — waiting will not fill it in.`,
  };
}
