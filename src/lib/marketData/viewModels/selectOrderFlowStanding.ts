/**
 * selectOrderFlowStanding — the ONE sentence the chart room's ORDER FLOW
 * equipment says before the trader has opened anything.
 *
 * ── WHY THIS EXISTS AT ALL ────────────────────────────────────────────────
 * Five microstructure inventions — value candle, absorption, delta divergence,
 * liquidity weather, stacked imbalance — were all built, all tested, and all
 * reachable from exactly ONE place: a legacy side panel the trader had to open
 * and then scroll. `roomEquipment.ts` names that failure in its own header:
 * "every one of its inventions was reached by opening a legacy panel and
 * scrolling". The chart room is where the trader spends the most time and it
 * could hand them the least.
 *
 * Equipment is the cure, and equipment needs a PREVIEW — a widget docked at the
 * edge of the room that says the consequential thing WITHOUT taking the chart
 * away. This file is that sentence, and nothing else.
 *
 * ── WHY IT IS PURE, AND WHY IT TAKES VIEW MODELS RATHER THAN TICKS ────────
 * If the preview read the tape, WM would have two brains: the widget could say
 * ABSORBED while the drawer one press below it said BALANCED, off two reads of
 * a moving tape at two moments. The grammar's own doctrine — "Every stage
 * renders the SAME handed-down content — one compilation, three depths" — would
 * be violated by the very first thing the trader sees.
 *
 * So this takes the FINISHED readings and does nothing but rank and phrase
 * them. It cannot disagree with the panels, because it is downstream of the
 * identical objects the panels render.
 *
 * ── THE RANKING RULE, AND WHY IT IS NOT "MOST ALARMING FIRST" ─────────────
 * A preview has room for one verdict. Choosing it by loudness would make the
 * widget a slot machine — whichever module happened to fire hardest would own
 * the room's headline, and a trader would learn to read the headline instead of
 * the market.
 *
 * The order below is the order in which the readings CONSTRAIN A DECISION:
 *
 *   1. STACKED IMBALANCE  names specific prices and says whether price came
 *                         back and respected them. It is the only reading that
 *                         is actionable as a level.
 *   2. ABSORPTION         says whether the side spending effort is being paid.
 *                         It decides whether to trust a push.
 *   3. DELTA DIVERGENCE   says whether the tape agreed with the last extreme.
 *   4. LIQUIDITY WEATHER  says what the move is COSTING, which sizes a trade
 *                         rather than directing it.
 *   5. VALUE              says where volume actually agreed to trade.
 *
 * A reading that has nothing to say is SKIPPED, never phrased. Every selector
 * above has its own UNMEASURED/NO_* state and they all mean the same thing:
 * this tape has not shown me enough. Printing "NO STACK" as a room headline
 * would dress an absence as a finding — the same defect `formatSpinePrice`
 * was cured of when PRICE UNKNOWN was being printed over a request in flight.
 *
 * ── NO TAPE IS NOT A BROKEN ROOM ──────────────────────────────────────────
 * Futures carry no aggressor tape on this feed, and that is a fact about the
 * provider, not a fault in WM. When nothing is measurable the standing is
 * `NO TAPE` with a headline that says which feeds do carry one — so a trader
 * looking at a silent widget knows whether to wait or to stop looking.
 */

import type { AbsorptionVM } from "./selectAbsorption";
import type { DeltaDivergenceVM } from "./selectDeltaDivergence";
import type { LiquidityWeatherVM } from "./selectLiquidityWeather";
import type { StackedImbalanceVM } from "./selectStackedImbalance";
import type { ValueCandleVM } from "./selectValueCandle";

/**
 * The five finished readings, exactly as the panels receive them.
 *
 * Optional because a caller that has not compiled one yet must be able to say
 * so without inventing an object. `undefined` here means "not handed to me",
 * and it is treated identically to a reading that measured nothing — because
 * from the preview's point of view those are the same sentence.
 */
export interface OrderFlowReadings {
  readonly stackedImbalance?: StackedImbalanceVM | null;
  readonly absorption?: AbsorptionVM | null;
  readonly deltaDivergence?: DeltaDivergenceVM | null;
  readonly liquidityWeather?: LiquidityWeatherVM | null;
  readonly valueCandle?: ValueCandleVM | null;
}

export interface OrderFlowStanding {
  /**
   * The state word the equipment chrome prints. `NO TAPE` is a real answer,
   * not a failure: it asserts WM looked and this feed carries no per-trade
   * aggressor prints.
   */
  readonly verdict: string;
  /** One sentence, in the trader's vocabulary. Never names a selector. */
  readonly headline: string;
  /**
   * How many of the five readings actually measured something. The preview
   * prints this so a trader can tell a quiet tape from a quiet widget.
   */
  readonly measuredCount: number;
  /** True when NOTHING measured. The room may use it to stay silent. */
  readonly silent: boolean;
}

const TOTAL_READINGS = 5;

/** A stack verdict only speaks when it is about a level that exists. */
function stackSentence(vm: StackedImbalanceVM | null | undefined): string | null {
  if (!vm) return null;
  if (vm.verdict === "UNMEASURED" || vm.verdict === "NO_STACK") return null;
  const side = vm.direction === "BUY" ? "buyers" : vm.direction === "SELL" ? "sellers" : "one side";
  if (vm.verdict === "DEFENDED") return `A level ${side} stacked was retested and held.`;
  if (vm.verdict === "BROKEN") return `A level ${side} stacked was retested and gave way.`;
  return `A level ${side} stacked has not been retested yet.`;
}

function absorptionSentence(vm: AbsorptionVM | null | undefined): string | null {
  if (!vm || vm.verdict === "UNMEASURED") return null;
  const side = vm.pressingSide === "BUYERS" ? "Buyers" : vm.pressingSide === "SELLERS" ? "Sellers" : "One side";
  if (vm.verdict === "ABSORBED") return `${side} are spending effort and not being paid for it.`;
  if (vm.verdict === "EFFICIENT") return `${side} are being paid for the effort they spend.`;
  return "Neither side is buying much ground with its effort.";
}

function divergenceSentence(vm: DeltaDivergenceVM | null | undefined): string | null {
  if (!vm || vm.verdict === "UNMEASURED" || vm.verdict === "NO_SWING") return null;
  if (vm.verdict === "BEARISH") return "Price made a new high the tape did not follow.";
  if (vm.verdict === "BULLISH") return "Price made a new low the tape did not follow.";
  return "The tape followed price to its latest extreme.";
}

function weatherSentence(vm: LiquidityWeatherVM | null | undefined): string | null {
  if (!vm || vm.stage === "UNMEASURED") return null;
  if (vm.stage === "AIRLESS") return "It is costing very little to move this market — treat size carefully.";
  if (vm.stage === "THINNING") return "It is getting cheaper to move this market.";
  if (vm.stage === "THICKENING") return "It is getting more expensive to move this market.";
  if (vm.stage === "HEAVY") return "It is costing a lot to move this market.";
  if (vm.stage === "ERRATIC") return "The cost to move this market is jumping around.";
  return "The cost to move this market is steady.";
}

function valueSentence(vm: ValueCandleVM | null | undefined): string | null {
  if (!vm || !vm.measured || vm.migration === "UNMEASURED") return null;
  if (vm.migration === "LAGGED") return "Price has moved away from where the volume actually traded.";
  return "Price is trading where the volume agreed it should.";
}

/** True when a reading measured something at all — used only for the count. */
function measured(sentence: string | null): boolean {
  return sentence !== null;
}

export function selectOrderFlowStanding(readings: OrderFlowReadings): OrderFlowStanding {
  // Compiled ONCE each, in constraint order. The array is the ranking — there
  // is no second place in this file where priority is written down, because a
  // second copy of a priority list agrees exactly until one of them is edited.
  const sentences = [
    stackSentence(readings.stackedImbalance),
    absorptionSentence(readings.absorption),
    divergenceSentence(readings.deltaDivergence),
    weatherSentence(readings.liquidityWeather),
    valueSentence(readings.valueCandle),
  ];

  const measuredCount = sentences.filter(measured).length;

  if (measuredCount === 0) {
    return {
      verdict: "NO TAPE",
      headline:
        "No per-trade buy/sell tape on this feed yet. Crypto streams it around the clock; stocks stream it during market hours.",
      measuredCount: 0,
      silent: true,
    };
  }

  // The first sentence that exists, in constraint order — never the loudest.
  const headline = sentences.find(measured) as string;

  return {
    verdict: measuredCount === TOTAL_READINGS ? "READING" : "PARTIAL",
    headline,
    measuredCount,
    silent: false,
  };
}

export default selectOrderFlowStanding;
