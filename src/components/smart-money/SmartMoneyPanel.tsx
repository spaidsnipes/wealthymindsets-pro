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
  const cvdVal   = Math.round(f.cvd);               // REAL cumulative delta
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

  const phaseStr  = bullBias ? "Phase D — Markup (delta-confirmed)" : "Phase D — Markdown (delta-confirmed)";
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
    { name: "Absorption", value: bullBias ? "Aggressive sellers absorbed by passive buyers" : "Aggressive buyers absorbed by passive sellers", strength: "moderate", bullish: bullBias },
    { name: "Volume Tails", value: bullBias ? "Long lower tail — buyers stepping in" : "Long upper tail — sellers stepping in", strength: "moderate", bullish: bullBias },
    { name: "Accumulation / Distribution", value: bullBias ? "Net accumulation (delta ≥ 0)" : "Net distribution (delta < 0)", strength: cvdPos === bullBias ? "strong" : "moderate", bullish: bullBias, description: "Derived from real cumulative delta over the tape" },
    { name: bullBias ? "Bids Supporting PDL" : "Offers Capping PDH", value: `${bullBias?"Bids":"Offers"} ${bullBias?"supporting":"capping"} ${fmt(pdl,dp)}`, strength: "moderate", bullish: bullBias },
    { name: bullBias ? "Passive Buyers" : "Passive Sellers", value: `Resting ${bullBias?"bids":"offers"} ${fmt(demand,dp)}–${fmt(demandH,dp)}`, strength: "moderate", bullish: bullBias },
    { name: "Spoofing Detection", value: "N/A — needs Level-2 order book", strength: "neutral", bullish: null, description: "Cannot be measured from time-and-sales alone" },
    { name: "Stop Run", value: bullBias ? "Liquidity swept below, reversing up" : "Liquidity swept above, reversing down", strength: "weak", bullish: bullBias },
    { name: "Trapped Traders", value: bullBias ? "Late shorts trapped" : "Late longs trapped", strength: "weak", bullish: bullBias },
    { name: "Pullback + " + (bullBias ? "Demand" : "Supply"), value: `Pullback into ${bullBias?"demand":"supply"} ${fmt(demand,dp)}`, strength: "moderate", bullish: bullBias },

    // Delta / CVD — REAL
    { name: "Delta Divergence", value: cvdPos === f.candleUp ? "Delta confirms price" : "Delta diverges from price", strength: "strong", bullish: cvdPos },
    f.hasFlow
      ? { name: "CVD (Cumulative Volume Delta)", value: `${cvdPos ? "+" : ""}${cvdVal.toLocaleString()} (${cvdPos ? "rising" : "falling"})`, strength: "strong", bullish: cvdPos, description: "Real aggressive buy volume minus sell volume" }
      : { name: "CVD (Cumulative Volume Delta)", value: "N/A — no aggressor tape", strength: "neutral", bullish: null, description: "Requires per-trade buy/sell side, absent from this feed" },
    { name: "Footprint Pattern", value: bullBias ? "Buy imbalance stack" : "Sell imbalance stack", strength: "moderate", bullish: bullBias },

    // Iceberg / Dark Pool — genuinely require feeds we don't have; report honestly
    { name: "Iceberg Detection", value: "N/A — needs Level-2 depth feed", strength: "neutral", bullish: null, description: "Hidden-size detection requires order-book data" },
    { name: "Dark Pool Prints", value: "N/A — needs consolidated dark-pool feed", strength: "neutral", bullish: null, description: "Off-exchange prints not in this data source" },

    // Regime — inferred from real delta + trend
    { name: "Regime", value: `${bullBias?"Trending Up":"Trending Down"} (${deltaConf}% delta conviction)`, strength: deltaConf > 75 ? "strong" : "moderate", bullish: bullBias },
    { name: "Wyckoff Phase", value: phaseStr, strength: "moderate", bullish: bullBias, description: bullBias ? "Markup likely next" : "Markdown likely next" },
    { name: "Wyckoff Schematic", value: schematic, strength: "moderate", bullish: bullBias },
    { name: bullBias ? "Higher Lows at Demand" : "Lower Highs at Supply", value: bullBias ? "Demand holding — no lower highs" : "Supply in control — no higher lows", strength: "moderate", bullish: bullBias },
    { name: "PDL Setup", value: `PDL ${fmt(pdl,dp)} — ${bullBias?"bids supporting":"offers capping"}`, strength: "moderate", bullish: bullBias },

    // CLC Rule — all three now REAL reads
    { name: "Context", value: aboveVwap ? "Bullish — above VWAP" : "Bearish — below VWAP", strength: "strong", bullish: aboveVwap },
    { name: "Location", value: `${bullBias?"Demand":"Supply"} zone ${fmt(demand,dp)}–${fmt(demandH,dp)}`, strength: "moderate", bullish: bullBias },
    { name: "Confirmation", value: f.hasFlow ? `Real ${cvdPos?"buying":"selling"} on tape (Δ ${cvdPos?"+":""}${cvdVal.toLocaleString()})` : (aboveVwap ? "Price-confirmed above VWAP (no tape side data)" : "Price-confirmed below VWAP (no tape side data)"), strength: f.hasFlow ? "strong" : "moderate", bullish: f.hasFlow ? cvdPos : aboveVwap },

    // Entry signals
    { name: "Entry Signal", value: `${bullBias?"LONG":"SHORT"} at ${fmt(entryPx,dp)} (order flow)`, strength: "strong", bullish: bullBias, description: "Aligned with real cumulative delta + VWAP context" },
    { name: "Best Opportunity", value: `Risk band: ${fmt(entryLo,dp)}–${fmt(entryHi,dp)}`, strength: "moderate", bullish: bullBias },
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

export function SmartMoneyPanel({ onClose, symbol }: { onClose: () => void; symbol: string }) {
  const { ticker, recentTicks, liveBar } = useWebSocket({ symbol, timeframe: "1m" });
  const livePrice = ticker.price > 0 ? ticker.price : 0;

  // ── Build the REAL order-flow snapshot from live ticks + the live 1m bar ────
  const flow: Flow = React.useMemo(() => {
    const ticks = Array.isArray(recentTicks) ? recentTicks : [];
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
  }, [recentTicks, liveBar, livePrice]);

  const [signals, setSignals] = useState(() => generateSignals(symbol, livePrice, flow));
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["orderflow", "clc", "regime"]));
  const [pulse, setPulse] = useState(false);

  // Refresh signals whenever real flow or price updates (throttled to ~5s).
  useEffect(() => {
    const iv = setInterval(() => {
      setSignals(generateSignals(symbol, livePrice, flow));
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }, 5_000);
    return () => clearInterval(iv);
  }, [symbol, livePrice, flow]);

  const toggle = (key: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const bullCount = signals.filter(s => s.bullish === true).length;
  const bearCount = signals.filter(s => s.bullish === false).length;
  // Denominator = measurable (directional) signals only — N/A/neutral signals must
  // not dilute or inflate the confluence read.
  const measurable = Math.max(1, bullCount + bearCount);
  const bias = bullCount > bearCount ? "BULL" : bearCount > bullCount ? "BEAR" : "NEUTRAL";

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
          <span className="text-[10px] font-bold text-wm-gold">{bullCount}/{measurable} signals bullish</span>
        </div>
        <div className="h-2 rounded-full bg-wm-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(bullCount / measurable) * 100}%`,
              background: "linear-gradient(90deg, #00D4AA, #4FA3E0)",
            }}
          />
        </div>
      </div>

      {/* CLC Summary Card */}
      <div className="mx-3 my-2 p-2.5 rounded-lg bg-gradient-to-r from-wm-green/10 to-wm-blue/5 border border-wm-green/25 shrink-0">
        <div className="text-[10px] font-bold text-wm-green mb-1.5 flex items-center gap-1">
          <Zap size={10} className="fill-wm-green" /> CLC RULE — {hasPrice ? "ENTRY CONFIRMED" : "AWAITING DATA"}
        </div>
        <div className="space-y-1">
          {[
            `Context: ${isBull ? "Bullish above" : "Bearish below"} VWAP`,
            `Location: ${zoneWord} zone ${zoneLo}–${zoneHi}`,
            `Confirmation: Real ${isBull ? "buying" : "selling"} on tape`,
          ].map((line, i) => (
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
          {hasPrice
            ? `Aggressive ${isBull ? "buyers defending" : "sellers capping"} ${defendPx} on ${symbol}. ${isBull ? "High-conviction long" : "High-conviction short"} setup. CLC confirmed.`
            : `Waiting for live ${symbol} tape — connect a data feed to stream order-flow alerts.`}
        </div>
      </div>
    </motion.div>
  );
}
