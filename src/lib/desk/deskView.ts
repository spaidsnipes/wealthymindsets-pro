/**
 * A VIEW PER SCREEN — Garden 18 §LVI. A saved My View is a set of reading
 * switches; each Desk screen can wear its own. This maps the switches onto the
 * chart's own props (one name per sense, read from MainChart's interface).
 * Shared truth, independent composition: the market data is never per-View.
 */
import type { LayoutSwitches } from "@/lib/workspace/savedLayouts";
import type { ProfileId } from "@/lib/marketData/viewModels/selectProfileMenu";

export const CHART_PROP_FOR: Readonly<Partial<Record<ProfileId, string>>> = {
  FIXED_RANGE: "fixedVPActive",
  SESSION: "sessionVPActive",
  ABSORPTION: "absorptionAnatomyActive",
  EXHAUSTION: "exhaustionOnChart",
  IMBALANCE_STACK: "imbalanceStackOnChart",
  VALUE_CANDLE: "valueCandleOnChart",
  CLARITY_CANDLE: "clarityCandleOnChart",
  DELTA_DIVERGENCE: "deltaDivergenceOnChart",
  LIQUIDITY_WEATHER: "liquidityWeatherOnChart",
  EFFORT_MARK: "effortMarkOnChart",
  DELTA_LEVELS: "deltaLevelsOnChart",
  LIVING_PROFILE: "livingProfileOnChart",
  MARKET_STRUCTURE: "marketStructureOnChart",
  TPO_PROFILE: "tpoProfileOnChart",
  STRUCTURE_PROFILE: "structureProfileOnChart",
  PROFILE_DNA: "profileDnaOnChart",
  VALUE_MIGRATION: "valueMigrationOnChart",
  PROFILE_MEMORY: "profileMemoryOnChart",
  PROFILE_FUSION: "profileFusionOnChart",
  COMPOSITE_PROFILE: "compositeProfileOnChart",
  VISIBLE_RANGE_PROFILE: "visibleRangeProfileOnChart",
  QUESTION_LENS: "questionLensOnChart",
  ANATOMY_CARDS: "anatomyCardsOnChart",
  MEMORY_GHOST: "memoryGhostOnChart",
  EXPECTED_ENVELOPE: "expectedEnvelopeOnChart",
  CONTRADICTION: "contradictionOnChart",
  RISK_ON_PRICE: "riskOnPriceOnChart",
  LIQUIDITY_LIFECYCLE: "liquidityLifecycleOnChart",
  MTF_ANCESTRY: "mtfAncestryOnChart",
  DERIVATIVES_PRESSURE: "derivativesPressureOnChart",
  BRICK_WALLS: "brickWallsOnChart",
  REGIME_LIGHTING: "regimeLightingOnChart",
};

/** "Clean" is every reading off — the same meaning as the Clean view. */
export const CLEAN_VIEW_ID = "clean";

/** The chart props a View's switches set; every mapped sense not ON is OFF. */
export function chartPropsForSwitches(switches: LayoutSwitches | null): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [id, prop] of Object.entries(CHART_PROP_FOR) as [ProfileId, string][]) out[prop] = switches?.[id] === true;
  return out;
}
