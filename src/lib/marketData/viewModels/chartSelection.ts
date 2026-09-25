/**
 * ONE SELECTION AT A TIME — what the chart has selected, and whether Inspect
 * is open on it.
 *
 * The chart offers four things to select: a market OBJECT (a swing zone or a
 * structure LEVEL, by objectId), a big-trade or delta PRINT (a bubble), a
 * Living Profile SLICE (a clicked price in the lane), and an ANATOMY object
 * (an absorption shelf or an exhaustion mark). Each has its own selected
 * treatment on the glass — zone fill plus callout, LEVEL diamond, slice
 * outline, bubble, shelf or mark halo — and the ONE Inspect ticket reads
 * whichever is selected.
 *
 * An ANATOMY object is measured over the bars in view, so it can grow, stop
 * grading or leave the camera while it stays selected. The glass re-resolves
 * it every frame (`selectAnatomyInspect`) and hands the reading back here
 * (`resolveAnatomy`), so Inspect describes what the window says NOW and keeps
 * the last reading in which it was drawn beside it.
 *
 * Held as three independent states, every select path had to remember to clear
 * the other two, and the ones that forgot left two objects painted as selected
 * while Inspect described the older one (the ticket checks a zone before a
 * print). A union cannot hold two: selecting anything REPLACES the selection,
 * so exactly one object carries its selected treatment in any frame and every
 * other object is back at rest in the same frame.
 *
 * `inspectOpen` lives beside the selection because the two move together:
 * choosing something opens Inspect on it, and closing Inspect lets go of
 * whatever it was describing. A selection that outlives its ticket is a
 * highlight nobody can explain.
 *
 * PURE. DETERMINISTIC. No React, no storage, no clock. Session storage for the
 * remembered object is the caller's IO; the saved id arrives as an input.
 */

import type { SelectedBigTrade } from "@/lib/bigTradeLevels";
import { anatomyReadingDrawn, type AnatomyInspectVM } from "./anatomySelection";

export interface SelectedAnatomy {
  readonly kind: "ANATOMY";
  readonly symbol: string;
  readonly timeframe: string;
  /** The wall Inspect stands on — away from the object, so its candles stay in view. */
  readonly wall: "LEFT" | "RIGHT";
  /** What the window in view says about it now. `reading.id` is the selection's identity. */
  readonly reading: AnatomyInspectVM;
  /** The newest reading in which it was drawn — what Inspect shows once it is not. */
  readonly lastDrawn: AnatomyInspectVM | null;
}

export type ChartSelection =
  | { readonly kind: "OBJECT"; readonly objectId: string }
  | { readonly kind: "PRINT"; readonly print: SelectedBigTrade }
  | { readonly kind: "SLICE"; readonly symbol: string; readonly timeframe: string; readonly price: number }
  | SelectedAnatomy;

export type ChartSelectionKind = ChartSelection["kind"];

export interface ChartSelectionState {
  readonly selection: ChartSelection | null;
  /** Closed on arrival: an Inspect sheet up before the trader asked covers the camera. */
  readonly inspectOpen: boolean;
}

export const CHART_SELECTION_AT_REST: ChartSelectionState = Object.freeze({ selection: null, inspectOpen: false });

export type ChartSelectionAction =
  /** Choose this and nothing else; Inspect opens on it. */
  | { readonly type: "select"; readonly selection: ChartSelection }
  /**
   * A click on an object's own pin on the glass. A different object is
   * selected. The selected object clicked while Inspect is closed (a selection
   * restored after a refresh) is being asked to be READ, so Inspect opens and
   * the selection stays. Clicked while Inspect is open, it is let go and its
   * ticket closes with it, rather than staying open on nothing.
   */
  | { readonly type: "toggleObject"; readonly objectId: string }
  /**
   * The objects were compiled again. A selected object that is no longer
   * compiled is dropped (never guessed at); a print, slice or anatomy object
   * made on another symbol/timeframe describes another chart and is dropped too. Only then may
   * the remembered object for THIS chart come back, and only if it is compiled.
   * Inspect is not opened: a restored selection arrives calm.
   */
  | {
      readonly type: "reconcile";
      readonly symbol: string;
      readonly timeframe: string;
      readonly compiledObjectIds: readonly string[];
      readonly savedObjectId: string | null;
    }
  /**
   * The glass re-resolved the selected anatomy object in this frame's window.
   * Applied only to the selection it describes (same id); Inspect is neither
   * opened nor closed by it — the camera moving is not the trader asking.
   */
  | { readonly type: "resolveAnatomy"; readonly reading: AnatomyInspectVM }
  /** Drop the selection (only of these kinds, when given). Inspect is untouched. */
  | { readonly type: "clear"; readonly kinds?: readonly ChartSelectionKind[] }
  | { readonly type: "openInspect" }
  /** Closing Inspect lets go of every kind. */
  | { readonly type: "closeInspect" };

export function selectChartSelection(
  state: ChartSelectionState,
  action: ChartSelectionAction,
): ChartSelectionState {
  switch (action.type) {
    case "select": {
      const sel = action.selection;
      if (sel.kind !== "ANATOMY") return { selection: sel, inspectOpen: true };
      return {
        selection: { ...sel, lastDrawn: anatomyReadingDrawn(sel.reading) ? sel.reading : sel.lastDrawn },
        inspectOpen: true,
      };
    }

    case "resolveAnatomy": {
      const current = state.selection;
      if (current?.kind !== "ANATOMY" || current.reading.id !== action.reading.id) return state;
      return {
        selection: {
          ...current,
          reading: action.reading,
          lastDrawn: anatomyReadingDrawn(action.reading) ? action.reading : current.lastDrawn,
        },
        inspectOpen: state.inspectOpen,
      };
    }

    case "toggleObject": {
      const current = state.selection;
      if (current?.kind === "OBJECT" && current.objectId === action.objectId) {
        return state.inspectOpen ? CHART_SELECTION_AT_REST : { selection: current, inspectOpen: true };
      }
      return { selection: { kind: "OBJECT", objectId: action.objectId }, inspectOpen: true };
    }

    case "reconcile": {
      const current = state.selection;
      const compiled = (id: string | null): id is string => id != null && action.compiledObjectIds.includes(id);
      if (current?.kind === "OBJECT" && compiled(current.objectId)) return state;
      if (current?.kind === "PRINT"
        && current.print.symbol === action.symbol && current.print.timeframe === action.timeframe) return state;
      if ((current?.kind === "SLICE" || current?.kind === "ANATOMY")
        && current.symbol === action.symbol && current.timeframe === action.timeframe) return state;
      const restored: ChartSelection | null = compiled(action.savedObjectId)
        ? { kind: "OBJECT", objectId: action.savedObjectId }
        : null;
      if (restored === null && current === null) return state;
      return { selection: restored, inspectOpen: state.inspectOpen };
    }

    case "clear": {
      if (state.selection === null) return state;
      if (action.kinds && !action.kinds.includes(state.selection.kind)) return state;
      return { selection: null, inspectOpen: state.inspectOpen };
    }

    case "openInspect":
      return state.inspectOpen ? state : { selection: state.selection, inspectOpen: true };

    case "closeInspect":
      return state.selection === null && !state.inspectOpen ? state : CHART_SELECTION_AT_REST;
  }
}

/** The selected object id, or null when the selection is not an object. */
export function selectedObjectIdOf(state: ChartSelectionState): string | null {
  return state.selection?.kind === "OBJECT" ? state.selection.objectId : null;
}

/** The selected print, or null when the selection is not a print. */
export function selectedPrintOf(state: ChartSelectionState): SelectedBigTrade | null {
  return state.selection?.kind === "PRINT" ? state.selection.print : null;
}

/** The selected slice's click, or null when the selection is not a slice. */
export function selectedSliceOf(
  state: ChartSelectionState,
): { readonly symbol: string; readonly timeframe: string; readonly price: number } | null {
  return state.selection?.kind === "SLICE" ? state.selection : null;
}

/** The selected anatomy object, or null when the selection is not one. */
export function selectedAnatomyOf(state: ChartSelectionState): SelectedAnatomy | null {
  return state.selection?.kind === "ANATOMY" ? state.selection : null;
}

/**
 * Does this action let go of the selected object? The remembered object is
 * forgotten ONLY on such an explicit let-go — a compile that has not produced
 * the object yet drops it from the selection without erasing the memory.
 */
export function releasesObject(state: ChartSelectionState, action: ChartSelectionAction): boolean {
  if (action.type === "reconcile") return false;
  const before = selectedObjectIdOf(state);
  if (before === null) return false;
  return selectedObjectIdOf(selectChartSelection(state, action)) !== before;
}

export default selectChartSelection;
