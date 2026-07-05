/**
 * Shared color schemes — the SAME named presets are offered on every gear in the
 * app (VP bars, each order-flow tool, each indicator) and in the app-wide Settings
 * candle-theme picker. Each gear applies the scheme ONLY to its own target; the
 * schemes here are just the palette, not global state.
 */
export interface ColorScheme {
  id:    string;
  label: string;
  up:    string; // positive / bull / bid / buy / up side
  dn:    string; // negative / bear / ask / sell / down side
}

export const COLOR_SCHEMES: ColorScheme[] = [
  { id: "green-red",   label: "Green / Red",         up: "#00C076", dn: "#FF4D67" },
  { id: "blue-purple", label: "Royal Blue / Purple", up: "#2563EB", dn: "#6A0DAD" },
  { id: "blue-yellow", label: "Blue / Yellow",       up: "#2563EB", dn: "#F59E0B" },
  { id: "mono",        label: "Monochrome",          up: "#E5E7EB", dn: "#6B7280" },
];
