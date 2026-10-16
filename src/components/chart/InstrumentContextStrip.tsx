"use client";

/**
 * THE INSTRUMENT CONTEXT STRIP — Garden 18 §VIII + §IX, on the glass above
 * the market: the current instrument's views (instrumentContextStrip, one
 * owner) and the chart-level INDICATORS control.
 *
 * Indicators opens the SAME picker ChartToolbar owns (one registry, one
 * picker — §X); this strip only asks for it. Disabled entries say why, by
 * title and accessible name, so a guest is never handed a dead button.
 */

import React from "react";
import Link from "next/link";
import { BarChart2, LayoutGrid, List as ListIcon } from "lucide-react";

import type { CategoryTab } from "@/lib/charts/categoryTabsFor";
import type { CanonicalAssetClass } from "@/lib/marketData/canonicalIdentity";
import { instrumentContextStrip } from "@/lib/charts/instrumentContextStrip";
import type { OptionsPanel } from "@/lib/charts/instrumentContextStrip";

const GOLD = "#C9A55C";

export function InstrumentContextStrip({
  symbol, assetClass, activeTab, onTab, onRoom, onIndicators, indicatorCount, onPanel, openPanel = null, onWatchlist, watchlistOpen = false, onTrade, tradeOpen = false, tradeAside = null,
}: {
  /** What stands beside the TRADE door — the chart's position strip. The strip owns its own truth; this bar only places it. */
  readonly tradeAside?: React.ReactNode;
  /** Garden 18 §LXVII: ONE verb. The panel reads what is on the chart. */
  readonly onTrade?: () => void;
  readonly tradeOpen?: boolean;
  readonly symbol: string;
  readonly assetClass: CanonicalAssetClass;
  readonly activeTab: CategoryTab;
  readonly onTab: (tab: CategoryTab) => void;
  readonly onRoom: (href: string) => void;
  readonly onIndicators: () => void;
  readonly indicatorCount: number;
  readonly onPanel: (panel: OptionsPanel) => void;
  readonly openPanel?: OptionsPanel | null;
  /** Garden 18 §XI: the Watchlist door, beside the instrument — not buried in Tools. */
  readonly onWatchlist?: (trigger: HTMLButtonElement) => void;
  readonly watchlistOpen?: boolean;
}) {
  // PLATE 31 (Garden 19 finish line, Founder 2026-10-15; live click-through L11): ONE gold TRADE where
  // "Futures Options" sat. The header reads Overview · TRADE · News / Research · Watchlist · History ·
  // Indicators on every market; the instrument's own doors (Futures Options, Contract, Options,
  // Financials, Derivatives, Market Info) and the Desk move INSIDE the TRADE sheet (InstrumentDoors).
  const all = instrumentContextStrip(assetClass, symbol);
  const overviewEntry = all.filter(e => e.id === "overview");
  const newsEntry = all.filter(e => e.id === "news");
  const entryButton = (e: (typeof all)[number]) => {
    const current = (e.kind === "TAB" && e.tab === activeTab) || (e.kind === "PANEL" && e.panel === openPanel);
    return (
      <button
        key={e.id}
        type="button"
        data-context-entry={e.id}
        aria-current={current ? "page" : undefined}
        aria-label={e.label}
        onClick={() => { if (e.kind === "TAB") onTab(e.tab); else if (e.kind === "ROOM") onRoom(e.href); }}
        style={{
          minHeight: 30, padding: "0 12px", borderRadius: 4, whiteSpace: "nowrap",
          border: `1px solid ${current ? "rgba(201,165,92,.6)" : "transparent"}`,
          background: current ? "rgba(201,165,92,.10)" : "transparent",
          color: current ? GOLD : "#EDE6D3", cursor: "pointer",
          font: "700 13px/1 ui-sans-serif, system-ui, sans-serif", letterSpacing: ".08em", textTransform: "uppercase",
        }}
      >
        {e.label}
      </button>
    );
  };
  void onPanel;
  return (
    <nav
      aria-label={`${symbol} context`}
      data-testid="instrument-context-strip"
      className="wm-instrument-context-strip"
      style={{
        display: "flex", alignItems: "center", gap: 4, minHeight: 30, padding: "0 12px",
        borderBottom: "1px solid rgba(139,106,41,.18)", flexShrink: 0, overflowX: "auto", scrollbarWidth: "none",
      }}
    >
      {overviewEntry.map(entryButton)}
      {onTrade ? (
        <button
          type="button"
          data-testid="context-trade"
          // THE TRADE DOOR IS THE LOUDEST CONTROL ON THE STRIP (Founder order §6,
          // 2026-10-09: "the TRADE control must be prominent… order entry cannot
          // be buried"). Read on serving c9303a7: it was a 75x26 outline with
          // 10.5px gold words on a 14% gold tint — the same weight as Desk and
          // Watchlist beside it. It is now the one FILLED control here: solid
          // brass, dark words, 12px, 30px tall (44 on touch — globals.css). The
          // fill is set in globals.css (.wm-trade-door) so the short-landscape
          // rule that paints the strip's buttons black cannot blank it.
          className="wm-trade-door"
          onClick={onTrade}
          aria-pressed={tradeOpen}
          aria-label={`Trade ${symbol}`}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, minHeight: 30, padding: "0 18px", borderRadius: 4, marginRight: 6,
            border: `1px solid ${GOLD}`, background: GOLD, color: "#14110a",
            cursor: "pointer", font: "800 14px/1 ui-sans-serif, system-ui, sans-serif", letterSpacing: ".14em", textTransform: "uppercase",
          }}
        >
          Trade
        </button>
      ) : null}
      {newsEntry.map(entryButton)}
      {onWatchlist ? (
        <button
          type="button"
          data-testid="context-watchlist"
          onClick={e => onWatchlist(e.currentTarget)}
          aria-pressed={watchlistOpen}
          aria-label="Watchlist"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, minHeight: 26, padding: "0 10px", borderRadius: 3, marginRight: 6,
            border: `1px solid ${watchlistOpen ? "rgba(201,165,92,.75)" : "rgba(196,165,116,.42)"}`,
            background: watchlistOpen ? "rgba(201,165,92,.14)" : "rgba(196,165,116,.06)", color: watchlistOpen ? GOLD : "rgba(237,230,211,.85)",
            cursor: "pointer", font: "700 13px/1 ui-sans-serif, system-ui, sans-serif", letterSpacing: ".08em", textTransform: "uppercase",
          }}
        >
          <ListIcon size={12} aria-hidden />
          Watchlist
        </button>
      ) : null}
      <Link
        href="/journal"
        data-testid="context-history"
        aria-label="History — your fills and the broker ledger"
        style={{
          display: "inline-flex", alignItems: "center", minHeight: 30, padding: "0 12px", borderRadius: 4, marginRight: 6, textDecoration: "none",
          border: "1px solid transparent", color: "#EDE6D3",
          font: "700 13px/1 ui-sans-serif, system-ui, sans-serif", letterSpacing: ".08em", textTransform: "uppercase",
        }}
      >
        History
      </Link>
      <button
        type="button"
        data-testid="context-indicators"
        onClick={onIndicators}
        aria-label={indicatorCount > 0 ? `Indicators, ${indicatorCount} on` : "Indicators"}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, minHeight: 26, padding: "0 10px", borderRadius: 3,
          border: "1px solid rgba(196,165,116,.42)", background: "rgba(196,165,116,.06)", color: "rgba(237,230,211,.85)",
          cursor: "pointer", font: "700 13px/1 ui-sans-serif, system-ui, sans-serif", letterSpacing: ".08em", textTransform: "uppercase",
        }}
      >
        <BarChart2 size={12} aria-hidden />
        Indicators
        {indicatorCount > 0 ? <span style={{ color: GOLD }}>· {indicatorCount}</span> : null}
      </button>
      <span style={{ flex: 1 }} />
      {tradeAside}
    </nav>
  );
}

/**
 * PLATE 31/32: the instrument's own doors, INSIDE the TRADE sheet — "Contract details live inside TRADE
 * for the selected instrument." Same owner (instrumentContextStrip), same handlers the strip used; a
 * door the providers cannot back says why, never a dead button. The Desk (several trade screens) lives
 * here too.
 */
export function InstrumentDoors({ symbol, assetClass, onTab, onPanel }: {
  readonly symbol: string;
  readonly assetClass: CanonicalAssetClass;
  readonly onTab: (tab: CategoryTab) => void;
  readonly onPanel: (panel: OptionsPanel) => void;
}) {
  const doors = instrumentContextStrip(assetClass, symbol).filter(e => e.id !== "overview" && e.id !== "news");
  const pill: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", minHeight: 32, padding: "0 12px", borderRadius: 6, textDecoration: "none",
    border: "1px solid rgba(196,165,116,.45)", background: "rgba(196,165,116,.06)", color: "#EDE6D3", cursor: "pointer",
    font: "600 13px/1 ui-sans-serif, system-ui, sans-serif",
  };
  return (
    <div data-testid="trade-instrument-doors" style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 12px", borderBottom: "1px solid rgba(139,106,41,.25)" }}>
      {doors.map(e => e.kind === "DISABLED"
        ? <span key={e.id} data-context-entry={e.id} title={e.reason} aria-label={`${e.label} — unavailable: ${e.reason}`} style={{ ...pill, cursor: "not-allowed", color: "rgba(237,230,211,.5)" }}>{e.label} · unavailable</span>
        : <button key={e.id} type="button" data-context-entry={e.id} style={pill}
            onClick={() => { if (e.kind === "TAB") onTab(e.tab); else if (e.kind === "PANEL") onPanel(e.panel); }}>{e.label}</button>)}
      <Link href="/desk" data-testid="context-desk" aria-label="Desk — several trade screens" style={pill}><LayoutGrid size={13} aria-hidden style={{ marginRight: 6 }} />Desk</Link>
    </div>
  );
}
