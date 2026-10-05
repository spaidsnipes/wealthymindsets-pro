import { useEffect, useRef } from "react";

/**
 * Escape closes a small popover (garden pass 2026-10-05). The popovers that
 * close on an outside click had no keyboard way out. While `open`, the first
 * unclaimed Escape closes it and is claimed (preventDefault), so a drawer or
 * room underneath does not also close on the same key.
 */
export function useEscapeToClose(open: boolean, close: () => void): void {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      closeRef.current();
    };
    // Capture phase: the popover is the top-most thing, so it hears Escape first.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);
}
