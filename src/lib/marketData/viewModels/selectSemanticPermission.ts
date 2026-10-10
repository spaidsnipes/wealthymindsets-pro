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
  // T-210 / F10 (2026-09-26): HTF ancestry on the one chart. FAR's form is
  // the D shelf only (a major level; band + node are withheld as a FORM read);
  // QUIET keeps geometry + the horizon tags (4H / 1H / D), no captions.
  mtfAncestry: [Q, S, Q],
  // Garden 16 §32: FAR carries major pressure geography (field, front, walls);
  // MID keeps it; NEAR hands the glass to candles/tape — QUIET: field + front, no words.
  derivativesPressure: [S, S, Q],
  brickWalls: [S, S, Q],
  // WALLS & GAMMA (2026-10-10): same depth grammar as Brick Walls — NEAR keeps geometry, no words.
  callWall: [S, S, Q],
  putWall: [S, S, Q],
  gammaHeatmap: [S, S, Q],
  gammaPositive: [S, S, Q],
  gammaNegative: [S, S, Q],
  gammaFlip: [S, S, Q],
  gammaConcentration: [S, S, Q],

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
  // Garden 19 FVG lane D: territory has no words; QUIET only caps its alpha.
  // FAR keeps the bands quiet (never invisible), NEAR keeps live territory.
  fvg: [Q, S, S],
  fvgMemory: [Q, S, Q],
  // F15 breath ribbon (PROPOSED, default OFF): geometry only, no words.
  breathRibbon: [Q, S, S],
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
  // Five-hour order (2026-09-27): the forming candle's own anatomy (wick history
  // + tempo). "Semantic zoom changes the representation, not the visibility":
  // FAR is QUIET — the tempo aura only; MID and NEAR read the whole live bar.
  formingCandle: [Q, S, S],
  // "Give Flow direction": the sided tape's current on each bar. FAR is QUIET —
  // bars too thin for their own streaks pool into ~10px buckets.
  flowCurrent: [Q, S, S],
  // Garden 19 §12 (2026-10-08): rows for the layers the governor now tiers.
  // The volume field has no words; FAR keeps it under the QUIET ceiling.
  volumeField: [Q, S, S],
  // FAR keeps the three lane rails (QUIET), withholds the session words.
  sessionBands: [Q, S, S],
  // Words only, about candle-scale objects — FAR (regime · major structure) withholds it.
  wisdomLine: [X, S, S],
  // C-06 CVD notch (PROPOSED): a per-bar mark on the wick tip — candle scale, FAR withholds it.
  cvdNotch: [X, S, S],
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
  /**
   * WHY a layer is QUIET: "DEPTH" (H-501 — this depth asks for its geometry
   * without its words, and quieter) or "NARROW" (the phone's WORD budget — the
   * words are withheld; the geometry is not asked to dim). `null` = not QUIET.
   * The attention governor caps alpha for DEPTH only (Founder, 2026-10-09:
   * "the opacity on the phone version still sucks" — measured at 390/430,
   * every LIVE layer sat at 0.6 because the word budget was dimming ink).
   */
  quietBy(layer: DepthLayer, opts?: PermissionOpts): "DEPTH" | "NARROW" | null;
  /** Candle brightness under the depth's veil: FAR_CANDLES_DIM at FAR, else 1. */
  readonly candlesDim: number;
  /** Every layer this depth silences, in table order. Empty when UNMEASURED. */
  readonly silent: readonly DepthLayer[];
  /** `FAR|SILENT=a,b,…` — null when UNMEASURED (nothing is silenced). */
  readonly receipt: string | null;
}

/**
 * THE NARROW-GLASS BUDGET (2026-10-04). Founder, on the 390 phone: fix the
 * chart's density. Measured on BTC-USD 5m at 390: Living's VAH / POC / VAL
 * chips, "ABSORBING" + "ABSORPTION 5.98 STRONG", the Effort caption, the
 * Order Flow and Structure captions, the WAIT tag and the zone names all
 * printed words into the same ~300px of plot. Every one is correct alone; a
 * phone cannot carry all of them at once.
 *
 * The grammar for "less" already exists: QUIET is a layer's geometry without
 * its words. So the budget is one rule over this table, not a second table:
 * on a plot narrower than NARROW_GLASS_MAX_PX, every SPEAK becomes QUIET
 * except the layers below — price and its chrome, the Living profile's level
 * names (the primary reading), the trader's own risk and questions, data
 * gaps, the WAIT tag and the depth word. The SELECTED item still speaks at
 * every width (tap a zone, an absorption, a bubble — its words come back),
 * and nothing that paints is removed: SILENT stays SILENT, the rest keeps its
 * shape. The desk (wider than the budget) is unchanged.
 */
export const NARROW_GLASS_MAX_PX = 600;
/** A plot shorter than this is narrow glass too — a phone on its side. */
export const NARROW_GLASS_MIN_PLOT_H = 360;
export const NARROW_GLASS_KEEPS_WORDS: ReadonlySet<DepthLayer> = new Set<DepthLayer>([
  "candles", "farEnvelope", "zoomPlate", "regimeLighting",
  "livingProfile",
  "riskOnPrice", "questionLens", "candleTimer", "dataGaps", "debtTag",
  "formingCandle",
]);

export function permissionAt(layer: DepthLayer, depth: SemanticZoomState | null | undefined): Permission {
  if (depth !== "FAR" && depth !== "MID" && depth !== "NEAR") return DEPTH_FORMS.has(layer) ? "SILENT" : "SPEAK";
  return SEMANTIC_PERMISSION[layer][COLUMN[depth]];
}

export function selectSemanticPermission(
  depth: SemanticZoomState | null | undefined,
  glass: { readonly narrow?: boolean } = {},
): SemanticPermissionVM {
  const d: SemanticZoomState = depth ?? "UNMEASURED";
  const measured = d === "FAR" || d === "MID" || d === "NEAR";
  const narrow = glass.narrow === true;
  const of = (layer: DepthLayer, opts?: PermissionOpts): Permission => {
    if (opts?.selectedItem) return "SPEAK";
    const p = permissionAt(layer, d);
    return narrow && p === "SPEAK" && !NARROW_GLASS_KEEPS_WORDS.has(layer) ? "QUIET" : p;
  };
  const silent = measured ? DEPTH_LAYERS.filter(k => permissionAt(k, d) === "SILENT") : [];
  const candles = permissionAt("candles", d);
  return {
    version: SEMANTIC_PERMISSION_VERSION,
    depth: d,
    of,
    paints: (layer, opts) => of(layer, opts) !== "SILENT",
    speaks: (layer, opts) => of(layer, opts) === "SPEAK",
    quietBy: (layer, opts) => {
      if (opts?.selectedItem) return null;
      const p = permissionAt(layer, d);
      if (p === "QUIET") return "DEPTH";
      return narrow && p === "SPEAK" && !NARROW_GLASS_KEEPS_WORDS.has(layer) ? "NARROW" : null;
    },
    candlesDim: candles === "SPEAK" ? 1 : FAR_CANDLES_DIM,
    silent,
    receipt: measured ? `${d}|SILENT=${silent.join(",")}${narrow ? "|NARROW" : ""}` : null,
  };
}

export default selectSemanticPermission;
