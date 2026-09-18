/**
 * LIQUIDITY WEATHER ON THE GLASS — AND THE HONEST ADMISSION THAT MOST OF IT
 * DOES NOT BELONG ON A PRICE AXIS.
 *
 * The other four readings in this family were trapped in drawers holding
 * PRICES, and the repair was to put the prices back where they belong. This one
 * is different, and pretending otherwise would be the more expensive mistake.
 *
 * Liquidity weather measures COST: size required to travel one unit of the
 * window's own volume-weighted spread, and whether that cost is rising or
 * falling. A cost is not a price. It has no level. THINNING is a statement
 * about the window, not about $431.40, and drawing a THINNING band at any price
 * would be inventing a location for a finding that has none. So the stage, the
 * trend and the cost figures leave here as WORDS, positioned by the canvas
 * wherever chart chrome lives, and this compiler emits nothing a renderer could
 * mistake for a coordinate for them.
 *
 * ── EXCEPT FOR ONE THING, AND IT IS THE BEST THING IN THE READING ───────────
 *
 * A STALLED SEGMENT IS A PRICE. The engine marks a segment stalled when every
 * print in it landed at the same price — size traded and the market did not
 * move at all. `high === low`, and that number is a real level on the axis
 * where volume went in and price came out the other side unchanged. That is a
 * shelf, it is perceivable, and it is exactly the kind of fact the Founder
 * means by market geometry. Those prices are carried out and nothing else is.
 *
 * ── WHY THE STAGE DOES NOT BECOME A COLOUR ─────────────────────────────────
 *
 * Seven stages is a gradient, and a gradient is the easiest thing in the world
 * to paint red-to-green. AIRLESS is not danger and HEAVY is not safety — a thin
 * tape is where a stop slips and also where a breakout runs; a heavy tape is
 * where size gets filled and also where a move dies. §9: the house has no
 * standing to grade either. The stage travels as a WORD.
 *
 * ── AND WHY IT ASKS FOR NO AGGRESSOR DISCLOSURE ────────────────────────────
 *
 * The engine never reads `side`, so its answer is identical on a venue-stamped
 * tape and a tick-rule-guessed one. `requiresDisclosure` is `false` by TYPE up
 * there, not by accident, and this compiler keeps that: emitting a disclosure
 * anyway would imply a dependency the reading does not have, which is its own
 * small lie.
 *
 * PURE — no React, no canvas, no clock.
 */

import type { LiquidityWeatherVM, WeatherStage } from "./selectLiquidityWeather";

export const WEATHER_GLASS_VERSION = "wm.liquidity-weather-glass.v1" as const;

export type WeatherGlassReason = "UNMEASURED" | "DRAWN";

export interface WeatherGlassVM {
  readonly version: typeof WEATHER_GLASS_VERSION;
  /** True when there is a stage worth SAYING. Not the same as having a level. */
  readonly drawn: boolean;
  readonly reason: WeatherGlassReason;
  readonly stage: WeatherStage;
  /**
   * The prices at which a segment traded WITHOUT MOVING — the only genuinely
   * price-anchored fact this reading owns. Empty is the ordinary case.
   */
  readonly stallPrices: readonly number[];
  /** The headline, in words. Carries the stage and the window's own scale. */
  readonly label: string;
  /** The engine's own sentence. Never empty when drawn. */
  readonly detail: string;
  /**
   * A shelf caption, or null when no segment stalled. Separate from `label`
   * because it is the one line that has a place on the axis.
   */
  readonly stallLabel: string | null;
}

function empty(): WeatherGlassVM {
  return {
    version: WEATHER_GLASS_VERSION,
    drawn: false,
    reason: "UNMEASURED",
    stage: "UNMEASURED",
    stallPrices: [],
    label: "",
    detail: "",
    stallLabel: null,
  };
}

const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Compile a weather reading into the few facts a canvas may honestly render.
 *
 * Handed null, or handed the engine's own refusal, this returns UNMEASURED.
 * UNMEASURED is not a weather condition — it is the engine declining to report
 * one — so the glass declines too rather than drawing a seventh mood.
 */
export function selectLiquidityWeatherGlass(
  vm: LiquidityWeatherVM | null | undefined,
): WeatherGlassVM {
  if (!vm || vm.stage === "UNMEASURED") return empty();

  // Every stalled segment's price. `high === low` by construction when stalled,
  // but both are read and required to agree: a segment marked stalled whose
  // edges disagree is a contradiction upstream, and drawing the high would be
  // choosing one of two numbers that were supposed to be the same one.
  const stalls: number[] = [];
  for (const s of vm.segments) {
    if (!s.stalled) continue;
    if (!num(s.high) || !num(s.low) || s.high !== s.low) continue;
    if (!stalls.includes(s.high)) stalls.push(s.high);
  }
  stalls.sort((a, b) => a - b);

  const parts = [`LIQUIDITY ${vm.stage}`];
  if (num(vm.trendRatio)) {
    // Half over half. Above 1 means the late half cost more size per unit of
    // travel than the early half — the market got thicker, not "better".
    parts.push(`TREND ${vm.trendRatio.toFixed(2)}×`);
  }
  if (num(vm.dispersion)) {
    // How many segments disagree with their own half. The number that decides
    // whether the two halves may be compared at all, so it is shown rather
    // than being a private gate the reader cannot check.
    parts.push(`${Math.round(vm.dispersion * 100)}% INCOHERENT`);
  }

  return {
    version: WEATHER_GLASS_VERSION,
    drawn: true,
    reason: "DRAWN",
    stage: vm.stage,
    stallPrices: stalls,
    label: parts.join(" · "),
    detail: vm.detail,
    stallLabel:
      stalls.length > 0
        ? `${stalls.length} SHELF${stalls.length > 1 ? "S" : ""} — SIZE TRADED, PRICE DID NOT MOVE`
        : null,
  };
}

export default selectLiquidityWeatherGlass;
