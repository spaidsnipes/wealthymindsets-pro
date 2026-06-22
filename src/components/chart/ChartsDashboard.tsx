"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { Camera, Activity, BookOpen, ChevronDown, Plus, Bell, Trash2 } from "lucide-react";
import { ChartToolbar } from "./ChartToolbar";
import { MainChart } from "./MainChart";
import { IndicatorSettingsModal } from "./IndicatorSettingsModal";
import { isConfigurable, type IndicatorSettings, type IndicatorParams } from "./indicatorConfig";
import { VolumeProfileLadder } from "./VolumeProfileLadder";
import { DOMPanel } from "./DOMPanel";
import { SmartMoneyPanel } from "@/components/smart-money/SmartMoneyPanel";
import { PnLStatsPanel } from "./PnLStatsPanel";
import { BrokerConnectPanel } from "@/components/broker/BrokerConnectPanel";
import { AlpacaTradingPanel } from "@/components/broker/AlpacaTradingPanel";
import { FootprintControls } from "./FootprintControls";
import { OptionsChain } from "./OptionsChain";
import { FearGreedWidget } from "./FearGreedWidget";
import { CustomIndicatorBuilder } from "@/components/pine/CustomIndicatorBuilder";
import { PineCommunityLibrary } from "@/components/pine/PineCommunityLibrary";
import { DrawingToolsPanel } from "./DrawingToolsPanel";
import { MarkovPanel } from "./MarkovPanel";
import { WMSessionVP } from "./WMSessionVP";
import { WatchlistPanel } from "./WatchlistPanel";
import { AlertsPanel, type PriceAlert } from "./AlertsPanel";
import { ChartSettingsModal, type ChartSettings, DEFAULT_CHART_SETTINGS } from "./ChartSettingsModal";
import { SymbolInfoHeader } from "./SymbolInfoHeader";
import { BarReplayControls, type ReplaySpeed } from "./BarReplayControls";
import { ErrorBoundary, SafePanel } from "@/components/ui/ErrorBoundary";
import { StockInfoPanel } from "./StockInfoPanel";
import { BottomIndexBar } from "./BottomIndexBar";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import type { PineOutput } from "@/lib/pine/types";
import type { OHLCVBar } from "@/lib/pine/types";
import type { DrawingTool } from "./DrawingToolsPanel";
import type { ChartLayout } from "./ChartLayoutManager";

export type FootprintType = "bid-ask" | "delta" | "volume-profile" | "imbalance" | "aggressive-passive" | "big-trades";

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
  const [smartMoneyOpen,  setSmartMoneyOpen]  = useState(false);
  const [pnlOpen,         setPnlOpen]         = useState(false);
  const [brokerOpen,      setBrokerOpen]      = useState(false);
  const [tradeOpen,       setTradeOpen]       = useState(false);
  const [domOpen,         setDomOpen]         = useState(true);
  const [optionsOpen,     setOptionsOpen]     = useState(false);
  const [pineBuilderOpen, setPineBuilderOpen] = useState(false);
  const [footprintType,   setFootprintType]   = useState<FootprintType>(() => lsGet("wm_footprint", "bid-ask") as FootprintType);
  const [footprintEnabled, setFootprintEnabled] = useState<boolean>(() => lsGet("wm_fp_enabled", true) as boolean);
  const [candleType,      setCandleType]      = useState<CandleType>(() => lsGet("wm_candleType", "candles") as CandleType);
  const symbol    = activeSymbol;
  const setSymbol = setActiveSymbol;
  const [timeframe,       setTimeframe]       = useState<string>(() => {
    const stored = lsGet("wm_timeframe", "5m") as string;
    // Reject all sub-minute timeframes — they have no data outside market hours
    const subMinute = ["1t","5t","30t","1s","2s","3s","5s","10s","15s","30s"];
    return subMinute.includes(stored) ? "5m" : stored;
  });
  const [pineOutput,      setPineOutput]      = useState<PineOutput | null>(null);
  const [pineCode,        setPineCode]        = useState<string>("");
  const [chartBars,       setChartBars]       = useState<OHLCVBar[]>([]);
  const [communityOpen,   setCommunityOpen]   = useState(false);
  const [activeTab,       setActiveTab]       = useState("Chart");
  const [infoOpen,        setInfoOpen]        = useState(false); // collapsible right panel
  const [vpDomOpen,       setVpDomOpen]       = useState(true); // VP + DOM collapsible

  // ── Drawing tools ───────────────────────────────────────────
  const [drawingTool,     setDrawingTool]     = useState<DrawingTool>("cursor");
  const [drawingColor,    setDrawingColor]    = useState("#00D4AA");
  const [magnetActive,    setMagnetActive]    = useState(false);
  const [lockActive,      setLockActive]      = useState(false);
  const [drawingsVisible, setDrawingsVisible] = useState(true);
  const [clearTrigger,    setClearTrigger]    = useState(0);

  // ── Indicators / session ────────────────────────────────────
  const [activeInds, setActiveInds] = useState<Set<string>>(() => new Set<string>(lsGet<string[]>("wm_activeInds", [])));
  const [indSettings, setIndSettings] = useState<IndicatorSettings>(() => lsGet<IndicatorSettings>("wm_indSettings", {}));
  const [indSettingsFor, setIndSettingsFor] = useState<string | null>(null); // which indicator's settings modal is open
  const [extHours,   setExtHours]   = useState(false);
  const [sessionVPOpen, setSessionVPOpen] = useState(false);
  const [markovOpen, setMarkovOpen] = useState(false);

  // ── WM VP indicators (draw ON chart canvas) ─────────────────
  const [fixedVPActive,   setFixedVPActive]   = useState(false);
  const [sessionVPChart,  setSessionVPChart]  = useState(false);

  // ── NEW: Watchlist ──────────────────────────────────────────
  const [watchlistOpen, setWatchlistOpen] = useState(true);

  // ── NEW: Alerts ─────────────────────────────────────────────
  const [alertsOpen,   setAlertsOpen]   = useState(false);
  const [alertLevels,  setAlertLevels]  = useState<number[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);

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
    setAlertLevels(alerts.filter(a => !a.triggered).map(a => a.price));
  }, []);

  // ── NEW: Chart settings ─────────────────────────────────────
  const [settingsOpen,   setSettingsOpen]   = useState(false);
  const [chartSettings,  setChartSettings]  = useState<ChartSettings>(DEFAULT_CHART_SETTINGS);

  // ── WM Neon vs Original layout theme ────────────────────────
  const [theme, setTheme] = useState<"original" | "neon">(() => lsGet("wm_theme", "original") as "original" | "neon");
  useEffect(() => { lsSet("wm_theme", theme); }, [theme]);
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
    : chartSettings;

  // ── NEW: Layout ─────────────────────────────────────────────
  const [chartLayout, setChartLayout] = useState<ChartLayout>(() => lsGet("wm_chartLayout", "1") as ChartLayout);

  // ── Persist key state to localStorage ───────────────────────
  useEffect(() => { lsSet("wm_activeInds",   [...activeInds]); },  [activeInds]);
  useEffect(() => { lsSet("wm_indSettings",  indSettings); },      [indSettings]);
  useEffect(() => { lsSet("wm_footprint",    footprintType); },    [footprintType]);
  useEffect(() => { lsSet("wm_fp_enabled", footprintEnabled); }, [footprintEnabled]);
  useEffect(() => { lsSet("wm_candleType",   candleType); },       [candleType]);
  useEffect(() => { lsSet("wm_timeframe",    timeframe); },        [timeframe]);
  useEffect(() => { lsSet("wm_chartLayout",  chartLayout); },      [chartLayout]);

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

  const { ticker } = useWebSocket({ symbol, timeframe });

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

  const handleAddToChart = useCallback((output: PineOutput, code: string) => {
    setPineOutput(output);
    setPineCode(code);
    setPineBuilderOpen(false);
  }, []);

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
    } catch {
      alert("Snapshot saved! (install html2canvas for full support)");
    } finally {
      setSnapping(false);
    }
  }, [symbol, timeframe, snapping]);

  return (
    <div
      className={theme === "neon" ? "wm-neon" : undefined}
      style={{ display:"flex", flexDirection:"column", width:"100%", height:"100%", overflow:"hidden", background: theme === "neon" ? "#02060a" : "#0D0E14" }}
    >
      {theme === "neon" && <div className="wm-neon-scan" />}
      {/* Hidden context tag for SpaidBot to read current chart state */}
      <span
        id="wm-chart-context"
        data-ctx={JSON.stringify({ symbol, price: ticker.price, change: ticker.change, changePct: ticker.changePct })}
        style={{ display: "none" }}
      />
      {/* ── MooMoo-style chart tabs row ──────────────────────── */}
      <div style={{
        height: 40, borderBottom: "1px solid #1E2030", display: "flex", alignItems: "center",
        gap: 0, paddingLeft: 16, background: "#0D0E14", flexShrink: 0, overflowX: "auto",
        scrollbarWidth: "none",
      }}>
        {/* Symbol + live price */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 16, flexShrink: 0 }}>
          <span style={{ color: "#E2E8F0", fontWeight: 700, fontSize: 14 }}>{symbol}</span>
          <span style={{
            color: ticker.changePct >= 0 ? "#00C076" : "#FF4D67",
            fontWeight: 700, fontSize: 13, fontFamily: "monospace",
          }}>
            {ticker.price.toFixed(2)} {ticker.changePct >= 0 ? "↑" : "↓"}
            &nbsp;{ticker.changePct >= 0 ? "+" : ""}{ticker.change.toFixed(2)}
            &nbsp;{ticker.changePct >= 0 ? "+" : ""}{ticker.changePct.toFixed(2)}%
          </span>
        </div>
        {/* Tab bar */}
        {["Chart","Options","ETFs","Financials","Valuation","Corporate Actions","Shareholders","Profile"].map(tab => (
          <button key={tab} onClick={() => {
            setActiveTab(tab);
            if (tab === "Options") setOptionsOpen(true);
          }} style={{
            padding: "0 14px", height: 40,
            color: tab === activeTab ? "#E2E8F0" : "#8B8FA8",
            background: "transparent", border: "none",
            borderBottom: tab === activeTab ? "2px solid #FF8C00" : "2px solid transparent",
            fontSize: 12, fontWeight: tab === activeTab ? 600 : 400, cursor: "pointer",
            whiteSpace: "nowrap", flexShrink: 0,
          }}>{tab}</button>
        ))}

        {/* ── Layout theme toggle (top-right) ── */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, paddingRight: 14, flexShrink: 0 }}>
          <button
            className={`wm-theme-toggle ${theme === "original" ? "is-neon" : ""}`}
            onClick={() => setTheme("original")}
            title="Clean, professional TradingView-style layout"
          >
            ◻ Original
          </button>
          <button
            className={`wm-theme-toggle ${theme === "neon" ? "is-neon" : ""}`}
            onClick={() => setTheme("neon")}
            title="WM Neon — Tron × Matrix × Star Wars aesthetic"
          >
            ⬢ WM Neon
          </button>
        </div>
      </div>

      {/* ── Main row ─────────────────────────────────────────── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0 }}>

        {/* Watchlist (left side, MooMoo places it left of chart) */}
        <WatchlistPanel open={watchlistOpen} onToggle={() => setWatchlistOpen(v => !v)} />

        {/* Center: toolbar + chart area — fullscreen target includes all controls */}
        <div ref={fullscreenRef} style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>

          {/* ── Toolbar ───────────────────────────────────────── */}
          <ChartToolbar
            symbol={symbol}         setSymbol={setSymbol}
            timeframe={timeframe}   setTimeframe={setTimeframe}
            onSmartMoney={() => setSmartMoneyOpen(o => !o)}
            onPnL={() => setTradeOpen(true)}
            onDOM={() => setDomOpen(o => !o)}
            onPineScript={() => setPineBuilderOpen(true)}
            onCommunity={() => setCommunityOpen(true)}
            smartMoneyActive={smartMoneyOpen}
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
          />

          {/* ── Extra controls bar (Footprint, candle type, etc.) ── */}
          <div className="flex items-center justify-between border-b shrink-0"
            style={{ height: 30, background: "#0D0E14", borderColor: "#1E2030" }}>
            <div className="flex items-center">
              {/* Drawing tools dropdown — lives in the secondary toolbar */}
              <div className="flex items-center px-2 border-r border-wm-border/50 h-full" style={{ gap: 4 }}>
                <DrawingToolsPanel
                  activeTool={drawingTool}
                  onToolChange={setDrawingTool}
                  onClearAll={() => setClearTrigger(t => t + 1)}
                  color={drawingColor}
                  onColorChange={setDrawingColor}
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
                onDisable={() => setFootprintEnabled(false)}
                onChange={(t) => {
                  // clicking any mode always enables and switches to that mode
                  setFootprintEnabled(true);
                  setFootprintType(t);
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
              </div>
            </div>

            <div className="flex items-center gap-1 px-2">
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

              <button
                onClick={() => setMarkovOpen(o => !o)}
                className={`flex items-center gap-1 px-2 h-6 rounded text-[12px] font-semibold border transition-all`}
                style={{
                  background: markovOpen ? "rgba(139,92,246,0.15)" : "#131520",
                  borderColor: markovOpen ? "rgba(139,92,246,0.4)" : "#1E2030",
                  color: markovOpen ? "#8B5CF6" : "#8B8FA8",
                }}
                title="Markov Regime Panel"
              >
                <Activity size={10} /> Markov
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
          </div>

          {/* ── Non-Chart tab panels ──────────────────────────── */}
          {activeTab !== "Chart" && activeTab !== "Options" && (
            <FundamentalsTabPanel symbol={symbol} tab={activeTab} onBack={() => setActiveTab("Chart")} />
          )}

          {/* ── Chart area ─────────────────────────── */}
          <div style={{ flex:1, overflow:"hidden", minHeight:0, display: (activeTab === "Chart" || activeTab === "Options") ? "flex" : "none" }}>

            {/* Chart + VP ladder (snapshot target) */}
            <div ref={chartWrapRef} style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0, position:"relative" }}>
              <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
                <div style={{
                  flex: 1, display:"flex", overflow:"hidden",
                  ...(chartLayout === "2h" ? { flexDirection: "row" } :
                      chartLayout === "2v" ? { flexDirection: "column" } :
                      chartLayout === "4"  ? { flexDirection: "row", flexWrap: "wrap" as const } :
                      {}),
                }}>
                  <div style={{ flex: 1, display:"flex", overflow:"hidden", minWidth:0, minHeight:0,
                    ...(chartLayout === "4" ? { width: "50%", flexShrink: 0 } : {}),
                  }}>
                    <ErrorBoundary>
                    <MainChart
                      symbol={symbol}
                      timeframe={timeframe}
                      footprintType={footprintType}
                      footprintEnabled={footprintEnabled}
                      candleType={candleType}
                      pineOutput={pineOutput}
                      onBarsReady={handleBarsReady}
                      drawingTool={drawingTool}
                      drawingColor={drawingColor}
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
                        footprintEnabled={footprintEnabled}
                        candleType={candleType}
                        chartSettings={effChartSettings}
                      />
                    </div>
                  )}

                  {chartLayout === "4" && (
                    <>
                      <div style={{ width:"50%", flexShrink:0, borderTop:"1px solid #1E2030", display:"flex", overflow:"hidden", minHeight:0 }}>
                        <MainChart symbol={symbol} timeframe="5m" footprintType={footprintType} footprintEnabled={footprintEnabled} candleType={candleType} chartSettings={effChartSettings} />
                      </div>
                      <div style={{ width:"50%", flexShrink:0, borderTop:"1px solid #1E2030", borderLeft:"1px solid #1E2030", display:"flex", overflow:"hidden", minHeight:0 }}>
                        <MainChart symbol={symbol} timeframe="15m" footprintType={footprintType} footprintEnabled={footprintEnabled} candleType={candleType} chartSettings={effChartSettings} />
                      </div>
                    </>
                  )}
                </div>

                {/* VP + DOM collapsible right panel */}
                {vpDomOpen && (
                  <>
                    <VolumeProfileLadder symbol={symbol} />

                    {/* ── Collapse strip between VP and DOM ── */}
                    <button
                      onClick={() => setDomOpen(v => !v)}
                      title={domOpen ? "Collapse DOM ladder" : "Expand DOM ladder"}
                      style={{
                        width: 14, flexShrink: 0,
                        background: "#0A0B10",
                        borderLeft: "1px solid #1E2030",
                        borderRight: "1px solid #1E2030",
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        cursor: "pointer", gap: 3,
                      }}
                    >
                      <span style={{
                        fontSize: 10,
                        color: domOpen ? "#4A5070" : "#4FA3E0",
                        transform: domOpen ? "rotate(180deg)" : "none",
                        transition: "transform 0.2s",
                        lineHeight: 1,
                      }}>›</span>
                      <span style={{
                        fontSize: 6, color: "#4A5070", letterSpacing: 0.4,
                        writingMode: "vertical-rl", textOrientation: "mixed",
                        textTransform: "uppercase", fontWeight: 700,
                      }}>DOM</span>
                    </button>

                    {domOpen && <DOMPanel symbol={symbol} />}
                  </>
                )}
                {/* VP+DOM outer collapse toggle */}
                <button
                  onClick={() => setVpDomOpen(v => !v)}
                  title={vpDomOpen ? "Collapse VP & DOM panel" : "Expand VP & DOM panel"}
                  style={{
                    width: 20, flexShrink: 0,
                    background: "#0D0E14",
                    borderLeft: "1px solid #1E2030",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                    gap: 4,
                  }}
                >
                  <span style={{
                    fontSize: 11, color: vpDomOpen ? "#4A5070" : "#4FA3E0",
                    display: "block",
                    transform: vpDomOpen ? "none" : "rotate(180deg)",
                    transition: "transform 0.2s",
                  }}>›</span>
                  <span style={{
                    fontSize: 7, color: "#4A5070", letterSpacing: 0.5,
                    writingMode: "vertical-rl", textOrientation: "mixed",
                    textTransform: "uppercase", fontWeight: 700,
                  }}>VP / DOM</span>
                </button>
              </div>

              {sessionVPOpen && (
                <WMSessionVP symbol={symbol} timeframe={timeframe} onClose={() => setSessionVPOpen(false)} />
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

            {/* Markov panel */}
            <AnimatePresence>
              {markovOpen && <MarkovPanel symbol={symbol} onClose={() => setMarkovOpen(false)} />}
            </AnimatePresence>

            {/* DOM panel is now inside VP+DOM collapsible block above */}

            {/* Options chain */}
            <AnimatePresence>
              {optionsOpen && (
                <OptionsChain symbol={symbol} price={ticker.price} onClose={() => setOptionsOpen(false)} />
              )}
            </AnimatePresence>

            {/* Smart Money panel */}
            {smartMoneyOpen && (
              <SmartMoneyPanel onClose={() => setSmartMoneyOpen(false)} symbol={symbol} />
            )}
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
      {brokerOpen && <BrokerConnectPanel onClose={() => setBrokerOpen(false)} />}
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

/* ── Fundamentals / Info Tab Panel ──────────────────────────────────────── */
function FundamentalsTabPanel({ symbol, tab, onBack }: { symbol: string; tab: string; onBack: () => void }) {
  const base = symbol.toUpperCase();

  const sections: Record<string, React.ReactNode> = {
    "ETFs": (
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
        {[
          { label:"Fund Type", value:"Exchange Traded Fund" },
          { label:"Inception Date", value:"Jan 22, 1993" },
          { label:"AUM", value:"$432.5B" },
          { label:"Expense Ratio", value:"0.0945%" },
          { label:"Avg Volume (30d)", value:"82.4M" },
          { label:"NAV", value:"$587.32" },
          { label:"Premium/Discount", value:"+0.02%" },
          { label:"Holdings Count", value:"503" },
          { label:"Dividend Yield", value:"1.24%" },
          { label:"Ex-Dividend Date", value:"Mar 21, 2025" },
          { label:"Beta (5Y)", value:"1.00" },
          { label:"Index Tracked", value:"S&P 500" },
        ].map(r => (
          <div key={r.label} style={{ background:"#141824", border:"1px solid #1E2030", borderRadius:6, padding:"10px 12px" }}>
            <div style={{ fontSize:10, color:"#6B7094", marginBottom:2 }}>{r.label}</div>
            <div style={{ fontSize:13, fontWeight:600, color:"#E2E8F0" }}>{r.value}</div>
          </div>
        ))}
      </div>
    ),
    "Financials": (
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr style={{ background:"#0F1119", color:"#6B7094" }}>
              {["Metric","Q4 2024","Q3 2024","Q2 2024","Q1 2024","FY 2023"].map(h => (
                <th key={h} style={{ padding:"8px 12px", textAlign:"left", borderBottom:"1px solid #1E2030", fontWeight:500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["Revenue","$124.3B","$118.4B","$112.2B","$106.7B","$439.0B"],
              ["Gross Profit","$71.4B","$68.2B","$64.8B","$61.3B","$253.1B"],
              ["Operating Income","$48.6B","$46.1B","$43.4B","$40.7B","$168.5B"],
              ["Net Income","$38.5B","$36.9B","$34.2B","$31.8B","$134.0B"],
              ["EPS (diluted)","$2.46","$2.34","$2.18","$2.02","$8.53"],
              ["Free Cash Flow","$29.3B","$28.4B","$26.1B","$24.8B","$103.2B"],
            ].map((row, i) => (
              <tr key={i} style={{ background: i % 2 ? "#0D0E14" : "#141824" }}>
                {row.map((cell, j) => (
                  <td key={j} style={{ padding:"7px 12px", color: j === 0 ? "#B0B8D0" : "#E2E8F0", borderBottom:"1px solid #1E2030" }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
    "Valuation": (
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
        {[
          { label:"Market Cap", value:"$3.42T" },
          { label:"P/E Ratio (TTM)", value:"32.8×" },
          { label:"Forward P/E", value:"28.4×" },
          { label:"PEG Ratio", value:"1.62" },
          { label:"P/S Ratio", value:"8.74×" },
          { label:"P/B Ratio", value:"46.2×" },
          { label:"EV / EBITDA", value:"24.6×" },
          { label:"EV / Revenue", value:"9.1×" },
          { label:"Price / FCF", value:"35.4×" },
          { label:"Enterprise Value", value:"$3.36T" },
          { label:"52W High", value:"$260.10" },
          { label:"52W Low", value:"$164.08" },
        ].map(r => (
          <div key={r.label} style={{ background:"#141824", border:"1px solid #1E2030", borderRadius:6, padding:"10px 12px" }}>
            <div style={{ fontSize:10, color:"#6B7094", marginBottom:2 }}>{r.label}</div>
            <div style={{ fontSize:13, fontWeight:600, color:"#E2E8F0" }}>{r.value}</div>
          </div>
        ))}
      </div>
    ),
    "Corporate Actions": (
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {[
          { type:"Dividend", date:"Mar 21, 2025", amount:"$0.25/share", status:"Declared" },
          { type:"Stock Split", date:"Jun 10, 2024", amount:"10:1", status:"Completed" },
          { type:"Buyback", date:"Q1 2025", amount:"$90B authorized", status:"Active" },
          { type:"Dividend", date:"Dec 15, 2024", amount:"$0.25/share", status:"Paid" },
          { type:"Acquisition", date:"Nov 2024", amount:"undisclosed", status:"Completed" },
        ].map((a, i) => (
          <div key={i} style={{ background:"#141824", border:"1px solid #1E2030", borderRadius:6, padding:"10px 14px", display:"flex", alignItems:"center", gap:16 }}>
            <span style={{ background:"rgba(79,163,224,0.15)", color:"#4FA3E0", padding:"2px 8px", borderRadius:4, fontSize:10, fontWeight:600, minWidth:90, textAlign:"center" }}>{a.type}</span>
            <span style={{ color:"#B0B8D0", fontSize:12, minWidth:90 }}>{a.date}</span>
            <span style={{ color:"#E2E8F0", fontSize:12, flex:1 }}>{a.amount}</span>
            <span style={{ color: a.status === "Active" ? "#00C076" : a.status === "Declared" ? "#F0B429" : "#6B7094", fontSize:11 }}>{a.status}</span>
          </div>
        ))}
      </div>
    ),
    "Shareholders": (
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:8 }}>
          {[
            { label:"Institutional Ownership", value:"58.4%" },
            { label:"Insider Ownership", value:"0.02%" },
            { label:"Short Float", value:"0.71%" },
          ].map(r => (
            <div key={r.label} style={{ background:"#141824", border:"1px solid #1E2030", borderRadius:6, padding:"10px 12px" }}>
              <div style={{ fontSize:10, color:"#6B7094", marginBottom:2 }}>{r.label}</div>
              <div style={{ fontSize:16, fontWeight:700, color:"#E2E8F0" }}>{r.value}</div>
            </div>
          ))}
        </div>
        {[
          { name:"Vanguard Group", shares:"1.28B", pct:"8.46%", change:"+0.3%" },
          { name:"BlackRock Inc.", shares:"1.14B", pct:"7.55%", change:"+0.1%" },
          { name:"Berkshire Hathaway", shares:"915M", pct:"6.05%", change:"0.0%" },
          { name:"State Street Corp.", shares:"576M", pct:"3.81%", change:"-0.2%" },
          { name:"Fidelity Investments", shares:"312M", pct:"2.06%", change:"+0.5%" },
          { name:"JP Morgan Asset Mgmt", shares:"287M", pct:"1.90%", change:"+0.1%" },
        ].map((h, i) => (
          <div key={i} style={{ background:"#141824", border:"1px solid #1E2030", borderRadius:6, padding:"8px 14px", display:"grid", gridTemplateColumns:"1fr auto auto auto", gap:16, alignItems:"center" }}>
            <span style={{ color:"#E2E8F0", fontSize:12 }}>{h.name}</span>
            <span style={{ color:"#B0B8D0", fontSize:12 }}>{h.shares} shares</span>
            <span style={{ color:"#8B5CF6", fontSize:12, fontWeight:600 }}>{h.pct}</span>
            <span style={{ color: h.change.startsWith("+") ? "#00C076" : h.change === "0.0%" ? "#6B7094" : "#FF4D67", fontSize:12 }}>{h.change}</span>
          </div>
        ))}
      </div>
    ),
    "Profile": (
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <div style={{ background:"#141824", border:"1px solid #1E2030", borderRadius:8, padding:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#E2E8F0", marginBottom:8 }}>Company Overview — {base}</div>
          <p style={{ fontSize:12, color:"#B0B8D0", lineHeight:1.7, margin:0 }}>
            {base} is a leading publicly traded company operating across multiple business segments.
            The company delivers products and services to consumers and enterprises globally,
            with significant investments in research, development, and capital markets activity.
            Headquartered in the United States, it ranks among the top holdings of major institutional investors.
          </p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:12 }}>
          {[
            { label:"CEO", value:"Tim Cook" },
            { label:"Founded", value:"1976" },
            { label:"Employees", value:"161,000" },
            { label:"Headquarters", value:"Cupertino, CA" },
            { label:"Sector", value:"Technology" },
            { label:"Industry", value:"Consumer Electronics" },
            { label:"Exchange", value:"NASDAQ" },
            { label:"ISIN", value:"US0378331005" },
          ].map(r => (
            <div key={r.label} style={{ background:"#141824", border:"1px solid #1E2030", borderRadius:6, padding:"10px 12px" }}>
              <div style={{ fontSize:10, color:"#6B7094", marginBottom:2 }}>{r.label}</div>
              <div style={{ fontSize:13, fontWeight:600, color:"#E2E8F0" }}>{r.value}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  };

  return (
    <div style={{ flex:1, overflow:"auto", background:"#0D0E14", padding:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
        <button onClick={onBack} style={{ background:"#141824", border:"1px solid #1E2030", borderRadius:6, padding:"4px 12px", fontSize:11, color:"#8B8FA8", cursor:"pointer" }}>
          ← Back to Chart
        </button>
        <span style={{ fontSize:14, fontWeight:700, color:"#E2E8F0" }}>{base} — {tab}</span>
      </div>
      {sections[tab] ?? (
        <div style={{ color:"#6B7094", fontSize:13 }}>Data for {tab} coming soon.</div>
      )}
    </div>
  );
}

