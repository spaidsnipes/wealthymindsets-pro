"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X, ChevronDown, ChevronRight, AlertCircle, CheckCircle2, TrendingUp, TrendingDown, Zap, Eye, Swords, GraduationCap, Info, Droplets, Minimize2, Maximize2 } from "lucide-react";
import { WMLogo } from "@/components/ui/WMLogo";
import { clsx } from "clsx";
import { useWebSocket } from "@/hooks/useWebSocket";
import { getFabioInsights, inferAssetClass } from "@/lib/fabio";
import { evaluateClcEvidence } from "@/lib/decisionIntegrity";
import { hasVerifiedAggressorTape } from "@/lib/marketData/capabilityRegistry";
import { getSmartMoneyPanelLayout } from "./smartMoneyLayout";

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
interface Flow {
  haveData: boolean;   // any real ticks yet?
  hasFlow: boolean;    // real aggressor volume present (askVol+bidVol > 0)
  vwap: number;        // volume-weighted avg price of recent ticks (REAL)
  cvd: number;         // cumulative volume delta = askVol - bidVol (REAL)
  askVol: number;      // aggressive-buy volume (lifting the offer)
  bidVol: number;      // aggressive-sell volume (hitting the bid)
  imbRatio: number;    // dominant/passive % (REAL)
  askDom: boolean;     // askVol >= bidVol
  candleUp: boolean;   // live bar close >= open (REAL)
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
      ? { name: "Order Flow Imbalance", value: `${imbRatio}% ${askDom ? "Ask (buy)" : "Bid (sell)"}-heavy`, strength: imbRatio > 160 ? "strong" : "moderate", bullish: askDom, description: `Aggressive ${askDom ? "buyers lifting offers" : "sellers hitting bids"} dominate the tape` }
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
  neutral:  "#5A6575",
};

const SECTIONS = [
  { key: "vwap",            label: "VWAP + Bands",             from: 0,  to: 3  },
  { key: "orderflow",       label: "Order Flow Signals",        from: 3,  to: 14 },
  { key: "delta",           label: "Delta / CVD / Footprint",   from: 14, to: 17 },
  { key: "iceberg",         label: "Iceberg & Dark Pool",       from: 17, to: 19 },
  { key: "regime",          label: "Markov / Wyckoff Regime",   from: 19, to: 24 },
  { key: "clc",             label: "CLC Rule + Entry Signals",  from: 24, to: 29 },
];

// ─── Confluence engine ───────────────────────────────────────────────────────
// A REAL 0-100 score derived from independent, measurable lenses — not a count
// of signals cloned from one bias flag. Each lens votes with a signed magnitude;
// lenses that can't be measured on the current feed abstain (dir "na") instead
// of inflating the read. The score genuinely swings and can sit NEUTRAL when the
// lenses disagree.
interface Lens { label: string; dir: "bull" | "bear" | "na"; detail: string; }
interface Confluence {
  score: number; bias: "BULL" | "BEAR" | "NEUTRAL";
  bull: number; bear: number; measured: number; lenses: Lens[];
}
const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function computeConfluence(price: number, f: Flow): Confluence {
  const vwap = f.vwap > 0 ? f.vwap : price;
  const totVol = f.askVol + f.bidVol;
  const lenses: Lens[] = [];
  let sum = 0;

  // 1. VWAP position (trend context) — measurable whenever price + VWAP exist
  if (price > 0 && vwap > 0) {
    const rel = (price - vwap) / vwap;
    sum += 16 * clampN(rel / 0.004, -1, 1);              // ±0.4% saturates
    lenses.push({ label: "VWAP", dir: rel > 0.0002 ? "bull" : rel < -0.0002 ? "bear" : "na",
      detail: `${(rel * 100).toFixed(2)}% ${rel >= 0 ? "above" : "below"} VWAP` });
  } else lenses.push({ label: "VWAP", dir: "na", detail: "No price/VWAP yet" });

  // 2. Cumulative delta — only when the feed carries per-trade aggressor side
  if (f.hasFlow && totVol > 0) {
    const rel = clampN(f.cvd / totVol, -1, 1);
    sum += 16 * rel;
    lenses.push({ label: "CVD", dir: f.cvd > 0 ? "bull" : f.cvd < 0 ? "bear" : "na",
      detail: `Δ ${fmtDelta(f.cvd)} (${Math.round(Math.abs(rel) * 100)}% one-sided)` });
  } else lenses.push({ label: "CVD", dir: "na", detail: "No aggressor tape on this feed" });

  // 3. Aggressor imbalance — only when hasFlow
  if (f.hasFlow && totVol > 0) {
    const strength = clampN((f.imbRatio - 100) / 120, 0, 1);
    sum += 10 * (f.askDom ? 1 : -1) * strength;
    lenses.push({ label: "Imbalance", dir: strength < 0.05 ? "na" : f.askDom ? "bull" : "bear",
      detail: `${Math.round(f.imbRatio)}% ${f.askDom ? "buy" : "sell"}-heavy` });
  } else lenses.push({ label: "Imbalance", dir: "na", detail: "Requires per-trade side data" });

  // 4. Candle body — always measurable from the live bar
  sum += 6 * (f.candleUp ? 1 : -1);
  lenses.push({ label: "Candle", dir: f.candleUp ? "bull" : "bear",
    detail: f.candleUp ? "Live bar closing up" : "Live bar closing down" });

  // 5. VWAP band position — mean-reversion lens, independent of raw trend
  const up = vwap * 1.004, down = vwap * 0.996;
  if (price > up)        { sum -= 6; lenses.push({ label: "Band", dir: "bear", detail: "Stretched above upper band" }); }
  else if (price < down) { sum += 6; lenses.push({ label: "Band", dir: "bull", detail: "Stretched below lower band" }); }
  else                     lenses.push({ label: "Band", dir: "na", detail: "Inside VWAP bands" });

  const score = Math.round(clampN(50 + sum, 2, 98));
  const bias: Confluence["bias"] = score >= 58 ? "BULL" : score <= 42 ? "BEAR" : "NEUTRAL";
  return {
    score, bias,
    bull: lenses.filter(l => l.dir === "bull").length,
    bear: lenses.filter(l => l.dir === "bear").length,
    measured: lenses.filter(l => l.dir !== "na").length,
    lenses,
  };
}

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

  const { ticker, recentTicks, liveBar, tapeSource } = useWebSocket({ symbol, timeframe: "1m" });
  const livePrice = ticker.price > 0 ? ticker.price : 0;
  const realTape = hasVerifiedAggressorTape(tapeSource);

  // ── Build the REAL order-flow snapshot from live ticks + the live 1m bar ────
  const flow: Flow = React.useMemo(() => {
    if (!realTape) {
      return {
        haveData: false, hasFlow: false, vwap: livePrice || 0, cvd: 0,
        askVol: 0, bidVol: 0, imbRatio: 100, askDom: true,
        candleUp: liveBar ? Number(liveBar.close) >= Number(liveBar.open) : true,
      };
    }
    // Delta flow uses EVERY real executed trade (tick.trade) with NO lot floor —
    // the old minAggressorLot filter (≥2 BTC on crypto) discarded ~100% of real
    // Coinbase flow and starved this whole panel to "NO TAPE". Real trades only.
    const ticks = (Array.isArray(recentTicks) ? recentTicks : [])
      .filter(t => t?.trade === true && (Number(t?.size) || 0) > 0);
    let askVol = 0, bidVol = 0, pv = 0, vol = 0;
    for (const t of ticks) {
      const size = Number(t?.size) || 0;
      const px = Number(t?.price) || 0;
      if (size <= 0 || px <= 0) continue;
      if (t?.side === "buy") askVol += size; else bidVol += size;
      pv += px * size; vol += size;
    }
    const cvd = askVol - bidVol;
    const vwap = vol > 0 ? pv / vol : (livePrice || 0);
    const hi = Math.max(askVol, bidVol), lo = Math.min(askVol, bidVol);
    const imbRatio = lo > 0 ? (hi / lo) * 100 : (hi > 0 ? 300 : 100);
    const candleUp = liveBar ? Number(liveBar.close) >= Number(liveBar.open) : true;
    return {
      haveData: ticks.length > 0,
      hasFlow: (askVol + bidVol) > 0,
      vwap, cvd, askVol, bidVol, imbRatio,
      askDom: askVol >= bidVol,
      candleUp,
    };
  }, [recentTicks, liveBar, livePrice, realTape]);

  // ── WM DELTA BUBBLES — live net delta at each price level ────────────────────
  // Buckets the SAME real aggressor ticks the flow snapshot reads into price
  // levels, then nets buy vs sell size per level. Green bubble = buyers dominated
  // that level, red = sellers; bubble size scales with how lopsided it was. No
  // tape → no bubbles (we never invent levels). Honest by construction.
  const deltaLevels = React.useMemo(() => {
    if (!realTape) return [] as { price: number; delta: number; vol: number }[];
    const ticks = Array.isArray(recentTicks) ? recentTicks : [];
    // Same honest rule as the flow snapshot + the chart's delta engine: every real
    // executed trade (tick.trade), no lot floor, so bubbles reflect full aggressive
    // flow per zone on any feed (BTC 0.01Δ or TSLA 50sh alike). Never invent levels.
    const clean = ticks.filter(t => t?.trade === true && (Number(t?.size) || 0) > 0 && (Number(t?.price) || 0) > 0);
    if (clean.length === 0) return [] as { price: number; delta: number; vol: number }[];
    let lo = Infinity, hi = -Infinity;
    for (const t of clean) { const p = Number(t.price); if (p < lo) lo = p; if (p > hi) hi = p; }
    const BUCKETS = 6;
    const span  = hi - lo;
    const width = span > 0 ? span / BUCKETS : 1;   // degenerate feed → single level
    const acc = new Map<number, { buy: number; sell: number }>();
    for (const t of clean) {
      const p = Number(t.price), size = Number(t.size);
      let idx = span > 0 ? Math.floor((p - lo) / width) : 0;
      if (idx >= BUCKETS) idx = BUCKETS - 1;         // clamp the top-of-range edge
      if (idx < 0) idx = 0;
      const cur = acc.get(idx) ?? { buy: 0, sell: 0 };
      if (t.side === "buy") cur.buy += size; else cur.sell += size;
      acc.set(idx, cur);
    }
    return [...acc.entries()]
      .map(([idx, v]) => ({ price: lo + (idx + 0.5) * width, delta: v.buy - v.sell, vol: v.buy + v.sell }))
      .filter(l => l.vol > 0)
      .sort((a, b) => b.price - a.price);            // top of book first
  }, [recentTicks, realTape, livePrice]);
  const maxAbsDelta = deltaLevels.reduce((m, l) => Math.max(m, Math.abs(l.delta)), 0);

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
  const [deltaLevelCap, setDeltaLevelCapState] = useState<number>(() => {
    if (typeof window === "undefined") return 7;
    const v = parseInt(localStorage.getItem("wm_delta_levels") || "7", 10);
    return [5, 7, 10, 15].includes(v) ? v : 7;
  });
  const setDeltaLevelCap = (n: number) => {
    setDeltaLevelCapState(n);
    try { localStorage.setItem("wm_delta_levels", String(n)); } catch {}
    try { window.dispatchEvent(new CustomEvent("wm-delta-levels")); } catch {}
  };
  // Stay in sync if the value is changed elsewhere (e.g. another tab).
  useEffect(() => {
    const onEvt = () => {
      const v = parseInt(localStorage.getItem("wm_delta_levels") || "7", 10);
      setDeltaLevelCapState([5, 7, 10, 15].includes(v) ? v : 7);
    };
    window.addEventListener("wm-delta-levels", onEvt);
    return () => window.removeEventListener("wm-delta-levels", onEvt);
  }, []);
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
  const conf = computeConfluence(livePrice, flow);
  const bias = conf.bias;
  const scoreColor = conf.score >= 58 ? "#00D4AA" : conf.score <= 42 ? "#F6465D" : "#F0B429";

  // CLC location remains unavailable until a real structure-zone model exists.
  // Never substitute percentage offsets around the current price.
  const hasPrice = livePrice > 0;
  const clcDecision = evaluateClcEvidence({
    context: hasPrice,
    location: false,
    confirmation: flow.hasFlow,
  });
  const ddp = livePrice > 1000 ? 0 : livePrice > 10 ? 2 : 4;
  const isBull = bias !== "BEAR";

  // ── DELTA DOMINATION (the tug-of-war) ───────────────────────────────────────
  // Who is actually winning the fight right now — measured from REAL aggressor
  // volume, not price. Green = buyers winning, red = sellers winning. When the
  // feed carries no per-trade side data we say so honestly instead of faking it.
  const totAgg   = flow.askVol + flow.bidVol;
  const buyPct   = totAgg > 0 ? Math.round((flow.askVol / totAgg) * 100) : 50;
  const sellPct  = 100 - buyPct;
  const deltaVal = flow.cvd;                                   // REAL net delta (unrounded)
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
      ? "No aggressor-tagged tape is available, so pressure is unavailable."
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
        {/* Bias badge */}
        <div
          className={clsx(
            "px-2 py-0.5 rounded text-[10px] font-bold mr-1",
            bias === "BULL" ? "bg-wm-green/15 text-wm-green border border-wm-green/30" :
            bias === "BEAR" ? "bg-wm-red/15 text-wm-red border border-wm-red/30" :
            "bg-wm-muted text-wm-text-muted"
          )}
        >
          {bias === "BULL" ? "↑" : bias === "BEAR" ? "↓" : "–"} {bias}
        </div>
        <button onClick={() => setCompact(c => !c)} title={compact ? "Comfortable density" : "Compact density"} className="text-wm-text-dim hover:text-wm-text p-1 transition-colors">
          {compact ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
        </button>
        <button ref={closeRef} onClick={onClose} aria-label="Close Smart Money panel" title="Close (Esc)" className="text-wm-text-dim hover:text-wm-text p-3 -m-2 transition-colors min-w-11 min-h-11 inline-flex items-center justify-center">
          <X size={13} />
        </button>
      </div>

      {/* Missing CLC evidence suppresses the persuasive aggregate number. */}
      <div className="px-2 py-1.5 border-b border-wm-border shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-wm-text-muted">Confluence Score</span>
          <span className="text-[10px] font-black text-wm-gold">
            {clcDecision.status === "INSUFFICIENT_EVIDENCE" ? "INSUFFICIENT EVIDENCE" : `${conf.score}/100`}
          </span>
        </div>
        {clcDecision.status === "READY_FOR_RISK_REVIEW" && (
          <div className="h-2 rounded-full bg-wm-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${conf.score}%`, background: `linear-gradient(90deg, ${scoreColor}, #4FA3E0)` }}
            />
          </div>
        )}
        {/* Independent-lens breakdown — shows genuine agreement / conflict */}
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
          {conf.bull} bullish · {conf.bear} bearish · {5 - conf.measured} N/A on this feed
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
          <div className="text-[9px] text-wm-text-dim leading-relaxed">
            No per-trade buy/sell side on this feed yet, so we can't measure the tug-of-war honestly.
            Delta domination needs aggressor-tagged ticks. Crypto (BTC/ETH/SOL…) carries them 24/7; stocks carry them
            while the market is open. Futures have no aggressor tape wired up here yet. We won&apos;t fake a winner.
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
          <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-black bg-wm-muted text-wm-text-dim">
            {flow.hasFlow ? `${deltaLevels.length} LEVEL${deltaLevels.length === 1 ? "" : "S"}` : "NO TAPE"}
          </span>
        </div>

        {/* WM-UX-P0-01 — Delta level-count control (migrated from the Big Trades
            gear). Four discrete presets, not a slider: the domain is 4 meaningful
            values, and a segmented control gives an unambiguous a11y selected state. */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-wm-text">Levels shown</span>
            <span className="text-[8px] text-wm-text-dim">max ranked price levels per bar</span>
          </div>
          <div role="group" aria-label="Delta bubble levels shown" className="grid grid-cols-4 gap-1">
            {[5, 7, 10, 15].map((n, idx, arr) => {
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
                  {n}{n === 7 ? " ★" : ""}
                </button>
              );
            })}
          </div>
        </div>

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
              Green = buyers dominate that level · red = sellers. Bigger bubble = more lopsided. Net buy−sell size per level, live from the tape (side est. from price).
            </div>
          </div>
        ) : (
          <p className="text-[9px] text-wm-text-dim leading-relaxed">
            No per-trade buy/sell tape on this feed — bubbles appear the moment real aggressor flow arrives.
            Crypto streams it 24/7; stocks stream it during market hours. Futures carry no aggressor tape here yet.
          </p>
        )}
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
        <div className="flex items-center gap-1.5">
          <AlertCircle size={11} className={flow.hasFlow ? "text-wm-green" : "text-wm-gold"} />
          <span className={clsx("text-[10px] font-bold", flow.hasFlow ? "text-wm-green" : "text-wm-gold")}>
            {flow.hasFlow ? "LIVE TAPE OBSERVATION" : "TAPE UNAVAILABLE"}
          </span>
        </div>
        <div className="text-[10px] text-wm-text mt-0.5">
          {flow.hasFlow
            ? domSide === "buyers" || domSide === "sellers"
              ? `Observed aggressor tape on ${symbol} currently favors ${domSide}. Location is not confirmed because no validated structure zone is available.`
              : `Observed aggressor tape on ${symbol} is balanced. Location is not confirmed because no validated structure zone is available.`
            : `No aggressor-tagged tape is available for ${symbol}. Directional order-flow claims are suppressed.`}
        </div>
      </div>
      {/* ── end SCROLLABLE BODY ── */}
      </div>
    </motion.div>
    </>
  );
}
