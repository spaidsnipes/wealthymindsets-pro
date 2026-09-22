"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useLayoutEffect } from "react";
import { resolveDefaultCameraSymbol } from "@/lib/marketData/defaultMarketCamera";

const LAST_SYMBOL_KEY = "wm_last_symbol";
/**
 * NOT a hardcoded string any more. The first-arrival camera is derived from
 * the capability registry so it can only ever land on a market whose tape the
 * same gate as the draw loop (`hasVerifiedAggressorTape`) certifies.
 *
 * Before this, the default was `NQ1!` — and futures have no tape wire in the
 * build at all, so every W invention on the product's front door reported
 * UNMEASURED by construction. See src/lib/marketData/defaultMarketCamera.ts.
 *
 * The trader's own choice still outranks this completely: `wm_last_symbol`
 * first, then `wm_settings.defSym`, and only then this.
 */
const DEFAULT_SYMBOL = resolveDefaultCameraSymbol();

interface SymbolCtx {
  activeSymbol:    string;
  setActiveSymbol: (sym: string) => void;
}

const SymbolContext = createContext<SymbolCtx>({
  activeSymbol:    DEFAULT_SYMBOL,
  setActiveSymbol: () => {},
});

/**
 * Read the persisted last symbol synchronously on the client. Falls back
 * to the wm_settings.defSym if no last symbol has been recorded yet, and
 * finally to DEFAULT_SYMBOL. Never throws — private-mode / disabled
 * storage returns the default.
 */
function readPersistedSymbol(): string {
  if (typeof window === "undefined") return DEFAULT_SYMBOL;
  try {
    const saved = window.localStorage.getItem(LAST_SYMBOL_KEY);
    if (saved) return saved.toUpperCase();
    const settings = JSON.parse(window.localStorage.getItem("wm_settings") || "{}");
    const defSym = settings.defSym as string | undefined;
    if (defSym) return defSym.toUpperCase();
  } catch { /* noop */ }
  return DEFAULT_SYMBOL;
}

// useLayoutEffect on the client, useEffect on the server — Next.js emits a
// warning otherwise. This lets the correction to the persisted symbol land
// SYNCHRONOUSLY after mount, BEFORE any child effect (WebSocket subscribes,
// data fetches, session-store slot creation) commits. Prevents the previous
// "NQ1! flash" race where MainChart wired up against the default symbol,
// created an empty session slot, then switched — leaving a phantom slot.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function SymbolProvider({ children }: { children: React.ReactNode }) {
  const [activeSymbol, setActiveSymbolState] = useState<string>(DEFAULT_SYMBOL);

  useIsomorphicLayoutEffect(() => {
    const restored = readPersistedSymbol();
    if (restored !== activeSymbol) setActiveSymbolState(restored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setActiveSymbol = useCallback((sym: string) => {
    const up = sym.toUpperCase();
    setActiveSymbolState(up);
    try { localStorage.setItem(LAST_SYMBOL_KEY, up); } catch {}
  }, []);

  return (
    <SymbolContext.Provider value={{ activeSymbol, setActiveSymbol }}>
      {children}
    </SymbolContext.Provider>
  );
}

export function useActiveSymbol() {
  return useContext(SymbolContext);
}
