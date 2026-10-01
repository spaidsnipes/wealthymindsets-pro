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

const GOLD = "#C9A55C";

export function InstrumentContextStrip({
  symbol, assetClass, activeTab, onTab, onRoom, onIndicators, indicatorCount, onPanel, openPanel = null, onWatchlist, watchlistOpen = false, onTrade, tradeOpen = false,
}: {
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
  readonly onPanel: (panel: "FUTURES_OPTIONS") => void;
  readonly openPanel?: "FUTURES_OPTIONS" | null;
  /** Garden 18 §XI: the Watchlist door, beside the instrument — not buried in Tools. */
  readonly onWatchlist?: (trigger: HTMLButtonElement) => void;
  readonly watchlistOpen?: boolean;
}) {
  const entries = instrumentContextStrip(assetClass, symbol);
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
      {entries.map(e => {
        const current = (e.kind === "TAB" && e.tab === activeTab) || (e.kind === "PANEL" && e.panel === openPanel);
        const disabled = e.kind === "DISABLED";
        return (
          <button
            key={e.id}
            type="button"
            data-context-entry={e.id}
            aria-current={current ? "page" : undefined}
            aria-disabled={disabled || undefined}
            aria-label={disabled ? `${e.label} — unavailable: ${e.reason}` : e.label}
            title={disabled ? e.reason : undefined}
            onClick={() => {
              if (e.kind === "TAB") onTab(e.tab);
              else if (e.kind === "ROOM") onRoom(e.href);
              else if (e.kind === "PANEL") onPanel(e.panel);
            }}
            style={{
              minHeight: 26, padding: "0 10px", borderRadius: 3, whiteSpace: "nowrap",
              border: `1px solid ${current ? "rgba(201,165,92,.55)" : "transparent"}`,
              background: current ? "rgba(201,165,92,.10)" : "transparent",
              color: disabled ? "rgba(237,230,211,.32)" : current ? GOLD : "rgba(237,230,211,.72)",
              cursor: disabled ? "not-allowed" : "pointer",
              font: "700 10.5px/1 ui-sans-serif, system-ui, sans-serif", letterSpacing: ".1em", textTransform: "uppercase",
            }}
          >
            {e.label}
          </button>
        );
      })}
      <span style={{ flex: 1 }} />
      {onTrade ? (
        <button
          type="button"
          data-testid="context-trade"
          onClick={onTrade}
          aria-pressed={tradeOpen}
          aria-label={`Trade ${symbol}`}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, minHeight: 26, padding: "0 14px", borderRadius: 3, marginRight: 6,
            border: `1px solid ${GOLD}`, background: tradeOpen ? "rgba(201,165,92,.28)" : "rgba(201,165,92,.14)", color: GOLD,
            cursor: "pointer", font: "800 10.5px/1 ui-sans-serif, system-ui, sans-serif", letterSpacing: ".14em", textTransform: "uppercase",
          }}
        >
          Trade
        </button>
      ) : null}
      <Link
        href="/desk"
        data-testid="context-desk"
        aria-label="Desk — several trade screens"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, minHeight: 26, padding: "0 10px", borderRadius: 3, marginRight: 6, textDecoration: "none",
          border: "1px solid rgba(196,165,116,.42)", background: "rgba(196,165,116,.06)", color: "rgba(237,230,211,.85)",
          font: "700 10.5px/1 ui-sans-serif, system-ui, sans-serif", letterSpacing: ".1em", textTransform: "uppercase",
        }}
      >
        <LayoutGrid size={12} aria-hidden />
        Desk
      </Link>
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
            cursor: "pointer", font: "700 10.5px/1 ui-sans-serif, system-ui, sans-serif", letterSpacing: ".1em", textTransform: "uppercase",
          }}
        >
          <ListIcon size={12} aria-hidden />
          Watchlist
        </button>
      ) : null}
      <button
        type="button"
        data-testid="context-indicators"
        onClick={onIndicators}
        aria-label={indicatorCount > 0 ? `Indicators, ${indicatorCount} on` : "Indicators"}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, minHeight: 26, padding: "0 10px", borderRadius: 3,
          border: "1px solid rgba(196,165,116,.42)", background: "rgba(196,165,116,.06)", color: "rgba(237,230,211,.85)",
          cursor: "pointer", font: "700 10.5px/1 ui-sans-serif, system-ui, sans-serif", letterSpacing: ".1em", textTransform: "uppercase",
        }}
      >
        <BarChart2 size={12} aria-hidden />
        Indicators
        {indicatorCount > 0 ? <span style={{ color: GOLD }}>· {indicatorCount}</span> : null}
      </button>
    </nav>
  );
}
