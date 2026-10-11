/**
 * THE GEAR ON EVERY INVENTION (Founder 2026-10-11: "Click Profiles → select any profile → click its gear →
 * change its color → see the actual rendered profile change immediately. No hunting through unrelated menus.")
 *
 * One map from a Profiles / Reading-lens / Tools row to the place in Chart Settings that owns its look:
 *   species:<KEY>  — a profile species' colour + opacity (appearanceLaw PROFILE_SPECIES)
 *   inv:<KEY>      — an invention's own opacity dial (appearanceLaw INVENTION_DIALS)
 *   gamma-heat     — the gamma heat's own controls
 * PURE. A row with no entry has no appearance of its own to set (and shows no gear).
 */
import type { InventionDialKey, ProfileSpeciesKey } from "@/lib/chart/appearanceLaw";

const SPECIES: Readonly<Record<string, ProfileSpeciesKey>> = {
  LIVING_PROFILE: "LIVING", STRUCTURE_PROFILE: "STRUCTURE", PROFILE_FUSION: "FUSION", PROFILE_MEMORY: "MEMORY",
  PROFILE_DNA: "DNA", SESSION: "SESSION_CLASSIC", VISIBLE_RANGE_PROFILE: "VISIBLE_RANGE", FIXED_RANGE: "FIXED_RANGE",
  COMPOSITE_PROFILE: "COMPOSITE", TPO_PROFILE: "TPO", DELTA_VP: "BID_ASK",
};
const INVENTION: Readonly<Record<string, InventionDialKey>> = {
  ABSORPTION: "ABSORPTION", EXHAUSTION: "EXHAUSTION", IMBALANCE_STACK: "IMBALANCES", FLOW_CURRENT: "FLOW_CURRENT",
  VALUE_CANDLE: "VALUE_CANDLE", DELTA_DIVERGENCE: "DIVERGENCE", LIQUIDITY_WEATHER: "WEATHER", EFFORT_MARK: "EFFORT",
  DELTA_LEVELS: "DELTA_LEVELS", ANATOMY_CARDS: "ANATOMY", MEMORY_GHOST: "MEMORY_GHOSTS", EXPECTED_ENVELOPE: "EXPECTED_ENVELOPE",
  LIQUIDITY_LIFECYCLE: "LIQUIDITY_LIFECYCLE", MARKET_STRUCTURE: "ZONES_STRUCTURE", REGIME_LIGHTING: "REGIME",
  DERIVATIVES_PRESSURE: "DERIVATIVES_PRESSURE", BRICK_WALLS: "BRICK_WALLS", CALL_WALL: "CALL_PUT_WALLS", PUT_WALL: "CALL_PUT_WALLS",
  FVG: "FVG", BIG_TRADES: "BIG_TRADES", DELTA_BUBBLES: "DELTA_BUBBLES", FOOTPRINT: "FOOTPRINT", CVD_NOTCH: "CVD_NOTCH",
  BREATH_RIBBON: "BREATH_RIBBON",
};
const GAMMA = new Set(["GAMMA_HEATMAP", "GAMMA_POSITIVE", "GAMMA_NEGATIVE", "GAMMA_FLIP", "GAMMA_CONCENTRATION"]);

export function settingsAnchorFor(rowId: string): string | null {
  if (SPECIES[rowId]) return `species:${SPECIES[rowId]}`;
  if (GAMMA.has(rowId)) return "gamma-heat";
  if (INVENTION[rowId]) return `inv:${INVENTION[rowId]}`;
  return null;
}
