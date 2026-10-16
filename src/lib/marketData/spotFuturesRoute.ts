/**
 * L14 · A BLANK CHART FAILS — spot forex and metals open their CME future (Garden 19 finish line,
 * Founder 2026-10-15). Serving cb57e0a, plate-35 sweep: XAUUSD, EURUSD and GBPJPY mounted no chart
 * at all ("NO BAR HISTORY") — the live-only order (2026-10-12) removed the delayed spot vendors, and
 * spot FX has no central tape. The order's fix: "auto-route to the CME future (GC1!, 6E1!) with a
 * one-line notice."
 *
 * Only pairs whose future quotes the SAME way are routed (USD per unit): XAU, XAG, EUR, GBP, AUD, NZD
 * against USD. An inverse pair (USDJPY, USDCAD, USDCHF) would chart upside down against its future,
 * and a cross (GBPJPY) has no single future — those stay, and say why with doors to their legs.
 * The future is a DIFFERENT instrument (basis, its own session and volume): the notice says so.
 */

export interface SpotRoute {
  readonly future: string;
  readonly name: string;
}

const ROUTES: Readonly<Record<string, SpotRoute>> = {
  XAUUSD: { future: "GC1!", name: "COMEX gold future" },
  XAGUSD: { future: "SI1!", name: "COMEX silver future" },
  EURUSD: { future: "6E1!", name: "CME euro future" },
  GBPUSD: { future: "6B1!", name: "CME British pound future" },
  AUDUSD: { future: "6A1!", name: "CME Australian dollar future" },
  NZDUSD: { future: "6N1!", name: "CME New Zealand dollar future" },
};

/** The legs a cross or inverse pair can be read through (never synthesised into a fake spot chart). */
const LEG_FUTURE: Readonly<Record<string, string>> = {
  EUR: "6E1!", GBP: "6B1!", JPY: "6J1!", AUD: "6A1!", NZD: "6N1!", CAD: "6C1!", CHF: "6S1!", XAU: "GC1!", XAG: "SI1!",
};

const bare = (s: string) => (s ?? "").trim().toUpperCase().replace(/[^A-Z]/g, "");

export function spotRouteFor(symbol: string): SpotRoute | null {
  const k = bare(symbol);
  return k.length === 6 ? ROUTES[k] ?? null : null;
}

/** For an unrouted spot pair: its two legs' futures (when both trade), else null. */
export function spotLegsFor(symbol: string): readonly string[] | null {
  const k = bare(symbol);
  if (k.length !== 6 || ROUTES[k]) return null;
  const a = k.slice(0, 3), b = k.slice(3);
  if (!(a in LEG_FUTURE) && !(b in LEG_FUTURE)) return null;
  return [a, b].filter(c => c !== "USD" && c in LEG_FUTURE).map(c => LEG_FUTURE[c]);
}

/** "XAUUSD has no live spot source here — showing GC1!, the COMEX gold future (its own price and session)." */
export function spotRouteNotice(from: string, r: SpotRoute): string {
  return `${bare(from)} has no live spot source here — showing ${r.future}, the ${r.name} (its own price and session).`;
}

/* The last route taken, so the chart can say what happened (one line, dismissable). */
let lastRoute: { readonly from: string; readonly to: string; readonly at: number } | null = null;
export const SPOT_ROUTE_EVENT = "wm-spot-route";
export function noteSpotRoute(from: string, to: string): void {
  lastRoute = { from: bare(from), to, at: Date.now() };
  try { window.dispatchEvent(new CustomEvent(SPOT_ROUTE_EVENT)); } catch { /* no window */ }
}
export function lastSpotRoute(): { readonly from: string; readonly to: string; readonly at: number } | null {
  return lastRoute;
}
