"use client";

import { useEffect, useRef } from "react";

/**
 * useLandOnOpen — a surface that opens from a menu takes focus and comes into
 * view when it mounts.
 *
 * Sheriff batch 6 (serving 0dd1130, 2026-10-09): Flow & studies, Depth ladder,
 * Replay and Journal P&L stats each opened and left focus on the page body;
 * Journal P&L stats opened below the fold at 390 with nothing scrolling to it.
 * A keyboard or screen-reader user was told nothing had happened.
 *
 * Give the returned ref to the surface's root and `tabIndex={-1}`. When it opens
 * it is scrolled to the nearest edge and focused (without a second scroll), and
 * stays landed while the page settles, until the first input.
 */
export function useLandOnOpen<T extends HTMLElement>(open: boolean = true): React.RefObject<T | null> {
  const ref = useRef<T | null>(null);
  // `open` is for a surface that stays mounted and is switched on by a prop
  // (the replay bar): it lands each time `open` turns true. A surface that is
  // mounted only while open leaves it at the default.
  useEffect(() => {
    if (!open) return;
    const el = ref.current;
    if (!el) return;
    const land = () => {
      try { el.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch { /* older engines: focus below still lands */ }
    };
    land();
    try { el.focus({ preventScroll: true }); } catch { el.focus(); }
    // THE PAGE IS STILL SETTLING WHEN IT OPENS (serving 6e150db, 390 px,
    // 2026-10-09): Journal P&L stats landed once, then the sheet it was opened
    // from closed and its own numbers arrived, and it came to rest 39 px lower
    // — back under the WAIT / WHY plaque — with its scroll margin correct the
    // whole time. So it lands again whenever it or the page changes size, until
    // the person touches anything; after that the page is theirs. No timer:
    // the browser reports the resize, and the first input ends the watch.
    if (typeof ResizeObserver === "undefined") return;
    const settle = new ResizeObserver(land);
    settle.observe(el);
    if (el.ownerDocument?.body) settle.observe(el.ownerDocument.body);
    const view = el.ownerDocument?.defaultView;
    const INPUTS = ["pointerdown", "wheel", "touchstart", "keydown"] as const;
    const release = () => {
      settle.disconnect();
      for (const type of INPUTS) view?.removeEventListener(type, release, true);
    };
    for (const type of INPUTS) view?.addEventListener(type, release, { capture: true, passive: true });
    return release;
  }, [open]);
  return ref;
}
