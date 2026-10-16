/**
 * DELTA — ONE TOOL, FIVE VIEWS (Garden 19 finish-line plate 25, Founder 2026-10-15).
 *
 * "The control is called Delta. Same numbers in every view. The trader picks the look in settings."
 * Every view reads the SAME per-bar delta (net aggressive buying − selling for the bar, from the one
 * owner MainChart's NEAR row reads: the held tape where it reaches, the provider's own bar-level
 * bid / ask volume elsewhere), so the five looks can never disagree. Green = net buying, red = net
 * selling, everywhere.
 */

export const DELTA_VIEWS = ["bars", "ribbon", "bubbles", "number", "heat"] as const;
export type DeltaView = (typeof DELTA_VIEWS)[number];
export const DELTA_VIEW_LABEL: Readonly<Record<DeltaView, string>> = {
  bars: "Bars", ribbon: "Ribbon", bubbles: "Bubbles", number: "Number on candle", heat: "Heat strip",
};
export const DELTA_VIEW_KEY = "wm_deltaView";
export const DELTA_VIEW_EVENT = "wm-delta-view";

export function parseDeltaView(raw: unknown): DeltaView {
  return (DELTA_VIEWS as readonly string[]).includes(String(raw)) ? (raw as DeltaView) : "bars";
}

export function readDeltaView(): DeltaView {
  try { return parseDeltaView(typeof window === "undefined" ? null : window.localStorage.getItem(DELTA_VIEW_KEY)); } catch { return "bars"; }
}

export function writeDeltaView(v: DeltaView): void {
  try { window.localStorage.setItem(DELTA_VIEW_KEY, v); } catch { /* private window: the view still changes this session */ }
  try { window.dispatchEvent(new CustomEvent(DELTA_VIEW_EVENT, { detail: v })); } catch { /* no window */ }
}

/** The band's scale: the largest |delta| on camera (never 0). */
export function deltaScale(values: readonly number[]): number {
  let m = 0;
  for (const v of values) if (Number.isFinite(v)) m = Math.max(m, Math.abs(v));
  return m > 0 ? m : 1;
}

/** A signed bar height in px for `d` against `scale`, inside a half-band of `halfPx`. */
export function deltaBarPx(d: number, scale: number, halfPx: number): number {
  if (!Number.isFinite(d) || !(scale > 0)) return 0;
  return Math.max(-halfPx, Math.min(halfPx, (d / scale) * halfPx));
}

/** A bubble radius: area ∝ |delta|, between 2px and `maxR`. */
export function deltaBubbleR(d: number, scale: number, maxR: number): number {
  if (!Number.isFinite(d) || !(scale > 0)) return 0;
  return Math.max(2, Math.sqrt(Math.min(1, Math.abs(d) / scale)) * maxR);
}
