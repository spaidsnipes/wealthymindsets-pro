"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import MarketHeatmap, { type SymbolCell } from "@/components/scanner/MarketHeatmap";
import Panel from "@/components/ui/Panel";
import { useAuth } from "@/contexts/AuthContext";

/**
 * /scanner/heatmap — the Market Heatmap M16 surface.
 *
 * Additive route (does not touch existing scanner code). Renders the
 * MarketHeatmap over the user's watchlist / sector universe when data
 * exists; renders truthful empty state until the store subscription
 * lands.
 *
 * Symbol click → routes to /charts?symbol=<SYM> (existing chart route).
 * This is the "Market Heatmap → symbol → Command Deck" leg of the
 * Founder's 2026-08-13 loop:
 *
 *   Market Heatmap → symbol → Command Deck → Story → Chart →
 *   Profile/Volume/Order Flow → setup → Decision Memory.
 */

export default function MarketHeatmapPage() {
  const router = useRouter();
  const { user } = useAuth();

  // TODO(post-launch): replace with real watchlist/sector store subscription.
  // Empty array today — MarketHeatmap renders truthful empty state.
  const symbols: readonly SymbolCell[] = React.useMemo(() => [], []);

  if (!user) {
    return (
      <div className="min-h-screen bg-[color:var(--wm-ob-0,#050506)] text-[color:var(--wm-text-1,#ede6d3)] p-6">
        <Panel label="Market Heatmap">
          <p className="text-[13px] text-[color:var(--wm-text-2,#8a8271)]">
            Sign in to view the market heatmap.
          </p>
        </Panel>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--wm-ob-0,#050506)] text-[color:var(--wm-text-1,#ede6d3)]">
      <header className="border-b border-[color:var(--wm-gold-hair,#6d5220)] px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => router.push("/charts")}
          className="flex items-center gap-1.5 text-[11px] tracking-[0.14em] uppercase text-[color:var(--wm-text-2,#8a8271)] hover:text-[color:var(--wm-gold-mark,#c9a55c)] transition-colors"
          aria-label="Back to charts"
        >
          <ArrowLeft size={12} />
          Charts
        </button>
        <div className="text-[10px] tracking-[0.32em] uppercase text-[color:var(--wm-gold-line,#8b6a29)]">
          ◆ Market Heatmap ◆
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-6 space-y-6">
        <MarketHeatmap
          symbols={symbols}
          onSymbolClick={(sym) => router.push(`/charts?symbol=${encodeURIComponent(sym.symbol)}`)}
        />

        <div className="text-[10px] text-[color:var(--wm-text-3,#55503f)] tracking-[0.14em] uppercase pt-4 border-t border-[color:var(--wm-gold-hair,#6d5220)]">
          Market Heatmap → symbol → Command Deck → Story → Chart → Profile/Volume/Order Flow → setup → Decision Memory
        </div>
      </main>
    </div>
  );
}
