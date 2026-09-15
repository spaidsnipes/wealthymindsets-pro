/**
 * scannerMetricFacts — Volume, Vol Ratio and RSI on /scanner.
 *
 * The fundamentals tiles beside these three now say which kind of nothing they
 * hold (see scannerFundamental.ts). These three still printed `—`, and two of
 * them were throwing away a diagnosis WM WAS ALREADY HOLDING.
 *
 * ── DEFECT ONE: A NAMED FAILURE RENDERED AS AN ANONYMOUS DASH ────────────
 *
 * `fetchRSI` does real work to learn WHY it failed. It calls `recordFailure`
 * with an actual sentence — "Not enough daily bars for RSI 14", or whatever
 * message the candle consumer returned — and parks it in a TTL'd failure cache
 * keyed by canonical identity. The row list renders that sentence in a
 * `role="status"` block. And the two cells that show the number itself did
 * this:
 *
 *     title={r.rsi==null?"RSI unavailable":undefined}>{r.rsi==null?"—":r.rsi}
 *     {l:"RSI", v:selected.rsi==null?"—":String(selected.rsi)}     // no title
 *
 * "RSI unavailable" is a restatement of the dash. The detail panel did not even
 * manage that. WM had the reason in its hand, on the same screen, and wrote a
 * glyph instead — the `if (!res.ok) return map` defect wearing a ternary.
 *
 * ── DEFECT TWO: A RECORDED FAILURE AND AN UNSETTLED ATTEMPT ARE NOT THE SAME
 *
 * `fetchRSI` returns `{rsi: null, failure: null}` when the outcome was
 * RETRYABLE, and `{rsi: null, failure: <recorded>}` when it was not. One of
 * those says "ask again shortly", the other says "WM asked, it will not work,
 * and here is the sentence". Both printed `—`. That is the NOT_ASKED /
 * NOT_CONFIGURED confusion again: the vaguer rendering makes the more hopeful
 * promise.
 *
 * ── DEFECT THREE: A GUARD THAT PREVENTED A LIE ALSO ERASED A FACT ────────
 *
 *     volume != null && avgVol != null && avgVol > 0 ? volume / avgVol : null
 *
 * `avgVol > 0` is CORRECT — dividing by zero does not yield a big ratio, it
 * yields no ratio. But the guard collapsed THREE different facts into one null:
 * WM has no session volume; WM has no average to compare against; WM has both
 * and the average is zero, so the quotient does not exist. The third is a
 * property of figures WM HOLDS, not a gap in what it fetched, and it is the
 * only one of the three that no later scan is likely to change.
 *
 * ── WHAT IS DELIBERATELY *NOT* CLAIMED ───────────────────────────────────
 *
 * Nothing here invents a denominator. When the quote carries no average volume
 * WM does NOT reach for a previous round's average and pair it with this
 * round's volume — that would produce a ratio between two different sessions
 * and present it as one. The ratio simply is not stated.
 *
 * Nothing here re-characterises a provider's zero average volume as "low" or
 * "thin". WM reports that the figure it holds is zero and that a ratio cannot
 * be formed from it. Why the provider wrote zero is not something WM knows.
 *
 * PURE — no clock, no I/O, no React.
 */

export type ScannerMetricState =
  /** WM holds the figure. */
  | "MEASURED"
  /** WM never obtained an input it needs. A gap in what WM has seen. */
  | "NOT_OBSERVED"
  /** WM holds the inputs and they do not define the figure. Not a fetch gap. */
  | "NOT_DERIVABLE"
  /** WM asked, the attempt failed, and WM recorded the reason. */
  | "FAILED"
  /** WM asked, the attempt has not settled, and WM expects to try again. */
  | "PENDING";

export interface ScannerMetricFact {
  /** What the cell says. Never a bare glyph. */
  readonly text: string;
  readonly state: ScannerMetricState;
  /** Carried on both `title` and `aria-label`. */
  readonly reason: string;
  /**
   * The figure itself when — and ONLY when — `state` is MEASURED, for sorting
   * and filtering. Null in every other state.
   *
   * This exists so a caller that needs the number does not recompute it beside
   * the owner with a `!` to quiet the compiler. A second arithmetic expression
   * for the same figure is a second place for the two to disagree, and the
   * assertion that makes it typecheck is the compiler being told to stop asking
   * the one question worth asking.
   */
  readonly value: number | null;
}

/** Coarse share-count magnitude, unchanged in spirit from the inline formatter. */
export function abbreviateShares(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return String(n);
}

/**
 * Session volume. ZERO IS A REAL ANSWER — a halted or freshly-listed name
 * genuinely trades nothing, and that is worth seeing rather than hiding.
 */
export function volumeMetricFact(volume: number | null, symbol: string): ScannerMetricFact {
  if (typeof volume === "number" && Number.isFinite(volume) && volume >= 0) {
    return {
      text: abbreviateShares(volume),
      state: "MEASURED",
      value: volume,
      reason:
        volume === 0
          ? `The quote WM observed for ${symbol} in this scan reports zero session volume. WM is showing the reported zero rather than hiding it behind a dash — a halted, thin or newly-listed name genuinely trades nothing.`
          : `Session volume for ${symbol} as carried in the quote WM observed in this scan. It is a provider figure, not a WM calculation.`,
    };
  }
  return {
    text: "Not observed",
    state: "NOT_OBSERVED",
    value: null,
    reason: `WM holds no session volume for ${symbol} — neither this round's quote nor the previous round carried one. This is a gap in what WM has seen, not a claim that nothing traded.`,
  };
}

/**
 * Relative volume. THE FIX FOR DEFECT THREE.
 *
 * Takes both inputs rather than the already-collapsed quotient, so the three
 * different reasons the quotient does not exist can each be stated. The
 * division itself stays here too, beside the reasons for its absence.
 */
export function volRatioMetricFact(
  volume: number | null,
  avgVolume: number | null,
  symbol: string,
): ScannerMetricFact {
  if (volume == null || !Number.isFinite(volume)) {
    return {
      text: "Not observed",
      state: "NOT_OBSERVED",
      value: null,
      reason: `WM cannot state a volume ratio for ${symbol} because it has not observed this session's volume. The ratio is session volume over average volume, and WM is missing the numerator.`,
    };
  }
  if (avgVolume == null || !Number.isFinite(avgVolume)) {
    return {
      text: "Not observed",
      state: "NOT_OBSERVED",
      value: null,
      reason: `WM observed this session's volume for ${symbol} but holds no average volume to compare it against — the quote did not carry one. WM will not reach back for an earlier round's average and divide this round's volume by it: that is a ratio between two different sessions presented as one.`,
    };
  }
  if (avgVolume <= 0) {
    return {
      text: "Not derivable",
      state: "NOT_DERIVABLE",
      value: null,
      reason: `The quote WM observed for ${symbol} reports an average volume of zero. Dividing by it does not produce a large ratio, it produces no ratio at all, so WM states none. This is a property of the figures WM holds, not a fetch that failed — and WM does not claim to know why the provider wrote a zero there.`,
    };
  }
  const ratio = +(volume / avgVolume).toFixed(1);
  return {
    text: `${ratio}×`,
    state: "MEASURED",
    value: ratio,
    reason: `${symbol} has traded ${abbreviateShares(volume)} against an average of ${abbreviateShares(avgVolume)}, a ratio of ${ratio}×. WM computed this from two provider figures in the same quote; the ratio itself is a WM calculation.`,
  };
}

/**
 * RSI. THE FIX FOR DEFECTS ONE AND TWO.
 *
 * `recordedFailure` is the sentence `fetchRSI` already stored in the failure
 * cache. Passing it here is the whole point: it is the difference between a
 * cell that restates the dash and a cell that says what happened.
 */
export function rsiMetricFact(
  rsi: number | null,
  recordedFailure: string | null,
  symbol: string,
): ScannerMetricFact {
  if (typeof rsi === "number" && Number.isFinite(rsi)) {
    return {
      text: String(rsi),
      state: "MEASURED",
      value: rsi,
      reason: `14-period RSI for ${symbol}, computed by WM from the daily closes it retrieved. This is a WM calculation over provider bars, not a figure the provider published.`,
    };
  }
  if (recordedFailure) {
    return {
      text: "Fetch failed",
      state: "FAILED",
      value: null,
      reason: `WM tried to compute an RSI for ${symbol} and could not: ${recordedFailure} WM recorded that reason rather than leaving the cell blank, and is holding the failure for a bounded window before attempting again.`,
    };
  }
  return {
    text: "Still fetching",
    state: "PENDING",
    value: null,
    reason: `WM has not settled an RSI for ${symbol} yet. The attempt did not complete and was NOT recorded as a failure, so WM expects to try again — unlike a recorded failure, this one may resolve without anything changing.`,
  };
}
