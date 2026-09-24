"use client";

/**
 * MainChart — TradingView Lightweight Charts v4.2
 *
 * Fixes vs prev version:
 *  - getIntervalSec() is now uniform (seconds) — tick TF bug fixed
 *  - VWAP + bands removed from default chart (moved to Indicators panel)
 *  - Candle countdown timer (resets per timeframe)
 *  - Live bar update works on ALL 16 timeframes
 *  - Canvas order-flow bubbles at exact price levels
 *  - Pine Script overlay series
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { FootprintType, CandleType } from "./ChartsDashboard";
import { resolveParams, visibleAtTf, type IndicatorSettings } from "./indicatorConfig";
import { parseExchangeSymbol } from "@/lib/exchanges";
import { canonicalAssetClass, canonicalInstrumentId } from "@/lib/marketData/canonicalIdentity";
import { DataVersionGuard } from "@/lib/chartContext";
import { shouldFoldChartLiveBar } from "@/lib/marketData/liveBarPolicy";
import { tapeHorizonBarStart, tapeHorizonLabel } from "@/lib/tapeHorizon";
import { marketTickDedupeKey } from "@/lib/marketData/tickIdentity";
import type { AggressorMethod } from "@/lib/marketData/marketEvent";
import {
  compileBarHistoryRefusal,
  type BarHistoryRefusalVM,
  type VendorAttempt,
} from "@/lib/marketData/compileBarHistoryRefusal";
import BarHistoryRefusalNote from "@/components/chart/BarHistoryRefusalNote";
import { TimeframeGlassChip, TIMEFRAME_FOOTER_H, TIMEFRAME_CHIP_BOTTOM_PX } from "@/components/chart/TimeframeGlassChip";
import { chartVolumeFooterFact } from "@/lib/chart/chartVolumeFooterFact";
import clsx from "clsx";
// The "change unavailable" sentence is NOT spelled here any more. It reaches
// this row verbatim through `chartHeaderChangeFact`'s NONE arm, which reads it
// from `@/lib/marketData/changeAbsence` — one owner, however many hops away.
// Spelling it a second time here is the vacuous-agreement shape: two copies
// that agree until someone edits one of them.
import { chartHeaderChangeFact, type HeaderChangeKind } from "@/lib/marketData/chartHeaderChangeFact";
import { deriveBarOverBarChange, deriveLastBarClose } from "@/lib/marketData/deriveLastBarClose";
import { chartHeaderPriceFact } from "@/lib/marketData/chartHeaderPriceFact";
import {
  DELTA_LEVEL_CAP_DEFAULT,
  DELTA_LEVEL_CAP_EVENT,
  DELTA_LEVEL_CAP_STORAGE_KEY,
  normalizeDeltaLevelCap,
} from "@/lib/marketData/deltaLevelCap";
import { PRICE_ABSENCE_GLYPH, priceAbsenceReason } from "@/lib/marketData/priceAbsence";
// The canon owns the fidelity vocabulary; this file renders it and never
// invents it. Imported for the bar-replay arm of the data-truth strip.
import { CANONICAL_FIDELITY_LABELS } from "@/lib/marketData/canonicalFidelityLabels";
import {
  findSessionNectarChannel,
  getSessionNectarSnapshot,
  subscribeToSessionNectar,
} from "@/lib/marketData/sessionNectar";
import {
  getSessionSymbolSlot,
  recordSessionTrade,
  pushCvdSample,
  subscribeSessionSymbolStore,
} from "@/lib/marketData/sessionSymbolStore";
import { getRuntimeTapeCapability, hasVerifiedAggressorTape } from "@/lib/marketData/capabilityRegistry";
import {
  classifySymbol,
  isUnsupportedByEquityVendors,
  observesUsEquitySession,
} from "@/lib/marketData/symbolAssetClass";
import { overlayFrameBudgetMs, overlayFrameVerdict } from "@/lib/chartOverlayGovernor";
import {
  emptyPaintLedger,
  paintLedgerReceipt,
  recordPaint,
  recordSkip,
  withPaintBudget,
} from "@/lib/chart/paintBudgetLedger";
import { useWebSocket } from "@/hooks/useWebSocket";
import { candleDataStatus, priceSourceBadge, resolveChartSurfaceBadge } from "@/lib/priceSource";
import { useProvenSessionClosure } from "@/lib/marketData/useProvenSessionClosure";
import { CanonicalFidelityBadge } from "@/components/marketData/CanonicalFidelityBadge";
import { selectPerCapabilityFidelity } from "@/lib/marketData/selectPerCapabilityFidelity";
import { selectChartCloseLabel } from "@/lib/marketData/selectChartCloseLabel";
import { chartBarRangeFact } from "@/lib/marketData/chartBarRangeFact";
import { chartAxisControlLabel } from "@/lib/chart/chartAxisControlLabel";
import { chartIdentityLabel } from "@/lib/chart/chartIdentityLabel";
import { initialChartRange } from "@/lib/chart/initialChartRange";
import {
  openChartCameraKeeper,
  type ChartCameraKeeper,
  type CameraResizeOutcome,
} from "@/lib/chart/chartCameraKeeper";
import { STRUCTURE_DEFAULT_LOOKBACK } from "@/lib/marketData/viewModels/selectMarketStructure";

/**
 * THE PIVOT LOOKBACK THIS CHART DRAWS SWINGS AT — AND THE ONE IT DOESN'T.
 *
 * `swingHighLow` is called inline four times in this file. Until now all four
 * lookbacks were bare numeric literals — 5, 5, 4, 4 — with nothing connecting
 * them to `selectMarketStructure`, the compiled owner the Market Object
 * Passport reads. The Passport uses 5.
 *
 * That is the producer/matcher drift hazard one level down. If either number
 * moved, the chart would draw a swing the Passport's sequence does not contain,
 * or omit one it does, on the same bars at the same instant — canon Weakness
 * #1 — and the symptom would be nothing. No throw, no red test. Two lines on a
 * chart that quietly disagree with the words beside them.
 *
 * Swing High/Low and Strong Highs/Lows are the SAME question the Passport
 * answers, so they now read the owner's constant. They cannot drift from it
 * because there is no longer a second number to move.
 *
 * ── THE 4 IS NOT ENDORSED, IT IS DISCLOSED ──────────────────────────────────
 *
 * Liquidity Pools and Change of Character use 4, and no comment, commit or
 * doc in this repo says why. It predates the compiled owner. Harmonising it to
 * 5 would silently change what the Founder's chart draws, which is not a
 * refactor's business, so the number is preserved EXACTLY and merely given a
 * name that admits it is unexplained. Naming it is what makes the divergence
 * reviewable instead of invisible; deciding it is a separate atom with the
 * Founder in the room.
 */
const CHART_SWING_LOOKBACK = STRUCTURE_DEFAULT_LOOKBACK;
const LIQUIDITY_SWEEP_LOOKBACK = 4;

/**
 * THE PRICE LEGEND'S RESERVED HEADROOM, WITH ONE OWNER.
 *
 * Canon frame F24 prints the symbol and the O/H/L/C line INSIDE the candle
 * pane rather than in a chrome band above it. On 2026-09-21 this build
 * followed, and the legend became a 28px absolute overlay pinned to the pane's
 * top edge.
 *
 * That corner was NOT empty. Two things had held `top: 8` since the era when
 * the legend lived in a row of its own and the pane's top-left was free real
 * estate: the data-window `D` toggle (a DOM button) and the absorption-anatomy
 * BASIS caption (drawn on canvas). LOOKED AT, NOT INFERRED —
 * scratchpad/top-clip.png at 1440x900 showed both printing underneath the
 * "30815.50" glyphs.
 *
 * They live in different rendering systems and cannot see each other, so left
 * as two literal `8`s they would agree only by luck, and the next person to
 * change the legend's height would silently re-create the collision in
 * whichever one they didn't think of. One constant, two readers: the height
 * the legend actually reserves, and the inset both had all along.
 */
const PRICE_LEGEND_OVERLAY_H = 28;
const PANE_TOP_LEFT_INSET = 8;
/** First free pixel below the price legend, for anything else in that corner. */
const BELOW_PRICE_LEGEND = PRICE_LEGEND_OVERLAY_H + PANE_TOP_LEFT_INSET;

/**
 * …AND THE ROW BELOW THE LEGEND HAS AN ORDER, NOT A PILE-UP.
 *
 * Moving both displaced objects down by the same amount fixed their collision
 * with the legend and created a new one with each other — LOOKED AT, 2026-09-21,
 * second `top-clip.png`: the `D` glyph and the word "EFFORT" printed over one
 * another. They are a DOM button and a canvas caption, so no layout engine will
 * ever space them; the only way they can share a row is if the second one is
 * told how wide the first one is.
 *
 * Left-to-right: the `D` toggle, then the BASIS caption.
 */
const DATA_WINDOW_TOGGLE_PX = 22;
const BASIS_CAPTION_X =
  PANE_TOP_LEFT_INSET + DATA_WINDOW_TOGGLE_PX + PANE_TOP_LEFT_INSET;
import { dataWindowBarScope } from "@/lib/chart/dataWindowBarScope";
import { chartBarCountdown } from "@/lib/chart/chartBarCountdown";
import { candleCountdownUsesPillShell } from "@/lib/chart/candleCountdownMaterial";
import { chartFeedRecency } from "@/lib/chart/chartFeedRecency";
import { yahooQuoteRefusal } from "@/lib/marketData/yahooQuoteObserved";
import { fetchYahooQuoteBody } from "@/lib/marketData/yahooQuoteRounds";
import type { PineOutput } from "@/lib/pine/types";
import { interpretPine } from "@/lib/pine/interpreter";
import * as IND from "./indicators";
import { computeDeltaVP, type DeltaVPLevel } from "@/lib/deltaVP";
import {
  selectAbsorptionAnatomy,
  type AnatomyBarInput,
} from "@/lib/marketData/selectAbsorptionAnatomy";
import { selectStackedImbalanceGlass } from "@/lib/marketData/viewModels/selectStackedImbalanceGlass";
import type { StackedImbalanceVM } from "@/lib/marketData/viewModels/selectStackedImbalance";
import { selectValueCandleGlass } from "@/lib/marketData/viewModels/selectValueCandleGlass";
import type { ValueCandleVM } from "@/lib/marketData/viewModels/selectValueCandle";
import { selectDeltaDivergenceGlass } from "@/lib/marketData/viewModels/selectDeltaDivergenceGlass";
import type { DeltaDivergenceVM } from "@/lib/marketData/viewModels/selectDeltaDivergence";
import { selectLiquidityWeatherGlass } from "@/lib/marketData/viewModels/selectLiquidityWeatherGlass";
import { heatRampColor, selectHeatLens } from "@/lib/marketData/viewModels/selectHeatLens";
import type { LiquidityWeatherVM } from "@/lib/marketData/viewModels/selectLiquidityWeather";
import type { EffortMarkVerdict } from "@/lib/marketData/effortMarkGeometry";
import type { DeltaLevelsGlass } from "@/lib/marketData/viewModels/selectDeltaLevelsGlass";
import type { LivingProfileGlass } from "@/lib/marketData/viewModels/selectLivingProfileGlass";
import selectSemanticZoom from "@/lib/marketData/viewModels/selectSemanticZoom";
import type { MarketStructureGlass } from "@/lib/marketData/viewModels/selectMarketStructureGlass";
import type { TpoProfileVM } from "@/lib/marketData/viewModels/selectTpoProfile";
import type { StructureProfileVM } from "@/lib/marketData/viewModels/selectStructureProfile";
import type { ProfileDnaVM } from "@/lib/marketData/viewModels/selectProfileDna";
import type { ValueMigrationVM } from "@/lib/marketData/viewModels/selectValueMigration";
import type { ProfileMemoryVM } from "@/lib/marketData/viewModels/selectProfileMemory";
import type { ProfileFusionVM } from "@/lib/marketData/viewModels/selectProfileFusion";
import type { CompositeProfileVM } from "@/lib/marketData/viewModels/selectCompositeProfile";
import { selectVisibleRangeProfile, selectTimeRangeProfile, type VisibleRangeProfileVM } from "@/lib/marketData/viewModels/selectVisibleRangeProfile";
import { planProfileStack, soloLane, type StackSpecies } from "@/lib/marketData/viewModels/profileStackPlan";
import type { RegimeLightingVM } from "@/lib/marketData/viewModels/selectRegimeLighting";
import { selectSemanticDensity, semanticDensityForBarCount } from "@/lib/marketData/viewModels/selectSemanticDensity";
import { selectExhaustion } from "@/lib/marketData/viewModels/selectExhaustion";
import { selectQuestionLens } from "@/lib/marketData/viewModels/selectQuestionLens";
import { selectAnatomyCards } from "@/lib/marketData/viewModels/selectAnatomyCards";
import { selectScaffoldingRead, type ScaffoldingDepth } from "@/lib/marketData/viewModels/selectScaffoldingRead";
import type { MarketStructureVM } from "@/lib/marketData/viewModels/selectMarketStructure";
import type { StructureZone } from "@/lib/marketData/viewModels/selectStructureZoneObjects";
// The `delta-vp` DRAWING TOOL's geometry. Deliberately `dvp*`, not `vp*` — this
// file also imports vpDrawGeometry below, which governs the VOLUME PROFILE
// INDICATOR under a different bar-length law. Two pictures, two owners, two
// names. See the header of deltaVPGeometry.ts.
import {
  DVP_GUTTER,
  DVP_MIN_LABEL_ROW_H,
  DVP_MIN_CAPTION_W,
  dvpBinCount,
  dvpBoxAdmitsProfile,
  dvpProfileRefusal,
  dvpRefusalMessage,
  dvpGroupedRefusalMessage,
  dvpColumns,
  dvpRowBox,
  dvpRowCulled,
  dvpRowPaint,
  dvpFormatCount,
} from "@/lib/deltaVPGeometry";
import {
  computeDeltaBubbleLevels,
  deltaBubbleLevelKey,
  type DeltaTick,
  type DeltaBubbleLevel,
} from "@/lib/deltaBubbleLevels";
import {
  bigTradeLevelKey,
  computeBigTradeLevels,
  minBigTradeLot,
  type BigTradeTick,
  type BigTradeLevel,
  type SelectedBigTrade,
} from "@/lib/bigTradeLevels";
import { bubbleClaimMagnitude, describeBubbleClaim, formatBubbleVolume, formatBubblePrice } from "@/lib/bubbleClaim";
import { bigTradeAnchor, bigTradeBubbleRadius, bubbleFramePeak, deltaBubbleRadius } from "@/lib/bubbleDrawGeometry";
import { compactSpawnKeys } from "@/lib/bubbleSpawnCache";
import { computeProfileFromBars } from "@/lib/vpEngine";
// vpEngine owns WHERE THE VOLUME GOES; vpDrawGeometry owns WHERE THE PIXELS GO.
// Both halves of the profile are now pure and tested — see vpDrawGeometry.ts.
import {
  vpBarSplit,
  vpBarWidth,
  vpColumnLayout,
  vpLabelFits,
  vpRowRect,
  vpRowVisible,
} from "@/lib/vpDrawGeometry";
// …and vpRenderReceipt owns WHETHER THE PIXELS ARRIVED. The two modules above
// are pure and cannot know whether the draw loop ran; every one of drawWMVP's
// five declines used to vanish into a void return.
import { compileVpRenderReceipt } from "@/lib/vpRenderReceipt";
import type { VpColumnAttempt, VpColumnGeometry, VpDeclineReason } from "@/lib/vpRenderReceipt";
import type { DrawingStyle, LogicalPt, DrawStyle, ChartDrawing } from "@/types/chart";
import { DEFAULT_DRAWING_STYLE } from "@/types/chart";
import { showAlertToast } from "./AlertsPanel";
import { NectarVaultChip } from "./NectarVaultChip";

/* ── Types ─────────────────────────────────────────────── */
/*
 * THE CHART NO LONGER DECLARES ITS OWN `Bar` (2026-09-18).
 *
 * It used to own `interface Bar { time, open, high, low, close, volume }` — six
 * numbers, byte-for-byte `LegacyOhlcvTuple`, with roughly seventy references
 * through the live-chart hot path. It was held back from the earlier group
 * rename for a stated reason: `LegacyOhlcvTuple` declares all six fields
 * `readonly`, and this file de-spikes bar wicks by ASSIGNING to `.high` and
 * `.low`, so the rename was a live question about whether the chart writes into
 * bars it shares with anything else.
 *
 * THE ANSWER, MEASURED RATHER THAN ASSUMED — and the first draft of this note
 * got it wrong, so the record is kept honest here. `tsc` DID reject the rename,
 * at four lines across two de-spike passes: the historical clamp writing
 * `b.high` / `b.low` inside `out`, and the live-tick clamp writing `bar.high` /
 * `bar.low`. Reading before compiling would have said "these are locally-owned
 * objects, so nothing is at risk", which is true about OWNERSHIP and says
 * nothing about whether the code compiles. The compiler named the lines.
 *
 * WHAT THE OWNERSHIP READING GOT RIGHT is that no write reaches back into
 * `barsRef.current`. The historical clamp edits objects built one loop earlier
 * by `out.push({ ...b, … })`; the live clamp edits a `bar` freshly built by
 * both branches of the fold; the range-bar aggregator edits `cur`, an anonymous
 * literal that is not this type at all. No STORED bar is edited after
 * publication. So the repair was not a retreat — both clamps now REPLACE rather
 * than mutate, which is the shape they should have had anyway.
 *
 * THAT IS THE VALUABLE PART, not the count. A chart that edits its stored
 * history in place cannot have a truthEpoch, because a corrected bar would
 * silently overwrite the bar the trader already acted on. This file does not do
 * that, and now the type system enforces it rather than a convention. It is one
 * real precondition for CanonicalBar adoption on the live path — and it is only
 * a precondition. The bars drawn here still carry no symbolId, no sessionId, no
 * fidelity and no provenance.
 */
import type {
  CanonicalBarIdentity,
  LegacyOhlcvTuple,
} from "@/lib/marketData/canonicalBar";
import { alignCanonicalBarIdentities } from "@/lib/marketData/alignCanonicalBarIdentities";
import type { MarketObject } from "@/lib/marketData/marketObjectKinds";
import type { WaitStandingVM } from "@/lib/marketData/viewModels/selectWaitStanding";
import {
  CANDLE_DOWN_DEFAULT,
  CANDLE_UP_DEFAULT,
  movingAverageInk,
  CROSSHAIR_COLOR_DEFAULT,
  GRID_COLOR_DEFAULT,
  MARKET_FIELD_DEFAULT,
  VOLUME_DOWN_DEFAULT,
  VOLUME_UP_DEFAULT,
  VP_UP_DEFAULT,
  VP_DOWN_DEFAULT,
  VP_POC_DEFAULT,
  VP_VALUE_AREA_DEFAULT,
  migrateVolumeProfilePalette,
} from "@/lib/chart/marketFieldMaterial";

/* ── Symbol base prices — verified against MooMoo/TradingView Jun 16 2026 ── */
// NOTE: fetchPolygonOHLCV returns real OHLCV data for stocks/ETFs/crypto.
// These seeds are ONLY used for futures (NQ1!, ES1! etc.) and as a 1-second
// fallback before the Polygon REST snapshot resolves.
// Updated Jun 17 2026 — sourced from Yahoo Finance proxy at runtime
const SYMBOL_BASE: Record<string, number> = {
  "NQ1!": 30_476, "ES1!":  7_595,  "RTY1!":  2_968,  "YM1!": 52_464,
  "GC1!":  4_349, "CL1!":  75.68,  "SI1!":   69.97,  "ZB1!": 113.06,
  "ZN1!": 109.88, "HG1!":   4.50,
  "AAPL":    299, "TSLA":    405,  "NVDA":     207,   "AMZN":    246,
  "META":    600, "MSFT":    394,  "GOOG":     371,   "AVGO":    210,
  "AMD":     507, "INTC":     22,  "CRM":      300,   "ORCL":    165,
  "NFLX":  78.72, "JPM":     331,  "GS":     1_091,   "BAC":      46,
  "V":       360, "MA":      560,  "UNH":      310,   "LLY":     870,
  "SPY":     750, "QQQ":     730,  "IWM":      292,   "DIA":     524,
  "GLD":     398, "TLT":      88,  "XLK":      240,   "XLF":      50,
  "BTC":  64_500, "BTCUSD": 64_500, "ETH":  1_760, "ETHUSD": 1_760, "SOL": 71.77, "SOLUSD": 71.77, "BNB": 601,
  "XRP":   1.188, "DOGE":  0.086,  "ADA":     0.75,   "AVAX":     25,
  "EUR/USD": 1.13, "GBP/USD": 1.34, "USD/JPY": 144,
};

// Normalize common aliases → canonical symbol used throughout the app
function normalizeSym(sym: string): string {
  let u = sym.toUpperCase();
  // Strip per-exchange suffix: "BTC.COINBASE" → "BTC"
  const dot = u.indexOf(".");
  if (dot > 0 && /COINBASE|KRAKEN|BITSTAMP|BINANCEUS|GEMINI/.test(u.slice(dot + 1))) u = u.slice(0, dot);
  const aliases: Record<string, string> = {
    BTCUSD: "BTC", ETHUSD: "ETH", SOLUSD: "SOL", BNBUSD: "BNB",
    XRPUSD: "XRP", DOGEUSD: "DOGE", ADAUSD: "ADA", AVAXUSD: "AVAX",
    "BTC/USD": "BTC", "ETH/USD": "ETH",
  };
  return aliases[u] ?? u;
}
function getBase(sym: string) { return SYMBOL_BASE[normalizeSym(sym)] ?? SYMBOL_BASE[sym.toUpperCase()] ?? 100; }

/* ── Color helper: hex (or rgb/rgba passthrough) → rgba string ─────── */
function hexToRgba(color: string, alpha = 1): string {
  if (!color) return `rgba(0,0,0,${alpha})`;
  if (color.startsWith("rgb")) return color; // already rgb/rgba
  let h = color.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some(n => isNaN(n))) return `rgba(0,0,0,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

// Parse a #rrggbb / #rgb hex into an [r,g,b] triplet, or null if invalid/empty.
function hexToRgbTriplet(color: string): [number, number, number] | null {
  if (!color) return null;
  let h = color.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some(n => isNaN(n))) return null;
  return [r, g, b];
}

/** The VP palette as triplets, DERIVED from the owning hex — never restated. */
type VPTriplets = {
  up: [number,number,number]; dn: [number,number,number];
  poc: [number,number,number]; vah: [number,number,number]; val: [number,number,number];
};
const triplet = (hex: string): [number, number, number] =>
  hexToRgbTriplet(hex) ?? [0, 0, 0];
const VP_DEFAULT_TRIPLETS: VPTriplets = {
  up:  triplet(VP_UP_DEFAULT),
  dn:  triplet(VP_DOWN_DEFAULT),
  poc: triplet(VP_POC_DEFAULT),
  vah: triplet(VP_VALUE_AREA_DEFAULT),
  val: triplet(VP_VALUE_AREA_DEFAULT),
};

/**
 * Colour and weight for the header change cell, chosen from DECLARED PROVENANCE
 * — never from "is a number present". The dim pair for BAR_OVER_BAR is the
 * point: a 15-minute bar delta must not be able to borrow the full-strength
 * green/red a session change wears, or the scope label beside it becomes the
 * only thing distinguishing two quantities that a trader reads at a glance.
 * The sibling table in ChartsDashboard (HEADER_CHANGE_STYLE) does the same job
 * in inline styles; both switch on the same `kind` from one compiler.
 */
const MAIN_CHANGE_CLASS: Record<HeaderChangeKind, (d: 1 | 0 | -1 | null) => string> = {
  SESSION_CHANGE: (d) => (d === 1 ? "text-wm-green" : d === -1 ? "text-wm-red" : "text-wm-text-dim"),
  BAR_OVER_BAR:   (d) => (d === 1 ? "text-wm-green-dim" : d === -1 ? "text-wm-red-dim" : "text-wm-text-dim"),
  NONE:           () => "text-wm-text-dim",
  /* AWAITING never reaches a DOM node — the cell is not rendered at all. This
     entry exists so the compiler, not a live page, is what notices if a future
     kind arrives without a colour decision. */
  AWAITING:       () => "text-wm-text-dim",
};

/* ── FIXED: all values in seconds, uniform ──────────────── */
// WM-CHART-P0-03: fail-closed on unknown timeframe. Previously returned 60
// (the 1-minute default), which caused unknown timeframes to be silently
// treated as 1m — a source of the same silent-substitution class the
// server maps had. Now throws so the caller (or an upstream guard) has to
// decide explicitly.
function getIntervalSec(tf: string): number {
  const m: Record<string, number> = {
    "1m":  60,   "2m":  120,  "3m":  180,  "5m":  300,
    "10m": 600,  "15m": 900,  "30m": 1800,
    "1h":  3600, "2h":  7200, "4h":  14400,
    "1D":  86400, "1W": 604800, "1M": 2592000,
    "3M":  7776000, "6M": 15552000, "1Y": 31536000,
    "3Y":  94608000, "5Y": 157680000,
  };
  const v = m[tf];
  if (v == null) {
    throw new Error(`getIntervalSec: unknown timeframe "${tf}" — refusing to silently default to 60s. See WM-CHART-P0-03.`);
  }
  return v;
}

/* ── Countdown wording ───────────────────────────────────────
   The formatter that used to live here emitted `15:12` for a 30m bar — a
   duration in a clock's clothes, rendered two inches from `LAST 07:04 PM`.
   Both the glyph AND the claim it makes about the feed now belong to
   `chartBarCountdown`; see that file's docblock for the live reading. */

/* ── Polygon symbol mapping ─────────────────────────────── */
function toPolygonTicker(sym: string): string | null {
  const s = normalizeSym(sym.toUpperCase());
  // Futures not supported on basic Polygon tier. VX1! and SR3M4 are declined
  // separately and deliberately: the class owner resolves VX1! to the ^VIX
  // INDEX (which is true — it is not a tradable contract here), and SR3M4 is a
  // dated SOFR contract Polygon's basic tier does not carry either. Both are
  // refusals about THIS VENUE, which is a fact this function owns.
  if (classifySymbol(s) === "FUTURES" || s === "VX1!" || s === "SR3M4") return null;
  // Tick-level timeframes not supported via aggs
  // Crypto
  const cryptoMap: Record<string,string> = {
    BTC:"X:BTCUSD", ETH:"X:ETHUSD", SOL:"X:SOLUSD", BNB:"X:BNBUSD",
    XRP:"X:XRPUSD", DOGE:"X:DOGEUSD", ADA:"X:ADAUSD", AVAX:"X:AVAXUSD",
    LINK:"X:LINKUSD", DOT:"X:DOTUSD", MATIC:"X:MATICUSD", LTC:"X:LTCUSD",
    ATOM:"X:ATOMUSD", UNI:"X:UNIUSD", AAVE:"X:AAVEUSD", FIL:"X:FILUSD",
    ARB:"X:ARBUSD", OP:"X:OPUSD", SUI:"X:SUIUSD", APT:"X:APTUSD",
    INJ:"X:INJUSD", PEPE:"X:PEPEUSD", WIF:"X:WIFUSD",
  };
  if (cryptoMap[s]) return cryptoMap[s];
  // Forex
  if (s.includes("/")) {
    return `C:${s.replace("/", "")}`;
  }
  // VIX — synthetic only
  if (s === "VIX") return null;
  // Stocks/ETFs — direct
  return s;
}

function toPolygonTimespan(tf: string): { mult: number; span: string } | null {
  const map: Record<string, { mult: number; span: string }> = {
    "1m":  { mult:1,  span:"minute" },
    "2m":  { mult:2,  span:"minute" },
    "3m":  { mult:3,  span:"minute" },
    "5m":  { mult:5,  span:"minute" },
    "10m": { mult:10, span:"minute" },
    "15m": { mult:15, span:"minute" },
    "30m": { mult:30, span:"minute" },
    "1h":  { mult:1,  span:"hour"   },
    "2h":  { mult:2,  span:"hour"   },
    "4h":  { mult:4,  span:"hour"   },
    "1D":  { mult:1,  span:"day"    },
    "1W":  { mult:1,  span:"week"   },
    "1M":  { mult:1,  span:"month"  },
    "3M":  { mult:3,  span:"month"  },
    "6M":  { mult:6,  span:"month"  },
    "1Y":  { mult:12, span:"month"  },
    "3Y":  { mult:36, span:"month"  },
    "5Y":  { mult:60, span:"month"  },
  };
  return map[tf] ?? null;
}

async function fetchPolygonOHLCV(sym: string, tf: string, count: number, signal?: AbortSignal): Promise<LegacyOhlcvTuple[] | null> {
  // WM-SEC-P0-05 (2026-08-08): client-side Polygon disabled — see
  // TickerTape.tsx for the full rationale. This function short-circuits
  // so callers naturally fall through to Yahoo/Alpaca. Restore behind a
  // server proxy once one exists.
  const POLY_KEY = "";
  if (!POLY_KEY) return null;

  const ticker = toPolygonTicker(sym);
  if (!ticker) return null;

  const timespan = toPolygonTimespan(tf);
  if (!timespan) return null;

  const intervalSec = getIntervalSec(tf);
  const toMs   = Date.now();
  const fromMs = toMs - Math.round(count * 1.8) * intervalSec * 1000;

  const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/${timespan.mult}/${timespan.span}/${fromMs}/${toMs}?adjusted=true&sort=asc&limit=${count}&apiKey=${POLY_KEY}`;

  try {
    const res  = await fetch(url, { cache: "no-store", signal });
    const json = await res.json();
    if (!json.results?.length) return null;
    return json.results.map((r: any) => ({
      time:   Math.floor(r.t / 1000),
      open:   r.o,
      high:   r.h,
      low:    r.l,
      close:  r.c,
      volume: r.v,
    }));
  } catch {
    return null;
  }
}

/* ── Finnhub OHLCV — via /api/finnhub server proxy ──────────────────
 * WM-SEC-P0-03 (2026-08-08): this used to fetch finnhub.io directly with
 * process.env.NEXT_PUBLIC_FINNHUB_KEY, shipping the key in the client
 * bundle. All Finnhub calls now go through /api/finnhub which holds the
 * server-only FINNHUB_KEY. The client-side resMap that duplicated (and
 * disagreed with) the server's FH_RES on `2m` is deleted; the server is
 * the single source of truth for interval mapping — see WM-CHART-P0-03
 * for the still-open fail-closed correctness work on the server map. */
interface CanonicalCandleBatch {
  readonly candles: LegacyOhlcvTuple[];
  readonly identities: readonly CanonicalBarIdentity[];
}

function candleBatch(json: {
  readonly candles?: LegacyOhlcvTuple[];
  readonly barIdentities?: CanonicalBarIdentity[];
}, count: number): CanonicalCandleBatch | null {
  const candles = Array.isArray(json.candles) ? json.candles.slice(-count) : [];
  if (candles.length === 0) return null;
  return {
    candles,
    identities: Array.isArray(json.barIdentities) ? json.barIdentities : [],
  };
}

/**
 * THE RECEIPT SURVIVES THE TRIP UP — 2026-09-20.
 *
 * Every helper below used to end a refusal with `return null`. A CLASSIFIED
 * refusal — `{"edge":"FORBIDDEN"}`, a 404, our own routing rule — was
 * destroyed one stack frame beneath anything that could render it, and the
 * room could then only print FEED UNKNOWN / PRICE UNKNOWN / SOURCE UNKNOWN
 * over an empty canvas. Measured live on BTCUSDT · 5m: four doors, four
 * DIFFERENT answers, one word on the glass.
 *
 * `log` is additive and optional on purpose. The return contract of these
 * helpers is unchanged, so every existing caller and every sentinel that
 * reads them still means what it meant; the reason simply stops being thrown
 * away. Nothing here decides what the trader is told — `compileBarHistoryRefusal`
 * owns that sentence, and a second author for it would be Canon Weakness #1.
 */
function note(log: VendorAttempt[] | undefined, attempt: VendorAttempt): void {
  log?.push(attempt);
}

/** The vendor's own classified edge, if it sent one. Never a paraphrase. */
async function edgeOf(res: Response): Promise<string | null> {
  try {
    const body = await res.json() as { edge?: unknown; error?: unknown };
    if (typeof body.edge === "string" && body.edge) return body.edge;
    if (typeof body.error === "string" && body.error) return body.error;
  } catch { /* a body we cannot read is not a reason we may invent */ }
  return null;
}

async function fetchFinnhubCandles(sym: string, tf: string, count: number, signal?: AbortSignal, log?: VendorAttempt[]): Promise<CanonicalCandleBatch | null> {
  const upper = sym.toUpperCase();
  if (isUnsupportedByEquityVendors(upper)) {
    note(log, { vendor: "Finnhub", outcome: "NOT_ASKED",
      rule: "this product does not route futures or forex to its equity vendors." });
    return null; // futures/forex unsupported by the proxy
  }
  try {
    const url = `/api/finnhub?sym=${encodeURIComponent(upper)}&type=candles&tf=${encodeURIComponent(tf)}&bars=${count}`;
    const res = await fetch(url, { cache: "no-store", signal });
    if (!res.ok) {
      note(log, { vendor: "Finnhub", outcome: "REFUSED", edge: await edgeOf(res) });
      return null;
    }
    const json = await res.json() as {
      candles?: LegacyOhlcvTuple[];
      barIdentities?: CanonicalBarIdentity[];
    };
    // THE SILENT DROP IS RETIRED HERE, 2026-09-18. This read
    //   .filter(b => b.open > 0 && b.high > 0)
    // and it was wrong three separate ways.
    //
    // 1. IT WAS SILENT. A bar removed here left an INVISIBLE GAP — the chart
    //    simply got shorter and nothing, on screen or in a counter, said so.
    // 2. IT WAS AN AMPUTATION. A non-positive price is not a malformed price.
    //    Crude oil printed NEGATIVE in April 2020 and that was a real auction.
    //    canonicalBar.ts's checkBarGeometry deliberately refuses non-finite,
    //    inside-out and un-traded bars and deliberately does NOT refuse a
    //    price for being small or negative. This filter did.
    // 3. IT WAS ASYMMETRIC BY ACCIDENT, not by design. fetchFinnhubCandlesDirect
    //    below requests the IDENTICAL /api/finnhub URL, applies no filter, and
    //    runs FIRST — this function is only reached when that one returned
    //    null. Two readers of one endpoint disagreed about which bars exist.
    //
    // What it was really cleaning up after was the route's own fabrications:
    // `volume ?? 0` and `high ?? Math.max(open, close)` could emit a bar of
    // zeroes, and `open > 0` swept those away. Those fabrications are gone.
    // /api/finnhub now refuses a malformed bar at ingress, checks all six
    // fields rather than two, and DISCLOSES the count as `refusedBars`. The
    // protection did not disappear; it moved upstream, got stricter, and
    // started telling the truth about itself. Re-deciding it here would be a
    // second owner of what a bar is, which is the whole of M8.
    const batch = candleBatch(json, count);
    note(log, { vendor: "Finnhub", outcome: batch ? "SERVED" : "EMPTY" });
    return batch;
  } catch {
    // An aborted request is not a refusal and must never be reported as one —
    // the symbol changed under us, which is the trader's own doing.
    if (!signal?.aborted) note(log, { vendor: "Finnhub", outcome: "REFUSED", edge: null });
    return null;
  }
}

/* ── US-equity session helpers ───────────────────────────────
 * Stocks/ETFs trade an extended day (pre 4:00 ET, RTH 9:30–16:00 ET,
 * post 16:00–20:00 ET). Outside RTH the tape is sparse, so the few prints
 * render as disconnected flat fragments with a visual gap to the right of
 * the regular-session candles. When the user is in "RTH — Regular Hours"
 * mode (extendedHours = false) we strip every non-RTH bar so the series is
 * continuous. Futures / crypto / forex trade ~24h and are never filtered.
 */
function isEquitySymbol(sym: string): boolean {
  // Was five hand-typed rules ending in "default: treat as a US equity / ETF".
  // That default read "/ES" as a stock and RTH-filtered a futures contract, and
  // the crypto list it carried had to be edited every time a coin was added.
  // The owner answers both, and answers FALSE when it does not recognise the
  // symbol — bars are hidden only when a session can be named.
  return observesUsEquitySession(sym);
}

// Returns ET wall-clock minutes-since-midnight + weekday for a unix-seconds ts.
function etClock(tsSec: number): { minutes: number; weekday: number } {
  const d = new Date(tsSec * 1000);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", hour12: false,
    hour: "2-digit", minute: "2-digit", weekday: "short",
  }).formatToParts(d);
  let hh = 0, mm = 0, wd = "Mon";
  for (const p of parts) {
    if (p.type === "hour")    hh = parseInt(p.value, 10) % 24;
    if (p.type === "minute")  mm = parseInt(p.value, 10);
    if (p.type === "weekday") wd = p.value;
  }
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { minutes: hh * 60 + mm, weekday: wdMap[wd] ?? 1 };
}

// RTH = 9:30–16:00 ET, Mon–Fri.
// IMPORTANT: keep any bar whose SPAN overlaps the regular session, not just
// bars whose START is inside it. Session-aligned feeds (Yahoo) emit a 9:30
// opening bar, but CLOCK-aligned feeds (Alpaca — our primary source for US
// equities) emit a 9:00–10:00 opening bar that actually CONTAINS the 9:30 RTH
// open. A start-only window (minutes >= 570) wrongly discarded that opening
// hour bar — that is the "missing candles vs TradingView" the user reported.
// Overlap test: bar [start, start+interval) intersects [9:30, 16:00).
function isRegularSession(tsSec: number, intervalSec: number): boolean {
  const { minutes, weekday } = etClock(tsSec);
  if (weekday === 0 || weekday === 6) return false;
  const barEnd = minutes + Math.max(1, Math.floor(intervalSec / 60));
  return barEnd > 570 && minutes < 960; // overlaps 9:30 (570) .. 16:00 (960)
}

// Filter a bar set down to regular session for intraday equity timeframes.
function filterSession(bars: LegacyOhlcvTuple[], sym: string, intervalSec: number, extendedHours: boolean): LegacyOhlcvTuple[] {
  if (extendedHours) return bars;
  // Multi-hour bars (4h+) open on a fixed grid (…08:00,12:00,16:00,20:00) and
  // most opens fall OUTSIDE 9:30–16:00, so RTH filtering nukes ~90% of them and
  // leaves a sparse, gappy 4h/6h chart. These large bars inherently span sessions
  // and should not be dropped — same as daily+. Only filter genuine intraday
  // (≤1h) equity bars, which align cleanly to the regular session.
  if (intervalSec >= 14400) return bars;          // 4h+ : keep every bar (like daily)
  if (!isEquitySymbol(sym)) return bars;          // 24h assets untouched
  const filtered = bars.filter(b => isRegularSession(Number(b.time), intervalSec));
  // Safety: never return empty if the source somehow had only extended bars.
  return filtered.length >= Math.min(20, bars.length) ? filtered : bars;
}

/* ── Yahoo Finance OHLCV — covers futures + crypto + stocks ── */
// ── Alpaca candles (primary for stocks/ETFs/crypto when key is set) ──────
async function fetchAlpacaCandles(sym: string, tf: string, count: number, signal?: AbortSignal, log?: VendorAttempt[]): Promise<CanonicalCandleBatch | null> {
  const up = sym.toUpperCase();
  if (classifySymbol(up) === "FUTURES") {
    note(log, { vendor: "Alpaca", outcome: "NOT_ASKED", rule: "it does not carry futures." });
    return null; // Alpaca doesn't support futures
  }
  try {
    const url = `/api/alpaca?sym=${encodeURIComponent(up)}&type=candles&tf=${tf}&bars=${count}`;
    const res = await fetch(url, { cache: "no-store", signal });
    if (res.status === 503 || res.status === 404) {
      // 503 = no key configured here, 404 = this vendor does not carry it.
      // Both are real and DIFFERENT from "the market was quiet", which is why
      // the edge travels rather than being flattened into one sentence.
      note(log, { vendor: "Alpaca", outcome: "REFUSED", edge: await edgeOf(res) });
      return null; // key not set or not supported
    }
    const json = await res.json();
    const batch = candleBatch(json, count);
    note(log, { vendor: "Alpaca", outcome: batch ? "SERVED" : "EMPTY" });
    return batch;
  } catch {
    if (!signal?.aborted) note(log, { vendor: "Alpaca", outcome: "REFUSED", edge: null });
    return null;
  }
}

async function fetchFinnhubCandlesDirect(sym: string, tf: string, count: number, signal?: AbortSignal, log?: VendorAttempt[]): Promise<CanonicalCandleBatch | null> {
  // Only for stocks/ETFs — futures/crypto fall back to Yahoo
  // The crypto list here named eleven coins and none of the `-USD` forms the
  // app's own pickers emit, so BTC-USD was being asked of an equity vendor.
  const klass = classifySymbol(sym);
  if (klass === "FUTURES" || klass === "CRYPTO") {
    note(log, { vendor: "Finnhub REST", outcome: "NOT_ASKED",
      rule: `this product does not route ${klass.toLowerCase()} to its equity vendors.` });
    return null;
  }
  try {
    const url = `/api/finnhub?sym=${encodeURIComponent(sym)}&type=candles&tf=${tf}&bars=${count}`;
    const res = await fetch(url, { cache: "no-store", signal });
    if (!res.ok) {
      note(log, { vendor: "Finnhub REST", outcome: "REFUSED", edge: await edgeOf(res) });
      return null;
    }
    const json = await res.json();
    const batch = candleBatch(json, count);
    note(log, { vendor: "Finnhub REST", outcome: batch ? "SERVED" : "EMPTY" });
    return batch;
  } catch {
    if (!signal?.aborted) note(log, { vendor: "Finnhub REST", outcome: "REFUSED", edge: null });
    return null;
  }
}

async function fetchYahooCandles(sym: string, tf: string, count: number, ext = false, signal?: AbortSignal, log?: VendorAttempt[]): Promise<CanonicalCandleBatch | null> {
  try {
    const url = `/api/yahoo?sym=${encodeURIComponent(sym)}&type=candles&tf=${tf}&bars=${count}${ext ? "&ext=1" : ""}`;
    const res = await fetch(url, { cache: "no-store", signal });
    const json = await res.json() as {
      error?: unknown;
      notAsked?: unknown;
      rule?: unknown;
      candles?: LegacyOhlcvTuple[];
      barIdentities?: CanonicalBarIdentity[];
    };
    /* A RULE OF OURS REPORTED AS OURS.
       `/api/yahoo` sets `notAsked` when a WM rule stopped the request before
       the wire — today, the refusal to answer a USDT pair with a USD price.
       That used to arrive here as "Error: Yahoo HTTP 404", because the
       unresolved ticker was sent anyway, and the glass read "Yahoo was asked
       and refused". Yahoo answered a question correctly and wore the blame for
       our decision. NOT_ASKED carries the rule instead, which is the outcome
       `compileBarHistoryRefusal` was built for and could not previously be
       given on this lane. */
    if (json.notAsked === true) {
      note(log, {
        vendor: "Yahoo",
        outcome: "NOT_ASKED",
        rule: typeof json.rule === "string" && json.rule ? json.rule : null,
      });
      return null;
    }
    // /api/yahoo answers 200 with an `error` field, so `res.ok` alone would
    // read a refusal as an empty market. It is not one: the vendor was asked
    // and said no, which is a different fact from a quiet window.
    if (typeof json.error === "string" && json.error) {
      note(log, { vendor: "Yahoo", outcome: "REFUSED", edge: json.error });
      return null;
    }
    const batch = candleBatch(json, count);
    note(log, { vendor: "Yahoo", outcome: batch ? "SERVED" : "EMPTY" });
    return batch;
  } catch {
    if (!signal?.aborted) note(log, { vendor: "Yahoo", outcome: "REFUSED", edge: null });
    return null;
  }
}

/* ── Tick-size helper ────────────────────────────────────── */
function getMinTick(base: number): number {
  if (base > 10_000) return 0.25;   // NQ, YM
  if (base > 1_000)  return 0.25;   // ES, RTY
  if (base > 100)    return 0.01;   // Stocks
  if (base > 10)     return 0.01;
  if (base > 1)      return 0.0001; // Forex
  return 0.00001;
}

/* Snap price to nearest valid tick */
function snapTick(price: number, tick: number): number {
  return Math.round(price / tick) * tick;
}

/* ── Props ──────────────────────────────────────────────── */
interface Props {
  symbol:          string;
  timeframe:       string;
  /**
   * Canon F24 draws the timeframe as ONE bordered chip at the bottom centre of
   * the candle pane, so the pane — not a band above it — is now where the
   * timeframe is chosen. MainChart already received `timeframe` to fetch with;
   * it receives the setter so the chip it mounts writes to the same single
   * owner in ChartsDashboard that the retired toolbar row wrote to. Optional so
   * that any surface embedding a read-only chart simply renders no chip rather
   * than rendering a dead one.
   */
  setTimeframe?:   (t: string) => void;
  footprintType:   FootprintType;
  candleType?:     CandleType;
  pineOutput?:     PineOutput | null;
  pineCode?:       string;
  onBarsReady?:    (
    bars: LegacyOhlcvTuple[],
    identities: readonly CanonicalBarIdentity[],
  ) => void;
  // Drawing tools
  drawingTool?:    string;
  drawingStyle?:   DrawingStyle;
  magnetActive?:   boolean;
  lockDrawings?:   boolean;
  onDrawingComplete?: () => void;   // fired after a drawing is placed → return to cursor
  onCreatePriceAlert?: (price: number) => void;
  drawingsVisible?:boolean;
  clearTrigger?:   number;
  activeInds?:     Set<string>;
  indSettings?:    IndicatorSettings;
  extendedHours?:  boolean;
  // New features
  alertLevels?:    number[];
  chartSettings?:  {
    background?: string;
    gridVisible?: boolean;
    gridColor?: string;
    crosshairColor?: string;
    logScale?: boolean;
    autoScale?: boolean;
    percentageMode?: boolean;
    candleUp?: string; candleDown?: string;
    wickUp?: string; wickDown?: string;
    borderUp?: string; borderDown?: string;
    neon?: boolean;
    candleTimer?: boolean;
    displayTimeZone?: string;
    clock24h?: boolean;
  };
  replayActive?:   boolean;
  replayBars?:     LegacyOhlcvTuple[];
  compareSymbol?:  string;
  onPriceAtCursor?: (price: number) => void;
  onSelectBigTrade?: (print: SelectedBigTrade) => void;
  /**
   * A clean click inside the Living Profile's lane, resolved to a PRICE. The
   * dashboard resolves the price to the compiler's bucket; this file never
   * decides what a slice is.
   */
  onSelectProfileSlice?: (price: number) => void;
  /** The selected slice's bucket price, outlined on the glass. */
  selectedProfileSlicePrice?: number | null;
  onOHLCAtCursor?:  (ohlc: { o: number; h: number; l: number; c: number; v: number; time: number } | null) => void;
  // WM VP indicators
  fixedVPActive?:  boolean;
  sessionVPActive?:boolean;
  /**
   * ABSORPTION ANATOMY (Founder Asset 06) — draws the EFFORT field and the
   * ABSORPTION ZONE band directly in price/time space. See the draw block.
   */
  absorptionAnatomyActive?: boolean;
  /**
   * STACKED IMBALANCE, AT ITS PRICE.
   *
   * The reading is compiled by the ROOM (`ChartsDashboard` already calls
   * `useOrderFlowReadings` for the panels) and handed down here already
   * reduced to the few facts a canvas needs — see
   * `selectStackedImbalanceGlass`. This component never computes a second
   * opinion about the tape; if the band and the drawer ever disagreed, the
   * trader would have two houses telling them different things about the same
   * three prices.
   *
   * Null is an ordinary value: it means the room has no reading, and the glass
   * draws nothing rather than an empty band, because an empty band at a price
   * reads as "nothing here" and that is a claim.
   */
  imbalanceStack?: StackedImbalanceVM | null;
  /**
   * THE WM VALUE CANDLE (Founder invention) — where the trading actually
   * happened, as opposed to where price went. Compiled by the room from the
   * same tape the drawer reads, reduced for the canvas by
   * `selectValueCandleGlass`. Null means the room has no reading; nothing is
   * drawn, and no centre of gravity is invented at zero.
   */
  valueCandle?: ValueCandleVM | null;
  /**
   * DELTA DIVERGENCE — the two pivot PRICES the engine compared. Compiled by
   * the room and reduced by `selectDeltaDivergenceGlass`, which is where the
   * refusal to put cumulative delta on a DOLLAR axis lives. Null means the room
   * has no reading; nothing is drawn.
   */
  deltaDivergence?: DeltaDivergenceVM | null;
  /**
   * LIQUIDITY WEATHER — what it is costing to move this market. Mostly NOT a
   * price-axis reading, and `selectLiquidityWeatherGlass` says so: only the
   * stalled-segment shelves get a level. Null means the room has no reading.
   */
  liquidityWeather?: LiquidityWeatherVM | null;
  /**
   * THE EFFORT READING, PUT BACK ON THE CANDLE IT IS ABOUT.
   *
   * Child EFFORT→RESPONSE BAR MARK, family F06, plate H-701. Until this prop
   * existed the reading lived entirely inside a 236px card pinned to the top
   * left of the chart — a panel describing a candle while pointing at nothing.
   * The house is blunt about that shape: a paragraph describing absorption is
   * not absorption, and MENU BUILT + NO MARKET PAINT = OPEN.
   *
   * The room hands down a VERDICT, not a view model: `selectEffortMark` has
   * already decided whether there is a lawful price to hang this on, and this
   * file may not second-guess it. Null means the room asked nothing.
   */
  effortMark?: EffortMarkVerdict | null;
  /**
   * DELTA LEVELS ON GLASS — H-702, family Order Flow / Aggressor Delta.
   *
   * The most price-honest module in the folder, until now trapped inside
   * SmartMoneyPanel. Every rung is at a real price on the tape's own grid;
   * `selectDeltaLevelsGlass` refuses when no grid was measured.
   */
  deltaLevelsGlass?: DeltaLevelsGlass | null;
  /**
   * LIVING PROFILE NODES ON GLASS — H-703, family F04 Profiles.
   *
   * HVN and LVN marks at their real bucket prices. The compiler has already
   * refused the two ways this could lie: no measured profile → no paint;
   * an untraded bucket is counted, not drawn.
   */
  livingProfileGlass?: LivingProfileGlass | null;
  /**
   * MARKET STRUCTURE — swing highs / swing lows on the axis. H-704.
   * P-110's #2 organism. `selectMarketStructureGlass` refuses insufficient
   * windows and empty sequences; every pivot it emits is a real price.
   */
  marketStructureGlass?: MarketStructureGlass | null;
  /**
   * TPO — time at price, P-110 #10. Painted on the LEFT edge so it never
   * shares a column with the Living Profile's volume histogram on the right:
   * two distributions, two sides, and their disagreement is readable.
   */
  tpoProfile?: TpoProfileVM | null;
  /** STRUCTURE PROFILE — P-110 #2, drawn FROM the anchoring swing bar. */
  structureProfile?: StructureProfileVM | null;
  /** PROFILE DNA — P-110 #5, printed above the Living Profile it describes. */
  profileDna?: ProfileDnaVM | null;
  /** Developing POC/VAH/VAL, painted across the candles they developed with. */
  valueMigration?: ValueMigrationVM | null;
  /** PROFILE MEMORY — P-110 #4, prior sessions' value drawn forward. */
  profileMemory?: ProfileMemoryVM | null;
  /** PROFILE FUSION — P-110 #3, where switched-on profiles agree. */
  profileFusion?: ProfileFusionVM | null;
  /** COMPOSITE PROFILE — P-110 #9, completed sessions, one stack lane. */
  compositeProfile?: CompositeProfileVM | null;
  /*
    ── WHETHER THE TRADER WANTS EACH OF THE FOUR ON THE GLASS ────────────────

    A layer that paints owes the trader a way to stop it painting. These are
    the four switches, routed from the Profiles menu.

    They are deliberately SEPARATE from the four view-model props above, and
    the distinction is the honest part: passing `null` to turn a layer off
    would make "the trader closed this" indistinguishable from "the tape could
    not answer", and the canvas publishes a receipt that must tell those apart.
    A reading that exists and is not shown reports OFF, never UNMEASURED.
  */
  imbalanceStackOnChart?: boolean;
  valueCandleOnChart?: boolean;
  deltaDivergenceOnChart?: boolean;
  liquidityWeatherOnChart?: boolean;
  effortMarkOnChart?: boolean;
  deltaLevelsOnChart?: boolean;
  livingProfileOnChart?: boolean;
  marketStructureOnChart?: boolean;
  tpoProfileOnChart?: boolean;
  structureProfileOnChart?: boolean;
  profileDnaOnChart?: boolean;
  valueMigrationOnChart?: boolean;
  profileMemoryOnChart?: boolean;
  profileFusionOnChart?: boolean;
  compositeProfileOnChart?: boolean;
  /** VISIBLE RANGE — P-110 #7. Computed here: only this file knows the camera. */
  visibleRangeProfileOnChart?: boolean;
  /** QUESTION LENS — the active evidence question asked of this camera. */
  questionLensOnChart?: boolean;
  /** Absorption vs Exhaustion key-metric cards (MOCK 1). */
  anatomyCardsOnChart?: boolean;
  /** Scaffolding lens depth (Foundation → Intermediate → Pro) or OFF. */
  scaffoldingDepthOnChart?: ScaffoldingDepth | "OFF";
  /** The ONE structure owner's reading, for the scaffolding's bias + location steps. */
  scaffoldingStructure?: MarketStructureVM | null;
  /** H-901 — the regime dimmer, compiled from the one regime owner. */
  regimeLighting?: RegimeLightingVM | null;
  regimeLightingOnChart?: boolean;
  // Footprint toggle
  footprintEnabled?: boolean;
  // Big Trades Simultaneous Mode — when true, draw Big Trades bubbles ON TOP of
  // whatever order-flow tool is active instead of only in exclusive big-trades mode.
  bigTradesOverlay?: boolean;
  // Paper positions — render open paper-trade entries as horizontal lines w/ live P&L
  paperTradesVisible?: boolean;
  // Fullscreen delegation — parent provides the element to fullscreen
  onRequestFullscreen?: () => void;
  // ChartsDashboard already owns the workspace-level fidelity verdict. Hide
  // this chart-local copy when embedded there so one market state has one
  // visible writer; standalone charts keep the badge by default.
  showFidelityChrome?: boolean;
  /**
   * One canonical market-standing sentence supplied by the room. On desktop
   * it joins the existing OHLC horizon; at narrower widths CSS returns it to
   * the former chart overlay position without mounting a second reader.
   */
  marketStanding?: React.ReactNode;
  /**
   * H-101 targets are real MarketObjects whose birth bar survived the
   * canonical identity wire. `birthTime` is projection geometry only; the
   * object still points to the bar by id and never reprints its OHLC.
   */
  marketObjectTargets?: readonly {
    readonly object: MarketObject;
    readonly birthTime: number;
  }[];
  /**
   * The active DECISION_ID, when the room holds one. Printed in the chrome so
   * a trader looking at the chart always knows the identity every layer is
   * bound to. Canon: "One market. One camera. One truth. One Decision_ID."
   */
  activeDecisionId?: string | null;
  selectedMarketObjectId?: string | null;
  onSelectMarketObject?: (objectId: string) => void;
  /** Swing-origin ZONES with their lifecycle — painted on price. */
  structureZones?: readonly StructureZone[];
  selectedMarketObjectWait?: WaitStandingVM | null;
}

/* ── Heikin Ashi transform ───────────────────────────────── */
function toHeikinAshi(bars: LegacyOhlcvTuple[]): LegacyOhlcvTuple[] {
  const ha: LegacyOhlcvTuple[] = [];
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const haClose = (b.open + b.high + b.low + b.close) / 4;
    const haOpen  = i === 0
      ? (b.open + b.close) / 2
      : (ha[i - 1].open + ha[i - 1].close) / 2;
    ha.push({
      time:   b.time,
      open:   +haOpen.toFixed(b.close < 10 ? 4 : 2),
      close:  +haClose.toFixed(b.close < 10 ? 4 : 2),
      high:   +Math.max(b.high, haOpen, haClose).toFixed(b.close < 10 ? 4 : 2),
      low:    +Math.min(b.low,  haOpen, haClose).toFixed(b.close < 10 ? 4 : 2),
      volume: b.volume,
    });
  }
  return ha;
}

/* ── Indicator computations ─────────────────────────────── */
function computeSMA(closes: number[], period: number): number[] {
  return closes.map((_, i) => {
    if (i < period - 1) return closes[i];
    const slice = closes.slice(i - period + 1, i + 1);
    return +(slice.reduce((a, b) => a + b, 0) / period).toFixed(closes[0] > 100 ? 2 : 5);
  });
}

function computeEMA(closes: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let ema = closes[0];
  for (let i = 0; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    out.push(+ema.toFixed(closes[0] > 100 ? 2 : 5));
  }
  return out;
}

function computeVWAP(bars: LegacyOhlcvTuple[]): number[] {
  let cumPV = 0, cumV = 0;
  return bars.map(b => {
    const tp = (b.high + b.low + b.close) / 3;
    cumPV += tp * b.volume;
    cumV  += b.volume;
    return cumV > 0 ? +(cumPV / cumV).toFixed(b.close > 100 ? 2 : 5) : tp;
  });
}

function computeBB(bars: LegacyOhlcvTuple[], period = 20, mult = 2): { time: number; upper: number; middle: number; lower: number }[] {
  const closes = bars.map(b => b.close);
  const dp = closes[0] > 100 ? 2 : 5;
  return bars.map((b, i) => {
    if (i < period - 1) return { time: b.time, upper: b.close, middle: b.close, lower: b.close };
    const slice = closes.slice(i - period + 1, i + 1);
    const mean  = slice.reduce((s, v) => s + v, 0) / period;
    const std   = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    return { time: b.time, upper: +(mean + mult * std).toFixed(dp), middle: +mean.toFixed(dp), lower: +(mean - mult * std).toFixed(dp) };
  });
}

function computeWMA(closes: number[], period: number): number[] {
  const denom = (period * (period + 1)) / 2;
  return closes.map((_, i) => {
    if (i < period - 1) return closes[i];
    let s = 0;
    for (let j = 0; j < period; j++) s += closes[i - j] * (period - j);
    return +(s / denom).toFixed(closes[0] > 100 ? 2 : 5);
  });
}
function computeHMA(closes: number[], period: number): number[] {
  const half = Math.round(period / 2), sqrt = Math.round(Math.sqrt(period));
  return computeWMA(closes.map((_, i) => 2 * computeWMA(closes, half)[i] - computeWMA(closes, period)[i]), sqrt);
}
function computeATR(bars: LegacyOhlcvTuple[], period = 14): number[] {
  const tr = bars.map((b, i) => i === 0 ? b.high - b.low : Math.max(b.high - b.low, Math.abs(b.high - bars[i-1].close), Math.abs(b.low - bars[i-1].close)));
  const out: number[] = [];
  let atr = tr.slice(0, period).reduce((s,v) => s+v, 0) / period;
  bars.forEach((_, i) => { if (i >= period) atr = (atr*(period-1)+tr[i])/period; out.push(+atr.toFixed(2)); });
  return out;
}
function computeStoch(bars: LegacyOhlcvTuple[], kP = 14, dP = 3): { k: number[]; d: number[] } {
  const k = bars.map((_, i) => {
    const sl = bars.slice(Math.max(0,i-kP+1), i+1);
    const hi = Math.max(...sl.map(b=>b.high)), lo = Math.min(...sl.map(b=>b.low));
    return hi===lo ? 50 : +((bars[i].close-lo)/(hi-lo)*100).toFixed(2);
  });
  return { k, d: computeSMA(k, dP) };
}
function computeCCI(bars: LegacyOhlcvTuple[], period = 20): number[] {
  return bars.map((_, i) => {
    const sl = bars.slice(Math.max(0,i-period+1), i+1);
    const tps = sl.map(b=>(b.high+b.low+b.close)/3);
    const mean = tps.reduce((s,v)=>s+v,0)/tps.length;
    const mad  = tps.reduce((s,v)=>s+Math.abs(v-mean),0)/tps.length;
    return mad===0 ? 0 : +((tps[tps.length-1]-mean)/(0.015*mad)).toFixed(2);
  });
}
function computeWilliamsR(bars: LegacyOhlcvTuple[], period = 14): number[] {
  return bars.map((_, i) => {
    const sl = bars.slice(Math.max(0,i-period+1), i+1);
    const hi = Math.max(...sl.map(b=>b.high)), lo = Math.min(...sl.map(b=>b.low));
    return hi===lo ? -50 : +(((hi-bars[i].close)/(hi-lo))*-100).toFixed(2);
  });
}
function computeOBV(bars: LegacyOhlcvTuple[]): number[] {
  const out = [0];
  for (let i=1;i<bars.length;i++) {
    out.push(bars[i].close > bars[i-1].close ? out[i-1]+bars[i].volume : bars[i].close < bars[i-1].close ? out[i-1]-bars[i].volume : out[i-1]);
  }
  return out;
}
function computeMFI(bars: LegacyOhlcvTuple[], period = 14): number[] {
  const tp = bars.map(b=>(b.high+b.low+b.close)/3);
  return bars.map((_,i) => {
    if (i<period) return 50;
    let pos=0,neg=0;
    for (let j=i-period+1;j<=i;j++) { const mf=tp[j]*bars[j].volume; tp[j]>tp[j-1] ? pos+=mf : neg+=mf; }
    return neg===0 ? 100 : +(100-100/(1+pos/neg)).toFixed(2);
  });
}
function computeKeltner(bars: LegacyOhlcvTuple[], period=20, mult=2): {upper:number[];mid:number[];lower:number[]} {
  const ema=computeEMA(bars.map(b=>b.close), period), atr=computeATR(bars, period);
  return { upper:ema.map((e,i)=>+(e+mult*atr[i]).toFixed(2)), mid:ema, lower:ema.map((e,i)=>+(e-mult*atr[i]).toFixed(2)) };
}
function computeDonchian(bars: LegacyOhlcvTuple[], period=20): {upper:number[];mid:number[];lower:number[]} {
  const u=bars.map((_,i)=>Math.max(...bars.slice(Math.max(0,i-period+1),i+1).map(b=>b.high)));
  const l=bars.map((_,i)=>Math.min(...bars.slice(Math.max(0,i-period+1),i+1).map(b=>b.low)));
  return { upper:u, mid:u.map((hi,i)=>+((hi+l[i])/2).toFixed(2)), lower:l };
}
function computeSupertrend(bars: LegacyOhlcvTuple[], period=10, mult=3): {line:number[];dir:number[]} {
  const atr=computeATR(bars,period);
  const hl2=bars.map(b=>(b.high+b.low)/2);
  const ub=hl2.map((v,i)=>v+mult*atr[i]), lb=hl2.map((v,i)=>v-mult*atr[i]);
  const line=new Array(bars.length).fill(0), dir=new Array(bars.length).fill(1);
  line[0]=lb[0];
  for (let i=1;i<bars.length;i++) {
    lb[i]=lb[i]>lb[i-1]||bars[i-1].close<lb[i-1] ? lb[i] : lb[i-1];
    ub[i]=ub[i]<ub[i-1]||bars[i-1].close>ub[i-1] ? ub[i] : ub[i-1];
    dir[i]=dir[i-1]===1 ? (bars[i].close<lb[i] ? -1 : 1) : (bars[i].close>ub[i] ? 1 : -1);
    line[i]=dir[i]===1 ? lb[i] : ub[i];
  }
  return {line,dir};
}
function computeROC(closes: number[], period=12): number[] {
  return closes.map((c,i)=>i<period ? 0 : +((c-closes[i-period])/closes[i-period]*100).toFixed(2));
}
function computeMomentum(closes: number[], period=10): number[] {
  return closes.map((c,i)=>i<period ? 0 : +(c-closes[i-period]).toFixed(closes[0]>100?2:4));
}

/* ── Drawing-tool geometry specs ──────────────────────────
   DRAW_PTS[tool] = number of anchor clicks the tool needs.
   -1 = freehand drag (brush/highlighter); -2 = open polyline
   (click to add points, double-click / Escape to finish).      */
const DRAW_PTS: Record<string, number> = {
  brush: -1, highlighter: -1,
  polyline: -2, path: -2,
  // 1-click
  hline: 1, hray: 1, vline: 1, crossline: 1,
  text: 1, note: 1, "price-note": 1, pin: 1, comment: 1,
  "price-label": 1, signpost: 1, flag: 1, "arrow-up": 1, "arrow-down": 1,
  // 2-click lines
  trendline: 2, ray: 2, "info-line": 2, "extended-line": 2, "trend-angle": 2, arrow: 2, callout: 2,
  // 2/3/4-click shapes
  rect: 2, circle: 2, ellipse: 2, "rotated-rect": 3, triangle: 3, arc: 3, curve: 3, "double-curve": 4,
  // channels
  channel: 2, "parallel-channel": 3, regression: 2, "flat-channel": 3, "disjoint-channel": 4,
  // pitchforks
  pitchfork: 3, schiff: 3, "modified-schiff": 3, "inside-pitchfork": 3,
  // fibonacci
  fibonacci: 2, "fib-ext": 3, "fib-channel": 3, "fib-timezone": 2, "fib-speed-fan": 2,
  "fib-time": 3, "fib-circles": 2, "fib-spiral": 2, "fib-arcs": 2, "fib-wedge": 3, "fib-pitchfan": 3,
  // gann
  "gann-box": 2, "gann-square-fixed": 2, "gann-square": 2, "gann-fan": 2,
  // chart patterns
  xabcd: 5, cypher: 5, "head-shoulders": 7, abcd: 4, "pattern-triangle": 4, "three-drives": 7,
  // elliott waves
  "elliott-impulse": 6, "elliott-correction": 4, "elliott-triangle": 6, "elliott-double": 4, "elliott-triple": 6,
  // cycles
  "cyclic-lines": 2, "time-cycles": 2, "sine-line": 2,
  // measure / positions
  "price-range": 2, "date-range": 2, "date-price-range": 2, measure: 2,
  "long-position": 3, "short-position": 3,
  // order flow
  "delta-vp": 2,
  "anchored-vp": 2,
};
const drawPtsNeeded = (tool: string): number => (tool in DRAW_PTS ? DRAW_PTS[tool] : 2);

// Pattern / wave tools render as a labeled polyline through their anchors.
const PATTERN_LABELS: Record<string, string[]> = {
  xabcd: ["X", "A", "B", "C", "D"],
  cypher: ["X", "A", "B", "C", "D"],
  abcd: ["A", "B", "C", "D"],
  "pattern-triangle": ["1", "3", "2", "4"],
  "head-shoulders": ["", "LS", "", "H", "", "RS", ""],
  "three-drives": ["", "1", "", "2", "", "3", ""],
  "elliott-impulse": ["0", "1", "2", "3", "4", "5"],
  "elliott-correction": ["0", "A", "B", "C"],
  "elliott-triangle": ["0", "A", "B", "C", "D", "E"],
  "elliott-double": ["0", "W", "X", "Y"],
  "elliott-triple": ["0", "W", "X", "Y", "X", "Z"],
};
// Tools whose commit prompts for a text string.
const TEXT_TOOLS = new Set(["text", "note", "comment", "price-note", "callout", "signpost", "price-label"]);
// Tools that render a filled area (used for hit-testing "click inside to select").
const FILL_TOOLS = new Set([
  "rect", "circle", "ellipse", "rotated-rect", "triangle", "fibonacci", "fib-ext",
  "gann-box", "gann-square", "gann-square-fixed", "channel", "parallel-channel",
  "flat-channel", "regression", "price-range", "date-range", "date-price-range",
  "measure", "long-position", "short-position", "fib-circles", "delta-vp", "anchored-vp",
]);
const DRAW_COLORS = [
  "#00D4AA", "#4FA3E0", "#F0B429", "#FF4D6A", "#8B5CF6",
  "#FFFFFF", "#94A3B8", "#F97316", "#06B6D4", "#EC4899",
];
const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.272, 1.618, 2.618];
const FIB_COLORS = ["#8892b0", "#4FA3E0", "#00C076", "#F0B429", "#F0B429", "#00C076", "#4FA3E0", "#EC4899", "#FF4D67", "#8B5CF6"];

/* ── Component ──────────────────────────────────────────── */
export function MainChart({ symbol, timeframe, setTimeframe, footprintType, footprintEnabled = true, candleType = "candles", pineOutput, pineCode, onBarsReady,
  drawingTool = "cursor", drawingStyle = DEFAULT_DRAWING_STYLE, magnetActive = false, lockDrawings = false,
  onCreatePriceAlert,
  onDrawingComplete,
  drawingsVisible = true, clearTrigger = 0, activeInds, indSettings, extendedHours,
  alertLevels = [], chartSettings, replayActive = false, replayBars,
  compareSymbol, onPriceAtCursor, onOHLCAtCursor, onSelectBigTrade,
  onSelectProfileSlice, selectedProfileSlicePrice = null,
  fixedVPActive = false, sessionVPActive = false,
  absorptionAnatomyActive = false,
  imbalanceStack = null,
  valueCandle = null,
  deltaDivergence = null,
  liquidityWeather = null,
  effortMark = null,
  deltaLevelsGlass = null,
  livingProfileGlass = null,
  marketStructureGlass = null,
  // Default TRUE: these four shipped drawing, and silently switching one off
  // would be a second surprise dressed as a fix. The switch is the new thing.
  imbalanceStackOnChart = true,
  valueCandleOnChart = true,
  deltaDivergenceOnChart = true,
  liquidityWeatherOnChart = true,
  effortMarkOnChart = true,
  deltaLevelsOnChart = true,
  livingProfileOnChart = true,
  marketStructureOnChart = true,
  tpoProfile = null,
  tpoProfileOnChart = false,
  structureProfile = null,
  structureProfileOnChart = false,
  profileDna = null,
  profileDnaOnChart = false,
  valueMigration = null,
  valueMigrationOnChart = false,
  profileMemory = null,
  profileMemoryOnChart = false,
  profileFusion = null,
  profileFusionOnChart = false,
  compositeProfile = null,
  compositeProfileOnChart = false,
  visibleRangeProfileOnChart = false,
  questionLensOnChart = false,
  scaffoldingDepthOnChart = "OFF",
  anatomyCardsOnChart = false,
  scaffoldingStructure = null,
  regimeLighting = null,
  regimeLightingOnChart = false,
  bigTradesOverlay = false,
  paperTradesVisible = true,
  onRequestFullscreen,
  showFidelityChrome = true,
  marketStanding = null,
  marketObjectTargets = [],
  activeDecisionId = null,
  selectedMarketObjectId = null,
  onSelectMarketObject,
  structureZones = [],
  selectedMarketObjectWait = null,
}: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const wrapRef       = useRef<HTMLDivElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null); // drawing tools overlay
  /**
   * THE DECLINE THE TRADER CAN READ.
   *
   * `data-vp-*` on the canvas is a MEASUREMENT channel — it answers a probe, not
   * a person. A trader whose Session VP lane is empty does not open devtools;
   * they conclude the product is broken, or worse, that the profile is genuinely
   * flat there. §5 SYSTEM TRUTH LAW asks for the statement to be MADE, not to be
   * discoverable.
   *
   * Held as state so it renders, and mirrored in a ref so the 30fps draw loop can
   * compare without reading state it does not depend on. The loop calls the
   * setter ONLY when the sentence changes — every frame would re-render the chart
   * at 30fps to print the same words.
   */
  const vpNoteRef = useRef<string | null>(null);
  const [vpDeclineNote, setVpDeclineNote] = useState<string | null>(null);
  const chartRef      = useRef<any>(null);
  // Holds the trader's visible bars across a chart WIDTH change (the equipment
  // panel reflowing the chart into a narrower column). Created BEFORE
  // LW.createChart and attached immediately after — the order is load-bearing;
  // see chartCameraKeeper.ts. Nulled only on unmount, alongside chartRef.
  const cameraKeeperRef = useRef<ChartCameraKeeper | null>(null);
  const cameraOutcomeRef = useRef<CameraResizeOutcome | null>(null);
  const cameraNoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Shown ONLY when the chart changed width and the trader's bars could NOT be
   * carried across it. Silence means the camera held — which is the common case
   * and needs no chrome. A chart that quietly re-pointed itself and said nothing
   * is the defect this whole atom exists to remove; clamping the view into
   * "close enough" and staying silent would be the same defect wearing a fix.
   */
  const [cameraNote, setCameraNote] = useState<string | null>(null);
  // WM-CHART-P0-02: aborts the previous symbol/timeframe's in-flight candle
  // fetch the moment a new one starts, instead of only ignoring its result.
  const versionGuardRef = useRef<DataVersionGuard>(new DataVersionGuard());
  const lwRef         = useRef<any>(null); // the imported lightweight-charts v5 module (for series defs)
  const candleRef     = useRef<any>(null);
  const markersPluginRef = useRef<any>(null); // v5 createSeriesMarkers plugin (setMarkers moved off ISeriesApi)
  const pineMarkersPluginRef = useRef<any>(null); // v5 markers plugin dedicated to Pine plotshape/plotchar output
  const volRef        = useRef<any>(null);
  const pineSeriesRef = useRef<Map<string, any>>(new Map());
  const pineCodeRef   = useRef<string | undefined>(undefined);
  const indSeriesRef  = useRef<any[]>([]);
  // Open paper-trade position lines (native IPriceLine on the candle series) +
  // the position each line represents, so we can refresh the live-P&L title on tick.
  const paperLinesRef = useRef<Array<{ line: any; qty: number; avgPx: number }>>([]);
  // BROKER COST LINE (HOUSE PLAN bolt-on #6): the founder's REAL Webull
  // positions for THIS symbol, fetched from /api/broker/webull/positions and
  // painted as native price lines. Same paint rail as paper lines; different
  // truth source (broker, not blotter) and its own cleanup list.
  const brokerCostLinesRef = useRef<any[]>([]);
  const [brokerCostPositions, setBrokerCostPositions] = useState<Array<{
    symbol: string;
    instrumentType: "STOCK" | "OPTION" | "OTHER";
    quantity: number;
    paintLevel: number;
    costPrice: number;
    option?: { type: "CALL" | "PUT"; strike: number; expireDate: string; multiplier: number };
  }>>([]);
  // Live-updating oscillators: each entry recomputes its series values from the
  // CURRENT bars (barsRef) and pushes only the last point on every live tick, so
  // Tape Speed / Exhaustion / flow histograms visibly move with real-time data
  // without tearing down & rebuilding the whole pane on each tick.
  const oscLiveRef    = useRef<Array<{ series: any; recompute: (bs: LegacyOhlcvTuple[]) => { value: number; color?: string } | null }>>([]);
  const barsRef       = useRef<LegacyOhlcvTuple[]>([]);
  // Canonical lineage is a sidecar, not extra fields smuggled into the renderer
  // tuple. Live bars without admitted identity are intentionally absent here.
  const barIdentitiesRef = useRef<readonly CanonicalBarIdentity[]>([]);
  /*
    THE STACK READING LIVES IN A REF, NOT IN THE OVERLAY'S DEPENDENCY ARRAY.

    `imbalanceStack` is recompiled by the room on every batch of ticks — many
    times a second on a liquid instrument. Naming it as a dependency of the
    overlay effect would tear down and rebuild the whole `requestAnimationFrame`
    loop at tape rate, which is the exact mistake the `candles` note further
    down records: the VP and footprint flashed off four times a second on
    crypto. The loop reads this ref each frame instead, so a fresh reading
    appears on the very next paint without the effect ever re-running.
  */
  const imbalanceStackRef = useRef<StackedImbalanceVM | null>(null);
  useEffect(() => { imbalanceStackRef.current = imbalanceStack; }, [imbalanceStack]);
  /** Same reasoning as the stack above: a tape-rate value must not be a
   *  dependency of the overlay effect. */
  const valueCandleRef = useRef<ValueCandleVM | null>(null);
  useEffect(() => { valueCandleRef.current = valueCandle; }, [valueCandle]);

  /** Same reasoning again. Three tape-rate readings now reach the overlay, and
   *  every one of them arrives through a ref for the same documented cause. */
  const deltaDivergenceRef = useRef<DeltaDivergenceVM | null>(null);
  useEffect(() => { deltaDivergenceRef.current = deltaDivergence; }, [deltaDivergence]);

  /** And the fourth. Four tape-rate readings, one rule. */
  const liquidityWeatherRef = useRef<LiquidityWeatherVM | null>(null);
  useEffect(() => { liquidityWeatherRef.current = liquidityWeather; }, [liquidityWeather]);

  /**
   * The effort mark rides the same rail, for a different reason.
   *
   * It does not change at tape rate — it changes at CURSOR rate, which is
   * worse. Naming it in the overlay's dependency array would tear the rAF loop
   * down on every mouse move across the pane, which is the documented cause of
   * layers flashing off.
   */
  const effortMarkRef = useRef<EffortMarkVerdict | null>(null);
  useEffect(() => { effortMarkRef.current = effortMark ?? null; }, [effortMark]);

  /**
   * Delta levels ride the tape rate — a new print at any price rewrites the
   * VM. Same rail rule as the four before them.
   */
  const deltaLevelsRef = useRef<DeltaLevelsGlass | null>(null);
  useEffect(() => { deltaLevelsRef.current = deltaLevelsGlass ?? null; }, [deltaLevelsGlass]);

  /** Living profile changes at BAR rate, but still through a ref for the same
   *  reason as the six above it: this file's rule is where a value is read,
   *  not how often it changes. */
  const livingProfileRef = useRef<LivingProfileGlass | null>(null);
  useEffect(() => { livingProfileRef.current = livingProfileGlass ?? null; }, [livingProfileGlass]);

  const marketStructureRef = useRef<MarketStructureGlass | null>(null);
  const scaffoldingDepthRef = useRef<ScaffoldingDepth | "OFF">("OFF");
  /** Offscreen layer the P-601 heat cells composite into before meeting the glass once. */
  const heatLayerRef = useRef<HTMLCanvasElement | null>(null);
  const scaffoldingStructureRef = useRef<MarketStructureVM | null>(null);
  useEffect(() => {
    scaffoldingDepthRef.current = scaffoldingDepthOnChart;
    scaffoldingStructureRef.current = scaffoldingStructure;
  }, [scaffoldingDepthOnChart, scaffoldingStructure]);
  useEffect(() => { marketStructureRef.current = marketStructureGlass ?? null; }, [marketStructureGlass]);

  const tpoProfileRef = useRef<TpoProfileVM | null>(null);
  useEffect(() => { tpoProfileRef.current = tpoProfile ?? null; }, [tpoProfile]);

  const structureProfileRef = useRef<StructureProfileVM | null>(null);
  useEffect(() => { structureProfileRef.current = structureProfile ?? null; }, [structureProfile]);

  const profileDnaRef = useRef<ProfileDnaVM | null>(null);
  useEffect(() => { profileDnaRef.current = profileDna ?? null; }, [profileDna]);

  const valueMigrationRef = useRef<ValueMigrationVM | null>(null);
  useEffect(() => { valueMigrationRef.current = valueMigration ?? null; }, [valueMigration]);

  const profileMemoryRef = useRef<ProfileMemoryVM | null>(null);
  useEffect(() => { profileMemoryRef.current = profileMemory ?? null; }, [profileMemory]);

  const profileFusionRef = useRef<ProfileFusionVM | null>(null);
  useEffect(() => { profileFusionRef.current = profileFusion ?? null; }, [profileFusion]);

  const compositeProfileRef = useRef<CompositeProfileVM | null>(null);
  useEffect(() => { compositeProfileRef.current = compositeProfile ?? null; }, [compositeProfile]);

  const vrpCacheRef = useRef<{ key: string; vm: VisibleRangeProfileVM } | null>(null);
  const regimeLightingRef = useRef<RegimeLightingVM | null>(null);
  useEffect(() => { regimeLightingRef.current = regimeLighting ?? null; }, [regimeLighting]);

  /** Last crosshair reading published — see the crosshair subscription. */
  const lastCursorKeyRef = useRef<string | null>(null);

  const structureZonesRef = useRef<readonly StructureZone[]>([]);
  useEffect(() => { structureZonesRef.current = structureZones; }, [structureZones]);
  const selectedObjectIdRef = useRef<string | null>(null);
  useEffect(() => { selectedObjectIdRef.current = selectedMarketObjectId ?? null; }, [selectedMarketObjectId]);

  const selectedSliceRef = useRef<number | null>(null);
  useEffect(() => { selectedSliceRef.current = selectedProfileSlicePrice ?? null; }, [selectedProfileSlicePrice]);

  /**
   * DECISION_ID — one truth per camera. Read through a ref so the chrome
   * word can be painted inside the rAF without tearing the loop down every
   * time the identity string changes.
   */
  const activeDecisionIdRef = useRef<string | null>(null);
  useEffect(() => { activeDecisionIdRef.current = activeDecisionId ?? null; }, [activeDecisionId]);

  /*
    The four switches, read the same way as the readings they gate. They change
    far more slowly than the tape does, but they are read INSIDE the rAF loop,
    and the rule in this file is about where a value is read, not how often it
    changes: anything the overlay reads comes through a ref, so the loop is
    never torn down and rebuilt underneath a frame.
  */
  const layerOnRef = useRef({ stack: true, valueCandle: true, divergence: true, weather: true, effort: true, deltaLevels: true, livingProfile: true, marketStructure: true, tpo: false, structureProfile: false, profileDna: false, valueMigration: false, profileMemory: false, profileFusion: false, compositeProfile: false, visibleRangeProfile: false, regimeLighting: false, questionLens: false, anatomyCards: false });
  useEffect(() => {
    layerOnRef.current = {
      stack: imbalanceStackOnChart,
      valueCandle: valueCandleOnChart,
      divergence: deltaDivergenceOnChart,
      weather: liquidityWeatherOnChart,
      effort: effortMarkOnChart,
      deltaLevels: deltaLevelsOnChart,
      livingProfile: livingProfileOnChart,
      marketStructure: marketStructureOnChart,
      tpo: tpoProfileOnChart,
      structureProfile: structureProfileOnChart,
      profileDna: profileDnaOnChart,
      valueMigration: valueMigrationOnChart,
      profileMemory: profileMemoryOnChart,
      profileFusion: profileFusionOnChart,
      compositeProfile: compositeProfileOnChart,
      visibleRangeProfile: visibleRangeProfileOnChart,
      regimeLighting: regimeLightingOnChart,
      questionLens: questionLensOnChart,
      anatomyCards: anatomyCardsOnChart,
    };
  }, [imbalanceStackOnChart, valueCandleOnChart, deltaDivergenceOnChart, liquidityWeatherOnChart, effortMarkOnChart, deltaLevelsOnChart, livingProfileOnChart, marketStructureOnChart, tpoProfileOnChart, structureProfileOnChart, profileDnaOnChart, valueMigrationOnChart, profileMemoryOnChart, profileFusionOnChart, compositeProfileOnChart, visibleRangeProfileOnChart, regimeLightingOnChart, questionLensOnChart, anatomyCardsOnChart]);
  // ── Vertical price-drag (true body drag) ──────────────────────
  // LWC v4/v5 do NOT support vertical body panning natively — only axis
  // drag. We implement it via a manual price range fed through the candle
  // series' autoscaleInfoProvider, shifted on vertical mouse drag.
  const manualPriceRangeRef = useRef<{ min: number; max: number } | null>(null);
  // Eased vertical-range state: the raw robust range recomputes discretely as
  // bars enter/leave the visible window during a wheel zoom, snapping the price
  // scale in steps ("candles squash and stick"). We lerp the previous range
  // toward the freshly computed target so the vertical rescale glides instead.
  const smoothedRangeRef = useRef<{ min: number; max: number } | null>(null);
  // Single shared autoscale provider with a GUARDRAIL: if the manual (dragged)
  // range is absurdly larger than the data's natural range (>4×) it would crush
  // the candles into a sliver (e.g. TSLA at 377 shown on a 300–1100 scale). In
  // that case we ignore the manual range and auto-fit so candles stay readable.
  // ── ROBUST visible-range computer ────────────────────────────
  // Computes the price range from the VISIBLE bars but trims true outliers,
  // so no single corrupt high/low (from a bad live tick, a provider glitch,
  // or anything else) can ever stretch the scale and crush real candles into
  // a sliver — the "candles break after a few minutes" failure. It clips only
  // values that sit MORE than 1.5 robust-bands beyond the 2nd/98th percentile,
  // which never happens to a legitimate candle but always catches a bad spike.
  const robustVisibleRange = useRef((fallback: any) => {
    try {
      const bars = barsRef.current;
      if (!bars || bars.length < 8) return fallback;
      let from = 0, to = bars.length;
      const vr = chartRef.current?.timeScale().getVisibleLogicalRange();
      if (vr) {
        from = Math.max(0, Math.floor(vr.from));
        to   = Math.min(bars.length, Math.ceil(vr.to) + 1);
      }
      const slice = bars.slice(from, to);
      if (slice.length < 8) return fallback;
      const his = slice.map(b => b.high).filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
      const los = slice.map(b => b.low ).filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
      if (his.length < 8 || los.length < 8) return fallback;
      const q = (arr: number[], p: number) =>
        arr[Math.min(arr.length - 1, Math.max(0, Math.round(p * (arr.length - 1))))];
      const p98Hi = q(his, 0.98), p02Lo = q(los, 0.02);
      const band  = Math.max(p98Hi - p02Lo, q(his, 0.5) - q(los, 0.5), p98Hi * 0.002);
      if (!(band > 0)) return fallback;
      // Allow real wicks up to 1.5 bands beyond the robust band; clip only beyond.
      const hi = Math.min(his[his.length - 1], p98Hi + band * 1.5);
      const lo = Math.max(los[0],              p02Lo - band * 1.5);
      if (!(hi > lo)) return fallback;
      const margin = (hi - lo) * 0.06;
      return { priceRange: { minValue: lo - margin, maxValue: hi + margin } };
    } catch { return fallback; }
  });

  const autoscaleProviderRef = useRef((orig: () => any) => {
    const base = orig();
    const robust = robustVisibleRange.current(base);
    const r = manualPriceRangeRef.current;
    if (r && r.max > r.min) {
      // Anchor the drag guardrails to the ROBUST range (outlier-immune), not the
      // raw base — otherwise a single bad bar inflates dataRange and defeats them.
      const br = robust?.priceRange ?? base?.priceRange;
      if (br) {
        const dataRange = br.maxValue - br.minValue;
        const dataMid = (br.minValue + br.maxValue) / 2;
        if (dataRange > 0) {
          // Guardrail 1: allow deep zoom-out (up to 20× the data range, like
          // TradingView) but instead of SNAPPING back to auto — which felt like
          // hitting a wall — CLAMP the range to the max around its own center so
          // the scale stays exactly where the user left it, smoothly.
          const maxRange = dataRange * 20;
          if ((r.max - r.min) > maxRange) {
            const mid = (r.min + r.max) / 2;
            r.min = mid - maxRange / 2;
            r.max = mid + maxRange / 2;
            manualPriceRangeRef.current = { min: r.min, max: r.max };
          }
          // Guardrail 2: never let the user pan the candles off-screen. Pin the
          // range so the data CENTER always stays inside it (candles stay ≥half
          // visible). Smoothly clamps instead of snapping back.
          if (dataMid < r.min) { const d = r.min - dataMid; r.min -= d; r.max -= d; }
          else if (dataMid > r.max) { const d = dataMid - r.max; r.min += d; r.max += d; }
        }
      }
      return { priceRange: { minValue: r.min, maxValue: r.max } };
    }
    // Normal auto mode → outlier-immune robust range, EASED for smooth zoom.
    const tp = robust?.priceRange;
    if (!tp || !(tp.maxValue > tp.minValue)) { smoothedRangeRef.current = null; return robust; }
    const target = { min: tp.minValue, max: tp.maxValue };
    const prev = smoothedRangeRef.current;
    if (!prev) { smoothedRangeRef.current = target; return robust; }
    const span = target.max - target.min;
    // Snap (don't ease) on big discontinuities — symbol switch, timeframe change,
    // or first fit — so we never lag behind a wholly different price scale.
    const jump = Math.abs(target.min - prev.min) + Math.abs(target.max - prev.max);
    if (span <= 0 || jump > span * 0.75) { smoothedRangeRef.current = target; return robust; }
    // Ease ~50% per frame → converges in a few frames, smooth yet never lags.
    const k = 0.5;
    const eased = {
      min: prev.min + (target.min - prev.min) * k,
      max: prev.max + (target.max - prev.max) * k,
    };
    smoothedRangeRef.current = eased;
    return { priceRange: { minValue: eased.min, maxValue: eased.max } };
  });
  const drawingToolRef      = useRef<string>(drawingTool);
  drawingToolRef.current = drawingTool;
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── Big-Trade Bubble engine state (🫧 floating bubbles) ───────
  // One bubble = one real big trade. Radius is fixed at spawn and encodes the
  // TRUE trade size (bigger order → bigger bubble). Bubbles NEVER merge, never
  // fade, and never pop — they persist at their level until the bar scrolls off
  // screen or the user's max-visible cap drops the oldest.
  type Bubble = {
    id:      number;
    x:       number;   // current canvas px
    y:       number;   // current canvas px
    vx:      number;   // velocity px/frame
    vy:      number;   // velocity px/frame
    // Target radius. NOT fixed at spawn: it encodes this bubble's share of the
    // peak ON SCREEN, and the screen changes. Re-derived every frame from
    // `value` by the one rescale pass per kind. See bubbleFramePeak's header
    // for why a per-BAR peak made every bar volunteer a maximum-size disc.
    baseR:   number;
    r:       number;   // current radius (eases up to baseR on spawn only)
    phase:   number;   // wobble / bob phase
    big:     boolean;  // kept for compat; every bubble is now a real trade
    side:    "buy" | "sell";
    value:   number;   // notional (signed by side for display)
    // Both aggressor sides, carried so the tooltip can say what the bubble's
    // number actually IS. `value` means a different quantity per kind — a
    // two-sided total for big trades, a net for delta zones — and one sentence
    // used to describe both with the same one-sided words. See bubbleClaim.ts.
    bid:     number;   // seller-initiated volume in this level / zone
    ask:     number;   // buyer-initiated volume in this level / zone
    born:    number;   // performance.now() at spawn (newest-N cap ordering)
    anchorTime: number; // bar time (unix s) → home X re-anchor on scroll
    anchorBarTime: number; // containing bar start; exact-time x is placed inside it
    anchorPrice: number; // price → home Y re-anchor on scroll/zoom
    levelIdx:  number;   // rank within the candle (for horizontal stagger)
    siblingN:  number;   // how many bubbles share this candle
    kind:      "big-trade" | "delta";
    spawnKey:  string;   // dedupe + cull key (bt: / dt: prefixes)
    aggressorMethod?: AggressorMethod;
  };
  const bubblesRef    = useRef<Bubble[]>([]);           // Big Trades — individual large prints
  const bubbleSpawnRef = useRef<Set<string>>(new Set());
  const deltaBubblesRef = useRef<Bubble[]>([]);       // Delta mode — net delta per zone
  const deltaBubbleSpawnRef = useRef<Set<string>>(new Set());
  const bubbleIdRef    = useRef(0);
  const bubbleHoverRef = useRef<number | null>(null);     // hovered bubble id
  // Big-Trades Pause / Refresh + max-visible controls (toolbar gear dropdown).
  const bubblePausedRef  = useRef<boolean>(
    typeof window !== "undefined" && localStorage.getItem("wm_bubble_paused") === "1"
  );
  // Max bubbles to keep on screen. "All" (default) = effectively uncapped so the
  // user sees every big trade; a numeric choice keeps only the newest N.
  const bubbleMaxRef = useRef<number>(
    typeof window !== "undefined"
      ? (parseInt(localStorage.getItem("wm_bubble_max") || "", 10) || 9999)
      : 9999
  );
  const bubbleRefreshRef = useRef(0); // bumped → engine clears + respawns next frame
  const bubbleRefreshSeenRef = useRef(0);
  useEffect(() => {
    const onCtl = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const action = detail.action;
      if (action === "pause")   bubblePausedRef.current = true;
      if (action === "resume")  bubblePausedRef.current = false;
      if (action === "toggle")  bubblePausedRef.current = !bubblePausedRef.current;
      if (action === "refresh") bubbleRefreshRef.current++;
      if (action === "setMax") {
        const v = Number(detail.value);
        bubbleMaxRef.current = Number.isFinite(v) && v > 0 ? v : 9999;
      }
    };
    window.addEventListener("wm-bigtrades-control", onCtl as any);
    return () => window.removeEventListener("wm-bigtrades-control", onCtl as any);
  }, []);
  // Lazy Web-Audio context for the water-bubble "absorb" sound
  const audioCtxRef    = useRef<AudioContext | null>(null);
  const lastBloopRef   = useRef(0);
  const playBloop = useCallback((big: boolean) => {
    try {
      // User toggle — Big Trades / bubble sounds (default ON)
      if (typeof window !== "undefined" && localStorage.getItem("wm_bubble_sound") === "off") return;
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ac = audioCtxRef.current;
      if (ac.state === "suspended") ac.resume();
      const now = ac.currentTime;
      // throttle so a burst of absorbs doesn't machine-gun
      if (performance.now() - lastBloopRef.current < 45) return;
      lastBloopRef.current = performance.now();
      // "bloop": quick downward pitch sweep through a lowpass = watery bubble pop
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 1100;
      osc.type = "sine";
      const f0 = big ? 320 : 520 + Math.random() * 180;
      osc.frequency.setValueAtTime(f0, now);
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.45, now + 0.12);
      const peak = big ? 0.12 : 0.06;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(peak, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      osc.connect(lp); lp.connect(gain); gain.connect(ac.destination);
      osc.start(now); osc.stop(now + 0.18);
    } catch { /* audio not available */ }
  }, []);
  // `heading` and `headline` are carried as STRINGS from bubbleClaim.ts rather
  // than re-derived here from a raw `value`. The renderer used to format the
  // number itself and pair it with a hard-coded AGGRESSIVE BUY / SELL chip,
  // which is how a big trade's two-sided total and a delta zone's net came to
  // wear the same one-sided label. One owner writes both, so they cannot drift.
  const [bubbleTip, setBubbleTip] = useState<
    { x: number; y: number; side: "buy" | "sell"; heading: string; headline: string; text: string } | null
  >(null);

  // ── Drawing state ─────────────────────────────────────────────
  // Unified multi-point model. Every drawing is a list of logical anchor
  // points (price/time) + a style. The `tool` id drives which geometry the
  // renderer/hit-tester produce, so ALL toolbar tools share one engine and
  // one editing path (color / width / line-style / text / delete).
  type Drawing = ChartDrawing;

  const drawingsRef     = useRef<Drawing[]>([]);
  const inProgressRef   = useRef<Drawing | null>(null);   // committed anchor points so far
  const previewPtRef    = useRef<LogicalPt | null>(null); // live cursor point while placing
  const mouseMovedRef   = useRef(false);                  // drag-vs-click discriminator
  const drawIdRef       = useRef(0);
  const drawingStartRef = useRef<{ x: number; y: number; lp: LogicalPt | null } | null>(null);
  // Drag an already-placed drawing (whole shape when ptIdx===null, else one handle).
  const dragRef = useRef<{ idx: number; last: LogicalPt; ptIdx: number | null } | null>(null);
  // Currently-selected drawing (shows handles + floating edit toolbar).
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const selectedIdxRef = useRef<number | null>(null);
  useEffect(() => { selectedIdxRef.current = selectedIdx; }, [selectedIdx]);
  // Cursor-mode drawing drag: when the cursor is over a drawing/handle we flip the
  // draw-canvas to capture pointer events so a drag MOVES the drawing instead of
  // panning the chart (the "drag shakes the chart" bug). Over empty chart the
  // canvas stays pass-through so pan/zoom work normally.
  const [overDrawing, setOverDrawing] = useState(false);
  const overDrawingRef = useRef(false);
  const setOver = useCallback((v: boolean) => {
    if (overDrawingRef.current !== v) { overDrawingRef.current = v; setOverDrawing(v); }
  }, []);
  // Filled after hitTestDrawing/hitHandle exist; lets the native vertical-pan
  // handler (defined earlier) test "is this point on a drawing?" without a dep cycle.
  const drawHitTestRef = useRef<(x: number, y: number) => boolean>(() => false);
  const [editBump, setEditBump] = useState(0); // re-render edit toolbar after a style change
  // Which of the drawing edit-toolbar dropdowns (color / width / dash) is open.
  // Cleaner TradingView-style: one compact button per property that opens a popover
  // instead of a wall of inline swatches/buttons.
  const [drawPopover, setDrawPopover] = useState<"color" | "width" | "dash" | null>(null);
  // Inline text editor: when set, an <input> is shown over the drawing's anchor
  // so text/note tools get a clean editing box instead of a native window.prompt.
  const [textEdit, setTextEdit] = useState<{ idx: number } | null>(null);

  // Build a new drawing with the current global color + sensible per-tool style.
  const makeDrawing = useCallback((tool: string, pts: LogicalPt[], text?: string): Drawing => ({
    id: ++drawIdRef.current,
    tool,
    pts,
    style: {
      color: drawingStyle.color,
      width: tool === "highlighter" ? 12 : drawingStyle.width,
      dash: drawingStyle.dash,
      opacity: drawingStyle.opacity / 100,
      fill: FILL_TOOLS.has(tool),
    },
    text,
  }), [drawingStyle]);

  // ── Drawing persistence (Tier-2 #6) ──────────────────────────
  // Drawings are stored as absolute {price, time} anchors, so they survive a
  // refresh and re-anchor on any timeframe. Scope the key to the signed-in user
  // (from the AuthContext session cache) + symbol so each symbol keeps its own
  // drawings and they don't leak between accounts sharing a browser.
  const lastSavedDrawRef = useRef<string>("");
  const drawStorageKey = useCallback(() => {
    let uid = "anon";
    try { uid = JSON.parse(localStorage.getItem("wm_session_v1") || "{}")?.id || "anon"; } catch {}
    return `wm_draw:v1:${uid}:${symbol}`;
  }, [symbol]);

  // ── Drawing coordinate helpers ───────────────────────────────
  // Convert canvas CSS pixel (x,y) → logical {price, time}
  // Bar interval (seconds) from the most recent two bars — used to extrapolate
  // time into the empty whitespace to the right of the last bar.
  const barInterval = (): number => {
    const b = barsRef.current || [];
    if (b.length < 2) return 60;
    const d = (b[b.length - 1].time as number) - (b[b.length - 2].time as number);
    return d > 0 ? d : 60;
  };

  const snapLogical = useCallback((price: number, time: number): { price: number; time: number } => {
    if (!magnetActive) return { price, time };
    const symBase = getBase(symbol);
    const dp = symBase > 100 ? 2 : 4;
    const minTick = symBase > 10_000 ? 0.25 : symBase > 1_000 ? 0.25 : symBase > 100 ? 0.01 : 0.0001;
    const bars = barsRef.current || [];
    const iv = barInterval();
    const candidates: number[] = [+(Math.round(price / minTick) * minTick).toFixed(dp)];

    let bar: LegacyOhlcvTuple | undefined;
    for (const b of bars) {
      if (Math.abs((b.time as number) - time) <= iv * 0.55) { bar = b; break; }
    }
    if (!bar && bars.length) {
      bar = bars.reduce((best, b) =>
        Math.abs((b.time as number) - time) < Math.abs((best.time as number) - time) ? b : best,
      );
    }
    if (bar) {
      candidates.push(bar.open, bar.high, bar.low, bar.close);
      const realData = tickAccRef.current.get(bar.time);
      if (realData) {
        let sum = 0, n = 0;
        for (const rt of realData.values()) { sum += rt.bid + rt.ask; n++; }
        const mean = sum / Math.max(1, n);
        for (const [px, rt] of realData) {
          if (rt.bid + rt.ask >= mean * 0.85) candidates.push(px);
        }
      } else {
        const levels = footprintSnapRef.current(bar, 12);
        const mean = levels.reduce((s, l) => s + l.total, 0) / Math.max(1, levels.length);
        for (const lv of levels) {
          if (lv.total >= mean * 0.85) candidates.push(lv.priceLevel);
        }
      }
    }

    const priceTol = Math.max(minTick * 6, Math.abs(price) * 0.0025);
    let bestP = price, bestD = Infinity;
    for (const c of candidates) {
      const d = Math.abs(c - price);
      if (d < bestD && d <= priceTol) { bestD = d; bestP = c; }
    }

    let bestT = time, bestTd = Infinity;
    for (const b of bars) {
      const d = Math.abs((b.time as number) - time);
      if (d < bestTd && d <= iv * 0.45) { bestTd = d; bestT = b.time as number; }
    }

    return { price: +bestP.toFixed(dp), time: +bestT };
  }, [magnetActive, symbol]);

  const pixelToLogical = useCallback((px: number, py: number): LogicalPt | null => {
    const price = candleRef.current?.coordinateToPrice(py);
    if (price == null) return null;
    const ts = chartRef.current?.timeScale();
    if (!ts) return null;
    let time = ts.coordinateToTime(px) as number | null;
    // In the future/whitespace beyond the last bar coordinateToTime returns null.
    // Extrapolate via the continuous logical index so drawings can anchor there.
    if (time == null) {
      const logical = ts.coordinateToLogical(px);
      const b = barsRef.current || [];
      if (logical != null && b.length >= 1) {
        const lastIdx = b.length - 1;
        time = (b[lastIdx].time as number) + (Number(logical) - lastIdx) * barInterval();
      }
    }
    if (time == null) return null;
    const snapped = snapLogical(+price, +time);
    return { price: snapped.price, time: snapped.time };
  }, [snapLogical]);

  // Convert logical {price, time} → canvas CSS pixel (x,y)
  const logicalToPixel = useCallback((pt: LogicalPt): { x: number; y: number } | null => {
    const y = candleRef.current?.priceToCoordinate(pt.price);
    if (y == null) return null;
    const ts = chartRef.current?.timeScale();
    if (!ts) return null;
    let x = ts.timeToCoordinate(pt.time as any) as number | null;
    // timeToCoordinate returns null for times in the future whitespace — map the
    // time back to a logical index and use logicalToCoordinate (valid in whitespace).
    if (x == null) {
      const b = barsRef.current || [];
      if (b.length >= 1) {
        const lastIdx = b.length - 1;
        const logical = lastIdx + ((pt.time as number) - (b[lastIdx].time as number)) / barInterval();
        x = ts.logicalToCoordinate(logical as any) as number | null;
      }
    }
    if (x == null) return null;
    // Guard: never return a non-finite pixel. A NaN/Infinity coordinate (out-of-range
    // price, stale transform, or whitespace-index overflow) is exactly what lets a
    // drawing render as a full-pane band and corrupt auto-scale — the P0 "orange
    // overlay" defect. Non-finite → treat the point as unprojectable so the render's
    // `if (A && B)` guards skip the whole drawing instead of drawing garbage.
    const px = +x, py = +y;
    if (!Number.isFinite(px) || !Number.isFinite(py)) return null;
    return { x: px, y: py };
  }, []);

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; price: number; nearDrawingIdx: number | null } | null>(null);

  // Data window state
  const [dataWindowOpen, setDataWindowOpen] = useState(true);
  const [dataWindow, setDataWindow] = useState<{ o: number; h: number; l: number; c: number; v: number; time: number } | null>(null);

  // Scale mode buttons
  const [logScale, setLogScale] = useState(false);
  const [pctMode, setPctMode] = useState(false);
  // Order-flow overlay opacity ("declutter"). Footprint numbers, Big-Trade
  // bubbles and Volume Profile all draw on the single overlay canvas (canvasRef,
  // zIndex 5). Candles/volume are native LWC series and drawings live on a
  // separate canvas above (zIndex 10), so scaling ONLY this canvas's opacity
  // lets the trader fade the busy order-flow back while price + drawings stay
  // crisp — the TradingView-clean workflow when annotating a dense chart.
  // Persisted so the preference survives refresh. Cycles 1 → 0.4 → 0.15 → 1.
  const [flowOpacity, setFlowOpacity] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    const v = parseFloat(localStorage.getItem("wm_flow_opacity") || "1");
    return Number.isFinite(v) && v > 0 && v <= 1 ? v : 1;
  });
  // Auto-scale: when OFF the user can freely drag the price axis up/down to see
  // higher/lower price levels (TradingView-style). When ON the chart auto-fits.
  const [autoScale, setAutoScale] = useState(true);
  const autoScaleRef = useRef(autoScale);
  // True while the user has manually stretched the price axis → shows a small
  // "reset scale" button (replaces the double-click-to-reset gesture).
  const [scaleLocked, setScaleLocked] = useState(false);
  // When AUTO is (re)enabled, release any manual vertical-drag range so the
  // chart snaps back to auto-fitting the data.
  useEffect(() => {
    autoScaleRef.current = autoScale;
    if (autoScale) {
      manualPriceRangeRef.current = null;
      setScaleLocked(false);
      try {
        candleRef.current?.applyOptions({
          autoscaleInfoProvider: autoscaleProviderRef.current,
        });
      } catch {}
    }
  }, [autoScale]);

  // CRITICAL: a vertical-drag manual range must NOT survive a symbol/timeframe
  // change — otherwise the price scale stays stuck on the old ticker's range
  // (e.g. NQ ~29000) and the new ticker's candles (e.g. AMZN ~227) render far
  // off-screen, making the chart look empty. Clear it + force auto-fit on switch.
  useEffect(() => {
    manualPriceRangeRef.current = null;
    setScaleLocked(false);
    setAutoScale(true);
    try {
      candleRef.current?.applyOptions({
        autoscaleInfoProvider: autoscaleProviderRef.current,
      });
      chartRef.current?.priceScale("right").applyOptions({ autoScale: true });
      chartRef.current?.timeScale().fitContent();
    } catch {}
  }, [symbol, timeframe]);

  const base = getBase(symbol);

  const [candles,   setCandles]   = useState<LegacyOhlcvTuple[]>([]);
  const [lastPrice, setLastPrice] = useState(base);
  const [openPrice, setOpenPrice] = useState(base);
  const [ready,     setReady]     = useState(false);
  // ── Data provenance (market-truth strip) ─────────────────────────
  // Which provider actually supplied the candles, and when the last live tick
  // arrived. The LIVE badge must reflect REAL feed activity — never a
  // hardcoded label (audit: "never label Live based only on an open socket").
  const [candleSource, setCandleSource] = useState<string>("");
  /**
   * WHY THE CANVAS IS EMPTY. Null until the first cascade settles — which is
   * itself the honest state, because a room that has not finished asking must
   * not render a list of refusals it has not received yet.
   */
  const [barRefusal, setBarRefusal] = useState<BarHistoryRefusalVM | null>(null);
  const lastTickAtRef = useRef<number>(0);
  const [freshVer, setFreshVer] = useState(0); // periodic freshness recheck when ticks stop
  useEffect(() => { const t = setInterval(() => setFreshVer(v => v + 1), 10000); return () => clearInterval(t); }, []);
  // Delta Bubble level cap. The legal values, the key, the event name and the
  // fallback are NOT spelled here — they are read from `deltaLevelCap`, the one
  // owner. They used to be written out in full both here and twice more in the
  // Smart Money panel: four copies that agreed until one was edited, after which
  // a cap the panel accepted was one this chart silently rewrote to the default
  // with nothing on screen saying so.
  const deltaLevelsPrefRef = useRef<number>(DELTA_LEVEL_CAP_DEFAULT);
  useEffect(() => {
    const read = () => {
      deltaLevelsPrefRef.current = normalizeDeltaLevelCap(
        localStorage.getItem(DELTA_LEVEL_CAP_STORAGE_KEY),
      );
    };
    read();
    const onEvt = () => { read(); setRangeVer(x => x + 1); }; // redraw bubbles with new cap
    window.addEventListener(DELTA_LEVEL_CAP_EVENT, onEvt);
    return () => window.removeEventListener(DELTA_LEVEL_CAP_EVENT, onEvt);
  }, []);
  // Bumped whenever paper state may have changed (another tab writes wm_paper_state,
  // or the window regains focus after the user placed a trade on /paper) → re-read.
  const [paperNonce, setPaperNonce] = useState(0);

  // Countdown state. The RAW REMAINDER, not a formatted string: the wording
  // and the feed claim are compiled at the render, where `candleDataStatus`
  // is in scope. A string here is a second, unconsultable opinion.
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const [intervalSec,  setIntervalSec]  = useState<number | null>(null);
  // The header's OHLC strip needs a clock to tell a CLOSED bar from a FORMING
  // one. It starts at 0 — "no clock yet" — so the first render on both server
  // and client is identical (a Date.now() read during render is what caused the
  // #418 hydration class) and the selector degrades to its honest NOW label
  // until the countdown's own tick supplies a real reading a second later.
  const [nowMs,       setNowMs]       = useState(0);
  // Refs so the RAF canvas loop can read the live countdown each frame without
  // being re-created every second (which would tear down the VP/footprint draw).
  // Both are now written from the owner's verdict, so the on-canvas pill and
  // the header strip cannot say different things about the same bar.
  const countdownRef  = useRef("—");
  const closeFlashRef  = useRef(false);
  const progressRef    = useRef(0); // 0→1 fraction of current candle elapsed
  const candleTimerRef = useRef(true); // live-readable copy of chartSettings.candleTimer
  // Live-readable timezone + clock format for the time axis / crosshair labels.
  const tzRef          = useRef<string>(chartSettings?.displayTimeZone || (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "America/New_York"));
  const clock24hRef    = useRef<boolean>(chartSettings?.clock24h ?? false);

  // Crosshair / price-axis time label → honours the user's timezone + 12/24h choice.
  const fmtAxisTime = useCallback((t: any): string => {
    const sec = typeof t === "number" ? t : (t?.timestamp ?? Math.floor(Date.now() / 1000));
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: tzRef.current, hour12: !clock24hRef.current,
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      }).format(new Date(sec * 1000));
    } catch { return new Date(sec * 1000).toLocaleString(); }
  }, []);

  // Time-axis tick label → date for day/month/year ticks, tz-aware clock for intraday.
  const fmtTickMark = useCallback((t: any, tickType: number): string => {
    const sec = typeof t === "number" ? t : (t?.timestamp ?? 0);
    const d = new Date(sec * 1000);
    const tz = tzRef.current;
    try {
      // tickType: 0=Year 1=Month 2=DayOfMonth 3=Time 4=TimeWithSeconds
      if (tickType <= 1) return new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "short" }).format(d);
      if (tickType === 2) return new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric" }).format(d);
      return new Intl.DateTimeFormat("en-US", {
        timeZone: tz, hour12: !clock24hRef.current,
        hour: "2-digit", minute: "2-digit", ...(tickType === 4 ? { second: "2-digit" } : {}),
      }).format(d);
    } catch { return d.toLocaleTimeString(); }
  }, []);
  // Live-readable order-flow side colors (user-customizable via the toolbar gear).
  // Defaults are byte-identical to the prior hardcoded teal/purple so nothing
  // changes unless the user actually picks a custom color.
  // Each order-flow tool keeps its OWN color pair (per-tool gears are independent):
  // recoloring Delta does not affect Imbalance, etc. Keyed by FootprintType. Falls
  // back to the legacy shared keys, then to the Royal Blue / Purple defaults, so
  // existing saved colors keep working.
  type OFPair = { buy: [number,number,number]; sell: [number,number,number] };
  const OF_DEFAULT: OFPair = { buy: [37, 99, 235], sell: [106, 13, 173] };
  const OF_TOOL_IDS = ["bid-ask", "delta", "volume-profile", "imbalance", "aggressive-passive"];
  const ofColorsRef = useRef<Record<string, OFPair>>({});
  const [rangeVer,    setRangeVer]    = useState(0); // bumped on chart scroll/zoom → redraws canvas
  useEffect(() => {
    const load = () => {
      try {
        const legacyBuy  = hexToRgbTriplet(localStorage.getItem("wm_of_buy")  || "");
        const legacySell = hexToRgbTriplet(localStorage.getItem("wm_of_sell") || "");
        const map: Record<string, OFPair> = {};
        for (const t of OF_TOOL_IDS) {
          const b = hexToRgbTriplet(localStorage.getItem(`wm_of_${t}_buy`)  || "");
          const s = hexToRgbTriplet(localStorage.getItem(`wm_of_${t}_sell`) || "");
          map[t] = {
            buy:  b ?? legacyBuy  ?? OF_DEFAULT.buy,
            sell: s ?? legacySell ?? OF_DEFAULT.sell,
          };
        }
        ofColorsRef.current = map;
      } catch {}
      setRangeVer(v => v + 1); // force a redraw with new colors
    };
    load();
    window.addEventListener("wm-of-colors", load);
    return () => window.removeEventListener("wm-of-colors", load);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // VP bars + Big-Trades bubbles read their own pair from the WM-VP gear
  // (`wm_vp_*`), independent of the footprint scheme. The DEFAULTS are the
  // room's — see `lib/chart/marketFieldMaterial.ts`. They were hand-written
  // RGB triplets here, a THIRD and FOURTH copy of a palette already declared
  // twice in `ChartsDashboard`, which is why the red price-axis tag survived
  // two brass conversions. Derived from the owning hex so the triplet cannot
  // drift from the swatch a trader sees in the gear.
  const vpColorsRef = useRef(VP_DEFAULT_TRIPLETS);
  useEffect(() => {
    const load = () => {
      try {
        // Stamped and idempotent; runs here too because this renderer reads the
        // keys directly and may mount before the gear ever does.
        migrateVolumeProfilePalette(localStorage);
        const up  = hexToRgbTriplet(localStorage.getItem("wm_vp_up")  || "");
        const dn  = hexToRgbTriplet(localStorage.getItem("wm_vp_dn")  || "");
        const poc = hexToRgbTriplet(localStorage.getItem("wm_vp_poc") || "");
        const vah = hexToRgbTriplet(localStorage.getItem("wm_vp_vah") || "");
        const val = hexToRgbTriplet(localStorage.getItem("wm_vp_val") || "");
        vpColorsRef.current = {
          up:  up  ?? VP_DEFAULT_TRIPLETS.up,  dn:  dn  ?? VP_DEFAULT_TRIPLETS.dn,
          poc: poc ?? VP_DEFAULT_TRIPLETS.poc, vah: vah ?? VP_DEFAULT_TRIPLETS.vah,
          val: val ?? VP_DEFAULT_TRIPLETS.val,
        };
      } catch {}
      setRangeVer(v => v + 1);
    };
    load();
    window.addEventListener("wm-vp-colors", load);
    return () => window.removeEventListener("wm-vp-colors", load);
  }, []);

  const { liveBar, ticker, recentTicks, tapeSource, source, connected, quoteRefusal } = useWebSocket({ symbol, timeframe });
  // Canon "CLOSED IS NOT DELAYED" — closure outranks the provider verdict, so
  // the chart chrome cannot claim an active session on a closed one (§8).
  // `null` until mount and on every weekday: provider labelling is unchanged.
  const sessionOpen = useProvenSessionClosure(symbol);

  // ── Tick accumulator: EVERY real executed trade (no synthetic / quote-poll noise) ──
  // Map<barTime, Map<priceRounded, {bid, ask}>>
  const tickAccRef = useRef<Map<number, Map<number, { bid: number; ask: number }>>>(new Map());
  // Big Trades is NOT a price-level reading. Keep the individual executions
  // beside (not inside) the footprint accumulator so two prints at one price
  // remain two bubbles with two timestamps and two canonical event ids.
  const bigTradePrintAccRef = useRef<Map<number, BigTradeTick[]>>(new Map());
  const processedTicksRef = useRef<Set<string>>(new Set());
  // WM Session Tape Stats — running counters WM has observed for the current
  // symbol since tape collection began. Purely from real tick.trade events.
  // Powers the Live Session chip so Delta/CVD/Big Trades tools show something
  // ALIVE even when historical footprint remains blank per data-feed reality.
  //
  // Backed by the per-symbol store: switching from BTC → TSLA no longer
  // destroys the BTC counters. Coming back to BTC restores exactly where we
  // left off within this tab session.
  // Normalize at the store boundary so BTC / BTCUSD / BTC.COINBASE all share
  // one slot — otherwise Nectar fragments across symbol aliases.
  const canonicalSym = normalizeSym(symbol);
  const sessionSlot = getSessionSymbolSlot(canonicalSym, tapeSource ?? "unavailable");
  const sessionTapeStatsRef = useRef(sessionSlot.stats);
  sessionTapeStatsRef.current = sessionSlot.stats;
  const [sessionTapeTick, setSessionTapeTick] = useState<number>(0); // render trigger
  // Durable Nectar hydration is independent from live tape delivery. Subscribe
  // explicitly so a restored server checkpoint becomes visible immediately
  // after reload—even before the first new trade reaches this tab.
  const [sessionNectarUiVersion, setSessionNectarUiVersion] = useState(0);
  useEffect(() => {
    setSessionNectarUiVersion(version => version + 1);
    return subscribeToSessionNectar(() => {
      setSessionNectarUiVersion(version => version + 1);
    });
  }, []);
  const sessionTapeFlushRef = useRef<number>(0);
  // CVD sparkline sample buffer — rolling 24-point trajectory of cumulative
  // delta over time. One sample per throttled flush (~4Hz), so a full buffer
  // represents ~6 seconds of live tape. Rendered inline as an SVG polyline
  // inside the chip, so the chip visually breathes as Δ moves. Directive
  // "living intelligence" aesthetic per Founder Mockup 1.
  const cvdSparkRef = useRef<number[]>(sessionSlot.cvdSpark);
  cvdSparkRef.current = sessionSlot.cvdSpark;
  // ── Delta accumulator: SEPARATE from Big Trades. Captures EVERY real executed
  // trade (no minLot floor) so net aggressive delta per price zone reflects the
  // full aggressive flow. Real trades only (tick.trade) — never quote/synthetic. ──
  const deltaTickAccRef = useRef<Map<number, Map<number, { bid: number; ask: number }>>>(new Map());
  const deltaProcessedRef = useRef<Set<string>>(new Set());
  const tapeSourceRef = useRef(tapeSource);
  useEffect(() => { tapeSourceRef.current = tapeSource; }, [tapeSource]);
  // Late-bound ref so magnet snap can read footprint levels after getBarFootprint is defined.
  const footprintSnapRef = useRef<(bar: LegacyOhlcvTuple, n: number) => Array<{ priceLevel: number; total: number }>>(() => []);

  const hasRealAggressorTape = hasVerifiedAggressorTape;

  // Min single-trade size to count as a "big trade" (real tape only — never
  // synthetic) now lives with the ranking it gates, in @/lib/bigTradeLevels,
  // so the threshold and the selection cannot drift apart. Imported above.
  // (Bubbles can only mark candles that were LIVE while the tab was open —
  // historical bars carry no per-trade tape from the free feed.)

  // WM Tape Horizon: timestamp of the first real execution currently retained
  // in this tab for the active symbol/source/timeframe. This is deliberately
  // session-scoped. Persisting only the timestamp would overstate Market Memory
  // because the execution accumulator itself is not yet durably retained.
  const tapeHorizonRef = useRef<{ sym: string; tapeSrc: string; startedAtSec: number } | null>(sessionSlot.horizon);
  tapeHorizonRef.current = sessionSlot.horizon;

  // Rebuild timeframe-owned buckets whenever symbol, source, or timeframe
  // changes. The bounded recent-tick buffer is then folded into the new bars by
  // the accumulator effects below.
  useEffect(() => {
    // Chart-render buckets (footprint & delta price ladders) are timeframe-
    // owned intermediate caches — safe to rebuild on any of (symbol, source,
    // timeframe) change. The bounded recent-tick buffer folds back into them.
    tickAccRef.current = new Map();
    bigTradePrintAccRef.current = new Map();
    processedTicksRef.current = new Set();
    deltaTickAccRef.current = new Map();
    deltaProcessedRef.current = new Set();
    // Session counters + horizon + sparkline are NOT reset here. They live in
    // the per-symbol store so switching from BTC → TSLA no longer destroys
    // the running BTC observation window; returning to BTC restores exactly
    // where we left off within this tab session.
    const slot = getSessionSymbolSlot(canonicalSym, tapeSource ?? "unavailable");
    sessionTapeStatsRef.current = slot.stats;
    cvdSparkRef.current = slot.cvdSpark;
    tapeHorizonRef.current = slot.horizon;
    setSessionTapeTick(t => t + 1);
  }, [canonicalSym, tapeSource, timeframe]);

  // Re-render the chip when ANY symbol's slot updates so the header stays
  // truthful during rapid symbol switches / multi-symbol future panels.
  useEffect(() => subscribeSessionSymbolStore(() => {
    setSessionTapeTick(t => t + 1);
  }), []);

  useEffect(() => {
    if (!recentTicks?.length || !hasRealAggressorTape(tapeSource ?? "")) return;
    const intervalSec = getIntervalSec(timeframe);
    const minTick = base > 10_000 ? 0.25 : base > 1_000 ? 0.25 : base > 100 ? 0.01 : 0.0001;
    const dp      = base > 100 ? 2 : 4;

    recentTicks.forEach(tick => {
      if (!tick.trade) return;
      if (!Number.isFinite(tick.price) || tick.price <= 0) return;
      if (!Number.isFinite(tick.size)  || tick.size  <= 0) return;
      const dedupeKey = marketTickDedupeKey(tick);
      if (processedTicksRef.current.has(dedupeKey)) return;
      processedTicksRef.current.add(dedupeKey);
      if (processedTicksRef.current.size > 8000) {
        processedTicksRef.current = new Set([...processedTicksRef.current].slice(-4000));
      }

      const barTime = Math.floor(tick.time / 1000 / intervalSec) * intervalSec;
      const priceLevel = +(Math.round(tick.price / minTick) * minTick).toFixed(dp);
      if (!bigTradePrintAccRef.current.has(barTime)) bigTradePrintAccRef.current.set(barTime, []);
      bigTradePrintAccRef.current.get(barTime)!.push({
        price: tick.price,
        bid: tick.side === "sell" ? tick.size : 0,
        ask: tick.side === "buy" ? tick.size : 0,
        printKey: dedupeKey,
        timeMs: tick.time,
        aggressorMethod: tick.marketEvent?.aggressorMethod,
      });
      if (!tickAccRef.current.has(barTime)) tickAccRef.current.set(barTime, new Map());
      const lvlMap = tickAccRef.current.get(barTime)!;
      const existing = lvlMap.get(priceLevel) ?? { bid: 0, ask: 0 };
      lvlMap.set(priceLevel, {
        bid: existing.bid + (tick.side === "sell" ? tick.size : 0),
        ask: existing.ask + (tick.side === "buy"  ? tick.size : 0),
      });
      // WM Session Tape Stats — cumulative counters routed through the
      // per-symbol store so switching symbols preserves each symbol's window.
      recordSessionTrade(
        canonicalSym,
        tapeSource ?? "unavailable",
        { side: tick.side ?? null, size: tick.size, time: tick.time },
        tick.size >= minBigTradeLot(base),
      );
      tapeHorizonRef.current = sessionSlot.horizon; // hydrate ref after first horizon stamp
    });
    if (tickAccRef.current.size > 400) {
      const oldest = [...tickAccRef.current.keys()].sort((a, b) => a - b)[0];
      tickAccRef.current.delete(oldest);
      bigTradePrintAccRef.current.delete(oldest);
    }
    // Throttled render trigger for the Live Session chip. rAF-safe: only bumps
    // state up to ~4x per second so a busy tape does not thrash React.
    const now = Date.now();
    if (now - sessionTapeFlushRef.current > 250) {
      sessionTapeFlushRef.current = now;
      // Push a rolling sparkline sample of cumulative delta through the
      // per-symbol store (24-point ring, ~6s at 4Hz). Store emits so any
      // subscriber (chip, future multi-symbol panels) re-renders.
      pushCvdSample(canonicalSym, tapeSource ?? "unavailable");
      setSessionTapeTick(t => t + 1);
    }
  }, [recentTicks, timeframe, base, tapeSource, canonicalSym, sessionSlot]);

  // ── Delta accumulator population: EVERY real executed trade (tick.trade),
  //    NO minLot floor → full aggressive flow so net-delta-per-zone reflects
  //    real buying/selling pressure. Separate from Big Trades (tickAccRef above,
  //    which stays lot-filtered and untouched). Real trades only — the tick.trade
  //    flag excludes bookTicker/quote/REST/synthetic price-direction ticks. ──
  useEffect(() => {
    if (!recentTicks?.length || !hasRealAggressorTape(tapeSource ?? "")) return;
    const intervalSec = getIntervalSec(timeframe);
    const minTick = base > 10_000 ? 0.25 : base > 1_000 ? 0.25 : base > 100 ? 0.01 : 0.0001;
    const dp      = base > 100 ? 2 : 4;

    recentTicks.forEach(tick => {
      if (!tick.trade) return;                                  // real executed trades only
      if (!Number.isFinite(tick.price) || tick.price <= 0) return;
      if (!Number.isFinite(tick.size)  || tick.size  <= 0) return;
      const dedupeKey = marketTickDedupeKey(tick);
      if (deltaProcessedRef.current.has(dedupeKey)) return;
      deltaProcessedRef.current.add(dedupeKey);
      if (deltaProcessedRef.current.size > 12000) {
        deltaProcessedRef.current = new Set([...deltaProcessedRef.current].slice(-6000));
      }
      const barTime = Math.floor(tick.time / 1000 / intervalSec) * intervalSec;
      const priceLevel = +(Math.round(tick.price / minTick) * minTick).toFixed(dp);
      if (!deltaTickAccRef.current.has(barTime)) deltaTickAccRef.current.set(barTime, new Map());
      const lvlMap = deltaTickAccRef.current.get(barTime)!;
      const existing = lvlMap.get(priceLevel) ?? { bid: 0, ask: 0 };
      lvlMap.set(priceLevel, {
        bid: existing.bid + (tick.side === "sell" ? tick.size : 0),
        ask: existing.ask + (tick.side === "buy"  ? tick.size : 0),
      });
    });
    if (deltaTickAccRef.current.size > 400) {
      const oldest = [...deltaTickAccRef.current.keys()].sort((a, b) => a - b)[0];
      deltaTickAccRef.current.delete(oldest);
    }
  }, [recentTicks, timeframe, base, tapeSource]);

  // Keep the canvas-loop-readable candle-timer flag in sync with settings.
  useEffect(() => { candleTimerRef.current = chartSettings?.candleTimer !== false; }, [chartSettings?.candleTimer]);
  // Keep tz/clock refs current AND re-apply the chart localization so the axis
  // + crosshair time labels refresh the instant the user changes the setting.
  useEffect(() => {
    if (chartSettings?.displayTimeZone) tzRef.current = chartSettings.displayTimeZone;
    clock24hRef.current = chartSettings?.clock24h ?? false;
    try {
      chartRef.current?.applyOptions({ localization: { timeFormatter: fmtAxisTime } });
      chartRef.current?.timeScale().applyOptions({ tickMarkFormatter: fmtTickMark });
    } catch {}
  }, [chartSettings?.displayTimeZone, chartSettings?.clock24h]);

  /* ── Countdown timer ─────────────────────────────────── */
  useEffect(() => {
    const sec = getIntervalSec(timeframe);

    const tick = () => {
      const now       = Date.now() / 1000;
      const barStart  = Math.floor(now / sec) * sec;
      const barEnd    = barStart + sec;
      const remaining = barEnd - now;
      setRemainingSec(remaining);
      setIntervalSec(sec);
      setNowMs(now * 1000);
      progressRef.current = Math.max(0, Math.min(1, (now - barStart) / sec));
    };

    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [timeframe]);

  /* ── Suppress LWC's uncatchable async teardown throw ──────
   * On rapid symbol/timeframe switching, Lightweight-Charts schedules an
   * internal model update on its own requestAnimationFrame BEFORE we call
   * chart.remove(). That callback then runs after disposal and throws
   * "Object is disposed" / "Value is null" asynchronously — outside any
   * local try/catch, so it surfaces as an uncaught console error. Our own
   * effects already guard with chart-identity checks; this handler swallows
   * ONLY that specific library-internal throw and lets everything else pass. */
  useEffect(() => {
    const isLwcTeardownNoise = (msg?: string) =>
      typeof msg === "string" &&
      (/object is disposed/i.test(msg) || /value is null/i.test(msg) ||
       /assertion failed.*disposed/i.test(msg));
    const onError = (e: ErrorEvent) => {
      if (isLwcTeardownNoise(e.message) || isLwcTeardownNoise((e.error && e.error.message))) {
        e.preventDefault(); e.stopImmediatePropagation();
      }
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const m = e.reason && (e.reason.message || String(e.reason));
      if (isLwcTeardownNoise(m)) e.preventDefault();
    };
    window.addEventListener("error", onError, true);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError, true);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  /* ── Bootstrap chart ─────────────────────────────────── */
  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;
    const buildId = Date.now(); // unique ID per effect run
    (chartRef as any).__buildId = buildId;
    // WM-CHART-P0-02: new dataVersion + AbortSignal for this symbol/timeframe.
    // Starting it aborts whatever the previous run still had in flight.
    const { version: myDataVersion, signal: myAbortSignal } = versionGuardRef.current.next();

    (async () => {
      const LW = await import("lightweight-charts");
      lwRef.current = LW; // expose v5 series definitions to other effects
      // Abort if a newer build started while we were awaiting
      if ((chartRef as any).__buildId !== buildId) return;
      if (disposed || !containerRef.current) return;

      // ── CREATE-ONCE: reuse the existing chart across symbol / timeframe /
      // candleType / data changes. Previously the chart was DESTROYED here and
      // rebuilt below AFTER an awaited multi-source candle fetch, so the plot
      // sat BLANK for the entire fetch duration — the P0 blank-chart. We now
      // keep the old chart + its series fully visible during the fetch and only
      // swap the series once validated data is in hand (series rebuild below).
      const el          = containerRef.current;
      const intervalSec = getIntervalSec(timeframe);
      const isNewChart  = !chartRef.current;

      // ── CAMERA PRESERVATION ACROSS A WIDTH CHANGE ────────────────────────
      // The equipment panel is moving from an overlay to a column, so opening
      // Tools will REFLOW this chart narrower. lightweight-charts does not hold
      // the visible bars through that — it re-derives the span from the new
      // width and the trader's view slides. They would open a tool and find a
      // different stretch of the market on screen than the one they were
      // reading.
      //
      // This keeper MUST be opened BEFORE createChart(). It installs a
      // ResizeObserver whose only job is to read the visible range while the
      // scale still holds the OLD width, and ResizeObserver notifies in
      // construction order — so being first here is what makes that read the
      // trader's real pre-resize view. The matching attach() below, immediately
      // after createChart(), installs the restore observer LAST, after the
      // library's own. Reordering these two calls silently reintroduces the jump.
      if (isNewChart && el) {
        cameraKeeperRef.current = openChartCameraKeeper(el, {
          onOutcome: (o) => {
            cameraOutcomeRef.current = o;
            if (o.preserved) { setCameraNote(null); return; }
            // The view DID move. Say which and why, in the keeper's own words,
            // then get out of the way — this is a one-time event, not status.
            setCameraNote(o.plan.action === "stand-down" ? o.plan.spoken : null);
            if (cameraNoteTimerRef.current) clearTimeout(cameraNoteTimerRef.current);
            cameraNoteTimerRef.current = setTimeout(() => setCameraNote(null), 6000);
          },
        });
      }

      const chart = chartRef.current ?? LW.createChart(el, {
        autoSize: true,
        localization: { timeFormatter: fmtAxisTime },
        layout: {
          background:       { color: chartSettings?.background ?? MARKET_FIELD_DEFAULT },
          textColor:        "#8896BE",
          fontFamily:       "'JetBrains Mono', monospace",
          // Smaller axis font → Lightweight Charts fits MORE price/time labels
          // before its overlap-avoidance kicks in, so the y-axis shows denser,
          // less-skipped price levels when zoomed in. (The library still auto-
          // selects the tick step; there is no API to force every single level.)
          fontSize:         11,
          attributionLogo:  false,   // remove TradingView branding
        },
        grid: {
          vertLines: { color: chartSettings?.gridColor ?? GRID_COLOR_DEFAULT, style: LW.LineStyle.Dotted },
          horzLines: { color: chartSettings?.gridColor ?? GRID_COLOR_DEFAULT, style: LW.LineStyle.Dotted },
        },
        crosshair: {
          mode:     LW.CrosshairMode.Normal,
          vertLine: { color: chartSettings?.crosshairColor ?? CROSSHAIR_COLOR_DEFAULT, labelBackgroundColor: "#141824", width: 1 },
          horzLine: { color: chartSettings?.crosshairColor ?? CROSSHAIR_COLOR_DEFAULT, labelBackgroundColor: "#141824", width: 1 },
        },
        rightPriceScale: {
          borderColor:  "#263050",
          textColor:    "#8896BE",
          // Candles fill top 6%→82% of the pane, sitting directly above the
          // volume band (which lives in the bottom 18% on its own 'vol' scale).
          // Previously bottom:0.25 left a 7% dead gap and compressed candles into
          // the top two-thirds — making them look small/low-quality vs TV/Moomoo.
          scaleMargins: { top: 0.06, bottom: 0.18 },
          autoScale:    true,
        },
        timeScale: {
          borderColor:                  "#263050",
          timeVisible:                  true,
          tickMarkFormatter:            fmtTickMark,
          secondsVisible:               intervalSec < 60,
          rightOffset:                  5,
          barSpacing:                   8,
          minBarSpacing:                2,
          shiftVisibleRangeOnNewBar:    true,
          lockVisibleTimeRangeOnResize: false,
        },
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true },
        // Price-axis drag scaling DISABLED — it let the price scale zoom out to an
        // absurd range (e.g. 300–1100 for TSLA at 377), crushing the candles, with
        // no easy recovery. Vertical control is our clamped body-drag + RESET; the
        // time axis can still be dragged to scale horizontally.
        handleScale:  { mouseWheel: true, pinch: true, axisPressedMouseMove: { time: true, price: false } },
      });
      // Assign immediately so a rapid second symbol/timeframe change during our
      // async candle fetch REUSES this chart instead of creating a duplicate.
      if (isNewChart) chartRef.current = chart;
      // Attached HERE — after createChart, so the restore observer is the last
      // one notified and the library's synchronous re-fit has already happened
      // by the time it runs. `barsRef` is read lazily so the keeper always sees
      // the live series rather than whatever was loaded at attach time.
      if (isNewChart) {
        cameraKeeperRef.current?.attach({
          getVisibleLogicalRange: () => chart.timeScale().getVisibleLogicalRange(),
          setVisibleLogicalRange: (r) => chart.timeScale().setVisibleLogicalRange(r),
          barSpacingBounds: () => {
            const o = chart.timeScale().options() ?? {};
            return { minBarSpacing: o.minBarSpacing ?? 0, maxBarSpacing: o.maxBarSpacing ?? 0 };
          },
          barCount: () => barsRef.current.length,
        });
      }

      // ── NO VWAP / NO BANDS — moved to Indicators panel ──

      // Fetch real spot price in parallel to validate that candle data is at the
      // correct price level.
      //
      // SF-D01: this value is never rendered — it holds a VETO. Fifty lines
      // down, candles more than 5% from it are thrown away entirely. When the
      // quote is refused, `j.price` silently falls back to `prevClose`, so an
      // uncertified number was free to reject real, correctly-provenanced
      // candles from Alpaca/Finnhub/Polygon and leave the chart empty — worst
      // exactly when it matters, across a weekend or a gap, where prevClose is
      // furthest from the truth. WM declining to certify a price is not
      // grounds for it to overrule data WM does trust.
      //
      // Retract to 0 and the existing `spotPrice > 0` guard already skips the
      // check: the candles then stand on their own provenance, which is the
      // honest fallback this code path already owns.
      // The round is SHARED with the tape and useWebSocket, so `myAbortSignal`
      // deliberately does not enter it: this chart unmounting mid-flight must
      // not cancel a request the other two are waiting on, or they would read
      // the abort as the provider's answer. Cancellation is a property of a
      // consumer and is applied here, to the RESULT.
      const spotFetch = fetchYahooQuoteBody(symbol)
        .then(j => (myAbortSignal.aborted || yahooQuoteRefusal(j) ? 0 : ((j as any)?.price ?? 0)) as number)
        .catch(() => 0);

      // Bar count scales with timeframe so higher timeframes pull years of history
      // (e.g. Daily → 1200 bars ≈ 5y, Weekly/Monthly → full available history).
      const barCount = timeframe === "1D" ? 2600
                     : timeframe === "1W" ? 1000
                     : ["1M","3M","6M","1Y","3Y","5Y"].includes(timeframe) ? 400
                     // Hourly TFs now pull ~2y of 60-min bars (Yahoo's max) so the
                     // chart scrolls back years, not 60 days.
                     : ["1h","2h","4h"].includes(timeframe) ? 3000
                     // Minute TFs were starved at 500 bars — a 5m chart only reached
                     // back ~6 trading days ("maxes out at Jul 6"). Pull the full
                     // intraday window the source allows: 1m ≈ Yahoo's ~7-day cap,
                     // 5m–30m reach weeks→months. Limiter becomes the API, not us.
                     : ["1m","2m","3m"].includes(timeframe) ? 3000
                     : ["5m","10m","15m","30m"].includes(timeframe) ? 5000
                     : 500;

      // Per-exchange crypto (e.g. "BTC.COINBASE") → that exchange's real candles
      const exParsed = parseExchangeSymbol(symbol);
      const exchangeData: CanonicalCandleBatch | null = exParsed
        ? await fetch(`/api/exchange?ex=${exParsed.exchange}&coin=${exParsed.coin}&type=candles&tf=${timeframe}&bars=${barCount}`, { cache: "no-store", signal: myAbortSignal })
            .then(r => r.json()).then(j => candleBatch(j, barCount)).catch(() => null)
        : null;

      // Priority: exchange-specific, Alpaca, Finnhub, Yahoo, Finnhub REST, Polygon.
      // Never manufacture market bars when every observed-data source is unavailable.
      // THE RECEIPT BOOK. Each helper writes what its door actually said; this
      // function does not interpret any of it. See compileBarHistoryRefusal.
      const vendorLog: VendorAttempt[] = [];
      const alpacaData   = exchangeData ? null : await fetchAlpacaCandles(symbol, timeframe, barCount, myAbortSignal, vendorLog);
      const fhDirectData = (exchangeData || alpacaData) ? null : await fetchFinnhubCandlesDirect(symbol, timeframe, barCount, myAbortSignal, vendorLog);
      const yahooData    = (exchangeData || alpacaData || fhDirectData) ? null : await fetchYahooCandles(symbol, timeframe, barCount, extendedHours, myAbortSignal, vendorLog);
      const finnhubData  = (exchangeData || alpacaData || fhDirectData || yahooData) ? null : await fetchFinnhubCandles(symbol, timeframe, barCount, myAbortSignal, vendorLog);
      const polyData     = (exchangeData || alpacaData || fhDirectData || yahooData || finnhubData) ? null : await fetchPolygonOHLCV(symbol, timeframe, barCount, myAbortSignal);
      const canonicalBatch = exchangeData ?? alpacaData ?? fhDirectData ?? yahooData ?? finnhubData;
      const realData = canonicalBatch?.candles ?? polyData;
      const fetchedBarIdentities = canonicalBatch?.identities ?? [];
      // Provenance: record which provider ACTUALLY supplied these candles.
      const srcName =
        exchangeData ? (exParsed?.exchange?.toUpperCase() || "EXCHANGE") :
        alpacaData   ? "ALPACA"  :
        fhDirectData ? "FINNHUB" :
        yahooData    ? "YAHOO"   :
        finnhubData  ? "FINNHUB" :
        // Internal sentinel — never rendered to trader.
        polyData     ? "POLYGON" : "__unresolved__";

      // Real spot price (from parallel fetch above)
      const spotPrice = await spotFetch;
      // If we have real candle data but the candles are at a stale price level
      // we reject it instead of silently moving or fabricating bars.
      let candleData = realData;
      if (candleData && candleData.length > 0 && spotPrice > 0) {
        const lastClose = candleData[candleData.length - 1].close;
        const stalePct  = Math.abs(lastClose - spotPrice) / spotPrice;
        if (stalePct > 0.05) candleData = null;
      }

      const rawData = filterSession(
        candleData ?? [],
        symbol, intervalSec, !!extendedHours,
      );
      // ── HARD SANITIZE — Lightweight Charts v5 THROWS (→ blank / distorted
      // candles) on duplicate or out-of-order timestamps, or NaN/Infinity OHLC.
      // Yahoo merges, session filtering and live-tick folding can all introduce
      // these. Sort by time, drop non-finite OHLC, and force strictly-increasing
      // unique timestamps so EVERY candle type downstream gets clean input.
      const data: LegacyOhlcvTuple[] = (() => {
        const sorted = [...rawData]
          .filter(b =>
            b && Number.isFinite(b.time as number) &&
            Number.isFinite(b.open)  && Number.isFinite(b.high) &&
            Number.isFinite(b.low)   && Number.isFinite(b.close))
          .sort((a, b) => (a.time as number) - (b.time as number));
        let lastT = -Infinity;
        const out: LegacyOhlcvTuple[] = [];
        for (const b of sorted) {
          let t = b.time as number;
          if (t <= lastT) continue; // drop duplicate/backwards bar (keep first)
          lastT = t;
          // guarantee high ≥ max(o,c) and low ≤ min(o,c) so bodies/wicks render
          const high = Math.max(b.high, b.open, b.close);
          const low  = Math.min(b.low,  b.open, b.close);
          out.push({ ...b, time: t as any, high, low, volume: Number.isFinite(b.volume) ? b.volume : 0 });
        }
        // ── DE-SPIKE outlier wicks ───────────────────────────────
        // Extended-hours / thin-liquidity feeds (Yahoo especially) emit single
        // bad-tick prints — e.g. a low of 352 on a bar whose body sits at 392, or
        // a high of 418 next to 380 neighbors. ONE such wick forces LWC autoscale
        // to stretch to that extreme, squashing every normal candle to a sliver
        // ("broken/distorted candles"). We clamp only egregious wicks (range >
        // 6× the median bar range) back toward the body, so real volatility is
        // untouched but lone spikes can't blow up the price scale.
        if (out.length >= 8) {
          const ranges = out
            .map(b => (b.high as number) - (b.low as number))
            .filter(r => r > 0)
            .sort((a, b) => a - b);
          const med = ranges.length ? ranges[Math.floor(ranges.length / 2)] : 0;
          if (med > 0) {
            const cap = med * 6;
            // CLAMPED BY REPLACEMENT, NOT BY MUTATION (2026-09-18). This loop
            // used to assign `b.high = …` in place. The objects are ours — each
            // was built by the `out.push({ ...b, … })` above — so mutating them
            // was not corrupting anyone else's history. Rebuilding them is still
            // the better shape: a bar that can be edited after it is published
            // is the mechanism by which a corrected value silently replaces the
            // one a trader already acted on, and that is precisely what
            // CanonicalBar's truthEpoch exists to make impossible.
            return out.map((b) => {
              const maxC = Math.max(b.open, b.close);
              const minC = Math.min(b.open, b.close);
              const high = (b.high as number) - maxC > cap ? maxC + cap : b.high;
              const low  = minC - (b.low as number) > cap ? minC - cap : b.low;
              return { ...b, high: high as number, low: low as number };
            });
          }
        }
        return out;
      })();
      // Transform for candle type
      const isHA          = candleType === "heikin-ashi";
      const isLine        = candleType === "line";
      const isArea        = candleType === "area";
      const isHollow      = candleType === "hollow";
      const isVolCnl      = candleType === "volume-candles";
      const isVPCandles   = candleType === "vp-candles";
      const isRenko       = candleType === "renko";
      const isRangeBars   = candleType === "range-bars";
      const isBars        = candleType === "bars";
      const isHlcBars     = candleType === "hlc-bars";
      const isBaseline    = candleType === "baseline";
      const isColumns     = candleType === "columns";
      const isOrderflow   = candleType === "orderflow-candles";
      const isComingSoon  = false; // removed: line-break, kagi, point-figure not in dropdown

      const displayData = isHA ? toHeikinAshi(data) : data;
      const admittedBarIdentities = alignCanonicalBarIdentities({
        bars: data,
        identities: fetchedBarIdentities,
        acceptedSymbolIds: (() => {
          const canonical = canonicalInstrumentId(symbol, canonicalAssetClass(symbol));
          const ids = [symbol, canonical, `ALPACA:${symbol}`];
          if (canonical.endsWith("-USD")) ids.push(`ALPACA:${canonical.replace(/-USD$/, "/USD")}`);
          if (exParsed) ids.push(`${exParsed.exchange}:${exParsed.coin}`);
          return ids;
        })(),
        timeframe,
      });

      // Superseded-build guard: if the user changed symbol/timeframe again while
      // our candle fetch was in flight, a newer effect run now owns the chart —
      // abort WITHOUT touching series so we never clobber the newer build or
      // blank the chart the newer run is about to populate.
      // WM-CHART-P0-02: versionGuardRef is the canonical dataVersion check;
      // buildId/disposed is this effect's own pre-existing equivalent. Both
      // must agree that we're still current before this response is applied.
      if ((chartRef as any).__buildId !== buildId || disposed) return;
      if (!versionGuardRef.current.isCurrent(myDataVersion)) return;

      // Reuse path: the PREVIOUS candle + volume series stayed fully visible
      // during the fetch above; remove them now that fresh validated data is
      // ready. This swap is synchronous (one repaint), so there is no blank
      // frame — unlike the old destroy-chart-then-fetch flow.
      if (!isNewChart && chartRef.current) {
        try { if (candleRef.current) chartRef.current.removeSeries(candleRef.current); } catch {}
        try { if (volRef.current)    chartRef.current.removeSeries(volRef.current); } catch {}
        candleRef.current = null;
        volRef.current    = null;
      }

      let cs: any;
      if (isLine) {
        cs = chart.addSeries(LW.LineSeries,{
          color:            "#4FA3E0",
          lineWidth:        2,
          priceLineVisible: true,
          priceLineColor:   "#F0B429",
          lastValueVisible: true,
        });
        cs.setData(displayData.map(b => ({ time: b.time, value: b.close } as any)));
      } else if (isArea) {
        cs = chart.addSeries(LW.AreaSeries,{
          topColor:         "rgba(79,163,224,0.40)",
          bottomColor:      "rgba(79,163,224,0.02)",
          lineColor:        "#4FA3E0",
          lineWidth:        2,
          priceLineVisible: true,
          priceLineColor:   "#F0B429",
          lastValueVisible: true,
        });
        cs.setData(displayData.map(b => ({ time: b.time, value: b.close } as any)));
      } else if (isBaseline) {
        cs = chart.addSeries(LW.BaselineSeries,{
          baseValue:        { type: "price", price: displayData[Math.floor(displayData.length / 2)]?.close ?? base },
          topLineColor:     "#00E5CC",
          topFillColor1:    "rgba(0,229,204,0.28)",
          topFillColor2:    "rgba(0,229,204,0.05)",
          bottomLineColor:  "#7B6CF7",
          bottomFillColor1: "rgba(123,108,247,0.05)",
          bottomFillColor2: "rgba(123,108,247,0.28)",
          priceLineVisible: true,
          priceLineColor:   "#F0B429",
          lastValueVisible: true,
        });
        cs.setData(displayData.map(b => ({ time: b.time, value: b.close } as any)));
      } else if (isBars) {
        cs = chart.addSeries(LW.BarSeries,{
          upColor:          chartSettings?.candleUp   ?? CANDLE_UP_DEFAULT,
          downColor:        chartSettings?.candleDown ?? CANDLE_DOWN_DEFAULT,
          openVisible:      true,
          thinBars:         false,
          priceLineVisible: true,
          priceLineColor:   "#F0B429",
          lastValueVisible: true,
        });
        cs.setData(displayData as any);
      } else if (isHlcBars) {
        cs = chart.addSeries(LW.BarSeries,{
          upColor:          chartSettings?.candleUp   ?? CANDLE_UP_DEFAULT,
          downColor:        chartSettings?.candleDown ?? CANDLE_DOWN_DEFAULT,
          openVisible:      false,
          thinBars:         true,
          priceLineVisible: true,
          priceLineColor:   "#F0B429",
          lastValueVisible: true,
        });
        cs.setData(displayData as any);
      } else if (isColumns) {
        // Columns = full-height colored bars (no wicks, wide body)
        // Use background color for wicks to hide them — "transparent" breaks LWC's internal parser
        const bgCol = chartSettings?.background ?? MARKET_FIELD_DEFAULT;
        cs = chart.addSeries(LW.CandlestickSeries,{
          upColor:          chartSettings?.candleUp   ?? CANDLE_UP_DEFAULT,
          downColor:        chartSettings?.candleDown ?? CANDLE_DOWN_DEFAULT,
          borderUpColor:    chartSettings?.candleUp   ?? CANDLE_UP_DEFAULT,
          borderDownColor:  chartSettings?.candleDown ?? CANDLE_DOWN_DEFAULT,
          wickUpColor:      bgCol,
          wickDownColor:    bgCol,
          priceLineVisible: true,
          priceLineColor:   "#F0B429",
          lastValueVisible: true,
        });
        // Force open = low and high = close for bull, open = high and low = close for bear (column shape)
        const colData = displayData.map(b => ({
          time: b.time,
          open: b.close > b.open ? b.low : b.high,
          high: b.high,
          low:  b.low,
          close: b.close,
        }));
        cs.setData(colData as any);
      } else if (isHollow) {
        // Hollow candles: body filled with chart background so it appears empty;
        // colored border provides the outline. Using background color (not "transparent")
        // avoids LWC's broken alpha-stripping in its internal #0000 hex parser.
        const bgColor = chartSettings?.background ?? MARKET_FIELD_DEFAULT;
        cs = chart.addSeries(LW.CandlestickSeries,{
          upColor:          bgColor,
          downColor:        bgColor,
          borderUpColor:    chartSettings?.borderUp   ?? chartSettings?.candleUp   ?? CANDLE_UP_DEFAULT,
          borderDownColor:  chartSettings?.borderDown ?? chartSettings?.candleDown ?? CANDLE_DOWN_DEFAULT,
          wickUpColor:      chartSettings?.wickUp     ?? CANDLE_UP_DEFAULT,
          wickDownColor:    chartSettings?.wickDown   ?? CANDLE_DOWN_DEFAULT,
          borderVisible:    true,
          priceLineVisible: true,
          priceLineColor:   "#F0B429",
          lastValueVisible: true,
        });
        cs.setData(displayData as any);
      } else if (isVolCnl) {
        // Volume Candles — green/red body, OPACITY scales with relative volume
        const upC = chartSettings?.candleUp ?? CANDLE_UP_DEFAULT, downC = chartSettings?.candleDown ?? CANDLE_DOWN_DEFAULT;
        cs = chart.addSeries(LW.CandlestickSeries,{
          upColor: upC, downColor: downC, borderUpColor: upC, borderDownColor: downC,
          wickUpColor: upC, wickDownColor: downC,
          priceLineVisible: true, priceLineColor: "#F0B429", lastValueVisible: true,
        });
        const maxVol = Math.max(1, ...displayData.map(b => b.volume));
        const minVol = Math.min(...displayData.map(b => b.volume));
        const volRange = maxVol - minVol || 1;
        const volData = displayData.map(b => {
          const frac   = (b.volume - minVol) / volRange;
          const alpha  = Math.round((0.25 + frac * 0.70) * 255).toString(16).padStart(2, "0");
          const isBull = b.close >= b.open;
          return { ...b, color: (isBull ? upC : downC) + alpha, borderColor: isBull ? upC : downC, wickColor: isBull ? upC : downC };
        });
        cs.setData(volData as any);
      } else if (isVPCandles) {
        // VP Candles — green/red, but HIGH-VOLUME (value-area / POC) bars get a GOLD border
        // to mark volume-profile significance. Distinct from plain Volume Candles.
        const upC = chartSettings?.candleUp ?? CANDLE_UP_DEFAULT, downC = chartSettings?.candleDown ?? CANDLE_DOWN_DEFAULT;
        cs = chart.addSeries(LW.CandlestickSeries,{
          upColor: upC, downColor: downC, borderUpColor: upC, borderDownColor: downC,
          wickUpColor: upC, wickDownColor: downC,
          priceLineVisible: true, priceLineColor: "#F0B429", lastValueVisible: true,
        });
        const vols = [...displayData.map(b => b.volume)].sort((a, b) => a - b);
        const pocThreshold = vols[Math.floor(vols.length * 0.8)] ?? Infinity; // top 20% = POC bars
        const vpData = displayData.map(b => {
          const isBull = b.close >= b.open;
          const isPOC  = b.volume >= pocThreshold;
          return {
            ...b,
            color:       isBull ? upC : downC,
            borderColor: isPOC ? "#F0B429" : (isBull ? upC : downC), // gold border on POC bars
            wickColor:   isBull ? upC : downC,
          };
        });
        cs.setData(vpData as any);
      } else if (isOrderflow) {
        // Order Flow Candles — hollow body (footprint cells show through) but a CRISP
        // green/red border so the candle stays sharp, not blurry.
        const bgOF = chartSettings?.background ?? MARKET_FIELD_DEFAULT;
        const upC = chartSettings?.candleUp ?? CANDLE_UP_DEFAULT, downC = chartSettings?.candleDown ?? CANDLE_DOWN_DEFAULT;
        cs = chart.addSeries(LW.CandlestickSeries,{
          upColor:          bgOF,
          downColor:        bgOF,
          borderUpColor:    upC,
          borderDownColor:  downC,
          borderVisible:    true,
          wickUpColor:      upC,
          wickDownColor:    downC,
          priceLineVisible: true,
          priceLineColor:   "#F0B429",
          lastValueVisible: true,
        });
        cs.setData(displayData as any);
      } else if (isRenko) {
        // RENKO — fixed-size bricks, a new brick only when price moves one brick
        // (time-independent). Bricks are filled green/red blocks (no wicks).
        const upC = chartSettings?.candleUp ?? CANDLE_UP_DEFAULT, downC = chartSettings?.candleDown ?? CANDLE_DOWN_DEFAULT;
        const brickSize  = base * 0.001;
        let lastBrick    = Math.floor((displayData[0]?.close ?? base) / brickSize) * brickSize;
        const renkoData: any[] = [];
        displayData.forEach(b => {
          while (b.close >= lastBrick + brickSize) {
            renkoData.push({ time: b.time, open: lastBrick, high: lastBrick + brickSize, low: lastBrick, close: lastBrick + brickSize, color: upC, borderColor: upC, wickColor: upC });
            lastBrick += brickSize;
          }
          while (b.close <= lastBrick - brickSize) {
            renkoData.push({ time: b.time, open: lastBrick, high: lastBrick, low: lastBrick - brickSize, close: lastBrick - brickSize, color: downC, borderColor: downC, wickColor: downC });
            lastBrick -= brickSize;
          }
        });
        // Renko is TIME-INDEPENDENT — a brick is a price move, not a clock tick. Keeping
        // the source bar's real timestamp made many bricks share one time (or sit far
        // apart), and LWC plots on a TIME axis, so the bricks rendered with big empty
        // horizontal gaps. Assign EVENLY-SPACED sequential timestamps so the bricks pack
        // tightly side-by-side like TradingView Renko (no gaps).
        const rkStep = getIntervalSec(timeframe) || 60;
        const rkT0 = (displayData[0]?.time as number) ?? Math.floor(Date.now() / 1000);
        const renkoClean = renkoData.map((r, i) => ({ ...r, time: rkT0 + i * rkStep }));
        cs = chart.addSeries(LW.CandlestickSeries,{
          upColor: upC, downColor: downC, borderUpColor: upC, borderDownColor: downC,
          wickUpColor: upC, wickDownColor: downC, borderVisible: true,
          priceLineVisible: true, priceLineColor: "#F0B429", lastValueVisible: true,
        });
        if (renkoClean.length) cs.setData(renkoClean as any);
      } else if (isRangeBars) {
        // RANGE BARS — each bar spans a FIXED price range; a new bar opens once price
        // travels one full range from the prior bar's open. Distinct from Renko (which
        // snaps to a grid). Green/red by direction, keeps real timestamps + wicks.
        const upC = chartSettings?.candleUp ?? CANDLE_UP_DEFAULT, downC = chartSettings?.candleDown ?? CANDLE_DOWN_DEFAULT;
        const rangeSize = base * 0.0015;
        const rbData: any[] = [];
        let cur: { time: number; open: number; high: number; low: number; close: number } | null = null;
        displayData.forEach(b => {
          if (!cur) { cur = { time: b.time as number, open: b.open, high: b.high, low: b.low, close: b.close }; }
          cur.high = Math.max(cur.high, b.high);
          cur.low  = Math.min(cur.low,  b.low);
          cur.close = b.close;
          if (cur.high - cur.low >= rangeSize) {
            const isBull = cur.close >= cur.open;
            rbData.push({ ...cur, color: isBull ? upC : downC, borderColor: isBull ? upC : downC, wickColor: isBull ? upC : downC });
            cur = null;
          }
        });
        if (cur) { const c = cur as { time:number;open:number;high:number;low:number;close:number }; const isBull = c.close >= c.open; rbData.push({ ...c, color: isBull ? upC : downC, borderColor: isBull ? upC : downC, wickColor: isBull ? upC : downC }); }
        // Range bars are TIME-INDEPENDENT — a bar is a fixed price travel, not a clock
        // tick. Real source timestamps left consecutive bars far apart on the TIME axis,
        // producing the big horizontal gaps. Assign EVENLY-SPACED sequential timestamps
        // so the bars pack tightly side-by-side like a real range-bar chart.
        const rbStep = getIntervalSec(timeframe) || 60;
        const rbT0 = (displayData[0]?.time as number) ?? Math.floor(Date.now() / 1000);
        const rbClean = rbData.map((r, i) => ({ ...r, time: rbT0 + i * rbStep }));
        cs = chart.addSeries(LW.CandlestickSeries,{
          upColor: upC, downColor: downC, borderUpColor: upC, borderDownColor: downC,
          wickUpColor: upC, wickDownColor: downC, borderVisible: true,
          priceLineVisible: true, priceLineColor: "#F0B429", lastValueVisible: true,
        });
        if (rbClean.length) cs.setData(rbClean as any);
      } else if (isComingSoon) {
        // 3-Line Break / Kagi / Point & Figure — render as line for now with label
        cs = chart.addSeries(LW.LineSeries,{
          color: "#8B5CF6", lineWidth: 2,
          priceLineVisible: true, priceLineColor: "#F0B429", lastValueVisible: true,
        });
        cs.setData(displayData.map(b => ({ time: b.time, value: b.close } as any)));
      } else {
        // Standard candles (default + Heikin Ashi) — Deep Charts color scheme
        cs = chart.addSeries(LW.CandlestickSeries,{
          upColor:          chartSettings?.candleUp   ?? CANDLE_UP_DEFAULT,
          downColor:        chartSettings?.candleDown ?? CANDLE_DOWN_DEFAULT,
          borderUpColor:    chartSettings?.borderUp   ?? CANDLE_UP_DEFAULT,
          borderDownColor:  chartSettings?.borderDown ?? CANDLE_DOWN_DEFAULT,
          wickUpColor:      chartSettings?.wickUp     ?? CANDLE_UP_DEFAULT,
          wickDownColor:    chartSettings?.wickDown   ?? CANDLE_DOWN_DEFAULT,
          priceLineVisible: true,
          priceLineColor:   "#F0B429",
          priceLineWidth:   1,
          lastValueVisible: true,
        });
        cs.setData(displayData as any);
      }

      // For orderflow-candles, force bid-ask footprint in the canvas overlay
      const effectiveFP = isOrderflow ? "bid-ask" : footprintType;

      // Volume histogram.
      //
      // THE LAST RED THREAD. Per-point `color` paints the BARS; it does not
      // reach the series' own last-value furniture. Lightweight-Charts derives
      // the price line and the axis tag from the SERIES-LEVEL `color`, which
      // was never set here — so after the bars turned brass, a full-width
      // dashed line and a price tag were still drawn in the old casino red
      // across the whole frame. MEASURED LIVE by reading the canvas back:
      // `143,46,63` at 758 px, which is `#FF4D67` composited on the field.
      // A default nobody wrote is still a default that ships.
      const vs = chart.addSeries(LW.HistogramSeries,{
        color:            VOLUME_UP_DEFAULT,
        priceFormat:      { type: "volume" },
        priceScaleId:     "vol",
        // The bars ARE the magnitude. A second full-width rule restating the
        // last one is furniture competing with the thing it describes.
        priceLineVisible: false,
        lastValueVisible: true,
      });
      chart.priceScale("vol").applyOptions({
        scaleMargins: { top: 0.78, bottom: 0 },
        borderColor:  "transparent",
      });

      // Solid, clearly-visible real-volume bars (was 0.20 alpha → nearly
      // invisible, so the user thought volume had been removed). These are the
      // REAL per-bar volumes from the data feed, not synthetic.
      // NOT A RAINBOW, one pane down. The price series speaks brass; volume
      // used to answer in teal and red directly beneath it, which simply moved
      // the casino below the candles. Volume is MAGNITUDE, not a market claim,
      // so it takes the same two-luminance brass held well back with alpha.
      // The WM Neon theme is a deliberate trader opt-in and keeps its own
      // vocabulary — it is a chosen costume, not the room's default material.
      const volUp   = chartSettings?.neon ? "rgba(0,255,163,0.70)" : VOLUME_UP_DEFAULT;
      const volDown = chartSettings?.neon ? "rgba(255,46,99,0.70)"  : VOLUME_DOWN_DEFAULT;
      vs.setData(data.map(c => ({
        time:  c.time,
        value: c.volume,
        color: c.close >= c.open ? volUp : volDown,
      })) as any);

      // CANDLE DENSITY — match TradingView / Moomoo / Webull.
      // Lightweight-Charts derives candle BODY width from barSpacing via its
      // internal optimalCandlestickWidth() curve: the fill ratio (body ÷ slot)
      // RISES as barSpacing shrinks — ~78% at 15px (visibly gappy), ~86% at 8px
      // (tight, pro-platform look), ~90% at 6px. The old code set barSpacing:10
      // but then immediately overrode it with setVisibleLogicalRange(58 bars),
      // which forced ~15px slots on a 940px pane → the persistent gaps the user
      // sees vs Moomoo. Fix: PIN a tight barSpacing (no logical-range override)
      // and anchor to the latest bar. Sparse higher-timeframe history simply
      // leaves whitespace on the left instead of stretching bars apart.
      // Per-timeframe bar width so each timeframe opens at its OWN natural zoom
      // (5m looks tighter-packed than the daily, etc.) instead of every timeframe
      // snapping to one identical width — which made switching timeframes feel
      // like "nothing changed". Kept in the tight 6–11px pro-platform band so the
      // candles never go gappy. Lower timeframes (more bars) → slightly wider;
      // higher timeframes → tighter.
      try {
        const tfSec = getIntervalSec(timeframe);
        const bs =
          tfSec <= 60    ? 11 :   // ≤1m
          tfSec <= 300   ? 10 :   // ≤5m
          tfSec <= 900   ? 9  :   // ≤15m
          tfSec <= 3600  ? 8  :   // ≤1h
          tfSec <= 14400 ? 7  :   // ≤4h
                           6;     // daily+
        chart.timeScale().applyOptions({ barSpacing: bs, rightOffset: 5 });
        // Renko / Range bars carry SYNTHETIC, evenly-spaced timestamps (a brick is a
        // price move, not a clock tick). scrollToRealTime() anchors to the wall-clock
        // "now", which sits far to the right of those synthetic times — so the bricks
        // bunch against the right edge leaving the left half blank (the "Renko shows
        // empty chart" bug). For these types fit ALL bricks into the pane instead.
        //
        // Fit a session when it fits the pane, including a complete one-minute
        // RTH session. Futures may load thousands of intraday bars; fitting all
        // of those makes the price action and its attached readings unreadable.
        // Reset View still lets the trader fit the complete history explicitly.
        const intradayClockTf = ["1m","2m","3m","5m","10m","15m","30m","1h","2h","4h"].includes(timeframe);
        const range = initialChartRange({
          synthetic: isRenko || isRangeBars,
          intraday: intradayClockTf,
          intervalSec: tfSec,
          barCount: data.length,
          barSpacing: bs,
          viewportWidth: el.clientWidth,
        });
        if (range === "fit") {
          chart.timeScale().fitContent();
        } else {
          chart.timeScale().scrollToRealTime();
        }
      } catch {
        try { chart.timeScale().fitContent(); } catch {}
      }

      chartRef.current  = chart;
      candleRef.current = cs;
      markersPluginRef.current = null; // fresh series → re-attach markers plugin on next update
      volRef.current    = vs;
      barsRef.current   = data;
      barIdentitiesRef.current = admittedBarIdentities;

      // Feed the manual vertical-drag range through the main series' autoscale.
      // When manualPriceRangeRef is null the chart auto-fits as normal; when the
      // user drags vertically we return the shifted range so price pans freely.
      try {
        cs.applyOptions({
          autoscaleInfoProvider: autoscaleProviderRef.current,
        });
      } catch {}

      setCandles(data);
      if (data.length) {
        setLastPrice(data[data.length - 1].close);
        setOpenPrice(data[0].open);
      }
      // Internal sentinel — never shown to trader. Canon-quarantined
      // display strings live in canonicalFidelityLabels; this state
      // is INTERNAL bookkeeping only.
      setCandleSource(data.length ? srcName : "__unresolved__");
      // Published in the SAME statement-block as the source sentinel, so the
      // glass can never show "__unresolved__" beside a stale list of reasons
      // from the previous symbol.
      setBarRefusal(compileBarHistoryRefusal(vendorLog));
      setReady(true);
      onBarsReady?.(data, admittedBarIdentities);

      // Subscriptions attach ONCE per chart (the chart is now persistent across
      // symbol/timeframe changes). They use chartRef.current as the alive-check
      // (nulled only on unmount) and candleRef.current for the series (which is
      // swapped on every rebuild) — never the stale build-local `cs`/`disposed`.
      if (isNewChart) {
        // Redraw canvas overlay whenever user scrolls or zooms
        chart.timeScale().subscribeVisibleTimeRangeChange(() => {
          if (chartRef.current) setRangeVer(v => v + 1);
        });

        // Crosshair move → data window update
        //
        // PUBLISH ONLY WHAT CHANGED. Lightweight-charts fires crosshair moves
        // SYNCHRONOUSLY from inside a pan (scrollTimeTo → recalculate →
        // crosshair), many times per drag, for the same bar under the same
        // cursor. Publishing a fresh object each time re-rendered the room on
        // every one; with a drawing on the glass, a commit re-triggered the
        // next event until React aborted ("Maximum update depth exceeded",
        // reproduced on the pre-shift build too). The reading only changes
        // when the bar, its OHLCV, or the cursor price changes — so only then
        // is it published.
        chart.subscribeCrosshairMove((param: any) => {
          if (!chartRef.current) return;
          if (!param || !param.time) {
            if (lastCursorKeyRef.current !== null) {
              lastCursorKeyRef.current = null;
              setDataWindow(null); onOHLCAtCursor?.(null);
            }
            return;
          }
          // Find bar at crosshair time
          const bar = barsRef.current.find(b => b.time === param.time);
          if (bar) {
            let cursorPrice: number | null = null;
            try {
              const series = candleRef.current;
              if (series && param.point) {
                const price = series.coordinateToPrice(param.point.y);
                if (price != null) cursorPrice = +price.toFixed(bar.close > 100 ? 2 : 4);
              }
            } catch {}
            const key = `${bar.time}|${bar.open}|${bar.high}|${bar.low}|${bar.close}|${bar.volume}|${cursorPrice}`;
            if (key === lastCursorKeyRef.current) return;
            lastCursorKeyRef.current = key;
            const ohlc = { o: bar.open, h: bar.high, l: bar.low, c: bar.close, v: bar.volume, time: bar.time };
            setDataWindow(ohlc);
            onOHLCAtCursor?.(ohlc);
            if (cursorPrice != null) onPriceAtCursor?.(cursorPrice);
          }
        });
      }

    })().catch(err => {
      console.error("[MainChart] bootstrap failed:", err);
    });

    return () => {
      // Per-change cleanup ONLY aborts this run's in-flight async work. It must
      // NOT destroy the (now persistent) chart or clear its canvases — doing so
      // on every symbol/timeframe change is exactly what blanked the plot. Real
      // teardown happens once on unmount (dedicated effect below).
      disposed = true;
      (chartRef as any).__buildId = -1;
      // WM-CHART-P0-02: abort this run's in-flight candle/spot fetches now,
      // rather than merely letting their (already-guarded) results be ignored
      // once they land. Safe on both re-run (next effect's next() call takes
      // over) and unmount (nothing left to take over).
      versionGuardRef.current.dispose();
    };
  }, [symbol, timeframe, candleType, extendedHours]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real teardown runs ONCE, on unmount — the chart is persistent while mounted
  // (create-once), so removing it here (not on every dep change) is what keeps
  // the plot from blanking during symbol/timeframe/candle-type switches.
  useEffect(() => {
    return () => {
      // Disconnect the camera observers BEFORE the chart is removed, so a
      // final resize notification can never reach a disposed time scale.
      try { cameraKeeperRef.current?.dispose(); } catch {}
      cameraKeeperRef.current = null;
      if (cameraNoteTimerRef.current) clearTimeout(cameraNoteTimerRef.current);
      cameraNoteTimerRef.current = null;
      try { chartRef.current?.remove(); } catch {}
      chartRef.current  = null;
      candleRef.current = null;
      volRef.current    = null;
      pineSeriesRef.current.clear();
    };
  }, []);

  /* ── Live tick updates (ALL timeframes) ─────────────────
   *  liveBar.time is already the correct bar-boundary second
   *  from useWebSocket's: Math.floor(Date.now()/1000/intervalSec)*intervalSec
   *  We just make sure we cast to the same integer second.
   ───────────────────────────────────────────────────────── */
  // WM-CHART-P0-06: pin the data version this effect run belongs to. When the
  // bootstrap effect (deps: symbol/timeframe/candleType/extendedHours) calls
  // versionGuardRef.current.next() on a symbol switch, the version increments —
  // so a stale tick that reaches this effect BEFORE React re-runs it with the
  // new liveBar carries the previous version and is dropped.
  const myTickVersion = versionGuardRef.current.currentVersion;
  useEffect(() => {
    if (!liveBar || !candleRef.current || !volRef.current || !ready) return;

    // ── WM-CHART-P0-06: symbol-identity gate on the live tick-folding path ──
    // The async data-load path is guarded by DataVersionGuard, but the WS tick
    // fold below runs on `liveBar` alone. When the user switches symbols, the
    // in-flight useWebSocket effect tears the old socket down asynchronously,
    // so a final tick from the PREVIOUS symbol can still fire this effect
    // before the new subscription's first tick arrives. The 8% deviation
    // heuristic below catches wildly different magnitudes (SPY→BTC) but silently
    // accepts wrong-symbol ticks that happen to be within 8% of the new symbol's
    // price (SPY→AAPL, or any mid-cap→mid-cap switch). Bump the guard version on
    // every symbol/timeframe change and require this callback's captured
    // (symbol, timeframe) to still match — a mismatch means we're a stale
    // closure holding a stale tick; drop it. This is a superset of the
    // magnitude check, not a replacement (both stay active).
    if (!versionGuardRef.current.isCurrent(myTickVersion)) return;

    // Provenance: a real tick reached the chart just now.
    lastTickAtRef.current = Date.now();

    const price   = liveBar.close;
    const prevBars = barsRef.current;
    const lastBar  = prevBars[prevBars.length - 1];

    // M8: the published live bar is READ-ONLY (it is the hook's state, not this
    // effect's scratch space). The garbage-OHLC repair below used to assign
    // straight into `liveBar.high/low/open`, which mutated an object React had
    // already handed out — a second writer to someone else's state, and one
    // that could not be seen from the hook. The repair now lands in these three
    // locals, which are what the new-candle branch reads. Same numbers, one
    // writer.
    let lbOpen = liveBar.open;
    let lbHigh = liveBar.high;
    let lbLow  = liveBar.low;

    // ── PERMANENT GUARD against corrupt live ticks ──────────────────────────
    // A bad tick (price ≤ 0, NaN, or a wildly wrong magnitude — e.g. a 400 print
    // on a 3017 instrument, or a stale tick from the PREVIOUS symbol right after
    // a switch) used to be folded straight into the forming candle's high/low.
    // That created a giant candle that stretched the price scale (400→3200) and
    // crushed every real candle into a sliver. We now drop any tick that is
    // non-positive or deviates >25% from the last close — a single live tick can
    // never realistically move that far, so it is always bad data.
    {
      const ref = lastBar && lastBar.close > 0 ? lastBar.close : price;
      if (!Number.isFinite(price) || price <= 0) return;
      // A single intrabar tick can never realistically move >8% on these
      // instruments. Tightened from 25% → 8%: smaller bad ticks (10–24% off)
      // were slipping through and, folded into the forming bar's high/low over
      // a multi-hour 4h/1h candle, slowly stretched the price scale and crushed
      // every real candle into a sliver "after a few minutes".
      if (ref > 0 && Math.abs(price - ref) / ref > 0.08) return;
      // Also reject corrupt high/low fields on a fresh bar from the provider.
      if (lastBar && Math.floor(liveBar.time) > lastBar.time) {
        const h = lbHigh, l = lbLow;
        if (!Number.isFinite(h) || !Number.isFinite(l) || l <= 0 || h <= 0 ||
            (ref > 0 && (Math.abs(h - ref) / ref > 0.08 || Math.abs(l - ref) / ref > 0.08))) {
          // Provider OHLC is garbage — fold just the (validated) close into a flat bar.
          lbHigh = price; lbLow = price; lbOpen = price;
        }
      }
    }

    // CRITICAL: the data provider's last/forming candle may carry an intraday
    // timestamp AHEAD of our computed bar-boundary (e.g. Yahoo's current 30m bar
    // is stamped 00:08, not 00:00). If we call series.update() with a time that's
    // BEHIND the last bar, LWC throws and the price silently never updates → frozen.
    // So: if our live time isn't strictly after the last bar, fold the live price
    // INTO the last bar (update its high/low/close), keeping a valid ascending time.
    let bar: LegacyOhlcvTuple;
    let t = Math.floor(liveBar.time);
    const intervalSec = getIntervalSec(timeframe);
    // A later observed bar keeps its own timestamp, even after missed intervals.
    // Folding gaps into the last candle pins its timestamp forever: every next
    // event is still more than one interval ahead. Do not fabricate gap bars.
    // In RTH mode, an equity tick that arrives outside 9:30–16:00 ET must NOT
    // open a new (after-hours) candle — that is exactly the floating-fragment
    // artifact. Fold it into the last regular-session bar instead.
    // Tick = point in time → use a 60s window so this stays an exact
    // "is this instant inside 9:30–16:00 ET?" test (not a bar-span overlap).
    const outsideRTH = !extendedHours && intervalSec < 86400 &&
      isEquitySymbol(symbol) && !isRegularSession(t, 60);
    if (lastBar && shouldFoldChartLiveBar(lastBar.time, t, outsideRTH)) {
      t = lastBar.time; // update the current forming candle in place
      bar = {
        time:   t as any,
        open:   lastBar.open,
        high:   Math.max(lastBar.high, price),
        low:    Math.min(lastBar.low, price),
        close:  price,
        volume: Math.max(lastBar.volume, liveBar.volume || 0),
      };
    } else {
      bar = {
        time:   t as any,
        open:   lbOpen,
        high:   lbHigh,
        low:    lbLow,
        close:  price,
        volume: liveBar.volume,
      };
    }

    // ── LIVE DE-SPIKE: cap the forming bar's wicks to a sane multiple of the
    // recent median bar range, so even an in-threshold bad tick can never
    // balloon the candle and squash the price scale during a live session.
    {
      const recent = barsRef.current.slice(-30);
      if (recent.length >= 8) {
        const ranges = recent
          .map(b => b.high - b.low)
          .filter(r => r > 0)
          .sort((a, b) => a - b);
        const med = ranges.length ? ranges[Math.floor(ranges.length / 2)] : 0;
        if (med > 0) {
          const cap = med * 4;
          const maxC = Math.max(bar.open, bar.close);
          const minC = Math.min(bar.open, bar.close);
          // Same change as the historical de-spike above: replace the forming
          // bar rather than editing it. `bar` was built by both branches of the
          // fold just above, so no stored history is touched either way.
          bar = {
            ...bar,
            high: bar.high - maxC > cap ? maxC + cap : bar.high,
            low:  minC - bar.low > cap ? minC - cap : bar.low,
          };
        }
      }
    }

    try {
      candleRef.current.update(bar as any);
      volRef.current.update({
        time:  bar.time,
        value: bar.volume,
        color: bar.close >= bar.open
          ? (chartSettings?.neon ? "rgba(0,255,163,0.70)" : "rgba(0,212,170,0.55)")
          : (chartSettings?.neon ? "rgba(255,46,99,0.70)"  : "rgba(255,77,106,0.55)"),
      } as any);
    } catch {
      // last-resort: if update still rejects, force the price onto the visible
      // last candle so the chart never stays frozen
      try {
        if (lastBar) candleRef.current.update({ ...lastBar, close: price, high: Math.max(lastBar.high, price), low: Math.min(lastBar.low, price) } as any);
      } catch {}
    }

    // ── Live-update registered oscillators (Tape Speed, Exhaustion, flow
    //    histograms, volume) so they visibly move with the in-progress bar ──
    if (oscLiveRef.current.length) {
      const lb = barsRef.current;
      let liveBars: LegacyOhlcvTuple[];
      if (lb.length && lb[lb.length - 1].time === bar.time) liveBars = [...lb.slice(0, -1), bar as LegacyOhlcvTuple];
      else liveBars = [...lb, bar as LegacyOhlcvTuple];
      for (const u of oscLiveRef.current) {
        try {
          const r = u.recompute(liveBars);
          if (r && isFinite(r.value)) {
            const point: any = { time: bar.time, value: r.value };
            if (r.color) point.color = r.color;
            u.series.update(point);
          }
        } catch { /* ignore a single bad recompute */ }
      }
    }

    // ── Live-update Pine Script plots so custom indicators track the
    //    in-progress bar in real time (not a frozen one-shot snapshot) ──
    if (pineCodeRef.current && pineSeriesRef.current.size) {
      const lb = barsRef.current;
      let liveBars: LegacyOhlcvTuple[];
      if (lb.length && lb[lb.length - 1].time === bar.time) liveBars = [...lb.slice(0, -1), bar as LegacyOhlcvTuple];
      else liveBars = [...lb, bar as LegacyOhlcvTuple];
      try {
        const out = interpretPine(pineCodeRef.current, liveBars.map(b => ({
          time: b.time as number, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume || 0,
        })));
        out.plots.forEach(plot => {
          const series = pineSeriesRef.current.get(plot.id);
          const v = plot.values[plot.values.length - 1];
          if (series && v != null && isFinite(v)) {
            const point: any = { time: bar.time, value: v };
            if (plot.style === "histogram" || plot.style === "columns") point.color = plot.color;
            series.update(point);
          }
        });
      } catch { /* ignore a single bad recompute */ }
    }

    setLastPrice(price);
    setCandles(prev => {
      const last = prev[prev.length - 1];
      if (last?.time === bar.time) {
        const next = [...prev];
        next[next.length - 1] = bar;
        barsRef.current = next;
        return next;
      }
      const next = [...prev, bar];
      barsRef.current = next;
      return next;
    });

    // Emit updated bars to parent for Pine Script execution
    if (barsRef.current.length) {
      onBarsReady?.(barsRef.current, barIdentitiesRef.current);
    }
    // NOTE: Big-Trade bubbles spawn in the canvas loop (Pass A) from tickAccRef
    // ONLY — real aggressor tape, never synthetic footprint. No bubble without
    // a qualifying large trade at that price level on that bar.
  }, [liveBar, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── DIRECT live-price poller (guaranteed chart movement) ──────
   * Decisive, self-contained: polls the real quote every 2.5s and forces the
   * price onto the visible last candle using THAT candle's own timestamp — so
   * series.update() can never be rejected for "older than last bar". This is
   * independent of the websocket/tick chain, so even if that path stalls, the
   * chart still tracks live price. Futures use Yahoo ES=F (the only entitled
   * live source); stocks/crypto resolve to their best source server-side.
   ───────────────────────────────────────────────────────────── */
  // NOTE: A second "direct poller" used to live here and also wrote candles.
  // Running it alongside the useWebSocket→liveBar writer appended duplicate bars
  // at mismatched timestamps, which showed as candles DOUBLING / stacking. It is
  // removed: useWebSocket.liveBar (with snap-to-last-bar) is now the SINGLE
  // source of truth for live candle updates. One writer = no doubling.

  /* ── Pine Script series ─────────────────────────────────── */
  useEffect(() => {
    pineCodeRef.current = pineOutput ? pineCode : undefined;
    if (!ready || !chartRef.current || !pineOutput) return;

    (async () => {
      const LW = await import("lightweight-charts");
      // Chart may have been disposed/replaced during the await → bail before touch.
      if (!chartRef.current) return;

      // Clear old Pine series
      pineSeriesRef.current.forEach(series => {
        try { chartRef.current?.removeSeries(series); } catch {}
      });
      pineSeriesRef.current.clear();

      const chart = chartRef.current;
      const bars  = barsRef.current;

      pineOutput.plots.forEach((plot, i) => {
        if (!plot.values.length) return;

        let series: any;
        const isHisto = plot.style === "histogram" || plot.style === "columns";
        const scaleId = plot.overlay ? "right" : `pine-${i}`;

        if (isHisto) {
          series = chart.addSeries(LW.HistogramSeries,{ color: plot.color, priceScaleId: scaleId });
        } else {
          series = chart.addSeries(LW.LineSeries,{
            color:            plot.color,
            lineWidth:        (Math.min(4, plot.linewidth) || 1) as 1 | 2 | 3 | 4,
            lineStyle:        LW.LineStyle.Solid,
            priceLineVisible: false,
            lastValueVisible: true,
            title:            plot.title,
            priceScaleId:     scaleId,
          });
        }

        if (!plot.overlay) {
          chart.priceScale(scaleId).applyOptions({
            scaleMargins: { top: 0.65 + i * 0.08, bottom: 0 },
          });
        }

        const seriesData = bars
          .map((b, idx) => ({ time: b.time as any, value: plot.values[idx] }))
          .filter(d => d.value != null) as { time: any; value: number }[];

        if (seriesData.length) {
          series.setData(isHisto ? seriesData.map(d => ({ ...d, color: plot.color })) : seriesData);
        }
        pineSeriesRef.current.set(plot.id, series);
      });

      // hlines
      pineOutput.hlines.forEach(h => {
        const hs = chart.addSeries(LW.LineSeries,{
          color:            h.color,
          lineWidth:        (h.width || 1) as any,
          lineStyle:        h.style === "dashed" ? LW.LineStyle.Dashed
                          : h.style === "dotted" ? LW.LineStyle.Dotted
                          : LW.LineStyle.Solid,
          priceLineVisible: false,
          lastValueVisible: false,
          title:            h.title,
        });
        hs.setData(bars.map(b => ({ time: b.time as any, value: h.price })));
        pineSeriesRef.current.set(`hline-${h.title}`, hs);
      });

      // ── plotshape / plotchar markers (buy/sell triangles, arrows, flags) ──
      // v5 markers support only circle|square|arrowUp|arrowDown, so Pine's
      // directional shapes (triangleup/arrowup/labelup ↔ triangledown/…) map to
      // arrowUp/arrowDown — the correct buy/sell semantics — and non-directional
      // shapes (cross/xcross/flag) fall back to square. Rendered via a dedicated
      // markers plugin so they coexist with the candle-pattern markers plugin.
      const shapeMarkerShape = (st: string): "circle" | "square" | "arrowUp" | "arrowDown" => {
        if (st === "triangleup" || st === "arrowup" || st === "labelup")   return "arrowUp";
        if (st === "triangledown" || st === "arrowdown" || st === "labeldown") return "arrowDown";
        if (st === "circle") return "circle";
        return "square";
      };
      const shapeMarkerPos = (loc: string, st: string): "aboveBar" | "belowBar" => {
        if (loc === "abovebar" || loc === "top")    return "aboveBar";
        if (loc === "belowbar" || loc === "bottom") return "belowBar";
        return (st.indexOf("down") >= 0) ? "aboveBar" : "belowBar";
      };
      const shapeMarkers: { time: any; position: "aboveBar" | "belowBar"; color: string; shape: "circle" | "square" | "arrowUp" | "arrowDown"; text: string; size: number }[] = [];
      (pineOutput.shapes || []).forEach(sh => {
        (sh.bars || []).forEach(bi => {
          const b = bars[bi];
          if (!b) return;
          shapeMarkers.push({
            time: b.time as any,
            position: shapeMarkerPos(sh.location, sh.style),
            color: sh.color,
            shape: shapeMarkerShape(sh.style),
            text: sh.text || sh.title || "",
            size: 1,
          });
        });
      });
      shapeMarkers.sort((a, b) => (a.time as number) - (b.time as number));
      let markersApplied = false;
      if (candleRef.current) {
        try {
          if (!pineMarkersPluginRef.current) {
            pineMarkersPluginRef.current = LW.createSeriesMarkers(candleRef.current, shapeMarkers);
          } else {
            pineMarkersPluginRef.current.setMarkers(shapeMarkers);
          }
          markersApplied = true;
        } catch { /* series may be mid-teardown */ }
      }
      // Harmless diagnostic snapshot of the last Pine render (plot/hline/marker
      // counts). No PII; useful for verifying custom-indicator rendering.
      // Dev-only — never ships to production.
      if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
        (window as unknown as { __wmPineRender?: unknown }).__wmPineRender = {
          plots: pineOutput.plots.length,
          hlines: pineOutput.hlines.length,
          shapes: (pineOutput.shapes || []).length,
          markers: shapeMarkers.length,
          markerShapes: shapeMarkers.map(m => m.shape),
          markerPositions: shapeMarkers.map(m => m.position),
          markersApplied,
          ts: Date.now(),
        };
      }
    })();

    // Return cleanup so Strict Mode double-fire doesn't orphan Pine series
    return () => {
      pineSeriesRef.current.forEach(series => {
        try { chartRef.current?.removeSeries(series); } catch {}
      });
      pineSeriesRef.current.clear();
      // Clear Pine plotshape markers (empty array) so they don't linger when the
      // script is removed or swapped. Keep the plugin instance for reuse.
      try { pineMarkersPluginRef.current?.setMarkers([]); } catch {}
    };
  }, [pineOutput, pineCode, ready]);

  /* ── Render indicator overlays ─────────────────────────── */
  useEffect(() => {
    if (!ready || !chartRef.current || !barsRef.current?.length) return;
    const chart = chartRef.current;
    const LW    = lwRef.current;            // v5 series definitions
    if (!LW) return;
    // THAT ATOM LANDED, 2026-09-18. `indicators.ts::Bar` is retired and NO ALIAS
    // WAS LEFT BEHIND, so there is deliberately no `IND.LegacyOhlcvTuple` to
    // reach for — `tsc` said so (TS2694) when this comment first claimed there
    // was. This cast now names the artery's type imported directly, which is
    // the whole point of the no-alias rule: the boundary is crossed to the
    // OWNER of the type, not to a module that happens to re-export it.
    // It is still a CAST, and a cast is an assertion the compiler cannot check:
    // `barsRef.current` is whatever the feed handed us, and neither this line
    // nor the type it names can say which session or fidelity those bars carry.
    const bars  = barsRef.current as LegacyOhlcvTuple[];

    // Remove previous indicator series. In v5 removing a series can leave an
    // empty pane behind; we also prune empty panes at the end of this effect.
    indSeriesRef.current.forEach(s => { try { chart.removeSeries(s); } catch {} });
    indSeriesRef.current = [];
    oscLiveRef.current = [];
    // Register a series for live tick updates: recompute pulls fresh values from
    // the current bars and returns the LAST point to update.
    const regLive = (series: any, recompute: (bs: LegacyOhlcvTuple[]) => { value: number; color?: string } | null) => {
      if (series) oscLiveRef.current.push({ series, recompute });
    };

    const closes = bars.map(b => b.close);
    const inds   = activeInds ?? new Set<string>();
    // Per-indicator custom params (length / mult / color) merged with defaults
    const ip = (name: string) => resolveParams(name, indSettings);

    // Helper: overlay line on main price scale
    const addLine = (vals: number[], color: string, width = 1, style = 0, lastVal = false) => {
      try {
        const s = chart.addSeries(LW.LineSeries,{ color, lineWidth: width, lineStyle: style, priceLineVisible: false, lastValueVisible: lastVal, crosshairMarkerVisible: false });
        s.setData(bars.map((b, i) => ({ time: b.time as any, value: vals[i] })).filter(d => isFinite(d.value)));
        indSeriesRef.current.push(s);
        return s;
      } catch { return null; }
    };

    // Helper: histogram on main scale
    const addHist = (vals: number[], color: string) => {
      try {
        const s = chart.addSeries(LW.HistogramSeries,{ color, priceLineVisible: false, lastValueVisible: false });
        s.setData(bars.map((b, i) => ({ time: b.time as any, value: vals[i] })).filter(d => isFinite(d.value)));
        indSeriesRef.current.push(s);
        return s;
      } catch { return null; }
    };

    // ── Native bottom panes (LWC v5) ─────────────────────────
    // Each distinct oscillator scaleId maps to its OWN native pane stacked
    // below the candles. v5 lays out and sizes panes automatically, so we no
    // longer juggle scaleMargins — RSI / Stoch RSI / MACD / CVD / VWAP each
    // get a clean, non-overlapping pane that never shrinks into the candles.
    const paneOf = new Map<string, number>();
    let nextPane = 1; // pane 0 = candles + volume overlay
    const paneFor = (id: string) => {
      let p = paneOf.get(id);
      if (p === undefined) { p = nextPane++; paneOf.set(id, p); }
      return p;
    };
    // Kept for call-site compatibility — pane is assigned lazily on first series.
    const setupScale = (id: string, _top?: number, _bot?: number) => { paneFor(id); };
    const addOsc = (vals: number[], color: string, scaleId: string, width = 1, dashed = false) => {
      try {
        const s = chart.addSeries(LW.LineSeries, { color, lineWidth: width, lineStyle: dashed ? LW.LineStyle.Dashed : LW.LineStyle.Solid, priceLineVisible: false, lastValueVisible: !dashed, crosshairMarkerVisible: false }, paneFor(scaleId));
        s.setData(bars.map((b, i) => ({ time: b.time as any, value: vals[i] })).filter(d => isFinite(d.value)));
        indSeriesRef.current.push(s);
        return s;
      } catch { return null; }
    };
    const addOscHist = (vals: number[], colors: string[] | string, scaleId: string) => {
      try {
        // lastValueVisible → shows the live numeric readout on the pane's price
        // axis (CVD / Speed of Tape / etc.) instead of an animating-but-blank meter.
        const s = chart.addSeries(LW.HistogramSeries, { priceLineVisible: false, lastValueVisible: true }, paneFor(scaleId));
        s.setData(bars.map((b, i) => ({ time: b.time as any, value: vals[i], color: Array.isArray(colors) ? colors[i] : colors })).filter(d => isFinite(d.value)));
        indSeriesRef.current.push(s);
        return s;
      } catch { return null; }
    };
    const refLine = (val: number, scaleId: string, color: string) => addOsc(bars.map(() => val), color, scaleId, 1, true);

    // ── Cumulative-delta CANDLES (TradingView-style CVD) ─────────
    // A cumulative series (running sum) rendered as a per-bar histogram looks
    // like meaningless noise. TradingView draws CVD as CANDLES: each bar's body
    // spans the change in the cumulative total (open = prior cumulative, close =
    // current cumulative), so you read genuine buy/sell structure — green when
    // the cumulative delta rose that bar, red when it fell. Gives real OHLC
    // structure + a live axis readout (lastValueVisible) + a zero-cross line.
    const addCumCandles = (vals: number[], scaleId: string, up = "#00C076", dn = "#FF4D67") => {
      try {
        const s = chart.addSeries(LW.CandlestickSeries, {
          upColor: up, downColor: dn,
          borderUpColor: up, borderDownColor: dn,
          wickUpColor: up, wickDownColor: dn,
          priceLineVisible: false, lastValueVisible: true,
        }, paneFor(scaleId));
        const data = bars.map((b, i) => {
          const close = vals[i];
          const open  = i === 0 ? vals[0] : vals[i - 1];
          return { time: b.time as any, open, high: Math.max(open, close), low: Math.min(open, close), close };
        }).filter(d => isFinite(d.open) && isFinite(d.close));
        s.setData(data);
        indSeriesRef.current.push(s);
        return s;
      } catch { return null; }
    };

    // Skip indicators requiring external data feeds
    const skip = (name: string) => IND.REQUIRES_FEED.has(name) || IND.MTF_INDICATORS.has(name);

    // ── VWAP — now in its OWN native bottom pane (scaleId "vwap") ──────
    // Per user request, VWAP lives in a dedicated pane like RSI/MACD rather
    // than overlaying the candles. The whole VWAP family shares the pane.
    if ((inds.has("VWAP") || inds.has("VWAP Bands")) && visibleAtTf(ip("VWAP"), timeframe)) {
      const vwapVals = IND.vwap(bars);
      addOsc(vwapVals, ip("VWAP").color ?? "#F0B429", "vwap", (ip("VWAP").lineWidth ?? 2));
      if (inds.has("VWAP Bands")) {
        let cumSqDev = 0, cumVol = 0;
        const vwapVals2 = IND.vwap(bars);
        const s1u: number[] = [], s1d: number[] = [], s2u: number[] = [], s2d: number[] = [];
        bars.forEach((b, i) => {
          const tp = (b.high + b.low + b.close) / 3;
          cumVol += b.volume; cumSqDev += b.volume * (tp - vwapVals2[i]) ** 2;
          const sigma = Math.sqrt(Math.max(0, cumVol > 0 ? cumSqDev / cumVol : 0));
          s1u.push(vwapVals2[i] + sigma); s1d.push(vwapVals2[i] - sigma);
          s2u.push(vwapVals2[i] + 2 * sigma); s2d.push(vwapVals2[i] - 2 * sigma);
        });
        addOsc(s1u, "rgba(240,180,41,0.5)", "vwap", 1); addOsc(s1d, "rgba(240,180,41,0.5)", "vwap", 1);
        addOsc(s2u, "rgba(240,180,41,0.3)", "vwap", 1); addOsc(s2d, "rgba(240,180,41,0.3)", "vwap", 1);
      }
    }

    if (inds.has("Anchored VWAP")) addOsc(IND.anchoredVwap(bars, 0), "#FFD700", "vwap", 1);
    if (inds.has("VWAP Deviation Bands")) {
      const v = IND.vwap(bars);
      addOsc(v, "#F0B429", "vwap", 1);
      const sd = IND.stdDev(closes, 20);
      addOsc(v.map((val, i) => val + sd[i]), "rgba(240,180,41,0.4)", "vwap", 1);
      addOsc(v.map((val, i) => val - sd[i]), "rgba(240,180,41,0.4)", "vwap", 1);
    }

    // ── Moving Averages ───────────────────────────────────────
    // ONE material, depth by luminance — see `movingAverageInk` in
    // lib/chart/marketFieldMaterial.ts for why these carry no hue of their own.
    const MA_CFG: { name: string; p: number; fn: (s: number[], p: number) => number[] }[] = [
      { name: "EMA 8",   p: 8,   fn: IND.ema },
      { name: "EMA 9",   p: 9,   fn: IND.ema },
      { name: "EMA 13",  p: 13,  fn: IND.ema },
      { name: "EMA 21",  p: 21,  fn: IND.ema },
      { name: "EMA 34",  p: 34,  fn: IND.ema },
      { name: "EMA 50",  p: 50,  fn: IND.ema },
      { name: "EMA 89",  p: 89,  fn: IND.ema },
      { name: "EMA 144", p: 144, fn: IND.ema },
      { name: "EMA 200", p: 200, fn: IND.ema },
      { name: "SMA 9",   p: 9,   fn: IND.sma },
      { name: "SMA 20",  p: 20,  fn: IND.sma },
      { name: "SMA 50",  p: 50,  fn: IND.sma },
      { name: "SMA 100", p: 100, fn: IND.sma },
      { name: "SMA 200", p: 200, fn: IND.sma },
      { name: "WMA",     p: 20,  fn: IND.wma },
      { name: "HMA",     p: 20,  fn: IND.hma },
      { name: "DEMA",    p: 20,  fn: IND.dema },
      { name: "TEMA",    p: 20,  fn: IND.tema },
      { name: "ZLEMA",   p: 20,  fn: IND.zlema },
    ];
    MA_CFG.forEach(({ name, p, fn }) => {
      if (!inds.has(name)) return;
      const cp = ip(name);                       // custom length/color override
      if (!visibleAtTf(cp, timeframe)) return;    // per-timeframe visibility
      // The ramp reads the EFFECTIVE length, so a re-pointed line lands at the
      // depth it actually represents rather than the depth it shipped with.
      const len = cp.length ?? p;
      addLine(fn(closes, len), cp.color ?? movingAverageInk(len), (cp.lineWidth ?? 1), (cp.lineStyle ?? 0));
    });
    // The same family, minus a configurable length. Each of these smooths over
    // a fixed window baked into IND, so each takes the ramp at THAT window
    // rather than a hue of its own — a magenta ALMA beside a brass EMA 21 is
    // the same rainbow the table above just lost.
    if (inds.has("ALMA"))            addLine(IND.alma(closes),      movingAverageInk(9), 1);
    if (inds.has("T3 Moving Average"))addLine(IND.t3(closes),       movingAverageInk(5), 1);
    if (inds.has("KAMA"))            addLine(IND.kama(closes),      movingAverageInk(10), 1);
    if (inds.has("McGinley Dynamic")) addLine(IND.mcginley(closes),  movingAverageInk(14), 1);
    if (inds.has("VWMA"))            addLine(IND.vwma(bars, 20),    movingAverageInk(20), 1);
    if (inds.has("Moving Average Ribbon")) {
      // A ribbon IS the depth ramp made visible — six EMAs at six depths. Each
      // strand takes its ink from ITS OWN period, read from the same exported
      // array `maRibbon` defaults to, so the colours cannot drift out of step
      // with the periods the way a parallel `cols` list did.
      IND.maRibbon(closes).forEach((v, i) =>
        addLine(v, movingAverageInk(IND.MA_RIBBON_PERIODS[i]), 1));
    }

    // ── Channels / Bands ─────────────────────────────────────
    if (inds.has("Bollinger Bands")) {
      const cp = ip("Bollinger Bands");
      const bb = IND.bollingerBands(closes, cp.length ?? 20, cp.mult ?? 2);
      const col = cp.color ?? "#4FA3E0";
      addLine(bb.upper, hexToRgba(col, 0.7), 1); addLine(bb.mid, hexToRgba(col, 1), 1); addLine(bb.lower, hexToRgba(col, 0.7), 1);
    }
    if (inds.has("Bollinger Band Width")) { setupScale("bbw"); addOsc(IND.bbWidth(closes), "#4FA3E0", "bbw"); }
    if (inds.has("BB Width"))             { setupScale("bbw2"); addOsc(IND.bbWidth(closes), "#4FA3E0", "bbw2"); }
    if (inds.has("Keltner Channel")) {
      const cp = ip("Keltner Channel");
      const kc = IND.keltner(bars, cp.length ?? 20, cp.mult ?? 2);
      const col = cp.color ?? "#8B5CF6";
      addLine(kc.upper, hexToRgba(col, 0.7), 1); addLine(kc.mid, hexToRgba(col, 1), 1); addLine(kc.lower, hexToRgba(col, 0.7), 1);
    }
    if (inds.has("KC Width")) { setupScale("kcw"); addOsc(IND.kcWidth(bars), "#8B5CF6", "kcw"); }
    if (inds.has("Donchian Channel")) {
      const dc = IND.donchian(bars);
      addLine(dc.upper, "rgba(236,72,153,0.7)", 1); addLine(dc.mid, "rgba(236,72,153,1)", 1); addLine(dc.lower, "rgba(236,72,153,0.7)", 1);
    }
    if (inds.has("Donchian Width")) { setupScale("dcw"); addOsc(IND.donchianWidth(bars), "#EC4899", "dcw"); }
    if (inds.has("Envelope")) {
      const env = IND.envelope(closes);
      addLine(env.upper, "rgba(250,204,21,0.6)", 1); addLine(env.mid, "rgba(250,204,21,1)", 1); addLine(env.lower, "rgba(250,204,21,0.6)", 1);
    }
    if (inds.has("Price Channel")) {
      const pc = IND.priceChannel(bars);
      addLine(pc.upper, "rgba(52,211,153,0.6)", 1); addLine(pc.lower, "rgba(52,211,153,0.6)", 1);
    }
    if (inds.has("Linear Regression")) addLine(IND.linearRegression(closes), "#F97316", 1, 2);
    if (inds.has("Linear Regression Channel")) {
      const lr = IND.linearRegressionChannel(closes);
      addLine(lr.upper, "rgba(249,115,22,0.6)", 1); addLine(lr.mid, "rgba(249,115,22,1)", 1); addLine(lr.lower, "rgba(249,115,22,0.6)", 1);
    }
    if (inds.has("Parabolic SAR") || inds.has("Parabolic SAR")) addLine(IND.parabolicSAR(bars), "#F59E0B", 1, 3);
    if (inds.has("Supertrend")) {
      const st = IND.supertrend(bars);
      const bull: number[] = st.line.map((v, i) => st.dir[i] === 1 ? v : NaN);
      const bear: number[] = st.line.map((v, i) => st.dir[i] !== 1 ? v : NaN);
      addLine(bull, "rgba(0,192,118,0.9)", 2); addLine(bear, "rgba(255,77,103,0.9)", 2);
    }
    if (inds.has("Alligator")) {
      const al = IND.alligator(bars);
      addLine(al.jaw, "#4FA3E0", 1); addLine(al.teeth, "#F0B429", 1); addLine(al.lips, "#26a69a", 1);
    }
    if (inds.has("Ichimoku Cloud")) {
      const ich = IND.ichimoku(bars);
      addLine(ich.tenkan, "#ef5350", 1); addLine(ich.kijun, "#2196F3", 1);
      addLine(ich.senkouA, "rgba(0,192,118,0.3)", 1); addLine(ich.senkouB, "rgba(255,77,103,0.3)", 1);
      addLine(ich.chikou, "rgba(150,150,150,0.6)", 1, 2);
    }

    // ── Pivot Points ──────────────────────────────────────────
    for (const [ptType, label] of [["standard","Pivot Points Standard"],["fibonacci","Pivot Points Fibonacci"],["camarilla","Pivot Points Camarilla"],["woodie","Pivot Points Woodie"],["demark","Pivot Points Demark"],["cpr","Pivot Points CPR"]] as const) {
      if (!inds.has(label)) continue;
      const pv = IND.pivotPoints(bars, ptType);
      const cols = { pp: "#F0B429", r1: "#ef5350", r2: "#ef5350", r3: "#ef5350", s1: "#26a69a", s2: "#26a69a", s3: "#26a69a" };
      for (const [key, color] of Object.entries(cols)) {
        const val = (pv as any)[key];
        if (isFinite(val)) addLine(bars.map(() => val), color, 1, 1);
      }
    }
    if (inds.has("Weekly Pivots") || inds.has("Monthly Pivots")) {
      const pv = IND.pivotPoints(bars, "standard");
      addLine(bars.map(() => pv.pp), "#F0B429", 1, 2);
      addLine(bars.map(() => pv.r1), "rgba(239,83,80,0.5)", 1, 1);
      addLine(bars.map(() => pv.s1), "rgba(38,166,154,0.5)", 1, 1);
    }

    // ── Standard Deviation ────────────────────────────────────
    if (inds.has("Standard Deviation")) { setupScale("stddev"); addOsc(IND.stdDev(closes), "#A78BFA", "stddev"); }

    // ── ATR / Volatility ─────────────────────────────────────
    if (inds.has("ATR"))              { setupScale("atr", 0.80); addOsc(IND.atr(bars), "#F97316", "atr"); }
    if (inds.has("Normalized ATR"))   { setupScale("natr", 0.80); addOsc(IND.normalizedAtr(bars), "#FB923C", "natr"); }
    if (inds.has("Historical Volatility")) { setupScale("hvol", 0.80); addOsc(IND.historicalVolatility(closes), "#FCD34D", "hvol"); }
    if (inds.has("Realized Volatility"))   { setupScale("rvola", 0.80); addOsc(IND.historicalVolatility(closes, 10), "#FDE68A", "rvola"); }
    if (inds.has("Chaikin Volatility"))    { setupScale("chv", 0.80); addOsc(IND.roc(IND.atr(bars), 10), "#6EE7B7", "chv"); }
    if (inds.has("Volatility Stop")) {
      const vs = IND.volatilityStop(bars);
      addLine(vs.upper, "rgba(239,83,80,0.5)", 1, 1); addLine(vs.lower, "rgba(38,166,154,0.5)", 1, 1);
    }
    if (inds.has("Mass Index"))   { setupScale("mass"); addOsc(IND.massIndex(bars), "#F472B6", "mass"); }
    if (inds.has("Ulcer Index"))  { setupScale("ulcer"); addOsc(IND.ulcerIndex(closes), "#C084FC", "ulcer"); }
    if (inds.has("Choppiness Index")) { setupScale("chop"); addOsc(IND.choppinessIndex(bars), "#67E8F9", "chop"); refLine(61.8, "chop", "rgba(255,255,255,0.2)"); refLine(38.2, "chop", "rgba(255,255,255,0.2)"); }

    // ── RSI family ───────────────────────────────────────────
    if (inds.has("RSI") && visibleAtTf(ip("RSI"), timeframe)) {
      const cp = ip("RSI");
      setupScale("rsi", 0.75, 0.05);
      addOsc(IND.rsi(closes, cp.length ?? 14), cp.color ?? "#8B5CF6", "rsi", (cp.lineWidth ?? 2));
      refLine(70, "rsi", "rgba(255,77,103,0.25)"); refLine(30, "rsi", "rgba(0,192,118,0.25)"); refLine(50, "rsi", "rgba(255,255,255,0.1)");
    }
    if (inds.has("ConnorsRSI")) {
      setupScale("crsi", 0.75, 0.05);
      addOsc(IND.connorsRsi(closes), "#A78BFA", "crsi");
      refLine(70, "crsi", "rgba(255,77,103,0.25)"); refLine(30, "crsi", "rgba(0,192,118,0.25)");
    }
    if (inds.has("Stoch RSI") || inds.has("Stochastic RSI")) {
      setupScale("srsi", 0.75, 0.05);
      const sr = IND.stochRsi(closes);
      addOsc(sr.k, "#4FA3E0", "srsi"); addOsc(sr.d, "#F0B429", "srsi");
      refLine(80, "srsi", "rgba(255,77,103,0.25)"); refLine(20, "srsi", "rgba(0,192,118,0.25)");
    }
    if (inds.has("Smoothed RSI") || inds.has("Color RSI")) {
      setupScale("smrsi", 0.75, 0.05);
      addOsc(IND.ema(IND.rsi(closes), 3), "#C084FC", "smrsi");
      refLine(70, "smrsi", "rgba(255,77,103,0.25)"); refLine(30, "smrsi", "rgba(0,192,118,0.25)");
    }
    if (inds.has("Volume Weighted RSI")) {
      setupScale("vwrsi", 0.75, 0.05);
      addOsc(IND.volumeWeightedRsi(bars), "#34D399", "vwrsi");
      refLine(70, "vwrsi", "rgba(255,77,103,0.25)"); refLine(30, "vwrsi", "rgba(0,192,118,0.25)");
    }

    // ── Stochastic family ────────────────────────────────────
    if (inds.has("Stochastic")) {
      setupScale("stoch", 0.75, 0.05);
      const st = IND.stochastic(bars);
      addOsc(st.k, "#4FA3E0", "stoch"); addOsc(st.d, "#F0B429", "stoch");
      refLine(80, "stoch", "rgba(255,77,103,0.25)"); refLine(20, "stoch", "rgba(0,192,118,0.25)");
    }
    if (inds.has("Stochastic Momentum Index") || inds.has("Stochastic Pop")) {
      setupScale("smi", 0.75, 0.05);
      const smi = IND.stochasticMomentumIndex(bars);
      addOsc(smi.smi, "#4FA3E0", "smi"); addOsc(smi.signal, "#F0B429", "smi");
      refLine(40, "smi", "rgba(255,77,103,0.25)"); refLine(-40, "smi", "rgba(0,192,118,0.25)");
    }
    if (inds.has("KDJ")) {
      setupScale("kdj", 0.75, 0.05);
      const kd = IND.kdj(bars);
      addOsc(kd.k, "#4FA3E0", "kdj"); addOsc(kd.d, "#F0B429", "kdj"); addOsc(kd.j, "#EC4899", "kdj");
    }
    if (inds.has("Dual Stochastic")) {
      setupScale("dst", 0.75, 0.05);
      const s1 = IND.stochastic(bars, 14); const s2 = IND.stochastic(bars, 5);
      addOsc(s1.k, "#4FA3E0", "dst"); addOsc(s2.k, "#F0B429", "dst");
    }

    // ── MACD family ───────────────────────────────────────────
    if (inds.has("MACD") || inds.has("MACD Histogram") || inds.has("MACD Signal")) {
      setupScale("macd", 0.78);
      const m = IND.macd(closes);
      if (inds.has("MACD") || inds.has("MACD Histogram")) {
        const histColors = m.hist.map(v => v >= 0 ? "rgba(0,192,118,0.7)" : "rgba(255,77,103,0.7)");
        addOscHist(m.hist, histColors, "macd");
      }
      addOsc(m.line,   "#4FA3E0", "macd"); addOsc(m.signal, "#F0B429", "macd");
    }
    if (inds.has("PPO")) {
      setupScale("ppo", 0.78);
      const p = IND.ppo(closes);
      addOscHist(p.hist, p.hist.map(v => v >= 0 ? "rgba(0,192,118,0.6)" : "rgba(255,77,103,0.6)"), "ppo");
      addOsc(p.ppo, "#4FA3E0", "ppo"); addOsc(p.signal, "#F0B429", "ppo");
    }
    if (inds.has("TRIX"))  { setupScale("trix");  addOsc(IND.trix(closes),  "#8B5CF6", "trix");  refLine(0, "trix", "rgba(255,255,255,0.1)"); }
    if (inds.has("DPO"))   { setupScale("dpo");   addOsc(IND.dpo(closes),   "#F0B429", "dpo");   refLine(0, "dpo",  "rgba(255,255,255,0.1)"); }
    if (inds.has("TSI"))   { setupScale("tsi");   addOsc(IND.tsi(closes),   "#A78BFA", "tsi");   refLine(0, "tsi",  "rgba(255,255,255,0.1)"); }

    // ── Oscillators ───────────────────────────────────────────
    if (inds.has("CCI")) {
      setupScale("cci", 0.75, 0.05);
      addOsc(IND.cci(bars), "#06B6D4", "cci");
      refLine(100, "cci", "rgba(255,77,103,0.25)"); refLine(-100, "cci", "rgba(0,192,118,0.25)"); refLine(0, "cci", "rgba(255,255,255,0.1)");
    }
    if (inds.has("Williams %R")) {
      setupScale("willr", 0.75, 0.05);
      addOsc(IND.williamsR(bars), "#EC4899", "willr");
      refLine(-20, "willr", "rgba(255,77,103,0.25)"); refLine(-80, "willr", "rgba(0,192,118,0.25)");
    }
    if (inds.has("Awesome Oscillator")) {
      setupScale("ao", 0.78);
      const ao = IND.awesomeOscillator(bars);
      addOscHist(ao, ao.map((v, i) => v >= (i > 0 ? ao[i-1] : 0) ? "rgba(0,192,118,0.7)" : "rgba(255,77,103,0.7)"), "ao");
    }
    if (inds.has("Accelerator Oscillator")) {
      setupScale("ac", 0.78);
      const ac = IND.acceleratorOscillator(bars);
      addOscHist(ac, ac.map((v, i) => v >= (i > 0 ? ac[i-1] : 0) ? "rgba(0,192,118,0.7)" : "rgba(255,77,103,0.7)"), "ac");
    }
    if (inds.has("Awesome / AC Combo")) {
      setupScale("aoac", 0.78);
      addOsc(IND.awesomeOscillator(bars), "#26a69a", "aoac");
      addOsc(IND.acceleratorOscillator(bars), "#F0B429", "aoac");
    }
    if (inds.has("Rate of Change") || inds.has("ROC")) { setupScale("roc"); addOsc(IND.roc(closes), "#A78BFA", "roc"); refLine(0, "roc", "rgba(255,255,255,0.1)"); }
    if (inds.has("Momentum"))                           { setupScale("mom"); addOsc(IND.momentum(closes), "#F59E0B", "mom"); refLine(0, "mom", "rgba(255,255,255,0.1)"); }
    if (inds.has("Ultimate Oscillator"))  { setupScale("uo"); addOsc(IND.ultimateOscillator(bars), "#67E8F9", "uo"); refLine(70, "uo", "rgba(255,77,103,0.25)"); refLine(30, "uo", "rgba(0,192,118,0.25)"); }
    if (inds.has("Chande Momentum Oscillator")) { setupScale("cmo"); addOsc(IND.chandeMomentum(closes), "#F472B6", "cmo"); refLine(50, "cmo", "rgba(255,77,103,0.25)"); refLine(-50, "cmo", "rgba(0,192,118,0.25)"); }
    if (inds.has("Balance of Power"))  { setupScale("bop"); addOsc(IND.balanceOfPower(bars), "#86EFAC", "bop"); refLine(0, "bop", "rgba(255,255,255,0.1)"); }
    if (inds.has("Elder Ray Index")) {
      setupScale("elder", 0.78);
      const er = IND.elderRayIndex(bars);
      addOsc(er.bull, "#26a69a", "elder"); addOsc(er.bear, "#ef5350", "elder");
    }
    if (inds.has("Force Index"))     { setupScale("fi"); addOsc(IND.forceIndex(bars), "#60A5FA", "fi"); refLine(0, "fi", "rgba(255,255,255,0.1)"); }
    if (inds.has("Relative Vigor Index") || inds.has("RVI (Relative Vigor)") || inds.has("RVGI")) {
      setupScale("rvig", 0.78);
      const rv = IND.rvi(bars);
      addOsc(rv.rvi, "#4FA3E0", "rvig"); addOsc(rv.signal, "#F0B429", "rvig");
    }
    if (inds.has("Coppock Curve"))   { setupScale("cop"); addOsc(IND.coppockCurve(closes), "#C084FC", "cop"); refLine(0, "cop", "rgba(255,255,255,0.1)"); }
    if (inds.has("Fisher Transform") || inds.has("Ehlers Fisher")) {
      setupScale("fish", 0.78);
      const ft = IND.fisherTransform(bars);
      addOsc(ft.fisher, "#F97316", "fish"); addOsc(ft.signal, "#4FA3E0", "fish");
    }
    if (inds.has("Vortex Indicator")) {
      setupScale("vortex", 0.78);
      const vi = IND.vortex(bars);
      addOsc(vi.viPlus, "#26a69a", "vortex"); addOsc(vi.viMinus, "#ef5350", "vortex");
    }
    if (inds.has("Aroon Oscillator") || inds.has("Aroon Up/Down")) {
      setupScale("aroon", 0.78);
      const ar = IND.aroon(bars);
      if (inds.has("Aroon Up/Down")) { addOsc(ar.up, "#26a69a", "aroon"); addOsc(ar.down, "#ef5350", "aroon"); }
      else addOsc(ar.osc, "#4FA3E0", "aroon");
    }
    if (inds.has("ADX") || inds.has("DMI")) {
      setupScale("adx", 0.78);
      const ad = IND.adx(bars);
      addOsc(ad.adx, "#F0B429", "adx"); addOsc(ad.diPlus, "#26a69a", "adx"); addOsc(ad.diMinus, "#ef5350", "adx");
      refLine(25, "adx", "rgba(255,255,255,0.15)");
    }
    if (inds.has("TTM Squeeze") || inds.has("Squeeze Momentum")) {
      setupScale("ttm", 0.78);
      const ttm = IND.ttmSqueeze(bars);
      addOscHist(ttm.hist, ttm.hist.map((v, i) => {
        if (ttm.squeeze[i]) return v >= 0 ? "#26a69a" : "#ef5350";
        return v >= 0 ? "rgba(38,166,154,0.4)" : "rgba(239,83,80,0.4)";
      }), "ttm");
    }
    if (inds.has("Schaff Trend Cycle")) {
      setupScale("stc", 0.78);
      addOsc(IND.schaffTrendCycle(closes), "#F0B429", "stc");
      refLine(75, "stc", "rgba(255,77,103,0.25)"); refLine(25, "stc", "rgba(0,192,118,0.25)");
    }
    if (inds.has("Waddah Attar Explosion")) {
      setupScale("wae", 0.78);
      const m1 = IND.macd(closes, 20, 40, 9); const bb2 = IND.bollingerBands(closes);
      const tup = m1.hist.map((v, i) => v > 0 ? Math.abs(bb2.upper[i] - bb2.lower[i]) : NaN);
      const tdn = m1.hist.map((v, i) => v < 0 ? Math.abs(bb2.upper[i] - bb2.lower[i]) : NaN);
      addOscHist(tup, "rgba(0,192,118,0.7)", "wae"); addOscHist(tdn, "rgba(255,77,103,0.7)", "wae");
    }
    if (inds.has("Choppiness Index"))   { setupScale("chopi"); addOsc(IND.choppinessIndex(bars), "#67E8F9", "chopi"); refLine(61.8, "chopi", "rgba(255,77,103,0.2)"); refLine(38.2, "chopi", "rgba(0,192,118,0.2)"); }

    // ── Volume indicators ─────────────────────────────────────
    if (inds.has("OBV"))              { setupScale("obv"); addOsc(IND.obv(bars), "#F97316", "obv"); }
    // CVD: cumulative delta is unbounded and drifts far from 0 on long/24h
    // series (BTC etc.). A constant refLine(0) would force 0 into the pane's
    // autoscale range every frame, pinning the candles to one edge. Rebase the
    // series to its visible-window start so 0 is meaningful, and let the candles
    // autoscale to their own range — no forced reference line.
    if (inds.has("CVD"))              { setupScale("cvd"); addCumCandles(IND.cvd(bars), "cvd"); refLine(0, "cvd", "rgba(255,255,255,0.22)"); }
    if (inds.has("CVD Oscillator"))   { setupScale("cvdosc"); addOsc(IND.cvdOscillator(bars), "#F0B429", "cvdosc"); refLine(0, "cvdosc", "rgba(255,255,255,0.1)"); }
    if (inds.has("MFI") || inds.has("Money Flow Index")) {
      setupScale("mfi", 0.78);
      addOsc(IND.mfi(bars), "#10B981", "mfi");
      refLine(80, "mfi", "rgba(255,77,103,0.25)"); refLine(20, "mfi", "rgba(0,192,118,0.25)");
    }
    if (inds.has("Chaikin Money Flow"))  { setupScale("cmf"); addOsc(IND.chaikinMoneyFlow(bars), "#06B6D4", "cmf"); refLine(0, "cmf", "rgba(255,255,255,0.15)"); }
    if (inds.has("Chaikin Oscillator"))  { setupScale("cho"); addOsc(IND.chaikinOscillator(bars), "#38BDF8", "cho"); refLine(0, "cho", "rgba(255,255,255,0.1)"); }
    if (inds.has("Accumulation/Distribution")) { setupScale("ad"); addOsc(IND.accumDist(bars), "#FB923C", "ad"); }
    if (inds.has("Ease of Movement"))    { setupScale("eom"); addOsc(IND.easeOfMovement(bars), "#A3E635", "eom"); refLine(0, "eom", "rgba(255,255,255,0.1)"); }
    if (inds.has("Klinger Oscillator")) {
      setupScale("klinger", 0.78);
      const kl = IND.klingerOscillator(bars);
      addOsc(kl.osc, "#4FA3E0", "klinger"); addOsc(kl.signal, "#F0B429", "klinger");
    }
    if (inds.has("Price Volume Trend")) { setupScale("pvt"); addOsc(IND.pvt(bars), "#F472B6", "pvt"); }
    if (inds.has("Negative Volume Index")) { setupScale("nvi"); addOsc(IND.nvi(bars), "#86EFAC", "nvi"); }
    if (inds.has("Positive Volume Index")) { setupScale("pvi"); addOsc(IND.pvi(bars), "#FCA5A5", "pvi"); }
    if (inds.has("Volume Oscillator"))     { setupScale("volosc"); addOsc(IND.volumeOscillator(bars), "#C084FC", "volosc"); refLine(0, "volosc", "rgba(255,255,255,0.1)"); }
    if (inds.has("RVOL"))                  { setupScale("rvol"); addOsc(IND.rvol(bars), "#FCD34D", "rvol"); refLine(1, "rvol", "rgba(255,255,255,0.2)"); }
    if (inds.has("Volume MA")) {
      const vols = bars.map(b => b.volume);
      addLine(IND.sma(vols, 20).map((v, i) => v / bars[i].volume), "rgba(150,150,255,0.5)", 1);
    }
    if (inds.has("Volume Weighted RSI"))   { setupScale("vwrsiosc"); addOsc(IND.volumeWeightedRsi(bars), "#34D399", "vwrsiosc"); }

    // ── Trend / Directional ───────────────────────────────────
    if (inds.has("Linear Regression Slope")) { setupScale("lrslope"); addOsc(IND.linearRegressionSlope(closes), "#F0B429", "lrslope"); refLine(0, "lrslope", "rgba(255,255,255,0.1)"); }
    if (inds.has("Z-Score"))                 { setupScale("zscore"); addOsc(IND.zScore(closes), "#A78BFA", "zscore"); refLine(2, "zscore", "rgba(255,77,103,0.2)"); refLine(-2, "zscore", "rgba(0,192,118,0.2)"); refLine(0, "zscore", "rgba(255,255,255,0.1)"); }
    if (inds.has("Percentile Rank"))         { setupScale("prank"); addOsc(IND.percentileRank(closes), "#67E8F9", "prank"); }

    // ── SMC / Price Action overlays ───────────────────────────
    if (inds.has("Fair Value Gaps")) {
      try {
        const fvgs = IND.fairValueGaps(bars);
        fvgs.slice(-30).forEach(g => {
          const idx = bars.findIndex(b => b.time === g.time);
          if (idx < 0) return;
          const color = g.bull ? "rgba(0,192,118,0.12)" : "rgba(255,77,103,0.12)";
          const s = chart.addSeries(LW.LineSeries,{ color: g.bull ? "#26a69a" : "#ef5350", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          s.setData([{ time: bars[idx].time as any, value: g.top }, ...bars.slice(idx).map(b => ({ time: b.time as any, value: g.top }))]);
          indSeriesRef.current.push(s);
          const s2 = chart.addSeries(LW.LineSeries,{ color: g.bull ? "#26a69a" : "#ef5350", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          s2.setData([{ time: bars[idx].time as any, value: g.bot }, ...bars.slice(idx).map(b => ({ time: b.time as any, value: g.bot }))]);
          indSeriesRef.current.push(s2);
        });
      } catch {}
    }
    if (inds.has("Swing High/Low")) {
      const swings = IND.swingHighLow(bars, CHART_SWING_LOOKBACK);
      swings.highs.forEach(h => {
        const s = chart.addSeries(LW.LineSeries,{ color: "#ef5350", lineWidth: 1, lineStyle: 3, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        s.setData([{ time: h.time as any, value: h.price }]);
        indSeriesRef.current.push(s);
      });
    }
    if (inds.has("Prior Day High/Low") || inds.has("Daily Candle Levels")) {
      const pdhl = IND.priorDayHighLow(bars);
      addLine(pdhl.high, "rgba(239,83,80,0.5)", 1, 1); addLine(pdhl.low, "rgba(38,166,154,0.5)", 1, 1);
    }
    if (inds.has("Opening Range Breakout")) {
      const orb = IND.openingRangeBreakout(bars);
      addLine(orb.high, "rgba(251,191,36,0.7)", 1, 2); addLine(orb.low, "rgba(251,191,36,0.7)", 1, 2);
    }
    if (inds.has("Pre-Market High/Low")) {
      // Use prior day range as approximation
      const pdhl = IND.priorDayHighLow(bars);
      addLine(pdhl.high, "rgba(139,92,246,0.5)", 1, 2); addLine(pdhl.low, "rgba(139,92,246,0.5)", 1, 2);
    }

    // ── Speed of Tape (tape aggression velocity) ──────────────
    // Measures ask−bid ratio per bar as a fast/slow proxy for HFT tape speed.
    // Green bars = aggressive buying tape, purple = aggressive selling tape.
    if (inds.has("Speed of Tape")) {
      setupScale("sot", 0.75);
      const sotCompute = (bs: LegacyOhlcvTuple[]) => {
        const bodies = bs.map(b => Math.abs(b.close - b.open)).filter(r => r > 0).sort((a, b) => a - b);
        const scale = Math.max(bodies.length ? bodies[Math.floor(bodies.length / 2)] : 1, 1e-9);
        return bs.map(b => 100 * Math.tanh(((b.close - b.open) / scale) * 0.75));
      };
      const normalized = sotCompute(bars);
      const s = addOscHist(normalized, normalized.map(v => v >= 0 ? "rgba(0,229,204,0.75)" : "rgba(123,108,247,0.75)"), "sot");
      refLine(0, "sot", "rgba(255,255,255,0.10)");
      regLive(s, (bs) => { const a = sotCompute(bs); const v = a[a.length - 1]; return isFinite(v) ? { value: v, color: v >= 0 ? "rgba(0,229,204,0.75)" : "rgba(123,108,247,0.75)" } : null; });
    }

    // ── Absorption Detector ────────────────────────────────────
    // Detects when price has high volume but tiny range — large orders
    // absorbing the opposing side. Shown as a histogram where high = strong absorption.
    if (inds.has("Absorption Detector")) {
      setupScale("abs", 0.75);
      const absCompute = (bs: LegacyOhlcvTuple[]) => {
        const avgVol = bs.reduce((s, b) => s + b.volume, 0) / Math.max(1, bs.length);
        return bs.map(b => {
          const range = b.high - b.low;
          if (range === 0) return 0;
          const volRatio = b.volume / Math.max(1, avgVol);
          const priceDev = range / Math.max(0.01, b.close * 0.001);
          const score = volRatio / Math.max(1, priceDev);
          return Math.min(100, score * 30);
        });
      };
      const absVals = absCompute(bars);
      const absColor = (b: LegacyOhlcvTuple, v: number) => v > 50 ? (b.close >= b.open ? "rgba(0,229,204,0.85)" : "rgba(123,108,247,0.85)") : "rgba(100,120,160,0.35)";
      const s = addOscHist(absVals, bars.map((b, i) => absColor(b, absVals[i])), "abs");
      refLine(50, "abs", "rgba(240,180,41,0.30)");
      regLive(s, (bs) => { const a = absCompute(bs); const v = a[a.length - 1]; const b = bs[bs.length - 1]; return (isFinite(v) && b) ? { value: v, color: absColor(b, v) } : null; });
    }

    // ── Delta Bars (order flow coloring via existing footprint) ─
    if (inds.has("Delta Bars")) {
      setupScale("deltabars", 0.75);
      const dbCompute = (bs: LegacyOhlcvTuple[]) => {
        const deltas = bs.map(b => {
          const dir = b.close >= b.open ? 1 : -1;
          return b.volume * dir * (Math.abs(b.close - b.open) / Math.max(0.01, b.high - b.low));
        });
        const absMaxD = Math.max(...deltas.map(Math.abs), 1);
        return deltas.map(v => (v / absMaxD) * 100);
      };
      const norm = dbCompute(bars);
      const s = addOscHist(norm, norm.map(v => v >= 0 ? "rgba(64,196,255,0.75)" : "rgba(244,143,177,0.75)"), "deltabars");
      refLine(0, "deltabars", "rgba(255,255,255,0.10)");
      regLive(s, (bs) => { const a = dbCompute(bs); const v = a[a.length - 1]; return isFinite(v) ? { value: v, color: v >= 0 ? "rgba(64,196,255,0.75)" : "rgba(244,143,177,0.75)" } : null; });
    }

    // ── Volume Histogram ─────────────────────────────────────
    if (inds.has("Volume")) {
      setupScale("vol_hist", 0.80);
      const volVals = bars.map(b => b.volume);
      const s = addOscHist(volVals, bars.map(b => b.close >= b.open ? "rgba(0,229,204,0.65)" : "rgba(206,147,216,0.65)"), "vol_hist");
      regLive(s, (bs) => { const b = bs[bs.length - 1]; return b ? { value: b.volume, color: b.close >= b.open ? "rgba(0,229,204,0.65)" : "rgba(206,147,216,0.65)" } : null; });
    }

    // ── Volume Delta (alias to Delta Bars) ───────────────────
    if (inds.has("Volume Delta")) {
      setupScale("voldelta", 0.75);
      const vdCompute = (bs: LegacyOhlcvTuple[]) => {
        // Net buying/selling pressure. The feed streams PRICE, not per-tick volume,
        // so the forming bar's volume is static — a pure volume metric freezes.
        // Drive the live magnitude from bar-to-bar price velocity (moves every tick),
        // signed by direction, and weight by relative volume so genuine high-volume
        // moves read stronger. Bounded via tanh so it can never pin.
        const deltas = bs.map((b, i) => i > 0 ? b.close - bs[i - 1].close : 0);
        const mags = deltas.map(Math.abs).filter(v => v > 0).sort((a, b) => a - b);
        // p85 scale (not median): a median scale saturates because half of all
        // moves exceed it; p85 keeps typical live swings inside tanh's linear region.
        const scale = Math.max(mags.length ? mags[Math.floor(mags.length * 0.85)] : 1, 1e-9);
        return deltas.map(d => 100 * Math.tanh((d / scale) * 0.9));
      };
      const norm = vdCompute(bars);
      const s = addOscHist(norm, norm.map(v => v >= 0 ? "rgba(64,196,255,0.75)" : "rgba(244,143,177,0.75)"), "voldelta");
      refLine(0, "voldelta", "rgba(255,255,255,0.10)");
      regLive(s, (bs) => { const a = vdCompute(bs); const v = a[a.length - 1]; return isFinite(v) ? { value: v, color: v >= 0 ? "rgba(64,196,255,0.75)" : "rgba(244,143,177,0.75)" } : null; });
    }

    // ── Trade Flow (directional volume flow) ─────────────────
    if (inds.has("Trade Flow")) {
      setupScale("tradeflow", 0.75);
      const tfCompute = (bs: LegacyOhlcvTuple[]) => {
        // Directional flow: sign from the bar body (close vs open), magnitude from
        // bar-to-bar price velocity (live-responsive), volume-weighted. Bounded.
        const deltas = bs.map((b, i) => i > 0 ? b.close - bs[i - 1].close : 0);
        const mags = deltas.map(Math.abs).filter(v => v > 0).sort((a, b) => a - b);
        const scale = Math.max(mags.length ? mags[Math.floor(mags.length * 0.85)] : 1, 1e-9);
        return bs.map((b, i) => {
          const dir = b.close >= b.open ? 1 : -1;
          return 100 * Math.tanh((Math.abs(deltas[i]) / scale) * 0.9) * dir;
        });
      };
      const normFlow = tfCompute(bars);
      const s = addOscHist(normFlow, normFlow.map(v => v >= 0 ? "rgba(0,229,204,0.70)" : "rgba(206,147,216,0.70)"), "tradeflow");
      refLine(0, "tradeflow", "rgba(255,255,255,0.10)");
      regLive(s, (bs) => { const a = tfCompute(bs); const v = a[a.length - 1]; return isFinite(v) ? { value: v, color: v >= 0 ? "rgba(0,229,204,0.70)" : "rgba(206,147,216,0.70)" } : null; });
    }

    // ── Tape Speed (alias to Speed of Tape calculation) ──────
    if (inds.has("Tape Speed")) {
      setupScale("tapespeed", 0.75);
      // Price-velocity tape speed: driven by the live bar's body (close−open),
      // scaled by the MEDIAN bar range (stable — a freshly-formed bar with a tiny
      // range can no longer saturate the scale), lightly weighted by volume.
      const tsCompute = (bs: LegacyOhlcvTuple[]) => {
        // Tape speed = rate of price change bar-to-bar (bounded, moves every tick,
        // never pins like an unbounded forming-bar body would).
        const deltas = bs.map((b, i) => i > 0 ? b.close - bs[i - 1].close : 0);
        const mags = deltas.map(Math.abs).filter(v => v > 0).sort((a, b) => a - b);
        const scale = Math.max(mags.length ? mags[Math.floor(mags.length * 0.85)] : 1, 1e-9);
        return deltas.map(d => 100 * Math.tanh((d / scale) * 0.9));
      };
      const normT = tsCompute(bars);
      const s = addOscHist(normT, normT.map(v => v >= 0 ? "rgba(0,229,204,0.70)" : "rgba(206,147,216,0.70)"), "tapespeed");
      refLine(0, "tapespeed", "rgba(255,255,255,0.10)");
      regLive(s, (bs) => { const a = tsCompute(bs); const v = a[a.length - 1]; return isFinite(v) ? { value: v, color: v >= 0 ? "rgba(0,229,204,0.70)" : "rgba(206,147,216,0.70)" } : null; });
    }

    // ── Buy/Sell Volume Columns ──────────────────────────────
    if (inds.has("Buy/Sell Volume Columns")) {
      setupScale("bsvol", 0.80);
      const buyVol  = bars.map(b => b.close >= b.open ? b.volume : 0);
      const sellVol = bars.map(b => b.close < b.open ? -b.volume : 0);
      const sb = addOscHist(buyVol, "rgba(0,229,204,0.65)", "bsvol");
      const ss = addOscHist(sellVol, "rgba(206,147,216,0.65)", "bsvol");
      refLine(0, "bsvol", "rgba(255,255,255,0.10)");
      regLive(sb, (bs) => { const b = bs[bs.length - 1]; return b ? { value: b.close >= b.open ? b.volume : 0 } : null; });
      regLive(ss, (bs) => { const b = bs[bs.length - 1]; return b ? { value: b.close < b.open ? -b.volume : 0 } : null; });
    }

    // ── Exhaustion Detector ──────────────────────────────────
    // High volume + small price move = buying/selling exhaustion
    if (inds.has("Exhaustion Detector")) {
      setupScale("exhaust", 0.78);
      const exCompute = (bs: LegacyOhlcvTuple[]) => {
        // The feed streams PRICE, not per-tick volume, so a volume-vs-move ratio
        // freezes on the forming bar. Derive exhaustion from PRICE ACTION instead:
        // a strong recent trend (momentum over the last N bars) whose latest bar
        // velocity has collapsed = the move is running out of steam. Signed by the
        // trend direction so up-exhaustion vs down-exhaustion is distinguishable.
        const N = 8;
        const deltas = bs.map((b, i) => i > 0 ? b.close - bs[i - 1].close : 0);
        const mags = deltas.map(Math.abs).filter(v => v > 0).sort((a, b) => a - b);
        const scale = Math.max(mags.length ? mags[Math.floor(mags.length * 0.85)] : 1, 1e-9);
        return bs.map((b, i) => {
          if (i < N) return 0;
          const window = bs.slice(i - N, i + 1);
          const trend = window[window.length - 1].close - window[0].close; // net move
          const trendMag = Math.min(1, Math.abs(trend) / (scale * N)); // 0..1 strength
          const curVel = Math.abs(deltas[i]) / scale;                   // latest velocity
          // Exhaustion rises when the trend was strong but current velocity is low.
          const score = trendMag * Math.max(0, 1 - Math.min(1, curVel));
          const dir = trend >= 0 ? 1 : -1;
          return 100 * Math.tanh(score * 2.0) * dir;
        });
      };
      const exVals = exCompute(bars);
      const exColor = (_b: LegacyOhlcvTuple, v: number) => Math.abs(v) > 5 ? (v >= 0 ? "rgba(0,229,204,0.80)" : "rgba(206,147,216,0.80)") : "rgba(100,100,120,0.20)";
      const s = addOscHist(exVals, bars.map((b, i) => exColor(b, exVals[i])), "exhaust");
      refLine(30, "exhaust", "rgba(240,180,41,0.25)");
      regLive(s, (bs) => { const a = exCompute(bs); const v = a[a.length - 1]; const b = bs[bs.length - 1]; return (isFinite(v) && b) ? { value: v, color: exColor(b, v) } : null; });
    }

    // ── Stop Run Alert (price breach then reversal) ───────────
    if (inds.has("Stop Run Alert")) {
      setupScale("stoprun", 0.78);
      const stopVals = bars.map((b, i) => {
        if (i < 5) return 0;
        const prev5 = bars.slice(i - 5, i);
        const prevHigh = Math.max(...prev5.map(p => p.high));
        const prevLow  = Math.min(...prev5.map(p => p.low));
        // Price briefly exceeded the level then closed back inside
        const brokeUp   = b.high > prevHigh && b.close < prevHigh ? 1 : 0;
        const brokeDown = b.low < prevLow   && b.close > prevLow  ? -1 : 0;
        return (brokeUp + brokeDown) * 100;
      });
      addOscHist(stopVals, stopVals.map(v => v > 0 ? "rgba(0,229,204,0.85)" : v < 0 ? "rgba(206,147,216,0.85)" : "rgba(100,100,120,0.10)"), "stoprun");
      refLine(0, "stoprun", "rgba(255,255,255,0.10)");
    }

    // ── Prior Week High/Low ──────────────────────────────────
    if (inds.has("Prior Week High/Low")) {
      // Use the earliest and latest 20% of bars as a proxy for prior week levels
      if (bars.length > 10) {
        const weekSlice = bars.slice(-Math.min(bars.length, 40), -Math.min(bars.length, 5));
        if (weekSlice.length > 0) {
          const pwHigh = Math.max(...weekSlice.map(b => b.high));
          const pwLow  = Math.min(...weekSlice.map(b => b.low));
          addLine(bars.map(() => pwHigh), "rgba(251,191,36,0.55)", 1, 2);
          addLine(bars.map(() => pwLow),  "rgba(251,191,36,0.55)", 1, 2);
        }
      }
    }

    // ── Session Separators ────────────────────────────────────
    if (inds.has("Session Separators")) {
      // Add vertical line at every day boundary (midnight UTC)
      try {
        let prevDay = -1;
        bars.forEach(b => {
          const day = Math.floor(b.time / 86400);
          if (day !== prevDay && prevDay !== -1) {
            const vs = chart.addSeries(LW.LineSeries,{ color: "rgba(100,120,160,0.25)", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
            const currB = bars.find(bb => Math.floor(bb.time / 86400) === day);
            if (currB) {
              vs.setData([{ time: b.time as any, value: currB.close }]);
            }
            indSeriesRef.current.push(vs);
          }
          prevDay = day;
        });
      } catch {}
    }

    // ── Break of Structure (BOS) — last 5 breaks only ────────
    if (inds.has("Break of Structure")) {
      try {
        const swingLookback = 10;
        const bosEvents: { price: number; dir: "up" | "dn"; startIdx: number }[] = [];
        bars.forEach((b, i) => {
          if (i < swingLookback * 2) return;
          const prev = bars.slice(i - swingLookback, i);
          const prevHigh = Math.max(...prev.map(p => p.high));
          const prevLow  = Math.min(...prev.map(p => p.low));
          if (b.close > prevHigh) bosEvents.push({ price: prevHigh, dir: "up", startIdx: i });
          if (b.close < prevLow)  bosEvents.push({ price: prevLow,  dir: "dn", startIdx: i });
        });
        // Only draw last 5 to keep chart clean
        bosEvents.slice(-5).forEach(ev => {
          const color = ev.dir === "up" ? "rgba(0,229,204,0.80)" : "rgba(206,147,216,0.80)";
          const slice = bars.slice(ev.startIdx);
          if (slice.length < 2) return;
          const s = chart.addSeries(LW.LineSeries,{ color, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          s.setData(slice.map(bb => ({ time: bb.time as any, value: ev.price })));
          indSeriesRef.current.push(s);
        });
      } catch {}
    }

    // ── Order Block Finder — last 5 blocks only ──────────────
    if (inds.has("Order Block Finder")) {
      try {
        const avgRange = bars.reduce((s, b) => s + (b.high - b.low), 0) / Math.max(1, bars.length);
        const obBlocks: { top: number; bot: number; bull: boolean; startIdx: number }[] = [];
        bars.forEach((b, i) => {
          if (i < 3 || i > bars.length - 4) return;
          const next3 = bars.slice(i + 1, i + 4);
          const move = Math.abs(next3[next3.length - 1]?.close - b.close);
          if (move < avgRange * 2) return;
          const isBullMove = next3[next3.length - 1]?.close > b.close;
          const isOB = isBullMove ? b.close < b.open : b.close > b.open;
          if (!isOB) return;
          obBlocks.push({ top: Math.max(b.open, b.close), bot: Math.min(b.open, b.close), bull: isBullMove, startIdx: i });
        });
        obBlocks.slice(-5).forEach(ob => {
          const color = ob.bull ? "rgba(0,229,204,0.65)" : "rgba(206,147,216,0.65)";
          const slice = bars.slice(ob.startIdx);
          if (slice.length < 2) return;
          const sT = chart.addSeries(LW.LineSeries,{ color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          sT.setData(slice.map(bb => ({ time: bb.time as any, value: ob.top })));
          indSeriesRef.current.push(sT);
          const sB = chart.addSeries(LW.LineSeries,{ color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          sB.setData(slice.map(bb => ({ time: bb.time as any, value: ob.bot })));
          indSeriesRef.current.push(sB);
        });
      } catch {}
    }

    // ── Candle Pattern Detectors — use setMarkers for efficiency ─
    // Collect all patterns into a single markers array then apply once
    {
      const patternMarkers: { time: any; position: "aboveBar" | "belowBar"; color: string; shape: "circle" | "arrowUp" | "arrowDown"; text: string; size: number }[] = [];
      // Large Trade Filter threshold: 2.5× the average bar volume across loaded bars.
      const volsForThresh = bars.map(b => b.volume || 0).filter(v => v > 0);
      const avgVolForThresh = volsForThresh.length ? volsForThresh.reduce((s, v) => s + v, 0) / volsForThresh.length : 0;
      const largeVolThresh = avgVolForThresh * 2.5;
      bars.forEach((b, i) => {
        const range = b.high - b.low;
        const body  = Math.abs(b.close - b.open);
        const up    = b.close >= b.open;
        const lowerWick = Math.min(b.open, b.close) - b.low;
        const upperWick = b.high - Math.max(b.open, b.close);

        // Doji: body < 10% of range
        if (inds.has("Doji Detector") && range > 0 && body / range < 0.10) {
          patternMarkers.push({ time: b.time as any, position: "aboveBar", color: "#F0B429", shape: "circle", text: "D", size: 0.8 });
        }

        // Engulfing
        if (inds.has("Engulfing Pattern") && i > 0) {
          const prev = bars[i - 1];
          const bullEng = up && !( prev.close >= prev.open) && b.open < prev.close && b.close > prev.open;
          const bearEng = !up && (prev.close >= prev.open) && b.open > prev.close && b.close < prev.open;
          if (bullEng) patternMarkers.push({ time: b.time as any, position: "belowBar", color: "#00E5CC", shape: "arrowUp",   text: "E", size: 0.8 });
          if (bearEng) patternMarkers.push({ time: b.time as any, position: "aboveBar", color: "#CE93D8", shape: "arrowDown", text: "E", size: 0.8 });
        }

        // Hammer / Shooting Star
        if (inds.has("Hammer / Shooting Star") && range > 0) {
          const isHammer = lowerWick > body * 2 && upperWick < body * 0.5;
          const isStar   = upperWick > body * 2 && lowerWick < body * 0.5;
          if (isHammer) patternMarkers.push({ time: b.time as any, position: "belowBar", color: "#00E5CC", shape: "arrowUp",   text: "H", size: 0.8 });
          if (isStar)   patternMarkers.push({ time: b.time as any, position: "aboveBar", color: "#CE93D8", shape: "arrowDown", text: "S", size: 0.8 });
        }

        // Pin Bar
        if (inds.has("Pin Bar") && range > 0) {
          const bodyMin = body || 0.0001;
          const isBullPin = lowerWick > bodyMin * 2.5 && lowerWick > upperWick * 2;
          const isBearPin = upperWick > bodyMin * 2.5 && upperWick > lowerWick * 2;
          if (isBullPin) patternMarkers.push({ time: b.time as any, position: "belowBar", color: "#69FFDA", shape: "arrowUp",   text: "P", size: 0.7 });
          if (isBearPin) patternMarkers.push({ time: b.time as any, position: "aboveBar", color: "#D4BAFF", shape: "arrowDown", text: "P", size: 0.7 });
        }

        // Inside Bar
        if (inds.has("Inside Bar") && i > 0) {
          const prev = bars[i - 1];
          if (b.high < prev.high && b.low > prev.low)
            patternMarkers.push({ time: b.time as any, position: "aboveBar", color: "#F0B429", shape: "circle", text: "IB", size: 0.6 });
        }

        // Three White Soldiers — 3 consecutive rising bulls, each opening inside the
        // prior real body and closing near its high (strong continuation up).
        if (inds.has("Three White Soldiers") && i >= 2) {
          const a = bars[i - 2], c = bars[i - 1], d = b;
          const bull = (x: LegacyOhlcvTuple) => x.close > x.open;
          const strongClose = (x: LegacyOhlcvTuple) => (x.high - x.close) < (x.high - x.low) * 0.35;
          if (bull(a) && bull(c) && bull(d) &&
              c.close > a.close && d.close > c.close &&
              c.open > a.open && c.open < a.close &&
              d.open > c.open && d.open < c.close &&
              strongClose(c) && strongClose(d)) {
            patternMarkers.push({ time: b.time as any, position: "belowBar", color: "#00E5CC", shape: "arrowUp", text: "3WS", size: 1 });
          }
        }

        // Three Black Crows — 3 consecutive falling bears, mirror of 3WS.
        if (inds.has("Three Black Crows") && i >= 2) {
          const a = bars[i - 2], c = bars[i - 1], d = b;
          const bear = (x: LegacyOhlcvTuple) => x.close < x.open;
          const strongClose = (x: LegacyOhlcvTuple) => (x.close - x.low) < (x.high - x.low) * 0.35;
          if (bear(a) && bear(c) && bear(d) &&
              c.close < a.close && d.close < c.close &&
              c.open < a.open && c.open > a.close &&
              d.open < c.open && d.open > c.close &&
              strongClose(c) && strongClose(d)) {
            patternMarkers.push({ time: b.time as any, position: "aboveBar", color: "#CE93D8", shape: "arrowDown", text: "3BC", size: 1 });
          }
        }

        // Morning / Evening Star — 3-candle reversal: big body, small "star" body
        // that gaps in the trend direction, then a big body closing past the
        // midpoint of the first candle (reverses the move).
        if (inds.has("Morning / Evening Star") && i >= 2) {
          const a = bars[i - 2], c = bars[i - 1], d = b;
          const bodyOf = (x: LegacyOhlcvTuple) => Math.abs(x.close - x.open);
          const rangeA = a.high - a.low;
          const smallStar = rangeA > 0 && bodyOf(c) < rangeA * 0.35;
          const midA = (a.open + a.close) / 2;
          // Morning Star (bullish reversal)
          if (a.close < a.open && smallStar && d.close > d.open && d.close > midA) {
            patternMarkers.push({ time: b.time as any, position: "belowBar", color: "#00E5CC", shape: "arrowUp", text: "MS", size: 1 });
          }
          // Evening Star (bearish reversal)
          if (a.close > a.open && smallStar && d.close < d.open && d.close < midA) {
            patternMarkers.push({ time: b.time as any, position: "aboveBar", color: "#CE93D8", shape: "arrowDown", text: "ES", size: 1 });
          }
        }

        // Large Trade Filter — flag bars whose volume ≥ largeVolThresh (2.5× the
        // rolling-20 average), the "print only large trades" view. Dot sized by how
        // far above threshold the bar traded.
        if (inds.has("Large Trade Filter") && b.volume && largeVolThresh > 0 && b.volume >= largeVolThresh) {
          const mult = Math.min(1.4, 0.7 + (b.volume / largeVolThresh - 2.5) * 0.15);
          patternMarkers.push({ time: b.time as any, position: up ? "belowBar" : "aboveBar", color: up ? "#2563EB" : "#6A0DAD", shape: "circle", text: "L", size: Math.max(0.7, mult) });
        }
      });
      // v5: markers live on a plugin (createSeriesMarkers), not ISeriesApi.setMarkers.
      // Create the plugin once per series, then update it — and clear (empty array)
      // when no patterns are active so stale markers don't linger.
      if (candleRef.current) {
        const sorted = patternMarkers.sort((a, b) => a.time - b.time);
        try {
          if (!markersPluginRef.current) {
            markersPluginRef.current = LW.createSeriesMarkers(candleRef.current, sorted);
          } else {
            markersPluginRef.current.setMarkers(sorted);
          }
        } catch {}
      }
    }

    // ── Equal Highs / Lows (liquidity resting zones) — last 8 only ─
    if (inds.has("Equal Highs/Lows")) {
      try {
        const tolerance = (bars[bars.length - 1]?.close ?? 100) * 0.0008;
        const eqLevels: { price: number; idx: number; type: "h" | "l" }[] = [];
        bars.forEach((b, i) => {
          if (i === 0) return;
          const prev = bars[i - 1];
          if (Math.abs(b.high - prev.high) < tolerance) eqLevels.push({ price: b.high, idx: i, type: "h" });
          if (Math.abs(b.low  - prev.low)  < tolerance) eqLevels.push({ price: b.low,  idx: i, type: "l" });
        });
        eqLevels.slice(-8).forEach(ev => {
          const s = chart.addSeries(LW.LineSeries,{ color: "rgba(240,180,41,0.60)", lineWidth: 1, lineStyle: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          const slice = bars.slice(ev.idx);
          if (slice.length < 2) return;
          s.setData(slice.map(bb => ({ time: bb.time as any, value: ev.price })));
          indSeriesRef.current.push(s);
        });
      } catch {}
    }

    // ── Strong Highs / Lows — swing points NOT yet violated by later price. A
    //    swing high is "strong" (protected resistance) if no subsequent bar traded
    //    above it; a swing low is "strong" (protected support) if none traded below.
    if (inds.has("Strong Highs/Lows")) {
      try {
        const sw = IND.swingHighLow(bars, CHART_SWING_LOOKBACK);
        const maxHighAfter = (idx: number) => bars.slice(idx + 1).reduce((m, b) => Math.max(m, b.high), -Infinity);
        const minLowAfter  = (idx: number) => bars.slice(idx + 1).reduce((m, b) => Math.min(m, b.low),  Infinity);
        const idxOf = (t: number) => bars.findIndex(b => b.time === t);
        sw.highs.slice(-12).forEach(h => {
          const idx = idxOf(h.time as number); if (idx < 0) return;
          if (maxHighAfter(idx) <= h.price) {
            const s = chart.addSeries(LW.LineSeries, { color: "rgba(255,77,103,0.85)", lineWidth: 2, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
            s.setData(bars.slice(idx).map(bb => ({ time: bb.time as any, value: h.price })));
            indSeriesRef.current.push(s);
          }
        });
        sw.lows.slice(-12).forEach(l => {
          const idx = idxOf(l.time as number); if (idx < 0) return;
          if (minLowAfter(idx) >= l.price) {
            const s = chart.addSeries(LW.LineSeries, { color: "rgba(0,229,204,0.85)", lineWidth: 2, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
            s.setData(bars.slice(idx).map(bb => ({ time: bb.time as any, value: l.price })));
            indSeriesRef.current.push(s);
          }
        });
      } catch {}
    }

    // ── Liquidity Pools — clusters of equal swing highs (buy-side liquidity, BSL)
    //    and equal swing lows (sell-side liquidity, SSL) where stops rest and price
    //    tends to sweep. Dashed gold zones anchored at the equal levels.
    if (inds.has("Liquidity Pools")) {
      try {
        const sw = IND.swingHighLow(bars, LIQUIDITY_SWEEP_LOOKBACK);
        const tol = (bars[bars.length - 1]?.close ?? 100) * 0.0012;
        const cluster = (pts: { time: number; price: number }[]) => {
          const out: { price: number; from: number }[] = [];
          pts.forEach((p, i) => {
            for (let j = i + 1; j < pts.length; j++) {
              if (Math.abs(pts[j].price - p.price) < tol) { out.push({ price: (p.price + pts[j].price) / 2, from: Math.min(p.time as number, pts[j].time as number) }); break; }
            }
          });
          return out;
        };
        const idxOfTime = (t: number) => { const i = bars.findIndex(b => (b.time as number) >= t); return i < 0 ? 0 : i; };
        cluster(sw.highs as any).slice(-6).forEach(c => {
          const s = chart.addSeries(LW.LineSeries, { color: "rgba(240,180,41,0.75)", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          s.setData(bars.slice(idxOfTime(c.from)).map(bb => ({ time: bb.time as any, value: c.price })));
          indSeriesRef.current.push(s);
        });
        cluster(sw.lows as any).slice(-6).forEach(c => {
          const s = chart.addSeries(LW.LineSeries, { color: "rgba(79,163,224,0.75)", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          s.setData(bars.slice(idxOfTime(c.from)).map(bb => ({ time: bb.time as any, value: c.price })));
          indSeriesRef.current.push(s);
        });
      } catch {}
    }

    // ── Change of Character (CHoCH) — the first break of structure AGAINST the
    //    prevailing swing sequence: after a series of higher-highs, price closing
    //    below the last higher-low flags a bullish→bearish CHoCH (and vice-versa).
    if (inds.has("Change of Character")) {
      try {
        const sw = IND.swingHighLow(bars, LIQUIDITY_SWEEP_LOOKBACK);
        const chochMarkers: { time: any; position: "aboveBar" | "belowBar"; color: string; shape: "arrowUp" | "arrowDown"; text: string; size: number }[] = [];
        const lows  = sw.lows.slice();
        const highs = sw.highs.slice();
        // CHoCH = the bar that first CLOSES through the most recent opposite swing:
        // closing below the last swing low = bullish→bearish shift; closing above the
        // last swing high = bearish→bullish shift. One marker per break (edge only).
        bars.forEach((b, i) => {
          const prevBar = bars[i - 1];
          if (!prevBar) return;
          const priorLow  = [...lows].reverse().find(l => (l.time as number) < (b.time as number));
          const priorHigh = [...highs].reverse().find(h => (h.time as number) < (b.time as number));
          if (priorLow && prevBar.close >= priorLow.price && b.close < priorLow.price) {
            chochMarkers.push({ time: b.time as any, position: "aboveBar", color: "#CE93D8", shape: "arrowDown", text: "CHoCH", size: 0.9 });
          }
          if (priorHigh && prevBar.close <= priorHigh.price && b.close > priorHigh.price) {
            chochMarkers.push({ time: b.time as any, position: "belowBar", color: "#00E5CC", shape: "arrowUp", text: "CHoCH", size: 0.9 });
          }
        });
        // Draw CHoCH via lightweight price-line markers on the candle series.
        if (chochMarkers.length && candleRef.current) {
          const existing = (chochMarkers.slice(-8)).sort((a, b) => a.time - b.time);
          // Merge with any pattern markers already set would clobber; instead draw
          // small dotted lines at the break price so CHoCH coexists with patterns.
          existing.forEach(m => {
            const s = chart.addSeries(LW.LineSeries, { color: m.color, lineWidth: 1, lineStyle: 3, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
            const bar = bars.find(bb => (bb.time as any) === m.time);
            if (!bar) return;
            const idx = bars.indexOf(bar);
            s.setData(bars.slice(Math.max(0, idx - 3), idx + 4).map(bb => ({ time: bb.time as any, value: bar.close })));
            indSeriesRef.current.push(s);
          });
        }
      } catch {}
    }

    // ── Parkinson Volatility — high/low range volatility estimator (annualized %),
    //    more efficient than close-to-close HV. Rolling 20-bar window.
    if (inds.has("Parkinson Volatility")) {
      setupScale("park", 0.80);
      const parkCompute = (bs: LegacyOhlcvTuple[]) => {
        const N = 20; const k = 1 / (4 * Math.log(2));
        return bs.map((_, i) => {
          if (i < N) return 0;
          let sum = 0;
          for (let j = i - N + 1; j <= i; j++) {
            const hl = bs[j].high > 0 && bs[j].low > 0 ? Math.log(bs[j].high / bs[j].low) : 0;
            sum += hl * hl;
          }
          return Math.sqrt(k * (sum / N)) * Math.sqrt(252) * 100;
        });
      };
      const s = addOsc(parkCompute(bars), "#C084FC", "park");
      regLive(s, (bs) => { const a = parkCompute(bs); const v = a[a.length - 1]; return isFinite(v) ? { value: v } : null; });
    }

    // ── Stacked Imbalances (3+ consecutive imbalanced rows) ──
    if (inds.has("Stacked Imbalances")) {
      try {
        bars.slice(-80).forEach(b => {
          const levels = getBarFootprint(b, 12);
          let streak = 0; let streakDir: "ask" | "bid" | null = null;
          levels.forEach((lv) => {
            const askDom = lv.ask > lv.bid * 2.0;
            const bidDom = lv.bid > lv.ask * 2.0;
            const dir = askDom ? "ask" : bidDom ? "bid" : null;
            if (dir && dir === streakDir) {
              streak++;
              if (streak >= 3) {
                // Draw horizontal line at stacked imbalance level
                const price = lv.priceLevel;
                const color = dir === "ask" ? "rgba(0,229,204,0.70)" : "rgba(206,147,216,0.70)";
                const s = chart.addSeries(LW.LineSeries,{ color, lineWidth: 2, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
                s.setData(bars.slice(bars.indexOf(b)).map(bb => ({ time: bb.time as any, value: price })));
                indSeriesRef.current.push(s);
              }
            } else {
              streak = 1; streakDir = dir;
            }
          });
        });
      } catch {}
    }

    // ── Imbalance Tracker — horizontal zone boxes on chart ───────
    // Draw purple zone boxes at price levels where significant bid/ask imbalances
    // were detected in recent bars (like Deep Charts Imbalance Tracker feature)
    if (inds.has("Imbalance Tracker")) {
      try {
        // Collect all price levels with imbalance ratio ≥ 2.5× from last 100 bars
        const recentBars = bars.slice(-100);
        const imbalanceLevels: { price: number; isAsk: boolean; strength: number }[] = [];
        recentBars.forEach(b => {
          const levels = getBarFootprint(b, 12);
          levels.forEach(lv => {
            if (lv.total < 5) return;
            const ratio = lv.ask > 0 && lv.bid > 0 ? Math.max(lv.ask / lv.bid, lv.bid / lv.ask) : 0;
            if (ratio >= 2.5) {
              imbalanceLevels.push({ price: lv.priceLevel, isAsk: lv.ask > lv.bid, strength: ratio });
            }
          });
        });
        // Cluster nearby levels and draw zone boxes
        const clustered: typeof imbalanceLevels = [];
        imbalanceLevels.sort((a, b) => a.price - b.price).forEach(lv => {
          const last = clustered[clustered.length - 1];
          const tick = (bars[bars.length - 1]?.close ?? 100) * 0.0005;
          if (last && Math.abs(lv.price - last.price) < tick * 3 && lv.isAsk === last.isAsk) {
            if (lv.strength > last.strength) clustered[clustered.length - 1] = lv;
          } else {
            clustered.push(lv);
          }
        });
        clustered.slice(-20).forEach(lv => {
          const color = lv.isAsk ? "rgba(0,229,204,0.18)" : "rgba(123,108,247,0.18)";
          const borderColor = lv.isAsk ? "rgba(0,229,204,0.55)" : "rgba(123,108,247,0.55)";
          const tick = (bars[bars.length - 1]?.close ?? 100) * 0.0003;
          const top = lv.price + tick;
          const bot = lv.price - tick;
          // Top border line
          const sTop = chart.addSeries(LW.LineSeries,{ color: borderColor, lineWidth: 1, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          sTop.setData(bars.map(b => ({ time: b.time as any, value: top })));
          indSeriesRef.current.push(sTop);
          // Bot border line
          const sBot = chart.addSeries(LW.LineSeries,{ color: borderColor, lineWidth: 1, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
          sBot.setData(bars.map(b => ({ time: b.time as any, value: bot })));
          indSeriesRef.current.push(sBot);
        });
      } catch {}
    }

    // ── Supply / Demand Zones (Deep-M Effort style) ───────────────
    // Teal boxes = demand zones (swing lows with strong buying), red = supply (swing highs with selling)
    if (inds.has("Supply/Demand Zones")) {
      try {
        // Find swing highs (supply) and swing lows (demand) in last 200 bars
        const lookback = Math.min(bars.length, 200);
        const slice = bars.slice(-lookback);
        const swingRange = 5; // bars each side for swing detection
        slice.forEach((b, i) => {
          if (i < swingRange || i > slice.length - swingRange - 1) return;
          const window = slice.slice(i - swingRange, i + swingRange + 1);
          const isHigh = window.every(w => b.high >= w.high);
          const isLow  = window.every(w => b.low  <= w.low);

          const zoneHeight = (b.high - b.low) * 0.4;
          if (isHigh && zoneHeight > 0) {
            // Supply zone — red/pink box just below the high
            const top = b.high;
            const bot = b.high - zoneHeight;
            const color = "rgba(244,143,177,0.15)";
            const border = "rgba(244,143,177,0.55)";
            const sT = chart.addSeries(LW.LineSeries,{ color: border, lineWidth: 1, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
            sT.setData(slice.slice(i).map(bb => ({ time: bb.time as any, value: top })));
            indSeriesRef.current.push(sT);
            const sB = chart.addSeries(LW.LineSeries,{ color: border, lineWidth: 1, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
            sB.setData(slice.slice(i).map(bb => ({ time: bb.time as any, value: bot })));
            indSeriesRef.current.push(sB);
          }
          if (isLow && zoneHeight > 0) {
            // Demand zone — teal box just above the low
            const top = b.low + zoneHeight;
            const bot = b.low;
            const border = "rgba(105,255,218,0.55)";
            const sT = chart.addSeries(LW.LineSeries,{ color: border, lineWidth: 1, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
            sT.setData(slice.slice(i).map(bb => ({ time: bb.time as any, value: top })));
            indSeriesRef.current.push(sT);
            const sB = chart.addSeries(LW.LineSeries,{ color: border, lineWidth: 1, lineStyle: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
            sB.setData(slice.slice(i).map(bb => ({ time: bb.time as any, value: bot })));
            indSeriesRef.current.push(sB);
          }
        });
      } catch {}
    }

    // ── Native panes own the oscillator layout now ───────────
    // With v5 native panes the candles keep pane 0 to themselves (just the
    // volume overlay at the bottom) — no need to shrink the candle scale for
    // oscillators. Keep a small bottom margin so volume bars don't touch wicks.
    try {
      chart.priceScale("right").applyOptions({ scaleMargins: { top: 0.06, bottom: 0.18 } });
    } catch {}
    // Make the candle pane dominant and oscillator panes compact. v5 stretch
    // factors are RELATIVE weights (resolution-independent), unlike setHeight
    // which the layout was overriding (candles got squished under a big osc pane).
    try {
      const panes = chart.panes();
      const n = panes.length;
      if (n > 1) {
        // Candle pane always keeps the lion's share regardless of osc count.
        // Scale dominance with the number of oscillator panes so candles never
        // drop below ~70% of the height (each oscillator caps at ~10%). Before,
        // this was hard-capped at 4, so 4 indicators split the chart 50/50 and
        // crushed the footprint numbers into the top half.
        // Use a FIXED candle:oscillator weight (~3.1 ≈ CANDLE 260 / OSC_MIN 84)
        // instead of scaling dominance with osc count. The old `oscCount*2.8`
        // kept candles at ~74% no matter how many panes stacked, so 3+ panes
        // (RSI+MACD+CVD) got crushed to ~45px slivers — the "CVD meter too high /
        // cramped" bug. A fixed 3.1 weight matches the grown-container target
        // heights so every oscillator pane keeps its full ~84px and reads clean.
        panes[0].setStretchFactor(3.1);
        for (let i = 1; i < n; i++) panes[i].setStretchFactor(1);
      }

      // ── Bottom-pane cutoff fix ─────────────────────────────
      // LWC enforces a minimum pane height. When many oscillators stack up,
      // (n-1)*min + candleMin + axis exceeds the fixed viewport and the bottom
      // pane / time-axis gets clipped. Grow the chart container tall enough that
      // every oscillator pane stays fully readable, and let the region scroll.
      const cont   = containerRef.current;
      const scroll = cont?.parentElement as HTMLElement | null; // div5069 scroll box
      if (cont && scroll) {
        const viewH   = scroll.clientHeight || 0;
        const OSC_MIN = 84;   // readable oscillator pane height
        const CANDLE  = 260;  // keep candles dominant & usable
        const AXIS    = 30;   // time axis
        const oscCount = Math.max(0, n - 1);
        const needed   = oscCount === 0 ? 0 : CANDLE + oscCount * OSC_MIN + AXIS;
        if (needed > viewH && viewH > 0) {
          // Too many panes to fit — grow container & scroll.
          cont.style.height = needed + "px";
          scroll.style.overflowY = "auto";
        } else {
          // Fits — fill the viewport, no scroll.
          cont.style.height = "100%";
          scroll.style.overflowY = "hidden";
        }
        // Nudge autoSize / overlays to re-measure the new height. Guard on chart
        // IDENTITY: on a symbol/timeframe switch this RAF can fire AFTER the chart
        // was disposed and replaced. Calling applyOptions() then schedules an LWC
        // internal model update that throws "Object is disposed" ASYNCHRONOUSLY —
        // uncatchable by the try/catch here. Skipping stale charts kills that error.
        requestAnimationFrame(() => {
          if (chartRef.current !== chart) { setRangeVer(v => v + 1); return; }
          try { chart.applyOptions({}); } catch {}
          setRangeVer(v => v + 1);
        });
      }
    } catch {}

    // Cleanup so React Strict Mode doesn't orphan series
    return () => {
      const c = chartRef.current;
      if (!c) return;
      indSeriesRef.current.forEach(s => { try { c.removeSeries(s); } catch {} });
      indSeriesRef.current = [];
    };
  }, [activeInds, indSettings, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Alert level lines ──────────────────────────────────── */
  const alertSeriesRef = useRef<any[]>([]);
  useEffect(() => {
    if (!ready || !chartRef.current || !barsRef.current?.length) return;
    const chart = chartRef.current;
    const bars  = barsRef.current;
    // Remove old alert lines
    alertSeriesRef.current.forEach(s => { try { chart.removeSeries(s); } catch {} });
    alertSeriesRef.current = [];
    if (!alertLevels.length) return;
    (async () => {
      const LW = await import("lightweight-charts");
      // Chart may have been disposed/replaced during the await → don't touch it.
      if (chartRef.current !== chart) return;
      alertLevels.forEach(price => {
        try {
          const s = chart.addSeries(LW.LineSeries,{
            color: "#F5A623",
            lineWidth: 1,
            lineStyle: LW.LineStyle.Dashed,
            priceLineVisible: false,
            lastValueVisible: true,
            // CRITICAL: an alert far from the price (e.g. 1100 on a 377 stock) must
            // NOT drag the candle scale out to 300–1100 and crush the candles.
            // Returning null excludes this line from the price-scale autoscale.
            autoscaleInfoProvider: () => null,
          });
          s.setData(bars.map(b => ({ time: b.time as any, value: price })));
          alertSeriesRef.current.push(s);
        } catch {}
      });
    })();
  }, [alertLevels, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Paper-trade position lines (native price lines + live P&L) ──────
   * Reads the local paper-trading blotter (wm_paper_state), finds OPEN
   * positions for THIS symbol, and draws a TradingView-style horizontal
   * entry line with a live-updating P&L label. Read-only: this only
   * VISUALISES paper state — it never places, modifies, or closes a trade. */
  const pnlLabel = (qty: number, avgPx: number, lp: number) => {
    const pnl = (lp - avgPx) * qty;               // qty is signed (+long / -short)
    const s = pnl >= 0 ? "+" : "-";
    return { up: pnl >= 0, text: `${qty > 0 ? "LONG" : "SHORT"} ${Math.abs(qty)} · ${s}$${Math.abs(pnl).toLocaleString("en-US", { maximumFractionDigits: 2 })}` };
  };
  useEffect(() => {
    const series = candleRef.current;
    if (!series || !paperTradesVisible) return;

    let positions: Array<{ symbol: string; qty: number; avgPx: number }> = [];
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("wm_paper_state") : null;
      if (raw) positions = (JSON.parse(raw).positions || []);
    } catch { positions = []; }

    const norm = (s: string) => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const bse  = (s: string) => norm(s).replace(/(USDT|USDC|USD|PERP)$/, "");
    const tgt = norm(symbol), tgtB = bse(symbol);
    const mine = positions.filter(p => p.qty !== 0 && (norm(p.symbol) === tgt || bse(p.symbol) === tgtB));
    if (!mine.length) return;

    const lp = lastPrice > 0 ? lastPrice
      : (barsRef.current.length ? barsRef.current[barsRef.current.length - 1].close : 0);

    mine.forEach(p => {
      const { up, text } = pnlLabel(p.qty, p.avgPx, lp);
      try {
        const line = series.createPriceLine({
          price: p.avgPx,
          color: up ? "#00D4AA" : "#FF4D6A",
          lineWidth: 2,
          lineStyle: 0,               // solid
          axisLabelVisible: true,
          title: text,
        });
        paperLinesRef.current.push({ line, qty: p.qty, avgPx: p.avgPx });
      } catch {}
    });

    // Dev-only diagnostic readback (never ships to production).
    if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
      (window as unknown as { __wmPaperLines?: unknown }).__wmPaperLines = {
        symbol, count: paperLinesRef.current.length,
        titles: mine.map(p => pnlLabel(p.qty, p.avgPx, lp).text),
        lp, ts: Date.now(),
      };
    }

    return () => {
      paperLinesRef.current.forEach(({ line }) => { try { series.removePriceLine(line); } catch {} });
      paperLinesRef.current = [];
    };
  }, [symbol, paperTradesVisible, ready, paperNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Refresh each open-position line's live-P&L label on every price tick,
   * without tearing the lines down and rebuilding them. */
  useEffect(() => {
    if (!paperLinesRef.current.length || !(lastPrice > 0)) return;
    paperLinesRef.current.forEach(({ line, qty, avgPx }) => {
      const { up, text } = pnlLabel(qty, avgPx, lastPrice);
      try { line.applyOptions({ title: text, color: up ? "#00D4AA" : "#FF4D6A" }); } catch {}
    });
  }, [lastPrice]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Re-read paper state when another tab writes wm_paper_state, or when the
   * window regains focus after the user placed a trade elsewhere in the app. */
  useEffect(() => {
    const bump = () => setPaperNonce(n => n + 1);
    const onStorage = (e: StorageEvent) => { if (e.key === "wm_paper_state") bump(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", bump);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", bump);
    };
  }, []);

  /* ── BROKER COST LINE (HOUSE PLAN bolt-on #6) ────────────────────────
   * The founder's REAL Webull positions for THIS symbol, painted on price.
   * Truth source is /api/broker/webull/positions (auth-gated, read-only by
   * construction). HONEST-PRICE RULE is enforced server-side: an OPTION's
   * paintLevel is its STRIKE (premium confessed in the label), a STOCK's is
   * its cost price. Honest absence = paint nothing — an empty book or a
   * non-OBSERVED read state produces zero lines, never an invented level. */
  useEffect(() => {
    let cancelled = false;
    const wanted = (symbol || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!wanted) { setBrokerCostPositions([]); return; }
    (async () => {
      try {
        const res = await fetch(
          `/api/broker/webull/positions?symbol=${encodeURIComponent(wanted)}`,
          { cache: "no-store" },
        );
        if (cancelled) return;
        if (!res.ok) { setBrokerCostPositions([]); return; }
        const receipt = await res.json();
        if (cancelled) return;
        // Only an OBSERVED read may paint. NO_POSITIONS, UNCONFIGURED,
        // AWAITING_2FA etc. all mean "nothing honest to draw here".
        setBrokerCostPositions(
          receipt?.state === "OBSERVED" && Array.isArray(receipt.positions)
            ? receipt.positions
            : [],
        );
        // Dev-only diagnostic readback (never ships to production).
        if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
          (window as unknown as { __wmBrokerCostLine?: unknown }).__wmBrokerCostLine = {
            symbol: wanted, state: receipt?.state,
            count: Array.isArray(receipt?.positions) ? receipt.positions.length : 0,
            ts: Date.now(),
          };
        }
      } catch {
        if (!cancelled) setBrokerCostPositions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [symbol]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const series = candleRef.current;
    if (!series || !ready || !brokerCostPositions.length) return;
    brokerCostPositions.forEach(p => {
      const title = p.instrumentType === "OPTION" && p.option
        ? `WEBULL ${p.option.strike}${p.option.type === "CALL" ? "C" : "P"} ${p.option.expireDate.slice(5)} ×${p.quantity} · prem ${p.costPrice}`
        : `WEBULL COST ×${p.quantity}`;
      try {
        const line = series.createPriceLine({
          price: p.paintLevel,
          color: "#E8B54D",           // WM gold — broker truth, not blotter
          lineWidth: 1,
          lineStyle: 2,               // dashed: a held level, not a live P&L line
          axisLabelVisible: true,
          title,
        });
        brokerCostLinesRef.current.push(line);
      } catch {}
    });
    return () => {
      brokerCostLinesRef.current.forEach(line => { try { series.removePriceLine(line); } catch {} });
      brokerCostLinesRef.current = [];
    };
  }, [brokerCostPositions, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Log / pct / auto scale mode ─────────────────────────── */
  useEffect(() => {
    if (!chartRef.current) return;
    try {
      chartRef.current.priceScale("right").applyOptions({
        mode: logScale ? 1 : pctMode ? 2 : 0, // 0=Normal 1=Logarithmic 2=Percentage
        autoScale,  // respect the user's auto/manual choice
      });
    } catch {}
  }, [logScale, pctMode, autoScale, ready]);

  /* ── True vertical price-drag on the chart body ──────────────
     LWC handles horizontal time-scroll on the body itself; we add the
     vertical axis so the two combine into free 2D panning. Active only in
     cursor mode (so it never fights drawing tools). Dragging engages a manual
     price range; the AUTO button (setAutoScale→true) releases it. */
  useEffect(() => {
    if (!ready) return;
    const el = containerRef.current;
    if (!el) return;
    let dragging = false, startY = 0;
    let startMin = 0, startMax = 0;

    const reapply = () => {
      const cs = candleRef.current; if (!cs) return;
      // Re-assigning the provider forces LWC to recompute the price scale now.
      cs.applyOptions({
        autoscaleInfoProvider: autoscaleProviderRef.current,
      });
    };

    const onDown = (e: PointerEvent) => {
      if (!e.isPrimary || e.button !== 0) return;
      if (drawingToolRef.current !== "cursor") return; // let drawing tools own the mouse
      // Skip the right price-axis gutter — that region is owned by the dedicated
      // axis drag-to-SCALE handler below. Body drag = pan; axis drag = stretch.
      const rect = el.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      // On a drawing/handle → the drawing owns this drag (the draw-canvas moves it);
      // do NOT pan the price scale. This is what stops "dragging a line shakes the
      // whole chart" in cursor mode.
      if (drawHitTestRef.current(localX, localY)) return;
      let axW = 0; try { axW = (chartRef.current as any)?.priceScale?.("right")?.width?.() ?? 0; } catch {}
      if (axW > 0 && localX >= el.clientWidth - axW - 2) return;
      const cs = candleRef.current; if (!cs) return;
      const h = el.clientHeight;
      const top = cs.coordinateToPrice(0);
      const bot = cs.coordinateToPrice(h);
      if (top == null || bot == null) return;
      startMin = Math.min(top, bot);
      startMax = Math.max(top, bot);
      startY = e.clientY;
      dragging = true;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging || !e.isPrimary) return;
      const h = el.clientHeight; if (h <= 0) return;
      const dy = e.clientY - startY;
      if (Math.abs(dy) < 2) return;
      const span = startMax - startMin;
      const shift = (dy / h) * span; // drag down → reveal higher prices (shift range up)
      manualPriceRangeRef.current = { min: startMin + shift, max: startMax + shift };
      // NOTE: we deliberately keep the price scale in autoScale mode — the
      // provider only runs there. The manual range simply overrides the fit.
      reapply();
    };
    const onUp = () => { dragging = false; };
    // Double-click the chart body resets to auto-fit (TradingView convention).
    const onDbl = () => {
      if (drawingToolRef.current !== "cursor") return;
      manualPriceRangeRef.current = null;
      reapply();
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("dblclick", onDbl);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("dblclick", onDbl);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [ready]);

  /* ── TradingView-style PRICE-AXIS drag-to-SCALE ─────────────────
     Grab the price numbers on the right and drag vertically to STRETCH /
     COMPRESS the price scale around the cursor — exactly like TradingView.
     Drag DOWN → zoom IN (candles grow tall); drag UP → zoom OUT (candles
     shrink). Runs through the same manualPriceRangeRef + autoscaleInfoProvider
     as the body pan, so the 4×-range guardrail + center-pin keep it from ever
     collapsing the candles. Double-click the axis → back to AUTO fit. */
  useEffect(() => {
    if (!ready) return;
    const el = containerRef.current;
    if (!el) return;
    let scaling = false, startY = 0, startMin = 0, startMax = 0, anchor = 0;
    let raf = 0, pending: { min: number; max: number } | null = null;

    const reapply = () => {
      const cs = candleRef.current; if (!cs) return;
      cs.applyOptions({ autoscaleInfoProvider: autoscaleProviderRef.current });
    };
    const flush = () => {
      raf = 0;
      if (!pending) return;
      manualPriceRangeRef.current = pending;
      pending = null;
      reapply();
    };
    const onAxis = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      let axW = 0; try { axW = (chartRef.current as any)?.priceScale?.("right")?.width?.() ?? 0; } catch {}
      return axW > 0 && localX >= el.clientWidth - axW - 2 && localX <= el.clientWidth + 4;
    };
    const onDown = (e: PointerEvent) => {
      if (!e.isPrimary || e.button !== 0) return;
      if (!onAxis(e)) return;
      const cs = candleRef.current; if (!cs) return;
      const h = el.clientHeight;
      const rect = el.getBoundingClientRect();
      const top = cs.coordinateToPrice(0);
      const bot = cs.coordinateToPrice(h);
      if (top == null || bot == null) return;
      startMin = Math.min(top, bot);
      startMax = Math.max(top, bot);
      // Anchor the stretch at the price directly under the cursor (TV behaviour).
      const ap = cs.coordinateToPrice(e.clientY - rect.top);
      anchor = (ap != null && isFinite(ap)) ? ap : (startMin + startMax) / 2;
      startY = e.clientY;
      scaling = true;
      setScaleLocked(true);          // reveal the small "reset scale" button
      el.style.cursor = "ns-resize";
      e.preventDefault();
      e.stopPropagation();
    };
    const onMove = (e: PointerEvent) => {
      if (!scaling || !e.isPrimary) return;
      const h = el.clientHeight; if (h <= 0) return;
      const dy = e.clientY - startY;
      // Exponential factor → smooth, symmetric, never inverts. Drag DOWN (dy>0)
      // → factor<1 → range shrinks → zoom in. Sensitivity 2.4 ≈ TradingView.
      const factor = Math.exp(-dy / h * 3.4);
      const newMin = anchor - (anchor - startMin) * factor;
      const newMax = anchor + (startMax - anchor) * factor;
      if (!(newMax - newMin > 1e-9)) return;
      // Coalesce to one update per animation frame → buttery-smooth, no jank.
      pending = { min: newMin, max: newMax };
      if (!raf) raf = requestAnimationFrame(flush);
    };
    const onUp = () => {
      if (scaling) {
        scaling = false;
        el.style.cursor = "";
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        flush();
      }
    };

    // Capture phase so we intercept the axis BEFORE the library's own handlers.
    el.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ready]);

  /* ── Apply chart settings ────────────────────────────────── */
  useEffect(() => {
    if (!chartRef.current || !chartSettings) return;
    try {
      const LW = (window as any).__LW__;
      const chart = chartRef.current;
      chart.applyOptions({
        layout: {
          background: { color: chartSettings.background ?? MARKET_FIELD_DEFAULT },
        },
        grid: chartSettings.gridColor ? {
          vertLines: { color: chartSettings.gridColor, style: 4 },
          horzLines: { color: chartSettings.gridColor, style: 4 },
        } : undefined,
        crosshair: chartSettings.crosshairColor ? {
          vertLine: { color: chartSettings.crosshairColor },
          horzLine: { color: chartSettings.crosshairColor },
        } : undefined,
      });
      // Update candle colors — skip for types that manage their own colors (hollow, volume, orderflow)
      const skipBodyColorOverride = ["hollow", "volume-candles", "vp-candles", "orderflow-candles",
        "line", "area", "baseline", "bars", "hlc-bars", "columns", "renko", "range-bars"].includes(candleType);
      if (candleRef.current && chartSettings.candleUp && !skipBodyColorOverride) {
        try {
          candleRef.current.applyOptions({
            upColor: chartSettings.candleUp,
            downColor: chartSettings.candleDown ?? CANDLE_DOWN_DEFAULT,
            borderUpColor: chartSettings.borderUp ?? chartSettings.candleUp,
            borderDownColor: chartSettings.borderDown ?? chartSettings.candleDown ?? CANDLE_DOWN_DEFAULT,
            wickUpColor: chartSettings.wickUp ?? chartSettings.candleUp,
            wickDownColor: chartSettings.wickDown ?? chartSettings.candleDown ?? CANDLE_DOWN_DEFAULT,
          });
        } catch {}
      } else if (candleRef.current && chartSettings.candleUp && candleType === "hollow") {
        // For hollow candles: only update wicks and border, keep body as background color
        const bgColor = chartSettings.background ?? MARKET_FIELD_DEFAULT;
        try {
          candleRef.current.applyOptions({
            upColor:          bgColor,
            downColor:        bgColor,
            borderUpColor:    chartSettings.borderUp   ?? chartSettings.candleUp,
            borderDownColor:  chartSettings.borderDown ?? chartSettings.candleDown ?? CANDLE_DOWN_DEFAULT,
            wickUpColor:      chartSettings.wickUp   ?? chartSettings.candleUp,
            wickDownColor:    chartSettings.wickDown  ?? chartSettings.candleDown ?? CANDLE_DOWN_DEFAULT,
          });
        } catch {}
      }
    } catch {}
  }, [chartSettings, candleType, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Footprint helper: real price-level bid/ask data ─────────
   * Uses only captured aggressor-side executed trades. Historical
   * OHLCV bars cannot truthfully reconstruct bid/ask-at-price.
   ─────────────────────────────────────────────────────────── */
  /* ─────────────────────────────────────────────────────────────────────────
     FIXED-RESOLUTION BAR PROFILE — the single source of truth for a candle.

     The renderer picks `numLevels` from barSpacing + candle pixel height, so it
     changes with zoom. Building the volume distribution AT that resolution made
     the candle's own numbers depend on zoom: the body/wick predicates and the
     per-level RNG were evaluated at bin positions, so more bins = a different
     distribution, not merely a finer view of the same one.

     So the profile is built ONCE on a fixed SUB-level grid, independent of zoom.
     Display bins and the aggressive/passive roles are both derived by aggregating
     that fixed grid. Zoom then only changes how the same mass is sliced.
     SUB=120 so the 0.20 / 0.80 role thresholds land exactly on sub-boundaries.
  ───────────────────────────────────────────────────────────────────────────── */
  const SUB = 120;

  const getBarSubProfile = useCallback((bar: LegacyOhlcvTuple): Array<{ bid: number; ask: number }> | null => {
    const range = bar.high - bar.low;
    if (range <= 0) return null;

    const realData = tickAccRef.current.get(bar.time);

    const idxOf = (p: number) =>
      Math.min(SUB - 1, Math.max(0, Math.floor(((p - bar.low) / range) * SUB)));
    const sub: Array<{ bid: number; ask: number }> =
      Array.from({ length: SUB }, () => ({ bid: 0, ask: 0 }));

    // ── REAL TAPE: bucket every accumulated tick exactly once. The old code
    // looked up one rounded price key per display bin, sampling the accumulator
    // and discarding the rest — so the printed total climbed as you zoomed in.
    if (realData && realData.size > 0) {
      let seen = 0;
      for (const [px, rt] of realData) {
        const s = sub[idxOf(px)];
        s.bid += rt.bid; s.ask += rt.ask;
        seen  += rt.bid + rt.ask;
      }
      if (seen > 0) {
        return sub;   // real tape only — never blended with simulated rows
      }
    }

    // Historical OHLCV does not contain aggressor-side executions at each price.
    // Without captured real tape, leave the footprint empty—never synthesize it.
    return null;
  }, [base]);

  /** Aggressive/passive roles for a candle. Derived from the FIXED sub-profile,
   *  so these four headline numbers are identical at every zoom level. */
  const getBarRoles = useCallback((bar: LegacyOhlcvTuple) => {
    const sub = getBarSubProfile(bar);
    let aggBuy = 0, aggSell = 0, pasBuy = 0, pasSell = 0;
    if (!sub) return { aggBuy, aggSell, pasBuy, pasSell };
    for (let j = 0; j < SUB; j++) {
      const f = (j + 0.5) / SUB;
      if (f > 0.80) pasSell += sub[j].ask; else aggBuy  += sub[j].ask;
      if (f < 0.20) pasBuy  += sub[j].bid; else aggSell += sub[j].bid;
    }
    return { aggBuy, aggSell, pasBuy, pasSell };
  }, [getBarSubProfile]);

  const getBarFootprint = useCallback((bar: LegacyOhlcvTuple, numLevels: number): Array<{
    priceLevel: number; bid: number; ask: number; total: number;
    relPos: number; inBody: boolean;
  }> => {
    const range = bar.high - bar.low;
    if (range <= 0) return [];
    const sub = getBarSubProfile(bar);
    if (!sub) return [];

    const bodyLow  = Math.min(bar.open, bar.close);
    const bodyHigh = Math.max(bar.open, bar.close);
    const dp       = base > 100 ? 2 : 4;
    const binW     = range / numLevels;

    // Pure aggregation of the fixed grid. Every sub-level lands in exactly one
    // display bin, so Σ total is identical for ANY numLevels — i.e. any zoom.
    const bins = Array.from({ length: numLevels }, () => ({ bid: 0, ask: 0 }));
    for (let j = 0; j < SUB; j++) {
      const i = Math.min(numLevels - 1, Math.floor((j * numLevels) / SUB));
      bins[i].bid += sub[j].bid;
      bins[i].ask += sub[j].ask;
    }

    const levels: Array<{ priceLevel: number; bid: number; ask: number; total: number; relPos: number; inBody: boolean }> = [];
    for (let i = 0; i < numLevels; i++) {
      const priceLevel = +(bar.low + i * binW).toFixed(dp);
      const relPos     = i / Math.max(1, numLevels - 1); // 0=low, 1=high
      const inBody     = priceLevel >= bodyLow && priceLevel <= bodyHigh;
      const { bid, ask } = bins[i];
      levels.push({ priceLevel, bid, ask, total: bid + ask, relPos, inBody });
    }

    return levels;
  }, [base]);

  /**
   * Big Trades ONLY — individual large aggressive prints at exact tick prices.
   *
   * Delegates to the shared pure owner in src/lib/bigTradeLevels.ts. The
   * ranking used to live inline here and rounded every print for display
   * BEFORE using that rounded value as the level's identity — the pickMap key
   * here and the `bt:<time>:<price>` spawn key in the renderer. On crypto,
   * where `base > 100` collapses every print to two decimals, two separate
   * block trades routinely became one key and the second was overwritten:
   * not merged, just gone. See that module's header.
   */
  const getRealBigTradeLevels = useCallback((bar: LegacyOhlcvTuple): BigTradeLevel[] => {
    const prints = bigTradePrintAccRef.current.get(bar.time as number);
    if (!prints || prints.length === 0) return [];
    return computeBigTradeLevels(prints, base);
  }, [base]);

  /**
   * Delta Bubbles ONLY — net aggressive delta per price zone (6–10 bins).
   * Separate from Big Trades; still tickAccRef-only, no synthetic footprint.
   */
  /**
   * Delegates to the shared pure owner in src/lib/deltaBubbleLevels.ts.
   *
   * This binning and ranking used to live inline here, which meant the only
   * coverage possible was a re-typed COPY of the loop plus a string match on
   * this file. The shipped code is now the tested code. See that module's
   * header for what "level ownership" means and for the two defects it fixes:
   * a bubble printing a bucket CENTRE as the price flow happened at, and a
   * rounded price used as a bucket identity (which silently merged buckets on
   * tight bars and dropped their aggressor volume).
   */
  const getDeltaBubbleLevels = useCallback((bar: LegacyOhlcvTuple): DeltaBubbleLevel[] => {
    const realData = deltaTickAccRef.current.get(bar.time as number);
    if (!realData || realData.size === 0) return [];

    const ticks: DeltaTick[] = [];
    for (const [px, rt] of realData) ticks.push({ price: Number(px), bid: rt.bid, ask: rt.ask });

    return computeDeltaBubbleLevels(ticks, bar.low, bar.high, base, deltaLevelsPrefRef.current);
  }, [base]);

  footprintSnapRef.current = (bar, n) => getBarFootprint(bar, n).map(l => ({ priceLevel: l.priceLevel, total: l.total }));

  /* ── Canvas order-flow / footprint overlay ──────────────────
   *  Draws directly on a canvas overlaid on LW chart.
   *  All 5 footprint modes: bid-ask, delta, volume-profile,
   *  imbalance, aggressive-passive.
   ─────────────────────────────────────────────────────────── */
  // ResizeObserver redraws the overlay canvas (VP / drawings / footprint) when
  // the window/panel resizes. (The earlier 0→non-zero "blank-chart watchdog"
  // here was removed: it targeted the wrong mechanism — the real blank was the
  // chart being destroyed then rebuilt AFTER an awaited candle fetch, now fixed
  // by the create-once lifecycle. LWC's own autoSize handles canvas sizing.)
  useEffect(() => {
    const cont = containerRef.current;
    const canvas = canvasRef.current;
    if (!cont || !canvas) return;
    const ro = new ResizeObserver(() => { setRangeVer(v => v + 1); });
    ro.observe(cont);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const cont   = containerRef.current;
    if (!canvas || !cont || !chartRef.current || !ready) return;

    let rafId = 0;
    // Track the last backing-store size so we only reallocate the canvas buffer
    // when the dimensions actually change. Reassigning canvas.width/height every
    // frame (even to the same value) throws away and re-uploads the entire GPU
    // texture — a 60fps buffer realloc that fought LWC's zoom render and caused
    // the candles to "stick." Now the buffer is stable; we just clear + redraw.
    let lastCW = -1, lastCH = -1, lastDpr = -1;
    let lastOverlayDrawAt = 0;
    /**
     * B-801 · the running cost of this room's paint.
     *
     * Scoped to the effect, exactly as `lastOverlayDrawAt` is, so a re-run
     * (symbol, timeframe, overlay config) starts a fresh measurement rather
     * than averaging the new chart's paint with the old one's.
     */
    let paintLedger = emptyPaintLedger(overlayFrameBudgetMs(fixedVPActive || sessionVPActive));
    let sessionBarsCache: { source: LegacyOhlcvTuple[]; key: string; bars: LegacyOhlcvTuple[] } | null = null;

    // Session selection is data work, not paint work. Previously every animation
    // frame constructed Intl.DateTimeFormat, formatted every historical bar, and
    // allocated three new arrays even when neither the bars nor session changed.
    // Cache by immutable bar-array identity + session inputs; live updates replace
    // the array and naturally invalidate the cache.
    const selectSessionBars = (allBars: LegacyOhlcvTuple[]): LegacyOhlcvTuple[] => {
      const key = `${symbol}|${timeframe}|${extendedHours ? "ETH" : "RTH"}`;
      if (sessionBarsCache?.source === allBars && sessionBarsCache.key === key) {
        return sessionBarsCache.bars;
      }
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/New_York",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      });
      const dailyOrLonger = /^(D|1D|W|1W|M|1M|3M|6M|1Y|2Y|3Y|5Y)$/.test(timeframe);
      const applyRTH = isEquitySymbol(symbol) && !dailyOrLonger;
      const sessionWindowBars: Record<string, number> = {
        "1D": 5, "1W": 4, "1M": 3,
        "3M": 4, "6M": 4, "1Y": 3, "2Y": 3, "3Y": 3, "5Y": 3,
      };
      const annotated = allBars
        .map(bar => {
          const parts = formatter.formatToParts(new Date((bar.time as number) * 1000));
          const part = (type: Intl.DateTimeFormatPartTypes) =>
            Number(parts.find(value => value.type === type)?.value ?? 0);
          const date = `${part("year")}-${String(part("month")).padStart(2, "0")}-${String(part("day")).padStart(2, "0")}`;
          return { bar, date, minute: part("hour") * 60 + part("minute") };
        })
        .filter(item => (applyRTH ? item.minute >= 570 && item.minute < 960 : true));
      const latestSession = annotated.at(-1)?.date;
      const bars = dailyOrLonger
        ? annotated.slice(-(sessionWindowBars[timeframe] ?? 5)).map(item => item.bar)
        : latestSession
          ? annotated.filter(item => item.date === latestSession).map(item => item.bar)
          : [];
      sessionBarsCache = { source: allBars, key, bars };
      return bars;
    };

    const draw = () => {
      // Size to the CHART CONTAINER (not the scroll-box parent). When many panes
      // stack the container grows taller than the visible viewport and scrolls;
      // the overlay must match the chart's full height so priceToCoordinate
      // (chart-top origin) stays pixel-aligned with the candles.
      const W = cont.offsetWidth;
      const H = cont.offsetHeight;
      if (!W || !H) return;

      const dpr = window.devicePixelRatio || 1;
      const cw = Math.round(W * dpr), ch = Math.round(H * dpr);
      // Only reallocate the backing store when the size actually changes.
      // (Setting canvas.width/height ALWAYS clears + reallocates the buffer, so
      // doing it per-frame was a 60fps GPU-texture thrash that caused zoom jank.)
      if (cw !== lastCW || ch !== lastCH || dpr !== lastDpr) {
        canvas.width  = cw;
        canvas.height = ch;
        canvas.style.width  = W + "px";
        canvas.style.height = H + "px";
        lastCW = cw; lastCH = ch; lastDpr = dpr;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // NOTE: do NOT early-return when footprint is off — the WM Fixed/Session VP
      // overlays are independent of order-flow footprint and must still render.
      // Footprint MODE blocks below are gated via effectiveFP instead.
      ctx.imageSmoothingEnabled = false; // crisp pixel-aligned rendering

      const chart = chartRef.current;
      if (!chart || !candleRef.current) return;
      const srs = candleRef.current;

      // Guard so the WM VP layer draws exactly once per frame regardless of which
      // call site fires first (big-trades mode draws VP early, under the bubbles).
      let vpDrawn = false;

      let bsp = 12;
      try { bsp = chart.timeScale().options().barSpacing ?? 12; } catch {}

      // TV Lightweight Charts candle body width = barSpacing * 0.7 (matches TV internal formula)
      const colW  = Math.max(4, Math.floor(bsp * 0.70));
      const halfW = Math.floor(colW / 2);
      // Show numbers at practical zoom levels. These gates were too aggressive —
      // the user reported footprint numbers "disappearing" when zooming out or
      // after the intraday range widened (which vertically compresses candles).
      // Relaxed so numbers stay visible across far more zoom levels:
      // showText  = at least 1 number fits (column ≥11px  → barSpacing ≥ ~16)
      // showSplit = both bid AND ask fit side-by-side (column ≥22px)
      // showBadges = the per-candle 4-WAY ORDER-FLOW SUMMARY (2×2 grid of Agg/Psv
      //   Buyer/Seller numbers, drawn ABOVE the candle). The grid is ~68px wide, so
      //   drawing one per candle when bars are packed tight would overlap the grids
      //   into an unreadable smear. Only draw when bar spacing is wide enough that a
      //   grid fits WITHOUT colliding with its neighbours (genuinely zoomed in). The
      //   per-row bid/ask numbers below keep data on screen at all other zooms.
      const showText   = colW >= 11;
      const showSplit  = colW >= 22;
      const showBadges = bsp >= 70;
      // showWinner = the compact per-candle WINNER PILL (dominant side + its total
      //   volume, e.g. "AGG BUYS 113.2k"). Only ~54px wide, so it stays readable at
      //   NORMAL zoom — the old code only showed labels at bsp≥70 (extremely close),
      //   which is exactly the complaint. Draw the pill whenever a bar is ≥22px so
      //   the label is visible during ordinary trading, and stack the detailed 2×2
      //   grid on top only when genuinely zoomed in (showBadges).
      const showWinner = bsp >= 22;
      const fmtV  = (v: number) => {
        if (!isFinite(v) || v <= 0) return "0";
        // Preserve evidence below the two-decimal display floor. Printing 0.00
        // for a real fractional execution falsely says nothing traded; the
        // bounded label keeps the observation honest without inventing precision.
        if (v < 0.005) return "<0.01";
        return v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M`
             : v >= 1000       ? `${(v/1000).toFixed(1)}k`
             : v >= 10         ? `${Math.round(v)}`
             : v >= 1          ? v.toFixed(1)
             : v.toFixed(2);   // fractional crypto (0.30, 0.05) — never floor to "0"
      };

      // Extended-hours bars remain available through the RTH/ETH selector.
      // Session shading is intentionally omitted until it is calculated with
      // DST-aware America/New_York boundaries; a fixed UTC-4 offset mislabeled
      // winter sessions by one hour.

      // Read the LIVE bar array from the ref each frame (not the `candles` state)
      // so the continuous RAF loop always has the latest data WITHOUT the effect
      // being torn down on every tick. This is what keeps the VP / footprint
      // overlays stable instead of flashing off when live ticks arrive.
      const liveBars = barsRef.current.length ? barsRef.current : candles;

      // Determine visible bar range from chart time scale.
      // ROOT-CAUSE FIX: when the user scrolls/pans the chart RIGHT into the empty
      // space past the last bar (very common, and auto-scroll does it on every new
      // bar), visRange.from can exceed the data length, making slice() return [].
      // Previously the whole draw function then `return`ed → the Volume Profile
      // (and footprint) VANISHED on interaction. Now we clamp the range and always
      // fall back to recent bars so there is ALWAYS something to render.
      let visibleBars: LegacyOhlcvTuple[];
      try {
        const visRange = chartRef.current!.timeScale().getVisibleLogicalRange();
        if (visRange) {
          const lastIdx = liveBars.length - 1;
          const from = Math.max(0, Math.min(lastIdx, Math.floor(visRange.from) - 2));
          const to   = Math.max(0, Math.min(lastIdx, Math.ceil(visRange.to) + 2));
          visibleBars = from <= to ? liveBars.slice(from, to + 1) : [];
        } else {
          visibleBars = liveBars.slice(-120);
        }
      } catch {
        visibleBars = liveBars.slice(-120);
      }

      // Never bail the whole draw on an empty slice — fall back to recent bars so
      // the VP / footprint stay on screen even when scrolled into empty space.
      if (visibleBars.length === 0) visibleBars = liveBars.slice(-120);
      if (visibleBars.length === 0) return; // truly no data yet

      /* ═══════════════════════════════════════════════════════
         PLOT-AREA CLIP — everything below (footprint cells, VP boxes,
         Big-Trades bubbles) is confined to pane 0's price area so it
         can NEVER bleed into the right price-axis gutter (which sits
         under the DOM panel) or spill DOWN into the lower indicator
         panes. Without this clip, the newest bars' cells + VP + bubbles
         piled up on the right edge and smeared over the axis/DOM and
         into RSI/CVD panes. One save() here, one restore() at the very
         end of draw() (there are no top-level early-returns in between).
      ═══════════════════════════════════════════════════════ */
      let plotRight = W;
      try {
        const axW = (chart as any).priceScale?.("right")?.width?.();
        if (Number.isFinite(axW) && axW > 0) plotRight = Math.max(40, W - Math.ceil(axW));
      } catch {}
      let pane0Bottom = H;
      try {
        const ps = (chart as any).paneSize?.(0);
        if (ps && Number.isFinite(ps.height) && ps.height > 0) pane0Bottom = Math.ceil(ps.height);
      } catch {}
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, plotRight, pane0Bottom);
      ctx.clip();

      /* ═══════════════════════════════════════════════════════
         FOOTPRINT MODES — all draw at full candle height (high→low)
         so they're visible at any zoom level
      ═══════════════════════════════════════════════════════ */

      // Order Flow Candles forces bid-ask footprint regardless of setting.
      // When footprint is disabled, resolve to a non-matching mode so NO footprint
      // block renders — but the VP overlay further below still draws.
      const effectiveFP: FootprintType = !footprintEnabled
        ? ("__off__" as FootprintType)
        : (candleType === "orderflow-candles" ? "bid-ask" : footprintType);

      // Per-tool order-flow colors: pick the pair for the active footprint tool so
      // each gear stays independent. Falls back to bid-ask, then hardcoded default.
      const _ofcMap = ofColorsRef.current;
      const _ofc = _ofcMap[effectiveFP] || _ofcMap["bid-ask"] || { buy: [37,99,235] as [number,number,number], sell: [106,13,173] as [number,number,number] };
      const buyRgba  = (a: number | string) => `rgba(${_ofc.buy[0]},${_ofc.buy[1]},${_ofc.buy[2]},${a})`;
      const sellRgba = (a: number | string) => `rgba(${_ofc.sell[0]},${_ofc.sell[1]},${_ofc.sell[2]},${a})`;
      // VP bars + bubbles: green/red (independent, gear-controlled)
      const _vpc = vpColorsRef.current;
      const vpUpRgba  = (a: number | string) => `rgba(${_vpc.up[0]},${_vpc.up[1]},${_vpc.up[2]},${a})`;
      const vpDnRgba  = (a: number | string) => `rgba(${_vpc.dn[0]},${_vpc.dn[1]},${_vpc.dn[2]},${a})`;
      const vpPocRgba = (a: number | string) => `rgba(${_vpc.poc[0]},${_vpc.poc[1]},${_vpc.poc[2]},${a})`;
      const vpVahRgba = (a: number | string) => `rgba(${_vpc.vah[0]},${_vpc.vah[1]},${_vpc.vah[2]},${a})`;
      const vpValRgba = (a: number | string) => `rgba(${_vpc.val[0]},${_vpc.val[1]},${_vpc.val[2]},${a})`;

      // Readable footprint row size + crisp WHITE cell numbers. Every footprint
      // cell number is drawn pure white with a dark halo so it stays legible on
      // royal-blue, royal-purple, or dark backgrounds alike. fs scales with row
      // height but never drops below 10px (was 8px → unreadable).
      // Font must fit inside the row so numbers never overlap between rows.
      // With rows now ≥13px (see numLevels divisor) a 9–12px font sits cleanly.
      const cellFs = (rH: number) => Math.max(9, Math.min(12, Math.floor(rH * 0.6)));
      const cellNum = (txt: string, px: number, py: number, align: CanvasTextAlign, fs: number, color = "#ffffff") => {
        // Leave zero-volume rows BLANK like a pro footprint (TradingView/Bookmap).
        // On crypto, sub-0.005 BTC rows format to "0.00"; painting them turned the
        // whole profile into a wall of "0.00" that read as broken.
        if (txt === "0" || txt === "0.00" || txt === "0.0") return;
        ctx.font = `700 ${fs}px 'JetBrains Mono',monospace`;
        ctx.textAlign = align; ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,0,0,0.95)"; ctx.shadowBlur = 3;
        ctx.fillStyle = color;
        ctx.fillText(txt, px, py);
        ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
      };

      // Helper: draw a rounded-rectangle
      const rr = (x: number, y: number, w: number, h: number, r: number) => {
        if (Math.abs(w) < 0.5 || Math.abs(h) < 0.5) return;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
        else ctx.rect(x, y, w, h);
        ctx.fill();
      };

      /* ══════════════════════════════════════════════════════
         MODE 1: BID × ASK — Deep Charts style
         • Full-width cells: dark base, colored only when one side dominates
         • Green = ask dominant (buying pressure)
         • Purple = bid dominant (selling pressure)
         • Both bid + ask numbers inside each row
         • Thin colored candle border (green bull, purple bear) + wicks
         • Yellow POC border on highest-volume row
         • Delta badge above/below wick
      ══════════════════════════════════════════════════════ */
      if (effectiveFP === "bid-ask") {
        visibleBars.forEach(c => {
          const rawCx = chart.timeScale().timeToCoordinate(c.time as any);
          if (rawCx == null || rawCx < -colW || rawCx > W + colW) return;
          const cx = Math.round(rawCx);

          const rawYH = srs.priceToCoordinate(c.high);
          const rawYL = srs.priceToCoordinate(c.low);
          const rawYO = srs.priceToCoordinate(c.open);
          const rawYC = srs.priceToCoordinate(c.close);
          if (rawYH == null || rawYL == null || rawYO == null || rawYC == null) return;
          const yH = Math.round(rawYH);
          const yL = Math.round(rawYL);
          const yO = Math.round(rawYO);
          const yC = Math.round(rawYC);

          const fullH  = Math.max(2, yL - yH);
          const bodyY  = Math.min(yO, yC);
          const bodyH  = Math.max(2, Math.abs(yC - yO));
          const x      = cx - halfW;
          const isBull = c.close >= c.open;

          const borderColor = isBull ? buyRgba(0.90) : sellRgba(0.90);
          const borderColorDim = isBull ? buyRgba(0.50) : sellRgba(0.50);

          // Min 8px per row ensures every footprint row is clearly readable
          const maxLev = bsp >= 26 ? 14 : bsp >= 16 ? 10 : bsp >= 10 ? 6 : 3;
          const numLevels = Math.max(1, Math.min(maxLev, Math.floor(fullH / 12)));
          const rowH   = fullH / Math.max(1, numLevels);
          const levels = getBarFootprint(c, numLevels);
          // No captured executions means no footprint layer for this bar. In
          // particular, do not paint the dark footprint base over a perfectly
          // valid candle and do not turn unavailable evidence into visual zeroes.
          if (levels.length === 0) return;
          const maxTot = Math.max(1, ...levels.map(l => l.total));

          // ── Dark cell base for entire candle range ──
          ctx.fillStyle = "rgba(15,20,35,0.55)";
          ctx.fillRect(x, yH, colW, fullH);

          // ── POC index ──
          const pocIdx = levels.length > 0
            ? levels.reduce((mi, l, i, a) => l.total > a[mi].total ? i : mi, 0)
            : -1;

          // ── Per-row cells ──
          levels.forEach((lv, li) => {
            const rowY  = Math.round(yH + li * rowH);
            const rH    = Math.max(1, Math.round(yH + (li + 1) * rowH) - rowY - 1);
            const askDom = lv.ask > lv.bid;
            const dom    = Math.max(lv.ask, lv.bid);
            const pass   = Math.min(lv.ask, lv.bid);
            const ratio  = dom / Math.max(1, pass);
            const volFrac = lv.total / maxTot;

            // Only color cells with meaningful dominance (≥1.3×) and volume
            if (ratio >= 1.3 && lv.total > 0) {
              const alpha = Math.min(0.72, 0.22 + volFrac * 0.28 + (ratio - 1.3) * 0.06);
              ctx.fillStyle = askDom
                ? buyRgba(alpha)
                : sellRgba(alpha);
              ctx.fillRect(x, rowY, colW, rH);
            }

            // Row divider
            if (li > 0 && rH >= 3) {
              ctx.fillStyle = "rgba(0,0,0,0.35)";
              ctx.fillRect(x, rowY, colW, 1);
            }

            // Numbers: bid left + ask right (split), or dominant centered (narrow)
            if (showText && rH >= 11) {
              const fs   = cellFs(rH);
              const midY = rowY + rH / 2;
              if (showSplit) {
                // A missing side is absence of observed executions, not a useful
                // numeric zero. Leave it blank so sparse live-forward tape does
                // not recreate the Founder-visible wall of 0.00 labels.
                if (lv.bid > 0) cellNum(fmtV(lv.bid), x + 3, midY, "left", fs);
                if (lv.ask > 0) cellNum(fmtV(lv.ask), x + colW - 3, midY, "right", fs);
              } else {
                const domVal = askDom ? lv.ask : lv.bid;
                cellNum(fmtV(domVal), cx, midY, "center", fs);
              }
            }
          });

          // ── POC row — yellow border ──
          if (pocIdx >= 0) {
            const pocY = Math.round(yH + pocIdx * rowH);
            const pocH = Math.max(1, Math.round(yH + (pocIdx + 1) * rowH) - pocY - 1);
            ctx.strokeStyle = "rgba(240,180,41,0.95)";
            ctx.lineWidth = 1; ctx.setLineDash([]);
            ctx.strokeRect(x + 0.5, pocY + 0.5, colW - 1, pocH);
          }

          // ── Wicks (above body + below body) ──
          ctx.strokeStyle = borderColorDim; ctx.lineWidth = 1; ctx.setLineDash([]);
          if (yH < bodyY) { // upper wick
            ctx.beginPath(); ctx.moveTo(cx + 0.5, yH); ctx.lineTo(cx + 0.5, bodyY); ctx.stroke();
          }
          if (yL > bodyY + bodyH) { // lower wick
            ctx.beginPath(); ctx.moveTo(cx + 0.5, bodyY + bodyH); ctx.lineTo(cx + 0.5, yL); ctx.stroke();
          }

          // ── Candle body border ──
          ctx.strokeStyle = borderColor; ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, bodyY + 0.5, colW - 1, bodyH - 1);

          // ── Delta badge ──
          if (showBadges) {
            const netDelta = levels.reduce((s, l) => s + l.ask - l.bid, 0);
            const isPos    = netDelta >= 0;
            const dLbl     = (isPos ? "+" : "") + fmtV(netDelta);
            const bW = Math.max(colW + 2, 28), bH = 13;
            const bY = yH - bH - 3;
            ctx.fillStyle = isPos ? buyRgba(0.92) : sellRgba(0.92);
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(cx - bW/2, bY, bW, bH, 2);
            else ctx.rect(cx - bW/2, bY, bW, bH);
            ctx.fill();
            ctx.fillStyle = "#fff"; ctx.font = "bold 9px 'JetBrains Mono',monospace";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(dLbl, cx, bY + bH / 2);
          }
        });
      }

      /* ══════════════════════════════════════════════════════
         MODE 2: DELTA — rows across full candle height,
         green/red fill intensity proportional to net delta,
         bid/ask numbers per row when zoomed, badge below wick
      ══════════════════════════════════════════════════════ */
      if (effectiveFP === "delta") {
        visibleBars.forEach(c => {
          const rawCx = chart.timeScale().timeToCoordinate(c.time as any);
          if (rawCx == null || rawCx < -colW || rawCx > W + colW) return;
          const cx = Math.round(rawCx);
          const rawYH = srs.priceToCoordinate(c.high);
          const rawYL = srs.priceToCoordinate(c.low);
          if (rawYH == null || rawYL == null) return;
          const yH = Math.round(rawYH);
          const yL = Math.round(rawYL);

          const fullH = Math.max(2, yL - yH);
          // Min 8px per row ensures every footprint row is clearly readable
          const maxLev = bsp >= 26 ? 14 : bsp >= 16 ? 10 : bsp >= 10 ? 6 : 3;
          const numLevels = Math.max(1, Math.min(maxLev, Math.floor(fullH / 12)));
          const rowH   = fullH / Math.max(1, numLevels);
          const levels = getBarFootprint(c, numLevels);
          // Empty means unavailable, not zero. Skip the whole bar before the
          // background/POC pass so historical candles stay readable and reduce()
          // is never asked to manufacture a winner from an empty collection.
          if (levels.length === 0) return;

          // Dark base
          ctx.fillStyle = "rgba(15,20,35,0.55)";
          ctx.fillRect(cx - halfW, yH, colW, fullH);

          const maxTotD = Math.max(1, ...levels.map(l => l.total));
          const pocIdxD = levels.reduce((mi, l, i, a) => l.total > a[mi].total ? i : mi, 0);

          levels.forEach((lv, li) => {
            const rowY  = Math.round(yH + li * rowH);
            const rH    = Math.max(1, Math.round(yH + (li + 1) * rowH) - rowY - 1);
            const delta = lv.ask - lv.bid;
            const volFrac = lv.total / maxTotD;
            // Blue for positive delta (ask dominant), red for negative (bid dominant)
            const intensity = Math.min(0.75, 0.20 + volFrac * 0.30 + Math.abs(delta) / Math.max(1, lv.total) * 0.40);
            if (lv.total > 0) {
              ctx.fillStyle = delta >= 0
                ? buyRgba(intensity)   // royal blue — buying pressure
                : sellRgba(intensity); // royal purple — selling pressure
              ctx.fillRect(cx - halfW, rowY, colW, rH);
            }

            // Row divider
            if (li > 0 && rH >= 3) {
              ctx.fillStyle = "rgba(0,0,0,0.30)";
              ctx.fillRect(cx - halfW, rowY, colW, 1);
            }

            if (showText && rH >= 11) {
              const fs = cellFs(rH);
              const midY = rowY + rH / 2;
              if (showSplit) {
                if (lv.bid > 0) cellNum(fmtV(lv.bid), cx - halfW + 3, midY, "left", fs);
                if (lv.ask > 0) cellNum(fmtV(lv.ask), cx + halfW - 3, midY, "right", fs);
              } else {
                const dVal = lv.ask - lv.bid;
                cellNum((dVal >= 0 ? "+" : "") + fmtV(Math.abs(dVal)), cx, midY, "center", fs);
              }
            }

            // POC yellow border
            if (li === pocIdxD) {
              ctx.strokeStyle = "rgba(240,180,41,0.95)"; ctx.lineWidth = 1; ctx.setLineDash([]);
              ctx.strokeRect(cx - halfW + 0.5, rowY + 0.5, colW - 1, rH);
            }
          });

          if (showBadges) {
            const netDelta = levels.reduce((s, l) => s + l.ask - l.bid, 0);
            const isPos = netDelta >= 0;
            const dLbl = (isPos ? "Δ+" : "Δ") + fmtV(Math.abs(netDelta));
            const bColor = isPos ? buyRgba(0.92) : sellRgba(0.92);
            const bW = Math.max(colW + 2, 26), bH = 13;
            ctx.fillStyle = bColor;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(cx - bW/2, yH - bH - 3, bW, bH, 2);
            else ctx.rect(cx - bW/2, yH - bH - 3, bW, bH);
            ctx.fill();
            ctx.fillStyle = "#fff"; ctx.font = "bold 9px 'JetBrains Mono',monospace";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(dLbl, cx, yH - bH - 3 + bH / 2);
          }
        });
      }

      /* ══════════════════════════════════════════════════════
         WM DELTA BUBBLES — separate from Big Trades.
         Net aggressive delta per price zone; only in delta footprint mode.
      ══════════════════════════════════════════════════════ */
      if (effectiveFP === "delta") {
        const realTapeD = hasRealAggressorTape(tapeSourceRef.current ?? "");
        if (!realTapeD) {
          if (deltaBubblesRef.current.length) {
            deltaBubblesRef.current = [];
            deltaBubbleSpawnRef.current = new Set();
          }
        } else if (!bubblePausedRef.current) {
          visibleBars.forEach(c => {
            const rawCx = chart.timeScale().timeToCoordinate(c.time as any);
            if (rawCx == null || rawCx < -colW || rawCx > W + colW) return;
            const cx = Math.round(rawCx);
            const ranked = getDeltaBubbleLevels(c);
            if (ranked.length === 0) return;
            // The peak is taken over the SAME quantity each bubble is sized
            // by, asked of the claim owner. Taking it over a different
            // quantity than the numerator is how the big-trade path one
            // screen down came to draw a ranking its own tooltips contradict.
            const maxAbsD = Math.max(
              ...ranked.map(l => bubbleClaimMagnitude("delta", l.bid, l.ask)),
              1e-9,
            );
            ranked.forEach((lv, rankIdx) => {
              // Identity is OWNED by src/lib/deltaBubbleLevels.ts, exactly as
              // the big-trade path one screen down delegates to
              // `bigTradeLevelKey`. This used to be an inline
              // key built from the bar time and the bucket INDEX, which on a
              // live bar is an offset into a lattice the market is still
              // redrawing. The dead formula is deliberately NOT quoted here:
              // the adoption Sentinel forbids that shape anywhere in this
              // file, and a copy in a comment is how it finds its way back.
              // See that function's header for the measured table
              // and for the two silent failures it caused (a zone spawning
              // twice, and a real aggressor zone never drawing because another
              // price had already claimed its index earlier in the bar).
              const spawnKey = deltaBubbleLevelKey(c.time as number, lv);
              if (deltaBubbleSpawnRef.current.has(spawnKey)) return;
              deltaBubbleSpawnRef.current.add(spawnKey);
              // The magnitude this bubble CLAIMS, asked of bubbleClaim.ts —
              // the same owner the tooltip asks. For a delta zone that is the
              // net, so this is `Math.abs(lv.delta)` by a different route; the
              // route is the point. It was already equal here by coincidence,
              // and the big-trade path is the proof that a coincidence is not
              // a guarantee. See `bubbleClaimMagnitude`'s header.
              const absDelta = bubbleClaimMagnitude("delta", lv.bid, lv.ask);
              // Size is OWNED by src/lib/bubbleDrawGeometry.ts. It used to be
              // an inline `11 + sqrt(share) * 14`, whose 11px baseline painted
              // a zone carrying NOTHING at ~19% of the peak bubble's area —
              // the exact "fake-wide" failure vpDrawGeometry.ts already
              // names for Volume Profile bars. The owner encodes value as
              // AREA (the honest reading of a disc) and keeps the minimum as a
              // floor rather than a baseline. See that header.
              const baseR = deltaBubbleRadius(absDelta, maxAbsD);
              const side: "buy" | "sell" = lv.delta >= 0 ? "buy" : "sell";
              const sph = Math.sin((c.time as number) * 0.023 + lv.priceLevel * 0.417 + rankIdx * 2.1) * 43758.5453;
              const phase = (sph - Math.floor(sph)) * Math.PI * 2;
              const rawLevY = srs.priceToCoordinate(lv.priceLevel);
              if (rawLevY == null) return;
              deltaBubblesRef.current.push({
                id: ++bubbleIdRef.current,
                x: cx, y: Math.round(rawLevY), vx: 0, vy: 0,
                baseR, r: baseR * 0.35, phase, big: false,
                side,
                value: (side === "buy" ? 1 : -1) * absDelta,
                bid: lv.bid,
                ask: lv.ask,
                born: (c.time as number) * 1000 + rankIdx + 500,
                anchorTime: c.time as number,
                anchorBarTime: c.time as number,
                anchorPrice: lv.priceLevel,
                levelIdx: rankIdx,
                siblingN: ranked.length,
                kind: "delta",
                spawnKey,
              });
            });
          });
        }
        // Eviction is a consequence of a bubble LEAVING (see the off-screen
        // delete below), never of a counter tripping. The old line here
        // replaced this set with an empty one on a size trip, which re-admitted
        // every zone still on screen and drew a second disc on top of the first.
        deltaBubbleSpawnRef.current = compactSpawnKeys(deltaBubbleSpawnRef.current, deltaBubblesRef.current);

        // ── SIZE IS A CLAIM ABOUT THE FRAME, NOT ABOUT ONE BAR ──────────
        // The single writer of `baseR` for delta bubbles. The spawn loop
        // above seeds it against its own bar's peak purely so the ease-in has
        // a proportion to grow from; this pass overwrites every bubble before
        // anything is painted, so that seed is never a claim anyone reads.
        // Peak over the bubbles ON SCREEN is what makes two discs in one
        // frame comparable — see bubbleFramePeak.
        const deltaFramePeak = bubbleFramePeak(deltaBubblesRef.current.map(b => b.value));
        for (const b of deltaBubblesRef.current) {
          const nextR = deltaBubbleRadius(Math.abs(b.value), deltaFramePeak);
          if (nextR === b.baseR) continue;
          // Carry the spawn ease-in across the rescale as a PROPORTION, so a
          // bubble mid-grow is re-aimed rather than snapped to full size.
          b.r = b.baseR > 0 ? (b.r / b.baseR) * nextR : nextR;
          b.baseR = nextR;
        }

        const nowDelta = performance.now();
        for (const b of deltaBubblesRef.current) {
          const hx = chart.timeScale().timeToCoordinate(b.anchorTime as any);
          const hy = srs.priceToCoordinate(b.anchorPrice);
          if (hx == null || hy == null) continue;
          const bob = Math.sin(b.phase + nowDelta / 1600) * 3;
          const sibN = b.siblingN ?? 1;
          const lvlIx = b.levelIdx ?? 0;
          const spread = sibN > 1 ? Math.min(34, Math.max(18, b.baseR)) : 0;
          const offX = sibN > 1 ? (lvlIx - (sibN - 1) / 2) * spread : 0;
          const homeX = hx + offX + Math.cos(b.phase + nowDelta / 2400) * 2;
          const homeY = hy + bob - 3;
          b.vx += (homeX - b.x) * 0.012; b.vy += (homeY - b.y) * 0.012;
          b.vx *= 0.93; b.vy *= 0.93;
          b.x += b.vx; b.y += b.vy;
          if (b.r < b.baseR) b.r += (b.baseR - b.r) * 0.12;
        }
        const deltaSurvivors: Bubble[] = [];
        for (const b of deltaBubblesRef.current) {
          const hx = chart.timeScale().timeToCoordinate(b.anchorTime as any);
          if (hx == null || hx < -80 || hx > W + 80) {
            deltaBubbleSpawnRef.current.delete(b.spawnKey);
            continue;
          }
          deltaSurvivors.push(b);
        }
        deltaBubblesRef.current = deltaSurvivors;

        const hoverIdD = bubbleHoverRef.current;
        for (const b of deltaBubblesRef.current) {
          const buy = b.side === "buy";
          const core = buy ? "34,197,94" : "239,68,68";
          const isHover = hoverIdD === b.id;
          const t = nowDelta / 520 + b.phase;
          const wob = 1 + Math.sin(t) * 0.05;
          const Rx = Math.max(0.1, b.r * wob);
          const Ry = Math.max(0.1, b.r / wob);
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, Rx + 4, Ry + 4, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${core},0.10)`;
          ctx.fill();
          const g = ctx.createRadialGradient(b.x, b.y, Rx * 0.2, b.x, b.y, Rx);
          g.addColorStop(0, `rgba(${core},0.04)`);
          g.addColorStop(0.72, `rgba(${core},0.08)`);
          g.addColorStop(0.93, `rgba(${core},0.26)`);
          g.addColorStop(1, `rgba(255,255,255,0.32)`);
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, Rx, Ry, 0, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, Math.max(0.1, Rx - 0.6), Math.max(0.1, Ry - 0.6), 0, 0, Math.PI * 2);
          ctx.lineWidth = isHover ? 2.6 : 1.7;
          ctx.strokeStyle = `rgba(255,255,255,${isHover ? 0.98 : 0.82})`;
          ctx.stroke();
          if (b.r >= 7) {
            const p = b.anchorPrice;
            const lbl = p >= 100 ? p.toFixed(2) : p >= 1 ? p.toFixed(2) : p.toFixed(4);
            const fontPx = Math.max(8, Math.min(13, Rx * 0.48));
            ctx.font = `bold ${fontPx}px Inter, monospace`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.lineWidth = Math.max(2, fontPx * 0.22);
            ctx.strokeStyle = "rgba(0,0,0,0.88)";
            ctx.strokeText(lbl, b.x, b.y);
            ctx.fillStyle = "rgba(255,255,255,0.99)";
            ctx.fillText(lbl, b.x, b.y);
          }
          ctx.restore();
        }
      } else if (deltaBubblesRef.current.length) {
        deltaBubblesRef.current = [];
        deltaBubbleSpawnRef.current = new Set();
      }

      /* ══════════════════════════════════════════════════════
         MODE 3: VOLUME PROFILE — horizontal VP bars per bar
         Full candle height, bid left / ask right split bars,
         bid/ask numbers at each row, gold POC line
      ══════════════════════════════════════════════════════ */
      if (effectiveFP === "volume-profile") {
        visibleBars.forEach(c => {
          const rawCx = chart.timeScale().timeToCoordinate(c.time as any);
          if (rawCx == null || rawCx < -colW || rawCx > W + colW) return;
          const cx = Math.round(rawCx);
          const rawYH = srs.priceToCoordinate(c.high);
          const rawYL = srs.priceToCoordinate(c.low);
          if (rawYH == null || rawYL == null) return;
          const yH = Math.round(rawYH);
          const yL = Math.round(rawYL);

          const fullH     = Math.max(4, yL - yH);
          // Min 8px per row ensures every footprint row is clearly readable
          const maxLev = bsp >= 26 ? 14 : bsp >= 16 ? 10 : bsp >= 10 ? 6 : 3;
          const numLevels = Math.max(1, Math.min(maxLev, Math.floor(fullH / 12)));
          const rowH   = fullH / Math.max(1, numLevels);
          const levels = getBarFootprint(c, numLevels);
          if (levels.length === 0) return;
          const maxTot = Math.max(1, ...levels.map(l => l.total));
          const maxBarW = halfW - 1;

          // Dark base
          ctx.fillStyle = "rgba(15,20,35,0.50)";
          ctx.fillRect(cx - halfW, yH, colW, fullH);

          // Draw VP bars — ask left (green), bid right (purple)
          levels.forEach((lv, li) => {
            const rowY   = Math.round(yH + li * rowH);
            const rH     = Math.max(1, Math.round(yH + (li + 1) * rowH) - rowY - 1);
            const frac   = lv.total / maxTot;
            const alpha  = 0.18 + frac * 0.42; // 0.18–0.60
            const askW   = Math.round((lv.ask / maxTot) * maxBarW);
            const bidW   = Math.round((lv.bid / maxTot) * maxBarW);

            // Ask bars grow left from center (green)
            ctx.fillStyle = buyRgba(alpha.toFixed(2));
            ctx.fillRect(cx - askW, rowY, askW, rH);
            // Bid bars grow right from center (purple)
            ctx.fillStyle = sellRgba(alpha.toFixed(2));
            ctx.fillRect(cx, rowY, bidW, rH);

            // Row divider
            if (li > 0 && rH >= 3) {
              ctx.fillStyle = "rgba(0,0,0,0.30)";
              ctx.fillRect(cx - halfW, rowY, colW, 1);
            }

            if (showText && rH >= 11) {
              const fs = cellFs(rH);
              const midY = rowY + rH / 2;
              if (showSplit) {
                if (lv.ask > 0) cellNum(fmtV(lv.ask), cx - 3, midY, "right", fs);
                if (lv.bid > 0) cellNum(fmtV(lv.bid), cx + 3, midY, "left", fs);
              } else {
                cellNum(fmtV(lv.total), cx, midY, "center", fs);
              }
            }
          });

          // POC — thin gold horizontal line only (no label unless very zoomed)
          const pocIdx = levels.reduce((mi, l, i, a) => l.total > a[mi].total ? i : mi, 0);
          const pocY   = Math.round(yH + pocIdx * rowH + rowH / 2);
          ctx.strokeStyle = "rgba(240,180,41,0.70)"; ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.beginPath(); ctx.moveTo(cx - halfW, pocY); ctx.lineTo(cx + halfW, pocY); ctx.stroke();
          ctx.setLineDash([]);
        });
      }

      /* ══════════════════════════════════════════════════════
         MODE 4: IMBALANCE — full candle height rows,
         highlight cells where bid/ask ratio ≥ 2.5×,
         show ratio text, badge above wick when notable
      ══════════════════════════════════════════════════════ */
      if (effectiveFP === "imbalance") {
        visibleBars.forEach(c => {
          const rawCx = chart.timeScale().timeToCoordinate(c.time as any);
          if (rawCx == null || rawCx < -colW || rawCx > W + colW) return;
          const cx = Math.round(rawCx);
          const rawYH = srs.priceToCoordinate(c.high);
          const rawYL = srs.priceToCoordinate(c.low);
          if (rawYH == null || rawYL == null) return;
          const yH = Math.round(rawYH);
          const yL = Math.round(rawYL);

          const fullH  = Math.max(2, yL - yH);
          const maxLev2 = bsp >= 26 ? 14 : bsp >= 16 ? 10 : bsp >= 10 ? 6 : 3;
          const numLev = Math.max(1, Math.min(maxLev2, Math.floor(fullH / 12)));
          const rowH   = fullH / Math.max(1, numLev);
          const levels = getBarFootprint(c, numLev);
          if (levels.length === 0) return;
          const x      = cx - halfW;

          levels.forEach((lv, li) => {
            const rowY   = Math.round(yH + li * rowH);
            const rH     = Math.max(1, Math.round(yH + (li + 1) * rowH) - rowY - 1);
            const ratio  = lv.ask > 0 && lv.bid > 0
              ? Math.max(lv.ask, lv.bid) / Math.min(lv.ask, lv.bid)
              : (lv.ask > 0 || lv.bid > 0 ? 8 : 1);

            if (ratio < 2.5) return; // only draw imbalanced cells

            const askDom = lv.ask > lv.bid;
            const alpha  = Math.min(0.88, 0.45 + (ratio - 2.5) * 0.08);
            ctx.fillStyle = askDom ? buyRgba(alpha) : sellRgba(alpha);
            ctx.fillRect(x, rowY, colW, rH);

            if (showText && rH >= 11) {
              const fs = cellFs(rH);
              const midY = rowY + rH / 2;
              if (showSplit) {
                if (lv.ask > 0) cellNum(fmtV(lv.ask), x + 3, midY, "left", fs);
                if (lv.bid > 0) cellNum(fmtV(lv.bid), x + colW - 3, midY, "right", fs);
              } else {
                cellNum(`${ratio.toFixed(1)}×`, cx, midY, "center", fs);
              }
            }
          });

          // Imbalance badge — only when zoomed in enough
          if (showBadges) {
            const totAsk  = levels.reduce((s, l) => s + l.ask, 0);
            const totBid  = levels.reduce((s, l) => s + l.bid, 0);
            const totRatio = totAsk > 0 && totBid > 0
              ? Math.max(totAsk, totBid) / Math.min(totAsk, totBid) : 1;
            if (totRatio >= 2.0) {
              const bW = Math.max(colW + 4, 28), bH = 13;
              const bY = yH - bH - 2;
              ctx.fillStyle = totAsk > totBid ? buyRgba(0.90) : sellRgba(0.90);
              ctx.beginPath();
              if (ctx.roundRect) ctx.roundRect(cx - bW/2, bY, bW, bH, 2);
              else ctx.rect(cx - bW/2, bY, bW, bH);
              ctx.fill();
              ctx.fillStyle = "#fff"; ctx.font = "bold 11px monospace";
              ctx.textAlign = "center"; ctx.textBaseline = "middle";
              ctx.fillText(`${totRatio.toFixed(1)}×`, cx, bY + bH / 2);
            }
          }
        });
      }

      /* ══════════════════════════════════════════════════════
         MODE 5: AGGRESSIVE / PASSIVE
         Green = aggressive buying (market orders lifting the ask)
         Red   = aggressive selling (market orders hitting the bid)
         Only highlights rows with clear aggression (ratio ≥ 1.5×).
         Neutral rows show a faint background only.
      ══════════════════════════════════════════════════════ */
      if (effectiveFP === "aggressive-passive") {
        visibleBars.forEach(c => {
          const rawCx = chart.timeScale().timeToCoordinate(c.time as any);
          if (rawCx == null || rawCx < -colW || rawCx > W + colW) return;
          const cx = Math.round(rawCx);
          const rawYH = srs.priceToCoordinate(c.high);
          const rawYL = srs.priceToCoordinate(c.low);
          if (rawYH == null || rawYL == null) return;
          const yH = Math.round(rawYH);
          const yL = Math.round(rawYL);

          const fullH  = Math.max(2, yL - yH);
          const maxLev2 = bsp >= 26 ? 14 : bsp >= 16 ? 10 : bsp >= 10 ? 6 : 3;
          const numLev = Math.max(1, Math.min(maxLev2, Math.floor(fullH / 12)));
          const rowH   = fullH / Math.max(1, numLev);
          const levels = getBarFootprint(c, numLev);
          if (levels.length === 0) return;
          const x      = cx - halfW;

          // Faint neutral background for the entire candle range
          ctx.fillStyle = "rgba(100,120,160,0.07)";
          ctx.fillRect(x, yH, colW, fullH);

          levels.forEach((lv, li) => {
            const rowY   = Math.round(yH + li * rowH);
            const rH     = Math.max(1, Math.round(yH + (li + 1) * rowH) - rowY - 1);
            const tot    = lv.ask + lv.bid;
            if (tot === 0) return;

            // ── ROLE-COLORED CELL BOXES (numbers stay crisp white) ──────────
            // Each level splits into a LEFT half (ask / buyer-initiated) and a
            // RIGHT half (bid / seller-initiated). Each half is tinted by its LIVE
            // role at this price level:
            //   ask near the HIGH → Passive Sellers (orange), else Aggressive Buyers (blue)
            //   bid near the LOW  → Passive Buyers (gray),   else Aggressive Sellers (purple)
            // Alpha is scaled by that side's share of the level so the dominant
            // side reads stronger — but capped soft (~0.56) so it's clean and easy
            // on the eyes, never harsh neon. The number rides on top in white with
            // a dark shadow for maximum legibility. Every level with volume paints
            // (the old ≥1.5× gate that left rows blank is gone).
            const askShare = lv.ask / tot, bidShare = lv.bid / tot;
            const askAlpha = 0.14 + askShare * 0.42;
            const bidAlpha = 0.14 + bidShare * 0.42;
            const askFill  = lv.relPos > 0.80 ? `rgba(255,149,0,${askAlpha.toFixed(2)})`   : buyRgba(askAlpha.toFixed(2));
            const bidFill  = lv.relPos < 0.20 ? `rgba(148,163,184,${bidAlpha.toFixed(2)})` : sellRgba(bidAlpha.toFixed(2));
            const halfW2   = Math.round(colW / 2);
            ctx.fillStyle = askFill; ctx.fillRect(x, rowY, halfW2, rH);
            ctx.fillStyle = bidFill; ctx.fillRect(x + halfW2, rowY, colW - halfW2, rH);

            if (showText && rH >= 11) {
              const fs  = cellFs(rH);
              const midY = rowY + rH / 2;
              if (showSplit) {
                if (lv.ask > 0) cellNum(fmtV(lv.ask), x + 3, midY, "left", fs);          // white
                if (lv.bid > 0) cellNum(fmtV(lv.bid), x + colW - 3, midY, "right", fs);  // white
              } else {
                cellNum(fmtV(Math.max(lv.ask, lv.bid)), cx, midY, "center", fs);
              }
            }
          });

          // Row dividers — only when zoomed in enough
          if (bsp >= 16) {
            ctx.strokeStyle = "rgba(0,0,0,0.20)"; ctx.lineWidth = 1; ctx.setLineDash([]);
            for (let li = 1; li < numLev; li++) {
              const ly = Math.round(yH + li * rowH);
              ctx.beginPath(); ctx.moveTo(x, ly); ctx.lineTo(x + colW, ly); ctx.stroke();
            }
          }

          if (showWinner) {
            // ── PER-CANDLE ORDER-FLOW SUMMARY ──────────────────────────────
            // Four REAL numbers, computed live from THIS candle's captured
            // executed-trade footprint. Nothing is reconstructed or hardcoded.
            //
            //   ask = buyer-initiated (market buy lifting the offer)
            //   bid = seller-initiated (market sell hitting the bid)
            //   relPos: 0 = candle LOW, 1 = candle HIGH
            //
            //   Aggressive Buyers  (blue)   = ask volume that DROVE price
            //   Passive  Sellers   (orange) = ask volume ABSORBED at the high wick
            //   Aggressive Sellers (purple) = bid volume that DROVE price
            //   Passive  Buyers    (gray)   = bid volume ABSORBED at the low wick
            // Read the roles from the FIXED sub-profile, never from the display
            // bins: `numLev` changes with zoom, so a relPos>0.80 test against
            // display bins would re-slice (and re-total) these four numbers every
            // time the user zoomed. getBarRoles integrates the same fixed grid.
            const { aggBuy, aggSell, pasBuy, pasSell } = getBarRoles(c);
            const BLUE = buyRgba(0.98), PURPLE = sellRgba(0.98);
            const GRAY = "rgba(148,163,184,0.98)", ORANGE = "rgba(255,149,0,0.98)";

            // ── DOMINANT WINNER ───────────────────────────────────────────
            // The single biggest of the four real roles decides the headline
            // label + its total volume (e.g. "AGG BUYS 113.2k").
            const roles: Array<{ v: number; lbl: string; col: string; txt: string }> = [
              { v: aggBuy,  lbl: "AGG BUYS",  col: BLUE,   txt: "#fff"    },
              { v: aggSell, lbl: "AGG SELLS", col: PURPLE, txt: "#fff"    },
              { v: pasBuy,  lbl: "PSV BUYS",  col: GRAY,   txt: "#0b1220" },
              { v: pasSell, lbl: "PSV SELLS", col: ORANGE, txt: "#fff"    },
            ];
            const win = roles.reduce((a, b) => (b.v > a.v ? b : a));

            // ── COMPACT WINNER PILL: "AGG BUYS 113.2k" ─────────────────────
            // Single prominent pill above the candle high — readable at normal
            // zoom (label text + volume value on one line). Skip flat/empty
            // candles (win.v === 0) so we never paint a meaningless "AGG BUYS 0".
            const pillH  = 15;
            const pillY  = yH - pillH - 3;                       // just above candle high
            if (win.v > 0) {
              const pillTxt = `${win.lbl} ${fmtV(win.v)}`;
              ctx.font = "bold 11px monospace";
              const pillW  = Math.max(colW + 6, ctx.measureText(pillTxt).width + 12);
              ctx.fillStyle = win.col;
              ctx.beginPath();
              if (ctx.roundRect) ctx.roundRect(cx - pillW / 2, pillY, pillW, pillH, 3);
              else ctx.rect(cx - pillW / 2, pillY, pillW, pillH);
              ctx.fill();
              ctx.fillStyle = win.txt;
              ctx.textAlign = "center"; ctx.textBaseline = "middle";
              ctx.fillText(pillTxt, cx, pillY + pillH / 2 + 0.5);
            }

            if (showBadges) {
              // ── DETAILED 2×2 GRID (only when zoomed in) ──────────────────
              // The four short values (e.g. 33k / 40k / 10k / 7k) sit cleanly
              // above the winner pill. Grid ≈ colW wide; only at bsp≥70.
              const cells: Array<[number, string]> = [
                [aggBuy,  BLUE],    // blue   top-left
                [aggSell, PURPLE],  // purple top-right
                [pasBuy,  GRAY],    // gray   bottom-left
                [pasSell, ORANGE],  // orange bottom-right
              ];
              const rowH_s = 13;
              const colW_s = Math.max(34, Math.round(colW / 2) + 2);
              const totalW = colW_s * 2;
              const left   = cx - totalW / 2;
              const gridTop = pillY - (rowH_s * 2) - 6;          // grid above the winner pill

              ctx.fillStyle = "rgba(11,18,32,0.68)";
              ctx.beginPath();
              if (ctx.roundRect) ctx.roundRect(left - 2, gridTop - 2, totalW + 4, rowH_s * 2 + 4, 3);
              else ctx.rect(left - 2, gridTop - 2, totalW + 4, rowH_s * 2 + 4);
              ctx.fill();

              ctx.font = "bold 11px monospace";
              ctx.textBaseline = "middle";
              cells.forEach(([val, col], idx) => {
                const colIdx = idx % 2, rowIdx = Math.floor(idx / 2);
                const cxCell = left + colIdx * colW_s + colW_s / 2;
                const cyCell = gridTop + rowIdx * rowH_s + rowH_s / 2;
                ctx.fillStyle = col;
                ctx.textAlign = "center";
                ctx.fillText(fmtV(val), cxCell, cyCell);
              });
            }
          }
        });

        // (Per-tool "?" popover carries the deep explanation; the shared 4-way
        // legend below stamps the live numbers for every order-flow mode.)
      }

      /* ══════════════════════════════════════════════════════
         SHARED ORDER-FLOW LEGEND — REMOVED FROM THE CHART.
         Per user's explicit request the four-role Aggressive/Passive
         legend no longer draws on the chart canvas (it was cluttering
         the top-left corner). The beginner-friendly 4-way legend with
         plain-English descriptions now lives ONLY in the per-tool gear
         popover — see FootprintControls.tsx (OrderFlowColorGear, the
         "Agg/Passive 4-way legend" block). Nothing is stamped here.
      ══════════════════════════════════════════════════════ */

      /* ══════════════════════════════════════════════════════
         MODE 6: BIG TRADES — Deep Charts style
         Standard green/purple candle bodies + wicks.
         Circles drawn at the highest-volume price level when
         that level is ≥2× the average level volume.
         Circle size ∝ relative volume. Green = ask dominant,
         pink/magenta = bid dominant.
      ══════════════════════════════════════════════════════ */
      // Big Trades draws when it's the active exclusive mode OR when Simultaneous
      // Mode is on (bigTradesOverlay) — in the latter case the primary order-flow
      // block above has already drawn, and we paint the bubbles on top.
      if (effectiveFP === "big-trades" || bigTradesOverlay) {
        // ── Pause / Refresh controls (toolbar gear dropdown) ──────────────
        // Refresh: wipe all bubbles + the per-bar dedupe set so the engine
        // re-detects and re-spawns from scratch this frame.
        if (bubbleRefreshRef.current !== bubbleRefreshSeenRef.current) {
          bubbleRefreshSeenRef.current = bubbleRefreshRef.current;
          bubblesRef.current = [];
          bubbleSpawnRef.current = new Set();
        }
        const bubblesPaused = bubblePausedRef.current;
        const realTape = hasRealAggressorTape(tapeSourceRef.current ?? "");

        // No real aggressor tape → never show synthetic/demo bubbles.
        if (!realTape) {
          if (bubblesRef.current.length) {
            bubblesRef.current = [];
            bubbleSpawnRef.current = new Set();
            bubbleHoverRef.current = null;
          }
        } else if (!bubblesPaused) {
        // ── Pass A: Big Trades — individual large prints at EXACT tick prices.
        visibleBars.forEach(c => {
          const rawCx = chart.timeScale().timeToCoordinate(c.time as any);
          if (rawCx == null || rawCx < -colW || rawCx > W + colW) return;
          const cx = Math.round(rawCx);

          const ranked = getRealBigTradeLevels(c);
          if (ranked.length === 0) return;

          // Size normalizes against the bar's LARGEST print, not its mean. A
          // mean is dragged upward by the very outlier the bubble exists to
          // show, so under the old form one new block trade silently SHRANK
          // every other bubble on the bar with no change in their own volume.
          //
          // ── 2026-09-18: AND IT WAS STILL THE WRONG QUANTITY ──────────────
          // `lv.total` is the level's TWO-SIDED total, which is precisely the
          // number bubbleClaim.ts removed from under the word BUY when it
          // decided the headline is the DOMINANT side's own volume. The words
          // were fixed and the pixels were not, so one bubble made two
          // different magnitude claims at once — and the picture INVERTED the
          // ranking of the number it printed (ask 10,000/bid 0 drew smaller
          // than ask 6,000/bid 5,000). Size now asks the same owner the
          // tooltip asks, over the same quantity, numerator and peak alike.
          const barPeak = ranked.reduce(
            (m, lv) => Math.max(m, bubbleClaimMagnitude("big-trade", lv.bid, lv.ask)),
            0,
          );
          // The mean survives for one honest purpose: deciding whether this
          // print is loud RELATIVE to the bar, which is an audio question
          // about the data, not a question about how many pixels were painted.
          const barMean = ranked.reduce((s, lv) => s + lv.total, 0) / ranked.length;

          ranked.forEach((lv, rankIdx) => {
            // Identity comes from the owner, built on the EXACT printed price.
            // It used to be built here from a display-rounded one, which merged
            // separate block trades into a single key on crypto.
            const spawnKey = bigTradeLevelKey(c.time as number, lv);
            if (bubbleSpawnRef.current.has(spawnKey)) return;

            // Size is OWNED by src/lib/bubbleDrawGeometry.ts. The inline form
            // that used to live here clamped at 28px, so every print from 4×
            // the bar mean upward painted an IDENTICAL bubble, and its
            // `ratio - 1` floored at zero, so every print at or below the mean
            // collapsed into one indistinguishable dot. Both ends of the range
            // were a picture of the shaping function rather than of the trade.
            const baseR = bigTradeBubbleRadius(
              bubbleClaimMagnitude("big-trade", lv.bid, lv.ask),
              barPeak,
            );
            const side: "buy" | "sell" = lv.ask >= lv.bid ? "buy" : "sell";
            // The magnitude this bubble claims — signed for side only. It used
            // to be `Math.round(lv.total)`: the two-sided total (the wrong
            // quantity, per bubbleClaim.ts) put through a DISPLAY rounding
            // that erased sub-1 crypto sizes entirely. `value` is now the
            // sizing input for the frame-wide rescale below, so a lossy
            // display number in it would become a lossy radius.
            const value = (side === "buy" ? 1 : -1) * bubbleClaimMagnitude("big-trade", lv.bid, lv.ask);
            const sph   = Math.sin((c.time as number) * 0.017 + lv.priceLevel * 0.531 + rankIdx * 1.7) * 43758.5453;
            const phase = (sph - Math.floor(sph)) * Math.PI * 2;
            const rawLevY = srs.priceToCoordinate(lv.priceLevel);
            if (rawLevY == null) return;
            const barTime = c.time as number;
            const exactTime = lv.timeMs != null ? lv.timeMs / 1000 : barTime;
            const anchor = bigTradeAnchor({ barX: cx, barTime, eventTime: exactTime,
              intervalSec: intervalSec ?? 60, barSpacing: bsp, priceY: rawLevY });
            if (!anchor) return;
            bubbleSpawnRef.current.add(spawnKey);

            bubblesRef.current.push({
              id:    ++bubbleIdRef.current,
              x:     anchor.x,  y: anchor.y,  vx: 0, vy: 0,
              baseR,
              r:     baseR * 0.35,
              phase,
              big:   true,
              side,
              value,
              bid:   lv.bid,
              ask:   lv.ask,
              born:  lv.timeMs ?? barTime * 1000 + rankIdx,
              anchorTime: exactTime,
              anchorBarTime: barTime,
              anchorPrice: lv.priceLevel,
              levelIdx: rankIdx,
              siblingN: ranked.length,
              kind: "big-trade",
              spawnKey,
              aggressorMethod: lv.aggressorMethod,
            });
            // Loudness is a question about the TRADE, not about the pixels.
            // This used to read `baseR > 24`, which worked only by accident of
            // the old clamp; with size normalized to the bar's peak the
            // largest print always reaches the ceiling, so a pixel test would
            // sound the loud tone once every single bar. Ask the data instead.
            playBloop(lv.total >= barMean * 3);
          });
        });
        }

        // Keep the dedupe set bounded WITHOUT dropping a key a live bubble is
        // holding — the same defect the delta path carried. See
        // src/lib/bubbleSpawnCache.ts for the measured failure.
        bubbleSpawnRef.current = compactSpawnKeys(bubbleSpawnRef.current, bubblesRef.current);

        // ── SIZE IS A CLAIM ABOUT THE FRAME, NOT ABOUT ONE BAR ──────────
        // The single writer of `baseR` for big-trade bubbles. Its own frame,
        // never pooled with the delta family: a print's dominant side and a
        // zone's net are different measurements, and one peak across both
        // would be a third normalizer defect rather than a fix for this one.
        const bigFramePeak = bubbleFramePeak(bubblesRef.current.map(b => b.value));
        for (const b of bubblesRef.current) {
          const nextR = bigTradeBubbleRadius(Math.abs(b.value), bigFramePeak);
          if (nextR === b.baseR) continue;
          b.r = b.baseR > 0 ? (b.r / b.baseR) * nextR : nextR;
          b.baseR = nextR;
        }

        // ── Pass B: update + draw all active bubbles (🫧 hover at key levels) ──
        const nowMs = performance.now();
        const bubbles = bubblesRef.current;

        // Event centers stay exact through pan/scale. Atmosphere belongs to the
        // membrane, never to a spring that moves the print off its evidence.
        for (const b of bubbles) {
          const barX = chart.timeScale().timeToCoordinate(b.anchorBarTime as any);
          const anchor = bigTradeAnchor({ barX, barTime: b.anchorBarTime, eventTime: b.anchorTime,
            intervalSec: intervalSec ?? 60, barSpacing: bsp, priceY: srs.priceToCoordinate(b.anchorPrice) });
          if (!anchor) continue; // invalid/off-camera → culled below
          b.x = anchor.x;
          b.y = anchor.y;
          b.vx = 0; b.vy = 0;
          if (b.r < b.baseR) b.r += (b.baseR - b.r) * 0.12; // ease up on spawn
        }

        // Cull only bubbles whose anchor bar scrolled off-screen (freeing the
        // dedupe key so it re-spawns on pan-back). Then enforce the user's
        // max-visible cap by keeping the NEWEST N — never fade the rest out.
        const survivors: Bubble[] = [];
        for (const b of bubbles) {
          const barX = chart.timeScale().timeToCoordinate(b.anchorBarTime as any);
          const hx = bigTradeAnchor({ barX, barTime: b.anchorBarTime, eventTime: b.anchorTime,
            intervalSec: intervalSec ?? 60, barSpacing: bsp, priceY: srs.priceToCoordinate(b.anchorPrice) })?.x ?? null;
          if (hx == null || hx < -80 || hx > W + 80) {
            // free this level's dedupe key so it re-spawns on pan-back
            // The `?? \`bt:${b.anchorTime}:${b.anchorPrice}\`` fallback that used
            // to live here was a second copy of bigTradeLevelKey's formula. It
            // was unreachable — `spawnKey` is a required field on Bubble and
            // both spawn sites set it — but an unreachable duplicate of an
            // IDENTITY formula is a loaded gun: the day `spawnKey` becomes
            // optional, this cull would delete a key built from a different
            // price than the one the spawn added, the real key would leak in
            // bubbleSpawnRef forever, and the print would never re-spawn on
            // pan-back. Silently: the bubble just stops coming back.
            //
            // The delta path one screen up already does exactly this, with no
            // fallback. Same rule, one owner.
            bubbleSpawnRef.current.delete(b.spawnKey);
            continue;
          }
          survivors.push(b);
        }
        const cap = bubbleMaxRef.current;
        bubblesRef.current = survivors.length > cap
          ? survivors.sort((a, z) => z.born - a.born).slice(0, cap)
          : survivors;

        // Draw WM VP FIRST (under the bubbles) so Big Trades + Session VP don't
        // hide the bubbles behind the profile. Guarded → won't double-draw later.
        runWMVP();

        // Draw bubbles — real water-bubble look: transparent glassy body,
        // bright iridescent rim, specular highlights, gentle wobble. Fully
        // opaque and always present (no fade, no pop).
        canvas.dataset.bigTradeBubbleCount = String(bubblesRef.current.length);
        canvas.dataset.bigTradeBubbleIdentity = "INDIVIDUAL_EXECUTION";
        canvas.dataset.bigTradeBubbleStatus = bubblesRef.current.length ? "DRAWN" : "WAITING_FOR_PRINTS";
        const hoverId = bubbleHoverRef.current;
        for (const b of bubblesRef.current) {
          const buy = b.side === "buy";
          // Green = aggressive buy, red = aggressive sell — boosted contrast so both
          // are unmistakable when several bubbles share one candle.
          const core = buy ? "0,212,170" : "255,77,106";
          const isHover = hoverId === b.id;

          // gentle squash/stretch wobble so they feel alive like real bubbles
          const t = nowMs / 520 + b.phase;
          const wob = 1 + Math.sin(t) * 0.05;
          const Rx = Math.max(0.1, b.r * wob);
          const Ry = Math.max(0.1, b.r / wob);

          ctx.save();

          // Visuals Canon: Big Trades are market objects in the same underwater
          // world as Liquidity Weather. Keep the teal/red core as side truth,
          // then add a brass caustic corona around the individual execution.
          // The corona communicates object class, never participant or intent.
          if (b.kind === "big-trade") {
            ctx.save();
            ctx.shadowColor = "rgba(232,184,92,0.72)";
            ctx.shadowBlur = Math.max(7, b.r * 0.55);
            ctx.beginPath();
            ctx.ellipse(b.x, b.y, Rx + 3.5, Ry + 3.5, 0, 0, Math.PI * 2);
            ctx.lineWidth = isHover ? 2.4 : 1.25;
            ctx.strokeStyle = `rgba(232,184,92,${isHover ? 0.94 : 0.68})`;
            ctx.stroke();
            ctx.restore();
          }

          // outer halo (soft tinted glow)
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, Rx + 4, Ry + 4, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${core},0.10)`;
          ctx.fill();

          // glassy body: transparent center → faint tint → brighter near the rim
          const g = ctx.createRadialGradient(b.x, b.y, Rx * 0.2, b.x, b.y, Rx);
          g.addColorStop(0,    `rgba(${core},0.04)`);   // see-through middle
          g.addColorStop(0.72, `rgba(${core},0.08)`);
          g.addColorStop(0.93, `rgba(${core},0.26)`);   // tint gathers at edge
          g.addColorStop(1,    `rgba(255,255,255,0.32)`); // bright rim light
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, Rx, Ry, 0, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();

          // bright thin membrane rim (the signature of a water bubble)
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, Math.max(0.1, Rx - 0.6), Math.max(0.1, Ry - 0.6), 0, 0, Math.PI * 2);
          ctx.lineWidth = isHover ? 2.6 : 1.7;
          ctx.strokeStyle = `rgba(255,255,255,${isHover ? 0.98 : 0.82})`;
          ctx.stroke();
          // faint colored inner ring for iridescence
          ctx.beginPath();
          ctx.ellipse(b.x, b.y, Math.max(0.1, Rx - 2.4), Math.max(0.1, Ry - 2.4), 0, 0, Math.PI * 2);
          ctx.lineWidth = 1;
          ctx.strokeStyle = `rgba(${core},0.55)`;
          ctx.stroke();

          // big specular highlight (top-left) — crescent-ish bright spot
          ctx.beginPath();
          ctx.ellipse(b.x - Rx * 0.34, b.y - Ry * 0.38, Rx * 0.22, Ry * 0.16, -0.5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.fill();
          // small secondary highlight (bottom-right)
          ctx.beginPath();
          ctx.ellipse(b.x + Rx * 0.4, b.y + Ry * 0.42, Rx * 0.08, Ry * 0.08, 0, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.fill();

          // F07A: magnitude is the primary inscription, matching the area.
          // Time and price are subordinate; exact values remain in Inspect.
          if (b.r >= 7) {
            const lbl = formatBubbleVolume(Math.abs(b.value));
            const fontPx = Math.max(8, Math.min(13, Rx * 0.48));
            ctx.font = `bold ${fontPx}px Inter, monospace`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.lineWidth = Math.max(2, fontPx * 0.22);
            ctx.strokeStyle = "rgba(0,0,0,0.88)";
            const labelY = b.r >= 24 ? b.y - 7 : b.y;
            ctx.strokeText(lbl, b.x, labelY);
            ctx.fillStyle = "rgba(246,224,176,0.99)";
            ctx.fillText(lbl, b.x, labelY);
            if (b.r >= 24) {
              ctx.font = "8px Inter, monospace";
              const timeLabel = new Date(b.anchorTime * 1000).toISOString().slice(11, 19);
              ctx.fillStyle = "rgba(232,226,212,0.92)";
              ctx.fillText(timeLabel, b.x, b.y + 5);
              ctx.fillText(formatBubblePrice(b.anchorPrice), b.x, b.y + 15);
            }
          }
          ctx.restore();
        }
      } else {
        // Left big-trades mode → clear bubbles + tooltip
        bubblesRef.current = [];
        bubbleSpawnRef.current = new Set();
        bubbleHoverRef.current = null;
        canvas.dataset.bigTradeBubbleCount = "0";
        canvas.dataset.bigTradeBubbleStatus = "OFF";
      }

      /* ══════════════════════════════════════════════════════
         WM FIXED VP & SESSION VP — right-anchored inside chart
      ══════════════════════════════════════════════════════ */
      /*
        RETURNS ITS OUTCOME, instead of returning `undefined` into a void.

        Five of the guards below are DECLINES: the profile was requested and no
        histogram was produced. Each used to be a bare `return`, so the toolbar
        toggle stayed lit over an empty right-hand lane with nothing anywhere
        saying which of the five had happened — or that anything had. Named
        reasons are compiled into a receipt by src/lib/vpRenderReceipt.ts and
        stamped onto the overlay canvas by runWMVP. §5 SYSTEM TRUTH LAW.
      */
      function drawWMVP(barsToUse: LegacyOhlcvTuple[], barColor: string, labelText: string, yOffset: number, colIndex = 0, nCols = 1, alphaScale = 1): { declined: VpDeclineReason | null; rows: number; geometry?: VpColumnGeometry } {
        // `rows` is incremented at the one place a row is actually painted, so
        // the count is of pixels committed and not of buckets considered.
        let rowsPainted = 0;
        if (!barsToUse.length || !ctx) return { declined: "NO_BARS", rows: 0 };
        // Dynamic tick size: ~25 rows so each bar is tall and clearly readable
        const priceRange = barsToUse.reduce((r, b) => ({ hi: Math.max(r.hi, b.high), lo: Math.min(r.lo, b.low) }), { hi: -Infinity, lo: Infinity });
        const rawRange = priceRange.hi - priceRange.lo;
        if (rawRange <= 0) return { declined: "FLAT_RANGE", rows: 0 };
        // ── STABLE, DATA-ANCHORED, FINE-GRAINED bucket grid ─────────────────
        // Two properties this grid MUST have, learned the hard way:
        //
        // 1) STABILITY (no squash-on-scroll): the bucket size derives from the DATA
        //    price range only — never from the live on-screen pixel span. Sizing it
        //    from priceToCoordinate made the grid re-bucket every frame you panned
        //    (the price axis autoscales on pan), so the whole histogram reshaped.
        //    Anchoring to the data means pan/zoom only RE-MAP the same fixed buckets.
        //
        // 2) SMOOTHNESS (no "snaggle-tooth"): the tick must be FINE and snapped to the
        //    NEAREST clean increment — never rounded UP. The old code targeted ~28
        //    rows and snapped tickSz UP to the next of [1,2,2.5,5,10]·10ⁿ. On an asset
        //    camping in a tight range that coarse bucket dumped almost all the volume
        //    into ONE bucket → a single fat POC bar with starved 0.01 slivers around
        //    it (the "two snaggle teeth + anorexic bars" the user saw). Targeting ~46
        //    rows and snapping to the NEAREST clean tick keeps the resolution high, so
        //    volume spreads into a smooth histogram silhouette with a natural POC.
        //
        // 3) FILL-AT-ZOOM: with the FIXED (full-history) profile, ~46 rows over a wide
        //    range meant only a handful of buckets fell inside a zoomed price window
        //    (the "stick"). ~100 rows makes the grid fine enough that a zoomed slice
        //    still shows a filled column of bars, WITHOUT re-sourcing on scroll (so the
        //    POC stays stable). Rows clamp to ≥2px and stack contiguously when zoomed out.
        // Resolution: 320 data-anchored buckets. The grid is anchored to the DATA
        // range (stable through pan/zoom — no re-bucketing), but at 160 a zoomed-in
        // window only intersected a handful of buckets, so each mapped to a tall
        // pixel row = the audit's "few thick steps despite 160 internal rows."
        // Doubling to 320 halves each bucket's price width, so a zoomed-in slice
        // now intersects ~2× more buckets → thin, dense rows and a continuous
        // silhouette at close zoom, matching the older build. (Extreme-zoom sub-row
        // LOD is the next lever if still coarse.)
        const rows = 320;

        /* ── WHERE THE VOLUME GOES — owned by src/lib/vpEngine.ts ──────────────
         *
         * VP is a TOTAL-volume study. Historical OHLCV gives truthful per-bar
         * volume and a high–low range, but not volume-at-price, so each bar's
         * volume is spread evenly across the buckets its range TOUCHED. That
         * estimate is honest; the bucket arithmetic underneath it was not.
         *
         * This block used to compute the grid inline:
         *
         *     const first = Math.floor(b.low  / tickSz);
         *     const last  = Math.ceil (b.high / tickSz);
         *
         * `Math.ceil` on the HIGH is one bucket too far. Bucket k covers
         * [k·tick, (k+1)·tick), so the bucket holding the high is FLOOR(high/tick).
         * Ceil names the bucket ABOVE it whenever the high does not land exactly
         * on a grid edge — which, since the grid is rawRange/320 and not the
         * instrument's tick, is nearly always. So every bar deposited a share of
         * its volume at prices STRICTLY ABOVE its own high, and the histogram
         * drew a shelf where that bar never traded.
         *
         * It is not a rounding nicety. `touched` is one too large, so the phantom
         * bucket's share is 1/(n+1) of the bar:
         *
         *     bar spanning 1 bucket  → 50.0% of its volume above the high
         *     bar spanning 2 buckets → 33.3%
         *     bar spanning 6 buckets → 14.3%
         *
         * and every REAL level was diluted by the same factor. The error is
         * one-directional, so the whole profile — POC, VAH and VAL with it —
         * was smeared upward. A trader reads the POC as the price the market
         * accepted; it must not be an artifact of a ceil.
         *
         * `computeProfileFromBars` already had this right (it floors both edges)
         * and already had a test suite — it simply had no callers, so the shipped
         * surface and the canonical engine had drifted apart with only the engine
         * under test. One writer now. Same tick derivation (range/320 snapped to
         * the nearest 1/2/2.5/5/10·10ⁿ), same even spread, same up/down split by
         * candle direction, same 70% value area — only the geometry is corrected.
         */
        const snap = computeProfileFromBars(barsToUse, { targetRows: rows, valueAreaPct: 0.7 });
        if (snap.rows.length === 0 || snap.totalVolume <= 0) return { declined: "NO_VOLUME", rows: 0 };
        const tickSz = snap.tickSize;

        // Re-key onto this renderer's grid convention (bucketIndex · tick) so the
        // draw loop below, which reconstructs a price from `loKey + i·tick`, finds
        // its bucket by an identical float expression. One canonical key form.
        const gridKey = (p: number) => Math.round(p / tickSz) * tickSz;
        const volMap = new Map<number, { up: number; down: number }>();
        for (const r of snap.rows) volMap.set(gridKey(r.price), { up: r.up, down: r.down });
        if (volMap.size === 0) return { declined: "NO_BUCKETS", rows: 0 };
        const allPrices = Array.from(volMap.keys()).sort((a, b) => a - b);
        const pocPrice = gridKey(snap.poc);

        // ── Bar-WIDTH reference = 3.5× the MEDIAN populated-level volume ──────────
        // ACCURATE normalization: scale bar length to the REAL peak volume-at-
        // price (the POC bucket). The previous 5×-median reference saturated every
        // above-median level to full width → the chunky solid block the founder
        // flagged. Normalizing to the true max means ONLY the POC is full width and
        // every other level is drawn in HONEST proportion to its actual volume.
        const volsAsc   = Array.from(volMap.values()).map(v => v.up + v.down).filter(x => x > 0).sort((a, b) => a - b);
        const maxBucket = volsAsc.length ? volsAsc[volsAsc.length - 1] : 1;

        // Only the ~6 highest-volume levels get a NUMBER (POC + 5). Per-row labels
        // turned BTC's fractional volumes into an unreadable wall; TradingView-style
        // top-N is the clean look. Explicit Set = distribution- and tie-proof (a
        // value cutoff would let equal-volume levels flood through on a flat profile).
        const MAX_VP_LABELS = 6;
        const topLabelPrices = new Set<number>(
          Array.from(volMap.entries())
            .sort((a, b) => (b[1].up + b[1].down) - (a[1].up + a[1].down))
            .slice(0, MAX_VP_LABELS)
            .map(e => e[0]),
        );
        // Label mode (VP gear toggle, persisted): "all" = a number in every bar that
        // has room (de-overlapped); "key" = only the ~6 highest-volume levels. Default
        // "all". This is the single knob for the top-6-vs-every-bar preference so it
        // never has to be re-decided in code.
        let vpLabelAll = true;
        try { vpLabelAll = localStorage.getItem("wm_vp_labels") !== "key"; } catch {}

        // ── Value Area (70% of volume) → VAH / VAL ──────────────────────
        // Expand outward from the POC, each step absorbing whichever adjacent
        // level (above or below) holds the larger volume, until 70% of total
        // traded volume is enclosed. The highest enclosed price = VAH, the
        // lowest = VAL — exactly the standard market-profile value area.
        // Expansion itself is the engine's (`snap.vah` / `snap.val`); this maps the
        // two boundary prices back to row indices so the straddle rule below can
        // still nudge them apart for the draw guard.
        let pocIdx = allPrices.indexOf(pocPrice);
        if (pocIdx < 0) pocIdx = 0;
        let vaLo = allPrices.indexOf(gridKey(snap.val));
        let vaHi = allPrices.indexOf(gridKey(snap.vah));
        if (vaLo < 0) vaLo = pocIdx;
        if (vaHi < 0) vaHi = pocIdx;
        // Guarantee the value area straddles the POC by at least one populated
        // level on EACH side whenever such a level exists. Without this, a POC
        // sitting near the top/bottom of the distribution (all 70% accumulates on
        // one side) leaves vaHi===pocIdx or vaLo===pocIdx, which collapses VAH (or
        // VAL) onto the POC and the draw guard below silently DROPS that box — the
        // "VAH/VAL disappears on Session/Fixed VP" bug. Forcing one step each way
        // keeps both boundary boxes distinct from POC and always visible.
        if (vaHi === pocIdx && pocIdx < allPrices.length - 1) vaHi = pocIdx + 1;
        if (vaLo === pocIdx && pocIdx > 0)                    vaLo = pocIdx - 1;
        const valPrice = allPrices[vaLo];               // Value Area Low
        const vahPrice = allPrices[vaHi];               // Value Area High

        // Reserve the ACTUAL right price-axis width (queried from the chart) so the
        // histogram never draws on top of the price labels. The axis width grows with
        // the number of digits (BTC's 59,800.00 is wider than a $12 stock), so a fixed
        // 60px gap let the bars bleed over the numbers — this reads the live width.
        const priceScaleW = (() => {
          try {
            const w = chart.priceScale("right").width();
            if (Number.isFinite(w) && w > 0) return Math.ceil(w) + 10;
          } catch {}
          return 90;
        })();
        // When BOTH Fixed + Session VP are on, narrow each column and shift the
        // second one LEFT by a full column width + gap so the two histograms sit
        // side-by-side instead of overlapping in the same right-anchored column
        // (the BTC "VP looks wrong" bug — stacked bars + colliding labels).
        // Cap profile width relative to usable chart area so the histogram never
        // overpowers price action (founder: "profile width overpowers price").
        // Each profile stays a compact right-side lane, not a wall.
        // Owned by src/lib/vpDrawGeometry.ts. `fits` is a real answer: when the
        // usable span cannot hold this column, the inline arithmetic used to
        // produce a negative right edge and paint every bar off-canvas — the
        // profile was requested, the work was done, and nothing appeared.
        const col = vpColumnLayout(W, priceScaleW, colIndex, nCols);
        if (!col.fits) return { declined: "NO_ROOM", rows: 0 };
        const vpW = col.width;
        const vpRight = col.right;
        // The SAME three numbers the layout was computed from, carried out to
        // the receipt. Not re-derived there: re-deriving is how a measurement
        // starts describing a frame other than the one that was painted.
        const geometry: VpColumnGeometry = {
          canvasWidth: W,
          priceScaleWidth: priceScaleW,
          right: vpRight,
        };

        // ── PRICE-ANCHORED vertical scale ───────────────────────────────
        // Anchor every row to its REAL price via the candle series' price scale.
        // A 380 volume shelf is drawn at exactly price 380 on the chart axis, so
        // the profile lines up bar-for-bar with the candles and the user can always
        // read which volume shelf price is trading into. The VP is pinned to price,
        // not to the screen: freeze the axis with 🔒 LOCK and horizontal scrolling
        // moves only the candles while the VP + POC stay locked on their levels.
        const yOf = (p: number): number | null => {
          const y = srs?.priceToCoordinate(p);
          return (y == null || !Number.isFinite(y)) ? null : (y as number);
        };
        const loKey   = allPrices[0];
        const hiKey   = allPrices[allPrices.length - 1] + tickSz;
        const nBuckets = Math.max(1, Math.round((hiKey - loKey) / tickSz));
        const rowCap  = Math.round(H * 0.22); // never let one tick fill the pane
                                              // (roomier now that tickSz is data-anchored,
                                              // so zoomed-in rows stay flush without gaps)

        ctx.save();
        // Clip the VP to pane 0 (the candle pane). With native indicator panes
        // stacked below, priceToCoordinate extrapolates prices outside pane 0's
        // visible range to y-values BELOW pane 0 — without this clip the VP bars
        // bleed down into the Speed-of-Tape / CVD panes. paneSize(0).height is the
        // candle pane's pixel height (pane 0 is topmost, so its top = canvas y 0).
        let pane0H = H;
        try {
          const ps = (chart as any).paneSize?.(0);
          if (ps && Number.isFinite(ps.height) && ps.height > 0) pane0H = ps.height;
        } catch {}
        ctx.beginPath();
        ctx.rect(0, 0, W, pane0H);
        ctx.clip();
        // Iterate EVERY bucket low→high. Each populated bucket draws ONE thin,
        // price-aligned row with a small separation gap, so individual levels
        // stay recognizable and the many thin rows form a naturally smooth OUTER
        // silhouette. We do NOT interpolate/fill between rows into empty price
        // levels — that flag-off change ("sub-row neighbour ramping") produced a
        // solid painted slab and was reverted. Empty buckets draw nothing.

        let lastLabelY = -Infinity; // de-overlap volume labels
        for (let i = 0; i < nBuckets; i++) {
          const price = Math.round((loKey + i * tickSz) / tickSz) * tickSz;
          const volume = volMap.get(price);
          const tot = volume ? volume.up + volume.down : 0;
          if (tot <= 0) {
            // INTERIOR no-trade band → label it "0" (every-bar mode only) so a gap
            // sitting BETWEEN populated levels (price gapped/rushed through, e.g. an
            // overnight jump) reads as an explicit zero-volume shelf instead of a
            // mysterious blank hole — Dave's "big empty space with no labels even for
            // 0 orders". Honest: 0 IS the real traded volume there. Tails outside the
            // populated range stay clean; faint + de-overlapped so it never walls up.
            if (vpLabelAll && price > allPrices[0] && price < allPrices[allPrices.length - 1]) {
              const zyT = yOf(price + tickSz), zyB = yOf(price);
              if (zyT != null && zyB != null) {
                const zy = Math.round((zyT + zyB) / 2);
                if (vpLabelFits(zy, lastLabelY)) {
                  ctx.font = "11px monospace";
                  ctx.textAlign = "right"; ctx.textBaseline = "middle";
                  ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(0,0,0,0.8)";
                  ctx.strokeText("0", vpRight - 4, zy);
                  ctx.fillStyle = "rgba(255,255,255,0.32)";
                  ctx.fillText("0", vpRight - 4, zy);
                  lastLabelY = zy;
                }
              }
            }
            continue;
          }
          // Row rectangle owned by src/lib/vpDrawGeometry.ts: both endpoints are
          // snapped and then subtracted, so adjacent populated rows share the
          // exact boundary pixel. null = the price scale could not place this
          // row, which is off-screen, not zero. Genuinely-empty buckets still
          // draw nothing — the honest gap TradingView shows too.
          const rect = vpRowRect(yOf(price + tickSz), yOf(price), rowCap);
          if (!rect) continue; // off-screen row
          // …and a row the pane-0 clip will discard is equally not a row. The
          // clip above exists because priceToCoordinate EXTRAPOLATES beyond
          // pane 0 when indicator panes are stacked below; those coordinates are
          // finite, so `rect` is non-null and the loop used to count them. The
          // canvas then dropped the pixels. Owned by vpDrawGeometry.
          if (!vpRowVisible(rect, pane0H)) continue;
          // Counted HERE — past every `continue` — so the receipt reports rows
          // committed to the canvas, not buckets the loop merely considered. A
          // column whose every bucket was off-screen must report 0 and be read
          // as declined, not as a drawn profile the trader simply cannot find.
          rowsPainted += 1;
          const rowY = rect.y;
          const rowH = rect.height;
          const isPOC = price === pocPrice;
          // Bar length ∝ volume, shaped by a 0.6 power curve: the POC (ratio 1) is the
          // ACCURATE bar length: DIRECTLY proportional to this level's real
          // volume-at-price, normalized to the peak (POC) bucket. No aesthetic
          // baseline and no power-curve compression — those made low levels fake-
          // wide and saturated the high levels into one chunky block. A 1px floor
          // only guarantees a genuinely-traded level is not invisible. The result
          // is an honest histogram: POC full width, everything else in true ratio.
          const barW = vpBarWidth(tot, maxBucket, vpW);
          const upRatio = volume ? volume.up / tot : 0.5;
          // Separation gap (owner) so each price row stays individually visible:
          // many thin rows → smooth OUTER silhouette, not a solid painted slab.
          const rh = rect.drawHeight;

          if (isPOC) {
            ctx.fillStyle = vpPocRgba((0.68 * alphaScale).toFixed(2));
            ctx.fillRect(vpRight - barW, rowY, barW, rh);
          } else {
            // One thin rect per real price level: green (up-vol) left, red
            // (down-vol) right — the lively bid/ask look. Nothing is drawn into
            // empty price levels (no interpolation). alphaScale gives Session VP
            // a distinct translucent identity vs the solid Fixed VP.
            // The down half is the REMAINDER, never a second rounding — the two
            // pieces must sum to exactly the bar, or the level is drawn a pixel
            // wider or narrower than its own volume. Owned by vpDrawGeometry.
            const { upWidth: upW, downWidth: dnW } = vpBarSplit(barW, upRatio);
            ctx.fillStyle = vpUpRgba(((0.42 + upRatio * 0.13) * alphaScale).toFixed(2));
            ctx.fillRect(vpRight - barW, rowY, upW, rh);
            ctx.fillStyle = vpDnRgba(((0.42 + (1 - upRatio) * 0.13) * alphaScale).toFixed(2));
            ctx.fillRect(vpRight - barW + upW, rowY, dnW, rh);
          }
          if (isPOC) {
            ctx.strokeStyle = vpPocRgba(0.9); ctx.lineWidth = 1;
            ctx.setLineDash([5, 4]);
            const pocLineLeft = Math.max(4, vpRight - vpW - 24);
            ctx.beginPath();
            ctx.moveTo(pocLineLeft, rowY + Math.round(rowH/2) + 0.5);
            ctx.lineTo(vpRight - 2, rowY + Math.round(rowH/2) + 0.5);
            ctx.stroke();
            ctx.setLineDash([]);
            // POC price tag so the stationary histogram still has a price anchor.
            ctx.fillStyle = vpPocRgba(0.95);
            ctx.font = "bold 11px monospace";
            ctx.textAlign = "right"; ctx.textBaseline = "middle";
            ctx.fillText(pocPrice.toFixed(2), pocLineLeft - 2, rowY + Math.round(rowH/2));
          }
          // Volume numbers — label ONLY the POC and other MAJOR nodes (≥30% of the
          // POC volume), NEVER every level. Printing a number on all ~46 rows turned
          // the profile into a vertical spreadsheet of tiny 0.0x values that buried
          // the bars — the "wall of numbers" that made the VP look broken. Pro
          // platforms (TradingView/Sierra) label the POC and let the bar silhouette
          // carry the rest; VAH/VAL get their own box tags just below. The de-overlap
          // + zero-suppression still apply to the few major labels that remain.
          const midY = rowY + rowH / 2;
          const txt = fmtV(tot);
          const vpZero = txt === "0" || txt === "0.00" || txt === "0.0";
          // "all" mode: a number in EVERY bar that has vertical room (de-overlapped so
          // thin zoomed-out rows never stack into a wall) — shows the real value incl a
          // literal 0 when that's the truth. "key" mode: only the ~6 highest levels
          // (clean TradingView look). POC always labels (bold).
          const hasRoom = rowH >= 8 && vpLabelFits(midY, lastLabelY);
          const showLabel = isPOC || (hasRoom && (
            vpLabelAll ? true : (topLabelPrices.has(price) && !vpZero)
          ));
          if (showLabel) {
            ctx.font = `${isPOC ? "bold 12" : "11"}px monospace`;
            ctx.textAlign = "right"; ctx.textBaseline = "middle";
            // CRISP dark outline (strokeText) instead of a soft shadowBlur halo — the
            // blur was what made the VP numbers look fuzzy. Stroke keeps them sharp AND
            // legible over any bar/candle background.
            ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(0,0,0,0.9)";
            ctx.strokeText(txt, vpRight - 4, midY);
            ctx.fillStyle = "#ffffff";
            ctx.fillText(txt, vpRight - 4, midY);
            lastLabelY = midY;
          }
        }

        // ── VAH (blue) & VAL (purple) value-area boxes ──────────────────
        // Outline the two value-area boundary rows so the trader can instantly
        // read where 70% of the volume traded. Colors are user-customizable via
        // the VP gear (wm_vp_vah / wm_vp_val). Drawn after the bars so the
        // outline sits cleanly on top, with a small price tag at the right edge.
        const drawVALevel = (p: number, rgba: string, tag: string) => {
          const yT = yOf(p + tickSz);
          const yB = yOf(p);
          ctx.save();
          if (yT == null || yB == null) {
            // ── OFF-SCREEN (zoomed in past the level) ─────────────────────────
            // Instead of vanishing, pin a labelled edge marker with a directional
            // arrow so VAH/VAL stay ALWAYS visible. Determine above/below by
            // comparing the level price to the prices at the top/bottom edges.
            let topPrice = NaN, botPrice = NaN;
            try {
              topPrice = srs?.coordinateToPrice(0) as number;
              botPrice = srs?.coordinateToPrice(H) as number;
            } catch {}
            const above = Number.isFinite(topPrice) ? p > topPrice : true;
            const edgeY = above ? 9 : H - 9;
            ctx.strokeStyle = rgba; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.moveTo(vpRight - vpW - 2, edgeY);
            ctx.lineTo(vpRight + 2, edgeY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.font = "bold 9px monospace";
            ctx.textAlign = "left"; ctx.textBaseline = "middle";
            const edgeTxt = `${tag} ${above ? "↑" : "↓"} ${p.toFixed(2)}`;
            ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(0,0,0,0.9)";
            ctx.strokeText(edgeTxt, vpRight - vpW - 2, edgeY + (above ? 8 : -8));
            ctx.fillStyle = rgba;
            ctx.fillText(edgeTxt, vpRight - vpW - 2, edgeY + (above ? 8 : -8));
            ctx.restore();
            return;
          }
          // TradingView-style value-area boundary: a single thin DASHED line across
          // the profile, NOT a full-width outline box. The box (vpW+4 wide) stacked
          // directly on the footprint numbers — and doubled when Fixed + Session VP
          // are both on — is what made the VAH/POC/VAL zone read "muddy". A compact
          // colored tag WITH the actual price sits just above the line at the
          // profile's left edge, so it never sits on top of the bars' numbers and the
          // trader can finally read the exact VAH/VAL value on-screen.
          const top  = Math.min(yT, yB);
          const h    = Math.max(7, Math.abs(yB - yT));
          const midY = Math.round(top + h / 2) + 0.5;
          ctx.strokeStyle = rgba; ctx.lineWidth = 1; ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.moveTo(vpRight - vpW - 2, midY);
          ctx.lineTo(vpRight - 2, midY);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "left"; ctx.textBaseline = "bottom";
          const tagTxt = `${tag} ${p >= 10000 ? Math.round(p).toLocaleString("en-US") : p.toFixed(2)}`;
          ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(0,0,0,0.9)";
          ctx.strokeText(tagTxt, vpRight - vpW - 2, midY - 1);
          ctx.fillStyle = rgba;
          ctx.fillText(tagTxt, vpRight - vpW - 2, midY - 1);
          ctx.restore();
        };
        if (vahPrice !== pocPrice) drawVALevel(vahPrice, vpVahRgba(0.95), "VAH");
        if (valPrice !== pocPrice) drawVALevel(valPrice, vpValRgba(0.95), "VAL");

        // (On-canvas "WM Fixed/Session VP" title removed — it cluttered the top of
        // the chart and could overlap candle/volume numbers. The active VP is
        // already indicated by the highlighted toolbar toggle + its gear.)
        void labelText; void yOffset; void barColor;
        ctx.restore();
        return { declined: null, rows: rowsPainted, geometry };
      }

      // Hoisted so big-trades mode can draw VP early (under the bubbles). The
      // vpDrawn guard ensures it runs only once per frame.
      function runWMVP() {
        if (vpDrawn) return;
        vpDrawn = true;
        const bothVP = fixedVPActive && sessionVPActive;
        const nVPCols = bothVP ? 2 : 1;
        /*
          THE RENDER RECEIPT. One entry per profile the toolbar asked for, so a
          frame where Fixed drew and Session did not is recorded as exactly
          that — the Founder-reported "Session VP disappeared" shape, which a
          single did-the-VP-draw boolean cannot express.
        */
        const attempts: VpColumnAttempt[] = [];
        if (fixedVPActive) {
          // FULL-HISTORY source — a true FIXED profile. POC/VAH/VAL are computed from
          // the whole fetched bar set, so they DO NOT move when you scroll or zoom
          // (the "VAL/VAH/POC jump 396→397→400 on scroll" bug came from a visible-range
          // variant that recomputed the profile from whatever bars were in view). The
          // finer bucket grid (rows below) keeps it filled top-to-bottom even zoomed in,
          // so it no longer collapses to a stick — stability AND fill, not one or other.
          const allBars = barsRef.current;
          attempts.push({ profile: "FIXED", ...drawWMVP(allBars, "#F0B429", "WM Fixed VP", 0, 0, nVPCols) });
        }
        if (sessionVPActive) {
          // Session VP shows the CURRENT session's volume distribution. It must NOT
          // move when you scroll — so source it from the full fetched bars (barsRef),
          // not the scroll-dependent visible window. It DOES legitimately differ per
          // timeframe (5m vs 4h aggregate the session's volume at different
          // granularities), which is the expected behaviour the user asked for.
          //
          // WM-VP-SESSION-EMPTY-FIX (2026-08-09, Founder-reported regression):
          // The RTH minute-filter (570–960 = 9:30–16:00 ET) was applied to ALL
          // symbols. For crypto (24/7) + futures (~24h) + daily/weekly bars,
          // most bars fall outside that window → annotated = [] → sessionBars
          // = [] → Session VP renders NOTHING while Fixed VP still draws →
          // Founder sees "one VP" and thinks Session VP disappeared. Only
          // apply the RTH filter for equities on intraday timeframes; for
          // 24-hour assets and for daily+ timeframes, "session" = latest
          // calendar day, no minute filter.
          const allBars = barsRef.current;
          const sessionBars = selectSessionBars(allBars);
          // Session VP: distinct translucent identity (0.6×) so it never merges
          // with the solid Fixed VP into one slab (founder: "cannot distinguish").
          attempts.push({ profile: "SESSION", ...drawWMVP(sessionBars, "#8B5CF6", "WM Session VP", 0, bothVP ? 1 : 0, nVPCols, 0.6) });
        }

        /*
          STAMPED ON THE OVERLAY CANVAS ITSELF.

          The profile is painted into a canvas bitmap, so there is no element to
          inspect and no text to read: "is the VP drawn?" has never been an
          answerable question from outside the renderer, which is why the VP
          render gate could only ever be closed by eye. These attributes are the
          measurement channel — the same counts the compiler tested, published
          on the element that holds the pixels.

          Removed, not blanked, when nothing was requested. An attribute reading
          `0` is a measurement that the VP drew nothing; its ABSENCE is the
          statement that no profile was asked for. Those are different facts and
          must not share an encoding.
        */
        const receipt = compileVpRenderReceipt(attempts);
        // Read from the ref rather than the captured local: this runs inside a
        // rAF callback, and the element can be gone by the time the frame
        // lands. No element is not a decline to report — there is nothing left
        // to report it ON — so skip rather than invent a state.
        const ds = canvasRef.current?.dataset;
        if (!ds) return;
        if (receipt.requested === 0) {
          delete ds.vpRequested; delete ds.vpDrawn; delete ds.vpDeclined;
          delete ds.vpRows; delete ds.vpNote; delete ds.vpAxisClearance;
        } else {
          ds.vpRequested = String(receipt.requested);
          ds.vpDrawn = String(receipt.drawn);
          ds.vpDeclined = String(receipt.declined);
          ds.vpRows = String(receipt.rows);
          /*
            THE EDGE THE PROFILE WAS ACTUALLY MEASURED AGAINST.

            Published separately from the counts because it answers a different
            question. `vpDrawn` says the profile was painted; this says it was
            painted somewhere the trader can see. Three marks on this very
            canvas were, on 2026-09-17, found to be drawn correctly against
            `cont.offsetWidth` — the container edge, which is behind the price
            axis — and therefore never read by anyone. Counts cannot catch that
            class; a clearance can.

            Removed, not zeroed, when no drawn column reported geometry. `0`
            here means "measured, and flush against the axis", which is an
            alarm. Its ABSENCE means no measurement was taken. Encoding those
            the same way would either cry wolf or hide a real collision.
          */
          if (receipt.axisClearancePx === null) delete ds.vpAxisClearance;
          else ds.vpAxisClearance = String(receipt.axisClearancePx);
          if (receipt.note) ds.vpNote = receipt.note;
          else delete ds.vpNote;
        }
        /*
          AND THE SAME SENTENCE, ON THE SCREEN.

          The attribute above answers a probe; this answers the trader. Compared
          against the ref — not against state — because the state this closure
          captured is from whichever render created the RAF loop, and would go
          stale the moment the note changed. The ref is written in the same tick
          as the setter, so the NEXT frame sees the new value and stays silent.

          Set only on CHANGE. The loop runs at up to 30fps; calling the setter
          every frame would re-render the entire chart to print words that did
          not move.
        */
        if (receipt.note !== vpNoteRef.current) {
          vpNoteRef.current = receipt.note;
          setVpDeclineNote(receipt.note);
        }
      }
      // Non-big-trades modes draw VP here (top of stack is fine — no bubbles).
      runWMVP();

      /* ══════════════════════════════════════════════════════
         WM TAPE HORIZON — vertical marker + label at the timestamp
         WM began observing per-trade tape for the current symbol.
         Everything LEFT of this line is OHLCV-only; everything RIGHT
         is footprint-capable. Turns a data-feed limitation into a
         legible truth artefact per directive Part XLIII.
      ══════════════════════════════════════════════════════ */
      const horizon = tapeHorizonRef.current;
      if (horizon && horizon.sym === symbol && footprintEnabled) {
        try {
          const horizonBarSec = tapeHorizonBarStart(horizon.startedAtSec, getIntervalSec(timeframe));
          const xRaw = chart.timeScale().timeToCoordinate(horizonBarSec as any);
          if (xRaw != null && Number.isFinite(xRaw)) {
            const x = Math.round(xRaw as number);
            // Only draw when in view (with a small margin)
            if (x > -60 && x < W + 60) {
              ctx.save();
              // Vertical line — warm gold, dashed, subtly luminous (fainter
              // than a price line so it does not steal focus). Twin-stroke
              // for a soft outer glow so the marker survives dark chart bg.
              ctx.beginPath();
              ctx.moveTo(x + 0.5, 0);
              ctx.lineTo(x + 0.5, H);
              ctx.strokeStyle = "rgba(240,180,41,0.18)";
              ctx.lineWidth = 4;
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(x + 0.5, 0);
              ctx.lineTo(x + 0.5, H);
              ctx.strokeStyle = "rgba(240,180,41,0.85)";
              ctx.lineWidth = 1.5;
              ctx.setLineDash([5, 4]);
              ctx.stroke();
              ctx.setLineDash([]);
              // Label chip with growing-memory context: duration since horizon
              // + number of trades observed. Turns the marker into a visible
              // WM-memory artefact (Founder verbatim: "WM builds its own
              // truthful memory from the moment it begins observing").
              const localTime = fmtTickMark(horizon.startedAtSec, 3);
              const nowSec = Math.floor(Date.now() / 1000);
              const durSec = Math.max(0, nowSec - horizon.startedAtSec);
              const durStr =
                durSec < 60      ? `${durSec}s`
                : durSec < 3600  ? `${Math.floor(durSec / 60)}m`
                : durSec < 86400 ? `${Math.floor(durSec / 3600)}h ${Math.floor((durSec % 3600) / 60)}m`
                :                  `${Math.floor(durSec / 86400)}d`;
              const tradeCount = sessionTapeStatsRef.current.tradeCount;
              const label = tapeHorizonLabel(localTime, durStr, tradeCount, W < 480);
              ctx.font = "700 10px system-ui, -apple-system, sans-serif";
              const tw = ctx.measureText(label).width;
              const padX = 8;
              const padY = 4;
              const boxW = Math.round(tw + padX * 2);
              const boxH = 18;
              // Position: right of the line if room, else left, else center on x.
              const boxX = x + 6 + boxW < W ? x + 6 : (x - 6 - boxW > 0 ? x - 6 - boxW : Math.max(4, x - boxW / 2));
              // On phones, the truthful footprint + session status chips occupy
              // the top of the chart. Keep the canvas-owned horizon label below
              // them so three truth surfaces never paint over one another.
              // Desktop: the top row belongs to the DOM bar clock and the
              // depth tag (a live tape printed this pill through the clock,
              // 2026-09-24), so the horizon's words sit at the FOOT of its
              // own line, just above the time axis.
              const boxY = W < 480 ? 104 : Math.max(6, H - 64);
              ctx.fillStyle = "rgba(11,14,26,0.92)";
              ctx.strokeStyle = "rgba(240,180,41,0.75)";
              ctx.lineWidth = 1;
              // Rounded rect
              const r = 5;
              ctx.beginPath();
              ctx.moveTo(boxX + r, boxY);
              ctx.lineTo(boxX + boxW - r, boxY);
              ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r);
              ctx.lineTo(boxX + boxW, boxY + boxH - r);
              ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH);
              ctx.lineTo(boxX + r, boxY + boxH);
              ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r);
              ctx.lineTo(boxX, boxY + r);
              ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
              // Text — warm gold
              ctx.fillStyle = "#F0B429";
              ctx.textAlign = "left";
              ctx.textBaseline = "middle";
              ctx.fillText(label, boxX + padX, boxY + boxH / 2 + 0.5);
              ctx.restore();
            }
          }
        } catch { /* chart may be mid-transition; safe to skip this frame */ }
      }

      /* ══════════════════════════════════════════════════════
         CANDLE TIMER — countdown pinned to the LIVE PRICE LINE
         on the left edge, so it travels vertically with price.
         Gated by chartSettings.candleTimer (Chart Settings toggle).
      ══════════════════════════════════════════════════════ */
      if (candleTimerRef.current) {
        const liveBars = barsRef.current;
        const lastBar  = liveBars.length ? liveBars[liveBars.length - 1] : null;
        const yRaw = lastBar ? srs?.priceToCoordinate(lastBar.close) : null;
        if (lastBar && yRaw != null && Number.isFinite(yRaw)) {
          const y     = yRaw as number;
          const txt   = countdownRef.current;
          const flash = closeFlashRef.current;
          const neon  = chartSettings?.neon;
          ctx.save();
          ctx.font = "bold 12px monospace";
          const tw    = ctx.measureText(txt).width;
          const boxH  = 19;
          const boxW  = Math.round(tw + 30);
          const x     = 2;
          const cy    = Math.max(boxH / 2 + 1, Math.min(H - boxH / 2 - 1, y));
          const boxY  = Math.round(cy - boxH / 2);
          const border = flash ? "#FF2E63" : (neon ? "#00FFA3" : "#2F80ED");
          // FL-06: desktop is one continuous price instrument. The countdown
          // keeps its real price coordinate, ring/progress, live-close flash,
          // text and connector, but loses the floating card material. Narrow
          // charts keep the shell because it protects legibility over a
          // compressed market. Only these two paint operations are gated.
          if (candleCountdownUsesPillShell(W)) {
            ctx.fillStyle = flash ? "rgba(255,46,99,0.95)" : "rgba(14,18,30,0.94)";
            ctx.fillRect(x, boxY, boxW, boxH);
            ctx.strokeStyle = border; ctx.lineWidth = 1;
            ctx.strokeRect(x + 0.5, boxY + 0.5, boxW - 1, boxH - 1);
          }
          // elapsed-fraction ring (clock)
          const ringX = x + 10, ringR = 5;
          ctx.beginPath(); ctx.arc(ringX, cy, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1.4; ctx.stroke();
          ctx.beginPath();
          ctx.arc(ringX, cy, ringR, -Math.PI / 2, -Math.PI / 2 + progressRef.current * Math.PI * 2);
          ctx.strokeStyle = flash ? "#fff" : border; ctx.lineWidth = 1.8; ctx.stroke();
          // countdown text
          ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
          ctx.fillText(txt, x + 19, cy + 0.5);
          // dashed connector toward the price line so the eye links pill↔price
          ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
          ctx.strokeStyle = flash ? "rgba(255,46,99,0.45)" : (neon ? "rgba(0,255,163,0.35)" : "rgba(47,128,237,0.32)");
          ctx.beginPath(); ctx.moveTo(x + boxW + 1, cy + 0.5); ctx.lineTo(x + boxW + 34, cy + 0.5); ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
      }

      /* ══════════════════════════════════════════════════════════════════════
         ABSORPTION ANATOMY — Founder Asset 06, drawn in price/time space.

         THE MOCKUP IS THE IMPLEMENTATION TARGET, NOT A WRITING PROMPT.

         Asset 06's centre panel is a RELATIONSHIP between two series plotted
         against the same price axis: an EFFORT field whose vertical extent at
         each bar is that bar's aggression intensity, and the PRICE PATH riding
         on top of it, whose SLOPE is the displacement. Absorption is the place
         where the field is tall and the path is flat — and the mockup pins a
         band AT THAT PRICE, because the whole point is that the trader can see
         where in the auction it happened while the candles are still visible.

         A paragraph saying "HIGH EFFORT · WEAK DISPLACEMENT" is that picture
         with the geometry deleted. It carries the conclusion and throws away
         the evidence, which is the opposite of what this panel was invented
         for. So the field, the path and the band are drawn here, over the real
         candles, in the chart's own coordinate system — `priceToCoordinate`
         and `timeToCoordinate`, the same transforms the candles use, so the
         band cannot drift away from the price it is a claim about.

         TRUTH FEEDS THE SHAPE. The series comes from `selectAbsorptionAnatomy`
         (pure, tested); this block owns pixels only and derives no market fact.
         Per-bar aggressor volume comes from `getBarSubProfile`, which returns
         REAL TAPE OR NULL — it never synthesizes a footprint. The chart's tick
         accumulator does not record the venue's aggressor METHOD, so a split
         sourced here can never be claimed as PROVIDER; it goes in unstamped and
         the selector's weakest-link rule lands it on INFERRED_DELTA. Most of
         the day there is no tape at all and the basis is VOLUME — real,
         observed, unsigned effort. The basis is PRINTED ON THE CHART, never
         hovered, because the label is part of the pixel.

         When nothing is measurable the field is not drawn at all. A flat band
         would read as "no pressure", which is a claim; absence is not.
      ══════════════════════════════════════════════════════════════════════ */
      /*
        ABSORPTION SILENCE MUST BE NAMED — the same rule the four order-flow
        layers below obey. A layer that writes nothing when switched off is
        indistinguishable from a layer that broke, and an external probe reading
        `canvas.dataset.absorption` cannot tell those apart. Publish the
        receipt in EVERY state; the paint work stays inside the truthy branch.
      */
      // H-501/F16 QUESTION LENS — set inside the absorption section when a
      // question is active; every later layer is quieted by it. 1 = no lens.
      let questionQuiet = 1;
      // SCAFFOLDING — set when the card was drawn from a measured anatomy.
      let scaffoldPainted: string | null = null;
      // Chips that float with price and were painted this frame; later chrome
      // steps around them instead of printing through them.
      const floatingChips: { x: number; y: number; w: number; h: number }[] = [];
      if (!absorptionAnatomyActive) {
        const ds = canvas.dataset;
        ds.absorption = "OFF";
        delete ds.absorptionBasis;
        delete ds.absorptionZones;
      }
      if (absorptionAnatomyActive) {
        try {
          const srcBars = barsRef.current;
          const ts = chart.timeScale();

          // ── THE WINDOW FOLLOWS THE EYE ─────────────────────────────────
          // Observed live on /charts (2026-09-17): this was pinned at the
          // trailing 30 bars. The number of bars ON SCREEN is not pinned at
          // anything — at the default zoom the chart draws several hundred,
          // so a 30-bar field collapsed into a sliver at the right edge,
          // underneath the volume profile, where it could not be read at any
          // zoom step. The layer was live, correct, and invisible.
          //
          // A fixed bar count cannot be right, because the question the field
          // answers — "was the effort in FRONT OF ME paid for?" — is asked
          // about whatever the trader is looking at. So the window is the
          // VISIBLE range. It is not `slice(-N)`: a trader who has scrolled
          // back into history must get the field over the bars actually in
          // front of them, not over the live edge they cannot see.
          //
          // The selector normalises effort and displacement against whatever
          // window it is handed, so a moving window stays self-scaling — the
          // tallest column is always the biggest effort IN VIEW, which is the
          // only claim the drawing ever makes.
          const vis = ts.getVisibleLogicalRange();
          let from = 0;
          let to = srcBars.length;
          if (vis) {
            const lo = Math.floor(vis.from);
            const hi = Math.ceil(vis.to) + 1;
            if (Number.isFinite(lo) && Number.isFinite(hi) && hi > lo) {
              from = Math.max(0, Math.min(srcBars.length, lo));
              to = Math.max(from, Math.min(srcBars.length, hi));
            }
          }
          // Upper bound is a drawing constraint, not a market one: past a few
          // hundred columns the strata are thinner than a pixel and the field
          // stops being readable as shape. When the cap bites we keep the
          // RIGHT-hand end of the view, because the newest bars in view are
          // the ones a decision is being made about — and the dashed edge
          // below declares exactly where the covered span starts, so a capped
          // window is visible as a capped window rather than passing for the
          // whole view.
          const MAX_COLUMNS = 240;
          const windowCapped = to - from > MAX_COLUMNS;
          if (windowCapped) from = to - MAX_COLUMNS;
          // No floor is enforced here. A window too small to measure flows
          // into the selector, comes back UNMEASURED, and lands in the refusal
          // branch below — which is the correct render, and one fewer place
          // that decides what "enough" means.
          const tail = srcBars.slice(from, to);
          const WINDOW = tail.length;

          const anatomyInput: AnatomyBarInput[] = tail.map(b => {
            // Real tape or null — never synthesized. Unstamped on purpose:
            // we cannot prove the venue asserted these sides.
            const sub = getBarSubProfile(b);
            let askVol: number | null = null;
            let bidVol: number | null = null;
            if (sub) {
              let a = 0, d = 0;
              for (const s of sub) { a += s.ask; d += s.bid; }
              if (a + d > 0) { askVol = a; bidVol = d; }
            }
            return {
              time: b.time as number,
              open: b.open, high: b.high, low: b.low, close: b.close,
              volume: Number.isFinite(b.volume) ? b.volume : 0,
              askVol, bidVol,
            };
          });

          const anatomy = selectAbsorptionAnatomy(anatomyInput, { windowBars: WINDOW });

          // Screen positions for every bar that is actually on screen.
          const pts = anatomy.bars.map(b => {
            const xr = ts.timeToCoordinate(b.time as never);
            const yr = srs.priceToCoordinate(b.close);
            return xr == null || yr == null
              ? null
              : { b, x: +xr, y: +yr };
          }).filter((p): p is { b: typeof anatomy.bars[number]; x: number; y: number } => p != null);

          const BASIS_LABEL: Record<typeof anatomy.basis, string> = {
            SIGNED_DELTA: "EFFORT · DELTA",
            INFERRED_DELTA: "EFFORT · DELTA (INFERRED)",
            VOLUME: "EFFORT · VOLUME",
            UNMEASURED: "EFFORT UNMEASURED",
          };

          // Publish what was drawn so chrome can agree with the glass instead
          // of narrating its own version of it.
          const ds = canvas.dataset;
          ds.absorptionBasis = anatomy.basis;
          ds.absorptionZones = String(anatomy.zones.length);
          /*
            A LAYER'S RECEIPT NAMES A STATE, NOT A METRIC. The three others
            report DRAWN / OFF / NO_READING / <refusal>. Absorption's is
            derived from the compiler: `measured` is the difference between a
            reading that succeeded and a window too quiet to grade.
          */
          ds.absorption = anatomy.measured
            ? (anatomy.zones.length > 0 ? "DRAWN" : "MEASURED_NO_ZONES")
            : "UNMEASURED";

          if (anatomy.measured && pts.length >= 2) {
            ctx.save();

            // Half-height of the field at effortNorm === 1. Bounded so a quiet
            // instrument cannot paint the whole pane.
            const halfMax = Math.min(72, H * 0.14);

            // ── EFFORT (PRESSURE): layered strata, widest/faintest outside.
            // "Height = aggression intensity."
            //
            // ALPHAS ARE A TRUTH CONSTRAINT, NOT A TASTE SETTING. This canvas
            // sits ABOVE the candles, so every unit of opacity here is a unit
            // of price action taken away from the trader. The four strata
            // overlap at the spine, so the budget that matters is the SUM. It
            // is held at 0.22 — enough to read the field's shape, low enough
            // that a candle body under the tallest column is still legible.
            const LAYERS: Array<{ frac: number; alpha: number }> = [
              { frac: 1.0,  alpha: 0.04 },
              { frac: 0.74, alpha: 0.05 },
              { frac: 0.50, alpha: 0.06 },
              { frac: 0.28, alpha: 0.07 },
            ];
            for (const layer of LAYERS) {
              ctx.beginPath();
              // top edge, left → right
              pts.forEach((p, i) => {
                const yTop = p.y - p.b.effortNorm * halfMax * layer.frac;
                if (i === 0) ctx.moveTo(p.x, yTop); else ctx.lineTo(p.x, yTop);
              });
              // bottom edge, right → left, closing the ribbon
              for (let i = pts.length - 1; i >= 0; i--) {
                const p = pts[i]!;
                ctx.lineTo(p.x, p.y + p.b.effortNorm * halfMax * layer.frac);
              }
              ctx.closePath();
              ctx.fillStyle = `rgba(212,175,55,${layer.alpha})`;
              ctx.fill();
            }

            // ── PRICE DISPLACEMENT is NOT redrawn here.
            //
            // The mockup's centre panel carries a white price path because that
            // panel has no candles under it — the path IS the price there. On
            // this chart the candles are already the price, at the same scale,
            // from the same series. Stroking a second price line over them does
            // not add displacement to the picture; it only adds a near-opaque
            // line across the bars the trader came to read, and it invites the
            // question of which of the two lines is authoritative when they are
            // one line. Translating the mockup faithfully means keeping the
            // RELATIONSHIP (field vs slope) and letting the existing candles be
            // the slope. Field here, price from the series — one owner each.

            // ── WINDOW EDGE, drawn ONLY when the field stops short of the
            // view. The window now follows the visible range, so in the normal
            // case the field's left edge IS the left edge of the chart and a
            // dashed line there would be decoration marking nothing. It earns
            // its ink in exactly one case: the MAX_COLUMNS cap bit, so the
            // covered span is narrower than what the trader can see, and the
            // boundary between "measured" and "not drawn" falls in the middle
            // of the screen. That boundary must be declared, or the field
            // reads as an unexplained smear at the right.
            const firstX = pts[0]!.x;
            if (windowCapped) {
              ctx.save();
              ctx.setLineDash([2, 4]);
              ctx.strokeStyle = "rgba(212,175,55,0.30)";
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(firstX, 0);
              ctx.lineTo(firstX, H);
              ctx.stroke();
              ctx.restore();
            }

            // The count is always printed. It is the field's own statement of
            // how many bars it measured, and a trader comparing two zoom
            // levels needs it whether or not the span was capped. "IN VIEW"
            // rather than "LAST": these are the bars in front of the eye, and
            // on a scrolled-back chart they are emphatically not the last.
            //
            // ANCHORED TO THE PLOT'S BOTTOM, NOT THE CONTAINER'S. This label
            // was drawn at `H - 18`, and `H` is `cont.offsetHeight` — the whole
            // chart container, time axis included. MEASURED LIVE on prod: the
            // container is 560px, the price pane ends at 530, and the time axis
            // occupies 530–558. `H - 18` = 542 put this label TWELVE PIXELS
            // INSIDE the axis band, underneath the date row, where it has never
            // once been visible.
            //
            // The previous baton recorded this label as "not observed, not
            // claimed" and attributed it to the capture viewport. The viewport
            // was real but it was not the cause: the label was never on the
            // chart to begin with. That is the same defect as the zone chip
            // clamped to `W` — a mark positioned correctly against a boundary
            // that is not the one the trader's eye actually stops at — and it
            // is the third time on this one layer that measuring the container
            // instead of the plot has made a correct drawing invisible.
            const axisH = (() => {
              try {
                const h = ts.height();
                if (Number.isFinite(h) && h > 0) return Math.ceil(h);
              } catch {}
              return 28;
            })();
            const plotBottom = Math.max(20, H - axisH);
            const winTxt = `${pts.length} BARS IN VIEW`;
            ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
            const winW = ctx.measureText(winTxt).width;
            const desktopWindowChrome = W >= 960;
            if (desktopWindowChrome) {
              // The count is provenance for the field, not a price event and
              // not another card. FL-06 keeps such chart facts quiet at the
              // glass edge. Retain the backed treatment on narrow canvases,
              // where the time axis competes more aggressively for contrast.
              ctx.save();
              ctx.fillStyle = "rgba(178,170,151,0.84)";
              ctx.shadowColor = "rgba(0,0,0,0.95)";
              ctx.shadowBlur = 3;
              ctx.textAlign = "left";
              ctx.textBaseline = "middle";
              ctx.fillText(winTxt, firstX + 3, plotBottom - 11.5);
              ctx.restore();
            } else {
              ctx.fillStyle = "rgba(14,12,8,0.86)";
              ctx.fillRect(firstX + 3, plotBottom - 18, winW + 10, 13);
              ctx.fillStyle = "rgba(201,165,92,0.9)";
              ctx.textAlign = "left";
              ctx.textBaseline = "middle";
              ctx.fillText(winTxt, firstX + 8, plotBottom - 11.5);
            }

            // ── ABSORPTION ZONE: pinned at the price the auction happened at.
            for (const zone of anatomy.zones) {
              const x0r = ts.timeToCoordinate(zone.startTime as never);
              const x1r = ts.timeToCoordinate(zone.endTime as never);
              const yHiR = srs.priceToCoordinate(zone.priceHi);
              const yLoR = srs.priceToCoordinate(zone.priceLo);
              if (x0r == null || x1r == null || yHiR == null || yLoR == null) continue;

              // Widen by roughly half a bar each side so the band covers the
              // candles it is made of rather than their centre points.
              const spacing = pts.length >= 2 ? Math.abs(pts[1]!.x - pts[0]!.x) : 6;
              const x0 = +x0r - spacing / 2;
              const x1 = +x1r + spacing / 2;
              const yHi = +yHiR, yLo = +yLoR;
              const bw = Math.max(2, x1 - x0);
              const bh = Math.max(2, yLo - yHi);

              // FL-06 does not present the absorption shelf as a floating
              // card. The measured time/price rectangle IS the instrument:
              // a quiet hatched shelf with the reading attached directly to
              // it. Keep that treatment desktop-only; narrow charts retain
              // the compact backed chip because text over candles there is
              // not reliably legible. The hatch is clipped to the compiler's
              // real bounds — no minimum price thickness and no invented
              // extension beyond the bars that produced the zone.
              const desktopShelfInstrument = W >= 960;

              ctx.fillStyle = desktopShelfInstrument
                ? "rgba(210,214,219,0.10)"
                : "rgba(212,175,55,0.10)";
              ctx.fillRect(x0, yHi, bw, bh);

              if (desktopShelfInstrument) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(x0, yHi, bw, bh);
                ctx.clip();
                ctx.strokeStyle = "rgba(210,214,219,0.24)";
                ctx.lineWidth = 1;
                const hatchStep = 7;
                for (let hx = x0 - bh; hx < x1 + bh; hx += hatchStep) {
                  ctx.beginPath();
                  ctx.moveTo(hx, yLo);
                  ctx.lineTo(hx + bh, yHi);
                  ctx.stroke();
                }
                ctx.restore();
              }

              ctx.setLineDash([4, 3]);
              ctx.strokeStyle = desktopShelfInstrument
                ? "rgba(210,214,219,0.48)"
                : "rgba(212,175,55,0.75)";
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(x0, yHi + 0.5); ctx.lineTo(x1, yHi + 0.5);
              ctx.moveTo(x0, yLo - 0.5); ctx.lineTo(x1, yLo - 0.5);
              ctx.stroke();
              ctx.setLineDash([]);

              // Compact chip. The ratio is the mockup's own reading; when the
              // run displaced price not at all the ratio is unbounded and we
              // print that rather than inventing a ceiling.
              const ratioTxt = zone.unbounded
                ? "∞"
                : zone.efficiencyRatio == null
                  ? "—"
                  : zone.efficiencyRatio.toFixed(2);
              const chip = `ABSORPTION ${ratioTxt} ${zone.strength}`;
              ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
              const cw2 = ctx.measureText(chip).width;
              const chipH = 14;
              const chipW = cw2 + 12;
              // Clamp BOTH edges. The left was already held off the frame; the
              // right was not, and once the window started following the eye
              // the zones moved out to the live edge, where the chip ran past
              // the plot area and was cut. Observed live 2026-09-17: a zone
              // read "ABSORPTION 3.86 M" with the strength word sliced in half
              // — and MODERATE and MASSIVE would both have begun that way, so
              // the clipping did not merely look bad, it made the chip
              // ambiguous about the one word it exists to deliver.
              //
              // THE FIRST VERSION OF THIS CLAMP DID NOTHING, AND LOOKING IS
              // WHAT CAUGHT IT. It clamped to `W`, which is `cont.offsetWidth`
              // — the whole chart container, price axis included. The edge
              // that actually cuts the chip is the PLOT's, ~90–130px further
              // left, because the right price scale is painted over the
              // overlay. So the clamp was arithmetically correct against a
              // boundary nothing was ever clipped by: re-deployed, re-opened,
              // and the chip still read "ABSORPTION 3.86 M".
              //
              // The axis width is not a constant — it grows with the digits in
              // the price (29,731.00 is wider than 12.40) — so it is QUERIED,
              // the same way the volume-profile histogram already queries it
              // rather than reserving a guessed 60px.
              const axisW = (() => {
                try {
                  const w = chart.priceScale("right").width();
                  if (Number.isFinite(w) && w > 0) return Math.ceil(w);
                } catch {}
                return 90;
              })();
              const plotRight = Math.max(4, W - axisW);
              const chipX = Math.min(Math.max(2, x0), Math.max(2, plotRight - chipW - 2));
              const chipY = Math.max(2, yHi - chipH - 2);
              if (desktopShelfInstrument) {
                // Direct annotation, not another gold card. A restrained
                // shadow protects legibility while the shelf remains the
                // dominant shape and the candles remain visible.
                ctx.save();
                ctx.fillStyle = "rgba(224,190,92,0.96)";
                ctx.shadowColor = "rgba(0,0,0,0.95)";
                ctx.shadowBlur = 3;
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                ctx.fillText(chip, chipX, chipY + chipH / 2 + 0.5);
                ctx.restore();
              } else {
                ctx.fillStyle = "rgba(14,12,8,0.92)";
                ctx.fillRect(chipX, chipY, chipW, chipH);
                ctx.strokeStyle = "rgba(212,175,55,0.65)";
                ctx.lineWidth = 1;
                ctx.strokeRect(chipX + 0.5, chipY + 0.5, cw2 + 11, chipH - 1);
                ctx.fillStyle = "#d4af37";
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                ctx.fillText(chip, chipX + 6, chipY + chipH / 2 + 0.5);
              }
            }

            // ── BASIS. Compact, always visible, never a vendor name.
            const basisTxt = BASIS_LABEL[anatomy.basis];
            ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
            const bwTxt = ctx.measureText(basisTxt).width;
            // `by` CLEARS THE PRICE LEGEND. See PRICE_LEGEND_OVERLAY_H: this
            // caption held `by = 8` from before the legend moved into the pane,
            // and was printing under the headline price. Derived, not re-typed,
            // so it tracks the legend if the legend's height ever changes.
            const bx = BASIS_CAPTION_X, by = BELOW_PRICE_LEGEND;
            const desktopBasisChrome = W >= 960;
            if (desktopBasisChrome) {
              // FL-06 carries basis as quiet chart provenance, not a second
              // card hovering over price. Keep the statement visible while
              // letting the canvas remain the dominant object.
              ctx.save();
              ctx.fillStyle = "rgba(178,170,151,0.86)";
              ctx.shadowColor = "rgba(0,0,0,0.95)";
              ctx.shadowBlur = 3;
              ctx.textAlign = "left";
              ctx.textBaseline = "middle";
              ctx.fillText(basisTxt, bx, by + 7.5);
              ctx.restore();
            } else {
              ctx.fillStyle = "rgba(14,12,8,0.86)";
              ctx.fillRect(bx, by, bwTxt + 12, 14);
              ctx.strokeStyle = "rgba(139,106,41,0.45)";
              ctx.lineWidth = 1;
              ctx.strokeRect(bx + 0.5, by + 0.5, bwTxt + 11, 13);
              ctx.fillStyle = "rgba(201,165,92,0.95)";
              ctx.textAlign = "left";
              ctx.textBaseline = "middle";
              ctx.fillText(basisTxt, bx + 6, by + 7.5);
            }

            /* ── EXHAUSTION ANATOMY — the plate's right half ────────────────
               Same effort series as the absorption zones above (one owner,
               two readings). At the extreme of every push whose effort faded
               as it extended and then failed to follow through: three fading
               bars (declining aggression) just beyond the extreme, and the
               plate's four metrics on a chip. Crimson is the plate's own
               exhaustion colour; the mark is a fact about the push, never a
               forecast. */
            {
              const ex = selectExhaustion(anatomy);
              ds.exhaustion = ex.reason === "MEASURED" ? String(ex.marks.length) : ex.reason;
              for (const m of ex.marks) {
                const xr = ts.timeToCoordinate(m.time as never);
                const yr = srs.priceToCoordinate(m.price);
                if (xr == null || yr == null) continue;
                const x = +xr;
                const up = m.direction === "UP";
                const y0 = up ? +yr - 8 : +yr + 8;
                ctx.save();
                ctx.fillStyle = "rgba(226,92,92,0.95)";
                [9, 6, 3].forEach((h, k) => {
                  const bxk = x - 6 + k * 5;
                  ctx.fillRect(bxk, up ? y0 - h : y0, 3, h);
                });
                const pct = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)}%`);
                const chipTxt = `EXHAUSTION · AGG ${pct(m.aggressionLevel)} · EXT ${m.extension.toFixed(1)}× · FT ${m.followThrough ?? "—"}/3 · ET ${pct(m.energyTransfer)}`;
                ctx.font = "700 9px ui-sans-serif, system-ui, sans-serif";
                const cw = ctx.measureText(chipTxt).width + 12;
                const cx = Math.max(4, Math.min(x - cw / 2, W - 96 - cw));
                // The Question Lens strip owns y≈100–152 while it is on; a chip
                // there would be covered by the very question it answers, so it
                // hangs on the other side of its mark instead.
                const lensBand = layerOnRef.current.questionLens === true;
                let cy = up ? y0 - 26 : y0 + 12;
                if (lensBand && cy < 158 && cy + 14 > 96) cy = up ? y0 + 16 : Math.max(160, y0 + 12);
                ctx.fillStyle = "rgba(20,8,8,0.88)";
                ctx.fillRect(cx, cy, cw, 14);
                floatingChips.push({ x: cx, y: cy, w: cw, h: 14 });
                ctx.strokeStyle = "rgba(226,92,92,0.85)";
                ctx.lineWidth = 1;
                ctx.strokeRect(cx + 0.5, cy + 0.5, cw - 1, 13);
                ctx.fillStyle = "rgba(255,170,170,1)";
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                ctx.fillText(chipTxt, cx + 6, cy + 7.5);
                ctx.restore();
              }
            }

            /* ── ANATOMY CARDS — the plate's two KEY METRICS columns ─────────
               ABSORPTION ANATOMY (gold) beside EXHAUSTION ANATOMY (crimson),
               four big numbers each, the outcome under them, and a dotted
               leader from each card to the candles it measured — so the card
               can never float free of the price it is a claim about. */
            if (layerOnRef.current.anatomyCards === true) {
              const cards = selectAnatomyCards(anatomy, selectExhaustion(anatomy));
              ds.anatomyCards = `${cards.absorption.empty ? "NONE" : cards.absorption.outcome}|${cards.exhaustion.empty ? "NONE" : cards.exhaustion.outcome}`;
              ctx.save();
              const cw = 292, ch = 188, gap = 12;
              const top = Math.max(200, H - 190 - ch);
              const font = (w: number, px: number) => `${w} ${px}px ui-sans-serif, system-ui, sans-serif`;
              // The Question Lens owns the left column (strip, debt, control);
              // the cards step right of it rather than printing over it.
              let cardsLeft = layerOnRef.current.questionLens === true ? 322 : 12;
              let cardsTop = top;
              // SCAFFOLDING owns its card (painted later this frame at the
              // same left column). Find room beside it, then below it; if the
              // camera has neither, the two cards fold into two measured lines
              // at the foot of the plot — same numbers, nothing dropped.
              const sDepth = scaffoldingDepthRef.current;
              let compact = false;
              if (sDepth !== "OFF") {
                const sx = cardsLeft, sy = 176;
                const sw = sDepth === "FOUNDATION" ? 470 : 300;
                const sh = 12 + (sDepth === "FOUNDATION" ? 250 : sDepth === "INTERMEDIATE" ? 234 : 266);
                const need = 2 * cw + gap;
                if (sx + sw + 12 + need <= W - 90) {
                  cardsLeft = sx + sw + 12;
                } else if (sy + sh + 8 + ch <= H - 40) {
                  cardsTop = sy + sh + 8;
                } else {
                  compact = true;
                }
              }
              if (compact) {
                const lines = [cards.absorption, cards.exhaustion].map(c =>
                  c.empty
                    ? `${c.title} · ${c.empty}`
                    : `${c.kind} · ${c.metrics.map(m => `${m.label.toLowerCase()} ${m.value}`).join(" · ")} · ${c.outcome}`);
                ctx.font = font(700, 9);
                const lw = Math.max(...lines.map(t => ctx.measureText(t).width)) + 16;
                const ly = H - 58;
                ctx.fillStyle = "rgba(11,10,8,0.92)";
                ctx.fillRect(cardsLeft, ly, lw, 34);
                ctx.strokeStyle = "rgba(201,165,92,0.5)"; ctx.lineWidth = 1;
                ctx.strokeRect(cardsLeft + 0.5, ly + 0.5, lw - 1, 33);
                ctx.textAlign = "left"; ctx.textBaseline = "middle";
                ctx.fillStyle = "rgba(240,190,70,1)";
                ctx.fillText(lines[0], cardsLeft + 8, ly + 10);
                ctx.fillStyle = "rgba(226,92,92,1)";
                ctx.fillText(lines[1], cardsLeft + 8, ly + 24);
                ds.anatomyCardsLayout = "COMPACT";
              } else {
                ds.anatomyCardsLayout = "CARDS";
              }
              if (!compact) [cards.absorption, cards.exhaustion].forEach((c, k) => {
                const x0 = cardsLeft + k * (cw + gap);
                const ex = c.kind === "EXHAUSTION";
                const ACC = ex ? "rgba(226,92,92,1)" : "rgba(240,190,70,1)";
                const ACC_DIM = ex ? "rgba(226,92,92,0.55)" : "rgba(201,165,92,0.6)";
                ctx.fillStyle = ex ? "rgba(20,8,8,0.92)" : "rgba(11,10,8,0.92)";
                ctx.fillRect(x0, cardsTop, cw, ch);
                ctx.strokeStyle = ACC_DIM; ctx.lineWidth = 1;
                ctx.strokeRect(x0 + 0.5, cardsTop + 0.5, cw - 1, ch - 1);
                ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.font = font(800, 13); ctx.fillStyle = ACC;
                ctx.fillText(c.title, x0 + cw / 2, cardsTop + 15);
                ctx.fillStyle = "rgba(237,230,211,0.75)";
                let sp = 7.5;
                ctx.font = font(600, sp);
                while (sp > 5.5 && ctx.measureText(`(${c.subtitle})`).width > cw - 16) { sp -= 0.25; ctx.font = font(600, sp); }
                ctx.fillText(`(${c.subtitle})`, x0 + cw / 2, cardsTop + 29);
                if (c.empty) {
                  ctx.font = font(600, 9); ctx.fillStyle = "rgba(200,192,174,0.85)";
                  ctx.fillText(c.empty.length > 52 ? c.empty.slice(0, 51) + "…" : c.empty, x0 + cw / 2, cardsTop + ch / 2 + 6);
                  return;
                }
                // Four metric tiles, 2×2: label · big number · word.
                const tw = (cw - 24) / 2, th = 50;
                c.metrics.forEach((m, i) => {
                  const tx = x0 + 8 + (i % 2) * (tw + 8);
                  const ty = cardsTop + 40 + Math.floor(i / 2) * (th + 6);
                  ctx.strokeStyle = "rgba(237,230,211,0.12)";
                  ctx.strokeRect(tx + 0.5, ty + 0.5, tw - 1, th - 1);
                  ctx.textAlign = "left";
                  ctx.font = font(700, 7.5); ctx.fillStyle = "rgba(237,230,211,0.8)";
                  ctx.fillText(m.label, tx + 8, ty + 10);
                  ctx.font = font(800, 19); ctx.fillStyle = ACC;
                  ctx.fillText(m.value, tx + 8, ty + 28);
                  ctx.font = font(700, 7.5); ctx.fillStyle = ACC_DIM;
                  ctx.fillText(m.word, tx + 8, ty + 43);
                });
                ctx.textAlign = "left";
                ctx.font = font(800, 10); ctx.fillStyle = ACC;
                ctx.fillText(`${ex ? "EXHAUSTION" : "ABSORPTION"} OUTCOME · ${c.outcome}`, x0 + 10, cardsTop + ch - 24);
                ctx.font = font(500, 8); ctx.fillStyle = "rgba(200,192,174,0.85)";
                ctx.fillText(c.outcomeNote, x0 + 10, cardsTop + ch - 10);
                // Leader to the candles.
                if (c.time != null && c.price != null) {
                  const xr = ts.timeToCoordinate(c.time as never);
                  const yr = srs.priceToCoordinate(c.price);
                  if (xr != null && yr != null) {
                    ctx.setLineDash([2, 3]);
                    ctx.strokeStyle = ACC_DIM;
                    ctx.beginPath(); ctx.moveTo(x0 + cw / 2, cardsTop); ctx.lineTo(+xr, +yr); ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.fillStyle = ACC;
                    ctx.beginPath(); ctx.arc(+xr, +yr, 3, 0, Math.PI * 2); ctx.fill();
                  }
                }
              });
              ctx.restore();
            } else {
              ds.anatomyCards = "OFF";
            }

            /* ── QUESTION LENS — the plate's "Is buyer effort being absorbed?" ──
               Asked of THIS camera's newest material reading. Banner at the
               top of the pane, the question's band on price, and the measured
               evidence debt as a compact column. While active, every layer
               that is not the question's subject is quieted (questionQuiet). */
            if (layerOnRef.current.questionLens === true) {
              const lens = selectQuestionLens({
                absorption: anatomy,
                exhaustion: selectExhaustion(anatomy),
                livingPoc: livingProfileRef.current?.drawn ? livingProfileRef.current.poc : null,
                pivots: marketStructureRef.current?.drawn ? marketStructureRef.current.pivots : [],
              });
              ds.questionLens = lens.active ? `${lens.kind}:${lens.openDebt}` : "NO_QUESTION";
              if (lens.active && lens.question) {
                questionQuiet = 0.35;
                ctx.save();
                // The question's band across the camera.
                if (lens.bandLow != null && lens.bandHigh != null) {
                  const yh = srs.priceToCoordinate(lens.bandHigh);
                  const yl = srs.priceToCoordinate(lens.bandLow);
                  const xs = lens.bandStart != null ? ts.timeToCoordinate(lens.bandStart as never) : null;
                  if (yh != null && yl != null) {
                    const top = Math.min(+yh, +yl) - (lens.kind === "EXHAUSTION" ? 3 : 0);
                    const h = Math.max(6, Math.abs(+yl - +yh));
                    const x0 = xs == null ? 0 : Math.max(0, +xs - 6);
                    ctx.fillStyle = lens.kind === "EXHAUSTION" ? "rgba(226,92,92,0.14)" : "rgba(240,180,41,0.14)";
                    ctx.fillRect(x0, top, W - 76 - x0, h);
                    ctx.strokeStyle = lens.kind === "EXHAUSTION" ? "rgba(226,92,92,0.7)" : "rgba(240,180,41,0.75)";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x0 + 0.5, Math.round(top) + 0.5, W - 76 - x0, Math.round(h));
                  }
                }
                // THE PLATE'S TOP STRIP — ACTIVE QUESTION | QUESTION FOCUS |
                // SECONDARY NOISE · QUIETED, across the camera.
                {
                  const bx = 12, by = 100, bh = 52;
                  const bw = Math.min(W - 100, 900);
                  ctx.fillStyle = "rgba(11,10,8,0.94)";
                  ctx.fillRect(bx, by, bw, bh);
                  ctx.strokeStyle = "rgba(201,165,92,0.75)"; ctx.lineWidth = 1;
                  ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
                  const c1 = Math.round(bw * 0.58), c2 = Math.round(bw * 0.24);
                  ctx.strokeStyle = "rgba(201,165,92,0.3)";
                  for (const cx of [bx + c1, bx + c1 + c2]) { ctx.beginPath(); ctx.moveTo(cx + 0.5, by + 8); ctx.lineTo(cx + 0.5, by + bh - 8); ctx.stroke(); }
                  ctx.textAlign = "left"; ctx.textBaseline = "middle";
                  const cell = (x: number, w: number, head: string, body: string, bodyPx: number, bodyColor: string) => {
                    ctx.font = "700 9px ui-sans-serif, system-ui, sans-serif";
                    ctx.fillStyle = "rgba(201,165,92,0.9)";
                    ctx.fillText(head, x + 14, by + 15);
                    ctx.font = `600 ${bodyPx}px ui-sans-serif, system-ui, sans-serif`;
                    let t = body;
                    while (t.length > 4 && ctx.measureText(t).width > w - 24) t = t.slice(0, -2);
                    if (t !== body) t = t.slice(0, -1) + "…";
                    ctx.fillStyle = bodyColor;
                    ctx.fillText(t, x + 14, by + 35);
                  };
                  cell(bx, c1, "ACTIVE QUESTION", `“${lens.question}”`, 15, "rgba(247,241,223,1)");
                  cell(bx + c1, c2, "QUESTION FOCUS", lens.focus ?? "", 11, "rgba(237,230,211,0.95)");
                  cell(bx + c1 + c2, bw - c1 - c2, "SECONDARY NOISE", "Quieted", 11, "rgba(237,230,211,0.95)");
                }
                // EVIDENCE DEBT CARD — the plate's gauge: paid of owed, as a
                // ring; then each item, PAID or MISSING, with its measured fact.
                {
                  const lx = 12, top = 164, colW = 300;
                  const rows = lens.debt.length;
                  const ch = 70 + rows * 30 + 38;
                  ctx.fillStyle = "rgba(11,10,8,0.94)";
                  ctx.fillRect(lx, top, colW, ch);
                  ctx.strokeStyle = lens.openDebt > 0 ? "rgba(226,92,92,0.75)" : "rgba(201,165,92,0.75)";
                  ctx.strokeRect(lx + 0.5, top + 0.5, colW - 1, ch - 1);
                  // Ring: one arc per item — filled gold when paid, crimson outline when owed.
                  const rcx = lx + 36, rcy = top + 36, rr = 22;
                  const seg = (Math.PI * 2) / Math.max(1, rows);
                  lens.debt.forEach((d, i) => {
                    ctx.beginPath();
                    ctx.arc(rcx, rcy, rr, -Math.PI / 2 + i * seg + 0.08, -Math.PI / 2 + (i + 1) * seg - 0.08);
                    ctx.lineWidth = 5;
                    ctx.strokeStyle = d.paid ? "rgba(240,190,70,1)" : "rgba(226,92,92,0.9)";
                    ctx.stroke();
                  });
                  ctx.lineWidth = 1;
                  ctx.textAlign = "center";
                  ctx.font = "800 13px ui-sans-serif, system-ui, sans-serif";
                  ctx.fillStyle = "rgba(247,241,223,1)";
                  ctx.fillText(`${rows - lens.openDebt}/${rows}`, rcx, rcy);
                  ctx.textAlign = "left";
                  ctx.font = "800 12px ui-sans-serif, system-ui, sans-serif";
                  ctx.fillStyle = "rgba(247,241,223,1)";
                  ctx.fillText("EVIDENCE DEBT", lx + 70, top + 22);
                  ctx.font = "700 10px ui-sans-serif, system-ui, sans-serif";
                  ctx.fillStyle = lens.openDebt > 0 ? "rgba(255,150,150,1)" : "rgba(201,165,92,1)";
                  ctx.fillText(lens.openDebt > 0 ? `${lens.openDebt} OPEN ITEM${lens.openDebt > 1 ? "S" : ""} · THIS QUESTION` : "PAID · THIS QUESTION", lx + 70, top + 40);
                  let ly = top + 76;
                  for (const d of lens.debt) {
                    ctx.font = "700 9px ui-sans-serif, system-ui, sans-serif";
                    ctx.fillStyle = d.paid ? "rgba(201,165,92,1)" : "rgba(255,150,150,1)";
                    ctx.fillText(`${d.paid ? "PAID" : "MISSING"} · ${d.label}`, lx + 12, ly);
                    ctx.font = "500 8.5px ui-sans-serif, system-ui, sans-serif";
                    ctx.fillStyle = "rgba(200,192,174,0.85)";
                    let ev = d.evidence;
                    while (ev.length > 4 && ctx.measureText(ev).width > colW - 24) ev = ev.slice(0, -2);
                    if (ev !== d.evidence) ev = ev.slice(0, -1) + "…";
                    ctx.fillText(ev, lx + 12, ly + 12);
                    ly += 30;
                  }
                  ctx.strokeStyle = "rgba(201,165,92,0.25)";
                  ctx.beginPath(); ctx.moveTo(lx + 10, ly - 6.5); ctx.lineTo(lx + colW - 10, ly - 6.5); ctx.stroke();
                  ctx.font = "800 10px ui-sans-serif, system-ui, sans-serif";
                  ctx.fillStyle = lens.openDebt > 0 ? "rgba(255,150,150,1)" : "rgba(201,165,92,1)";
                  ctx.fillText(lens.posture ?? "", lx + 12, ly + 6);
                  if (lens.nextQuestion) {
                    ctx.fillStyle = "rgba(200,192,174,0.85)";
                    ctx.font = "500 8.5px ui-sans-serif, system-ui, sans-serif";
                    ctx.fillText(`NEXT QUESTION → ${lens.nextQuestion}`, lx + 12, ly + 20);
                  }
                  // MOCK 3 · AGGRESSION vs DISPLACEMENT — who is in control.
                  // Two measured columns and the plate's verdict, under the debt.
                  if (lens.control) {
                    const c = lens.control;
                    const cy = top + ch + 8, cwh = 92;
                    ctx.fillStyle = "rgba(11,10,8,0.94)";
                    ctx.fillRect(lx, cy, colW, cwh);
                    ctx.strokeStyle = "rgba(201,165,92,0.55)";
                    ctx.strokeRect(lx + 0.5, cy + 0.5, colW - 1, cwh - 1);
                    ctx.font = "800 9px ui-sans-serif, system-ui, sans-serif";
                    ctx.fillStyle = "rgba(237,230,211,0.95)";
                    ctx.fillText("AGGRESSION vs DISPLACEMENT · WHO IS IN CONTROL?", lx + 12, cy + 13);
                    const half = (colW - 36) / 2;
                    ([
                      ["AGGRESSION", c.aggression, "rgba(226,92,92,1)", "initiating pressure"],
                      ["DISPLACEMENT", c.displacement, "rgba(120,160,220,1)", "what price did about it"],
                    ] as const).forEach(([lab, v, col, sub], i) => {
                      const x = lx + 12 + i * (half + 12);
                      ctx.font = "800 9px ui-sans-serif, system-ui, sans-serif";
                      ctx.fillStyle = col;
                      ctx.fillText(lab, x, cy + 31);
                      ctx.font = "800 17px ui-sans-serif, system-ui, sans-serif";
                      ctx.fillText(`${Math.round(v * 100)}%`, x, cy + 49);
                      ctx.font = "500 8px ui-sans-serif, system-ui, sans-serif";
                      ctx.fillStyle = "rgba(200,192,174,0.8)";
                      ctx.fillText(sub, x + 44, cy + 50);
                    });
                    ctx.font = "800 10px ui-sans-serif, system-ui, sans-serif";
                    ctx.fillStyle = c.verdict === "EFFORT ABSORBED" ? "rgba(120,160,220,1)" : "rgba(226,92,92,1)";
                    ctx.fillText(`VERDICT: ${c.verdict}`, lx + 12, cy + 76);
                  }
                }
                ctx.restore();
              }
            } else {
              ds.questionLens = "OFF";
            }

            /* ── SCAFFOLDING — "SAME SKILL. DEEPER MASTERY. LESS HAND-HOLDING." ──
               One read of THIS camera (structure owner + this anatomy + its
               exhaustion) shown at the trader's chosen depth. The nearest
               confirmed swings go ON PRICE at every depth; the card only
               changes how much of the reasoning is spelled out. */
            const depth = scaffoldingDepthRef.current;
            if (depth !== "OFF") {
              const sc = selectScaffoldingRead({
                structure: scaffoldingStructureRef.current,
                absorption: anatomy,
                exhaustion: selectExhaustion(anatomy),
              });
              scaffoldPainted = sc.measured ? `${depth}:${sc.posture}:${sc.cautionFlags.length}` : `${depth}:${sc.reason}`;
              if (sc.measured) {
                ctx.save();
                const GOLD = "rgba(201,165,92,0.95)";
                const CREAM = "rgba(237,230,211,0.95)";
                const DIM = "rgba(200,192,174,0.8)";
                const PANEL = "rgba(11,10,8,0.9)";
                const HAIR = "rgba(201,165,92,0.6)";
                const font = (w: number, px: number) => `${w} ${px}px ui-sans-serif, system-ui, sans-serif`;
                const clip = (t: string, max: number) => {
                  if (ctx.measureText(t).width <= max) return t;
                  let u = t;
                  while (u.length > 1 && ctx.measureText(u + "…").width > max) u = u.slice(0, -1);
                  return u + "…";
                };
                ctx.textAlign = "left"; ctx.textBaseline = "middle";

                // Location on price: the nearest confirmed swings, dashed.
                for (const [lvl, tag] of [[sc.swingAbove, "SWING ABOVE"], [sc.swingBelow, "SWING BELOW"]] as const) {
                  if (lvl == null) continue;
                  const y = srs.priceToCoordinate(lvl);
                  if (y == null) continue;
                  ctx.setLineDash([6, 4]);
                  ctx.strokeStyle = "rgba(237,230,211,0.55)";
                  ctx.lineWidth = 1;
                  ctx.beginPath(); ctx.moveTo(0, Math.round(+y) + 0.5); ctx.lineTo(W - 76, Math.round(+y) + 0.5); ctx.stroke();
                  ctx.setLineDash([]);
                  ctx.font = font(700, 8);
                  const t = `${tag} · ${lvl.toFixed(2)}`;
                  const tw = ctx.measureText(t).width;
                  ctx.fillStyle = PANEL;
                  ctx.fillRect(W - 84 - tw - 8, +y - 7, tw + 8, 14);
                  ctx.fillStyle = CREAM;
                  ctx.fillText(t, W - 84 - tw - 4, +y);
                }

                const x0 = layerOnRef.current.questionLens === true && questionQuiet < 1 ? 322 : 12;
                const y0 = 176;
                // The removal path: where this depth sits.
                ctx.font = font(700, 9);
                ctx.fillStyle = PANEL;
                ctx.fillRect(x0, y0 - 9, 290, 18);
                let px = x0 + 8;
                const path: ScaffoldingDepth[] = ["FOUNDATION", "INTERMEDIATE", "PRO"];
                for (const d of path) {
                  const t = d === "PRO" ? "ADVANCED / PRO" : d;
                  ctx.fillStyle = d === depth ? GOLD : "rgba(200,192,174,0.45)";
                  ctx.fillText(t, px, y0);
                  px += ctx.measureText(t).width + 8;
                  if (d !== "PRO") { ctx.fillStyle = "rgba(200,192,174,0.45)"; ctx.fillText("›", px, y0); px += 12; }
                }
                const top = y0 + 12;

                if (depth === "FOUNDATION") {
                  const w = 470, rowH = 30, h = 40 + sc.steps.length * rowH + 30;
                  ctx.fillStyle = PANEL; ctx.fillRect(x0, top, w, h);
                  ctx.strokeStyle = HAIR; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, top + 0.5, w - 1, h - 1);
                  ctx.font = font(700, 11); ctx.fillStyle = GOLD;
                  ctx.fillText("FOUNDATION VIEW", x0 + 12, top + 14);
                  ctx.font = font(500, 8); ctx.fillStyle = DIM;
                  ctx.fillText("Full scaffolding · six steps fully expanded · every verdict measured", x0 + 12, top + 28);
                  let ry = top + 40;
                  for (const st of sc.steps) {
                    ctx.strokeStyle = "rgba(201,165,92,0.18)";
                    ctx.beginPath(); ctx.moveTo(x0 + 8, ry + 0.5); ctx.lineTo(x0 + w - 8, ry + 0.5); ctx.stroke();
                    ctx.font = font(700, 13); ctx.fillStyle = GOLD;
                    ctx.fillText(String(st.n), x0 + 12, ry + rowH / 2);
                    ctx.font = font(700, 9); ctx.fillStyle = CREAM;
                    ctx.fillText(clip(st.title, 230), x0 + 30, ry + 10);
                    ctx.font = font(500, 8); ctx.fillStyle = DIM;
                    ctx.fillText(clip(st.evidence, 262), x0 + 30, ry + 22);
                    const cw = 160, cx = x0 + w - cw - 10;
                    ctx.strokeStyle = HAIR; ctx.strokeRect(cx + 0.5, ry + 4.5, cw, rowH - 9);
                    ctx.font = font(700, 8); ctx.fillStyle = CREAM;
                    ctx.textAlign = "center";
                    ctx.fillText(clip(st.verdict, cw - 8), cx + cw / 2, ry + rowH / 2);
                    ctx.textAlign = "left";
                    ry += rowH;
                  }
                  ctx.strokeStyle = HAIR; ctx.strokeRect(x0 + 8.5, ry + 4.5, w - 17, 20);
                  ctx.font = font(700, 8.5); ctx.fillStyle = GOLD;
                  ctx.textAlign = "center";
                  ctx.fillText(clip(`CONCLUSION: ${sc.conclusion}`, w - 30), x0 + w / 2, ry + 14.5);
                  ctx.textAlign = "left";
                } else if (depth === "INTERMEDIATE") {
                  const w = 300, rowH = 40, h = 40 + sc.dynamics.length * rowH + 56 + 18;
                  ctx.fillStyle = PANEL; ctx.fillRect(x0, top, w, h);
                  ctx.strokeStyle = HAIR; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, top + 0.5, w - 1, h - 1);
                  ctx.font = font(700, 11); ctx.fillStyle = GOLD;
                  ctx.fillText("INTERMEDIATE VIEW", x0 + 12, top + 14);
                  ctx.font = font(500, 8); ctx.fillStyle = DIM;
                  ctx.fillText("Compressed to core dynamics", x0 + 12, top + 28);
                  let ry = top + 40;
                  for (const d of sc.dynamics) {
                    ctx.strokeStyle = "rgba(201,165,92,0.18)";
                    ctx.beginPath(); ctx.moveTo(x0 + 8, ry + 0.5); ctx.lineTo(x0 + w - 8, ry + 0.5); ctx.stroke();
                    ctx.font = font(700, 18); ctx.fillStyle = GOLD;
                    ctx.fillText(d.trend === "UP" ? "↑" : d.trend === "DOWN" ? "↓" : "•", x0 + 14, ry + rowH / 2);
                    ctx.font = font(700, 11); ctx.fillStyle = CREAM;
                    ctx.fillText(d.label, x0 + 40, ry + 13);
                    ctx.font = font(500, 9); ctx.fillStyle = DIM;
                    ctx.fillText(d.line, x0 + 40, ry + 28);
                    ry += rowH;
                  }
                  ctx.strokeStyle = sc.caution ? GOLD : HAIR;
                  ctx.strokeRect(x0 + 8.5, ry + 6.5, w - 17, 46);
                  ctx.font = font(700, 16); ctx.fillStyle = GOLD;
                  ctx.fillText(sc.posture, x0 + 20, ry + 22);
                  ctx.font = font(500, 8); ctx.fillStyle = CREAM;
                  ctx.fillText(clip(sc.caution ? `${sc.cautionFlags.length} flag${sc.cautionFlags.length > 1 ? "s" : ""}: ${sc.cautionFlags.join(" · ")}` : "no flag fired — the read is yours", w - 40), x0 + 20, ry + 40);
                  ctx.font = font(700, 8); ctx.fillStyle = DIM;
                  ctx.textAlign = "center";
                  ctx.fillText("SAME READ. FEWER STEPS. HIGHER OWNERSHIP.", x0 + w / 2, ry + 64);
                  ctx.textAlign = "left";
                } else {
                  const w = 300, gh = 130, h = 40 + gh + 96;
                  ctx.fillStyle = PANEL; ctx.fillRect(x0, top, w, h);
                  ctx.strokeStyle = HAIR; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, top + 0.5, w - 1, h - 1);
                  ctx.font = font(700, 11); ctx.fillStyle = GOLD;
                  ctx.fillText("ADVANCED / PRO", x0 + 12, top + 14);
                  ctx.font = font(500, 8); ctx.fillStyle = DIM;
                  ctx.fillText("Geometry & efficiency only · effort vs result, cumulative", x0 + 12, top + 28);
                  const gx = x0 + 34, gy = top + 40, gw = w - 48;
                  ctx.strokeStyle = "rgba(237,230,211,0.12)";
                  for (let k = 0; k <= 4; k++) {
                    const yy = Math.round(gy + (gh * k) / 4) + 0.5;
                    ctx.beginPath(); ctx.moveTo(gx, yy); ctx.lineTo(gx + gw, yy); ctx.stroke();
                  }
                  const n = sc.effortCurve.length;
                  const X = (i: number) => gx + (n > 1 ? (gw * i) / (n - 1) : 0);
                  const Y = (v: number) => gy + gh - v * gh;
                  // Where effort ran ahead of result, the unpaid effort is filled.
                  for (let i = 1; i < n; i++) {
                    const e0 = sc.effortCurve[i - 1], e1 = sc.effortCurve[i];
                    const r0 = sc.resultCurve[i - 1], r1 = sc.resultCurve[i];
                    ctx.fillStyle = e1 >= r1 ? "rgba(240,180,41,0.28)" : "rgba(140,165,190,0.28)";
                    ctx.beginPath();
                    ctx.moveTo(X(i - 1), Y(e0)); ctx.lineTo(X(i), Y(e1)); ctx.lineTo(X(i), Y(r1)); ctx.lineTo(X(i - 1), Y(r0));
                    ctx.closePath(); ctx.fill();
                  }
                  ctx.lineWidth = 1.5;
                  ctx.strokeStyle = "rgba(240,190,70,1)";
                  ctx.beginPath(); sc.effortCurve.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)))); ctx.stroke();
                  ctx.strokeStyle = "rgba(180,200,220,1)";
                  ctx.beginPath(); sc.resultCurve.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v)))); ctx.stroke();
                  ctx.lineWidth = 1;
                  const mid = X(Math.floor(n / 2));
                  ctx.setLineDash([3, 3]); ctx.strokeStyle = "rgba(237,230,211,0.35)";
                  ctx.beginPath(); ctx.moveTo(Math.round(mid) + 0.5, gy); ctx.lineTo(Math.round(mid) + 0.5, gy + gh); ctx.stroke();
                  ctx.setLineDash([]);
                  ctx.font = font(700, 8);
                  ctx.fillStyle = "rgba(240,190,70,1)"; ctx.fillText("EFFORT", gx + 4, gy + 8);
                  ctx.fillStyle = "rgba(180,200,220,1)"; ctx.fillText("RESULT", gx + 48, gy + 8);
                  ctx.fillStyle = DIM; ctx.fillText(`${n} BARS`, gx + gw - 40, gy + gh + 9);
                  const by = gy + gh + 18;
                  ctx.strokeStyle = HAIR; ctx.strokeRect(x0 + 40.5, by + 0.5, w - 80, 50);
                  ctx.textAlign = "center";
                  ctx.font = font(700, 8); ctx.fillStyle = GOLD;
                  ctx.fillText("RESULT PER EFFORT · RECENT HALF", x0 + w / 2, by + 10);
                  ctx.font = font(700, 15); ctx.fillStyle = CREAM;
                  ctx.fillText(sc.resultPerEffort == null ? "—" : `${sc.resultPerEffort.toFixed(2)}×`, x0 + w / 2, by + 26);
                  ctx.font = font(700, 8); ctx.fillStyle = GOLD;
                  ctx.fillText(sc.conversion ?? "NO EFFORT", x0 + w / 2, by + 42);
                  ctx.font = font(700, 8); ctx.fillStyle = DIM;
                  ctx.fillText("PURE SIGNAL. MAXIMUM DISCRETION.", x0 + w / 2, top + h - 9);
                  ctx.textAlign = "left";
                }
                ctx.restore();
              }
            }

            ctx.restore();
          } else {
            // REFUSAL IS A FIRST-CLASS RENDER. No field, no band, no implied
            // calm — just the statement that nothing was measurable, in the
            // same slot the basis would have occupied.
            ctx.save();
            const txt = BASIS_LABEL.UNMEASURED;
            ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
            const tw2 = ctx.measureText(txt).width;
            const desktopBasisChrome = W >= 960;
            if (!desktopBasisChrome) {
              ctx.fillStyle = "rgba(14,12,8,0.86)";
              ctx.fillRect(8, 8, tw2 + 12, 14);
              ctx.strokeStyle = "rgba(139,106,41,0.35)";
              ctx.lineWidth = 1;
              ctx.strokeRect(8.5, 8.5, tw2 + 11, 13);
            }
            ctx.fillStyle = "rgba(138,130,113,0.95)";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(txt, desktopBasisChrome ? 8 : 14, 15.5);
            ctx.restore();
          }
        } catch { /* chart may be mid-transition; safe to skip this frame */ }
      }

      {
        const depth = scaffoldingDepthRef.current;
        canvas.dataset.scaffolding = depth === "OFF" ? "OFF" : (scaffoldPainted ?? `${depth}:NEEDS_ABSORPTION`);
        if (depth !== "OFF" && (scaffoldPainted == null || !scaffoldPainted.includes(":CAUTION") && !scaffoldPainted.includes(":CLEAR"))) {
          // Refusal is a render: the lens reads effort, and effort is not being read.
          ctx.save();
          const txt = scaffoldPainted == null
            ? "SCAFFOLDING · READS EFFORT — SWITCH ON ABSORPTION"
            : `SCAFFOLDING · ${scaffoldPainted.split(":")[1] === "TOO_FEW_BARS" ? "TOO FEW BARS ON SCREEN" : "EFFORT NOT MEASURED"}`;
          ctx.font = "700 9px ui-sans-serif, system-ui, sans-serif";
          const tw = ctx.measureText(txt).width;
          ctx.fillStyle = "rgba(11,10,8,0.9)";
          ctx.fillRect(12, 176, tw + 16, 18);
          ctx.strokeStyle = "rgba(201,165,92,0.6)";
          ctx.strokeRect(12.5, 176.5, tw + 15, 17);
          ctx.fillStyle = "rgba(237,230,211,0.9)";
          ctx.textAlign = "left"; ctx.textBaseline = "middle";
          ctx.fillText(txt, 20, 185.5);
          ctx.restore();
        }
      }

      /* ══════════════════════════════════════════════════════════════════════
         THE WM VALUE CANDLE — FINALLY DRAWN ON A CANDLE.

         `selectValueCandle` answers the question an OHLC bar refuses to: not
         where price went, but WHERE THE TRADING ACTUALLY HAPPENED. Centre of
         gravity is Σ(P×V)/Σ(V); the value band is CoG ± one volume-weighted
         sigma. Every one of those numbers is A PRICE, and until now every one
         of them lived in a drawer. The invention is called the WM Value CANDLE
         and there was no candle.

         WHAT IS DECIDED HERE AND WHAT IS NOT. Whether to draw, the band, the
         rung list, the relative widths and the words are all settled in
         `selectValueCandleGlass`, which has tests and emits NO COLOUR FIELD.
         This block owns arithmetic and ink only.

         WHERE IT SITS, AND WHY IT DOES NOT COLLIDE. The rungs are a histogram
         at the right edge, which is exactly where the Fixed and Session VP
         columns already live. Rather than suppress one or overdraw the other,
         this takes THE NEXT COLUMN from the same `vpColumnLayout` the profiles
         use — the mechanism the file already trusts to keep two histograms
         apart. When the pane is too narrow to hold another column, the layout
         says `fits:false` and this declines out loud (`NO_ROOM`) instead of
         painting at a negative x, which is the exact failure that helper was
         extracted to end.

         IT IS DRAWN BEFORE THE STACKED IMBALANCE BAND, deliberately: the stack
         is a claim about a price RIGHT NOW and must read on top of the
         distribution that produced it.

         CONCENTRATION IS NOT TIGHTNESS, and the label refuses to let it
         pretend to be — the headline is BAND COVERAGE. That refusal is
         upstream in the compiler; it is named here so an edit to this block
         cannot quietly reintroduce the flattering number.
      ══════════════════════════════════════════════════════════════════════ */
      /* ══ H-501 · SEMANTIC DENSITY — which geometry may speak at this depth ══
         Computed ONCE per frame from the same visible-bar count the zoom
         word uses, before the first layer paints. FAR lets macro speak,
         MID the profile family, NEAR tape + candle anatomy; the other tiers
         are quieted, never deleted. UNMEASURED leaves every layer at 1.
      ══════════════════════════════════════════════════════════════════════ */
      let semanticDensity = selectSemanticDensity(null);
      try {
        const vr0 = chartRef.current?.timeScale().getVisibleLogicalRange();
        const c0 = vr0 ? Math.max(0, Math.floor(vr0.to) - Math.ceil(vr0.from) + 1) : null;
        semanticDensity = semanticDensityForBarCount(c0);
      } catch { /* no camera yet: UNMEASURED, nothing dims */ }
      // An active question quiets everything that is not its subject
      // ("SECONDARY NOISE · QUIETED"). Dims, never deletes.
      if (questionQuiet < 1) {
        semanticDensity = {
          ...semanticDensity,
          macro: semanticDensity.macro * questionQuiet,
          mid: semanticDensity.mid * questionQuiet,
          micro: semanticDensity.micro * questionQuiet,
        };
      }

      try {
        const glass = selectValueCandleGlass(valueCandleRef.current);
        const ds = canvas.dataset;
        // Published in every state, including the silent ones. An absent
        // attribute means this build has no value-candle layer; UNMEASURED
        // means the layer ran and the tape could not be read.
        //
        // OFF is its own word and must never collapse into UNMEASURED: one says
        // the trader closed this layer, the other says the tape could not speak.
        // A single receipt for both would make a switched-off chart and a broken
        // feed read identically to anyone verifying live.
        const on = layerOnRef.current.valueCandle;
        ds.valueCandle = on ? glass.reason : "OFF";

        let painted = false;
        if (on && glass.drawn && glass.cog != null) {
          const axisW = (() => {
            try {
              const w = chart.priceScale("right").width();
              if (Number.isFinite(w) && w > 0) return Math.ceil(w) + 10;
            } catch {}
            return 90;
          })();
          // The profiles already on screen own columns 0..n-1; this takes n.
          const vpCols = (fixedVPActive ? 1 : 0) + (sessionVPActive ? 1 : 0);
          const col = vpColumnLayout(W, axisW, vpCols, vpCols + 1);
          const yCogR = srs.priceToCoordinate(glass.cog);

          if (col.fits && yCogR != null && Number.isFinite(+yCogR)) {
            const right = col.right;
            const width = col.width;
            ctx.save(); ctx.globalAlpha = semanticDensity.micro;

            // ── THE RUNGS. Each bin at its own two price edges, so a shelf is
            // drawn at the price it traded at and nowhere else. Width is the
            // compiler's `widthFrac` — relative to the heaviest bin IN THIS
            // WINDOW and nothing else, because no absolute volume scale
            // survives a symbol change.
            let rungs = 0;
            for (const r of glass.rungs) {
              const yTop = srs.priceToCoordinate(r.hiPrice);
              const yBot = srs.priceToCoordinate(r.loPrice);
              if (yTop == null || yBot == null) continue;
              const rect = vpRowRect(+yTop, +yBot, 24);
              if (!rect) continue;
              const w = Math.max(1, Math.round(width * r.widthFrac));
              // Inside the measured band is brighter than outside it. Alpha,
              // not a second hue: the band is a measurement, not a verdict, so
              // it gets emphasis rather than a grade.
              ctx.fillStyle = r.inValue ? "rgba(212,175,55,0.55)" : "rgba(212,175,55,0.22)";
              ctx.fillRect(right - w, rect.y, w, rect.drawHeight);
              rungs++;
            }

            // ── THE VALUE BAND EDGES, across the rung lane only. The stacked
            // imbalance band spans the whole plot because it is a price that
            // matters now; this one is the extent of a distribution, so it
            // stays inside the distribution it describes.
            if (glass.valueLow != null && glass.valueHigh != null) {
              const yHi = srs.priceToCoordinate(glass.valueHigh);
              const yLo = srs.priceToCoordinate(glass.valueLow);
              if (yHi != null && yLo != null) {
                ctx.strokeStyle = "rgba(212,175,55,0.40)";
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(right - width, Math.round(+yHi) + 0.5);
                ctx.lineTo(right, Math.round(+yHi) + 0.5);
                ctx.moveTo(right - width, Math.round(+yLo) + 0.5);
                ctx.lineTo(right, Math.round(+yLo) + 0.5);
                ctx.stroke();
                ctx.setLineDash([]);
              }
            }

            // ── THE SPINE. Σ(P×V)/Σ(V) is the one number the whole reading is
            // built on, so it is the one mark that reaches past the lane.
            const yCog = Math.round(+yCogR) + 0.5;
            ctx.strokeStyle = "rgba(237,230,211,0.85)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(right - width - 10, yCog);
            ctx.lineTo(right, yCog);
            ctx.stroke();

            // ── THE LABEL, and the finding beneath it only when one was found.
            ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
            const lw = ctx.measureText(glass.label).width;
            const chipH = 14;
            // THE SENTENCE IS CHROME, THE SPINE IS PRICE (2026-09-24). Anchored
            // at the CoG, this chip sat on price — exactly where the Living
            // Profile's VAH/POC labels and the delta bubbles live — and on a
            // fixture tape the three printed through each other. The CoG keeps
            // its mark on price (the spine above); the words take a fixed slot
            // under INSPECT, right-aligned to the lane.
            const chipX = Math.max(2, right - (lw + 12));
            const blockH = chipH + (glass.migrationLabel ? 14 : 0);
            let chipY = 96;
            for (let guard = 0; guard < 6; guard++) {
              const hit = floatingChips.find(r =>
                chipX < r.x + r.w && chipX + lw + 12 > r.x && chipY < r.y + r.h && chipY + blockH > r.y);
              if (!hit) break;
              chipY = hit.y + hit.h + 4;
            }
            ctx.fillStyle = "rgba(14,12,8,0.92)";
            ctx.fillRect(chipX, chipY, lw + 12, chipH);
            ctx.strokeStyle = "rgba(212,175,55,0.65)";
            ctx.strokeRect(chipX + 0.5, chipY + 0.5, lw + 11, chipH - 1);
            ctx.fillStyle = "#d4af37";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(glass.label, chipX + 6, chipY + chipH / 2 + 0.5);
            if (glass.migrationLabel) {
              // Right-aligned to the chip's edge so the longer finding grows
              // leftward into the pane, never across the price axis.
              ctx.fillStyle = "rgba(237,230,211,0.80)";
              ctx.textAlign = "right";
              ctx.fillText(glass.migrationLabel, chipX + lw + 6, chipY + chipH + 8);
              ctx.textAlign = "left";
            }

            ctx.restore();

            ds.valueCandleRungs = String(rungs);
            ds.valueCandleCog = String(glass.cog);
            painted = true;
          } else if (!col.fits) {
            // The reading was good and the pane could not hold another column.
            // That is a different fact from an unreadable tape and is recorded
            // as one.
            ds.valueCandle = "NO_ROOM";
          }
        }
        if (!painted) {
          // A stale rung count keeps asserting a distribution that is no
          // longer on the screen.
          delete ds.valueCandleRungs;
          delete ds.valueCandleCog;
        }
      } catch { /* chart may be mid-transition; safe to skip this frame */ }

      /* ══════════════════════════════════════════════════════════════════════
         STACKED IMBALANCE — PUT BACK ON THE PRICE IT IS A CLAIM ABOUT.

         `selectStackedImbalance` has been a complete engine for some time, and
         until now its only readers were two DRAWER PANELS. The VM carries
         `stackLow`, `stackHigh` and a price for every level in the run, and not
         one of those numbers ever reached the glass. A panel reading "3 levels
         stacked, DEFENDED" tells the trader that something happened somewhere.
         The invention is that it happened HERE, at THESE prices, and those
         prices are already on the screen with candles drawn through them.

         Founder law, verbatim: imbalances belong "at their price levels".

         WHAT IS DECIDED HERE AND WHAT IS NOT. Everything that can be settled
         before a coordinate exists — whether to draw at all, the band extent,
         the level list, the edge style, the words — is settled in
         `selectStackedImbalanceGlass`, which has tests. This block owns
         arithmetic and ink only. That split is why the §9 rule below can be
         enforced: the compiler emits no colour field at all, so no future edit
         here can be handed a hue to grade a verdict with.

         THE VERDICT IS CARRIED BY EDGE, NOT BY HUE. DEFENDED is solid — the
         boundary held, so draw it as a boundary. BROKEN is dashed — what is on
         the screen is the memory of a wall. UNTESTED is dotted — a claim
         nobody has tested yet, so it gets the faintest edge there is. All three
         in the same gold as the rest of the evidence layer, because a level
         holding is not a reassurance and a level breaking is not a scolding.

         THE BAND SPANS THE PLOT, unlike the absorption zone above it, and that
         difference is deliberate. An absorption zone is a thing that HAPPENED
         over a span of bars; it has a start and an end in time. A stack is a
         PRICE THAT MATTERS NOW. Boxing it to the bars that built it would say
         the level expired when those bars scrolled off, which is the opposite
         of the claim being made.
      ══════════════════════════════════════════════════════════════════════ */
      try {
        const glass = selectStackedImbalanceGlass(imbalanceStackRef.current);
        const ds = canvas.dataset;
        // The receipt is published in EVERY state, including the two that draw
        // nothing. An absent attribute means "this build has no stack layer";
        // `UNMEASURED` means "the layer ran and the tape could not be read".
        // Collapsing those is how a silent regression passes for a quiet tape.
        // `OFF` is a third distinct word for the third distinct fact: the
        // trader switched this layer off. It is not a failure to measure.
        const on = layerOnRef.current.stack;
        ds.imbalanceStack = on ? glass.reason : "OFF";

        if (on && glass.drawn && glass.priceLow != null && glass.priceHigh != null) {
          const yHiR = srs.priceToCoordinate(glass.priceHigh);
          const yLoR = srs.priceToCoordinate(glass.priceLow);
          if (yHiR != null && yLoR != null) {
            const yHi = Math.min(+yHiR, +yLoR);
            const yLo = Math.max(+yHiR, +yLoR);

            // The right price scale is painted OVER this overlay, so the edge
            // that actually clips is the plot's, not the container's — the same
            // lesson the absorption chip block records after shipping a clamp
            // that was arithmetically correct against the wrong boundary. The
            // axis width is queried, never guessed: 29,731.00 is wider than
            // 12.40.
            const axisW = (() => {
              try {
                const w = chart.priceScale("right").width();
                if (Number.isFinite(w) && w > 0) return Math.ceil(w);
              } catch {}
              return 90;
            })();
            const plotRight = Math.max(8, W - axisW);

            ctx.save(); ctx.globalAlpha = semanticDensity.micro;

            // A band one tick tall is a line, and a line drawn as a 1px-high
            // rectangle disappears at some device pixel ratios. Floor the drawn
            // height without moving the edges: the strokes below still land on
            // the true prices.
            const bandH = Math.max(1, yLo - yHi);
            ctx.fillStyle = "rgba(212,175,55,0.07)";
            ctx.fillRect(0, yHi, plotRight, bandH);

            const DASH: Record<typeof glass.edgeStyle, number[]> = {
              SOLID: [],
              DASHED: [5, 4],
              DOTTED: [1, 3],
            };
            ctx.setLineDash(DASH[glass.edgeStyle]);
            ctx.strokeStyle = "rgba(212,175,55,0.70)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, yHi + 0.5); ctx.lineTo(plotRight, yHi + 0.5);
            ctx.moveTo(0, yLo - 0.5); ctx.lineTo(plotRight, yLo - 0.5);
            ctx.stroke();

            // ── EVERY LEVEL IN THE RUN, AT ITS OWN PRICE.
            //
            // The band alone would say "somewhere between these two prices".
            // The word STACKED means a RUN OF ADJACENT LEVELS all leaning the
            // same way, and that run is only perceivable if the individual
            // levels are. Drawn short and at the left so they read as rungs
            // inside the band rather than as three more support lines
            // competing with it.
            ctx.setLineDash([]);
            ctx.strokeStyle = "rgba(212,175,55,0.45)";
            for (const lvl of glass.levels) {
              const yr = srs.priceToCoordinate(lvl.price);
              if (yr == null) continue;
              const y = Math.round(+yr) + 0.5;
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(Math.min(plotRight, 56), y);
              ctx.stroke();
            }

            // ── THE RETEST MARK — the difference between a level that held
            // comfortably and one that nearly went. Both are the word
            // DEFENDED, and they are not the same information. Drawn at the
            // right so it does not sit on top of the rungs.
            if (glass.retestPrice != null) {
              const rr = srs.priceToCoordinate(glass.retestPrice);
              if (rr != null) {
                const ry = Math.round(+rr) + 0.5;
                ctx.strokeStyle = "rgba(237,230,211,0.65)";
                ctx.beginPath();
                ctx.moveTo(Math.max(0, plotRight - 40), ry);
                ctx.lineTo(plotRight, ry);
                ctx.stroke();
              }
            }

            // ── THE LABEL. A whole sentence, because the glass has no
            // footnotes: the role the level plays, the verdict, how many
            // levels, and — when the venue did not assert the aggressor side —
            // the disclosure that every number here is downstream of a tick
            // rule. A drawer can put that in fine print. A chart cannot.
            ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
            const lw = ctx.measureText(glass.label).width;
            const chipH = 14;
            const chipW = lw + 12;
            const chipX = 2;
            // Above the band by preference; below it when the band is already
            // near the top of the pane, so the chip is never pushed off-plot.
            const chipY = yHi - chipH - 2 >= 2 ? yHi - chipH - 2 : Math.min(H - chipH - 2, yLo + 2);
            ctx.fillStyle = "rgba(14,12,8,0.92)";
            ctx.fillRect(chipX, chipY, chipW, chipH);
            ctx.strokeStyle = "rgba(212,175,55,0.65)";
            ctx.lineWidth = 1;
            ctx.strokeRect(chipX + 0.5, chipY + 0.5, chipW - 1, chipH - 1);
            ctx.fillStyle = "#d4af37";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(glass.label, chipX + 6, chipY + chipH / 2 + 0.5);

            ctx.restore();

            ds.imbalanceStackLevels = String(glass.levels.length);
            ds.imbalanceStackEdge = glass.edgeStyle;
          }
        } else {
          // Nothing is drawn, so nothing is claimed — and the two receipt
          // fields that describe a drawing are removed rather than left at
          // their last value, which would keep asserting a band that is no
          // longer on the screen.
          delete ds.imbalanceStackLevels;
          delete ds.imbalanceStackEdge;
        }
      } catch { /* chart may be mid-transition; safe to skip this frame */ }

      /* ══════════════════════════════════════════════════════════════════════
         DELTA DIVERGENCE — THE TWO PRICES IT COMPARED, AT THOSE PRICES.

         `selectDeltaDivergence` is the most careful engine in this family: it
         finds pivots by a written fractal rule, requires the swing to clear the
         window's own volume-weighted spread, and requires the delta to have
         actually moved before it will use the word. All of that care shipped to
         two drawer panels. `priorPivot.price` and `recentPivot.price` are
         PRICES, and the trader was being asked to take on faith that they meant
         the levels already on the screen.

         WHAT IS NOT DRAWN HERE, AND WHY IT IS THE POINT.

         The VM carries a `segments` array with a cumulative delta on every
         segment — a beautiful line, and a forgery. Delta is counted in
         CONTRACTS; this axis is denominated in DOLLARS. Drawing one against the
         other requires a scale the house invented, and once two lines share a
         frame, a trader reads their crossing as an event. There is no crossing.
         `selectDeltaDivergenceGlass` therefore emits no segment path at all, so
         no edit here can be handed one.

         AND THE MARKS DO NOT CLAIM A MOMENT. The pivots are indexed by SEGMENT
         — equal-count slices of the tape — not by timestamp. There is no honest
         x. So the two prices are drawn as marks in a LANE, never at a bar, and
         the compiler's `timeKnown` is asserted false before anything is placed;
         the day the engine carries timestamps, that flag is the hinge.
      ══════════════════════════════════════════════════════════════════════ */
      try {
        const glass = selectDeltaDivergenceGlass(deltaDivergenceRef.current);
        const ds = canvas.dataset;
        // Published in every state. NO_SWING is not UNMEASURED: one says the
        // window held no two comparable points, the other that there was not
        // enough tape to look. Collapsing them hides which.
        // And OFF is neither: the trader closed this layer, the tape did not
        // fail to speak. Three distinct silences, three distinct receipts.
        const on = layerOnRef.current.divergence;
        ds.deltaDivergence = on ? glass.reason : "OFF";

        let painted = false;
        if (on && glass.drawn && glass.priorPrice != null && glass.recentPrice != null && !glass.timeKnown) {
          const yPriorR = srs.priceToCoordinate(glass.priorPrice);
          const yRecentR = srs.priceToCoordinate(glass.recentPrice);
          if (yPriorR != null && yRecentR != null) {
            const yPrior = Math.round(+yPriorR) + 0.5;
            const yRecent = Math.round(+yRecentR) + 0.5;

            // The lane. Sits to the RIGHT of the stacked-imbalance rungs (which
            // own 0..56) so two price-anchored marks never sit on top of each
            // other and get read as one.
            const laneL = 64;
            const laneR = 150;

            ctx.save(); ctx.globalAlpha = semanticDensity.micro;
            ctx.strokeStyle = "rgba(237,230,211,0.55)";
            ctx.lineWidth = 1;
            // Two marks, one per compared pivot, each at its own price.
            ctx.beginPath();
            ctx.moveTo(laneL, yPrior); ctx.lineTo(laneL + 22, yPrior);
            ctx.moveTo(laneR - 22, yRecent); ctx.lineTo(laneR, yRecent);
            ctx.stroke();

            // The connector says price went FROM here TO here. It is drawn
            // left-to-right because the later pivot is later, and that is the
            // ONLY thing its horizontal extent means — the lane is 86px wide on
            // every symbol and every timeframe, which is exactly how a reader
            // can tell it is not a time axis.
            ctx.setLineDash(glass.diverged ? [4, 3] : []);
            ctx.strokeStyle = "rgba(212,175,55,0.65)";
            ctx.beginPath();
            ctx.moveTo(laneL + 22, yPrior);
            ctx.lineTo(laneR - 22, yRecent);
            ctx.stroke();
            ctx.setLineDash([]);

            // ── THE WORDS. The headline always; the engine's own sentence only
            // when it found something; the aggressor-side disclosure whenever
            // the venue did not assert the sides, because a chart has no fine
            // print and cumulative delta is a claim about who initiated.
            ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            const topY = Math.min(yPrior, yRecent);
            let ty = topY - 8 >= 10 ? topY - 8 : Math.min(H - 10, Math.max(yPrior, yRecent) + 12);
            ctx.fillStyle = "#d4af37";
            ctx.fillText(glass.label, laneL, ty);
            if (glass.findingLabel) {
              ty += 11;
              ctx.fillStyle = "rgba(237,230,211,0.80)";
              ctx.fillText(glass.findingLabel, laneL, ty);
            }
            if (glass.disclosure) {
              ty += 11;
              ctx.fillStyle = "rgba(237,230,211,0.55)";
              ctx.fillText(glass.disclosure, laneL, ty);
            }
            ctx.restore();

            ds.deltaDivergenceLean = glass.lean;
            painted = true;
          }
        }
        if (!painted) {
          // A stale lean keeps asserting a swing that is no longer on screen.
          delete ds.deltaDivergenceLean;
        }
      } catch { /* chart may be mid-transition; safe to skip this frame */ }

      /* ══════════════════════════════════════════════════════════════════════
         LIQUIDITY WEATHER — AND THE ADMISSION THAT MOST OF IT HAS NO PRICE.

         The other three readings above were prices trapped in a drawer, and the
         repair was to put them back on the axis. This one is not, and treating
         it the same way would be the more expensive mistake.

         Liquidity weather measures COST — size required to move price one unit
         of the window's own spread — and whether that cost is rising. A cost
         has no level. THINNING is true of the window, not of $431.40, and a
         THINNING band drawn at any price would invent a location for a finding
         that has none. So the stage and its statistics are painted as WORDS in
         the chrome, and `selectLiquidityWeatherGlass` deliberately emits no
         field a renderer here could mistake for a coordinate.

         THE ONE EXCEPTION IS THE BEST PART OF THE READING. A STALLED SEGMENT IS
         A PRICE: every print in it landed at the same number, so size went in
         and the market did not move. That is a shelf, it is a level, and it is
         exactly the perceivable market geometry the Founder asks for. Those get
         the axis. Nothing else does.
      ══════════════════════════════════════════════════════════════════════ */
      try {
        const glass = selectLiquidityWeatherGlass(liquidityWeatherRef.current);
        const ds = canvas.dataset;
        // OFF is not UNMEASURED. The tape answered; the trader closed the
        // layer. A receipt that conflated the two would make a switched-off
        // layer indistinguishable from a feed that cannot speak.
        const on = layerOnRef.current.weather;
        ds.liquidityWeather = on ? glass.reason : "OFF";

        if (on && glass.drawn) {
          ctx.save(); ctx.globalAlpha = semanticDensity.micro;

          // ── THE SHELVES, at their prices. Drawn as a short dotted mark so a
          // level where nothing moved does not read as a support line somebody
          // is defending — it is an observation, not a claim about intent.
          let shelves = 0;
          ctx.setLineDash([1, 3]);
          ctx.strokeStyle = "rgba(237,230,211,0.50)";
          ctx.lineWidth = 1;
          for (const p of glass.stallPrices) {
            const yr = srs.priceToCoordinate(p);
            if (yr == null) continue;
            const y = Math.round(+yr) + 0.5;
            ctx.beginPath();
            ctx.moveTo(158, y);
            ctx.lineTo(238, y);
            ctx.stroke();
            shelves++;
          }
          ctx.setLineDash([]);

          // ── THE WORDS, in the chrome and nowhere near a price. Bottom-left of
          // the plot, which the price-anchored layers above do not use.
          ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
          ctx.textAlign = "left";
          ctx.textBaseline = "bottom";
          let wy = Math.max(20, H - 6);
          if (glass.stallLabel && shelves > 0) {
            ctx.fillStyle = "rgba(237,230,211,0.65)";
            ctx.fillText(glass.stallLabel, 8, wy);
            wy -= 11;
          }
          ctx.fillStyle = "rgba(237,230,211,0.75)";
          ctx.fillText(glass.detail, 8, wy);
          wy -= 11;
          ctx.fillStyle = "#d4af37";
          ctx.fillText(glass.label, 8, wy);
          ctx.restore();

          ds.liquidityWeatherStage = glass.stage;
          if (shelves > 0) ds.liquidityWeatherShelves = String(shelves);
          else delete ds.liquidityWeatherShelves;
        } else {
          // A stale stage keeps describing weather that is no longer measured.
          delete ds.liquidityWeatherStage;
          delete ds.liquidityWeatherShelves;
        }

        /* ══ H-701 · EFFORT→RESPONSE BAR MARK ═══════════════════════════════
           F06's reading, put back on the candle it is about.

           Everything difficult here was already decided by `selectEffortMark`,
           which is the point: this block may not grade, may not choose a side,
           and may not invent a price. It receives a time and a price the BAR
           ITSELF REACHED, or it receives a refusal with a reason.

           WHAT IT MUST NOT DO, spelled out because both are one line away:
             · map `effortRatio` or `resultRatio` onto the price axis. A ratio
               has no price. The verdict carries neither, so there is nothing
               here to map.
             · choose a hue from the shape. §9 — SPENT·DIDN'T MOVE is where a
               reversal starts and also where a trend rests, and the house
               grades neither. One ivory, both corners.
        ═══════════════════════════════════════════════════════════════════ */
        {
          const ev = effortMarkRef.current;
          // The receipt is published in EVERY state. A layer that goes quiet
          // without saying why is indistinguishable from a layer that broke.
          // OFF is not NO_READING. The bar answered; the trader closed the
          // layer. A receipt that conflated the two would make a switched-off
          // mark indistinguishable from a bar nobody could weigh — which is
          // this product's cardinal defect wearing a dataset attribute.
          const on = layerOnRef.current.effort;
          ds.effortMark = on ? (ev ? ev.reason : "NO_READING") : "OFF";

          if (on && ev?.drawn) {
            const m = ev.mark;
            const xr = chart.timeScale().timeToCoordinate(m.time as any);
            const yr = srs.priceToCoordinate(m.price);
            if (xr != null && yr != null) {
              const x = Math.round(+xr) + 0.5;
              const y = Math.round(+yr) + 0.5;
              // Outside the extreme, so the description never covers the
              // candle it describes.
              const out = m.side === "ABOVE" ? -1 : 1;
              ctx.save(); ctx.globalAlpha = semanticDensity.micro;
              ctx.strokeStyle = "rgba(237,230,211,0.85)";
              ctx.fillStyle = "rgba(237,230,211,0.85)";
              ctx.lineWidth = 1;

              // A short stem off the bar's own extreme. Not an arrow: an arrow
              // points somewhere, and this reading refuses to say where.
              ctx.beginPath();
              ctx.moveTo(x, y + out * 3);
              ctx.lineTo(x, y + out * 13);
              ctx.stroke();

              // A hollow cap. FILL is reserved elsewhere in this house for
              // "answered"; nothing about this bar is answered.
              ctx.beginPath();
              ctx.arc(x, y + out * 16, 2.5, 0, Math.PI * 2);
              ctx.stroke();

              ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
              ctx.textAlign = "center";
              ctx.textBaseline = m.side === "ABOVE" ? "bottom" : "top";
              ctx.fillText(m.label, x, y + out * 21);
              ctx.restore();

              ds.effortMarkSide = m.side;
            } else {
              // Scrolled out of the visible range. The reading still stands;
              // it simply has nowhere on this screen to stand. Saying DRAWN
              // here would claim paint nobody can see.
              ds.effortMark = "OFFSCREEN";
              delete ds.effortMarkSide;
            }
          } else {
            delete ds.effortMarkSide;
          }
        }

        /* ══ H-702 · DELTA LEVELS ON GLASS ═══════════════════════════════════
           `selectDeltaLevelsGlass` has already refused (or not) and named
           reasons this file may not invent. The rules it enforces upstream:

             · NO measured grid → nothing here paints at a level.
             · A rung is the compiler's price, unchanged. Nothing here maps a
               ratio, a volume, a weight, or a delta onto `priceToCoordinate`.
             · SIDE is a semantic field, not a hue. §9: delta is which side
               crossed the spread, not where price went — colouring buy delta
               green would borrow the candles' meaning.

           A lane grows RIGHT for BUY, LEFT for SELL, from a hairline centre
           at a fixed inset from the price scale. Same ink for both.
        ═══════════════════════════════════════════════════════════════════ */
        {
          const dl = deltaLevelsRef.current;
          const on = layerOnRef.current.deltaLevels;
          ds.deltaLevels = on ? (dl ? dl.reason : "NO_READING") : "OFF";

          if (on && dl?.drawn) {
            ctx.save(); ctx.globalAlpha = semanticDensity.micro;
            const centerX = W - 96; // Fixed chrome, outside the candle body area.
            const laneMax = 40;
            let drawnRungs = 0;
            for (const r of dl.rungs) {
              const yr = srs.priceToCoordinate(r.price);
              if (yr == null) continue;
              const y = Math.round(+yr) + 0.5;
              const len = Math.max(2, Math.round(r.weight * laneMax));
              ctx.strokeStyle = "rgba(237,230,211,0.75)";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(centerX, y);
              ctx.lineTo(r.side === "BUY" ? centerX + len : centerX - len, y);
              ctx.stroke();
              drawnRungs++;
            }
            // Hairline centre so the trader can see the axis the lanes grow
            // from, even when only one side has rungs on screen.
            ctx.strokeStyle = "rgba(139,106,41,0.35)";
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 3]);
            ctx.beginPath();
            ctx.moveTo(centerX + 0.5, 8);
            ctx.lineTo(centerX + 0.5, H - 8);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
            if (drawnRungs > 0) ds.deltaLevelsRungs = String(drawnRungs);
            else delete ds.deltaLevelsRungs;
          } else {
            delete ds.deltaLevelsRungs;
          }
        }

        /* ══ H-901 · REGIME LIGHTING — which geometry may speak ═════════════
           One breaker, read from the regime owner. Every profile fixture
           below multiplies its own alpha by its class's light: MAGNETS
           (Living, TPO, Composite, Visible Range, Memory, Fusion) or TREND
           (Structure leg, Value Migration, swing marks). Switched off, or
           UNKNOWN, every light stays at 1. The breaker is named on the glass.
        ═══════════════════════════════════════════════════════════════════ */
        const lightOn = layerOnRef.current.regimeLighting === true;
        const regimeLight = lightOn ? regimeLightingRef.current : null;
        const magnetLight = regimeLight?.magnets ?? 1;
        const trendLight = regimeLight?.trend ?? 1;
        ds.regimeLighting = lightOn ? (regimeLight?.breaker ?? "NO_BREAKER") : "OFF";
        ds.regimeLightingVerdict = regimeLight?.verdict ?? "";
        if (lightOn && regimeLight) {
          // THE PLATE'S BREAKER PANEL — three breakers, only one ON. UNKNOWN
          // leaves all three OFF and says so; nothing is switched by guess.
          ctx.save();
          const BRK: { id: "TREND" | "RANGE" | "TRANSITION"; note: string }[] = [
            { id: "TREND", note: "mean-reversion magnets dim" },
            { id: "RANGE", note: "trend fixtures capped" },
            { id: "TRANSITION", note: "all fixtures dimmed" },
          ];
          const bw = 138, gap = 6, ph = 62;
          const pw = bw * 3 + gap * 2 + 16;
          const x0 = Math.round(W / 2 - pw / 2);
          const y0 = 100;
          ctx.fillStyle = "rgba(11,10,8,0.9)";
          ctx.fillRect(x0, y0, pw, ph + 32);
          ctx.strokeStyle = "rgba(201,165,92,0.55)"; ctx.lineWidth = 1;
          ctx.strokeRect(x0 + 0.5, y0 + 0.5, pw - 1, ph + 31);
          ctx.textAlign = "left"; ctx.textBaseline = "middle";
          ctx.font = "800 9px ui-sans-serif, system-ui, sans-serif";
          ctx.fillStyle = "rgba(237,230,211,0.95)";
          ctx.fillText("REGIME CIRCUIT BREAKERS · ONLY ONE ON", x0 + 8, y0 + 11);
          BRK.forEach((b, i) => {
            const on = regimeLight.breaker === b.id;
            const bx = x0 + 8 + i * (bw + gap), by = y0 + 20;
            ctx.strokeStyle = on ? "rgba(240,190,70,1)" : "rgba(139,143,168,0.45)";
            ctx.lineWidth = on ? 1.5 : 1;
            ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, ph - 22);
            ctx.lineWidth = 1;
            ctx.font = "800 10px ui-sans-serif, system-ui, sans-serif";
            ctx.fillStyle = on ? "rgba(240,190,70,1)" : "rgba(200,204,218,0.75)";
            ctx.fillText(b.id, bx + 7, by + 11);
            ctx.font = "500 8px ui-sans-serif, system-ui, sans-serif";
            ctx.fillStyle = "rgba(200,192,174,0.8)";
            ctx.fillText(b.note, bx + 7, by + 24);
            // Status tab: ON filled, OFF hollow.
            const sx = bx + bw - 30, sy = by + 5;
            if (on) { ctx.fillStyle = "rgba(240,190,70,1)"; ctx.fillRect(sx, sy, 24, 12); }
            else { ctx.strokeStyle = "rgba(139,143,168,0.6)"; ctx.strokeRect(sx + 0.5, sy + 0.5, 23, 11); }
            ctx.font = "800 7.5px ui-sans-serif, system-ui, sans-serif";
            ctx.textAlign = "center";
            ctx.fillStyle = on ? "rgba(11,10,8,1)" : "rgba(200,204,218,0.75)";
            ctx.fillText(on ? "ON" : "OFF", sx + 12, sy + 6.5);
            ctx.textAlign = "left";
          });
          ctx.font = "700 8.5px ui-sans-serif, system-ui, sans-serif";
          ctx.fillStyle = regimeLight.breaker ? "rgba(201,165,92,1)" : "rgba(200,204,218,0.9)";
          ctx.fillText(regimeLight.chip, x0 + 8, y0 + ph + 20);
          ctx.restore();
        }

        /* ══ PROFILE STACK PLAN — one owner for every right-edge lane ═══════
           Asked ONCE per frame: which species will draw (Living, Composite,
           Visible Range) after the fixed lanes this plan does not own (VP
           columns, Value Candle), and where each lane, the stack's left edge
           and the one shared label column sit. `planProfileStack` is pure and
           tested: no two lanes can share a column.
        ═══════════════════════════════════════════════════════════════════ */
        const stackAxisW = (() => {
          try {
            const w = chart.priceScale("right").width();
            if (Number.isFinite(w) && w > 0) return Math.ceil(w) + 10;
          } catch {}
          return 90;
        })();
        // P-110 #7 · VISIBLE RANGE — computed only when switched on, and only
        // when the camera's time range or the newest bar changed.
        const vrpOn = layerOnRef.current.visibleRangeProfile === true;
        let vrpVM: VisibleRangeProfileVM | null = null;
        if (vrpOn) {
          let from: number | null = null;
          let to: number | null = null;
          try {
            const vr = chart.timeScale().getVisibleRange();
            if (vr) { from = Number(vr.from); to = Number(vr.to); }
          } catch {}
          const bs = barsRef.current;
          const last = bs[bs.length - 1];
          const key = `${from}|${to}|${bs.length}|${last?.time ?? ""}|${last?.volume ?? ""}|${last?.close ?? ""}`;
          if (vrpCacheRef.current?.key === key) vrpVM = vrpCacheRef.current.vm;
          else {
            vrpVM = selectVisibleRangeProfile(bs, from, to);
            vrpCacheRef.current = { key, vm: vrpVM };
          }
        }
        ds.visibleRangeProfile = vrpOn ? (vrpVM?.reason ?? "NO_READING") : "OFF";
        const stackOrder: StackSpecies[] = [];
        if (layerOnRef.current.livingProfile && livingProfileRef.current?.drawn) stackOrder.push("LIVING");
        if (layerOnRef.current.compositeProfile && compositeProfileRef.current?.drawn) stackOrder.push("COMPOSITE");
        if (vrpOn && vrpVM?.drawn) stackOrder.push("VISIBLE_RANGE");
        const stackPlan = planProfileStack({
          canvasWidth: W,
          axisWidth: stackAxisW,
          fixedLanes: (fixedVPActive ? 1 : 0) + (sessionVPActive ? 1 : 0) + (ds.valueCandleRungs ? 1 : 0),
          order: stackOrder,
        });
        if (stackOrder.length > 0) ds.profileStackLeft = String(stackPlan.stackLeft);
        else delete ds.profileStackLeft;
        ds.profileStackLanes = stackOrder.join(",");
        // The ONE label column. A label that would land on another steps down
        // a line, so agreeing levels (LIVING POC / CMP POC) never overprint.
        const stackLabelYs: number[] = [];
        const stackLabel = (y: number, text: string, ink: string) => {
          // Step AWAY from the label it collides with, toward its own side:
          // always stepping down printed a higher VAH beneath the POC, which
          // inverts the price order the column exists to show.
          let yy = y;
          for (let guard = 0; guard < 8; guard++) {
            const hit = stackLabelYs.find(t => Math.abs(t - yy) < 11);
            if (hit == null) break;
            yy = y < hit ? hit - 11 : hit + 11;
          }
          stackLabelYs.push(yy);
          ctx.save();
          ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
          ctx.textAlign = "right";
          ctx.textBaseline = "middle";
          ctx.fillStyle = ink;
          ctx.fillText(text, stackPlan.labelRight, yy);
          ctx.restore();
        };

        /* ══ H-703 · LIVING PROFILE — THE HISTOGRAM ON THE CANVAS ══════════
           P-110's blueprint. The trader looks for a horizontal profile at the
           right side of the market canvas; every mockup that includes a
           profile paints one this way (TSLA_Volume_Profile_Full,
           F09_Living_Profile_Passport_Doorway, Sanctuary profile-source-tick).
           This block IS that histogram, not a chip about it.

           Compiler-owned rules this file may not decide:

             · NO measured profile → nothing paints. Silence is named.
             · A BAR IS A PRICE and a NORMALISED WIDTH. `share` is already
               against the heaviest bucket, so nothing here re-normalises.
             · AN UNTRADED BUCKET IS NOT DRAWN. A bar of any length at a
               price that took no volume reads as "size traded here."

           Placement rides on the RIGHT edge of the pane, inset from the
           price scale, so the candles keep the frame (§B5). The value area
           gets a soft ivory backdrop so the compiler's boundaries read as a
           BAND, not two hairlines. POC gets brass — house hardware, not a
           market direction. HVN/LVN dots overlay as annotation on top.
        ═══════════════════════════════════════════════════════════════════ */
        {
          const lp = livingProfileRef.current;
          const on = layerOnRef.current.livingProfile;
          ds.livingProfile = on ? (lp ? lp.reason : "NO_READING") : "OFF";

          if (on && lp?.drawn) {
            ctx.save(); ctx.globalAlpha = magnetLight * semanticDensity.mid;
            /*
              GEOMETRY. The histogram lives at the right of the pane, inset
              from the price gutter so the axis labels stay legible. Bars
              grow LEFT from `rightEdge`, and `histMax` caps how far into the
              candles they can reach — a profile that eats the whole canvas
              is not a profile, it is wallpaper.
            */
            /*
              PROFILE STACK · AUTO ARRANGE. Right-edge profiles share ONE lane
              system (vpColumnLayout): legacy Fixed/Session VP own lanes
              0..n-1, the Value Candle takes the next when it painted this
              frame, and the Living Profile takes the lane after that. Alone,
              it keeps its full solo geometry. Two histograms in one column
              read as one wrong shape — the Founder saw exactly that.
            */
            const livingLane = stackPlan.lanes.LIVING ?? soloLane(W);
            const rightEdge = livingLane.right;
            const histMax = livingLane.width;
            const stacked = stackPlan.stacked;
            ds.livingProfileLane = String(stackOrder.indexOf("LIVING"));
            ds.livingProfileLaneLeft = String(Math.round(rightEdge - histMax));
            ds.livingProfileLaneRight = String(Math.round(rightEdge));

            /*
              VALUE-AREA BAND — across the entire pane, not just the histogram.
              §B5 said no full-width paint that eats candles; this obeys it
              by keeping alpha at 4% ivory, faint enough that candles read
              through unchanged and yet visible enough that "inside value"
              vs "outside value" is a glance. Two horizontal hairlines at
              VAH and VAL give the band real edges without hue.
            */
            if (lp.vah != null && lp.val != null) {
              const yh = srs.priceToCoordinate(lp.vah);
              const yl = srs.priceToCoordinate(lp.val);
              if (yh != null && yl != null) {
                const top = Math.min(+yh, +yl);
                const bot = Math.max(+yh, +yl);
                const band = Math.max(1, bot - top);
                ctx.fillStyle = "rgba(237,230,211,0.04)";
                ctx.fillRect(0, top, W, band);
                // Denser fill only inside the histogram column so the two
                // meanings — value area, and where the histogram itself
                // sits — read together instead of one washing out the other.
                ctx.fillStyle = "rgba(237,230,211,0.06)";
                ctx.fillRect(rightEdge - histMax - 4, top, histMax + 8, band);
                // Hairlines at VAH/VAL across the pane so the boundaries
                // register even where the fill is faint.
                ctx.strokeStyle = "rgba(194,184,146,0.35)";
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 4]);
                ctx.beginPath();
                ctx.moveTo(0, +yh + 0.5); ctx.lineTo(W, +yh + 0.5);
                ctx.moveTo(0, +yl + 0.5); ctx.lineTo(W, +yl + 0.5);
                ctx.stroke();
                ctx.setLineDash([]);
              }
            }

            /*
              THE HISTOGRAM. One horizontal bar per bucket the compiler
              published. Bucket height comes from the vertical distance
              between successive bucket prices on screen — clamped at 1px so
              a chart zoomed all the way out still paints a shape rather
              than a line.
            */
            let drawnBars = 0;
            const barYs: number[] = [];
            for (const b of lp.bars) {
              const yr = srs.priceToCoordinate(b.price);
              if (yr == null) continue;
              barYs.push(+yr);
            }
            // Height per row is half the median inter-row spacing, so bars
            // grow to nearly touching without overlapping. A single-row
            // profile gets a floor of 2px.
            let rowH = 2;
            if (barYs.length >= 2) {
              const sorted = [...barYs].sort((a, b) => a - b);
              const gaps: number[] = [];
              for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i - 1]);
              const g = gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)] || 2;
              rowH = Math.max(2, Math.min(10, Math.round(g)));
            }

            for (const b of lp.bars) {
              const yr = srs.priceToCoordinate(b.price);
              if (yr == null) continue;
              const y = Math.round(+yr) - Math.floor(rowH / 2);
              const width = Math.max(1, Math.round(b.share * histMax));
              // POC gets the strongest ink, plus a full-width brass strip so
              // the trader can see it without hunting. Value area gets ivory.
              // Outside-value buckets get muted parchment — same reading,
              // less loud.
              ctx.fillStyle = b.isPoc
                ? "rgba(201,165,92,0.90)"
                : b.insideValueArea
                  ? "rgba(237,230,211,0.72)"
                  : "rgba(194,184,146,0.42)";
              ctx.fillRect(rightEdge - width, y, width, Math.max(1, rowH - 1));
              // The slice Inspect is reading, outlined so the ticket and the
              // glass visibly agree on WHICH bucket is selected.
              if (selectedSliceRef.current != null && Math.abs(b.price - selectedSliceRef.current) < 1e-9) {
                ctx.strokeStyle = "rgba(201,165,92,1)";
                ctx.lineWidth = 1.5;
                ctx.strokeRect(rightEdge - histMax - 2.5, y - 1.5, histMax + 5, Math.max(1, rowH - 1) + 3);
                ds.livingProfileSelected = String(b.price);
              }
              drawnBars++;
            }

            /*
              POC · VAH · VAL — three reference lines the compiler already
              chose. Cross the whole width the histogram occupies so they
              read as levels the profile itself carries, not as separate
              annotations. POC gets brass; VAH/VAL share a weaker ivory
              because value-area BOUNDARIES are not sides — a trader who
              trades against VAH tomorrow was trading with it yesterday, and
              a colour that spent one meaning on the first is lying to them
              on the second.
            */
            const drawRef = (
              price: number | null | undefined,
              ink: string,
              dashed: boolean,
            ) => {
              if (price == null) return;
              const yr = srs.priceToCoordinate(price);
              if (yr == null) return;
              const y = Math.round(+yr) + 0.5;
              ctx.strokeStyle = ink;
              ctx.lineWidth = 1;
              ctx.setLineDash(dashed ? [3, 4] : []);
              ctx.beginPath();
              ctx.moveTo(rightEdge - histMax - 4, y);
              ctx.lineTo(rightEdge + 2, y);
              ctx.stroke();
            };
            drawRef(lp.poc, "rgba(201,165,92,0.90)", false);
            drawRef(lp.vah, "rgba(194,184,146,0.55)", true);
            drawRef(lp.val, "rgba(194,184,146,0.55)", true);
            ctx.setLineDash([]);

            /*
              HVN / LVN as annotation on the histogram. Not a replacement for
              the profile — a mark that names the strongest few bars so a
              trader who is skimming can find them at a glance. Fill/weight
              tells them apart: HVN filled brass dot (size present), LVN
              hollow ivory ring (size absent).
            */
            let drawnMarks = 0;
            for (const m of lp.marks) {
              const yr = srs.priceToCoordinate(m.price);
              if (yr == null) continue;
              const y = Math.round(+yr) + 0.5;
              const cx = rightEdge - Math.max(3, Math.round(m.weight * histMax)) - 6;
              ctx.beginPath();
              ctx.arc(cx, y, 2.2, 0, Math.PI * 2);
              if (m.kind === "HVN") {
                ctx.fillStyle = "rgba(201,165,92,0.90)";
                ctx.fill();
              } else {
                ctx.strokeStyle = "rgba(237,230,211,0.75)";
                ctx.lineWidth = 1;
                ctx.stroke();
              }
              drawnMarks++;
            }

            /*
              PRICE LABELS on POC · VAH · VAL, right of the histogram, so the
              trader can quote the levels without reading them off the axis.
              Small type, brass on POC and muted ivory on the boundaries.
            */
            ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            const label = (
              price: number | null | undefined,
              text: string,
              ink: string,
            ) => {
              if (price == null) return;
              const yr = srs.priceToCoordinate(price);
              if (yr == null) return;
              ctx.fillStyle = ink;
              // Stacked: the lane to the right belongs to another profile, so
              // the labels sit on the LEFT of this histogram instead.
              if (stacked) {
                // Stacked: labels go to the ONE column left of the whole stack.
                stackLabel(+yr, text, ink);
              } else {
                ctx.fillText(text, rightEdge + 4, +yr);
              }
            };
            const tag = stacked ? "LIVING " : "";
            if (lp.poc != null) label(lp.poc, `${tag}POC ${lp.poc.toFixed(2)}`, "rgba(201,165,92,0.95)");
            if (lp.vah != null) label(lp.vah, `${tag}VAH ${lp.vah.toFixed(2)}`, "rgba(194,184,146,0.80)");
            if (lp.val != null) label(lp.val, `${tag}VAL ${lp.val.toFixed(2)}`, "rgba(194,184,146,0.80)");

            /*
              FIDELITY ON THE GLASS. A candle-estimated profile is a lawful
              reading of bar volume, and it says so where the trader is
              looking — under the histogram — along with the one claim it
              withholds. Muted ivory: an honesty note, not an alarm.
            */
            if (lp.estimated || lp.nodesWithheld) {
              const anchor = lp.val ?? lp.poc;
              const ya = anchor != null ? srs.priceToCoordinate(anchor) : null;
              if (ya != null) {
                ctx.font = "600 8px ui-sans-serif, system-ui, sans-serif";
                ctx.textAlign = "right";
                ctx.fillStyle = "rgba(194,184,146,0.70)";
                const words = [lp.estimated ? "CANDLE-ESTIMATED" : null, lp.nodesWithheld ? "NODES WITHHELD" : null]
                  .filter(Boolean).join(" · ");
                ctx.fillText(words, rightEdge, +ya + 14);
                ctx.textAlign = "left";
              }
            }

            ctx.restore();
            if (drawnBars > 0) ds.livingProfileBars = String(drawnBars);
            else delete ds.livingProfileBars;
            if (drawnMarks > 0) ds.livingProfileMarks = String(drawnMarks);
            else delete ds.livingProfileMarks;
            if (lp.untradedCount > 0) ds.livingProfileUntraded = String(lp.untradedCount);
            else delete ds.livingProfileUntraded;
            ds.livingProfileFidelity = lp.estimated ? "CANDLE_ESTIMATED" : "TRADE_BASED";

            /*
              P-110 #5 · PROFILE DNA — the fingerprint printed ABOVE the
              histogram it describes (anchored at VAH), so shape, sample and
              fidelity are read in the same glance as the profile. Only ever
              drawn with the Living Profile: DNA of an unseen profile is a
              card, and a card is not the invention.
            */
            {
              const dna = profileDnaRef.current;
              const dnaOn = layerOnRef.current.profileDna;
              ds.profileDna = dnaOn ? (dna ? dna.reason : "NO_READING") : "OFF";
              if (dnaOn && dna?.measured && lp.vah != null) {
                const yv = srs.priceToCoordinate(lp.vah);
                if (yv != null) {
                  ctx.save();
                  ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
                  ctx.textBaseline = "middle";
                  const text = dna.strip;
                  const w = Math.ceil(ctx.measureText(text).width) + 10;
                  const x = Math.max(4, rightEdge - w);
                  const y = Math.max(10, Math.round(+yv) - 16);
                  ctx.fillStyle = "rgba(11,10,8,0.85)";
                  ctx.fillRect(x, y - 8, w, 16);
                  ctx.strokeStyle = "rgba(201,165,92,0.45)";
                  ctx.lineWidth = 1;
                  ctx.strokeRect(x + 0.5, y - 7.5, w - 1, 15);
                  ctx.fillStyle = "rgba(237,230,211,0.92)";
                  ctx.textAlign = "left";
                  ctx.fillText(text, x + 5, y);
                  ctx.restore();
                  ds.profileDnaShape = dna.shape ?? "";
                } else delete ds.profileDnaShape;
              } else {
                if (dnaOn && dna?.measured) ds.profileDna = "LIVING_PROFILE_NOT_DRAWN";
                delete ds.profileDnaShape;
              }
            }
            if (lp.nodesWithheld) ds.livingProfileNodesWithheld = lp.nodesWithheld;
            else delete ds.livingProfileNodesWithheld;
          } else {
            delete ds.livingProfileLane;
            delete ds.livingProfileLaneLeft;
            delete ds.livingProfileLaneRight;
            delete ds.livingProfileFidelity;
            delete ds.livingProfileNodesWithheld;
            // DNA describes the profile on the glass; with none drawn, it says so.
            ds.profileDna = layerOnRef.current.profileDna ? "LIVING_PROFILE_NOT_DRAWN" : "OFF";
            delete ds.profileDnaShape;
            delete ds.livingProfileBars;
            delete ds.livingProfileMarks;
            delete ds.livingProfileUntraded;
          }
        }

        /* ══ P-110 #9 · COMPOSITE PROFILE — ONE MORE LANE IN THE STACK ═════
           Completed sessions only. Takes the lane after everything already in
           the right-edge stack (VP columns, Value Candle, Living), so no two
           histograms ever share a column. Cooler parchment than Living so
           "settled value" and "live value" read apart without a market hue;
           POC in brass. Labels sit left of its own lane.
        ═══════════════════════════════════════════════════════════════════ */
        {
          const cp = compositeProfileRef.current;
          const on = layerOnRef.current.compositeProfile;
          ds.compositeProfile = on ? (cp ? cp.reason : "NO_READING") : "OFF";
          if (on && cp?.drawn) {
            const lane = stackPlan.lanes.COMPOSITE ?? soloLane(W);
            if (lane.fits) {
              ctx.save(); ctx.globalAlpha = magnetLight * semanticDensity.macro;
              const right = lane.right;
              const width = lane.width;
              const ys: number[] = [];
              for (const r of cp.rows) { const yr = srs.priceToCoordinate(r.price); if (yr != null) ys.push(+yr); }
              let rowH = 2;
              if (ys.length >= 2) {
                const sorted = [...ys].sort((a, b) => a - b);
                const gaps: number[] = [];
                for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i - 1]);
                const g = gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)] || 2;
                rowH = Math.max(2, Math.min(10, Math.round(g)));
              }
              let drawn = 0;
              let top = Infinity;
              for (const r of cp.rows) {
                const yr = srs.priceToCoordinate(r.price);
                if (yr == null) continue;
                const y = Math.round(+yr) - Math.floor(rowH / 2);
                const w = Math.max(1, Math.round(r.share * width));
                ctx.fillStyle = r.isPoc
                  ? "rgba(201,165,92,0.85)"
                  : r.insideValueArea ? "rgba(184,190,196,0.55)" : "rgba(160,166,172,0.28)";
                ctx.fillRect(right - w, y, w, Math.max(1, rowH - 1));
                top = Math.min(top, y);
                drawn++;
              }
              ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
              ctx.textAlign = "right";
              ctx.textBaseline = "middle";
              const lab = (price: number | null, text: string, ink: string) => {
                if (price == null) return;
                const yr = srs.priceToCoordinate(price);
                if (yr == null) return;
                if (stackPlan.stacked) { stackLabel(+yr, text, ink); return; }
                ctx.fillStyle = ink;
                ctx.fillText(text, right - width - 8, +yr);
              };
              lab(cp.poc, `CMP POC ${cp.poc?.toFixed(2)}`, "rgba(201,165,92,0.95)");
              lab(cp.vah, `CMP VAH ${cp.vah?.toFixed(2)}`, "rgba(184,190,196,0.85)");
              lab(cp.val, `CMP VAL ${cp.val?.toFixed(2)}`, "rgba(184,190,196,0.85)");
              if (Number.isFinite(top)) {
                const text = `COMPOSITE · ${cp.sessions} SESSION${cp.sessions === 1 ? "" : "S"} · TODAY EXCLUDED`;
                const tw = Math.ceil(ctx.measureText(text).width) + 8;
                const tx = Math.max(4, right - tw);
                // Stack headers own fixed rows under the top chrome: they can
                // never cover each other, whatever the profiles' price range.
                const ty = 50;
                ctx.fillStyle = "rgba(11,10,8,0.85)";
                ctx.fillRect(tx, ty - 7, tw, 14);
                ctx.textAlign = "left";
                ctx.fillStyle = "rgba(184,190,196,0.95)";
                ctx.fillText(text, tx + 4, ty);
              }
              ctx.restore();
              ds.compositeProfileRows = String(drawn);
              ds.compositeProfileSessions = String(cp.sessions);
            } else {
              ds.compositeProfile = "NO_ROOM";
              delete ds.compositeProfileRows;
              delete ds.compositeProfileSessions;
            }
          } else {
            delete ds.compositeProfileRows;
            delete ds.compositeProfileSessions;
          }
        }

        /* ══ P-110 #7 · VISIBLE RANGE PROFILE — THE BARS IN VIEW ══════════
           Its lane comes from the stack plan like every other. Drawn with an
           outline-only POC and hollow bars so it reads as "this camera", not
           as another settled profile; the header says it moves with the view.
        ═══════════════════════════════════════════════════════════════════ */
        {
          const lane = stackPlan.lanes.VISIBLE_RANGE;
          if (vrpVM?.drawn && lane?.fits) {
            ctx.save(); ctx.globalAlpha = magnetLight * semanticDensity.mid;
            const right = lane.right;
            const width = lane.width;
            const ys: number[] = [];
            for (const r of vrpVM.rows) { const yr = srs.priceToCoordinate(r.price); if (yr != null) ys.push(+yr); }
            let rowH = 2;
            if (ys.length >= 2) {
              const sorted = [...ys].sort((a, b) => a - b);
              const gaps: number[] = [];
              for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i - 1]);
              const g = gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)] || 2;
              rowH = Math.max(2, Math.min(10, Math.round(g)));
            }
            let drawn = 0;
            let top = Infinity;
            ctx.lineWidth = 1;
            for (const r of vrpVM.rows) {
              const yr = srs.priceToCoordinate(r.price);
              if (yr == null) continue;
              const y = Math.round(+yr) - Math.floor(rowH / 2);
              const w = Math.max(1, Math.round(r.share * width));
              const h = Math.max(1, rowH - 1);
              ctx.fillStyle = r.isPoc ? "rgba(201,165,92,0.35)" : r.insideValueArea ? "rgba(237,230,211,0.14)" : "rgba(237,230,211,0.06)";
              ctx.fillRect(right - w, y, w, h);
              ctx.strokeStyle = r.isPoc ? "rgba(201,165,92,0.95)" : r.insideValueArea ? "rgba(237,230,211,0.55)" : "rgba(237,230,211,0.28)";
              if (h >= 3) ctx.strokeRect(right - w + 0.5, y + 0.5, Math.max(0, w - 1), h - 1);
              top = Math.min(top, y);
              drawn++;
            }
            const lab = (price: number | null, text: string, ink: string) => {
              if (price == null) return;
              const yr = srs.priceToCoordinate(price);
              if (yr == null) return;
              if (stackPlan.stacked) { stackLabel(+yr, text, ink); return; }
              ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
              ctx.textAlign = "right";
              ctx.textBaseline = "middle";
              ctx.fillStyle = ink;
              ctx.fillText(text, right - width - 8, +yr);
            };
            lab(vrpVM.poc, `VRP POC ${vrpVM.poc?.toFixed(2)}`, "rgba(201,165,92,0.95)");
            lab(vrpVM.vah, `VRP VAH ${vrpVM.vah?.toFixed(2)}`, "rgba(237,230,211,0.75)");
            lab(vrpVM.val, `VRP VAL ${vrpVM.val?.toFixed(2)}`, "rgba(237,230,211,0.75)");
            if (Number.isFinite(top)) {
              ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
              const text = `VISIBLE RANGE · ${vrpVM.barsInView} BARS · MOVES WITH THE VIEW`;
              const tw = Math.ceil(ctx.measureText(text).width) + 8;
              const tx = Math.max(4, right - tw);
              const ty = 66;
              ctx.fillStyle = "rgba(11,10,8,0.85)";
              ctx.fillRect(tx, ty - 7, tw, 14);
              ctx.textAlign = "left";
              ctx.textBaseline = "middle";
              ctx.fillStyle = "rgba(237,230,211,0.92)";
              ctx.fillText(text, tx + 4, ty);
            }
            ctx.restore();
            ds.visibleRangeProfileRows = String(drawn);
            ds.visibleRangeProfileBars = String(vrpVM.barsInView);
            ds.visibleRangeProfilePoc = String(vrpVM.poc);
          } else {
            if (vrpVM?.drawn && !lane?.fits) ds.visibleRangeProfile = "NO_ROOM";
            delete ds.visibleRangeProfileRows;
            delete ds.visibleRangeProfileBars;
            delete ds.visibleRangeProfilePoc;
          }
        }

        /* ══ P-110 #10 · TPO — TIME AT PRICE, LEFT EDGE ═════════════════════
           The Living Profile owns the right edge and answers "where did SIZE
           trade". This column owns the left edge and answers "where did the
           market SPEND TIME". Two distributions on two sides of the same
           camera, so a level with size and no time (rejection) or time and no
           size (acceptance) reads at a glance instead of by toggling.

           Compiler-owned rules this file may not decide:
             · NOT DRAWN → nothing paints, and the reason is published.
             · A ROW IS A PRICE. `share` is already against the busiest row.
             · Untouched buckets are absent from `rows` and never drawn.

           Told apart from the volume histogram by FORM, not hue: outlined
           cells instead of solid bars, because "time" and "size" are both
           neutral facts and neither may borrow a market colour.
        ═══════════════════════════════════════════════════════════════════ */
        {
          const tpo = tpoProfileRef.current;
          const on = layerOnRef.current.tpo;
          ds.tpoProfile = on ? (tpo ? tpo.reason : "NO_READING") : "OFF";

          if (on && tpo?.drawn) {
            ctx.save(); ctx.globalAlpha = magnetLight * semanticDensity.mid;
            const leftEdge = 10;
            const colMax = Math.min(140, Math.round(W * 0.14));

            // Row height from on-screen spacing between successive grid rows,
            // same rule as the volume histogram so the two read at one scale.
            const ys: number[] = [];
            for (const r of tpo.rows) {
              const yr = srs.priceToCoordinate(r.price);
              if (yr != null) ys.push(+yr);
            }
            let rowH = 2;
            if (ys.length >= 2) {
              const sorted = [...ys].sort((a, b) => a - b);
              const gaps: number[] = [];
              for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i - 1]);
              const g = gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)] || 2;
              rowH = Math.max(2, Math.min(12, Math.round(g)));
            }

            let drawnRows = 0;
            let drawnSingles = 0;
            ctx.lineWidth = 1;
            for (const r of tpo.rows) {
              const yr = srs.priceToCoordinate(r.price);
              if (yr == null) continue;
              const y = Math.round(+yr) - Math.floor(rowH / 2);
              const h = Math.max(1, rowH - 1);
              const w = Math.max(1, Math.round(r.share * colMax));
              if (r.isPoc) {
                ctx.fillStyle = "rgba(201,165,92,0.55)";
                ctx.fillRect(leftEdge, y, w, h);
                ctx.strokeStyle = "rgba(201,165,92,0.95)";
              } else {
                ctx.fillStyle = r.insideValueArea
                  ? "rgba(237,230,211,0.10)"
                  : "rgba(194,184,146,0.05)";
                ctx.fillRect(leftEdge, y, w, h);
                ctx.strokeStyle = r.insideValueArea
                  ? "rgba(237,230,211,0.62)"
                  : "rgba(194,184,146,0.38)";
              }
              if (h >= 3) ctx.strokeRect(leftEdge + 0.5, y + 0.5, Math.max(0, w - 1), h - 1);
              else { ctx.beginPath(); ctx.moveTo(leftEdge, y + 0.5); ctx.lineTo(leftEdge + w, y + 0.5); ctx.stroke(); }
              drawnRows++;
              // SINGLE PRINT — the auction passed through once and never
              // returned. A short brass tick OUTSIDE the column, so it reads
              // as a mark on the row and not as a longer bar.
              if (r.single) {
                ctx.fillStyle = "rgba(201,165,92,0.85)";
                ctx.fillRect(leftEdge - 6, y, 3, h);
                drawnSingles++;
              }
            }

            // TPO POC / VAH / VAL: short reference strokes across the column
            // and a label at its right, so the levels are quotable.
            ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            const ref = (price: number | null, text: string, ink: string, dashed: boolean) => {
              if (price == null) return;
              const yr = srs.priceToCoordinate(price);
              if (yr == null) return;
              const y = Math.round(+yr) + 0.5;
              ctx.strokeStyle = ink;
              ctx.setLineDash(dashed ? [3, 4] : []);
              ctx.beginPath();
              ctx.moveTo(leftEdge, y);
              ctx.lineTo(leftEdge + colMax + 4, y);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.fillStyle = ink;
              ctx.fillText(text, leftEdge + colMax + 8, y);
            };
            ref(tpo.poc, `TPO POC ${tpo.poc?.toFixed(2) ?? ""}`, "rgba(201,165,92,0.95)", false);
            ref(tpo.vah, `TPO VAH ${tpo.vah?.toFixed(2) ?? ""}`, "rgba(194,184,146,0.75)", true);
            ref(tpo.val, `TPO VAL ${tpo.val?.toFixed(2) ?? ""}`, "rgba(194,184,146,0.75)", true);

            ctx.restore();
            ds.tpoProfileRows = String(drawnRows);
            ds.tpoProfilePeriods = String(tpo.periods);
            if (drawnSingles > 0) ds.tpoProfileSingles = String(drawnSingles);
            else delete ds.tpoProfileSingles;
            if (tpo.asOf != null) ds.tpoProfileAsOf = String(tpo.asOf);
            else delete ds.tpoProfileAsOf;
          } else {
            delete ds.tpoProfileRows;
            delete ds.tpoProfilePeriods;
            delete ds.tpoProfileSingles;
            delete ds.tpoProfileAsOf;
          }
        }

        /* ══ P-110 #2 · STRUCTURE PROFILE — THE LEG, DRAWN FROM ITS SWING ═══
           A profile anchored to a market event. It begins at the x of the
           pivot bar the structure compiler confirmed, and grows RIGHT from
           there — so the trader sees WHERE the leg started and what value it
           has built since, on the candles it describes. A vertical hairline
           marks the anchor; the leg POC extends from the anchor to "now".
           Muted parchment, no hue: a leg's value is not a side.
        ═══════════════════════════════════════════════════════════════════ */
        {
          const sp = structureProfileRef.current;
          const on = layerOnRef.current.structureProfile;
          ds.structureProfile = on ? (sp ? sp.reason : "NO_READING") : "OFF";

          const ax = sp?.anchor ? chart.timeScale().timeToCoordinate(sp.anchor.time as any) : null;
          if (on && sp?.drawn && sp.anchor && ax != null) {
            ctx.save(); ctx.globalAlpha = trendLight * semanticDensity.mid;
            const x0 = Math.round(+ax);
            /*
              ROOM, NOT OVERLAP. The Living Profile owns the right-edge column
              (W - 76, up to 16% wide). A leg that began near "now" gets only
              the room between its anchor and that column — never less than
              a legible 24px, never more than 10% of the pane.
            */
            // The right-edge profile stack's leftmost x, as the Living
            // Profile published it this frame; the price gutter otherwise.
            const stackLeft = ds.profileStackLeft ? Number(ds.profileStackLeft) - 12 : W - 76;
            const livingCol = (W - 76) - stackLeft;
            const room = stackLeft - (x0 + 2);
            const colMax = Math.max(48, Math.min(120, Math.round(W * 0.1), room));
            /*
              A leg that began inside the right-edge stack has no room of its
              own there. Its histogram is pinned just LEFT of the stack; the
              anchor hairline and leg POC still start at the real swing bar,
              so the anchor stays a coordinate and the bars stay legible.
            */
            const histX = Math.min(x0 + 2, stackLeft - colMax - 4);

            const ys: number[] = [];
            for (const r of sp.rows) {
              const yr = srs.priceToCoordinate(r.price);
              if (yr != null) ys.push(+yr);
            }
            let rowH = 2;
            if (ys.length >= 2) {
              const sorted = [...ys].sort((a, b) => a - b);
              const gaps: number[] = [];
              for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i - 1]);
              const g = gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)] || 2;
              rowH = Math.max(2, Math.min(10, Math.round(g)));
            }

            let drawnRows = 0;
            let top = Infinity;
            let bot = -Infinity;
            for (const r of sp.rows) {
              const yr = srs.priceToCoordinate(r.price);
              if (yr == null) continue;
              const y = Math.round(+yr) - Math.floor(rowH / 2);
              const w = Math.max(1, Math.round(r.share * colMax));
              ctx.fillStyle = r.isPoc
                ? "rgba(201,165,92,0.55)"
                : r.insideValueArea
                  ? "rgba(237,230,211,0.26)"
                  : "rgba(194,184,146,0.14)";
              ctx.fillRect(histX, y, w, Math.max(1, rowH - 1));
              top = Math.min(top, y);
              bot = Math.max(bot, y + rowH);
              drawnRows++;
            }

            // The anchor: a hairline spanning the leg's range at the swing bar.
            if (drawnRows > 0) {
              ctx.strokeStyle = "rgba(201,165,92,0.55)";
              ctx.lineWidth = 1;
              ctx.setLineDash([2, 3]);
              ctx.beginPath();
              ctx.moveTo(x0 + 0.5, top);
              ctx.lineTo(x0 + 0.5, bot);
              ctx.stroke();
              ctx.setLineDash([]);
            }

            // Leg POC from the anchor to the right edge of the candles: the
            // level this leg has accepted most, carried forward to "now".
            if (sp.poc != null) {
              const yp = srs.priceToCoordinate(sp.poc);
              if (yp != null) {
                ctx.strokeStyle = "rgba(201,165,92,0.45)";
                ctx.setLineDash([6, 4]);
                ctx.beginPath();
                ctx.moveTo(x0, Math.round(+yp) + 0.5);
                ctx.lineTo(W - 76, Math.round(+yp) + 0.5);
                ctx.stroke();
                ctx.setLineDash([]);
              }
            }

            // Name the anchor where it is, so the profile says what it is.
            ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
            ctx.textAlign = "left";
            ctx.textBaseline = "bottom";
            const kind = sp.anchor.kind === "HIGH" ? "SWING HIGH" : "SWING LOW";
            const est = sp.quality === "trade-based" ? "" : " · CANDLE-EST";
            /*
              The name sits on a dark chip so it stays legible over candles
              and the value band. If the anchor is near the right edge the
              chip slides left so it never runs under the Living Profile.
            */
            const chip = (text: string, x: number, y: number) => {
              const w = Math.ceil(ctx.measureText(text).width) + 8;
              const maxX = W - 76 - livingCol - w;
              const cx = Math.max(4, Math.min(x, maxX));
              ctx.fillStyle = "rgba(11,10,8,0.82)";
              ctx.fillRect(cx, y - 12, w, 14);
              ctx.fillStyle = "rgba(201,165,92,0.95)";
              ctx.fillText(text, cx + 4, y);
            };
            chip(
              `STRUCTURE · FROM ${kind} ${sp.anchor.price.toFixed(2)} · ${sp.legBars} BARS${est}`,
              x0 + 4, Math.max(14, top - 4),
            );
            if (sp.poc != null) {
              const yp = srs.priceToCoordinate(sp.poc);
              if (yp != null) chip(`LEG POC ${sp.poc.toFixed(2)}`, x0 + 4, Math.round(+yp) + 16);
            }

            ctx.restore();
            ds.structureProfileRows = String(drawnRows);
            ds.structureProfileAnchor = `${sp.anchor.kind}@${sp.anchor.time}`;
            ds.structureProfileLegBars = String(sp.legBars);
          } else {
            if (on && sp?.drawn && ax == null) ds.structureProfile = "ANCHOR_OFF_CAMERA";
            delete ds.structureProfileRows;
            delete ds.structureProfileAnchor;
            delete ds.structureProfileLegBars;
          }
        }

        /* ══ P-110 #3 · PROFILE FUSION — WHERE THE SPECIES AGREE ═══════════
           A thin brass band across the camera from the lowest to the highest
           contributing price (never smoothed), with its provenance printed at
           the left: which species, which level. "×3" is a count of species,
           not a score. Painted under the other profile layers so it reads as
           ground, not as another line.
        ═══════════════════════════════════════════════════════════════════ */
        {
          const fu = profileFusionRef.current;
          const on = layerOnRef.current.profileFusion;
          ds.profileFusion = on ? (fu ? fu.reason : "NO_READING") : "OFF";
          if (on && fu?.drawn) {
            ctx.save(); ctx.globalAlpha = magnetLight * semanticDensity.macro;
            const endX = ds.profileStackLeft ? Number(ds.profileStackLeft) - 8 : W - 80;
            let painted = 0;
            ctx.font = "700 9px ui-sans-serif, system-ui, sans-serif";
            ctx.textBaseline = "middle";
            for (const z of fu.zones) {
              const yh = srs.priceToCoordinate(z.high);
              const yl = srs.priceToCoordinate(z.low);
              if (yh == null || yl == null) continue;
              const top = Math.min(+yh, +yl) - 2;
              const h = Math.max(4, Math.abs(+yl - +yh) + 4);
              ctx.fillStyle = "rgba(201,165,92,0.13)";
              ctx.fillRect(0, top, endX, h);
              ctx.strokeStyle = "rgba(201,165,92,0.55)";
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(0, Math.round(top) + 0.5); ctx.lineTo(endX, Math.round(top) + 0.5);
              ctx.moveTo(0, Math.round(top + h) - 0.5); ctx.lineTo(endX, Math.round(top + h) - 0.5);
              ctx.stroke();
              const text = `FUSION ×${z.speciesCount} · ${z.low.toFixed(2)}${z.high !== z.low ? `–${z.high.toFixed(2)}` : ""} · ${z.provenance}`;
              const w = Math.ceil(ctx.measureText(text).width) + 10;
              const x = 44;
              const y = Math.round(top + h / 2);
              ctx.fillStyle = "rgba(11,10,8,0.86)";
              ctx.fillRect(x, y - 8, w, 16);
              ctx.strokeStyle = "rgba(201,165,92,0.7)";
              ctx.strokeRect(x + 0.5, y - 7.5, w - 1, 15);
              ctx.fillStyle = "rgba(201,165,92,1)";
              ctx.textAlign = "left";
              ctx.fillText(text, x + 5, y);
              painted++;
            }
            ctx.restore();
            ds.profileFusionZones = String(painted);
            ds.profileFusionMaxSpecies = String(Math.max(0, ...fu.zones.map(z => z.speciesCount)));
          } else {
            delete ds.profileFusionZones;
            delete ds.profileFusionMaxSpecies;
          }
        }

        /* ══ P-110 #4 · PROFILE MEMORY — PRIOR SESSIONS' VALUE, FORWARD ════
           Each completed session's final POC/VAH/VAL starts at the bar its
           session ended on and runs to the right edge of the candles. Older
           sessions fade (age is stated, never weighted into a score). POC is
           brass (solid while NAKED, dashed once tested); VAH/VAL are ivory
           dashes. POC is always labelled; VAH/VAL only while NAKED, so the
           glass names the levels the market has not been back to.
        ═══════════════════════════════════════════════════════════════════ */
        {
          const mem = profileMemoryRef.current;
          const on = layerOnRef.current.profileMemory;
          ds.profileMemory = on ? (mem ? mem.reason : "NO_READING") : "OFF";
          if (on && mem?.drawn) {
            ctx.save(); ctx.globalAlpha = magnetLight * semanticDensity.macro;
            const ts = chart.timeScale();
            const endX = ds.profileStackLeft ? Number(ds.profileStackLeft) - 8 : W - 80;
            let drawn = 0;
            let naked = 0;
            ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
            ctx.textBaseline = "middle";
            const labelYs: number[] = [];
            for (const l of mem.levels) {
              const yr = srs.priceToCoordinate(l.price);
              if (yr == null) continue;
              const y = Math.round(+yr) + 0.5;
              const xr = ts.timeToCoordinate(l.formedAt as any);
              const x0 = xr == null ? 0 : Math.max(0, Math.round(+xr));
              if (x0 >= endX) continue;
              const fade = Math.max(0.3, 0.9 - (l.sessionsAgo - 1) * 0.15);
              const isPoc = l.kind === "POC";
              ctx.strokeStyle = isPoc ? `rgba(201,165,92,${fade})` : `rgba(237,230,211,${fade * 0.6})`;
              ctx.lineWidth = isPoc ? 1.25 : 1;
              ctx.setLineDash(isPoc ? (l.naked ? [] : [8, 3]) : [2, 4]);
              ctx.beginPath();
              ctx.moveTo(x0, y);
              ctx.lineTo(endX, y);
              ctx.stroke();
              ctx.setLineDash([]);
              drawn++;
              if (l.naked) naked++;
              if (!(isPoc || l.naked)) continue;
              if (labelYs.some(v => Math.abs(v - y) < 11)) continue; // never stack labels
              labelYs.push(y);
              const text = `S-${l.sessionsAgo} ${l.kind} ${l.price.toFixed(2)} · ${l.naked ? "NAKED" : `${l.tests} TEST${l.tests === 1 ? "" : "S"}`}`;
              const w = Math.ceil(ctx.measureText(text).width) + 8;
              const lx = endX - w - 4;
              ctx.fillStyle = "rgba(11,10,8,0.80)";
              ctx.fillRect(lx, y - 7, w, 14);
              ctx.fillStyle = isPoc ? `rgba(201,165,92,${Math.max(0.6, fade)})` : `rgba(237,230,211,${Math.max(0.55, fade)})`;
              ctx.textAlign = "left";
              ctx.fillText(text, lx + 4, y);
            }
            ctx.restore();
            ds.profileMemoryLevels = String(drawn);
            ds.profileMemoryNaked = String(naked);
            ds.profileMemorySessions = String(mem.sessionsRemembered);
          } else {
            delete ds.profileMemoryLevels;
            delete ds.profileMemoryNaked;
            delete ds.profileMemorySessions;
          }
        }

        /* ══ LIVING PROFILE · DEVELOPING VALUE MIGRATION ═══════════════════
           The auction's movie on the candles: after every bar, where POC and
           value stood, drawn at the time it was true. Stepped, because value
           does not glide between buckets — it jumps when a bucket overtakes.
           POC in brass (house hardware, not a side); VAH/VAL as faint ivory
           dashes. Each session is its own line: they break at the gap.
        ═══════════════════════════════════════════════════════════════════ */
        {
          const vm = valueMigrationRef.current;
          const on = layerOnRef.current.valueMigration;
          ds.valueMigration = on ? (vm ? vm.reason : "NO_READING") : "OFF";
          if (on && vm?.drawn) {
            ctx.save(); ctx.globalAlpha = trendLight * semanticDensity.mid;
            const ts = chart.timeScale();
            const stepLine = (key: "poc" | "vah" | "val", ink: string, width: number, dash: number[]) => {
              ctx.strokeStyle = ink;
              ctx.lineWidth = width;
              ctx.setLineDash(dash);
              ctx.beginPath();
              let prevSession = -1;
              let prevY: number | null = null;
              let painted = 0;
              for (const p of vm.points) {
                const xr = ts.timeToCoordinate(p.time as any);
                const yr = srs.priceToCoordinate(p[key]);
                if (xr == null || yr == null) { prevY = null; continue; }
                const x = Math.round(+xr) + 0.5;
                const y = Math.round(+yr) + 0.5;
                if (p.session !== prevSession || prevY == null) {
                  ctx.moveTo(x, y);
                } else {
                  ctx.lineTo(x, prevY); // hold the old value until this bar
                  ctx.lineTo(x, y);     // then step to the new one
                }
                prevSession = p.session;
                prevY = y;
                painted++;
              }
              ctx.stroke();
              ctx.setLineDash([]);
              return painted;
            };
            stepLine("vah", "rgba(237,230,211,0.38)", 1, [2, 3]);
            stepLine("val", "rgba(237,230,211,0.38)", 1, [2, 3]);
            const drawn = stepLine("poc", "rgba(201,165,92,0.85)", 1.5, []);

            // Name the line once, at its newest point, with the session's
            // POC travel — a stated distance, not a direction call.
            const last = vm.points[vm.points.length - 1];
            const lx = ts.timeToCoordinate(last.time as any);
            const ly = srs.priceToCoordinate(last.poc);
            if (lx != null && ly != null && vm.latestPocTravel != null) {
              const t = vm.latestPocTravel;
              const text = `dPOC ${last.poc.toFixed(2)} · ${t >= 0 ? "+" : ""}${t.toFixed(2)} THIS SESSION · EST`;
              ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
              const w = Math.ceil(ctx.measureText(text).width) + 8;
              const x = Math.max(4, Math.round(+lx) - w - 6);
              const y = Math.round(+ly) - 12;
              ctx.fillStyle = "rgba(11,10,8,0.82)";
              ctx.fillRect(x, y - 7, w, 14);
              ctx.fillStyle = "rgba(201,165,92,0.95)";
              ctx.textAlign = "left";
              ctx.textBaseline = "middle";
              ctx.fillText(text, x + 4, y);
            }
            ctx.restore();
            ds.valueMigrationPoints = String(drawn);
            ds.valueMigrationSessions = String(vm.sessions);
          } else {
            delete ds.valueMigrationPoints;
            delete ds.valueMigrationSessions;
          }
        }

        /* ══ F11 · MARKET OBJECT ZONES — the Passport mockup, on price ═══════
           Swing-origin ZONES from the structure owner, biography from the
           lifecycle owner. Unselected: a quiet outline, so HOME stays calm.
           SELECTED: the zone from its birth bar to the profile stack, a dot
           at every touch (filled brass = rejected, hollow ring = closed
           beyond, ivory = still open), the state named on a chip, and the
           invalidation edge dashed. State is told by FORM and WORD, never by
           a market hue: an invalid zone is not a bearish one. Zones speak at MID depth (zones + profile).
        ═══════════════════════════════════════════════════════════════════ */
        {
          const zones = structureZonesRef.current;
          const selId = selectedObjectIdRef.current;
          ds.marketZones = String(zones.length);
          if (zones.length > 0) {
            ctx.save(); ctx.globalAlpha = semanticDensity.mid;
            const ts = chart.timeScale();
            const endX = ds.profileStackLeft ? Number(ds.profileStackLeft) - 8 : W - 80;
            let selectedPainted = "";
            for (const z of zones) {
              const yh = srs.priceToCoordinate(z.object.priceHigh);
              const yl = srs.priceToCoordinate(z.object.priceLow);
              if (yh == null || yl == null) continue;
              const top = Math.min(+yh, +yl);
              const h = Math.max(3, Math.abs(+yl - +yh));
              const xr = ts.timeToCoordinate(z.birthTime as any);
              const x0 = xr == null ? 0 : Math.max(0, Math.round(+xr));
              // A zone born near "now" sits inside the profile stack's column.
              // It is the freshest object on the camera, so it gets reach over
              // the stack rather than being skipped.
              const zEnd = Math.min(W - 76, Math.max(endX, x0 + 60));
              if (x0 >= zEnd) continue;
              const selected = z.object.objectId === selId;
              const invalid = z.lifecycle.state === "INVALID";
              // The object being READ is never dimmed by the depth governor:
              // the trader chose it, so it paints at full strength (MOCK 4).
              ctx.globalAlpha = selected ? 1 : semanticDensity.mid;
              if (!selected) {
                ctx.strokeStyle = invalid ? "rgba(150,150,160,0.30)" : "rgba(201,165,92,0.30)";
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 4]);
                ctx.strokeRect(x0 + 0.5, Math.round(top) + 0.5, zEnd - x0, Math.round(h));
                ctx.setLineDash([]);
                continue;
              }
              // SELECTED
              ctx.fillStyle = invalid ? "rgba(150,150,160,0.08)" : "rgba(240,180,41,0.24)";
              ctx.fillRect(x0, top, zEnd - x0, h);
              ctx.strokeStyle = invalid ? "rgba(170,170,180,0.85)" : "rgba(240,180,41,0.9)";
              ctx.lineWidth = 1.25;
              ctx.strokeRect(x0 + 0.5, Math.round(top) + 0.5, zEnd - x0, Math.round(h));
              // Invalidation edge, dashed across the zone.
              const yi = srs.priceToCoordinate(z.lifecycle.invalidationPrice);
              if (yi != null) {
                ctx.setLineDash([4, 3]);
                ctx.strokeStyle = "rgba(237,230,211,0.55)";
                ctx.beginPath(); ctx.moveTo(x0, Math.round(+yi) + 0.5); ctx.lineTo(zEnd, Math.round(+yi) + 0.5); ctx.stroke();
                ctx.setLineDash([]);
              }
              // Touch dots at each episode's first bar, on the zone's middle.
              const midY = top + h / 2;
              for (const t of z.lifecycle.touches) {
                const tx = ts.timeToCoordinate(t.start as any);
                if (tx == null) continue;
                ctx.beginPath();
                ctx.arc(Math.round(+tx), midY, 4, 0, Math.PI * 2);
                if (t.response === "INVALIDATED") {
                  ctx.strokeStyle = "rgba(237,230,211,0.95)"; ctx.lineWidth = 1.5; ctx.stroke();
                } else {
                  ctx.fillStyle = t.response === "REJECTED" ? "rgba(240,180,41,1)" : "rgba(237,230,211,0.95)";
                  ctx.fill();
                  ctx.strokeStyle = "rgba(11,10,8,0.9)"; ctx.lineWidth = 1; ctx.stroke();
                }
              }
              // The chip, as the mockup draws it: what it is and its range.
              const text = `SELECTED ZONE · ${z.side} · ${z.object.priceLow.toFixed(2)} – ${z.object.priceHigh.toFixed(2)} · ${z.lifecycle.state}`;
              ctx.font = "700 10px ui-sans-serif, system-ui, sans-serif";
              const w = Math.ceil(ctx.measureText(text).width) + 14;
              const cx = Math.max(4, Math.min(x0 + (zEnd - x0) / 2 - w / 2, endX - w));
              const cy = Math.max(24, top - 22);
              ctx.fillStyle = "rgba(11,10,8,0.9)";
              ctx.fillRect(cx, cy - 9, w, 18);
              ctx.strokeStyle = invalid ? "rgba(170,170,180,0.9)" : "rgba(240,180,41,0.95)";
              ctx.strokeRect(cx + 0.5, cy - 8.5, w - 1, 17);
              ctx.fillStyle = invalid ? "rgba(220,220,228,1)" : "rgba(240,180,41,1)";
              ctx.textAlign = "left"; ctx.textBaseline = "middle";
              ctx.fillText(text, cx + 7, cy);
              selectedPainted = z.object.objectId;
            }
            ctx.restore();
            if (selectedPainted) ds.marketZoneSelected = selectedPainted;
            else delete ds.marketZoneSelected;
          } else {
            delete ds.marketZoneSelected;
          }
        }

        /* ══ H-704 · MARKET STRUCTURE — swing highs and lows on the axis ═══
           P-110's #2 organism. Each pivot is a real price the compiler
           picked; the LAST pivot of each kind is drawn a step louder.
           Bias word top-right, near (but not colliding with) the semantic
           zoom tag.
        ═══════════════════════════════════════════════════════════════════ */
        {
          const ms = marketStructureRef.current;
          const on = layerOnRef.current.marketStructure;
          ds.marketStructure = on ? (ms ? ms.reason : "NO_READING") : "OFF";
          ds.marketStructureBias = ms?.bias ?? "";

          if (on && ms?.drawn) {
            ctx.save(); ctx.globalAlpha = trendLight * semanticDensity.macro;
            let painted = 0;
            for (const p of ms.pivots) {
              const xr = chart.timeScale().timeToCoordinate(p.time as any);
              const yr = srs.priceToCoordinate(p.price);
              if (xr == null || yr == null) continue;
              const x = Math.round(+xr) + 0.5;
              const y = Math.round(+yr) + 0.5;
              // Highs get an upward tick, lows a downward tick — a shape
              // reads before a colour would, and this reading has no side.
              const dir = p.kind === "HIGH" ? -1 : 1;
              const len = p.isLast ? 10 : 6;
              ctx.strokeStyle = p.isLast
                ? "rgba(237,230,211,0.90)"
                : "rgba(194,184,146,0.55)";
              ctx.lineWidth = p.isLast ? 1.5 : 1;
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x, y + dir * len);
              ctx.stroke();
              // Small cap so the tick reads as a marker, not a wick tail.
              ctx.beginPath();
              ctx.arc(x, y, p.isLast ? 2.2 : 1.6, 0, Math.PI * 2);
              if (p.isLast) {
                ctx.fillStyle = "rgba(237,230,211,0.90)";
                ctx.fill();
              } else {
                ctx.stroke();
              }
              painted++;
            }

            // Bias word above the pane, right side but LEFT of the semantic
            // zoom tag so the two chrome words never overlap.
            if (ms.bias !== "UNCLEAR") {
              ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
              ctx.textAlign = "right";
              ctx.textBaseline = "top";
              ctx.fillStyle = "rgba(194,184,146,0.85)";
              const label =
                ms.bias === "HIGHER_HIGHS" ? "HH · HL"
                : ms.bias === "LOWER_LOWS" ? "LL · LH"
                : "RANGE";
              ctx.fillText(label, W - 168, 6);
              ctx.fillStyle = "rgba(138,130,113,0.75)";
              ctx.fillText(`+${ms.unconfirmedBars} unconfirmed`, W - 168, 18);
            }

            ctx.restore();
            if (painted > 0) ds.marketStructurePivots = String(painted);
            else delete ds.marketStructurePivots;
          } else {
            delete ds.marketStructurePivots;
          }
        }

        /* ══ F13 · SEMANTIC ZOOM TAG ═════════════════════════════════════════
           FAR · MID · NEAR on the SAME camera. One word top-right, telling
           the trader which resolution the picture in front of them is at.

           Canon is blunt about the forbidden opposite: "Do not convert the
           teaching plate into a permanent 3-column chart. Do not confuse
           semantic resolution with data/source resolution." So this reading:

             · never sources data
             · never picks candles
             · never routes
             · reads bar COUNT (not time span, not price span) because
               semantic resolution is a property of what a human eye can weigh
               at once, and bar count is the same denominator on every symbol
               and every timeframe.

           H1 — an empty range or a chart not yet loaded is UNMEASURED, not
           NEAR. Rendering NEAR of nothing would say "you are reading candle
           anatomy of nothing," which is absence as a value.
        ═══════════════════════════════════════════════════════════════════ */
        {
          const vr = chart.timeScale().getVisibleLogicalRange();
          const count = vr
            ? Math.max(0, Math.floor(vr.to) - Math.ceil(vr.from) + 1)
            : null;
          const zoom = selectSemanticZoom({ visibleBarCount: count });
          ds.semanticZoom = zoom.tag ?? `UNMEASURED:${zoom.reason ?? ""}`;
          ds.semanticDensity = `${semanticDensity.macro}/${semanticDensity.mid}/${semanticDensity.micro}`;
          if (zoom.visibleBarCount != null) ds.semanticZoomBars = String(zoom.visibleBarCount);
          else delete ds.semanticZoomBars;

          if (zoom.tag) {
            ctx.save();
            ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
            ctx.textAlign = "right";
            ctx.textBaseline = "top";
            // Brass on the tag itself — it is HOUSE HARDWARE, not a market
            // reading. Muted ivory on the note beside it.
            //
            // BELOW THE BAR CLOCK, ON A PLATE (2026-09-24): this used to print
            // at y=6, UNDER the DOM "BAR OPENED … FORMING" clock, and every
            // desktop receipt showed the two strings overprinted into noise.
            // Three stacked lines under the clock, on a backing plate, so the
            // depth that is speaking can actually be read.
            const rightX = W - 84;
            const did = activeDecisionIdRef.current;
            const short = did && did.length > 0 ? (did.length > 20 ? `${did.slice(0, 20)}…` : did) : null;
            const lines: { t: string; c: string }[] = [
              { t: `${zoom.visibleBarCount} bars`, c: "rgba(138,130,113,0.85)" },
            ];
            // What this depth lets speak — the plate's own words, not a hint.
            if (semanticDensity.speaking) lines.push({ t: semanticDensity.speaking, c: "rgba(237,230,211,0.85)" });
            /*
              DECISION_ID CHROME — one identity per camera. Canon:
              "One market. One camera. One truth. One Decision_ID."
              Printed under the semantic-zoom tag so a trader reading FAR /
              MID / NEAR sees which identity every layer is bound to.
            */
            if (short) lines.push({ t: `DECISION_ID ${short}`, c: "rgba(194,184,146,0.8)" });
            const pw = Math.max(ctx.measureText(zoom.tag).width, ...lines.map(l => ctx.measureText(l.t).width)) + 12;
            const top = 26;
            ctx.fillStyle = "rgba(11,10,8,0.82)";
            ctx.fillRect(rightX - pw + 6, top - 3, pw, (lines.length + 1) * 12 + 5);
            ctx.fillStyle = "rgba(201,165,92,0.85)";
            ctx.fillText(zoom.tag, rightX, top);
            lines.forEach((l, i) => {
              ctx.fillStyle = l.c;
              ctx.fillText(l.t, rightX, top + (i + 1) * 12);
            });
            ctx.restore();
          }
          if (activeDecisionIdRef.current) ds.activeDecisionId = activeDecisionIdRef.current;
          else delete ds.activeDecisionId;
        }

        /* ── P-601 HEAT LENS: THE SECOND EXCEPTION, AND WHY IT IS ONE ──────
           The note above is right that a COST HAS NO LEVEL, and this does not
           overturn it. It draws no band for the STAGE — "THINNING" is still a
           property of the window and is still painted as words in the chrome.

           What it draws is a band per SEGMENT, at the prices that segment
           actually traded through. That is not a location invented for a
           placeless finding; it is the location where the cost was incurred.
           The shelves above are already this same exception in its narrowest
           form — a stalled segment is a segment whose band collapsed to one
           price. A segment that moved has a band instead of a line, and the
           reason to show it is identical.

           P-601 governs the alpha rather than this file: every band paints at
           `cell.opacity`, which `selectHeatLens` has already capped at the
           OPACITY REGULATOR. That is what lets heat sit ON price instead of
           beside it, and it is the mechanical form of S-501's "ZONES SHALL
           NOT BURY CANDLES." Hard-coding an alpha here would put the regulator
           somewhere it could be quietly raised. */
        const heat = selectHeatLens(liquidityWeatherRef.current);
        ds.heatLens = !on ? "OFF" : heat.drawable ? "DRAWN" : "REFUSED";
        if (on && heat.drawable) {
          /* THE REGULATOR GOVERNS THE COMPOSITE, NOT EACH CELL (2026-09-24).
             Observed on a desktop fixture tape: twelve segments at nearly the
             same prices each painted at <= 0.30, and source-over stacked them
             into a near-opaque salmon slab across the whole camera — the
             exact "zones bury candles" failure P-601's regulator exists to
             prevent. So every cell paints into an OFFSCREEN layer at its
             relative strength (hottest last), and that layer meets the glass
             ONCE at the regulator. Overlap can no longer add up past the cap. */
          const hc = heatLayerRef.current ?? (heatLayerRef.current = document.createElement("canvas"));
          if (hc.width !== canvas.width || hc.height !== canvas.height) { hc.width = canvas.width; hc.height = canvas.height; }
          const hctx = hc.getContext("2d");
          if (!hctx) { ds.heatLens = "REFUSED"; }
          const mainCtx = ctx;
          const glassAlpha = heat.maxOpacity * 0.72;
          const ctxHeat = hctx ?? ctx;
          ctxHeat.save();
          ctxHeat.setTransform(1, 0, 0, 1, 0, 0);
          ctxHeat.clearRect(0, 0, hc.width, hc.height);
          ctxHeat.setTransform(mainCtx.getTransform());
          let painted = 0;
          let contours = 0;
          // No offscreen context → paint nothing rather than paint unregulated.
          const orderedCells = hctx ? [...heat.cells].sort((a, b) => a.intensity - b.intensity) : [];
          for (const cell of orderedCells) {
            if (!cell.paintable) continue;
            const yh = srs.priceToCoordinate(cell.high);
            const yl = srs.priceToCoordinate(cell.low);
            if (yh == null || yl == null) continue;
            const top = Math.min(+yh, +yl);
            const band = Math.max(1, Math.abs(+yl - +yh));
            const alpha = Math.min(cell.opacity, heat.maxOpacity);
            const tone = heatRampColor(cell.intensity);

            /* THE TIDE IS A TEXTURE OF THE SAME CELL, NOT ANOTHER READING.
               The old renderer filled the whole price band with a flat slab.
               That was honest, but it made a living cost surface read like a
               selected spreadsheet row. The atmosphere below spends no new
               market fact: y remains the segment's observed high/low, colour
               and opacity remain the cost lens's intensity, and the contours
               are evenly spaced INSIDE that measured band. They encode no
               direction, order-book depth, or future path.

               A vertical fade keeps the candle bodies legible at both edges
               of the zone. The selector still owns the hard 0.30 regulator;
               this renderer can only spend less than it was handed. */
            const wash = ctxHeat.createLinearGradient(0, top, 0, top + band);
            wash.addColorStop(0, "rgba(0,0,0,0)");
            wash.addColorStop(0.28, tone);
            wash.addColorStop(0.72, tone);
            wash.addColorStop(1, "rgba(0,0,0,0)");
            ctxHeat.globalAlpha = heat.maxOpacity > 0 ? alpha / heat.maxOpacity : 0;
            ctxHeat.fillStyle = wash;
            ctxHeat.fillRect(0, top, W, band);

            // One to three contour lines: a quiet, deterministic expression
            // of intensity. More expensive travel earns denser texture. The
            // line never leaves the observed high/low band.
            const contourCount = 1 + Math.round(cell.intensity * 2);
            ctxHeat.save();
            ctxHeat.beginPath();
            ctxHeat.rect(0, top, W, band);
            ctxHeat.clip();
            ctxHeat.strokeStyle = tone;
            ctxHeat.lineWidth = 0.7;
            ctxHeat.globalAlpha = heat.maxOpacity > 0 ? Math.min(1, (alpha * 0.9) / heat.maxOpacity) : 0;
            for (let ci = 1; ci <= contourCount; ci++) {
              const y = top + (band * ci) / (contourCount + 1);
              const swell = Math.min(3.5, Math.max(0.7, band * 0.12)) * cell.intensity;
              ctxHeat.beginPath();
              ctxHeat.moveTo(0, y);
              ctxHeat.bezierCurveTo(W * 0.24, y - swell, W * 0.42, y + swell, W * 0.58, y);
              ctxHeat.bezierCurveTo(W * 0.74, y - swell, W * 0.88, y + swell, W, y);
              ctxHeat.stroke();
              contours++;
            }
            ctxHeat.restore();
            painted++;
          }
          ctxHeat.restore();
          if (hctx && painted > 0) {
            mainCtx.save();
            mainCtx.setTransform(1, 0, 0, 1, 0, 0);
            mainCtx.globalAlpha = glassAlpha;
            mainCtx.drawImage(hc, 0, 0);
            mainCtx.restore();
          }
          if (painted > 0) {
            ds.heatLensCells = String(painted);
            ds.heatLensContours = String(contours);
          } else {
            delete ds.heatLensCells;
            delete ds.heatLensContours;
          }
        } else {
          delete ds.heatLensCells;
          delete ds.heatLensContours;
        }
      } catch { /* chart may be mid-transition; safe to skip this frame */ }

      // Release the plot-area clip established right after the data guard.
      ctx.restore();
    };

    // Use a continuous loop so the canvas always stays in sync with chart scroll/zoom
    let running = true;
    const loop = (now: number) => {
      if (!running) return;
      // Dense footprint/profile paint allocates working maps and arrays. Running
      // it at display refresh rate starved input and drove long-session GC churn.
      // LWC price candles remain independently real-time; this governor bounds
      // only the evidence overlay to 30fps (20fps for the heaviest VP modes) and
      // performs no background paint while the tab is hidden.
      const frameBudget = overlayFrameBudgetMs(fixedVPActive || sessionVPActive);
      const verdict = overlayFrameVerdict({ hidden: document.hidden, now, lastDrawAt: lastOverlayDrawAt, frameBudgetMs: frameBudget });

      /* ── B-801 PAINT BUDGET: THE ALLOCATION IS NOW MEASURED, NOT DECLARED ──
         The governor above has always DECLARED the allocation and decided who
         paints. Nothing measured what a paint actually COST, so the running
         app could not be asked whether the budget was being met — and a single
         overlay paint costing 60ms cannot hold a 50ms cadence no matter how
         correct the pacing arithmetic is. The governor cannot catch that: it
         decides BEFORE the paint, and the cost is only knowable after.

         The ledger re-bases itself whenever the allocation moves (toggling a
         profile takes 33ms → 50ms), so the figures on the glass are always
         measured against the contract currently in force. */
      paintLedger = withPaintBudget(paintLedger, frameBudget);

      if (verdict.draw) {
        lastOverlayDrawAt = now;
        const startedAt = performance.now();
        draw();
        paintLedger = recordPaint(paintLedger, performance.now() - startedAt);
        // draw() has just republished the receipt, so nothing is being withheld.
        if (canvasRef.current) delete canvasRef.current.dataset.vpSuspended;
        // Published on paint only — at most ~30 writes/sec, and a frame that
        // did not paint has nothing new to say about what painting costs.
        const ds = canvasRef.current?.dataset;
        if (ds) for (const [k, v] of Object.entries(paintLedgerReceipt(paintLedger))) ds[k] = v;
      } else if (verdict.skipped) {
        // Every non-painting frame is counted, INCLUDING an ordinary BUDGET
        // skip — that count is the denominator. "4 paints" means nothing
        // without "and 96 frames deliberately declined".
        paintLedger = recordSkip(paintLedger, verdict.skipped);
      }

      if (!verdict.draw && verdict.skipped !== "BUDGET") {
        /*
          THE OVERLAY IS SUSPENDED, AND SAYS SO.

          A BUDGET skip is ordinary pacing — the previous paint is still on the
          screen and its `data-vp-*` receipt is still true, so there is nothing
          to report. HIDDEN and BAD_CLOCK are different: the paint has stopped,
          and with it the only publisher of the VP receipt. On a tab that loads
          hidden the receipt is never written once, and `runWMVP` defines an
          ABSENT `data-vp-*` as "no profile was requested" — so a requested
          profile would be indistinguishable from an unrequested one.

          This attribute is the one honest thing that can be said from here. It
          is deliberately NOT a rendered notice: the condition it reports is that
          nobody is looking at this tab, so there is no one to render it to. The
          §5 obligation is to the reader who arrives afterwards — a probe, a
          proof harness, or the next frame — and an attribute reaches all three.

          Only stamped when a profile was actually asked for; on a chart with VP
          switched off, a hidden tab is withholding nothing.
        */
        const ds = canvasRef.current?.dataset;
        if (ds) {
          if (fixedVPActive || sessionVPActive) ds.vpSuspended = verdict.skipped === "HIDDEN" ? "hidden" : "bad-clock";
          else delete ds.vpSuspended;
        }
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(rafId); };
    // NOTE: `candles` intentionally NOT a dep — the RAF loop reads barsRef.current
    // each frame, so it stays alive across live ticks (was rebuilding 4x/sec on
    // crypto, which made the VP/footprint flash off). Re-runs only on real config
    // changes below.
  }, [footprintType, footprintEnabled, bigTradesOverlay, candleType, ready, rangeVer, getBarFootprint, getRealBigTradeLevels, getDeltaBubbleLevels, extendedHours, timeframe, fixedVPActive, sessionVPActive, absorptionAnatomyActive, getBarSubProfile]);

  /*
    THE HIDDEN-TAB STAMP CANNOT LIVE INSIDE THE RAF LOOP.

    The governor above computes a HIDDEN verdict and stamps `vpSuspended` from
    the frame callback — but `requestAnimationFrame` DOES NOT FIRE AT ALL in a
    hidden tab. Measured, not assumed: a backgrounded tab produced 0 rAF
    callbacks in 1.5s. So the one branch whose entire purpose is to speak for a
    hidden tab was only ever reachable from a visible one.

    That is worse than silence, because the comment beside it says it handles
    exactly the case it cannot reach: "on a tab that loads hidden the receipt is
    never written once". True, and the cure was placed inside the thing that
    stops running.

    `visibilitychange` fires whether or not frames are being served, so it is
    the correct publisher. This effect stamps on mount (a tab that LOADS hidden
    never gets a transition) and on every transition into hidden.

    It deliberately does NOT clear on the way back to visible. Becoming visible
    is not a paint; the receipt is still absent until `draw()` actually runs and
    deletes the stamp itself. Clearing here would announce a receipt that has
    not been written yet — the same overclaim in the opposite direction.

    BAD_CLOCK stays in the loop: a frozen clock is only observable from a frame.
  */
  const vpRequested = fixedVPActive || sessionVPActive;
  React.useEffect(() => {
    const stamp = () => {
      const ds = canvasRef.current?.dataset;
      if (!ds) return;
      if (document.hidden && vpRequested) ds.vpSuspended = "hidden";
      else if (!vpRequested) delete ds.vpSuspended;
    };
    stamp();
    document.addEventListener("visibilitychange", stamp);
    return () => document.removeEventListener("visibilitychange", stamp);
  }, [vpRequested]);

  /* ── Derived display values ─────────────────────────────── */
  // openPrice is the OPEN of the first loaded bar (see setOpenPrice at load time),
  // which on a multi-day intraday range is NOT today's session open. Using it as a
  // change reference produced a fabricated ~ -18.78% header on TSLA when the real
  // day-change was +0.06%. Only trust a change value that came from a real quote
  // provider (ticker.change/changePct). Otherwise render "—" and label truthfully.
  // useWebSocket.flush() only writes change/changePct once prevCloseRef holds a
  // REAL prior close; until then it leaves them at their initial 0 while still
  // updating price. Finiteness alone therefore does NOT prove a provider
  // reference exists — 0 and 0 are perfectly finite. Observed on prod:
  // "381.33 +0.00 (+0.00%)" rendered in green beside HISTORICAL BARS VERIFIED
  // while the tape showed TSLA +24.04 (+6.73%) for the same symbol.
  // Sibling of the ChartsDashboard header fix (00373bd).
  const hasProviderChange = Number.isFinite(ticker.change)
    && Number.isFinite(ticker.changePct)
    && !(ticker.change === 0 && ticker.changePct === 0);
  const change    = hasProviderChange ? (ticker.change as number) : 0;
  // The local `changePct` string and the `up` boolean used to live here and be
  // formatted into the header inline. Both are gone, not moved: the compiler
  // below owns formatting AND the three-state direction (an exactly-zero change
  // is flat, never "up"), and a second copy of either would agree with it only
  // until someone edited one of them.
  const last      = candles[candles.length - 1];
  const dp        = base < 10 ? 4 : 2;
  /**
   * WHICH OF THE TWO PLACES RENDERS THE TRADED QUANTITY — decided once, here.
   *
   * F24 puts `Vol` in the footer band and keeps it OUT of the floating O/H/L/C
   * legend. This build had it in the legend, because until the footer band was
   * reserved there was nowhere else for it to go. Both is not an option: two
   * DOM nodes rendering one number is the exact shape of the `NO FEED` defect
   * that shipped twice on this chart in two different nodes and had to be
   * fixed twice.
   *
   * Tied to `setTimeframe` rather than to a new prop because that is already
   * the condition under which the band physically exists (see the
   * `paddingBottom` note on the pane). The compare pane and the pinned 5m/15m
   * panes get no setter and therefore no band, so for them this is false and
   * the legend keeps the cell — the figure is on screen exactly once in every
   * configuration, and there is no configuration where it is on screen zero
   * times.
   */
  const volumeInFooter = Boolean(setTimeframe);
  // The change cell is COMPILED, not composed inline — the same compiler the
  // chrome header uses, so the two rows on this screen cannot answer one
  // question two ways. `dp` travels with it because this module knows the
  // instrument's precision and the compiler only ever sees a delta: without it
  // a real sub-cent move on a sub-$10 instrument would print "+0.00", a flat
  // bar manufactured by the formatter rather than observed in the data.
  /**
   * THE LARGEST PRICE GLYPH ON THE PRODUCT WAS THE ONE THAT WASN'T COMPILED.
   *
   * MEASURED LIVE on https://wealthymindsetspro.com/charts, NQ1! 30m,
   * 2026-09-17, in one DOM read of the authenticated Founder landing:
   *
   *   y=101  chrome header : "29709.75 LAST 30m BAR CLOSE"
   *   y=173  THIS cell     : "29,708.75"   title="Last bar close — not a live quote."
   *   y=176  OHLCV strip   : "NOW 29708.75" title="This 30m bar has not closed
   *                           yet — it has no close."
   *   y=194  decision rail : "29709.75 LAST 30m BAR CLOSE"
   *
   * Two numbers for one instrument at one instant, both wearing the words "bar
   * close" — canon Weakness #1, in the Founder's first viewport, in the biggest
   * type on the page. And the disagreement is not a race: the tape was shut,
   * the bars were frozen, and the two answers were stable.
   *
   * This cell was reading `lastPrice`, the chart's running last value, which
   * tracks the FORMING bar. Its own neighbour two elements to the right says
   * out loud that a forming bar "has no close" — and this cell called that same
   * number a close anyway. It did not merely disagree with the compiler; it
   * asserted the one thing chartHeaderPriceFact exists to forbid, that a bar
   * close may never wear a live quote's clothes, in reverse.
   *
   * The change cell directly beside this one was migrated to the shared
   * compiler for exactly this reason ("the two rows on this screen cannot
   * answer one question two ways"). The price cell was the last holdout in the
   * same row. `dp` travels with it for the same reason it travels with the
   * change: this module knows the instrument's precision and the compiler,
   * being pure, cannot.
   *
   * Honest about what this costs: the number loses its thousands separator,
   * because the compiler owns the text and does not group. That reads as a
   * regression for one second and is not one — the price AXIS a few pixels
   * below has always rendered `29800.00` ungrouped, so the header now agrees
   * with the scale it sits on instead of with itself.
   */
  const headerPriceFact = chartHeaderPriceFact(
    ticker.price,
    deriveLastBarClose(candles, timeframe, Date.now()),
    candleSource !== "",
    dp,
    // SILENCE IS NOT CERTIFICATION — and TWO CALL SITES OF ONE COMPILER MAY
    // NOT ANSWER ONE QUESTION TWO WAYS.
    //
    // MEASURED on the serving host 2026-09-20, BTCUSDT, ONE viewport: the
    // ChartsDashboard call site (which passes `source`) resolved
    // UNCERTIFIED_QUOTE, while THIS call site — which did not — resolved
    // LIVE_QUOTE and printed a bare `81224.01` in the largest type on the
    // page. Same compiler, same instrument, same instant, opposite verdicts,
    // and the one the trader could actually see was the undisciplined one.
    //
    // `source` is useWebSocket's own verdict on whether it could vouch for
    // this quote's provenance (destructured above with `ticker` itself); when
    // it is still at the "unavailable" sentinel the product has DECLINED to
    // certify, and this cell may not print the number bare as though it had.
    //
    // `dp` above is explicit and MUST stay that way: `decimals` sits between
    // and defaults, so passing the source without it would land a vendor
    // string in the decimal slot.
    source,
  );

  const headerChangeFact = chartHeaderChangeFact(
    hasProviderChange ? { chg: change, pct: ticker.changePct as number } : null,
    deriveBarOverBarChange(candles, timeframe, Date.now()),
    dp,
    // Same fact, same source, as the fidelity chip below: `candleSource` is ""
    // only until the bars fetch settles. Until then this row must not print
    // "— (change unavailable)", which names a provider that answered — none
    // has. The evidence was already in this component; it only had to be passed.
    candleSource !== "",
  );

  /* ── Fullscreen handler ─────────────────────────────────── */
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      if (onRequestFullscreen) {
        onRequestFullscreen();
      } else {
        wrapRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
      }
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, [onRequestFullscreen]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  /* ── Keyboard shortcuts ──────────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      switch (e.key) {
        // Escape always exits drawing mode → mouse returns to normal chart use
        case "Escape": { inProgressRef.current = null; previewPtRef.current = null; setSelectedIdx(null); setRangeVer(v => v + 1); onDrawingComplete?.(); break; }
        case "f": case "F": toggleFullscreen(); break;
        case "l": case "L": setLogScale(v => !v); break;
        case "p": case "P": setPctMode(v => !v); break;
        case "a": case "A": setAutoScale(v => !v); break;
        case "d": case "D": setDataWindowOpen(v => !v); break;
        // Delete/Backspace: remove the selected drawing (else the most recent)
        case "Delete": case "Backspace": {
          const sel = selectedIdxRef.current;
          if (sel != null && drawingsRef.current[sel]) {
            drawingsRef.current.splice(sel, 1);
            setSelectedIdx(null);
          } else if (drawingsRef.current.length > 0) {
            drawingsRef.current.pop();
          }
          setRangeVer(v => v + 1);
          break;
        }
        case "+": case "=": {
          try {
            const ts = chartRef.current?.timeScale();
            const bs = ts?.options()?.barSpacing ?? 8;
            ts?.applyOptions({ barSpacing: Math.min(50, bs * 1.3) });
          } catch {} break;
        }
        case "-": case "_": {
          try {
            const ts = chartRef.current?.timeScale();
            const bs = ts?.options()?.barSpacing ?? 8;
            ts?.applyOptions({ barSpacing: Math.max(2, bs / 1.3) });
          } catch {} break;
        }
        case "Home": {
          try { chartRef.current?.timeScale().fitContent(); } catch {} break;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleFullscreen]);

  /* ── Drawing tools canvas rendering ─────────────────────────── */
  type Pt = { x: number; y: number };
  const renderDrawings = useCallback(() => {
    const canvas = drawCanvasRef.current;
    const cont   = containerRef.current;
    if (!canvas || !cont) return;
    const W = cont.offsetWidth, H = cont.offsetHeight;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const toPx  = (p: LogicalPt): Pt | null => logicalToPixel(p);
    const priceY = (pr: number): number | null => { const y = candleRef.current?.priceToCoordinate(pr); return y == null ? null : +y; };
    const timeX  = (tm: number): number | null => { const x = chartRef.current?.timeScale().timeToCoordinate(tm as any); return x == null ? null : +x; };
    const dec = base > 100 ? 2 : base > 1 ? 3 : 5;
    const dashArr = (st: DrawStyle): number[] => st.dash === "dashed" ? [7, 5] : st.dash === "dotted" ? [2, 4] : [];
    const rayToEdge = (a: Pt, dx: number, dy: number): Pt => {
      let tB = Infinity;
      if (dx > 1e-6) tB = Math.min(tB, (W - a.x) / dx); else if (dx < -1e-6) tB = Math.min(tB, (0 - a.x) / dx);
      if (dy > 1e-6) tB = Math.min(tB, (H - a.y) / dy); else if (dy < -1e-6) tB = Math.min(tB, (0 - a.y) / dy);
      if (!isFinite(tB) || tB < 0) tB = 0;
      return { x: a.x + dx * tB, y: a.y + dy * tB };
    };
    const seg = (a: Pt, b: Pt) => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); };
    const arrowHead = (a: Pt, b: Pt, len = 11) => {
      const ang = Math.atan2(b.y - a.y, b.x - a.x); ctx.beginPath();
      ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - len * Math.cos(ang - Math.PI / 6), b.y - len * Math.sin(ang - Math.PI / 6));
      ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - len * Math.cos(ang + Math.PI / 6), b.y - len * Math.sin(ang + Math.PI / 6));
      ctx.stroke();
    };
    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    };
    const chip = (txt: string, x: number, y: number, colr: string) => {
      ctx.setLineDash([]); ctx.font = "600 10px ui-sans-serif, system-ui";
      const w = ctx.measureText(txt).width + 8;
      ctx.fillStyle = "rgba(10,12,20,0.85)"; roundRect(x, y - 13, w, 15, 3); ctx.fill();
      ctx.fillStyle = colr; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(txt, x + 4, y - 5);
    };

    // `no-levels` is one global live-tape absence, even when several saved
    // Delta+VP boxes ask the same question. Keep one price-canvas instrument
    // per frame and disclose how many drawings it governs. Box-size refusals
    // remain local because each one has a different repair.
    const groupedNoLevels = { count: 0 };
    // This is capability status for the whole current tape, not a market event
    // at any saved box's price. Keep it on the chart edge where FL-06 places
    // global instrument truth; spatial callouts remain reserved for real bars
    // and selected objects.
    const groupedNoLevelsAnchor = { x: 16, y: 62, color: "#8B92AC" } as const;

    const drawOne = (d: Drawing, selected: boolean) => {
      const s = d.style, t = d.tool, col = s.color, fillCol = col + "22";
      const P = d.pts.map(toPx);
      ctx.save();
      if (s.opacity != null && s.opacity < 1) ctx.globalAlpha = s.opacity;
      ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.strokeStyle = col; ctx.fillStyle = col;
      ctx.lineWidth = Math.max(0.5, s.width);
      ctx.setLineDash(dashArr(s));
      const A = P[0], B = P[1], C = P[2], D2 = P[3];

      // ── LINES ──
      if (t === "trendline" || t === "info-line" || t === "trend-angle" || t === "ray" || t === "extended-line" || t === "arrow") {
        if (A && B) {
          if (t === "ray") seg(A, rayToEdge(A, B.x - A.x, B.y - A.y));
          else if (t === "extended-line") seg(rayToEdge(A, A.x - B.x, A.y - B.y), rayToEdge(B, B.x - A.x, B.y - A.y));
          else seg(A, B);
          if (t === "arrow") { ctx.setLineDash([]); arrowHead(A, B); }
          if (t === "info-line") { const dp = d.pts[1].price - d.pts[0].price; const pct = d.pts[0].price ? dp / Math.abs(d.pts[0].price) * 100 : 0; chip(`${dp >= 0 ? "+" : ""}${dp.toFixed(dec)} (${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%)`, (A.x + B.x) / 2, (A.y + B.y) / 2, col); }
          if (t === "trend-angle") { const ang = Math.atan2(-(B.y - A.y), B.x - A.x) * 180 / Math.PI; ctx.save(); ctx.globalAlpha = 0.5; ctx.setLineDash([3, 3]); seg(A, { x: A.x + 44, y: A.y }); ctx.restore(); chip(`${ang.toFixed(1)}°`, B.x + 6, B.y, col); }
        } else if (A) seg(A, A);
      }
      // ── HORIZONTAL / VERTICAL / CROSS ──
      else if (t === "hline" || t === "hray") { const y = priceY(d.pts[0].price); if (y != null) { let x0 = 0; if (t === "hray") { const xx = timeX(d.pts[0].time); x0 = xx == null ? 0 : xx; } seg({ x: x0, y }, { x: W, y }); chip(d.pts[0].price.toFixed(dec), Math.max(x0, 0) + 2, y - 2, col); } }
      else if (t === "vline") { const x = timeX(d.pts[0].time); if (x != null) seg({ x, y: 0 }, { x, y: H }); }
      else if (t === "crossline") { if (A) { seg({ x: 0, y: A.y }, { x: W, y: A.y }); seg({ x: A.x, y: 0 }, { x: A.x, y: H }); } }
      // ── RECT / CHANNEL(box) ──
      else if (t === "rect" || t === "channel") { if (A && B) { const rx = Math.min(A.x, B.x), ry = Math.min(A.y, B.y), rw = Math.abs(B.x - A.x), rh = Math.abs(B.y - A.y); const fullPane = rw > W * 0.92 && rh > H * 0.92; if (s.fill && !fullPane) { ctx.fillStyle = fillCol; ctx.fillRect(rx, ry, rw, rh); } ctx.strokeRect(rx, ry, rw, rh); } }
      // ── ANCHORED RANGE VP (P-110 #8 · FIXED / anchored) ──
      // The trader's two points fix a TIME span; the profile is every bar in
      // it, from bars alone (no aggressor side), through the same engine the
      // Visible Range uses. Anchored to times, so scrolling moves the box with
      // its bars and never re-profiles a different span.
      else if (t === "anchored-vp") {
        if (A && B) {
          const tLo = Math.min(d.pts[0].time, d.pts[1].time);
          const tHi = Math.max(d.pts[0].time, d.pts[1].time);
          const vm = selectTimeRangeProfile(barsRef.current || [], tLo, tHi);
          const x0 = Math.min(A.x, B.x);
          const x1 = Math.max(A.x, B.x);
          const rw = Math.max(1, x1 - x0);
          ctx.save();
          ctx.setLineDash([]);
          if (vm.drawn) {
            // The box spans the bars' own price range, not the drag's y: a
            // fixed range is a span of TIME, and its prices are what traded.
            const ys = vm.rows.map(r => priceY(r.price)).filter((v): v is number => v != null);
            const yTop = Math.min(...ys) - 4;
            const yBot = Math.max(...ys) + 4;
            ctx.fillStyle = "rgba(201,165,92,0.05)";
            ctx.fillRect(x0, yTop, rw, yBot - yTop);
            ctx.strokeStyle = "rgba(201,165,92,0.7)";
            ctx.lineWidth = 1;
            ctx.strokeRect(x0 + 0.5, yTop + 0.5, rw - 1, yBot - yTop - 1);
            const sorted = [...ys].sort((a, b) => a - b);
            let rowH = 2;
            if (sorted.length >= 2) {
              const gaps: number[] = [];
              for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i - 1]);
              rowH = Math.max(2, Math.min(10, Math.round(gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)] || 2)));
            }
            const maxW = Math.max(12, Math.min(rw - 4, 180));
            for (const r of vm.rows) {
              const y = priceY(r.price);
              if (y == null) continue;
              const w = Math.max(1, Math.round(r.share * maxW));
              ctx.fillStyle = r.isPoc ? "rgba(201,165,92,0.85)" : r.insideValueArea ? "rgba(237,230,211,0.45)" : "rgba(194,184,146,0.22)";
              ctx.fillRect(x0 + 2, Math.round(y) - Math.floor(rowH / 2), w, Math.max(1, rowH - 1));
            }
            const hline = (price: number | null, ink: string, dash: number[]) => {
              if (price == null) return;
              const y = priceY(price);
              if (y == null) return;
              ctx.strokeStyle = ink; ctx.setLineDash(dash);
              ctx.beginPath(); ctx.moveTo(x0, Math.round(y) + 0.5); ctx.lineTo(x1, Math.round(y) + 0.5); ctx.stroke();
              ctx.setLineDash([]);
            };
            hline(vm.poc, "rgba(201,165,92,0.9)", []);
            hline(vm.vah, "rgba(237,230,211,0.5)", [3, 4]);
            hline(vm.val, "rgba(237,230,211,0.5)", [3, 4]);
            const est = vm.quality === "trade-based" ? "" : " · CANDLE-EST";
            chip(`ANCHORED RANGE · ${vm.barsInView} BARS · POC ${vm.poc?.toFixed(2)}${est}`, x0 + 2, yTop - 3, "#C9A55C");
          } else {
            // Named refusal, where the trader dragged — never an empty box.
            ctx.strokeStyle = "rgba(240,180,41,0.6)";
            ctx.setLineDash([4, 4]);
            const ry = Math.min(A.y, B.y), rh = Math.max(1, Math.abs(B.y - A.y));
            ctx.strokeRect(x0 + 0.5, ry + 0.5, rw - 1, rh - 1);
            ctx.setLineDash([]);
            const why = vm.reason === "TOO_FEW_BARS_IN_VIEW"
              ? `${vm.barsInView} bars in the span — drag across at least 5`
              : vm.reason === "NO_VOLUME" ? "the bars in this span carry no volume" : "no span";
            chip(`ANCHORED RANGE · ${why}`, x0 + 2, ry - 3, "#F0B429");
          }
          ctx.restore();
        }
      }
      // ── DELTA + VOLUME PROFILE BOX (order flow) ──
      // Left column = per-price DELTA profile (buy−sell), right column = VOLUME
      // profile (ask=green / bid=red, POC=gold). Aggregated from getBarFootprint —
      // real executed-trade data where captured; bars without tape stay empty. Numbers
      // on every row: signed delta at the center gutter, total volume at the edge.
      else if (t === "delta-vp") {
        if (A && B) {
          const rx = Math.min(A.x, B.x), ry = Math.min(A.y, B.y);
          const rw = Math.abs(B.x - A.x), rh = Math.abs(B.y - A.y);
          ctx.save();
          ctx.setLineDash([]);
          ctx.fillStyle = col + "0E"; ctx.fillRect(rx, ry, rw, rh);
          ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.strokeRect(rx, ry, rw, rh);

          const pLo = Math.min(d.pts[0].price, d.pts[1].price);
          const pHi = Math.max(d.pts[0].price, d.pts[1].price);
          const tLo = Math.min(d.pts[0].time, d.pts[1].time);
          const tHi = Math.max(d.pts[0].time, d.pts[1].time);
          const bs  = (barsRef.current || []).filter((x: LegacyOhlcvTuple) => x.time >= tLo && x.time <= tHi);
          const nBins = dvpBinCount(rh);
          const levels: DeltaVPLevel[] = [];
          for (const b of bs) for (const l of getBarFootprint(b, 14)) levels.push({ priceLevel: l.priceLevel, bid: l.bid, ask: l.ask });
          const dvp = computeDeltaVP(levels, pLo, pHi, nBins);
          const fmtN = dvpFormatCount;

          if (dvpBoxAdmitsProfile(rw, rh, dvp.rows.length)) {
            const cols = dvpColumns(rx, rw);
            const { midX, leftW, rightW } = cols;
            const gap = DVP_GUTTER;
            ctx.save();
            ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.clip();
            for (const row of dvp.rows) {
              const yT = priceY(row.hiPrice), yB = priceY(row.loPrice);
              if (yT == null || yB == null) continue;
              const rowBox = dvpRowBox(yT, yB);
              if (dvpRowCulled(rowBox, ry, rh)) continue;
              const { top: rowTop, height: rowH, midY } = rowBox;
              const isPOC = row.price === dvp.pocPrice;

              // Every rectangle this row paints is decided by dvpRowPaint, which
              // a test can hold. What stays here is colour and compositing —
              // the only part a canvas has to own.
              const paint = dvpRowPaint({
                row: rowBox,
                columns: cols,
                volumeFraction: dvp.maxVolume ? row.volume / dvp.maxVolume : 0,
                deltaFraction: dvp.maxAbsDelta ? Math.abs(row.delta) / dvp.maxAbsDelta : 0,
                buy: row.buy,
                volume: row.volume,
                isPOC,
              });
              const up = row.delta >= 0;

              // RIGHT — volume profile, grows rightward from the gutter
              if (paint.ask && paint.bid) {
                ctx.fillStyle = "rgba(0,192,118,0.58)";
                ctx.fillRect(paint.ask.x, paint.ask.y, paint.ask.w, paint.ask.h);
                ctx.fillStyle = "rgba(255,77,103,0.58)";
                ctx.fillRect(paint.bid.x, paint.bid.y, paint.bid.w, paint.bid.h);
              } else {
                ctx.fillStyle = "rgba(240,180,41,0.85)";
                ctx.fillRect(paint.volume.x, paint.volume.y, paint.volume.w, paint.volume.h);
              }

              // LEFT — delta profile, grows leftward from the gutter
              ctx.fillStyle = up ? "rgba(0,212,170,0.72)" : "rgba(255,77,106,0.72)";
              ctx.fillRect(paint.delta.x, paint.delta.y, paint.delta.w, paint.delta.h);

              // numbers — signed delta at the gutter, volume at the right edge
              if (rowH >= DVP_MIN_LABEL_ROW_H) {
                ctx.font = "10px monospace"; ctx.textBaseline = "middle";
                ctx.shadowColor = "rgba(0,0,0,0.92)"; ctx.shadowBlur = 3;
                ctx.textAlign = "right"; ctx.fillStyle = up ? "#25E8BE" : "#FF6B82";
                ctx.fillText(`${up ? "+" : "−"}${fmtN(row.delta)}`, midX - gap - 2, midY);
                ctx.fillStyle = "#EAF0F6";
                ctx.fillText(fmtN(row.volume), rx + rw - 3, midY);
                ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
              }
            }
            ctx.restore();

            // center gutter divider + column captions + totals header
            ctx.strokeStyle = col + "66"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
            ctx.beginPath(); ctx.moveTo(midX, ry); ctx.lineTo(midX, ry + rh); ctx.stroke(); ctx.setLineDash([]);
            const netUp = dvp.totalDelta >= 0;
            chip(`Delta+VP  net ${netUp ? "+" : "−"}${fmtN(dvp.totalDelta)}  vol ${fmtN(dvp.totalVolume)}`, rx + 2, ry - 3, col);
            ctx.font = "9px ui-sans-serif"; ctx.textBaseline = "top";
            ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 2; ctx.fillStyle = "#8B95A5"; ctx.textAlign = "center";
            if (leftW  > DVP_MIN_CAPTION_W) ctx.fillText("DELTA",  (rx + midX) / 2, ry + 2);
            if (rightW > DVP_MIN_CAPTION_W) ctx.fillText("VOLUME", (midX + rx + rw) / 2, ry + 2);
            ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
          } else {
            // WHY not one sentence: the refusal has three unrelated causes and
            // only two of them can be fixed by resizing. Observed live on
            // 2026-09-15 (TSLA 15m) a ~548x142px box — an order of magnitude past
            // both minimums — telling the trader to "draw a wider box". The cause
            // was no per-level data. Naming the real obstacle is the fix.
            const refusal = dvpProfileRefusal(rw, rh, dvp.rows.length);
            if (refusal === "no-levels") {
              groupedNoLevels.count += 1;
            } else {
              chip(dvpRefusalMessage(refusal), rx + 2, ry - 3, col);
            }
          }
          ctx.restore();
        }
      }
      else if (t === "circle") { if (A && B) { const r = Math.hypot(B.x - A.x, B.y - A.y); ctx.beginPath(); ctx.arc(A.x, A.y, r, 0, Math.PI * 2); if (s.fill) { ctx.fillStyle = fillCol; ctx.fill(); } ctx.stroke(); } }
      else if (t === "ellipse") { if (A && B) { const cx = (A.x + B.x) / 2, cy = (A.y + B.y) / 2, rx = Math.max(Math.abs(B.x - A.x) / 2, 1), ry = Math.max(Math.abs(B.y - A.y) / 2, 1); ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); if (s.fill) { ctx.fillStyle = fillCol; ctx.fill(); } ctx.stroke(); } }
      else if (t === "triangle") { if (A && B && C) { ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.lineTo(C.x, C.y); ctx.closePath(); if (s.fill) { ctx.fillStyle = fillCol; ctx.fill(); } ctx.stroke(); } else if (A && B) seg(A, B); }
      else if (t === "rotated-rect") { if (A && B && C) { const vx = B.x - A.x, vy = B.y - A.y, len = Math.hypot(vx, vy) || 1, nx = -vy / len, ny = vx / len, dd = (C.x - B.x) * nx + (C.y - B.y) * ny, ox = nx * dd, oy = ny * dd; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.lineTo(B.x + ox, B.y + oy); ctx.lineTo(A.x + ox, A.y + oy); ctx.closePath(); if (s.fill) { ctx.fillStyle = fillCol; ctx.fill(); } ctx.stroke(); } else if (A && B) seg(A, B); }
      else if (t === "arc" || t === "curve") { if (A && B && C) { ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(C.x, C.y, B.x, B.y); ctx.stroke(); } else if (A && B) seg(A, B); }
      else if (t === "double-curve") { if (A && B && C && D2) { ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.bezierCurveTo(B.x, B.y, C.x, C.y, D2.x, D2.y); ctx.stroke(); } else if (A && B) seg(A, B); }
      // ── CHANNELS ──
      else if (t === "parallel-channel") { if (A && B) { if (C) { const vx = B.x - A.x, vy = B.y - A.y, len = Math.hypot(vx, vy) || 1, nx = -vy / len, ny = vx / len, dd = (C.x - A.x) * nx + (C.y - A.y) * ny, ox = nx * dd, oy = ny * dd; if (s.fill) { ctx.fillStyle = fillCol; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.lineTo(B.x + ox, B.y + oy); ctx.lineTo(A.x + ox, A.y + oy); ctx.closePath(); ctx.fill(); } seg(A, B); seg({ x: A.x + ox, y: A.y + oy }, { x: B.x + ox, y: B.y + oy }); ctx.save(); ctx.globalAlpha = 0.5; ctx.setLineDash([4, 4]); seg({ x: A.x + ox / 2, y: A.y + oy / 2 }, { x: B.x + ox / 2, y: B.y + oy / 2 }); ctx.restore(); } else seg(A, B); } }
      else if (t === "flat-channel") { if (A && B) { const x0 = Math.min(A.x, B.x), x1 = Math.max(A.x, B.x); seg({ x: x0, y: A.y }, { x: x1, y: A.y }); if (C) { seg({ x: x0, y: C.y }, { x: x1, y: C.y }); if (s.fill) { ctx.fillStyle = fillCol; ctx.fillRect(x0, Math.min(A.y, C.y), x1 - x0, Math.abs(C.y - A.y)); } } } }
      else if (t === "disjoint-channel") { if (A && B) seg(A, B); if (C && D2) seg(C, D2); if (A && B && C && D2 && s.fill) { ctx.fillStyle = fillCol; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.lineTo(D2.x, D2.y); ctx.lineTo(C.x, C.y); ctx.closePath(); ctx.fill(); } }
      else if (t === "regression") { if (A && B) { let done = false; try { const t0 = Math.min(d.pts[0].time, d.pts[1].time), t1 = Math.max(d.pts[0].time, d.pts[1].time); const bs = (barsRef.current || []).filter((bar: any) => bar.time >= t0 && bar.time <= t1); if (bs.length >= 2) { const n = bs.length; let sx = 0, sy = 0, sxy = 0, sxx = 0; bs.forEach((bar: any, i: number) => { sx += i; sy += bar.close; sxy += i * bar.close; sxx += i * i; }); const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1), intc = (sy - slope * sx) / n; let ss = 0; bs.forEach((bar: any, i: number) => { const r = bar.close - (intc + slope * i); ss += r * r; }); const sd = Math.sqrt(ss / n); const pa = logicalToPixel({ price: intc, time: bs[0].time }), pb = logicalToPixel({ price: intc + slope * (n - 1), time: bs[n - 1].time }); if (pa && pb) { seg(pa, pb); [2, -2].forEach(k => { const u0 = logicalToPixel({ price: intc + k * sd, time: bs[0].time }), u1 = logicalToPixel({ price: intc + slope * (n - 1) + k * sd, time: bs[n - 1].time }); if (u0 && u1) { ctx.save(); ctx.globalAlpha = 0.7; ctx.setLineDash([4, 3]); seg(u0, u1); ctx.restore(); } }); done = true; } } } catch { /* fall back */ } if (!done) seg(A, B); } }
      // ── PITCHFORKS ──
      else if (t === "pitchfork" || t === "schiff" || t === "modified-schiff" || t === "inside-pitchfork") { if (A && B && C) { let origin = A; const mid = { x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 }; if (t === "schiff") origin = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }; else if (t === "modified-schiff") origin = { x: (A.x + B.x) / 2, y: A.y }; const dx = mid.x - origin.x, dy = mid.y - origin.y; if (s.fill) { ctx.fillStyle = fillCol; const eb = rayToEdge(B, dx, dy), ec = rayToEdge(C, dx, dy); ctx.beginPath(); ctx.moveTo(B.x, B.y); ctx.lineTo(eb.x, eb.y); ctx.lineTo(ec.x, ec.y); ctx.lineTo(C.x, C.y); ctx.closePath(); ctx.fill(); } seg(origin, rayToEdge(mid, dx, dy)); seg(B, rayToEdge(B, dx, dy)); seg(C, rayToEdge(C, dx, dy)); ctx.save(); ctx.globalAlpha = 0.6; ctx.setLineDash([3, 3]); seg(B, C); ctx.restore(); } else if (A && B) seg(A, B); }
      // ── FIBONACCI ──
      else if (t === "fibonacci") { if (A && B) { const x0 = Math.min(A.x, B.x), x1 = Math.max(A.x, B.x); FIB_LEVELS.forEach((lv, i) => { const price = d.pts[0].price + (d.pts[1].price - d.pts[0].price) * lv; const y = priceY(price); if (y == null) return; ctx.strokeStyle = FIB_COLORS[i] || col; seg({ x: x0, y }, { x: x1, y }); ctx.fillStyle = FIB_COLORS[i] || col; ctx.font = "600 9px monospace"; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText(`${lv.toFixed(3)}  ${price.toFixed(dec)}`, x0 + 2, y - 1); }); } }
      else if (t === "fib-ext") { if (A && B) { if (C) { const range = d.pts[1].price - d.pts[0].price; const x0 = Math.min(A.x, B.x, C.x), x1 = Math.max(A.x, B.x, C.x); ctx.save(); ctx.globalAlpha = 0.5; ctx.setLineDash([3, 3]); seg(A, B); seg(B, C); ctx.restore(); FIB_LEVELS.forEach((lv, i) => { const price = d.pts[2].price + range * lv; const y = priceY(price); if (y == null) return; ctx.strokeStyle = FIB_COLORS[i] || col; seg({ x: x0, y }, { x: x1, y }); chip(`${lv.toFixed(3)} ${price.toFixed(dec)}`, x1 - 78, y - 1, FIB_COLORS[i] || col); }); } else seg(A, B); } }
      else if (t === "fib-channel") { if (A && B) { if (C) { const vx = B.x - A.x, vy = B.y - A.y, len = Math.hypot(vx, vy) || 1, nx = -vy / len, ny = vx / len, dd = (C.x - A.x) * nx + (C.y - A.y) * ny; [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1].forEach((lv, i) => { const ox = nx * dd * lv, oy = ny * dd * lv; ctx.strokeStyle = FIB_COLORS[i] || col; seg({ x: A.x + ox, y: A.y + oy }, { x: B.x + ox, y: B.y + oy }); }); } else seg(A, B); } }
      else if (t === "fib-timezone" || t === "fib-time") { if (A && B) { const step = B.x - A.x; const origin = (t === "fib-time" && C) ? C : A; const fibs = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55]; ctx.setLineDash([4, 3]); fibs.forEach(f => { const x = origin.x + step * f; if (x < 0 || x > W) return; seg({ x, y: 0 }, { x, y: H }); }); } }
      else if (t === "fib-speed-fan") { if (A && B) { ctx.save(); ctx.globalAlpha = 0.4; ctx.strokeRect(Math.min(A.x, B.x), Math.min(A.y, B.y), Math.abs(B.x - A.x), Math.abs(B.y - A.y)); ctx.restore(); [0.236, 0.382, 0.5, 0.618, 0.786, 1].forEach((lv, i) => { ctx.strokeStyle = FIB_COLORS[i + 1] || col; seg(A, { x: B.x, y: A.y + (B.y - A.y) * lv }); seg(A, { x: A.x + (B.x - A.x) * lv, y: B.y }); }); } }
      else if (t === "fib-circles") { if (A && B) { const R = Math.hypot(B.x - A.x, B.y - A.y); [0.236, 0.382, 0.5, 0.618, 1, 1.618].forEach((lv, i) => { ctx.strokeStyle = FIB_COLORS[i] || col; ctx.beginPath(); ctx.arc(A.x, A.y, R * lv, 0, Math.PI * 2); ctx.stroke(); }); } }
      else if (t === "fib-spiral") { if (A && B) { const bR = Math.max(Math.hypot(B.x - A.x, B.y - A.y) / 12, 3), phi = 1.61803; ctx.beginPath(); let first = true; for (let th = 0; th <= Math.PI * 8; th += 0.14) { const r = bR * Math.pow(phi, th / (Math.PI / 2)); const x = A.x + r * Math.cos(th), y = A.y + r * Math.sin(th); if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y); if (r > W + H) break; } ctx.stroke(); } }
      else if (t === "fib-arcs") { if (A && B) { const R = Math.hypot(B.x - A.x, B.y - A.y), ang = Math.atan2(B.y - A.y, B.x - A.x); [0.382, 0.5, 0.618, 1].forEach((lv, i) => { ctx.strokeStyle = FIB_COLORS[i + 1] || col; ctx.beginPath(); ctx.arc(A.x, A.y, R * lv, ang - Math.PI / 2, ang + Math.PI / 2); ctx.stroke(); }); } }
      else if (t === "fib-wedge") { if (A && B) { seg(A, rayToEdge(A, B.x - A.x, B.y - A.y)); if (C) { seg(A, rayToEdge(A, C.x - A.x, C.y - A.y)); const R = Math.min(Math.hypot(B.x - A.x, B.y - A.y), Math.hypot(C.x - A.x, C.y - A.y)); const a1 = Math.atan2(B.y - A.y, B.x - A.x), a2 = Math.atan2(C.y - A.y, C.x - A.x); [0.382, 0.618, 1].forEach((lv, i) => { ctx.strokeStyle = FIB_COLORS[i + 1] || col; ctx.beginPath(); ctx.arc(A.x, A.y, R * lv, Math.min(a1, a2), Math.max(a1, a2)); ctx.stroke(); }); } } }
      else if (t === "fib-pitchfan") { if (A && B && C) { const dx = (B.x + C.x) / 2 - A.x, dy = (B.y + C.y) / 2 - A.y; seg(A, rayToEdge({ x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 }, dx, dy)); [0, 0.25, 0.382, 0.5, 0.618, 0.75, 1].forEach((lv, i) => { const fp = { x: B.x + (C.x - B.x) * lv, y: B.y + (C.y - B.y) * lv }; ctx.strokeStyle = FIB_COLORS[i % FIB_COLORS.length] || col; seg(fp, rayToEdge(fp, dx, dy)); }); ctx.save(); ctx.globalAlpha = 0.5; ctx.setLineDash([3, 3]); seg(B, C); ctx.restore(); } else if (A && B) seg(A, B); }
      // ── GANN ──
      else if (t === "gann-box" || t === "gann-square" || t === "gann-square-fixed") { if (A && B) { const x0 = Math.min(A.x, B.x), y0 = Math.min(A.y, B.y), w = Math.abs(B.x - A.x), h = Math.abs(B.y - A.y); ctx.strokeRect(x0, y0, w, h); ctx.save(); ctx.globalAlpha = 0.45; [0.25, 0.5, 0.75].forEach(f => { seg({ x: x0 + w * f, y: y0 }, { x: x0 + w * f, y: y0 + h }); seg({ x: x0, y: y0 + h * f }, { x: x0 + w, y: y0 + h * f }); }); ctx.globalAlpha = 0.7; seg({ x: x0, y: y0 }, { x: x0 + w, y: y0 + h }); seg({ x: x0, y: y0 + h }, { x: x0 + w, y: y0 }); ctx.restore(); } }
      else if (t === "gann-fan") { if (A && B) { const w = B.x - A.x, h = B.y - A.y; ([[1, 1], [1, 2], [1, 3], [1, 4], [2, 1], [3, 1], [4, 1]] as number[][]).forEach(([p, q], i) => { ctx.save(); if (!(p === 1 && q === 1)) ctx.globalAlpha = 0.6; seg(A, rayToEdge(A, w, h * (q / p))); ctx.restore(); }); } }
      // ── PATTERNS / ELLIOTT (labeled polyline) ──
      else if (PATTERN_LABELS[t]) { const labels = PATTERN_LABELS[t]; ctx.beginPath(); let started = false; P.forEach(q => { if (!q) return; if (!started) { ctx.moveTo(q.x, q.y); started = true; } else ctx.lineTo(q.x, q.y); }); ctx.stroke(); if (t === "head-shoulders" && P[2] && P[4]) { ctx.save(); ctx.globalAlpha = 0.7; ctx.setLineDash([5, 4]); seg(P[2]!, P[4]!); ctx.restore(); } P.forEach((q, i) => { if (!q) return; const lb = labels[i]; if (lb) { ctx.fillStyle = col; ctx.font = "700 11px ui-sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(lb, q.x, q.y - 6); } ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(q.x, q.y, 3, 0, Math.PI * 2); ctx.fill(); }); }
      // ── CYCLES ──
      else if (t === "cyclic-lines" || t === "time-cycles") { if (A && B) { const step = Math.abs(B.x - A.x) || 12; const startX = Math.min(A.x, B.x); ctx.setLineDash([4, 3]); for (let k = 0; k < 400; k++) { const xx = startX + step * k; if (xx > W) break; if (xx >= 0) seg({ x: xx, y: 0 }, { x: xx, y: H }); } } }
      else if (t === "sine-line") { if (A && B) { const wav = Math.abs(B.x - A.x) || 40, amp = Math.abs(B.y - A.y) || 20; ctx.beginPath(); let first = true; for (let x = 0; x <= W; x += 3) { const y = A.y + amp * Math.sin((x - A.x) / wav * Math.PI * 2); if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y); } ctx.stroke(); } }
      // ── MEASURE ──
      else if (t === "price-range") { if (A && B) { const dp = d.pts[1].price - d.pts[0].price, pct = d.pts[0].price ? dp / Math.abs(d.pts[0].price) * 100 : 0, up = dp >= 0, c2 = up ? "#00C076" : "#FF4D67"; ctx.fillStyle = c2 + "22"; ctx.fillRect(Math.min(A.x, B.x), Math.min(A.y, B.y), Math.abs(B.x - A.x), Math.abs(B.y - A.y)); ctx.strokeStyle = c2; seg({ x: B.x, y: A.y }, { x: B.x, y: B.y }); arrowHead({ x: B.x, y: A.y }, { x: B.x, y: B.y }); arrowHead({ x: B.x, y: B.y }, { x: B.x, y: A.y }); chip(`${dp >= 0 ? "+" : ""}${dp.toFixed(dec)} (${pct.toFixed(2)}%)`, B.x + 6, (A.y + B.y) / 2, c2); } }
      else if (t === "date-range") { if (A && B) { const t0 = Math.min(d.pts[0].time, d.pts[1].time), t1 = Math.max(d.pts[0].time, d.pts[1].time); const nb = (barsRef.current || []).filter((x: any) => x.time >= t0 && x.time <= t1).length; ctx.strokeStyle = col; seg({ x: A.x, y: B.y }, { x: B.x, y: B.y }); arrowHead({ x: A.x, y: B.y }, { x: B.x, y: B.y }); arrowHead({ x: B.x, y: B.y }, { x: A.x, y: B.y }); chip(`${nb} bars`, (A.x + B.x) / 2 - 18, B.y - 4, col); } }
      else if (t === "date-price-range" || t === "measure") { if (A && B) { const dp = d.pts[1].price - d.pts[0].price, pct = d.pts[0].price ? dp / Math.abs(d.pts[0].price) * 100 : 0, up = dp >= 0, c2 = up ? "#00C076" : "#FF4D67"; const t0 = Math.min(d.pts[0].time, d.pts[1].time), t1 = Math.max(d.pts[0].time, d.pts[1].time); const nb = (barsRef.current || []).filter((x: any) => x.time >= t0 && x.time <= t1).length; const rx = Math.min(A.x, B.x), ry = Math.min(A.y, B.y), rw = Math.abs(B.x - A.x), rh = Math.abs(B.y - A.y); ctx.fillStyle = c2 + "22"; ctx.fillRect(rx, ry, rw, rh); ctx.strokeStyle = c2; ctx.strokeRect(rx, ry, rw, rh); chip(`${dp >= 0 ? "+" : ""}${dp.toFixed(dec)} (${pct.toFixed(2)}%)  ${nb} bars`, rx + 4, ry - 2, c2); } }
      else if (t === "long-position" || t === "short-position") { if (A) { const xr = Math.max(A.x, B ? B.x : A.x, C ? C.x : A.x) + 40; ctx.setLineDash([]); if (B) { ctx.fillStyle = "#00C07622"; ctx.fillRect(A.x, Math.min(A.y, B.y), xr - A.x, Math.abs(B.y - A.y)); } if (C) { ctx.fillStyle = "#FF4D6722"; ctx.fillRect(A.x, Math.min(A.y, C.y), xr - A.x, Math.abs(C.y - A.y)); } ctx.strokeStyle = col; seg({ x: A.x, y: A.y }, { x: xr, y: A.y }); if (B) { ctx.strokeStyle = "#00C076"; seg({ x: A.x, y: B.y }, { x: xr, y: B.y }); } if (C) { ctx.strokeStyle = "#FF4D67"; seg({ x: A.x, y: C.y }, { x: xr, y: C.y }); const risk = Math.abs(d.pts[0].price - d.pts[2].price), reward = Math.abs(d.pts[1].price - d.pts[0].price), rr = risk ? reward / risk : 0; chip(`Entry ${d.pts[0].price.toFixed(dec)}  RR ${rr.toFixed(2)}`, A.x + 4, Math.min(A.y, B ? B.y : A.y, C.y) - 2, col); } } }
      // ── FREEHAND / POLYLINE ──
      else if (t === "brush" || t === "highlighter" || t === "polyline" || t === "path") { const Q = P.filter(Boolean) as Pt[]; if (t === "highlighter") { ctx.globalAlpha = 0.35; ctx.lineWidth = Math.max(8, s.width); } if (Q.length >= 2) { ctx.beginPath(); Q.forEach((q, i) => i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)); ctx.stroke(); } else if (Q.length === 1) { ctx.beginPath(); ctx.arc(Q[0].x, Q[0].y, 2, 0, Math.PI * 2); ctx.fill(); } }
      // ── TEXT & MARKERS ──
      else if (t === "text") { if (A) { ctx.setLineDash([]); ctx.fillStyle = col; ctx.font = "600 14px ui-sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(d.text || "Text", A.x, A.y); } }
      else if (t === "note" || t === "comment" || t === "price-note" || t === "signpost") { if (A) { ctx.setLineDash([]); const txt = d.text || (t === "price-note" ? d.pts[0].price.toFixed(dec) : t.charAt(0).toUpperCase() + t.slice(1)); const icon = t === "comment" ? "💬 " : t === "note" ? "📝 " : t === "signpost" ? "🪧 " : "🏷 "; ctx.font = "600 12px ui-sans-serif"; const w = ctx.measureText(icon + txt).width + 14, h = 20; ctx.fillStyle = "rgba(15,18,28,0.92)"; ctx.strokeStyle = col; roundRect(A.x, A.y, w, h, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = col; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(icon + txt, A.x + 6, A.y + h / 2); } }
      else if (t === "callout") { if (A) { const q2 = B || A; ctx.setLineDash([]); seg(A, q2); const txt = d.text || "Callout"; ctx.font = "600 12px ui-sans-serif"; const w = ctx.measureText(txt).width + 16; ctx.fillStyle = "rgba(15,18,28,0.92)"; ctx.strokeStyle = col; roundRect(q2.x, q2.y - 11, w, 22, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = col; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(txt, q2.x + 8, q2.y); } }
      else if (t === "pin" || t === "flag") { if (A) { ctx.font = "18px serif"; ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(t === "pin" ? "📍" : "🚩", A.x, A.y); } }
      else if (t === "price-label") { if (A) { ctx.setLineDash([]); const txt = (d.text ? d.text + " " : "") + d.pts[0].price.toFixed(dec); ctx.font = "700 11px monospace"; const w = ctx.measureText(txt).width + 12; ctx.fillStyle = col; roundRect(A.x, A.y - 9, w, 18, 3); ctx.fill(); ctx.fillStyle = "#0A0C14"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(txt, A.x + 6, A.y); } }
      else if (t === "arrow-up") { if (A) { ctx.setLineDash([]); ctx.fillStyle = "#00C076"; ctx.beginPath(); ctx.moveTo(A.x, A.y - 12); ctx.lineTo(A.x - 7, A.y); ctx.lineTo(A.x + 7, A.y); ctx.closePath(); ctx.fill(); } }
      else if (t === "arrow-down") { if (A) { ctx.setLineDash([]); ctx.fillStyle = "#FF4D67"; ctx.beginPath(); ctx.moveTo(A.x, A.y + 12); ctx.lineTo(A.x - 7, A.y); ctx.lineTo(A.x + 7, A.y); ctx.closePath(); ctx.fill(); } }
      // ── FALLBACK: unknown 2-pt tool → simple line ──
      else if (A && B) seg(A, B);

      ctx.restore();

      if (selected) {
        ctx.save(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        const HS = 12;
        d.pts.forEach(p => { const q = toPx(p); if (!q) return; ctx.fillStyle = "#fff"; ctx.strokeStyle = "#00D4AA"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(q.x - HS, q.y - HS, HS * 2, HS * 2); ctx.fill(); ctx.stroke(); });
        ctx.restore();
      }
    };

    const selIdx = selectedIdxRef.current;
    drawingsRef.current.forEach((d, i) => drawOne(d, i === selIdx));
    // Live preview of the drawing being placed (committed points + pending cursor point).
    const ip = inProgressRef.current;
    if (ip) { const pv = previewPtRef.current; drawOne({ ...ip, pts: pv ? [...ip.pts, pv] : ip.pts }, false); }
    else if (drawingStartRef.current?.lp && previewPtRef.current && mouseMovedRef.current) {
      const tool = drawingToolRef.current;
      if (tool !== "cursor" && tool !== "select" && tool !== "eraser" && drawPtsNeeded(tool) === 2) {
        drawOne({ id: -1, tool, pts: [drawingStartRef.current.lp, previewPtRef.current], style: {
          color: drawingStyle.color, width: drawingStyle.width, dash: drawingStyle.dash,
          opacity: drawingStyle.opacity / 100, fill: FILL_TOOLS.has(tool),
        } }, false);
      }
    }
    if (groupedNoLevels.count > 0) {
      chip(
        dvpGroupedRefusalMessage("no-levels", groupedNoLevels.count),
        groupedNoLevelsAnchor.x,
        groupedNoLevelsAnchor.y,
        groupedNoLevelsAnchor.color,
      );
    }
  }, [base, logicalToPixel, drawingStyle, getBarFootprint]);

  // Lightweight RAF repaint for drawings ONLY — avoids bumping rangeVer (which
  // re-runs the heavy footprint/bubble canvas) on every mousemove during draw/drag.
  const drawRafRef = useRef(0);
  const scheduleDrawRender = useCallback(() => {
    if (drawRafRef.current) return;
    drawRafRef.current = requestAnimationFrame(() => {
      drawRafRef.current = 0;
      renderDrawings();
    });
  }, [renderDrawings]);

  // Re-render drawings whenever the view changes, a drawing is selected, or a style edit happens.
  useEffect(() => { renderDrawings(); }, [rangeVer, renderDrawings, selectedIdx, editBump]);

  /* ── Hit-test: index of drawing under a screen point (for select/erase) ── */
  const distToSeg = (px: number, py: number, a: Pt, b: Pt): number => {
    const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy || 1;
    let tt = ((px - a.x) * dx + (py - a.y) * dy) / len2; tt = Math.max(0, Math.min(1, tt));
    return Math.hypot(a.x + tt * dx - px, a.y + tt * dy - py);
  };
  const drawingWithin = useCallback((d: Drawing, x: number, y: number, tol: number): boolean => {
    const t = d.tool;
    const timeX = (tm: number) => { const v = chartRef.current?.timeScale().timeToCoordinate(tm as any); return v == null ? null : +v; };
    const priceY = (pr: number) => { const v = candleRef.current?.priceToCoordinate(pr); return v == null ? null : +v; };
    if (t === "hline" || t === "hray") { const y0 = priceY(d.pts[0].price); if (y0 == null || Math.abs(y0 - y) > tol) return false; if (t === "hray") { const x0 = timeX(d.pts[0].time); if (x0 != null && x < x0 - tol) return false; } return true; }
    if (t === "vline") { const x0 = timeX(d.pts[0].time); return x0 != null && Math.abs(x0 - x) <= tol; }
    if (t === "crossline") { const q = logicalToPixel(d.pts[0]); if (!q) return false; return Math.abs(q.x - x) <= tol || Math.abs(q.y - y) <= tol; }
    const Q = d.pts.map(p => logicalToPixel(p)).filter(Boolean) as Pt[];
    if (!Q.length) return false;
    for (const q of Q) if (Math.hypot(q.x - x, q.y - y) <= tol + 4) return true;
    for (let i = 0; i < Q.length - 1; i++) if (distToSeg(x, y, Q[i], Q[i + 1]) <= tol) return true;
    if (FILL_TOOLS.has(t) && Q.length >= 2) { const xs = Q.map(p => p.x), ys = Q.map(p => p.y); if (x >= Math.min(...xs) - tol && x <= Math.max(...xs) + tol && y >= Math.min(...ys) - tol && y <= Math.max(...ys) + tol) return true; }
    return false;
  }, [logicalToPixel]);
  const hitTestDrawing = useCallback((x: number, y: number, tol = 8): number => {
    const list = drawingsRef.current;
    for (let i = list.length - 1; i >= 0; i--) if (drawingWithin(list[i], x, y, tol)) return i;
    return -1;
  }, [drawingWithin]);
  // Which anchor handle (point index) of drawing `idx` is under (x,y)? -1 if none.
  const hitHandle = useCallback((idx: number, x: number, y: number, tol = 10): number => {
    const d = drawingsRef.current[idx]; if (!d) return -1;
    for (let k = 0; k < d.pts.length; k++) { const q = logicalToPixel(d.pts[k]); if (q && Math.hypot(q.x - x, q.y - y) <= tol) return k; }
    return -1;
  }, [logicalToPixel]);

  // Shift every anchor of a drawing by (dPrice, dTime).
  const moveDrawingBy = useCallback((d: Drawing, dPrice: number, dTime: number): Drawing => (
    { ...d, pts: d.pts.map(p => ({ price: p.price + dPrice, time: p.time + dTime })) }
  ), []);

  // Keep the shared "is (x,y) on a draggable drawing?" test current for the native
  // vertical-pan handler + the hover→capture logic. Cheap; runs each render.
  drawHitTestRef.current = (x: number, y: number): boolean => {
    if (lockDrawings) return false;
    if (hitTestDrawing(x, y) >= 0) return true;
    const s = selectedIdxRef.current;
    return s != null && hitHandle(s, x, y) >= 0;
  };

  /* ── Drawing mouse handlers (unified multi-point model) ─────────
     Interaction contract:
       • click-and-release places a point; a 2-point tool also accepts
         press-drag-release as a shortcut.
       • multi-point tools accumulate points click-by-click until their
         required count (or double-click for open-ended polyline/path).
       • freehand (brush/highlighter) records the drag path.
       • SELECT mode: click a drawing to select it, drag body to move,
         drag a white handle to reshape.
       • CURSOR mode: chart pans; a clean click selects a drawing
         (handled on the chart wrapper, not here — canvas is pass-through).
  ─────────────────────────────────────────────────────────────── */
  const finalizeDrawing = useCallback((d: Drawing) => {
    drawingsRef.current.push(d);
    inProgressRef.current = null;
    previewPtRef.current = null;
    const newIdx = drawingsRef.current.length - 1;
    setSelectedIdx(newIdx);
    setRangeVer(v => v + 1);
    onDrawingComplete?.();
    // Text-bearing tools open a clean inline editor over their anchor point.
    if (TEXT_TOOLS.has(d.tool)) { if (d.text == null) d.text = ""; setTextEdit({ idx: newIdx }); }
  }, [onDrawingComplete]);

  const handleDrawPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!e.isPrimary || e.button !== 0) return;
    if (lockDrawings) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const lp = pixelToLogical(x, y);
    drawingStartRef.current = { x, y, lp };
    mouseMovedRef.current = false;

    // ── ERASER: remove the drawing under the cursor ──────────────
    if (drawingTool === "eraser") {
      const idx = hitTestDrawing(x, y, 12);
      if (idx >= 0) { drawingsRef.current.splice(idx, 1); setSelectedIdx(null); scheduleDrawRender(); setRangeVer(v => v + 1); }
      return;
    }

    // ── SELECT / MOVE mode — also CURSOR mode, but only reachable here when the
    //    canvas captured because the pointer was over a drawing (hover flip). So a
    //    press on a drawing starts a move; a press on empty just clears selection. ─
    if (drawingTool === "select" || drawingTool === "cursor") {
      const sel = selectedIdxRef.current;
      if (sel != null) {
        const h = hitHandle(sel, x, y);
        if (h >= 0 && lp) { dragRef.current = { idx: sel, last: lp, ptIdx: h }; return; }
      }
      const idx = hitTestDrawing(x, y);
      if (idx >= 0 && lp) { setSelectedIdx(idx); dragRef.current = { idx, last: lp, ptIdx: null }; }
      else { setSelectedIdx(null); dragRef.current = null; }
      return;
    }

    // ── Active drawing tool ──────────────────────────────────────
    if (!lp) return;
    // Freehand strokes begin here; everything else places on mouse-up.
    if (drawPtsNeeded(drawingTool) === -1) {
      inProgressRef.current = makeDrawing(drawingTool, [lp]);
    }
  }, [drawingTool, lockDrawings, pixelToLogical, hitHandle, hitTestDrawing, makeDrawing, scheduleDrawRender]);

  const handleDrawPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!e.isPrimary) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const lp = pixelToLogical(x, y);

    // Promote to "moved" once past a small threshold (click-vs-drag).
    const st = drawingStartRef.current;
    if (st && !mouseMovedRef.current && Math.hypot(x - st.x, y - st.y) > 4) mouseMovedRef.current = true;

    // ── SELECT / MOVE drag (also cursor mode via hover-capture) ──
    if (drawingTool === "select" || drawingTool === "cursor") {
      // Keep the hover→capture flag current so the canvas releases the instant the
      // pointer leaves the drawing (otherwise pan/zoom over empty chart would stick).
      if (drawingTool === "cursor" && !dragRef.current) setOver(drawHitTestRef.current(x, y));
      const drag = dragRef.current;
      if (!drag || !lp) return;
      const d = drawingsRef.current[drag.idx];
      if (!d) return;
      if (drag.ptIdx != null) d.pts[drag.ptIdx] = lp;                       // reshape one anchor
      else drawingsRef.current[drag.idx] = moveDrawingBy(d, lp.price - drag.last.price, lp.time - drag.last.time);
      drag.last = lp;
      scheduleDrawRender();
      return;
    }

    // ── Freehand: accumulate the stroke ──────────────────────────
    const ip = inProgressRef.current;
    if (ip && drawPtsNeeded(ip.tool) === -1) {
      if (lp) ip.pts.push(lp);
      scheduleDrawRender();
      return;
    }

    // ── Live rubber-band preview for click-to-place / drag-draw ──
    if (lp) previewPtRef.current = lp;
    if (ip || (st && mouseMovedRef.current)) scheduleDrawRender();
  }, [drawingTool, pixelToLogical, moveDrawingBy, scheduleDrawRender]);

  const handleDrawPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!e.isPrimary) return;
    if (drawingTool === "select" || drawingTool === "cursor" || drawingTool === "eraser") {
      if (dragRef.current) scheduleDrawRender();
      dragRef.current = null;
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const lp = pixelToLogical(x, y) ?? drawingStartRef.current?.lp ?? null;
    const ip = inProgressRef.current;

    // ── Freehand commit ──────────────────────────────────────────
    if (ip && drawPtsNeeded(ip.tool) === -1) {
      if (ip.pts.length > 1) finalizeDrawing(ip);
      else { inProgressRef.current = null; previewPtRef.current = null; onDrawingComplete?.(); setRangeVer(v => v + 1); }
      drawingStartRef.current = null;
      return;
    }

    if (!lp) { drawingStartRef.current = null; return; }
    const need = drawPtsNeeded(drawingTool);

    // ── Single-point tools: place immediately ────────────────────
    if (need === 1) { finalizeDrawing(makeDrawing(drawingTool, [lp])); drawingStartRef.current = null; return; }

    // ── Two-point tools: press-drag-release shortcut ─────────────
    if (need === 2 && !ip && mouseMovedRef.current && drawingStartRef.current?.lp) {
      finalizeDrawing(makeDrawing(drawingTool, [drawingStartRef.current.lp, lp]));
      drawingStartRef.current = null;
      return;
    }

    // ── Click-to-place accumulation (2+ pts, incl. polyline/path) ─
    if (!ip) {
      inProgressRef.current = makeDrawing(drawingTool, [lp]);
    } else {
      ip.pts.push(lp);
      const target = drawPtsNeeded(ip.tool);
      if (target >= 2 && ip.pts.length >= target) finalizeDrawing(ip);
    }
    previewPtRef.current = lp;
    drawingStartRef.current = null;
    setRangeVer(v => v + 1);
  }, [drawingTool, pixelToLogical, makeDrawing, finalizeDrawing, onDrawingComplete, scheduleDrawRender]);

  // Double-click finishes an open-ended polyline / path.
  const handleDrawDoubleClick = useCallback(() => {
    const ip = inProgressRef.current;
    if (ip && drawPtsNeeded(ip.tool) === -2 && ip.pts.length >= 2) finalizeDrawing(ip);
  }, [finalizeDrawing]);

  // Cancellation or lost capture commits a freehand stroke and ends any drag.
  const handleDrawPointerEnd = useCallback(() => {
    const ip = inProgressRef.current;
    if (ip && drawPtsNeeded(ip.tool) === -1) {
      if (ip.pts.length > 1) finalizeDrawing(ip);
      else { inProgressRef.current = null; previewPtRef.current = null; setRangeVer(v => v + 1); }
    }
    dragRef.current = null;
  }, [finalizeDrawing]);

  // CURSOR-mode click-to-select: fires from the chart wrapper (canvas is
  // pass-through in cursor mode so the chart can still pan). A clean click
  // — negligible movement — selects the drawing under it; a drag pans.
  const cursorDownRef = useRef<{ x: number; y: number } | null>(null);
  const handleCursorSelectDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || e.button !== 0) return;
    if (drawingTool !== "cursor") return;
    const r = e.currentTarget.getBoundingClientRect();
    cursorDownRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
  }, [drawingTool]);
  const handleCursorSelectUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return;
    if (drawingTool !== "cursor") return;
    const s = cursorDownRef.current; cursorDownRef.current = null;
    if (!s) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (Math.hypot(x - s.x, y - s.y) > 5) return;   // was a pan, not a click
    const idx = hitTestDrawing(x, y);
    setSelectedIdx(idx >= 0 ? idx : null);
    if (idx >= 0) return;
    const hit = [...bubblesRef.current].reverse().find(b => Math.hypot(x - b.x, y - b.y) <= b.r + 2);
    if (hit) {
      onSelectBigTrade?.({
        symbol, timeframe, barTime: hit.anchorBarTime, printKey: hit.spawnKey,
        timeMs: hit.anchorTime * 1000, priceLevel: hit.anchorPrice,
        bid: hit.bid, ask: hit.ask, total: hit.bid + hit.ask, aggressorMethod: hit.aggressorMethod,
      });
      return;
    }
    /*
      H-601 · A CLICK ON THE LIVING PROFILE'S LANE SELECTS A SLICE. The lane's
      x-span is what the paint loop published this frame, so hit-testing and
      painting cannot disagree about where the profile is. Only the PRICE
      leaves this file; the dashboard resolves it against the compiler.
    */
    const ds = canvasRef.current?.dataset;
    if (ds?.livingProfile === "DRAWN" && ds.livingProfileLaneLeft && ds.livingProfileLaneRight) {
      const left = Number(ds.livingProfileLaneLeft) - 4;
      const right = Number(ds.livingProfileLaneRight) + 4;
      if (x >= left && x <= right) {
        const pr = candleRef.current?.coordinateToPrice(y);
        if (pr != null && Number.isFinite(+pr)) onSelectProfileSlice?.(+pr);
      }
    }
  }, [drawingTool, hitTestDrawing, onSelectBigTrade, onSelectProfileSlice, symbol, timeframe]);

  // ── Big-Trade bubble hover hit-test → comic speech-bubble tooltip ──
  // Attached to the chart wrapper so it fires in cursor mode without blocking
  // chart panning (drawing tools keep their own handler on drawCanvas).
  const handleOverlayPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return;
    // Cursor-mode: flip the draw-canvas to CAPTURE when hovering a drawing so a drag
    // moves it instead of panning the chart. Runs before the bubble early-return so
    // it works even with no bubbles present. (When capture is on, the canvas's own
    // mousemove keeps this flag current and releases it on leave.)
    if (drawingToolRef.current === "cursor" && !dragRef.current) {
      const r0 = e.currentTarget.getBoundingClientRect();
      setOver(drawHitTestRef.current(e.clientX - r0.left, e.clientY - r0.top));
    }
    const bubbles = [...bubblesRef.current, ...deltaBubblesRef.current];
    if (!bubbles.length) {
      if (bubbleHoverRef.current !== null) { bubbleHoverRef.current = null; setBubbleTip(null); }
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    // topmost first (last drawn = end of array)
    let hit: typeof bubbles[number] | null = null;
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      if (Math.hypot(mx - b.x, my - b.y) <= b.r + 2) { hit = b; break; }
    }
    if (hit) {
      if (bubbleHoverRef.current !== hit.id) {
        // The words are owned by bubbleClaim.ts, because `hit.value` means a
        // DIFFERENT quantity per bubble kind and this one call site serves
        // both. It used to print one sentence for the two of them:
        //
        //   `${vstr} ${base > 100 ? "shares" : "vol"} aggressive ${side} at ${pstr}`
        //
        // which labelled a big trade's two-sided TOTAL and a delta zone's NET
        // with the same one-sided words, and called both of them "shares" —
        // on NQ, ES and BTC alike — because `base > 100` is a price test
        // standing in for an instrument-class question. See that module's
        // header for the full account.
        const claim = describeBubbleClaim({
          kind: hit.kind,
          bid: hit.bid,
          ask: hit.ask,
          price: hit.anchorPrice,
          aggressorMethod: hit.aggressorMethod,
        });
        // No aggressor volume behind the bubble means nothing honest to say,
        // so no tooltip — rather than a confident "0".
        if (!claim) {
          if (bubbleHoverRef.current !== null) { bubbleHoverRef.current = null; setBubbleTip(null); }
          return;
        }
        bubbleHoverRef.current = hit.id;
        setBubbleTip({
          x: hit.x, y: hit.y - hit.r,
          side: claim.side,
          heading: claim.heading,
          headline: claim.headline,
          text: claim.detail,
        });
      }
    } else if (bubbleHoverRef.current !== null) {
      bubbleHoverRef.current = null;
      setBubbleTip(null);
    }
  }, []);

  // Clear drawings on clearTrigger change
  useEffect(() => {
    if (clearTrigger > 0) {
      drawingsRef.current = [];
      inProgressRef.current = null;
      previewPtRef.current = null;
      drawingStartRef.current = null;
      dragRef.current = null;
      setSelectedIdx(null);        // hide stale floating edit toolbar
      setRangeVer(v => v + 1);
      renderDrawings();
    }
  }, [clearTrigger, renderDrawings]);

  // Load persisted drawings for the current user+symbol (Tier-2 #6). Runs on
  // mount and whenever the symbol changes, replacing the in-memory set and
  // forcing a repaint once the price/time scales are ready.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(drawStorageKey());
      const arr = raw ? (JSON.parse(raw) as Drawing[]) : [];
      // Corrupt-item QUARANTINE: fail closed on any persisted drawing whose
      // anchors are non-finite / malformed, instead of rendering garbage (the
      // class of state that produced the orange full-pane band). Kept out of the
      // active set; the good ones still load.
      const isFinitePt = (p: { price?: number; time?: number } | undefined) =>
        !!p && Number.isFinite(p.price as number) && Number.isFinite(p.time as number);
      const quarantined: Drawing[] = [];
      const clean = (Array.isArray(arr) ? arr : []).filter(d => {
        const ok = d && typeof d.tool === "string" && Array.isArray(d.pts) && d.pts.length > 0 && d.pts.every(isFinitePt);
        if (!ok) quarantined.push(d);
        return ok;
      });
      if (quarantined.length) {
        console.warn(`[MainChart] quarantined ${quarantined.length} corrupt drawing(s) — not rendered`);
        try { localStorage.setItem(`${drawStorageKey()}:quarantine`, JSON.stringify(quarantined)); } catch {}
      }
      drawingsRef.current = clean.map(d => ({ ...d, style: { ...d.style, opacity: d.style?.opacity ?? 1 } }));
      drawIdRef.current = drawingsRef.current.reduce((m, d) => Math.max(m, d.id || 0), 0);
      lastSavedDrawRef.current = raw ?? "";
    } catch {
      drawingsRef.current = [];
      lastSavedDrawRef.current = "";
    }
    setSelectedIdx(null);
    setRangeVer(v => v + 1); // repaint once scales exist
  }, [drawStorageKey]);

  // Debounced autosave: rangeVer bumps on every drawing mutation (place, drag,
  // delete, style/text edit, clear). We coalesce writes and skip no-ops so pure
  // pan/zoom (which also bumps rangeVer) never thrashes localStorage.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = setTimeout(() => {
      try {
        const payload = JSON.stringify(drawingsRef.current);
        if (payload === lastSavedDrawRef.current) return;
        localStorage.setItem(drawStorageKey(), payload);
        lastSavedDrawRef.current = payload;
      } catch { /* quota / serialization — non-fatal */ }
    }, 400);
    return () => clearTimeout(t);
  }, [rangeVer, drawStorageKey]);

  // Hide/show drawings
  useEffect(() => {
    if (drawCanvasRef.current) {
      drawCanvasRef.current.style.opacity = drawingsVisible ? "1" : "0";
    }
  }, [drawingsVisible]);

  // Apply order-flow "declutter" opacity to the overlay canvas + persist it.
  // Only the overlay (footprint/bubbles/VP) fades; candles, volume and drawings
  // are on other layers and stay fully opaque.
  useEffect(() => {
    if (canvasRef.current) canvasRef.current.style.opacity = String(flowOpacity);
    try { localStorage.setItem("wm_flow_opacity", String(flowOpacity)); } catch {}
  }, [flowOpacity]);

  /* ── Right-click context menu handler ──────────────────────── */
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!candleRef.current) return;
    try {
      const rect  = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const cx    = e.clientX - rect.left;
      const cy    = e.clientY - rect.top;
      const price = candleRef.current.coordinateToPrice(cy);
      if (price == null) return;

      // Unified hit-test across every drawing type (10px radius).
      const hit = hitTestDrawing(cx, cy, 10);
      if (hit >= 0) setSelectedIdx(hit);

      setCtxMenu({ x: cx, y: cy, price: +price.toFixed(barsRef.current[0]?.close > 100 ? 2 : 4), nearDrawingIdx: hit >= 0 ? hit : null });
    } catch {}
  }, [hitTestDrawing]);

  /* ── ONE FEED VERDICT, TWO READERS ───────────────────────────
     Hoisted out of the data-truth strip's IIFE because the candle countdown
     three elements to its left was counting down over a frozen candle
     without ever asking whether the tape was flowing. THE EVIDENCE WAS
     ALREADY IN THE ROOM — this call. A second `candleDataStatus(...)` for
     the countdown would be a second opinion about the same tape, and it
     would agree with this one only until someone edited one of them. */
  void freshVer; // periodic recheck so the verdict can go stale when ticks stop
  const lastBarT = candles.length ? (candles[candles.length - 1].time as number) : 0;
  /* The formatter that used to live here produced the string `LAST 07:23 PM`
     — a bar's OPENING time, rendered with a word that reads as "most recent
     activity", in the one slot a trader consults to judge how stale the
     screen is. Worse, a bar-open time cannot answer that question at all
     without the interval: twelve minutes old is the FORMING bar on a 30m
     chart and ELEVEN BARS DEAD on a 1m chart. See chartFeedRecency's
     docblock for the live reading and the arithmetic. */
  const candleStatus = candleDataStatus(
    source,
    connected,
    candleSource !== "__unresolved__" && candles.length > 0,
    lastTickAtRef.current,
    undefined,
    undefined,
    // Canon §8 — this chip sat beside a rail already reading
    // SESSION CLOSED and printed ACTIVE DEGRADED on a Saturday.
    sessionOpen,
    // THE EVIDENCE WAS ALREADY IN THE ROOM, ONE LINE ABOVE.
    //
    // `candleSource` is "" until the bars fetch settles and is then
    // set — unconditionally, in the same statement — to either a
    // provider name or the "__unresolved__" sentinel. So `!== ""` IS
    // "we have finished asking", exactly and already.
    //
    // The line above this one was ALSO reading `candleSource`, and
    // threw this fact away by collapsing it into the `hasCandles`
    // boolean. The chip then had no way to tell a request in flight
    // from a request that came back empty, and printed DATA
    // UNAVAILABLE for both. Nothing new had to be computed or
    // fetched to fix it; the distinction only had to survive the
    // trip into the function.
    candleSource !== "",
  );

  /* The countdown's wording AND its claim about the feed, from one owner.
     AWAITING is not a reading — there is no certified tape, so the number
     is about the clock only, which is exactly what `live: false` says. */
  const barCountdown = chartBarCountdown(
    remainingSec,
    intervalSec,
    candleStatus.live,
    candleStatus.label,
  );

  /* ONE INTERVAL, TWO READERS — same law as the feed verdict above. The
     countdown and the recency reading are both statements about where a bar
     sits in its interval, so they take `intervalSec` from the same state. A
     second derivation would agree with the first only until someone edited
     one of them. */
  const feedRecency = chartFeedRecency(lastBarT, intervalSec, nowMs);

  /*
   * H-101 lives in price/time space. The target is projected from the
   * MarketObject's actual birth bar and its own level price. `rangeVer` makes
   * pan/zoom/resize a geometry update; no latest-bar or fixed-corner fallback
   * exists, so an object that cannot be projected simply does not paint.
   */
  const projectedMarketObjects = React.useMemo(() => {
    void rangeVer;
    return marketObjectTargets.flatMap(target => {
      const point = logicalToPixel({
        time: target.birthTime,
        price: target.object.priceHigh,
      });
      const width = containerRef.current?.clientWidth ?? 0;
      const height = containerRef.current?.clientHeight ?? 0;
      return point && Number.isFinite(point.x) && Number.isFinite(point.y)
        && point.x >= 0 && point.y >= 0 && point.x <= width && point.y <= height
        ? [{ ...target, point }]
        : [];
    });
  }, [logicalToPixel, marketObjectTargets, rangeVer]);
  const selectedMarketObjectTarget = projectedMarketObjects.find(
    target => target.object.objectId === selectedMarketObjectId,
  ) ?? null;

  // The RAF canvas pill draws the same glyph and the same flash verdict, so
  // the on-chart pill can never disagree with the header strip.
  countdownRef.current = barCountdown.glyph;
  closeFlashRef.current = barCountdown.closing;

  return (
    <div
      ref={wrapRef}
      style={{ display:"flex", flexDirection:"column", flex:1, overflow:"hidden", minWidth:0, position:"relative",
               background: chartSettings?.background ?? MARKET_FIELD_DEFAULT, touchAction:"none" }}
    >
      {/* THE RECEIPT, WHERE THE CANDLES ARE NOT. Gated on an empty canvas AND
          a settled cascade: a chart still asking has nothing to report, and a
          chart with bars explains itself. */}
      {barRefusal && candles.length === 0 && (
        <BarHistoryRefusalNote vm={barRefusal} />
      )}

      {/* ── OHLCV strip ─────────────────────────────────── */}
      {/* NO FILL OF ITS OWN. The wrapper one element up already paints
          `chartSettings?.background ?? "#0B0E1A"` — the canonical owner of the
          market field's material. This strip used to restate that fill as a
          hardcoded `#0B0E1A` literal, which is the vacuous-agreement shape:
          a duplicate that happens to agree with the true owner in the DEFAULT
          case, which is exactly what let it survive review. The moment the
          trader changes the chart background in Appearance the two diverge and
          MARKET's own price truth renders as a foreign slab floating inside
          the market field.

          MEASURED LIVE on production before this fix, /charts?symbol=TSLA with
          `wm_chartSettings.background` set to `#241014`:
            strip       -> rgb(11, 14, 26)
            market field-> rgb(36, 16, 20)
          A visible seam directly above the candles. Canon §COMPOSITION
          CONTRACT: "NOW belongs to MARKET ... embedded into the market
          environment rather than another dashboard card." A band that refuses
          to follow the room's material is not embedded in the room.

          Same law as `chartsRoomChrome.test.ts`, which cured five frame files
          of exactly this occlusion — MainChart was never in its FRAME list, so
          the largest surface kept the defect. Transparent here means the strip
          inherits the one canonical fill and can never drift from it again. */}
      {/* ── Chart + canvas overlay ───────────────────────── */}
      <div style={{ flex:1, position:"relative", minHeight:0,
        /* THE FOOTER BAND IS RESERVED, NOT REQUESTED. The chart mounts into a
           `height:100%` child of this box, so padding here shrinks the chart —
           and with it the time axis — instead of being drawn over. That is the
           whole point: lightweight-charts renders to a canvas that cannot see
           this DOM node, so an overlay merely asked to sit lower stays one font
           or locale change away from covering the axis again. Floor space is
           the only negotiation two owners of one rectangle actually have.

           Paid ONLY when the chip is really there. The compare pane and the
           5m/15m panes get no setter, so they get no band — a strip of empty
           room reserved for furniture that was never delivered is the kind of
           dead space this shift is spending its time removing. */
        paddingBottom: setTimeframe ? TIMEFRAME_FOOTER_H : undefined }}
        onContextMenu={handleContextMenu}
        onPointerMove={handleOverlayPointerMove}
        onPointerDown={handleCursorSelectDown}
        onPointerUp={handleCursorSelectUp}
        onPointerLeave={() => { bubbleHoverRef.current = null; setBubbleTip(null); cursorDownRef.current = null; }}>

      {/* ── THE TIMEFRAME, WHERE CANON DRAWS IT ──────────────────────────
          F24 puts one bordered timeframe chip at the bottom centre of this
          pane and nothing above the candles; C-101 draws the canvas with a
          price axis right and a time axis bottom and no band at all. The chip
          is mounted HERE, inside the pane, because the pane is the thing canon
          draws it on — not beside the chart in a parent row, which is how the
          79px masthead and the 36px toolbar were each born.

          Rendered only when a setter exists: a chip that cannot change the
          timeframe is a label wearing a button's clothes. */}
      {setTimeframe && (
        <TimeframeGlassChip timeframe={timeframe} setTimeframe={setTimeframe} />
      )}

      {/* ── THE OTHER HALF OF THE FOOTER BAND ────────────────────────────
          LOOKED AT at 1440 on 2026-09-21, F24 beside this build. The canon
          frame's footer strip carries TWO things and this band was shipping
          one of them: `Vol 68.92M` sits at the strip's BOTTOM-LEFT, sharing
          the row with the bordered timeframe chip in the centre. Reserving
          `TIMEFRAME_FOOTER_H` bought a full-pane-width band and then used only
          its middle; the left third was empty floor in a layout whose whole
          argument is that floor is expensive.

          A MOVE, NOT AN ADDITION — see the note in chartVolumeFooterFact.ts.
          The same number is the `V` cell at the end of the floating O/H/L/C
          legend above, and F24's legend carries no volume at all. `volumeInFooter`
          is the ONE boolean deciding which of the two renders it, and it is the
          same condition that decides the band exists, so the count is on screen
          exactly once in every configuration — including the compare pane and
          the 5m/15m panes, which have no band and therefore keep it upstairs.

          `dataWindowBarScope` is CALLED again rather than threaded down: it is
          pure and both calls pass the same four arguments, so the two cannot
          disagree. Copying the call to the single owner is not the same thing
          as copying its logic, which is what would actually let them drift. */}
      {volumeInFooter && last && (() => {
        const fact = chartVolumeFooterFact(
          last.volume,
          dataWindowBarScope(last.time as number, timeframe, true, nowMs).volume.title,
        );
        return (
          <div
            className={clsx(
              "wm-chart-volume-footer font-mono",
              // Real design tokens, as Tailwind classes — see the long note on
              // this class in globals.css for why the colour is NOT a var().
              fact.state === "OBSERVED" ? "text-wm-text-dim" : "text-wm-text-muted",
            )}
            data-volume-state={fact.state}
            title={fact.title}
            aria-label={fact.title}
            style={{
              position: "absolute",
              bottom: TIMEFRAME_CHIP_BOTTOM_PX,
              left: 10,
              height: 28,
              display: "flex",
              alignItems: "center",
              zIndex: 60,
              // The pane above owns the crosshair, drawing and context menu.
              // This is a caption, not a control; it must never eat a gesture
              // aimed at the market. Same rule the chip's wrapper carries.
              pointerEvents: "none",
            }}
          >
            {fact.text}
          </div>
        );
      })()}

      {/* ── NOW RIDES OVER THE CANDLES, IT DOES NOT PUSH THEM DOWN ──────
          LOOKED AT, NOT INFERRED. 2026-09-21, canon frame F24 beside a 1440
          shot of this room: F24 prints "TSLA · Tesla, Inc. · 1D · NASDAQ" and
          the O/H/L/C line INSIDE the candle pane, over the chart's own top-left
          headroom. It is not a band. The market field starts at the top of the
          frame and the price legend floats on it.

          This build spent a full-width 28px LAYOUT row on the same words,
          directly above the field. MEASURED at 1440x900 by
          scratchpad/desktop-chrome-stack.mjs: 28px of the 157px of chrome
          above the candles, on a row whose own text is the market's — the
          one thing in the stack that was never chrome in the first place.

          The canon note 40 lines up already argued half of this: §COMPOSITION
          CONTRACT says "NOW belongs to MARKET ... embedded into the market
          environment rather than another dashboard card", and that fix made
          the strip's FILL transparent so it could not seam against the field.
          A strip that inherits the field's colour but still consumes a row of
          the field's height is only half-embedded. This finishes it — same
          contract, same sentence, now applied to geometry instead of paint.

          POINTER-TRANSPARENT BY DEFAULT. The pane underneath owns the
          crosshair, drawing and context menu (onPointerMove / onPointerDown /
          onContextMenu, right here on the parent). An overlay that ate those
          events would trade 28px of chart for a 28px dead strip where the
          crosshair stops — a worse defect than the one being fixed. So the
          band is `pointerEvents: "none"` and the single interactive thing
          inside it, the fullscreen button, re-arms itself. Audited: that
          button is the ONLY control in this subtree.

          The bottom rule is gone with the row. A 1px border drawn across live
          candles reads as a chart annotation the trader did not place. */}
      <div
        style={{
          position: "absolute", top: 0, left: 0, right: 0, height: PRICE_LEGEND_OVERLAY_H,
          zIndex: 20, pointerEvents: "none", background: "transparent",
        }}
        className="flex items-center gap-4 px-3"
      >
        {/* ── THE PANE SAYS WHAT IT IS ────────────────────────────────────
            LOOKED AT, NOT INFERRED. 2026-09-21, canon frame F24 beside a
            1440x900 shot of this room. F24's legend opens with
            `TSLA · Tesla, Inc. · 1D · NASDAQ`. This one opened with a bare
            number.

            Read back from the live DOM, the symbol appeared in exactly two
            places on the entire screen: the search field inside the 32px
            `.wm-chart-toolbar` row, and the decision spine's `MARKET NQ1! ·
            5m` line on the far right flank, ~1100px away. The market surface
            itself never said which market it was.

            That is a precondition, not a preference. The toolbar row is the
            largest remaining band of chrome above the candles and it is
            scheduled to move into the Tools room, whose door already reads
            "Open in this room". Remove it while the pane has no identity and
            the instrument's name leaves the market surface with it. Identity
            arrives here first, deliberately, so that the removal is a pure
            subtraction of chrome rather than a subtraction of truth.

            It prints only what it can prove — see chartIdentityLabel for why
            the company name and the exchange are absent rather than guessed.
            A blank symbol renders NOTHING rather than an empty chip: an empty
            chip is a frame around an answer nobody gave. */}
        {(() => {
          const identity = chartIdentityLabel(symbol, timeframe);
          if (!identity) return null;
          return (
            <div
              data-chart-identity
              data-chart-identity-parts={identity.parts.map(p => p.kind).join(",")}
              aria-label={identity.spoken}
              className="flex items-baseline gap-1.5 text-[11px] font-semibold tracking-wide text-wm-text whitespace-nowrap"
            >
              {identity.parts.map((part, i) => (
                <React.Fragment key={part.kind}>
                  {i > 0 ? <span aria-hidden className="text-wm-text-dim/50">·</span> : null}
                  <span
                    data-identity-part={part.kind}
                    className={part.kind === "symbol" ? undefined : "font-mono font-normal text-wm-text-dim"}
                  >
                    {part.text}
                  </span>
                </React.Fragment>
              ))}
            </div>
          );
        })()}

        {/* Price + change + source provenance (WM-CHART-P0-05) */}
        <div className="flex items-baseline gap-2">
          {(() => {
            /* The headline price has THREE possible answers and used to render
               only one. Measured 2026-09-07 on /charts?symbol=NQ1!: this span
               read `29,565.25` while the data-truth strip six elements to its
               right read `DATA UNAVAILABLE`. That number was
               /api/yahoo's `prevClose` — identical to `price` to the cent,
               because on an UNKNOWN SF-D01 resolution the legacy `price` field
               falls back to the previous close. A Friday settlement, rendered
               in the live price's chair, under a label saying there is no data.

               useWebSocket now refuses that quote at the source (ticker.price
               is 0, and `quoteRefusal` carries the endpoint's own words), which
               exposed the SECOND half of the defect: the old fallback was a
               bare `lastPrice`, and `lastPrice` INITIALISES to
               `getBase(symbol)` — a hardcoded seed constant (NQ1! → 30476).
               Falling back to that would have replaced a real Friday close with
               a number no market ever printed. The guard at the time was
               `candles.length > 0`, offered as proof that `lastPrice` came from
               a real bar. It was not proof: candles being loaded says nothing
               about whether `lastPrice` came from THEM, and in fact it did not
               — it tracks the forming bar.

               So `lastPrice` is no longer consulted here AT ALL. The seed
               constant is now unreachable by construction rather than fenced
               off by a proxy: the only two numbers this cell can print come
               from `ticker.price` (a quote that reached this header) and
               `deriveLastBarClose` (a bar that has PROVABLY closed), and each
               arrives carrying its own provenance word. */
            // AWAITING renders the whole cell away, attributes included — the
            // same discipline the change cell beside it already follows. A
            // blank slot for one second is not a claim; "No price" over an
            // instrument about to paint 400 candles is.
            if (headerPriceFact.kind === "AWAITING") return null;
            if (!headerPriceFact.measured) {
              return (
                <span
                  className="font-mono font-bold text-base text-wm-text-dim leading-none"
                  // Was two string literals here, and StockInfoPanel had
                  // already drifted from them. `aria-label` is not decoration:
                  // on a phone there is no hover, so `title` alone would leave
                  // this glyph bare — the original defect, by omission.
                  title={priceAbsenceReason({ quoteRefusal, hasCandleSource: true })}
                  aria-label={priceAbsenceReason({ quoteRefusal, hasCandleSource: true })}
                >
                  {PRICE_ABSENCE_GLYPH}
                </span>
              );
            }
            return (
              <span
                className={`font-mono font-bold text-base leading-none ${
                  headerPriceFact.kind === "LIVE_QUOTE" ? "text-wm-text" : "text-wm-text-dim"
                }`}
                data-price-kind={headerPriceFact.kind}
                // The compiler's own sentence, not a second one written here.
                // `quoteRefusal` is appended rather than substituted: it names
                // WHY the live channel is empty, which the pure module cannot
                // know, and it must not replace the module's account of what
                // the number in this cell actually IS.
                title={`${headerPriceFact.reason}${
                  headerPriceFact.kind === "BAR_CLOSE" && quoteRefusal
                    ? ` The quote provider answered and WM declined the answer: ${quoteRefusal}`
                    : ""
                }`}
                aria-label={`${symbol} ${headerPriceFact.text}. ${headerPriceFact.reason}`}
              >
                {headerPriceFact.text}
              </span>
            );
          })()}
          {/* AWAITING renders the WHOLE CELL away, attributes included. The
              aria-label below is unconditional by Sentinel decree
              (absence-reason-must-be-announced-not-only-hovered) and must stay
              that way — so the only honest way to say nothing while the bars
              request is still in flight is for the element not to exist. A
              screen reader must not be told "change: ." either. */}
          {headerChangeFact.kind === "AWAITING" ? null : (
          <span
            className={`text-xs font-mono font-semibold ${MAIN_CHANGE_CLASS[headerChangeFact.kind](headerChangeFact.direction)}`}
            data-change-kind={headerChangeFact.kind}
            // Was two string literals here. The outer chrome header in
            // ChartsDashboard needed the SAME sentence, and copying it would
            // have made a third owner that agrees until someone edits one copy.
            // This row is the reference-correct site; it now reads the sentence
            // from the module rather than being the place it is spelled.
            //
            // 2026-09-17 — and now it reads the whole CELL from a module, for
            // the same reason one step further on. Measured live at 02:53Z,
            // this row and the chrome header BOTH printed "— (change
            // unavailable)" over 400 loaded candles. Had only the chrome header
            // been repaired, one screen would have carried two different
            // answers to one question — which is the defect family, not a fix
            // for it. Both sites now compile the cell from
            // `chartHeaderChangeFact`, so they cannot disagree.
            //
            // THE `aria-label` IS LOAD-BEARING, NOT DECORATION. globals.css
            // hides the chrome header's copy of this sentence under
            // (max-width:639px) *because this row renders it*. So on a phone
            // this is the ONLY statement on the page — and a phone has no
            // hover, which means `title` alone says nothing. It is now ALWAYS
            // present rather than only on absence: the bar-over-bar arm needs
            // announcing at least as badly, since its whole safety rests on the
            // reader learning that it is not the session change.
            // SENTINEL: absence-reason-must-be-announced-not-only-hovered
            title={headerChangeFact.reason}
            aria-label={`${symbol} change: ${headerChangeFact.text}. ${headerChangeFact.reason}`}
          >
            {headerChangeFact.text}
          </span>
          )}
          {showFidelityChrome ? (() => {
            // SHIFT-T cutover — canon §BINDING LEGACY DATA + SURFACE
            // CUTOVER LAW (2026-08-29): "OLD PROVIDER CHROME AND OLD
            // CHART-APP SURFACES ARE QUARANTINED FROM THE NEW OS PATH."
            // Migrate the last hand-rolled fidelity chip on MainChart
            // to <CanonicalFidelityBadge>. The primitive carries the
            // canon 7-question narrative tooltip automatically (SHIFT-Q
            // atom 4 → SHIFT-R atom 3-5 uniformity). Truth stays in
            // resolveChartSurfaceBadge (the H-Bkt 1/8 guard); the
            // primitive only renders it.
            const b = resolveChartSurfaceBadge(source, connected, candles.length > 0, sessionOpen);
            const capabilityReport = selectPerCapabilityFidelity({
              source, connected, hasCandles: candles.length > 0, sessionOpen,
            });
            return <CanonicalFidelityBadge badge={b} variant="chrome" capabilityReport={capabilityReport} />;
          })() : null}
        </div>

        {/* OHLCV */}
        {last && (() => {
          /* O, H, L and V describe a forming bar truthfully — the open really
             did happen, and the high/low/volume really are the extremes SO FAR.
             `C` is the one letter that is not a description but a CLAIM: "this
             bar ended here." Measured live 2026-09-15 on NQ1! 1h, this strip
             read `C 29403.00 V 0` with 5:04 left on the countdown, beside a
             MARKET tile reading `29405 LAST 1h BAR CLOSE` — two owners, one
             viewport, two numbers, both wearing the word "close".

             The value stays (it is where the market is on this timeframe right
             now); only the word is graded. See selectChartCloseLabel. */
          const closeWord = selectChartCloseLabel(last.time as number, timeframe, nowMs);
          /* MEASURED LIVE 2026-09-17, NQ1! 30m, straight out of the DOM:
               O 29693.25  H 29693.25  L 29693.25  NOW 29693.25  V 0
             `H` is painted in the high colour and `L` in the low colour —
             those two cells are this strip's answer to "how far did price
             travel inside this bar" — while the volume cell three elements to
             their right says the record holds ZERO trades. One number carried
             in from before the bar began, retyped four times in three colours,
             three of them asserting a measurement the fourth disproves.
             chartBarRangeFact is the owner of whether those cells may be
             drawn; it refuses only when volume AND range are BOTH empty, so a
             feed that simply does not report volume keeps its real extremes. */
          const rangeFact = chartBarRangeFact(last, timeframe);
          /* THE OTHER HALF OF THE 140-POINT PAIR.
             MEASURED LIVE 2026-09-17, NQ1! 30m, straight out of the DOM —
             every cell of this strip, read back with its attributes:

               ["29697.25","",""] ["29700.25","",""] ["29689.50","",""]
               ["29694.25","",""] ["57","",""]           ← [text, title, aria]

             Empty. That is the SAME reading the Data Window gave before
             18576463 fixed it — and it is why fixing one panel did not close
             the defect. The Data Window now announces `30M BAR · Sep 14,
             00:00 — NOT the latest bar`; this strip, six rows above it and
             140 points away, still announces nothing at all. A trader who
             hovers the scoped panel can reconcile the two numbers; a trader
             who hovers THIS one still cannot.

             So the strip composes the very same owner. `isLatestBar` is
             literally true here — `last` IS the final candle — and passing it
             is not a guess. One function now names the bar for BOTH panels,
             which means they can no longer disagree about what a bar is: to
             make them contradict each other you would have to edit one
             function, and it would change both. */
          const stripScope = dataWindowBarScope(
            last.time as number, timeframe, true, nowMs,
          );
          return (
            <div
              role="group"
              aria-label={stripScope.spoken}
              data-ohlc-strip-scope={stripScope.subheading}
              className="flex items-center gap-3 text-[10px] font-mono text-wm-text-dim">
              {rangeFact.measured ? (
                <>
                  <span title={stripScope.open.title}>O <span className="text-wm-text">{last.open.toFixed(dp)}</span></span>
                  <span title={stripScope.high.title}>H <span className="text-wm-green">{last.high.toFixed(dp)}</span></span>
                  <span title={stripScope.low.title}>L <span className="text-wm-red">{last.low.toFixed(dp)}</span></span>
                </>
              ) : (
                <span
                  data-bar-range-kind={rangeFact.kind}
                  title={rangeFact.title}
                  className="text-wm-text-dim"
                >
                  {rangeFact.text}
                </span>
              )}
              <span
                title={stripScope.close.title}
                className={closeWord.forming ? "text-wm-gold/80" : undefined}
              >
                {stripScope.close.label}{" "}
                <span className="text-wm-text">{last.close.toFixed(dp)}</span>
              </span>
              {/* THE `V` CELL IS CONDITIONAL NOW, and the condition is not a
                  taste setting. When this pane reserved a footer band, F24 puts
                  the traded quantity down THERE and leaves this legend to price
                  alone. `volumeInFooter` is the single boolean deciding it — see
                  its definition beside `last`. Exactly one of the two nodes
                  renders the number in every configuration, and the panes with
                  no band (compare, pinned 5m/15m) keep it right here, so no
                  configuration renders it zero times. */}
              {volumeInFooter ? null : (
                <span title={stripScope.volume.title}>V <span className="text-wm-text">{last.volume.toLocaleString()}</span></span>
              )}
            </div>
          );
        })()}

        {marketStanding ? (
          <div className="wm-chart-market-standing">{marketStanding}</div>
        ) : null}

        {/* Pine Script badge */}
        {pineOutput && (
          <div className="ml-1 flex items-center gap-1 px-1.5 py-0.5 rounded bg-wm-purple/15 border border-wm-purple/30 text-[9px] text-wm-purple font-semibold">
            ƒ {pineOutput.shortTitle || pineOutput.title}
          </div>
        )}

        {/* Right side: countdown + live */}
        <div className="ml-auto flex items-center gap-3">
          {/* Candle countdown */}
          <div
            role="group"
            aria-label={barCountdown.spoken}
            title={barCountdown.title}
            data-bar-countdown-kind={barCountdown.kind}
            className={`flex items-center gap-1 text-[10px] font-mono font-bold transition-colors ${
              chartSettings?.candleTimer === false ? "hidden" : ""
            } ${
              barCountdown.closing ? "text-wm-red" : "text-wm-text-dim"
            }`}>
            <svg width="8" height="8" viewBox="0 0 8 8" className="shrink-0" aria-hidden="true">
              <circle cx="4" cy="4" r="3" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <line x1="4" y1="4" x2="4" y2="1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="4" y1="4" x2="6" y2="4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span className={barCountdown.closing ? "animate-pulse" : ""}>{barCountdown.glyph}</span>
          </div>

          {/* Data-truth strip — vendor-agnostic status + real feed freshness. */}
          {(() => {
            // Compiled once above the return; the candle countdown to the
            // left of this badge reads the very same verdict.
            const status = candleStatus;
            const noFeed = status.state === "UNAVAILABLE";
            // AWAITING is not a reading, so there is nothing to show. The
            // wrapper goes too, not just the text inside it — an empty
            // bordered div announcing itself is the same interruption with
            // no words in it.
            if (status.state === "AWAITING") return null;
            // ── THE SECOND CLOCK, ONE INCH BELOW THE FIRST ───────────────
            //
            // `replayActive` has been an accepted prop on this component
            // since bar replay shipped, and NOTHING in this file read it —
            // grep it: a declaration, a default, and no use. So when the
            // trader engaged the companion camera, this strip kept pulsing
            // "LIVE — CERTIFIED QUOTE" over a walked chart, exactly as the
            // masthead above it did.
            //
            // Fixing only the masthead would have moved the lie rather than
            // killed it. Both readings are on the same glass at the same
            // time, and "impossible to confuse" is not satisfied by one of
            // two contradicting chips being corrected.
            //
            // The vocabulary is the canon's, not this file's, and it is the
            // same pair the masthead compiles to — HISTORICAL BARS VERIFIED
            // when bars are on screen, silence when they are not — so the
            // two chips say one thing in two places instead of two things.
            if (replayActive) {
              return (
                <div
                  className="flex items-center gap-1.5"
                  data-feed-recency-kind="replay"
                  data-replay-camera="engaged"
                  aria-label="Bar replay engaged — historical bars, not a live quote"
                  title={"BAR REPLAY — the camera is walking historical bars.\nNo live-quote claim is made while replay is engaged.\nLive tape collection continues in the background; its counters are\nhidden because they describe live bars, not the ones on screen."}
                >
                  <span className="text-[10px] font-semibold" style={{ color: "#8B92AC" }}>
                    {showFidelityChrome
                      ? `${CANONICAL_FIDELITY_LABELS.HISTORICAL_BARS_VERIFIED} · BAR REPLAY`
                      : "BAR REPLAY"}
                  </span>
                </div>
              );
            }
            return (
              <div
                className="flex items-center gap-1.5"
                aria-label={feedRecency.spoken}
                data-feed-recency-kind={feedRecency.kind}
                title={
                  `Candles: ${status.state.toLowerCase()} · session ${extendedHours ? "ETH" : "RTH"}${status.live ? " · live ticks flowing" : " · no real-time candle claim"}` +
                  `\n\n${feedRecency.title}` +
                  (quoteRefusal ? `\n\nQUOTE NOT CERTIFIED — ${quoteRefusal}` : "")
                }
              >
                {/* An unavailable feed does not prove session closure. A
                    timestamped bar can support a historical-only receipt;
                    zero bars can support only data unavailable. */}
                {noFeed ? (
                  <span className="text-[10px] font-semibold" style={{ color: "#8B92AC" }}>
                    {/* §8 — a designed refusal must not wear a transient
                        state's vocabulary. "DATA UNAVAILABLE" says nothing
                        arrived. When `quoteRefusal` is set, something DID
                        arrive, on time, and WM declined to certify it; the
                        reason is in this element's title. Two different facts
                        had one sentence between them, exactly as the ticker
                        tape's "quote pending" did. A timestamped bar still
                        earns the historical receipt either way. */}
                    {!showFidelityChrome
                      ? feedRecency.glyph
                      : lastBarT
                      ? `HISTORICAL ONLY · ${feedRecency.glyph}`
                      : quoteRefusal ? "QUOTE NOT CERTIFIED" : "DATA UNAVAILABLE"}
                  </span>
                ) : status.live ? (
                  /* §9 COLOR LAW names this pip specifically: "no green LIVE
                     pip". The MOTION here is earned — it is gated on
                     `status.live`, a certified quote, so something really is
                     arriving while it animates, and it keeps its pulse.
                     The COLOUR was the lie. Green is the "safe / go" signal,
                     and a certified quote proves the DATA is current; it
                     proves nothing whatever about whether the trade is safe.
                     The words "LIVE — CERTIFIED QUOTE" already carry the
                     entire claim, and they carry it to a colour-blind trader
                     too. Pearl says the same thing and promises nothing
                     extra. */
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-wm-text animate-pulse" aria-hidden="true" />
                    <span className="text-[10px] text-wm-text font-semibold">
                      {showFidelityChrome ? "LIVE — CERTIFIED QUOTE" : feedRecency.glyph}
                    </span>
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold" style={{ color: "#F0B429" }}>
                    {showFidelityChrome ? `${status.label} · ${feedRecency.glyph}` : feedRecency.glyph}
                  </span>
                )}
              </div>
            );
          })()}

          {/* Fullscreen button
              MEASURED 2026-09-19 on live /charts at 1920: this button rendered
              20x20 and carried NO accessible name but `title`. A `title` is a
              HOVER affordance — it does not exist on touch, and screen readers
              treat it as the weakest of all naming sources. The close button in
              SmartMoneyPanel already carries the repair this copies: a real
              `aria-label`, an explicit `type` so a future move inside a form
              cannot silently turn the control into a submit, and a 44px hit
              floor grown with padding + negative margin so the TARGET grows
              without the toolbar ROW growing. `aria-pressed` is deliberately
              absent: the name itself flips to "Exit fullscreen", which states
              the same truth once instead of twice. */}
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            /* RE-ARMED. The legend band above it is `pointerEvents: "none"` so
               the crosshair, drawing and context menu keep reaching the candle
               pane underneath. This button is the ONLY control in that subtree
               (audited, same session), so it opts itself back in rather than
               the band opting everything in. */
            style={{ pointerEvents: "auto" }}
            className="flex items-center justify-center min-w-11 min-h-11 p-3 -m-3 rounded hover:bg-wm-surface transition-colors text-wm-text-dim hover:text-wm-text"
          >
            {isFullscreen ? (
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M1 4H4V1M7 1V4H10M10 7H7V10M4 10V7H1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M1 4V1H4M7 1H10V4M10 7V10H7M4 10H1V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>

        <div ref={containerRef} style={{ width:"100%", height:"100%" }} />

        {/* H-101 — WAIT belongs to a selected object, at that object's real
            price/time coordinate. Unselected objects remain restrained brass
            pins; the evidence plaque exists only after explicit selection and
            only when the canonical WAIT selector returned a standing. */}
        {projectedMarketObjects.map(target => {
          const selected = target.object.objectId === selectedMarketObjectId;
          return (
            <button
              key={target.object.objectId}
              type="button"
              data-market-object-target={target.object.objectId}
              aria-pressed={selected}
              aria-label={`Select ${target.object.kind.toLowerCase()} market object at ${target.object.priceHigh}`}
              onClick={() => onSelectMarketObject?.(target.object.objectId)}
              style={{
                position: "absolute",
                left: target.point.x,
                top: target.point.y,
                zIndex: 72,
                width: 28,
                height: 28,
                transform: "translate(-50%, -50%)",
                border: 0,
                padding: 0,
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: selected ? 13 : 9,
                  height: selected ? 13 : 9,
                  transform: "translate(-50%, -50%) rotate(45deg)",
                  borderRadius: 2,
                  border: `1px solid ${selected ? "#F8E7B0" : "rgba(240,180,41,0.72)"}`,
                  background: selected ? "#F0B429" : "rgba(13,17,23,0.92)",
                  boxShadow: selected ? "0 0 0 3px rgba(240,180,41,0.16)" : "none",
                }}
              />
            </button>
          );
        })}
        {selectedMarketObjectTarget && selectedMarketObjectWait && (
          <div
            data-h101-wait-plaque
            role="status"
            aria-label={`Wait on selected ${selectedMarketObjectTarget.object.kind.toLowerCase()} object. ${selectedMarketObjectWait.headline}. ${selectedMarketObjectWait.detail}`}
            style={{
              position: "absolute",
              left: Math.min(
                selectedMarketObjectTarget.point.x + 16,
                Math.max(12, (containerRef.current?.clientWidth ?? 900) - 224),
              ),
              top: Math.max(10, selectedMarketObjectTarget.point.y - 28),
              zIndex: 73,
              width: 208,
              padding: "7px 9px",
              borderLeft: "2px solid #F0B429",
              borderTop: "1px solid rgba(240,180,41,0.28)",
              borderBottom: "1px solid rgba(240,180,41,0.18)",
              background: "linear-gradient(90deg, rgba(13,17,23,0.96), rgba(13,17,23,0.78))",
              color: "#EDE7D5",
              pointerEvents: "none",
              boxShadow: "0 7px 20px rgba(0,0,0,0.28)",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
              <span style={{ color: "#F0B429", fontSize: 10, fontWeight: 900, letterSpacing: "0.12em" }}>WAIT</span>
              <span style={{ color: "#8E856E", fontSize: 8, fontWeight: 750 }}>{selectedMarketObjectTarget.object.fidelityAtBirth}</span>
            </div>
            <div style={{ marginTop: 3, color: "#F7F1DF", fontSize: 11, fontWeight: 820 }}>
              {selectedMarketObjectWait.headline}
            </div>
            <div style={{ marginTop: 2, color: "#9D9788", fontSize: 9, lineHeight: 1.35 }}>
              {selectedMarketObjectTarget.object.kind} · {selectedMarketObjectTarget.object.priceHigh.toLocaleString()} · AS OF {new Date(selectedMarketObjectTarget.object.asOf).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        )}

        {/* WM-OF-P0-06 (2026-08-09, Founder emergency): order flow "still dont
            function properly" — root cause is that footprint tools need per-
            trade aggressor tape which the free feed only supplies for candles
            that open AFTER the tab is open. Historical bars stay blank forever.
            The previous banner said "Collecting…" only until the first trade
            arrived, then disappeared — leaving the user staring at 99% empty
            candles with no explanation. Now the banner shows the collecting
            state until ANY trade arrives, then switches to a persistent
            "live-only footprint" note that stays as long as the tool is on. */}
        {/* `!replayActive` — OWL WITH TWO CLOCKS, residue 1 of 2. This banner is
            pinned over the PRICE PANE and its subject is "the footprints you are
            looking at are filling in live". While the companion camera walks
            history that sentence is false about the bars on the glass, and a
            green "Collecting live executed trades…" over a replayed chart is the
            same confusion the masthead fix just closed, one layer down. */}
        {footprintEnabled && !replayActive && hasRealAggressorTape(tapeSource ?? "") && !recentTicks?.some(t => t.trade) && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: "absolute", top: 42, left: "50%", transform: "translateX(-50%)",
              zIndex: 58, padding: "6px 11px", borderRadius: 7, pointerEvents: "none",
              background: "rgba(11,14,26,0.90)", border: "1px solid rgba(0,192,118,0.45)",
              color: "#AAB2CC", fontSize: 11, fontWeight: 650,
            }}
          >
            <span style={{ color: "#00C076", fontWeight: 850 }}>Collecting live executed trades…</span>
            {" "}Footprints populate from this point forward; historical rows remain blank.
          </div>
        )}
        {/* After tape arrives, its disclosure and the Nectar reading become
            ONE compact evidence instrument below. They used to render as two
            persistent stacked banners over price — a fifth and sixth chunk in
            the four-chunk desktop frame. Nothing is hidden from assistive
            technology or the hover receipt; only the duplicate visual strip
            is removed. Before the first trade, the collecting banner above
            remains because it explains an otherwise blank footprint. */}
        {/* WM Live Session tape chip — running counters from real observed
            executions. One compact on-glass reading; the complete retention,
            coverage and historical-tape limitations remain in aria/title. */}
        {/* `!replayActive` — OWL WITH TWO CLOCKS, residue 2 of 2, and the louder
            one. MEASURED on production after the masthead was cured: the
            masthead correctly read "HISTORICAL BARS VERIFIED · bar replay" while
            a pulsing green "● LIVE TAPE" chip sat over the replayed candles at
            (439,126). Correcting one of two contradicting chips does not make a
            room impossible to confuse; it just moves the lie down the glass.

            WITHHELD, NOT FALSIFIED. The recorder really is still running — the
            socket does not stop when the camera turns around — so this chip may
            not be made to say "no tape". What is false is its IMPLIED SUBJECT:
            these counters are accumulating against LIVE bars while the trader is
            looking at historical ones, so the reading does not describe the
            chart it is pinned to. Silence is the honest answer for a reading
            whose subject has left the screen, and the fact that collection
            continues is stated in the BAR REPLAY strip's own receipt rather than
            dropped. */}
        {footprintEnabled && !replayActive && hasRealAggressorTape(tapeSource ?? "") &&
          (sessionTapeTick > 0 || sessionNectarUiVersion > 0) && (() => {
          const s = sessionTapeStatsRef.current;
          const fmt = (n: number) => {
            const abs = Math.abs(n);
            if (abs >= 1e6) return (n / 1e6).toFixed(2) + "M";
            if (abs >= 1e3) return (n / 1e3).toFixed(2) + "K";
            if (abs >= 10)  return n.toFixed(2);
            return n.toFixed(4);
          };
          const deltaColor = s.delta > 0 ? "#00C076" : s.delta < 0 ? "#FF4D6A" : "#8B92AC";
          const deltaSign  = s.delta > 0 ? "+" : "";
          const horizonTime = tapeHorizonRef.current
            ? fmtTickMark(tapeHorizonRef.current.startedAtSec, 3)
            : "the first retained execution";
          // Nectar Coverage certification (directive Part 8 — order-flow capability
          // level made visible). Read live snapshot from the session Nectar
          // collector for the current symbol's `trade` channel and surface
          // fidelity + gap-count + retention truthfully. Cheap object copy;
          // safe to inline in the chip render because the chip re-renders
          // at ~4Hz on the existing sessionTapeTick.
          const nectar = getSessionNectarSnapshot();
          const activeTapeCapability = getRuntimeTapeCapability(tapeSource ?? null);
          const tradeChannel = findSessionNectarChannel(
            nectar,
            normalizeSym(symbol),
            "trade",
            activeTapeCapability?.providerPath,
          );
          const fidelityLabel = tradeChannel?.coverageState === "STALE"
            ? "UNAVAILABLE"
            : tradeChannel?.fidelity ?? "UNAVAILABLE";
          const fidelityColor = fidelityLabel === "OBSERVED" ? "#00C076"
                             : fidelityLabel === "DERIVED"  ? "#F0B429"
                             : fidelityLabel === "PROXY"    ? "#F0B429"
                             :                                "#8B92AC";
          const gapCount = tradeChannel?.gapCount ?? 0;
          const coverageEvents = tradeChannel?.observedEventCount ?? 0;
          if (!tradeChannel && s.tradeCount === 0) return null;
          const retentionShort = nectar.retentionState === "SESSION_ONLY_NO_RAW_PAYLOADS"
            ? "session-only"
            : nectar.retentionState === "SERVER_DURABLE_SUMMARY_NO_RAW_PAYLOADS"
              ? "server-durable receipt summary"
              : "browser summary only";
          // Sentinel "SAVED overclaim" P0 (Nectar authority §"P0 TRUTH
          // DEFECT — SAVED OVERCLAIM"): the previous label used "Saved N"
          // for every non-zero coverageEvents regardless of whether the
          // count was actually acknowledged by the append-only server
          // receipt ledger. That was false whenever retentionState was
          // SESSION_ONLY or BROWSER_LOCAL. Label honestly per tier:
          //   SERVER_DURABLE → "Saved"   (real server acknowledgement)
          //   BROWSER_LOCAL  → "Browser" (localStorage summary only)
          //   SESSION_ONLY   → "Observed" (in-memory, no persistence)
          const coverageLabel =
            nectar.retentionState === "SERVER_DURABLE_SUMMARY_NO_RAW_PAYLOADS" ? "Saved" :
            nectar.retentionState === "BROWSER_LOCAL_SUMMARY_NO_RAW_PAYLOADS"  ? "Browser" :
            "Observed";
          const coverageAriaClause =
            coverageLabel === "Saved"    ? `${coverageEvents} durably saved coverage observations` :
            coverageLabel === "Browser"  ? `${coverageEvents} browser-summary coverage observations` :
            `${coverageEvents} in-memory-only coverage observations (not persisted server-side)`;
          const coverageTitleLine =
            coverageLabel === "Saved"    ? `Durably saved coverage observations: ${coverageEvents}` :
            coverageLabel === "Browser"  ? `Browser-summary coverage observations: ${coverageEvents} (localStorage only, not server-acknowledged)` :
            `In-memory coverage observations: ${coverageEvents} (session-only, no persistence)`;
          return (
            <div
              className="wm-live-session-chip"
              data-nectar-received={nectar.receipts.received}
              data-nectar-accepted={nectar.receipts.accepted}
              data-nectar-quarantined={nectar.receipts.quarantined}
              data-nectar-unsupported={nectar.unsupportedCapabilities}
              role="group"
              aria-label={`Live footprint recording; historical bars before this tab opened stay blank. Nectar memory for ${normalizeSym(symbol)}. Fidelity ${fidelityLabel}. Accumulated summary — may include browser-restored counters. Summary delta ${fmt(s.delta)}. ${s.tradeCount} summary trades. ${coverageAriaClause}. ${s.bigTradeCount} summary large trades. ${gapCount} gaps. Coverage retention: ${retentionShort}. Raw tape is not retained.`}
              title={`LIVE TAPE — new bars only; historical bars before this tab opened stay blank.\nWM Nectar memory for ${normalizeSym(symbol)}.\nAccumulated summary — may include browser-restored counters; not raw tape.\nSummary horizon began: ${horizonTime}\nSummary buys: ${fmt(s.buyVol)}\nSummary sells: ${fmt(s.sellVol)}\nSummary delta = Buys − Sells\nFidelity: ${fidelityLabel} (source-classified)\n${coverageTitleLine}\nCollector receipts this runtime: ${nectar.receipts.accepted} accepted / ${nectar.receipts.quarantined} quarantined / ${nectar.unsupportedCapabilities} unsupported\nGaps observed: ${gapCount}\nCoverage retention: ${retentionShort} — operational counts/timestamps only; raw price/size/aggressor tape is not durably stored while provider rights remain UNKNOWN.`}
              data-visual-density="compact"
              style={{
                position: "absolute", top: 42, left: "50%", transform: "translateX(-50%)",
                zIndex: 58, padding: "5px 10px", borderRadius: 7, pointerEvents: "auto",
                background: "rgba(11,14,26,0.90)", border: "1px solid rgba(240,180,41,0.35)",
                color: "#D8DCEA", fontSize: 10, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                display: "flex", gap: 8, alignItems: "center",
              }}
            >
              <span style={{ color: "#00C076", fontWeight: 850 }}>● LIVE TAPE</span>
              <span>
                <span style={{ color: "#8B92AC", fontWeight: 600 }}>WM NECTAR</span>
                <span style={{ color: fidelityColor, fontWeight: 850, marginLeft: 6, letterSpacing: "0.02em" }}>· {fidelityLabel}</span>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#8B92AC", fontWeight: 600 }}>Δ </span>
                <span style={{ color: deltaColor, fontWeight: 850 }}>{deltaSign}{fmt(s.delta)}</span>
                {/* Live CVD sparkline — visually breathes as Δ moves; matches
                    Founder Mockup 1 living-intelligence aesthetic. Line color
                    follows current-delta polarity. Auto-scales to buffer
                    min/max so a small delta swing still reads clearly. */}
                {(() => {
                  const buf = cvdSparkRef.current;
                  if (buf.length < 2) return null;
                  const w = 44, h = 12;
                  const min = Math.min(...buf);
                  const max = Math.max(...buf);
                  const range = max - min || 1;
                  const step = w / (buf.length - 1);
                  const pts = buf.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`).join(" ");
                  // Zero line for reference — subtle grey.
                  const zeroY = min <= 0 && max >= 0 ? (h - ((0 - min) / range) * h) : null;
                  return (
                    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "visible" }} aria-hidden="true">
                      {zeroY !== null && (
                        <line x1={0} x2={w} y1={zeroY} y2={zeroY} stroke="rgba(139,146,172,0.35)" strokeWidth={0.5} strokeDasharray="2 2" />
                      )}
                      <polyline
                        fill="none"
                        stroke={deltaColor}
                        strokeWidth={1.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={pts}
                      />
                    </svg>
                  );
                })()}
              </span>
            </div>
          );
        })()}

        {/* Retained evidence stays reachable without laying a persistent data
            strip across price action. The disclosure opens only on intent. */}
        <NectarVaultChip activeSymbol={normalizeSym(symbol)} />

        {/* ── Big-Trade comic speech-bubble tooltip (🫧 hover) ─────── */}
        {bubbleTip && (() => {
          const buy   = bubbleTip.side === "buy";
          const accent = buy ? "#00E696" : "#FF465A";
          // clamp within view
          const left = Math.max(70, Math.min((wrapRef.current?.clientWidth ?? 800) - 70, bubbleTip.x));
          const top  = Math.max(54, bubbleTip.y - 14);
          return (
            <div style={{
              position: "absolute", left, top, transform: "translate(-50%, -100%)",
              zIndex: 60, pointerEvents: "none",
            }}>
              <div style={{
                position: "relative",
                background: "#0E1322",
                border: `2.5px solid ${accent}`,
                borderRadius: 14,
                padding: "8px 12px 9px",
                minWidth: 132,
                boxShadow: `0 6px 22px rgba(0,0,0,0.55), 0 0 16px ${accent}55`,
                fontFamily: "Inter, system-ui, sans-serif",
              }}>
                {/* Header: WM "W" logo + label */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 20, height: 20, borderRadius: 6,
                    background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
                    color: "#06080F", fontWeight: 900, fontSize: 13, lineHeight: 1,
                    boxShadow: `0 0 8px ${accent}88`,
                  }}>W</span>
                {/* Owned by bubbleClaim.ts. A delta bubble reads NET BUY /
                    SELL PRESSURE because its number is a net; only a big
                    trade's dominant-side volume earns the bare word
                    AGGRESSIVE. This chip was hard-coded to the one-sided
                    wording for both kinds. */}
                  <span style={{ color: accent, fontWeight: 800, fontSize: 11, letterSpacing: 0.3 }}>
                    {bubbleTip.heading}
                  </span>
                </div>
                {/* The headline number — written by the same owner as the
                    heading above it, so the two can never describe different
                    quantities. */}
                <div style={{ color: "#fff", fontWeight: 900, fontSize: 18, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                  {bubbleTip.headline}
                </div>
                {/* Both aggressor sides, so the trader can see what the
                    headline is a total OF — e.g. "20.0k bought · 7.6k sold". */}
                <div style={{ color: "#9AA3BF", fontWeight: 600, fontSize: 9.5, marginTop: 3, maxWidth: 172 }}>
                  {bubbleTip.text}
                </div>
                {/* Comic tail pointer */}
                <div style={{
                  position: "absolute", bottom: -9, left: "50%", transform: "translateX(-50%)",
                  width: 0, height: 0,
                  borderLeft: "9px solid transparent", borderRight: "9px solid transparent",
                  borderTop: `10px solid ${accent}`,
                }} />
                <div style={{
                  position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)",
                  width: 0, height: 0,
                  borderLeft: "6px solid transparent", borderRight: "6px solid transparent",
                  borderTop: "7px solid #0E1322",
                }} />
              </div>
            </div>
          );
        })()}
        {/* WM branding — small, non-obtrusive W badge tucked in the
            bottom-left corner. (Was a large "WealthyMindsets" text pill that
            crowded the price action; per user request it's now just the W.) */}
        <div
          title="WealthyMindsets Pro"
          style={{
            position: "absolute", bottom: 6, left: 6,
            cursor: "default", zIndex: 10, userSelect: "none",
            pointerEvents: "none", opacity: 0.55,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="22" cy="22" r="21" fill="#0D1117" stroke="#F0B429" strokeWidth="2"/>
            <path d="M8 13 L13.5 31 L19 20 L22 25 L25 20 L30.5 31 L36 13" stroke="#F0B429" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </div>
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ mixBlendMode: "normal", opacity: flowOpacity, zIndex: 5 }}
        />
        {/*
          VP DECLINE NOTICE — the empty lane explains itself.

          Sits over the RIGHT edge, where the profile column would have been, so
          the notice occupies the very space whose emptiness it is accounting
          for. Rendered ONLY when a requested column did not draw: a chip that
          appeared on every frame would be chrome, and chrome is ignored.

          NOT opacity-dimmed with `flowOpacity`. That control dims the ORDER-FLOW
          PAINT so drawings stand out; a missing-work notice is not paint, and a
          trader who has dimmed the overlay to 15% has not asked to be told less
          truth about it.
        */}
        {vpDeclineNote && (
          <div
            data-vp-decline-notice
            role="status"
            className="absolute pointer-events-none"
            style={{
              top: 8, right: 8, zIndex: 6,
              maxWidth: 260,
              padding: "4px 8px",
              borderRadius: 4,
              border: "1px solid rgba(240,180,41,0.45)",
              background: "rgba(13,17,23,0.92)",
              color: "#F0B429",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.02em",
              lineHeight: 1.35,
            }}
          >
            {vpDeclineNote}
          </div>
        )}
        {/*
          CAMERA-MOVED NOTICE — the chart changed width and could not carry your
          bars across it.

          Bottom-LEFT, clear of the VP decline notice at top-right, because the
          two can fire at once and a notice that covers another notice tells the
          trader less than either would alone.

          Rendered only on a refusal. When the camera IS preserved there is
          nothing to report — the bars in front of the trader are the bars they
          were already reading, and saying so every time would train them to
          ignore the one time it is not true.
        */}
        {cameraNote && (
          <div
            data-camera-moved-notice
            role="status"
            className="absolute pointer-events-none"
            style={{
              bottom: TIMEFRAME_FOOTER_H + 8, left: 8, zIndex: 6,
              maxWidth: 300,
              padding: "4px 8px",
              borderRadius: 4,
              border: "1px solid rgba(240,180,41,0.45)",
              background: "rgba(13,17,23,0.92)",
              color: "rgba(240,180,41,1)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.02em",
              lineHeight: 1.35,
            }}
          >
            {cameraNote}
          </div>
        )}
        {/* Drawing tools canvas — pointer-events only when tool is active */}
        <canvas
          ref={drawCanvasRef}
          className="absolute top-0 left-0"
            style={{
            cursor: drawingTool === "cursor" ? "default"
                  : drawingTool === "select" ? "move"
                  : drawingTool === "eraser" ? "cell"
                  : TEXT_TOOLS.has(drawingTool) ? "text"
                  : "crosshair",
            pointerEvents: drawingTool !== "cursor" ? "all" : (overDrawing ? "all" : "none"),
            opacity: drawingsVisible ? 1 : 0,
            zIndex: 10,
            touchAction: "none",
            willChange: drawingTool !== "cursor" ? "contents" : "auto",
          }}
          onPointerDown={handleDrawPointerDown}
          onPointerMove={handleDrawPointerMove}
          onPointerUp={handleDrawPointerUp}
          onPointerCancel={handleDrawPointerEnd}
          onLostPointerCapture={handleDrawPointerEnd}
          onDoubleClick={handleDrawDoubleClick}
        />

        {/* ── Floating edit toolbar for the selected drawing ─────────
             Appears when a drawing is selected (via SELECT tool or a
             clean click in cursor mode). Edits mutate the drawing's
             style ref in place, then bump editBump + rangeVer to redraw. */}
        {selectedIdx != null && drawingsRef.current[selectedIdx] && !lockDrawings && (() => {
          const d = drawingsRef.current[selectedIdx];
          const anchor = logicalToPixel(d.pts[0]);
          const cw = containerRef.current?.offsetWidth ?? 800;
          const barW = 316;
          const left = Math.max(6, Math.min(cw - barW - 6, (anchor?.x ?? 100) - 30));
          const top  = Math.max(4, (anchor?.y ?? 70) - 46);
          const bump = () => { setEditBump(v => v + 1); setRangeVer(v => v + 1); };
          const btn = (active: boolean): React.CSSProperties => ({
            display: "flex", alignItems: "center", justifyContent: "center",
            minWidth: 22, height: 22, padding: "0 5px", borderRadius: 5, cursor: "pointer",
            fontSize: 11, lineHeight: 1, color: active ? "#0B0E1A" : "#C7D0E8",
            background: active ? "#4FA3E0" : "rgba(255,255,255,0.05)",
            border: `1px solid ${active ? "#4FA3E0" : "rgba(255,255,255,0.10)"}`,
          });
          const isText = TEXT_TOOLS.has(d.tool);
          return (
            <div
              key={editBump}
              style={{
                position: "absolute", left, top, zIndex: 130,
                display: "flex", alignItems: "center", gap: 4, padding: "5px 6px",
                background: "#141824", border: "1px solid #2A3350", borderRadius: 9,
                boxShadow: "0 8px 26px rgba(0,0,0,0.55)",
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* Color — swatch button opens a palette + full color wheel dropdown */}
              <div style={{ position: "relative" }}>
                <button title="Color" onClick={() => setDrawPopover(p => (p === "color" ? null : "color"))}
                  style={{ ...btn(drawPopover === "color"), padding: "0 6px", gap: 4 }}>
                  <span style={{ width: 13, height: 13, borderRadius: "50%", background: d.style.color, border: "1px solid rgba(255,255,255,0.5)" }} />
                  <span style={{ fontSize: 8, opacity: 0.7 }}>▼</span>
                </button>
                {drawPopover === "color" && (
                  <div style={{ position: "absolute", top: 28, left: 0, zIndex: 140, padding: 8, borderRadius: 8, width: 172,
                    background: "#0E1322", border: "1px solid #2A3350", boxShadow: "0 8px 26px rgba(0,0,0,0.6)" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                      {DRAW_COLORS.map(c => (
                        <button key={c} title={c} onClick={() => { d.style.color = c; bump(); }}
                          style={{ width: 18, height: 18, borderRadius: "50%", cursor: "pointer", background: c,
                            border: d.style.color === c ? "2px solid #fff" : "1px solid rgba(255,255,255,0.2)" }} />
                      ))}
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#9AA3BF", cursor: "pointer" }}>
                      <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(d.style.color) ? d.style.color : "#4fa3e0"}
                        onChange={e => { d.style.color = e.target.value; bump(); }}
                        style={{ width: 26, height: 22, padding: 0, border: "none", background: "none", cursor: "pointer" }} />
                      Custom color wheel
                    </label>
                  </div>
                )}
              </div>
              <div style={{ width: 1, height: 18, background: "#2A3350" }} />
              {/* Line width dropdown */}
              <div style={{ position: "relative" }}>
                <button title="Line width" onClick={() => setDrawPopover(p => (p === "width" ? null : "width"))}
                  style={{ ...btn(drawPopover === "width"), padding: "0 6px", gap: 4 }}>
                  <span style={{ display: "inline-block", width: 14, height: Math.max(1, Math.round(d.style.width)), background: "currentColor", borderRadius: 2 }} />
                  <span style={{ fontSize: 8, opacity: 0.7 }}>▼</span>
                </button>
                {drawPopover === "width" && (
                  <div style={{ position: "absolute", top: 28, left: 0, zIndex: 140, padding: 5, borderRadius: 8, display: "flex", gap: 4,
                    background: "#0E1322", border: "1px solid #2A3350", boxShadow: "0 8px 26px rgba(0,0,0,0.6)" }}>
                    {[1, 2, 3, 4, 6].map(w => (
                      <button key={w} title={`${w}px`} onClick={() => { d.style.width = w; bump(); setDrawPopover(null); }}
                        style={btn(Math.round(d.style.width) === w)}>
                        <span style={{ display: "inline-block", width: 16, height: w, background: "currentColor", borderRadius: 2 }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ width: 1, height: 18, background: "#2A3350" }} />
              {/* Line style (solid / dashed / dotted) dropdown */}
              <div style={{ position: "relative" }}>
                <button title="Line style" onClick={() => setDrawPopover(p => (p === "dash" ? null : "dash"))}
                  style={{ ...btn(drawPopover === "dash"), padding: "0 6px", gap: 4 }}>
                  {d.style.dash === "dashed" ? "- -" : d.style.dash === "dotted" ? "···" : "──"}
                  <span style={{ fontSize: 8, opacity: 0.7 }}>▼</span>
                </button>
                {drawPopover === "dash" && (
                  <div style={{ position: "absolute", top: 28, left: 0, zIndex: 140, padding: 5, borderRadius: 8, display: "flex", gap: 4,
                    background: "#0E1322", border: "1px solid #2A3350", boxShadow: "0 8px 26px rgba(0,0,0,0.6)" }}>
                    {(["solid", "dashed", "dotted"] as const).map(s => (
                      <button key={s} title={s} onClick={() => { d.style.dash = s; bump(); setDrawPopover(null); }} style={btn(d.style.dash === s)}>
                        {s === "solid" ? "──" : s === "dashed" ? "- -" : "···"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ width: 1, height: 18, background: "#2A3350" }} />
              <input
                type="range" min={10} max={100} step={5}
                title="Opacity"
                value={Math.round((d.style.opacity ?? 1) * 100)}
                onChange={e => { d.style.opacity = Number(e.target.value) / 100; bump(); }}
                style={{ width: 52, accentColor: "#4FA3E0" }}
              />
              {FILL_TOOLS.has(d.tool) && d.tool !== "delta-vp" && (
                <>
                  <div style={{ width: 1, height: 18, background: "#2A3350" }} />
                  <button title="Fill" onClick={() => { d.style.fill = !d.style.fill; bump(); }} style={btn(d.style.fill)}>▧</button>
                </>
              )}
              {isText && (
                <>
                  <div style={{ width: 1, height: 18, background: "#2A3350" }} />
                  <button title="Edit text" onClick={() => setTextEdit({ idx: selectedIdx })} style={btn(false)}>✎</button>
                </>
              )}
              <div style={{ width: 1, height: 18, background: "#2A3350" }} />
              <button title="Delete" onClick={() => { drawingsRef.current.splice(selectedIdx, 1); setSelectedIdx(null); setRangeVer(v => v + 1); }}
                style={{ ...btn(false), color: "#FF6B81" }}>🗑</button>
            </div>
          );
        })()}

        {/* ── Inline text editor — clean box that appears over a text-bearing
             drawing's anchor point. Replaces the old window.prompt() native
             dialog: matches the "clean editing box" spec and is drivable both
             by a human and programmatically. Commit on Enter/blur, cancel on
             Escape. If the field is left empty on a brand-new drawing, the
             drawing is discarded. ───────────────────────────────────────── */}
        {textEdit != null && drawingsRef.current[textEdit.idx] && !lockDrawings && (() => {
          const idx = textEdit.idx;
          const d = drawingsRef.current[idx];
          const p = logicalToPixel(d.pts[0]);
          const cw = containerRef.current?.offsetWidth ?? 800;
          const boxW = 190;
          const left = Math.max(6, Math.min(cw - boxW - 6, (p?.x ?? 100)));
          const top  = Math.max(4, (p?.y ?? 70) + 6);
          const commit = (raw: string) => {
            const t = raw.trim();
            if (t === "") {
              // Empty on a freshly-placed text drawing → discard it entirely.
              if (idx === drawingsRef.current.length - 1) {
                drawingsRef.current.splice(idx, 1);
                setSelectedIdx(null);
              }
            } else {
              d.text = t;
            }
            setTextEdit(null);
            setRangeVer(v => v + 1);
          };
          return (
            <input
              key={`txt-${idx}`}
              autoFocus
              defaultValue={d.text ?? ""}
              placeholder="Type text…"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") { e.preventDefault(); commit((e.target as HTMLInputElement).value); }
                else if (e.key === "Escape") {
                  e.preventDefault();
                  // Cancel: discard if it was a brand-new empty text drawing.
                  if ((d.text ?? "") === "" && idx === drawingsRef.current.length - 1) {
                    drawingsRef.current.splice(idx, 1);
                    setSelectedIdx(null);
                  }
                  setTextEdit(null);
                  setRangeVer(v => v + 1);
                }
              }}
              onBlur={(e) => commit(e.target.value)}
              style={{
                position: "absolute", left, top, zIndex: 131, width: boxW,
                height: 28, padding: "0 9px", borderRadius: 7, outline: "none",
                fontSize: 12, color: "#EAF0FF", background: "#141824",
                border: "1px solid #4FA3E0", boxShadow: "0 8px 26px rgba(0,0,0,0.55)",
              }}
            />
          );
        })()}

        {/* ── Small "reset scale" button — appears ONLY after the user has
             manually stretched the price axis by dragging the numbers. Replaces
             the old double-click-to-reset gesture with an explicit, discoverable
             control. Sits just left of the price axis, top-right. ─── */}
        {scaleLocked && (
          <button
            onClick={() => {
              manualPriceRangeRef.current = null;
              setScaleLocked(false);
              setAutoScale(true);
              try {
                candleRef.current?.applyOptions({ autoscaleInfoProvider: autoscaleProviderRef.current });
                chartRef.current?.priceScale("right").applyOptions({ autoScale: true });
              } catch {}
            }}
            title="Reset price scale to auto-fit"
            style={{
              position: "absolute", right: 62, top: 8, zIndex: 55,
              height: 22, padding: "0 8px", borderRadius: 5, fontSize: 9.5, fontWeight: 800,
              cursor: "pointer", letterSpacing: 0.3, whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: 4,
              background: "rgba(240,180,41,0.22)", border: "1px solid rgba(240,180,41,0.65)", color: "#F0B429",
              backdropFilter: "blur(3px)", boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
            }}>
            ⤢ Reset Scale
          </button>
        )}

        {/* ── Scale buttons — bottom-right, above the time axis so they
             no longer clutter / overlap the price action at top ─── */}
        <div style={{
          position:"absolute", right: 64, bottom: 30, display:"flex", flexDirection:"row", gap: 4, zIndex: 50, alignItems:"center",
          padding: "3px 4px", borderRadius: 6,
          background: "rgba(8,12,20,0.55)", backdropFilter: "blur(3px)",
        }}>
          {/* MEASURED LIVE 2026-09-17: all four of these glyphs returned
              aria-label="" and aria-pressed=null, so their accessible names
              were "R", "A", "percent" and "L" — and `%` and `L` carried their
              state in a background colour and nowhere else. Their titles were
              bare nouns, identical in both states, on a control that decides
              whether the price axis is showing PRICES or PERCENTAGES.
              chartAxisControlLabel owns the name, the hover and the pressed
              state for all four. The glyphs are deliberately unchanged. */}
          {/* Reset View — undo vertical drag, re-fit price + time to the data */}
          <button
            onClick={() => {
              manualPriceRangeRef.current = null;
              setAutoScale(true);
              try {
                chartRef.current?.timeScale().fitContent();
                chartRef.current?.timeScale().scrollToRealTime();
              } catch {}
            }}
            title={chartAxisControlLabel("RESET", false).title}
            aria-label={chartAxisControlLabel("RESET", false).spoken}
            style={{
              width: 22, height: 22, borderRadius: 4, fontSize: 11, fontWeight: 800, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(47,128,237,0.16)", border: "1px solid rgba(47,128,237,0.5)", color: "#2F80ED",
            }}>
            {chartAxisControlLabel("RESET", false).glyph}
          </button>
          {/* Clear Auto/Lock toggle — when LOCKED, drag the price axis up/down freely */}
          <button
            onClick={() => setAutoScale(v => !v)}
            title={chartAxisControlLabel("AUTO_SCALE", autoScale).title}
            aria-label={chartAxisControlLabel("AUTO_SCALE", autoScale).spoken}
            aria-pressed={chartAxisControlLabel("AUTO_SCALE", autoScale).pressed}
            style={{
              width: 22, height: 22, borderRadius: 4, fontSize: 11, fontWeight: 800, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: autoScale ? "rgba(0,200,118,0.18)" : "rgba(240,180,41,0.20)",
              border: `1px solid ${autoScale ? "rgba(0,200,118,0.5)" : "rgba(240,180,41,0.6)"}`,
              color: autoScale ? "#00C076" : "#F0B429",
            }}>
            {chartAxisControlLabel("AUTO_SCALE", autoScale).glyph}
          </button>
          {([
            { control: "PERCENT" as const, active: pctMode, onClick: () => setPctMode(v => !v) },
            { control: "LOG" as const,     active: logScale, onClick: () => setLogScale(v => !v) },
          ]).map(btn => {
            // The state of these two lived in `background` and nowhere else.
            // The owner supplies a name, a hover and an aria-pressed that all
            // say which way the mode is currently set.
            const c = chartAxisControlLabel(btn.control, btn.active);
            return (
            <button key={btn.control} onClick={btn.onClick} title={c.title}
              aria-label={c.spoken} aria-pressed={c.pressed} style={{
              width: 22, height: 22, borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer",
              background: btn.active ? "rgba(47,128,237,0.2)" : "rgba(20,24,36,0.85)",
              border: `1px solid ${btn.active ? "rgba(47,128,237,0.5)" : "#263050"}`,
              color: btn.active ? "#2F80ED" : "#8896BE",
            }}>
              {c.glyph}
            </button>
            );
          })}
          {/* Declutter: cycle order-flow overlay opacity (footprint/bubbles/VP)
              100% → 40% → 15% → 100% so drawings + price read clean over a busy
              chart, TradingView-style. Dimmed state is highlighted. */}
          <button
            onClick={() => setFlowOpacity(o => (o > 0.7 ? 0.4 : o > 0.25 ? 0.15 : 1))}
            title={`Order-flow overlay opacity: ${Math.round(flowOpacity * 100)}% — click to dim footprint / bubbles / VP so drawings and price stand out (cycles 100 → 40 → 15%)`}
            style={{
              height: 22, padding: "0 6px", borderRadius: 4, fontSize: 9, fontWeight: 800, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 3, whiteSpace: "nowrap",
              background: flowOpacity < 0.99 ? "rgba(240,180,41,0.20)" : "rgba(20,24,36,0.85)",
              border: `1px solid ${flowOpacity < 0.99 ? "rgba(240,180,41,0.6)" : "#263050"}`,
              color: flowOpacity < 0.99 ? "#F0B429" : "#8896BE",
            }}>
            ◐ {Math.round(flowOpacity * 100)}%
          </button>
        </div>

        {/* ── Data Window ──────────────────────────────────
            MEASURED LIVE 2026-09-17, NQ1! 30m, ONE viewport: this panel read
            "C 29558.25" while the OHLC strip six rows above read "C 29698.25"
            and the header read 29698.25. One instrument, one instant, 140
            points apart, both labelled C — canon Weakness #1 / moat #1 stated
            as plainly as the product will ever state it. Neither number was
            wrong; this panel reports the CROSSHAIR bar. What was missing was
            WHICH BAR, and `dataWindow.time` was already in state and simply
            never rendered. dataWindowBarScope owns the heading, the scope line
            and every cell's hover, and composes selectChartCloseLabel so `C`
            still has to earn the word on a bar that is still forming. */}
        {dataWindowOpen && dataWindow && (() => {
          const lastBar = barsRef.current[barsRef.current.length - 1];
          const scope = dataWindowBarScope(
            dataWindow.time,
            timeframe,
            !!lastBar && lastBar.time === dataWindow.time,
            nowMs,
          );
          return (
          <div
            role="group"
            aria-label={scope.spoken}
            data-data-window-historical={scope.historical ? "true" : "false"}
            style={{
              position: "absolute", top: 8, left: 48, zIndex: 60,
              background: "rgba(20,24,36,0.92)",
              // The border is the one place this panel may shout. It is chosen
              // from scope.historical, never from "a value is present".
              border: `1px solid ${scope.historical ? "#F0B429" : "#2F80ED"}`,
              borderRadius: 6, padding: "7px 10px",
              pointerEvents: "none",
              minWidth: 140,
            }}>
            <div title={scope.spoken} style={{ fontSize: 9, fontWeight: 700, color: scope.historical ? "#F0B429" : "#2F80ED", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {scope.heading}
            </div>
            {/* The scope line, not a hover. A panel whose scope is reachable
                only by hovering is a panel that competes with the header. */}
            <div style={{ fontSize: 8.5, fontWeight: 600, color: scope.historical ? "#F0B429" : "#62697d", marginBottom: 5, whiteSpace: "nowrap" }}>
              {scope.subheading}
            </div>
            {[
              { cell: scope.open,   value: dataWindow.o, color: "#E2E8FF" },
              { cell: scope.high,   value: dataWindow.h, color: "#00C076" },
              { cell: scope.low,    value: dataWindow.l, color: "#FF4D67" },
              { cell: scope.close,  value: dataWindow.c, color: "#E2E8FF" },
              { cell: scope.volume, value: dataWindow.v, color: "#8896BE", fmt: (v: number) => v.toLocaleString() },
            ].map(row => (
              <div key={row.cell.label} title={row.cell.title} style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 2 }}>
                <span style={{ fontSize: 10, color: "#4A5580", fontFamily: "monospace" }}>{row.cell.label}</span>
                <span style={{ fontSize: 10, color: row.color, fontFamily: "monospace" }}>
                  {row.fmt ? row.fmt(row.value) : row.value.toFixed(base < 10 ? 4 : 2)}
                </span>
              </div>
            ))}
          </div>
          );
        })()}

        {/* Toggle data window button

            MOVED DOWN 28px, NOT REMOVED. LOOKED AT, NOT INFERRED: 2026-09-21,
            scratchpad/top-clip.png beside canon frame F24. This button held
            `top: 8` from the era when the pane's top-left was empty because the
            price legend lived in a chrome ROW above the field. The legend is
            now an overlay in that exact corner — F24's arrangement — so the
            two literally printed on top of each other, the 22px chip sitting
            under the "30815.50" glyphs.

            `BELOW_PRICE_LEGEND` is the legend's height plus the 8px inset this
            button always had, so it keeps its original margin from the thing
            above it instead of inventing a new number — and it is DERIVED, so
            it cannot drift from the legend the way a literal `36` would.
            Capability is untouched: same control, same handler, same title,
            one corner down. */}
        <button
          onClick={() => setDataWindowOpen(v => !v)}
          title={dataWindowOpen ? "Hide data window" : "Show data window"}
          style={{
            position: "absolute", top: BELOW_PRICE_LEGEND, left: PANE_TOP_LEFT_INSET, zIndex: 70,
            width: 22, height: 22, borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer",
            background: dataWindowOpen ? "rgba(47,128,237,0.2)" : "rgba(20,24,36,0.85)",
            border: `1px solid ${dataWindowOpen ? "rgba(47,128,237,0.5)" : "#263050"}`,
            color: dataWindowOpen ? "#2F80ED" : "#8896BE",
          }}
        >
          D
        </button>

        {/* ── Right-click context menu ──────────────────── */}
        {ctxMenu && (
          <div
            style={{
              position: "absolute", left: ctxMenu.x, top: ctxMenu.y, zIndex: 200,
              background: "#141824",
              border: "1px solid #263050",
              borderRadius: 8,
              minWidth: 180,
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              overflow: "hidden",
            }}
            onMouseLeave={() => setCtxMenu(null)}
          >
            <div style={{ padding: "5px 10px 4px", borderBottom: "1px solid #263050" }}>
              <span style={{ fontSize: 10, color: "#4A5580" }}>
                Price: <span style={{ color: "#F5A623", fontFamily: "monospace" }}>{ctxMenu.price}</span>
              </span>
            </div>
            {[
              ...(ctxMenu.nearDrawingIdx !== null ? [
                {
                  label: "🎨 Edit style", color: "#4FA3E0",
                  action: () => {
                    setSelectedIdx(ctxMenu.nearDrawingIdx);
                    setEditBump(v => v + 1);
                    scheduleDrawRender();
                  },
                },
                {
                  label: "🗑 Delete this drawing", color: "#FF4D6A",
                  action: () => {
                    drawingsRef.current.splice(ctxMenu.nearDrawingIdx!, 1);
                    setSelectedIdx(null);
                    scheduleDrawRender();
                    setRangeVer(v => v + 1);
                  },
                },
              ] : []),
              {
                label: `🔔 Add Alert at ${ctxMenu.price}`, color: "#F5A623",
                action: () => {
                  onCreatePriceAlert?.(ctxMenu.price);
                  showAlertToast({ id: `ctx-${Date.now()}`, text: `Alert queued at ${ctxMenu.price}` });
                },
              },
              { label: "― Horizontal Line", color: "#8896BE", action: () => {
                const lp = pixelToLogical(ctxMenu.x, ctxMenu.y);
                if (lp) { drawingsRef.current.push(makeDrawing("hline", [lp])); scheduleDrawRender(); setRangeVer(v => v + 1); }
              }},
              { label: "✎ Add Text", color: "#8896BE", action: () => {
                const lp = pixelToLogical(ctxMenu.x, ctxMenu.y);
                if (lp) {
                  drawingsRef.current.push(makeDrawing("text", [lp], ""));
                  const newIdx = drawingsRef.current.length - 1;
                  setSelectedIdx(newIdx);
                  scheduleDrawRender();
                  setRangeVer(v => v + 1);
                  setTextEdit({ idx: newIdx });
                }
              }},
              { label: "📋 Copy price", color: "#8896BE", action: () => { navigator.clipboard.writeText(String(ctxMenu.price)).catch(() => {}); }},
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  item.action?.();
                  setCtxMenu(null);
                }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "7px 12px", fontSize: 12, cursor: "pointer",
                  background: "none", border: "none",
                  color: item.color,
                  borderTop: i > 0 ? "1px solid rgba(38,48,80,0.3)" : "none",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Dismiss context menu on click outside */}
        {ctxMenu && (
          <div style={{ position: "absolute", inset: 0, zIndex: 199 }} onClick={() => setCtxMenu(null)} />
        )}
      </div>
    </div>
  );
}
