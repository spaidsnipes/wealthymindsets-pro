/**
 * Indicator customization config — shared by MainChart (rendering) and
 * IndicatorSettingsModal (UI). Each configurable indicator declares its
 * editable fields (length / multiplier / colors) and default values.
 */

import { movingAverageInk } from "@/lib/chart/marketFieldMaterial";

/** Timeframe groups for per-resolution visibility (TradingView-style). */
export const TF_GROUPS = ["Seconds", "Minutes", "Hours", "Days", "Weeks", "Months"] as const;
export type TfGroup = (typeof TF_GROUPS)[number];

/** Map a canonical app timeframe (e.g. "5m", "1h", "1D") to its visibility group. */
export function tfGroupOf(tf: string): TfGroup {
  const t = (tf || "").trim();
  if (t === "1M" || /^(3M|6M|1Y|3Y|5Y)$/i.test(t)) return "Months";
  if (t === "1W") return "Weeks";
  if (t === "1D") return "Days";
  if (/h$/i.test(t)) return "Hours";
  if (/m$/.test(t)) return "Minutes";
  if (/s$/i.test(t)) return "Seconds";
  return "Minutes";
}

export type IndicatorParams = {
  length?:  number;
  length2?: number;
  mult?:    number;
  color?:   string;
  color2?:  string;
  color3?:  string;
  /** Style: line width (1–4) and style (0=solid,1=dotted,2=dashed). */
  lineWidth?: number;
  lineStyle?: number;
  /** Visibility: per-timeframe-group on/off. Absent key ⇒ visible. */
  visibility?: Partial<Record<TfGroup, boolean>>;
};

export type IndicatorSettings = Record<string, IndicatorParams>;

export type IndField =
  | { key: "length" | "length2" | "mult"; label: string; type: "number"; min: number; max: number; step: number }
  | { key: "color" | "color2" | "color3"; label: string; type: "color" };

type IndConfig = { fields: IndField[]; defaults: IndicatorParams };

const numLen = (label = "Length"): IndField => ({ key: "length", label, type: "number", min: 1, max: 400, step: 1 });
const colorF = (label = "Color"): IndField => ({ key: "color", label, type: "color" });

/**
 * Moving-average family: length + single colour.
 *
 * The colour is DERIVED from the length, never hand-picked. This is the same
 * law `MA_CFG` in MainChart obeys — hue encodes KIND, and every moving average
 * is the same kind (price remembered at a different depth), so depth is carried
 * by luminance instead. The legend already carries the name.
 *
 * It matters that the derivation lives HERE and not only at the render site.
 * `resolveParams` merges these defaults over stored overrides, so a concrete
 * `color` written here is always defined by the time MainChart evaluates
 * `cp.color ?? movingAverageInk(len)` — the fallback can never fire. A
 * hand-picked default in this table therefore silently outranks the product
 * default forever, which is exactly how the rainbow survived its own removal
 * from `MA_CFG`. Deriving here closes that door: there is no literal left to
 * outrank anything.
 */
function ma(length: number): IndConfig {
  return { fields: [numLen(), colorF()], defaults: { length, color: movingAverageInk(length) } };
}

export const INDICATOR_CONFIG: Record<string, IndConfig> = {
  // ── EMAs ──
  "EMA 8":   ma(8),
  "EMA 9":   ma(9),
  "EMA 13":  ma(13),
  "EMA 21":  ma(21),
  "EMA 34":  ma(34),
  "EMA 50":  ma(50),
  "EMA 89":  ma(89),
  "EMA 144": ma(144),
  "EMA 200": ma(200),
  // ── SMAs ──
  "SMA 9":   ma(9),
  "SMA 20":  ma(20),
  "SMA 50":  ma(50),
  "SMA 100": ma(100),
  "SMA 200": ma(200),
  // ── Other MAs ──
  "WMA":  ma(20),
  "HMA":  ma(20),
  "DEMA": ma(20),
  "TEMA": ma(20),
  "ZLEMA":ma(20),
  // ── Bands / Channels ──
  "Bollinger Bands": {
    fields: [numLen(), { key: "mult", label: "StdDev", type: "number", min: 0.5, max: 5, step: 0.1 }, colorF("Band Color")],
    defaults: { length: 20, mult: 2, color: "#4FA3E0" },
  },
  "Keltner Channel": {
    fields: [numLen(), { key: "mult", label: "Multiplier", type: "number", min: 0.5, max: 5, step: 0.1 }, colorF("Band Color")],
    defaults: { length: 20, mult: 2, color: "#8B5CF6" },
  },
  // ── Oscillators ──
  "RSI": {
    fields: [numLen(), colorF("Line Color")],
    defaults: { length: 14, color: "#8B5CF6" },
  },
  // ── VWAP ──
  "VWAP": {
    fields: [colorF("Line Color")],
    defaults: { color: "#F0B429" },
  },
};

/** Merge stored overrides with defaults for an indicator. */
export function resolveParams(name: string, settings?: IndicatorSettings): IndicatorParams {
  const def = INDICATOR_CONFIG[name]?.defaults ?? {};
  const ovr = settings?.[name] ?? {};
  return { ...def, ...ovr };
}

export function isConfigurable(name: string): boolean {
  return name in INDICATOR_CONFIG;
}

/** True if `name` should render at the given timeframe per its visibility map. */
export function visibleAtTf(params: IndicatorParams | undefined, tf: string): boolean {
  const v = params?.visibility;
  if (!v) return true;
  const g = tfGroupOf(tf);
  return v[g] !== false;
}
