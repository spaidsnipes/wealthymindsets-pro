"use client";

import { useCallback, useEffect, useRef, type KeyboardEvent, type RefObject } from "react";

const FOCUSABLE = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(element =>
    element.getAttribute("aria-hidden") !== "true"
    && element.getClientRects().length > 0
  );
}

export function useShellModalFocus({
  panelRef,
  initialFocusRef,
  fallbackTriggerRef,
  onClose,
}: {
  panelRef: RefObject<HTMLElement | null>;
  initialFocusRef: RefObject<HTMLElement | null>;
  fallbackTriggerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const active = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    openerRef.current = active && active !== document.body && active !== document.documentElement
      ? active
      : fallbackTriggerRef.current;
    const frame = window.requestAnimationFrame(() => initialFocusRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(frame);
      const opener = openerRef.current;
      if (opener?.isConnected) opener.focus();
      else fallbackTriggerRef.current?.focus();
    };
  }, [fallbackTriggerRef, initialFocusRef]);

  return useCallback((event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !panelRef.current) return;

    const focusable = focusableElements(panelRef.current);
    if (focusable.length === 0) {
      event.preventDefault();
      initialFocusRef.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (!panelRef.current.contains(active)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }, [initialFocusRef, onClose, panelRef]);
}
