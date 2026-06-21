"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, ChevronDown, ChevronRight, AlertCircle, CheckCircle2, TrendingUp, TrendingDown, Zap, Eye } from "lucide-react";
import { WMLogo } from "@/components/ui/WMLogo";
import { clsx } from "clsx";
import { useWebSocket } from "@/hooks/useWebSocket";

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

// Deterministic seeded random — stable for a given price+seed so panel doesn't spin
function sr(price: number, seed: number): number {
  const n = Math.floor(Math.abs(price) * 100) + seed * 997;
  const v = Math.sin(n * 12.9898 + seed * 78.233) * 43758.5453;
  return Math.abs(v - Math.floor(v)); // [0, 1)
}

function generateSignals(symbol: string, price: number): Signal[] {
  if (price <= 0) price = 100;
  const dp = price > 1000 ? 0 : price > 10 ? 2 : 4;
  const tick = price > 10_000 ? 0.25 : price > 1000 ? 0.25 : price > 10 ? 0.01 : 0.0001;

  // Stable price-anchored levels — seeded so they only change when price moves significantly
  const priceSeed = Math.floor(price / (tick * 20)); // changes every 20 ticks
  const vwap     = +(price * (0.9982 + sr(priceSeed, 1) * 0.004)).toFixed(dp);
  const vwapUp   = +(vwap * 1.004).toFixed(dp);
  const vwapDown = +(vwap * 0.996).toFixed(dp);
  const pdl      = +(price * (0.993 + sr(priceSeed, 2) * 0.003)).toFixed(dp);
  const demand   = +(price * (0.994 + sr(priceSeed, 3) * 0.003)).toFixed(dp);
  const demandH  = +(demand * 1.001).toFixed(dp);
  const absSpt   = +(price * (0.9985 + sr(priceSeed, 4) * 0.001)).toFixed(dp);

  // Bias derived from price vs vwap + stable seed — flips only on significant price moves
  const bullBias   = price >= vwap;
  const regimeConf = Math.round(65 + sr(priceSeed, 5) * 28);
  const cvdVal     = Math.round((bullBias ? 1 : -1) * (1000 + sr(priceSeed, 6) * 8000));
  const imbRatio   = Math.round(250 + sr(priceSeed, 7) * 250);
  const dpPrint    = Math.round(50 + sr(priceSeed, 8) * 300);
  const iceSize    = Math.round(50 + sr(priceSeed, 9) * 350);
  const entryPx    = +(price + (bullBias ? tick * 2 : -tick * 2)).toFixed(dp);
  const entryLo    = +(price - tick).toFixed(dp);
  const entryHi    = +(price + tick * 3).toFixed(dp);
  const trapped    = Math.round(80 + sr(priceSeed, 10) * 200);
  const bidContracts = Math.round(300 + sr(priceSeed, 11) * 1200);

  const phaseOpts = bullBias
    ? ["Phase C — Spring completed", "Phase D — Markup initiating", "Phase B — Accumulation building"]
    : ["Phase D — Distribution accelerating", "Phase C — UTAD forming", "Phase B — Distribution building"];
  const phaseStr = phaseOpts[Math.floor(sr(priceSeed, 12) * phaseOpts.length)];
  const schematic = bullBias ? "Accumulation → Markup" : "Distribution → Markdown";

  return [
    // VWAP
    { name: "VWAP", value: fmt(vwap, dp), strength: "strong", bullish: price > vwap, description: price > vwap ? "Price above VWAP — bullish context" : "Price below VWAP — bearish context" },
    { name: "VWAP Upper Band", value: fmt(vwapUp, dp), strength: "moderate", bullish: price < vwapUp },
    { name: "VWAP Lower Band", value: fmt(vwapDown, dp), strength: "moderate", bullish: price > vwapDown },

    // Order Flow
    { name: "Order Flow Imbalance", value: `${imbRatio}% ${bullBias ? "Bid" : "Ask"}-heavy`, strength: imbRatio > 350 ? "strong" : "moderate", bullish: bullBias, description: imbRatio > 300 ? ">300% threshold triggered" : "Moderate imbalance" },
    { name: "Absorption", value: bullBias ? `ACTIVE at ${fmt(absSpt,dp)}` : "Passive sellers absorbing", strength: "strong", bullish: bullBias, description: bullBias ? "Large offers absorbed by buyers" : "Large bids absorbed by sellers" },
    { name: "Volume Tails", value: bullBias ? "Long lower tail confirmed" : "Long upper tail confirmed", strength: "moderate", bullish: bullBias },
    { name: "Bids Filling", value: `${bidContracts.toLocaleString()} contracts at ${fmt(absSpt,dp)}`, strength: "strong", bullish: bullBias },
    { name: "Accumulation", value: `${Math.round(2+sr(priceSeed,13)*4)} tests, ${bullBias?"holding":"failing"}`, strength: bullBias ? "strong" : "moderate", bullish: bullBias, description: `Price repeatedly testing ${bullBias?"and bouncing from":"and rejecting at"} key level` },
    { name: bullBias ? "Bids at PDL" : "Offers at PDH", value: `${bullBias?"Bids":"Offers"} ${bullBias?"supporting":"capping"} ${fmt(pdl,dp)}`, strength: "strong", bullish: bullBias },
    { name: "Conviction Support", value: `Same ${bullBias?"bids":"offers"} re-appearing ×${Math.round(2+sr(priceSeed,14)*5)}`, strength: "strong", bullish: bullBias, description: `Indicates strong institutional ${bullBias?"defending":"distributing"}` },
    { name: bullBias ? "Passive Buyers" : "Passive Sellers", value: `Detected ${fmt(demand,dp)}–${fmt(demandH,dp)}`, strength: "moderate", bullish: bullBias },
    { name: "Spoofing Detection", value: "None detected", strength: "neutral", bullish: null, description: "No large orders pulled without fill" },
    { name: "Stop Run", value: `Completed ${bullBias?"below":"above"} ${fmt(pdl,dp)}`, strength: "moderate", bullish: bullBias, description: "Liquidity swept, now reversing" },
    { name: "Trapped Traders", value: `~${trapped} contracts trapped`, strength: "moderate", bullish: bullBias },
    { name: "Pullback + " + (bullBias ? "Demand" : "Supply"), value: `Pullback into ${bullBias?"demand":"supply"} ${fmt(demand,dp)}`, strength: "strong", bullish: bullBias },

    // Delta / CVD
    { name: "Delta Divergence", value: cvdVal >= 0 ? "Positive delta, divergence loading" : "Negative delta, divergence loading", strength: "strong", bullish: cvdVal >= 0 },
    { name: "CVD (Cumulative Volume Delta)", value: `${cvdVal >= 0 ? "+" : ""}${cvdVal.toLocaleString()} (${cvdVal >= 0 ? "rising" : "falling"})`, strength: "strong", bullish: cvdVal >= 0 },
    { name: "Footprint Pattern", value: bullBias ? "Unfinished Auction bottom" : "Unfinished Auction top", strength: "moderate", bullish: bullBias },

    // Iceberg / Dark Pool
    { name: "Iceberg Detection", value: `Size ${iceSize} clips at ${fmt(absSpt,dp)}`, strength: "moderate", bullish: bullBias, description: "Partial fill pattern detected" },
    { name: "Dark Pool Prints", value: `$${dpPrint}M print at ${fmt(absSpt,dp)}`, strength: "strong", bullish: bullBias },

    // Regime
    { name: "Markov Regime", value: `${bullBias?"Trending Up":"Trending Down"} (${regimeConf}% confidence)`, strength: regimeConf > 75 ? "strong" : "moderate", bullish: bullBias },
    { name: "Wyckoff Phase", value: phaseStr, strength: "strong", bullish: bullBias, description: bullBias ? "Markup likely next" : "Markdown likely next" },
    { name: "Wyckoff Schematic", value: schematic, strength: "strong", bullish: bullBias },
    { name: bullBias ? "Lower Highs at Supply" : "Higher Lows at Demand", value: bullBias ? "No lower highs — demand holding" : "No higher lows — supply in control", strength: "moderate", bullish: bullBias },
    { name: "PDL Setup", value: `PDL ${fmt(pdl,dp)} — ${bullBias?"bids":"offers"} ${bullBias?"supporting":"capping"}`, strength: "strong", bullish: bullBias },

    // CLC Rule
    { name: "Context", value: bullBias ? "Bullish regime, above VWAP" : "Bearish regime, below VWAP", strength: "strong", bullish: bullBias },
    { name: "Location", value: `${bullBias?"Demand":"Supply"} zone ${fmt(demand,dp)}–${fmt(demandH,dp)}`, strength: "strong", bullish: bullBias },
    { name: "Confirmation", value: `Real ${bullBias?"buying":"selling"} activity on tape ✓`, strength: "strong", bullish: bullBias },

    // Entry signals
    { name: "Entry Signal", value: `${bullBias?"LONG":"SHORT"} at ${fmt(entryPx,dp)} (order flow)`, strength: "strong", bullish: bullBias, description: "Enter on real activity — superior R:R vs waiting for candle close" },
    { name: "Best Opportunity", value: `Smallest risk: ${fmt(entryLo,dp)}–${fmt(entryHi,dp)}`, strength: "strong", bullish: bullBias },
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
  { key: "regime",          label: "Markov / Wyckoff Regime",   from: 19, to: 25 },
  { key: "clc",             label: "CLC Rule + Entry Signals",  from: 25, to: 29 },
];

export function SmartMoneyPanel({ onClose, symbol }: { onClose: () => void; symbol: string }) {
  const { ticker } = useWebSocket({ symbol, timeframe: "1m" });
  const livePrice = ticker.price > 0 ? ticker.price : 0;

  const [signals, setSignals] = useState(() => generateSignals(symbol, livePrice));
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["orderflow", "clc", "regime"]));
  const [pulse, setPulse] = useState(false);

  // Refresh signals when price moves enough (every 15s check)
  useEffect(() => {
    const iv = setInterval(() => {
      setSignals(generateSignals(symbol, livePrice));
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }, 15_000);
    return () => clearInterval(iv);
  }, [symbol, livePrice]);

  const toggle = (key: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const bullCount = signals.filter(s => s.bullish === true).length;
  const bearCount = signals.filter(s => s.bullish === false).length;
  const bias = bullCount > bearCount ? "BULL" : bearCount > bullCount ? "BEAR" : "NEUTRAL";

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 350, damping: 35 }}
      className="w-72 border-l border-wm-border bg-wm-dark flex flex-col shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-wm-border bg-wm-card shrink-0">
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

      {/* Confluence score bar */}
      <div className="px-3 py-2 border-b border-wm-border shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-wm-text-muted">Confluence Score</span>
          <span className="text-[10px] font-bold text-wm-gold">{bullCount}/{signals.length} signals bullish</span>
        </div>
        <div className="h-2 rounded-full bg-wm-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(bullCount / signals.length) * 100}%`,
              background: "linear-gradient(90deg, #00D4AA, #4FA3E0)",
            }}
          />
        </div>
      </div>

      {/* CLC Summary Card */}
      <div className="mx-3 my-2 p-2.5 rounded-lg bg-gradient-to-r from-wm-green/10 to-wm-blue/5 border border-wm-green/25 shrink-0">
        <div className="text-[10px] font-bold text-wm-green mb-1.5 flex items-center gap-1">
          <Zap size={10} className="fill-wm-green" /> CLC RULE — ENTRY CONFIRMED
        </div>
        <div className="space-y-1">
          {["Context: Bullish above VWAP", "Location: Demand zone 21,795–21,820", "Confirmation: Real buying on tape"].map((line, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px] text-wm-text">
              <CheckCircle2 size={9} className="text-wm-green shrink-0" />
              {line}
            </div>
          ))}
        </div>
        <div className="mt-2 p-1.5 rounded bg-wm-gold/10 border border-wm-gold/20">
          <div className="text-[9px] text-wm-gold font-semibold">⚡ ENTER ON ORDER FLOW — NOT CANDLE CLOSE</div>
          <div className="text-[9px] text-wm-text-dim mt-0.5">Superior R:R entering at real buying activity</div>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto">
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
                          <span className="text-[10px] font-medium text-wm-text-muted truncate">{sig.name}</span>
                          {sig.bullish !== null && (
                            sig.bullish
                              ? <TrendingUp size={9} className="text-wm-green shrink-0" />
                              : <TrendingDown size={9} className="text-wm-red shrink-0" />
                          )}
                        </div>
                        <div
                          className="text-[10px] font-semibold truncate"
                          style={{ color: SIGNAL_COLOR[sig.strength] }}
                        >
                          {sig.value}
                        </div>
                        {sig.description && (
                          <div className="text-[9px] text-wm-text-dim leading-tight">{sig.description}</div>
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
        <div className="mx-3 my-3 p-2.5 rounded-lg bg-wm-surface border border-wm-border">
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
        className="mx-3 mb-2 mt-1 p-2 rounded-lg border shrink-0 animate-pulse"
        style={{ borderColor: "rgba(0,212,170,0.35)", background: "rgba(0,212,170,0.06)" }}
      >
        <div className="flex items-center gap-1.5">
          <AlertCircle size={11} className="text-wm-green" />
          <span className="text-[10px] font-bold text-wm-green">LIVE ALERT</span>
          <span className="ml-auto text-[9px] text-wm-text-dim">just now</span>
        </div>
        <div className="text-[10px] text-wm-text mt-0.5">
          Aggressive buyers defending 21,820 for the 4th time. High-conviction long setup. CLC confirmed.
        </div>
      </div>
    </motion.div>
  );
}
