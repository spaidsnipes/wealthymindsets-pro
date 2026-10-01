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
import { buildLivingProfileSnapshot, selectLivingProfile } from "@/lib/marketData/viewModels/selectLivingProfile";
import selectLivingProfileGlass from "@/lib/marketData/viewModels/selectLivingProfileGlass";
import { selectMarketStructure } from "@/lib/marketData/viewModels/selectMarketStructure";
import selectMarketStructureGlass from "@/lib/marketData/viewModels/selectMarketStructureGlass";
import selectStructureProfile from "@/lib/marketData/viewModels/selectStructureProfile";
import selectProfileDna from "@/lib/marketData/viewModels/selectProfileDna";
import selectValueMigration from "@/lib/marketData/viewModels/selectValueMigration";
import selectProfileMemory from "@/lib/marketData/viewModels/selectProfileMemory";
import selectCompositeProfile from "@/lib/marketData/viewModels/selectCompositeProfile";
import selectProfileFusion, { type FusionSourceLevel } from "@/lib/marketData/viewModels/selectProfileFusion";
import { selectLiquidityLifecycle } from "@/lib/marketData/viewModels/selectLiquidityLifecycle";
import { selectSessionWindowBars, sessionWindowFor } from "@/lib/marketData/sessionWindow";
import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
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
  "MEMORY_GHOST",
  "EXPECTED_ENVELOPE", "CONTRADICTION", "MTF_ANCESTRY", "DERIVATIVES_PRESSURE",
  "BRICK_WALLS", "REGIME_LIGHTING",
];

export function pendingDeskReadings(switches: LayoutSwitches | null) {
  return DESK_PENDING_READINGS.filter(id => switches?.[id] === true);
}

/** Same pure readers as /charts, fed only the chart's admitted bars. */
export function compileDeskBarReadings(symbol: string, bars: readonly LegacyOhlcvTuple[], timeframe = "15m") {
  const volumeBars = volumeBearingBars(symbol, bars);
  const tpo = selectTpoProfile(bars.map(b => ({ time: Number(b.time), high: b.high, low: b.low })));
  const structure = selectMarketStructure(bars);
  const structureProfile = selectStructureProfile(structure, volumeBars);
  // No tape or live quote is borrowed from another Desk market. The shared
  // owner names this bar-built body candle-estimated; live distance is absent.
  const living = selectLivingProfile(buildLivingProfileSnapshot(null, selectSessionWindowBars([...volumeBars], sessionWindowFor(symbol, timeframe, false))));
  const livingProfileGlass = selectLivingProfileGlass(living);
  const profileDna = living.measured ? selectProfileDna({ curve: living.curve, poc: living.poc, vah: living.vah, val: living.val, bars: bars.length, estimated: living.quality !== "trade-based", rowStep: living.tickSize }) : selectProfileDna(null);
  const valueMigration = selectValueMigration(volumeBars);
  const profileMemory = selectProfileMemory(valueMigration, bars);
  const compositeProfile = selectCompositeProfile(volumeBars);
  return {
    tpo, weather: selectLiquidityWeatherFromBars(volumeBars),
    livingProfileGlass, marketStructureGlass: selectMarketStructureGlass(structure),
    structureProfile, profileDna, valueMigration, profileMemory, compositeProfile,
    scaffoldingStructure: structure,
    liquidityLifecycle: selectLiquidityLifecycle(volumeBars.map(b => ({ time: Number(b.time), high: b.high, low: b.low, close: b.close, volume: Number.isFinite(b.volume) ? b.volume : 0 }))),
  };
}

/** Fuse only active species and columns the chart actually drew, not guessed levels. */
export function compileDeskProfileFusion(readings: ReturnType<typeof compileDeskBarReadings>, switches: LayoutSwitches | null, drawn: Partial<Record<"FIXED" | "SESSION", { poc: number; vah: number; val: number }>> = {}) {
  const { livingProfileGlass, tpo, structureProfile, compositeProfile, profileMemory } = readings;
  const levels: FusionSourceLevel[] = [];
  const push = (species: FusionSourceLevel["species"], kind: string, price: number | null) => {
    if (price != null && Number.isFinite(price)) levels.push({ species, kind, price });
  };
  for (const [id, species, vm] of [
    ["LIVING_PROFILE", "LIVING", livingProfileGlass], ["TPO_PROFILE", "TPO", tpo],
    ["STRUCTURE_PROFILE", "STRUCTURE", structureProfile], ["COMPOSITE_PROFILE", "COMPOSITE", compositeProfile],
  ] as const) if (switches?.[id] && vm.drawn) {
    push(species, "POC", vm.poc); push(species, "VAH", vm.vah); push(species, "VAL", vm.val);
  }
  if (switches?.PROFILE_MEMORY && profileMemory.drawn) for (const l of profileMemory.levels) push("MEMORY", `S-${l.sessionsAgo} ${l.kind}`, l.price);
  for (const sp of ["FIXED", "SESSION"] as const) {
    const l = drawn[sp];
    if (!l || !switches?.[sp === "FIXED" ? "FIXED_RANGE" : "SESSION"]) continue;
    push(sp, "POC EST", l.poc); push(sp, "VAH EST", l.vah); push(sp, "VAL EST", l.val);
  }
  return selectProfileFusion(levels);
}
