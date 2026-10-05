"use client";

/**
 * DialogFrame — the house's dialog behaviour for the rooms' own modals
 * (garden pass 2026-10-04, a11y audit: fifteen custom modals had no Escape,
 * no focus trap, no focus return and no dialog role — a keyboard or
 * screen-reader guest could open them and not get out).
 *
 * It is the panel element itself: role="dialog", aria-modal, a name, focus
 * moved in on open and back to the opener on close, Tab kept inside, Escape
 * closes. The behaviour is the shell's own (useShellModalFocus) — one owner,
 * not a second implementation. Layout stays the caller's (className/style).
 */
import React, { useRef } from "react";

import { useShellModalFocus } from "@/components/layout/useShellModalFocus";

export function DialogFrame({ label, onClose, className, style, children, onClick }: {
  /** The dialog's accessible name ("Create post", "Your cart"…). */
  readonly label: string;
  readonly onClose: () => void;
  readonly className?: string;
  readonly style?: React.CSSProperties;
  readonly children: React.ReactNode;
  /** Usually `e => e.stopPropagation()` so a backdrop click handler does not fire. */
  readonly onClick?: React.MouseEventHandler<HTMLDivElement>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const noTrigger = useRef<HTMLElement | null>(null);
  const onKeyDown = useShellModalFocus({ panelRef, initialFocusRef: panelRef, fallbackTriggerRef: noTrigger, onClose });
  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onClick={onClick}
      className={className}
      style={{ outline: "none", ...style }}
    >
      {children}
    </div>
  );
}

/**
 * The same behaviour as props to spread onto an existing panel element
 * (e.g. a framer `motion.div`), so a modal keeps its own element and layout:
 *   const dialog = useDialogFrame("Create post", onClose);
 *   <motion.div {...dialog} className=…>
 */
export function useDialogFrame(label: string, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  const noTrigger = useRef<HTMLElement | null>(null);
  const onKeyDown = useShellModalFocus({ panelRef, initialFocusRef: panelRef, fallbackTriggerRef: noTrigger, onClose });
  return { ref: panelRef, role: "dialog" as const, "aria-modal": true as const, "aria-label": label, tabIndex: -1, onKeyDown };
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Renderless: mount it INSIDE a modal that a big page renders inline, pointing
 * at the panel element. It gives that panel the dialog role and name, moves
 * focus in, keeps Tab inside, closes on Escape and returns focus to whatever
 * opened it — mounting and unmounting with the modal itself.
 */
export function DialogBehaviour({ targetRef, label, onClose }: {
  readonly targetRef: React.RefObject<HTMLElement | null>;
  readonly label: string;
  readonly onClose: () => void;
}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  React.useEffect(() => {
    const panel = targetRef.current;
    if (!panel) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", label);
    if (!panel.hasAttribute("tabindex")) panel.setAttribute("tabindex", "-1");
    panel.style.outline = "none";
    panel.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeRef.current(); return; }
      if (e.key !== "Tab") return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null);
      if (!items.length) { e.preventDefault(); panel.focus(); return; }
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    panel.addEventListener("keydown", onKey);
    return () => {
      panel.removeEventListener("keydown", onKey);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [targetRef, label]);
  return null;
}
