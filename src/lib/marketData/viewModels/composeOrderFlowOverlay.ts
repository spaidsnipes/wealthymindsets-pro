/**
 * composeOrderFlowOverlay — the single pure compiler that places order-flow
 * readings ON THE PRICE CANVAS.
 *
 * WHY THIS EXISTS
 * The FL-06 plate (ORDERFLOW_ON_CHART) carries a red stamp: "NO ESSAY DRAWER
 * AS PRIMARY TRUTH". Today all five order-flow inventions exist as honest
 * selectors and as side panels — SmartMoneyPanel and OrderFlowDepthPanel on
 * /command-deck, Big Trades on /charts — but none of them draw on the price
 * canvas. That is a RENDERING gap, not a data gap. The chart already owns
 * `canvasRef` and `logicalToPixel({price,time})`. So no second data owner is
 * created here; this compiler only decides WHERE IN PRICE AND TIME a reading
 * is entitled to sit.
 *
 * THE DIVISION OF AUTHORITY
 * `AggressorTick` carries no timestamp — `selectAggressorFlow` "stays pure and
 * never inspects identity or timestamps". So the order-flow selectors know
 * PRICE but not TIME, and their segments are ORDINAL equal-COUNT chunks, not
 * equal-DURATION ones. Mapping segment index to a time offset would be a lie
 * dressed as a chart. Therefore:
 *
 *   the selector owns WHAT and WHERE-IN-PRICE.
 *   the chart owns WHEN, because the chart is the camera.
 *
 * Window-level readings (liquidity, absorption) span the caller-supplied tape
 * window in full and say so. Level-anchored readings (the imbalance stack, via
 * measured `stackLow`/`stackHigh`; big prints, via their own real `time` and
 * `price`) anchor precisely. When the caller supplies no window, this compiler
 * REFUSES to place the window-level readings rather than guessing a span.
 *
 * PURE — no React, no I/O, no clock. Every timestamp arrives from the caller.
 */

import type { LiquidityWeatherVM } from "./selectLiquidityWeather";
import type { AbsorptionVM } from "./selectAbsorption";
import type { StackedImbalanceVM } from "./selectStackedImbalance";
import type { BigTradeIntelligenceVM } from "./selectBigTradeIntelligence";
import type { ValueCandleVM } from "./selectValueCandle";

export const ORDER_FLOW_OVERLAY_VERSION = 1 as const;

/**
 * The tape window the readings were computed over. The caller — the chart —
 * is the only party that knows this, because it is the camera.
 */
export interface TapeWindow {
  readonly startMs: number;
  readonly endMs: number;
}

/**
 * A band of price occupying a span of time. `spansWholeWindow` is true when
 * the reading knows its price extent but NOT its position in time, so the
 * band is drawn across the entire window rather than pretending to a slice
 * of it. A surface MUST render that distinction — a band that secretly means
 * "somewhere in here" and one that means "exactly here" cannot look alike.
 */
export interface OverlayBand {
  readonly kind: "BAND";
  readonly id: string;
  readonly priceLow: number;
  readonly priceHigh: number;
  readonly startMs: number;
  readonly endMs: number;
  readonly spansWholeWindow: boolean;
  /**
   * True when this reading's position within the window is ORDINAL only —
   * an equal-count chunk of tape, not an equal-duration slice of clock.
   */
  readonly ordinalOnly: boolean;
  readonly label: string;
  readonly detail: string;
}

/** A horizontal price line with no time extent of its own. */
export interface OverlayLevel {
  readonly kind: "LEVEL";
  readonly id: string;
  readonly price: number;
  readonly label: string;
  readonly detail: string;
}

/** A print placed exactly, because the tape stated both its price and its time. */
export interface OverlayPoint {
  readonly kind: "POINT";
  readonly id: string;
  readonly price: number;
  readonly timeMs: number;
  readonly size: number;
  readonly side: "buy" | "sell" | null;
  readonly label: string;
  readonly detail: string;
}

export type OverlayMark = OverlayBand | OverlayLevel | OverlayPoint;

/**
 * A reading this compiler declined to place, and the reason. Refusals are
 * first-class output: a surface is expected to show them, not swallow them.
 * An unplaced reading that vanishes silently is indistinguishable from a
 * reading that said nothing.
 */
export interface OverlayRefusal {
  readonly source:
    | "LIQUIDITY"
    | "ABSORPTION"
    | "IMBALANCE"
    | "BIG_TRADES"
    | "WINDOW";
  readonly reason: string;
}

export interface ComposeOrderFlowOverlayInput {
  /** The tape window. `null` when the caller cannot state one. */
  readonly window: TapeWindow | null;
  readonly liquidity?: LiquidityWeatherVM | null;
  readonly absorption?: AbsorptionVM | null;
  /**
   * Absorption publishes no price band of its own. `selectAbsorption` already
   * calls `selectValueCandle`, whose VM DOES publish `valueLow`/`valueHigh`.
   * Passing that VM here is how absorption becomes placeable — lawfully,
   * from the owner that measured the band, not from a band invented here.
   */
  readonly value?: ValueCandleVM | null;
  readonly imbalance?: StackedImbalanceVM | null;
  readonly bigTrades?: BigTradeIntelligenceVM | null;
}

export interface OrderFlowOverlayVM {
  readonly version: typeof ORDER_FLOW_OVERLAY_VERSION;
  readonly marks: readonly OverlayMark[];
  readonly refusals: readonly OverlayRefusal[];
  /** True when at least one mark was placed. */
  readonly placed: boolean;
  /**
   * True when ANY placed mark is ordinal-only, i.e. the overlay contains a
   * shape whose horizontal position is not a claim about clock time. A
   * surface must disclose this.
   */
  readonly requiresOrdinalDisclosure: boolean;
  /** One honest line. Never empty, in any state. */
  readonly detail: string;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function windowIsUsable(window: TapeWindow | null): window is TapeWindow {
  return (
    window !== null &&
    isFiniteNumber(window.startMs) &&
    isFiniteNumber(window.endMs) &&
    window.endMs > window.startMs
  );
}

export function composeOrderFlowOverlay(
  input: ComposeOrderFlowOverlayInput,
): OrderFlowOverlayVM {
  const marks: OverlayMark[] = [];
  const refusals: OverlayRefusal[] = [];

  const window = input.window;
  const hasWindow = windowIsUsable(window);

  if (!hasWindow) {
    refusals.push({
      source: "WINDOW",
      reason:
        "No tape window was supplied, so nothing that spans a window can be placed in time. The chart is the only owner of when; it did not say.",
    });
  }

  // ---- Liquidity Lens -----------------------------------------------------
  // Segments carry a measured price extent (high/low) but no timestamps. They
  // are equal-COUNT chunks of tape. Their horizontal position is therefore not
  // a claim, and each is drawn across the whole window, flagged ordinalOnly.
  const liquidity = input.liquidity ?? null;
  if (liquidity) {
    if (!hasWindow) {
      refusals.push({
        source: "LIQUIDITY",
        reason:
          "Liquidity segments know their price extent but not their position in time; with no window there is nothing honest to span.",
      });
    } else if (liquidity.stage === "UNMEASURED" || liquidity.segments.length === 0) {
      refusals.push({
        source: "LIQUIDITY",
        reason: liquidity.detail,
      });
    } else {
      for (const segment of liquidity.segments) {
        if (!isFiniteNumber(segment.low) || !isFiniteNumber(segment.high)) {
          refusals.push({
            source: "LIQUIDITY",
            reason: `Segment ${segment.index} stated no price extent, so it has no place on a price canvas.`,
          });
          continue;
        }
        marks.push({
          kind: "BAND",
          id: `liquidity-${segment.index}`,
          priceLow: segment.low,
          priceHigh: segment.high,
          startMs: window.startMs,
          endMs: window.endMs,
          spansWholeWindow: true,
          ordinalOnly: true,
          label: segment.stalled ? "STALLED" : "LIQUIDITY",
          detail: segment.stalled
            ? `Segment ${segment.index} traded ${segment.volume} without moving. Its position along this window is ordinal, not clock time.`
            : `Segment ${segment.index}: ${segment.prints} prints, ${segment.volume} volume. Its position along this window is ordinal, not clock time.`,
        });
      }
    }
  }

  // ---- Absorption Shelf ---------------------------------------------------
  // Absorption publishes no band. The value candle does. Without that owner
  // this reading is refused rather than given an invented band.
  const absorption = input.absorption ?? null;
  if (absorption) {
    const value = input.value ?? null;
    if (absorption.verdict === "UNMEASURED") {
      refusals.push({ source: "ABSORPTION", reason: absorption.detail });
    } else if (!hasWindow) {
      refusals.push({
        source: "ABSORPTION",
        reason:
          "Absorption is a window-level reading; with no window it has no span to occupy.",
      });
    } else if (
      !value ||
      !isFiniteNumber(value.valueLow) ||
      !isFiniteNumber(value.valueHigh)
    ) {
      refusals.push({
        source: "ABSORPTION",
        reason:
          "Absorption states effort and displacement but owns no price band. No value candle was supplied to name one, and a band will not be invented here.",
      });
    } else {
      marks.push({
        kind: "BAND",
        id: "absorption-shelf",
        priceLow: value.valueLow,
        priceHigh: value.valueHigh,
        startMs: window.startMs,
        endMs: window.endMs,
        spansWholeWindow: true,
        ordinalOnly: false,
        label: absorption.verdict,
        detail: absorption.detail,
      });
      if (isFiniteNumber(value.centerOfGravity)) {
        marks.push({
          kind: "LEVEL",
          id: "absorption-cog",
          price: value.centerOfGravity,
          label: "COG",
          detail:
            "Centre of gravity of the value band this absorption reading was measured against.",
        });
      }
    }
  }

  // ---- Stacked Imbalance --------------------------------------------------
  // The only order-flow reading with a MEASURED price extent of its own.
  const imbalance = input.imbalance ?? null;
  if (imbalance) {
    if (
      imbalance.verdict === "UNMEASURED" ||
      imbalance.verdict === "NO_STACK" ||
      !isFiniteNumber(imbalance.stackLow) ||
      !isFiniteNumber(imbalance.stackHigh)
    ) {
      refusals.push({ source: "IMBALANCE", reason: imbalance.detail });
    } else if (!hasWindow) {
      refusals.push({
        source: "IMBALANCE",
        reason:
          "The stack's prices are measured, but with no window there is no time span to draw it across.",
      });
    } else {
      marks.push({
        kind: "BAND",
        id: "imbalance-stack",
        priceLow: imbalance.stackLow,
        priceHigh: imbalance.stackHigh,
        startMs: window.startMs,
        endMs: window.endMs,
        spansWholeWindow: true,
        ordinalOnly: false,
        label: imbalance.verdict,
        detail: imbalance.detail,
      });
      for (const level of imbalance.levels) {
        if (!isFiniteNumber(level.price)) continue;
        marks.push({
          kind: "LEVEL",
          id: `imbalance-level-${level.price}`,
          price: level.price,
          label: level.oneSided ? "ONE-SIDED" : "IMBALANCE",
          detail: level.oneSided
            ? `At ${level.price} the opposing diagonal traded nothing.`
            : `At ${level.price} the dominant diagonal traded ${level.dominantVolume} against ${level.opposingVolume}.`,
        });
      }
    }
  }

  // ---- Big Trades ---------------------------------------------------------
  // The one reading that carries real time AND real price. It needs no window
  // and is placed exactly. Prints without a stated time are refused one by one.
  const bigTrades = input.bigTrades ?? null;
  if (bigTrades) {
    if (!bigTrades.measured) {
      refusals.push({
        source: "BIG_TRADES",
        reason:
          bigTrades.missingInputNote ??
          "This window could not compute a size cut, so no print is entitled to be called large.",
      });
    } else {
      for (const print of bigTrades.largePrints) {
        if (!isFiniteNumber(print.price)) continue;
        if (!isFiniteNumber(print.time)) {
          refusals.push({
            source: "BIG_TRADES",
            reason: `A ${print.size} print at ${print.price} stated no time, so it cannot be placed on a time axis.`,
          });
          continue;
        }
        marks.push({
          kind: "POINT",
          id: `big-trade-${print.time}-${print.price}-${print.size}`,
          price: print.price,
          timeMs: print.time,
          size: print.size,
          side: print.side,
          label: print.side ? print.side.toUpperCase() : "UNSIDED",
          detail:
            print.side === null
              ? `${print.size} at ${print.price}. This tape stated no aggressor side for this print.`
              : `${print.size} ${print.side} at ${print.price}.`,
        });
      }
    }
  }

  const placed = marks.length > 0;
  const requiresOrdinalDisclosure = marks.some(
    (mark) => mark.kind === "BAND" && mark.ordinalOnly,
  );

  return {
    version: ORDER_FLOW_OVERLAY_VERSION,
    marks,
    refusals,
    placed,
    requiresOrdinalDisclosure,
    detail: buildDetail(marks.length, refusals.length, requiresOrdinalDisclosure),
  };
}

function buildDetail(
  markCount: number,
  refusalCount: number,
  ordinal: boolean,
): string {
  if (markCount === 0 && refusalCount === 0) {
    return "No order-flow readings were supplied, so nothing was placed on the canvas.";
  }
  if (markCount === 0) {
    return `Nothing could be placed on the canvas; ${refusalCount} reading${refusalCount === 1 ? "" : "s"} declined to guess a position.`;
  }
  const ordinalClause = ordinal
    ? " Some shapes span the whole window because their position in the tape is ordinal, not clock time."
    : "";
  if (refusalCount === 0) {
    return `${markCount} order-flow mark${markCount === 1 ? "" : "s"} placed on the price canvas.${ordinalClause}`;
  }
  return `${markCount} order-flow mark${markCount === 1 ? "" : "s"} placed; ${refusalCount} declined to guess a position.${ordinalClause}`;
}
