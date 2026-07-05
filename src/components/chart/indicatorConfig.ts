/**
 * Indicator customization config — shared by MainChart (rendering) and
 * IndicatorSettingsModal (UI). Each configurable indicator declares its
 * editable fields (length / multiplier / colors) and default values.
 */

/** Timeframe groups for per-resolution visibility (TradingView-style). */
export const TF_GROUPS = ["Seconds", "Minutes", "Hours", "Days", "Weeks", "Months"] as const;
export type TfGroup = (typeof TF_GROUPS)[number];

/** Map an app timeframe string (e.g. "5m", "1h", "D") to its visibility group. */
export function tfGroupOf(tf: string): TfGroup {
  const t = (tf || "").trim();
  if (t === "M" || /^(3M|6M|1Y|3Y|5Y)$/i.test(t)) return "Months";
  if (t === "W") return "Weeks";
  if (t === "D") return "Days";
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

// Moving-average family: length + single color
function ma(length: number, color: string): IndConfig {
  return { fields: [numLen(), colorF()], defaults: { length, color } };
}

export const INDICATOR_CONFIG: Record<string, IndConfig> = {
  // ── EMAs ──
  "EMA 8":   ma(8,   "#C084FC"),
  "EMA 9":   ma(9,   "#B070EC"),
  "EMA 13":  ma(13,  "#8B5CF6"),
  "EMA 21":  ma(21,  "#4FA3E0"),
  "EMA 34":  ma(34,  "#60BFFF"),
  "EMA 50":  ma(50,  "#F0B429"),
  "EMA 89":  ma(89,  "#FFA500"),
  "EMA 144": ma(144, "#FF8C00"),
  "EMA 200": ma(200, "#FF4D6A"),
  // ── SMAs ──
  "SMA 9":   ma(9,   "#70EEC0"),
  "SMA 20":  ma(20,  "#00D4AA"),
  "SMA 50":  ma(50,  "#30B0A0"),
  "SMA 100": ma(100, "#20A090"),
  "SMA 200": ma(200, "#00C0D4"),
  // ── Other MAs ──
  "WMA":  ma(20, "#A78BFA"),
  "HMA":  ma(20, "#34D399"),
  "DEMA": ma(20, "#F472B6"),
  "TEMA": ma(20, "#FB7185"),
  "ZLEMA":ma(20, "#A3E635"),
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
