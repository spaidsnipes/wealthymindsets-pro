/**
 * selectMarketObjectPassport — Founder canon P6 MARKET OBJECT PASSPORT /
 * OBJECT DNA (2026-08-24 Five-Hour Finish canon).
 *
 * Canon verbatim: "Every qualified object may expose birth/origin, definition
 * version, parent event, nested timeframe relationships, displacement
 * consequence, attached FVG/profile relationships, touches, mitigation,
 * response history, source/fidelity, invalidation and current lifecycle."
 *
 * The richer Market Object GRAPH (FVGs, levels, profiles as first-class nodes)
 * is P4 infrastructure that does not yet exist. Inventing that graph here would
 * fabricate objects the engine never resolved — a truth violation. So this
 * selector issues a Passport for the objects the engine ACTUALLY resolves
 * today: the eight canonical MarketState dimensions. Each dimension's Passport
 * exposes its DNA verbatim from the sealed state —
 *
 *   lifecycle (RESOLVED / FORMING / UNRESOLVED)
 *   value + confidence
 *   source / fidelity (strongest evidence class + distinct sources)
 *   evidence lineage (every ref, reversible back to provider evidence)
 *   contradictions (what attacks it)
 *   unknowns (what is missing / would invalidate)
 *
 * This is the Evidence-Reversibility Moat expressed as a view: every field
 * travels backward to a canonical evidence ref. It NEVER invents a fact and it
 * degrades honestly — an UNKNOWN dimension yields an UNRESOLVED Passport that
 * states exactly what is still missing.
 *
 * PURE — no React, no I/O, no clock. Deterministic.
 */

import type {
  CanonicalMarketState,
  MarketStateDimension,
  MarketStateEvidenceRef,
  MarketQualityState,
} from "../canonicalMarketState";
import type { MarketFidelityClass } from "../marketEvent";

export const MARKET_OBJECT_PASSPORT_VERSION = "wm.market-object-passport.v1" as const;

/** Current lifecycle of a resolved object, mapped from dimension resolution. */
export type PassportLifecycle = "RESOLVED" | "FORMING" | "UNRESOLVED";

/** One evidence ref in an object's lineage — reversible to a provider event. */
export interface PassportEvidenceRef {
  readonly eventId: string;
  readonly source: string;
  readonly fidelity: MarketFidelityClass;
  readonly basis: string;
  readonly observedAt: number;
  readonly availableAt: number;
}

export interface MarketObjectPassport {
  /** Stable object key (the canonical dimension name). */
  readonly id: string;
  /** Human label. */
  readonly label: string;
  /** Current lifecycle. */
  readonly lifecycle: PassportLifecycle;
  /** Resolved value, or null when not yet resolved. */
  readonly value: string | null;
  /** Engine confidence in [0,1], or null when none. */
  readonly confidence: number | null;
  /**
   * Strongest evidence fidelity backing this object (OBSERVED is strongest),
   * or null when there is no evidence yet. Language must never exceed this.
   */
  readonly fidelity: MarketFidelityClass | null;
  /** Distinct evidence sources, in first-seen order. */
  readonly sources: readonly string[];
  /** Full evidence lineage — every ref that seals this object's value. */
  readonly evidence: readonly PassportEvidenceRef[];
  /** Strongest material evidence against this object. */
  readonly contradictions: readonly string[];
  /** What is missing / would invalidate — the honest UNKNOWN residue. */
  readonly unknowns: readonly string[];
  /** One honest line describing the object's current state. */
  readonly summary: string;
}

export interface MarketObjectPassportVM {
  readonly version: typeof MARKET_OBJECT_PASSPORT_VERSION;
  readonly snapshotId: string | null;
  readonly capturedAt: number | null;
  readonly qualityState: MarketQualityState | "UNKNOWN";
  readonly objects: readonly MarketObjectPassport[];
  readonly resolvedCount: number;
  readonly totalCount: number;
}

/** Canonical dimension order + labels. Mirrors surfaceLink's DIMENSION_ORDER. */
const DIMENSION_ORDER: readonly (readonly [keyof CanonicalMarketState, string])[] = [
  ["direction", "Direction"],
  ["location", "Location"],
  ["structure", "Structure"],
  ["aggression", "Aggression"],
  ["orderFlow", "Order Flow"],
  ["regime", "Regime"],
  ["profile", "Profile"],
  ["volatility", "Volatility"],
];

/** Strongest → weakest. Used to pick an object's headline fidelity. */
const FIDELITY_RANK: Record<MarketFidelityClass, number> = {
  OBSERVED: 5,
  DERIVED: 4,
  PROXY: 3,
  INFERRED: 2,
  SIMULATED: 1,
  UNAVAILABLE: 0,
};

function lifecycleOf(d: MarketStateDimension): PassportLifecycle {
  if (d.resolution === "RESOLVED" && !!d.value?.trim()) return "RESOLVED";
  if (d.resolution === "PARTIAL") return "FORMING";
  return "UNRESOLVED";
}

function strongestFidelity(
  evidence: readonly MarketStateEvidenceRef[],
): MarketFidelityClass | null {
  let best: MarketFidelityClass | null = null;
  for (const ref of evidence) {
    if (best === null || FIDELITY_RANK[ref.fidelity] > FIDELITY_RANK[best]) {
      best = ref.fidelity;
    }
  }
  return best;
}

function distinctSources(evidence: readonly MarketStateEvidenceRef[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const ref of evidence) {
    if (!seen.has(ref.source)) {
      seen.add(ref.source);
      out.push(ref.source);
    }
  }
  return out;
}

function summarise(
  label: string,
  lifecycle: PassportLifecycle,
  d: MarketStateDimension,
  fidelity: MarketFidelityClass | null,
): string {
  if (lifecycle === "RESOLVED") {
    const via = fidelity ? ` (${fidelity.toLowerCase()} evidence)` : "";
    return `${label} resolved to ${d.value}${via}.`;
  }
  if (lifecycle === "FORMING") {
    const need = d.unknowns[0] ? ` — still needs ${d.unknowns[0]}` : "";
    return `${label} is forming${need}.`;
  }
  const why = d.unknowns[0] ?? "no verified evidence yet";
  return `${label} unresolved — ${why}.`;
}

function passportFor(
  id: string,
  label: string,
  d: MarketStateDimension,
): MarketObjectPassport {
  const lifecycle = lifecycleOf(d);
  const fidelity = strongestFidelity(d.evidence);
  return {
    id,
    label,
    lifecycle,
    value: lifecycle === "RESOLVED" ? d.value : null,
    confidence: d.confidence,
    fidelity,
    sources: distinctSources(d.evidence),
    evidence: d.evidence.map((e) => ({
      eventId: e.eventId,
      source: e.source,
      fidelity: e.fidelity,
      basis: e.basis,
      observedAt: e.observedAt,
      availableAt: e.availableAt,
    })),
    contradictions: [...d.contradictions],
    unknowns: [...d.unknowns],
    summary: summarise(label, lifecycle, d, fidelity),
  };
}

/**
 * Compile a Market Object Passport set from the sealed canonical state.
 *
 * `null` state is the truthful "nothing sealed yet" case — an empty passport
 * set with UNKNOWN provenance. Consumers MUST render that honestly.
 */
export function selectMarketObjectPassport(
  state: CanonicalMarketState | null,
): MarketObjectPassportVM {
  if (!state) {
    return {
      version: MARKET_OBJECT_PASSPORT_VERSION,
      snapshotId: null,
      capturedAt: null,
      qualityState: "UNKNOWN",
      objects: [],
      resolvedCount: 0,
      totalCount: 0,
    };
  }

  const objects = DIMENSION_ORDER.map(([key, label]) =>
    passportFor(String(key), label, state[key] as unknown as MarketStateDimension),
  );

  return {
    version: MARKET_OBJECT_PASSPORT_VERSION,
    snapshotId: state.snapshotId,
    capturedAt: state.capturedAt,
    qualityState: state.qualityState,
    objects,
    resolvedCount: objects.filter((o) => o.lifecycle === "RESOLVED").length,
    totalCount: objects.length,
  };
}
