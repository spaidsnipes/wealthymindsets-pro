/**
 * SEMANTIC DENSITY — which geometry may speak at each depth. H-501.
 *
 * Child: SEMANTIC ZOOM · DENSITY GOVERNOR. Parent family: F13 Semantic Zoom.
 * Class: LENS. House surface: /charts — the same camera, the same
 * DECISION_ID. Plate: WM_Contractor_H-501_SEMANTIC_ZOOM_F13 ("Semantic zoom
 * changes which geometry may speak; it does not remount the route.").
 *
 * The zoom WORD already exists (`selectSemanticZoom`, from visible bar count).
 * This turns the word into the plate's behaviour:
 *
 *   FAR  — REGIME + ENVELOPE speak: major thresholds (composite value,
 *          remembered sessions, fusion zones, confirmed swings).
 *   MID  — ZONES + PROFILE speak: the live profile family and its movie.
 *   NEAR — TAPE + CANDLE ANATOMY speak: effort marks, delta levels, stacked
 *          imbalance, value candle, divergence, liquidity weather.
 *
 * Every depth quiets the OTHER depths' geometry. Quiets — never deletes: the
 * attention governor "may dim, never delete requested material truth" (F27),
 * so every multiplier stays above zero and every layer the trader switched on
 * is still on the glass, just not shouting. UNMEASURED depth changes nothing.
 *
 * Tiers are a property of the layer, stated here once:
 *   MACRO — Composite, Profile Memory, Profile Fusion, Market Structure.
 *   MID   — Living (+DNA), TPO, Visible Range, Structure Profile, Value
 *           Migration.
 *   MICRO — Effort Mark, Delta Levels, Stacked Imbalance, Value Candle,
 *           Delta Divergence, Liquidity Weather.
 *
 * PURE. DETERMINISTIC.
 */

import { selectSemanticZoom, type SemanticZoomState } from "./selectSemanticZoom";

export const SEMANTIC_DENSITY_VERSION = 1;
export const QUIET = 0.28;
export const SOFT = 0.6;

export type DensityTier = "MACRO" | "MID" | "MICRO";

export interface SemanticDensityVM {
  readonly version: number;
  readonly depth: SemanticZoomState;
  readonly macro: number;
  readonly mid: number;
  readonly micro: number;
  /** What speaks at this depth, in the plate's words. */
  readonly speaking: string;
}

export function selectSemanticDensity(depth: SemanticZoomState | null | undefined): SemanticDensityVM {
  const d: SemanticZoomState = depth ?? "UNMEASURED";
  const base = { version: SEMANTIC_DENSITY_VERSION, depth: d };
  switch (d) {
    case "FAR":
      return { ...base, macro: 1, mid: SOFT, micro: QUIET, speaking: "FAR · REGIME + ENVELOPE SPEAK" };
    case "MID":
      return { ...base, macro: SOFT, mid: 1, micro: SOFT, speaking: "MID · ZONES + PROFILE SPEAK" };
    case "NEAR":
      return { ...base, macro: QUIET, mid: SOFT, micro: 1, speaking: "NEAR · TAPE + CANDLE ANATOMY SPEAK" };
    default:
      return { ...base, macro: 1, mid: 1, micro: 1, speaking: "" };
  }
}

/**
 * The density for a visible bar count, through the ONE zoom rule — so the
 * depth that governs the layers is the depth the tag prints, by construction.
 */
export function semanticDensityForBarCount(visibleBarCount: number | null): SemanticDensityVM {
  return selectSemanticDensity(selectSemanticZoom({ visibleBarCount }).state);
}

export default selectSemanticDensity;
