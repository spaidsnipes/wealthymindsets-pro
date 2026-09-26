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
 * ── WHY THE TAPE IS PUT IN TIME ORDER HERE, AND ONLY HERE ─────────────────
 * The stream holds its tape NEWEST-FIRST (`retainRecentTicks`), and that order
 * is a contract other readers depend on. Every selector this file feeds reads
 * the OTHER way: index 0 is the oldest print. Stacked imbalance builds its
 * claim from the first 60% and tests it with the rest; delta divergence walks
 * its segments forward and calls the last one "recent"; absorption measures
 * displacement as last minus first; the value candle's `last` is the final
 * element. Handed the stream's order unchanged, every one of them ran
 * backwards — a stack built from the newest prints and "tested" by the oldest,
 * a divergence whose pivots were swapped and whose delta was summed in
 * reverse — and every type stayed satisfied while it happened.
 *
 * So the order is converted once, at this boundary, by `chronologicalTape`,
 * and not inside any selector: a selector that re-sorted its own input would be
 * a second owner of "which print came first", and the next one written would
 * not know it had to.
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
import { selectValueCandle, selectValueCandleBars } from "@/lib/marketData/viewModels/selectValueCandle";
import { selectDeltaLevels } from "@/lib/marketData/viewModels/selectDeltaLevels";

/**
 * The one field `chronologicalTape` reads. Optional because an undated print is
 * a real case on the wire (a venue message without a timestamp), and the
 * function owes that case an answer rather than a crash.
 */
interface DatedTick {
  readonly time?: number | null;
}

/**
 * The tape this reads. Structurally the stream's own tick, never re-typed: what
 * the selectors read, plus the `time` this file reads to order it.
 */
type Ticks =
  | readonly (NonNullable<Parameters<typeof selectValueCandle>[0]>[number] & DatedTick)[]
  | null
  | undefined;
type TapeSource = Parameters<typeof hasVerifiedAggressorTape>[0];

function hasFiniteTime(tick: DatedTick | null | undefined): boolean {
  return tick != null && typeof tick.time === "number" && Number.isFinite(tick.time);
}

/**
 * PURE. The stream's tape, OLDEST-FIRST — the order every order-flow selector
 * reads.
 *
 * WHY A SORT, AND NOT SIMPLY A REVERSAL. `retainRecentTicks` is newest-first
 * per FLUSH, not per print: each flush's batch is prepended in the order it
 * arrived, which is oldest-first within the batch. So the held tape is a stack
 * of ascending runs, newest run on top. Reversing it restores the order of the
 * runs and flips every run inside out. The stream only accepts a print whose
 * time is not earlier than the last one it took (`applyTickToLiveBar`'s
 * LATE_EVENT_IGNORED), so the timestamps ARE arrival order, and sorting on them
 * recovers it exactly.
 *
 * THE SORT IS STABLE, and that is the tie rule. Prints stamped with the same
 * millisecond almost always arrive in one socket message, therefore in one
 * flush, therefore already in arrival order inside their run; a stable sort
 * leaves them there. The case it cannot recover — two prints in one
 * millisecond split across a flush boundary — is ambiguous in the held tape
 * itself, and costs at most the order of prints no clock here can separate.
 *
 * WHEN ANY PRINT IS UNDATED, NOTHING IS SORTED. A sort with holes in its key
 * would place the undated prints wherever the comparator's NaN happened to
 * drop them. The retention contract is the only ordering claim left standing,
 * so the tape is reversed per it: the runs come out in the right order, and
 * the only error is inside a single flush. The live stream never admits an
 * undated print (`applyTickToLiveBar` refuses one outright), so the chart
 * room's tape always takes the sort; this branch exists because the input type
 * does not promise a time, and a tape assembled anywhere else may lack one.
 *
 * Returns a new array and never mutates the one it was handed — the stream's
 * consumers memoise on that array's identity.
 */
export function chronologicalTape<T extends DatedTick>(ticks: readonly T[]): T[];
export function chronologicalTape<T extends DatedTick>(
  ticks: readonly T[] | null | undefined,
): T[] | null;
export function chronologicalTape<T extends DatedTick>(
  ticks: readonly T[] | null | undefined,
): T[] | null {
  if (ticks == null) return null;
  if (!ticks.every(hasFiniteTime)) return [...ticks].reverse();
  return [...ticks].sort((a, b) => (a.time as number) - (b.time as number));
}

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
  /**
   * THE SAME value engine over the SAME gated tape, split into the chart's
   * bar slots (canon UI-02: the Value Candle is drawn ON the bar it measured).
   * Compiled here, beside the window reading, so the glass and the drawer can
   * never read two moments of one tape. `NO_INTERVAL` when the caller named
   * no bar size — a surface with no bars has no slots to fill.
   */
  readonly valueCandleBars: ReturnType<typeof selectValueCandleBars>;
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
  barIntervalSec: number | null = null,
): OrderFlowReadingSet {
  const realTape = hasVerifiedAggressorTape(tapeSource);
  // Time order FIRST, before the gate, so the side-dependent selectors and
  // Liquidity Weather (whose segments are equal-count buckets "in tape order")
  // all read one ordering of one tape.
  const tape = chronologicalTape(recentTicks);
  // ONE gated array for every SIDE-DEPENDENT selector. Liquidity Weather reads
  // the raw observed prints because its selector deliberately never reads side.
  const sidedTicks = realTape ? tape : null;
  return {
    valueCandle: selectValueCandle(sidedTicks),
    valueCandleBars: selectValueCandleBars(sidedTicks, barIntervalSec),
    absorption: selectAbsorption(sidedTicks),
    deltaDivergence: selectDeltaDivergence(sidedTicks),
    liquidityWeather: selectLiquidityWeather(tape),
    stackedImbalance: selectStackedImbalance(sidedTicks),
    deltaLevels: selectDeltaLevels(sidedTicks),
    printsPresent: hasLiquidityWeatherPrints(tape),
    realTape,
  };
}

/** The same compilation, memoised against the stream the caller already holds. */
export function useOrderFlowReadings(
  recentTicks: Ticks,
  tapeSource: TapeSource,
  barIntervalSec: number | null = null,
): OrderFlowReadingSet {
  return React.useMemo(
    () => compileOrderFlowReadings(recentTicks, tapeSource, barIntervalSec),
    [recentTicks, tapeSource, barIntervalSec],
  );
}

export default useOrderFlowReadings;
