/**
 * APPEARANCE LAW — the trader may restyle anything; nothing may become a lie.
 *
 * Founder order §5 (2026-10-09): "opacity, color, readability: complete
 * control". The coordinator's rule beside it: customization may not make two
 * semantically different objects identical. A bull candle the colour of a bear
 * candle, an up volume bar the colour of a down one, a call wall the colour of
 * a put wall — each is a chart that can be read backwards.
 *
 * So the chart reads its appearance through ONE pass, here, before it paints:
 * every opposed PAIR is checked, and a pair the trader made identical (or so
 * close a trader could not tell them apart) falls back to the room's own pair
 * — both halves, so the two never end up half-custom. Nothing else is
 * touched; defaults are byte-identical.
 */

export interface InkPair { readonly a: string; readonly b: string }

/** "#rrggbb" / "#rgb" / "rgb(a)(…)" → [r,g,b] (0–255). null = not a colour this can judge. */
export function rgbOf(c: string | null | undefined): [number, number, number] | null {
  if (typeof c !== "string") return null;
  const s = c.trim().toLowerCase();
  let m = /^#([0-9a-f]{6})$/.exec(s);
  if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
  m = /^#([0-9a-f]{3})$/.exec(s);
  if (m) return [parseInt(m[1][0] + m[1][0], 16), parseInt(m[1][1] + m[1][1], 16), parseInt(m[1][2] + m[1][2], 16)];
  const r = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/.exec(s);
  if (r) return [Number(r[1]), Number(r[2]), Number(r[3])];
  return null;
}

/** Below this RGB distance two inks read as one at chart size. */
export const MIN_PAIR_DISTANCE = 40;

export function inksDistinct(a: string, b: string): boolean {
  const x = rgbOf(a), y = rgbOf(b);
  if (!x || !y) return a.trim().toLowerCase() !== b.trim().toLowerCase();
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) >= MIN_PAIR_DISTANCE;
}

/** The trader's pair if its halves can be told apart; else the room's pair, whole. */
export function lawfulPair(chosen: InkPair, room: InkPair): InkPair {
  return inksDistinct(chosen.a, chosen.b) ? chosen : room;
}

/** A trader's volume hex at the room's own alpha (the bars stay held back behind price). */
export function volumeInk(hex: string | undefined, roomInk: string): string {
  const rgb = rgbOf(hex);
  if (!rgb) return roomInk;
  const alpha = /rgba\([^)]*,\s*([\d.]+)\s*\)/.exec(roomInk)?.[1] ?? "1";
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

type Pairable = object;
/** The opposed pairs a chart's settings carry: [keyA, keyB]. */
export const OPPOSED_PAIRS: readonly (readonly [string, string])[] = [
  ["candleUp", "candleDown"], ["wickUp", "wickDown"], ["borderUp", "borderDown"],
  ["volumeUp", "volumeDown"], ["bigTradeBuy", "bigTradeSell"], ["deltaBuy", "deltaSell"],
];

/**
 * The settings with every opposed pair made lawful against `room` (the shipped
 * defaults for the same keys). Keys the trader never set stay unset. PURE;
 * returns the SAME object when nothing needed changing (stable identity).
 */
export function lawfulSettings<T extends Pairable>(s: T | null | undefined, room: Pairable): T | null | undefined {
  if (!s) return s;
  const src = s as Record<string, unknown>, rm = room as Record<string, unknown>;
  let out: Record<string, unknown> | null = null;
  for (const [ka, kb] of OPPOSED_PAIRS) {
    const a = (src[ka] ?? rm[ka]) as string | undefined, b = (src[kb] ?? rm[kb]) as string | undefined;
    if (typeof a !== "string" || typeof b !== "string") continue;
    if (inksDistinct(a, b)) continue;
    out = out ?? { ...src };
    out[ka] = rm[ka]; out[kb] = rm[kb];
  }
  return (out ?? s) as T;
}

/* ── SLICE B KNOBS (Founder order §5) — clamped here, so no stored value can push
   a mark out of its cell, off its floor, or over price. ─────────────────────── */

/** Big-trade disc size: 0.6–1.4 × the size owner's radius (the narrow-glass cap still applies after). */
export function clampBubbleScale(v: unknown): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 1;
  return Math.min(1.4, Math.max(0.6, Math.round(n * 10) / 10));
}
/** Footprint numbers: −1 … +2 px against the row-fitted size. */
export function clampFootprintNumberStep(v: unknown): number {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.round(v) : 0;
  return Math.min(2, Math.max(-1, n));
}
/**
 * The footprint number's px for a row: the owner's fit plus the trader's step,
 * never above the row (numbers never overprint the next row) and never below
 * the number floor (a number that does not fit is dropped, never shrunk).
 */
export function footprintNumberPx(fitPx: number, rowH: number, step: unknown, floorPx: number): number {
  const k = clampFootprintNumberStep(step);
  const want = fitPx + k;
  return Math.max(floorPx, Math.min(want, Math.max(fitPx, Math.floor(rowH))));
}
/** Options-wall tick thickness: 1–3 × the shipped 2px. */
export function clampWallThickness(v: unknown): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 1;
  return Math.min(3, Math.max(1, Math.round(n * 2) / 2));
}

/** The five profile-palette keys the VP gear owns (marketFieldMaterial's ladder). */
export const PROFILE_PALETTE_KEYS = ["wm_vp_up", "wm_vp_dn", "wm_vp_poc", "wm_vp_vah", "wm_vp_val"] as const;
/**
 * RED / GREEN profile preset (Founder order §5). Up and down are a market pair;
 * POC is its own ink (not up, not down) and the value-area edges share a quiet
 * third — so the profile still reads as bars, a centre and two edges.
 */
export const PROFILE_PRESET_RED_GREEN: Readonly<Record<(typeof PROFILE_PALETTE_KEYS)[number], string>> = {
  wm_vp_up: "#00C076", wm_vp_dn: "#FF4D67", wm_vp_poc: "#F2D27A", wm_vp_vah: "#9AA3B2", wm_vp_val: "#9AA3B2",
};
/** Write a preset (or `null` = the room's own palette: the keys are removed). Tells the chart. */
export function applyProfilePreset(store: Pick<Storage, "setItem" | "removeItem">, preset: Readonly<Record<string, string>> | null, notify?: () => void): void {
  for (const k of PROFILE_PALETTE_KEYS) {
    if (preset) store.setItem(k, preset[k]); else store.removeItem(k);
  }
  notify?.();
}

/* ── ORDER LINES (Founder P0 2026-10-10) ───────────────────────────────────
   "entry/stop/target lines must be crisp, default stop RED, target GREEN,
   entry distinct; colour/opacity/thickness/line-style configurable". The
   trader may restyle them; the law keeps three things true whatever is stored:
     · VISIBLE — opacity never below ORDER_LINE_ALPHA_FLOOR, width 1–4 px, and
       an ink the field cannot swallow (too close to the background → the
       room's ink);
     · STOP ≠ TARGET — a pair the trader made alike falls back to the room's
       pair, both halves (the same rule as candles);
     · ENTRY DISTINCT — an entry alike to the stop or the target falls back to
       the room's entry ink (and if that still collides, the pair does too).
   The room's inks are the ticket's own (TradePanel INK / RED / GREEN), so the
   line on the glass and the field in the ticket are one colour. ───────────── */

export type OrderLineDash = "solid" | "dashed" | "dotted";
export type OrderLineRoleKey = "ENTRY" | "STOP" | "TARGET";
export interface OrderLineLook { readonly ink: string; readonly alpha: number; readonly width: number; readonly dash: OrderLineDash }
export type OrderLineLooks = Readonly<Record<OrderLineRoleKey, OrderLineLook>>;
/** The trader's stored order-line knobs (ChartSettings carries them). */
export interface OrderLineAppearance {
  readonly orderLineEntry?: string;
  readonly orderLineStop?: string;
  readonly orderLineTarget?: string;
  readonly orderLineOpacity?: number;
  readonly orderLineWidth?: number;
  readonly orderLineStyle?: OrderLineDash;
}
/** The room's order-line inks — the ticket's INK / RED / GREEN. */
export const ORDER_LINE_ROOM_INK: Readonly<Record<OrderLineRoleKey, string>> = { ENTRY: "#ede6d3", STOP: "#e0786b", TARGET: "#7fd1a8" };
export const ORDER_LINE_ALPHA_FLOOR = 0.6;
export const ORDER_LINE_WIDTH_DEFAULT = 2;
export const ORDER_LINE_DASH_DEFAULT: OrderLineDash = "dashed";

export function clampOrderLineAlpha(v: unknown): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 1;
  return Math.min(1, Math.max(ORDER_LINE_ALPHA_FLOOR, Math.round(n * 100) / 100));
}
export function clampOrderLineWidth(v: unknown): number {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.round(v) : ORDER_LINE_WIDTH_DEFAULT;
  return Math.min(4, Math.max(1, n));
}
const ORDER_DASHES: readonly OrderLineDash[] = ["solid", "dashed", "dotted"];
export const lawfulOrderLineDash = (v: unknown): OrderLineDash =>
  (ORDER_DASHES.includes(v as OrderLineDash) ? (v as OrderLineDash) : ORDER_LINE_DASH_DEFAULT);

/** lightweight-charts LineStyle for a dash: 0 solid, 1 dotted, 2 dashed. */
export const lwcLineStyle = (d: OrderLineDash): 0 | 1 | 2 => (d === "solid" ? 0 : d === "dotted" ? 1 : 2);

/** "#rrggbb" at `alpha` → "rgba(…)"; an ink this cannot read is returned as-is. */
export function inkAt(ink: string, alpha: number): string {
  const rgb = rgbOf(ink);
  if (!rgb || alpha >= 1) return ink;
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

/**
 * The three looks the chart paints, made lawful. PURE. `background` is the
 * field the lines sit on (an ink too close to it cannot be seen → room ink).
 */
export function lawfulOrderLineLooks(s: OrderLineAppearance | null | undefined, background: string): OrderLineLooks {
  const room = ORDER_LINE_ROOM_INK;
  const seen = (c: string | undefined, fallback: string) =>
    typeof c === "string" && rgbOf(c) && inksDistinct(c, background) ? c : fallback;
  let stop = seen(s?.orderLineStop, room.STOP);
  let target = seen(s?.orderLineTarget, room.TARGET);
  if (!inksDistinct(stop, target)) { stop = room.STOP; target = room.TARGET; }
  let entry = seen(s?.orderLineEntry, room.ENTRY);
  if (!inksDistinct(entry, stop) || !inksDistinct(entry, target)) entry = room.ENTRY;
  if (!inksDistinct(entry, stop) || !inksDistinct(entry, target)) { stop = room.STOP; target = room.TARGET; }
  const alpha = clampOrderLineAlpha(s?.orderLineOpacity);
  const width = clampOrderLineWidth(s?.orderLineWidth);
  const dash = lawfulOrderLineDash(s?.orderLineStyle);
  return {
    ENTRY: { ink: entry, alpha, width, dash },
    STOP: { ink: stop, alpha, width, dash },
    TARGET: { ink: target, alpha, width, dash },
  };
}
/** The room's looks (nothing stored), on the room's field. */
export const ORDER_LINE_ROOM_LOOKS: OrderLineLooks = lawfulOrderLineLooks(null, "#07080a");

/* ── WALLS & GAMMA heatmap appearance (2026-10-10) — presets live in
   gammaHeatAppearance.ts (Balanced / High contrast / Subtle / Positive focus /
   Negative focus / Custom); this is the ONE write path the ⚙ uses. Custom inks
   pass the same pair law as every other opposed pair (gammaHeatPreset). ── */
export const GAMMA_HEAT_PRESET_STORE_KEY = "wm_gammaHeatPreset";
export const GAMMA_HEAT_CUSTOM_STORE_KEY = "wm_gammaHeatCustom";
export function applyGammaHeatPreset(
  store: Pick<Storage, "setItem">,
  id: string,
  custom: { readonly posRgb?: string; readonly negRgb?: string; readonly maxAlpha?: number } | null,
  notify?: () => void,
): void {
  store.setItem(GAMMA_HEAT_PRESET_STORE_KEY, id);
  if (custom) store.setItem(GAMMA_HEAT_CUSTOM_STORE_KEY, JSON.stringify(custom));
  notify?.();
}
/** "#rrggbb" → "r,g,b" (the heatmap's ink form); null when not a colour. */
export function rgbTripletOf(hex: string): string | null {
  const v = rgbOf(hex);
  return v ? v.map(n => Math.round(n)).join(",") : null;
}

/* ── PROFILE SPECIES (Founder 2026-10-10: "all eleven profiles … independent
   colour / opacity per invention") ────────────────────────────────────────
   One opacity dial per species, on top of the family's Profiles dial. The law:
     · CLAMPED to the governor's own dial range (0.4–1.6) — a species can be
       quieter or louder, never off and never over price; the governor's
       readable floor still applies after (selectAttentionGovernor);
     · SPECIES STAY APART — a dial changes loudness, never material or
       geometry, so no setting can make two species identical (each keeps its
       own form: Living gold body, VRP lit glass, Composite strata, Structure
       crisp edge, Fixed Range slab, TPO letters, DNA spine …);
     · unknown keys are dropped; an untouched species is absent (= 1).
   Session and Classic VP share one painter (drawWMVP) and one governed layer,
   so they share one dial — named as such, not hidden. Bid/Ask Split and Fixed
   Range are drawings: their dial is applied at their paint site. ─────────── */
export const PROFILE_SPECIES = [
  "LIVING", "STRUCTURE", "FUSION", "MEMORY", "DNA", "SESSION_CLASSIC",
  "VISIBLE_RANGE", "FIXED_RANGE", "COMPOSITE", "TPO", "BID_ASK",
] as const;
export type ProfileSpeciesKey = (typeof PROFILE_SPECIES)[number];
export const PROFILE_SPECIES_LABEL: Readonly<Record<ProfileSpeciesKey, string>> = {
  LIVING: "Living", STRUCTURE: "Structure", FUSION: "Fusion", MEMORY: "Memory", DNA: "DNA",
  SESSION_CLASSIC: "Session · Classic VP", VISIBLE_RANGE: "Visible Range", FIXED_RANGE: "Fixed Range",
  COMPOSITE: "Composite", TPO: "TPO / Auction", BID_ASK: "Bid/Ask Split",
};
/** The governed layers each species paints through (attention-governor keys). Drawings have none. */
export const PROFILE_SPECIES_LAYERS: Readonly<Record<ProfileSpeciesKey, readonly string[]>> = {
  LIVING: ["livingProfile", "livingProfileMovie"],
  STRUCTURE: ["structureProfile"],
  FUSION: ["profileFusion", "fusedObject"],
  MEMORY: ["profileMemory"],
  DNA: ["profileDna"],
  SESSION_CLASSIC: ["volumeProfile"],
  VISIBLE_RANGE: ["visibleRangeProfile"],
  FIXED_RANGE: [],
  COMPOSITE: ["compositeProfile"],
  TPO: ["tpo"],
  BID_ASK: [],
};
export const SPECIES_OPACITY_MIN = 0.4;
export const SPECIES_OPACITY_MAX = 1.6;
export function clampSpeciesOpacity(v: unknown): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 1;
  return Math.min(SPECIES_OPACITY_MAX, Math.max(SPECIES_OPACITY_MIN, Math.round(n * 10) / 10));
}
/** The stored per-species dials made lawful: known species only, each clamped; 1 is dropped (absent = untouched). */
export function lawfulSpeciesOpacity(v: unknown): Partial<Record<ProfileSpeciesKey, number>> {
  const out: Partial<Record<ProfileSpeciesKey, number>> = {};
  if (!v || typeof v !== "object") return out;
  for (const sp of PROFILE_SPECIES) {
    const raw = (v as Record<string, unknown>)[sp];
    if (raw == null) continue;
    const k = clampSpeciesOpacity(raw);
    if (k !== 1) out[sp] = k;
  }
  return out;
}
/** Per governed layer, the species dial that layer answers to (for the attention governor). */
export function speciesLayerOpacity(v: unknown): Record<string, number> {
  const law = lawfulSpeciesOpacity(v);
  const out: Record<string, number> = {};
  for (const sp of PROFILE_SPECIES) {
    const k = law[sp];
    if (k == null) continue;
    for (const layer of PROFILE_SPECIES_LAYERS[sp]) out[layer] = k;
  }
  return out;
}
/**
 * A drawing species' alpha with its dial (Fixed Range, Bid/Ask Split): the
 * paint site's own alpha × the dial, never above 1 and never below the same
 * readable floor the governor keeps (0.2) — unless the site was already lower.
 */
export function drawingSpeciesAlpha(siteAlpha: number, dial: unknown): number {
  const k = clampSpeciesOpacity(dial);
  if (k === 1) return siteAlpha;
  return Math.min(1, Math.max(Math.min(siteAlpha, 0.2), siteAlpha * k));
}

/* ── PROFILE SPECIES COLOUR (Founder 2026-10-10) ─────────────────────────────
   One body ink per species (its VALUE / TAIL / WASH — profileFamilyInk
   `species()`); the POC and the value-area edges stay the family's, so a POC
   means one thing on every species. The law, whatever is stored:
     · a VALID colour only (hex or rgb);
     · NEVER SWALLOWED — distinct from the market field;
     · NEVER THE POC — distinct from the family POC ink, or the centre of the
       profile could not be told from its body;
     · NO TWO SPECIES IDENTICAL — a species whose ink is too close to one kept
       earlier (in PROFILE_SPECIES order) falls back to the family ink and is
       named in `refused`, so the settings can say why.
   Session · Classic VP and Bid/Ask Split are coloured by their own palettes
   (VP gear, delta inks) and take no body ink here. ───────────────────────── */
export const SPECIES_INK_KEYS: readonly ProfileSpeciesKey[] = PROFILE_SPECIES.filter(sp => sp !== "SESSION_CLASSIC" && sp !== "BID_ASK");
export interface LawfulSpeciesInks {
  /** Kept inks as [r,g,b], keyed by species. */
  readonly inks: Partial<Record<ProfileSpeciesKey, readonly [number, number, number]>>;
  /** Species whose stored ink was refused, with the reason. */
  readonly refused: Partial<Record<ProfileSpeciesKey, "INVALID" | "FIELD" | "POC" | "TWIN">>;
}
export function lawfulSpeciesInks(v: unknown, ctx: { field: string; poc: string | readonly string[] }): LawfulSpeciesInks {
  const pocs = typeof ctx.poc === "string" ? [ctx.poc] : ctx.poc;
  const inks: Partial<Record<ProfileSpeciesKey, readonly [number, number, number]>> = {};
  const refused: Partial<Record<ProfileSpeciesKey, "INVALID" | "FIELD" | "POC" | "TWIN">> = {};
  if (!v || typeof v !== "object") return { inks, refused };
  const kept: string[] = [];
  for (const sp of SPECIES_INK_KEYS) {
    const raw = (v as Record<string, unknown>)[sp];
    if (raw == null || raw === "") continue;
    const rgb = typeof raw === "string" ? rgbOf(raw) : null;
    if (!rgb || rgb.some(n => !Number.isFinite(n) || n < 0 || n > 255)) { refused[sp] = "INVALID"; continue; }
    const hex = raw as string;
    if (!inksDistinct(hex, ctx.field)) { refused[sp] = "FIELD"; continue; }
    if (pocs.some(pc => !inksDistinct(hex, pc))) { refused[sp] = "POC"; continue; }
    if (kept.some(k => !inksDistinct(hex, k))) { refused[sp] = "TWIN"; continue; }
    kept.push(hex);
    inks[sp] = [Math.round(rgb[0]), Math.round(rgb[1]), Math.round(rgb[2])] as const;
  }
  return { inks, refused };
}
