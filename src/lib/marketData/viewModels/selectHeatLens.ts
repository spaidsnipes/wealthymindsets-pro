/**
 * HEAT LENS — SHEET P-601, "WEATHER LENS PIPED ONTO MARKET CANVAS TANK."
 *
 * The blueprint is a plumbing isometric, and it is worth reading it as one.
 * The MARKET CANVAS is the tank. The weather lens is not a second tank
 * standing next to it; it is PIPED ONTO it. A lens draws nothing of its own —
 * it takes what the tank already holds and makes one property of it visible.
 * Every constant in this module comes off that sheet:
 *
 *   · VALVE HEAT ON (NORMALLY CLOSED) — the lens is off until a trader opens
 *     it from TOOLS. That is the caller's job, not this module's, but it is
 *     why this module is a pure selector with no ambient state: a valve that
 *     is normally closed must have nothing running behind it.
 *
 *   · OPACITY REGULATOR (MAX 0.30) — a regulator is a physical cap, not a
 *     default. `HEAT_MAX_OPACITY` is exported and enforced on every cell, so
 *     the loudest possible heat still leaves the candles legible. This is the
 *     mechanical spelling of S-501's "ZONES SHALL NOT BURY CANDLES."
 *
 *   · GAUGE (PERSISTENCE / RESPONSE) — two needles, not a score.
 *
 *   · ATTACHED TO ZONE OBJECT (NOT A SEPARATE ROOM) / NO ROUTE /heat — each
 *     cell carries the price band it is attached to, so clicking it can pan
 *     the EXISTING camera. Nothing here produces a destination.
 *
 * ── WHERE THE HEAT COMES FROM, AND WHY IT IS NOT INVENTED ───────────────────
 *
 * LIVING-PIXEL LAW: every pixel needs a real owner. This module invents no
 * quantity whatsoever. It reads `LiquidityWeatherVM` — already the product's
 * owner of "what it is costing to move this market" — and re-expresses it as
 * geometry. Specifically:
 *
 *   heat        ← segment.cost measured against the window's medianCost.
 *                 Dear segments are hot; cheap segments are cool. That is the
 *                 whole claim, and it is the weather module's claim, not ours.
 *
 *   PERSISTENCE ← 1 - dispersion. `dispersion` is the share of segments that
 *                 disagree with their OWN HALF's median. When few disagree,
 *                 the weather is coherent and therefore persists. This is a
 *                 restatement of an existing measurement, and the inversion
 *                 is stated here so nobody has to guess at it.
 *
 *   RESPONSE    ← latestVsPeers. How sharply the newest segment departed from
 *                 its peers — the tape's own most recent reaction. The weather
 *                 module already argues (at length) why this, and not
 *                 latestVsMedian, is the honest outlier test.
 *
 * ── THE THREE REFUSALS ──────────────────────────────────────────────────────
 *
 * 1. A STALLED SEGMENT DRAWS NO CELL. A segment where every print landed at
 *    one price has `cost: null` — the weather module is emphatic that this is
 *    "not a small number, it is no number". Painting it as cold heat would
 *    turn a refusal into a reading. It is dropped, and `unmeasuredCells`
 *    counts what was dropped so the surface can say so out loud.
 *
 * 2. UNMEASURED WEATHER DRAWS NO LENS. When the stage is UNMEASURED the tape
 *    was too thin to report a condition at all. The lens returns `drawable:
 *    false` with zero cells. An empty overlay is honest; a grey one is not.
 *
 * 3. A GAUGE WITH NO INPUT READS null, NOT ZERO. `dispersion` and
 *    `latestVsPeers` are each nullable at their source. A needle resting at
 *    zero says "measured, and it is nothing"; that is a different and much
 *    louder statement than "not measured".
 */

import type {
  LiquidityWeatherVM,
  WeatherStage,
} from "./selectLiquidityWeather";

export const HEAT_LENS_VERSION = "wm.heat-lens.v1" as const;

/**
 * OPACITY REGULATOR (MAX 0.30) — read directly off P-601. The hottest cell in
 * any window paints at exactly this alpha; everything else scales below it.
 * Raising this number is a change to the blueprint, not to the code.
 */
export const HEAT_MAX_OPACITY = 0.3;

/**
 * Below this share of the hottest cell, a cell is cool enough that drawing it
 * adds noise rather than information. It still exists in the model — callers
 * that want the full ramp have it — but `paintable` is false so the default
 * overlay stays quiet. Chosen to drop the bottom eighth, not tuned to a chart.
 */
export const HEAT_PAINT_FLOOR = 0.125;

/**
 * THE RAMP, OWNED ONCE. Cool cells sit toward the frame's own gold; hot cells
 * move to an ember red. Both ends are hues already in the product — heat is a
 * NEW reading, not an excuse for a new palette.
 *
 * It lives in the selector rather than in a renderer because the lens has TWO
 * renderers — the DOM overlay and the chart's canvas layer — and a palette
 * copied into each would be a second source of truth about what "hot" looks
 * like. The first time they drifted, the same cost would read as two different
 * temperatures on two surfaces of one product.
 */
export function heatRampColor(intensity: number): string {
  const clamped = Math.max(0, Math.min(1, intensity));
  const r = Math.round(196 + (214 - 196) * clamped);
  const g = Math.round(165 - (165 - 74) * clamped);
  const b = Math.round(116 - (116 - 52) * clamped);
  return `rgb(${r}, ${g}, ${b})`;
}

export interface HeatCell {
  /** The weather segment this cell is piped from. Tape order. */
  readonly index: number;
  /** Size required to travel one spread, from the weather module. */
  readonly cost: number;
  /**
   * cost / medianCost. 1 means "this segment cost what the window typically
   * costs". Above 1 is dearer — hotter.
   */
  readonly costVsMedian: number;
  /** 0..1 against the hottest measurable cell in this window. */
  readonly intensity: number;
  /** intensity scaled by the P-601 regulator. Never above HEAT_MAX_OPACITY. */
  readonly opacity: number;
  /**
   * Quiet cells are modelled but not painted by default. See HEAT_PAINT_FLOOR.
   */
  readonly paintable: boolean;
  /**
   * ATTACHED TO ZONE OBJECT. The price band this cell covers, so a click can
   * pan the existing camera instead of opening anything.
   */
  readonly low: number;
  readonly high: number;
  /**
   * WHEN the cost was paid: the segment's first and last print time (ms), or
   * null when its prints carried no time. The renderer spans these bars only;
   * a cell with no time falls back to the whole camera and says so.
   */
  readonly fromTime: number | null;
  readonly toTime: number | null;
}

export interface HeatGauge {
  /**
   * 0..1, or null when the weather module could not measure dispersion.
   * Derived as 1 - dispersion; see the module header.
   */
  readonly persistence: number | null;
  /**
   * The latest segment against its peers, or null when unmeasurable. This is
   * a ratio around 1, not a 0..1 fraction — it is published on its own scale
   * because squashing it would destroy the only thing it says.
   */
  readonly response: number | null;
  /** Plain words for whichever needles are missing. Empty when both read. */
  readonly missing: readonly string[];
}

export interface HeatLensVM {
  readonly version: typeof HEAT_LENS_VERSION;
  /** False means: paint nothing at all, and say why with `detail`. */
  readonly drawable: boolean;
  readonly stage: WeatherStage;
  readonly cells: readonly HeatCell[];
  /** Segments that travelled nowhere and so carry no cost to paint. */
  readonly unmeasuredCells: number;
  readonly gauge: HeatGauge;
  /** The regulator in force, published so a surface cannot quietly exceed it. */
  readonly maxOpacity: typeof HEAT_MAX_OPACITY;
  /** One sentence a human can read when the lens draws nothing. */
  readonly detail: string;
}

function emptyGauge(weather: LiquidityWeatherVM | null): HeatGauge {
  const missing: string[] = [];
  const dispersion = weather?.dispersion ?? null;
  const response = weather?.latestVsPeers ?? null;
  if (dispersion === null) missing.push("persistence");
  if (response === null) missing.push("response");
  return {
    persistence: dispersion === null ? null : 1 - dispersion,
    response,
    missing,
  };
}

function refuse(
  stage: WeatherStage,
  detail: string,
  weather: LiquidityWeatherVM | null,
): HeatLensVM {
  return {
    version: HEAT_LENS_VERSION,
    drawable: false,
    stage,
    cells: [],
    unmeasuredCells: 0,
    gauge: emptyGauge(weather),
    maxOpacity: HEAT_MAX_OPACITY,
    detail,
  };
}

/**
 * Pipe the weather lens onto the canvas tank.
 *
 * Pure. Given the same weather VM it returns the same geometry, which is what
 * lets the overlay be tested without a tape, a canvas, or a browser.
 */
export function selectHeatLens(
  weather: LiquidityWeatherVM | null | undefined,
): HeatLensVM {
  if (!weather) {
    return refuse(
      "UNMEASURED",
      "No liquidity weather has been compiled, so there is no cost to draw.",
      null,
    );
  }

  if (weather.stage === "UNMEASURED") {
    return refuse(
      "UNMEASURED",
      "The tape was too thin to report a weather condition. The lens draws nothing rather than drawing grey.",
      weather,
    );
  }

  const median = weather.medianCost;
  if (median === null || !(median > 0)) {
    return refuse(
      weather.stage,
      "The window has no median cost to measure segments against, so no segment can be called dear or cheap.",
      weather,
    );
  }

  // REFUSAL 1: a segment that did not travel carries no cost. Count it, do
  // not colour it.
  const measurable = weather.segments.filter(
    (s): s is typeof s & { cost: number } => s.cost !== null && !s.stalled,
  );
  const unmeasuredCells = weather.segments.length - measurable.length;

  if (measurable.length === 0) {
    return refuse(
      weather.stage,
      "Every segment in the window traded without moving, so there is no cost anywhere to paint.",
      weather,
    );
  }

  const hottest = measurable.reduce((m, s) => (s.cost > m ? s.cost : m), 0);

  const cells: HeatCell[] = measurable.map((s) => {
    const intensity = hottest > 0 ? s.cost / hottest : 0;
    return {
      index: s.index,
      cost: s.cost,
      costVsMedian: s.cost / median,
      intensity,
      opacity: intensity * HEAT_MAX_OPACITY,
      paintable: intensity >= HEAT_PAINT_FLOOR,
      low: s.low,
      high: s.high,
      fromTime: s.fromTime ?? null,
      toTime: s.toTime ?? null,
    };
  });

  return {
    version: HEAT_LENS_VERSION,
    drawable: true,
    stage: weather.stage,
    cells,
    unmeasuredCells,
    gauge: emptyGauge(weather),
    maxOpacity: HEAT_MAX_OPACITY,
    detail:
      unmeasuredCells > 0
        ? `${cells.length} of ${weather.segments.length} segments carry a measurable cost; ${unmeasuredCells} traded without moving and are not painted.`
        : `${cells.length} segments carry a measurable cost.`,
  };
}
