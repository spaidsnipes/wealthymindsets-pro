/**
 * PROFILE FUSION — where independent profiles agree, with every source named.
 * P-110 organism #3.
 *
 * Child: PROFILE FUSION. Parent family: F09 Profiles. Class: CHART LANGUAGE.
 * House surface: /charts, a zone across the camera. Plate:
 * WM_H_P110_PROFILE_ORGANISM ("3 · FUSION · Multi-source combination");
 * Registry F.3 "fused zones from the active profile stack · originals remain
 * inspectable · fusion must not destroy provenance".
 *
 * ── WHAT FUSES ──────────────────────────────────────────────────────────────
 *
 * Reference levels published by the profile species that are switched on —
 * Living POC/VAH/VAL, TPO POC/VAH/VAL, the Structure leg's POC/VAH/VAL, and
 * remembered prior-session levels. Levels within TOLERANCE of each other
 * cluster; a cluster becomes a FUSED ZONE only when at least two DIFFERENT
 * species contributed. Two levels from the same species agreeing with
 * themselves is not agreement.
 *
 * ── WHAT IT REFUSES TO DO ───────────────────────────────────────────────────
 *
 *   · No score, no weight, no confidence. A zone carries its SOURCES and
 *     their count — H-401 "contradiction not averaged" applies: agreement is
 *     stated, never converted into a probability.
 *   · No lost provenance. Every contributing level stays listed with its
 *     species, kind and exact price; the zone's edges are the min and max of
 *     those prices, never a smoothed band.
 *   · No new level. Fusion invents no price: it groups prices that exist.
 *
 * PURE. DETERMINISTIC. No React, no canvas, no IO, no clock.
 */

export const PROFILE_FUSION_VERSION = 1;
/** Tolerance as a fraction of price: 0.08% ≈ 0.19 on a $240 stock. */
export const FUSION_TOLERANCE_FRAC = 0.0008;
export const MAX_FUSED_ZONES = 4;

export type FusionSpecies = "LIVING" | "TPO" | "STRUCTURE" | "MEMORY";

export interface FusionSourceLevel {
  readonly species: FusionSpecies;
  /** e.g. "POC", "VAH", "S-1 POC" — the name the source itself uses. */
  readonly kind: string;
  readonly price: number;
}

export interface FusedZone {
  readonly low: number;
  readonly high: number;
  /** Every contributing level, price-ascending. Provenance, never collapsed. */
  readonly sources: readonly FusionSourceLevel[];
  /** Distinct species that agree — a count, not a score. */
  readonly speciesCount: number;
  /** "LIVING POC · TPO POC · MEMORY S-1 POC" — printed verbatim. */
  readonly provenance: string;
}

export type ProfileFusionReason = "DRAWN" | "FEWER_THAN_TWO_SPECIES" | "NO_AGREEMENT";

export interface ProfileFusionVM {
  readonly version: number;
  readonly drawn: boolean;
  readonly reason: ProfileFusionReason;
  readonly zones: readonly FusedZone[];
  readonly speciesOffered: readonly FusionSpecies[];
  readonly tolerance: number | null;
}

export function selectProfileFusion(
  levels: readonly FusionSourceLevel[] | null | undefined,
): ProfileFusionVM {
  const clean = (levels ?? []).filter(l => Number.isFinite(l.price) && l.price > 0);
  const speciesOffered = [...new Set(clean.map(l => l.species))].sort() as FusionSpecies[];
  const base = { version: PROFILE_FUSION_VERSION, speciesOffered };
  if (speciesOffered.length < 2) {
    return { ...base, drawn: false, reason: "FEWER_THAN_TWO_SPECIES", zones: [], tolerance: null };
  }

  const sorted = [...clean].sort((a, b) => a.price - b.price || a.species.localeCompare(b.species) || a.kind.localeCompare(b.kind));
  const mid = sorted[Math.floor(sorted.length / 2)].price;
  const tolerance = mid * FUSION_TOLERANCE_FRAC;

  // Single-linkage over sorted prices: a level joins the running cluster when
  // it is within tolerance of the cluster's LAST level. Deterministic.
  const clusters: FusionSourceLevel[][] = [];
  for (const l of sorted) {
    const cur = clusters[clusters.length - 1];
    if (cur && l.price - cur[cur.length - 1].price <= tolerance) cur.push(l);
    else clusters.push([l]);
  }

  const zones: FusedZone[] = clusters
    .map(c => {
      const species = new Set(c.map(l => l.species));
      return {
        low: c[0].price,
        high: c[c.length - 1].price,
        sources: c,
        speciesCount: species.size,
        provenance: c.map(l => `${l.species} ${l.kind}`).join(" · "),
      };
    })
    .filter(z => z.speciesCount >= 2)
    // Most species first, then most sources, then lowest price: a stable
    // order for the cap, and never a strength score.
    .sort((a, b) => b.speciesCount - a.speciesCount || b.sources.length - a.sources.length || a.low - b.low)
    .slice(0, MAX_FUSED_ZONES)
    .sort((a, b) => b.low - a.low);

  if (zones.length === 0) {
    return { ...base, drawn: false, reason: "NO_AGREEMENT", zones: [], tolerance };
  }
  return { ...base, drawn: true, reason: "DRAWN", zones, tolerance };
}

export default selectProfileFusion;
