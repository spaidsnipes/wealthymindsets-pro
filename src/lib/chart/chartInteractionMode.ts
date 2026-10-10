/**
 * CHART INTERACTION PRIORITY — the ONE owner of "who gets the pointer".
 *
 * Founder P0 (2026-10-10): "highlighted demand zones, boxes and other chart
 * objects intercept pointer interactions and prevent me from placing a
 * stop-loss at the intended price."
 *
 * ROOT CAUSE (reproduced on serving 542ae83, NQ1! 5m ticket-fixture, 1910px):
 * the armed price pick only took a press whose DOM target sat inside the
 * lightweight-charts host and was not a button. Every analytical object drawn
 * as DOM — the market-object pins (28px + 44px tap slop, z72, standing ON each
 * demand zone / FVG / order-block edge, exactly where a stop goes), the event
 * note anchors, the weather-lens controls, a hovered user-drawn box (the draw
 * canvas flips to pointer-events:all) — fell outside that test. The press went
 * to the object instead: its Passport opened over the ticket, the Stop field
 * stayed empty, and the pick stayed armed. Meanwhile hover cards (bubble tips,
 * paint-loop cards keyed on the crosshair) kept answering under a live handle
 * drag. Nothing ranked the layers; each one simply took what reached it.
 *
 * THE LAW — one ranking, highest first:
 *   1 EXECUTION   an execution control / confirmation is up
 *   2 PLACEMENT   an entry / stop / target pick is armed, or a draft line is being dragged
 *   3 NAVIGATION  pan / zoom that does not conflict with placement
 *   4 OBJECT_EDIT an explicitly selected object (a drawing) is being edited
 *   5 INSPECTION  ordinary click / hover inspection of market objects (the resting mode)
 *   6 DECORATIVE  passive paint — never takes a pointer at all
 *
 * While the mode is EXECUTION or PLACEMENT every analytical / decorative layer
 * is NON-INTERCEPTING: its DOM is pointer-events:none (one CSS rule keyed on the
 * pane's `data-chart-interaction`), its canvas hit-test does not select, its
 * hover card does not open. Leaving placement restores inspection. Nothing an
 * analytical layer does can ever write an order price — only the ticket and
 * the chart's placement path (`deliverChartPricePick` / `deliverChartDraftPrice`)
 * can, and they are tier 2.
 *
 * Claims are keyed, so two owners (the ticket's pick and the chart's drag)
 * cannot release each other's claim.
 */
import { useSyncExternalStore } from "react";

export type ChartInteractionMode = "EXECUTION" | "PLACEMENT" | "NAVIGATION" | "OBJECT_EDIT" | "INSPECTION" | "DECORATIVE";

/** Highest priority first. Rank = index + 1. */
export const CHART_INTERACTION_PRIORITY: readonly ChartInteractionMode[] = [
  "EXECUTION", "PLACEMENT", "NAVIGATION", "OBJECT_EDIT", "INSPECTION", "DECORATIVE",
];
export const interactionRank = (m: ChartInteractionMode): number => CHART_INTERACTION_PRIORITY.indexOf(m) + 1;

/** The mode the chart rests in when nobody holds a claim. */
export const RESTING_MODE: ChartInteractionMode = "INSPECTION";

/** Modes that may be CLAIMED. Navigation is ambient; decorative paint never claims. */
export type ClaimableMode = "EXECUTION" | "PLACEMENT" | "OBJECT_EDIT";

/** The analytical / decorative layers that are gated. Named so a sentinel can find every call site. */
export type AnalyticalLayer =
  | "MARKET_OBJECT_PIN" | "ZONE" | "FVG" | "ORDER_BLOCK" | "PROFILE" | "WALL" | "FOOTPRINT"
  | "MEMORY" | "BUBBLE" | "TAPE" | "ANATOMY" | "WEATHER" | "DRAWING" | "NOTE_ANCHOR" | "HOVER_CARD" | "BAR";

const claims = new Map<string, ClaimableMode>();
const listeners = new Set<() => void>();
let mode: ChartInteractionMode = RESTING_MODE;

function recompute(): void {
  let best: ChartInteractionMode = RESTING_MODE;
  for (const m of claims.values()) if (interactionRank(m) < interactionRank(best)) best = m;
  if (best === mode) return;
  mode = best;
  for (const l of listeners) l();
}

/**
 * Hold a mode until the returned release is called. Re-claiming the same key
 * replaces its mode. The release is idempotent and only ever drops ITS claim.
 */
export function claimChartInteraction(mode_: ClaimableMode, by: string): () => void {
  claims.set(by, mode_);
  recompute();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    if (claims.get(by) === mode_) { claims.delete(by); recompute(); }
  };
}
/** Drop a keyed claim (for owners that do not keep the release function). */
export function releaseChartInteraction(by: string): void {
  if (!claims.delete(by)) return;
  recompute();
}

export function chartInteractionMode(): ChartInteractionMode { return mode; }

/** True while an execution confirmation or a placement owns the pointer. */
export function analyticalLayersInert(m: ChartInteractionMode = mode): boolean {
  return m === "EXECUTION" || m === "PLACEMENT";
}

/**
 * THE GATE every analytical click / hover / select handler calls first.
 * `layer` names the caller (audit + sentinel); the answer depends only on the mode.
 */
export function mayRunAnalyticalHandler(_layer: AnalyticalLayer): boolean {
  return !analyticalLayersInert();
}

/**
 * May a draft line be placed / dragged right now? Not while an execution
 * confirmation is up (tier 1 outranks tier 2): the confirmed price must be the
 * price that is sent.
 */
export function placementAllowed(): boolean {
  for (const m of claims.values()) if (m === "EXECUTION") return false;
  return true;
}

export function subscribeChartInteraction(l: () => void): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
export function useChartInteractionMode(): ChartInteractionMode {
  return useSyncExternalStore(subscribeChartInteraction, chartInteractionMode, () => RESTING_MODE);
}

/** The attribute the chart pane carries; globals.css turns analytical DOM inert from it. */
export const CHART_INTERACTION_ATTR = "data-chart-interaction";
/** Mark on every analytical / decorative DOM layer inside the pane. */
export const ANALYTICAL_LAYER_ATTR = "data-analytical-layer";

/** Test seam. */
export function resetChartInteractionForTest(): void {
  claims.clear();
  mode = RESTING_MODE;
  for (const l of listeners) l();
}
