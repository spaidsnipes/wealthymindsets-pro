/**
 * ATTENTION GOVERNOR — one owner decides how loud every governed layer is.
 *
 * Law: Garden Pass 12 — calm at rest, deep on Inspect; the selected object is
 * loudest; dim, never delete (F27). Parent family: F13 Semantic Zoom + the
 * H-901 regime breakers + the P-110 stack preferences.
 *
 * Before this file a layer's alpha was a HAND PRODUCT at every paint site in
 * MainChart — `magnetLight * semanticDensity.mid * stackOpacity(...) *
 * parentFade(...)` — built from four dimmers that did not know about each
 * other: the depth tier (`selectSemanticDensity`), the Question Lens quiet,
 * the regime light (`selectRegimeLighting`) and the trader's lane opacity
 * (`stackOpacity`). Nothing stated which layers are the present and which are
 * memory, so Profile Memory painted at the same macro weight as the present
 * Composite. The only tier list was prose in `selectSemanticDensity`.
 *
 * Here the list is DATA (`LAYER_ATTENTION`): every painting layer, once, with
 *
 *   tier   — LIVE (the present reading), SUPPORTING (context drawn about
 *            other readings), MEMORY (what the market did before), or CHROME
 *            (house hardware: never dimmed). SELECTED and STALE are states a
 *            layer is put in, not a standing a layer is born with.
 *   depth  — which density tier it speaks at (MACRO / MID / MICRO), or null
 *            when depth does not govern it.
 *   light  — which regime breaker dims it (MAGNETS / TREND), or null.
 *   lane   — the profile-stack lane whose opacity preference it answers to.
 *
 * and the ONE alpha rule:
 *
 *   alpha = max(FLOOR, min(tierCeiling, depth × quiet × light × lane))
 *
 * Ceilings: SELECTED 1 (exempt from depth, quiet and light — the trader chose
 * it), LIVE 1, SUPPORTING 0.85, MEMORY 0.5, STALE 0.3. The floor is 0.12:
 * every layer the trader switched on stays on the glass. CHROME is 1 always.
 * Candles and the price line are outside this owner's authority — nothing
 * here can dim them.
 *
 * THE SELECTED OBJECT IS LOUDEST. While the trader is inspecting a selection
 * (a zone or level, a Living slice, a bubble) and it is ON CAMERA, every
 * governed layer that is not the selected item recedes by SELECTION_RECEDE
 * (floor still 0.12); the item itself paints at 1. A selection off camera, or
 * one restored after a refresh with Inspect still closed, recedes nothing —
 * the chart is never dimmed for a focus the trader cannot see or did not ask
 * to read. Words keep a legibility floor (`textAlpha`, 0.5).
 *
 * The VM remembers which layers asked it for an alpha this frame, so the
 * `attentionTiers` receipt lists exactly the layers that painted through it:
 * a layer that is OFF never asks and is never listed (its own silence
 * receipt stays authoritative).
 *
 * PURE arithmetic; one fresh VM per frame.
 */

import type { DensityTier, SemanticDensityVM } from "./selectSemanticDensity";
import type { RegimeLightingVM } from "./selectRegimeLighting";
import { stackOpacity, type ProfileStackPrefs } from "./profileStackPrefs";
import type { StackSpecies } from "./profileStackPlan";

export const ATTENTION_GOVERNOR_VERSION = 1;

export type AttentionTier = "SELECTED" | "LIVE" | "SUPPORTING" | "MEMORY" | "STALE" | "CHROME";
/** The standing a layer is born with; SELECTED and STALE are states it is put in. */
export type LayerStanding = "LIVE" | "SUPPORTING" | "MEMORY" | "CHROME";
export type LightClass = "MAGNETS" | "TREND";

export interface LayerAttention {
  readonly tier: LayerStanding;
  readonly depth: DensityTier | null;
  readonly light: LightClass | null;
  readonly lane?: StackSpecies;
}

export const TIER_CEILING: Readonly<Record<AttentionTier, number>> = {
  SELECTED: 1,
  LIVE: 1,
  SUPPORTING: 0.85,
  MEMORY: 0.5,
  STALE: 0.3,
  CHROME: 1,
};

/** Dim, never delete (F27): no governed layer goes below this. */
export const ATTENTION_FLOOR = 0.12;
/** A fused object's two parents step back so the derived object reads as the subject. */
export const FUSION_PARENT_FADE = 0.45;
/** Everything that is not the selected item, while a selection is inspected on camera. */
export const SELECTION_RECEDE = 0.45;
/** A receding layer's words stay legible. */
export const TEXT_ALPHA_FLOOR = 0.5;

/**
 * EVERY PAINTING LAYER, ONCE. Keys are the `layerOnRef` switch keys plus the
 * layers switched elsewhere (order-flow modes, zones, the fused object) and
 * the parts of a layer that sit in a different tier from their parent
 * (session ghosts inside Living are memory; Living's movie is its trail).
 * `everyPaintingLayerHasAnAttentionTier.sentinel.test.ts` keeps this total.
 */
export const LAYER_ATTENTION = {
  // ── The tape and candle anatomy (NEAR speaks) ───────────────────────────
  valueCandle: { tier: "LIVE", depth: "MICRO", light: null },
  stack: { tier: "LIVE", depth: "MICRO", light: null },
  divergence: { tier: "LIVE", depth: "MICRO", light: null },
  weather: { tier: "LIVE", depth: "MICRO", light: null },
  effort: { tier: "LIVE", depth: "MICRO", light: null },
  deltaLevels: { tier: "LIVE", depth: "MICRO", light: null },
  footprint: { tier: "LIVE", depth: null, light: null },
  bubbles: { tier: "LIVE", depth: null, light: null },
  bigTrades: { tier: "LIVE", depth: null, light: null },
  absorption: { tier: "LIVE", depth: null, light: null },
  exhaustion: { tier: "LIVE", depth: null, light: null },
  heatLens: { tier: "LIVE", depth: null, light: null },
  // ── The profile family (MID speaks; Composite and fusion are MACRO) ─────
  livingProfile: { tier: "LIVE", depth: "MID", light: "MAGNETS", lane: "LIVING" },
  livingProfileMovie: { tier: "LIVE", depth: "MID", light: "MAGNETS", lane: "LIVING" },
  profileDna: { tier: "LIVE", depth: "MID", light: "MAGNETS", lane: "LIVING" },
  compositeProfile: { tier: "LIVE", depth: "MACRO", light: "MAGNETS", lane: "COMPOSITE" },
  visibleRangeProfile: { tier: "LIVE", depth: "MID", light: "MAGNETS", lane: "VISIBLE_RANGE" },
  tpo: { tier: "LIVE", depth: "MID", light: "MAGNETS" },
  structureProfile: { tier: "LIVE", depth: "MID", light: "TREND" },
  profileFusion: { tier: "LIVE", depth: "MACRO", light: "MAGNETS" },
  fusedObject: { tier: "LIVE", depth: "MID", light: "MAGNETS" },
  marketZones: { tier: "LIVE", depth: "MID", light: null },
  marketStructure: { tier: "LIVE", depth: "MACRO", light: "TREND" },
  // ── Context drawn about other readings ──────────────────────────────────
  anatomyCards: { tier: "SUPPORTING", depth: null, light: null },
  expectedEnvelope: { tier: "SUPPORTING", depth: null, light: null },
  contradiction: { tier: "SUPPORTING", depth: null, light: null },
  liquidityLifecycle: { tier: "SUPPORTING", depth: null, light: null },
  // ── Memory: what the market did before sits below the present ───────────
  profileMemory: { tier: "MEMORY", depth: "MACRO", light: "MAGNETS" },
  sessionGhosts: { tier: "MEMORY", depth: "MID", light: "MAGNETS", lane: "LIVING" },
  valueMigration: { tier: "MEMORY", depth: "MID", light: "TREND" },
  memoryGhost: { tier: "MEMORY", depth: null, light: null },
  // ── House chrome: never dimmed ──────────────────────────────────────────
  riskOnPrice: { tier: "CHROME", depth: null, light: null },
  questionLens: { tier: "CHROME", depth: null, light: null },
  regimeLighting: { tier: "CHROME", depth: null, light: null },
  scaffolding: { tier: "CHROME", depth: null, light: null },
  zoomPlate: { tier: "CHROME", depth: null, light: null },
} as const satisfies Readonly<Record<string, LayerAttention>>;

export type AttentionLayerKey = keyof typeof LAYER_ATTENTION;

export interface AttentionGovernorInput {
  /** The frame's one depth owner. UNMEASURED leaves every depth multiplier at 1. */
  readonly density: SemanticDensityVM;
  /** Question Lens quiet: 1 = no lens, < 1 while a question is asked. */
  readonly questionQuiet: number;
  /** The regime breaker's lights, or null when switched off (every light 1). */
  readonly regimeLight: Pick<RegimeLightingVM, "magnets" | "trend"> | null;
  /** The trader's stack preferences — lane opacity. */
  readonly stackPrefs: ProfileStackPrefs;
  /** The two lanes a standing fused object was made from; they step back. */
  readonly fusedParents?: readonly StackSpecies[];
  /** STALE demotes the present (LIVE) to the STALE ceiling. null = unknown. */
  readonly feedState: "LIVE" | "STALE" | null;
  /** The room's ONE selection, as the canvas found it this frame. null = nothing selected. */
  readonly selection?: AttentionSelection | null;
}

/**
 * ZONE = a structure zone; LEVEL = any other market object (a pin);
 * SLICE = a Living Profile bucket; BUBBLE = a big-trade or delta print.
 */
export type AttentionSelectionKind = "ZONE" | "LEVEL" | "SLICE" | "BUBBLE";

export interface AttentionSelection {
  readonly kind: AttentionSelectionKind;
  /** The object id, the slice price or the bubble's print key. */
  readonly key: string;
  /** Painted inside the plot this frame — measured by the canvas, never assumed. */
  readonly onCamera: boolean;
  /** Inspect is open on it. A restored selection arrives calm (closed). */
  readonly inspecting: boolean;
}

export interface AttentionAlphaOpts {
  /** The item the trader selected: SELECTED, full strength. */
  readonly selectedItem?: boolean;
}

export interface AttentionGovernorVM {
  readonly version: number;
  /** `D:<depth>|Q:<quiet>|SEL:<kind>|STALE:<0/1>` */
  readonly receipt: string;
  /** `ZONE:<id>` · `LEVEL:<id>` · `SLICE:<price>` · `BUBBLE:<key>` · `OFF_CAMERA:<kind>` · `AT_REST:<kind>` · `NONE` */
  readonly selectionReceipt: string;
  /** True while everything but the selected item recedes. */
  readonly receding: boolean;
  tierOf(key: AttentionLayerKey, opts?: AttentionAlphaOpts): AttentionTier;
  alpha(key: AttentionLayerKey, opts?: AttentionAlphaOpts): number;
  /** The alpha for a layer's WORDS: its alpha, never below the legibility floor. */
  textAlpha(key: AttentionLayerKey, opts?: AttentionAlphaOpts): number;
  /** The same governor with the frame's Question Lens quiet folded in. */
  withQuestionQuiet(q: number): AttentionGovernorVM;
  /** `key:TIER:alpha,…` for every layer that asked this frame, in first-ask order. */
  tiersReceipt(): string;
}

const DEPTH_FIELD: Readonly<Record<DensityTier, "macro" | "mid" | "micro">> = {
  MACRO: "macro",
  MID: "mid",
  MICRO: "micro",
};

const fin = (v: number, dflt: number) => (Number.isFinite(v) ? v : dflt);
const r2 = (v: number) => Math.round(v * 100) / 100;

export function selectAttentionGovernor(
  input: AttentionGovernorInput,
  asked: Map<AttentionLayerKey, { tier: AttentionTier; alpha: number }> = new Map(),
): AttentionGovernorVM {
  const quiet = Math.min(1, Math.max(0, fin(input.questionQuiet, 1)));
  const magnets = fin(input.regimeLight?.magnets ?? 1, 1);
  const trend = fin(input.regimeLight?.trend ?? 1, 1);
  const stale = input.feedState === "STALE";
  const fused = input.fusedParents ?? [];
  const sel = input.selection ?? null;
  const receding = sel != null && sel.onCamera && sel.inspecting;
  const selWord = sel == null ? "NONE" : !sel.inspecting ? "AT_REST" : !sel.onCamera ? "OFF_CAMERA" : sel.kind;
  const selectionReceipt = sel == null ? "NONE"
    : !sel.inspecting ? `AT_REST:${sel.kind}`
    : !sel.onCamera ? `OFF_CAMERA:${sel.kind}`
    : `${sel.kind}:${sel.key}`;

  const tierOf = (key: AttentionLayerKey, opts?: AttentionAlphaOpts): AttentionTier => {
    const spec: LayerAttention = LAYER_ATTENTION[key];
    if (spec.tier === "CHROME") return "CHROME";
    if (opts?.selectedItem) return "SELECTED";
    if (stale && spec.tier === "LIVE") return "STALE";
    return spec.tier;
  };

  const alpha = (key: AttentionLayerKey, opts?: AttentionAlphaOpts): number => {
    const spec: LayerAttention = LAYER_ATTENTION[key];
    const tier = tierOf(key, opts);
    let a = 1;
    if (tier !== "CHROME" && tier !== "SELECTED") {
      const depth = spec.depth ? fin(input.density[DEPTH_FIELD[spec.depth]], 1) : 1;
      const light = spec.light === "MAGNETS" ? magnets : spec.light === "TREND" ? trend : 1;
      const lane = spec.lane
        ? stackOpacity(spec.lane, input.stackPrefs) * (fused.includes(spec.lane) ? FUSION_PARENT_FADE : 1)
        : 1;
      const recede = receding ? SELECTION_RECEDE : 1;
      a = Math.max(ATTENTION_FLOOR, Math.min(TIER_CEILING[tier], depth * quiet * light * lane) * recede);
    }
    // The receipt records what the layer was actually given, when it asked —
    // a layer painted before the Question Lens was not quieted by it.
    if (!opts?.selectedItem && !asked.has(key)) asked.set(key, { tier, alpha: a });
    return a;
  };

  return {
    version: ATTENTION_GOVERNOR_VERSION,
    receipt: `D:${input.density.depth}|Q:${r2(quiet)}|SEL:${selWord}|STALE:${stale ? 1 : 0}`,
    selectionReceipt,
    receding,
    tierOf,
    alpha,
    textAlpha: (key: AttentionLayerKey, opts?: AttentionAlphaOpts) => Math.max(TEXT_ALPHA_FLOOR, alpha(key, opts)),
    withQuestionQuiet: (q: number) => selectAttentionGovernor({ ...input, questionQuiet: q }, asked),
    tiersReceipt: () => [...asked].map(([k, v]) => `${k}:${v.tier}:${r2(v.alpha)}`).join(","),
  };
}

export default selectAttentionGovernor;
