/**
 * SEMANTIC PERMISSION — which layer may paint, and in which form, at each
 * depth. H-501 · F13 SEMANTIC ZOOM, GP12 §66.
 *
 * Founder, GP12 §66: "SEMANTIC ZOOM … Not CSS zoom … FAR: regime, major
 * structure, envelope. MID: zones, profiles, liquidity, MarketObjects. NEAR:
 * bar anatomy, footprint, tape, micro force-response. Same market. Deeper
 * question." Plates, read side by side with the glass (2026-09-26):
 *
 *   WM_A_H501_SEMANTIC_ZOOM — LEFT FAR "DIM CANDLES · REGIME ENVELOPE ·
 *     MAJOR STRUCTURE ONLY" (shaded BULL / BEAR regime, LOWER LOW · LOWER
 *     HIGH · HIGHER LOW, nothing else); CENTER MID "ZONES, LIVING PROFILE,
 *     MARKET OBJECTS"; RIGHT NEAR "CANDLE ANATOMY · ABSORPTION HATCH · TAPE
 *     TICKS".
 *   WM_Contractor_H-501_SEMANTIC_ZOOM_F13 — "Semantic zoom changes which
 *     geometry may speak; it does not remount the route."
 *   WM_NewMockup_128_F13_Semantic_Zoom_Micro — at micro the higher-TF context
 *     is "faint bias light only"; per-bar delta and prints on the bars.
 *
 * Measured on serving before this owner (TSLA 15m, FAR = 755 bars, badge
 * "FAR · REGIME + ENVELOPE SPEAK", 2026-09-25): the FAR glass still carried
 * the FOUNDATION six-step card, exhaustion marks, the H-101 WAIT tag, SWING
 * ABOVE / BELOW tags, the value-band chip, liquidity ladders and their words,
 * anatomy / absorption sentences and full-width regime magnets. Every layer
 * decided its own depth rule, or none. The density multipliers
 * (`selectSemanticDensity`) only dimmed; nothing withdrew a representation.
 *
 * ONE TABLE. Every painting layer on /charts, once, with its permission at
 * FAR / MID / NEAR:
 *
 *   SPEAK  — its full form: geometry and words.
 *   QUIET  — its reduced form: geometry only (its level words, captions and
 *            names are withheld), never louder than QUIET_CEILING through the
 *            attention governor. A few layers keep ONE honesty statement
 *            (fidelity / provenance) at QUIET — named at each site.
 *   SILENT — nothing on the glass at this depth. The trader's switch is not
 *            touched: zooming back paints it again, and the frame's receipts
 *            name it (`semanticPermission`, `semanticWithheld`, and the
 *            layer's own receipt reads SILENT:<depth>, never OFF) — so a
 *            withheld layer is never mistaken for an empty reading.
 *
 * THE SELECTED OBJECT ALWAYS SPEAKS (GP12 §64): asked with `selectedItem`,
 * any layer is SPEAK at every depth. A layer that exists only for the
 * selection (the anatomy card, the force→response bracket) asks that way.
 *
 * UNMEASURED depth changes nothing: every layer SPEAKs and the candles are
 * not dimmed (H1 — never looked is not "looked and found nothing") — except
 * the DEPTH FORMS (the FAR envelope, the NEAR geometry, the NEAR delta row),
 * which exist only at their own measured depth and stay SILENT, exactly as
 * they were before this table.
 *
 * The attention governor reads this table (it is built from the same depth
 * owner): `att.paints(layer)` / `att.speaks(layer)` at each block's gate, and
 * a QUIET layer's alpha capped at QUIET_CEILING. No block decides its own
 * depth rule; a block that changes FORM by depth (Living's FAR skeleton, the
 * NEAR tape) still reads `.depth` from the one density owner.
 *
 * PURE. DETERMINISTIC.
 */

import type { SemanticZoomState } from "./selectSemanticZoom";

export const SEMANTIC_PERMISSION_VERSION = 1;

export type Permission = "SPEAK" | "QUIET" | "SILENT";
export type PermissionDepth = "FAR" | "MID" | "NEAR";
/** [FAR, MID, NEAR] */
export type PermissionRow = readonly [Permission, Permission, Permission];

/** How bright the candles read under the FAR veil (plate: "DIM CANDLES"). */
export const FAR_CANDLES_DIM = 0.44;
/** A QUIET layer is never louder than this (= the density's SOFT). */
export const QUIET_CEILING = 0.6;

const S = "SPEAK", Q = "QUIET", X = "SILENT";

/**
 * EVERY PAINTING LAYER, ONCE. Keys are the attention governor's layer keys
 * (LAYER_ATTENTION) plus the paint blocks it does not govern (the candles'
 * veil, the FAR form, the fidelity bridges, the NEAR tape, the legacy VP, the
 * WAIT tag, the candle clock). `selectSemanticPermission.test.ts` keeps the two
 * tables joined and `everyPaintingLayerAsksThePermission.sentinel.test.ts`
 * holds MainChart's blocks to asking.
 */
export const SEMANTIC_PERMISSION = {
  // ── H-501's own forms ─────────────────────────────────────── FAR  MID  NEAR
  candles: [Q, S, S],            // FAR: dimmed under the veil (FAR_CANDLES_DIM)
  farEnvelope: [S, X, X],        // the regime envelope + MAJOR HIGH / LOW names
  zoomPlate: [S, S, S],          // the depth word itself

  // ── Regime + envelope + major structure: FAR speaks ─────────────────────
  regimeField: [S, Q, Q],        // the BULL / BEAR light; faint bias light below FAR
  regimeLighting: [S, S, S],     // the breaker's one compact title / coin
  regimeChannel: [X, S, X],      // at FAR the envelope IS the channel — never two
  regimeMagnets: [X, S, X],      // full-width σ lines are zone-scale fixtures
  expectedEnvelope: [S, S, X],
  marketStructure: [Q, S, Q],    // QUIET: chevrons + the owner's letters only; FAR: major swings only

  // ── Zones + profile + market objects: MID speaks ─────────────────────────
  marketZones: [X, S, Q],        // unselected zones are wordless outlines already
  livingProfile: [Q, S, Q],      // FAR: its skeleton (value spine + POC stroke)
  livingProfileMovie: [X, S, X],
  profileDna: [X, S, X],
  sessionGhosts: [X, S, X],
  compositeProfile: [X, S, Q],
  visibleRangeProfile: [X, S, Q],
  tpo: [X, S, X],
  structureProfile: [X, S, X],
  profileFusion: [X, S, X],
  fusedObject: [X, S, Q],
  profileMemory: [X, S, X],
  valueMigration: [X, S, X],
  volumeProfile: [X, S, Q],      // the toolbar's WM Fixed / Session VP columns
  memoryGhost: [X, S, X],
  contradiction: [X, S, S],
  absorption: [X, S, S],         // NEAR: "absorption hatch"
  exhaustion: [X, S, S],
  anatomyCards: [X, S, S],       // painted only for the selection — asks as the selected item
  scaffolding: [X, S, S],        // the FOUNDATION card and its SWING ABOVE / BELOW tags
  weather: [X, S, X],            // NEAR: the lens yields (weatherLensGate)
  heatLens: [X, S, X],           // painted under the weather layer's gate
  liquidityLifecycle: [X, S, Q], // QUIET: ladders, no phase words; the honesty tag stays
  debtTag: [X, S, S],            // the H-101 WAIT tag on its event bar

  // ── Tape + candle anatomy: NEAR speaks ───────────────────────────────────
  footprint: [X, Q, S],          // MID: cells and tint, no numbers
  bubbles: [X, S, S],            // the Founder-preserved Nectar trail
  bigTrades: [X, S, S],          // F07A discs
  forceResponse: [X, S, S],      // only ever the selected print — asks as the selected item
  tapeHorizon: [X, S, S],
  microDelta: [X, X, S],         // the per-bar delta row above the volume band
  nearGeometry: [X, X, S],       // tape dots, tape path, open / close ticks, value hatch
  valueCandle: [X, S, S],        // the value-band chip rides with it
  stack: [X, S, S],
  divergence: [X, S, S],
  effort: [X, S, S],
  deltaLevels: [X, S, S],

  // ── Fidelity and the trader's own hardware ───────────────────────────────
  dataGaps: [Q, S, S],           // FAR: the bridge; an outage ≥ 3 intervals keeps its words
  riskOnPrice: [S, S, S],
  questionLens: [S, S, S],       // a question the trader asked is a selection of attention
  candleTimer: [S, S, S],
} as const satisfies Readonly<Record<string, PermissionRow>>;

export type DepthLayer = keyof typeof SEMANTIC_PERMISSION;

export const DEPTH_LAYERS = Object.keys(SEMANTIC_PERMISSION) as DepthLayer[];

const COLUMN: Readonly<Record<PermissionDepth, 0 | 1 | 2>> = { FAR: 0, MID: 1, NEAR: 2 };

/** A depth's own form: painted only when that depth is measured. */
export const DEPTH_FORMS: ReadonlySet<DepthLayer> = new Set<DepthLayer>(["farEnvelope", "nearGeometry", "microDelta"]);

export interface PermissionOpts {
  /** The item the trader selected: it speaks at every depth. */
  readonly selectedItem?: boolean;
}

export interface SemanticPermissionVM {
  readonly version: number;
  readonly depth: SemanticZoomState;
  /** The layer's permission at this depth; SPEAK for the selected item and when UNMEASURED. */
  of(layer: DepthLayer, opts?: PermissionOpts): Permission;
  /** Anything of this layer on the glass at this depth (SPEAK or QUIET). */
  paints(layer: DepthLayer, opts?: PermissionOpts): boolean;
  /** Its words too (SPEAK only). */
  speaks(layer: DepthLayer, opts?: PermissionOpts): boolean;
  /** Candle brightness under the depth's veil: FAR_CANDLES_DIM at FAR, else 1. */
  readonly candlesDim: number;
  /** Every layer this depth silences, in table order. Empty when UNMEASURED. */
  readonly silent: readonly DepthLayer[];
  /** `FAR|SILENT=a,b,…` — null when UNMEASURED (nothing is silenced). */
  readonly receipt: string | null;
}

export function permissionAt(layer: DepthLayer, depth: SemanticZoomState | null | undefined): Permission {
  if (depth !== "FAR" && depth !== "MID" && depth !== "NEAR") return DEPTH_FORMS.has(layer) ? "SILENT" : "SPEAK";
  return SEMANTIC_PERMISSION[layer][COLUMN[depth]];
}

export function selectSemanticPermission(depth: SemanticZoomState | null | undefined): SemanticPermissionVM {
  const d: SemanticZoomState = depth ?? "UNMEASURED";
  const measured = d === "FAR" || d === "MID" || d === "NEAR";
  const of = (layer: DepthLayer, opts?: PermissionOpts): Permission =>
    opts?.selectedItem ? "SPEAK" : permissionAt(layer, d);
  const silent = measured ? DEPTH_LAYERS.filter(k => permissionAt(k, d) === "SILENT") : [];
  const candles = permissionAt("candles", d);
  return {
    version: SEMANTIC_PERMISSION_VERSION,
    depth: d,
    of,
    paints: (layer, opts) => of(layer, opts) !== "SILENT",
    speaks: (layer, opts) => of(layer, opts) === "SPEAK",
    candlesDim: candles === "SPEAK" ? 1 : FAR_CANDLES_DIM,
    silent,
    receipt: measured ? `${d}|SILENT=${silent.join(",")}` : null,
  };
}

export default selectSemanticPermission;
