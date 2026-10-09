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
 * it is scrolled to the nearest edge and focused (without a second scroll).
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
    try { el.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch { /* older engines: focus below still lands */ }
    try { el.focus({ preventScroll: true }); } catch { el.focus(); }
  }, [open]);
  return ref;
}
