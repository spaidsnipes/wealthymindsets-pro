import { parseTimeframeMs } from "../experience/marketFieldFreshness";

/**
 * THE MINIMUM EVIDENCE A BAR CLOSE NEEDS — and not one field more.
 *
 * This file used to take `OHLCVBar`, which additionally requires `open`,
 * `high`, `low` and `volume`. None of them are read here: the whole module
 * ranks bars by `time` and reports `close`.
 *
 * That over-wide parameter had a real cost. `/command-deck`'s chart parses
 * `/api/yahoo` into candles that deliberately carry NO volume — the endpoint's
 * volume is not trusted, so `parseCandles` drops it rather than pass a number
 * it cannot stand behind. Handing those candles to an `OHLCVBar[]` parameter
 * therefore required inventing `volume: 0`, and a fabricated zero is exactly
 * the provenance lie the rest of this file exists to refuse. Widening the
 * parameter to what is actually read lets honest partial evidence through
 * WITHOUT anyone having to make a number up.
 *
 * `OHLCVBar[]` remains assignable to this, so /charts is unaffected.
 */
export interface BarCloseCandidate {
  /** Bar-open epoch in SECONDS (the lightweight-charts convention). */
  readonly time: number;
  readonly close: number;
}

/**
 * LAST VERIFIED BAR CLOSE — a second, explicitly-labelled price owner.
 *
 * ── THE DEFECT THIS EXISTS TO CLOSE ───────────────────────────────────
 * Observed live on /charts in ONE viewport at ONE moment:
 *
 *   chart header  :  7,622.25  —  (change unavailable)  HISTORICAL BARS VERIFIED
 *   MARKET tile   :  ES1! · 1h · PRICE UNKNOWN · UNAVAILABLE · asOf 04:38:36Z
 *
 * Both statements are individually defensible. The tile is truthful that no
 * LIVE trade print exists with the cash session closed. The header is truthful
 * that the last loaded candle closed at 7,622.25. But side by side they force
 * the trader to reconcile two owners in their head — SCENE_FRAGMENTATION in
 * the TRUTH dimension. Understating knowledge is a truth defect in the same
 * family as overclaiming it.
 *
 * ── WHY A SEPARATE FIELD AND NOT `price.last` ─────────────────────────
 * `price.last` means "a live trade printed at this price, and we hold the
 * timestamped tick that proves it." `chartMarketStatePublisher` only fills it
 * when a per-trade tick MATCHES the displayed ticker price, and that
 * strictness is correct — it is what keeps a seeded or quote-derived number
 * from being sold as a print. Widening it would silently demote the guarantee
 * every existing consumer already relies on.
 *
 * So a bar close gets its OWN field with its OWN provenance word. A consumer
 * that wants a print still gets null; a consumer that can honestly render
 * "last bar close" now has something to render instead of PRICE UNKNOWN.
 *
 * ── WHY THE INPUT IS BARS AND NOT `ticker.price` ──────────────────────
 * `MarketState.ticker.price` is NOT provably bar-derived. It can come from a
 * REST quote, from a tick, or — before any provider resolves — from the
 * `SYMBOL_SEEDS` table in useWebSocket.ts. Publishing that as a "verified bar
 * close" would fabricate provenance, which §35 PROTECTED TRUTH forbids
 * outright. The candle array that MainChart hands up through `onBarsReady` is
 * the only input here that actually came from loaded bars.
 */
export interface LastBarCloseEvidence {
  /** Close of the newest loaded bar. Always finite and > 0. */
  readonly close: number;
  /** Bar-open epoch in MILLISECONDS. */
  readonly barOpenedAtMs: number;
  /** The timeframe the bar belongs to. A close is meaningless without it. */
  readonly timeframe: string;
}

/**
 * ── THE SECOND DEFECT: A BAR THAT HAS NOT CLOSED HAS NO CLOSE ─────────
 * Observed live on /charts 2026-09-15, NQ1! 1h, 10:34:19Z:
 *
 *   chart header  :  O 29355.75  H 29355.75  L 29355.75  C 29355.75  V 0
 *                    (countdown 0:24:43 to bar close)
 *   MARKET tile   :  NQ1! · 1h · 29355.75 LAST 1h BAR CLOSE
 *
 * Zero range and zero volume with a running countdown is the signature of a
 * bar that OPENED at 10:00Z and has not yet taken a single trade. Its "close"
 * is just the seed it was born with. Naming that a BAR CLOSE is a fabricated
 * provenance claim of exactly the kind this file exists to refuse — and the
 * number can be arbitrarily stale, because nothing has traded into it.
 *
 * So the newest bar is no longer automatically the answer. We name the newest
 * bar that has PROVABLY CLOSED, by two independent proofs:
 *
 *   1. A strictly NEWER bar exists. Then this one ended — no clock required.
 *      This proof is total: it needs no timeframe parsing and cannot be fooled
 *      by a wrong clock or a mislabelled interval.
 *   2. Otherwise, for the newest bar only: barOpen + one interval <= now.
 *      This needs both a parseable timeframe and a caller-supplied clock. When
 *      either is missing we do NOT guess — we fall back to proof 1 and name
 *      the bar before it.
 *
 * The degradation is deliberately conservative: naming an older, genuinely
 * closed bar understates freshness by at most one bar, while naming a forming
 * bar publishes a close that never happened. Given a choice between those two,
 * §35 PROTECTED TRUTH picks the first every time.
 */

/**
 * Pure. Returns null — never a guess — whenever the evidence is not good
 * enough to name a bar close.
 *
 * `OHLCVBar.time` is in SECONDS (the lightweight-charts convention that
 * `liveBarPolicy.applyTickToLiveBar` also emits), so it is converted here
 * exactly once. Every other field in canonical market state is milliseconds;
 * leaking a seconds value into it would read as 1970.
 *
 * `nowMs` is the caller's captured clock. It is OPTIONAL because a pure
 * selector must never reach for `Date.now()` itself — a hidden clock is how a
 * function stops being testable. Omitting it costs at most one bar of
 * freshness; it can never cause an overclaim.
 */
/**
 * Newest + runner-up by bar time, ignoring unusable bars.
 *
 * Extracted so `deriveLastBarClose` and `lastBarCloseRecheckAtMs` cannot drift
 * apart. A scheduler that computed "when does the answer change?" with its own
 * copy of this arithmetic would be a SECOND OWNER of the same proof — the exact
 * VACUOUS AGREEMENT shape this codebase keeps finding, since the two copies
 * agree right up until one of them is edited.
 */
function rankBars(bars: readonly BarCloseCandidate[]): {
  newest: BarCloseCandidate | null;
  runnerUp: BarCloseCandidate | null;
} {
  // Do NOT assume the array is sorted. A close attributed to the wrong bar is
  // a fabricated timestamp even when the number happens to be right.
  let newest: BarCloseCandidate | null = null;
  let runnerUp: BarCloseCandidate | null = null;
  for (const bar of bars) {
    if (!bar) continue;
    if (!Number.isFinite(bar.close) || bar.close <= 0) continue;
    if (!Number.isFinite(bar.time) || bar.time <= 0) continue;
    if (newest === null || bar.time > newest.time) {
      runnerUp = newest;
      newest = bar;
    } else if (bar.time < newest.time && (runnerUp === null || bar.time > runnerUp.time)) {
      runnerUp = bar;
    }
  }
  return { newest, runnerUp };
}

/**
 * THE MOMENT THIS ANSWER GOES STALE ON ITS OWN.
 *
 * `deriveLastBarClose` is pure, but it is not time-invariant: PROOF 2 flips
 * from false to true purely by the CLOCK ADVANCING, with no change to `bars`
 * and no change to `timeframe`. A caller that only recomputes when its inputs
 * change will therefore keep publishing the runner-up bar for up to one whole
 * interval after the newest bar has provably closed.
 *
 * MEASURED LIVE on /charts 2026-09-15T18:23:39Z, TSLA 15m, in ONE DOM read:
 *
 *   OHLCV strip   :  C 357.87   ("this bar's interval has fully elapsed")
 *   decision spine:  357.47 LAST 15m BAR CLOSE   (asOf 18:14:00Z)
 *
 * Both owners were internally honest — 357.47 really was the last provably
 * closed bar AS OF 18:14 — but the spine's snapshot was nine minutes old
 * because nothing in its input had changed since, and the tape was quiet. So
 * the page showed two prices, both labelled "close", and the trader had no way
 * to know one was a bar behind. Canon Weakness #1, multi-price disagreement.
 *
 * The repair is NOT to relax PROOF 2 — the conservatism is correct. It is to
 * RE-ASK the question at the one instant the answer can change by itself.
 * Returns that instant, or null when there is nothing to wait for (the newest
 * bar has already closed, or the evidence never supported PROOF 2 anyway — in
 * both cases only a new bar can change the answer, and a new bar IS an input
 * change the caller already reacts to).
 */
export function lastBarCloseRecheckAtMs(
  bars: readonly BarCloseCandidate[] | null | undefined,
  timeframe: string | null | undefined,
  nowMs?: number | null,
): number | null {
  if (!bars || bars.length === 0) return null;
  const tf = typeof timeframe === "string" ? timeframe.trim() : "";
  if (!tf) return null;

  const intervalMs = parseTimeframeMs(tf);
  if (intervalMs === null) return null;
  if (!(typeof nowMs === "number" && Number.isFinite(nowMs) && nowMs > 0)) return null;

  const { newest } = rankBars(bars);
  if (newest === null) return null;

  const closesAt = Math.round(newest.time * 1000) + intervalMs;
  // Already elapsed — PROOF 2 is satisfied right now, so waiting changes
  // nothing. Strictly greater: at exactly `closesAt` the deriver already says
  // closed (`<=`), and returning it would schedule a zero-delay no-op.
  return closesAt > nowMs ? closesAt : null;
}

/**
 * THE REFERENCE CLOSE THE QUOTE PROVIDER DOES NOT HAVE.
 *
 * ── THE DEFECT, MEASURED LIVE ─────────────────────────────────────────
 * /charts, TSLA 15m, 2026-09-17T02:53Z, reading the two header rows in one
 * DOM pass. The chrome header and MainChart's price row BOTH printed:
 *
 *     358.13 LAST 15m BAR CLOSE  —  (change unavailable)
 *     title: "Change unavailable — no verified reference close from the
 *             current quote provider."
 *
 * Read that sentence against the number three words to its left. The price
 * slot has ALREADY been repaired to say a bar close out loud rather than
 * withhold it (`chartHeaderPriceFact`). The change slot beside it then
 * declares it has no verified reference close — and it is telling the truth
 * about THE QUOTE PROVIDER, which is the only place it looked. Roughly 400
 * verified candles were loaded in the very same component at that moment, and
 * the close of the bar before the last one is a verified reference close by
 * exactly the standard `deriveLastBarClose` already applies.
 *
 * So the scope of the sentence is narrower than the scope of the evidence.
 * That is the same defect as the masthead's FEED UNKNOWN over 400 candles,
 * one bar lower: a claim of ignorance made above evidence that is present.
 * `changeAbsence.ts` predicted this repair in its own words — "wiring it into
 * this header is a real improvement that belongs in its own change with its
 * own proof."
 *
 * ── WHAT THIS IS NOT ──────────────────────────────────────────────────
 * IT IS NOT A SESSION CHANGE, and it must never be rendered as one. A session
 * change is measured against the prior SESSION's close; this is measured
 * against the prior BAR. On a 15m chart those are wildly different numbers,
 * and swapping one for the other in the slot a trader reads as "today" would
 * be a far worse lie than the dash it replaces.
 *
 * It is therefore a DIFFERENT READING, following `chartHeaderPriceFact`'s rule
 * exactly: the timeframe and the words travel WITH the number, it gets its own
 * `kind` so colour is chosen from declared provenance, and it never occupies
 * the session-change slot unlabelled.
 *
 * Deliberately NOT derived here: the prior session close. Inferring session
 * boundaries from bar timestamps needs a market calendar this module does not
 * have, and guessing one would fabricate exactly the provenance the rest of
 * this file refuses. A bar-over-bar delta is what the bars alone can prove.
 *
 * ── WHY IT DELEGATES RATHER THAN RANKS ────────────────────────────────
 * The hard part — WHICH bar has provably closed — is already solved above,
 * with two independent proofs and a deliberate conservative degradation.
 * Re-deriving "the last closed bar" here would make a SECOND OWNER of that
 * proof, and the two would agree until the day one of them was edited. So
 * this calls `deriveLastBarClose` for the endpoint and only has to answer the
 * genuinely new question: which bar came immediately before THAT one.
 *
 * Both endpoints are provably-closed bars: the chosen bar by
 * `deriveLastBarClose`'s own proof, and its predecessor by PROOF 1 (a strictly
 * newer bar exists — the chosen one).
 */
export interface BarOverBarChange {
  readonly chg: number;
  readonly pct: number;
  /** Close of the newest provably-closed bar. */
  readonly close: number;
  /** Close of the bar immediately before it — the reference. */
  readonly referenceClose: number;
  readonly referenceBarOpenedAtMs: number;
  readonly barOpenedAtMs: number;
  readonly timeframe: string;
}

export function deriveBarOverBarChange(
  bars: readonly BarCloseCandidate[] | null | undefined,
  timeframe: string | null | undefined,
  nowMs?: number | null,
): BarOverBarChange | null {
  const chosen = deriveLastBarClose(bars, timeframe, nowMs);
  if (chosen === null || !bars) return null;

  // The newest bar STRICTLY OLDER than the chosen one. Strictly, because two
  // bars sharing a timestamp are a data defect, not a pair — picking either as
  // "the one before" would invent an ordering the evidence does not support.
  let prior: BarCloseCandidate | null = null;
  for (const bar of bars) {
    if (!bar) continue;
    if (!Number.isFinite(bar.close) || bar.close <= 0) continue;
    if (!Number.isFinite(bar.time) || bar.time <= 0) continue;
    const ms = Math.round(bar.time * 1000);
    if (ms >= chosen.barOpenedAtMs) continue;
    if (prior === null || ms > Math.round(prior.time * 1000)) prior = bar;
  }
  if (prior === null) return null;

  const referenceClose = prior.close;
  // Guarded rather than assumed: a zero or negative reference close would make
  // the percentage infinite or sign-flipped. `rankBars` already excludes those
  // bars, and so does the loop above — this is the belt to that braces, kept
  // because a division is where a fabricated number is cheapest to produce.
  if (!(referenceClose > 0)) return null;

  const chg = chosen.close - referenceClose;
  return {
    chg,
    pct: (chg / referenceClose) * 100,
    close: chosen.close,
    referenceClose,
    referenceBarOpenedAtMs: Math.round(prior.time * 1000),
    barOpenedAtMs: chosen.barOpenedAtMs,
    timeframe: chosen.timeframe,
  };
}

export function deriveLastBarClose(
  bars: readonly BarCloseCandidate[] | null | undefined,
  timeframe: string | null | undefined,
  nowMs?: number | null,
): LastBarCloseEvidence | null {
  if (!bars || bars.length === 0) return null;
  const tf = typeof timeframe === "string" ? timeframe.trim() : "";
  if (!tf) return null;

  const { newest, runnerUp } = rankBars(bars);
  if (newest === null) return null;

  // PROOF 2 — can we show the newest bar's interval has fully elapsed?
  const intervalMs = parseTimeframeMs(tf);
  const clockOk = typeof nowMs === "number" && Number.isFinite(nowMs) && nowMs > 0;
  const newestClosed =
    intervalMs !== null && clockOk
      ? Math.round(newest.time * 1000) + intervalMs <= (nowMs as number)
      : false;

  // PROOF 1 — the bar before the newest is closed by the mere existence of a
  // newer one. Used whenever proof 2 could not be established.
  const chosen = newestClosed ? newest : runnerUp;
  if (chosen === null) return null;

  return {
    close: chosen.close,
    barOpenedAtMs: Math.round(chosen.time * 1000),
    timeframe: tf,
  };
}
