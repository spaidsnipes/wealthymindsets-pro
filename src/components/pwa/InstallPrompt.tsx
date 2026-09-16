"use client";

/**
 * PWA Install Prompt — "Add to Home Screen" / "Install App" banner
 *
 * - Shows automatically on iOS (Safari) and Android/Chrome when the app is installable
 * - Dismissed state persists in localStorage so it doesn't nag
 * - Electron: hidden (already a native app)
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone, Monitor, Zap } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show,            setShow]           = useState(false);
  const [isIOS,           setIsIOS]          = useState(false);
  const [isInstalled,     setIsInstalled]    = useState(false);

  useEffect(() => {
    // Already installed / running in Electron
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window as any).wmElectron?.isElectron
    ) {
      setIsInstalled(true);
      return;
    }

    // Previously dismissed
    if (localStorage.getItem("wm-install-dismissed") === "true") return;

    // iOS detection — Safari shows no beforeinstallprompt
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    if (ios) {
      setIsIOS(true);
      setTimeout(() => setShow(true), 3000);
      return;
    }

    // Chrome/Edge/Android — listen for native prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShow(true), 4000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setShow(false);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("wm-install-dismissed", "true");
  };

  if (isInstalled) return null;

  return (
    <AnimatePresence>
      {show && (
        // Centered by INSETS, never by a transform utility. Framer owns
        // `transform` on a motion element and rewrites it every frame —
        // including `none` at rest — so a `-translate-x-1/2` class here is
        // silently discarded and the card sits at left:50% uncompensated.
        // MEASURED at 375px before this change: left 188, right 531 — 156px of
        // a 343px card (45%) off screen, taking the dismiss button with it.
        // ATMOSPHERE MUST NEVER OUTRUN TRUTH. A spring at stiffness 350 made
        // this card the loudest motion on a screen whose market state is
        // routinely UNKNOWN — a shortcut offer animating harder than the
        // market read. The rise is now a short, flat tween: present, not
        // performed.
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0,  opacity: 1 }}
          exit={{   y: 24, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
          className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] inset-x-4 mx-auto z-[200] max-w-sm"
          role="region"
          aria-live="polite"
          aria-labelledby="wm-install-prompt-title"
          aria-describedby="wm-install-prompt-description"
        >
          {/*
            Sanctuary grammar, not card-museum grammar: ONE brass hairline on
            the left edge, a quiet ground, no full box, no halo. The teal/blue
            accent family this used to wear belongs to no owner in the current
            visual canon — it read as a product ad pasted over the market room.
            (The exact banned hex values are named only in the guard, so that
            naming them here cannot itself trip it.) The ground stays opaque
            because this floats ABOVE the
            chart and a transparent panel over live price is unreadable; that
            is legibility, not decoration.
          */}
          <div
            className="relative overflow-hidden"
            style={{
              background: "#0B0B0D",
              borderLeft: "2px solid rgba(201,165,92,0.55)",
              borderTop: "1px solid rgba(139,106,41,0.30)",
            }}
          >

            <div className="p-4">
              <button
                onClick={handleDismiss}
                aria-label="Dismiss install prompt"
                className="absolute top-2 right-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-wm-text-muted transition-colors hover:bg-wm-surface hover:text-wm-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold"
              >
                <X size={15} aria-hidden="true" />
              </button>

              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="w-12 h-12 flex items-center justify-center shrink-0"
                     style={{ background: "rgba(201,165,92,0.06)", borderLeft: "1px solid rgba(201,165,92,0.35)" }}>
                  {isIOS ? <Smartphone size={22} className="text-wm-gold" aria-hidden="true" /> : <Monitor size={22} className="text-wm-gold" aria-hidden="true" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span id="wm-install-prompt-title" className="pr-8 text-sm font-bold text-wm-text">Install WealthyMindsets Pro</span>
                    <Zap size={11} className="text-wm-gold fill-wm-gold" aria-hidden="true" />
                  </div>
                  <p id="wm-install-prompt-description" className="text-[11px] text-wm-text-muted leading-relaxed">
                    {isIOS
                      ? 'Tap the Share button then "Add to Home Screen" for a quicker shortcut to the same WM Pro web app.'
                      : "Install a WM Pro shortcut for quicker access. Data, alerts, and offline availability still depend on your connection and enabled services."}
                  </p>

                  {isIOS ? (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-wm-text-dim">
                      <span>Tap</span>
                      <span className="px-1.5 py-0.5 rounded bg-wm-surface border border-wm-border text-wm-text">⬆ Share</span>
                      <span>→</span>
                      <span className="px-1.5 py-0.5 rounded bg-wm-surface border border-wm-border text-wm-text">Add to Home Screen</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleInstall}
                      className="mt-2.5 inline-flex min-h-11 items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-wm-black transition-colors hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold"
                      style={{ background: "rgba(201,165,92,0.92)" }}
                    >
                      <Download size={13} aria-hidden="true" />
                      Install WM Pro
                    </button>
                  )}
                </div>
              </div>

              {/* Feature pills */}
              <div className="flex gap-1.5 mt-3 flex-wrap">
                {["Home screen shortcut", "Focused workspace", "Connection-aware", "Same WM Pro"].map(f => (
                  <span
                    key={f}
                    className="text-[9px] px-2 py-0.5 text-wm-text-dim"
                    style={{ borderLeft: "1px solid rgba(139,106,41,0.35)" }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
