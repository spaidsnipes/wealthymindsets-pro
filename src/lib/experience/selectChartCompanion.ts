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
 *   - a Decision_ID (§7 Market Camera Immortality — the Companion
 *     renders the camera, it does not mint a decision).
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
}

export type CompanionPrice =
  | { readonly kind: "READING"; readonly fact: HeaderPriceFact }
  | { readonly kind: "MISSING"; readonly reason: string };

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
    tapeObserved,
    tradeCount: input.tape.trades,
    fresh,
    // Only real samples travel. A single sample is a dot, not a line, and
    // the renderer refuses to draw one.
    cvdSpark: input.tape.cvdSpark.length >= 2 ? input.tape.cvdSpark : [],
    chartHref: `${INSTRUMENT_VIEW_ROUTE}?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(timeframe)}`,
    spoken: speak(symbol, timeframe, session.token, price, tapeObserved, fresh, input.tape.trades),
  };
}

function speak(
  symbol: string,
  timeframe: string,
  sessionToken: string,
  price: CompanionPrice,
  tapeObserved: boolean,
  fresh: boolean,
  trades: number,
): string {
  const priceClause =
    price.kind === "READING"
      ? `${price.fact.text}.`
      : price.reason;
  const tapeClause = !tapeObserved
    ? "No trades observed in this browser's memory for this symbol."
    : fresh
      ? `${trades} trades observed in this browser's memory, most recent within the last 30 seconds.`
      : `${trades} trades observed in this browser's memory, none in the last 30 seconds.`;
  return (
    `Chart companion for ${symbol} on the ${timeframe} camera, session ${sessionToken}. ` +
    `${priceClause} ${tapeClause} ` +
    `This panel reads the state the chart compiled; it decides nothing.`
  );
}

export default selectChartCompanion;
