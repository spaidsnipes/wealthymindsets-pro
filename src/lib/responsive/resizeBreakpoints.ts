"use client";

/**
 * B-701 · RESIZE BREAKPOINTS & TWO ZOOMS — the browser blueprint's own law,
 * given one owner in code.
 *
 * ── THE SHEET, QUOTED BY EFFECT ─────────────────────────────────────────────
 *
 * The B-701 sheet draws a floor plan with two enlarged zooms beside it, and
 * states what each width band is allowed to show:
 *
 *   LARGE   (>= 1200px)      Full floor plan + BOTH enlarged zooms.
 *   MEDIUM  (768 - 1199px)   ONE enlarged zoom displayed. Toggle or scroll to
 *                            view the alternate zoom.
 *   SMALL   (< 768px)        Base plan only. Zooms collapsed.
 *
 * Translated to /charts, which is the room this law lands in first:
 *
 *   base plan  = the CAMERA. The candles. The thing being looked at.
 *   zoom 1     = the DECISION rail (the selected object, enlarged).
 *   zoom 2     = the WATCHLIST (the alternate object, enlarged).
 *
 * The band is therefore not decoration. It is the mechanism that lets C-101's
 * 70%-of-the-floor camera survive width pressure: when the floor narrows, the
 * ZOOMS give way, not the camera.
 *
 * ── THE DEFECT THIS OWNER NAMES ─────────────────────────────────────────────
 *
 * MEASURED in this codebase before this file existed:
 *
 *   `narrowViewport.ts`  NARROW_VIEWPORT_MAX_PX = 1023   — two states
 *   `globals.css:166`    @media (max-width: 1023px)      — SEVEN surfaces
 *                        hidden in one rule
 *
 * Two consequences, both silent:
 *
 *   1. 1024px - 1199px renders the FULL LARGE arrangement — both zooms — in a
 *      band B-701 says may show exactly one. There is no MEDIUM.
 *   2. The <=1023px transition is a CLIFF. Seven surfaces vanish on the same
 *      pixel. B-701 describes a graded collapse: two zooms, then one, then
 *      none.
 *
 * ── WHY 1023 IS NOT CHANGED HERE ────────────────────────────────────────────
 *
 * It is tempting to "fix" the mismatch by moving 1023 to 1200 and calling the
 * two laws one law. They are not one law, and merging them would be a lie:
 *
 *   1023 answers  "is this screen too narrow for the DESKTOP RAILS?" — it
 *                 governs the primary sidebar, the DOM ladder, the music
 *                 player, the draw rail. It is a chrome question.
 *   1200 answers  "how many ZOOMS may be enlarged beside the base plan?" — a
 *                 composition question about the two auxiliary panels.
 *
 * Moving 1023 up to 1200 would strip the primary sidebar and the DOM ladder
 * off a 1100px laptop that has ample room for them. So the numbers stay
 * distinct, and the MEDIUM band is carved as the band BETWEEN them:
 * `min-width: 1024px and max-width: 1199px`, where the rails are present and
 * exactly one zoom is permitted.
 *
 * `resizeBreakpoints.test.ts` locks both numbers against `globals.css`, for
 * the reason `narrowViewport.ts` already writes out at length: the moment one
 * number has two owners, both ways of disagreeing are invisible.
 */

import { useEffect, useState } from "react";

import { NARROW_VIEWPORT_MAX_PX } from "./narrowViewport";

/** B-701: at and above this width, ONE zoom may be enlarged. */
export const B701_MEDIUM_MIN_PX = 768;

/** B-701: at and above this width, BOTH zooms may be enlarged. */
export const B701_LARGE_MIN_PX = 1200;

/** The three bands B-701 draws. There is no fourth. */
export type CanvasBand = "SMALL" | "MEDIUM" | "LARGE";

/**
 * Which band a floor of this width is in.
 *
 * Pure, total, and boundary-exact: 767 is SMALL, 768 is MEDIUM, 1199 is
 * MEDIUM, 1200 is LARGE. A non-finite or negative width is SMALL — the band
 * that shows least is the safe direction for a value we could not read.
 */
export function bandForWidth(width: number): CanvasBand {
  if (!Number.isFinite(width) || width < B701_MEDIUM_MIN_PX) return "SMALL";
  if (width < B701_LARGE_MIN_PX) return "MEDIUM";
  return "LARGE";
}

/**
 * How many zooms the sheet permits beside the base plan in this band. The
 * count is the blueprint's own, restated as a number so a caller cannot
 * disagree with it by accident.
 */
export function zoomsForBand(band: CanvasBand): 0 | 1 | 2 {
  switch (band) {
    case "SMALL":
      return 0; // "Base plan only. Zooms collapsed."
    case "MEDIUM":
      return 1; // "One enlarged zoom displayed."
    case "LARGE":
      return 2; // "Full floor plan + both enlarged zooms."
  }
}

/**
 * The band where exactly ONE zoom is permitted AND the desktop rails are still
 * present — i.e. above the 1023px rail cliff, below the 1200px both-zooms
 * threshold. Composed from both owners so neither can drift alone.
 *
 * Below 1024 the rails are already gone by the older law, and the watchlist
 * with them; this query is the part of MEDIUM that CSS still has to act on.
 */
export const B701_ONE_ZOOM_QUERY =
  `(min-width: ${NARROW_VIEWPORT_MAX_PX + 1}px) and (max-width: ${B701_LARGE_MIN_PX - 1}px)`;

/**
 * The band this browser is in right now.
 *
 * Returns "LARGE" during SSR and the first client render, for the same reason
 * `useNarrowViewport` returns false: the server cannot observe a viewport, and
 * guessing a smaller band would render a collapsed arrangement into the
 * desktop HTML and then tear it down — a visible flash asserting a layout WM
 * had not measured. LARGE is also what the unstyled document already implies.
 */
export function useCanvasBand(): CanvasBand {
  const [band, setBand] = useState<CanvasBand>("LARGE");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setBand(bandForWidth(window.innerWidth));
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  return band;
}
