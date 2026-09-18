"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X, ChevronDown, ChevronRight, AlertCircle, CheckCircle2, TrendingUp, TrendingDown, Zap, Eye, Swords, GraduationCap, Info, Droplets, Minimize2, Maximize2 } from "lucide-react";
import { WMLogo } from "@/components/ui/WMLogo";
import { clsx } from "clsx";
import { getFabioInsights, inferAssetClass } from "@/lib/fabio";
import { evaluateClcEvidence } from "@/lib/decisionIntegrity";
import { WM } from "@/lib/design/wmTokens";
import {
  selectAggressorFlow,
  type AggressorFlowSnapshot,
} from "@/lib/marketData/selectAggressorFlow";
import { aggressorProvenanceNote } from "@/lib/marketData/aggressorProvenanceNote";
// `aggressorTapeReason` is no longer read here directly — the drawer's single
// missing-input banner owns the call now, so this surface cannot state the
// absence twice. See selectMissingTapeBanner for why that mattered.
import { selectMissingTapeBanner } from "@/lib/marketData/selectMissingTapeBanner";
import { formatImbalanceRatio } from "@/lib/marketData/formatImbalanceRatio";
import { getSmartMoneyPanelLayout } from "./smartMoneyLayout";
import { computeConfluence as computeConfluenceV1 } from "@/lib/marketData/confluence";
import ValueCandlePanel from "@/components/experience/ValueCandlePanel";
import { useOrderFlowReadings } from "@/lib/marketData/useOrderFlowReadings";
import { useWebSocket } from "@/hooks/useWebSocket";
import AbsorptionAnatomyPanel from "@/components/experience/AbsorptionAnatomyPanel";
import DeltaDivergencePanel from "@/components/experience/DeltaDivergencePanel";
import LiquidityWeatherPanel from "@/components/experience/LiquidityWeatherPanel";
import StackedImbalancePanel from "@/components/experience/StackedImbalancePanel";
import { selectDeltaLevels } from "@/lib/marketData/viewModels/selectDeltaLevels";
import {
  capDeltaLevels,
  DELTA_LEVEL_CAP_CHOICES,
  DELTA_LEVEL_CAP_DEFAULT,
  DELTA_LEVEL_CAP_EVENT,
  DELTA_LEVEL_CAP_STORAGE_KEY,
  normalizeDeltaLevelCap,
} from "@/lib/marketData/deltaLevelCap";

// ─── Signal types ────────────────────────────────────────────────────────────
type SignalStrength = "strong" | "moderate" | "weak" | "neutral";

interface Signal {
  name: string;
  value: string;
  strength: SignalStrength;
  bullish: boolean | null;
  description?: string;
}

function fmt(n: number, dp = 2) { return n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp }); }

/** Signed net-delta text. Crypto deltas are fractional — Coinbase prints trade
 *  sizes as small as 1.6e-7 BTC — so rounding to an integer erases them, and JS
 *  `Math.round(-0.02)` yields negative zero, which passes `>= 0` yet prints
 *  "-0", producing the nonsense "Δ +-0". Never round here: scale precision to
 *  magnitude, fall back to exponent notation rather than collapse a real
 *  non-zero delta to "0", and take the sign from the true value. */
function fmtDelta(v: number): string {
  const n = Number.isFinite(v) && !Object.is(v, -0) ? v : 0;
  const a = Math.abs(n);
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  if (a === 0) return "0";
  const dp = a >= 1000 ? 0 : a >= 1 ? 2 : a >= 0.01 ? 4 : 8;
  let body = a.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: dp });
  // A real, non-zero delta must never render as "0" — show it in exponent form.
  if (Number(body.replace(/,/g, "")) === 0) body = a.toExponential(1);
  return `${sign}${body}`;
}

// Real order-flow snapshot measured from live WebSocket ticks + the live 1m bar.
// Everything the panel votes on is derived from THESE numbers — no seeded bias.
/**
 * The panel's flow shape is the CANONICAL SNAPSHOT plus one field the tape
 * does not own.
 *
 * It used to be a hand-retyped copy of every field in `AggressorFlowSnapshot`,
 * and the comment that used to sit on `oneSided` right here explained exactly
 * what that costs: the selector gained the `oneSided` correction, this panel
 * "never received the field, because it never adopted the selector that owns
 * it", and for that whole window it painted a 300 sentinel as a measured
 * ratio. The list was retyped once, so it drifted once. It would have drifted
 * again on `provenance` (2026-09-11) — a retyped list is not a shape, it is a
 * snapshot of a shape taken on the day someone typed it.
 *
 * `extends` is the fix that cannot drift: the owner adds a field, this panel
 * has it, and there is no list here to forget to update.
 */
interface Flow extends AggressorFlowSnapshot {
  /** Live bar close >= open. NOT flow — it reads the bar, not the tape. */
  candleUp: boolean;
}

// Combine the three INDEPENDENT real reads (delta, price-vs-VWAP, candle body) into
// a single directional bias by majority vote. This is what fixes the "Smart Money
// said BEAR while order flow was BULL" bug: the bias now IS the order flow.
function biasFromFlow(price: number, f: Flow): boolean {
  const votes = [f.cvd >= 0, price >= f.vwap, f.candleUp];
  return votes.filter(Boolean).length >= 2;
}

function generateSignals(symbol: string, price: number, f: Flow): Signal[] {
  if (price <= 0) price = 100;
  const dp = price > 1000 ? 0 : price > 10 ? 2 : 4;
  const tick = price > 10_000 ? 0.25 : price > 1000 ? 0.25 : price > 10 ? 0.01 : 0.0001;
  // VWAP reference bands are explicitly fixed-distance context, not observed levels.
  const vwap     = f.vwap > 0 ? +f.vwap.toFixed(dp) : +(price).toFixed(dp);
  const vwapUp   = +(vwap * 1.004).toFixed(dp);
  const vwapDown = +(vwap * 0.996).toFixed(dp);

  // ── REAL directional reads ───────────────────────────────────────────────
  const bullBias = biasFromFlow(price, f);          // majority of real signals
  const cvdVal   = f.cvd;                           // REAL cumulative delta (unrounded)
  const cvdPos   = cvdVal >= 0;
  const askDom   = f.askDom;                         // REAL imbalance side
  const imbRatio = Math.round(f.imbRatio);           // REAL dominant/passive %
  const aboveVwap = price >= vwap;

  const entryPx  = +(price + (bullBias ? tick * 2 : -tick * 2)).toFixed(dp);

  // Confidence scales with how one-sided the real delta is.
  const totVol   = f.askVol + f.bidVol;
  const deltaConf = totVol > 0 ? Math.min(96, 55 + Math.round(Math.abs(f.cvd) / totVol * 60)) : 60;

  // "delta-confirmed" is only true when the feed actually carries aggressor tape.
  return [
    // VWAP — REAL volume-weighted price of recent tape
    { name: "VWAP", value: fmt(vwap, dp), strength: "strong", bullish: aboveVwap, description: aboveVwap ? "Price above session VWAP — bullish context" : "Price below session VWAP — bearish context" },
    { name: "VWAP Upper Band", value: fmt(vwapUp, dp), strength: "moderate", bullish: price < vwapUp },
    { name: "VWAP Lower Band", value: fmt(vwapDown, dp), strength: "moderate", bullish: price > vwapDown },

    // Order Flow — driven by REAL aggressive bid/ask volume
    // Order-flow imbalance is only meaningful when the feed actually carries
    // per-trade aggressor side. When it doesn't (askVol+bidVol == 0) we must NOT
    // fabricate a "100% buy-heavy / real buying on tape" reading — report N/A.
    f.hasFlow
      // The ratio is spoken through the CANONICAL formatter, which owns both the
      // one-sided sentinel and the unbounded crypto tail. This panel used to
      // print `${imbRatio}%` raw — so it could render "300% Ask (buy)-heavy"
      // from a sentinel, or "27261700%" from a fractional opposing side.
      ? { name: "Order Flow Imbalance", value: `${formatImbalanceRatio(f.imbRatio, f.oneSided)} ${askDom ? "Ask (buy)" : "Bid (sell)"}-heavy`, strength: f.oneSided || imbRatio > 160 ? "strong" : "moderate", bullish: askDom, description: f.oneSided ? `Every aggressor print in this window ${askDom ? "lifted the offer" : "hit the bid"} — there is no opposing volume to form a ratio` : `Aggressive ${askDom ? "buyers lifting offers" : "sellers hitting bids"} dominate the tape` }
      : { name: "Order Flow Imbalance", value: "N/A — no aggressor tape", strength: "neutral", bullish: null, description: "This feed has no per-trade buy/sell side; imbalance can't be measured" },
    f.hasFlow
      ? { name: "Aggressive Buyers vs Sellers", value: `Buyers ${fmt(f.askVol,0)} · Sellers ${fmt(f.bidVol,0)}`, strength: "strong", bullish: askDom, description: "Market-order volume by side (real ticks)" }
      : { name: "Aggressive Buyers vs Sellers", value: "N/A — no tick-level side data", strength: "neutral", bullish: null, description: "Requires a feed that tags each trade as buy or sell" },
    { name: "Absorption", value: "N/A — needs passive-fill data", strength: "neutral", bullish: null, description: "Absorption (aggressors soaked up by resting size) needs bid/ask fill data, not just time-and-sales" },
    { name: "Volume Tails", value: "N/A — needs per-price volume", strength: "neutral", bullish: null, description: "Wick/tail volume requires per-price footprint data absent from this feed" },
    { name: "Accumulation / Distribution", value: f.hasFlow ? (cvdPos ? "Net accumulation (delta ≥ 0)" : "Net distribution (delta < 0)") : "N/A — no aggressor tape", strength: f.hasFlow ? "strong" : "neutral", bullish: f.hasFlow ? cvdPos : null, description: "Derived from real cumulative delta over the tape" },
    { name: "PDH / PDL Support", value: "N/A — prior-session levels not loaded", strength: "neutral", bullish: null, description: "A real prior-session high/low feed is required; no price-offset substitute is generated" },
    { name: bullBias ? "Passive Buyers" : "Passive Sellers", value: "N/A — needs Level-2 depth", strength: "neutral", bullish: null, description: "Resting bid/offer size requires an order-book feed" },
    { name: "Spoofing Detection", value: "N/A — needs Level-2 order book", strength: "neutral", bullish: null, description: "Cannot be measured from time-and-sales alone" },
    { name: "Stop Run", value: "N/A — needs swing/liquidity map", strength: "neutral", bullish: null, description: "Liquidity sweeps require tracked swing highs/lows, not in this snapshot" },
    { name: "Trapped Traders", value: "N/A — needs positioning data", strength: "neutral", bullish: null, description: "Inferring trapped positioning needs order-book / OI data" },
    { name: "Pullback + Demand / Supply", value: "N/A — no validated zone", strength: "neutral", bullish: null, description: "Demand/supply requires a defined structure model; no synthetic offset zone is generated" },

    // Delta / CVD — REAL
    f.hasFlow
      ? { name: "Delta Divergence", value: cvdPos === f.candleUp ? "Delta confirms price" : "Delta diverges from price", strength: "strong", bullish: cvdPos, description: "Real cumulative delta vs candle direction" }
      : { name: "Delta Divergence", value: "N/A — no aggressor tape", strength: "neutral", bullish: null, description: "Divergence needs per-trade delta, absent from this feed" },
    f.hasFlow
      ? { name: "CVD (Cumulative Volume Delta)", value: `${fmtDelta(cvdVal)} (${cvdPos ? "rising" : "falling"})`, strength: "strong", bullish: cvdPos, description: "Real aggressive buy volume minus sell volume" }
      : { name: "CVD (Cumulative Volume Delta)", value: "N/A — no aggressor tape", strength: "neutral", bullish: null, description: "Requires per-trade buy/sell side, absent from this feed" },
    { name: "Footprint Pattern", value: f.hasFlow ? (askDom ? "Buy imbalance stack" : "Sell imbalance stack") : "N/A — no aggressor tape", strength: f.hasFlow ? "moderate" : "neutral", bullish: f.hasFlow ? askDom : null, description: "Aggressor-side stacking from real tick data" },

    // Iceberg / Dark Pool — genuinely require feeds we don't have; report honestly
    { name: "Iceberg Detection", value: "N/A — needs Level-2 depth feed", strength: "neutral", bullish: null, description: "Hidden-size detection requires order-book data" },
    { name: "Dark Pool Prints", value: "N/A — needs consolidated dark-pool feed", strength: "neutral", bullish: null, description: "Off-exchange prints not in this data source" },

    // Regime — inferred from real delta + trend
    { name: "Regime", value: f.hasFlow ? `${cvdPos?"Buy-side":"Sell-side"} tape (${deltaConf}% delta concentration)` : `${aboveVwap?"Above":"Below"} VWAP — no tape confirmation`, strength: f.hasFlow && deltaConf > 75 ? "strong" : "moderate", bullish: f.hasFlow ? cvdPos : aboveVwap, description: f.hasFlow ? "Measured from real aggressor delta" : "Price location only; not a full market-regime classification" },
    { name: "Wyckoff Phase", value: "N/A — phase model not implemented", strength: "neutral", bullish: null, description: "No phase is inferred from a single price/tape snapshot" },
    { name: "Wyckoff Schematic", value: "N/A — structure history required", strength: "neutral", bullish: null, description: "A schematic requires validated multi-swing structure" },
    { name: bullBias ? "Higher Lows at Demand" : "Lower Highs at Supply", value: "N/A — needs swing structure", strength: "neutral", bullish: null, description: "Swing-structure reads require tracked pivots, not in this snapshot" },
    { name: "PDL Setup", value: "N/A — prior-session level unavailable", strength: "neutral", bullish: null, description: "No PDL is displayed without a real prior-session calculation" },

    // CLC Rule — all three now REAL reads
    { name: "Context", value: aboveVwap ? "Bullish — above VWAP" : "Bearish — below VWAP", strength: "strong", bullish: aboveVwap },
    { name: "Location", value: "N/A — no validated structure zone", strength: "neutral", bullish: null, description: "No synthetic demand/supply zone is generated" },
    { name: "Confirmation", value: f.hasFlow ? `Real ${cvdPos?"buying":"selling"} on tape (Δ ${fmtDelta(cvdVal)})` : (aboveVwap ? "Price-confirmed above VWAP (no tape side data)" : "Price-confirmed below VWAP (no tape side data)"), strength: f.hasFlow ? "strong" : "moderate", bullish: f.hasFlow ? cvdPos : aboveVwap },

    // Entry signals
    f.hasFlow
      ? { name: "Entry Signal", value: `${bullBias?"LONG":"SHORT"} context near ${fmt(entryPx,dp)}`, strength: "moderate", bullish: bullBias, description: "Tape/VWAP context only; not an executable recommendation" }
      : { name: "Entry Signal", value: "N/A — no aggressor-tape confirmation", strength: "neutral", bullish: null, description: "No entry is generated from price location alone" },
    { name: "Best Opportunity", value: "N/A — define risk from your setup", strength: "neutral", bullish: null, description: "No arbitrary price-offset risk band is generated" },
  ];
}

const SIGNAL_COLOR: Record<SignalStrength, string> = {
  strong:   "#00D4AA",
  moderate: "#F0B429",
  weak:     "#8B95A5",
  // `neutral` is "we looked and the tape is not leaning" — the same class of
  // truth as ATHOS's "Quiet". It was #5A6575 (3.06–3.55:1, below AA on every
  // surface), so the one signal state that says NOTHING IS HAPPENING was the
  // one a trader could not read.
  neutral:  WM.text.muted,
};

const SECTIONS = [
  { key: "vwap",            label: "VWAP + Bands",             from: 0,  to: 3  },
  { key: "orderflow",       label: "Order Flow Signals",        from: 3,  to: 14 },
  { key: "delta",           label: "Delta / CVD / Footprint",   from: 14, to: 17 },
  { key: "iceberg",         label: "Iceberg & Dark Pool",       from: 17, to: 19 },
  { key: "regime",          label: "Markov / Wyckoff Regime",   from: 19, to: 24 },
  { key: "clc",             label: "CLC Rule + Entry Signals",  from: 24, to: 29 },
];

// Confluence engine moved to @/lib/marketData/confluence — versioned, tested,
// and enforces a minimum-evidence gate. See computeConfluence import above.

export function SmartMoneyPanel({ onClose, symbol }: { onClose: () => void; symbol: string }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth);
  const layout = getSmartMoneyPanelLayout(viewportWidth);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Enter the drawer deliberately and return focus to the trigger on close.
  useEffect(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    return () => openerRef.current?.focus();
  }, []);

  // Tablet/mobile is a true modal sheet: background chart controls are removed
  // from pointer and keyboard interaction while the sheet is open.
  useEffect(() => {
    if (!layout.modal || !panelRef.current) return;
    const root = panelRef.current.closest(".wm-chart-dashboard");
    if (!root) return;
    const background = Array.from(root.children).filter(
      child => !child.classList.contains("wm-smart-money-layer"),
    ) as HTMLElement[];
    const prior = background.map(element => ({
      element,
      inert: element.inert,
      ariaHidden: element.getAttribute("aria-hidden"),
    }));
    for (const element of background) {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    }
    return () => {
      for (const item of prior) {
        item.element.inert = item.inert;
        if (item.ariaHidden === null) item.element.removeAttribute("aria-hidden");
        else item.element.setAttribute("aria-hidden", item.ariaHidden);
      }
    };
  }, [layout.modal]);

  // Escape closes everywhere. Modal Tab/Shift+Tab is trapped inside the sheet.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !layout.modal || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter(element => !element.hidden && element.getClientRects().length > 0);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [layout.modal, onClose]);

  // ── Resizable width + compact mode (both persisted per workspace) ──────────
  const [panelW, setPanelW] = useState<number>(() => {
    if (typeof window === "undefined") return 560;
    const s = Number(localStorage.getItem("wm_sm_width"));
    return s >= 320 ? s : Math.min(672, Math.round(window.innerWidth * 0.46));
  });
  const [compact, setCompact] = useState<boolean>(() =>
    typeof window !== "undefined" && localStorage.getItem("wm_sm_compact") === "1");
  useEffect(() => { try { localStorage.setItem("wm_sm_width", String(panelW)); } catch {} }, [panelW]);
  useEffect(() => { try { localStorage.setItem("wm_sm_compact", compact ? "1" : "0"); } catch {} }, [compact]);
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);
  const onDragStart = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startW: panelW };
    try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = dragRef.current.startX - e.clientX;                 // drag LEFT = wider
    setPanelW(Math.max(320, Math.min(window.innerWidth - 40, dragRef.current.startW + dx)));
  };
  const onDragEnd = (e: React.PointerEvent) => {
    dragRef.current = null;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  /*
    ONE BRAIN, AND THIS IS THE LINE THAT PROVES IT.

    This panel used to be the only place in WM where the five microstructure
    readings existed: it called `useWebSocket`, applied the aggressor-tape gate,
    and ran five `useMemo`s of its own. When the chart room grew a door to the
    same readings, the obvious move was to repeat that block there — which would
    have produced two compilations of one tape, at two moments, able to
    contradict each other inside one viewport.

    So the block moved OUT, into `useOrderFlowReadings`, and this panel became a
    reader of it like any other surface. Nothing about what it renders changed;
    what changed is that there is no longer a second copy to drift.
  */
  const { ticker, recentTicks, liveBar, tapeSource } = useWebSocket({ symbol, timeframe: "1m" });
  const {
    realTape,
    valueCandle,
    absorption,
    deltaDivergence,
    liquidityWeather,
    stackedImbalance,
  } = useOrderFlowReadings(recentTicks, tapeSource);
  const livePrice = ticker.price > 0 ? ticker.price : 0;

  // ── Build the REAL order-flow snapshot from live ticks + the live 1m bar ────
  const flow: Flow = React.useMemo(() => {
    // CANDLE DIRECTION IS NOT FLOW. It reads the live bar, not the tape, so it
    // stays here and is NOT pushed into the aggressor selector.
    const candleUp = liveBar ? Number(liveBar.close) >= Number(liveBar.open) : true;

    // §24 / H21 — ONE OWNER PER RULE, and ONE SHAPE.
    //
    // `selectAggressorFlow` says in its own first line that it "extracts
    // SmartMoneyPanel's inline math into a canonical, testable, reusable
    // selector". The extraction happened; the CUTOVER only went half way — the
    // panel called the selector and then COPIED ITS SNAPSHOT OUT FIELD BY FIELD
    // into a retyped object literal. A hand-written projection is a second
    // shape, and a second shape drifts: it is how this panel missed `oneSided`
    // and would have missed `provenance`.
    //
    // Spreading is the whole cutover. No field list survives here.
    //
    // NO TAPE is expressed by giving the selector NOTHING, not by typing a
    // zeroed literal beside it — the selector already owns what "no flow" looks
    // like (and stamps it `provenance: "UNDISCLOSED"`, which a hand-typed
    // literal would have had to guess at).
    //
    // Delta flow still uses EVERY real executed trade with NO lot floor (the old
    // ≥2 BTC filter discarded ~100% of real Coinbase flow); that behaviour lives
    // in the selector's `trade === true && size > 0` filter.
    return {
      ...selectAggressorFlow(realTape ? recentTicks : null, livePrice || 0),
      candleUp,
    };
  }, [recentTicks, liveBar, livePrice, realTape]);

  /*
    The five readings that used to be compiled here — value candle, absorption
    anatomy, delta divergence, liquidity weather, stacked imbalance — are now
    destructured from `useOrderFlowReadings` above, together with the
    aggressor-tape gate every one of them depended on.

    The reasons each selector needs that gate did not disappear with the code;
    they moved with it, and are written down where the gate now lives. The one
    fact worth restating HERE is the naming: `stackedImbalance` keeps its long
    name because this file binds `divergence` further down for the RSI/price
    read, and a second short noun in this scope is how that collision happened
    once before.
  */

  // ── WM DELTA BUBBLES — live net delta at each price level ────────────────────
  // The level definition is NOT decided here. `selectDeltaLevels` measures the
  // tape's own price grid through the same `observeTickSize` the stacked-
  // imbalance ladder reads, so the two panels in this column cannot disagree
  // about where a level is.
  //
  // What used to be inline here cut the observed range into six equal parts and
  // labelled each bubble with the arithmetic midpoint — a price nothing traded
  // at — under a comment promising it never invented levels. Worse, the bucket
  // width was a function of the window's extremes, so one new high slid every
  // bubble to a new price with no trade at any of them.
  const deltaVM = React.useMemo(
    () => selectDeltaLevels(realTape ? recentTicks : null),
    [realTape, recentTicks],
  );
  // EVERY level the tape produced, before the trader's cap. Kept separate from
  // what gets rendered so the chip below can report both numbers — a cap that
  // hides observed levels is a fact the trader is owed, not a silent trim.
  const deltaLevelsObserved = deltaVM.levels;
  // The scale the bubbles are drawn against stays the UNCAPPED maximum. Ranking
  // keeps the largest |delta|, so this is the same number either way — but
  // recomputing it over the survivors would make the scale depend on the cap,
  // and the same level would render a different size at 5 than at 15.
  const maxAbsDelta = deltaVM.maxAbsDelta;

  // ONE missing input, stated once, with its cost named. Observed live on NQ1!
  // (2026-09-17): five of this drawer's six tiles were each writing their own
  // paragraph about the same absent aggressor tape. Every sentence was true;
  // the defect was emergent, visible only with all five on screen at once.
  // Five absences read as a broken product. One named absence with five
  // consequences reads as a diagnosis. The banner carries the sentence VERBATIM
  // from `aggressorTapeReason` — it removes voices, it does not add one.
  const missingTape = React.useMemo(
    () =>
      selectMissingTapeBanner({
        symbol,
        hasSignedTape: flow.hasFlow,
        // Reading order on screen, so a trader scanning the list meets them
        // in the order they will scroll past them.
        blockedReadings: [
          "Delta domination",
          "Tape pressure",
          "Delta bubbles by level",
          "Value candle · center of gravity",
          "Absorption anatomy · effort vs response",
          "Delta divergence",
          // Seventh. A stacked-imbalance LEVEL is a claim about who was the
          // aggressor at a price; with no sided tape there is no ladder to
          // build, so the panel falls silent rather than writing a fourth
          // sentence about the same absence.
          "Stacked imbalance · defended levels",
        ],
      }),
    [symbol, flow.hasFlow],
  );

  // Derived directly from the SAME `flow` snapshot the Delta Domination card
  // reads, in the SAME render — so the two can never contradict each other.
  const signals = React.useMemo(() => generateSignals(symbol, livePrice, flow), [symbol, livePrice, flow]);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["orderflow", "clc", "regime"]));
  const [pulse, setPulse] = useState(false);
  const [showEdu, setShowEdu] = useState(false);

  // WM-UX-P0-01 — Delta bubble level-count control, migrated here from the Big
  // Trades gear so the selector sits with the bubbles it controls. Reuses the
  // EXISTING wm_delta_levels key + wm-delta-levels event untouched, so MainChart
  // and every other listener keep working. This is now the single source of truth.
  const [deltaLevelCap, setDeltaLevelCapState] = useState<number>(() =>
    typeof window === "undefined"
      ? DELTA_LEVEL_CAP_DEFAULT
      : normalizeDeltaLevelCap(localStorage.getItem(DELTA_LEVEL_CAP_STORAGE_KEY)),
  );
  const setDeltaLevelCap = (n: number) => {
    setDeltaLevelCapState(n);
    try { localStorage.setItem(DELTA_LEVEL_CAP_STORAGE_KEY, String(n)); } catch {}
    try { window.dispatchEvent(new CustomEvent(DELTA_LEVEL_CAP_EVENT)); } catch {}
  };
  // Stay in sync if the value is changed elsewhere (e.g. another tab).
  useEffect(() => {
    const onEvt = () =>
      setDeltaLevelCapState(normalizeDeltaLevelCap(localStorage.getItem(DELTA_LEVEL_CAP_STORAGE_KEY)));
    window.addEventListener(DELTA_LEVEL_CAP_EVENT, onEvt);
    return () => window.removeEventListener(DELTA_LEVEL_CAP_EVENT, onEvt);
  }, []);

  // THE CONTROL NOW MOVES THE PIXELS IT SITS ON. Its own sub-label reads "max
  // ranked price levels per bar", and until this line the strip directly beneath
  // it rendered the uncapped partition — so choosing 5 or 15 changed nothing on
  // this card, while the chart canvas obeyed. Same cap, same ranking, same
  // comparator as the canvas, because both now call one owner.
  const deltaCapped = React.useMemo(
    () => capDeltaLevels(deltaLevelsObserved, deltaLevelCap),
    [deltaLevelsObserved, deltaLevelCap],
  );
  const deltaLevels = deltaCapped.levels;
  // Gentle "just updated" pulse on an independent heartbeat (signals themselves
  // are derived synchronously above, so no timer is needed to refresh them).
  useEffect(() => {
    const iv = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }, 5_000);
    return () => clearInterval(iv);
  }, []);

  const toggle = (key: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Real 0-100 confluence from independent, measurable lenses (recomputed live
  // from the same flow snapshot the signals use) — NOT a count of cloned flags.
  // The v1 engine emits {score: null, bias: 'INSUFFICIENT'} when fewer than 3
  // lenses can measure, so the UI must never paint a persuasive numeric score
  // in that case. Founder Aug-16 XVI: 'NO SCORE when minimum evidence is not
  // met. Do not output 56/100 if four of five components are unavailable.'
  const conf = computeConfluenceV1(livePrice, flow);
  const bias = conf.bias;
  const scoreColor =
    conf.score == null ? "#8B95A5" :
    conf.score >= 58   ? "#00D4AA" :
    conf.score <= 42   ? "#F6465D" :
                         "#F0B429";

  // CLC location remains unavailable until a real structure-zone model exists.
  // Never substitute percentage offsets around the current price.
  const hasPrice = livePrice > 0;
  const clcDecision = evaluateClcEvidence({
    context: hasPrice,
    location: false,
    confirmation: flow.hasFlow,
  });
  const ddp = livePrice > 1000 ? 0 : livePrice > 10 ? 2 : 4;
  // isBull is used for downstream directional pressure hints; INSUFFICIENT
  // must not tilt bullish by default, so we require an explicit BULL or NEUTRAL.
  const isBull = bias === "BULL" || bias === "NEUTRAL";

  // ── DELTA DOMINATION (the tug-of-war) ───────────────────────────────────────
  // Who is actually winning the fight right now — measured from REAL aggressor
  // volume, not price. Green = buyers winning, red = sellers winning. When the
  // feed carries no per-trade side data we say so honestly instead of faking it.
  const totAgg   = flow.askVol + flow.bidVol;
  const buyPct   = totAgg > 0 ? Math.round((flow.askVol / totAgg) * 100) : 50;
  const sellPct  = 100 - buyPct;
  const deltaVal = flow.cvd;                                   // REAL net delta (unrounded)
  // How the aggressor SIDES behind buyPct/sellPct/deltaVal were established.
  // Owned by @/lib/marketData/aggressorProvenanceNote so this panel and
  // OrderFlowCockpitStrip make the identical disclosure in identical words.
  const provenanceNote = aggressorProvenanceNote(flow.provenance);
  const domSide: "buyers" | "sellers" | "even" | "none" =
    !flow.hasFlow ? "none"
    : buyPct >= 55 ? "buyers"
    : sellPct >= 55 ? "sellers"
    : "even";
  // Divergence = price says one thing, delta says the opposite → the lie.
  const divergence: "bearish" | "bullish" | null =
    !flow.hasFlow ? null
    : flow.candleUp && deltaVal < 0 ? "bearish"   // price up but sellers dominate
    : !flow.candleUp && deltaVal > 0 ? "bullish"  // price down but buyers dominate
    : null;
  // Tape pressure is an observation, not a trade command. It deliberately does
  // not produce entries, stops, targets, or order shortcuts. Location and risk
  // remain unresolved elsewhere in this panel.
  const pressureSide: "BUY" | "SELL" | null =
    !flow.hasFlow                 ? null
    : buyPct  >= 65               ? "BUY"
    : sellPct >= 65               ? "SELL"
    : null;
  const pressureReason =
    !flow.hasFlow
      // Short by design. The reason the tape is absent belongs to the banner at
      // the top of this drawer; repeating it here is what made five tiles read
      // like five separate failures.
      ? "Unavailable — needs the aggressor tape named above."
    : pressureSide === "BUY"
      ? `Observed buyers account for ${buyPct}% of aggressive tape (Δ ${fmtDelta(deltaVal)}). This is evidence, not an entry signal.`
    : pressureSide === "SELL"
      ? `Observed sellers account for ${sellPct}% of aggressive tape (Δ ${fmtDelta(deltaVal)}). This is evidence, not an entry signal.`
    : "Aggressor tape is balanced; there is no dominant pressure observation.";

  // ── WM PLAYBOOK — folded contextual insights (on-brand, no external label) ───
  const playbook = getFabioInsights({ symbol, assetClass: inferAssetClass(symbol) }, 3);

  return (
    <>
    {layout.modal && (
      <motion.button
        type="button"
        aria-label="Close Smart Money panel"
        className="wm-smart-money-layer fixed inset-x-0 bottom-0 bg-black/70"
        style={{ top: layout.top, zIndex: 59 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
    )}
    <motion.div
      ref={panelRef}
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 350, damping: 35 }}
      role={layout.modal ? "dialog" : "complementary"}
      aria-modal={layout.modal || undefined}
      aria-label="Smart Money tools"
      className="wm-smart-money-layer wm-smart-money-panel border-l border-wm-border bg-wm-dark flex flex-col shrink-0 overflow-hidden min-h-0"
      style={{
        // Desktop begins below the chart tabs + both toolbars, so no visible
        // order-flow/profile control can sit under the drawer. Narrow screens
        // become a deliberate modal sheet below the global application chrome.
        position: "fixed", top: layout.top, right: 0, height: layout.height, zIndex: 60,
        width: layout.modal ? "100vw" : panelW, maxWidth: "100%",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
      }}
    >
      {/* Left-edge resize handle — drag to widen/narrow (persisted). */}
      <div
        onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd}
        title="Drag to resize panel"
        className="hover:bg-wm-gold/30 transition-colors"
        style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 8, cursor: "col-resize", zIndex: 5, background: "transparent" }}
      />
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2 py-2 border-b border-wm-border bg-wm-card shrink-0">
        <WMLogo size={24} showGlow />
        <div className="flex-1">
          <div className="text-xs font-bold text-wm-gold">Smart Money Tools</div>
          <div className="text-[10px] text-wm-text-dim">{symbol} · est. from price</div>
        </div>
        {/* Bias badge — INSUFFICIENT is a distinct honest state, not NEUTRAL.
            A trader must be able to tell 'the market is balanced' apart from
            'we do not have enough evidence to say anything at all'. */}
        <div
          className={clsx(
            "px-2 py-0.5 rounded text-[10px] font-bold mr-1",
            bias === "BULL"          ? "bg-wm-green/15 text-wm-green border border-wm-green/30" :
            bias === "BEAR"          ? "bg-wm-red/15 text-wm-red border border-wm-red/30" :
            bias === "INSUFFICIENT"  ? "bg-wm-dark text-wm-text-dim border border-wm-border" :
                                       "bg-wm-muted text-wm-text-muted"
          )}
          title={bias === "INSUFFICIENT" ? conf.reason : undefined}
        >
          {bias === "BULL" ? "↑" : bias === "BEAR" ? "↓" : bias === "INSUFFICIENT" ? "?" : "–"}{" "}
          {bias === "INSUFFICIENT" ? "INSUFFICIENT" : bias}
        </div>
        <button onClick={() => setCompact(c => !c)} title={compact ? "Comfortable density" : "Compact density"} className="text-wm-text-dim hover:text-wm-text p-1 transition-colors">
          {compact ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
        </button>
        <button ref={closeRef} onClick={onClose} aria-label="Close Smart Money panel" title="Close (Esc)" className="text-wm-text-dim hover:text-wm-text p-3 -m-2 transition-colors min-w-11 min-h-11 inline-flex items-center justify-center">
          <X size={13} />
        </button>
      </div>

      {/* Confluence Score — TWO independent gates suppress the persuasive
          aggregate number:
            1) engine-side minimum-evidence gate (conf.insufficient — fewer
               than 3/5 lenses can measure at all)
            2) CLC-side risk-review gate (location/confirmation unresolved)
          Either gate → INSUFFICIENT EVIDENCE, no numeric score, no filled
          progress bar. Founder Aug-16 XVI explicit ask. */}
      <div className="px-2 py-1.5 border-b border-wm-border shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-wm-text-muted">
            Confluence Score
            <span className="ml-1 text-wm-text-dim">· {conf.formulaVersion}</span>
          </span>
          <span
            className="text-[10px] font-black"
            style={{ color: conf.insufficient || clcDecision.status === "INSUFFICIENT_EVIDENCE" ? "#8B95A5" : "#c9a55c" }}
            title={conf.reason}
          >
            {conf.insufficient || clcDecision.status === "INSUFFICIENT_EVIDENCE"
              ? "INSUFFICIENT EVIDENCE"
              : `${conf.score}/100`}
          </span>
        </div>
        {!conf.insufficient && conf.score != null && clcDecision.status === "READY_FOR_RISK_REVIEW" && (
          <div className="h-2 rounded-full bg-wm-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${conf.score}%`, background: `linear-gradient(90deg, ${scoreColor}, #4FA3E0)` }}
            />
          </div>
        )}
        {/* Independent-lens breakdown — shows genuine agreement / conflict.
            Rendered even when INSUFFICIENT so the trader can see WHICH lenses
            abstained and WHY. */}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {conf.lenses.map(l => (
            <span
              key={l.label}
              title={l.detail}
              className={clsx(
                "px-1.5 py-0.5 rounded text-[9px] font-bold border",
                l.dir === "bull" ? "bg-wm-green/12 text-wm-green border-wm-green/30" :
                l.dir === "bear" ? "bg-wm-red/12 text-wm-red border-wm-red/30" :
                "bg-wm-muted/40 text-wm-text-dim border-wm-border"
              )}
            >
              {l.label} {l.dir === "bull" ? "↑" : l.dir === "bear" ? "↓" : "·"}
            </span>
          ))}
        </div>
        <div className="text-[9px] text-wm-text-dim mt-1">
          {conf.measured}/{conf.totalLenses} lenses measured
          {` · ${conf.bull} bullish · ${conf.bear} bearish · ${conf.totalLenses - conf.measured} N/A on this feed`}
          {conf.insufficient && (
            <span className="ml-1 text-wm-text-muted">(need {conf.minRequired})</span>
          )}
        </div>
      </div>

      {/* ── SCROLLABLE BODY — header + confluence stay pinned above; everything
          below scrolls. On a wide panel the sections tile into columns so the
          trader sees every insight at once while the chart stays visible. ──── */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden grid content-start"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${compact ? "13rem" : "16rem"}, 1fr))`,
          alignContent: "start",
          fontSize: compact ? "0.9em" : undefined,
          gap: compact ? "0.25rem" : undefined,
        }}>

      {/* ── MISSING INPUT — the drawer's one absence, said once ─────────────
          Spans every column deliberately. It is not a tile among tiles; it is
          a statement ABOUT the tiles, and a trader must meet it before the
          readings it governs rather than alongside them. Rendered only while
          the absence is real — `selectMissingTapeBanner` returns null the
          moment a signed print arrives, so this cannot outlive its cause. */}
      {missingTape && (
        <div
          className="mx-2 my-1.5 p-2.5 rounded-lg border shrink-0"
          style={{
            gridColumn: "1 / -1",
            background: "rgba(212,175,55,0.06)",
            borderColor: "rgba(212,175,55,0.28)",
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <AlertCircle size={11} className="text-wm-gold shrink-0" />
            <span className="text-[10px] font-bold tracking-wide text-wm-gold">
              MISSING INPUT · {missingTape.missingInput}
            </span>
          </div>
          <p className="text-[9px] text-wm-text-dim leading-relaxed">{missingTape.sentence}</p>
          {missingTape.blockedCount > 0 && (
            <div className="mt-1.5 pt-1.5 border-t border-wm-border">
              <div className="text-[8px] font-semibold tracking-wide text-wm-text-dim mb-1">
                {missingTape.blockedCount} READING{missingTape.blockedCount === 1 ? "" : "S"} BELOW
                CANNOT BE TAKEN
              </div>
              <div className="flex flex-wrap gap-1">
                {missingTape.blockedReadings.map((name) => (
                  <span
                    key={name}
                    className="text-[8px] px-1.5 py-0.5 rounded text-wm-text-dim"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DELTA DOMINATION (the tug-of-war) ─────────────────────────────── */}
      <div className="mx-2 my-1.5 p-2 rounded-lg bg-wm-surface border border-wm-border shrink-0">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Swords size={11} className="text-wm-gold" />
          <span className="text-[10px] font-bold text-wm-text">DELTA DOMINATION</span>
          <span className="text-[9px] text-wm-text-dim">· who's winning?</span>
          <button
            onClick={() => setShowEdu(s => !s)}
            title="What does this mean?"
            className="ml-auto text-wm-text-dim hover:text-wm-gold transition-colors"
          >
            <GraduationCap size={12} />
          </button>
        </div>

        {flow.hasFlow ? (
          <>
            {/* Tug-of-war bar: green (buyers) vs red (sellers) */}
            <div className="flex h-4 rounded overflow-hidden border border-wm-border">
              <div
                className="flex items-center justify-start pl-1 transition-all duration-500"
                style={{ width: `${buyPct}%`, background: "rgba(0,212,170,0.35)" }}
              >
                {buyPct >= 22 && <span className="text-[8px] font-black text-wm-green">{buyPct}%</span>}
              </div>
              <div
                className="flex items-center justify-end pr-1 transition-all duration-500"
                style={{ width: `${sellPct}%`, background: "rgba(246,70,93,0.35)" }}
              >
                {sellPct >= 22 && <span className="text-[8px] font-black text-wm-red">{sellPct}%</span>}
              </div>
            </div>
            <div className="flex items-center justify-between mt-1 text-[9px]">
              <span className="text-wm-green font-bold">🟢 Buyers</span>
              <span className="text-wm-red font-bold">Sellers 🔴</span>
            </div>

            {/* Verdict + net delta */}
            <div className="mt-2 flex items-center justify-between">
              <span
                className="text-[11px] font-black"
                style={{ color: domSide === "buyers" ? "#00D4AA" : domSide === "sellers" ? "#F6465D" : "#F0B429" }}
              >
                {domSide === "buyers" ? "🟢 Buyers winning" : domSide === "sellers" ? "🔴 Sellers winning" : "⚖️ Dead even — no winner yet"}
              </span>
              <span
                className="text-[10px] font-bold tabular-nums"
                style={{ color: deltaVal > 0 ? "#00D4AA" : deltaVal < 0 ? "#F6465D" : "#4A5070" }}
              >
                Δ {fmtDelta(deltaVal)}
              </span>
            </div>

            {/* Divergence warning — price lying vs delta truth */}
            {divergence && (
              <div
                className="mt-2 p-1.5 rounded border flex items-start gap-1.5"
                style={{
                  borderColor: divergence === "bearish" ? "rgba(246,70,93,0.4)" : "rgba(0,212,170,0.4)",
                  background: divergence === "bearish" ? "rgba(246,70,93,0.08)" : "rgba(0,212,170,0.08)",
                }}
              >
                <AlertCircle size={11} className={divergence === "bearish" ? "text-wm-red shrink-0 mt-px" : "text-wm-green shrink-0 mt-px"} />
                <span className="text-[9px] text-wm-text leading-tight">
                  {divergence === "bearish"
                    ? "⚠️ Price is UP but sellers dominate the tape — price may be lying. Possible reversal down."
                    : "⚠️ Price is DOWN but buyers dominate the tape — sellers exhausting. Possible reversal up."}
                </span>
              </div>
            )}

            <div className="mt-2 text-[8px] text-wm-text-dim">Pressure describes observed tape only. It does not resolve location, risk, or permission to trade.</div>
          </>
        ) : (
          /* The WHY is stated once, in the banner at the top of this drawer.
             What is left here is only what is specific to THIS reading: what
             it needed, and the refusal to fake it. */
          <div className="text-[9px] text-wm-text-dim leading-relaxed">
            Needs aggressor-tagged ticks. We won&apos;t fake a winner without them.
          </div>
        )}

        {/* Beginner education — tug-of-war / boxing analogies */}
        {showEdu && (
          <div className="mt-2 pt-2 border-t border-wm-border space-y-2">
            {[
              { icon: "🥊", title: "Who's winning the tug-of-war?", body: "Every price is a fight. Buyers pull the rope up, sellers pull it down. Delta counts who pulled harder — the green side is winning right now." },
              { icon: "🎭", title: "Why price can lie but delta doesn't", body: "Price can tick up on thin air while big sellers quietly unload. Delta shows the real muscle behind the move — when they disagree, trust the muscle." },
              { icon: "🛡️", title: "Small losses, big winners", body: "Losing fighters surrender fast. Keep the stop tight (<1%). One clean win pays for several small tap-outs — that's how the edge compounds." },
            ].map((c) => (
              <div key={c.title} className="flex items-start gap-1.5">
                <span className="text-[12px] leading-none mt-px">{c.icon}</span>
                <div>
                  <div className="text-[9px] font-bold text-wm-gold">{c.title}</div>
                  <div className="text-[9px] text-wm-text-dim leading-tight">{c.body}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tape-pressure observation. Never a trade call or order shortcut. */}
      <div className={clsx(
        "mx-2 my-1.5 p-2 rounded-lg border shrink-0",
        pressureSide === "BUY"  ? "bg-wm-green/10 border-wm-green/30" :
        pressureSide === "SELL" ? "bg-wm-red/10 border-wm-red/30" :
        flow.hasFlow         ? "bg-wm-gold/5 border-wm-gold/25" :
                               "bg-wm-surface border-wm-border"
      )}>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Zap size={11} className={clsx(
            pressureSide === "BUY"  ? "text-wm-green" :
            pressureSide === "SELL" ? "text-wm-red" :
            flow.hasFlow         ? "text-wm-gold" : "text-wm-text-dim"
          )} />
          <span className="text-[10px] font-bold text-wm-text">TAPE PRESSURE</span>
          <span className={clsx(
            "ml-auto px-1.5 py-0.5 rounded text-[9px] font-black",
            pressureSide === "BUY"  ? "bg-wm-green/15 text-wm-green" :
            pressureSide === "SELL" ? "bg-wm-red/15 text-wm-red" :
            flow.hasFlow         ? "bg-wm-gold/15 text-wm-gold" :
                                   "bg-wm-muted text-wm-text-dim"
          )}>
            {pressureSide ? `OBSERVED · ${pressureSide}` : flow.hasFlow ? "BALANCED" : "NO TAPE"}
          </span>
        </div>

        <p className="text-[9px] text-wm-text-dim leading-relaxed">{pressureReason}</p>

      </div>

      {/* ── WM DELTA BUBBLES — live net delta at each price level ───────────── */}
      <div className="mx-2 my-1.5 p-2 rounded-lg border border-wm-border bg-wm-surface shrink-0">
        <div className="flex items-center gap-1.5 mb-2">
          <Droplets size={11} className="text-wm-blue" />
          <span className="text-[10px] font-bold text-wm-text">WM DELTA BUBBLES</span>
          {/* When the trader's own cap is hiding observed levels, the chip says
              so — "5 OF 9 LEVELS", not a bare "5 LEVELS". A count that silently
              means "how many survived your setting" on one surface and "how many
              the tape found" on another is one screen answering one question two
              ways, which is the whole defect this card was carrying. */}
          <span
            className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-black bg-wm-muted text-wm-text-dim"
            data-delta-levels-shown={flow.hasFlow ? deltaCapped.shown : undefined}
            data-delta-levels-total={flow.hasFlow ? deltaCapped.total : undefined}
            title={
              flow.hasFlow && deltaCapped.truncated
                ? `The tape produced ${deltaCapped.total} price levels in this window. Your "Levels shown" setting of ${deltaLevelCap} keeps the ${deltaCapped.shown} with the largest net delta; the rest are observed but not drawn. The chart's bubbles use the same cap and the same ranking.`
                : undefined
            }
          >
            {!flow.hasFlow
              ? "NO TAPE"
              : deltaCapped.truncated
                ? `${deltaCapped.shown} OF ${deltaCapped.total} LEVELS`
                : `${deltaCapped.shown} LEVEL${deltaCapped.shown === 1 ? "" : "S"}`}
          </span>
        </div>

        {/* WM-UX-P0-01 — Delta level-count control (migrated from the Big Trades
            gear). Four discrete presets, not a slider: the domain is 4 meaningful
            values, and a segmented control gives an unambiguous a11y selected state.

            2026-09-17, OBSERVED LIVE ON NQ1!: this control rendered at full
            strength — four 44px buttons, one of them showing an `aria-pressed`
            selected state — directly beneath a NO TAPE badge, for a reading the
            banner above had already listed as one it cannot take. Pressing any
            of the four moved nothing, on this card or on the chart, because
            both draw from a tape this symbol does not carry.

            A control whose effect the trader cannot see is not a preference: it
            is a choice they have no way to evaluate. So it is not shown while
            the reading is blocked. Nothing is lost — the cap lives in
            localStorage under `deltaLevelCap`'s one key, so the stored value
            survives and the control returns, already set, the moment a signed
            tape makes its effect visible again.

            The condition is the BANNER'S OWN PRESENCE, not a re-derived
            `!flow.hasFlow`, for the same reason the two sibling panels read it
            that way: the declaration and everything that defers to it must be
            impossible to get out of step. */}
        {missingTape === null ? (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-wm-text">Levels shown</span>
            <span className="text-[8px] text-wm-text-dim">max ranked price levels per bar</span>
          </div>
          <div role="group" aria-label="Delta bubble levels shown" className="grid grid-cols-4 gap-1">
            {DELTA_LEVEL_CAP_CHOICES.map((n, idx, arr) => {
              const selected = deltaLevelCap === n;
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setDeltaLevelCap(n)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                      e.preventDefault();
                      const dir = e.key === "ArrowRight" ? 1 : -1;
                      const nextIdx = (idx + dir + arr.length) % arr.length;
                      setDeltaLevelCap(arr[nextIdx]);
                      const sib = e.currentTarget.parentElement?.children[nextIdx] as HTMLElement | undefined;
                      sib?.focus();
                    }
                  }}
                  className={clsx(
                    "min-h-[44px] flex items-center justify-center rounded text-[12px] font-bold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-wm-green/60",
                    selected
                      ? "bg-wm-green/20 text-wm-green border-wm-green/50"
                      : "text-wm-text-dim border-wm-border hover:text-wm-text hover:border-wm-text-dim/40"
                  )}
                >
                  {n}{n === DELTA_LEVEL_CAP_DEFAULT ? " ★" : ""}
                </button>
              );
            })}
          </div>
        </div>
        ) : null}

        {flow.hasFlow && deltaLevels.length > 0 ? (
          <div className="space-y-1.5">
            {deltaLevels.map((lvl, i) => {
              const up    = lvl.delta >= 0;
              const mag   = maxAbsDelta > 0 ? Math.abs(lvl.delta) / maxAbsDelta : 0;
              const dia   = 12 + Math.round(mag * 18);         // 12–30px water bubble
              const rgb   = up ? "0,212,170" : "255,77,106";   // wm-green / wm-red
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[9px] tabular-nums text-wm-text-dim w-14 shrink-0">{fmt(lvl.price, ddp)}</span>
                  <div className="flex-1 flex items-center min-w-0">
                    <div
                      className="rounded-full shrink-0"
                      style={{
                        width: dia, height: dia,
                        background: `radial-gradient(circle at 35% 28%, rgba(${rgb},0.95), rgba(${rgb},0.30) 68%, rgba(${rgb},0.06))`,
                        boxShadow: `0 0 ${4 + Math.round(mag * 8)}px rgba(${rgb},0.55), inset 0 0 4px rgba(255,255,255,0.28)`,
                        border: `1px solid rgba(${rgb},0.5)`,
                      }}
                    />
                  </div>
                  <span className={clsx("text-[9px] font-bold tabular-nums w-16 text-right shrink-0", up ? "text-wm-green" : "text-wm-red")}>
                    {fmtDelta(lvl.delta)}
                  </span>
                </div>
              );
            })}
            <div className="text-[8px] text-wm-text-dim mt-1 leading-tight">
              Green = buyers dominate that level · red = sellers. Bigger bubble = more lopsided. Net buy−sell size per level, live from the tape.
              {/* The row label is the level's LOW EDGE on the tape's measured
                  price grid. When a level groups more than one tick it covers
                  a band, and printing one price for a band without saying so
                  is the same overclaim this module was rewritten to remove. */}
              {deltaVM.ticksPerLevel != null && deltaVM.tickSize != null ? (
                <> Each level is {deltaVM.ticksPerLevel === 1 ? "one tick" : `${deltaVM.ticksPerLevel} ticks`} wide
                  ({fmt(deltaVM.ticksPerLevel * deltaVM.tickSize, ddp)}), measured off this tape&apos;s own grid, and
                  labelled at its low edge.</>
              ) : null}
              {/* Provenance, not a blanket disclaimer. The old copy said the
                  side was estimated even on a venue-stamped tape, which
                  understates a provider feed exactly as badly as it would
                  overstate a guessed one. */}
              {flow.provenance === "PROVIDER"
                ? " Aggressor side is stamped by the venue."
                : " Aggressor side is estimated from price — these levels are downstream of a guess."}
            </div>
          </div>
        ) : (
          /* This paragraph was the last hand-typed recital of the whole
             asset-class menu — the exact defect `aggressorTapeReason` was
             built to end, surviving here because it was typed into a second
             place. The banner above now states the case the trader is
             actually in, derived from the capability registry. What remained
             was only this reading's own promise.

             THE PROMISE WAS A CONTRADICTION, NOT A REDUNDANCY. Observed live
             on NQ1! with the banner shipped, these two sentences were on one
             screen, a few hundred pixels apart:

               banner   "…it is not carried here at all, and waiting will not
                         change it."
               this card "Bubbles appear the moment real aggressor flow
                         arrives."

             Both are grammatical, and one of them is telling the trader to
             wait for something the other has just told them will never come.
             That is worse than the five-voices defect the banner closed: five
             voices repeating one true fact cost the trader time, but these two
             disagree, and a trader who believes the wrong one sits waiting on
             a feed that does not exist.

             So this reading defers exactly as WM Value Candle and Delta
             Divergence do, in the same words, off the same single condition —
             and keeps its own full sentence for any surface with no banner
             over it. */
          <p className="text-[9px] text-wm-text-dim leading-relaxed">
            {missingTape !== null
              ? "Blocked by the missing input named at the top of this drawer."
              : "Bubbles appear the moment real aggressor flow arrives."}
          </p>
        )}
      </div>

      {/* ── WM VALUE CANDLE — where the volume actually traded ──────────────
          The bubbles above answer WHO was aggressive at each level. This
          answers a different question the same tape can settle: WHERE IS
          VALUE. Center of Gravity = Σ(Price × Volume) ÷ Σ(Volume), computed by
          selectValueCandle over the SAME real per-trade prints — never a
          synthesised profile, and `null` (not zero) when nothing traded. */}
      <div className="mx-2 my-1.5 shrink-0">
        <ValueCandlePanel
          vm={valueCandle}
          symbol={symbol}
          window="session tape"
          /* The banner above already named this reading as blocked. Passing
             the banner's PRESENCE — not a re-derived boolean — keeps the
             deferral and the declaration impossible to get out of step. */
          absenceDeclaredAbove={missingTape !== null}
        />
      </div>

      {/* ── ABSORPTION ANATOMY — effort against response ─────────────────────
          The third question this one tape can settle, and the only one of the
          three that needs to know WHO INITIATED. The bubbles show aggression by
          level and the value candle shows where price agreed to trade; this
          puts the two halves in one frame and asks whether the side that spent
          effort was paid for it. It is placed directly beneath the candle
          because it reuses that candle's spread as its scale — reading them
          adjacently is reading one measurement, not two. */}
      <div className="mx-2 my-1.5 shrink-0">
        <AbsorptionAnatomyPanel
          vm={absorption}
          symbol={symbol}
          window="session tape"
          /* The sixth blocked reading, and the LAST to be told. The banner
             listed five; this one kept printing AGGRESSIVE BUYS 0 /
             AGGRESSIVE SELLS 0 / VERDICT UNMEASURED beneath a banner that had
             just said the sides are not carried — a measurement of zero where
             there was no measurement, and a verdict that disagreed with the
             chart's own live ABSORPTION zones. Same flag, same single
             condition, so the banner's list and the panel's silence cannot
             drift apart. */
          absenceDeclaredAbove={missingTape !== null}
        />
      </div>

      {/* ── DELTA DIVERGENCE — did delta follow price to the new extreme ─────
          The absorption panel above reads the whole window as one number pair.
          This reads the SHAPE of the same window: it needs two moments, not
          one, and it is the only panel here whose answer would change if the
          prints arrived in a different order. */}
      <div className="mx-2 my-1.5 shrink-0">
        <DeltaDivergencePanel
          vm={deltaDivergence}
          symbol={symbol}
          window="session tape"
          absenceDeclaredAbove={missingTape !== null}
        />
      </div>

      {/* ── LIQUIDITY WEATHER — what it is costing to move this market ───────
          The three panels above all ask who is winning. This one asks what
          the fight is COSTING, which is the question that decides size rather
          than direction — and the only one here that a tape with no aggressor
          sides can still answer. */}
      <div className="mx-2 my-1.5 shrink-0">
        <LiquidityWeatherPanel vm={liquidityWeather} symbol={symbol} window="session tape" />
      </div>

      {/* ── STACKED IMBALANCE — a claim about a level, drawn above its test ──
          Every panel above reports the window as a whole. This one names
          specific PRICES and then shows whether price came back and respected
          them, which is the only form in which a level is worth printing. */}
      <div className="mx-2 my-1.5 shrink-0">
        <StackedImbalancePanel
          vm={stackedImbalance}
          symbol={symbol}
          window="session tape"
          absenceDeclaredAbove={missingTape !== null}
        />
      </div>

      {/* CLC Summary Card — Context / Location / Confirmation.
          The Confirmation leg is ORDER-FLOW based, so it only genuinely fires when
          the feed carries aggressor tape. Without tape we say so honestly instead
          of printing a fake "Real buying on tape / ENTRY CONFIRMED". Gated on the
          SAME flow.hasFlow the DD card + order-flow signals use, so they agree. */}
      <div className={clsx(
        "mx-2 my-1.5 p-2 rounded-lg border shrink-0",
        "bg-wm-surface border-wm-border"
      )}>
        <div className={clsx(
          "text-[10px] font-bold mb-1.5 flex items-center gap-1",
          "text-wm-text-muted"
        )}>
          <Zap size={10} />
          CLC RULE — {!hasPrice ? "AWAITING DATA" : clcDecision.label}
        </div>
        <div className="space-y-1">
          {[
            { text: `Context: ${isBull ? "Bullish above" : "Bearish below"} VWAP`, ok: hasPrice },
            { text: "Location: unavailable — no validated structure zone", ok: false },
            flow.hasFlow
              ? { text: `Confirmation: Real ${deltaVal >= 0 ? "buying" : "selling"} on tape (Δ ${fmtDelta(deltaVal)})`, ok: true }
              : { text: `Confirmation: Awaiting tape — no aggressor side on this feed`, ok: false },
          ].map((row, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px] text-wm-text">
              {row.ok
                ? <CheckCircle2 size={9} className="text-wm-green shrink-0" />
                : <AlertCircle size={9} className="text-wm-text-dim shrink-0" />}
              {row.text}
            </div>
          ))}
        </div>
        <div className="mt-2 p-1.5 rounded bg-wm-muted/40 border border-wm-border">
          <div className="text-[9px] text-wm-gold font-semibold">WAIT — LOCATION UNRESOLVED</div>
          <div className="text-[9px] text-wm-text-dim mt-0.5">Order flow may confirm pressure, but Context + Location + Confirmation must all resolve before an entry can be evaluated.</div>
        </div>
      </div>

      {/* ── WM PLAYBOOK — context-aware notes folded natively into Smart Money ── */}
      {playbook.length > 0 && (
        <div className="mx-2 mb-1.5 p-2 rounded-lg bg-wm-card border border-wm-border shrink-0">
          <div className="flex items-center gap-1.5 mb-2">
            <Eye size={11} className="text-wm-blue" />
            <span className="text-[10px] font-bold text-wm-text">WM PLAYBOOK</span>
            <span className="text-[9px] text-wm-text-dim">· {symbol}</span>
          </div>
          <div className="space-y-2">
            {playbook.map((p) => (
              <div key={p.id} className="border-l-2 border-wm-blue/50 pl-2">
                <div className="text-[9px] font-bold text-wm-blue">{p.title}</div>
                <div className="text-[9px] text-wm-text-dim leading-tight">{p.body}</div>
                {p.action && (
                  <div className="text-[9px] text-wm-gold/90 mt-0.5 flex items-start gap-1">
                    <Info size={8} className="shrink-0 mt-0.5" />
                    <span className="leading-tight">{p.action}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sections (now inside the shared scrollable body above) */}
      <div>
        {SECTIONS.map(sec => {
          const open = openSections.has(sec.key);
          const sectionSignals = signals.slice(sec.from, sec.to);
          const strongCount = sectionSignals.filter(s => s.strength === "strong").length;

          return (
            <div key={sec.key} className="border-b border-wm-border/50">
              <button
                onClick={() => toggle(sec.key)}
                className="w-full flex items-center px-3 py-1.5 hover:bg-wm-surface/40 transition-colors"
              >
                {open ? <ChevronDown size={11} className="text-wm-text-dim mr-1.5" /> : <ChevronRight size={11} className="text-wm-text-dim mr-1.5" />}
                <span className="text-[10px] font-semibold text-wm-text-muted flex-1 text-left">{sec.label}</span>
                {strongCount > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-wm-green/15 text-wm-green border border-wm-green/25">
                    {strongCount} strong
                  </span>
                )}
              </button>

              {open && (
                <div className="pb-1">
                  {sectionSignals.map((sig, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 px-3 py-1 hover:bg-wm-surface/20 transition-colors group"
                    >
                      {/* Strength dot */}
                      <div
                        className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                        style={{
                          background: SIGNAL_COLOR[sig.strength],
                          boxShadow: sig.strength === "strong" ? `0 0 4px ${SIGNAL_COLOR[sig.strength]}` : undefined,
                        }}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-medium text-wm-text-muted break-words leading-snug">{sig.name}</span>
                          {sig.bullish !== null && (
                            sig.bullish
                              ? <TrendingUp size={9} className="text-wm-green shrink-0" />
                              : <TrendingDown size={9} className="text-wm-red shrink-0" />
                          )}
                        </div>
                        <div
                          className="text-[10px] font-semibold break-words leading-snug"
                          style={{ color: SIGNAL_COLOR[sig.strength] }}
                        >
                          {sig.value}
                        </div>
                        {sig.description && (
                          <div className="text-[9px] text-wm-text-dim leading-tight break-words">{sig.description}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Wyckoff remains visible, but cannot imply analysis until a real model exists. */}
        <div className="mx-2 my-2 p-2 rounded-lg bg-wm-surface border border-wm-border opacity-70">
          <div className="text-[10px] font-bold text-wm-text-dim mb-1">Wyckoff Phase Analysis</div>
          <div className="text-[10px] text-wm-text-dim leading-snug">
            Unavailable — phase model not implemented. No phase is inferred for the current symbol.
          </div>
        </div>
      </div>

      {/* Tape observation — only directional when real aggressor evidence exists. */}
      <div
        className="mx-2 mb-1.5 mt-1 p-1.5 rounded-lg border shrink-0"
        style={{
          borderColor: flow.hasFlow ? "rgba(0,212,170,0.35)" : "rgba(240,180,41,0.35)",
          background: flow.hasFlow ? "rgba(0,212,170,0.06)" : "rgba(240,180,41,0.06)",
        }}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <AlertCircle size={11} className={flow.hasFlow ? "text-wm-green" : "text-wm-gold"} />
          <span className={clsx("text-[10px] font-bold", flow.hasFlow ? "text-wm-green" : "text-wm-gold")}>
            {flow.hasFlow ? "LIVE TAPE OBSERVATION" : "TAPE UNAVAILABLE"}
          </span>
          {/* The banner says the tape was OBSERVED. It must also say how the
              SIDES were established, or "LIVE TAPE OBSERVATION" reads as a
              venue-asserted aggressor when today it is an Alpaca tick-rule
              reconstruction at confidence 0.5. Suppressed when there is no
              flow — "TAPE UNAVAILABLE" already answers the question, and a
              second chip beside it is noise, not disclosure. */}
          {flow.hasFlow && provenanceNote && (
            <span
              className="wm-smart-money-provenance text-[9px] font-bold rounded px-1 py-px leading-tight"
              title={provenanceNote.title}
              style={{ color: "#C9A55C", border: "1px solid #4A4020", background: "#1A1608" }}
            >
              {provenanceNote.chip}
            </span>
          )}
        </div>
        <div className="text-[10px] text-wm-text mt-0.5">
          {flow.hasFlow
            ? domSide === "buyers" || domSide === "sellers"
              ? `Observed aggressor tape on ${symbol} currently favors ${domSide}. Location is not confirmed because no validated structure zone is available.`
              : `Observed aggressor tape on ${symbol} is balanced. Location is not confirmed because no validated structure zone is available.`
            : `No aggressor-tagged tape is available for ${symbol}. Directional order-flow claims are suppressed.`}
          {flow.hasFlow && provenanceNote ? ` ${provenanceNote.title}` : ""}
        </div>
      </div>
      {/* ── end SCROLLABLE BODY ── */}
      </div>
    </motion.div>
    </>
  );
}
