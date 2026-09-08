"use client";

/**
 * narrowViewport — ONE owner of "this screen is too narrow for the desktop
 * rails", shared by the CSS that hides them and the JS that has to put the
 * capability somewhere else.
 *
 * ── The failure this exists to prevent ───────────────────────────────────────
 *
 * `globals.css` hides `.wm-chart-watchlist` (and the rail that toggles it) at
 * `max-width: 1023px`. That rule is correct and Sentinel-locked: a 200px rail
 * does not belong on a 375px phone. But hiding a surface is not the same as
 * relocating it, and MEASURED on the running app at 375px:
 *
 *   .wm-chart-watchlist       display: none   (still in the DOM)
 *   .wm-chart-primary-rail    display: none   (the toggle that would show it)
 *   4 watchlist controls      all present, all with zero client rects
 *
 * So the trader had no watchlist and no control anywhere on screen capable of
 * asking for one. The Master Index parity law names exactly this:
 *
 *   "If one surface cannot support a capability, the limitation must be
 *    explicit, intentional and canonically owned — not accidental drift."
 *
 * ── Why the number lives here and not in two places ──────────────────────────
 *
 * The moment JS owns a second copy of `1023`, the two can disagree, and both
 * ways of disagreeing are silent:
 *
 *   CSS hides at 1023, JS relocates at 768  -> 768–1023px: hidden by CSS,
 *                                              not drawered by JS. The
 *                                              capability vanishes again, in
 *                                              a band nobody tests.
 *   CSS hides at 1023, JS relocates at 1280 -> 1023–1280px: the rail renders
 *                                              AND the drawer offers it, two
 *                                              live copies of one watchlist,
 *                                              each with its own poll loop.
 *
 * So the breakpoint is exported as a constant, and a Sentinel asserts this
 * file and `globals.css` still say the same number.
 */

import { useEffect, useState } from "react";

/**
 * Must equal the `@media (max-width: ...)` in globals.css that hides the
 * desktop rails. Sentinel-locked — see responsiveShell.test.ts.
 */
export const NARROW_VIEWPORT_MAX_PX = 1023;

export const NARROW_VIEWPORT_QUERY = `(max-width: ${NARROW_VIEWPORT_MAX_PX}px)`;

/**
 * True when the desktop rails are being hidden by CSS right now.
 *
 * Returns FALSE during SSR and the first client render, deliberately. The
 * server cannot observe a viewport, and guessing "narrow" would render the
 * mobile arrangement into the desktop HTML and then tear it down — a visible
 * flash asserting a layout WM had not measured. The first effect pass fixes it
 * within a frame, and until then the desktop arrangement matches what the
 * unstyled document already implies.
 */
export function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(NARROW_VIEWPORT_QUERY);
    const sync = () => setNarrow(mq.matches);
    sync();
    // Safari < 14 has no addEventListener on MediaQueryList.
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", sync);
      return () => mq.removeEventListener("change", sync);
    }
    mq.addListener(sync);
    return () => mq.removeListener(sync);
  }, []);

  return narrow;
}
