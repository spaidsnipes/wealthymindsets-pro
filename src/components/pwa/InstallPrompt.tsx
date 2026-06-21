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
          className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[200] max-w-sm w-full mx-4"
          style={{ filter: "drop-shadow(0 8px 32px rgba(0,212,170,0.25))" }}
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
                className="absolute top-3 right-3 text-wm-text-muted hover:text-wm-text transition-colors"
              >
                <X size={15} />
              </button>

              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                     style={{ background: "linear-gradient(135deg, #00D4AA20, #4FA3E020)", border: "1px solid rgba(0,212,170,0.3)" }}>
                  {isIOS ? <Smartphone size={22} className="text-wm-green" /> : <Monitor size={22} className="text-wm-green" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm font-bold text-wm-text">Install WealthyMindsets Pro</span>
                    <Zap size={11} className="text-wm-gold fill-wm-gold" />
                  </div>
                  <p className="text-[11px] text-wm-text-muted leading-relaxed">
                    {isIOS
                      ? 'Tap the Share button then "Add to Home Screen" for the full native experience.'
                      : "Install for instant access, offline charts, and push alerts — no browser needed."}
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
                      className="mt-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-wm-black transition-all hover:opacity-90 active:scale-95"
                      style={{ background: "linear-gradient(135deg, #00D4AA, #4FA3E0)" }}
                    >
                      <Download size={13} />
                      Install Now — It&apos;s Free
                    </button>
                  )}
                </div>
              </div>

              {/* Feature pills */}
              <div className="flex gap-1.5 mt-3 flex-wrap">
                {["Real-time data", "Push alerts", "Offline charts", "Zero latency"].map(f => (
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
