import { useEffect, useRef } from "react";

/**
 * Escape closes a small popover (garden pass 2026-10-05). The popovers that
 * close on an outside click had no keyboard way out. While `open`, the first
 * unclaimed Escape closes it and is claimed (preventDefault), so a drawer or
 * room underneath does not also close on the same key.
 *
 * Focus returns to the opener (ATHOS order §5, 2026-10-05): whatever held focus
 * when the popover opened gets it back when it closes — unless the trader has
 * already moved focus somewhere real, or the opener has left the page.
 */
// The last element that held focus. A toggle that unmounts in the same commit
// that opens its popover has already handed focus to <body> by the time the
// effect below runs, so the opener is read from here instead.
let lastFocused: Element | null = null;
let tracking = false;
function trackFocus(): void {
  if (tracking || typeof document === "undefined") return;
  tracking = true;
  document.addEventListener("focusin", e => { lastFocused = e.target as Element | null; }, true);
}

export function useEscapeToClose(open: boolean, close: () => void): void {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => { trackFocus(); }, []);
  useEffect(() => {
    if (!open) return;
    const active = typeof document !== "undefined" ? document.activeElement : null;
    const opener = active && active !== document.body ? active : lastFocused;
    // A toggle that is REPLACED while its popover is open (Inspect's opener
    // unmounts and re-mounts) is found again by its accessible name.
    const openerName = (opener as HTMLElement | null)?.getAttribute?.("aria-label") ?? null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      closeRef.current();
    };
    // Capture phase: the popover is the top-most thing, so it hears Escape first.
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      if (typeof document === "undefined") return;
      const twin = openerName && (opener as HTMLElement | null)?.isConnected === false
        ? document.querySelector(`[aria-label="${CSS.escape(openerName)}"]`)
        : null;
      restoreFocusTo(twin ?? opener, document);
    };
  }, [open]);
}

type Focusable = { isConnected?: boolean; focus?: (o?: { preventScroll?: boolean }) => void };

/**
 * Hand focus back to the opener when focus was lost with the popover (it sits
 * on <body> or on a node no longer in the page). PURE apart from the calls it
 * makes on what it is given. Returns whether it moved focus.
 */
export function restoreFocusTo(
  opener: unknown,
  doc: { activeElement: unknown; body: unknown },
): boolean {
  const o = opener as Focusable | null;
  if (!o || o === doc.body || typeof o.focus !== "function" || o.isConnected === false) return false;
  const now = doc.activeElement as Focusable | null;
  const lost = now == null || now === doc.body || now.isConnected === false;
  if (!lost) return false;
  o.focus({ preventScroll: true });
  return true;
}
