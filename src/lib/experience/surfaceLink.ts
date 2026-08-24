/**
 * SurfaceLink — the ONE presentation contract between the market engine and
 * every WM Pro surface (desktop, iPad, iPhone).
 *
 * Founder law (2026-08-24): "The engine owns truth. SurfaceLink owns
 * presentation. The UI owns interaction." This module is the SurfaceLink
 * boundary: it maps a sealed CanonicalMarketState into a compressed
 * ExperiencePacket that the One Story strip / Question lens render IDENTICALLY
 * in meaning across devices, while each device is free to lay it out its own way.
 *
 * HARD RULE — NO NEW CALCULATIONS. This module does not compute market truth.
 * It only *reads* the already-sealed canonical dimensions and reshapes them for
 * human attention (P25 One Story Compiler). If the engine says UNKNOWN, the
 * packet says UNKNOWN. It never rounds evidence up, never invents ACTION, never
 * fabricates a market object.
 *
 * PURE MODULE — no React, no I/O. Safe to import anywhere.
 */

import type {
  CanonicalMarketState,
  MarketStateDimension,
  MarketQualityState,
} from "../marketData/canonicalMarketState";

export const SURFACE_LINK_SCHEMA_VERSION = "wm.surfacelink.v1" as const;

/**
 * Right of Way is a CONSERVATIVE presentation signal, not the authorization.
 * The Decision Permission Compiler (P14) alone may return ACTION; SurfaceLink
 * never promotes to ACTION on its own — the strongest it will show from raw
 * market state is WAIT. ACTION only appears when an upstream permission verdict
 * is explicitly passed in.
 */
export type RightOfWay = "ACTION" | "WAIT" | "NO_TRADE" | "UNKNOWN";

/** The compressed, device-agnostic story the human reads first. */
export interface ExperiencePacket {
  readonly schemaVersion: typeof SURFACE_LINK_SCHEMA_VERSION;
  /** The single question this surface is currently answering (from the lens). */
  readonly question: string;
  /** PRIMARY STORY — what is materially happening. */
  readonly primaryStory: string;
  /** The strongest single thing arguing against the story, or null. */
  readonly contradiction: string | null;
  /** MISSING — evidence families not yet resolved (the Evidence Debt, P12). */
  readonly missing: readonly string[];
  /** Conservative right-of-way. Never ACTION unless permission is supplied. */
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
  /**
   * An explicit upstream permission verdict. ONLY this may raise rightOfWay to
   * ACTION. Absent it, SurfaceLink is conservative (WAIT / UNKNOWN).
   */
  readonly permission?: RightOfWay;
}

const DEFAULT_QUESTION = "What is materially happening right now?";

/**
 * Build the compressed One Story packet from a sealed CanonicalMarketState.
 *
 * `state === null` is the truthful "no evidence yet" case and yields a fully
 * UNKNOWN packet — consumers MUST render UNKNOWN, never a fabricated story.
 */
export function buildExperiencePacket(
  state: CanonicalMarketState | null,
  opts: BuildPacketOptions = {},
): ExperiencePacket {
  const question = opts.question?.trim() || DEFAULT_QUESTION;

  if (!state) {
    return {
      schemaVersion: SURFACE_LINK_SCHEMA_VERSION,
      question,
      primaryStory: "No market evidence yet.",
      contradiction: null,
      missing: ["Awaiting a sealed market state."],
      rightOfWay: opts.permission ?? "UNKNOWN",
      relevantObjects: [],
      visibleDepth: 0,
      qualityState: "UNKNOWN",
      sourceSnapshotId: null,
    };
  }

  const direction = dim(state, "direction");

  // PRIMARY STORY — read directly from the Direction dimension. Never invented.
  const primaryStory = isResolved(direction)
    ? direction.value!.trim()
    : "Market direction not yet resolved.";

  // CONTRADICTION — strongest single counter-signal. Prefer a top-level
  // contradiction; otherwise the first contradiction surfaced by any dimension.
  const dimContradiction = DIMENSION_ORDER
    .map(([k]) => dim(state, k).contradictions[0])
    .find((c) => !!c);
  const contradiction = state.contradictions[0] ?? dimContradiction ?? null;

  // MISSING — the Evidence Debt: every dimension not yet resolved, named for
  // the human, plus any explicit top-level unknowns.
  const missingDims = DIMENSION_ORDER
    .filter(([k]) => !isResolved(dim(state, k)))
    .map(([, label]) => label);
  const missing = [...new Set([...missingDims, ...state.unknowns])];

  // RELEVANT OBJECTS — the resolved evidence families worth inspecting now.
  const relevantObjects = DIMENSION_ORDER
    .filter(([k]) => isResolved(dim(state, k)))
    .map(([, label]) => label);

  // RIGHT OF WAY — conservative. ACTION only from an explicit permission verdict.
  // Raw market state alone never authorizes a trade (P14 owns ACTION).
  let rightOfWay: RightOfWay;
  if (opts.permission) {
    rightOfWay = opts.permission;
  } else if (!isResolved(direction) || missing.length > 0 || contradiction) {
    rightOfWay = "WAIT";
  } else {
    rightOfWay = "WAIT"; // even a clean read is only WAIT without permission proof
  }

  return {
    schemaVersion: SURFACE_LINK_SCHEMA_VERSION,
    question,
    primaryStory,
    contradiction,
    missing,
    rightOfWay,
    relevantObjects,
    visibleDepth: relevantObjects.length,
    qualityState: state.qualityState,
    sourceSnapshotId: state.snapshotId,
  };
}
