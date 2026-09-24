/**
 * SEMANTIC ZOOM — FAR · MID · NEAR, on the same camera.
 *
 * Child: SEMANTIC ZOOM TAG. Parent family: F13 Semantic Zoom / TIME · MTF ·
 * SEMANTIC. Class: CHART LANGUAGE. House surface: /charts canvas chrome.
 * Binding plate: TIME/MTF/SEMANTIC LAW.
 *
 * ── WHAT THIS IS AND ISN'T ───────────────────────────────────────────────────
 *
 * The canon is blunt about this: FAR · MID · NEAR are semantic STATES of the
 * SAME camera, not three chart pages and not a browser zoom.
 *
 *     FAR = regime / envelope / major structure
 *     MID = zones / profiles / active objects
 *     NEAR = tape / candle anatomy / micro response
 *
 * The forbidden opposite is what makes this small: "Do not convert the
 * teaching plate into a permanent 3-column chart. Do not confuse semantic
 * resolution with data/source resolution." So this reading is one word above
 * the same candles, telling the trader which resolution the picture in front
 * of them is at. It never chooses candles. It never sources data. It never
 * routes.
 *
 * ── WHY BAR COUNT AND NOT PRICE SPAN ─────────────────────────────────────────
 *
 * Semantic resolution is a property of what a HUMAN EYE can weigh at once, and
 * a human eye weighing five bars sees anatomy — a human eye weighing five
 * hundred sees regime. Price span across those two windows differs by orders
 * of magnitude and by instrument; bar count is the same denominator on NQ and
 * on BTCUSD, on a 1s chart and on a daily.
 *
 * The thresholds are wide on purpose. A boundary at 30 that flickers to MID at
 * 31 and back to NEAR at 29 teaches a trader to ignore the tag; the readings
 * this house makes flicker the least when their thresholds are the loosest.
 *
 * PURE. DETERMINISTIC. No React, no IO, no clock.
 */

export const SEMANTIC_ZOOM_VERSION = 1;

export type SemanticZoom = "FAR" | "MID" | "NEAR";
export type SemanticZoomState = SemanticZoom | "UNMEASURED";

export interface SemanticZoomVM {
  readonly version: typeof SEMANTIC_ZOOM_VERSION;
  readonly state: SemanticZoomState;
  /** The zoom word, or null when UNMEASURED. */
  readonly tag: SemanticZoom | null;
  /**
   * WHAT THIS RESOLUTION IS FOR, in the canon's own words. Non-null exactly
   * when `tag` is non-null.
   */
  readonly note: string | null;
  /** Why UNMEASURED, if so. Non-null exactly when `tag` is null. */
  readonly reason: string | null;
  /** The count that decided this, for a probe that wants to audit the tag. */
  readonly visibleBarCount: number | null;
}

export interface SemanticZoomInput {
  /**
   * The COUNT OF BARS ACTUALLY IN VIEW. Not `chartBars.length` — the visible
   * logical range on the chart's own time scale, snapped to integers by the
   * caller. Passing the full array here would render every chart FAR
   * regardless of where the trader has zoomed to.
   */
  readonly visibleBarCount?: number | null;
}

/**
 * NEAR ≤ 30 bars — candle anatomy scale.  Under this, individual bars are
 * large enough for a human to weigh their opens, closes and extremes without
 * counting.
 *
 * FAR ≥ 300 bars — regime / envelope scale.  Above this, a single bar is a
 * few pixels wide and the shape a reader is reading is the ENVELOPE, not the
 * bar. Between the two is MID: zones, profiles, active objects.
 *
 * Exported because they are properties of the reading, not preferences.
 */
export const NEAR_MAX = 30;
export const FAR_MIN = 300;

const NOTE: Readonly<Record<SemanticZoom, string>> = {
  FAR: "regime / envelope / major structure",
  MID: "zones / profiles / active objects",
  NEAR: "tape / candle anatomy / micro response",
};

const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

const unmeasured = (reason: string, visibleBarCount: number | null = null): SemanticZoomVM => ({
  version: SEMANTIC_ZOOM_VERSION,
  state: "UNMEASURED",
  tag: null,
  note: null,
  reason,
  visibleBarCount,
});

export function selectSemanticZoom(input: SemanticZoomInput): SemanticZoomVM {
  const raw = input.visibleBarCount;

  // H1 — never looked is not looked and found nothing. `null` and `undefined`
  // mean the caller did not measure the visible range, and rendering a tag on
  // guessed data would be a claim the caller never made.
  if (raw == null) return unmeasured("NO_VISIBLE_RANGE");
  if (!finite(raw)) return unmeasured("VISIBLE_RANGE_NOT_FINITE");

  const n = Math.floor(raw);
  // Zero bars in view is real — the chart is empty. It is not a resolution,
  // and calling it NEAR would say "you are reading candle anatomy" of nothing.
  if (n <= 0) return unmeasured("NO_BARS_IN_VIEW", n);

  const tag: SemanticZoom = n <= NEAR_MAX ? "NEAR" : n >= FAR_MIN ? "FAR" : "MID";
  return {
    version: SEMANTIC_ZOOM_VERSION,
    state: tag,
    tag,
    note: NOTE[tag],
    reason: null,
    visibleBarCount: n,
  };
}

export default selectSemanticZoom;
