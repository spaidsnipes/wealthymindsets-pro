/**
 * GAMMA HEATMAP APPEARANCE — the five presets (Founder 2026-10-10):
 * Balanced / High Contrast / Subtle / Positive-Negative Focus / Custom.
 *
 * Every preset keeps positive and negative as DIFFERENT MATERIALS (solid +
 * lit edge vs hatching — the painter owns that) and as distinct inks, held
 * by the appearance law's pair rule: a custom pair a trader made identical
 * falls back to the room's pair, whole. Opacity is capped so candles stay
 * readable. PURE.
 */
import { inksDistinct } from "@/lib/chart/appearanceLaw";

/** Where the chosen preset id (and the Custom record) is stored, and the event that tells the chart. */
export const GAMMA_HEAT_PRESET_KEY = "wm_gammaHeatPreset";
export const GAMMA_HEAT_CUSTOM_KEY = "wm_gammaHeatCustom";
export const GAMMA_HEAT_PRESET_EVENT = "wm-gamma-heat-preset";

export const GAMMA_HEAT_PRESET_IDS = ["BALANCED", "HIGH_CONTRAST", "SUBTLE", "FOCUS_POSITIVE", "FOCUS_NEGATIVE", "CUSTOM"] as const;
export type GammaHeatPresetId = (typeof GAMMA_HEAT_PRESET_IDS)[number];

export interface GammaHeatPreset {
  readonly id: GammaHeatPresetId;
  readonly label: string;
  readonly posRgb: string;
  readonly negRgb: string;
  /** Strongest band's alpha (|GEX| = the chain's max). Never above GAMMA_HEAT_MAX_ALPHA. */
  readonly maxAlpha: number;
  /** Bands below this share of the max are not painted. */
  readonly floor: number;
  readonly focus: "BOTH" | "POSITIVE" | "NEGATIVE";
}

/** Above this a band starts to compete with the candles. */
export const GAMMA_HEAT_MAX_ALPHA = 0.5;
export const GAMMA_HEAT_MIN_ALPHA = 0.06;

const POS = "96,150,210";
const NEG = "232,152,64";

export const GAMMA_HEAT_PRESETS: Readonly<Record<Exclude<GammaHeatPresetId, "CUSTOM">, GammaHeatPreset>> = {
  BALANCED: { id: "BALANCED", label: "Balanced", posRgb: POS, negRgb: NEG, maxAlpha: 0.3, floor: 0.04, focus: "BOTH" },
  HIGH_CONTRAST: { id: "HIGH_CONTRAST", label: "High contrast", posRgb: "120,196,255", negRgb: "255,168,40", maxAlpha: 0.48, floor: 0.03, focus: "BOTH" },
  SUBTLE: { id: "SUBTLE", label: "Subtle", posRgb: POS, negRgb: NEG, maxAlpha: 0.16, floor: 0.08, focus: "BOTH" },
  FOCUS_POSITIVE: { id: "FOCUS_POSITIVE", label: "Positive focus", posRgb: POS, negRgb: NEG, maxAlpha: 0.36, floor: 0.04, focus: "POSITIVE" },
  FOCUS_NEGATIVE: { id: "FOCUS_NEGATIVE", label: "Negative focus", posRgb: POS, negRgb: NEG, maxAlpha: 0.36, floor: 0.04, focus: "NEGATIVE" },
};

export interface GammaHeatCustom { readonly posRgb?: string; readonly negRgb?: string; readonly maxAlpha?: number }

const rgbTriplet = (v: unknown): string | null =>
  typeof v === "string" && /^\d{1,3},\d{1,3},\d{1,3}$/.test(v) && v.split(",").every(n => Number(n) <= 255) ? v : null;

/** Stored id (+ custom fields) → a lawful preset. Unknown → BALANCED. */
export function gammaHeatPreset(id: unknown, custom?: GammaHeatCustom | null): GammaHeatPreset {
  if (id !== "CUSTOM") return GAMMA_HEAT_PRESETS[(GAMMA_HEAT_PRESET_IDS as readonly unknown[]).includes(id) ? (id as Exclude<GammaHeatPresetId, "CUSTOM">) : "BALANCED"];
  const base = GAMMA_HEAT_PRESETS.BALANCED;
  let pos = rgbTriplet(custom?.posRgb) ?? base.posRgb;
  let neg = rgbTriplet(custom?.negRgb) ?? base.negRgb;
  // The appearance law's pair rule: two semantic opposites never share an ink.
  if (!inksDistinct(`rgb(${pos})`, `rgb(${neg})`)) { pos = base.posRgb; neg = base.negRgb; }
  const a = typeof custom?.maxAlpha === "number" && Number.isFinite(custom.maxAlpha) ? custom.maxAlpha : base.maxAlpha;
  return { id: "CUSTOM", label: "Custom", posRgb: pos, negRgb: neg, maxAlpha: Math.min(GAMMA_HEAT_MAX_ALPHA, Math.max(GAMMA_HEAT_MIN_ALPHA, a)), floor: base.floor, focus: "BOTH" };
}

/** Stored Custom JSON → its fields (unknown shapes read as none). */
export function parseGammaHeatCustom(raw: string | null): GammaHeatCustom | null {
  if (!raw) return null;
  try { const v = JSON.parse(raw); return v && typeof v === "object" ? (v as GammaHeatCustom) : null; } catch { return null; }
}

/**
 * The store the heatmap preset lives in for THIS page: a proof scene keeps its
 * choice in the tab's sessionStorage (the trader's saved preset is never
 * touched); otherwise localStorage. A proof tab reads its own choice first.
 */
export function gammaHeatStores(holdsWrites: boolean): { write: Storage; read: Storage[] } | null {
  try {
    return holdsWrites ? { write: sessionStorage, read: [sessionStorage, localStorage] } : { write: localStorage, read: [localStorage] };
  } catch { return null; }
}
/** The resolved preset from the first store that holds an id. */
export function readGammaHeatPreset(stores: readonly Pick<Storage, "getItem">[]): GammaHeatPreset {
  for (const st of stores) {
    const id = st.getItem(GAMMA_HEAT_PRESET_KEY);
    if (id) return gammaHeatPreset(id, parseGammaHeatCustom(st.getItem(GAMMA_HEAT_CUSTOM_KEY)));
  }
  return gammaHeatPreset(null);
}
