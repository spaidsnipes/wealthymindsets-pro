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
  children: React.ReactNode;
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
  children,
}: ShellModalDrawerProps) {
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
      className="fixed inset-0 z-[200] flex items-start justify-end"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }}
      onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}
    >
      <motion.div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description && descriptionId ? descriptionId : undefined}
        initial={{ x: width }}
        animate={{ x: 0 }}
        exit={{ x: width }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative flex h-full min-w-0 max-w-[100vw] flex-col overflow-hidden border-l border-wm-border bg-wm-dark shadow-2xl"
        style={{ width: `min(${width}px, 100vw)`, paddingBottom: "env(safe-area-inset-bottom)" }}
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
