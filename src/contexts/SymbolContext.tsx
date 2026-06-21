"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface SymbolCtx {
  activeSymbol:    string;
  setActiveSymbol: (sym: string) => void;
}

const SymbolContext = createContext<SymbolCtx>({
  activeSymbol:    "NQ1!",
  setActiveSymbol: () => {},
});

export function SymbolProvider({ children }: { children: React.ReactNode }) {
  const [activeSymbol, setActiveSymbolState] = useState("NQ1!");

  const setActiveSymbol = useCallback((sym: string) => {
    setActiveSymbolState(sym.toUpperCase());
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
