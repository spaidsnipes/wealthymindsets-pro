"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { ChartsDashboard } from "@/components/chart/ChartsDashboard";
import { useActiveSymbol } from "@/contexts/SymbolContext";

/**
 * Founding Execution Contract §13 open gate — "Scanner → Deck → Chart
 * canonical context continuity".
 *
 * /command-deck already honours `?symbol=` and documents why: external links
 * (/heatmaps cell click, /scanner row action, docs link) must be able to seed
 * a specific market. /charts never implemented the other half, so the chain
 * broke at its last hop:
 *
 *   /charts?symbol=NVDA  → opened TSLA
 *   /charts?sym=AMD      → opened TSLA
 *
 * The dashboard read SymbolContext only, and that context restores from
 * localStorage — so a deep link, a shared chart URL, or any reload always
 * showed whatever symbol the browser last held, silently ignoring the request.
 *
 * SymbolContext stays the single owner (canon §6 NO-DUPLICATION). The URL only
 * SEEDS it, exactly as the deck does — this does not introduce a second symbol
 * source of truth.
 */
const SYMBOL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9.\-!/]{0,14}$/;

function ChartsInner() {
  const searchParams = useSearchParams();
  const { activeSymbol, setActiveSymbol } = useActiveSymbol();
  const urlSymbol = searchParams?.get("symbol") ?? null;

  React.useEffect(() => {
    const raw = urlSymbol?.trim();
    if (!raw) return;
    // Never write an unvalidated URL value into persisted symbol state.
    if (!SYMBOL_PATTERN.test(raw)) return;
    const up = raw.toUpperCase();
    if (up !== activeSymbol) setActiveSymbol(up);
  }, [urlSymbol, activeSymbol, setActiveSymbol]);

  return <ChartsDashboard />;
}

export default function ChartsPage() {
  // useSearchParams must sit inside a Suspense boundary during SSG — same
  // pattern the Command Deck uses.
  return (
    <React.Suspense
      fallback={<div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #050506 0%, #0b0b0d 100%)" }} />}
    >
      <ChartsInner />
    </React.Suspense>
  );
}
