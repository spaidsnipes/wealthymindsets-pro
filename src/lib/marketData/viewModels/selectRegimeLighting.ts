/**
 * REGIME LIGHTING — which geometry may speak. H-901.
 *
 * Child: REGIME LIGHTING. Parent family: F15 Regime. Class: LENS (a dimmer).
 * House surface: /charts — the SAME geometry, relit. Plate:
 * WM_Contractor_H-901_REGIME_LIGHTING ("Regime is a lighting dimmer on
 * existing geometry, not a regime room. False speech if all fixtures blaze
 * at once.").
 *
 * ── THE PLATE'S RULES, AS CODE ─────────────────────────────────────────────
 *
 *   1. ONLY ONE CIRCUIT BREAKER MAY BE ON: TREND, RANGE or TRANSITION.
 *   2. RANGE ON  → trend-channel fixtures are CAPPED.
 *   3. TREND ON  → mean-reversion magnets DIM.
 *   4. TRANSITION → ALL fixtures dimmed for the handover.
 *   5. Regime is a dimmer, not a room. Geometry remains; light changes.
 *
 * Fixture classes on this camera:
 *   MAGNETS — value-seeking levels: Living, TPO, Composite, Visible Range,
 *             Profile Memory, Profile Fusion.
 *   TREND   — trend-channel fixtures: Structure Profile leg, Value Migration
 *             trail, Market Structure swings.
 *
 * ── ONE REGIME OWNER ───────────────────────────────────────────────────────
 *
 * The verdict is read from `selectRegime` and nothing else. This module never
 * re-derives a regime from bars; if the owner says UNKNOWN, NO breaker is on,
 * every fixture keeps full light, and the chip says so. Dimming on a guess
 * would be false speech in the other direction.
 *
 * Verdict → breaker (stated, not inferred):
 *   TREND                    → TREND
 *   BALANCE, COMPRESSION     → RANGE       (price is held inside a range)
 *   TRANSITION, EXPANSION    → TRANSITION  (handover: neither story owns it)
 *   UNKNOWN / no reading     → none
 *
 * PURE. DETERMINISTIC. No React, no canvas, no IO, no clock.
 */

import type { RegimeVerdict } from "./selectRegime";

export const REGIME_LIGHTING_VERSION = 1;
/** How far a dimmed fixture drops. A dimmer, never an off switch. */
export const DIMMED_ALPHA = 0.3;
export const HANDOVER_ALPHA = 0.5;

export type RegimeBreaker = "TREND" | "RANGE" | "TRANSITION";

export interface RegimeLightingVM {
  readonly version: number;
  readonly breaker: RegimeBreaker | null;
  readonly verdict: RegimeVerdict | null;
  /** Alpha multiplier for mean-reversion magnets, in (0, 1]. */
  readonly magnets: number;
  /** Alpha multiplier for trend-channel fixtures, in (0, 1]. */
  readonly trend: number;
  /** One line the chip prints verbatim. */
  readonly chip: string;
}

const BREAKER: Readonly<Record<RegimeVerdict, RegimeBreaker | null>> = {
  TREND: "TREND",
  BALANCE: "RANGE",
  COMPRESSION: "RANGE",
  TRANSITION: "TRANSITION",
  EXPANSION: "TRANSITION",
  UNKNOWN: null,
};

export function selectRegimeLighting(
  regime: { readonly verdict: RegimeVerdict } | null | undefined,
): RegimeLightingVM {
  const verdict = regime?.verdict ?? null;
  const breaker = verdict ? BREAKER[verdict] : null;
  const base = { version: REGIME_LIGHTING_VERSION, verdict, breaker };
  switch (breaker) {
    case "TREND":
      return { ...base, magnets: DIMMED_ALPHA, trend: 1, chip: "REGIME · TREND ON · MEAN-REVERSION MAGNETS DIMMED" };
    case "RANGE":
      return { ...base, magnets: 1, trend: DIMMED_ALPHA, chip: "REGIME · RANGE ON · TREND FIXTURES CAPPED" };
    case "TRANSITION":
      return { ...base, magnets: HANDOVER_ALPHA, trend: HANDOVER_ALPHA, chip: "REGIME · TRANSITION ON · ALL FIXTURES DIMMED FOR HANDOVER" };
    default:
      return { ...base, magnets: 1, trend: 1, chip: "REGIME · UNKNOWN · NO BREAKER ON · LIGHTS UNCHANGED" };
  }
}

export default selectRegimeLighting;
