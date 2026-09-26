/**
 * A PRESS ON A CONTROL IS NOT A PRESS ON THE MARKET — Garden 16 §17, found on
 * the glass 2026-09-26 (control walk, /charts TSLA 15m, 1440x900).
 *
 * The chart pane's wrapper selects what is under a click (drawing, bubble, tape
 * dot, Living Profile slice, shelf). Its own chrome — the axis controls
 * (Reset view · Auto scale · % · Log · ◐), the "D" data window, the inspect
 * toggles, the timeframe chip — sits INSIDE that wrapper, so a press on one
 * bubbled up and ALSO selected whatever market object lay beneath it. Pressing
 * "Auto scale" selected a Living Profile slice (attentionSelection
 * NONE → OFF_CAMERA:SLICE) because the axis controls sit over the profile lane.
 *
 * A pointer event that starts on an interactive element belongs to that
 * element. Only presses on the market surface select market objects.
 */
export const CHART_CHROME_SELECTOR =
  'button, a[href], input, select, textarea, label, [role="button"], [role="menu"], [role="menuitem"], [role="dialog"], [role="listbox"], [role="option"], [role="switch"], [role="tab"], [data-chart-chrome]';

export function isChartChromeTarget(target: { closest?: (selector: string) => unknown } | null | undefined): boolean {
  return !!target && typeof target.closest === "function" && target.closest(CHART_CHROME_SELECTOR) != null;
}
