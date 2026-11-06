/**
 * THE CHART TOOLS SHEET COMES BACK AFTER A DRAW GESTURE (Garden 19 review,
 * Codex 01a1426c, 2026-10-16: "selecting Fixed Range Profile dismisses Chart
 * Tools" while the ordinary profile toggles keep the panel open).
 *
 * Arming a DRAW gesture (Fixed Range Profile, Bid/Ask Split) must still put
 * the modal sheet down — its full-screen backdrop ate the trader's first
 * press (Garden 16 §17/§18, 2026-09-27). What was missing is the RETURN: the
 * trader picked the tool from the panel, so once the range is placed (or the
 * gesture is cancelled with Escape / re-pick), the panel comes back where it
 * was. One owner, pure, so the dashboard cannot half-implement it.
 *
 *   arm from the sheet       → close the sheet, remember to return
 *   gesture ends at cursor   → reopen the sheet once (commit OR cancel)
 *   another draw tool picked → owe nothing, keep the chart clear
 *   trader reopens it first  → nothing pending
 *   armed from elsewhere     → never reopens a sheet the trader never had open
 */

export const DRAW_GESTURE_TOOLS: ReadonlySet<string> = new Set(["anchored-vp", "delta-vp"]);

export interface SheetReturnState {
  /** The sheet was put down by arming a draw gesture and owes a return. */
  readonly pending: boolean;
}

export const SHEET_RETURN_IDLE: SheetReturnState = { pending: false };

/** The trader armed (or disarmed) a draw gesture from the open sheet. */
export function onArmFromSheet(state: SheetReturnState, arming: boolean): { state: SheetReturnState; closeSheet: boolean } {
  if (!arming) return { state: SHEET_RETURN_IDLE, closeSheet: false };
  return { state: { pending: true }, closeSheet: true };
}

/**
 * The drawing tool changed (any source: commit → "cursor", Escape, the rail).
 * Returns whether the sheet should reopen now.
 */
export function onToolChange(state: SheetReturnState, prevTool: string, nextTool: string): { state: SheetReturnState; reopenSheet: boolean } {
  if (!state.pending) return { state, reopenSheet: false };
  if (DRAW_GESTURE_TOOLS.has(prevTool) && !DRAW_GESTURE_TOOLS.has(nextTool)) {
    // Back to the cursor = the gesture ended (placed, Escape, re-pick): return.
    // Another drawing tool picked from the rail = the trader moved on to draw
    // something else; a sheet over that gesture would eat it again.
    return { state: SHEET_RETURN_IDLE, reopenSheet: nextTool === "cursor" };
  }
  return { state, reopenSheet: false };
}

/** The sheet opened by any other means — nothing is owed any more. */
export function onSheetOpened(state: SheetReturnState): SheetReturnState {
  return state.pending ? SHEET_RETURN_IDLE : state;
}
