"use client";

import React, { useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useShellModalFocus } from "./useShellModalFocus";
import { getShellModalPortalHost, getServerModalPortalHost, subscribeShellModalPortalHost } from "./shellModalPortalHost";

type ShellModalDrawerProps = {
  id: string;
  titleId: string;
  descriptionId?: string;
  title: string;
  description?: string;
  closeLabel: string;
  width: number;
  onClose: () => void;
  fallbackTriggerRef: React.RefObject<HTMLButtonElement | null>;
  titleIcon?: React.ReactNode;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  /**
   * "veil" (default): the house modal — the page behind is dimmed and blurred.
   * "clear": the page behind stays READABLE (a light dim, no blur). For a
   * drawer whose controls change what is behind it — Chart tools, where every
   * profile, camera and lens switch paints on the market — so the trader
   * watches the change land instead of closing the drawer to find out
   * (Garden 16 §9/§18/§44, found on the glass 2026-09-27). Still modal: a
   * press outside the panel closes it, and focus stays trapped inside.
   */
  backdrop?: "veil" | "clear";
  /**
   * "edge" (default): the full-height drawer at the right edge. "float":
   * Garden 18 §XIII–§XIV on Market Home — an inset, rounded panel at the
   * LEFT, as tall as its content, so the live edge (forming candle, price
   * axis, last price) stays visible beside it. Still modal.
   */
  placement?: "edge" | "float";
  children: React.ReactNode;
};

/** The backdrop each mode paints. One owner, so the two cannot drift. */
export const SHELL_DRAWER_BACKDROP: Readonly<Record<"veil" | "clear", React.CSSProperties>> = {
  veil: { background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" },
  clear: { background: "rgba(0,0,0,0.12)" },
};

export function ShellModalDrawer(props: ShellModalDrawerProps) {
  const portalHost = useSyncExternalStore(subscribeShellModalPortalHost, getShellModalPortalHost, getServerModalPortalHost);

  // Chart/layout stacking contexts can otherwise put even z-200 underneath
  // the shell header and phone navigation. Mount the focus owner only after
  // the client portal exists; SSR and initial hydration both return null.
  // Native fullscreen creates a top layer: body siblings cannot cover it.
  return portalHost ? createPortal(<ShellModalDrawerContent {...props} />, portalHost) : null;
}

function ShellModalDrawerContent({
  id,
  titleId,
  descriptionId,
  title,
  description,
  closeLabel,
  width,
  onClose,
  fallbackTriggerRef,
  titleIcon,
  headerActions,
  footer,
  backdrop = "veil",
  placement = "edge",
  children,
}: ShellModalDrawerProps) {
  const float = placement === "float";
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onKeyDown = useShellModalFocus({
    panelRef,
    initialFocusRef: closeRef,
    fallbackTriggerRef,
    onClose,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={float ? "fixed inset-0 z-[200] flex items-start justify-start" : "fixed inset-0 z-[200] flex items-start justify-end"}
      style={SHELL_DRAWER_BACKDROP[backdrop]}
      data-backdrop={backdrop}
      data-placement={placement}
      onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}
    >
      <motion.div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description && descriptionId ? descriptionId : undefined}
        initial={float ? { opacity: 0, y: -6 } : { x: width }}
        animate={float ? { opacity: 1, y: 0 } : { x: 0 }}
        exit={float ? { opacity: 0, y: -6 } : { x: width }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={float
          ? "relative flex min-w-0 max-w-[100vw] flex-col overflow-hidden rounded-xl border border-wm-border bg-wm-dark shadow-2xl"
          : "relative flex h-full min-w-0 max-w-[100vw] flex-col overflow-hidden border-l border-wm-border bg-wm-dark shadow-2xl"}
        style={float
          ? { width: `min(${width}px, calc(100vw - 24px))`, margin: "112px 0 0 12px", maxHeight: "calc(100vh - 136px)" }
          : { width: `min(${width}px, 100vw)`, paddingBottom: "env(safe-area-inset-bottom)" }}
        onKeyDown={onKeyDown}
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-wm-border px-4 py-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {titleIcon}
              <h2 id={titleId} className="truncate text-sm font-black text-wm-text">{title}</h2>
            </div>
            {description && descriptionId && (
              <p id={descriptionId} className="mt-0.5 text-[10px] text-wm-text-dim">{description}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {headerActions}
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-wm-text-muted transition-colors hover:bg-wm-surface hover:text-wm-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-wm-border bg-wm-dark px-4 py-3">
            {footer}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
