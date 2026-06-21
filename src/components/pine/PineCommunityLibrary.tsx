"use client";

/**
 * Pine Script Community Library
 * Browse, search, rate, fork, and import community-built indicators.
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Star, GitFork, BarChart2, TrendingUp, Zap, Eye,
  Download, Share2, Heart, Tag, ChevronRight, X, Copy, Check,
  Award, Flame, Clock, BookOpen,
} from "lucide-react";
import { clsx } from "clsx";

/* ── Community script catalogue ─────────────────────────── */
export interface CommunityScript {
  id:          string;
  title:       string;
  author:      string;
  authorBadge: string;
  category:    "Trend" | "Momentum" | "Volume" | "Smart Money" | "Order Flow" | "Oscillator" | "Strategy";
  description: string;
  tags:        string[];
  stars:       number;
  forks:       number;
  views:       number;
  featured:    boolean;
  verified:    boolean;
  code:        string;
  preview:     string; // thumbnail color
  updatedDays: number;
}

const COMMUNITY_SCRIPTS: CommunityScript[] = [
  {
    id: "clc-rule-signal",
    title: "CLC Rule Signal v3",
    author: "Spade_CLC",
    authorBadge: "👑",
    category: "Smart Money",
    description: "Context · Location · Confirmation signal overlay. Marks valid CLC setups with arrows, draws structure levels, and alerts on confirmation candle close.",
    tags: ["CLC", "Smart Money", "NQ", "Structure"],
    stars: 847, forks: 312, views: 14280, featured: true, verified: true,
    updatedDays: 2,
    preview: "#00D4AA",
    code: `//@version=5
indicator("CLC Rule Signal v3", overlay=true, shorttitle="CLC")

// ── Inputs ─────────────────────────────────────────────
lookback   = input.int(20, "Structure Lookback")
showAlerts = input.bool(true, "Show Alerts")

// ── Structure ───────────────────────────────────────────
swingHigh = ta.highest(high, lookback)
swingLow  = ta.lowest(low, lookback)
midpoint  = (swingHigh + swingLow) / 2

// ── Location: Premium/Discount zones ───────────────────
inPremium  = close > midpoint + (swingHigh - midpoint) * 0.5
inDiscount = close < midpoint - (midpoint - swingLow) * 0.5

// ── CLC Signal ─────────────────────────────────────────
bullSignal = inDiscount and ta.crossover(close, ta.ema(close, 8))
bearSignal = inPremium  and ta.crossunder(close, ta.ema(close, 8))

plotshape(bullSignal, "Bull CLC", shape.triangleup,   location.belowbar, color.green, size=size.small)
plotshape(bearSignal, "Bear CLC", shape.triangledown, location.abovebar, color.red,   size=size.small)
hline(midpoint, "Midpoint", color.gray, linestyle=hline.style_dashed)`,
  },
  {
    id: "vwap-bands-pro",
    title: "VWAP Bands Pro",
    author: "VeddVault",
    authorBadge: "⚡",
    category: "Trend",
    description: "VWAP with ±1σ, ±2σ, ±3σ deviation bands. Highlights when price enters extreme zones. Custom color gradient per band. Works on all timeframes.",
    tags: ["VWAP", "Deviation", "Bands", "Day Trading"],
    stars: 623, forks: 198, views: 9840, featured: true, verified: true,
    updatedDays: 5,
    preview: "#F0B429",
    code: `//@version=5
indicator("VWAP Bands Pro", overlay=true, shorttitle="VWAP+")

// ── VWAP calculation ────────────────────────────────────
var float cumPV = 0.0
var float cumPV2 = 0.0
var float cumV  = 0.0

if ta.change(time("D"))
    cumPV  := 0.0
    cumPV2 := 0.0
    cumV   := 0.0

typicalPrice = (high + low + close) / 3
cumPV  += typicalPrice * volume
cumPV2 += typicalPrice * typicalPrice * volume
cumV   += volume

vwap = cumPV / cumV
variance = cumPV2 / cumV - vwap * vwap
stdev = math.sqrt(math.max(variance, 0))

mult1 = input.float(1.0, "Band 1 Mult")
mult2 = input.float(2.0, "Band 2 Mult")
mult3 = input.float(3.0, "Band 3 Mult")

plot(vwap,            "VWAP",   color=#F0B429, linewidth=2)
plot(vwap + stdev*mult1, "+1σ", color=color.new(#00D4AA, 60), linewidth=1)
plot(vwap - stdev*mult1, "-1σ", color=color.new(#00D4AA, 60), linewidth=1)
plot(vwap + stdev*mult2, "+2σ", color=color.new(#4FA3E0, 50), linewidth=1)
plot(vwap - stdev*mult2, "-2σ", color=color.new(#4FA3E0, 50), linewidth=1)
plot(vwap + stdev*mult3, "+3σ", color=color.new(#8B5CF6, 40), linewidth=1)
plot(vwap - stdev*mult3, "-3σ", color=color.new(#8B5CF6, 40), linewidth=1)`,
  },
  {
    id: "smart-money-concepts",
    title: "Smart Money Concepts (ICT)",
    author: "NQKing21",
    authorBadge: "🔥",
    category: "Smart Money",
    description: "Full ICT Smart Money toolkit: Order Blocks, Fair Value Gaps, Break of Structure, Change of Character, Liquidity sweeps, and more. One-click on/off for each element.",
    tags: ["ICT", "Order Blocks", "FVG", "BOS", "CHoCH"],
    stars: 1204, forks: 481, views: 28400, featured: true, verified: true,
    updatedDays: 1,
    preview: "#8B5CF6",
    code: `//@version=5
indicator("Smart Money Concepts", overlay=true, max_bars_back=500, shorttitle="SMC")

showOB  = input.bool(true, "Show Order Blocks")
showFVG = input.bool(true, "Show Fair Value Gaps")
showBOS = input.bool(true, "Show BOS/CHoCH")

// ── Swing detection ─────────────────────────────────────
swingLen = input.int(5, "Swing Length")
swingH   = ta.highest(high, swingLen * 2 + 1)
swingL   = ta.lowest(low,   swingLen * 2 + 1)
isSwingH = high == swingH
isSwingL = low  == swingL

// ── Fair Value Gaps ─────────────────────────────────────
bullFVG = low > high[2]  and showFVG
bearFVG = high < low[2]  and showFVG

bgcolor(bullFVG ? color.new(#00D4AA, 90) : bearFVG ? color.new(#FF4D6A, 90) : na, title="FVG")

// ── Break of Structure ──────────────────────────────────
prevH = ta.highest(high, 20)[1]
prevL = ta.lowest(low,   20)[1]
bos_bull = ta.crossover(close, prevH) and showBOS
bos_bear = ta.crossunder(close, prevL) and showBOS

plotshape(bos_bull, "BOS Bullish", shape.labelup,   location.belowbar, #00D4AA, text="BOS", textcolor=color.white, size=size.tiny)
plotshape(bos_bear, "BOS Bearish", shape.labeldown, location.abovebar, #FF4D6A, text="BOS", textcolor=color.white, size=size.tiny)`,
  },
  {
    id: "wyckoff-phases",
    title: "Wyckoff Phase Detector",
    author: "FaithTrader",
    authorBadge: "💎",
    category: "Smart Money",
    description: "Identifies Wyckoff Accumulation and Distribution phases. Labels PS, SC, AR, ST, Spring, SOS, LPS, UTAD. Color-coded background for each phase.",
    tags: ["Wyckoff", "Accumulation", "Distribution", "Phases"],
    stars: 589, forks: 203, views: 11200, featured: false, verified: true,
    updatedDays: 8,
    preview: "#4FA3E0",
    code: `//@version=5
indicator("Wyckoff Phase Detector", overlay=true, shorttitle="Wyckoff")

length = input.int(50, "Phase Lookback")

highest = ta.highest(close, length)
lowest  = ta.lowest(close,  length)
range   = highest - lowest
mid     = lowest + range / 2

// Phase identification
accum = close < mid and ta.stdev(close, 20) < ta.stdev(close, 50) * 0.7
dist  = close > mid and ta.stdev(close, 20) < ta.stdev(close, 50) * 0.7

bgcolor(accum ? color.new(#00D4AA, 93) : dist ? color.new(#FF4D6A, 93) : na)

hline(highest, "Resistance", color.red,   linestyle=hline.style_dashed)
hline(lowest,  "Support",    color.green, linestyle=hline.style_dashed)
hline(mid,     "Midpoint",   color.gray,  linestyle=hline.style_dotted)`,
  },
  {
    id: "delta-divergence",
    title: "CVD Delta Divergence",
    author: "GodsPips",
    authorBadge: "🎯",
    category: "Order Flow",
    description: "Detects divergence between price action and Cumulative Volume Delta. Signals exhaustion moves before reversal. Plots divergence arrows and CVD histogram.",
    tags: ["CVD", "Delta", "Divergence", "Order Flow"],
    stars: 432, forks: 156, views: 7840, featured: false, verified: true,
    updatedDays: 12,
    preview: "#FF4D6A",
    code: `//@version=5
indicator("CVD Delta Divergence", overlay=false, shorttitle="CVD Div")

// ── CVD calculation ─────────────────────────────────────
bullVol  = volume * (close - low)  / (high - low + 0.001)
bearVol  = volume * (high - close) / (high - low + 0.001)
delta    = bullVol - bearVol

var float cvd = 0.0
cvd := cvd + delta

// ── Divergence detection ─────────────────────────────────
length = input.int(14, "Divergence Length")
pHigh  = ta.highest(close, length)
pLow   = ta.lowest(close,  length)
cHigh  = ta.highest(cvd,   length)
cLow   = ta.lowest(cvd,    length)

bullDiv = close == pLow  and cvd > cLow
bearDiv = close == pHigh and cvd < cHigh

plot(cvd,   "CVD",   color = cvd > 0 ? #00D4AA : #FF4D6A, style=plot.style_histogram, linewidth=2)
plotshape(bullDiv, "Bull Div", shape.arrowup,   location.bottom, #00D4AA, size=size.small)
plotshape(bearDiv, "Bear Div", shape.arrowdown, location.top,    #FF4D6A, size=size.small)`,
  },
  {
    id: "ttm-squeeze-pro",
    title: "TTM Squeeze Pro",
    author: "SpadeQuant",
    authorBadge: "⚡",
    category: "Momentum",
    description: "Enhanced TTM Squeeze with Momentum histogram, Squeeze dots (black/gray/red), and integrated Bollinger/Keltner compression signal. Color-gradient momentum bars.",
    tags: ["Squeeze", "Momentum", "TTM", "Volatility"],
    stars: 778, forks: 267, views: 16200, featured: true, verified: false,
    updatedDays: 4,
    preview: "#F0B429",
    code: `//@version=5
indicator("TTM Squeeze Pro", overlay=false, shorttitle="SQZ")

length  = input.int(20, "BB/KC Length")
bbMult  = input.float(2.0, "BB Mult")
kcMult  = input.float(1.5, "KC Mult")

// ── Bollinger Bands ──────────────────────────────────────
src    = close
basis  = ta.sma(src, length)
dev    = bbMult * ta.stdev(src, length)
upperBB = basis + dev
lowerBB = basis - dev

// ── Keltner Channel ──────────────────────────────────────
tr     = math.max(high - low, math.abs(high - close[1]), math.abs(low - close[1]))
atr    = ta.sma(tr, length)
upperKC = basis + kcMult * atr
lowerKC = basis - kcMult * atr

// ── Squeeze ──────────────────────────────────────────────
sqzOn  = lowerBB > lowerKC and upperBB < upperKC
sqzOff = lowerBB < lowerKC and upperBB > upperKC

// ── Momentum ──────────────────────────────────────────────
val = ta.linreg(src - math.avg(ta.highest(high, length), ta.lowest(low, length), ta.sma(close, length)), length, 0)

clr = val > 0 ? (val > val[1] ? #00D4AA : #007755) : (val < val[1] ? #FF4D6A : #882233)
plot(val, "Momentum", color=clr, style=plot.style_histogram, linewidth=3)
plot(0, "Zero", color=color.gray, linewidth=1)
plotshape(sqzOn,  "SQZ On",  shape.circle, location.bottom, color.black, size=size.tiny)
plotshape(sqzOff, "SQZ Off", shape.circle, location.bottom, color.gray,  size=size.tiny)`,
  },
  {
    id: "rsi-divergence-pro",
    title: "RSI Divergence Pro",
    author: "PipHunterX",
    authorBadge: "🔥",
    category: "Momentum",
    description: "RSI with automatic bullish and bearish divergence detection. Draws divergence lines on the RSI pane and on the chart. Hidden divergence detection included.",
    tags: ["RSI", "Divergence", "Hidden", "Momentum"],
    stars: 541, forks: 189, views: 9100, featured: false, verified: true,
    updatedDays: 20,
    preview: "#8B5CF6",
    code: `//@version=5
indicator("RSI Divergence Pro", overlay=false, shorttitle="RSI Div")

rsiLen = input.int(14, "RSI Length")
src    = input.source(close, "Source")

rsi = ta.rsi(src, rsiLen)

overbought = input.float(70, "Overbought")
oversold   = input.float(30, "Oversold")

plot(rsi, "RSI", color=#8B5CF6, linewidth=2)
hline(overbought, "OB", color=#FF4D6A, linestyle=hline.style_dashed)
hline(oversold,   "OS", color=#00D4AA, linestyle=hline.style_dashed)
hline(50,         "Mid", color=color.gray, linestyle=hline.style_dotted)

// Divergence (simplified)
length = input.int(5, "Pivot Length")
ph     = ta.pivothigh(rsi,   length, length)
pl     = ta.pivotlow(rsi,    length, length)

bullDiv = pl and low[length] < ta.lowest(low, length * 3)[1]
bearDiv = ph and high[length] > ta.highest(high, length * 3)[1]

plotshape(bullDiv, "Bull Div", shape.triangleup,   location.bottom, #00D4AA, size=size.small)
plotshape(bearDiv, "Bear Div", shape.triangledown, location.top,    #FF4D6A, size=size.small)`,
  },
  {
    id: "dark-pool-print",
    title: "Dark Pool Print Detector",
    author: "BlockFlow",
    authorBadge: "🏛️",
    category: "Order Flow",
    description: "Detects anomalous off-exchange volume prints. Highlights potential dark pool activity with volume-spike analysis. Marks prints on chart with size-scaled icons.",
    tags: ["Dark Pool", "Volume", "Institutional", "Off-Exchange"],
    stars: 394, forks: 128, views: 6200, featured: false, verified: false,
    updatedDays: 31,
    preview: "#4FA3E0",
    code: `//@version=5
indicator("Dark Pool Print Detector", overlay=true, shorttitle="DP")

threshold = input.float(2.5, "Volume Spike Threshold (x avg)")
length    = input.int(20, "Avg Volume Length")

avgVol   = ta.sma(volume, length)
isSpike  = volume > avgVol * threshold

spikeUp  = isSpike and close > open
spikeDn  = isSpike and close < open

plotshape(spikeUp, "DP Buy",  shape.circle, location.belowbar, color.new(#00D4AA, 20), size=size.small)
plotshape(spikeDn, "DP Sell", shape.circle, location.abovebar, color.new(#FF4D6A, 20), size=size.small)

bgcolor(isSpike ? color.new(#4FA3E0, 95) : na, title="Spike BG")`,
  },
];

/* ── Category colors ────────────────────────────────────── */
const CAT_COLORS: Record<string, string> = {
  "Smart Money": "#8B5CF6",
  "Order Flow":  "#FF4D6A",
  "Trend":       "#00D4AA",
  "Momentum":    "#F0B429",
  "Volume":      "#4FA3E0",
  "Oscillator":  "#E8EDF3",
  "Strategy":    "#F97316",
};

const CATS = ["All", "Featured", "Smart Money", "Order Flow", "Trend", "Momentum", "Volume", "Oscillator", "Strategy"];
const SORTS = ["Most Stars", "Most Forks", "Most Viewed", "Newest"];

/* ── Script card component ──────────────────────────────── */
function ScriptCard({
  script, onImport, onFork, onPreview,
}: {
  script:    CommunityScript;
  onImport:  (s: CommunityScript) => void;
  onFork:    (s: CommunityScript) => void;
  onPreview: (s: CommunityScript) => void;
}) {
  const [starred, setStarred] = useState(false);

  return (
    <div className="glass rounded-xl p-4 hover:border-wm-border/80 transition-all group flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${script.preview}20`, border: `1px solid ${script.preview}40` }}
        >
          <BarChart2 size={18} style={{ color: script.preview }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-xs font-bold text-wm-text truncate">{script.title}</h3>
            {script.verified && (
              <span title="Verified" className="text-wm-blue">
                <Award size={11} />
              </span>
            )}
            {script.featured && (
              <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-wm-gold/15 text-wm-gold border border-wm-gold/30">
                FEATURED
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-wm-text-muted">{script.authorBadge} {script.author}</span>
            <span className="text-[9px] text-wm-text-dim">· {script.updatedDays === 0 ? "Today" : `${script.updatedDays}d ago`}</span>
          </div>
        </div>
        <span
          className="px-1.5 py-0.5 rounded text-[9px] font-semibold shrink-0"
          style={{ color: CAT_COLORS[script.category] ?? "#E8EDF3", background: `${CAT_COLORS[script.category] ?? "#E8EDF3"}15` }}
        >
          {script.category}
        </span>
      </div>

      {/* Description */}
      <p className="text-[11px] text-wm-text-muted leading-relaxed line-clamp-2">{script.description}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        {script.tags.slice(0, 4).map(t => (
          <span key={t} className="px-1.5 py-0.5 rounded bg-wm-surface border border-wm-border text-[9px] text-wm-text-dim">
            #{t}
          </span>
        ))}
      </div>

      {/* Stats + actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-wm-border/50">
        <button
          onClick={() => setStarred(s => !s)}
          className={clsx("flex items-center gap-1 text-[10px] transition-colors", starred ? "text-wm-gold" : "text-wm-text-dim hover:text-wm-gold")}
        >
          <Star size={11} className={starred ? "fill-wm-gold" : ""} />
          {script.stars + (starred ? 1 : 0)}
        </button>
        <span className="flex items-center gap-1 text-[10px] text-wm-text-dim">
          <GitFork size={10} /> {script.forks}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-wm-text-dim">
          <Eye size={10} /> {script.views.toLocaleString()}
        </span>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => onPreview(script)}
            className="px-2 py-1 rounded bg-wm-surface border border-wm-border text-[10px] text-wm-text-muted hover:text-wm-text transition-colors"
          >
            Preview
          </button>
          <button
            onClick={() => onFork(script)}
            className="px-2 py-1 rounded bg-wm-surface border border-wm-border text-[10px] text-wm-text-muted hover:text-wm-text transition-colors"
          >
            <GitFork size={10} />
          </button>
          <button
            onClick={() => onImport(script)}
            className="px-2 py-1 rounded text-[10px] font-semibold transition-all"
            style={{
              background: `${script.preview}20`,
              color:       script.preview,
              border:      `1px solid ${script.preview}40`,
            }}
          >
            Add to Chart
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Code preview modal ─────────────────────────────────── */
function CodePreviewModal({ script, onClose, onImport }: {
  script:   CommunityScript;
  onClose:  () => void;
  onImport: (s: CommunityScript) => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(script.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-2xl bg-wm-card border border-wm-border rounded-2xl shadow-2xl overflow-hidden"
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-wm-border">
          <div>
            <h3 className="text-sm font-bold text-wm-text">{script.title}</h3>
            <p className="text-[10px] text-wm-text-muted">{script.authorBadge} {script.author} · {script.category}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={copy} className="flex items-center gap-1 px-2 py-1 rounded bg-wm-surface border border-wm-border text-[10px] text-wm-text-muted hover:text-wm-text transition-colors">
              {copied ? <Check size={10} className="text-wm-green" /> : <Copy size={10} />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={() => { onImport(script); onClose(); }}
              className="flex items-center gap-1 px-3 py-1 rounded text-[10px] font-bold bg-wm-green/20 text-wm-green border border-wm-green/40 hover:bg-wm-green/30 transition-all"
            >
              <Download size={10} /> Add to Chart
            </button>
            <button onClick={onClose} className="text-wm-text-dim hover:text-wm-text">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Code */}
        <div className="overflow-auto" style={{ maxHeight: 420 }}>
          <pre className="p-4 text-[11px] font-mono text-wm-text leading-relaxed whitespace-pre">
            <code>{script.code}</code>
          </pre>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Main component ─────────────────────────────────────── */
interface Props {
  onClose:   () => void;
  onImport:  (code: string, title: string) => void;
}

export function PineCommunityLibrary({ onClose, onImport }: Props) {
  const [search,    setSearch]    = useState("");
  const [cat,       setCat]       = useState("All");
  const [sort,      setSort]      = useState("Most Stars");
  const [preview,   setPreview]   = useState<CommunityScript | null>(null);

  const filtered = useMemo(() => {
    let items = [...COMMUNITY_SCRIPTS];

    if (cat === "Featured") items = items.filter(s => s.featured);
    else if (cat !== "All") items = items.filter(s => s.category === cat);

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q)) ||
        s.author.toLowerCase().includes(q)
      );
    }

    if (sort === "Most Stars")  items.sort((a, b) => b.stars  - a.stars);
    if (sort === "Most Forks")  items.sort((a, b) => b.forks  - a.forks);
    if (sort === "Most Viewed") items.sort((a, b) => b.views  - a.views);
    if (sort === "Newest")      items.sort((a, b) => a.updatedDays - b.updatedDays);

    return items;
  }, [search, cat, sort]);

  const handleImport = (script: CommunityScript) => {
    onImport(script.code, script.title);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        className="relative w-full max-w-4xl bg-wm-card border border-wm-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ height: "85vh" }}
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
      >
        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-wm-border bg-wm-dark shrink-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #4FA3E0)" }}
          >
            <BookOpen size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-black text-wm-text">Pine Script Community Library</h2>
            <p className="text-[10px] text-wm-text-muted">{COMMUNITY_SCRIPTS.length} verified indicators · Browse, fork, add to chart</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Stats */}
            <div className="hidden sm:flex items-center gap-3 mr-2">
              <span className="flex items-center gap-1 text-[10px] text-wm-gold"><Flame size={11} /> {COMMUNITY_SCRIPTS.reduce((s, i) => s + i.stars, 0).toLocaleString()} Stars</span>
              <span className="flex items-center gap-1 text-[10px] text-wm-text-muted"><GitFork size={11} /> {COMMUNITY_SCRIPTS.reduce((s, i) => s + i.forks, 0).toLocaleString()} Forks</span>
            </div>
            <button onClick={onClose} className="text-wm-text-dim hover:text-wm-text">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Search + filters ───────────────────────────── */}
        <div className="px-4 py-2.5 border-b border-wm-border bg-wm-dark shrink-0 space-y-2">
          {/* Search bar */}
          <div className="flex items-center gap-2 bg-wm-surface border border-wm-border rounded-lg px-3 py-2 focus-within:border-wm-blue/50 transition-colors">
            <Search size={13} className="text-wm-text-dim shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search scripts, authors, tags..."
              className="flex-1 bg-transparent text-xs text-wm-text outline-none placeholder-wm-text-dim"
              autoFocus
            />
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="bg-transparent text-[10px] text-wm-text-muted outline-none border-l border-wm-border pl-2 ml-1"
            >
              {SORTS.map(s => <option key={s} value={s} className="bg-wm-card">{s}</option>)}
            </select>
          </div>

          {/* Category chips */}
          <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {CATS.map(c => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={clsx(
                  "px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all border shrink-0",
                  cat === c
                    ? "text-white border-transparent"
                    : "bg-wm-surface border-wm-border text-wm-text-muted hover:text-wm-text"
                )}
                style={cat === c ? { background: CAT_COLORS[c] ?? "#4FA3E0", borderColor: "transparent" } : {}}
              >
                {c === "Featured" ? "⭐ Featured" : c}
              </button>
            ))}
          </div>
        </div>

        {/* ── Script grid ────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <Search size={32} className="text-wm-text-dim mb-3" />
              <p className="text-sm text-wm-text-muted">No scripts match "{search}"</p>
              <button onClick={() => setSearch("")} className="mt-2 text-xs text-wm-blue hover:underline">Clear search</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <AnimatePresence>
                {filtered.map((script, i) => (
                  <motion.div
                    key={script.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <ScriptCard
                      script={script}
                      onImport={handleImport}
                      onFork={(s) => {
                        // Open in editor (parent handles this)
                        onImport(s.code, `Fork of ${s.title}`);
                      }}
                      onPreview={setPreview}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────── */}
        <div className="px-4 py-2.5 border-t border-wm-border bg-wm-dark shrink-0 flex items-center justify-between">
          <span className="text-[10px] text-wm-text-dim">
            {filtered.length} of {COMMUNITY_SCRIPTS.length} scripts · Community-built & reviewed
          </span>
          <button
            className="flex items-center gap-1 text-[10px] text-wm-blue hover:text-wm-text transition-colors"
            onClick={onClose}
          >
            <Share2 size={10} /> Share your own script →
          </button>
        </div>
      </motion.div>

      {/* Code preview modal */}
      <AnimatePresence>
        {preview && (
          <CodePreviewModal
            script={preview}
            onClose={() => setPreview(null)}
            onImport={handleImport}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
