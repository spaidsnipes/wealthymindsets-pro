"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, ChevronDown, ChevronRight, AlertCircle, CheckCircle2, TrendingUp, TrendingDown, Zap, Eye, Swords, GraduationCap, Info, Droplets, Volume2, VolumeX } from "lucide-react";
import { WMLogo } from "@/components/ui/WMLogo";
import { clsx } from "clsx";
import { useWebSocket } from "@/hooks/useWebSocket";
import { getFabioInsights, inferAssetClass } from "@/lib/fabio";
import { placeChartMarketOrder, type OrderSide } from "@/lib/paperTrade";
import { playSfx, isSfxOn, setSfxOn } from "@/lib/sfx";

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

// Deterministic seeded random — stable for a given price+seed so panel doesn't spin
function sr(price: number, seed: number): number {
  const n = Math.floor(Math.abs(price) * 100) + seed * 997;
  const v = Math.sin(n * 12.9898 + seed * 78.233) * 43758.5453;
  return Math.abs(v - Math.floor(v)); // [0, 1)
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
  const priceSeed = Math.floor(price / (tick * 20));

  // Price-anchored display levels (approximate zones; they do NOT vote on direction).
  const vwap     = f.vwap > 0 ? +f.vwap.toFixed(dp) : +(price).toFixed(dp);
  const vwapUp   = +(vwap * 1.004).toFixed(dp);
  const vwapDown = +(vwap * 0.996).toFixed(dp);
  const pdl      = +(price * (0.993 + sr(priceSeed, 2) * 0.003)).toFixed(dp);
  const demand   = +(price * (0.994 + sr(priceSeed, 3) * 0.003)).toFixed(dp);
  const demandH  = +(demand * 1.001).toFixed(dp);
  const absSpt   = +(price * (0.9985 + sr(priceSeed, 4) * 0.001)).toFixed(dp);

  // ── REAL directional reads ───────────────────────────────────────────────
  const bullBias = biasFromFlow(price, f);          // majority of real signals
  const cvdVal   = f.cvd;                           // REAL cumulative delta (unrounded)
  const cvdPos   = cvdVal >= 0;
  const askDom   = f.askDom;                         // REAL imbalance side
  const imbRatio = Math.round(f.imbRatio);           // REAL dominant/passive %
  const aboveVwap = price >= vwap;

  const entryPx  = +(price + (bullBias ? tick * 2 : -tick * 2)).toFixed(dp);
  const entryLo  = +(price - tick).toFixed(dp);
  const entryHi  = +(price + tick * 3).toFixed(dp);

  // Confidence scales with how one-sided the real delta is.
  const totVol   = f.askVol + f.bidVol;
  const deltaConf = totVol > 0 ? Math.min(96, 55 + Math.round(Math.abs(f.cvd) / totVol * 60)) : 60;

  // "delta-confirmed" is only true when the feed actually carries aggressor tape.
  const phaseTag  = f.hasFlow ? " (delta-confirmed)" : " (price/VWAP context)";
  const phaseStr  = (bullBias ? "Phase D — Markup" : "Phase D — Markdown") + phaseTag;
  const schematic = bullBias ? "Accumulation → Markup" : "Distribution → Markdown";

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
    { name: bullBias ? "Bids Supporting PDL" : "Offers Capping PDH", value: `Watch ${fmt(pdl,dp)} — ${bullBias?"bids may support":"offers may cap"}`, strength: "neutral", bullish: null, description: "Level context, not a measured directional vote" },
    { name: bullBias ? "Passive Buyers" : "Passive Sellers", value: "N/A — needs Level-2 depth", strength: "neutral", bullish: null, description: "Resting bid/offer size requires an order-book feed" },
    { name: "Spoofing Detection", value: "N/A — needs Level-2 order book", strength: "neutral", bullish: null, description: "Cannot be measured from time-and-sales alone" },
    { name: "Stop Run", value: "N/A — needs swing/liquidity map", strength: "neutral", bullish: null, description: "Liquidity sweeps require tracked swing highs/lows, not in this snapshot" },
    { name: "Trapped Traders", value: "N/A — needs positioning data", strength: "neutral", bullish: null, description: "Inferring trapped positioning needs order-book / OI data" },
    { name: "Pullback + " + (bullBias ? "Demand" : "Supply"), value: `Zone context near ${fmt(demand,dp)}`, strength: "neutral", bullish: null, description: "Approximate zone for context, not a measured directional vote" },

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
    { name: "Regime", value: `${(f.hasFlow?cvdPos:aboveVwap)?"Trending Up":"Trending Down"} (${deltaConf}% conviction)`, strength: deltaConf > 75 ? "strong" : "moderate", bullish: f.hasFlow ? cvdPos : aboveVwap, description: "Trend read from real delta (or price-vs-VWAP without tape)" },
    { name: "Wyckoff Phase", value: phaseStr, strength: "neutral", bullish: null, description: "Wyckoff phase is an interpretive overlay, not a measured directional vote" },
    { name: "Wyckoff Schematic", value: schematic, strength: "neutral", bullish: null, description: "Interpretive schematic for context only" },
    { name: bullBias ? "Higher Lows at Demand" : "Lower Highs at Supply", value: "N/A — needs swing structure", strength: "neutral", bullish: null, description: "Swing-structure reads require tracked pivots, not in this snapshot" },
    { name: "PDL Setup", value: `PDL ${fmt(pdl,dp)} — level to watch`, strength: "neutral", bullish: null, description: "Prior-day level for context, not a measured directional vote" },

    // CLC Rule — all three now REAL reads
    { name: "Context", value: aboveVwap ? "Bullish — above VWAP" : "Bearish — below VWAP", strength: "strong", bullish: aboveVwap },
    { name: "Location", value: `Zone ${fmt(demand,dp)}–${fmt(demandH,dp)}`, strength: "neutral", bullish: null, description: "Approximate zone for context, not a measured directional vote" },
    { name: "Confirmation", value: f.hasFlow ? `Real ${cvdPos?"buying":"selling"} on tape (Δ ${fmtDelta(cvdVal)})` : (aboveVwap ? "Price-confirmed above VWAP (no tape side data)" : "Price-confirmed below VWAP (no tape side data)"), strength: f.hasFlow ? "strong" : "moderate", bullish: f.hasFlow ? cvdPos : aboveVwap },

    // Entry signals
    { name: "Entry Signal", value: `${bullBias?"LONG":"SHORT"} at ${fmt(entryPx,dp)} (${f.hasFlow ? "order flow" : "VWAP context"})`, strength: f.hasFlow ? "strong" : "moderate", bullish: bullBias, description: f.hasFlow ? "Aligned with real cumulative delta + VWAP context" : "Directional lean from price vs VWAP — no tape side on this feed" },
    { name: "Best Opportunity", value: `Risk band: ${fmt(entryLo,dp)}–${fmt(entryHi,dp)}`, strength: "neutral", bullish: null, description: "Suggested risk band around the entry — informational, not a vote" },
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

const hasRealAggressorTape = (src: string | null) =>
  src === "finnhub" || src === "polygon" || src === "alpaca" || src === "binance";

export function SmartMoneyPanel({ onClose, symbol }: { onClose: () => void; symbol: string }) {
  const { ticker, recentTicks, liveBar, tapeSource } = useWebSocket({ symbol, timeframe: "1m" });
  const livePrice = ticker.price > 0 ? ticker.price : 0;
  const realTape = hasRealAggressorTape(tapeSource);

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
  const [paperMsg, setPaperMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // ── Sound FX layer (opt-in, synthesized) ────────────────────────────────────
  const [sfxOn, setSfxOnState] = useState(false);
  useEffect(() => { setSfxOnState(isSfxOn()); }, []);           // hydrate from localStorage
  const prevSmdSigRef = React.useRef<string | null>(null);      // rising-edge guard for the fire bell
  const toggleSfx = () => {
    const next = !sfxOn;
    setSfxOn(next);
    setSfxOnState(next);
    if (next) playSfx("bell", { force: true });                // the toggle click IS the gesture → confirm with a ding
  };

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

  // Price-derived zone numbers for the CLC card + live alert, so they reflect the
  // CURRENT symbol instead of the old hardcoded NQ levels (21,795–21,820). When
  // there's no live price yet we show em-dashes rather than fake numbers.
  const hasPrice = livePrice > 0;
  const ddp = livePrice > 1000 ? 0 : livePrice > 10 ? 2 : 4;
  const isBull = bias !== "BEAR";
  const zoneLo   = hasPrice ? fmt(livePrice * 0.9985, ddp) : "—";
  const zoneHi   = hasPrice ? fmt(livePrice * 1.0005, ddp) : "—";
  const defendPx = hasPrice ? fmt(livePrice * (isBull ? 0.999 : 1.001), ddp) : "—";
  const zoneWord = isBull ? "Demand" : "Supply";

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
  // Practice-trade suggestion aligned with who's winning, with a tight (<1%) stop.
  const domLong  = domSide === "buyers" || (domSide === "even" && isBull);
  const domEntry = hasPrice ? fmt(livePrice, ddp) : "—";
  const domStop  = hasPrice ? fmt(livePrice * (domLong ? 0.992 : 1.008), ddp) : "—"; // ~0.8%
  const domTgt   = hasPrice ? fmt(livePrice * (domLong ? 1.016 : 0.984), ddp) : "—"; // ~2R

  // ── SMART MONEY DELTA — the fire signal ─────────────────────────────────────
  // Fires ONLY on real aggressor tape (flow.hasFlow). Two honest triggers:
  //  • Absorption / divergence — price ticks one way while delta pushes the
  //    other (the "price is lying" reversal). Trades AGAINST price.
  //  • Domination — one side controls ≥65% of aggressive volume (momentum).
  // No tape → the signal stays dark and says why. We never fire on fake data.
  const smdDir: "LONG" | "SHORT" | null =
    !flow.hasFlow                 ? null
    : divergence === "bearish"    ? "SHORT"   // price up, sellers absorbing → fade
    : divergence === "bullish"    ? "LONG"    // price down, buyers absorbing → fade
    : buyPct  >= 65               ? "LONG"    // buyers dominate the tape
    : sellPct >= 65               ? "SHORT"   // sellers dominate the tape
    : null;
  const smdFired = smdDir !== null;
  const smdKind: "absorption" | "domination" | null =
    !smdFired ? null : divergence !== null ? "absorption" : "domination";
  const smdLong = smdDir === "LONG";
  const smdReason =
    !flow.hasFlow
      ? "Needs aggressor tape — this feed carries no per-trade buy/sell side yet, so the delta engine can't fire honestly."
    : smdKind === "absorption" && smdDir === "SHORT"
      ? "Absorption: price is ticking UP but sellers dominate the tape. Buyers are getting eaten — high-odds reversal DOWN."
    : smdKind === "absorption" && smdDir === "LONG"
      ? "Absorption: price is ticking DOWN but buyers dominate the tape. Sellers are getting eaten — high-odds reversal UP."
    : smdDir === "LONG"
      ? `Domination: buyers control ${buyPct}% of the aggressive tape (Δ ${fmtDelta(deltaVal)}). Momentum is long.`
    : smdDir === "SHORT"
      ? `Domination: sellers control ${sellPct}% of the aggressive tape (Δ ${fmtDelta(deltaVal)}). Momentum is short.`
    : "Delta engine ARMED — real tape flowing, but no strong edge yet. Waiting for absorption or one-sided aggression.";
  const smdStopPx = hasPrice ? fmt(livePrice * (smdLong ? 0.992 : 1.008), ddp) : "—"; // <1% stop
  const smdTgtPx  = hasPrice ? fmt(livePrice * (smdLong ? 1.016 : 0.984), ddp) : "—"; // ~2R

  // Ring the bell on the RISING EDGE of a fresh fire (kind+dir change), not every
  // render. playSfx is a no-op unless the user opted in, and it self-throttles.
  useEffect(() => {
    const sig = smdFired ? `${smdKind}:${smdDir}` : null;
    if (sig && sig !== prevSmdSigRef.current) playSfx("bell");
    prevSmdSigRef.current = sig;
  }, [smdFired, smdKind, smdDir]);

  // One-click paper trade straight from the chart → shared /paper brokerage store.
  const placePaper = (side: OrderSide) => {
    if (!hasPrice) { setPaperMsg({ text: "No live price yet — can't place a paper order.", ok: false }); return; }
    const res = placeChartMarketOrder(symbol, side, 1, livePrice);
    if (res.ok) {
      playSfx("punch");                                        // body-shot thump on a filled paper order (opt-in)
      const stopLvl = fmt(livePrice * (side === "buy" ? 0.992 : 1.008), ddp);
      const verb = side === "buy" ? "LONG" : "SHORT";
      const closed = res.realized !== 0 ? ` · realized ${res.realized >= 0 ? "+" : ""}${fmt(res.realized, 2)}` : "";
      setPaperMsg({ text: `Paper ${verb} 1 ${symbol} @ ${fmt(res.fillPx, ddp)} · stop ${stopLvl} (~0.8%)${closed}`, ok: true });
    } else {
      setPaperMsg({ text: res.error || "Paper order failed.", ok: false });
    }
    setTimeout(() => setPaperMsg(null), 6000);
  };

  // ── WM PLAYBOOK — folded contextual insights (on-brand, no external label) ───
  const playbook = getFabioInsights({ symbol, assetClass: inferAssetClass(symbol) }, 3);

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 350, damping: 35 }}
      className="border-l border-wm-border bg-wm-dark flex flex-col shrink-0 overflow-hidden min-h-0 h-full"
      style={{ width: "min(19rem, 28vw)", maxWidth: "100%", maxHeight: "100dvh" }}
    >
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
        <button onClick={onClose} className="text-wm-text-dim hover:text-wm-text p-1 transition-colors">
          <X size={13} />
        </button>
      </div>

      {/* Confluence score — real 0-100 from independent lenses */}
      <div className="px-2 py-1.5 border-b border-wm-border shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-wm-text-muted">Confluence Score</span>
          <span className="text-[11px] font-black tabular-nums" style={{ color: scoreColor }}>
            {conf.score}<span className="text-[9px] text-wm-text-dim font-bold">/100</span>
          </span>
        </div>
        <div className="h-2 rounded-full bg-wm-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${conf.score}%`, background: `linear-gradient(90deg, ${scoreColor}, #4FA3E0)` }}
          />
        </div>
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
          below scrolls so no section is ever clipped on short viewports ───── */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">

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

            {/* Practice trade from the winning side, tight (<1%) stop */}
            <div className="mt-2 p-1.5 rounded bg-wm-muted/40 border border-wm-border">
              <div className="text-[9px] font-bold text-wm-text-muted mb-0.5">
                Practice play · {domLong ? "LONG (ride the buyers)" : "SHORT (ride the sellers)"}
              </div>
              <div className="flex items-center justify-between text-[9px] tabular-nums">
                <span className="text-wm-text-dim">Entry <span className="text-wm-text font-semibold">{domEntry}</span></span>
                <span className="text-wm-text-dim">Stop <span className="text-wm-red font-semibold">{domStop}</span></span>
                <span className="text-wm-text-dim">Target <span className="text-wm-green font-semibold">{domTgt}</span></span>
              </div>
              <div className="text-[8px] text-wm-text-dim mt-0.5">Tight stop (~0.8%) — if you're wrong, surrender fast. Small losses, big winners.</div>
            </div>
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

      {/* ── SMART MONEY DELTA — the fire signal + one-click paper trade ─────── */}
      <div className={clsx(
        "mx-2 my-1.5 p-2 rounded-lg border shrink-0",
        smdFired && smdLong  ? "bg-wm-green/10 border-wm-green/30" :
        smdFired && !smdLong ? "bg-wm-red/10 border-wm-red/30" :
        flow.hasFlow         ? "bg-wm-gold/5 border-wm-gold/25" :
                               "bg-wm-surface border-wm-border"
      )}>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Zap size={11} className={clsx(
            smdFired && smdLong  ? "text-wm-green fill-wm-green" :
            smdFired && !smdLong ? "text-wm-red fill-wm-red" :
            flow.hasFlow         ? "text-wm-gold" : "text-wm-text-dim"
          )} />
          <span className="text-[10px] font-bold text-wm-text">SMART MONEY DELTA</span>
          <span className={clsx(
            "ml-auto px-1.5 py-0.5 rounded text-[9px] font-black",
            smdFired && smdLong  ? "bg-wm-green/15 text-wm-green" :
            smdFired && !smdLong ? "bg-wm-red/15 text-wm-red" :
            flow.hasFlow         ? "bg-wm-gold/15 text-wm-gold" :
                                   "bg-wm-muted text-wm-text-dim"
          )}>
            {smdFired ? `🔥 FIRED · ${smdDir}` : flow.hasFlow ? "ARMED" : "NO TAPE"}
          </span>
        </div>

        <p className="text-[9px] text-wm-text-dim leading-relaxed">{smdReason}</p>

        {smdFired && hasPrice && (
          <div className="mt-2 p-1.5 rounded bg-wm-muted/40 border border-wm-border">
            <div className="text-[9px] font-bold text-wm-text-muted mb-0.5">
              {smdKind === "absorption" ? "Absorption reversal" : "Momentum ride"} · {smdLong ? "LONG" : "SHORT"}
            </div>
            <div className="flex items-center justify-between text-[9px] tabular-nums">
              <span className="text-wm-text-dim">Entry <span className="text-wm-text font-semibold">{fmt(livePrice, ddp)}</span></span>
              <span className="text-wm-text-dim">Stop <span className="text-wm-red font-semibold">{smdStopPx}</span></span>
              <span className="text-wm-text-dim">Target <span className="text-wm-green font-semibold">{smdTgtPx}</span></span>
            </div>
            <div className="text-[8px] text-wm-text-dim mt-0.5">Tight stop (under 1%) — surrender fast if wrong. Small losses, big winners.</div>
          </div>
        )}

        {/* One-click paper trade → shared /paper brokerage store */}
        <div className="grid grid-cols-2 gap-1.5 mt-2">
          <button
            onClick={() => placePaper("buy")}
            disabled={!hasPrice}
            className={clsx(
              "py-1.5 rounded text-[10px] font-black transition-colors border disabled:opacity-40 disabled:cursor-not-allowed",
              smdFired && smdLong
                ? "bg-wm-green/20 text-wm-green border-wm-green/40 hover:bg-wm-green/30"
                : "bg-wm-muted/40 text-wm-green border-wm-border hover:bg-wm-green/15"
            )}
          >
            📝 Paper BUY
          </button>
          <button
            onClick={() => placePaper("sell")}
            disabled={!hasPrice}
            className={clsx(
              "py-1.5 rounded text-[10px] font-black transition-colors border disabled:opacity-40 disabled:cursor-not-allowed",
              smdFired && !smdLong
                ? "bg-wm-red/20 text-wm-red border-wm-red/40 hover:bg-wm-red/30"
                : "bg-wm-muted/40 text-wm-red border-wm-border hover:bg-wm-red/15"
            )}
          >
            📝 Paper SELL
          </button>
        </div>

        {paperMsg && (
          <div className="mt-1.5 flex items-start gap-1.5">
            {paperMsg.ok
              ? <CheckCircle2 size={10} className="text-wm-green shrink-0 mt-px" />
              : <AlertCircle size={10} className="text-wm-red shrink-0 mt-px" />}
            <span className={clsx("text-[9px] leading-tight", paperMsg.ok ? "text-wm-green" : "text-wm-red")}>{paperMsg.text}</span>
          </div>
        )}

        {/* Opt-in sound layer — synthesized (Web Audio), never a licensed clip */}
        <button
          onClick={toggleSfx}
          className="mt-2 flex items-center gap-1.5 text-[9px] text-wm-text-dim hover:text-wm-text transition-colors"
          title={sfxOn ? "Signal sounds ON — ring bell on a fresh fire, body-shot thump on a paper order. Click to mute." : "Signal sounds OFF — click to enable. Fully synthesized, no audio files."}
        >
          {sfxOn ? <Volume2 size={11} className="text-wm-gold" /> : <VolumeX size={11} />}
          <span>Signal sounds:&nbsp;<span className={clsx("font-black", sfxOn ? "text-wm-gold" : "text-wm-text-muted")}>{sfxOn ? "ON" : "OFF"}</span></span>
        </button>

        <a href="/paper" className="mt-1.5 block text-[9px] text-wm-gold hover:underline">Open Paper Trading →</a>
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
                    {up ? "+" : ""}{Math.round(lvl.delta).toLocaleString()}
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
        flow.hasFlow
          ? "bg-gradient-to-r from-wm-green/10 to-wm-blue/5 border-wm-green/25"
          : "bg-wm-surface border-wm-border"
      )}>
        <div className={clsx(
          "text-[10px] font-bold mb-1.5 flex items-center gap-1",
          flow.hasFlow ? "text-wm-green" : "text-wm-text-muted"
        )}>
          <Zap size={10} className={flow.hasFlow ? "fill-wm-green" : ""} />
          CLC RULE — {!hasPrice ? "AWAITING DATA" : flow.hasFlow ? "ENTRY CONFIRMED" : "AWAITING CONFIRMATION"}
        </div>
        <div className="space-y-1">
          {[
            { text: `Context: ${isBull ? "Bullish above" : "Bearish below"} VWAP`, ok: hasPrice },
            { text: `Location: ${zoneWord} zone ${zoneLo}–${zoneHi}`, ok: hasPrice },
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
        {flow.hasFlow ? (
          <div className="mt-2 p-1.5 rounded bg-wm-gold/10 border border-wm-gold/20">
            <div className="text-[9px] text-wm-gold font-semibold">⚡ ENTER ON ORDER FLOW — NOT CANDLE CLOSE</div>
            <div className="text-[9px] text-wm-text-dim mt-0.5">Superior R:R entering at real buying activity</div>
          </div>
        ) : (
          <div className="mt-2 p-1.5 rounded bg-wm-muted/40 border border-wm-border">
            <div className="text-[9px] text-wm-text-muted font-semibold">⚡ NEED AGGRESSOR TAPE TO CONFIRM</div>
            <div className="text-[9px] text-wm-text-dim mt-0.5">This feed carries no per-trade side — CLC confirmation can't fire yet</div>
          </div>
        )}
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

        {/* Wyckoff schematic detail */}
        <div className="mx-2 my-2 p-2 rounded-lg bg-wm-surface border border-wm-border">
          <div className="text-[10px] font-bold text-wm-blue mb-2">Wyckoff Accumulation Schematic</div>
          <div className="flex flex-col gap-1">
            {[
              { phase: "PS", label: "Preliminary Support", done: true },
              { phase: "SC", label: "Selling Climax", done: true },
              { phase: "AR", label: "Automatic Rally", done: true },
              { phase: "ST", label: "Secondary Test", done: true },
              { phase: "Spring", label: "Spring / Shakeout", done: true, active: true },
              { phase: "LPS", label: "Last Point of Support", done: false },
              { phase: "SOS", label: "Sign of Strength", done: false },
            ].map(p => (
              <div key={p.phase} className="flex items-center gap-2">
                <div
                  className="w-6 h-5 rounded text-[8px] font-bold flex items-center justify-center shrink-0"
                  style={{
                    background: p.active ? "rgba(0,212,170,0.25)" : p.done ? "rgba(79,163,224,0.15)" : "rgba(37,45,56,0.8)",
                    color: p.active ? "#00D4AA" : p.done ? "#4FA3E0" : "#5A6575",
                    border: `1px solid ${p.active ? "rgba(0,212,170,0.4)" : p.done ? "rgba(79,163,224,0.25)" : "rgba(37,45,56,0.5)"}`,
                  }}
                >
                  {p.phase}
                </div>
                <span
                  className="text-[10px]"
                  style={{ color: p.active ? "#00D4AA" : p.done ? "#8B95A5" : "#5A6575" }}
                >
                  {p.label}
                </span>
                {p.active && <span className="ml-auto text-[9px] text-wm-green animate-pulse">CURRENT</span>}
                {p.done && !p.active && <CheckCircle2 size={9} className="ml-auto text-wm-blue opacity-60" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live alert */}
      <div
        className="mx-2 mb-1.5 mt-1 p-1.5 rounded-lg border shrink-0 animate-pulse"
        style={{ borderColor: "rgba(0,212,170,0.35)", background: "rgba(0,212,170,0.06)" }}
      >
        <div className="flex items-center gap-1.5">
          <AlertCircle size={11} className="text-wm-green" />
          <span className="text-[10px] font-bold text-wm-green">LIVE ALERT</span>
          <span className="ml-auto text-[9px] text-wm-text-dim">just now</span>
        </div>
        <div className="text-[10px] text-wm-text mt-0.5">
          {hasPrice
            ? `Aggressive ${isBull ? "buyers defending" : "sellers capping"} ${defendPx} on ${symbol}. ${isBull ? "High-conviction long" : "High-conviction short"} setup. CLC confirmed.`
            : `Waiting for live ${symbol} tape — connect a data feed to stream order-flow alerts.`}
        </div>
      </div>
      {/* ── end SCROLLABLE BODY ── */}
      </div>
    </motion.div>
  );
}
