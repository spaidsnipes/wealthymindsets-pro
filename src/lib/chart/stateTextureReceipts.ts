/**
 * STATE BY TEXTURE — the paint rules and receipts for two lenses whose state
 * must be readable without words (Sheriff A-LW / ASK-5, Garden 19 erasure
 * tests §7). Lifted out of MainChart so every stage / climate can be proved
 * deterministically, through the real owners, without waiting for the market.
 *
 *   Liquidity Weather — the stage is a GRAIN of short level strokes inside the
 *   lens: density is the stage (AIRLESS sparse → HEAVY dense), ERRATIC the
 *   same grain jittered, UNMEASURED no grain. One brass ink for every stage
 *   (§9: no stage is graded by colour). Receipt `liquidityWeatherStageInk`.
 *
 *   Derivatives Pressure — the field's rows take BLUE where net dealer
 *   exposure is positive (damping) and ORANGE where it is negative
 *   (amplifying); the receipt counts the rows of each. Receipt
 *   `derivativesPressureTint`.
 *
 * PURE. No canvas, no React.
 */
import type { WeatherStage } from "@/lib/marketData/viewModels/selectLiquidityWeather";
import type { GeographySample } from "@/lib/marketData/viewModels/selectDerivativesPressure";

/** Grain spacing (px) per stage — smaller is denser. UNMEASURED has none. */
export const WEATHER_GRAIN_SPACING: Readonly<Partial<Record<WeatherStage, number>>> = {
  AIRLESS: 22, THINNING: 16, STEADY: 12, THICKENING: 9, HEAVY: 6, ERRATIC: 10,
};

export interface WeatherGrain {
  /** Spacing in px, or null = no grain. */
  readonly spacing: number | null;
  /** ERRATIC: the same grain, jittered. */
  readonly jitter: boolean;
  /** The `liquidityWeatherStageInk` receipt. */
  readonly receipt: string;
}

export function weatherGrain(stage: WeatherStage | string): WeatherGrain {
  const sp = WEATHER_GRAIN_SPACING[stage as WeatherStage] ?? null;
  if (!sp) return { spacing: null, jitter: false, receipt: `${stage}:NONE` };
  const jitter = stage === "ERRATIC";
  return { spacing: sp, jitter, receipt: `${stage}:GRAIN${sp}${jitter ? ":JITTER" : ""}` };
}

export interface PressureTint {
  /** Field rows painted BLUE (net exposure ≥ 0 between two samples: damping). */
  readonly positive: number;
  /** Field rows painted ORANGE (net < 0: amplifying). */
  readonly negative: number;
  /** The `derivativesPressureTint` receipt. */
  readonly receipt: string;
}

/** One row per adjacent pair of geography samples, signed by the pair's mean net exposure. */
export function derivativesPressureTint(geography: readonly Pick<GeographySample, "net">[]): PressureTint {
  let positive = 0, negative = 0;
  for (let i = 0; i < geography.length - 1; i++) {
    if ((geography[i].net + geography[i + 1].net) / 2 >= 0) positive++;
    else negative++;
  }
  return { positive, negative, receipt: `NET_POS:BLUE:${positive}|NET_NEG:ORANGE:${negative}` };
}
