"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { Camera, BookOpen, ChevronDown, Plus, Bell, Trash2, Settings, Target, Activity } from "lucide-react";
import { SmartMoneyPanel } from "@/components/smart-money/SmartMoneyPanel";
import { WMLogo } from "@/components/ui/WMLogo";
import WmWordmark from "@/components/brand/WmWordmark";
import { ChartToolbar } from "./ChartToolbar";
import { MainChart } from "./MainChart";
import { WatchlistGrid } from "./WatchlistGrid";
import { IndicatorSettingsModal } from "./IndicatorSettingsModal";
import { AssetClassSwitcher } from "./AssetClassSwitcher";
import { isConfigurable, type IndicatorSettings, type IndicatorParams } from "./indicatorConfig";
import { DOMPanel } from "./DOMPanel";
import { PnLStatsPanel } from "./PnLStatsPanel";
import { BrokerConnectPanel } from "@/components/broker/BrokerConnectPanel";
import { AlpacaTradingPanel } from "@/components/broker/AlpacaTradingPanel";
import { FootprintControls } from "./FootprintControls";
import { SchemePresets } from "./SchemePresets";
import { OptionsChain } from "./OptionsChain";
import { FearGreedWidget } from "./FearGreedWidget";
import { CustomIndicatorBuilder } from "@/components/pine/CustomIndicatorBuilder";
import { PineCommunityLibrary } from "@/components/pine/PineCommunityLibrary";
import { DrawingToolsPanel, DEFAULT_DRAWING_STYLE, type DrawingStyle } from "./DrawingToolsPanel";
import { LeftDrawingSidebar } from "./LeftDrawingSidebar";
import { WMSessionVP } from "./WMSessionVP";
import { WatchlistPanel } from "./WatchlistPanel";
import { AlertsPanel, type PriceAlert } from "./AlertsPanel";
import { ChartSettingsModal, type ChartSettings, DEFAULT_CHART_SETTINGS } from "./ChartSettingsModal";
import { SymbolInfoHeader } from "./SymbolInfoHeader";
import { BarReplayControls, type ReplaySpeed } from "./BarReplayControls";
import { ErrorBoundary, SafePanel } from "@/components/ui/ErrorBoundary";
import { StockInfoPanel } from "./StockInfoPanel";
import { BottomIndexBar } from "./BottomIndexBar";
import LeftSidebar from "./LeftSidebar";
import { useWebSocket } from "@/hooks/useWebSocket";
import { priceSourceBadge } from "@/lib/priceSource";
import { CanonicalFidelityBadge } from "@/components/marketData/CanonicalFidelityBadge";
import { selectPerCapabilityFidelity } from "@/lib/marketData/selectPerCapabilityFidelity";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import { interpretPine } from "@/lib/pine/interpreter";
import type { PineOutput } from "@/lib/pine/types";
import type { OHLCVBar } from "@/lib/pine/types";
import type { DrawingTool } from "./DrawingToolsPanel";
import type { ChartLayout } from "./ChartLayoutManager";
import { normalizeTFId } from "@/lib/timeframes";
import { usePublishChartMarketState } from "@/lib/marketData/chartMarketStatePublisher";
import { canonicalSession, canonicalAssetClass, canonicalMarketStateIdentity } from "@/lib/marketData/canonicalIdentity";
import { categoryTabsFor } from "@/lib/charts/categoryTabsFor";
// Micah + Noah 2026-09-02 — /charts joins the Phase 3 Market Canvas.
// Composes the SAME canonical compiler /command-deck already routes through
// (composeMarketCanvasVM via useMarketCanvasVM), rendering the canvas verdict
// in the wordmark row via CanvasSummaryPill. Real data owners only — no
// fake heatmap, no invented confidence — per Living-Pixel Law.
import { useMarketCanvasVM } from "@/lib/marketData/viewModels/useMarketCanvasVM";
import CanvasSummaryPill from "@/components/experience/CanvasSummaryPill";
import { useAuth } from "@/contexts/AuthContext";
// Founder Visual Canon Asset 10 (Full Operating System Overview): the
// Order Flow Cockpit is the top-most tile in the canonical OS layout.
// Real signal only — routes through selectAggressorFlow.
import { OrderFlowCockpitStrip } from "./OrderFlowCockpitStrip";
// Asset 14 (Market Object Passport) + Asset 16 (Chart Workspace Object
// Passport) canon: passport lineage / owner / birth / touches /
// invalidation must be integrated into the chart workspace.
import MarketObjectPassportPanel from "@/components/experience/MarketObjectPassportPanel";
import { selectMarketObjectPassport } from "@/lib/marketData/viewModels/selectMarketObjectPassport";
import { useCanonicalMarketState } from "@/lib/marketData/useCanonicalMarketState";
// Asset 07 (Evidence Debt / Question Mode) canon: dedicated
// question-mode surface exposing the decisionWhy compilation.
import DecisionWhyPanel from "@/components/experience/DecisionWhyPanel";
import { ShellModalDrawer } from "@/components/layout/ShellModalDrawer";

export type FootprintType = "bid-ask" | "delta" | "volume-profile" | "imbalance" | "aggressive-passive" | "big-trades";

// ── WM VP / Session VP color gear ───────────────────────────────────────────
// Popover that recolors ONLY the Volume-Profile bars + Big-Trades bubbles (their
// own scheme, stored in localStorage wm_vp_up/wm_vp_dn). It no longer touches the
// candle bodies — candle colors live in the app-wide Settings, per the user's
// request that each gear stay scoped to its own target. Offers the shared named
// schemes plus full custom pickers.
function VPColorGear() {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  // Panel uses position:fixed anchored to the button, because the toolbar is an
  // overflow-x-auto scroll container — an absolutely-positioned dropdown would be
  // CLIPPED by that scroll box (the bug where the panel opened but stayed invisible).
  const [coords, setCoords] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setCoords({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
    }
    setOpen(o => !o);
  };
  const [vpUp, setVpUp] = useState("#00C076");
  const [vpDn, setVpDn] = useState("#FF4D67");
  const [poc, setPoc]   = useState("#F0B429");
  const [vah, setVah]   = useState("#2563EB");
  const [val, setVal]   = useState("#8B5CF6");
  const [labelMode, setLabelMode] = useState<"all" | "key">("all");
  useEffect(() => {
    try {
      setVpUp(localStorage.getItem("wm_vp_up") || "#00C076");
      setVpDn(localStorage.getItem("wm_vp_dn") || "#FF4D67");
      setPoc(localStorage.getItem("wm_vp_poc") || "#F0B429");
      setVah(localStorage.getItem("wm_vp_vah") || "#2563EB");
      setVal(localStorage.getItem("wm_vp_val") || "#8B5CF6");
      setLabelMode(localStorage.getItem("wm_vp_labels") === "key" ? "key" : "all");
    } catch {}
  }, [open]);
  const applyLabelMode = (m: "all" | "key") => {
    setLabelMode(m);
    try {
      localStorage.setItem("wm_vp_labels", m);
      window.dispatchEvent(new Event("wm-vp-colors"));
    } catch {}
  };
  const applyVp = (up: string, dn: string) => {
    setVpUp(up); setVpDn(dn);
    try {
      localStorage.setItem("wm_vp_up", up);
      localStorage.setItem("wm_vp_dn", dn);
      window.dispatchEvent(new Event("wm-vp-colors"));
    } catch {}
  };
  const applyLevel = (key: "poc" | "vah" | "val", v: string) => {
    if (key === "poc") setPoc(v); else if (key === "vah") setVah(v); else setVal(v);
    try {
      localStorage.setItem(`wm_vp_${key}`, v);
      window.dispatchEvent(new Event("wm-vp-colors"));
    } catch {}
  };
  const field = (label: string, val: string, set: (v: string) => void) => (
    <label className="flex items-center justify-between gap-2 text-[11px] text-wm-text-dim">
      <span>{label}</span>
      <input type="color" value={val} onChange={e => set(e.target.value)}
        className="w-7 h-6 rounded cursor-pointer bg-transparent border border-wm-border" />
    </label>
  );
  return (
    <div className="shrink-0">
      <button
        ref={btnRef}
        onClick={toggle}
        title="Volume Profile & candle colors"
        className="flex items-center justify-center w-5 h-5 rounded border transition-all"
        style={{
          background: open ? "rgba(0,192,118,0.15)" : "#131520",
          borderColor: open ? "rgba(0,192,118,0.5)" : "#1E2030",
          color: open ? "#00C076" : "#8B8FA8",
        }}
      >
        <Settings size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[59]" onClick={() => setOpen(false)} />
          <div
            style={{ position: "fixed", top: coords.top, right: coords.right }}
            className="z-[60] w-56 rounded-lg border border-wm-border bg-wm-surface p-3 shadow-2xl flex flex-col gap-3">
            <div className="text-[11px] font-bold text-wm-text">Volume Profile bars</div>
            <div className="text-[10px] text-wm-text-dim -mt-1">Colors only the VP bars — candle colors live in Settings.</div>
            <SchemePresets onApply={(up, dn) => applyVp(up, dn)} />
            <div className="h-px bg-wm-border" />
            {field("Up / Ask", vpUp, v => applyVp(v, vpDn))}
            {field("Down / Bid", vpDn, v => applyVp(vpUp, v))}
            <div className="h-px bg-wm-border" />
            <div className="text-[11px] font-bold text-wm-text">Bar numbers</div>
            <div className="flex gap-1">
              {(["all", "key"] as const).map(m => (
                <button key={m} onClick={() => applyLabelMode(m)}
                  className="flex-1 px-2 py-1 rounded text-[10px] font-semibold border transition-all"
                  style={{
                    background: labelMode === m ? "rgba(0,192,118,0.15)" : "#131520",
                    borderColor: labelMode === m ? "rgba(0,192,118,0.5)" : "#1E2030",
                    color: labelMode === m ? "#00C076" : "#8B8FA8",
                  }}>
                  {m === "all" ? "Every bar" : "Key levels"}
                </button>
              ))}
            </div>
            <div className="h-px bg-wm-border" />
            <div className="text-[11px] font-bold text-wm-text">Value-area levels</div>
            <div className="text-[10px] text-wm-text-dim -mt-1">POC line, VAH box & VAL box colors.</div>
            {field("POC (Point of Control)", poc, v => applyLevel("poc", v))}
            {field("VAH box (Value Area High)", vah, v => applyLevel("vah", v))}
            {field("VAL box (Value Area Low)", val, v => applyLevel("val", v))}
            <button onClick={() => { applyVp("#00C076", "#FF4D67"); applyLevel("poc", "#F0B429"); applyLevel("vah", "#2563EB"); applyLevel("val", "#8B5CF6"); }}
              className="mt-1 px-2 py-1 rounded text-[10px] font-semibold border border-wm-border text-wm-text-dim hover:text-wm-text">
              Reset all VP colors
            </button>
          </div>
        </>
      )}
    </div>
  );
}

interface Strategy {
  id:         string;
  name:       string;
  indicators: string[];
  alerts:     string[];
  color:      string;
}

const DEFAULT_STRATEGIES: Strategy[] = [
  { id: "ms54", name: "MS54 Strat", color: "#F0B429",
    indicators: ["VWAP", "EMA 21", "EMA 50", "RSI", "Volume"],
    alerts: ["Break above VWAP", "EMA 21 cross EMA 50", "RSI > 70"] },
  { id: "ict", name: "ICT Concepts", color: "#8B5CF6",
    indicators: ["VWAP", "Bollinger Bands", "Pivot Points Standard", "Volume"],
    alerts: ["Price at POI", "Liquidity grab"] },
  { id: "orderflow", name: "Order Flow Setup", color: "#00D4AA",
    indicators: ["VWAP", "Volume", "Delta Divergence", "CVD"],
    alerts: ["Large delta spike", "Absorption detected"] },
];
export type CandleType =
  | "candles" | "heikin-ashi" | "hollow" | "line" | "area"
  | "bars" | "hlc-bars" | "baseline" | "columns"
  | "volume-candles" | "vp-candles" | "orderflow-candles"
  | "renko" | "range-bars";

export function ChartsDashboard() {
  const { activeSymbol, setActiveSymbol } = useActiveSymbol();

  // ── Persist helpers ─────────────────────────────────────────
  function lsGet<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  }
  function lsSet(key: string, val: unknown) {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }

  // ── Core state ──────────────────────────────────────────────
  const [pnlOpen,         setPnlOpen]         = useState(false);
  const [brokerOpen,      setBrokerOpen]      = useState(false);
  const brokerTriggerRef = useRef<HTMLButtonElement>(null);
  const [tradeOpen,       setTradeOpen]       = useState(false);
  const [optionsOpen,     setOptionsOpen]     = useState(false);
  const [pineBuilderOpen, setPineBuilderOpen] = useState(false);
  const [footprintType,   setFootprintType]   = useState<FootprintType>(() => lsGet("wm_footprint", "bid-ask") as FootprintType);
  const [footprintEnabled, setFootprintEnabled] = useState<boolean>(() => lsGet("wm_fp_enabled", true) as boolean);
  // Big Trades "Simultaneous Mode": when ON, Big Trades bubbles overlay on top of
  // the active order-flow tool instead of replacing it. `bigTradesOverlay` tracks
  // whether the overlay is currently toggled on (only meaningful while simul ON).
  const [bigTradesSimul,   setBigTradesSimul]   = useState<boolean>(
    () => typeof window !== "undefined" && localStorage.getItem("wm_bigtrades_simul") === "1"
  );
  const [bigTradesOverlay, setBigTradesOverlay] = useState<boolean>(false);
  const [candleType,      setCandleType]      = useState<CandleType>(() => lsGet("wm_candleType", "candles") as CandleType);
  const symbol    = activeSymbol;
  const setSymbol = setActiveSymbol;
  // ── App settings (from Settings panel) ──────────────────────
  function readAppSettings(): Record<string, unknown> {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("wm_settings") || "{}"); } catch { return {}; }
  }
  const [appSettings, setAppSettings] = useState<Record<string, unknown>>(() => readAppSettings());
  useEffect(() => {
    const h = () => setAppSettings(readAppSettings());
    window.addEventListener("wm-settings-changed", h);
    return () => window.removeEventListener("wm-settings-changed", h);
  }, []);

  const [timeframe,       setTimeframe]       = useState<string>(() => {
    const settings = (() => { try { return JSON.parse(localStorage.getItem("wm_settings") || "{}"); } catch { return {}; } })();
    const defTF = settings.defaultTF as string | undefined;
    let stored = lsGet("wm_timeframe", "5m") as string;
    // Honor a configured Default Timeframe (unless "last"=use last used, "none"=ignore)
    if (defTF && defTF !== "last" && defTF !== "none") stored = defTF;
    // Reject all sub-minute timeframes — they have no data outside market hours
    const subMinute = ["1t","5t","30t","1s","2s","3s","5s","10s","15s","30s"];
    if (subMinute.includes(stored)) return "5m";
    return normalizeTFId(stored) ?? "5m";
  });
  const [pineOutput,      setPineOutput]      = useState<PineOutput | null>(null);
  const [pineCode,        setPineCode]        = useState<string>("");
  const [chartBars,       setChartBars]       = useState<OHLCVBar[]>([]);
  const [communityOpen,   setCommunityOpen]   = useState(false);
  const [activeTab,       setActiveTab]       = useState("Chart");
  // Founder 2026-09-02: category tabs are filtered per asset class,
  // so switching from an equity (Financials selected) to crypto/futures
  // would strand the user on a tab that no longer exists in the strip.
  // Snap back to Chart whenever the current tab is not valid for the
  // new asset class. Pure state reset — no data fetches triggered.
  useEffect(() => {
    const allowed = categoryTabsFor(canonicalAssetClass(symbol));
    if (!allowed.includes(activeTab as (typeof allowed)[number])) {
      setActiveTab("Chart");
    }
  }, [symbol, activeTab]);
  const [infoOpen,        setInfoOpen]        = useState(false); // collapsible right panel
  const [vpDomOpen,       setVpDomOpen]       = useState(false); // Open only when the trader asks for depth

  // ── Drawing tools ───────────────────────────────────────────
  const [drawingTool,     setDrawingTool]     = useState<DrawingTool>("cursor");
  const [drawingStyle,    setDrawingStyle]    = useState<DrawingStyle>(DEFAULT_DRAWING_STYLE);
  const patchDrawingStyle = useCallback((patch: Partial<DrawingStyle>) => {
    setDrawingStyle(prev => ({ ...prev, ...patch }));
  }, []);
  const [magnetActive,    setMagnetActive]    = useState(false);
  const [lockActive,      setLockActive]      = useState(false);
  const [drawingsVisible, setDrawingsVisible] = useState(true);
  const [clearTrigger,    setClearTrigger]    = useState(0);

  // ── Indicators / session ────────────────────────────────────
  const [activeInds, setActiveInds] = useState<Set<string>>(() => new Set<string>(lsGet<string[]>("wm_activeInds", [])));
  const [indSettings, setIndSettings] = useState<IndicatorSettings>(() => lsGet<IndicatorSettings>("wm_indSettings", {}));
  const [indSettingsFor, setIndSettingsFor] = useState<string | null>(null); // which indicator's settings modal is open
  // Default to Extended Hours so intraday equity candle COUNT matches Moomoo /
  // Webull (which show pre-market + after-hours bars by default). RTH-only mode
  // strips those bars, which is what made TSLA look like it was "missing" the
  // last few hourly candles vs. those platforms.
  const [extHours,   setExtHours]   = useState<boolean>(() => lsGet("wm_extHours", true) as boolean);
  const [sessionVPOpen, setSessionVPOpen] = useState(false);
  // Show open paper-trade positions as horizontal entry lines w/ live P&L on the chart.
  const [paperTradesOn, setPaperTradesOn] = useState(true);
  // Smart Money read-out panel (real order-flow signals; honest N/A for feeds we lack).
  const [smartMoneyOpen, setSmartMoneyOpen] = useState(false);

  // ── WM VP indicators (draw ON chart canvas) ─────────────────
  const [fixedVPActive,   setFixedVPActive]   = useState<boolean>(() => lsGet("wm_fixedVP", false) as boolean);
  const [sessionVPChart,  setSessionVPChart]  = useState<boolean>(() => lsGet("wm_sessionVP", false) as boolean);

  // ── NEW: Watchlist ──────────────────────────────────────────
  // Keep price action as the dominant canvas. The watchlist remains one click
  // away and remembers the trader's choice, but it no longer consumes chart
  // width before the trader asks for it.
  const [watchlistOpen, setWatchlistOpen] = useState<boolean>(() =>
    lsGet("wm_chart_watchlist_open", false) as boolean
  );
  // Moomoo-style grid view (mini-chart cards) vs single chart
  const [gridView, setGridView] = useState(false);
  const [gridRefresh, setGridRefresh] = useState(0);

  // ── NEW: Alerts ─────────────────────────────────────────────
  const [alertsOpen,   setAlertsOpen]   = useState(false);
  const [allAlerts,    setAllAlerts]    = useState<PriceAlert[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);

  useEffect(() => {
    try { localStorage.setItem("wm_chart_watchlist_open", JSON.stringify(watchlistOpen)); } catch {}
  }, [watchlistOpen]);

  // ── Strategies ──────────────────────────────────────────────
  const [strategiesOpen,   setStrategiesOpen]   = useState(false);
  const [activeStrategy,   setActiveStrategy]   = useState<string | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>(DEFAULT_STRATEGIES);
  const [editingStrategy, setEditingStrategy] = useState<string | null>(null);
  const stratRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (stratRef.current && !stratRef.current.contains(e.target as Node)) setStrategiesOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleAlertsChange = useCallback((alerts: PriceAlert[]) => {
    setAllAlerts(alerts);
  }, []);

  const createAlertAtPrice = useCallback((price: number) => {
    if (!price || !Number.isFinite(price)) return;
    const ref = currentPrice > 0 ? currentPrice : price;
    const type: PriceAlert["type"] = price >= ref ? "above" : "below";
    const alert: PriceAlert = {
      id: `alert-${Date.now()}`,
      symbol,
      price,
      type,
      triggered: false,
      createdAt: Date.now(),
    };
    setAllAlerts(prev => {
      const next = [...prev, alert];
      try { localStorage.setItem("wm_price_alerts", JSON.stringify(next)); } catch {}
      return next;
    });
  }, [symbol, currentPrice]);

  // Only draw alert lines for the CURRENT symbol — otherwise an alert on another
  // symbol (e.g. a 1100-level futures alert) leaks onto every chart and, being a
  // line on the price scale, drags the scale out and crushes the candles.
  const alertLevels = React.useMemo(
    () => allAlerts.filter(a => !a.triggered && a.symbol?.toUpperCase() === symbol.toUpperCase()).map(a => a.price),
    [allAlerts, symbol],
  );

  // ── NEW: Chart settings ─────────────────────────────────────
  const [settingsOpen,   setSettingsOpen]   = useState(false);
  const [chartSettings,  setChartSettings]  = useState<ChartSettings>(
    () => ({ ...DEFAULT_CHART_SETTINGS, ...lsGet<Partial<ChartSettings>>("wm_chartSettings", {}) }),
  );
  // Persist chart settings (candle colors, grid, etc.) so a refresh keeps them.
  useEffect(() => { lsSet("wm_chartSettings", chartSettings); }, [chartSettings]);

  // ── WM Neon vs Original layout theme ────────────────────────
  // HYDRATION-SAFE: must start as the SSR default ("original") so the first
  // client render matches the server HTML. Reading wm_theme in the initializer
  // made the root <div> render className="wm-neon" + a scan child on the client
  // while the server rendered the plain layout → React #418 hydration mismatch.
  // We load the stored theme in an after-mount effect instead.
  const [theme, setTheme] = useState<"original" | "neon">("original");
  const [themeHydrated, setThemeHydrated] = useState(false);
  useEffect(() => {
    const stored = lsGet("wm_theme", "original") as "original" | "neon";
    if (stored !== "original") setTheme(stored);
    setThemeHydrated(true);
  }, []);
  // Persist only after the stored theme has loaded, so the pre-hydration default
  // can't overwrite the saved value before the load effect runs.
  useEffect(() => { if (themeHydrated) lsSet("wm_theme", theme); }, [theme, themeHydrated]);
  // Chart Theme (from Settings panel) → candle color scheme override
  const chartThemeColors = (() => {
    switch (appSettings.chartTheme as string) {
      case "blue-orange":
        return {
          candleUp: "#2563EB", candleDown: "#F59E0B",
          borderUp: "#3B82F6", borderDown: "#FBBF24",
          wickUp:   "#60A5FA", wickDown:   "#FCD34D",
        };
      case "blue-purple":
        return {
          candleUp: "#2563EB", candleDown: "#6A0DAD",
          borderUp: "#3B82F6", borderDown: "#8B2FC9",
          wickUp:   "#60A5FA", wickDown:   "#A855F7",
        };
      case "mono":
        return {
          candleUp: "#E5E7EB", candleDown: "#6B7280",
          borderUp: "#F3F4F6", borderDown: "#9CA3AF",
          wickUp:   "#D1D5DB", wickDown:   "#9CA3AF",
        };
      default: return null; // green-red = use chartSettings defaults
    }
  })();

  // When Neon is active, override the canvas chart colors (candles stay red/green)
  const effChartSettings: ChartSettings = theme === "neon"
    ? {
        ...chartSettings,
        background: "#02060A",
        gridColor: "rgba(47,243,255,0.07)",
        crosshairColor: "#2ff3ff",
        neon: true,
        // Neon green/red candles (keeps the green/red scheme, electric tone)
        candleUp:  "#00FFA3", candleDown: "#FF2E63",
        borderUp:  "#39FFB0", borderDown: "#FF4D7A",
        wickUp:    "#00FFC6", wickDown:   "#FF6B8A",
      }
    : chartThemeColors
      ? { ...chartSettings, ...chartThemeColors }
      : chartSettings;

  // ── NEW: Layout ─────────────────────────────────────────────
  const [chartLayout, setChartLayout] = useState<ChartLayout>(() => lsGet("wm_chartLayout", "1") as ChartLayout);

  // ── Persist key state to localStorage ───────────────────────
  useEffect(() => { lsSet("wm_activeInds",   [...activeInds]); },  [activeInds]);
  useEffect(() => { lsSet("wm_indSettings",  indSettings); },      [indSettings]);
  useEffect(() => { lsSet("wm_footprint",    footprintType); },    [footprintType]);
  useEffect(() => { lsSet("wm_fp_enabled", footprintEnabled); }, [footprintEnabled]);
  // Sync Big Trades Simultaneous Mode when toggled from the gear popover.
  useEffect(() => {
    const onSimul = (e: Event) => {
      const on = !!(e as CustomEvent).detail?.on;
      setBigTradesSimul(on);
      // Leaving simul mode clears the standalone overlay so state stays coherent.
      if (!on) setBigTradesOverlay(false);
    };
    window.addEventListener("wm-bigtrades-simul", onSimul);
    return () => window.removeEventListener("wm-bigtrades-simul", onSimul);
  }, []);
  useEffect(() => { lsSet("wm_candleType",   candleType); },       [candleType]);
  useEffect(() => { lsSet("wm_timeframe",    timeframe); },        [timeframe]);
  useEffect(() => { lsSet("wm_chartLayout",  chartLayout); },      [chartLayout]);
  useEffect(() => { lsSet("wm_extHours",     extHours); },         [extHours]);
  useEffect(() => { lsSet("wm_fixedVP",      fixedVPActive); },    [fixedVPActive]);
  useEffect(() => { lsSet("wm_sessionVP",    sessionVPChart); },   [sessionVPChart]);

  // ── NEW: Bar replay ─────────────────────────────────────────
  const [replayActive,   setReplayActive]   = useState(false);
  const [replayPlaying,  setReplayPlaying]  = useState(false);
  const [replaySpeed,    setReplaySpeed]    = useState<ReplaySpeed>(1);
  const [replayIdx,      setReplayIdx]      = useState(0);
  const replayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startReplay = useCallback(() => {
    setReplayActive(true);
    setReplayIdx(0);
    setReplayPlaying(false);
  }, []);

  const stopReplay = useCallback(() => {
    setReplayActive(false);
    setReplayPlaying(false);
    if (replayRef.current) clearInterval(replayRef.current);
  }, []);

  const toggleReplayPlay = useCallback(() => {
    setReplayPlaying(p => !p);
  }, []);

  // Replay interval
  useEffect(() => {
    if (!replayActive || !replayPlaying) {
      if (replayRef.current) clearInterval(replayRef.current);
      return;
    }
    const ms = Math.round(500 / replaySpeed);
    replayRef.current = setInterval(() => {
      setReplayIdx(i => {
        if (i >= chartBars.length - 1) {
          setReplayPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, ms);
    return () => { if (replayRef.current) clearInterval(replayRef.current); };
  }, [replayActive, replayPlaying, replaySpeed, chartBars.length]);

  // ── Compare symbol ──────────────────────────────────────────
  const [compareOpen,        setCompareOpen]        = useState(false);
  const [compareSymbol,      setCompareSymbol]      = useState("");
  const [compareInput,       setCompareInput]       = useState("");
  const [compareResults,     setCompareResults]     = useState<{sym:string;name:string}[]>([]);
  const [compareSearching,   setCompareSearching]   = useState(false);

  useEffect(() => {
    if (!compareInput || compareInput.length < 1) { setCompareResults([]); return; }
    const q = compareInput.trim().toUpperCase();
    const timer = setTimeout(async () => {
      setCompareSearching(true);
      try {
        const r = await fetch(`/api/finnhub?q=${encodeURIComponent(q)}&type=search`).then(res => res.json());
        const list: {sym:string;name:string}[] = (r?.results ?? []).slice(0, 8).map((x: any) => ({
          sym:  x.sym ?? x.symbol ?? "",
          name: x.name ?? x.description ?? "",
        })).filter((x: any) => x.sym);
        setCompareResults(list);
      } catch { setCompareResults([]); }
      finally { setCompareSearching(false); }
    }, 220);
    return () => clearTimeout(timer);
  }, [compareInput]);

  // ── Day high/low tracking ───────────────────────────────────
  const [dayHigh, setDayHigh] = useState(0);
  const [dayLow,  setDayLow]  = useState(0);

  // ── Snapshot ────────────────────────────────────────────────
  const [snapping, setSnapping] = useState(false);
  const chartWrapRef = useRef<HTMLDivElement>(null);

  // ── Fullscreen — covers toolbar + chart area ─────────────────
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const handleRequestFullscreen = useCallback(() => {
    if (fullscreenRef.current) {
      fullscreenRef.current.requestFullscreen().catch(() => {});
    }
  }, []);

  const { ticker, recentTicks, source, connected } = useWebSocket({ symbol, timeframe });
  usePublishChartMarketState({
    symbol,
    timeframe,
    // Route through the canonical helper so the session enum comes from a
    // single deterministic source shared with every reader (see b46fa64).
    session: canonicalSession(extHours),
    ticker,
    recentTicks,
    source,
    connected,
  });

  // Micah + Noah 2026-09-02 — /charts joins Phase 3 Market Canvas as a
  // reader. Same canonicalIdentity the publisher writes → same compiler
  // the deck consumes. Zero duplicate pipeline, zero divergent verdict.
  // Living-Pixel Law satisfied: every field the pill renders derives
  // from a real canonical source (composeMarketCanvasVM); silent when
  // evidence is not yet enough (§Silence Is A Feature).
  const { user: canvasUser } = useAuth();
  const canvasIdentity = React.useMemo(
    () => canonicalMarketStateIdentity({ symbol, timeframe, extHours }),
    [symbol, timeframe, extHours],
  );
  const chartCanvasVM = useMarketCanvasVM({
    identity: canvasIdentity,
    ownerId: canvasUser?.id ?? null,
  });
  const chartMarketCanvas = chartCanvasVM.canvas;
  // Asset 10 canon — Right of Way / Decision Permission chip. Reads
  // the SAME permission compilation the deck consumes so the trader
  // sees identical verdict on /charts (no divergent rule state). The
  // permission VM already flows through composeMarketCanvasVM; we
  // just surface its verdict + headline as a compact chip.
  const chartPermission = chartCanvasVM.permission;

  // Asset 14/16 canon: Market Object Passport (lineage, owner, birth,
  // touches, invalidation, provenance) integrated into the chart
  // workspace. Same selector /command-deck already routes through.
  // Toggle state is device-local; not owner-scoped (view preference).
  const chartCanvasState = useCanonicalMarketState(canvasIdentity);
  const chartPassportVM = React.useMemo(
    () => selectMarketObjectPassport(chartCanvasState),
    [chartCanvasState],
  );
  const [passportOpen, setPassportOpen] = useState(false);
  // Asset 07 canon — Evidence Debt / Question Mode toggle.
  const [whyOpen, setWhyOpen] = useState(false);
  const passportTriggerRef = useRef<HTMLButtonElement>(null);
  const whyTriggerRef = useRef<HTMLButtonElement>(null);

  // Track day high/low from ticker
  useEffect(() => {
    if (ticker.price > 0) {
      setCurrentPrice(ticker.price);
      setDayHigh(h => ticker.price > h ? ticker.price : h);
      setDayLow(l => (l === 0 || ticker.price < l) ? ticker.price : l);
    }
  }, [ticker.price]);

  const handleBarsReady = useCallback((bars: OHLCVBar[]) => {
    setChartBars(bars);
    if (bars.length > 0) {
      const highs = bars.map(b => b.high);
      const lows  = bars.map(b => b.low);
      setDayHigh(Math.max(...highs));
      setDayLow(Math.min(...lows));
    }
  }, []);

  // WM-VP-P0-01: monotonic data identity for pure downstream projections (the
  // Session VP). Bumps when the chart's symbol/timeframe changes and clears the
  // prior identity's canonical candles, so a consumer never projects symbol A's
  // stale bars for symbol B in the window before MainChart re-emits.
  const [dataVersion, setDataVersion] = useState(0);
  useEffect(() => {
    setDataVersion(v => v + 1);
    setChartBars([]);
  }, [symbol, timeframe]);

  const handleAddToChart = useCallback((output: PineOutput, code: string) => {
    setPineOutput(output);
    setPineCode(code);
    setPineBuilderOpen(false);
  }, []);

  // ── Live-update the active Pine indicator as new bars stream in ──
  // Recompute the script against the latest chartBars whenever they change
  // (new candle, symbol switch, timeframe switch) so a custom indicator
  // "always updates" like a native one instead of freezing on the bars it
  // was first added with.
  useEffect(() => {
    if (!pineCode || chartBars.length === 0) return;
    let cancelled = false;
    const id = setTimeout(() => {
      try {
        const out = interpretPine(pineCode, chartBars);
        if (!cancelled) setPineOutput(out);
      } catch { /* keep last good output */ }
    }, 120);
    return () => { cancelled = true; clearTimeout(id); };
    // Rebuild the full plot set only when a NEW bar closes (length changes).
    // Intra-bar live movement is handled smoothly inside MainChart via
    // series.update(), so we avoid tearing down/rebuilding series every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartBars.length, pineCode]);

  const handleCommunityImport = useCallback((code: string, _title: string) => {
    setPineCode(code);
    setCommunityOpen(false);
    setPineBuilderOpen(true);
  }, []);

  const handleSnapshot = useCallback(async () => {
    if (!chartWrapRef.current || snapping) return;
    setSnapping(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(chartWrapRef.current, {
        backgroundColor: "#0B0E1A",
        scale: 2, logging: false, useCORS: true,
      });
      const url = canvas.toDataURL("image/png");
      const a = Object.assign(document.createElement("a"), {
        href: url,
        download: `wm-${symbol}-${timeframe}-${Date.now()}.png`,
      });
      a.click();
    } catch (err) {
      // NEVER claim success on failure. html2canvas IS installed; if the capture
      // throws (tainted canvas, OOM, detached node) the user has to know it
      // failed rather than go hunting for a PNG that was never written.
      console.error("[chart snapshot] capture failed:", err);
      alert(`Chart snapshot failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSnapping(false);
    }
  }, [symbol, timeframe, snapping]);

  // HYDRATION GATE — permanent fix for React #418.
  // This dashboard seeds many states from localStorage (theme, timeframe,
  // candleType, footprint, active indicators, VP toggles, chart settings…), so
  // the client's first render diverges from the server HTML for any user who has
  // customized anything → hydration mismatch. Since the chart is a browser-only
  // tool with no useful SSR, we render an identical placeholder on the server AND
  // the client's first paint (mounted=false on both → they match), then swap in
  // the real dashboard after mount. One gate covers every localStorage-derived
  // value at once and prevents the whole class of bug from ever recurring.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) {
    return (
      <div style={{ display:"flex", flexDirection:"column", width:"100%", height:"100%", overflow:"hidden", background:"#0D0E14" }} />
    );
  }

  return (
    <div
      className={`wm-chart-dashboard${theme === "neon" ? " wm-neon" : ""}`}
      style={{ display:"flex", flexDirection:"column", width:"100%", height:"100%", overflow:"hidden", background: theme === "neon" ? "#02060a" : "#0D0E14" }}
    >
      {theme === "neon" && <div className="wm-neon-scan" />}
      {/* Hidden context tag for SpaidBot to read current chart state */}
      <span
        id="wm-chart-context"
        data-ctx={JSON.stringify({ symbol, price: ticker.price, change: ticker.change, changePct: ticker.changePct })}
        style={{ display: "none" }}
      />
      {/* ── WM brand strip above chart tabs — integrates the chart into
             the same visual DNA as /command-deck, /profile Growth,
             /morning-prep, /journal (Founder Aug-14 acceptance criterion:
             'The chart should now look integrated into WM instead of a
             legacy chart surrounded by newer widgets'). The row owns a real
             44px touch target instead of letting Passport overlap the tabs. */}
      <div
        style={{
          minHeight: 44,
          borderBottom: "1px solid rgba(139,106,41,0.25)",
          background: "linear-gradient(180deg, rgba(11,11,13,0.9), #0D0E14)",
          display: "flex",
          alignItems: "center",
          paddingLeft: 16,
          paddingRight: 16,
          gap: 12,
          flexShrink: 0,
        }}
      >
        <WmWordmark size="compact" />
        <span
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 10,
            letterSpacing: 0.32,
            color: "#8a8271",
            fontStyle: "italic",
          }}
        >
          the trader's chart
        </span>
        {/* Founder 2026-09-02: breadcrumb — orientation truth. The user
            can always see WHERE in the OS they are and jump one level
            up. activeTab renders as the terminal segment so switching
            categories updates the crumb without a route change. */}
        <nav
          aria-label="Breadcrumb"
          style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 4, fontSize: 10, color: "#6d7288", letterSpacing: 0.2 }}
        >
          <span aria-hidden="true" style={{ color: "#3a3f52" }}>›</span>
          <a
            href="/charts"
            style={{ color: "#a89b6f", textDecoration: "none", fontWeight: 600, letterSpacing: 0.32, textTransform: "uppercase" }}
            aria-current={activeTab === "Chart" ? "page" : undefined}
          >
            Charts
          </a>
          <span aria-hidden="true" style={{ color: "#3a3f52" }}>›</span>
          <span style={{ color: "#c9c2a7", fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" }}>
            {symbol}
          </span>
          {activeTab !== "Chart" && (
            <>
              <span aria-hidden="true" style={{ color: "#3a3f52" }}>›</span>
              <span style={{ color: "#8b8fa8", letterSpacing: 0.32, textTransform: "uppercase" }} aria-current="page">
                {activeTab}
              </span>
            </>
          )}
        </nav>
        {/* Phase 3 Market Canvas verdict — same compiler as /command-deck.
            Sourced via useMarketCanvasVM(canvasIdentity); silent when
            evidence is insufficient (§Silence Is A Feature). No fake
            confidence, no invented aggressor ratio — every field flows
            from the canonical compiler. Founder canon: Asset 10
            "Full Operating System Overview" merge into the primary
            trader surface. */}
        <div style={{ marginLeft: 4, marginRight: 4, display: "flex", alignItems: "center" }}>
          <CanvasSummaryPill
            vm={chartMarketCanvas}
            ariaLabel="Chart market canvas summary"
          />
        </div>
        {/* Asset 14/16 canon — Market Object Passport button. Silent
            when snapshot not yet available (§Silence Is A Feature);
            opens a real Passport panel with lineage/owner/birth/
            touches/invalidation/provenance sourced from the same
            selectMarketObjectPassport /command-deck routes through. */}
        {/* Asset 08 + 10 canon — Liquidity Weather truth chip.
            LIVING-PIXEL LAW: no fake heatmap gradient, no invented
            "climate map · NEUTRAL" scalar. Renders the honest state
            of the depth capability — NOT WIRED when we have no L2
            depth provider (the current situation), BLOCKED when
            entitlement is refused, LIVE when a depth stream is
            connected. This is the Asset 08 (Liquidity Weather
            Heatmap) reference merged with real data owners only. */}
        <span
          role="status"
          aria-label="Liquidity Weather — Level 2 depth capability not wired"
          title="Liquidity Weather (Asset 08 canon) needs a licensed Level 2 depth provider. No decorative heatmap will be drawn until real depth signals arrive."
          style={{
            fontSize: 10,
            letterSpacing: 0.32,
            textTransform: "uppercase",
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 4,
            marginLeft: 4,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            color: "#8B8FA8",
            background: "transparent",
            border: "1px dashed rgba(139,143,168,0.35)",
          }}
        >
          LIQUIDITY WEATHER · NOT WIRED
        </span>
        {/* Asset 10 canon — Right of Way / Decision Permission chip.
            Silent when verdict is UNKNOWN and no rules are declared
            (§Silence Is A Feature). Otherwise a color-coded verdict
            chip: gold ALLOWED, amber ADVISORY, red RESTRICTED. Reads
            the SAME permission compilation the deck consumes so the
            trader never sees a divergent verdict across surfaces. */}
        {chartPermission && (chartPermission.verdict !== "UNKNOWN" || chartPermission.ruleCount > 0) && (
          <span
            role="status"
            aria-label={`Right of Way — ${chartPermission.verdict}. ${chartPermission.headline}`}
            title={chartPermission.headline}
            style={{
              fontSize: 10,
              letterSpacing: 0.32,
              textTransform: "uppercase",
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 4,
              marginLeft: 4,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              ...(chartPermission.verdict === "ALLOWED" ? {
                color: "#e8b923",
                background: "rgba(232,185,35,0.10)",
                border: "1px solid rgba(232,185,35,0.35)",
              } : chartPermission.verdict === "ADVISORY" ? {
                color: "#f4a03d",
                background: "rgba(244,160,61,0.08)",
                border: "1px solid rgba(244,160,61,0.35)",
              } : chartPermission.verdict === "RESTRICTED" ? {
                color: "#ff6b6b",
                background: "rgba(255,107,107,0.08)",
                border: "1px solid rgba(255,107,107,0.35)",
              } : {
                color: "#8B8FA8",
                background: "transparent",
                border: "1px solid rgba(139,143,168,0.25)",
              }),
            }}
          >
            ROW · {chartPermission.verdict}
          </span>
        )}
        {/* Asset 07 canon — Evidence Debt / Question Mode toggle.
            Silent when there's no decisionWhy compilation yet
            (§Silence Is A Feature). Opens the SAME DecisionWhyPanel
            /command-deck ships so trader sees identical WHY on both. */}
        {chartCanvasVM.decisionWhy && (
          <button
            ref={whyTriggerRef}
            type="button"
            onClick={() => setWhyOpen(o => !o)}
            aria-label={whyOpen ? "Close Decision Why" : "Open Decision Why"}
            aria-expanded={whyOpen}
            aria-controls="chart-decision-why"
            style={{
              fontSize: 10,
              letterSpacing: 0.3,
              textTransform: "uppercase",
              color: whyOpen ? "#e8b923" : "#c9a55c",
              background: whyOpen ? "rgba(232, 185, 35, 0.12)" : "transparent",
              border: whyOpen ? "1px solid rgba(232, 185, 35, 0.5)" : "1px solid rgba(139,106,41,0.35)",
              padding: "3px 10px",
              borderRadius: 4,
              fontWeight: 700,
              cursor: "pointer",
              marginLeft: 4,
            }}
          >
            {whyOpen ? "▾ Why" : "▸ Why"}
          </button>
        )}
        {chartPassportVM.capturedAt !== null && (
          <button
            ref={passportTriggerRef}
            type="button"
            onClick={() => setPassportOpen(o => !o)}
            aria-label={passportOpen ? "Close Market Object Passport" : "Open Market Object Passport"}
            aria-expanded={passportOpen}
            aria-controls="chart-market-object-passport"
            style={{
              fontSize: 10,
              letterSpacing: 0.3,
              textTransform: "uppercase",
              color: passportOpen ? "#e8b923" : "#c9a55c",
              background: passportOpen ? "rgba(232, 185, 35, 0.12)" : "transparent",
              border: passportOpen ? "1px solid rgba(232, 185, 35, 0.5)" : "1px solid rgba(139,106,41,0.35)",
              minHeight: 44,
              padding: "3px 10px",
              borderRadius: 4,
              fontWeight: 700,
              cursor: "pointer",
              marginLeft: 4,
            }}
          >
            {passportOpen ? "▾ Passport" : "▸ Passport"}
          </button>
        )}
        <a
          href="/command-deck"
          style={{
            marginLeft: "auto",
            fontSize: 10,
            letterSpacing: 0.3,
            textTransform: "uppercase",
            color: "#c9a55c",
            textDecoration: "none",
            border: "1px solid rgba(139,106,41,0.35)",
            padding: "3px 8px",
            borderRadius: 4,
            fontWeight: 700,
            transition: "background 0.12s, color 0.12s, border-color 0.12s",
          }}
          aria-label="Open Command Deck"
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(232, 185, 35, 0.12)";
            e.currentTarget.style.color = "#e8b923";
            e.currentTarget.style.borderColor = "rgba(232, 185, 35, 0.5)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#c9a55c";
            e.currentTarget.style.borderColor = "rgba(139,106,41,0.35)";
          }}
        >
          Command Deck →
        </a>
      </div>
      {/* ── Top-level category tab strip ──────────────────────
          Founder directive 2026-09-02: the per-symbol view
          categories (Chart / Options / ETFs / Financials /
          Valuation / Corporate Actions / Shareholders / Profile)
          were previously wedged into the same MooMoo row as
          asset-class + symbol + price + fidelity badge, competing
          for horizontal space and only surfacing after a long
          scroll. Promoting them to their own row at the top of
          the chrome makes them read as primary navigation and
          restores breathing room to the symbol row below. */}
      <div
        className="wm-chart-category-strip"
        style={{
          // Founder-canon mobile tap target: min 44px. Height stretches
          // to whatever the buttons need so touch users hit them without
          // fat-fingering an adjacent tab.
          minHeight: 44,
          borderBottom: "1px solid #1E2030",
          display: "flex",
          alignItems: "stretch",
          gap: 0,
          paddingLeft: 16,
          background: "#0D0E14",
          flexShrink: 0,
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
        role="tablist"
        aria-label="Symbol view categories"
      >
        {(() => {
          const tabs = categoryTabsFor(canonicalAssetClass(symbol));
          return tabs.map((tab, idx) => {
            const isActive = tab === activeTab;
            const panelId = tab === "Chart" || tab === "Options"
              ? "wm-chart-category-panel-chart"
              : "wm-chart-category-panel";
            return (
              <button
                key={tab}
                className="wm-chart-page-tab"
                role="tab"
                aria-selected={isActive}
                aria-controls={panelId}
                tabIndex={isActive ? 0 : -1}
                onKeyDown={(e) => {
                  // WAI-ARIA tab pattern: Left/Right arrows move focus + activate.
                  // Founder canon: keyboard users MUST reach every category tab
                  // without the mouse.
                  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") return;
                  e.preventDefault();
                  let nextIdx = idx;
                  if (e.key === "ArrowLeft") nextIdx = (idx - 1 + tabs.length) % tabs.length;
                  if (e.key === "ArrowRight") nextIdx = (idx + 1) % tabs.length;
                  if (e.key === "Home") nextIdx = 0;
                  if (e.key === "End") nextIdx = tabs.length - 1;
                  const nextTab = tabs[nextIdx];
                  setActiveTab(nextTab);
                  if (nextTab === "Options") setOptionsOpen(true);
                }}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === "Options") setOptionsOpen(true);
                }}
                style={{
                  padding: "0 14px",
                  minHeight: 44,
                  color: isActive ? "#E2E8F0" : "#8B8FA8",
                  background: "transparent", border: "none",
                  borderBottom: isActive ? "2px solid #FF8C00" : "2px solid transparent",
                  fontSize: 12, fontWeight: isActive ? 600 : 400, cursor: "pointer",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}
              >
                {tab}
              </button>
            );
          });
        })()}
      </div>
      {/* ── Order Flow Cockpit strip — Asset 10 canon merge ──────
          Real per-trade tick data → selectAggressorFlow pure selector
          → honest aggressor volumes / net flow / imbalance. Silent
          chip when no aggressor evidence yet (§Silence Is A Feature).
          NO fake bullish-percentage score, NO invented net-buying-
          pressure gauge — the canon "68% net buying pressure" and
          "2.84B aggressive buy" numbers from Asset 10 stay in the
          reference; here we surface the REAL selector output. */}
      {(activeTab === "Chart" || activeTab === "Options") && (
        <OrderFlowCockpitStrip ticks={recentTicks} livePrice={ticker.price} />
      )}
      {/* ── MooMoo-style chart tabs row ──────────────────────── */}
      <div className="wm-chart-tabs" style={{
        height: 40, borderBottom: "1px solid #1E2030", display: "flex", alignItems: "center",
        gap: 0, paddingLeft: 16, background: "#0D0E14", flexShrink: 0, overflowX: "auto",
        scrollbarWidth: "none",
      }}>
        {/* Asset class switcher (Stocks / Crypto / Futures / Forex / Indices / Metals) */}
        <AssetClassSwitcher symbol={symbol} onSelect={setSymbol} />
        {/* Symbol + live price */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 16, flexShrink: 0 }}>
          <span style={{ color: "#E2E8F0", fontWeight: 700, fontSize: 14 }}>{symbol}</span>
          {(() => {
            // Truth guard: header must never paint a change value without a real
            // reference close. Before this, the header would render whatever the
            // hook returned even if a seed-derived fake had leaked through — see
            // useWebSocket flush() for the source-side guard that pairs with this.
            const hasReal = ticker.price > 0
              && Number.isFinite(ticker.change) && Number.isFinite(ticker.changePct)
              && !(ticker.change === 0 && ticker.changePct === 0 && ticker.volume === 0);
            const up = hasReal && ticker.changePct >= 0;
            return (
              <span style={{
                color: hasReal ? (up ? "#00C076" : "#FF4D67") : "#8B92AC",
                fontWeight: 700, fontSize: 13, fontFamily: "monospace",
              }}>
                {ticker.price > 0 ? ticker.price.toFixed(2) : "—"}
                {hasReal && <> {up ? "↑" : "↓"}
                  &nbsp;{up ? "+" : ""}{ticker.change.toFixed(2)}
                  &nbsp;{up ? "+" : ""}{ticker.changePct.toFixed(2)}%
                </>}
              </span>
            );
          })()}
          {(() => {
            // Sentinel V-008: prior sizing (fontSize 8.5, dot 5px) was below the
            // visibility threshold in prod screenshots — dead-fix pattern per
            // DEC-011. Bumped to 11px text / 7px dot / stronger contrast so a
            // user can actually read WHICH feed the price came from without
            // hovering for a tooltip.
            // SHIFT-R atom 3 — the four ad-hoc chip renders across the
            // trader surfaces all collapse into <CanonicalFidelityBadge>
            // (canon §Single-Writer / Many-Readers + §Simplification
            // Dividend). The SHIFT-Q 7-question tooltip enrichment now
            // ships to every surface for free, and any future canon
            // vocabulary or color change touches ONE component.
            const b = priceSourceBadge(source, connected);
            // SHIFT-U continuation — pass the per-capability report so
            // the trader hovering the chip sees "Weakest capability"
            // hint + coverage count. Canon §Provider Status Per
            // Capability delivered on the /charts chrome without
            // fattening the visible chip (canon §Semantic Zoom).
            const capabilityReport = selectPerCapabilityFidelity({
              source: source ?? "unavailable",
              connected,
              hasCandles: true, // chart already rendered by this render path
              // ticks / depth / options / greeks / orderFlow: unwired
              // on ChartsDashboard; silent per canon §no-silent-override.
            });
            return <CanonicalFidelityBadge badge={b} variant="chrome" capabilityReport={capabilityReport} />;
          })()}
        </div>
        {/* Tab bar promoted to its own top-level category strip above
            (Founder 2026-09-02). Keeping this comment as a breadcrumb
            so a future edit doesn't accidentally re-inline the tabs. */}

        {/* Keep appearance optional and compact; it must not compete with the
            symbol, market state, or chart navigation. */}
        <div className="wm-chart-theme-controls" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, paddingRight: 14, flexShrink: 0 }}>
          <button
            className={`wm-theme-toggle ${theme === "neon" ? "is-neon" : ""}`}
            onClick={() => setTheme(theme === "neon" ? "original" : "neon")}
            title={`Switch to ${theme === "neon" ? "Original" : "WM Neon"} appearance`}
            aria-label={`Chart appearance: ${theme === "neon" ? "WM Neon" : "Original"}. Switch appearance.`}
          >
            Appearance
          </button>
        </div>
      </div>

      {/* ── Main row ─────────────────────────────────────────── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0 }}>

        {/* Left tool strip (TradingView-style): watchlist toggle, layout,
            publish idea, record video, speak your mind, screenshot, screen rec */}
        <LeftSidebar
          watchlistOpen={watchlistOpen}
          onToggleWatchlist={() => setWatchlistOpen(v => !v)}
          chartLayout={chartLayout}
          onLayoutChange={setChartLayout}
          captureRef={fullscreenRef}
          symbol={symbol}
        />

        {/* Watchlist (left side, MooMoo places it left of chart) */}
        <WatchlistPanel
          open={watchlistOpen}
          onToggle={() => setWatchlistOpen(v => !v)}
          gridView={gridView}
          onGridViewChange={(v) => { setGridView(v); if (v) setGridRefresh(k => k + 1); }}
        />

        {/* Center: toolbar + chart area — fullscreen target includes all controls */}
        <div ref={fullscreenRef} style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0, position:"relative" }}>
          {/* Asset 14/16 canon — accessible responsive Passport drawer.
              Same VM shape the deck consumes; the shared shell owner gives
              phone-width containment, focus trapping, Escape close, and
              focus restoration to the chart trigger. */}
          {passportOpen && (activeTab === "Chart" || activeTab === "Options") && (
            <ShellModalDrawer
              id="chart-market-object-passport"
              titleId="chart-market-object-passport-title"
              descriptionId="chart-market-object-passport-description"
              title="Market Object Passport"
              description="Lineage, ownership, evidence, and invalidation for this chart object."
              closeLabel="Close Market Object Passport"
              width={440}
              onClose={() => setPassportOpen(false)}
              fallbackTriggerRef={passportTriggerRef}
            >
              <div style={{ padding: 12 }}>
                <MarketObjectPassportPanel vm={chartPassportVM} />
              </div>
            </ShellModalDrawer>
          )}

          {/* Asset 07 canon — Evidence Debt / Question Mode drawer.
              Same DecisionWhyPanel the deck renders + same ShellModalDrawer
              containment used by the Passport drawer above. Same VM
              (chartCanvasVM.decisionWhy) so the trader sees identical WHY
              reasoning on both /charts and /command-deck. */}
          {whyOpen && (activeTab === "Chart" || activeTab === "Options") && (
            <ShellModalDrawer
              id="chart-decision-why"
              titleId="chart-decision-why-title"
              descriptionId="chart-decision-why-description"
              title="Decision Why"
              description="Compiled reasoning behind the current market canvas — evidence gaps, blockers, clearances."
              closeLabel="Close Decision Why"
              width={440}
              onClose={() => setWhyOpen(false)}
              fallbackTriggerRef={whyTriggerRef}
            >
              <div style={{ padding: 12 }}>
                <DecisionWhyPanel vm={chartCanvasVM.decisionWhy} />
              </div>
            </ShellModalDrawer>
          )}

          {/* ── Toolbar ───────────────────────────────────────── */}
          {/* Founder canon (Drive Launch Board — HANDS-ON REALITY LOCK):
              "controls that visually promise more than they do" are false-green.
              Chart-specific controls (timeframes / Draw / ORDER FLOW / Indicators
              / DOM / Pine / Replay / Compare / Alerts / VP tools) are meaningless
              on Financials / Valuation / Corporate Actions / etc. Mount them only
              when the actual chart is showing so a trader on Financials never
              clicks 1M and gets nothing. */}
          {(activeTab === "Chart" || activeTab === "Options") && <ChartToolbar
            symbol={symbol}         setSymbol={setSymbol}
            timeframe={timeframe}   setTimeframe={setTimeframe}
            onConnectBrokers={() => setBrokerOpen(true)}
            connectBrokersTriggerRef={brokerTriggerRef}
            onDOM={() => setVpDomOpen(o => !o)}
            onPineScript={() => setPineBuilderOpen(true)}
            onCommunity={() => setCommunityOpen(true)}
            pineActive={!!pineOutput}
            initialActiveInds={activeInds}
            onActiveIndsChange={setActiveInds}
            onIndicatorSettings={(name) => setIndSettingsFor(name)}
            onExtHoursChange={setExtHours}
            onAlerts={() => setAlertsOpen(o => !o)}
            alertsActive={alertsOpen}
            onSettings={() => setSettingsOpen(true)}
            onReplay={() => { if (replayActive) stopReplay(); else startReplay(); }}
            replayActive={replayActive}
            onCompare={() => setCompareOpen(o => !o)}
            compareActive={!!compareSymbol}
            chartLayout={chartLayout}
            onLayoutChange={setChartLayout}
          />}

          {/* ── Extra controls bar (Footprint, candle type, etc.) ──
              Gated by the same chart-only rule as the toolbar above. */}
          {/* overflow-x-auto so the toolbar NEVER clips a control (the WM Session VP
              button was being cut off by the candle dropdown when the row exceeded the
              viewport) — it scrolls horizontally instead of hiding items. */}
          {/* justify-START (not between): with overflow-x-auto, space-between shoves the
              candle-type/Markov group to the far-right viewport edge where Markov gets
              clipped ("cut off"). Natural left flow lets the row scroll cleanly and
              keeps every control fully reachable. pr-3 gives the last button breathing
              room so it never sits flush against the clip edge. */}
          {(activeTab === "Chart" || activeTab === "Options") && <div className="wm-chart-tools flex items-center justify-start border-b shrink-0 overflow-x-auto overflow-y-hidden pr-3"
            style={{ height: 30, background: "#0D0E14", borderColor: "#1E2030" }}>
            <div className="flex items-center shrink-0">
              {/* Drawing tools dropdown — lives in the secondary toolbar */}
              <div className="flex items-center px-2 border-r border-wm-border/50 h-full" style={{ gap: 4 }}>
                <DrawingToolsPanel
                  activeTool={drawingTool}
                  onToolChange={setDrawingTool}
                  onClearAll={() => setClearTrigger(t => t + 1)}
                  style={drawingStyle}
                  onStyleChange={patchDrawingStyle}
                  magnetActive={magnetActive}
                  onMagnetToggle={() => setMagnetActive(v => !v)}
                  lockActive={lockActive}
                  onLockToggle={() => setLockActive(v => !v)}
                  visible={drawingsVisible}
                  onVisToggle={() => setDrawingsVisible(v => !v)}
                />
              </div>
              <FootprintControls
                active={footprintType}
                enabled={footprintEnabled}
                bigTradesOverlay={bigTradesSimul && bigTradesOverlay}
                onDisable={() => setFootprintEnabled(false)}
                onChange={(t) => {
                  // Big Trades in Simultaneous Mode is an INDEPENDENT overlay: clicking
                  // it toggles the overlay on/off WITHOUT disturbing the active order-flow
                  // tool (Delta, Bid×Ask, Imbalance, Agg/Passive, Vol Profile).
                  if (t === "big-trades" && bigTradesSimul) {
                    setBigTradesOverlay(v => !v);
                    return;
                  }
                  // Re-clicking the mode that's already active toggles it OFF, so each
                  // order-flow button (incl. Big Trades in exclusive mode) is a reliable
                  // on/off toggle. Otherwise switch to / enable the clicked mode.
                  if (footprintEnabled && footprintType === t) {
                    setFootprintEnabled(false);
                  } else {
                    setFootprintEnabled(true);
                    setFootprintType(t);
                    // Switching to a non-big-trades exclusive tool clears any leftover
                    // overlay so the two states never fight.
                    if (t !== "big-trades") setBigTradesOverlay(false);
                  }
                }}
              />
              {/* WM VP Indicator buttons */}
              <div className="flex items-center gap-1 px-2 border-l border-wm-border/50 h-full shrink-0">
                <button
                  onClick={() => setFixedVPActive(v => !v)}
                  className="flex items-center gap-1 px-2 h-5 rounded text-[12px] font-bold transition-all border shrink-0 whitespace-nowrap"
                  style={{
                    background: fixedVPActive ? "rgba(240,180,41,0.15)" : "#131520",
                    borderColor: fixedVPActive ? "rgba(240,180,41,0.5)" : "#1E2030",
                    color: fixedVPActive ? "#F0B429" : "#8B8FA8",
                  }}
                  title="WM Fixed Volume Profile — draws on chart"
                >
                  WM Fixed VP
                </button>
                <button
                  onClick={() => setSessionVPChart(v => !v)}
                  className="flex items-center gap-1 px-2 h-5 rounded text-[12px] font-bold transition-all border shrink-0 whitespace-nowrap"
                  style={{
                    background: sessionVPChart ? "rgba(139,92,246,0.15)" : "#131520",
                    borderColor: sessionVPChart ? "rgba(139,92,246,0.5)" : "#1E2030",
                    color: sessionVPChart ? "#8B5CF6" : "#8B8FA8",
                  }}
                  title="WM Session VP — current session volume profile on chart"
                >
                  WM Session VP
                </button>
                <VPColorGear />
              </div>
            </div>

            <div className="flex items-center gap-1 px-2 shrink-0">
              <select
                value={candleType}
                onChange={e => setCandleType(e.target.value as CandleType)}
                className="h-6 rounded text-[12px] font-semibold border focus:outline-none px-1 cursor-pointer"
                style={{ minWidth:110, background:"#131520", borderColor:"#1E2030", color:"#8B8FA8" }}
              >
                <optgroup label="Standard">
                  <option value="candles">Candles</option>
                  <option value="heikin-ashi">Heikin Ashi</option>
                  <option value="hollow">Hollow Candles</option>
                  <option value="bars">OHLC Bars</option>
                  <option value="hlc-bars">HLC Bars</option>
                  <option value="baseline">Baseline</option>
                  <option value="columns">Columns</option>
                  <option value="line">Line</option>
                  <option value="area">Area</option>
                </optgroup>
                <optgroup label="Advanced">
                  <option value="volume-candles">Volume Candles</option>
                  <option value="vp-candles">VP Candles</option>
                  <option value="orderflow-candles">Order Flow Candles</option>
                  <option value="renko">Renko</option>
                  <option value="range-bars">Range Bars</option>
                </optgroup>
              </select>

              <AnimatePresence>
                {compareOpen && (
                  <div className="flex items-center gap-1" style={{ position:"relative" }}>
                    <div style={{ position:"relative" }}>
                      <input
                        autoFocus
                        value={compareInput}
                        onChange={e => setCompareInput(e.target.value.toUpperCase())}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            const pick = compareResults[0]?.sym ?? compareInput.trim().toUpperCase();
                            if (pick) { setCompareSymbol(pick); setCompareInput(pick); setCompareResults([]); setCompareOpen(false); }
                          }
                          if (e.key === "Escape") { setCompareOpen(false); setCompareResults([]); }
                        }}
                        placeholder="Search symbol…"
                        className="h-6 rounded text-[12px] border focus:outline-none px-2"
                        style={{ width: 160, background:"#131520", borderColor:"#FF8C00", color:"#E2E8F0" }}
                      />
                      {compareResults.length > 0 && (
                        <div style={{
                          position:"absolute", top:"100%", left:0, zIndex:9999,
                          background:"#0D0E14", border:"1px solid #FF8C00", borderRadius:6,
                          minWidth:240, maxHeight:220, overflowY:"auto",
                          boxShadow:"0 8px 24px rgba(0,0,0,0.6)", marginTop:2,
                        }}>
                          {compareResults.map(r => (
                            <div
                              key={r.sym}
                              onClick={() => { setCompareSymbol(r.sym); setCompareInput(r.sym); setCompareResults([]); setCompareOpen(false); }}
                              style={{
                                padding:"6px 10px", cursor:"pointer",
                                display:"flex", justifyContent:"space-between", alignItems:"center",
                                borderBottom:"1px solid #1E2030",
                              }}
                              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(255,140,0,0.1)"}
                              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                            >
                              <span style={{ fontSize:11, fontWeight:700, color:"#FF8C00" }}>{r.sym}</span>
                              <span style={{ fontSize:10, color:"#8B8FA8", marginLeft:8, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:140 }}>{r.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {compareSymbol && (
                      <button onClick={() => { setCompareSymbol(""); setCompareInput(""); setCompareResults([]); setCompareOpen(false); }}
                        style={{ fontSize:10, color:"#FF4D67", background:"none", border:"none", cursor:"pointer" }}>✕ Clear</button>
                    )}
                  </div>
                )}
              </AnimatePresence>

              {/* WM-BRAND-W-TRIGGER-01: the panel interior uses <WMLogo /> as its
                  identity mark; the trigger was a generic Activity icon. Restored
                  the branded W so the button and panel read as one product. */}
              <button
                onClick={() => setSmartMoneyOpen(o => !o)}
                className={`flex items-center gap-1.5 pl-1.5 pr-2.5 h-8 rounded text-[12px] font-semibold border transition-all`}
                style={{
                  background: smartMoneyOpen ? "rgba(139,92,246,0.15)" : "#131520",
                  borderColor: smartMoneyOpen ? "rgba(139,92,246,0.45)" : "#1E2030",
                  color: smartMoneyOpen ? "#8B5CF6" : "#E2E8F0",
                  minHeight: 32, minWidth: 44,
                }}
                title="Smart Money — real order-flow read (VWAP, CVD, imbalance); honest N/A for feeds we don't have"
                aria-label="Open Smart Money panel"
                aria-pressed={smartMoneyOpen}
              >
                <WMLogo size={18} showGlow={smartMoneyOpen} /> Smart Money
              </button>

              <button
                onClick={() => setPaperTradesOn(o => !o)}
                className={`flex items-center gap-1 px-2 h-6 rounded text-[12px] font-semibold border transition-all`}
                style={{
                  background: paperTradesOn ? "rgba(0,212,170,0.15)" : "#131520",
                  borderColor: paperTradesOn ? "rgba(0,212,170,0.45)" : "#1E2030",
                  color: paperTradesOn ? "#00D4AA" : "#8B8FA8",
                }}
                title="Show open paper positions on chart (entry line + live P&L)"
              >
                <Target size={10} /> Positions
              </button>

              <button
                onClick={handleSnapshot}
                disabled={snapping}
                className="flex items-center gap-1 px-2 h-6 rounded text-[12px] font-semibold border transition-all disabled:opacity-50"
                style={{ background:"#131520", borderColor:"#1E2030", color:"#8B8FA8" }}
                title="Snapshot chart"
              >
                <Camera size={10} /> {snapping ? "…" : "Snap"}
              </button>

              {pineOutput && (
                <button
                  onClick={() => setPineBuilderOpen(true)}
                  className="flex items-center gap-1 px-2 h-6 rounded text-[12px] font-semibold border"
                  style={{ background:"rgba(139,92,246,0.12)", color:"#8B5CF6", borderColor:"rgba(139,92,246,0.4)" }}
                >
                  ƒ {pineOutput.shortTitle || pineOutput.title || "Custom Script"}
                  <span style={{ marginLeft:4, color:"#4A5070" }}
                    onClick={e => { e.stopPropagation(); setPineOutput(null); setPineCode(""); }}>×</span>
                </button>
              )}

              {/* ── Strategies Dropdown ─────────────────── */}
              <div className="relative" ref={stratRef}>
                <button
                  onClick={() => setStrategiesOpen(v => !v)}
                  className="flex items-center gap-1 px-2 h-6 rounded text-[12px] font-bold border transition-all"
                  style={{
                    background: activeStrategy ? "rgba(240,180,41,0.15)" : "#131520",
                    borderColor: activeStrategy ? "rgba(240,180,41,0.5)" : "#1E2030",
                    color: activeStrategy ? "#F0B429" : "#8B8FA8",
                  }}
                  title="Strategies"
                >
                  <BookOpen size={10} />
                  {activeStrategy ? strategies.find(s => s.id === activeStrategy)?.name ?? "Strategy" : "Strategies"}
                  <ChevronDown size={9} />
                </button>

                {strategiesOpen && (
                  <div className="absolute top-8 right-0 z-50 bg-wm-card border border-wm-border rounded-2xl shadow-2xl overflow-hidden" style={{ minWidth: 280 }}>
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-wm-border flex items-center justify-between">
                      <span className="text-[11px] font-black text-wm-text uppercase tracking-widest">My Strategies</span>
                      <button
                        onClick={() => {
                          const id = `strat_${Date.now()}`;
                          setStrategies(prev => [...prev, { id, name: "New Strategy", color: "#4FA3E0", indicators: ["VWAP", "Volume"], alerts: [] }]);
                          setEditingStrategy(id);
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold bg-wm-green/10 text-wm-green border border-wm-green/30 hover:bg-wm-green/20"
                      >
                        <Plus size={9} /> New
                      </button>
                    </div>

                    {/* Strategy list */}
                    <div className="max-h-72 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                      {strategies.map(strat => (
                        <div key={strat.id}
                          className={`border-b border-wm-border/40 transition-colors ${activeStrategy === strat.id ? "bg-wm-surface/50" : "hover:bg-wm-surface/30"}`}
                        >
                          <div className="flex items-center px-3 py-2 gap-2">
                            {/* Color dot */}
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: strat.color }} />

                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-bold text-wm-text truncate">{strat.name}</div>
                              <div className="text-[11px] text-wm-text-dim truncate">
                                {strat.indicators.slice(0, 3).join(" · ")}{strat.indicators.length > 3 ? ` +${strat.indicators.length - 3}` : ""}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {/* Alerts count */}
                              {strat.alerts.length > 0 && (
                                <span className="flex items-center gap-0.5 text-[11px] text-wm-gold font-bold">
                                  <Bell size={8} /> {strat.alerts.length}
                                </span>
                              )}

                              {/* Load button */}
                              <button
                                onClick={() => {
                                  if (activeStrategy === strat.id) {
                                    setActiveStrategy(null);
                                  } else {
                                    setActiveStrategy(strat.id);
                                    // Apply strategy indicators
                                    setActiveInds(new Set(strat.indicators));
                                  }
                                  setStrategiesOpen(false);
                                }}
                                className="px-2 py-0.5 rounded text-[11px] font-bold border transition-all"
                                style={{
                                  background: activeStrategy === strat.id ? "rgba(240,180,41,0.15)" : "rgba(0,192,118,0.1)",
                                  borderColor: activeStrategy === strat.id ? "rgba(240,180,41,0.4)" : "rgba(0,192,118,0.3)",
                                  color: activeStrategy === strat.id ? "#F0B429" : "#00C076",
                                }}
                              >
                                {activeStrategy === strat.id ? "Active" : "Load"}
                              </button>

                              {/* Delete */}
                              <button
                                onClick={(e) => { e.stopPropagation(); setStrategies(prev => prev.filter(s => s.id !== strat.id)); if (activeStrategy === strat.id) setActiveStrategy(null); }}
                                className="p-0.5 rounded text-wm-text-dim hover:text-wm-red transition-colors"
                              >
                                <Trash2 size={9} />
                              </button>
                            </div>
                          </div>

                          {/* Strategy indicators pills */}
                          <div className="flex flex-wrap gap-1 px-3 pb-2">
                            {strat.indicators.map(ind => (
                              <span key={ind} className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                                style={{ background: `${strat.color}15`, color: strat.color, border: `1px solid ${strat.color}30` }}>
                                {ind}
                              </span>
                            ))}
                          </div>

                          {/* Strategy alerts */}
                          {strat.alerts.length > 0 && (
                            <div className="px-3 pb-2 space-y-0.5">
                              {strat.alerts.map((alert, i) => (
                                <div key={i} className="flex items-center gap-1 text-[10px] text-wm-gold">
                                  <Bell size={7} /> {alert}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      {strategies.length === 0 && (
                        <div className="px-4 py-6 text-center text-[12px] text-wm-text-dim">
                          No strategies yet.<br />
                          <span className="text-wm-text-muted">Create one or import from Journal.</span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="px-3 py-2 border-t border-wm-border bg-wm-dark/50 text-[11px] text-wm-text-dim flex items-center justify-between">
                      <span>Strategies sync with Journal entries</span>
                      <input
                        type="file"
                        accept=".json"
                        id="wm-strategy-import"
                        style={{ display: "none" }}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = ev => {
                            try {
                              const data = JSON.parse(ev.target?.result as string);
                              if (data.name && Array.isArray(data.indicators)) {
                                setStrategies((prev: Strategy[]) => [...prev, { id: Date.now().toString(), name: data.name, indicators: data.indicators, alerts: data.alerts ?? [], color: data.color ?? "#4FA3E0" }]);
                              }
                            } catch {}
                          };
                          reader.readAsText(file);
                          e.target.value = "";
                        }}
                      />
                      <button
                        className="text-wm-blue hover:text-wm-blue/80 font-semibold"
                        onClick={() => document.getElementById("wm-strategy-import")?.click()}
                      >Import</button>
                    </div>
                  </div>
                )}
              </div>

              <FearGreedWidget />
            </div>
          </div>}

          {/* ── Non-Chart tab panels ──────────────────────────── */}
          {activeTab !== "Chart" && activeTab !== "Options" && (
            <div role="tabpanel" id="wm-chart-category-panel" aria-label={`${activeTab} for ${symbol}`} style={{ flex:1, overflow:"auto", minHeight:0 }}>
              <FundamentalsTabPanel symbol={symbol} tab={activeTab} onBack={() => setActiveTab("Chart")} />
            </div>
          )}

          {/* ── Chart area ─────────────────────────── */}
          <div role="tabpanel" id="wm-chart-category-panel-chart" aria-label={`Chart for ${symbol}`} style={{ flex:1, overflow:"hidden", minHeight:0, display: (activeTab === "Chart" || activeTab === "Options") ? "flex" : "none" }}>

            {/* Chart + VP ladder (snapshot target) */}
            <div ref={chartWrapRef} style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0, position:"relative" }}>
              {gridView && <WatchlistGrid refreshKey={gridRefresh} timeframe={timeframe} />}
              <div style={{ flex:1, display: gridView ? "none" : "flex", overflow:"hidden" }}>
                {/* TradingView-style persistent left drawing rail */}
                <LeftDrawingSidebar
                  activeTool={drawingTool}
                  onToolChange={setDrawingTool}
                  onClearAll={() => setClearTrigger(t => t + 1)}
                  style={drawingStyle}
                  onStyleChange={patchDrawingStyle}
                  magnetActive={magnetActive}
                  onMagnetToggle={() => setMagnetActive(v => !v)}
                  lockActive={lockActive}
                  onLockToggle={() => setLockActive(v => !v)}
                  visible={drawingsVisible}
                  onVisToggle={() => setDrawingsVisible(v => !v)}
                />
                <div style={{
                  flex: 1, display:"flex", overflow:"hidden",
                  ...(chartLayout === "2h" ? { flexDirection: "row" } :
                      chartLayout === "2v" ? { flexDirection: "column" } :
                      chartLayout === "4"  ? { flexDirection: "row", flexWrap: "wrap" as const } :
                      {}),
                }}>
                  <div style={{ flex: 1, display:"flex", overflow:"hidden", minWidth:0, minHeight:0, position:"relative",
                    ...(chartLayout === "4" ? { width: "50%", flexShrink: 0 } : {}),
                  }}>
                    {/* ── Regime + live daily % HUD (top-center overlay) ─────────────
                         REAL data only: regime is classified from the live ticker's
                         daily % (same ±1.5% thresholds as the Markov state model), and
                         the % is the actual day return — nothing fabricated here. */}
                    {(() => {
                      const p = Number.isFinite(ticker.changePct) ? ticker.changePct : 0;
                      const reg = p > 1.5 ? "BULL" : p < -1.5 ? "BEAR" : "SIDE";
                      const rc = reg === "BULL" ? "#00D4AA" : reg === "BEAR" ? "#FF4D6A" : "#F0B429";
                      const pc = p >= 0 ? "#00D4AA" : "#FF4D6A";
                      return (
                        <div style={{
                          // top:36 clears the 28px OHLCV strip above the chart — at top:8
                          // this centered chip overlapped and covered the "C" close value
                          // in the OHLC readout when the chart is narrow (DOM + side panels
                          // open). Sitting just below the strip keeps it TradingView-style
                          // top-center without colliding with the numbers.
                          position:"absolute", top:36, left:"50%", transform:"translateX(-50%)",
                          zIndex:40, pointerEvents:"none",
                          display:"flex", alignItems:"center", gap:6,
                          background:"rgba(11,13,20,0.82)", backdropFilter:"blur(4px)",
                          border:`1px solid ${rc}55`, borderRadius:6, padding:"3px 9px",
                        }}>
                          <span style={{ fontSize:9, fontWeight:800, color:"#5A6486", letterSpacing:"0.08em" }}>REGIME</span>
                          <span style={{ fontSize:11, fontWeight:900, color:rc, letterSpacing:"0.04em" }}>{reg}</span>
                          <span style={{ width:1, height:10, background:"#2A3048" }} />
                          <span style={{ fontSize:10.5, fontWeight:800, color:pc, fontFamily:"monospace" }}>
                            {p >= 0 ? "+" : ""}{p.toFixed(2)}% today
                          </span>
                        </div>
                      );
                    })()}
                    <ErrorBoundary>
                    <MainChart
                      symbol={symbol}
                      timeframe={timeframe}
                      footprintType={footprintType}
                      footprintEnabled={footprintEnabled} bigTradesOverlay={bigTradesSimul && bigTradesOverlay}
                      candleType={candleType}
                      pineOutput={pineOutput}
                      pineCode={pineCode}
                      onBarsReady={handleBarsReady}
                      drawingTool={drawingTool}
                      onDrawingComplete={() => setDrawingTool("cursor")}
                      onCreatePriceAlert={createAlertAtPrice}
                      drawingStyle={drawingStyle}
                      magnetActive={magnetActive}
                      lockDrawings={lockActive}
                      drawingsVisible={drawingsVisible}
                      clearTrigger={clearTrigger}
                      activeInds={activeInds}
                      indSettings={indSettings}
                      extendedHours={extHours}
                      alertLevels={alertLevels}
                      chartSettings={effChartSettings}
                      replayActive={replayActive}
                      compareSymbol={compareSymbol}
                      fixedVPActive={fixedVPActive}
                      sessionVPActive={sessionVPChart}
                      paperTradesVisible={paperTradesOn}
                      onRequestFullscreen={handleRequestFullscreen}
                    />
                    </ErrorBoundary>
                  </div>

                  {(chartLayout === "2h" || chartLayout === "2v" || chartLayout === "4") && (
                    <div style={{
                      flex: 1, display:"flex", overflow:"hidden", minWidth:0, minHeight:0,
                      borderLeft: chartLayout === "2h" || chartLayout === "4" ? "1px solid #1E2030" : "none",
                      borderTop: chartLayout === "2v" ? "1px solid #1E2030" : "none",
                      ...(chartLayout === "4" ? { width: "50%", flexShrink: 0 } : {}),
                    }}>
                      <MainChart
                        symbol={compareSymbol || symbol}
                        timeframe={timeframe}
                        footprintType={footprintType}
                        footprintEnabled={footprintEnabled} bigTradesOverlay={bigTradesSimul && bigTradesOverlay}
                        candleType={candleType}
                        chartSettings={effChartSettings}
                        paperTradesVisible={paperTradesOn}
                      />
                    </div>
                  )}

                  {chartLayout === "4" && (
                    <>
                      <div style={{ width:"50%", flexShrink:0, borderTop:"1px solid #1E2030", display:"flex", overflow:"hidden", minHeight:0 }}>
                        <MainChart symbol={symbol} timeframe="5m" footprintType={footprintType} footprintEnabled={footprintEnabled} bigTradesOverlay={bigTradesSimul && bigTradesOverlay} candleType={candleType} chartSettings={effChartSettings} />
                      </div>
                      <div style={{ width:"50%", flexShrink:0, borderTop:"1px solid #1E2030", borderLeft:"1px solid #1E2030", display:"flex", overflow:"hidden", minHeight:0 }}>
                        <MainChart symbol={symbol} timeframe="15m" footprintType={footprintType} footprintEnabled={footprintEnabled} bigTradesOverlay={bigTradesSimul && bigTradesOverlay} candleType={candleType} chartSettings={effChartSettings} />
                      </div>
                    </>
                  )}
                </div>

                {/* DOM ladder — collapsible right panel. The large stationary
                    Volume Profile panel was REMOVED per spec; only the compact
                    Session VP + the on-chart Fixed VP remain (both draw at the top
                    of the chart). This also frees ~340px so Smart Money + the DOM
                    ladder are fully visible on full screen with no cutoffs. */}
                {/* Instrument identity is part of DOM state. Remount on symbol
                    changes so an old book headline can never coexist with the
                    newly selected instrument's ladder while feeds reconnect. */}
                {vpDomOpen && <DOMPanel key={symbol} symbol={symbol} onClose={() => setVpDomOpen(false)} />}
              </div>

              {sessionVPOpen && (
                <WMSessionVP
                  symbol={symbol}
                  timeframe={timeframe}
                  candles={chartBars}
                  dataVersion={dataVersion}
                  provider={source}
                  onClose={() => setSessionVPOpen(false)}
                />
              )}

              <BarReplayControls
                active={replayActive}
                playing={replayPlaying}
                speed={replaySpeed}
                position={replayIdx}
                total={chartBars.length}
                currentTime={chartBars[replayIdx]?.time ?? 0}
                onPlay={toggleReplayPlay}
                onPause={toggleReplayPlay}
                onStepBack={() => setReplayIdx(i => Math.max(0, i - 1))}
                onStepForward={() => setReplayIdx(i => Math.min(chartBars.length - 1, i + 1))}
                onStop={stopReplay}
                onSpeedChange={setReplaySpeed}
              />
            </div>

            {/* DOM panel is now inside VP+DOM collapsible block above */}

            {/* Options chain */}
            <AnimatePresence>
              {optionsOpen && (
                <OptionsChain symbol={symbol} price={ticker.price} onClose={() => setOptionsOpen(false)} />
              )}
            </AnimatePresence>

          </div>

        </div>

        {/* ── Right: StockInfoPanel (collapsible) ───────────── */}
        <div style={{ display:"flex", flexShrink:0 }}>
          {/* Collapse toggle strip */}
          <button
            onClick={() => setInfoOpen(v => !v)}
            title={infoOpen ? "Collapse info panel" : "Expand info panel"}
            style={{
              width:14, background:"#0D0E14",
              borderLeft:"1px solid #1E2030",
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer", color:"#4A5070", flexShrink:0,
            }}
          >
            <span style={{ fontSize:9, transform: infoOpen ? "none" : "rotate(180deg)", display:"block" }}>›</span>
          </button>
          {infoOpen && <StockInfoPanel symbol={symbol} />}
        </div>
      </div>

      {/* ── Bottom index bar ─────────────────────────────────── */}
      <BottomIndexBar />

      {pnlOpen && <PnLStatsPanel onClose={() => setPnlOpen(false)} />}
      {smartMoneyOpen && <SmartMoneyPanel onClose={() => setSmartMoneyOpen(false)} symbol={symbol} />}
      {brokerOpen && (
        <BrokerConnectPanel
          onClose={() => setBrokerOpen(false)}
          fallbackTriggerRef={brokerTriggerRef}
        />
      )}
      <AnimatePresence>
        {indSettingsFor && (
          <IndicatorSettingsModal
            name={indSettingsFor}
            settings={indSettings}
            onChange={(name, params: IndicatorParams) => setIndSettings(prev => ({ ...prev, [name]: params }))}
            onClose={() => setIndSettingsFor(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {tradeOpen && (
          <AlpacaTradingPanel
            onClose={() => setTradeOpen(false)}
            defaultSymbol={symbol}
            onSwitchBroker={() => setBrokerOpen(true)}
          />
        )}
      </AnimatePresence>

      {/* Pine Script Builder */}
      <AnimatePresence>
        {pineBuilderOpen && (
          <CustomIndicatorBuilder
            onClose={() => setPineBuilderOpen(false)}
            bars={chartBars}
            onAddToChart={handleAddToChart}
            activeCode={pineCode}
          />
        )}
      </AnimatePresence>

      {/* Community Library */}
      <AnimatePresence>
        {communityOpen && (
          <PineCommunityLibrary onClose={() => setCommunityOpen(false)} onImport={handleCommunityImport} />
        )}
      </AnimatePresence>

      {/* Alerts Panel */}
      <AlertsPanel
        open={alertsOpen}
        onClose={() => setAlertsOpen(false)}
        symbol={symbol}
        currentPrice={currentPrice}
        onAlertsChange={handleAlertsChange}
      />

      {/* Chart Settings Modal */}
      <ChartSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        symbol={symbol}
        settings={chartSettings}
        onSettingsChange={setChartSettings}
      />
    </div>
  );
}

/* ── Fundamentals / Info Tab Panel ──────────────────────────────────────────
   Renders REAL per-symbol fundamentals from the FMP proxy (/api/fmp). When the
   data is unavailable — no FMP key configured, a non-equity symbol (crypto /
   futures / forex), or an API error — it shows an honest "unavailable" state
   instead of fabricated placeholder data. (Previously every symbol rendered the
   SAME static Apple figures, which is dangerous in a real trading app.) */

/* eslint-disable @typescript-eslint/no-explicit-any */
const FMP_PATHS: Record<string, Record<string, string>> = {
  Profile:            { profile: "/v3/profile/%S" },
  Valuation:          { profile: "/v3/profile/%S", ratios: "/v3/ratios-ttm/%S", km: "/v3/key-metrics-ttm/%S" },
  Financials:         { inc: "/v3/income-statement/%S?period=quarter&limit=5" },
  "Corporate Actions":{ div: "/v3/historical-price-full/stock_dividend/%S", split: "/v3/historical-price-full/stock_split/%S" },
  Shareholders:       { profile: "/v3/profile/%S", inst: "/v3/institutional-holder/%S" },
  ETFs:               { profile: "/v3/profile/%S", etf: "/v3/etf-info?symbol=%S" },
};

function fmtBig(n?: number): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  if (a >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (a >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6)  return `$${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3)  return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}
const fmtX   = (n?: number) => (n == null || !Number.isFinite(n)) ? "—" : `${n.toFixed(1)}×`;
const fmtPct = (n?: number) => (n == null || !Number.isFinite(n)) ? "—" : `${(n * 100).toFixed(2)}%`;
const fmtShares = (n?: number) => {
  if (n == null || !Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n}`;
};

function FundamentalsTabPanel({ symbol, tab, onBack }: { symbol: string; tab: string; onBack: () => void }) {
  const base = symbol.toUpperCase();
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState<Record<string, any>>({});
  const [hasData, setHasData] = useState(false);
  // Founder canon (Monday Test 2 §honest edge): capture the ACTUAL failure
  // class from the provider so the empty state names the real cause instead
  // of hedging ("maybe not equity, maybe not configured"). Populated when a
  // 503 returns {edge:"NOT CONFIGURED", missing:[…]}; null when the empty
  // state is a genuine no-data condition (e.g. a micro-cap equity FMP has
  // no coverage for).
  const [providerEdge, setProviderEdge] = useState<{ edge: string; missing: readonly string[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const map = FMP_PATHS[tab];
    if (!map) { setLoading(false); setHasData(false); return; }
    setLoading(true); setHasData(false); setD({}); setProviderEdge(null);
    let capturedEdge: { edge: string; missing: readonly string[] } | null = null;
    const keys = Object.keys(map);
    Promise.all(keys.map(async k => {
      try {
        const path = map[k].replace(/%S/g, base);
        const res = await fetch(`/api/fmp?path=${encodeURIComponent(path)}`);
        const j: any = await res.json();
        // Capture the NOT CONFIGURED contract so the panel can name the exact
        // missing env var instead of guessing. First-wins is fine — every key
        // hits the same host runtime; if FMP_API_KEY is missing for one, it's
        // missing for all.
        if (res.status === 503 && j?.edge === "NOT CONFIGURED" && Array.isArray(j?.missing) && !capturedEdge) {
          capturedEdge = { edge: j.edge, missing: j.missing };
        }
        if (!res.ok || j?.error || j?.["Error Message"]) return [k, null] as const;
        const empty = Array.isArray(j) ? j.length === 0 : (j && typeof j === "object" && Object.keys(j).length === 0);
        return [k, empty ? null : j] as const;
      } catch { return [k, null] as const; }
    })).then(entries => {
      if (!cancelled && capturedEdge) setProviderEdge(capturedEdge);
      if (cancelled) return;
      const obj: Record<string, any> = {};
      let any = false;
      entries.forEach(([k, v]) => { obj[k] = v; if (v) any = true; });
      setD(obj); setHasData(any); setLoading(false);
    });
    return () => { cancelled = true; };
  }, [base, tab]);

  const Card = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div style={{ background:"#141824", border:"1px solid #1E2030", borderRadius:6, padding:"10px 12px" }}>
      <div style={{ fontSize:10, color:"#6B7094", marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:13, fontWeight:600, color:"#E2E8F0" }}>{value}</div>
    </div>
  );

  function renderTab(): React.ReactNode {
    if (tab === "Profile") {
      const p = d.profile?.[0]; if (!p) return null;
      return (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ background:"#141824", border:"1px solid #1E2030", borderRadius:8, padding:16 }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#E2E8F0", marginBottom:8 }}>Company Overview — {p.companyName ?? base}</div>
            <p style={{ fontSize:12, color:"#B0B8D0", lineHeight:1.7, margin:0 }}>{p.description ?? "No description available."}</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:12 }}>
            <Card label="CEO" value={p.ceo ?? "—"} />
            <Card label="Founded (IPO)" value={p.ipoDate ?? "—"} />
            <Card label="Employees" value={p.fullTimeEmployees ? Number(p.fullTimeEmployees).toLocaleString() : "—"} />
            <Card label="Headquarters" value={[p.city, p.state, p.country].filter(Boolean).join(", ") || "—"} />
            <Card label="Sector" value={p.sector ?? "—"} />
            <Card label="Industry" value={p.industry ?? "—"} />
            <Card label="Exchange" value={p.exchangeShortName ?? p.exchange ?? "—"} />
            <Card label="ISIN" value={p.isin ?? "—"} />
          </div>
        </div>
      );
    }
    if (tab === "Valuation") {
      const p = d.profile?.[0], r = d.ratios?.[0], k = d.km?.[0];
      if (!p && !r && !k) return null;
      const range = p?.range ? String(p.range).split("-") : null;
      return (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
          <Card label="Market Cap" value={fmtBig(p?.mktCap)} />
          <Card label="P/E Ratio (TTM)" value={fmtX(r?.peRatioTTM)} />
          <Card label="PEG Ratio" value={r?.pegRatioTTM != null ? r.pegRatioTTM.toFixed(2) : "—"} />
          <Card label="P/S Ratio" value={fmtX(r?.priceToSalesRatioTTM)} />
          <Card label="P/B Ratio" value={fmtX(r?.priceToBookRatioTTM)} />
          <Card label="EV / EBITDA" value={fmtX(k?.enterpriseValueOverEBITDATTM)} />
          <Card label="EV / Revenue" value={fmtX(k?.evToSalesTTM)} />
          <Card label="Price / FCF" value={fmtX(r?.priceToFreeCashFlowsRatioTTM)} />
          <Card label="Enterprise Value" value={fmtBig(k?.enterpriseValueTTM)} />
          <Card label="Beta" value={p?.beta != null ? Number(p.beta).toFixed(2) : "—"} />
          <Card label="52W High" value={range ? `$${range[1]}` : "—"} />
          <Card label="52W Low" value={range ? `$${range[0]}` : "—"} />
        </div>
      );
    }
    if (tab === "Financials") {
      const inc: any[] = d.inc ?? []; if (!inc.length) return null;
      const cols = inc.slice(0, 5);
      const rows: [string, (q: any) => React.ReactNode][] = [
        ["Revenue", q => fmtBig(q.revenue)],
        ["Gross Profit", q => fmtBig(q.grossProfit)],
        ["Operating Income", q => fmtBig(q.operatingIncome)],
        ["Net Income", q => fmtBig(q.netIncome)],
        ["EPS (diluted)", q => q.epsdiluted != null ? `$${Number(q.epsdiluted).toFixed(2)}` : "—"],
      ];
      return (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:"#0F1119", color:"#6B7094" }}>
                {["Metric", ...cols.map(c => c.date ?? c.period)].map((h, i) => (
                  <th key={i} style={{ padding:"8px 12px", textAlign:"left", borderBottom:"1px solid #1E2030", fontWeight:500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, fn], i) => (
                <tr key={i} style={{ background: i % 2 ? "#0D0E14" : "#141824" }}>
                  <td style={{ padding:"7px 12px", color:"#B0B8D0", borderBottom:"1px solid #1E2030" }}>{label}</td>
                  {cols.map((q, j) => (
                    <td key={j} style={{ padding:"7px 12px", color:"#E2E8F0", borderBottom:"1px solid #1E2030" }}>{fn(q)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    if (tab === "Corporate Actions") {
      const divs: any[] = d.div?.historical ?? [];
      const splits: any[] = d.split?.historical ?? [];
      const items = [
        ...divs.slice(0, 6).map(x => ({ type:"Dividend", date:x.date, amount:`$${Number(x.dividend ?? x.adjDividend ?? 0).toFixed(2)}/share`, status:"Paid" })),
        ...splits.slice(0, 6).map(x => ({ type:"Stock Split", date:x.date, amount:`${x.numerator}:${x.denominator}`, status:"Completed" })),
      ].sort((a, b) => (a.date < b.date ? 1 : -1));
      if (!items.length) return null;
      return (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {items.map((a, i) => (
            <div key={i} style={{ background:"#141824", border:"1px solid #1E2030", borderRadius:6, padding:"10px 14px", display:"flex", alignItems:"center", gap:16 }}>
              <span style={{ background:"rgba(79,163,224,0.15)", color:"#4FA3E0", padding:"2px 8px", borderRadius:4, fontSize:10, fontWeight:600, minWidth:90, textAlign:"center" }}>{a.type}</span>
              <span style={{ color:"#B0B8D0", fontSize:12, minWidth:90 }}>{a.date}</span>
              <span style={{ color:"#E2E8F0", fontSize:12, flex:1 }}>{a.amount}</span>
              <span style={{ color:"#6B7094", fontSize:11 }}>{a.status}</span>
            </div>
          ))}
        </div>
      );
    }
    if (tab === "Shareholders") {
      const holders: any[] = d.inst ?? []; if (!holders.length) return null;
      const top = holders.slice(0, 12);
      return (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {top.map((h, i) => (
            <div key={i} style={{ background:"#141824", border:"1px solid #1E2030", borderRadius:6, padding:"8px 14px", display:"grid", gridTemplateColumns:"1fr auto auto", gap:16, alignItems:"center" }}>
              <span style={{ color:"#E2E8F0", fontSize:12 }}>{h.holder}</span>
              <span style={{ color:"#B0B8D0", fontSize:12 }}>{fmtShares(h.shares)} shares</span>
              <span style={{ color: (h.change ?? 0) >= 0 ? "#00C076" : "#FF4D67", fontSize:12 }}>{h.change != null ? `${h.change >= 0 ? "+" : ""}${fmtShares(h.change)}` : "—"}</span>
            </div>
          ))}
        </div>
      );
    }
    if (tab === "ETFs") {
      const p = d.profile?.[0];
      const etf = Array.isArray(d.etf) ? d.etf[0] : d.etf;
      if (!p?.isEtf && !etf) return null; // not an ETF → honest unavailable
      return (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
          <Card label="Fund Name" value={etf?.name ?? p?.companyName ?? "—"} />
          <Card label="Expense Ratio" value={etf?.expenseRatio != null ? `${(etf.expenseRatio * 100).toFixed(2)}%` : "—"} />
          <Card label="AUM" value={fmtBig(etf?.aum ?? p?.mktCap)} />
          <Card label="Avg Volume" value={p?.volAvg ? Number(p.volAvg).toLocaleString() : "—"} />
          <Card label="NAV" value={etf?.nav != null ? `$${etf.nav}` : (p?.price != null ? `$${p.price}` : "—")} />
          <Card label="Holdings Count" value={etf?.holdingsCount ?? "—"} />
          <Card label="Asset Class" value={etf?.assetClass ?? "—"} />
          <Card label="Domicile" value={etf?.domicile ?? p?.country ?? "—"} />
        </div>
      );
    }
    return null;
  }

  const body = loading ? null : renderTab();

  return (
    <div style={{ flex:1, overflow:"auto", background:"#0D0E14", padding:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
        <button onClick={onBack} style={{ background:"#141824", border:"1px solid #1E2030", borderRadius:6, padding:"4px 12px", fontSize:11, color:"#8B8FA8", cursor:"pointer" }}>
          ← Back to Chart
        </button>
        <span style={{ fontSize:14, fontWeight:700, color:"#E2E8F0" }}>{base} — {tab}</span>
      </div>
      {loading ? (
        <div style={{ color:"#6B7094", fontSize:13, padding:"24px 4px" }}>Loading {tab.toLowerCase()} data…</div>
      ) : (body && hasData) ? body : providerEdge ? (
        // Truth-in-name: FMP responded 503 with the NOT CONFIGURED
        // contract — name the exact missing env var so a founder can
        // paste it in host secrets and unblock every fundamentals view.
        <div style={{ background:"#1a1410", border:"1px solid #5b3a12", borderRadius:8, padding:"20px 18px", maxWidth:640 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#f4c86b", marginBottom:6, letterSpacing:0.4, textTransform:"uppercase" }}>
            Fundamentals provider — {providerEdge.edge}
          </div>
          <p style={{ fontSize:12, color:"#d6ceb8", lineHeight:1.6, margin:"0 0 10px 0" }}>
            The Financial Modeling Prep (FMP) fundamentals provider is not configured on
            the current host runtime, so {tab.toLowerCase()} for <strong>{base}</strong> cannot
            be loaded. This panel shows real data only — it will never fabricate placeholder
            figures.
          </p>
          <div style={{ fontSize:11, color:"#8896BE", lineHeight:1.6 }}>
            Missing host secret{providerEdge.missing.length === 1 ? "" : "s"}:
            {" "}
            {providerEdge.missing.map((m, i) => (
              <code key={m} style={{ background:"#0b0b0d", border:"1px solid #333", padding:"1px 6px", borderRadius:3, marginRight:4, color:"#f4c86b" }}>{m}{i < providerEdge.missing.length - 1 ? "" : ""}</code>
            ))}
          </div>
          <div style={{ fontSize:11, color:"#6B7094", lineHeight:1.6, marginTop:8 }}>
            Set it in Cloudflare Worker environment variables and this panel will populate real data.
          </div>
        </div>
      ) : (
        <div style={{ background:"#141824", border:"1px solid #1E2030", borderRadius:8, padding:"20px 18px", maxWidth:560 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#E2E8F0", marginBottom:6 }}>No {tab.toLowerCase()} data for {base}</div>
          <p style={{ fontSize:12, color:"#8896BE", lineHeight:1.6, margin:0 }}>
            {canonicalAssetClass(symbol) !== "equity" ? (
              <>
                {base} is classified as <strong>{canonicalAssetClass(symbol)}</strong> — company
                fundamentals (income, ratios, valuation, corporate actions, shareholders) apply to
                equities only. Switch to an equity symbol (e.g. TSLA, AAPL) to see this view.
              </>
            ) : (
              <>
                No {tab.toLowerCase()} coverage returned for {base}. This panel shows real data
                only — the provider is configured but returned no rows for this symbol/tab
                combination. Try a different symbol or tab.
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */
