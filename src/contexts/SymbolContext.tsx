"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

const LAST_SYMBOL_KEY = "wm_last_symbol";

interface SymbolCtx {
  activeSymbol:    string;
  setActiveSymbol: (sym: string) => void;
}

const SymbolContext = createContext<SymbolCtx>({
  activeSymbol:    "NQ1!",
  setActiveSymbol: () => {},
});

export function SymbolProvider({ children }: { children: React.ReactNode }) {
  // Default to NQ1! on first ever visit, but remember the last viewed symbol
  // across reloads so the chart doesn't snap back to NQ every time.
  const [activeSymbol, setActiveSymbolState] = useState("NQ1!");

  // Hydrate from localStorage after mount (avoids SSR hydration mismatch).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAST_SYMBOL_KEY);
      if (saved) {
        if (saved !== activeSymbol) setActiveSymbolState(saved.toUpperCase());
      } else {
        // First ever visit → honor the configured Default Symbol if set
        const settings = JSON.parse(localStorage.getItem("wm_settings") || "{}");
        const defSym = settings.defSym as string | undefined;
        if (defSym) setActiveSymbolState(defSym.toUpperCase());
      }
    } catch {}
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
