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
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0,  opacity: 1 }}
          exit={{   y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-1/2 z-[200] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2"
          style={{ filter: "drop-shadow(0 8px 32px rgba(0,212,170,0.25))" }}
          role="region"
          aria-live="polite"
          aria-labelledby="wm-install-prompt-title"
          aria-describedby="wm-install-prompt-description"
        >
          <div className="relative rounded-2xl overflow-hidden border border-wm-border/80"
               style={{ background: "linear-gradient(135deg, #0D1117 0%, #161B22 100%)" }}>

            {/* Gold top accent */}
            <div className="h-0.5 w-full" style={{
              background: "linear-gradient(90deg, #00D4AA, #F0B429, #4FA3E0)"
            }} />

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
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                     style={{ background: "linear-gradient(135deg, #00D4AA20, #4FA3E020)", border: "1px solid rgba(0,212,170,0.3)" }}>
                  {isIOS ? <Smartphone size={22} className="text-wm-green" aria-hidden="true" /> : <Monitor size={22} className="text-wm-green" aria-hidden="true" />}
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
                      className="mt-2.5 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-wm-black transition-all hover:opacity-90 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold"
                      style={{ background: "linear-gradient(135deg, #00D4AA, #4FA3E0)" }}
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
                  <span key={f} className="text-[9px] px-2 py-0.5 rounded-full bg-wm-surface border border-wm-border text-wm-text-dim">
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
