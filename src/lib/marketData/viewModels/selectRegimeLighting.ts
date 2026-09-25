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
 * ── THE PLATE'S OWN FIXTURES (v2, Founder 2026-09-25 13:58: "look at the
 *    actual screen") ────────────────────────────────────────────────────────
 *
 * v1 painted the plate's LEGEND — the "REGIME CIRCUIT BREAKERS · ONLY ONE ON"
 * three-box panel — as a card over the candles. The plate's market canvas
 * carries no card: it carries the fixtures themselves, the mean / ±σ magnets
 * (☆) and the parallel trend channel (△, hatched), each at the light its
 * breaker gives it. `fixtures` is that light for the regime's own fixtures
 * (measured by `selectRegimeFixtures`). It equals `magnets` / `trend` while a
 * breaker is on. With NO breaker on, no circuit powers either class: both sit
 * at the PILOT light — the plate's "false speech if all fixtures blaze at
 * once" — while every OTHER layer's light stays unchanged (`magnets` /
 * `trend` = 1). Geometry remains; light changes.
 *
 * F15A ("regime decides which geometry may speak") lights the room by the
 * regime STATE: `field` is BALANCE (RANGE on), TRANSITION (TRANSITION on) or
 * WAIT (no breaker — the unresolved chip keeps it honest). F15A draws no
 * TREND level, so TREND carries no field: the lit channel is its light.
 * `title` is the compact "REGIME · …" line a breaker earns; with none on the
 * unresolved coin speaks instead, so there is never both.
 *
 * PURE. DETERMINISTIC. No React, no canvas, no IO, no clock.
 */

import type { RegimeVerdict } from "./selectRegime";

export const REGIME_LIGHTING_VERSION = 2;
/** How far a dimmed fixture drops. A dimmer, never an off switch. */
export const DIMMED_ALPHA = 0.3;
export const HANDOVER_ALPHA = 0.5;
/** No breaker on: the regime's own fixtures are unpowered, never blazing. */
export const PILOT_ALPHA = DIMMED_ALPHA;

export type RegimeBreaker = "TREND" | "RANGE" | "TRANSITION";
/** F15A's regime-state light. */
export type RegimeField = "BALANCE" | "TRANSITION" | "WAIT";
/**
 * What a fixture class is doing under this breaker, in the plate's words:
 * LIT (its breaker is on), DIMMED / CAPPED (the other breaker is on),
 * HANDOVER (TRANSITION dims every fixture), PILOT (no breaker on).
 */
export type FixtureState = "LIT" | "DIMMED" | "CAPPED" | "HANDOVER" | "PILOT";

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
  /** The light of the regime's OWN fixtures (channel, mean/σ magnets), in (0, 1]. */
  readonly fixtures: { readonly magnets: number; readonly trend: number };
  /** The same, in words — the receipts print these. */
  readonly fixtureState: { readonly magnets: FixtureState; readonly channel: FixtureState };
  /** F15A's ambient field for this state; null = no field (TREND). */
  readonly field: RegimeField | null;
  /** The compact title a breaker earns ("REGIME · TREND · magnets dim"); null with no breaker. */
  readonly title: string | null;
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
      return {
        ...base, magnets: DIMMED_ALPHA, trend: 1, fixtures: { magnets: DIMMED_ALPHA, trend: 1 },
        fixtureState: { magnets: "DIMMED", channel: "LIT" },
        field: null, title: "REGIME · TREND · magnets dim",
        chip: "REGIME · TREND ON · MEAN-REVERSION MAGNETS DIMMED",
      };
    case "RANGE":
      return {
        ...base, magnets: 1, trend: DIMMED_ALPHA, fixtures: { magnets: 1, trend: DIMMED_ALPHA },
        fixtureState: { magnets: "LIT", channel: "CAPPED" },
        field: "BALANCE", title: "REGIME · RANGE · channel capped",
        chip: "REGIME · RANGE ON · TREND FIXTURES CAPPED",
      };
    case "TRANSITION":
      return {
        ...base, magnets: HANDOVER_ALPHA, trend: HANDOVER_ALPHA, fixtures: { magnets: HANDOVER_ALPHA, trend: HANDOVER_ALPHA },
        fixtureState: { magnets: "HANDOVER", channel: "HANDOVER" },
        field: "TRANSITION", title: "REGIME · TRANSITION · all fixtures dimmed",
        chip: "REGIME · TRANSITION ON · ALL FIXTURES DIMMED FOR HANDOVER",
      };
    default:
      return {
        ...base, magnets: 1, trend: 1, fixtures: { magnets: PILOT_ALPHA, trend: PILOT_ALPHA },
        fixtureState: { magnets: "PILOT", channel: "PILOT" },
        field: "WAIT", title: null,
        chip: "REGIME · UNKNOWN · NO BREAKER ON · LIGHTS UNCHANGED",
      };
  }
}

export default selectRegimeLighting;
