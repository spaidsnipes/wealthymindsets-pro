"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { repairChartPreferences } from "@/lib/chartPreferenceRepair";
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
import { BROKER_CONNECT_EVENT, BROKER_CONNECT_PARAM, BROKER_CONNECT_VALUE } from "@/lib/broker/brokerConnectDoor";
import { AlpacaTradingPanel } from "@/components/broker/AlpacaTradingPanel";
import { FootprintControls } from "./FootprintControls";
import { ProfilesMenu } from "./ProfilesMenu";
import { MyStackBar } from "./MyStackBar";
import { ProfilePresetBar } from "./ProfilePresetBar";
import { RiskReceiptBar } from "./RiskReceiptBar";
import type { RiskOnPriceVM } from "@/lib/marketData/viewModels/selectRiskOnPrice";
import type { ContradictionVM } from "@/lib/marketData/viewModels/selectContradiction";
import type { MemoryGhostVM } from "@/lib/marketData/viewModels/selectMemoryGhost";
import type { ExpectedEnvelopeVM } from "@/lib/marketData/viewModels/selectExpectedEnvelope";
import type { FusedProfileObject } from "@/lib/marketData/viewModels/fuseProfiles";
import { readRiskReceipt, tearRiskReceipt, writeRiskReceiptOnce, type RiskReceipt } from "@/lib/traderMemory/riskReceipt";
import { StackArrangeBar } from "./StackArrangeBar";
import { STACK_PREFS_STORAGE_KEY, parseStackPrefs, withoutLocked, type ProfileStackPrefs } from "@/lib/marketData/viewModels/profileStackPrefs";
import { OrderFlowToolsSlot, ToolsSlot, publishOrderFlowTools, publishToolsSlot } from "./orderFlowToolsSlot";
import { ChartArrangementBar } from "./ChartArrangementBar";
// The arrangement compiler, imported for the WORKSPACE door. `ChartArrangementBar`
// imports the SAME two functions for the Tools door — one owner, two call sites.
import { selectProfileMenu, profileSpeciesRefusals, type ProfileId } from "@/lib/marketData/viewModels/selectProfileMenu";
import {
  arrangementSwitches,
  selectChartArrangement,
  type ArrangementId,
} from "@/lib/marketData/viewModels/selectChartArrangement";
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
import {
  CANDLE_DOWN_DEFAULT,
  CANDLE_UP_DEFAULT,
  LEGACY_CANDLE_DOWN,
  LEGACY_CANDLE_UP,
  migrateMarketField,
  migrateVolumeProfilePalette,
  VP_UP_DEFAULT,
  VP_DOWN_DEFAULT,
  VP_POC_DEFAULT,
  VP_VALUE_AREA_DEFAULT,
} from "@/lib/chart/marketFieldMaterial";
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
  /* An unattributed number is not a full-brightness claim. It sits with the
     bar close in the muted pair — still clearly a reading, visibly not the
     certified one. Build Order §9: a verdict may never be graded in hue, so
     the DOUBT IS IN THE WORDS ("SOURCE UNCERTIFIED"), not in this colour;
     the colour only declines to shout. */
  UNCERTIFIED_QUOTE: { color: "#A8B0C8", weight: 600 },
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
import type { MarketFidelityReading } from "@/lib/marketData/marketFidelityAlgebra";
// THE ONE OWNER of this surface's honesty reading: it performs the sanctioned
// crossing from the seven pipeline labels into the five fidelities, chooses
// which accept-site stamp the plaque names, and refuses rather than defaults.
// The decision rail's Honesty Plaque is fed from here and from nowhere else.
import { readCanvasHonesty } from "@/lib/marketData/readCanvasHonesty";
import { useFeedEvaluationClock, useProvenSessionClosure, useSessionClockDate } from "@/lib/marketData/useProvenSessionClosure";
import { quoteFreshness } from "@/lib/os/osChrome";
import { CanonicalFidelityBadge } from "@/components/marketData/CanonicalFidelityBadge";
import { selectPerCapabilityFidelity } from "@/lib/marketData/selectPerCapabilityFidelity";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import { interpretPine } from "@/lib/pine/interpreter";
import type { PineOutput } from "@/lib/pine/types";
import type {
  CanonicalBarIdentity,
  LegacyOhlcvTuple,
} from "@/lib/marketData/canonicalBar";
import { buildInspectChain } from "@/lib/marketData/inspectChain";
import { selectObjectLineage, selectZoneLineage } from "@/lib/marketData/viewModels/selectZoneLineage";
import { sessionWindowFor } from "@/lib/marketData/sessionWindow";
import { memoryLevelKindOf, selectMemoryMarketObjects } from "@/lib/marketData/viewModels/selectMemoryMarketObjects";
import { selectLivingBiography } from "@/lib/marketData/viewModels/selectLivingBiography";
import { selectWaitStanding } from "@/lib/marketData/viewModels/selectWaitStanding";
import type { DrawingTool } from "./DrawingToolsPanel";
import type { ChartLayout } from "./ChartLayoutManager";
import { normalizeTFId } from "@/lib/timeframes";
import { marketSurfaceUrlWriteback, normalizeMarketSurfaceTimeframe } from "@/lib/routing/marketSurfaceQuery";
import { usePublishChartMarketState } from "@/lib/marketData/chartMarketStatePublisher";
import { canonicalSession, canonicalAssetClass, canonicalMarketStateIdentity, selectCanonicalSessionToken } from "@/lib/marketData/canonicalIdentity";
import { categoryTabsFor, effectiveCategoryTab, isMicrostructureTab } from "@/lib/charts/categoryTabsFor";
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
import { chronologicalTape, useOrderFlowReadings } from "@/lib/marketData/useOrderFlowReadings";
import { selectOrderFlowStanding } from "@/lib/marketData/viewModels/selectOrderFlowStanding";
import { provenTapeWireBlock } from "@/lib/marketData/provenTapeWireBlock";
import { selectOverlayDrawingLedger } from "@/lib/marketData/viewModels/selectOverlayDrawingLedger";
// The chain's three surfaces, imported HERE rather than re-implemented, because
// the deck mounts these exact three for this exact equipment. A chart-room
// variant of the chain panel would be the same reading with two renderers, and
// two renderers of one reading drift the moment one of them is edited.
import DecisionChainPanel from "@/components/chart/DecisionChainPanel";
import StructureContextNote from "@/components/chart/StructureContextNote";
import DLARStrip from "@/components/command-deck/DLARStrip";
// The trader's own record, and the chip that renders it — same selector, same
// component the deck mounts. A chart-room variant would be a second answer to
// "where have I actually performed", and two answers to that question is the
// second semantic brain the workspace grammar bans.
import PersonalEdgeChip from "@/components/journal/PersonalEdgeChip";
import { selectPersonalEdge } from "@/lib/traderMemory/viewModels/selectPersonalEdge";
import { useSessionDecisions } from "@/lib/traderMemory/useSessionDecisions";
import { useCanvasClock } from "@/lib/marketData/viewModels/canvasClock";
import RoomEquipmentLayer from "@/components/experience/RoomEquipmentLayer";
import OrderFlowDepthPanel from "@/components/experience/OrderFlowDepthPanel";
import MarketCanvasPanel from "@/components/experience/MarketCanvasPanel";
import { useEquipmentJourney } from "@/lib/workspace/useEquipmentJourney";
import {
  subscribeEquipment,
  announceEquipmentStage,
  announceEquipmentArrangement,
  announceEquipmentShortfalls,
} from "@/lib/workspace/equipmentChannel";
// THE ONE OWNER of "is a companion camera actually driving the bars". Read
// here, read by the equipment registry's own disclosure. See its note.
//
// DELIBERATELY ITS OWN IMPORT LINE, NOT MERGED WITH THE ONE BELOW. Two
// ratchets — `barReplayDisclosure.test.tsx` and
// `companionCameraCannotClaimLive.sentinel.test.ts` — pin this exact line as
// the proof that the room reads the single owner rather than re-deriving "is
// replay wired". Folding another symbol into the braces reads as tidier and
// silently breaks both. The tidiness is not worth the guard.
import { REPLAY_DRIVES_THE_CAMERA } from "@/lib/workspace/roomEquipment";
// ARRANGEMENT_EQUIPMENT_ID is the single translation between the compiler's
// desk names and the rail's door ids — see its note in the registry.
import { ARRANGEMENT_EQUIPMENT_ID } from "@/lib/workspace/roomEquipment";
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
import { useCanvasBand, zoomsForBand } from "@/lib/responsive/resizeBreakpoints";
import {
  isDecisionContinuityStorageEvent,
  readSceneDecision,
  writeSceneDecision,
} from "@/lib/traderMemory/decisionContinuity";
import AbsorptionAnatomyView from "@/components/experience/AbsorptionAnatomyView";
import ContinuationHealthView from "@/components/experience/ContinuationHealthView";
import { selectContinuationHealth } from "@/lib/marketData/viewModels/selectContinuationHealth";
import DivisionWorksheetView from "@/components/experience/DivisionWorksheetView";
import FootprintWorksheetView from "@/components/experience/FootprintWorksheetView";
import { selectDivisionWorksheet } from "@/lib/marketData/viewModels/selectDivisionWorksheet";
import { selectFootprintWorksheet } from "@/lib/marketData/viewModels/selectFootprintWorksheet";
import ChartInspectTicket from "@/components/chart/ChartInspectTicket";
import { QUESTION_CHOICES, type QuestionChoice } from "@/lib/marketData/viewModels/selectQuestionLens";
import { identityForBar, indexBarIdentitiesBySecond, selectInspectTicket } from "@/lib/marketData/viewModels/selectInspectTicket";
import ChartEffortVsResult from "@/components/chart/ChartEffortVsResult";
import { selectEffortVsResult } from "@/lib/marketData/viewModels/selectEffortVsResult";
import { selectEffortMark } from "@/lib/marketData/effortMarkGeometry";
import selectDeltaLevelsGlass from "@/lib/marketData/viewModels/selectDeltaLevelsGlass";
import selectLivingProfileGlass from "@/lib/marketData/viewModels/selectLivingProfileGlass";
import selectMarketStructureGlass from "@/lib/marketData/viewModels/selectMarketStructureGlass";
import selectTpoProfile from "@/lib/marketData/viewModels/selectTpoProfile";
import selectStructureProfile from "@/lib/marketData/viewModels/selectStructureProfile";
import selectProfileDna from "@/lib/marketData/viewModels/selectProfileDna";
import selectValueMigration from "@/lib/marketData/viewModels/selectValueMigration";
import selectProfileSlice from "@/lib/marketData/viewModels/selectProfileSlice";
import {
  CHART_SELECTION_AT_REST,
  releasesObject,
  selectChartSelection,
  selectedAnatomyOf,
  selectedObjectIdOf,
  selectedPrintOf,
  selectedSliceOf,
  type ChartSelectionAction,
} from "@/lib/marketData/viewModels/chartSelection";
import selectProfileMemory from "@/lib/marketData/viewModels/selectProfileMemory";
import selectProfileFusion, { type FusionSourceLevel } from "@/lib/marketData/viewModels/selectProfileFusion";
import selectCompositeProfile from "@/lib/marketData/viewModels/selectCompositeProfile";
import selectRegimeLighting from "@/lib/marketData/viewModels/selectRegimeLighting";
import { SCAFFOLDING_DEPTHS, type ScaffoldingDepth } from "@/lib/marketData/viewModels/selectScaffoldingRead";
import selectStructureZoneObjects from "@/lib/marketData/viewModels/selectStructureZoneObjects";
import { selectLiquidityLifecycle } from "@/lib/marketData/viewModels/selectLiquidityLifecycle";
import { selectAuctionState } from "@/lib/marketData/viewModels/selectAuctionState";
import { selectMarketStructure } from "@/lib/marketData/viewModels/selectMarketStructure";
import { selectStructureMarketObjects } from "@/lib/marketData/viewModels/selectStructureMarketObjects";
import { selectRegime } from "@/lib/marketData/viewModels/selectRegime";
import { useCanonicalMarketStateHistory } from "@/lib/marketData/useCanonicalMarketState";
import { selectAbsorptionAnatomyView } from "@/lib/marketData/viewModels/selectAbsorptionAnatomyView";
import AggressionResponseView from "@/components/experience/AggressionResponseView";
import { selectAggressionResponse } from "@/lib/marketData/viewModels/selectAggressionResponse";
import BigTradeIntelligenceView from "@/components/experience/BigTradeIntelligenceView";
import { selectBigTradeIntelligence } from "@/lib/marketData/viewModels/selectBigTradeIntelligence";
import LivingProfileView from "@/components/experience/LivingProfileView";
import GravityValueView from "@/components/experience/GravityValueView";
import LiquidityWeatherView from "@/components/experience/LiquidityWeatherView";
import {
  buildLivingProfileSnapshot,
  selectLivingProfile,
} from "@/lib/marketData/viewModels/selectLivingProfile";
import type { AnatomyBarInput } from "@/lib/marketData/selectAbsorptionAnatomy";

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
  // FIVE OWNERS BECOME ONE. Each of these carried a literal twice — here in the
  // initialiser and again in the `||` fallback below — and `MainChart` carried
  // a third and fourth copy as RGB triplets. See `lib/chart/marketFieldMaterial.ts`.
  const [vpUp, setVpUp] = useState(VP_UP_DEFAULT);
  const [vpDn, setVpDn] = useState(VP_DOWN_DEFAULT);
  const [poc, setPoc]   = useState(VP_POC_DEFAULT);
  const [vah, setVah]   = useState(VP_VALUE_AREA_DEFAULT);
  const [val, setVal]   = useState(VP_VALUE_AREA_DEFAULT);
  const [labelMode, setLabelMode] = useState<"all" | "key">("key");
  useEffect(() => {
    try {
      // Migrate BEFORE reading, so a trader who once hit "Reset all VP colors"
      // — and thereby froze the casino literals into storage as explicit
      // values — sees the room instead of the values that reset handed them.
      migrateVolumeProfilePalette(localStorage);
      setVpUp(localStorage.getItem("wm_vp_up") || VP_UP_DEFAULT);
      setVpDn(localStorage.getItem("wm_vp_dn") || VP_DOWN_DEFAULT);
      setPoc(localStorage.getItem("wm_vp_poc") || VP_POC_DEFAULT);
      setVah(localStorage.getItem("wm_vp_vah") || VP_VALUE_AREA_DEFAULT);
      setVal(localStorage.getItem("wm_vp_val") || VP_VALUE_AREA_DEFAULT);
      // Unset reads as "key", the same default the renderer applies.
      setLabelMode(localStorage.getItem("wm_vp_labels") === "all" ? "all" : "key");
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
          // The gear's own OPEN state was a green chip. An equipment control
          // saying "I am open" is chrome, not a market claim, so it takes the
          // room's brass like every other control in the OS.
          background: open ? "rgba(196,165,116,0.15)" : "#131520",
          borderColor: open ? "rgba(196,165,116,0.5)" : "#1E2030",
          color: open ? VP_UP_DEFAULT : "#8B8FA8",
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
            <div className="text-[10px] text-wm-text-dim -mt-1">The shelf ink colors only these VP bars — candle colors live in Settings.</div>
            <SchemePresets onApply={(up, dn) => applyVp(up, dn)} />
            <div className="h-px bg-wm-border" />
            {/* One shelf ink. A VP row is volume at a price with no aggressor
                side (never split by candle direction), so there is no Ask or
                Bid to colour. */}
            {field("Shelf", vpUp, v => applyVp(v, vpDn))}
            <div className="h-px bg-wm-border" />
            <div className="text-[11px] font-bold text-wm-text">Bar numbers</div>
            <div className="flex gap-1">
              {(["all", "key"] as const).map(m => (
                <button key={m} onClick={() => applyLabelMode(m)}
                  className="flex-1 px-2 py-1 rounded text-[10px] font-semibold border transition-all"
                  style={{
                    background: labelMode === m ? "rgba(196,165,116,0.15)" : "#131520",
                    borderColor: labelMode === m ? "rgba(196,165,116,0.5)" : "#1E2030",
                    color: labelMode === m ? VP_UP_DEFAULT : "#8B8FA8",
                  }}>
                  {m === "all" ? "Every bar" : "Key levels"}
                </button>
              ))}
            </div>
            <div className="h-px bg-wm-border" />
            <div className="text-[11px] font-bold text-wm-text">Value-area levels</div>
            {/* The profile family's ink owner (profileFamilyInk) follows these
                three: a choice here restyles every profile species, so the gear
                says so instead of promising "only the VP". */}
            <div className="text-[10px] text-wm-text-dim -mt-1" data-testid="vp-level-ink-scope">POC, VAH &amp; VAL colors — a choice here restyles every profile on the chart (Living, Structure, Memory, TPO…), not only this VP.</div>
            {field("POC (Point of Control)", poc, v => applyLevel("poc", v))}
            {field("VAH box (Value Area High)", vah, v => applyLevel("vah", v))}
            {field("VAL box (Value Area Low)", val, v => applyLevel("val", v))}
            {/* THE CONTROL THAT FROZE THE RAINBOW. "Reset" means "give me the
                product's own answer", so it must hand back the ROOM — not the
                palette the pre-OS build happened to ship with. */}
            <button onClick={() => { applyVp(VP_UP_DEFAULT, VP_DOWN_DEFAULT); applyLevel("poc", VP_POC_DEFAULT); applyLevel("vah", VP_VALUE_AREA_DEFAULT); applyLevel("val", VP_VALUE_AREA_DEFAULT); }}
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
    indicators: ["VWAP", "Volume", "Delta Divergence"],
    alerts: ["Large delta spike", "Absorption detected"] },
];
export type CandleType =
  | "candles" | "heikin-ashi" | "hollow" | "line" | "area"
  | "bars" | "hlc-bars" | "baseline" | "columns"
  | "volume-candles" | "vp-candles" | "orderflow-candles"
  | "renko" | "range-bars";

/**
 * Persist a preference WHEN IT CHANGES — never on mount.
 *
 * The plain `useEffect(() => lsSet(k, v), [v])` this replaces fired on mount,
 * which wrote a fallback into storage before the trader had touched anything.
 * After that first write the product could no longer distinguish "switched off"
 * from "never seen", and every future change of default became a no-op for
 * everyone who had already visited. See `src/lib/chartPreferenceRepair.ts` for
 * the full account and the one-time cleanup of the damage.
 *
 * Skipping the first run is safe precisely because the state was SEEDED from
 * storage by its `useState` initializer: on mount the value in memory and the
 * value on disk already agree, so the write it skips is a write that would
 * change nothing — except to manufacture a preference nobody expressed.
 *
 * `dep` is what decides whether a change happened; `value` is what gets stored.
 * They differ only where the state is a live object (a Set) that must be
 * serialised to an array without making the dependency a fresh reference on
 * every render.
 */
function usePersistOnChange(key: string, dep: unknown, value: unknown = dep) {
  const seeded = useRef(false);
  const latest = useRef(value);
  latest.current = value;
  useEffect(() => {
    if (!seeded.current) {
      seeded.current = true;
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(latest.current));
    } catch {}
  }, [key, dep]);
}

export function ChartsDashboard({ initialTimeframe = null }: { initialTimeframe?: string | null } = {}) {
  const { activeSymbol, setActiveSymbol } = useActiveSymbol();

  /**
   * MUST RUN BEFORE EVERY `lsGet` BELOW, which is why it is a `useState`
   * initializer and not an effect: initializers run during this render, in
   * source order, while effects run after the whole render is done — far too
   * late to influence the values this component is reading right now.
   *
   * One-time, self-stamping, no-op on the server. Its return value is
   * deliberately unused; it is called for what it removes, not what it returns.
   */
  useState(repairChartPreferences);

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
  // The Settings door (brokerConnectDoor.ts): an in-room knock, or arriving
  // with ?connect=brokers. Either opens THIS panel; the param is read once.
  useEffect(() => {
    const knock = () => openBrokerConnect(null);
    window.addEventListener(BROKER_CONNECT_EVENT, knock);
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get(BROKER_CONNECT_PARAM) === BROKER_CONNECT_VALUE) {
        url.searchParams.delete(BROKER_CONNECT_PARAM);
        window.history.replaceState(window.history.state, "", url.pathname + (url.search ? url.search : "") + url.hash);
        knock();
      }
    } catch { /* malformed URL — the Tools door still opens the panel */ }
    return () => window.removeEventListener(BROKER_CONNECT_EVENT, knock);
  }, [openBrokerConnect]);
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

  /**
   * B-201 · URL WRITEBACK — the riser records what was actually built on it.
   *
   * Until this effect, continuity was one-way: the URL could seed the room and
   * the room never answered. A trader who arrived on `?symbol=NVDA`, tapped
   * TSLA and switched to 1H was looking at a view the address bar still
   * described as NVDA — so Copy Link sent a colleague the wrong instrument,
   * and a reload restored the link instead of the work.
   *
   * `replaceState`, deliberately, per the reasoning in
   * `marketSurfaceUrlWriteback`: pushing would turn every watchlist tap into a
   * history entry and make Back walk the trader backwards through their own
   * browsing one symbol at a time. One entry per arrival, kept accurate.
   *
   * This cannot become a second owner. The stamp is computed FROM the room's
   * own state and re-validated through the same normalizers the seed path
   * uses, and the seeding latches above are keyed on VALUE — so a writeback
   * that hands `?symbol=TSLA` back to a room already showing TSLA is an early
   * return, not a loop.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const next = marketSurfaceUrlWriteback(window.location.search, symbol, timeframe);
    if (next === null) return;
    try {
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${next}`);
    } catch {
      // A history quota or sandboxed frame must never take the chart down.
      // The URL simply stays stale, which is exactly the prior behaviour.
    }
  }, [symbol, timeframe]);
  const [pineOutput,      setPineOutput]      = useState<PineOutput | null>(null);
  const [pineCode,        setPineCode]        = useState<string>("");
  const [chartBars,       setChartBars]       = useState<LegacyOhlcvTuple[]>([]);
  const [chartBarIdentities, setChartBarIdentities] = useState<readonly CanonicalBarIdentity[]>([]);
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
  /**
   * THE ONE BOOLEAN BEHIND THE `chart-tools` DOOR.
   *
   * Defaults CLOSED, and that is a real cost worth naming: the profiles
   * catalogue and the arrangement declaration used to be readable at a glance
   * above the candles, and now they are one press away. The exchange is that
   * the strip they were printed on was covering two of its own neighbours at
   * 1440 and three at 390 — it was not "a glance" for anyone whose window was
   * narrower than 823px of cluster plus the row beneath it.
   *
   * Owned here rather than in `ChartToolbar` because the rail speaks to the
   * ROOM: `subscribeEquipment` is a room-level subscription, and a boolean the
   * toolbar owned privately could not be reached by it.
   */
  const [chartEquipmentOpen, setChartEquipmentOpen] = useState(false);

  // ── WM VP indicators (draw ON chart canvas) ─────────────────
  const [fixedVPActive,   setFixedVPActive]   = useState<boolean>(() => lsGet("wm_fixedVP", false) as boolean);
  const [sessionVPChart,  setSessionVPChart]  = useState<boolean>(() => lsGet("wm_sessionVP", false) as boolean);
  /**
   * ABSORPTION ANATOMY (Founder Asset 06) — the EFFORT field + ABSORPTION ZONE
   * band, drawn on the chart in price/time space by MainChart's overlay pass.
   *
   * ── WHY THIS DEFAULT FLIPPED TO ON, 2026-09-20 ────────────────────────────
   *
   * It used to default OFF, and the reason written here was that the reading is
   * "contextual by design: a reading you switch on, not a permanent fixture".
   * That sentence was reasonable in isolation and indefensible next to its
   * siblings. Read the four order-flow switches immediately below: all four
   * default ON. So the product shipped with this arrangement —
   *
   *   ON   stacked imbalance   ┐
   *   ON   value candle        │ three require a PROVIDER-ASSERTED
   *   ON   delta divergence    ┘ aggressor side. `useOrderFlowReadings` gates
   *   ON   liquidity weather     raw prints only; side is not required.
   *   OFF  absorption anatomy    ← the ONLY one that draws from bars alone.
   *
   * — which was exactly backwards. Three cannot speak without sided tape and
   * the fourth waits for raw prints; the bar-derived layer can always speak but
   * was off. On a futures chart reading "NO LIVE PRINT", all four switched-on
   * layers were silent for explicitly different reasons while the one layer
   * with something to say was disabled. The trader saw an empty chart and four
   * lit toggles, which is the worst of both: no picture AND no honest absence
   * pointing at the real cause.
   *
   * Absorption is safe to default ON precisely because it never has to guess.
   * `selectAbsorptionAnatomy` publishes a TIERED basis — SIGNED_DELTA when the
   * venue asserts sides, INFERRED_DELTA when it was reconstructed, VOLUME when
   * there is no split at all, and UNMEASURED when there is not even volume. The
   * VOLUME tier is not a fallback dressed as delta; it is the classic
   * effort-vs-result read on its own honest footing, and the basis chip on the
   * glass prints which tier produced the picture every single frame. When
   * nothing is measurable the overlay draws no field and no band and states
   * "EFFORT UNMEASURED" in the slot the basis would have occupied.
   *
   * So defaulting this ON cannot produce a beautiful lie and cannot produce a
   * quiet blank. Those are the two failures a default-on layer has to be able
   * to rule out, and this one rules out both — which is more than the four
   * layers that were already defaulting ON could claim.
   *
   * It remains a switch. `ProfilesMenu` turns it off in one click and the
   * choice persists, because a layer that paints owes the trader a way to stop
   * it painting. What changed is only which way it points before anyone asks.
   */
  const [absorptionAnatomy, setAbsorptionAnatomy] = useState<boolean>(() => lsGet("wm_absorptionAnatomy", true) as boolean);

  /*
    ── THE FOUR ORDER-FLOW LAYERS THE TRADER MAY QUIET ───────────────────────

    These four readings now paint on the price axis, and a layer that paints
    owes the trader a way to stop it. A chart you cannot quiet is not a chart
    you own — and four layers arriving at once, unbidden, the moment a real
    tape connects is exactly the kind of surprise that makes a trader stop
    trusting the surface.

    They default ON because they were shipped ON, and silently switching off a
    layer the product just started drawing would be a second surprise dressed
    as a fix. The switch is the new thing here, not the drawing.

    Each is its own key rather than one "order flow" master switch: the four
    answer different questions and a trader who wants the stall shelves without
    the divergence marks should not have to give up both.
  */
  const [imbalanceStackOn, setImbalanceStackOn] = useState<boolean>(() => lsGet("wm_ofImbalanceStack", true) as boolean);
  const [valueCandleOn, setValueCandleOn] = useState<boolean>(() => lsGet("wm_ofValueCandle", true) as boolean);
  const [deltaDivergenceOn, setDeltaDivergenceOn] = useState<boolean>(() => lsGet("wm_ofDeltaDivergence", true) as boolean);
  const [liquidityWeatherOn, setLiquidityWeatherOn] = useState<boolean>(() => lsGet("wm_ofLiquidityWeather", true) as boolean);
  const [effortMarkOn, setEffortMarkOn] = useState<boolean>(() => lsGet("wm_ofEffortMark", true) as boolean);
  const [deltaLevelsOn, setDeltaLevelsOn] = useState<boolean>(() => lsGet("wm_ofDeltaLevels", true) as boolean);
  const [livingProfileOn, setLivingProfileOn] = useState<boolean>(() => lsGet("wm_ofLivingProfile", true) as boolean);
  const [marketStructureOn, setMarketStructureOn] = useState<boolean>(() => lsGet("wm_ofMarketStructure", true) as boolean);
  // P-110 #10. OFF by default: HOME stays calm, and the Profiles door lights it.
  const [tpoProfileOn, setTpoProfileOn] = useState<boolean>(() => lsGet("wm_ofTpoProfile", false) as boolean);
  // P-110 #2. OFF by default for the same reason.
  const [structureProfileOn, setStructureProfileOn] = useState<boolean>(() => lsGet("wm_ofStructureProfile", false) as boolean);
  const [profileDnaOn, setProfileDnaOn] = useState<boolean>(() => lsGet("wm_ofProfileDna", false) as boolean);
  const [valueMigrationOn, setValueMigrationOn] = useState<boolean>(() => lsGet("wm_ofValueMigration", false) as boolean);
  const [profileMemoryOn, setProfileMemoryOn] = useState<boolean>(() => lsGet("wm_ofProfileMemory", false) as boolean);
  const [profileFusionOn, setProfileFusionOn] = useState<boolean>(() => lsGet("wm_ofProfileFusion", false) as boolean);
  const [compositeProfileOn, setCompositeProfileOn] = useState<boolean>(() => lsGet("wm_ofCompositeProfile", false) as boolean);
  const [visibleRangeProfileOn, setVisibleRangeProfileOn] = useState<boolean>(() => lsGet("wm_ofVisibleRangeProfile", false) as boolean);
  const [regimeLightingOn, setRegimeLightingOn] = useState<boolean>(() => lsGet("wm_ofRegimeLighting", false) as boolean);
  const [questionLensOn, setQuestionLensOn] = useState<boolean>(() => lsGet("wm_ofQuestionLens", false) as boolean);
  // What the trader ASKED of the Question Lens (Auto = the camera chooses).
  const [questionChoice, setQuestionChoice] = useState<QuestionChoice>(() => {
    const v = lsGet("wm_questionChoice", "AUTO") as string;
    return QUESTION_CHOICES.some(c => c.id === v) ? (v as QuestionChoice) : "AUTO";
  });
  const [anatomyCardsOn, setAnatomyCardsOn] = useState<boolean>(() => lsGet("wm_ofAnatomyCards", false) as boolean);
  const [profileStackPrefs, setProfileStackPrefs] = useState<ProfileStackPrefs>(() => {
    if (typeof window === "undefined") return parseStackPrefs(null);
    try { return parseStackPrefs(localStorage.getItem(STACK_PREFS_STORAGE_KEY)); } catch { return parseStackPrefs(null); }
  });
  const onStackPrefsChange = (p: ProfileStackPrefs) => {
    setProfileStackPrefs(p);
    try { localStorage.setItem(STACK_PREFS_STORAGE_KEY, JSON.stringify(p)); } catch { /* storage blocked — this visit only */ }
  };
  const [memoryGhostOn, setMemoryGhostOn] = useState<boolean>(() => lsGet("wm_ofMemoryGhost", false) as boolean);
  const [expectedEnvelopeOn, setExpectedEnvelopeOn] = useState<boolean>(() => lsGet("wm_ofExpectedEnvelope", false) as boolean);
  const [contradictionOn, setContradictionOn] = useState<boolean>(() => lsGet("wm_ofContradiction", false) as boolean);
  // H-1001 — ON by default: risk is visible, bracketed, on the book. It only
  // draws when the trader has drawn a Long / Short Position with a stop.
  const [riskOnPriceOn, setRiskOnPriceOn] = useState<boolean>(() => lsGet("wm_ofRiskOnPrice", true) as boolean);
  const [liquidityLifecycleOn, setLiquidityLifecycleOn] = useState<boolean>(() => lsGet("wm_ofLiquidityLifecycle", false) as boolean);
  // Scaffolding depth: one switch, three depths. OFF → FOUNDATION → INTERMEDIATE → PRO → OFF.
  const [scaffoldingDepth, setScaffoldingDepth] = useState<ScaffoldingDepth | "OFF">(() => {
    const v = lsGet("wm_ofScaffolding", "OFF") as string;
    return (SCAFFOLDING_DEPTHS as readonly string[]).includes(v) ? (v as ScaffoldingDepth) : "OFF";
  });

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
    // MIGRATED ON READ. The persist effect below writes the WHOLE settings
    // object, so every untouched default got frozen into storage as an
    // explicit value the first time a trader changed anything at all. Without
    // `migrateMarketField` the spread puts that frozen navy on the right of
    // the defaults and the room's material could never reach an existing
    // trader's canvas. See `lib/chart/marketFieldMaterial.ts`.
    () => ({
      ...DEFAULT_CHART_SETTINGS,
      ...(migrateMarketField(
        lsGet<Partial<ChartSettings>>("wm_chartSettings", {}),
      ) as Partial<ChartSettings>),
    }),
  );
  // Persist chart settings (candle colors, grid, etc.) so a refresh keeps them.
  //
  // ON CHANGE, NOT ON MOUNT — and here that is more than tidiness. The
  // initializer above MERGES `DEFAULT_CHART_SETTINGS` under whatever partial is
  // stored, so the mount write used to flatten the full merged object back to
  // disk. From then on every default in this table was frozen at the value it
  // had on the trader's first visit, and changing one in source could never
  // reach them. Skipping the mount write leaves the stored object PARTIAL, so
  // the defaults are re-merged live on every load and stay editable.
  usePersistOnChange("wm_chartSettings", chartSettings);

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
    switch ((appSettings.chartTheme as string | undefined) ?? "green-red") {
      case "gold-current":
        return {
          candleUp: CANDLE_UP_DEFAULT, candleDown: CANDLE_DOWN_DEFAULT,
          borderUp: CANDLE_UP_DEFAULT, borderDown: CANDLE_DOWN_DEFAULT,
          wickUp: CANDLE_UP_DEFAULT, wickDown: CANDLE_DOWN_DEFAULT,
        };
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
      case "custom": return null;
      case "green-red":
      default:
        return {
          candleUp: LEGACY_CANDLE_UP, candleDown: LEGACY_CANDLE_DOWN,
          borderUp: LEGACY_CANDLE_UP, borderDown: LEGACY_CANDLE_DOWN,
          wickUp: LEGACY_CANDLE_UP, wickDown: LEGACY_CANDLE_DOWN,
        };
    }
  })();

  const paletteChartSettings: ChartSettings = chartThemeColors
    ? { ...chartSettings, ...chartThemeColors }
    : chartSettings;

  // Display mode owns the room material, never the market-direction channels.
  // A trader's palette remains visible in both Original and WM Neon.
  const effChartSettings: ChartSettings = theme === "neon"
    ? {
        ...paletteChartSettings,
        background: "#02060A",
        gridColor: "rgba(47,243,255,0.07)",
        crosshairColor: "#2ff3ff",
        neon: true,
      }
    : paletteChartSettings;

  const applyChartSettings = useCallback((next: ChartSettings) => {
    if (next === DEFAULT_CHART_SETTINGS) {
      setChartSettings(next);
      // "Reset defaults" resets the product choice as well as the six stored
      // color channels. The current product default is Classic red/green;
      // leaving the app preset on `custom` would immediately reveal the old
      // gold storage defaults and make Reset contradict the settings label.
      const settings = { ...readAppSettings(), chartTheme: "green-red" };
      try { localStorage.setItem("wm_settings", JSON.stringify(settings)); } catch {}
      setAppSettings(settings);
      window.dispatchEvent(new CustomEvent("wm-settings-changed"));
      return;
    }

    const candleKeys: Array<keyof ChartSettings> = [
      "candleUp", "candleDown", "wickUp", "wickDown", "borderUp", "borderDown",
    ];
    const candlePaintChanged = candleKeys.some(key => next[key] !== effChartSettings[key]);
    setChartSettings(next);
    if (!candlePaintChanged) return;

    // A deliberate swatch choice becomes the active palette immediately.
    // Without this handoff, the app-wide preset silently overpainted the
    // trader's six candle channels and the picker appeared to do nothing.
    const settings = { ...readAppSettings(), chartTheme: "custom" };
    try { localStorage.setItem("wm_settings", JSON.stringify(settings)); } catch {}
    setAppSettings(settings);
    window.dispatchEvent(new CustomEvent("wm-settings-changed"));
  }, [effChartSettings]);

  // ── NEW: Layout ─────────────────────────────────────────────
  const [chartLayout, setChartLayout] = useState<ChartLayout>(() => lsGet("wm_chartLayout", "1") as ChartLayout);

  // ── Persist key state to localStorage ───────────────────────
  // ON CHANGE, NOT ON MOUNT. See `usePersistOnChange` above: the previous
  // `useEffect(… , [x])` form wrote every fallback to disk on first paint,
  // which is how a stored preference stopped meaning "the trader chose this".
  usePersistOnChange("wm_activeInds", activeInds, [...activeInds]);
  usePersistOnChange("wm_indSettings",  indSettings);
  usePersistOnChange("wm_footprint",    footprintType);
  usePersistOnChange("wm_fp_enabled",   footprintEnabled);
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
  usePersistOnChange("wm_candleType",   candleType);
  usePersistOnChange("wm_timeframe",    timeframe);
  usePersistOnChange("wm_chartLayout",  chartLayout);
  usePersistOnChange("wm_extHours",     extHours);
  usePersistOnChange("wm_fixedVP",      fixedVPActive);
  usePersistOnChange("wm_sessionVP",    sessionVPChart);
  usePersistOnChange("wm_absorptionAnatomy",   absorptionAnatomy);
  usePersistOnChange("wm_ofImbalanceStack",    imbalanceStackOn);
  usePersistOnChange("wm_ofValueCandle",       valueCandleOn);
  usePersistOnChange("wm_ofDeltaDivergence",   deltaDivergenceOn);
  usePersistOnChange("wm_ofLiquidityWeather",  liquidityWeatherOn);
  usePersistOnChange("wm_ofEffortMark",        effortMarkOn);
  usePersistOnChange("wm_ofDeltaLevels",      deltaLevelsOn);
  usePersistOnChange("wm_ofLivingProfile",    livingProfileOn);
  usePersistOnChange("wm_ofMarketStructure",  marketStructureOn);
  usePersistOnChange("wm_ofTpoProfile",       tpoProfileOn);
  usePersistOnChange("wm_ofStructureProfile", structureProfileOn);
  usePersistOnChange("wm_ofProfileDna",       profileDnaOn);
  usePersistOnChange("wm_ofValueMigration",   valueMigrationOn);
  usePersistOnChange("wm_ofProfileMemory",    profileMemoryOn);
  usePersistOnChange("wm_ofProfileFusion",    profileFusionOn);
  usePersistOnChange("wm_ofCompositeProfile", compositeProfileOn);
  usePersistOnChange("wm_ofVisibleRangeProfile", visibleRangeProfileOn);
  usePersistOnChange("wm_ofRegimeLighting",   regimeLightingOn);
  usePersistOnChange("wm_ofQuestionLens",     questionLensOn);
  usePersistOnChange("wm_questionChoice",     questionChoice);
  // SHOW RAW is a look, not a setting: never persisted, so a reload can never
  // open onto a bare chart the trader forgot they asked for.
  const [rawOn, setRawOn] = useState(false);
  usePersistOnChange("wm_ofScaffolding",      scaffoldingDepth);
  usePersistOnChange("wm_ofAnatomyCards",     anatomyCardsOn);
  usePersistOnChange("wm_ofMemoryGhost",      memoryGhostOn);
  usePersistOnChange("wm_ofExpectedEnvelope", expectedEnvelopeOn);
  usePersistOnChange("wm_ofContradiction",    contradictionOn);
  usePersistOnChange("wm_ofRiskOnPrice",      riskOnPriceOn);
  usePersistOnChange("wm_ofLiquidityLifecycle", liquidityLifecycleOn);

  // ── NEW: Bar replay ─────────────────────────────────────────
  const [replayActive,   setReplayActive]   = useState(false);
  /**
   * IS A COMPANION CAMERA ACTUALLY DRIVING THE BARS ON THIS GLASS?
   *
   * `replayActive` answers a DIFFERENT question — "is the replay panel open" —
   * and the two answers are not the same answer today. MEASURED on production
   * 2026-09-22, canvas-hash sampled at t+1s / t+6s / t+11s after engaging
   * replay: the price pane kept repainting and the payload kept GROWING, which
   * is a live socket appending prints, not a camera walking history. The panel
   * itself says so in its own words — "Not wired to the chart yet … Nothing you
   * see behind this panel is a replay."
   *
   * THE OWL CAME BACK FACING THE OTHER WAY. The masthead, the chart's data-truth
   * strip and the decision spine were all taught to answer `replayActive`, so
   * opening an unwired panel made three surfaces certify HISTORICAL BARS over
   * candles that were live. Curing a lie by installing its mirror image is not
   * a cure; "impossible to confuse" is violated in both directions.
   *
   * So the fidelity question gets its own owner, and the panel's own disclosure
   * flag is fed from it rather than hardcoded a second time. While this is false
   * every surface tells the truth about LIVE bars and the panel discloses that
   * it drives nothing. When the real wire lands — frozen CanonicalBar ancestry,
   * never a slice of today's bars — ONE edit here turns the whole room at once,
   * which is the only arrangement in which those surfaces cannot drift apart.
   *
   * THE OWNER MOVED OUT OF THIS FILE, AND THAT IS THE THIRD CORRECTION.
   * It was declared here for one commit. Then the EQUIPMENT MENU needed the
   * same answer — so that the Replay entry can disclose it drives nothing
   * BEFORE the trader presses, instead of after, when an orange panel is
   * already sitting under a LIVE masthead. A registry that hardcoded its own
   * `false` would have been a second owner of one fact: the same two-headed
   * horse, rebuilt one file over. So it lives in `roomEquipment.ts` — the
   * lowest file both the room and the rail already import — and is read here.
   */
  /** The single sentence every fidelity surface in this room is answering. */
  const cameraWalksHistory = replayActive && REPLAY_DRIVES_THE_CAMERA;
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

  const { ticker, recentTicks, source, tapeSource, connected, lastObservedAtMs } = useWebSocket({ symbol, timeframe });
  /*
    ONE OWNER of the six order-flow readings — value candle, absorption,
    delta divergence, liquidity weather, stacked imbalance, delta levels.
    Hoisted immediately behind the tape so every consumer below (glass
    compilers, panel, drawer) reads the same compiled moment. See the
    header on `useOrderFlowReadings` for the shape of the defect this ends.
  */
  const chartOrderFlowReadings = useOrderFlowReadings(recentTicks, tapeSource);
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

  // ── Asset 06 · ABSORPTION ANATOMY ────────────────────────────────────
  //
  // The SAME `chartBars` the chart drew. Not a second fetch, not a second
  // window: a view that measured a different set of candles than the ones on
  // screen would be a second owner of "what happened in this window", which is
  // the drift class this room has already been repaired for twice.
  //
  // askVol / bidVol are deliberately absent here. `LegacyOhlcvTuple` carries no
  // aggressor split, so the selector resolves the window's basis to VOLUME and
  // the view says so in its own header. Synthesizing a split from candle
  // direction would make the picture match the mockup and the reading a lie.
  // ONE MAPPING, NOT TWO. This is the single place in this room where a chart
  // bar becomes an anatomy input, and both views below consume this exact
  // array. It was two verbatim-identical `chartBars.map` blocks until
  // 2026-09-18, which made the "same bars" guarantee a matter of two blocks of
  // code happening to still agree — a thing that survives until the first
  // person edits one of them. Now the guarantee is structural: there is only
  // one array, so there is nothing for the two surfaces to disagree about.
  //
  // askVol / bidVol are deliberately null. `LegacyOhlcvTuple` carries no aggressor
  // split, so the selector resolves the window's basis to VOLUME and each view
  // says so in its own header. Synthesizing a split from candle direction would
  // make the picture match the mockup and the reading a lie.
  const anatomyInput = React.useMemo<AnatomyBarInput[]>(() => (
    chartBars.map(b => ({
      time: typeof b.time === "number" ? b.time : Number(b.time),
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: Number.isFinite(b.volume) ? b.volume : null,
      askVol: null,
      bidVol: null,
    }))
  ), [chartBars]);

  const absorptionAnatomyVM = React.useMemo(
    () => selectAbsorptionAnatomyView(anatomyInput, { windowBars: 30 }),
    [anatomyInput],
  );

  // CANON ASSET 03 — the same window, the same bars, the same absent aggressor
  // split, now literally the same input array. It still does NOT derive from
  // the Absorption view model above: that view model is already shaped for
  // columns, and reaching through it would make the scatter a reader of a
  // rendering rather than of the measurement. Sharing the INPUT is the opposite
  // of that — both surfaces read the same measurement and each compiles its own
  // view of it, which is what "they can never disagree about which bars
  // absorbed" was always trying to say.
  const aggressionResponseVM = React.useMemo(
    () => selectAggressionResponse(anatomyInput, { windowBars: 30 }),
    [anatomyInput],
  );

  // ── Asset 05 · BIG TRADE INTELLIGENCE ─────────────────────────────────
  //
  // Fed from `recentTicks` — the PER-TRADE tape — and not from `chartBars`,
  // unlike the two views above. That is the whole point of this surface: "was
  // that ONE print large" is a question about a single execution, and a candle
  // has already thrown away the executions that made it. Deriving a print from
  // a bar's volume would be a fabricated trade, which is the exact defect the
  // bubble owner in src/lib/bigTradeLevels.ts was written to end.
  //
  // No `base` is passed: the selector keys the chart's absolute floor on the
  // latest print's own price, which is the same input `minBigTradeLot` is given
  // everywhere else. Passing `ticker.price` here would introduce a second
  // owner of "what this instrument costs" for no gain.
  const bigTradeIntelligenceVM = React.useMemo(
    () => selectBigTradeIntelligence(recentTicks),
    [recentTicks],
  );

  // ── Asset 06 · THE LIVING PROFILE ─────────────────────────────────────
  //
  // The only one of the four microstructure siblings that can answer on EVERY
  // feed, because volume-at-price has an honest fallback the other three do
  // not: when no per-trade tape exists, `vpEngine` can estimate the
  // distribution from bars and LABELS it as estimated.
  //
  // The source is not chosen here. `buildLivingProfileSnapshot` owns that
  // decision so this room and any future one cannot end up drawing two
  // different POCs for the same instrument and both being defensible.
  //
  // `ticker.price` IS passed, unlike the Big Trades memo: a profile's levels
  // are static until the distribution changes, and the only thing that moves
  // is where price sits against them. That position is the reading, and it
  // needs the room's live price, not the last print inside the sample.
  const livingProfileVM = React.useMemo(
    () =>
      selectLivingProfile(buildLivingProfileSnapshot(recentTicks, chartBars), {
        livePrice: ticker.price,
      }),
    [recentTicks, chartBars, ticker.price],
  );

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
  // THE TRADER'S OWN RECORD, on the same subscription the deck uses. The merge
  // of live decision memory with the journal book lives in useSessionDecisions
  // and nowhere else, so this room and /command-deck cannot answer "where have
  // I performed" from two different lists.
  const { decisions: chartSessionDecisions } = useSessionDecisions(canvasUser?.id ?? null);
  // Live cadence clock, for the same reason the canvas keeps one: evidence age
  // must keep advancing when the feed is silent instead of freezing at the last
  // market-state change. SSR-safe — null before mount, so first paint matches.
  const chartEdgeNowMs = useCanvasClock() ?? Date.now();


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
      // THE COMPANION CAMERA. Not "is the panel open" — is a camera actually
      // DRIVING these bars. See `cameraWalksHistory`: answering the panel's
      // open/closed state here made the masthead certify HISTORICAL BARS over
      // live candles, which is the same law broken in the opposite direction.
      replayEngaged: cameraWalksHistory,
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

  // ── Asset 15 · QUESTION-DRIVEN CONTINUATION HEALTH ────────────────────
  //
  // Two owners, read against each other. The swing sequence comes from the
  // SAME `chartBars` the candles are drawn from — a view that measured a
  // different set of candles than the ones on screen would be a second owner
  // of "what happened in this window". The regime comes from the canonical
  // store under `canvasIdentity`, which is the identity the publisher on this
  // very component writes with, so reader and writer cannot drift.
  //
  // `selectRegime` needs a CanonicalMarketState. Until the store has one for
  // this identity, `regime` is null and `selectContinuationHealth` returns
  // UNREADABLE carrying its own reason — which is the honest reading, not a
  // placeholder. Nothing here fabricates a regime to fill the gap.
  //
  // It reads `chartCanvasState` — the subscription declared just above — and
  // does NOT open a second one. Two calls to the same hook on the same
  // identity would be two readers of one fact, harmless today only because the
  // store is single-valued, which is not a property to build on.
  const continuationHistory = useCanonicalMarketStateHistory(canvasIdentity, 6);
  // LIFTED OUT of the continuation memo below, because a SECOND surface now
  // reads it. The alternative — calling `selectRegime` again inside the
  // worksheet memo — would make two authors of one reading, and the two could
  // drift the moment either memo's dependency list changed. One owner, two
  // readers.
  const chartRegimeVM = React.useMemo(
    () =>
      chartCanvasState
        ? selectRegime({ state: chartCanvasState, history: continuationHistory })
        : null,
    [chartCanvasState, continuationHistory],
  );
  /** H-901 — the ONE regime owner, read as a dimmer. Never re-derived. */
  const chartRegimeLighting = React.useMemo(() => selectRegimeLighting(chartRegimeVM), [chartRegimeVM]);
  const chartStructureVM = React.useMemo(() =>
    selectMarketStructure(
      chartBars.map(b => ({
        time: typeof b.time === "number" ? b.time : Number(b.time),
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      })),
    ),
  [chartBars]);
  /*
    SWING-ORIGIN ZONES (Market Object Passport mockup). Same structure owner,
    same identities; biography from the ONE lifecycle owner. They join the
    selectable objects so they get the existing on-price selectors.
  */
  const chartStructureZones = React.useMemo(() => selectStructureZoneObjects({
    structure: chartStructureVM,
    bars: chartBars.map(b => ({
      time: typeof b.time === "number" ? b.time : Number(b.time),
      open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume,
    })),
    identities: chartBarIdentities,
  }), [chartStructureVM, chartBars, chartBarIdentities]);
  // Compiled once per bar change here, never per animation frame in the
  // canvas, so Inspect and selection can later read the same reading.
  const chartLiquidityLifecycle = React.useMemo(
    () => liquidityLifecycleOn
      ? selectLiquidityLifecycle(chartBars.map(b => ({
          time: typeof b.time === "number" ? b.time : Number(b.time),
          high: b.high, low: b.low, close: b.close,
          volume: Number.isFinite(b.volume) ? b.volume : 0,
        })))
      : null,
    [liquidityLifecycleOn, chartBars],
  );
  // Hoisted above the market objects (they depend only on the bars): Profile
  // Memory's remembered levels are canonical LEVEL objects while its layer is on.
  const valueMigrationVM = React.useMemo(
    () => selectValueMigration(
      chartBars.map(b => ({
        time: typeof b.time === "number" ? b.time : Number(b.time),
        open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume,
      })),
    ),
    [chartBars],
  );

  /** P-110 #4 — prior sessions' FINAL migration value, carried forward. */
  const profileMemoryVM = React.useMemo(
    () => selectProfileMemory(
      valueMigrationVM,
      chartBars.map(b => ({
        time: typeof b.time === "number" ? b.time : Number(b.time),
        open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume,
      })),
    ),
    [valueMigrationVM, chartBars],
  );

  // H-601 · the Living Profile's session lineage for Inspect (same owner the movie draws).
  const livingBiographyVM = React.useMemo(() => selectLivingBiography(valueMigrationVM), [valueMigrationVM]);
  const chartMarketObjects = React.useMemo(() => [
    ...selectStructureMarketObjects({
      structure: chartStructureVM,
      bars: chartBars,
      identities: chartBarIdentities,
    }),
    ...chartStructureZones.map(z => z.object),
    // Profile Memory's remembered POC / VAH / VAL — selectable, so their
    // biography (birth, tests, naked) reaches the Passport. Only while the
    // Memory layer is on: pins for a layer the trader switched off are noise.
    ...(profileMemoryOn ? selectMemoryMarketObjects({ memory: profileMemoryVM, identities: chartBarIdentities }) : []),
  ], [chartStructureVM, chartBars, chartBarIdentities, chartStructureZones, profileMemoryOn, profileMemoryVM]);
  const chartMarketObjectTargets = React.useMemo(() => chartMarketObjects.flatMap(object => {
    const birth = chartBarIdentities.find(identity => identity.barId === object.birthBarId);
    return birth ? [{ object, birthTime: Math.floor(birth.asOf / 1000) }] : [];
  }), [chartMarketObjects, chartBarIdentities]);
  // ONE SELECTION AT A TIME. The selected object, the selected print (a
  // bubble) and the selected Living slice are three views of ONE union owned
  // by `selectChartSelection`, together with whether Inspect is open on it.
  // Selecting anything replaces the rest, so the glass never paints two
  // selected things while Inspect describes one of them.
  const [chartSelection, dispatchChartSelection] = React.useReducer(selectChartSelection, CHART_SELECTION_AT_REST);
  const selectedMarketObjectId = selectedObjectIdOf(chartSelection);
  const selectedPrint = selectedPrintOf(chartSelection);
  const selectedSlicePrice = selectedSliceOf(chartSelection);
  const selectedAnatomy = selectedAnatomyOf(chartSelection);
  const inspectOpen = chartSelection.inspectOpen;
  // CONTINUITY (Garden 12 · Defect 7): the selected object survives a refresh
  // in this browser session — keyed by symbol:timeframe, restored only when
  // the SAME object id is compiled again (never guessed, never carried to
  // another instrument). Session storage: a new session starts calm.
  const selectionKey = `wm:selectedObject:${symbol}:${timeframe}`;
  useEffect(() => {
    let saved: string | null = null;
    try { saved = sessionStorage.getItem(selectionKey); } catch { /* storage refused */ }
    dispatchChartSelection({
      type: "reconcile",
      symbol,
      timeframe,
      compiledObjectIds: chartMarketObjects.map(object => object.objectId),
      savedObjectId: saved,
    });
  }, [chartMarketObjects, selectionKey, symbol, timeframe]);
  // Written on select; cleared ONLY by an explicit let-go (`releasesObject`) —
  // an early compile that has not produced the object yet must not erase it.
  useEffect(() => {
    try { if (selectedMarketObjectId) sessionStorage.setItem(selectionKey, selectedMarketObjectId); }
    catch { /* storage refused: selection simply does not survive */ }
  }, [selectedMarketObjectId, selectionKey]);
  /** Every trader-driven selection change goes through here: one reducer, one memory rule. */
  const actOnChartSelection = (action: ChartSelectionAction) => {
    if (releasesObject(chartSelection, action)) {
      try { sessionStorage.removeItem(selectionKey); } catch { /* storage refused */ }
    }
    dispatchChartSelection(action);
  };
  // A shelf or mark exists only while the Absorption layer paints it. Switched
  // off, its selection is let go rather than left describing nothing.
  useEffect(() => {
    if (!absorptionAnatomy) actOnChartSelection({ type: "clear", kinds: ["ANATOMY"] });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires on the layer switch only
  }, [absorptionAnatomy]);
  const continuationHealthVM = React.useMemo(() =>
    selectContinuationHealth({ structure: chartStructureVM, regime: chartRegimeVM }),
  [chartStructureVM, chartRegimeVM]);

  // ── Asset 01 · LONG-DIVISION WORKSHEET ───────────────────────────────
  //
  // Composes six owners ALREADY in this room and invents none. It is the one
  // surface here that prints the STEPS rather than a conclusion, so every
  // reading it shows must be the same object the neighbouring tab shows —
  // hence the memos above are passed straight through rather than recomputed.
  //
  // The seventh rung (MISSING EVIDENCE) and the RIGHT OF WAY footer are drawn
  // as named absences: `decisionPermissionCompiler` compiles its debt from
  // decision nodes this room has never had. Wiring it in to fill the blank
  // would mean inventing its input.
  const divisionWorksheetVM = React.useMemo(
    () =>
      selectDivisionWorksheet({
        barCount: chartBars.length,
        tickCount: recentTicks.length,
        anatomy: absorptionAnatomyVM,
        response: aggressionResponseVM,
        regime: chartRegimeVM,
        continuation: continuationHealthVM,
      }),
    [
      chartBars.length,
      recentTicks.length,
      absorptionAnatomyVM,
      aggressionResponseVM,
      chartRegimeVM,
      continuationHealthVM,
    ],
  );

  /* Asset 18 — the same seven steps over ONE PRICE LEVEL.
   *
   * Fed from `recentTicks` directly, NOT from MainChart's `getBarFootprint`.
   * That function is a `useCallback` declared inside MainChart and is not
   * reachable from this component; plumbing it out would mean reshaping the
   * chart renderer to serve a worksheet, which is a large change aimed at the
   * wrong target. `recentTicks` is the same signed tape `getBarFootprint`
   * accumulates from, and this room already reads it for Asset 05 — so the
   * ladder and the Big Trades view can never disagree about what traded.
   *
   * The compiler is bounded by that tape's retention (`RECENT_TICK_RETENTION`)
   * and says so on its own constants. It reads UNREAD rather than estimating a
   * side when the feed does not state one, which on most equity feeds is the
   * honest answer.
   *
   * Handed in TIME ORDER, not the stream's order. The worksheet divides against
   * the LAST print it is given — "the most recent thing this room saw" — and
   * the stream holds its tape newest-first, so the raw array made that step
   * divide against the OLDEST print held. `chronologicalTape` is the same
   * conversion the order-flow compilation applies, so the worksheet and the
   * five readings agree on which print came last.
   */
  const footprintWorksheetVM = React.useMemo(
    () => selectFootprintWorksheet({ prints: chronologicalTape(recentTicks) }),
    [recentTicks],
  );

  /* FL-06 — THE INSPECT TICKET, on the candles.
   *
   * `onOHLCAtCursor` has been published by MainChart's crosshair handler since
   * long before this line and had ZERO consumers repo-wide. Adopting the
   * orphan is deliberate: a click handler would have been a SECOND
   * bar-selection path inside a ten-thousand-line chart, and two selection
   * paths is how one candle ends up with two tickets disagreeing about which
   * bar is selected.
   *
   * THE UNIT CONVERSION IS THE WHOLE RISK HERE. `LegacyOhlcvTuple.time` and
   * the cursor's `time` are epoch SECONDS; `Tick.time` is epoch MILLISECONDS;
   * all three are bare `number`. `selectInspectTicket` names its inputs
   * `barOpenMs` / `barSpanMs` / `timeMs` so the conversion cannot be forgotten
   * silently, and it refuses (never reads) if a seconds-shaped value arrives.
   */
  const [cursorBar, setCursorBar] = useState<
    { o: number; h: number; l: number; c: number; v: number; time: number } | null
  >(null);
  /**
   * CLOSED ON ARRIVAL — A-201 LAYER 5 SAYS "OPTIONAL", AND OPTIONAL IS A WORD
   * ABOUT THE DEFAULT.
   *
   * LOOKED AT, NOT INFERRED. 2026-09-21 I put two canon frames beside two
   * runtime screenshots of this room:
   *
   *   F24 "Workspace Equipment Over Live Chart" (desktop) — the candle field
   *   carries NOTHING. No floating cards. Workspace/Tools top-left, an asOf
   *   chip top-right, the decision rail right, candles everywhere else.
   *
   *   /tmp/os-1440.png — the same field carries an "Effort vs Result" card on
   *   the left and an "Inspect Ticket" card on the right, both on first paint,
   *   both unasked.
   *
   * At 390 it stops being a matter of taste. M-401/390 MOBILE ASSEMBLY builds
   * the phone from four parts — MARKET CAMERA, WAIT FINISHED PLAQUE, WORKSPACE
   * CORNER FASTENER, TOOLS CORNER FASTENER — and stamps the rest "DO NOT
   * INSTALL — LEFTOVER MALL PARTS". In /tmp/os-390.png the market camera is the
   * last thing to receive space and what it receives is covered by this card.
   *
   * A-201 layer 5 is explicit that the inspect sheet MUST NOT DEMOLISH LAYER 2.
   * A sheet that is up before the trader asked has demolished layer 2 by
   * default, and no press ever authorised it.
   *
   * NOTHING IS REMOVED. Both panels already ship a collapsed state — a labelled
   * 24px chip ("INSPECT" / "EFFORT") pinned to the same corner the panel opens
   * from. So this is a change of INITIAL STATE, not of capability: the reading
   * is one press away instead of zero, and the candles are visible at zero
   * presses instead of one. That trade is the whole point of the word
   * "optional", and it is the direction A-201 picks.
   *
   * ONE DEFAULT, NOT A WIDTH BRANCH. A `width < 768 ? false : true` here would
   * make the desktop disagree with F24 forever, and would plant a second rule
   * about what the camera is owed. G-001: 1440 and 390 are the SAME ORGANISM.
   */
  // `inspectOpen`, `selectedPrint` and `selectedSlicePrice` (H-601 · the
  // clicked price inside the Living Profile's lane, resolved to a compiler
  // bucket by `selectProfileSlice`) are read from `chartSelection` above; the
  // reducer's rest state is Inspect CLOSED, for the reasons given here.
  const activeSelectedPrint = selectedPrint?.symbol === symbol && selectedPrint.timeframe === timeframe ? selectedPrint : null;
  // A shelf or mark is measured on THIS chart's window; one made on another
  // symbol or timeframe is never shown here.
  const activeSelectedAnatomy = selectedAnatomy?.symbol === symbol && selectedAnatomy.timeframe === timeframe ? selectedAnatomy : null;

  /* The span comes from the bars the chart DREW, not from a second
   * string→seconds table beside `EXCHANGE_TIMEFRAME_SECONDS`. A parallel
   * table is a second owner of bar duration, and the two would eventually
   * disagree about what a "15m" bar is on a venue that closes early. */
  const chartBarSpanMs = React.useMemo(() => {
    if (chartBars.length < 2) return null;
    const a = chartBars[chartBars.length - 2].time;
    const b = chartBars[chartBars.length - 1].time;
    const span = (b - a) * 1000;
    return Number.isFinite(span) && span > 0 ? span : null;
  }, [chartBars]);

  /* When the cursor is nowhere — which is ALWAYS, for a touch user — the
   * ticket falls back to the bar still forming rather than blanking, and the
   * glass states that it did. A hover-only reading is one a touch user never
   * receives, which is the drawer-filed-receipt failure this product has
   * already repaired twice. */
  const inspectBar = React.useMemo(() => {
    if (cursorBar) return cursorBar;
    if (chartBars.length === 0) return null;
    const last = chartBars[chartBars.length - 1];
    return { o: last.open, h: last.high, l: last.low, c: last.close, v: last.volume, time: last.time };
  }, [cursorBar, chartBars]);
  const inspectFollowingLiveBar = cursorBar === null && inspectBar !== null;

  /**
   * FL-06 object ④ — Effort vs Result, weighed against the bars BEFORE it.
   *
   * THE SLICE IS THE WHOLE CORRECTNESS ARGUMENT. `selectEffortVsResult` divides
   * the subject bar by the MEDIAN of its cohort, and if the subject is inside
   * its own cohort a genuinely enormous bar inflates the baseline it is being
   * judged against and grades itself back toward ordinary. So `priorBars` is a
   * slice that STOPS AT the subject's index — never `chartBars` entire.
   *
   * It reads `inspectBar`, the same bar the Inspect Ticket reads, rather than
   * opening a second cursor path. Two panels over one candle disagreeing about
   * which candle is selected is the failure the ticket's own header warns about.
   */
  /* Closed on arrival for the reason spelled out at `inspectOpen`, and it has
     to be the SAME answer. These two are a matched pair over one candle — the
     ticket's own header warns about two panels disagreeing about which bar is
     selected. Two panels disagreeing about whether they were INVITED is the
     same defect wearing different clothes, and it is the one that would leave
     the camera half-covered at 390 instead of clear. Collapsed state here is
     the "EFFORT" chip. */
  const [effortOpen, setEffortOpen] = useState(false);

  const effortPriorBars = React.useMemo(() => {
    if (!inspectBar) return [];
    // Identified by bar-open time, not by object identity: `inspectBar` is
    // rebuilt as a fresh object on every cursor move, so `indexOf` would miss.
    const at = chartBars.findIndex(b => b.time === inspectBar.time);
    const end = at >= 0 ? at : chartBars.length;
    return chartBars.slice(0, end).map(b => ({
      volume: b.volume, open: b.open, close: b.close,
    }));
  }, [chartBars, inspectBar]);

  /**
   * IS THE SUBJECT STILL BEING BUILT?
   *
   * ONE condition: is it the last bar we hold? A bar is proven finished by the
   * existence of a LATER bar, and by nothing else.
   *
   * The first version asked the wall clock instead — newest bar AND its span
   * already elapsed — and the serving chart disproved it within a minute. The
   * header read "BAR OPENED 07:11 PM · 2 BARS BEHIND" while this panel graded
   * that same bar "Effort: LOW — this bar traded 2, the median of the 1053
   * bars before it is 793." The span HAD elapsed, so the clock called the bar
   * finished; but the feed was two bars behind and the count of 2 was simply
   * everything that had reached us. Elapsed does not mean counted. It means
   * counted only IF the feed is keeping up — and a feed keeping up is exactly
   * what we may not assume on the one surface that displays how far behind it
   * is.
   *
   * So the clock is gone, with the unit conversion it needed and the guess it
   * forced when a bar span was unknown. Successor-existence is an observable
   * fact about the array in hand; it is correct in the live case and in the
   * stalled-feed case alike, and there is no third case.
   *
   * The cost is one refusal on a genuinely-closed newest bar in the gap before
   * its successor prints. That is the direction we chose: a refusal that
   * resolves on its own, over a verdict about a partial count.
   */
  const effortSubjectIsForming = React.useMemo(() => {
    if (!inspectBar || chartBars.length === 0) return false;
    const newest = chartBars[chartBars.length - 1];
    return newest.time === inspectBar.time;
  }, [inspectBar, chartBars]);

  const effortVsResultVM = React.useMemo(
    () => selectEffortVsResult({
      bar: inspectBar ? { volume: inspectBar.v, open: inspectBar.o, close: inspectBar.c } : null,
      priorBars: effortPriorBars,
      subjectIsForming: effortSubjectIsForming,
    }),
    [inspectBar, effortPriorBars, effortSubjectIsForming],
  );

  /**
   * H-701 — THE SAME VERDICT, GIVEN A PLACE ON THE CANDLES.
   *
   * Not a second reading. `selectEffortMark` re-derives nothing: it takes the
   * VM above and the subject bar's own coordinates and answers whether there
   * is a lawful time and price to hang a mark on. Two components over one
   * candle disagreeing about what that candle is, is the failure the Inspect
   * Ticket's header warns about — so the mark reads `inspectBar` too, and the
   * SAME `effortVsResultVM` the panel reads. One reading, one verdict, two
   * renderings of it.
   */
  const effortMarkVerdict = React.useMemo(
    () => selectEffortMark(
      effortVsResultVM,
      inspectBar
        ? { time: inspectBar.time, open: inspectBar.o, close: inspectBar.c,
            high: inspectBar.h, low: inspectBar.l }
        : null,
    ),
    [effortVsResultVM, inspectBar],
  );

  /**
   * H-702 — DELTA LEVELS, out of the drawer and onto the price axis.
   *
   * `selectDeltaLevels` is the most price-honest module in this folder: every
   * level it emits sits on the grid the prints themselves establish. Until
   * now its only consumer was `SmartMoneyPanel`, a drawer, so a canvas that
   * paints delta divergence at swing pivots was rendered next to a panel
   * showing where delta ACTUALLY concentrated — measured, and invisible on
   * the tape. That is PRICES TRAPPED IN A DRAWER.
   *
   * Two modules, both reading `recentTicks`, is not two truths — `selectDelta
   * Levels` is pure and deterministic, and the room and the panel will
   * compute an identical VM off the same array. The alternative — hoist the
   * VM into `useOrderFlowReadings` and route both callers there — is a
   * bigger surgery than the slice needs.
   */
  const deltaLevelsGlass = React.useMemo(
    () => selectDeltaLevelsGlass(chartOrderFlowReadings.deltaLevels),
    [chartOrderFlowReadings.deltaLevels],
  );

  /**
   * H-703 — LIVING PROFILE, out of the drawer. `livingProfileVM` is already
   * being computed by the room for `LivingProfileView`; the glass compiler
   * re-reads it and refuses every way it could lie (no profile, no HVN
   * weight, untraded bucket).
   */
  const livingProfileGlass = React.useMemo(
    () => selectLivingProfileGlass(livingProfileVM),
    [livingProfileVM],
  );

  /** The selected slice, resolved against the SAME glass the canvas paints. */
  const activeProfileSlice = React.useMemo(
    () => selectedSlicePrice && selectedSlicePrice.symbol === symbol && selectedSlicePrice.timeframe === timeframe
      ? selectProfileSlice(livingProfileGlass, selectedSlicePrice.price)
      : null,
    [selectedSlicePrice, symbol, timeframe, livingProfileGlass],
  );
  /** asOf of the profile the slice belongs to: the newest bar it was built from. */
  const livingProfileAsOf = React.useMemo(() => {
    const last = chartBars[chartBars.length - 1];
    if (!last) return null;
    const t = typeof last.time === "number" ? last.time : Number(last.time);
    return Number.isFinite(t) ? t : null;
  }, [chartBars]);

  const marketStructureGlass = React.useMemo(
    () => selectMarketStructureGlass(chartStructureVM),
    [chartStructureVM],
  );

  /**
   * P-110 #10 — TPO. Reads the SAME `chartBars` the candles are drawn from
   * and only their time and range; volume and side are never passed, so the
   * reading cannot silently become a second volume profile.
   */
  const tpoProfileVM = React.useMemo(
    () => selectTpoProfile(
      chartBars.map(b => ({
        time: typeof b.time === "number" ? b.time : Number(b.time),
        high: b.high,
        low: b.low,
      })),
    ),
    [chartBars],
  );

  /**
   * P-110 #2 — STRUCTURE PROFILE. Anchored at the pivot the SAME
   * `chartStructureVM` already publishes for the swing marks.
   */
  const structureProfileVM = React.useMemo(
    () => selectStructureProfile(
      chartStructureVM,
      chartBars.map(b => ({
        time: typeof b.time === "number" ? b.time : Number(b.time),
        open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume,
      })),
    ),
    [chartStructureVM, chartBars],
  );

  /**
   * P-110 #5 — PROFILE DNA. Reads the SAME `livingProfileVM` the histogram is
   * drawn from, so the fingerprint cannot describe a different profile.
   */
  const profileDnaVM = React.useMemo(
    () => livingProfileVM.measured
      ? selectProfileDna({
          curve: livingProfileVM.curve,
          poc: livingProfileVM.poc,
          vah: livingProfileVM.vah,
          val: livingProfileVM.val,
          bars: chartBars.length,
          estimated: livingProfileVM.quality !== "trade-based",
          rowStep: livingProfileVM.tickSize,
        })
      : selectProfileDna(null),
    [livingProfileVM, chartBars.length],
  );

  /** Living Profile's developing value — the SAME chartBars, no lookahead. */

  /** P-110 #9 — completed sessions only, from the shared session splitter. */
  const compositeProfileVM = React.useMemo(
    () => selectCompositeProfile(
      chartBars.map(b => ({
        time: typeof b.time === "number" ? b.time : Number(b.time),
        open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume,
      })),
    ),
    [chartBars],
  );
  // What each profile species' own selector refused, so the Profiles door
  // says "DATA REFUSES · <why>" instead of READY over an empty lane.
  // Visible Range is decided by the camera, so the canvas reports it (on change).
  const [visibleRangeRefusal, setVisibleRangeRefusal] = useState<string | null>(null);
  // Session VP's decline is decided in the paint (its column), so the canvas reports it too.
  const [sessionVpRefusal, setSessionVpRefusal] = useState<string | null>(null);
  const profileSpeciesRefusalVM = React.useMemo(
    () => profileSpeciesRefusals({
      composite: compositeProfileVM, tpo: tpoProfileVM, structure: structureProfileVM, memory: profileMemoryVM,
      visibleRange: visibleRangeRefusal ? { reason: visibleRangeRefusal } : null,
      session: sessionVpRefusal ? { reason: sessionVpRefusal } : null,
    }),
    [compositeProfileVM, tpoProfileVM, structureProfileVM, profileMemoryVM, visibleRangeRefusal, sessionVpRefusal],
  );

  /**
   * P-110 #3 — FUSION over the ACTIVE stack only. A species the trader has
   * switched off contributes nothing: fusing a level the glass is not showing
   * would name a source the trader cannot see.
   */
  const profileFusionVM = React.useMemo(() => {
    const levels: FusionSourceLevel[] = [];
    const push = (species: FusionSourceLevel["species"], kind: string, price: number | null | undefined) => {
      if (price != null && Number.isFinite(price)) levels.push({ species, kind, price });
    };
    if (livingProfileOn && livingProfileGlass.drawn) {
      push("LIVING", "POC", livingProfileGlass.poc);
      push("LIVING", "VAH", livingProfileGlass.vah);
      push("LIVING", "VAL", livingProfileGlass.val);
    }
    if (tpoProfileOn && tpoProfileVM.drawn) {
      push("TPO", "POC", tpoProfileVM.poc);
      push("TPO", "VAH", tpoProfileVM.vah);
      push("TPO", "VAL", tpoProfileVM.val);
    }
    if (structureProfileOn && structureProfileVM.drawn) {
      push("STRUCTURE", "POC", structureProfileVM.poc);
      push("STRUCTURE", "VAH", structureProfileVM.vah);
      push("STRUCTURE", "VAL", structureProfileVM.val);
    }
    if (profileMemoryOn && profileMemoryVM.drawn) {
      for (const l of profileMemoryVM.levels) push("MEMORY", `S-${l.sessionsAgo} ${l.kind}`, l.price);
    }
    return selectProfileFusion(levels);
  }, [livingProfileOn, livingProfileGlass, tpoProfileOn, tpoProfileVM, structureProfileOn, structureProfileVM, profileMemoryOn, profileMemoryVM]);

  const auctionStateVM = React.useMemo(
    () => chartCanvasState
      ? selectAuctionState({ state: chartCanvasState })
      : null,
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
    H-1001 · RISK ON PRICE + FROZEN asOf RECEIPT. MainChart owns the brackets
    (it holds the drawings) and hands its reading up every frame into a REF;
    only a change of plan or state re-renders this room. The receipt is torn
    by an explicit press from the SAME decision identity the camera carries,
    written once, and handed back down so the chart can print it.
  */
  // H-401 — only a change of state or of family lines re-renders the room.
  const [contradictionVM, setContradictionVM] = useState<ContradictionVM | null>(null);
  const onContradiction = useCallback((vm: ContradictionVM | null) => {
    const sig = (v: ContradictionVM | null) => (v ? `${v.state}|${v.up.map(l => l.evidence).join(";")}|${v.down.map(l => l.evidence).join(";")}` : "");
    setContradictionVM(prev => (sig(prev) === sig(vm) ? prev : vm));
  }, []);
  // H-201 — the ghost's analogue, for Inspect; re-render only when it changes.
  const [memoryGhostVM, setMemoryGhostVM] = useState<MemoryGhostVM | null>(null);
  const onMemoryGhost = useCallback((vm: MemoryGhostVM | null) => {
    const sig = (v: MemoryGhostVM | null) => (v ? `${v.reason}|${v.analogueStart}|${v.fit?.toFixed(3)}|${v.candidates}` : "");
    setMemoryGhostVM(prev => (sig(prev) === sig(vm) ? prev : vm));
  }, []);
  // H-801 — the envelope for Inspect; re-render only when a count changes.
  const [envelopeVM, setEnvelopeVM] = useState<ExpectedEnvelopeVM | null>(null);
  const onExpectedEnvelope = useCallback((vm: ExpectedEnvelopeVM | null) => {
    const sig = (v: ExpectedEnvelopeVM | null) => (v ? `${v.reason}|${v.sessions}|${v.sessionStart}|${v.upper?.toFixed(4)}|${v.lower?.toFixed(4)}|${v.up?.matchedBy}|${v.down?.matchedBy}` : "");
    setEnvelopeVM(prev => (sig(prev) === sig(vm) ? prev : vm));
  }, []);
  // H-601 #3 — the fused profile object for Inspect and the stack bar.
  const [fusion, setFusionState] = useState<{ fused: FusedProfileObject | null; refusal: string | null }>({ fused: null, refusal: null });
  const onProfileFusion = useCallback((fused: FusedProfileObject | null, refusal: string | null) => {
    setFusionState(prev => (prev.refusal === refusal && prev.fused?.poc === fused?.poc && prev.fused?.vah === fused?.vah && prev.fused?.val === fused?.val && prev.fused?.totalVolume === fused?.totalVolume ? prev : { fused, refusal }));
  }, []);
  const riskVMRef = useRef<RiskOnPriceVM | null>(null);
  const [riskPlan, setRiskPlan] = useState<RiskOnPriceVM | null>(null);
  const onRiskOnPrice = useCallback((vm: RiskOnPriceVM) => {
    riskVMRef.current = vm;
    setRiskPlan(prev =>
      prev && prev.drawn === vm.drawn && prev.reason === vm.reason && prev.entry === vm.entry
        && prev.stop === vm.stop && prev.target === vm.target && prev.state === vm.state ? prev : vm);
  }, []);
  const [riskReceipt, setRiskReceipt] = useState<RiskReceipt | null>(null);
  const [riskTearNote, setRiskTearNote] = useState<string | null>(null);
  const riskReceiptOwner = canvasUser?.id ?? null;
  const riskDecisionId = currentSceneDecision?.decisionId ?? null;
  useEffect(() => {
    let found: RiskReceipt | null = null;
    try { found = readRiskReceipt(window.localStorage, riskReceiptOwner, riskDecisionId); } catch { /* storage blocked */ }
    setRiskReceipt(found);
    setRiskTearNote(null);
  }, [riskReceiptOwner, riskDecisionId]);
  const tearRiskReceiptNow = () => {
    const vm = riskVMRef.current;
    if (!vm) { setRiskTearNote("Risk on Price is off — nothing is bracketed to tear."); return; }
    const t = tearRiskReceipt({
      decision: currentSceneDecision
        ? { decisionId: currentSceneDecision.decisionId, bornAt: currentSceneDecision.bornAt, bornFrom: currentSceneDecision.bornFrom }
        : null,
      risk: vm,
      symbol,
      timeframe,
      gates: {
        verdict: chartCanvasVM.permission?.verdict ?? "UNKNOWN",
        rules: (chartCanvasVM.permission?.evaluations ?? []).map(e => ({ label: e.rule.label, engaged: e.engaged })),
      },
      nowMs: Date.now(),
    });
    if (!t.ok) { setRiskTearNote(t.reason); return; }
    let storage: Storage | null = null;
    try { storage = window.localStorage; } catch { /* storage blocked */ }
    const w = writeRiskReceiptOnce(storage, riskReceiptOwner, t.receipt);
    if (w.ok) { setRiskReceipt(w.receipt); setRiskTearNote(null); }
    else if (w.reason === "ALREADY_TORN") {
      setRiskReceipt(w.existing);
      setRiskTearNote(`Already torn at ${new Date(w.existing.asOf).toISOString()} — the first asOf stands.`);
    } else setRiskTearNote("This device did not keep the receipt — nothing was torn.");
  };
  const selectedMarketObject = chartMarketObjects.find(
    object => object.objectId === selectedMarketObjectId,
  ) ?? null;
  const selectedObjectChain = selectedMarketObject
    ? buildInspectChain({
        barId: selectedMarketObject.birthBarId,
        objectId: selectedMarketObject.objectId,
        decisionId: currentSceneDecision?.decisionId ?? null,
      })
    : null;
  // The selected zone's Passport LINEAGE: its ids, the birth bar's admitted
  // identity and the chain to the camera's decision — compiled when the
  // selection, the identities or the decision change, never per frame.
  const selectedZoneLineage = React.useMemo(() => {
    const zone = chartStructureZones.find(z => z.object.objectId === selectedMarketObjectId);
    return zone
      ? selectZoneLineage({ zone, identities: chartBarIdentities, decisionId: currentSceneDecision?.decisionId ?? null })
      : null;
  }, [chartStructureZones, selectedMarketObjectId, chartBarIdentities, currentSceneDecision?.decisionId]);
  // A selected object that is NOT a zone (a swing LEVEL) gets the same
  // Passport drawer and the same lineage owner — kind changes only the noun.
  const selectedLevelObject = selectedMarketObject
    && !chartStructureZones.some(z => z.object.objectId === selectedMarketObject.objectId)
    ? selectedMarketObject
    : null;
  const selectedLevelLineage = React.useMemo(
    () => selectedLevelObject
      ? selectObjectLineage({
          object: selectedLevelObject,
          method: memoryLevelKindOf(selectedLevelObject.objectId)
            ? "selectValueMigration → selectProfileMemory (a prior session's final POC / VAH / VAL) → selectMemoryMarketObjects"
            : "selectMarketStructure → selectStructureMarketObjects (confirmed, untouched swing levels)",
          identities: chartBarIdentities,
          decisionId: currentSceneDecision?.decisionId ?? null,
        })
      : null,
    [selectedLevelObject, chartBarIdentities, currentSceneDecision?.decisionId],
  );
  const selectedMarketObjectWait =
    selectedObjectChain?.ok && chartCanvasVM.oneStory
      ? selectWaitStanding(chartCanvasVM.oneStory.decision, chartCanvasVM.oneStory.debt)
      : null;

  /* The Inspect Ticket's bar, read with the identity the room already holds
   * for it: fidelity as a class word, the bar's lineage, and the chain from
   * this bar to the object born on it and the camera's decision. Declared
   * after `currentSceneDecision` because the chain's last link is that id.
   * The index is built once per identity list; a cursor move is a lookup. */
  const chartBarIdentityIndex = React.useMemo(
    () => indexBarIdentitiesBySecond(chartBarIdentities),
    [chartBarIdentities],
  );
  const inspectDecisionId = currentSceneDecision?.decisionId ?? null;
  const inspectTicketVM = React.useMemo(
    () => selectInspectTicket({
      barOpenMs: inspectBar ? inspectBar.time * 1000 : null,
      barSpanMs: chartBarSpanMs,
      price: inspectBar ? inspectBar.c : null,
      barVolume: inspectBar ? inspectBar.v : null,
      // `Tick.time` is already epoch ms; the field name carries the unit so
      // this mapping is checkable at the call site rather than in a comment.
      prints: recentTicks.map(t => ({
        price: t.price, size: t.size, side: t.side, timeMs: t.time, trade: t.trade === true,
      })),
      identity: identityForBar(chartBarIdentityIndex, inspectBar?.time),
      // The same successor-existence rule Effort vs Result uses for "forming".
      barIsForming: effortSubjectIsForming,
      chain: { objects: chartMarketObjects, selectedObjectId: selectedMarketObjectId, decisionId: inspectDecisionId },
    }),
    [inspectBar, chartBarSpanMs, recentTicks, chartBarIdentityIndex, effortSubjectIsForming,
      chartMarketObjects, selectedMarketObjectId, inspectDecisionId],
  );

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
        // The middle bucket, on the equipment rail. This row named RESOLVED and
        // MISSING only, so on the live TSLA frame it read "1 resolved · 4
        // missing" — five of eight, with `location`, `aggression` and `profile`
        // absent from the rail entirely while the panel one depth below listed
        // them under "Measured, not decision-grade". A rail that omits a bucket
        // is the same lie as a predicate that mis-sorts one.
        ...(chartMarketCanvas.measured.length > 0
          ? [
              {
                testId: "equipment-count-measured",
                label: `${chartMarketCanvas.measured.length} measured`,
              },
            ]
          : []),
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
        // WAS `totalCount - resolvedCount` — see the same repair on
        // /command-deck. A FORMING object is not unresolved; it is the middle
        // bucket, and subtraction is exactly what erases it.
        ...(chartPassportVM.formingCount > 0
          ? [
              {
                testId: "equipment-count-passport-forming",
                label: `${chartPassportVM.formingCount} forming`,
              },
            ]
          : []),
        {
          testId: "equipment-count-passport-unresolved",
          label: `${chartPassportVM.unresolvedCount} unresolved`,
        },
        { testId: "equipment-count-passport-objects", label: `${chartPassportVM.totalCount} objects` },
      ],
      // THE OBJECTS ON THE CANDLES, first press — pick one and it is
      // selected on price and its Passport opens beside it (MOCK 4). The
      // lineage summary stays at depth.
      renderPreviewTools: () => <ToolsSlot slot="market-object-passport" />,
      renderDepth: (unabridged: boolean) => (
        <MarketObjectPassportPanel vm={chartPassportVM} unabridged={unabridged} embedded />
      ),
    }),
    [chartPassportVM],
  );

  /*
    THE ROOM'S THIRD TENANT — and the largest single burial this room had.

    Five finished readings — stacked imbalance, absorption, delta divergence,
    liquidity weather, value candle — were each mounted in exactly ONE place: a
    long scrolling column inside a legacy side panel. Everything else in this
    room could see the chart; none of it could see the tape's verdict on the
    chart.

    Compiled HERE, off the room's own `recentTicks`, because the room already
    holds that stream for its chart. A hook that subscribed on its own would
    read a DIFFERENT moment of the same tape than the candles a few pixels away
    — Canon Weakness #1 reintroduced by the very change meant to cure it.

    ONE entry, not five, because a trader does not decide to look at "delta
    divergence". They ask whether the side pressing is being paid for its
    effort, and these five are the ways that question gets answered.
  */
  /*
    WHAT THE CHART IS ACTUALLY DRAWING, IN WORDS.
    Compiled HERE and nowhere else, because the room is the only place that
    holds both halves of the question: the four readings above AND the four
    switches the trader owns. `MainChart` already knows the answer — it writes
    it to `data-value-candle`, `data-imbalance-stack` and friends on the canvas
    so an outside probe can audit the paint — but a `data-` attribute is
    nobody's disclosure. Observed on the serving BTCUSD chart: two layers
    painting, two switched on and silent, and no way for the trader to tell the
    silent ones from broken ones.
  */
  const overlayDrawingLedger = React.useMemo(
    () => selectOverlayDrawingLedger({
      valueCandleOn,
      valueCandle: chartOrderFlowReadings.valueCandle,
      imbalanceStackOn,
      imbalanceStack: chartOrderFlowReadings.stackedImbalance,
      deltaDivergenceOn,
      deltaDivergence: chartOrderFlowReadings.deltaDivergence,
      liquidityWeatherOn,
      liquidityWeather: chartOrderFlowReadings.liquidityWeather,
    }),
    [
      chartOrderFlowReadings,
      valueCandleOn,
      imbalanceStackOn,
      deltaDivergenceOn,
      liquidityWeatherOn,
    ],
  );
  /* Ranked and phrased OUTSIDE the descriptor: the memo may only ASSEMBLE what
     the room already compiled, never compile a second opinion inside itself. */
  /* The room hands down WHICH MARKET this is and WHAT THE CLOCK HAS PROVEN.
     Without them the NO TAPE sentence could only recite the general rule, and
     on a TSLA chart half of that rule was about crypto. Both facts already sit
     in this component; the selector derives neither. */
  /* AND WHETHER THE WIRE ITSELF IS THE REASON. MEASURED 2026-09-21: the Webull
     entitlement probe answered APP_KEY_ENTITLEMENT_ISOLATED — accounts and
     profiles 200, every market-data rung 403 MARKET_DATA_NOT_SUBSCRIBED — on a
     weekday, where closure is not proven. So this preview told the Founder
     "Stock tape streams during market hours" about a lane no bell will open.
     `provenTapeWireBlock` is one-sided and returns null unless the feed is
     demonstrably alive while sending no prints; on null the sentence is
     exactly what it was before. */
  const chartOrderFlowStanding = React.useMemo(
    () =>
      selectOrderFlowStanding(chartOrderFlowReadings, {
        symbol,
        sessionClosed: sessionOpen,
        tapeWireBlocked: provenTapeWireBlock({ tapeSource, lastObservedAtMs }, Date.now()),
      }),
    [chartOrderFlowReadings, symbol, sessionOpen, tapeSource, lastObservedAtMs],
  );
  const chartOrderFlowEquipment = React.useMemo(
    () => ({
      equipmentId: "order-flow",
      title: "Order flow",
      verdict: chartOrderFlowStanding.verdict,
      headline: chartOrderFlowStanding.headline,
      counts: [
        {
          testId: "equipment-count-orderflow-measured",
          label: `${chartOrderFlowStanding.measuredCount} of 5 measured`,
        },
      ],
      renderPreviewTools: () => <OrderFlowToolsSlot />,
      renderDepth: (unabridged: boolean) => (
        <div className="space-y-3">
        {/* THE TOOLS FIRST — what the trader switches ON THE CANDLES. The
            readings below are the text account of the same tape. */}
        <OrderFlowToolsSlot />
        <div data-testid="order-flow-readings-heading" className="border-t border-wm-border/70 px-1 pt-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-wm-text-dim">
          Order-flow readings · text account
        </div>
        <OrderFlowDepthPanel
          readings={chartOrderFlowReadings}
          symbol={symbol}
          unabridged={unabridged}
          /*
            ONE W DOOR (bolt-on #5, 2026-09-22): the legacy Smart Money
            read-out is reached through THIS door's depth now, not through a
            second rail entry. Same one boolean the toolbar flips — the setter
            is referentially stable, so the pinned deps list below is still
            the complete set of things that can change this descriptor.
          */
          onOpenReadout={() => setSmartMoneyOpen(true)}
        />
        </div>
      ),
    }),
    [chartOrderFlowReadings, chartOrderFlowStanding, symbol],
  );

  /*
    THE ROOM'S FOURTH TENANT — AND THE END OF A SPLIT ROOM.

    The chain answers the only question this room exists to serve: may this
    setup be traded yet, and what is still unsatisfied if not. Until now it
    could only be picked up on /command-deck — so a trader standing in front of
    the market had to LEAVE the market to find out whether they were permitted
    to act on it. That is not a room with less equipment; that is a room that
    sends the trader away at the exact moment of decision.

    NOTHING IS COMPILED HERE. `chartCanvasVM.chain` is the object this room has
    held all along — it is already read for `availableR` and it already drives
    the permission verdict this room mints decisions from. A second
    `selectDecisionChain` call would be the "second semantic brain" the grammar
    bans: the rail could then say PERMITTED over a room that had just refused to
    mint a decision. One compilation, two readers.

    ── WHY THERE IS NO `SceneAdmits` GATE HERE, AND WHY THAT IS NOT A LOOPHOLE ──
    The deck wraps this equipment in a SceneAdmits gate on THESIS_GEOMETRY
    because the DECK compiles a scene — `compileScene(deckSceneSignals(...))` —
    and its rail may not offer a door the room itself has closed. This room
    compiles no scene. Importing the deck's gate would mean compiling a SECOND
    scene here, off this room's signals, and two scene compilations for one
    trader is precisely the disagreement the gate was invented to prevent.

    So the honest gate is the one this room actually owns: WHETHER THE CHAIN
    COMPILED. When it has not, the verdict says UNRESOLVED and the headline says
    why, before the trader presses anything — a stated refusal rather than a
    painted door. That is the same discipline as the deck's, stated in the terms
    this room can actually back up.

    ── WHAT IS READ, AND WHAT IS NOT JUDGED ──
    The verdict is the chain's OWN permission node. A descriptor that decided
    for itself whether the setup were permitted would be able to disagree with
    the panel it is a preview of.
  */
  const chartDecisionChainEquipment = React.useMemo(() => {
    const chainVm = chartCanvasVM.chain;
    const tally = chainVm?.summary ?? null;
    return {
      equipmentId: "decision-chain",
      // The SAME words the rail entry uses. A widget that opened under a
      // different title reads as a different thing having loaded.
      title: "Decision chain",
      verdict: chainVm
        ? (chainVm.nodes.find((n) => n.key === "permission")?.verdict ?? "UNKNOWN")
        : "UNRESOLVED",
      headline:
        chainVm?.headline ??
        "The chain has not compiled for this market yet — nothing is being claimed about permission.",
      counts: [
        { testId: "equipment-count-chain-ok", label: `${tally?.ok ?? 0} clear` },
        {
          testId: "equipment-count-chain-attention",
          label: `${(tally?.watch ?? 0) + (tally?.warn ?? 0)} need attention`,
        },
        { testId: "equipment-count-chain-unknown", label: `${tally?.unknown ?? 0} unresolved` },
      ],
      renderDepth: (unabridged: boolean) =>
        chainVm ? (
          <>
            {/* THE AUCTION LENS TRAVELS WITH THE CHAIN — the deck's §10 PAIRING,
                carried here rather than dropped. The lens is what the chain
                COMPACTS to; opening the nine nodes without the four-dimension
                summary they resolve to would put the workings on screen with
                the conclusion missing. Not `unabridged`-gated, for that reason. */}
            <DLARStrip dlar={chainVm.dlar} />
            <div style={{ height: 12 }} />
            <DecisionChainPanel vm={chainVm} showNarratives unabridged={unabridged} />
            {/* THE CONTRADICTION NOTE TRAVELS WITH THE DOOR. It returns null
                unless direction is resolved AND the auction is FAILING, so it
                cannot become furniture — but when it does render it is the note
                that says the thesis and the tape disagree, and a full screen
                that discloses less than the dock is the ENTER promise run
                backwards. */}
            <StructureContextNote vm={chainVm} />
          </>
        ) : (
          /* NOT `null`. A depth that renders nothing is a door that opens onto
             a blank, and a trader cannot tell a blank apart from a break. The
             room says out loud that it has no chain to show and why — the same
             sentence the preview carried, so pressing ENTER never contradicts
             what the rail just said. */
          <div
            data-testid="equipment-chain-unresolved"
            style={{ fontSize: 12, lineHeight: 1.5, color: "rgba(255,255,255,0.62)" }}
          >
            The decision chain has not compiled for this market yet, so nothing
            is being claimed about permission. Nothing is estimated in its place.
          </div>
        ),
    };
    /* NO `onNodeClick` OR `onDrillClick`, for the deck's reason: drilling from
       inside the equipment would open a drawer from inside a drawer. */
  }, [chartCanvasVM.chain]);

  /*
    THE ROOM'S FIFTH TENANT — THE TRADER, READ AT THE MOMENT IT CAN CHANGE
    SOMETHING.

    The four above are readings of the tape. This one reads the trader's own
    record, and it is here because of the property the deck's entry states
    outright: Personal Edge carries NO PHASE GATE, deliberately, because
    PREPARATION is exactly when "you have historically performed badly in this
    context" is still actionable. A trader standing at a chart sizing a setup IS
    in preparation. A record only readable from /command-deck is a record read
    after it could have changed the decision.

    ONE RECORD, TWO ROOMS. `useSessionDecisions` is the same hook the deck
    reads and the same one `useMarketCanvasVM` reads — the merge of live
    decision memory with the journal book lives in exactly one file. Before
    this, that merge was hand-written in two places; a third copy here is what
    turns "the same record" from a guarantee into a coincidence.

    THE VERDICT IS THE SELECTOR'S. `resolution` is `selectPersonalEdge`'s own
    word and it refuses RESOLVED below its sample threshold. This room prints
    it and does not soften it. `NO RECORD` is the single string added here, for
    the case where the chip would render nothing — honest emptiness on a canvas
    is silence, but a trader who pressed this on purpose is owed a sentence.
  */
  const chartPersonalEdgeVm = React.useMemo(
    () =>
      selectPersonalEdge({
        ownerId: canvasUser?.id ?? "",
        decisions: chartSessionDecisions,
        nowMs: chartEdgeNowMs,
      }),
    [canvasUser?.id, chartSessionDecisions, chartEdgeNowMs],
  );

  const chartPersonalEdgeEquipment = React.useMemo(() => {
    const noRecord = chartPersonalEdgeVm.totalDecisions === 0;
    const strengths = chartPersonalEdgeVm.topStrengths.length;
    const watches = chartPersonalEdgeVm.topWatch.length;
    return {
      equipmentId: "personal-edge",
      // The rail's own words, not a chart-room paraphrase.
      title: "Your personal edge",
      verdict: noRecord ? "NO RECORD" : chartPersonalEdgeVm.resolution,
      headline: noRecord
        ? "No decisions on record yet — your edge cannot be measured from nothing."
        : chartPersonalEdgeVm.headline,
      counts: [
        { testId: "equipment-count-edge-strength", label: `${strengths} strength` },
        { testId: "equipment-count-edge-watch", label: `${watches} to watch` },
        {
          testId: "equipment-count-edge-decisions",
          label: `${chartPersonalEdgeVm.totalDecisions} decisions`,
        },
      ],
      renderDepth: (unabridged: boolean) =>
        noRecord ? (
          <p
            data-testid="equipment-edge-no-record"
            style={{ fontSize: 12, color: "#8a8271", lineHeight: 1.6, margin: 0 }}
          >
            {chartPersonalEdgeVm.reason ?? "No decisions on record yet."}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <PersonalEdgeChip vm={chartPersonalEdgeVm} unabridged={unabridged} />
            {/* THE SAMPLE RULE, SAID OUT LOUD AT DEPTH. The chip prints the
                verdict; a trader who entered the full experience is owed the
                reason a context is not called RESOLVED. It is the selector's
                sentence, carried — not a second explanation written here. */}
            {chartPersonalEdgeVm.reason != null && (
              <p
                style={{
                  fontSize: 11,
                  color: "#8a8271",
                  lineHeight: 1.6,
                  margin: 0,
                  fontStyle: "italic",
                }}
              >
                {chartPersonalEdgeVm.reason}
              </p>
            )}
          </div>
        ),
    };
    /* NO drill. A drill from inside a drawer would open a drawer within a
       drawer, which the directive bans by name. ENTER is how this gets deeper. */
  }, [chartPersonalEdgeVm]);

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
      "order-flow": chartOrderFlowEquipment,
      "decision-chain": chartDecisionChainEquipment,
      "personal-edge": chartPersonalEdgeEquipment,
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
  //
  // B-501 does not soften that rule — it completes it. Leaving TSLA must drop
  // the TSLA identity from view; RETURNING to TSLA must find the SAME one,
  // because the contractor index forbids minting a new id for a symbol change.
  // So the scene is not blanked, it is re-read for the scope now on screen:
  // absent for a scene that never decided, and the original identity for one
  // that did. `readSceneDecision` is scoped by owner AND underlying, so there
  // is no path by which BTC can be handed TSLA's decision.
  useEffect(() => {
    const restored = readSceneDecision(decisionScope.owner, decisionScope.underlying);
    setSceneDecision(restored);
    priorPermission.current = null;
    setSceneDecisionAbsence(
      restored
        ? "Decision carried from an earlier view of this instrument."
        : "No decision born yet — permission has not crossed.",
    );
  }, [decisionScope.owner, decisionScope.underlying]);

  // B-501 · the write half. A decision that is not recorded cannot be found by
  // the next tab, and `writeSceneDecision` reads its own write back — so a
  // storage refusal is known here rather than discovered as a missing decision
  // somewhere downstream. The room does not currently claim durability on the
  // glass; if it ever does, this boolean is the only honest source for it.
  useEffect(() => {
    if (!sceneDecision) return;
    writeSceneDecision(sceneDecision);
  }, [sceneDecision]);

  // B-501 · the read half, live. Six tabs, one decision: a birth in ANOTHER
  // tab must arrive here without a reload, or "same DECISION_ID across tabs"
  // is only true of tabs opened in the right order. `storage` fires in every
  // tab except the one that wrote, which is exactly the set that needs telling.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (event: StorageEvent) => {
      if (!isDecisionContinuityStorageEvent(event)) return;
      const restored = readSceneDecision(decisionScope.owner, decisionScope.underlying);
      if (!restored) return;
      // adoptSceneDecision, not a bare set: a decision already standing on this
      // scene is not replaced by another witness to it.
      setSceneDecision((current) => adoptSceneDecision(current, restored));
      setSceneDecisionAbsence("Decision carried from another tab on this device.");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [decisionScope.owner, decisionScope.underlying]);

  // ── Watchlist doorway ───────────────────────────────────────
  // The watchlist is contextual evidence, not a second room. Keep one
  // canonical instance in the shared drawer at every width so an explicitly
  // opened desktop watchlist cannot permanently squeeze MARKET into another
  // dashboard column. One mount also means one quote poll and one stored-list
  // identity across desktop, tablet and phone.
  const narrowViewport = useNarrowViewport();

  // B-701 band. The CSS above owns the COLLAPSE; this owns the RECEIPT — the
  // band and its permitted zoom count are published on the room's root element
  // so a live measurement on the running app can name which band it observed
  // instead of inferring it from what happens to be visible.
  const canvasBand = useCanvasBand();
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

  /*
    THE DESK SETTER — ONE OWNER, NOW WITH TWO DOORS.

    `selectChartArrangement.ts` has owned ORDER FLOW / REGIME / REVIEW since it
    was written: which profiles each desk arms, whether this tape can deliver
    them, and the sentence that declares the result. What it never had was a
    door in the hand the mansion map says owns arrangement — WORKSPACE. It was
    reachable only from inside the Tools drawer, so the trader had to open an
    equipment container to change how the room is arranged.

    This is the setter both doors call. It is deliberately a single function
    rather than two copies of the seven `if`s: the JSX below passes it straight
    through as `onApply`, and the Workspace branch feeds it
    `arrangementSwitches(id, menu)` — the SAME compiler call `ChartArrangementBar`
    makes. Two doors, one owner. A second list of setters here would be the
    two-headed horse: the Tools desk and the Workspace desk could arm different
    things under the same name.

    DELTA_VP is absent on purpose and that absence belongs to the compiler:
    `arrangementSwitches` omits DRAW-gesture profiles entirely, so choosing a
    desk never silently erases a range the trader dragged themselves.
  */
  /*
    THE ONE SWITCH MAP — every chart tool's on/off, read by every door that
    shows a family of them (Chart tools › Profiles, Chart tools › Reading
    lenses, Tools › Order flow). One map, one toggle, three doors: a tool can
    never read ON behind one door and OFF behind another.
  */
  const profileMenuActive: Readonly<Partial<Record<ProfileId, boolean>>> = {
                  FIXED_RANGE: fixedVPActive,
                  SESSION: sessionVPChart,
                  ABSORPTION: absorptionAnatomy,
                  // Delta + VP is ARMED, not drawn — it is active exactly when
                  // its drawing tool is the one the cursor is holding.
                  DELTA_VP: drawingTool === "delta-vp",
                  ANCHORED_RANGE: drawingTool === "anchored-vp",
                  // The four order-flow readings that now draw on the axis.
                  IMBALANCE_STACK: imbalanceStackOn,
                  VALUE_CANDLE: valueCandleOn,
                  DELTA_DIVERGENCE: deltaDivergenceOn,
                  LIQUIDITY_WEATHER: liquidityWeatherOn,
                  EFFORT_MARK: effortMarkOn,
                  DELTA_LEVELS: deltaLevelsOn,
                  LIVING_PROFILE: livingProfileOn,
                  TPO_PROFILE: tpoProfileOn,
                  STRUCTURE_PROFILE: structureProfileOn,
                  PROFILE_DNA: profileDnaOn,
                  VALUE_MIGRATION: valueMigrationOn,
                  PROFILE_MEMORY: profileMemoryOn,
                  PROFILE_FUSION: profileFusionOn,
                  COMPOSITE_PROFILE: compositeProfileOn,
                  VISIBLE_RANGE_PROFILE: visibleRangeProfileOn,
                  REGIME_LIGHTING: regimeLightingOn,
                  QUESTION_LENS: questionLensOn,
                  SCAFFOLDING: scaffoldingDepth !== "OFF",
                  ANATOMY_CARDS: anatomyCardsOn,
                  MEMORY_GHOST: memoryGhostOn,
                  EXPECTED_ENVELOPE: expectedEnvelopeOn,
                  CONTRADICTION: contradictionOn,
                  RISK_ON_PRICE: riskOnPriceOn,
                  LIQUIDITY_LIFECYCLE: liquidityLifecycleOn,
                  MARKET_STRUCTURE: marketStructureOn,
  };
  const onProfileMenuToggle = (id: ProfileId) => {
                  if (id === "FIXED_RANGE") setFixedVPActive(v => !v);
                  else if (id === "SESSION") setSessionVPChart(v => !v);
                  else if (id === "ABSORPTION") setAbsorptionAnatomy(v => !v);
                  else if (id === "IMBALANCE_STACK") setImbalanceStackOn(v => !v);
                  else if (id === "VALUE_CANDLE") setValueCandleOn(v => !v);
                  else if (id === "DELTA_DIVERGENCE") setDeltaDivergenceOn(v => !v);
                  else if (id === "LIQUIDITY_WEATHER") setLiquidityWeatherOn(v => !v);
                  else if (id === "EFFORT_MARK") setEffortMarkOn(v => !v);
                  else if (id === "DELTA_LEVELS") setDeltaLevelsOn(v => !v);
                  else if (id === "LIVING_PROFILE") setLivingProfileOn(v => !v);
                  else if (id === "MARKET_STRUCTURE") setMarketStructureOn(v => !v);
                  else if (id === "TPO_PROFILE") setTpoProfileOn(v => !v);
                  else if (id === "STRUCTURE_PROFILE") setStructureProfileOn(v => !v);
                  else if (id === "PROFILE_DNA") setProfileDnaOn(v => !v);
                  else if (id === "VALUE_MIGRATION") setValueMigrationOn(v => !v);
                  else if (id === "PROFILE_MEMORY") setProfileMemoryOn(v => !v);
                  else if (id === "PROFILE_FUSION") setProfileFusionOn(v => !v);
                  else if (id === "COMPOSITE_PROFILE") setCompositeProfileOn(v => !v);
                  else if (id === "VISIBLE_RANGE_PROFILE") setVisibleRangeProfileOn(v => !v);
                  else if (id === "REGIME_LIGHTING") setRegimeLightingOn(v => !v);
                  else if (id === "QUESTION_LENS") setQuestionLensOn(v => !v);
                  else if (id === "ANATOMY_CARDS") setAnatomyCardsOn(v => !v);
                  else if (id === "MEMORY_GHOST") setMemoryGhostOn(v => !v);
                  else if (id === "EXPECTED_ENVELOPE") setExpectedEnvelopeOn(v => !v);
                  else if (id === "CONTRADICTION") setContradictionOn(v => !v);
                  else if (id === "RISK_ON_PRICE") setRiskOnPriceOn(v => !v);
                  else if (id === "LIQUIDITY_LIFECYCLE") setLiquidityLifecycleOn(v => !v);
                  else if (id === "SCAFFOLDING") {
                    setScaffoldingDepth(d => (d === "OFF" ? "FOUNDATION" : d === "FOUNDATION" ? "INTERMEDIATE" : d === "INTERMEDIATE" ? "PRO" : "OFF"));
                  }
                  else if (id === "DELTA_VP") {
                    // Re-picking the armed tool disarms it, so the row behaves
                    // like the toggles beside it rather than being a one-way door.
                    setDrawingTool(t => (t === "delta-vp" ? "cursor" : "delta-vp"));
                  }
                  else if (id === "ANCHORED_RANGE") {
                    setDrawingTool(t => (t === "anchored-vp" ? "cursor" : "anchored-vp"));
                  }
                };

  const onFootprintChange = (t: FootprintType) => {
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
                };

  /*
    TOOLS › ORDER FLOW — the order-flow CHART TOOLS, behind their own door.
    Top: the footprint instruments that paint on each candle (Bid × Ask, Delta
    bubbles, Imbalance cells, Big Trades …). Below: the order-flow readings
    that paint on price (Absorption vs Exhaustion, Anatomy Cards, Stacked
    Imbalance, Divergence …). Every row is a switch on the candles; none opens
    a screen. Same handlers as the study row and the profile doors.
  */
  const orderFlowToolsNode = (
    <div data-testid="order-flow-tools" className="space-y-2">
      <div className="px-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-wm-text-dim">
        On each candle · footprint
      </div>
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-wm-border bg-wm-surface/95 p-2">
        <FootprintControls
          active={footprintType}
          enabled={footprintEnabled}
          bigTradesOverlay={bigTradesSimul && bigTradesOverlay}
          tapeSource={source}
          observedAggressorFlow={chartFlowSnap.hasFlow}
          onDisable={() => setFootprintEnabled(false)}
          onChange={onFootprintChange}
          wrapNote
        />
      </div>
      <ProfilesMenu
        barsPresent={chartBars.length > 0}
        printsPresent={chartOrderFlowReadings.printsPresent}
        observedAggressorFlow={chartFlowSnap.hasFlow}
        families={["ORDER_FLOW"]}
        heading="On price · order-flow readings"
        testId="order-flow-tools-menu"
        columns={1}
        active={profileMenuActive}
        onToggle={onProfileMenuToggle}
      />
    </div>
  );
  useEffect(() => { publishOrderFlowTools(orderFlowToolsNode); });

  /*
    TOOLS › MARKET OBJECT PASSPORT — the objects ON the candles, as a picker.
    Choosing one selects it on price exactly as clicking it on the chart does,
    and the Passport opens beside it. No second screen.
  */
  const passportToolsNode = (
    <div data-testid="passport-object-picker" className="space-y-1">
      <div className="px-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-wm-text-dim">
        Objects on the candles · select to read its passport
      </div>
      {chartStructureZones.length === 0 ? (
        <p className="px-1 text-[11px]" style={{ color: "#C8C0AE" }}>No confirmed swing zone on this chart yet.</p>
      ) : (
        chartStructureZones.map(z => {
          const selected = selectedMarketObjectId === z.object.objectId;
          return (
            <button
              key={z.object.objectId}
              type="button"
              data-testid={`passport-pick-${z.side}`}
              aria-pressed={selected}
              onClick={() => {
                actOnChartSelection({ type: "select", selection: { kind: "OBJECT", objectId: z.object.objectId } });
                // Hand the glass back: the object is read ON price now.
                onChartEquipmentClose();
              }}
              className="flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left"
              style={{ borderColor: selected ? "rgba(212,175,55,0.7)" : "rgba(139,106,41,0.3)", background: "rgba(11,10,8,0.6)" }}
            >
              <span className="text-[11px] font-bold" style={{ color: selected ? "#d4af37" : "#EDE6D3" }}>
                {z.side} ZONE · {z.object.priceLow.toFixed(2)} – {z.object.priceHigh.toFixed(2)}
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.1em]" style={{ color: "#C8C0AE" }}>
                {z.lifecycle.state} · {z.lifecycle.touches.length} touch{z.lifecycle.touches.length === 1 ? "" : "es"}
              </span>
            </button>
          );
        })
      )}
    </div>
  );
  useEffect(() => { publishToolsSlot("market-object-passport", passportToolsNode); });

  const applyArrangementSwitches = useCallback(
    (s: Readonly<Partial<Record<ProfileId, boolean>>>) => {
      if (s.FIXED_RANGE !== undefined) setFixedVPActive(s.FIXED_RANGE);
      if (s.SESSION !== undefined) setSessionVPChart(s.SESSION);
      if (s.ABSORPTION !== undefined) setAbsorptionAnatomy(s.ABSORPTION);
      if (s.IMBALANCE_STACK !== undefined) setImbalanceStackOn(s.IMBALANCE_STACK);
      if (s.VALUE_CANDLE !== undefined) setValueCandleOn(s.VALUE_CANDLE);
      if (s.DELTA_DIVERGENCE !== undefined) setDeltaDivergenceOn(s.DELTA_DIVERGENCE);
      if (s.LIQUIDITY_WEATHER !== undefined) setLiquidityWeatherOn(s.LIQUIDITY_WEATHER);
      if (s.EFFORT_MARK !== undefined) setEffortMarkOn(s.EFFORT_MARK);
      if (s.DELTA_LEVELS !== undefined) setDeltaLevelsOn(s.DELTA_LEVELS);
      if (s.LIVING_PROFILE !== undefined) setLivingProfileOn(s.LIVING_PROFILE);
      if (s.MARKET_STRUCTURE !== undefined) setMarketStructureOn(s.MARKET_STRUCTURE);
      if (s.TPO_PROFILE !== undefined) setTpoProfileOn(s.TPO_PROFILE);
      if (s.STRUCTURE_PROFILE !== undefined) setStructureProfileOn(s.STRUCTURE_PROFILE);
      if (s.PROFILE_DNA !== undefined) setProfileDnaOn(s.PROFILE_DNA);
      if (s.VALUE_MIGRATION !== undefined) setValueMigrationOn(s.VALUE_MIGRATION);
      if (s.PROFILE_MEMORY !== undefined) setProfileMemoryOn(s.PROFILE_MEMORY);
      if (s.PROFILE_FUSION !== undefined) setProfileFusionOn(s.PROFILE_FUSION);
      if (s.COMPOSITE_PROFILE !== undefined) setCompositeProfileOn(s.COMPOSITE_PROFILE);
      if (s.VISIBLE_RANGE_PROFILE !== undefined) setVisibleRangeProfileOn(s.VISIBLE_RANGE_PROFILE);
      if (s.REGIME_LIGHTING !== undefined) setRegimeLightingOn(s.REGIME_LIGHTING);
      if (s.QUESTION_LENS !== undefined) setQuestionLensOn(s.QUESTION_LENS);
      if (s.ANATOMY_CARDS !== undefined) setAnatomyCardsOn(s.ANATOMY_CARDS);
      if (s.MEMORY_GHOST !== undefined) setMemoryGhostOn(s.MEMORY_GHOST);
      if (s.EXPECTED_ENVELOPE !== undefined) setExpectedEnvelopeOn(s.EXPECTED_ENVELOPE);
      if (s.CONTRADICTION !== undefined) setContradictionOn(s.CONTRADICTION);
      if (s.RISK_ON_PRICE !== undefined) setRiskOnPriceOn(s.RISK_ON_PRICE);
      if (s.LIQUIDITY_LIFECYCLE !== undefined) setLiquidityLifecycleOn(s.LIQUIDITY_LIFECYCLE);
      if (s.SCAFFOLDING !== undefined) setScaffoldingDepth(d => (s.SCAFFOLDING ? (d === "OFF" ? "FOUNDATION" : d) : "OFF"));
    },
    [],
  );

  /*
    A LATEST-VALUE REF, NOT A CACHE.

    The equipment subscription below is mounted once. A desk press must be
    compiled against the bars and the flow the room holds AT THE MOMENT OF THE
    PRESS, not the empty arrays it held on mount — readiness is measured, and a
    stale menu would arm ORDER FLOW over a tape with no observed aggressor and
    call it FULL. Re-subscribing on every bar would churn the channel, so the
    room keeps the latest reading here instead. Same `latest.current = value`
    shape this file already uses for live tick state.
  */
  const arrangementMenu = selectProfileMenu({
    barsPresent: chartBars.length > 0,
    printsPresent: chartOrderFlowReadings.printsPresent,
    observedAggressorFlow: chartFlowSnap.hasFlow,
    active: {
      FIXED_RANGE: fixedVPActive,
      SESSION: sessionVPChart,
      ABSORPTION: absorptionAnatomy,
      DELTA_VP: drawingTool === "delta-vp",
      ANCHORED_RANGE: drawingTool === "anchored-vp",
      IMBALANCE_STACK: imbalanceStackOn,
      VALUE_CANDLE: valueCandleOn,
      DELTA_DIVERGENCE: deltaDivergenceOn,
      LIQUIDITY_WEATHER: liquidityWeatherOn,
      EFFORT_MARK: effortMarkOn,
      DELTA_LEVELS: deltaLevelsOn,
      LIVING_PROFILE: livingProfileOn,
      TPO_PROFILE: tpoProfileOn,
      STRUCTURE_PROFILE: structureProfileOn,
      PROFILE_DNA: profileDnaOn,
      VALUE_MIGRATION: valueMigrationOn,
      PROFILE_MEMORY: profileMemoryOn,
      PROFILE_FUSION: profileFusionOn,
      COMPOSITE_PROFILE: compositeProfileOn,
      VISIBLE_RANGE_PROFILE: visibleRangeProfileOn,
      REGIME_LIGHTING: regimeLightingOn,
      QUESTION_LENS: questionLensOn,
      SCAFFOLDING: scaffoldingDepth !== "OFF",
      ANATOMY_CARDS: anatomyCardsOn,
      MEMORY_GHOST: memoryGhostOn,
      EXPECTED_ENVELOPE: expectedEnvelopeOn,
      CONTRADICTION: contradictionOn,
      RISK_ON_PRICE: riskOnPriceOn,
      LIQUIDITY_LIFECYCLE: liquidityLifecycleOn,
      MARKET_STRUCTURE: marketStructureOn,
    },
  });

  // Locked profile lanes hold their switch against desks, presets and Restore.
  const applyRespectingLocks = (s: Readonly<Partial<Record<ProfileId, boolean>>>) =>
    applyArrangementSwitches(withoutLocked(s, profileStackPrefs));
  const arrangementDeskRef = useRef<(id: ArrangementId) => void>(() => {});
  arrangementDeskRef.current = (id: ArrangementId) =>
    applyRespectingLocks(arrangementSwitches(id, arrangementMenu));

  /*
    WHERE THE TRADER IS SITTING, PUBLISHED — NOT REMEMBERED.

    The Workspace rail offered three desks and reported none of them: press
    REGIME, watch both volume profiles arm, reopen the hand, and all three
    tiles look identical. The registry wrote that shortfall down and named the
    only honest fix — "give the rail the compiler's `activeId`, not a rail-side
    memory of it" — which is exactly what this is.

    `activeId` is COMPILED from the live switch positions above, not from the
    last press this room handled. That difference is the whole point: flip one
    switch by hand in the Tools drawer and the room is no longer at a named
    desk, `activeId` goes null, and the light goes out. A memory of "the last
    desk I sent" would keep REGIME lit over a chart that had stopped being
    REGIME — a lamp describing a desk the trader had already left.

    Announced in an effect rather than during render because a DOM dispatch is
    a side effect, and the rail is a sibling component that must not be
    re-rendered from inside this one's render pass.
  */
  const arrangementVM = selectChartArrangement({ menu: arrangementMenu });
  const arrangementActiveId = arrangementVM.activeId;
  useEffect(() => {
    announceEquipmentArrangement(
      arrangementActiveId ? ARRANGEMENT_EQUIPMENT_ID[arrangementActiveId] : null,
    );
  }, [arrangementActiveId]);

  /*
    AND WHAT EACH DESK CAN ACTUALLY DRAW — the other half of the same answer.

    `activeId` told the rail WHERE the trader is sitting. It did not tell them
    what any of the three desks would paint if pressed, and the Workspace hand
    had no other source for that: its hints are static strings in
    `roomEquipment`, typed once, blind to the tape.

    MEASURED on the serving Worker 2026-09-22, /charts?symbol=TSLA, the hand
    read "Regime — Both volume profiles — where price has been accepted" and
    nothing more. The compiler had already counted, for every desk, how many of
    its readings this tape can carry; the Tools door renders that count and the
    Workspace door did not exist when it was written.

    SAME COMPILER, SAME CALL, SAME RENDER. `arrangementVM` is the one reading
    `activeId` is taken from three lines above — not a second `selectChartArrangement`
    invocation, which could observe a different menu and let the two halves of
    one answer disagree. The desk's own `note` is forwarded VERBATIM; composing
    a second phrasing here is how two doors start describing one desk
    differently.
  */
  const arrangementShortfalls = React.useMemo(
    () =>
      arrangementVM.entries.map((entry) => ({
        equipmentId: ARRANGEMENT_EQUIPMENT_ID[entry.id],
        readiness: entry.readiness,
        deliverableCount: entry.deliverableCount,
        armedCount: entry.armedCount,
        note: entry.note,
        shortNote: entry.shortNote,
      })),
    [arrangementVM],
  );
  useEffect(() => {
    announceEquipmentShortfalls(arrangementShortfalls);
  }, [arrangementShortfalls]);

  // LEAVING THE ROOM ENDS THE ARRANGEMENT. Without this, the chart's desk would
  // still be "in force" in the channel while the trader stood in Scanner — and
  // no other room's rail has any business inheriting this one's seating.
  //
  // The shortfalls are retracted for a sharper reason than tidiness: an empty
  // list means NOT MEASURED, and once this room is gone nobody is measuring
  // these desks against a tape. Leaving the last reading behind would let a
  // rail in another room paint a deliverability it has no source for.
  useEffect(() => () => {
    announceEquipmentArrangement(null);
    announceEquipmentShortfalls([]);
  }, []);

  /*
    DIRECT EQUIPMENT — the frame asks, this room acts, nothing else moves.

    `roomEquipment` declares Draw and Replay as this room's WORKSPACE hand
    (`kind: "workspace"`, `direct: true`). They are not new inventions: both
    controls are owned a few lines above and below this one, and until now the
    only door to them was the chart's own toolbar — Replay behind an "Advanced"
    menu. The canon's failure clause is "the intelligence exists but requires
    hunting through implementation containers", and two of the three things a
    trader reaches for most were sitting inside it.

    NO JOURNEY, DELIBERATELY. `useEquipmentJourney` filters these out
    (`isJourneyEquipment`), so pressing Draw does not open a threshold, does not
    write `?equip=` into the URL and does not unmount the chart. The trader
    presses the button and the instrument is in their hand — which is the
    canon's "overlay equipment wall, D≈0, chart stays".

    A SECOND CALL SITE IS NOT A SECOND IMPLEMENTATION. Both branches flip the
    exact state the toolbar flips. There is one drawer and one replay engine;
    this adds a door, not a copy.
  */
  useEffect(
    () =>
      subscribeEquipment((req) => {
        // Trigger is null on purpose: the press came from the OS frame, and
        // restoring focus to a stale chart button would send the trader
        // somewhere they never were.
        //
        // PUT-DOWN IS THE SAME DOOR, WALKED THE OTHER WAY.
        //
        // The rail is a toggle because `aria-pressed` says it is (see the note
        // at the onClick in WMOperatingSystem.tsx). It does not decide what
        // closing MEANS — it reports an intent, and the room answers with the
        // handles it already owns. `stopReplay` and `setDrawSheetOpen(false)`
        // are the exact closes the in-chart controls call, so there is still
        // one drawer and one replay engine; this adds a second door, not a
        // second implementation.
        const down = req.intent === "put-down";
        if (req.equipmentId === "draw-tools") {
          if (down) setDrawSheetOpen(false);
          else openDrawingTools(null);
        } else if (req.equipmentId === "bar-replay") {
          if (down) stopReplay();
          else startReplay();
        } else if (req.equipmentId === "clean-room") {
          // (The `smart-money` branch that stood between Replay and this one
          // was RETIRED 2026-09-22 with its rail entry — ONE W DOOR, HOUSE
          // PLAN bolt-on #5. The read-out panel is now reached through the
          // ORDER FLOW door's depth; see `onOpenReadout` in
          // `chartOrderFlowEquipment` and the retirement note in
          // roomEquipment.ts.)
          // CLEAN — THE ROOM'S FIRST ARRANGEMENT, AND A SUBTRACTION MACHINE.
          //
          // The mansion map says WORKSPACE is "arrangement of the same market
          // room", and until this branch the room had instruments but no
          // arrangement: a trader with Draw, Replay, Smart Money, Chart tools
          // and a lens all up had FIVE separate closes between them and the
          // calm market Wall Law 5 demands.
          //
          // Every close below is the exact close the panel's own control
          // calls — no new state, no layout memory, no restore. A Clean that
          // remembered what was open would be a second layout store (a
          // rabbit), and the arrangements that legitimately remember are a
          // larger, separate slice.
          //
          // `momentary` in the registry: this is a command, so there is no
          // put-down half and no stage announce — the direct-equipment
          // Sentinel FORBIDS announcing a stage for it, because a stage for a
          // command would claim a holding that does not exist.
          setDrawSheetOpen(false);
          stopReplay();
          setSmartMoneyOpen(false);
          setChartEquipmentOpen(false);
          // The journey lens is put down through the journey's OWN door — the
          // hook stays the single authority on what it holds.
          onChartEquipmentClose();
          // AND THE READINGS COME DOWN TOO — through the SAME compiler door
          // the three named desks use, because CLEAN became the fourth desk
          // (HOUSE PLAN bolt-on, 2026-09-22: "CLEAN / ORDER FLOW / REGIME /
          // REVIEW"). Before this line, Clean closed the panels but left
          // every toggled reading painted over the candles — "just the
          // market" with five overlays still on it. `arrangementSwitches
          // ("CLEAN", …)` is the empty desk's switch set: every TOGGLE off,
          // DRAW gestures untouched, so the trader's own drawn ranges
          // survive exactly as they do for the other three desks. The
          // compiler then reads all-off back as CLEAN and the tile lights
          // via the same announced `activeId` as every other desk — no
          // rail-side memory, same one writer.
          arrangementDeskRef.current("CLEAN");
        } else if (req.equipmentId === "chart-tools") {
          // THE FOURTH DIRECT INSTRUMENT — THE REST OF THE DEMOLISHED STRIP.
          //
          // `smart-money` above rescued ONE organ from `.wm-chart-toolbar-pinned`
          // and its own note names what it left behind. This is the remainder:
          // the profiles catalogue, the arrangement declaration, Appearance,
          // and the chart's own fourteen-item menu.
          //
          // MEASURED 2026-09-21 at 1440x900, which is the part that had never
          // been looked at: `elementFromPoint` at the centre of each of the
          // toolbar's nine controls found TWO that the sticky 823px cluster was
          // covering — the trading-hours select and Indicators. Not a phone
          // problem. See roomEquipment.ts for the full reading.
          //
          // The drawer is mounted by `ChartToolbar`, not here, because those
          // controls read state that component owns. This branch flips the one
          // boolean that opens it; there is no second copy of any control.
          setChartEquipmentOpen(!down);
        } else if (
          req.equipmentId === "arrange-order-flow" ||
          req.equipmentId === "arrange-regime" ||
          req.equipmentId === "arrange-review"
        ) {
          // THE THREE NAMED ARRANGEMENTS — the second door, not a second desk.
          //
          // `clean-room` above is the subtraction; these are the compositions,
          // and its note deferred them on the grounds that they "must not be
          // faked by this one". They are not faked here: every switch comes out
          // of `arrangementSwitches(id, menu)`, the same compiler call the Tools
          // panel makes, applied through the same `applyArrangementSwitches`.
          //
          // `momentary` in the registry, exactly like `clean-room`: a desk is a
          // COMMAND. There is no put-down half — un-arranging is what Clean is
          // for — and the direct-equipment Sentinel FORBIDS announcing a stage
          // for it, because a stage would claim the rail is holding something.
          //
          // THE KNOWN SHORTFALL, SAID OUT LOUD: the rail tile does not light
          // for the desk currently in force. `selectChartArrangement` owns
          // `activeId`, and the honest repair is to hand the rail that answer —
          // not to give the rail a memory of its own presses, which would drift
          // the moment a switch is flipped from any other door.
          arrangementDeskRef.current(
            req.equipmentId === "arrange-order-flow"
              ? "ORDER_FLOW"
              : req.equipmentId === "arrange-regime"
                ? "REGIME"
                : "REVIEW",
          );
        }
      }),
    [openDrawingTools, startReplay, stopReplay, onChartEquipmentClose],
  );

  /*
    THE ROOM ANSWERS BACK FOR ITS DIRECT INSTRUMENTS TOO.

    MEASURED 2026-09-19 on live /charts: Draw was open — 19 tools, a 319x385
    panel, the chart still ticking at 1490x401 — and the Workspace rail that
    opened it still read `aria-pressed="false"`. `announceEquipmentStage` had
    exactly ONE caller, `useEquipmentJourney`, and the journey deliberately
    filters Draw and Replay out (`isJourneyEquipment`, see the note above).
    So the only two pieces of equipment this room has were the only two the
    rail could never report. The heading says WORKSPACE and the entry claims to
    show what is in your hand; for /charts it always said "nothing".

    THIS IS NOT A SECOND BRAIN. The room stays the only writer — that is the
    equipmentChannel's law, and the reason the rail never infers a stage. These
    two booleans ARE the state the drawer and the replay engine already render
    from; this effect publishes that fact rather than computing a new one, so
    there is no reading here that can drift from what is on the screen.

    "drawer" rather than "preview": both instruments come up at full working
    size with the market still visible beside them, which is what `drawer`
    means in the stage algebra, and `marketStaysVisible("drawer")` is true.
    Neither is ever announced `full` — this room IS the chart, and nothing it
    hands the trader is allowed to take the camera away.
  */
  useEffect(() => {
    announceEquipmentStage("draw-tools", drawSheetOpen ? "drawer" : "closed");
  }, [drawSheetOpen]);
  useEffect(() => {
    announceEquipmentStage("bar-replay", replayActive ? "drawer" : "closed");
  }, [replayActive]);
  /* ESCAPE PUTS THE REPLAY DOWN — the room-side half of the frame's promise.

     The OS frame (WMOperatingSystem) deliberately does NOT listen for Escape
     while a journey is open: "the room ALSO closes on Escape, one step at a
     time." For Draw / Smart Money / Chart Tools that is true — each rides
     `ShellModalDrawer`, whose focus hook handles Escape and calls
     `preventDefault` + `stopPropagation`. Bar Replay is NOT a modal drawer;
     it is a disclosure over the chart with no focus trap, and MEASURED on
     production 2026-09-22 (probe-truth-recovery.mjs): with replay held,
     Escape did NOTHING — `replayStillUp: true`, rail honestly reporting
     `aria-pressed="true"`. A panel over a live chart that only closes by
     hunting the same toggle again is a MODE, the exact thing the frame's
     Escape doc forbids.

     `defaultPrevented` is the seam: if a modal drawer is up ABOVE the replay
     panel it consumes Escape first (its handler prevents default before
     stopping propagation), so one press still closes exactly ONE level.
     `stopReplay()` flips `replayActive`, the announce effect above publishes
     "closed", and the channel memory + rail hear the put-down — same single
     writer, no second brain. */
  useEffect(() => {
    if (!replayActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      stopReplay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [replayActive, stopReplay]);
  /* The smart-money stage announce that stood here was RETIRED 2026-09-22
     with the rail entry it answered for (ONE W DOOR — HOUSE PLAN bolt-on #5,
     "Do not keep Smart Money + Order Flow as separate warehouses"; see the
     retirement note in roomEquipment.ts). An announce for equipment no room
     declares would be a stage report into a dead channel — the inverse of the
     half-wired defect equipmentChannel.ts records, and just as dishonest.
     `smartMoneyOpen` and `SmartMoneyPanel` survive; the panel is now reached
     through the ORDER FLOW door's own depth (`onOpenReadout` below) and the
     toolbar's own button, both flipping the same ONE boolean.

     The 390x844 measurement the retired note carried still matters where the
     panel is concerned: at phone widths the panel COVERS the glass rather
     than sitting beside it, and any future `marketStaysVisible` consumer must
     read WIDTH, not stage alone. */
  /* And the fourth, on the same terms and for the same reason: the drawer
     carries its own X and its own Escape, so a rail that only ever heard the
     open would report `aria-pressed="true"` after the trader had closed it —
     the exact Replay defect equipmentChannel.ts records.

     "drawer", not "full": `ShellModalDrawer` is a 420px right-hand panel over
     a chart that stays mounted and stays subscribed. The same honest edge
     recorded for smart-money applies unchanged — at phone widths a 420px panel
     covers the glass rather than sitting beside it, and `marketStaysVisible`
     will have to read WIDTH before it has a runtime consumer. This shift is
     desktop-only and does not pretend to have fixed that. */
  useEffect(() => {
    announceEquipmentStage("chart-tools", chartEquipmentOpen ? "drawer" : "closed");
  }, [chartEquipmentOpen]);

  // And the same for the seven-control primary rail: measured at 375px it was
  // display:none at 0x0, so publish idea, screenshot, voice note and video
  // note had no door on a phone at all.
  const [toolsSheetOpen, setToolsSheetOpen] = useState(false);
  const captureFallbackTriggerRef = useRef<HTMLButtonElement>(null);
  const openCaptureShare = useCallback((trigger: HTMLButtonElement | null) => {
    captureFallbackTriggerRef.current = trigger;
    setToolsSheetOpen(true);
  }, []);
  // The eight views, rehomed out of the masthead. See the removal note at the
  // old `wm-chart-category-doorway` site for why a permanent VIEW select was
  // the wrong shape. The drawer keeps the chart mounted underneath and leaves
  // the URL alone, so this is a lens, not a trip.
  const [viewShelfOpen, setViewShelfOpen] = useState(false);
  const viewShelfTriggerRef = useRef<HTMLButtonElement>(null);
  const openViewShelf = useCallback((trigger: HTMLButtonElement | null) => {
    viewShelfTriggerRef.current = trigger;
    setViewShelfOpen(true);
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

  const handleBarsReady = useCallback((
    bars: LegacyOhlcvTuple[],
    identities: readonly CanonicalBarIdentity[],
  ) => {
    setBarsSettled(true);
    setChartBars(bars);
    setChartBarIdentities(identities);
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
    setChartBarIdentities([]);
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

  /* ── ONE GRADER, TWO READERS ────────────────────────────────────────────────
     The masthead fidelity chip graded this surface inside a render-time IIFE
     far below, which was fine while the chip was the only reader. It is no
     longer: the decision rail now wears the Honesty Plaque, and a plaque that
     re-derives its own fidelity is a SECOND WRITER of the same claim — the
     precise mechanism by which a chip reading ACTIVE DEGRADED comes to sit
     beside a plaque reading EXECUTABLE about one instrument at one instant.

     So the grading is hoisted here, above the hydration gate (both readers are
     below it), and the IIFE becomes a reader like every other. */
  // …and the freshness join the masthead makes, from the SAME owner on the
  // same sampled clock. Handed `{ present }` alone, a streaming provider could
  // never grade above ACTIVE DEGRADED here: the rail read DEGRADED / WOUNDED
  // under a masthead reading LIVE — CERTIFIED QUOTE (serving, BTC 1m, 2026-09-25).
  const quoteClockMs = useFeedEvaluationClock();
  const chartQuoteObservation = React.useMemo(
    () => ({
      present: Number.isFinite(ticker.price) && ticker.price > 0,
      fresh: quoteFreshness(source === "unavailable" ? null : source, lastObservedAtMs, quoteClockMs),
    }),
    [ticker.price, source, lastObservedAtMs, quoteClockMs],
  );
  const chartSurfaceBadge = React.useMemo(
    () => resolveChartSurfaceBadge(
      source, connected, chartBars.length > 0, sessionOpen, chartQuoteObservation,
      // The badge may not grade a question that is still open.
      barsSettled,
    ),
    [source, connected, chartBars.length, sessionOpen, chartQuoteObservation, barsSettled],
  );

  /* ── THE HONESTY READING ────────────────────────────────────────────────────
     `MarketHonestyPlaque` existed for a day rendered in exactly one place —
     /command-deck — with its reading written into the JSX as a null literal.
     A plaque hard-coded to its own null state is not disclosure, it is a
     picture of disclosure, and the governing directive names that failure
     outright: HARD-CODED WAIT = ORGANISM FAIL. This is the transplant: the
     organ moves to the live trading surface and is fed a real reading.

     Two refusals are load-bearing here and neither is a default:

     (1) `availability !== undefined` means the badge is AWAITING or
         UNAVAILABLE — the house has not finished asking, or nothing answered.
         Folding that into a fidelity word would manufacture a measurement out
         of an open question, so the plaque gets `null` and says UNMEASURED.

     (2) `readMarketFidelity` itself refuses a non-finite `asOf` and returns
         null. `lastObservedAtMs` is the transport's accept-site stamp — the
         same one `usePublishOsStanding` is given above — so the moment on the
         plaque is an OBSERVATION, never `Date.now()` standing in for one.

     `fidelityFromPipelineLabel` is the only sanctioned crossing from the seven
     pipeline labels into the five fidelities; inventing a local mapping here
     is how the seven quietly become de-facto badges. */
  const chartHonesty = React.useMemo<MarketFidelityReading | null>(
    () => readCanvasHonesty({
      badge: chartSurfaceBadge,
      // THE MOMENT THE MARKET CELL ALREADY PRINTS. Measured live 2026-09-19:
      // the rail read "NO LIVE PRINT · asOf 22:32:10Z" beside a plaque reading
      // "No fidelity has been established for this canvas", because the only
      // clock this memo consulted was the tape's, and the tape's stamp is null
      // on every canvas carrying bars and no live print.
      capturedAtMs: chartCanvasState?.capturedAt ?? null,
      observedAtMs: lastObservedAtMs,
    }),
    [chartSurfaceBadge, chartCanvasState?.capturedAt, lastObservedAtMs],
  );

  /* V01 ONE CANVAS: day bias and canonical regime are supporting market
     standing, not a floating card. Compile them once from their existing
     owners and hand the single reader to MainChart's OHLC horizon.
     A DAY-CHANGE PERCENT IS NOT A MARKET REGIME: the first verdict remains a
     day-change band and the second remains the canonical tape-owned regime. */
  const badge = selectRegimeBadge({
    change: ticker.change,
    changePct: ticker.changePct,
    symbol,
    at: sessionClockDate,
    canonRegime: chartCanvasState?.regime ?? null,
  });
  const marketStanding = badge.displayable ? (
    <span
      role="group"
      aria-label={badge.spoken}
      data-regime-badge-canon={badge.canon.resolved ? badge.canon.value : "UNRESOLVED"}
      style={{ display: "contents", pointerEvents:"none" }}
    >
      <span className="wm-chart-market-standing-label">{badge.verdictLabel}</span>
      <span data-standing-direction={badge.regime}>{badge.regime}</span>
      <span aria-hidden="true">·</span>
      <span data-standing-change={badge.changePct >= 0 ? "UP" : "DOWN"}>{badge.changePct >= 0 ? "+" : ""}{badge.changePct.toFixed(2)}%{badge.periodLabel ? ` ${badge.periodLabel}` : ""}</span>
      <span aria-hidden="true">·</span>
      <span className="wm-chart-market-standing-label">REGIME</span>
      <span data-standing-regime={badge.canon.resolved ? badge.canon.value : "UNRESOLVED"}>
        {badge.canon.resolved ? badge.canon.value : "UNRESOLVED"}
      </span>
    </span>
  ) : null;

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
    // THE SIXTH RAIL CELL the governing mockup names and the shipped rail did
    // not have. Composed once above off the same badge the masthead chip reads,
    // so the chip and the plaque are two readers of one grading. `null` here is
    // a real, rendered state (UNMEASURED) and not an omission.
    honesty: chartHonesty,
    // THE COMPANION CAMERA, from the SAME owner the masthead standing reads.
    // One boolean, one owner — the masthead, the chart's data-truth strip and
    // this band cannot drift into disagreeing about which camera the room is
    // looking through, in either direction.
    replayEngaged: cameraWalksHistory,
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
      // THE THIRD PRICE OWNER, handed over for the same reason the second one
      // was. MEASURED on the serving Worker 2026-09-20, BTCUSDT · 5m, one
      // viewport: the chart header read `81738.08 +492.44 (+0.61%)` and this
      // cell read `PRICE UNKNOWN`. That chart had NO BARS at all, so the
      // `lastBarClose` door added above could not speak for it — but a
      // provider had answered, and the rail had nowhere to put the answer.
      //
      // `tickerOwner` is the same guard `optionSpot` uses eleven hundred lines
      // up: during a symbol transition the hook still holds the PREVIOUS
      // instrument's price, and printing that under this symbol's name would
      // be a worse defect than the one being closed. Nothing new is computed.
      quoteLast: tickerOwner === symbol && ticker.price > 0 ? ticker.price : null,
      // `source` is the provider the quote chain actually returned. Without it
      // formatSpinePrice drops the number rather than render it anonymously.
      quoteSource: source ?? null,
    },
    oneStory: chartCanvasVM.oneStory,
    availableR: chartCanvasVM.chain?.availableR ?? null,
    decisionWhy: chartCanvasVM.decisionWhy,
    expression: optionSelection && optionSelection.underlying === symbol
      ? `${optionSelection.contract.symbol} ${optionSelection.contract.expirationDate} ${optionSelection.contract.strike} ${optionSelection.contract.contractType}`
      : null,
    onOpenWhy: openWhyFrom,
    canvasSummary: ({ verdictOwnedBySurface }: { readonly verdictOwnedBySurface: boolean }) => (
      /* The pill counts blockers; THIS room holds the equipment that explains
         them. `edde7236` stopped the pill telling the trader to "open the
         canvas" here — true, because there is no canvas on this page to scroll
         to — and that left a count with no destination. The destination is
         press-gated equipment, so the pill is handed the room and the id and
         looks the door up itself.

         `verdictOwnedBySurface` is NOT this file's opinion. It is handed in by
         the band that is deciding, in the same render, whether to print the
         verdict word as its own NOW · STATE headline — which on the 1440 rail
         it does, forty-five pixels below this pill. This room forwards it
         untouched; it never asserts it. */
      <CanvasSummaryPill
        vm={chartMarketCanvas}
        ariaLabel="Chart market canvas summary"
        verdictOwnedBySurface={verdictOwnedBySurface}
        openEquipment={{ roomHref: INSTRUMENT_VIEW_ROUTE, id: "market-reality" }}
      />
    ),
  };

  return (
    <div
      className={`wm-chart-dashboard${theme === "neon" ? " wm-neon" : ""}`}
      // B-701 receipt. See useCanvasBand above. The count is what the band
      // PERMITS, not what this room renders — measured, /charts renders one
      // zoom (the decision spine) at every width above the rail cliff, so a
      // bare `data-b701-zooms="2"` would contradict the DOM beside it.
      data-b701-band={canvasBand}
      data-b701-zooms-permitted={zoomsForBand(canvasBand)}
      // B-501 receipt. MEASURED 2026-09-20 on the serving Worker: two tabs on
      // this origin published ZERO decision identity into the DOM, so "the
      // same DECISION_ID across tabs" could be neither proven nor disproven on
      // the running app — only read out of the source. A law that cannot be
      // observed on the glass is not a law the ORGANISM PASS can accept.
      //
      // Absent by design when no decision has been born: the attribute is
      // omitted rather than set to "" or "none", so a reader cannot mistake a
      // named absence for an identity. Absence is disclosed in prose beside it.
      data-b501-decision-id={sceneDecision?.identity.decisionId ?? undefined}
      data-b501-born-from={sceneDecision?.identity.bornFrom ?? undefined}
      data-b501-born-on-device={sceneDecision?.identity.bornOnDeviceId ?? undefined}
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
      <div className={`wm-chart-room-header${activeTab === "Chart" ? " wm-chart-room-header--market-home" : ""}`}>
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
        {/* ── THE CRUMB WAS A LINK TO THE PAGE IT WAS ON ────────────────────
            This shipped 2026-09-02 as "orientation truth — the user can
            always see WHERE in the OS they are and jump one level up". The
            second half was never true: `INSTRUMENT_VIEW_ROUTE` IS `/charts`,
            and ChartsDashboard only ever renders on `/charts`, so the
            "Charts" crumb was a Link to the page the reader was already
            standing on. It carried zero reachability — deleting it removes
            no destination from the product.

            The first half was true but redundant three times over: the
            instrument plate at the top right names the symbol and its state,
            the price row under it names the symbol and the bar, and the
            masthead names the room. The crumb restated the symbol a fourth
            time in cool slate (#6d7288 / #8b8fa8 — Tailwind, not sanctuary).

            The Last Mile support doc §2 lists left page nav among the
            automatic rejects, and the approved frame
            (WM_NewMockup_64_F24_Surface_One_Canvas) has no crumb row at all.
            What the crumb alone carried is the NON-CHART view name, so that
            — and only that — survives, as a plain brass legend rather than
            as navigation. On the default Chart view it renders nothing,
            which is exactly what the Canon shows. */}
        {activeTab !== "Chart" && (
          <span
            style={{
              fontSize: 10,
              color: "#8a8271",
              letterSpacing: 1.1,
              textTransform: "uppercase",
              fontFamily: "Georgia, 'Times New Roman', serif",
              whiteSpace: "nowrap",
            }}
          >
            {symbol} · {activeTab}
          </span>
        )}
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
                color: orientationToolsOpen || watchlistOpen || toolsSheetOpen || viewShelfOpen ? "#e8b923" : "#c9a55c",
                background: orientationToolsOpen || watchlistOpen || toolsSheetOpen || viewShelfOpen ? "rgba(232, 185, 35, 0.12)" : "transparent",
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
                {/* THE WAY BACK. On every non-Chart view the chart toolbar —
                    and with it the Tools → Views door — is deliberately not
                    rendered. Without this row, picking Worksheet would strand
                    the trader on Worksheet, because the masthead select that
                    used to be the escape hatch is gone. Same drawer, second
                    door, reachable exactly where the first one is not. */}
                <button
                  role="menuitem"
                  aria-haspopup="dialog"
                  aria-controls="chart-views-sheet"
                  className="wm-chart-orientation-action"
                  style={{ display: "block", width: "100%", minHeight: 44, textAlign: "left", padding: "8px 10px" }}
                  onClick={() => {
                    setOrientationToolsOpen(false);
                    openViewShelf(orientationToolsTriggerRef.current);
                  }}
                >
                  Views
                </button>
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
        {/* ── THE SECOND THRONE, REMOVED ──────────────────────────────────
            A gold "COMMAND DECK →" chip sat here, directly above the chart,
            carrying the symbol and timeframe with it. Measured on live
            wealthymindsetspro.com/charts on 2026-09-19: it is the first piece
            of chrome a trader's eye meets above price, and what it says is
            "the real product is somewhere else".

            The Founder's order for this shift: "the instant /charts is legal
            HOME, Command Deck loses normal-route authority", and "two URLs
            that both feel like home" is a failed shot by definition. So the
            advertisement goes. The DECK ITSELF IS NOT TOUCHED — /command-deck
            still exists, still renders, still carries every organ it had, and
            still has its door in every `destinations="rail"` room and in the
            July 72px rail, where it now wears a LEGACY chip. Capability
            preserved; competing authority removed. */}
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
              // Explicit, because `decimals` sits between and defaults — the
              // same hazard the chartHeaderChangeFact call site already warns
              // about for `minDecimals`. Passing the source without this would
              // land a vendor string in the decimal slot.
              2,
              // SILENCE IS NOT CERTIFICATION. `source` is useWebSocket's own
              // verdict on whether it could vouch for this quote's provenance;
              // when it is still at the "unavailable" sentinel the product has
              // DECLINED to certify, and the header may not print the number
              // bare as though it had. Measured on the serving host
              // 2026-09-20, BTCUSDT: header "81822.00", footer SOURCE UNKNOWN,
              // rail PRICE UNKNOWN — three owners of one fact and the biggest
              // number on the screen was the only one making no claim.
              source,
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
            const quoteObservation = chartQuoteObservation;
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
            // READER, NOT GRADER. This used to call `resolveChartSurfaceBadge`
            // itself; the call now lives once at `chartSurfaceBadge` far above,
            // because the decision rail's Honesty Plaque reads the same grading
            // and two independent gradings of one instrument is exactly how a
            // chip and a plaque come to contradict each other on one screen.
            // (The `barsSettled` argument that keeps the badge from grading a
            // still-open question moved up with it.)
            const b = chartSurfaceBadge;
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
        {/* ── VIEW-AS-DESTINATION, REMOVED ────────────────────────────────
            A permanently visible `VIEW [CHART ▾]` select sat here, offering
            eight canvas-swapping options. Two things were wrong with it, and
            only the second is about pixels.

            First: it was a DESTINATION SELECTOR that changed no URL. Picking
            "Worksheet" set `display:none` on the chart panel — the trader had
            left the chart — yet the address bar still read /charts, so the
            move could not be linked, bookmarked, or undone with Back. A door
            that swallows the way home is worse than no door.

            Second: it was default chrome. The Last Mile canon §1 names
            "VIEW-as-destination" on the automatic-reject list precisely
            because a destination picker in the masthead tells the trader that
            the chart in front of them is one option among eight, rather than
            the room they are standing in.

            THE EIGHT VIEWS ARE NOT DELETED. `categoryTabsFor(assetClass)` is
            still their single writer, every panel below still mounts off
            `activeTab`, and they are now reached through Tools → Views (the
            `chart-views-sheet` drawer further down this file) — the same door
            that already holds drawing tools, watchlist, and capture. Opened
            deliberately, D≈0, URL unchanged, chart still mounted underneath.

            On the non-Chart views the chart toolbar is intentionally absent,
            so the same drawer also hangs off the orientation tools menu
            above — otherwise picking Worksheet would be a one-way trip. */}

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
          {/* THE EIGHT VIEWS, REHOMED. Same canonical writer
              (`categoryTabsFor`), same `activeTab` state, same panels below —
              only the door moved, out of permanent masthead chrome and behind
              Tools. `aria-current` marks the applied lens; it does not promise
              a reversal, because picking the same row again is a no-op. */}
          {viewShelfOpen && (
            <ShellModalDrawer
              id="chart-views-sheet"
              titleId="chart-views-sheet-title"
              descriptionId="chart-views-sheet-description"
              title="Views"
              description={`Apply a lens to ${symbol}. The chart stays loaded underneath and the address does not change.`}
              closeLabel="Close views"
              width={300}
              onClose={() => setViewShelfOpen(false)}
              fallbackTriggerRef={viewShelfTriggerRef}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {categoryTabsFor(assetClass).map((tab) => {
                  const applied = tab === activeTab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      aria-current={applied ? "true" : undefined}
                      onClick={() => { setActiveTab(tab); setViewShelfOpen(false); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        minHeight: 44,
                        padding: "8px 12px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 0.3,
                        textTransform: "uppercase",
                        color: applied ? "#e8b923" : "#c9a55c",
                        background: applied ? "rgba(232,185,35,0.12)" : "transparent",
                        border: `1px solid ${applied ? "rgba(232,185,35,0.35)" : "rgba(139,106,41,0.22)"}`,
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      <span>{tab}</span>
                      {applied && <span style={{ fontSize: 9, letterSpacing: 0.6 }}>Applied</span>}
                    </button>
                  );
                })}
              </div>
            </ShellModalDrawer>
          )}

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
                  <MarketObjectPassportPanel vm={chartPassportVM} embedded />
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
            leadingSlot={
              <div className="wm-chart-toolbar-asset-class">
                <AssetClassSwitcher symbol={symbol} onSelect={setSymbol} />
              </div>
            }
            symbol={symbol}         setSymbol={setSymbol}
            // `timeframe` / `setTimeframe` no longer reach this toolbar. The
            // nine-chip strip they fed moved onto the candle glass as one
            // bottom-centre chip (canon F24 / C-101); the setter now travels
            // straight to MainChart, which mounts the chip inside the pane.
            onConnectBrokers={() => openBrokerConnect(toolsTriggerRef.current)}
            onJournalStats={() => setPnlOpen(o => !o)}
            journalStatsOpen={pnlOpen}
            onCapture={() => openCaptureShare(toolsTriggerRef.current)}
            captureOpen={toolsSheetOpen}
            onWatchlist={() => openWatchlist(toolsTriggerRef.current)}
            watchlistOpen={watchlistOpen}
            onDraw={() => openDrawingTools(toolsTriggerRef.current)}
            drawOpen={drawSheetOpen}
            onViews={() => openViewShelf(toolsTriggerRef.current)}
            viewsOpen={viewShelfOpen}
            activeViewLabel={activeTab}
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
            extendedHoursValue={extHours}
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
            /*
              THE EQUIPMENT DOOR. The rail writes `chartEquipmentOpen` through
              the `chart-tools` branch above; the toolbar mounts the drawer and
              closes it with its own X or Escape, which is why the close comes
              back through here rather than being the toolbar's private affair —
              `announceEquipmentStage` has to see it, or the rail's aria-pressed
              becomes a lie the moment the trader uses the panel's own control.
            */
            equipmentOpen={chartEquipmentOpen}
            onEquipmentClose={() => setChartEquipmentOpen(false)}
            /*
              THE PROFILES MENU — one door in front of every profile this repo
              owns (Founder: "there should also have a profiles drop down for
              all the different vps and the profiles i created, the
              inventions"). It replaces three standalone toggle buttons and also
              offers Delta + VP, which was only ever reachable from the drawing
              rail. The list, the availability and the reasons are all compiled
              by `selectProfileMenu`; this site only routes clicks.

              It is PINNED rather than living in the study row, because that row
              defaults to closed — the same disappearance the Founder reported
              for the Smart Money button. A catalogue behind a closed lid
              catalogues nothing.
            */
            profilesSlot={
              <>
              {/*
                THE ARRANGEMENT CHIP — canon FL-02: "WORKSPACE IS A CHART STATE
                NOT AN APP"; canon FL-08: "WORKSPACE = HOW THE BOOK IS
                ARRANGED."

                It sits immediately beside the profiles chip on purpose. An
                arrangement IS a set of profile switch positions, so putting the
                two anywhere but side by side would separate the named desk from
                the switches that constitute it — which is how the product ended
                up with a WORKSPACE that listed equipment instead of describing
                the chart.

                Both chips read the same two facts (`chartBars`, `chartFlowSnap`)
                and the same switch state, so they cannot disagree about what
                this tape can draw.
              */}
              <ChartArrangementBar
                barsPresent={chartBars.length > 0}
                printsPresent={chartOrderFlowReadings.printsPresent}
                observedAggressorFlow={chartFlowSnap.hasFlow}
                active={{
                  FIXED_RANGE: fixedVPActive,
                  SESSION: sessionVPChart,
                  ABSORPTION: absorptionAnatomy,
                  DELTA_VP: drawingTool === "delta-vp",
                  ANCHORED_RANGE: drawingTool === "anchored-vp",
                  IMBALANCE_STACK: imbalanceStackOn,
                  VALUE_CANDLE: valueCandleOn,
                  DELTA_DIVERGENCE: deltaDivergenceOn,
                  LIQUIDITY_WEATHER: liquidityWeatherOn,
                  EFFORT_MARK: effortMarkOn,
                  DELTA_LEVELS: deltaLevelsOn,
                }}
                /*
                  A desk applies EVERY toggle it names, on or off, in one press.
                  `arrangementSwitches` omits DELTA_VP entirely because a dragged
                  box is not a switch — so the trader's own range selection is
                  never silently cleared by choosing a desk.

                  The seven setters that used to be written out here now live in
                  `applyArrangementSwitches` above, because the Workspace rail
                  grew a door to the same three desks. One setter, two doors.
                */
                onApply={applyRespectingLocks}
              />
              <ProfilePresetBar active={profileMenuActive} onApply={applyRespectingLocks} />
              <ProfilesMenu
                barsPresent={chartBars.length > 0}
                printsPresent={chartOrderFlowReadings.printsPresent}
                observedAggressorFlow={chartFlowSnap.hasFlow}
                families={["PROFILE"]}
                speciesRefusal={profileSpeciesRefusalVM}
                /* The Session row names WHICH session it profiles — the same
                   owner and inputs the canvas uses (sessionWindowFor). */
                stateDetail={{ SESSION: sessionWindowFor(symbol, timeframe, !!extHours).label }}
                heading="Profiles"
                active={profileMenuActive}
                onToggle={onProfileMenuToggle}
              />
              <MyStackBar active={profileMenuActive} onRestore={applyRespectingLocks} />
              <StackArrangeBar prefs={profileStackPrefs} onChange={onStackPrefsChange}
                fusionNote={fusion.fused ? `POC ${fusion.fused.poc.toFixed(2)} recomputed` : fusion.refusal ? `refused · ${fusion.refusal.replace(/_/g, " ").toLowerCase()}` : null} />
              {/* READING LENSES — structure, regime lighting, the question lens and
                  scaffolding re-read the SAME camera; they are not profiles and do
                  not share the profiles' grid. Order-flow tools live behind
                  Tools › Order flow. */}
              <ProfilesMenu
                barsPresent={chartBars.length > 0}
                printsPresent={chartOrderFlowReadings.printsPresent}
                observedAggressorFlow={chartFlowSnap.hasFlow}
                families={["READING"]}
                heading="Reading lenses"
                testId="reading-lenses-panel"
                columns={1}
                stateDetail={scaffoldingDepth === "OFF" ? undefined : {
                  SCAFFOLDING: scaffoldingDepth === "PRO" ? "PRO · CLICK TO CLOSE" : `${scaffoldingDepth} · CLICK FOR DEEPER`,
                }}
                active={profileMenuActive}
                onToggle={onProfileMenuToggle}
              />
              <RiskReceiptBar
                risk={riskPlan}
                decisionId={currentSceneDecision?.decisionId ?? null}
                receipt={riskReceipt}
                note={riskTearNote}
                onTear={tearRiskReceiptNow}
              />
              </>
            }
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
                onChange={onFootprintChange}
              />
              {/* The Profiles menu itself is PINNED in ChartToolbar — see
                  `profilesMenu` below and the `profilesSlot` prop. Only the VP
                  colour gear stays here: it styles profiles that are already
                  drawing, so it is genuinely a study-row setting, whereas the
                  catalogue of what this product owns is not. */}
              <div className="flex items-center gap-1 px-2 border-l border-wm-border/50 h-full shrink-0">
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
            {/* Asset 06 — ABSORPTION ANATOMY, as a full view.
                It is a sibling of Chart, not a fundamentals tab, so it is
                excluded from FundamentalsTabPanel's arm below rather than
                falling into it and rendering an empty reference surface. */}
            {activeTab === "Absorption" && (
              <div role="tabpanel" id="wm-chart-category-panel-absorption" aria-label={`Absorption anatomy for ${symbol}`} style={{ flex:1, overflow:"auto", minHeight:0 }}>
                <AbsorptionAnatomyView vm={absorptionAnatomyVM} symbol={symbol} timeframe={timeframe} />
              </div>
            )}

            {/* Asset 03 — AGGRESSION vs RESPONSE, the same measurement turned
                ninety degrees. Sibling of Chart for the same reason Absorption
                is, and excluded from the fundamentals arm for the same reason. */}
            {activeTab === "Aggression" && (
              <div role="tabpanel" id="wm-chart-category-panel-aggression" aria-label={`Aggression versus response for ${symbol}`} style={{ flex:1, overflow:"auto", minHeight:0 }}>
                <AggressionResponseView vm={aggressionResponseVM} symbol={symbol} timeframe={timeframe} />
              </div>
            )}

            {/* Asset 05 — BIG TRADE INTELLIGENCE. Fed by the room's own
                `recentTicks`, which is the per-trade tape itself rather than a
                bar aggregate: the question "was that one print large" cannot be
                asked of a candle, and answering it from a candle would be a
                fabricated print. On a feed with no tape the view names that,
                which is why it is offered on every class. */}
            {activeTab === "Big Trades" && (
              <div role="tabpanel" id="wm-chart-category-panel-big-trades" aria-label={`Big trade intelligence for ${symbol}`} style={{ flex:1, overflow:"auto", minHeight:0 }}>
                <BigTradeIntelligenceView vm={bigTradeIntelligenceVM} symbol={symbol} timeframe={timeframe} />
              </div>
            )}

            {/* Asset 06 — THE LIVING PROFILE. The source decision (tape vs
                bars) is NOT made here: `buildLivingProfileSnapshot` owns it so
                no second surface can draw a different POC for the same
                instrument and both be defensible. */}
            {activeTab === "Value Profile" && (
              <div role="tabpanel" id="wm-chart-category-panel-value-profile" aria-label={`Living profile for ${symbol}`} style={{ flex:1, overflow:"auto", minHeight:0 }}>
                <LivingProfileView vm={livingProfileVM} symbol={symbol} timeframe={timeframe} />
              </div>
            )}

            {/* Asset 15 — QUESTION-DRIVEN CONTINUATION HEALTH. The mockup's
                four percentages have no owner and are refused in the compiler,
                so this view states the reading in words and names the owner of
                every one of them. Sibling of Chart for the same reason the
                other four microstructure views are: the verdict ends with the
                trader asking WHERE the sequence turned. */}
            {activeTab === "Continuation" && (
              <div role="tabpanel" id="wm-chart-category-panel-continuation" aria-label={`Continuation health for ${symbol}`} style={{ flex:1, overflow:"auto", minHeight:0 }}>
                <ContinuationHealthView vm={continuationHealthVM} symbol={symbol} timeframe={timeframe} />
              </div>
            )}

            {/* Asset 01 — THE LONG-DIVISION WORKSHEET. The mockup's seven
                values are the image generator's own canvas dimensions and are
                refused in the compiler; what survives is the idea that a
                reading should show its working. Sibling of Chart for the
                strongest version of the same reason as the other five: this
                view names the bars it divided, so hiding them would strand the
                one surface whose whole claim is that you can check its
                arithmetic. */}
            {/* Asset 18 — ORDER FLOW LONG DIVISION — shares this panel with
                Asset 01 rather than taking a tab of its own, because it IS
                Asset 01's seven steps pointed at a smaller dividend. Asset 01
                divides the whole loaded window; Asset 18 divides ONE PRICE
                LEVEL of the live ladder. Giving each its own room would hide
                the relationship that makes the pair worth having — the reader
                would have to hold one division in their head to compare it with
                the other, and a number carried in the head is a number that
                drifts. Stacked, the same step 1 is legible at two scales at
                once. Each is titled by its own dividend so the pair can never
                read as one surface disagreeing with itself. */}
            {activeTab === "Worksheet" && (
              <div role="tabpanel" id="wm-chart-category-panel-worksheet" aria-label={`Long-division worksheet for ${symbol}`} style={{ flex:1, overflow:"auto", minHeight:0 }}>
                <DivisionWorksheetView
                  vm={divisionWorksheetVM}
                  symbol={symbol}
                  timeframe={timeframe}
                  instanceId="window"
                  dividendNote="Divided over the whole loaded window — every bar and every print this room is holding."
                />
                <FootprintWorksheetView vm={footprintWorksheetVM} symbol={symbol} timeframe={timeframe} />
              </div>
            )}

            {/* Asset 02 — GRAVITY / VALUE CENTER. The VM is the room's own
                `chartOrderFlowReadings.valueCandle` — the ONE compilation of
                the tape this room already holds for its candles and its
                on-glass value band, so this view can never disagree with
                either. Sibling of Chart for the plainest microstructure
                reason: its whole finding is a LEVEL, and a level needs the
                price pane above it to be located rather than memorised. */}
            {activeTab === "Gravity" && (
              <div role="tabpanel" id="wm-chart-category-panel-gravity" aria-label={`Gravity value center for ${symbol}`} style={{ flex:1, overflow:"auto", minHeight:0 }}>
                <GravityValueView vm={chartOrderFlowReadings.valueCandle} symbol={symbol} timeframe={timeframe} />
              </div>
            )}

            {/* Asset 08, LIQUIDITY WEATHER as a full view. The vm is the room's
                ONE liquidityWeather compilation — the same reading the order-flow
                drawer and the on-glass band consume — so this surface can never
                disagree with either. Sibling of Chart for the shared microstructure
                reason: cost of travel is measured across the SAME window the
                candles above draw, and "where did the tape get expensive" is a
                question only the price pane can locate. */}
            {activeTab === "Liquidity" && (
              <div role="tabpanel" id="wm-chart-category-panel-liquidity" aria-label={`Liquidity weather for ${symbol}`} style={{ flex:1, overflow:"auto", minHeight:0 }}>
                <LiquidityWeatherView vm={chartOrderFlowReadings.liquidityWeather} symbol={symbol} timeframe={timeframe} />
              </div>
            )}

            {activeTab !== "Chart" && activeTab !== "Options" && activeTab !== "Absorption" && activeTab !== "Aggression" && activeTab !== "Big Trades" && activeTab !== "Value Profile" && activeTab !== "Continuation" && activeTab !== "Worksheet" && activeTab !== "Gravity" && activeTab !== "Liquidity" && (
              <div role="tabpanel" id="wm-chart-category-panel" aria-label={`${activeTab} for ${symbol}`} style={{ flex:1, overflow:"auto", minHeight:0 }}>
                <FundamentalsTabPanel symbol={symbol} tab={activeTab} />
              </div>
            )}

            {/* ── Chart area ─────────────────────────── */}
            {/* THE CANDLES DO NOT LEAVE WHEN A MICROSTRUCTURE VIEW OPENS.
                The Founder's acceptance question for every one of these four
                inventions is "is it useful WHILE candles remain visible?", and
                shipped as plain siblings of Chart the answer was no — selecting
                Absorption hid the price it was describing. Each of these views
                answers a question ABOUT a bar, so the reading ends with the
                trader asking WHERE, and a reading you must leave price to see
                is a reading you have to carry back in your head.

                This is a DISPLAY change only. The chart was already never
                unmounted — it has always been hidden with `display:none` so
                drawings and the series survive a tab trip — so showing it costs
                nothing that was not already being paid, and no drawing is lost
                by switching into a reading and back.

                `order: -1` lifts it above the reading without moving this JSX,
                which matters: the panels above are pinned by sentinels that
                read this file literally, and reordering the source to reorder
                the screen would move the exclusion guards out from under them.

                The split is 42/58 in favour of the reading. The chart here is
                context for a question asked elsewhere on the screen, not the
                subject — so it gets enough room to locate a level and no more. */}
            <div role="tabpanel" id="wm-chart-category-panel-chart" aria-label={`Chart for ${symbol}`}
              /* THE MARKET'S FLOOR, AND THE FLAG THAT SCOPES IT.
                 `minHeight: 0` below is what lets this pane flex-shrink, and on
                 a phone it shrank all the way: measured 2026-09-19 by
                 `npm run prove:charts-floor` at 390x844, the candle field was
                 354x30 — THIRTY PIXELS, 4.3% of the room — because the room
                 header (125px), the wrapped toolbar (153px) and the decision
                 spine (268px) are all inflexible and this pane was the only
                 thing in the column willing to give. The market is not the
                 slack in this layout.
                 The floor is CSS (`.wm-chart-market-pane`, phone-width only, in
                 globals.css) rather than another inline branch here, because
                 this element already carries four and the fifth would be the
                 one nobody finds. `data-market-primary` scopes it: on a
                 microstructure tab the chart is deliberately context for a
                 question asked elsewhere (the 42/58 split above), so it gets NO
                 floor there — a floor on a pane that is meant to be secondary
                 would squeeze the reading it exists to support. */
              className="wm-chart-market-pane"
              data-market-primary={isMicrostructureTab(activeTab) ? "false" : "true"}
              style={{ flex: isMicrostructureTab(activeTab) ? "0 0 42%" : 1, order: isMicrostructureTab(activeTab) ? -1 : 0, borderBottom: isMicrostructureTab(activeTab) ? "1px solid rgba(183, 138, 52, 0.28)" : undefined, overflow:"hidden", minHeight:0, display: (activeTab === "Chart" || activeTab === "Options" || isMicrostructureTab(activeTab)) ? "flex" : "none" }}>

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
                    <ErrorBoundary>
                    <MainChart
                      symbol={symbol}
                      timeframe={timeframe}
                      /* Canon F24 / C-101: the timeframe is chosen ON THE GLASS,
                         from one bordered chip at the bottom centre of the
                         candle pane. The setter is handed to THIS pane only.
                         The compare pane below mirrors this same `timeframe`
                         and does not own it, and the 5m/15m panes are pinned to
                         a literal by design — a chip in any of those three
                         would be a control claiming authority it lacks. */
                      setTimeframe={setTimeframe}
                      footprintType={footprintType}
                      footprintEnabled={footprintEnabled} bigTradesOverlay={bigTradesSimul && bigTradesOverlay}
                      candleType={candleType}
                      pineOutput={pineOutput}
                      pineCode={pineCode}
                      onBarsReady={handleBarsReady}
                      /* Adopting a callback this chart has published all
                         along with nobody listening. See the Inspect Ticket
                         compiler above for why this, and not a second click
                         path, is the bar-selection route. */
                      onOHLCAtCursor={setCursorBar}
                      onSelectBigTrade={print => actOnChartSelection({ type: "select", selection: { kind: "PRINT", print } })}
                      selectedPrintOnChart={activeSelectedPrint}
                      onSelectProfileSlice={price => actOnChartSelection({ type: "select", selection: { kind: "SLICE", symbol, timeframe, price } })}
                      selectedProfileSlicePrice={activeProfileSlice?.found ? activeProfileSlice.price : null}
                      /* The selected item is loudest only while Inspect reads it:
                         the rest of the glass recedes; a restored selection with
                         Inspect closed arrives calm. */
                      selectionInspected={inspectOpen}
                      /* An absorption shelf or exhaustion mark: the ONE selection
                         holds it; the glass re-resolves it each frame against the
                         visible-window anatomy it painted (never this room's
                         30-bar absorptionAnatomyVM) and hands changes back. */
                      onSelectAnatomy={pick => actOnChartSelection({ type: "select", selection: { kind: "ANATOMY", symbol, timeframe, ...pick, lastDrawn: null } })}
                      onAnatomyReading={reading => actOnChartSelection({ type: "resolveAnatomy", reading })}
                      selectedAnatomy={activeSelectedAnatomy}
                      marketObjectTargets={chartMarketObjectTargets}
                      selectedMarketObjectId={selectedMarketObjectId}
                      activeDecisionId={currentSceneDecision?.decisionId ?? null}
                      auctionVerdict={auctionStateVM?.verdict ?? null}
                      /* A zone or LEVEL pin. A restored selection (Inspect
                         closed) is opened on the first click, not deselected;
                         see `toggleObject`. */
                      onSelectMarketObject={id => actOnChartSelection({ type: "toggleObject", objectId: id })}
                      structureZones={chartStructureZones}
                      selectedMarketObjectWait={selectedMarketObjectWait}
                      marketStanding={marketStanding}
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
                      /* MainChart reads this ONLY to decide what its data-truth
                         strip certifies and whether the live-tape overlays
                         describe the bars on screen. Both are questions about
                         the CAMERA, not about the panel, so both take
                         `cameraWalksHistory`. Handing the panel's open/closed
                         state here made the strip say HISTORICAL BARS and
                         withhold the tape counters while the socket was still
                         painting live candles behind them. */
                      replayActive={cameraWalksHistory}
                      compareSymbol={compareSymbol}
                      fixedVPActive={fixedVPActive}
                      sessionVPActive={sessionVPChart}
                      absorptionAnatomyActive={absorptionAnatomy}
                      /*
                        THE STACK GOES ON THE PRICE, NOT ONLY IN THE DRAWER.

                        This reading was already being computed here — the
                        `useOrderFlowReadings` call above compiles it for the
                        Order flow depth panel — and its level prices had never
                        left this component. Handing the SAME object to the
                        glass is what keeps the band and the drawer from
                        becoming two houses with two opinions about the same
                        three prices; the chart does not recompute it.

                        Ungated on purpose. A stack needs real tape, a readable
                        tick grid, and at least three adjacent levels leaning
                        the same way before the engine will name one, so it is
                        rare and it is material — the two conditions the quiet
                        canvas asks for. Everything else draws nothing.
                      */
                      imbalanceStack={chartOrderFlowReadings.stackedImbalance}
                      /*
                        THE SAME READING THE DRAWER GETS, for the same reason.
                        `selectValueCandle` has been computing a centre of
                        gravity and a value band — both PRICES — that only ever
                        reached a panel. One reading, two renderings: if the
                        chart compiled its own, the spine on the glass and the
                        number in the drawer could disagree about the same
                        symbol, which is Canon Weakness #1 word for word.
                      */
                      valueCandle={chartOrderFlowReadings.valueCandle}
                      /*
                        And the third, for the third time the same reason. The
                        divergence engine's two pivot prices had never left this
                        component either.
                      */
                      deltaDivergence={chartOrderFlowReadings.deltaDivergence}
                      /*
                        The fifth and last of the order-flow readings. Most of
                        it is not a price-axis claim at all and the glass
                        compiler says so — only the stalled-segment shelves get
                        a level. It is handed over anyway so the one honest
                        price in it stops living exclusively in a drawer.
                      */
                      liquidityWeather={chartOrderFlowReadings.liquidityWeather}
                      effortMark={effortMarkVerdict}
                      deltaLevelsGlass={deltaLevelsGlass}
                      deltaLevelsOnChart={deltaLevelsOn}
                      livingProfileGlass={livingProfileGlass}
                      livingProfileOnChart={livingProfileOn}
                      marketStructureGlass={marketStructureGlass}
                      marketStructureOnChart={marketStructureOn}
                      tpoProfile={tpoProfileVM}
                      tpoProfileOnChart={tpoProfileOn}
                      structureProfile={structureProfileVM}
                      structureProfileOnChart={structureProfileOn}
                      profileDna={profileDnaVM}
                      profileDnaOnChart={profileDnaOn}
                      valueMigration={valueMigrationVM}
                      valueMigrationOnChart={valueMigrationOn}
                      profileMemory={profileMemoryVM}
                      profileMemoryOnChart={profileMemoryOn}
                      profileFusion={profileFusionVM}
                      profileFusionOnChart={profileFusionOn}
                      compositeProfile={compositeProfileVM}
                      compositeProfileOnChart={compositeProfileOn}
                      visibleRangeProfileOnChart={visibleRangeProfileOn}
                      regimeLighting={chartRegimeLighting}
                      regimeLightingOnChart={regimeLightingOn}
                      questionLensOnChart={questionLensOn}
                      questionChoiceOnChart={questionChoice}
                      rawOnChart={rawOn}
                      continuationOnChart={continuationHealthVM ? { health: continuationHealthVM.health, reason: continuationHealthVM.reason } : null}
                      scaffoldingDepthOnChart={scaffoldingDepth}
                      anatomyCardsOnChart={anatomyCardsOn}
                      memoryGhostOnChart={memoryGhostOn}
                      profileStackPrefs={profileStackPrefs}
                      expectedEnvelopeOnChart={expectedEnvelopeOn}
                      contradictionOnChart={contradictionOn}
                      riskOnPriceOnChart={riskOnPriceOn}
                      liquidityLifecycleOnChart={liquidityLifecycleOn}
                      liquidityLifecycle={chartLiquidityLifecycle}
                      riskReceipt={riskReceipt}
                      onRiskOnPrice={onRiskOnPrice}
                      onContradiction={onContradiction}
                      onMemoryGhost={onMemoryGhost}
                      onExpectedEnvelope={onExpectedEnvelope}
                      onProfileFusion={onProfileFusion}
                      onVisibleRangeRefusal={setVisibleRangeRefusal}
                      onSessionVpRefusal={setSessionVpRefusal}
                      scaffoldingStructure={chartStructureVM}
                      /*
                        The trader's four switches, carried SEPARATELY from the
                        four readings above. Passing `null` for a switched-off
                        layer would have been fewer props and a lie: `null`
                        already means "the tape could not answer", and a chart
                        cannot tell a trader why nothing is drawn if one value
                        carries two different reasons.
                      */
                      imbalanceStackOnChart={imbalanceStackOn}
                      valueCandleOnChart={valueCandleOn}
                      deltaDivergenceOnChart={deltaDivergenceOn}
                      liquidityWeatherOnChart={liquidityWeatherOn}
                      effortMarkOnChart={effortMarkOn}
                      paperTradesVisible={paperTradesOn}
                      onRequestFullscreen={handleRequestFullscreen}
                      showFidelityChrome={false}
                    />
                    </ErrorBoundary>
                    {/*
                      FL-06's panel, ON THE CANDLES — the plate stamps "NO
                      ESSAY DRAWER AS PRIMARY TRUTH" across its corner, so the
                      bar's composition is read beside the bar and not in a
                      drawer the trader has to go and open.

                      Gated on having bars because a span cannot be derived
                      from fewer than two of them, and a ticket with no span
                      could not tell which prints belong to the bar — the exact
                      condition under which it would have to invent one.
                    */}
                    {/*
                      THE ASK — the Founder's correction names the questions a
                      trader asks of the camera (continuation healthy? · trap? ·
                      hold?). Only while the Question Lens is on; the lens owner
                      compiles the answer and refuses what it cannot ask.
                    */}
                    {activeTab === "Chart" && !gridView && questionLensOn && (
                      <div
                        role="radiogroup"
                        aria-label="Ask the chart a question"
                        data-testid="question-lens-chooser"
                        className="absolute z-[60] flex flex-wrap items-center gap-1 rounded-md border border-wm-gold/40 px-1.5 py-1"
                        // Under the lens column where the pane is tall enough, but
                        // never below the pane's floor: the pane clips overflow, and
                        // this row holds the only way to change the question and the
                        // only Show raw. It renders on phones too (the compact lens
                        // keeps its answer on two lines; the trader still needs to
                        // be able to ask something else or see the raw tape).
                        style={{ left: 12, top: "min(532px, calc(100% - 96px))", width: "min(300px, calc(100% - 24px))", background: "rgba(11,10,8,0.92)" }}
                      >
                        <span className="px-1 text-[9px] font-bold uppercase tracking-[0.12em] text-wm-text-dim">Ask</span>
                        {QUESTION_CHOICES.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            role="radio"
                            aria-checked={questionChoice === c.id}
                            data-question-choice={c.id}
                            onClick={() => setQuestionChoice(c.id)}
                            className={`min-h-7 rounded px-2 text-[10px] font-semibold ${questionChoice === c.id ? "bg-wm-gold/20 text-wm-gold" : "text-wm-text-muted hover:text-wm-text"}`}
                          >
                            {c.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          aria-pressed={rawOn}
                          data-testid="show-raw"
                          onClick={() => setRawOn(v => !v)}
                          className={`min-h-7 rounded border px-2 text-[10px] font-semibold ${rawOn ? "border-wm-gold/60 bg-wm-gold/20 text-wm-gold" : "border-wm-border text-wm-text-muted hover:text-wm-text"}`}
                        >
                          {rawOn ? "Raw · restore" : "Show raw"}
                        </button>
                      </div>
                    )}
                    {activeTab === "Chart" && !gridView && chartBars.length >= 2 && (
                      <ChartInspectTicket
                        vm={inspectTicketVM}
                        followingLiveBar={inspectFollowingLiveBar}
                        open={inspectOpen}
                        selectedPrint={activeSelectedPrint}
                        contradiction={contradictionVM}
                        memoryGhost={memoryGhostVM}
                        envelope={envelopeVM}
                        fusion={fusion.fused}
                        profileDna={profileDnaOn ? profileDnaVM : null}
                        profileDnaOnGlass={livingProfileOn && livingProfileGlass.drawn}
                        selectedProfileSlice={activeProfileSlice}
                        selectedZone={chartStructureZones.find(z => z.object.objectId === selectedMarketObjectId) ?? null}
                        zoneLineage={selectedZoneLineage}
                        selectedLevel={selectedLevelObject}
                        levelLineage={selectedLevelLineage}
                        timeZone={effChartSettings.displayTimeZone}
                        livingBiography={livingBiographyVM}
                        selectedAnatomy={activeSelectedAnatomy}
                        activeDecisionId={currentSceneDecision?.decisionId ?? null}
                        profileSliceSymbol={symbol}
                        profileSliceAsOf={livingProfileAsOf}
                        onOpenChange={open => actOnChartSelection({ type: open ? "openInspect" : "closeInspect" })}
                        onOpenFootprint={() => setActiveTab("Worksheet")}
                      />
                    )}
                    {/*
                      FL-06 object ④, on the opposite edge from the ticket.
                      Same bar, different question: the ticket says what the
                      bar is MADE OF, this says how the bar COMPARES. Gated on
                      the same two-bar floor so both panels appear together
                      rather than one implying the other is broken.
                    */}
                    {activeTab === "Chart" && !gridView && chartBars.length >= 2 && (
                      <ChartEffortVsResult
                        vm={effortVsResultVM}
                        followingLiveBar={inspectFollowingLiveBar}
                        open={effortOpen}
                        onOpenChange={setEffortOpen}
                      />
                    )}
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
                /* M9 DISCLOSURE — false, and measured rather than assumed.
                   `replayBars` is passed from NO call site in this file, and in
                   MainChart.tsx both `replayActive` and `replayBars` appear
                   exactly twice each: the props interface and the destructure.
                   Nothing reads them. Until the real wire lands (frozen
                   CanonicalBar ancestry + truth epochs, per M9 repair 2), the
                   panel must not narrate a chart it does not drive.
                   DO NOT flip this to true by slicing today's bars.

                   NOW FED FROM `REPLAY_DRIVES_THE_CAMERA` rather than hardcoded
                   a second time. The disclosure and the room's fidelity chips
                   are answers to ONE question; while they were two separate
                   literals the panel could say "nothing behind me is a replay"
                   while the masthead an inch above certified HISTORICAL BARS.
                   Measured in exactly that state on prod 2026-09-22. */
                chartFollowsCursor={REPLAY_DRIVES_THE_CAMERA}
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
      {smartMoneyOpen && (
        <SmartMoneyPanel
          onClose={() => setSmartMoneyOpen(false)}
          symbol={symbol}
          layerLedger={overlayDrawingLedger}
        />
      )}
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
        settings={effChartSettings}
        onSettingsChange={applyChartSettings}
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
      {/* NO `onEnter` BELOW, DELIBERATELY — see the prop's note in
          RoomEquipmentLayer. FULL is `position: fixed; inset: 0` over the
          field, so entering it takes the chart away, and this room IS the
          chart. The Last Mile canon (2026-09-18) lists `stage=full` under
          AUTOMATIC REJECT CHROME for the default route, and its component law
          for Workspace and Tools is "overlay equipment wall, D≈0, chart stays".

          The journey still HAS a full stage and `onChartEquipmentEnter` still
          exists — the reducer is shared, and /command-deck uses that depth
          legitimately because a document loses nothing by filling the screen.
          What changed is that the market canvas no longer offers the door. */}
      <RoomEquipmentLayer
        journey={chartEquipment}
        content={chartEquipmentContent}
        placement="market-dock"
        // The room's own bindings. Resolving a symbol inside the equipment
        // would let the full experience name a different market than the chart
        // the trader entered from — and full is the stage that takes the chart
        // away, so nothing would contradict it.
        subject={{ symbol, timeframe }}
        onExpand={onChartEquipmentExpand}
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
