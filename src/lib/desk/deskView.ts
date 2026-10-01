/**
 * A VIEW PER SCREEN — Garden 18 §LVI. A saved My View is a set of reading
 * switches; each Desk screen can wear its own. This maps the switches onto the
 * chart's own props (one name per sense, read from MainChart's interface).
 * Shared truth, independent composition: the market data is never per-View.
 */
import type { LayoutSwitches } from "@/lib/workspace/savedLayouts";
import type { SavedLayout } from "@/lib/workspace/savedLayouts";
import type { ProfileId } from "@/lib/marketData/viewModels/selectProfileMenu";
import selectTpoProfile from "@/lib/marketData/viewModels/selectTpoProfile";
import { selectLiquidityWeatherFromBars } from "@/lib/marketData/viewModels/selectLiquidityWeather";
import { volumeBearingBars } from "@/lib/chart/volumeTruth";

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

/** Restore presentation per instance; never mutate the global View or market. */
export function chartPropsForView(view: SavedLayout | null) {
  return {
    ...chartPropsForSwitches(view?.switches ?? null),
    visualRoles: view?.roles ?? {},
    profileStrength: view?.profileStrength ?? "CANON" as const,
    footprintType: view?.footprint?.mode ?? "volume-profile" as const,
    footprintEnabled: view?.footprint?.enabled ?? false,
    bigTradesOverlay: view?.footprint?.bigTrades ?? false,
  };
}

/** These switches need chart-room VMs that the Desk has not wired yet. */
export const DESK_PENDING_READINGS: readonly ProfileId[] = [
  "IMBALANCE_STACK", "VALUE_CANDLE", "DELTA_DIVERGENCE", "EFFORT_MARK", "DELTA_LEVELS",
  "LIVING_PROFILE", "MARKET_STRUCTURE", "STRUCTURE_PROFILE", "PROFILE_DNA", "VALUE_MIGRATION",
  "PROFILE_MEMORY", "PROFILE_FUSION", "COMPOSITE_PROFILE", "VISIBLE_RANGE_PROFILE", "MEMORY_GHOST",
  "EXPECTED_ENVELOPE", "CONTRADICTION", "LIQUIDITY_LIFECYCLE", "MTF_ANCESTRY", "DERIVATIVES_PRESSURE",
  "BRICK_WALLS", "REGIME_LIGHTING",
];

export function pendingDeskReadings(switches: LayoutSwitches | null) {
  return DESK_PENDING_READINGS.filter(id => switches?.[id] === true);
}

/** Same pure readers as /charts, fed only the chart's admitted bars. */
export function compileDeskBarReadings(symbol: string, bars: readonly { time: number; high: number; low: number; volume: number }[]) {
  return {
    tpo: selectTpoProfile(bars.map(b => ({ time: b.time, high: b.high, low: b.low }))),
    weather: selectLiquidityWeatherFromBars(volumeBearingBars(symbol, bars)),
  };
}
