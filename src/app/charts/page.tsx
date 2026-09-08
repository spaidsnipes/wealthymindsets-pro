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
  const { setActiveSymbol } = useActiveSymbol();
  const urlSymbol = searchParams?.get("symbol") ?? null;

  /**
   * A SEED IS NOT A LEASH.
   *
   * This effect used to depend on `activeSymbol` and re-assert the URL value
   * whenever they disagreed. Read that again with a trader in the chair:
   *
   *   1. arrive at /charts?symbol=NQ1!   -> seeded NQ1!   (correct)
   *   2. tap TSLA in the watchlist       -> activeSymbol becomes TSLA
   *   3. effect re-runs (activeSymbol is a dependency), urlSymbol is STILL
   *      NQ1!, so "NQ1!" !== "TSLA" and it wrote NQ1! straight back
   *
   * MEASURED on the running app before this fix, via a localStorage spy on
   * the DESKTOP rail: one row click produced two writes to wm_last_symbol —
   * ["TSLA", then "NQ1!"]. The chart snapped back and nothing said why. The
   * watchlist was decorative for as long as a ?symbol= param sat in the URL,
   * on every surface, at every width.
   *
   * The block comment above always said the URL "only SEEDS" the symbol. The
   * dependency array quietly made it an owner instead — the code contradicted
   * its own documented contract, which is the drift a Sentinel exists to
   * catch. So the seed now fires on a genuinely NEW deep link and never on a
   * user's own selection: `activeSymbol` is deliberately NOT a dependency.
   *
   * Known and accepted: re-clicking a link to the symbol already seeded does
   * not re-seed, because an unchanged URL gives React no signal to distinguish
   * it. That failure direction preserves the trader's current selection, which
   * is the one worth defaulting to.
   */
  const seededUrlSymbol = React.useRef<string | null>(null);

  React.useEffect(() => {
    const raw = urlSymbol?.trim();
    if (!raw) return;
    // Never write an unvalidated URL value into persisted symbol state.
    if (!SYMBOL_PATTERN.test(raw)) return;
    const up = raw.toUpperCase();
    if (seededUrlSymbol.current === up) return;
    seededUrlSymbol.current = up;
    setActiveSymbol(up);
  }, [urlSymbol, setActiveSymbol]);

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
