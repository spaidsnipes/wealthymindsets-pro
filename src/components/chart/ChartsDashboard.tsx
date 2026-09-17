"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { Camera, BookOpen, ChevronDown, Plus, Bell, Trash2, Settings, Target, Activity } from "lucide-react";
import { SmartMoneyPanel } from "@/components/smart-money/SmartMoneyPanel";
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
import { OptionExpressionIntent } from "./OptionExpressionIntent";
import {
  OPTION_CHAIN_FIDELITY,
  OPTION_CHAIN_SOURCE,
  type OptionChainFidelity,
  type OptionChainSource,
  type OptionContract,
} from "@/lib/optionContractResponse";
import type { OptionContractObservationTiming } from "@/lib/optionsChainRead";
import { FearGreedWidget } from "./FearGreedWidget";
import { CustomIndicatorBuilder } from "@/components/pine/CustomIndicatorBuilder";
import { PineCommunityLibrary } from "@/components/pine/PineCommunityLibrary";
import { DrawingToolsPanel, DEFAULT_DRAWING_STYLE, type DrawingStyle } from "./DrawingToolsPanel";
import { LeftDrawingSidebar } from "./LeftDrawingSidebar";
import { WatchlistPanel } from "./WatchlistPanel";
import { AlertsPanel, type PriceAlert } from "./AlertsPanel";
import { ChartSettingsModal, type ChartSettings, DEFAULT_CHART_SETTINGS } from "./ChartSettingsModal";
import { SymbolInfoHeader } from "./SymbolInfoHeader";
// PRICE_UNAVAILABLE_TITLE is deliberately NOT imported here any more. The price
// slot's disclosure now comes from chartHeaderPriceFact, which says strictly
// more (it can name a verified bar close instead of admitting an absence).
// Leaving the import in place kept a truth Sentinel passing on a DEAD IMPORT —
// see the FIFTH FINDING in chartHeaderChangeTruth.test.ts.
//
// CHANGE_UNAVAILABLE_TEXT and CHANGE_UNAVAILABLE_TITLE have now gone the same
// way, for the same reason and one commit later: chartHeaderChangeFact can
// name a bar-over-bar move from the loaded candles, so this surface no longer
// decides for itself that the change is unavailable. It still RENDERS that
// exact sentence — the module returns it verbatim on its NONE arm — which is
// the point. The dead-import Sentinel caught this leftover on the first run
// after the wire-up, which is precisely the drift it was written to see.
import { chartHeaderPriceFact, type HeaderPriceKind } from "@/lib/marketData/chartHeaderPriceFact";
import { deriveLastBarClose, deriveBarOverBarChange } from "@/lib/marketData/deriveLastBarClose";
import { chartHeaderChangeFact, type HeaderChangeKind } from "@/lib/marketData/chartHeaderChangeFact";

/* Colour and weight come from a DECLARED PROVENANCE, never from "is a number
   present". A bar close rendered like a live quote is a fabricated freshness
   claim — see chartHeaderPriceFact. */
const HEADER_PRICE_STYLE: Record<HeaderPriceKind, { color: string; weight: number }> = {
  LIVE_QUOTE: { color: "#E2E8F0", weight: 700 },
  BAR_CLOSE: { color: "#A8B0C8", weight: 600 },
  NONE: { color: "#8B92AC", weight: 500 },
  /* AWAITING renders an empty string, so this entry styles nothing. It exists
     because the map is keyed by the kind union and the compiler is the only
     thing that will notice if a future kind arrives without a decision. */
  AWAITING: { color: "#8B92AC", weight: 500 },
};
/* The change slot's sibling table. Colour is a function of DIRECTION but the
   PALETTE is a function of KIND — a bar-over-bar delta gets the muted pair,
   never the full-strength session green/red, so a 15-minute tick can never be
   read at a glance as the day's move. Same reasoning as BAR_CLOSE above: the
   provenance decides the styling, not the mere presence of a number. */
const HEADER_CHANGE_STYLE: Record<
  HeaderChangeKind,
  { color: (d: 1 | 0 | -1 | null) => string; weight: number }
> = {
  SESSION_CHANGE: { color: (d) => (d === 1 ? "#00C076" : d === -1 ? "#FF4D67" : "#8B92AC"), weight: 700 },
  BAR_OVER_BAR: { color: (d) => (d === 1 ? "#5E9E82" : d === -1 ? "#A8707C" : "#8B92AC"), weight: 500 },
  NONE: { color: () => "#8B92AC", weight: 500 },
  /* See HEADER_PRICE_STYLE.AWAITING — empty text, present for exhaustiveness. */
  AWAITING: { color: () => "#8B92AC", weight: 500 },
};
import { BarReplayControls, type ReplaySpeed } from "./BarReplayControls";
import { ErrorBoundary, SafePanel } from "@/components/ui/ErrorBoundary";
import { StockInfoPanel } from "./StockInfoPanel";
import LeftSidebar from "./LeftSidebar";
import { useWebSocket } from "@/hooks/useWebSocket";
import { resolveChartSurfaceBadge } from "@/lib/priceSource";
import { useProvenSessionClosure, useSessionClockDate } from "@/lib/marketData/useProvenSessionClosure";
import { CanonicalFidelityBadge } from "@/components/marketData/CanonicalFidelityBadge";
import { selectPerCapabilityFidelity } from "@/lib/marketData/selectPerCapabilityFidelity";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import { interpretPine } from "@/lib/pine/interpreter";
import type { PineOutput } from "@/lib/pine/types";
import type { OHLCVBar } from "@/lib/pine/types";
import type { DrawingTool } from "./DrawingToolsPanel";
import type { ChartLayout } from "./ChartLayoutManager";
import { normalizeTFId } from "@/lib/timeframes";
import { normalizeMarketSurfaceTimeframe } from "@/lib/routing/marketSurfaceQuery";
import { usePublishChartMarketState } from "@/lib/marketData/chartMarketStatePublisher";
import { canonicalSession, canonicalAssetClass, canonicalMarketStateIdentity, selectCanonicalSessionToken } from "@/lib/marketData/canonicalIdentity";
import { categoryTabsFor, effectiveCategoryTab } from "@/lib/charts/categoryTabsFor";
import { identifiedOptionSpot } from "@/lib/optionsSpotIdentity";
// Micah + Noah 2026-09-02 — /charts joins the Phase 3 Market Canvas.
// Composes the SAME canonical compiler /command-deck already routes through
// (composeMarketCanvasVM via useMarketCanvasVM), rendering the canvas verdict
// in the wordmark row via CanvasSummaryPill. Real data owners only — no
// fake heatmap, no invented confidence — per Living-Pixel Law.
import { useMarketCanvasVM } from "@/lib/marketData/viewModels/useMarketCanvasVM";
import { usePublishOsStanding } from "@/components/os/osStandingContext";
import { standingFromOneStory } from "@/components/os/standingFromOneStory";
import CanvasSummaryPill from "@/components/experience/CanvasSummaryPill";
// WORKSPACE — /charts is the grammar's SECOND room. The layer, the panel and the
// journey hook are the SAME three modules /command-deck mounts; none of them is a
// chart-room variant. See the /charts block in roomEquipment.ts for why the
// equipment id is deliberately identical to the deck's rather than forked.
import RoomEquipmentLayer from "@/components/experience/RoomEquipmentLayer";
import MarketCanvasPanel from "@/components/experience/MarketCanvasPanel";
import { useEquipmentJourney } from "@/lib/workspace/useEquipmentJourney";
import CanvasBadgeMini from "@/components/experience/CanvasBadgeMini";
import { useAuth } from "@/contexts/AuthContext";
// Real aggressor flow still grades the canonical capability state here;
// detailed order-flow inspection belongs to the Smart Money doorway.
import { selectAggressorFlow } from "@/lib/marketData/selectAggressorFlow";
// Asset 14 (Market Object Passport) + Asset 16 (Chart Workspace Object
// Passport) canon: passport lineage / owner / birth / touches /
// invalidation must be integrated into the chart workspace.
import MarketObjectPassportPanel from "@/components/experience/MarketObjectPassportPanel";
import { selectMarketObjectPassport } from "@/lib/marketData/viewModels/selectMarketObjectPassport";
import { useCanonicalMarketState } from "@/lib/marketData/useCanonicalMarketState";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";
// The REGIME chip's truth guard. Observed live 2026-09-05 printing
// "REGIME SIDE -0.34% today" on a closed Saturday session; the classification
// and the period word both live in this one owner now, so a component edit
// cannot reintroduce either untruth. See selectRegimeBadge.ts.
import { selectRegimeBadge } from "@/lib/marketData/selectRegimeBadge";
// Same owner, second consumer: the hidden #wm-chart-context span below is a
// real wire, not a debug attribute. SpaidBotButton parses it and POSTs it to
// /api/spaidbot, where it becomes a factual claim inside the model's prompt.
// It published raw change/changePct, so the zero-pair reached the assistant as
// "(+0.00%)" on a closed Saturday.
import { selectTickerChangeDisplay } from "@/lib/marketData/selectTickerChangeDisplay";
// The ONE owner of "which price fact wins" — print outranks bar close, and a
// close is never emitted unlabelled. Shared with HeroTruth, DecisionSpineBand
// and /command-deck's Spaidbot wire so no two of them can drift apart.
import { selectPriceEvidence } from "@/lib/marketData/formatSpinePrice";
// Asset 07 (Evidence Debt / Question Mode) canon: dedicated
// question-mode surface exposing the decisionWhy compilation.
import DecisionWhyPanel from "@/components/experience/DecisionWhyPanel";
import DecisionSpineBand from "@/components/experience/DecisionSpineBand";
import { birthOnPermissionCrossing } from "@/lib/traderMemory/permissionBirth";
import { thisDeviceId } from "@/lib/traderMemory/deviceIdentity";
import type { PermissionVerdict } from "@/lib/traderMemory/viewModels/selectPermission";
import {
  adoptSceneDecision,
  currentDecisionIdentity,
  type ScopedDecisionIdentity,
} from "@/lib/expressionShortlist";
import { ShellModalDrawer } from "@/components/layout/ShellModalDrawer";
import { useNarrowViewport } from "@/lib/responsive/narrowViewport";

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

export function ChartsDashboard({ initialTimeframe = null }: { initialTimeframe?: string | null } = {}) {
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
  // The persistent Tools doorway owns focus return for every drawer launched
  // from its transient menu, including broker setup and instrument profile.
  const toolsTriggerRef = useRef<HTMLButtonElement>(null);
  const brokerFallbackTriggerRef = useRef<HTMLButtonElement>(null);
  const openBrokerConnect = useCallback((trigger: HTMLButtonElement | null) => {
    brokerFallbackTriggerRef.current = trigger;
    setBrokerOpen(true);
  }, []);
  const [tradeOpen,       setTradeOpen]       = useState(false);
  const [optionSelection, setOptionSelection] = useState<{ underlying: string; owner: string; contract: OptionContract; source: OptionChainSource; fidelity: OptionChainFidelity; providerPath: string | null; rightsPolicyId: string | null } | null>(null);
  const clearOptionSelection = useCallback(() => setOptionSelection(null), []);
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
    const requested = normalizeMarketSurfaceTimeframe(initialTimeframe);
    if (requested) return requested;
    const settings = (() => { try { return JSON.parse(localStorage.getItem("wm_settings") || "{}"); } catch { return {}; } })();
    const defTF = settings.defaultTF as string | undefined;
    let stored = lsGet("wm_timeframe", "5m") as string;
    // Honor a configured Default Timeframe (unless "last"=use last used, "none"=ignore)
    if (defTF && defTF !== "last" && defTF !== "none") stored = defTF;
    // Reject all sub-minute timeframes — they have no data outside market hours
    return normalizeTFId(stored) ?? "5m";
  });
  const seededUrlTimeframe = useRef<string | null>(normalizeMarketSurfaceTimeframe(initialTimeframe));
  useEffect(() => {
    const requested = normalizeMarketSurfaceTimeframe(initialTimeframe);
    if (!requested) {
      seededUrlTimeframe.current = null;
      return;
    }
    if (seededUrlTimeframe.current === requested) return;
    seededUrlTimeframe.current = requested;
    setTimeframe(requested);
  }, [initialTimeframe]);
  const [pineOutput,      setPineOutput]      = useState<PineOutput | null>(null);
  const [pineCode,        setPineCode]        = useState<string>("");
  const [chartBars,       setChartBars]       = useState<OHLCVBar[]>([]);
  const [communityOpen,   setCommunityOpen]   = useState(false);
  const [requestedTab,    setActiveTab]       = useState("Chart");
  const assetClass = canonicalAssetClass(symbol);
  const activeTab = effectiveCategoryTab(assetClass, requestedTab);
  const optionsOpen = activeTab === "Options";
  // Founder 2026-09-02: category tabs are filtered per asset class,
  // so switching from an equity (Financials selected) to crypto/futures
  // would strand the user on a tab that no longer exists in the strip.
  // Snap back to Chart whenever the current tab is not valid for the
  // new asset class. Pure state reset — no data fetches triggered.
  useEffect(() => {
    if (requestedTab !== activeTab) {
      clearOptionSelection();
      setActiveTab("Chart");
    }
  }, [requestedTab, activeTab, clearOptionSelection]);
  const [infoOpen,        setInfoOpen]        = useState(false); // collapsible right panel
  const [vpDomOpen,       setVpDomOpen]       = useState(false); // Open only when the trader asks for depth
  const [studyToolsOpen,  setStudyToolsOpen]  = useState(false); // Advanced controls stay quiet until requested

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
  // Show open paper-trade positions as horizontal entry lines w/ live P&L on the chart.
  const [paperTradesOn, setPaperTradesOn] = useState(true);
  // Smart Money read-out panel (real order-flow signals; honest N/A for feeds we lack).
  const [smartMoneyOpen, setSmartMoneyOpen] = useState(false);

  // ── WM VP indicators (draw ON chart canvas) ─────────────────
  const [fixedVPActive,   setFixedVPActive]   = useState<boolean>(() => lsGet("wm_fixedVP", false) as boolean);
  const [sessionVPChart,  setSessionVPChart]  = useState<boolean>(() => lsGet("wm_sessionVP", false) as boolean);

  // ── NEW: Watchlist ──────────────────────────────────────────
  // Keep price action as the dominant canvas. Drawer visibility is deliberately
  // ephemeral: restoring the old rail-open preference would auto-open a modal,
  // move focus, and obscure MARKET before a fresh user action. Named lists and
  // grid/list choice keep their own canonical persistence inside the panel.
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  // Moomoo-style grid view (mini-chart cards) vs single chart
  const [gridView, setGridView] = useState(false);
  const [gridRefresh, setGridRefresh] = useState(0);

  // ── NEW: Alerts ─────────────────────────────────────────────
  const [alertsOpen,   setAlertsOpen]   = useState(false);
  const [allAlerts,    setAllAlerts]    = useState<PriceAlert[]>([]);
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

  const { ticker, recentTicks, source, connected, lastObservedAtMs } = useWebSocket({ symbol, timeframe });
  // The hook clears ticker state after a symbol transition. Retain the symbol
  // that actually owns the current render's ticker until that clear lands, so
  // the next Options request can never inherit the prior underlying's spot.
  const [tickerOwner, setTickerOwner] = useState(symbol);
  useEffect(() => {
    if (ticker.price === 0) setTickerOwner(symbol);
  }, [symbol, ticker.price]);
  const optionSpot = identifiedOptionSpot(symbol, tickerOwner, ticker.price);
  // Canon "CLOSED IS NOT DELAYED" — a proven-closed session outranks the
  // provider verdict, so the /charts chrome cannot print ACTIVE DEGRADED on a
  // Saturday. `null` until mount and on every weekday, so provider labelling
  // is untouched the rest of the time.
  const sessionOpen = useProvenSessionClosure(symbol);
  // Read at component level, never inside the REGIME chip's render callback —
  // a hook called from inside JSX is the React #310 defect. `null` until mount,
  // which is exactly what selectRegimeBadge treats as "no period word yet".
  const sessionClockDate = useSessionClockDate();
  usePublishChartMarketState({
    symbol,
    timeframe,
    // Route through the canonical helper so the session enum comes from a
    // single deterministic source shared with every reader (see b46fa64).
    // Asset class decides: a continuous (crypto) market is 24X7, never RTH.
    session: canonicalSession(extHours, canonicalAssetClass(symbol)),
    ticker,
    recentTicks,
    source,
    connected,
    // The candles MainChart actually loaded, so canonical state can publish a
    // last BAR CLOSE under its own provenance. Without this the MARKET tile
    // read PRICE UNKNOWN while the chart header a few pixels away rendered
    // that very close beside HISTORICAL BARS VERIFIED — two owners for one
    // instrument at one moment. `chartBars` is cleared on every symbol and
    // timeframe change, so symbol A's close can never be attributed to B.
    bars: chartBars,
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

  /*
    ONE OS — the frame is never LESS confident than the room inside it.

    Measured live before this call existed: the /charts room rendered
    "DECISION … WAIT", "9 unpaid evidence nodes" and "Right-of-way is withheld"
    while the masthead above it read "EVIDENCE DEBT UNKNOWN / no ledger
    compiled" and "RIGHT OF WAY UNKNOWN / no permission reading". False
    humility is the mirror of an overclaim, not a safe default: the same screen
    answered its own question twice, in two different voices.

    The room already holds the compiled answer — `chartCanvasVM.oneStory` is the
    exact same compiler output the deck publishes from. It simply never handed
    it up. The derivation itself is NOT written here; `standingFromOneStory` is
    its one owner, shared with the deck.
  */
  /*
    THE FEED OBSERVATION. Until now this call published a surface and a Right of
    Way and no `feed`, so the masthead badge read FEED UNKNOWN on the primary
    trading surface — above a chart with candles, beside a fidelity chip already
    naming the provider, over a price that was visibly moving. The OS was at its
    least certain exactly where the trader was at their most engaged.

    Every value below was already on this page. None of it is derived here:
    `source` and `connected` come from the transport, `lastObservedAtMs` from
    the hook's accept sites, `sessionOpen` from the proven-closure calendar.
    This publishes EVIDENCE. `priceSourceBadge` remains the sole grader of it —
    see compileFeedStanding.
  */
  usePublishOsStanding({
    surface: "Instrument View",
    ...standingFromOneStory(chartCanvasVM.oneStory),
    feed: {
      // "unavailable" is the hook's word for "no provider answered", which is
      // an absent source and not a provider named unavailable. Passing it
      // through would ask the badge to grade a vendor that does not exist.
      source: source === "unavailable" ? null : source,
      // Same predicate the chart's own fidelity chip uses one screen below, so
      // the two cannot disagree about whether a price arrived.
      quotePresent: Number.isFinite(ticker.price) && ticker.price > 0,
      // THE BAR RECEIPT, which this component has held all along and never
      // handed up: the very same `chartBars.length > 0` it passes to
      // `resolveChartSurfaceBadge` below to light HISTORICAL BARS VERIFIED.
      // Measured live 2026-09-17 with it missing, /charts wore FEED UNKNOWN in
      // the masthead and SOURCE UNKNOWN in the footer over 400 rendered
      // candles that a chip inches away already certified.
      barsPresent: chartBars.length > 0,
      lastObservedAtMs,
      connected,
      sessionOpen,
    },
  });
  // Real signal derivation: when the tape carries live per-trade
  // ticks with sides, the aggressor-flow selector's hasFlow is true.
  // Feed this into the capability report so the fidelity chip lights
  // the ORDER FLOW capability (canon §Provider Status Per Capability).
  const chartFlowSnap = React.useMemo(
    () => selectAggressorFlow(recentTicks, ticker.price),
    [recentTicks, ticker.price],
  );

  // Asset 14/16 canon: Market Object Passport (lineage, owner, birth,
  // touches, invalidation, provenance) integrated into the chart
  // workspace. Same selector /command-deck already routes through.
  // Toggle state is device-local; not owner-scoped (view preference).
  const chartCanvasState = useCanonicalMarketState(canvasIdentity);
  const chartPassportVM = React.useMemo(
    () => selectMarketObjectPassport(chartCanvasState),
    [chartCanvasState],
  );
  // Asset 07 canon — Evidence Debt / Question Mode toggle.
  const [whyOpen, setWhyOpen] = useState(false);
  const whyTriggerRef = useRef<HTMLButtonElement>(null);
  const openWhyFrom = (trigger: HTMLButtonElement) => {
    whyTriggerRef.current = trigger;
    setWhyOpen(true);
  };

  // ── DECISION_ID on the primary surface ──────────────────────────
  // Until now the ONLY production mint was EXPLICIT_INTENT, inside
  // OptionExpressionIntent. The identity owner names a second lawful
  // birth — PERMISSION_GRANTED — and nothing in src/ had ever called
  // it, so a trader who never opened an option chain had no decision
  // identity at all and nothing downstream could say "the SAME
  // decision, later."
  //
  // The judgement about what counts as a grant does NOT live here.
  // `permissionBirth` owns it, pure and tested, precisely because a
  // surface that mints whenever it sees ALLOWED would mint every
  // render — "the exact opposite of identity" in the owner's words.
  // This effect only supplies the clock, the witness, and the nonce,
  // all of which the pure module refuses to read for itself.
  const permissionVerdict: PermissionVerdict =
    chartCanvasVM.permission?.verdict ?? "UNKNOWN";
  const priorPermission = useRef<PermissionVerdict | null>(null);
  // The whole identity, not just its id — `OptionExpressionIntent` needs the
  // witnessing device too, so that adopting this decision preserves WHERE it
  // was born rather than re-stamping it with wherever it was later expressed.
  const decisionScope = { underlying: symbol, owner: canvasUser?.id ?? "signed-out" };
  const [sceneDecision, setSceneDecision] = useState<ScopedDecisionIdentity | null>(null);
  // Scope synchronously during render. The cleanup effect below releases stale
  // state, but it cannot prevent one React paint after a symbol/owner switch.
  const currentSceneDecision = currentDecisionIdentity(sceneDecision, decisionScope);

  /*
    WORKSPACE — the equipment journey for THIS room.

    Placed here and not beside `chartMarketCanvas` for one reason: the journey
    captures a decision identity at OPEN and never recomputes it, and
    `currentSceneDecision` is the line directly above. A journey that opened
    before the room knew which decision it was standing in would carry `null`
    forever and the equipment would name no object at all.

    The hook is the whole room-side implementation — subscribe to the rail,
    refuse ids this room does not have, cold-open from the URL, reflect the
    journey back into the URL, announce the stage, restore the room's scroll on
    RETURN. /command-deck ran ~55 inline lines of exactly this until /charts
    made a second copy inevitable; see useEquipmentJourney's header for the two
    ways the copies were measured to drift.
  */
  const {
    journey: chartEquipment,
    onExpand: onChartEquipmentExpand,
    onEnter: onChartEquipmentEnter,
    onReturn: onChartEquipmentReturn,
    onClose: onChartEquipmentClose,
    // The route comes from its owner, never retyped. `founderLanding.ts` is the
    // single writer of this path and a Sentinel enforces it repo-wide — a
    // private "/charts" here would make the room's equipment silently
    // unreachable the day the route moves.
  } = useEquipmentJourney(INSTRUMENT_VIEW_ROUTE, currentSceneDecision?.decisionId ?? null);

  /*
    THE ROOM'S FIRST PIECE OF EQUIPMENT — and deliberately not a new invention.

    `chartMarketCanvas` is the object the CanvasSummaryPill in the wordmark row
    already renders. The pill can only ever say the VERDICT; this is the first
    time /charts can show the trader WHY. Building it from the same memo is what
    keeps the pill and the equipment from ever disagreeing — a second
    `useMarketCanvasVM` call here would be the "second semantic brain" the
    grammar bans, just one that happened to agree most of the time.

    Every field mirrors the deck's `marketRealityEquipment` because it IS the
    same equipment, picked up in a different room. The title matches the rail's
    label exactly; a Sentinel pins that so a trader cannot press one name and
    land on another.
  */
  const chartMarketRealityEquipment = React.useMemo(
    () => ({
      equipmentId: "market-reality",
      title: "Market reality",
      verdict: chartMarketCanvas.verdict,
      headline: chartMarketCanvas.headline,
      counts: [
        { testId: "equipment-count-resolved", label: `${chartMarketCanvas.resolved.length} resolved` },
        { testId: "equipment-count-missing", label: `${chartMarketCanvas.missing.length} missing` },
        { testId: "equipment-count-blockers", label: `${chartMarketCanvas.blockerCount} blocking` },
      ],
      renderDepth: (unabridged: boolean) => (
        <MarketCanvasPanel vm={chartMarketCanvas} unabridged={unabridged} />
      ),
    }),
    [chartMarketCanvas],
  );

  /*
    THE ROOM'S SECOND TENANT — and the first door this room has ever had to it.

    `chartPassportVM` (memoised far above, off `chartCanvasState`) was already
    compiled on every render. Its ONLY reachable path was a `<details>` nested
    inside the Decision Why modal drawer, behind a trigger gated on
    `narrowViewport || optionsOpen` — which means on a desktop Chart tab there
    was no path at all. Correct intelligence, zero doors.

    Built from that SAME memo, deliberately. A second `selectMarketObjectPassport`
    call here would let the equipment and the drawer come to disagree about how
    much of the passport is filled in, which is the second-brain failure wearing
    a different panel.

    Same id as the deck's, for the same reason `market-reality` shares one: a
    market object's passport is one object, not one-per-room.
  */
  const chartPassportEquipment = React.useMemo(
    () => ({
      equipmentId: "market-object-passport",
      title: "Market object passport",
      verdict: chartPassportVM.qualityState,
      headline: `Every reading carries its own lineage — ${chartPassportVM.resolvedCount} of ${chartPassportVM.totalCount} objects are sealed with evidence.`,
      counts: [
        {
          testId: "equipment-count-passport-resolved",
          label: `${chartPassportVM.resolvedCount} resolved`,
        },
        {
          testId: "equipment-count-passport-unresolved",
          label: `${chartPassportVM.totalCount - chartPassportVM.resolvedCount} unresolved`,
        },
        { testId: "equipment-count-passport-objects", label: `${chartPassportVM.totalCount} objects` },
      ],
      renderDepth: (unabridged: boolean) => (
        <MarketObjectPassportPanel vm={chartPassportVM} unabridged={unabridged} />
      ),
    }),
    [chartPassportVM],
  );

  /*
    The chooser. The room hands the layer ONE descriptor — the one the rail
    asked for — so the layer never learns that this room has more than one piece
    of equipment, and never has to choose. Choosing is the room's job because
    only the room knows what it compiled.
  */
  const chartEquipmentContent =
    ({
      "market-reality": chartMarketRealityEquipment,
      "market-object-passport": chartPassportEquipment,
    }[chartEquipment.equipmentId ?? ""] ?? chartMarketRealityEquipment);

  const [sceneDecisionAbsence, setSceneDecisionAbsence] = useState(
    "No decision born yet — permission has not crossed.",
  );
  useEffect(() => {
    const prev = priorPermission.current;
    priorPermission.current = permissionVerdict;
    const outcome = birthOnPermissionCrossing({
      prev,
      next: permissionVerdict,
      deviceId: thisDeviceId(),
      nowMs: Date.now(),
      nonce: crypto.randomUUID(),
    });
    if (!outcome.born) return;
    if (!outcome.mint.ok) {
      // The mint refused. Disclosing the refusal is the whole point —
      // an id we were not allowed to create must not become a blank.
      setSceneDecisionAbsence(`Decision not minted: ${outcome.mint.reason}`);
      return;
    }
    const candidate = { ...decisionScope, identity: outcome.mint.identity };
    setSceneDecision((current) => adoptSceneDecision(current, candidate));
  }, [permissionVerdict, decisionScope.owner, decisionScope.underlying]);
  // A decision belongs to the instrument it was born about. Carrying
  // a TSLA identity onto BTC would be the aliasing failure the owner
  // wrote its header against, one surface out.
  useEffect(() => {
    setSceneDecision(null);
    priorPermission.current = null;
    setSceneDecisionAbsence("No decision born yet — permission has not crossed.");
  }, [symbol, canvasUser?.id]);

  // ── Watchlist doorway ───────────────────────────────────────
  // The watchlist is contextual evidence, not a second room. Keep one
  // canonical instance in the shared drawer at every width so an explicitly
  // opened desktop watchlist cannot permanently squeeze MARKET into another
  // dashboard column. One mount also means one quote poll and one stored-list
  // identity across desktop, tablet and phone.
  const narrowViewport = useNarrowViewport();
  const watchlistSheetTriggerRef = useRef<HTMLButtonElement>(null);
  const openWatchlist = useCallback((trigger: HTMLButtonElement | null) => {
    watchlistSheetTriggerRef.current = trigger;
    setWatchlistOpen(true);
  }, []);

  // Drawing and capture are contextual tools at every width. Their canonical
  // components live in drawers instead of permanently framing MARKET with two
  // icon rails; this removes chrome without creating desktop/mobile forks.
  const [drawSheetOpen, setDrawSheetOpen] = useState(false);
  const drawSheetTriggerRef = useRef<HTMLButtonElement>(null);
  const openDrawingTools = useCallback((trigger: HTMLButtonElement | null) => {
    drawSheetTriggerRef.current = trigger;
    setDrawSheetOpen(true);
  }, []);
  // Declared ONCE and spread into the one canonical drawer mount.
  const drawingSidebarProps = {
    activeTool: drawingTool,
    onToolChange: setDrawingTool,
    onClearAll: () => setClearTrigger(t => t + 1),
    style: drawingStyle,
    onStyleChange: patchDrawingStyle,
    magnetActive,
    onMagnetToggle: () => setMagnetActive(v => !v),
    lockActive,
    onLockToggle: () => setLockActive(v => !v),
    visible: drawingsVisible,
    onVisToggle: () => setDrawingsVisible(v => !v),
  };

  // And the same for the seven-control primary rail: measured at 375px it was
  // display:none at 0x0, so publish idea, screenshot, voice note and video
  // note had no door on a phone at all.
  const [toolsSheetOpen, setToolsSheetOpen] = useState(false);
  const captureFallbackTriggerRef = useRef<HTMLButtonElement>(null);
  const openCaptureShare = useCallback((trigger: HTMLButtonElement | null) => {
    captureFallbackTriggerRef.current = trigger;
    setToolsSheetOpen(true);
  }, []);
  const [orientationToolsOpen, setOrientationToolsOpen] = useState(false);
  const orientationToolsRef = useRef<HTMLDivElement>(null);
  const orientationToolsTriggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const closeOrientationTools = (event: MouseEvent) => {
      if (!orientationToolsRef.current?.contains(event.target as Node)) {
        setOrientationToolsOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOrientationTools);
    return () => document.removeEventListener("mousedown", closeOrientationTools);
  }, []);
  // One object feeds the one canonical drawer mount at every width.
  const primarySidebarProps = {
    watchlistOpen,
    onToggleWatchlist: () => setWatchlistOpen(v => !v),
    chartLayout,
    onLayoutChange: setChartLayout,
    captureRef: fullscreenRef,
    symbol,
  };

  // Track day high/low from ticker
  useEffect(() => {
    if (ticker.price > 0) {
      setCurrentPrice(ticker.price);
      setDayHigh(h => ticker.price > h ? ticker.price : h);
      setDayLow(l => (l === 0 || ticker.price < l) ? ticker.price : l);
    }
  }, [ticker.price]);

  /**
   * HAS THE ROOM FINISHED ASKING FOR THIS INSTRUMENT'S BARS?
   *
   * Not "does the room have bars" — `chartBars.length > 0` already answers
   * that, and answering only that is what let four surfaces on this page print
   * absence claims about a request still in flight (see
   * `PriceSourceBadge.availability` for the measured screen).
   *
   * `handleBarsReady` is MainChart's unconditional post-fetch callback: it
   * fires with the bars on success and with an empty array on a dry well, so
   * "it has fired" is exactly "we have finished asking" and is never "we got
   * something". The two facts stay separate all the way to the badge.
   *
   * Reset to `false` by the identity effect below, beside `setChartBars([])` —
   * they are one event (a new instrument is a new question) and separating
   * them is how the flag would eventually go stale on a symbol switch,
   * certifying instrument A's settled request as instrument B's.
   */
  const [barsSettled, setBarsSettled] = useState(false);

  const handleBarsReady = useCallback((bars: OHLCVBar[]) => {
    setBarsSettled(true);
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
    // A new instrument is a NEW QUESTION. Clearing the bars without clearing
    // this flag would leave the previous instrument's "we finished asking"
    // standing over the next instrument's empty chart — the same false
    // certainty, just aimed at a different symbol.
    setBarsSettled(false);
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
      // SSR/hydration placeholder — must match the transparent room the
      // client resolves to, otherwise the first paint is a black flash
      // where the sanctuary should be.
      <div style={{ display:"flex", flexDirection:"column", width:"100%", height:"100%", overflow:"hidden", background:"transparent" }} />
    );
  }

  // One compiled decision spine, projected in two responsive placements.
  // Desktop attaches it directly to MARKET as a right rail; narrow viewports
  // keep the proven horizontal, scrollable band below the chart. The
  // conditions are mutually exclusive, so there is never a second mounted
  // decision surface or a second truth owner.
  const decisionSpineProps = {
    decisionId: currentSceneDecision?.decisionId ?? null,
    decisionIdAbsence: sceneDecisionAbsence,
    // NOW — the moment the decision is being made in. Composed, never
    // computed here: `selectCanonicalSessionToken` is the ONE writer of a
    // compact session chip in this codebase (the phone header reads the same
    // owner), and `sessionClockDate` is the hydration-safe clock already
    // mounted above — reading `new Date()` at render is the mechanism behind
    // five prior React #418 bugs in this repo, so it is not done here either.
    // `at: null` on the server yields the unestablished token honestly.
    now: selectCanonicalSessionToken({ symbol, at: sessionClockDate }),
    market: {
      symbol,
      timeframe,
      quality: chartCanvasState?.qualityState ?? null,
      capturedAt: chartCanvasState?.capturedAt ?? null,
      last: chartCanvasState?.price.last ?? null,
      // The MARKET cell said PRICE UNKNOWN while the chart header rendered the
      // last candle's close. Same instrument, same moment, two owners. This
      // hands the cell the second fact so it can stop understating what WM
      // actually knows — labelled as a bar close, never as a print.
      lastBarClose: chartCanvasState?.lastBar?.close ?? null,
      lastBarTimeframe: chartCanvasState?.lastBar?.timeframe ?? null,
      // UNASKED IS NOT UNKNOWN — the same distinction the header slots above
      // were taught, arriving at the third surface that was printing a finding
      // over a question. Measured on prod at 25ms resolution through a cold
      // mount, 2026-09-17: this cell read PRICE UNKNOWN at t=1111ms and
      // `29563.25 LAST 15m BAR CLOSE` at t=2163ms, off the same request.
      // Nothing new is computed — `barsSettled` was already in this scope.
      barsSettled,
    },
    oneStory: chartCanvasVM.oneStory,
    availableR: chartCanvasVM.chain?.availableR ?? null,
    decisionWhy: chartCanvasVM.decisionWhy,
    expression: optionSelection && optionSelection.underlying === symbol
      ? `${optionSelection.contract.symbol} ${optionSelection.contract.expirationDate} ${optionSelection.contract.strike} ${optionSelection.contract.contractType}`
      : null,
    onOpenWhy: openWhyFrom,
    canvasSummary: (
      <CanvasSummaryPill
        vm={chartMarketCanvas}
        ariaLabel="Chart market canvas summary"
      />
    ),
  };

  return (
    <div
      className={`wm-chart-dashboard${theme === "neon" ? " wm-neon" : ""}`}
      // SCENE_FRAGMENTATION cure (Founder 2026-09-13): default theme
      // used to paint #0D0E14 across the entire /charts route, blocking
      // the sanctuary shell's vignette + grain + WATER-BREATH from
      // reaching a Founder route that lives INSIDE that shell. Neon
      // keeps its opaque black (it is an alternate visual constitution
      // by design). Default is transparent so /charts is the same room
      // /command-deck is.
      style={{ display:"flex", flexDirection:"column", width:"100%", height:"100%", overflow:"hidden", background: theme === "neon" ? "#02060a" : "transparent" }}
    >
      {theme === "neon" && <div className="wm-neon-scan" />}
      {/* Hidden context tag for SpaidBot to read current chart state.
          This is a real wire, not a debug attribute: SpaidBotButton parses it
          and POSTs it to /api/spaidbot, which injects it into the model's
          prompt. It therefore carries the same truth obligation as a rendered
          pixel. It used to publish ticker.change / ticker.changePct raw, so on
          a closed session the assistant was handed "(+0.00%)" as fact — the
          zero-pair absence sentinel laundered into prose that arrives with no
          fidelity badge beside it. The route guards independently; this end
          simply stops emitting a number it cannot back. */}
      <span
        id="wm-chart-context"
        data-ctx={JSON.stringify(
          (() => {
            const chg = selectTickerChangeDisplay(ticker);
            // THE THIRD PRICE OWNER ON THIS PAGE (repaired 2026-09-16).
            // This wire sent `ticker.price` — the raw hook field — while the
            // DecisionSpineBand eleven pixels away read canonical state
            // through `formatSpinePrice`. Two owners, one instrument, one
            // moment: canon Weakness #1, crossing the assistant boundary
            // where it is hardest to notice because the model's answer
            // carries no fidelity badge.
            //
            // `ticker.price` is strictly the WEAKER fact, in two ways this
            // file already documents elsewhere:
            //   · It is ZEROED on an SF-D01 quote refusal, so 0 is an absence
            //     sentinel here exactly as the change/changePct zero-pair is.
            //     Nothing guarded it. (formatChartContextNote drops a
            //     non-positive price, so the model was simply starved.)
            //   · It is blind to `lastBar`, which this very component
            //     publishes from `chartBars` and renders beside HISTORICAL
            //     BARS VERIFIED. The assistant was told "no price" about a
            //     chart that was drawing one.
            //
            // `selectPriceEvidence` is the one owner of WHICH FACT WINS —
            // the same call HeroTruth, DecisionSpineBand and /command-deck's
            // Spaidbot wire make. Provenance rides with the number because
            // an unlabelled close is precisely how a model learns to quote
            // one as a live print.
            const px = selectPriceEvidence(
              chartCanvasState?.price.last,
              chartCanvasState?.lastBar?.close,
              chartCanvasState?.lastBar?.timeframe,
            );
            return {
              symbol,
              // Founder TIMEFRAME LAW (Build Order, 2026-09-12): "Every material
              // thesis/evidence fact carries timeframe... Spaidbot and Thesis
              // must name the timeframe of claims when ambiguity would change
              // meaning. Blending daily regime with 1m response into one
              // unlabeled claim is CROSS_WIRED." The Spaidbot payload used to
              // send symbol+price alone, so a 1H regime claim and a 1m response
              // claim arrived at the model as the same sentence. Timeframe is
              // carried here so the note (formatChartContextNote) can print it.
              timeframe,
              // Founder truth-surface law (2026-09-12): "Minimum directly
              // inspectable: role + asOf + source... Missing role = UNKNOWN."
              // The visible strip now carries all three. The Spaidbot wire was
              // still missing ROLE — the model received a price with no way to
              // know whether it was LIVE, DELAYED, STALE, PROXY, or UNAVAILABLE,
              // so a stale close could be quoted as if it were streaming. Same
              // failure class as the pre-atom-2 timeframe blend, one dimension
              // up. When canonical state has not resolved a quality yet, the
              // note surfaces UNKNOWN — never invented.
              role: chartCanvasState?.qualityState ?? null,
              price: px.value,
              priceProvenance: px.provenance,
              ...(chg.displayable
                ? { change: chg.change, changePct: chg.changePct }
                : {}),
            };
          })(),
        )}
        style={{ display: "none" }}
      />
      {/* Desktop fuses orientation and symbol truth into one threshold so the
          market gains a full row of height. Tablet/phone stack the two proven
          touch-safe rows through `.wm-chart-room-header` media rules. */}
      <div className="wm-chart-room-header">
      {/* ── Chart orientation and decision strip. The global shell owns
             product identity; this row begins with the trader's location and
             keeps the 44px touch target that prevents disclosure controls from
             overlapping the tabs. */}
      <div
        className="wm-chart-orientation-strip"
        style={{
          minHeight: 44,
          borderBottom: "none",
          // Chrome bar → hairline. The gradient painted a 44px opaque
          // band at the top of MARKET, disconnecting the room from the
          // sanctuary header above. Transparent lets the room read as
          // one continuous space; the hairline still delimits controls.
          background: "transparent",
          display: "flex",
          alignItems: "center",
          paddingLeft: 16,
          paddingRight: 16,
          gap: 12,
          flexShrink: 1,
          minWidth: 0,
          // The row carries one decision summary plus disclosure
          // controls. Keep it horizontally safe on narrow screens,
          // but do not turn unresolved internal capabilities into a
          // wall of diagnostic chips.
          overflowX: "auto",
          overflowY: "hidden",
          scrollbarWidth: "none",
        }}
      >
        <div className="wm-chart-orientation-context">
        {/* Founder 2026-09-02: breadcrumb — orientation truth. The user
            can always see WHERE in the OS they are and jump one level
            up. activeTab renders as the terminal segment so switching
            categories updates the crumb without a route change. */}
        <nav
          aria-label="Breadcrumb"
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#6d7288", letterSpacing: 0.2 }}
        >
          <span aria-hidden="true" style={{ color: "#3a3f52" }}>›</span>
          <a
            href={INSTRUMENT_VIEW_ROUTE}
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
        {/*
            TWO CHIPS UNDER ONE NAME. This slot used to mount a SECOND
            <CanvasSummaryPill ariaLabel="Chart market canvas summary" />.
            On exactly the branch that renders it — narrowViewport ||
            optionsOpen — DecisionSpineBand also renders, and it is handed
            `canvasSummary`, which is that same pill with that same label.
            So the PHONE (and the options view) carried two role="status"
            regions with an identical accessible name announcing one fact,
            while the desktop rail carried exactly one. The duplicate was
            invisible to every desktop review, which is why it survived a
            phone-primary mandate.

            The breadcrumb is also the tightest row on the narrowest screen,
            and the pill's counts are only legible via a `title` tooltip a
            touch device never shows. CanvasBadgeMini is the primitive built
            for this exact surface: verdict only, distinct name, no claim it
            cannot render. The full pill keeps sole ownership of the counts,
            in the band, where there is room to read them.

            CanvasBadgeMini is never LOUDER than the pill — its silence rule
            is strictly the stricter of the two — so this cannot introduce a
            verdict on a screen the pill would have left quiet. */}
        {(narrowViewport || optionsOpen) && (
          <div style={{ marginLeft: 4, marginRight: 4, display: "flex", alignItems: "center" }}>
            <CanvasBadgeMini
              vm={chartMarketCanvas}
              ariaLabel="Chart canvas verdict"
            />
          </div>
        )}
        </div>
        {/* Internal depth readiness stays in the broker/capability drawer.
            A missing L2 wire must not occupy permanent chart chrome, and the
            canvas verdict already owns the decision state. */}
        {/* Asset 07 canon — Evidence Debt / Question Mode toggle.
            Silent when there's no decisionWhy compilation yet
            (§Silence Is A Feature). Opens the SAME DecisionWhyPanel
            /command-deck ships so trader sees identical WHY on both. */}
        <div className="wm-chart-orientation-actions">
        {(narrowViewport || optionsOpen) && (chartCanvasVM.decisionWhy || chartPassportVM.capturedAt !== null) && (
          <button
            className="wm-chart-orientation-action wm-chart-why-trigger"
            ref={whyTriggerRef}
            type="button"
            onClick={(event) => {
              whyTriggerRef.current = event.currentTarget;
              setWhyOpen(open => !open);
            }}
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
        {/* Secondary utilities share one fallback door on views where the
            canonical chart toolbar is intentionally absent. */}
        {activeTab !== "Chart" && activeTab !== "Options" && (
          <div ref={orientationToolsRef} className="wm-chart-orientation-tools" style={{ position: "relative", marginLeft: 4 }}>
            <button
              className="wm-chart-orientation-action"
              ref={orientationToolsTriggerRef}
              type="button"
              onClick={() => setOrientationToolsOpen(open => !open)}
              aria-label="Open secondary view tools"
              aria-expanded={orientationToolsOpen}
              aria-haspopup="menu"
              style={{
                fontSize: 10,
                letterSpacing: 0.3,
                textTransform: "uppercase",
                color: orientationToolsOpen || watchlistOpen || toolsSheetOpen ? "#e8b923" : "#c9a55c",
                background: orientationToolsOpen || watchlistOpen || toolsSheetOpen ? "rgba(232, 185, 35, 0.12)" : "transparent",
                border: "1px solid rgba(139,106,41,0.35)",
                minHeight: 44,
                padding: "3px 10px",
                borderRadius: 4,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Tools
            </button>
            {orientationToolsOpen && (
              <div
                role="menu"
                aria-label="Secondary view tools"
                style={{
                  position: "absolute",
                  zIndex: 9999,
                  top: "calc(100% + 4px)",
                  right: 0,
                  width: 180,
                  padding: 6,
                  border: "1px solid rgba(139,106,41,0.35)",
                  borderRadius: 8,
                  background: "var(--wm-card,#131520)",
                  boxShadow: "0 12px 36px rgba(0,0,0,0.72)",
                }}
              >
                <button
                  role="menuitem"
                  aria-haspopup="dialog"
                  aria-controls="chart-watchlist-sheet"
                  className="wm-chart-orientation-action"
                  style={{ display: "block", width: "100%", minHeight: 44, textAlign: "left", padding: "8px 10px" }}
                  onClick={() => {
                    setOrientationToolsOpen(false);
                    openWatchlist(orientationToolsTriggerRef.current);
                  }}
                >
                  Watchlist
                </button>
                <button
                  role="menuitem"
                  aria-haspopup="dialog"
                  aria-controls="chart-tools-sheet"
                  className="wm-chart-orientation-action"
                  style={{ display: "block", width: "100%", minHeight: 44, textAlign: "left", padding: "8px 10px" }}
                  onClick={() => {
                    setOrientationToolsOpen(false);
                    openCaptureShare(orientationToolsTriggerRef.current);
                  }}
                >
                  Capture &amp; share
                </button>
              </div>
            )}
          </div>
        )}
        <a
          className="wm-chart-orientation-action wm-chart-command-deck-link"
          href={`/command-deck?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(timeframe)}`}
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
      </div>
      {/* Asset class, symbol truth, and secondary views share one compact
          threshold. The old eight-peer category strip consumed a permanent
          44px dashboard band above MARKET even when the trader never left
          Chart. A native select keeps every view keyboard/touch reachable
          while returning that space to the room. */}
      <div className="wm-chart-tabs" style={{
        height: 44, borderBottom: "none", display: "flex", alignItems: "center",
        gap: 0, paddingLeft: 16, background: "transparent", flexShrink: 1, minWidth: 0, overflowX: "auto",
        scrollbarWidth: "none",
      }}>
        {/* Asset class switcher (Stocks / Crypto / Futures / Forex / Indices / Metals) */}
        <AssetClassSwitcher symbol={symbol} onSelect={setSymbol} />
        {/* Symbol + live price */}
        <div className="wm-chart-market-summary" style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 16, flexShrink: 0 }}>
          <span style={{ color: "#E2E8F0", fontWeight: 700, fontSize: 14 }}>{symbol}</span>
          {(() => {
            // Truth guard: header must never paint a change value without a real
            // reference close. Before this, the header would render whatever the
            // hook returned even if a seed-derived fake had leaked through — see
            // useWebSocket flush() for the source-side guard that pairs with this.
            // useWebSocket only writes change/changePct once prevCloseRef holds a
            // REAL prior close; until then it deliberately leaves them at their
            // initial 0 while still updating price and volume (see flush()).
            //
            // The previous guard required change, changePct AND volume to all be
            // zero before suppressing. Volume accumulates from live ticks, so on
            // BTC the header rendered "77,556.11 ↑ +0.00 +0.00%" in green beside
            // a LIVE badge while the TickerTape showed +2.49% for the same asset
            // — a fabricated direction and a multi-price disagreement on one page.
            //
            // A zero change with no reference close is UNKNOWN, not flat. If price
            // genuinely equals the prior close we simply omit the change until it
            // moves, which is honest; painting a green up-arrow on unknown data is
            // not.
            const hasReal = ticker.price > 0
              && Number.isFinite(ticker.change) && Number.isFinite(ticker.changePct)
              && !(ticker.change === 0 && ticker.changePct === 0);
            // Three-state direction: never call an exactly-zero change "up".
            const up = hasReal && ticker.changePct > 0;
            // NAMING THE ABSENCE, not merely declining to fill it.
            //
            // This block previously rendered `{hasReal && <span …>}`, so when
            // the guard above said "no verified reference close" the header
            // rendered NOTHING — no glyph, no tooltip, no element. And the
            // price fallback beside it was a bare "—" with no title.
            //
            // MEASURED LIVE on /charts, TSLA, reading div.wm-chart-market-summary:
            //     TSLA | — | HISTORICAL BARS VERIFIED
            // The "—" span carried no title and no aria-label. A trader could
            // not tell whether the change was flat, unmeasured, or simply not
            // a thing this header reports — and a badge two elements over was
            // asserting VERIFIED at the same time.
            //
            // MainChart's price row (~7017) already did this correctly, always
            // rendering the span and reading "— (change unavailable)" with a
            // reason in the title. `chartHeaderChangeTruth.test.ts` even locked
            // the two sites to one guard — but only for WHEN to suppress, never
            // for what the suppression looks like. So they agreed exactly on
            // the decision and not at all on the disclosure.
            //
            // The sentence is imported, not retyped: a third copy of it would
            // agree with the other two until the day one of them was edited.
            // THE HEADER MAY NOT WITHHOLD A NUMBER IT HAS ALREADY PUBLISHED.
            //
            // The price slot used to fall back to a bare "—" while the badge
            // beside it announced HISTORICAL BARS VERIFIED — a badge gated on
            // `chartBars.length > 0`, and therefore itself PROOF that verified
            // bars were loaded right here. Those same `chartBars` are handed to
            // usePublishChartMarketState above, which publishes a last bar
            // close from them. WM knew a number, told one consumer, and said
            // nothing to the trader. Understating knowledge is a truth defect
            // in the same family as overclaiming it.
            //
            // The bar close does NOT simply fill the slot: it is labelled with
            // its timeframe and the words BAR CLOSE, and styled from its own
            // provenance, so it can never be read as what the instrument is
            // trading at now. See chartHeaderPriceFact for why the easy version
            // of this fix would have been worse than the dash.
            const headerPriceFact = chartHeaderPriceFact(
              ticker.price,
              deriveLastBarClose(chartBars, timeframe, Date.now()),
              // UNASKED IS NOT UNAVAILABLE. Without this argument the header of
              // the primary trading surface opened every cold load by telling
              // the trader their instrument had "No price" — seconds before
              // painting 400 candles underneath it. Measured live on
              // wealthymindsetspro.com/charts, NQ1!, 2026-09-17.
              barsSettled,
            );
            const headerPriceStyle = HEADER_PRICE_STYLE[headerPriceFact.kind];
            // THE CHANGE SLOT, ON THE SAME EVIDENCE AS THE PRICE SLOT ABOVE.
            //
            // `hasReal` decides whether the QUOTE PROVIDER gave a usable
            // session change — that decision is unchanged and still has one
            // owner. What changed is what happens when it says no: this used
            // to print "— (change unavailable)" beside a bar close derived
            // from the very candles that can also prove a bar-over-bar move.
            // Measured live 2026-09-17T02:53Z on TSLA 15m, that sentence sat
            // three words from "358.13 LAST 15m BAR CLOSE".
            //
            // The bar reading is NOT a session change and is never rendered
            // as one — `chartHeaderChangeFact` prints "vs prior 15m bar" with
            // the number, and its `kind` (not its presence) picks the colour.
            const headerChangeFact = chartHeaderChangeFact(
              hasReal ? { chg: ticker.change, pct: ticker.changePct } : null,
              deriveBarOverBarChange(chartBars, timeframe, Date.now()),
              // Explicit, because `minDecimals` sits between and defaults: the
              // header renders 2dp today, and passing it by name here keeps the
              // trailing settled flag from silently landing in the wrong slot.
              2,
              barsSettled,
            );
            const changeStyle = HEADER_CHANGE_STYLE[headerChangeFact.kind];
            return (
              <span style={{
                color: hasReal ? (up ? "#00C076" : "#FF4D67") : "#8B92AC",
                fontWeight: 700, fontSize: 13, fontFamily: "monospace",
              }}>
                {/* AWAITING removes the WHOLE ELEMENT, attributes and all.
                    The `title` and `aria-label` below are UNCONDITIONAL by
                    Sentinel decree, and they must stay unconditional — every
                    reading and every genuine absence owes the reader its
                    reason. But "we have not finished asking" is neither, and
                    an empty slot still carrying a tooltip that explains itself
                    is the same interruption with extra steps, worst of all for
                    a screen reader, which would hear "price: ." */}
                {headerPriceFact.kind === "AWAITING" ? null : (
                <span
                  style={{ color: headerPriceStyle.color, fontWeight: headerPriceStyle.weight }}
                  title={headerPriceFact.reason}
                  aria-label={`${symbol} price: ${headerPriceFact.text}. ${headerPriceFact.reason}`}
                >
                  {headerPriceFact.text}
                </span>
                )}
                {headerChangeFact.kind === "AWAITING" ? null : (
                <span
                  className="wm-chart-header-change"
                  data-change-kind={headerChangeFact.kind}
                  style={{
                    color: changeStyle.color(headerChangeFact.direction),
                    fontWeight: changeStyle.weight,
                  }}
                  title={headerChangeFact.reason}
                  aria-label={`${symbol} change: ${headerChangeFact.text}. ${headerChangeFact.reason}`}
                >
                  &nbsp;{headerChangeFact.kind === "SESSION_CHANGE"
                    ? `${headerChangeFact.direction === 1 ? "↑" : headerChangeFact.direction === -1 ? "↓" : "·"} ${headerChangeFact.text}`
                    : headerChangeFact.text}
                </span>
                )}
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
            const quoteObservation = {present: Number.isFinite(ticker.price) && ticker.price > 0};
            // 2026-09-10 — measured live in production on /charts?symbol=NQ1!:
            // this header read "NQ1! — DATA UNAVAILABLE" while `chartBars`
            // (read six lines below for the tooltip) held three sessions of
            // real candles that were rendering underneath it, and the tape
            // one row above read ACTIVE DEGRADED with a price and a change.
            //
            // The bar evidence was already in hand at this exact point and
            // simply was not given to the badge: the raw `priceSourceBadge`
            // grades the QUOTE only, so a refused quote printed a total-data
            // absence claim. `resolveChartSurfaceBadge` is the single guard
            // that exists to stop "no feed beside rendered candles" — the
            // sibling chip in MainChart.tsx has always routed through it, and
            // this surface never did. Passing the quote observation keeps the
            // refusal visible instead of letting bar presence launder it into
            // a quote claim.
            const b = resolveChartSurfaceBadge(
              source, connected, chartBars.length > 0, sessionOpen, quoteObservation,
              // The badge may not grade a question that is still open. With
              // this argument absent, the chip spent every page load asserting
              // DATA UNAVAILABLE about an instrument whose bars were seconds
              // from painting underneath it.
              barsSettled,
            );
            // SHIFT-U continuation — pass the per-capability report so
            // the trader hovering the chip sees "Weakest capability"
            // hint + coverage count. Canon §Provider Status Per
            // Capability delivered on the /charts chrome without
            // fattening the visible chip (canon §Semantic Zoom).
            const capabilityReport = selectPerCapabilityFidelity({
              source: source ?? "unavailable",
              connected,
              hasCandles: chartBars.length > 0,
              quoteObservation,
              // Closure outranks the provider verdict for bars + quotes.
              sessionOpen,
              // ticks / depth / options / greeks: unwired on
              // ChartsDashboard; silent per canon §no-silent-override.
              // orderFlow lights when the aggressor selector proves
              // real per-trade flow (hasFlow=true). tapeConnected is
              // set to the same signal so the report writes the
              // canonical LIVE label per the selector's derivation.
              tapeConnected: chartFlowSnap.hasFlow ? true : undefined,
              orderFlowDerived: chartFlowSnap.hasFlow ? true : undefined,
            });
            return <CanonicalFidelityBadge badge={b} variant="chrome" capabilityReport={capabilityReport} />;
          })()}
        </div>
        {/* Tab bar promoted to its own top-level category strip above
            in the prior shell. Scene-fusion keeps the canonical list but
            rehomes it here as one doorway instead of eight peer cards. */}
        <label
          className="wm-chart-category-doorway"
          style={{ display: "flex", alignItems: "center", marginLeft: "auto", marginRight: 10, flexShrink: 0 }}
        >
          <span style={{ color: "#716b5d", fontSize: 9, letterSpacing: 0.8, marginRight: 6, textTransform: "uppercase" }}>
            View
          </span>
          <select
            className="wm-chart-category-select"
            aria-label="Symbol view category"
            value={activeTab}
            onChange={(event) => setActiveTab(event.target.value)}
            style={{
              minHeight: 32,
              maxWidth: 172,
              color: "#c9a55c",
              background: "rgba(5,5,6,0.72)",
              border: "1px solid rgba(139,106,41,0.35)",
              borderRadius: 4,
              padding: "0 28px 0 9px",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.3,
              textTransform: "uppercase",
            }}
          >
            {categoryTabsFor(assetClass).map((tab) => (
              <option key={tab} value={tab}>{tab}</option>
            ))}
          </select>
        </label>

      </div>
      </div>

      {/* ── Main row ─────────────────────────────────────────── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0 }}>

        {/* Left tool strip (TradingView-style): watchlist toggle, layout,
            publish idea, record video, speak your mind, screenshot, screen rec */}
        {/* Center: toolbar + chart area — fullscreen target includes all controls */}
        <div ref={fullscreenRef} style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0, position:"relative" }}>
          {/* One evidence gateway: decision first, object lineage on demand.
              Retires the competing Passport trigger/drawer, not its truth.
              Both panels keep their existing canonical selectors. */}
          {/* The one canonical WatchlistPanel. A width-specific copy would fork
              named lists, persistence, refusal rendering and provider polling. */}
          {watchlistOpen && (
            <ShellModalDrawer
              id="chart-watchlist-sheet"
              titleId="chart-watchlist-sheet-title"
              descriptionId="chart-watchlist-sheet-description"
              title="Watchlist"
              description="Your watchlist, on this device. Tap a symbol to load it on the chart."
              closeLabel="Close watchlist"
              width={320}
              onClose={() => setWatchlistOpen(false)}
              fallbackTriggerRef={watchlistSheetTriggerRef}
            >
              <WatchlistPanel
                variant="sheet"
                open
                onToggle={() => setWatchlistOpen(false)}
                gridView={gridView}
                onGridViewChange={(v) => { setGridView(v); if (v) setGridRefresh(k => k + 1); }}
              />
            </ShellModalDrawer>
          )}

          {/* The SAME LeftDrawingSidebar the desktop rail renders — variant
              only, and the identical props object, so a tool selected here is
              the tool the chart draws with. A second copy would mean one
              surface wired to clearTrigger and one not. */}
          {drawSheetOpen && (activeTab === "Chart" || activeTab === "Options") && (
            <ShellModalDrawer
              id="chart-draw-sheet"
              titleId="chart-draw-sheet-title"
              descriptionId="chart-draw-sheet-description"
              title="Drawing tools"
              description="Pick a tool, then draw on the chart. Your selection stays active after this closes."
              closeLabel="Close drawing tools"
              width={320}
              onClose={() => setDrawSheetOpen(false)}
              fallbackTriggerRef={drawSheetTriggerRef}
            >
              <LeftDrawingSidebar {...drawingSidebarProps} variant="sheet" />
            </ShellModalDrawer>
          )}

          {/* The SAME LeftSidebar, spreading the SAME props — so the phone
              screenshots and publishes the same node the desktop does. */}
          {toolsSheetOpen && (
            <ShellModalDrawer
              id="chart-tools-sheet"
              titleId="chart-tools-sheet-title"
              descriptionId="chart-tools-sheet-description"
              title="Capture & share"
              description="Publish an idea, record a note, or capture this chart. Controls your browser cannot run are shown with the reason."
              closeLabel="Close capture and share"
              width={320}
              onClose={() => setToolsSheetOpen(false)}
              fallbackTriggerRef={captureFallbackTriggerRef}
            >
              <LeftSidebar {...primarySidebarProps} variant="sheet" />
            </ShellModalDrawer>
          )}

          {/* WHY belongs to the current instrument decision, not to a chart
              rendering mode. The orientation doorway remains visible on
              Financials/Valuation/etc., so its canonical drawer must remain
              mountable there as well; otherwise the button visibly toggles
              aria-expanded while opening nothing. */}
          {whyOpen && (
            <ShellModalDrawer
              id="chart-decision-why"
              titleId="chart-decision-why-title"
              descriptionId="chart-decision-why-description"
              title="Decision Why"
              description="Decision evidence, blockers, and clearances. Object lineage and invalidation are below, already open."
              closeLabel="Close Decision Why"
              width={440}
              onClose={() => setWhyOpen(false)}
              fallbackTriggerRef={whyTriggerRef}
            >
              <div style={{ padding: 12 }}>
                <DecisionWhyPanel vm={chartCanvasVM.decisionWhy} />
                {/*
                  THIS WAS A <details> INSIDE A MODAL DRAWER.

                  Drawer-inside-drawer burial, banned by name. The trader had
                  already spent a press to open this sheet asking WHY; making
                  them spend a second one on a summary row — inside the answer —
                  is the deck's three-drawers-deep defect at a shallower depth,
                  and it shipped here for the same reason: nothing on screen
                  distinguishes "collapsed" from "absent".

                  The disclosure is gone, not moved. Inside the drawer this is
                  not clutter on MARKET — the trader asked, and the chart is not
                  underneath it. On desktop the passport is now equipment
                  instead (see chartPassportEquipment), which is the mechanism
                  for depth the trader did NOT ask for.

                  Keyed on symbol:timeframe so switching instruments cannot show
                  the previous object's lineage for a frame.
                */}
                <div
                  className="mt-3 border-t border-wm-border pt-3"
                  id="chart-market-object-passport"
                  key={`${symbol}:${timeframe}`}
                >
                  <MarketObjectPassportPanel vm={chartPassportVM} />
                </div>
              </div>
            </ShellModalDrawer>
          )}

          {infoOpen && (activeTab === "Chart" || activeTab === "Options") && (
            <ShellModalDrawer
              id="chart-instrument-profile"
              titleId="chart-instrument-profile-title"
              descriptionId="chart-instrument-profile-description"
              title={`${symbol} instrument profile`}
              description="Quotes, session facts, analysis, news, and observed ticks for the chart instrument."
              closeLabel="Close instrument profile"
              width={360}
              onClose={() => setInfoOpen(false)}
              fallbackTriggerRef={toolsTriggerRef}
            >
              <StockInfoPanel symbol={symbol} />
            </ShellModalDrawer>
          )}

          {/* Asset-10 scene fusion: toolbar and disclosed studies are MARKET
              controls, not a full-room dashboard lid. The left column owns
              those controls and every evidence surface; the canonical
              decision rail remains its sibling and begins at the room edge. */}
          <div data-wm-market-room="true" style={{ flex:1, display:"flex", overflow:"hidden", minWidth:0, minHeight:0 }}>
          <div data-wm-market-column="true" style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0, minHeight:0 }}>

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
            onConnectBrokers={() => openBrokerConnect(toolsTriggerRef.current)}
            onCapture={() => openCaptureShare(toolsTriggerRef.current)}
            captureOpen={toolsSheetOpen}
            onWatchlist={() => openWatchlist(toolsTriggerRef.current)}
            watchlistOpen={watchlistOpen}
            onDraw={() => openDrawingTools(toolsTriggerRef.current)}
            drawOpen={drawSheetOpen}
            onSmartMoney={() => setSmartMoneyOpen(o => !o)}
            smartMoneyActive={smartMoneyOpen}
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
            toolsTriggerRef={toolsTriggerRef}
            onInstrumentProfile={() => setInfoOpen(open => !open)}
            instrumentProfileActive={infoOpen}
            onAppearanceToggle={() => setTheme(theme === "neon" ? "original" : "neon")}
            appearanceLabel={theme === "neon" ? "WM Neon" : "Original"}
            onSettings={() => setSettingsOpen(true)}
            onReplay={() => { if (replayActive) stopReplay(); else startReplay(); }}
            replayActive={replayActive}
            onCompare={() => setCompareOpen(o => !o)}
            compareActive={!!compareSymbol}
            onToggleStudyTools={() => setStudyToolsOpen(open => !open)}
            studyToolsOpen={studyToolsOpen}
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
          {/* ── WM-BRAND-W-TRIGGER-01 · Smart Money identity ──
              FOUNDER INSTRUCTION (2026-09-04): "the wm pro smartmoney button was taken
              from the charts and i dont know why it should be on the charts section
              still with the new logo".

              ROOT CAUSE: e3ce41f "refactor(charts): disclose advanced study controls on
              demand" moved the ENTIRE second toolbar row behind `studyToolsOpen`, which
              defaults to false. The branded Smart Money trigger lived inside that row,
              so from the trader's seat it read as deleted — its only remaining path was
              ChartToolbar → Advanced → "Flow & studies", a label that never says
              "Smart Money".

              FIX: the branded, identity-bearing control is NOT a study tool. It now
              lives in ChartToolbar's always-visible pinned action cluster, beside the
              broker connection path. That keeps it one-tap and logo-branded without
              charging the chart an entire permanent row. Progressive disclosure still
              governs the dense study row below. */}

          {/* SCENE_FRAGMENTATION cure (Founder 2026-09-13): the study row is a
              second lid above MARKET when disclosed. Fill is owned by
              `wm-room-chrome`; brass hairline stays inline so it beats the
              equal-specificity Tailwind border utility on this element. */}
          {(activeTab === "Chart" || activeTab === "Options") && studyToolsOpen && <div className="wm-chart-tools wm-room-chrome flex items-center justify-start border-b shrink-0 overflow-x-auto overflow-y-hidden pr-3"
            style={{ height: 30, borderColor: "rgba(139,106,41,0.24)" }}>
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
                // Every footprint overlay is built from SIDED prints, so the
                // toolbar is told both halves of the tape's truth: which feed is
                // connected (can it ever supply a side?) and whether a sided
                // print has actually been observed (has one arrived yet?).
                // Collapsing those two into one grey button is the same defect
                // as an absence reported with too wide a scope.
                tapeSource={source}
                observedAggressorFlow={chartFlowSnap.hasFlow}
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

          {/* One Asset-10 market column owns the selected evidence surface.
              Changing symbol views must not make MARKET controls or evidence
              escape into a full-room chrome layer. */}
            {/* ── Non-Chart tab panels ──────────────────────────── */}
            {activeTab !== "Chart" && activeTab !== "Options" && (
              <div role="tabpanel" id="wm-chart-category-panel" aria-label={`${activeTab} for ${symbol}`} style={{ flex:1, overflow:"auto", minHeight:0 }}>
                <FundamentalsTabPanel symbol={symbol} tab={activeTab} />
              </div>
            )}

            {/* ── Chart area ─────────────────────────── */}
            <div role="tabpanel" id="wm-chart-category-panel-chart" aria-label={`Chart for ${symbol}`} style={{ flex:1, overflow:"hidden", minHeight:0, display: (activeTab === "Chart" || activeTab === "Options") ? "flex" : "none" }}>

            {/* Chart + VP ladder (snapshot target) */}
            <div ref={chartWrapRef} style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0, position:"relative" }}>
              {gridView && <WatchlistGrid refreshKey={gridRefresh} timeframe={timeframe} />}
              <div style={{ flex:1, display: gridView ? "none" : "flex", overflow:"hidden" }}>
                {/* TradingView-style persistent left drawing rail.
                    Hidden by globals.css at the same breakpoint as the
                    watchlist, so at narrow widths it moves into the drawer
                    below instead — same component, ONE instance at any
                    width. The eleven props live in `drawingSidebarProps`
                    above precisely so the two call sites cannot drift into
                    two differently-wired drawing surfaces. */}
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
                    {/* ── Regime + daily % HUD (top-center overlay) ──────────────────
                         Every claim here is delegated to selectRegimeBadge, because
                         this call site shipped two untruths at once (seen live on the
                         Founder's screen, 2026-09-05):
                           - `Number.isFinite(x) ? x : 0` turned "no quote" into a
                             printed "+0.00%" AND a market state of "SIDE" — a regime
                             fabricated out of the absence of data.
                           - "today" was hardcoded, so a Saturday chip called the last
                             completed session's move today's (Canon §8, stale-as-live).
                         The chip now renders nothing without a verified change, and the
                         period word is earned from proven session closure. */}
                    {(() => {
                      const badge = selectRegimeBadge({
                        // BOTH numbers, deliberately. useWebSocket leaves change
                        // and changePct at their initial 0 until a real prior
                        // close arrives, so the zero-PAIR is this ticker's
                        // "no reference close" sentinel — invisible to anything
                        // that only sees the percentage. Forwarding changePct
                        // alone is how "+0.00% last session / SIDE" survived
                        // beside the header's own "— (change unavailable)".
                        change: ticker.change,
                        changePct: ticker.changePct,
                        symbol,
                        at: sessionClockDate,
                        // The canonical regime dimension this chip may not
                        // contradict. Photographed 2026-09-15: this chip said
                        // "REGIME BEAR" while the rail below it listed regime
                        // among 8 UNRESOLVED dimensions and told the trader to
                        // go resolve it. Same screen, same instant, same
                        // symbol. Forwarding the dimension is what makes the
                        // two statements come out of one owner.
                        canonRegime: chartCanvasState?.regime ?? null,
                      });
                      if (!badge.displayable) return null;
                      const p = badge.changePct;
                      const reg = badge.regime;
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
                          {/* The label comes from the owner, not from a literal
                              typed here. This chip classifies a DAY CHANGE
                              PERCENT into a band; it has never looked at the
                              tape. The canonical regime dimension reads
                              classified per-trade tape and speaks TREND /
                              BALANCE. A DAY-CHANGE PERCENT IS NOT A MARKET
                              REGIME — so this half says what it measured. */}
                          <span style={{ fontSize:9, fontWeight:800, color:"#5A6486", letterSpacing:"0.08em" }}>{badge.verdictLabel}</span>
                          <span style={{ fontSize:11, fontWeight:900, color:rc, letterSpacing:"0.04em" }}>{reg}</span>
                          <span style={{ width:1, height:10, background:"#2A3048" }} />
                          <span style={{ fontSize:10.5, fontWeight:800, color:pc, fontFamily:"monospace" }}>
                            {p >= 0 ? "+" : ""}{p.toFixed(2)}%{badge.periodLabel ? ` ${badge.periodLabel}` : ""}
                          </span>
                          {/* The canon half. The reserved word appears exactly
                              once on this chip and it is always attached to the
                              canonical dimension's own answer — including when
                              that answer is "not yet". That is what stops the
                              screen disagreeing with itself. */}
                          <span style={{ width:1, height:10, background:"#2A3048" }} />
                          <span style={{ fontSize:9, fontWeight:800, color:"#5A6486", letterSpacing:"0.08em" }}>REGIME</span>
                          <span style={{
                            fontSize:10, fontWeight:900, letterSpacing:"0.04em",
                            color: badge.canon.resolved ? "#E6E9F2" : "#5A6486",
                          }}>
                            {badge.canon.resolved ? badge.canon.value : "UNRESOLVED"}
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
                      showFidelityChrome={false}
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
                        showFidelityChrome={false}
                      />
                    </div>
                  )}

                  {chartLayout === "4" && (
                    <>
                      <div style={{ width:"50%", flexShrink:0, borderTop:"1px solid #1E2030", display:"flex", overflow:"hidden", minHeight:0 }}>
                        <MainChart symbol={symbol} timeframe="5m" footprintType={footprintType} footprintEnabled={footprintEnabled} bigTradesOverlay={bigTradesSimul && bigTradesOverlay} candleType={candleType} chartSettings={effChartSettings} showFidelityChrome={false} />
                      </div>
                      <div style={{ width:"50%", flexShrink:0, borderTop:"1px solid #1E2030", borderLeft:"1px solid #1E2030", display:"flex", overflow:"hidden", minHeight:0 }}>
                        <MainChart symbol={symbol} timeframe="15m" footprintType={footprintType} footprintEnabled={footprintEnabled} bigTradesOverlay={bigTradesSimul && bigTradesOverlay} candleType={candleType} chartSettings={effChartSettings} showFidelityChrome={false} />
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

              {/* The stationary Session VP side panel was REMOVED per spec (see
                  the DOM-ladder note above). Its mount lingered here behind
                  `sessionVPOpen`, whose ONLY setter was the panel's own
                  onClose(false) — nothing could ever set it true, so the branch
                  was unreachable and <WMSessionVP> could never render.

                  That dead branch actively misled: it looks like a working
                  feature that merely needs a toggle, and reads as the reason
                  §13 says "Live VP production visual behavior still requires
                  direct proof" — when the real reason is that the panel was
                  intentionally retired. Wiring it back would reverse the spec.

                  src/components/chart/WMSessionVP.tsx is retained (git history
                  + possible future use) but has no live mount. The surviving VP
                  surfaces are the on-chart Session VP (`sessionVPChart`) and
                  the on-chart Fixed VP. */}

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
                <OptionsChain key={`${symbol}:${canvasUser?.id ?? "signed-out"}`} symbol={symbol} spot={optionSpot}
                  onClose={() => { clearOptionSelection(); setActiveTab("Chart"); }}
                  onInvalidateSelection={clearOptionSelection}
                  onSelectContract={(contract, receipt, timing: OptionContractObservationTiming) => {
                    if (receipt.source !== OPTION_CHAIN_SOURCE || receipt.fidelity !== OPTION_CHAIN_FIDELITY
                        || !timing.reviewable) return;
                    setOptionSelection({ underlying: symbol, owner: canvasUser?.id ?? "signed-out", contract, source: receipt.source, fidelity: receipt.fidelity, providerPath: receipt.providerPath, rightsPolicyId: receipt.rightsPolicyId });
                  }}
                  onOpenBrokerConnect={openBrokerConnect}
                  expression={optionSelection?.underlying === symbol && optionSelection.owner === (canvasUser?.id ?? "signed-out")
                    ? <OptionExpressionIntent key={`${optionSelection.owner}:${optionSelection.contract.symbol}:${optionSelection.contract.expirationDate}:${optionSelection.contract.contractType}:${optionSelection.contract.strike}`}
                        ownerId={canvasUser?.id ?? ""} underlying={symbol} contract={optionSelection.contract} source={optionSelection.source} fidelity={optionSelection.fidelity} providerPath={optionSelection.providerPath} rightsPolicyId={optionSelection.rightsPolicyId}
                        bornDecision={currentSceneDecision} onIdentity={(identity) => setSceneDecision((current) => adoptSceneDecision(current, { ...decisionScope, identity }))} onClear={clearOptionSelection} /> : null} />
              )}
            </AnimatePresence>

            </div>

            </div>

            {/* Desktop Asset-10 composition: one canonical decision edge stays
                attached across Chart and every secondary evidence view.
                Options keeps the full width it needs; narrow viewports use the
                proven scrollable band below. */}
            {!narrowViewport && !optionsOpen && (
              <DecisionSpineBand {...decisionSpineProps} presentation="rail" />
            )}
          </div>

        </div>

      </div>

      {/* ── Responsive decision spine fallback ───────────────────
          Desktop Chart mode mounts the same compiled spine beside MARKET.
          Narrow and Options views retain the horizontal, scrollable band so
          neither chart width nor option-chain legibility is sacrificed. */}
      {(narrowViewport || optionsOpen) && (
        <DecisionSpineBand {...decisionSpineProps} presentation="band" />
      )}
      {pnlOpen && <PnLStatsPanel onClose={() => setPnlOpen(false)} />}
      {smartMoneyOpen && <SmartMoneyPanel onClose={() => setSmartMoneyOpen(false)} symbol={symbol} />}
      {brokerOpen && (
        <BrokerConnectPanel
          onClose={() => setBrokerOpen(false)}
          fallbackTriggerRef={brokerFallbackTriggerRef}
          onOpenPaperAccount={() => {
            setBrokerOpen(false);
            setTradeOpen(true);
          }}
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
            initialTab="positions"
            fallbackTriggerRef={toolsTriggerRef}
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

      {/* ── WORKSPACE EQUIPMENT — the grammar's second ROOM ──────────────────
          Renders NOTHING until the trader presses "Market reality" in the
          rail's Workspace block. Fixed-position and last in the tree for the
          same reason it is on the deck: a widget that reflows the chart it is
          meant to sit beside has already broken the "same room" promise.

          /charts is the room where the trader spends the most time and, until
          this, the room that could hand them the least — every one of its
          inventions was reached by opening a legacy panel and scrolling. The
          first one to arrive as EQUIPMENT is the reading this room was already
          holding: `chartMarketCanvas` is the exact object the wordmark pill a
          few pixels above renders, so pressing the equipment cannot show a
          verdict the pill disagrees with. */}
      <RoomEquipmentLayer
        journey={chartEquipment}
        content={chartEquipmentContent}
        // The room's own bindings. Resolving a symbol inside the equipment
        // would let the full experience name a different market than the chart
        // the trader entered from — and full is the stage that takes the chart
        // away, so nothing would contradict it.
        subject={{ symbol, timeframe }}
        onExpand={onChartEquipmentExpand}
        onEnter={onChartEquipmentEnter}
        onReturn={onChartEquipmentReturn}
        onClose={onChartEquipmentClose}
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

function FundamentalsTabPanel({ symbol, tab }: { symbol: string; tab: string }) {
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
    <div style={{ flex:1, overflow:"auto", background:"transparent", padding:16 }}>
      {loading ? (
        <div style={{ color:"#6B7094", fontSize:13, padding:"24px 4px" }}>Loading {tab.toLowerCase()} data…</div>
      ) : (body && hasData) ? body : providerEdge ? (
        // Truth-in-name: FMP responded 503 with the NOT CONFIGURED
        // contract — name the exact missing env var so a founder can
        // paste it in host secrets and unblock every fundamentals view.
        <div
          data-testid="fundamentals-provider-edge"
          style={{
            background:"transparent",
            borderLeft:"1px solid rgba(183, 138, 52, 0.42)",
            padding:"10px 0 10px 14px",
            maxWidth:640,
          }}
        >
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
