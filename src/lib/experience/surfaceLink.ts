/**
 * SurfaceLink — the ONE presentation contract between the market engine and
 * every WM Pro surface (desktop, iPad, iPhone).
 *
 * Founder law (2026-08-24): "The engine owns truth. SurfaceLink owns
 * presentation. The UI owns interaction." This module is the SurfaceLink
 * boundary: it takes the ALREADY-COMPILED canonical One Story (the canon §7
 * `selectOneStory` compiler output) plus the sealed CanonicalMarketState's
 * provenance, and reshapes them into a compressed, device-agnostic
 * ExperiencePacket that every surface renders IDENTICALLY in meaning while each
 * device lays it out its own way.
 *
 * HARD RULE — NO NEW CALCULATIONS, NO SECOND COMPILER. The market truth
 * (primary / contradiction / missing / decision) is produced upstream by
 * `selectOneStory`. SurfaceLink must NOT re-derive it from raw dimensions — a
 * second derivation could DISAGREE with the canonical compiler, which the
 * founder forbids ("never duplicate existing infrastructure"). SurfaceLink only
 * (a) forwards the compiled story verbatim and (b) reads pure provenance
 * (quality, snapshot id, resolved-dimension names) off the sealed state for
 * inspection hints. If the engine says UNKNOWN, the packet says UNKNOWN.
 *
 * PURE MODULE — no React, no I/O. Safe to import anywhere.
 */

import type {
  CanonicalMarketState,
  MarketStateDimension,
  MarketQualityState,
} from "../marketData/canonicalMarketState";
import type { OneStoryVM } from "../marketData/viewModels/selectOneStory";
import type { RightOfWay as CanonRightOfWay } from "../marketData/viewModels/decisionPermissionCompiler";

export const SURFACE_LINK_SCHEMA_VERSION = "wm.surfacelink.v1" as const;

/**
 * The device-agnostic right-of-way, normalised from the canonical compiler's
 * verdict for stable cross-device serialisation. Faithful to the source — no
 * information is invented and none is silently upgraded. `NO_TRADE` uses an
 * underscore purely for wire/id friendliness; CAUTION is preserved so a surface
 * can distinguish a soft hold from a plain WAIT.
 */
export type RightOfWay = "ACTION" | "CAUTION" | "WAIT" | "NO_TRADE" | "UNKNOWN";

/** Faithful mapping from the canonical §7 verdict to the packet's wire enum. */
function normaliseRightOfWay(v: CanonRightOfWay): RightOfWay {
  switch (v) {
    case "ACTION":
      return "ACTION";
    case "CAUTION":
      return "CAUTION";
    case "WAIT":
      return "WAIT";
    case "NO TRADE":
      return "NO_TRADE";
    case "UNKNOWN":
    default:
      return "UNKNOWN";
  }
}

/** The compressed, device-agnostic story the human reads first. */
export interface ExperiencePacket {
  readonly schemaVersion: typeof SURFACE_LINK_SCHEMA_VERSION;
  /** The single question this surface is currently answering (from the lens). */
  readonly question: string;
  /** PRIMARY STORY — what is materially happening (from selectOneStory). */
  readonly primaryStory: string;
  /** The strongest single thing arguing against the story, or null. */
  readonly contradiction: string | null;
  /** MISSING — evidence families not yet resolved (the Evidence Debt, P12). */
  readonly missing: readonly string[];
  /** Right-of-way, forwarded faithfully from the canonical compiler. */
  readonly rightOfWay: RightOfWay;
  /** Names of the resolved evidence families worth inspecting (relevant objects). */
  readonly relevantObjects: readonly string[];
  /** How many evidence layers are worth surfacing right now (semantic depth hint). */
  readonly visibleDepth: number;
  /** Freshness/fidelity of the underlying state, carried through honestly. */
  readonly qualityState: MarketQualityState | "UNKNOWN";
  /** Lineage back to the exact sealed snapshot, or null when no evidence yet. */
  readonly sourceSnapshotId: string | null;
}

/** Human-facing labels for the canonical dimensions, in inspection priority order. */
const DIMENSION_ORDER: readonly (readonly [keyof CanonicalMarketState, string])[] = [
  ["direction", "Direction"],
  ["location", "Location"],
  ["structure", "Structure"],
  ["aggression", "Aggression"],
  ["orderFlow", "Order Flow"],
  ["regime", "Regime"],
  ["profile", "Profile"],
  ["volatility", "Volatility"],
] as const;

function dim(state: CanonicalMarketState, key: keyof CanonicalMarketState): MarketStateDimension {
  return state[key] as unknown as MarketStateDimension;
}

/** True when a dimension is fully resolved with a concrete value. */
function isResolved(d: MarketStateDimension): boolean {
  return d.resolution === "RESOLVED" && !!d.value?.trim();
}

export interface BuildPacketOptions {
  /** The current lens question (owned by the Question Router / mode). */
  readonly question?: string;
}

const DEFAULT_QUESTION = "What is materially happening right now?";

/**
 * Build the compressed One Story packet.
 *
 * @param oneStory  the ALREADY-COMPILED canonical story (selectOneStory output),
 *                  or null when nothing has been compiled yet.
 * @param state     the sealed CanonicalMarketState, used ONLY for provenance
 *                  (quality, snapshot id, resolved-dimension inspection hints).
 *
 * `oneStory === null` is the truthful "no compiled story yet" case and yields a
 * fully UNKNOWN packet — consumers MUST render UNKNOWN, never a fabricated story.
 */
export function buildExperiencePacket(
  oneStory: OneStoryVM | null,
  state: CanonicalMarketState | null,
  opts: BuildPacketOptions = {},
): ExperiencePacket {
  const question = opts.question?.trim() || DEFAULT_QUESTION;

  // Provenance is a pure read of the sealed state — never a truth derivation.
  const qualityState: MarketQualityState | "UNKNOWN" = state?.qualityState ?? "UNKNOWN";
  const sourceSnapshotId = state?.snapshotId ?? null;
  const relevantObjects = state
    ? DIMENSION_ORDER.filter(([k]) => isResolved(dim(state, k))).map(([, label]) => label)
    : [];

  if (!oneStory) {
    return {
      schemaVersion: SURFACE_LINK_SCHEMA_VERSION,
      question,
      primaryStory: "No market evidence yet.",
      contradiction: null,
      missing: state ? ["Awaiting a compiled market story."] : ["Awaiting a sealed market state."],
      rightOfWay: "UNKNOWN",
      relevantObjects,
      visibleDepth: relevantObjects.length,
      qualityState,
      sourceSnapshotId,
    };
  }

  // MISSING — prefer the rich debt labels from the canonical compiler; fall back
  // to the single compact `missing` phrase. Both originate upstream — no new calc.
  const missing =
    oneStory.debt && oneStory.debt.missingLabels.length > 0
      ? [...oneStory.debt.missingLabels]
      : oneStory.missing
        ? [oneStory.missing]
        : [];

  return {
    schemaVersion: SURFACE_LINK_SCHEMA_VERSION,
    question,
    primaryStory: oneStory.primary,
    contradiction: oneStory.contradiction,
    missing,
    rightOfWay: normaliseRightOfWay(oneStory.decision.value),
    relevantObjects,
    visibleDepth: relevantObjects.length,
    qualityState,
    sourceSnapshotId,
  };
}
