/**
 * useOrderFlowReadings — ONE owner of the five microstructure compilations.
 *
 * ── THE DEFECT THIS CLOSES ────────────────────────────────────────────────
 * Value candle, absorption, delta divergence, liquidity weather and stacked
 * imbalance were each compiled in exactly ONE place: inside `SmartMoneyPanel`,
 * a legacy side panel reached by opening it and then scrolling. Everything
 * else in the chart room could see the chart; none of it could see the tape's
 * verdict on the chart.
 *
 * The obvious repair — give the chart room its own equipment and let that
 * equipment call the same five selectors — would have produced the WORSE
 * defect: TWO compilations of the same five readings, off two reads of a
 * moving tape at two moments, able to disagree inside one viewport. That is
 * Canon Weakness #1 (multi-owner disagreement) reintroduced by the very change
 * meant to surface the readings.
 *
 * ── WHY IT TAKES THE STREAM INSTEAD OF SUBSCRIBING TO IT ──────────────────
 * The first draft of this hook called `useWebSocket` itself. That is what the
 * legacy panel did, so it looked like a faithful lift — but it would have made
 * the ROOM open a second subscription beside the one it already holds, and
 * then read a DIFFERENT moment of the same tape than its own chart does.
 *
 * The chart room already has `recentTicks` and `tapeSource`. Handed those, this
 * is a pure compilation of what the caller is already looking at, and the room
 * can pass the finished readings down to the legacy panel — so the widget, the
 * drawer and the panel are all rendering one set of objects rather than three
 * agreeing readings that only agree until one of them is edited.
 *
 * ── WHY THE `realTape` GATE IS INSIDE, NOT AT THE CALL SITES ──────────────
 * The four side-dependent selectors are handed NOTHING rather than raw ticks
 * when the feed carries no verified aggressor tape. Liquidity Weather is the
 * deliberate exception: cost-of-travel reads print size and price movement and
 * never reads aggressor side, so withholding real prints from it would turn a
 * missing side classification into a missing market observation.
 *
 * ── WHAT THIS DELIBERATELY DOES NOT DO ────────────────────────────────────
 * It does not phrase anything. `selectOrderFlowStanding` ranks and phrases, and
 * it takes THESE objects — so the preview sentence is downstream of the
 * identical readings the panels render and cannot contradict them.
 */
"use client";

import React from "react";

import { hasVerifiedAggressorTape } from "@/lib/marketData/capabilityRegistry";
import { selectAbsorption } from "@/lib/marketData/viewModels/selectAbsorption";
import { selectDeltaDivergence } from "@/lib/marketData/viewModels/selectDeltaDivergence";
import {
  hasLiquidityWeatherPrints,
  selectLiquidityWeather,
} from "@/lib/marketData/viewModels/selectLiquidityWeather";
import { selectStackedImbalance } from "@/lib/marketData/viewModels/selectStackedImbalance";
import { selectValueCandle } from "@/lib/marketData/viewModels/selectValueCandle";
import { selectDeltaLevels } from "@/lib/marketData/viewModels/selectDeltaLevels";

/** The tape this reads. Structurally the stream's own tick, never re-typed. */
type Ticks = Parameters<typeof selectValueCandle>[0];
type TapeSource = Parameters<typeof hasVerifiedAggressorTape>[0];

/**
 * WHY THIS DOES NOT REUSE `OrderFlowReadings`.
 *
 * `OrderFlowReadings` is the PREVIEW's input shape, and every field on it is
 * optional — because a caller that has not compiled a reading yet must be able
 * to say so without inventing an object. This is the opposite situation: all
 * five are ALWAYS compiled, because every one of these selectors owns its own
 * "nothing measured" state and returns it rather than nothing.
 *
 * Inheriting the optional shape would push a `| undefined` onto five panels
 * that are guaranteed a view model, and the fix at each call site would be a
 * `!` — assertions standing in for a fact this type can simply state. The
 * structural match with `OrderFlowReadings` is still checked, once, where the
 * standing is compiled.
 */
export interface OrderFlowReadingSet {
  readonly valueCandle: ReturnType<typeof selectValueCandle>;
  readonly absorption: ReturnType<typeof selectAbsorption>;
  readonly deltaDivergence: ReturnType<typeof selectDeltaDivergence>;
  readonly liquidityWeather: ReturnType<typeof selectLiquidityWeather>;
  readonly stackedImbalance: ReturnType<typeof selectStackedImbalance>;
  /**
   * DELTA LEVELS — where each side crossed the spread hardest, on the tape's
   * OWN grid. Compiled HERE so the chart's overlay and the SmartMoneyPanel
   * drawer cannot read a different moment of the same tape. Even though
   * `selectDeltaLevels` is pure and both callers would arrive at the same
   * answer given the same input, two useMemos over two closures is exactly
   * the two-owner shape Canon Weakness #1 forbids.
   */
  readonly deltaLevels: ReturnType<typeof selectDeltaLevels>;
  /** True only for usable trade prints; quote events do not satisfy it. */
  readonly printsPresent: boolean;
  /** True when this feed carries per-trade aggressor prints WM can attribute. */
  readonly realTape: boolean;
}

/**
 * The compilation, with no React in it, so it is testable without a renderer
 * and so the memo below cannot become the place the rules live.
 */
export function compileOrderFlowReadings(
  recentTicks: Ticks,
  tapeSource: TapeSource,
): OrderFlowReadingSet {
  const realTape = hasVerifiedAggressorTape(tapeSource);
  // ONE gated array for every SIDE-DEPENDENT selector. Liquidity Weather reads
  // the raw observed prints because its selector deliberately never reads side.
  const sidedTicks = realTape ? recentTicks : null;
  return {
    valueCandle: selectValueCandle(sidedTicks),
    absorption: selectAbsorption(sidedTicks),
    deltaDivergence: selectDeltaDivergence(sidedTicks),
    liquidityWeather: selectLiquidityWeather(recentTicks),
    stackedImbalance: selectStackedImbalance(sidedTicks),
    deltaLevels: selectDeltaLevels(sidedTicks),
    printsPresent: hasLiquidityWeatherPrints(recentTicks),
    realTape,
  };
}

/** The same compilation, memoised against the stream the caller already holds. */
export function useOrderFlowReadings(
  recentTicks: Ticks,
  tapeSource: TapeSource,
): OrderFlowReadingSet {
  return React.useMemo(
    () => compileOrderFlowReadings(recentTicks, tapeSource),
    [recentTicks, tapeSource],
  );
}

export default useOrderFlowReadings;
