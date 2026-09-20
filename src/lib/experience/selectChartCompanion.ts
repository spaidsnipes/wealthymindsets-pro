/**
 * selectChartCompanion — the one owner of what the FL-04 News Chart
 * Companion is allowed to say.
 *
 * WHY THIS IS A SELECTOR AND NOT JUST A COMPONENT.
 *
 * The Companion's whole job is to repeat, on another route, readings that
 * /charts already owns. A component that re-derives "is this price live",
 * "is this tape fresh", "is this session open" is not a repeat — it is a
 * SECOND OPINION, and two owners of one reading is how this codebase got
 * a phone pill claiming RTH on a Saturday while /charts said CLOSED
 * (see MobileSessionPill's header) and a REGIME chip naming a market
 * state out of missing data (see selectRegimeBadge's header).
 *
 * So every judgement lives here, delegating to the existing canonical
 * owners, and the component renders the result without deciding anything:
 *
 *   price        → chartHeaderPriceFact (live quote vs bar close vs none)
 *   session      → selectCanonicalSessionToken (proven closure only)
 *   freshness    → lastTradeAtMs vs FRESH_WINDOW_MS, same law as the pill
 *   book         → state.priceTail (derivePriceTail's provably-closed closes)
 *   change       → deriveBarOverBarChange (NOT a session change — labelled)
 *   regime       → selectCanonRegimeView (quotes canon, never paraphrases)
 *   decision id  → CARRIED from the caller, never minted (§7)
 *
 * THE ABSENCE CASE IS THE POINT. The canonical market state store is
 * in-memory and page-session scoped by design ("not an unbounded history
 * database" — canonicalMarketStateStore.ts). A hard load of /news
 * therefore has NO snapshot, and the honest sentence names that cause —
 * the compiler runs on the chart — rather than implying the instrument
 * has no price. `missing` is a state with a REASON, never a blank.
 *
 * WHAT THIS SELECTOR MAY NEVER PRODUCE:
 *   - a price with no evidence behind it;
 *   - `fresh: true` without a timestamped trade inside the window;
 *   - a price line it interpolated, extended or smoothed;
 *   - a NEW Decision_ID.
 *
 * ── THE DECISION_ID CORRECTION ────────────────────────────────────────
 * An earlier revision of this file banned the Decision_ID outright, and a
 * test asserted the VM's JSON never even matched /decision_id/i. That was
 * the wrong reading of §7. The binding FL-04 law is:
 *
 *   "FL-04 — Chart Companion travels. News is a different human job.
 *    The mini book stays pinned WITH THE SAME DECISION_ID. That is OS
 *    behavior, not a second chart app."
 *
 * §7 forbids MINTING on a drawer or a room change — it does not forbid
 * CARRYING. A companion that drops the id is exactly the "second chart
 * app" the law names, because the trader's decision does not survive the
 * walk to News. So the id is an INPUT here, echoed verbatim, and this
 * module imports nothing from traderMemory/decisionIdentity — having no
 * access to `mintDecisionId` is the structural proof that it cannot mint.
 */

import {
  chartHeaderPriceFact,
  type HeaderPriceFact,
} from "@/lib/marketData/chartHeaderPriceFact";
import {
  canonicalAssetClass,
  selectCanonicalSessionToken,
} from "@/lib/marketData/canonicalIdentity";
import type { CanonicalMarketState } from "@/lib/marketData/canonicalMarketState";
import { deriveBarOverBarChange } from "@/lib/marketData/deriveLastBarClose";
import { selectCanonRegimeView } from "@/lib/marketData/selectRegimeBadge";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";

/** "Live tape" window — the same 30s law MobileSessionPill uses. */
export const COMPANION_FRESH_WINDOW_MS = 30_000;

/** Observed browser-local tape memory for one symbol. */
export interface CompanionTapeReading {
  readonly trades: number;
  readonly lastTradeMs: number | null;
  readonly cvdSpark: readonly number[];
}

export interface ChartCompanionInput {
  /** Active room symbol. Empty/whitespace suspends the panel entirely. */
  readonly symbol: string;
  /**
   * The CHART'S OWN persisted timeframe, or null before the client has
   * read it. Null suspends: a Companion that guesses a timeframe
   * subscribes to a store key nothing writes and then reports a
   * fabricated absence.
   */
  readonly timeframe: string | null;
  /** The snapshot found under the chart's identity, or null. */
  readonly state: CanonicalMarketState | null;
  readonly tape: CompanionTapeReading;
  /** Wall clock for freshness. */
  readonly nowMs: number;
  /** Session-clock date; null before mount (never read the clock in render). */
  readonly at: Date | null;
  /**
   * The Decision_ID the trader walked in with, or null if none is open.
   *
   * CARRIED, NEVER MINTED. Typed as a plain string on purpose: accepting
   * the branded `DecisionId` would mean importing the minting module, and
   * the one guarantee this selector offers about decisions is that it has
   * no way to create one. Null is honest — most visits to News happen
   * with no decision open, and inventing an id to fill the slot would be
   * the exact §7 violation the law names.
   */
  readonly decisionId?: string | null;
}

export type CompanionPrice =
  | { readonly kind: "READING"; readonly fact: HeaderPriceFact }
  | { readonly kind: "MISSING"; readonly reason: string };

/**
 * THE MINI BOOK, resolved to plot-ready numbers but NOT to pixels.
 *
 * `min`/`max` travel with the series because the renderer must not pick
 * its own scale: a component that recomputes bounds is a second owner of
 * "how big was this move", and the same tail would then look calm in one
 * panel and violent in another. They are the true extremes of the points
 * — never padded, never rounded outward to a prettier number. A padded
 * axis is a claim that price reached a level it did not reach.
 *
 * `reference` is the FIRST close in view, and it is the only baseline
 * this module has evidence for. It is NOT the session open and must
 * never be labelled as one: the tail is capped at PRICE_TAIL_MAX_POINTS
 * and may begin mid-session. The plate's dashed line and its red→green
 * crossover are both measured from this baseline, so naming it wrongly
 * would mis-colour the entire book.
 */
export type CompanionBook =
  | {
      readonly kind: "SERIES";
      readonly timeframe: string;
      readonly points: readonly { readonly t: number; readonly c: number }[];
      readonly min: number;
      readonly max: number;
      readonly reference: number;
    }
  | { readonly kind: "MISSING"; readonly reason: string };

/**
 * Bar-over-bar change — and it says so.
 *
 * deriveBarOverBarChange's own header is explicit that this IS NOT A
 * SESSION CHANGE and must never occupy the session-change slot
 * unlabelled. So `timeframe` is not decoration here; it is the label that
 * keeps "+1.87 (0.35%)" from being read as "up 0.35% on the day". The
 * renderer is required to show it.
 */
export type CompanionChange =
  | {
      readonly kind: "READING";
      readonly chg: number;
      readonly pct: number;
      readonly direction: "UP" | "DOWN" | "FLAT";
      readonly timeframe: string;
    }
  | { readonly kind: "MISSING"; readonly reason: string };

/** The REGIME chip, quoted from canon or silent with canon's own reason. */
export type CompanionRegime =
  | { readonly resolved: true; readonly value: string }
  | { readonly resolved: false; readonly reason: string | null };

export type ChartCompanionVM =
  | { readonly visible: false }
  | {
      readonly visible: true;
      readonly symbol: string;
      readonly timeframe: string;
      /** Session token + its own explanation, from the canonical owner. */
      readonly sessionToken: string;
      readonly sessionDetail: string;
      readonly price: CompanionPrice;
      /** The FL-04 mini price book, or a named absence. Never a guess. */
      readonly book: CompanionBook;
      /** Bar-over-bar change, carrying the timeframe that qualifies it. */
      readonly change: CompanionChange;
      /** REGIME chip — canon verbatim or canon's own silence. */
      readonly regime: CompanionRegime;
      /**
       * The decision the trader walked in with, echoed unchanged. Null
       * means none was open — not that one was lost.
       */
      readonly decisionId: string | null;
      /**
       * WHEN the compiled state this panel reads was captured — the only
       * lawful timestamp for a status bar that says "as of".
       *
       * It is `state.capturedAt`, NOT a clock read at render time. Printing
       * `Date.now()` beside the word LIVE would restamp stale evidence as
       * fresh on every tick; a clock ticking over a frozen price is exactly
       * the "beautiful lie" §20 names. Null when there is no state, so the
       * status bar has nothing to print rather than something to guess.
       */
      readonly asOf: number | null;
      readonly tapeObserved: boolean;
      readonly tradeCount: number;
      readonly fresh: boolean;
      /** Real CVD samples; fewer than 2 means no line may be drawn. */
      readonly cvdSpark: readonly number[];
      /** The door back to the chart, carrying the camera. Mints nothing. */
      readonly chartHref: string;
      /** The accessible sentence for the whole panel. */
      readonly spoken: string;
    };

/**
 * The sentence the panel shows when this page session holds no compiled
 * market state. It names the CAUSE (where the compiler lives), because
 * "no price" would be a claim about the instrument and this is a claim
 * about our own store.
 */
export function companionMissingStateReason(symbol: string): string {
  return (
    `No compiled market state for ${symbol} in this page session — the ` +
    `chart's compiler runs on the chart. Nothing is estimated in its place.`
  );
}

/**
 * The single price judgement. Three distinct absences, three distinct
 * honest sentences — and never a number without evidence:
 *
 *   no snapshot at all   → our store's lifetime (companionMissingStateReason)
 *   snapshot, no price   → chartHeaderPriceFact's OWN reason, quoted, because
 *                          the absence belongs to that owner and not to us
 *   snapshot with price  → the owner's exact text
 */
function derivePrice(symbol: string, state: CanonicalMarketState | null): CompanionPrice {
  if (!state) return { kind: "MISSING", reason: companionMissingStateReason(symbol) };
  const fact = chartHeaderPriceFact(state.price.last, state.lastBar ?? null);
  if (fact.kind === "AWAITING" || fact.kind === "NONE" || fact.text.trim() === "") {
    return { kind: "MISSING", reason: fact.reason };
  }
  return { kind: "READING", fact };
}

/**
 * The book judgement. Reads `state.priceTail` — the evidence derivePriceTail
 * already proved — and adds only the bounds the renderer is forbidden to
 * compute for itself.
 *
 * NOTHING IS RECOVERED HERE. If the tail is absent the answer is a named
 * absence, because every way to manufacture a substitute line is a lie of a
 * different flavour: repeating `lastBar` across the width draws a flat
 * session that never happened, and reusing the CVD spark draws a real
 * series under a price axis it does not belong to. That second one is not
 * hypothetical — it is what shipped in this slot before, and it is why §8
 * asks whether we built the hard part or only the part our components
 * already knew how to render.
 */
function deriveBook(symbol: string, state: CanonicalMarketState | null): CompanionBook {
  if (!state) return { kind: "MISSING", reason: companionMissingStateReason(symbol) };
  const tail = state.priceTail;
  if (!tail || tail.points.length < 2) {
    return {
      kind: "MISSING",
      reason:
        `Fewer than two provably-closed ${state.priceTail?.timeframe ?? "bar"} closes are ` +
        `available for ${symbol}, so there is no line to draw. One point is not a book, ` +
        `and no path is invented to fill the space.`,
    };
  }

  let min = tail.points[0]!.c;
  let max = min;
  for (const p of tail.points) {
    if (p.c < min) min = p.c;
    if (p.c > max) max = p.c;
  }

  return {
    kind: "SERIES",
    timeframe: tail.timeframe,
    points: tail.points,
    min,
    max,
    reference: tail.points[0]!.c,
  };
}

/**
 * The change judgement, delegated to `deriveBarOverBarChange` rather than
 * re-subtracted here.
 *
 * The tail's points are re-shaped into `BarCloseCandidate`s (seconds, as
 * that owner's contract requires) so the SAME function that the chart
 * header uses produces this number. Re-deriving `last - previous` inline
 * would be two lines and would also be a second owner of the change —
 * agreeing perfectly until the day one copy learns about gaps and the
 * other does not.
 */
function deriveChange(book: CompanionBook, capturedAt: number): CompanionChange {
  if (book.kind !== "SERIES") return { kind: "MISSING", reason: book.reason };

  const change = deriveBarOverBarChange(
    book.points.map((p) => ({ time: p.t / 1000, close: p.c })),
    book.timeframe,
    capturedAt,
  );
  if (!change) {
    return {
      kind: "MISSING",
      reason:
        `No prior closed ${book.timeframe} bar stands behind the latest one, so a ` +
        `change cannot be measured against anything.`,
    };
  }

  return {
    kind: "READING",
    chg: change.chg,
    pct: change.pct,
    direction: change.chg > 0 ? "UP" : change.chg < 0 ? "DOWN" : "FLAT",
    timeframe: change.timeframe,
  };
}

export function selectChartCompanion(input: ChartCompanionInput): ChartCompanionVM {
  const symbol = input.symbol.trim().toUpperCase();
  const timeframe = input.timeframe?.trim() ?? "";
  if (!symbol || !timeframe) return { visible: false };

  const session = selectCanonicalSessionToken({
    symbol,
    at: input.at,
    assetClass: canonicalAssetClass(symbol),
  });

  const price: CompanionPrice = derivePrice(symbol, input.state);
  const book: CompanionBook = deriveBook(symbol, input.state);
  const change: CompanionChange = deriveChange(book, input.state?.capturedAt ?? input.nowMs);

  // Canon's own words or canon's own silence — this module never supplies a
  // regime of its own, and a missing snapshot yields `reason: null` rather
  // than a sentence we invented about a state we never read.
  const regime: CompanionRegime = selectCanonRegimeView(input.state?.regime ?? null);

  const tapeObserved = input.tape.trades > 0;
  const fresh =
    tapeObserved &&
    input.tape.lastTradeMs != null &&
    input.nowMs - input.tape.lastTradeMs < COMPANION_FRESH_WINDOW_MS;

  return {
    visible: true,
    symbol,
    timeframe,
    sessionToken: session.token,
    sessionDetail: session.detail,
    price,
    book,
    change,
    regime,
    // Echoed, not created. `?? null` is the whole implementation on purpose.
    decisionId: input.decisionId?.trim() ? input.decisionId.trim() : null,
    // The state's OWN capture instant. Deliberately not `input.nowMs`:
    // falling back to the render clock when there is no state would print a
    // timestamp for evidence that does not exist.
    asOf: input.state?.capturedAt ?? null,
    tapeObserved,
    tradeCount: input.tape.trades,
    fresh,
    // Only real samples travel. A single sample is a dot, not a line, and
    // the renderer refuses to draw one.
    cvdSpark: input.tape.cvdSpark.length >= 2 ? input.tape.cvdSpark : [],
    chartHref: `${INSTRUMENT_VIEW_ROUTE}?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(timeframe)}`,
    spoken: speak({
      symbol,
      timeframe,
      sessionToken: session.token,
      price,
      book,
      change,
      regime,
      tapeObserved,
      fresh,
      trades: input.tape.trades,
    }),
  };
}

/**
 * The whole panel as ONE sentence.
 *
 * The book is the reason this is not optional. A screen-reader user gets
 * nothing from an SVG polyline, so the line's meaning has to survive in
 * words: how many closed bars, over what timeframe, across what range.
 * Speaking "price chart" and stopping would hand a sighted reader a
 * measured claim and a non-sighted reader a decoration.
 */
function speak(p: {
  symbol: string;
  timeframe: string;
  sessionToken: string;
  price: CompanionPrice;
  book: CompanionBook;
  change: CompanionChange;
  regime: CompanionRegime;
  tapeObserved: boolean;
  fresh: boolean;
  trades: number;
}): string {
  const { symbol, timeframe, sessionToken, price, tapeObserved, fresh, trades } = p;
  const priceClause =
    price.kind === "READING"
      ? `${price.fact.text}.`
      : price.reason;
  const changeClause =
    p.change.kind === "READING"
      ? `Change over the last closed ${p.change.timeframe} bar: ` +
        `${p.change.chg >= 0 ? "+" : ""}${p.change.chg.toFixed(2)} ` +
        `(${p.change.pct >= 0 ? "+" : ""}${p.change.pct.toFixed(2)}%).`
      : p.change.reason;
  const bookClause =
    p.book.kind === "SERIES"
      ? `Price book: ${p.book.points.length} closed ${p.book.timeframe} bars, ` +
        `ranging ${p.book.min.toFixed(2)} to ${p.book.max.toFixed(2)}.`
      : p.book.reason;
  const regimeClause = p.regime.resolved
    ? `Regime: ${p.regime.value}.`
    : p.regime.reason
      ? `Regime unresolved — ${p.regime.reason}`
      : "Regime unresolved; no compiled state to read it from.";
  const tapeClause = !tapeObserved
    ? "No trades observed in this browser's memory for this symbol."
    : fresh
      ? `${trades} trades observed in this browser's memory, most recent within the last 30 seconds.`
      : `${trades} trades observed in this browser's memory, none in the last 30 seconds.`;
  return (
    `Chart companion for ${symbol} on the ${timeframe} camera, session ${sessionToken}. ` +
    `${priceClause} ${changeClause} ${bookClause} ${regimeClause} ${tapeClause} ` +
    `This panel reads the state the chart compiled; it decides nothing.`
  );
}

export default selectChartCompanion;
