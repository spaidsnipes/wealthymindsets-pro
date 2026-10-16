/**
 * DELTA — ONE TOOL, FIVE VIEWS (Garden 19 finish-line plate 25, Founder 2026-10-15).
 *
 * "The control is called Delta. Same numbers in every view. The trader picks the look in settings."
 * Every view reads the SAME per-bar delta (net aggressive buying − selling for the bar, from the one
 * owner MainChart's NEAR row reads: the held tape where it reaches, the provider's own bar-level
 * bid / ask volume elsewhere), so the five looks can never disagree. Green = net buying, red = net
 * selling, everywhere.
 */

import { proofSceneHoldsWrites } from "./proofScene";

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

/** The view picked while a proof scene holds writes: it changes the glass for this load, never the saved choice. */
let sceneView: DeltaView | null = null;

export function readDeltaView(): DeltaView {
  if (sceneView && proofSceneHoldsWrites()) return sceneView;
  try { return parseDeltaView(typeof window === "undefined" ? null : window.localStorage.getItem(DELTA_VIEW_KEY)); } catch { return "bars"; }
}

export function writeDeltaView(v: DeltaView): void {
  // Proof scenes never write (serving 746945f: picking Ribbon in scene=clean saved it to the trader's device).
  if (proofSceneHoldsWrites()) sceneView = v;
  else { try { window.localStorage.setItem(DELTA_VIEW_KEY, v); } catch { /* private window: the view still changes this session */ } }
  try { window.dispatchEvent(new CustomEvent(DELTA_VIEW_EVENT, { detail: v })); } catch { /* no window */ }
}

/** The band's scale: the largest |delta| on camera (never 0). */
export function deltaScale(values: readonly number[]): number {
  const abs = values.filter(v => Number.isFinite(v)).map(v => Math.abs(v)).sort((a, z) => a - z);
  const m = abs.length ? abs[abs.length - 1] : 0;
  if (!(m > 0)) return 1;
  // ONE OUTLIER DOES NOT FLATTEN THE BAND (Founder 2026-10-16, BTC 5m: one −178 bar left every other bar a
  // hairline — "little shit popped up but I don't see what it is"). With 8+ bars the scale is the 90th percentile
  // ×1.5 (never above the max); a bar beyond it is drawn to the band's edge and capped (deltaBeyondScale).
  if (abs.length < 8) return m;
  const p90 = abs[Math.floor((abs.length - 1) * 0.9)];
  return p90 > 0 ? Math.min(m, p90 * 1.5) : m;
}

/** True when a bar's delta runs past the band's scale (it is drawn to the edge with a cap). */
export function deltaBeyondScale(d: number, scale: number): boolean {
  return Number.isFinite(d) && scale > 0 && Math.abs(d) > scale;
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
