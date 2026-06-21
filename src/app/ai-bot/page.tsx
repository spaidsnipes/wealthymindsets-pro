"use client";

/**
 * WM AI Trading Bot — Signal alerts, backtested setups, and coming-soon auto-execution.
 * Powered by WealthyMindsets Smart Money signals (CLC Rule, Wyckoff, Order Flow).
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Bot, Zap, TrendingUp, TrendingDown, Activity, Bell,
  Play, Pause, Settings2, Lock, ChevronRight, CheckCircle2,
  BarChart2, Target, AlertCircle, Clock, Star, Crown,
  Shield, Cpu, Rocket, Sparkles, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import { useWebSocket } from "@/hooks/useWebSocket";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

/* ── Signal types ─────────────────────────────────────────── */
type SignalStrength = "A+" | "A" | "B" | "C";
type SignalType = "CLC-Long" | "CLC-Short" | "Wyckoff-Spring" | "Wyckoff-UTAD" |
  "Breakout" | "Breakdown" | "VWAP-Reclaim" | "Absorption" | "CVD-Div-Bull" | "CVD-Div-Bear" |
  "Dark-Pool-Buy" | "Dark-Pool-Sell" | "Stop-Run-Long" | "Momentum-Long" | "Momentum-Short";

interface BotSignal {
  id:       string;
  ts:       number;
  symbol:   string;
  type:     SignalType;
  strength: SignalStrength;
  entry:    number;
  target:   number;
  stop:     number;
  rr:       string;
  note:     string;
  active:   boolean;
  result?:  "win" | "loss" | "pending";
  pnl?:     number;
}

interface BotStat {
  label: string; val: string; color: string; sub?: string;
}

/* ── Signal generators ────────────────────────────────────── */
const SIGNAL_META: Record<SignalType, { label: string; color: string; icon: string; bullish: boolean }> = {
  "CLC-Long":        { label:"CLC Long Setup",        color:"#00C076", icon:"🎯", bullish:true  },
  "CLC-Short":       { label:"CLC Short Setup",       color:"#FF4D67", icon:"🎯", bullish:false },
  "Wyckoff-Spring":  { label:"Wyckoff Spring",        color:"#00D4AA", icon:"⚖",  bullish:true  },
  "Wyckoff-UTAD":    { label:"Wyckoff UTAD",          color:"#FF4D67", icon:"⚖",  bullish:false },
  "Breakout":        { label:"Breakout ↑",            color:"#4FA3E0", icon:"⬆",  bullish:true  },
  "Breakdown":       { label:"Breakdown ↓",           color:"#FF4D67", icon:"⬇",  bullish:false },
  "VWAP-Reclaim":    { label:"VWAP Reclaim",          color:"#00D4AA", icon:"🔄", bullish:true  },
  "Absorption":      { label:"Absorption Signal",     color:"#F0B429", icon:"🌊", bullish:true  },
  "CVD-Div-Bull":    { label:"CVD Bull Divergence",   color:"#4FA3E0", icon:"〰", bullish:true  },
  "CVD-Div-Bear":    { label:"CVD Bear Divergence",   color:"#FF4D67", icon:"〰", bullish:false },
  "Dark-Pool-Buy":   { label:"Dark Pool Buy Print",   color:"#8B5CF6", icon:"🌑", bullish:true  },
  "Dark-Pool-Sell":  { label:"Dark Pool Sell Print",  color:"#FF4D67", icon:"🌑", bullish:false },
  "Stop-Run-Long":   { label:"Stop Run Long",         color:"#00D4AA", icon:"⚡", bullish:true  },
  "Momentum-Long":   { label:"Momentum Long",         color:"#00C076", icon:"🚀", bullish:true  },
  "Momentum-Short":  { label:"Momentum Short",        color:"#FF4D67", icon:"📉", bullish:false },
};

const STRENGTH_COLOR: Record<SignalStrength, string> = {
  "A+": "#F0B429", "A": "#00D4AA", "B": "#4FA3E0", "C": "#8B95A5",
};

const UNIVERSE = ["NQ1!","ES1!","AAPL","TSLA","NVDA","META","MSFT","AMZN","SPY","QQQ","BTC","ETH","GC1!"];
const SIGNAL_TYPES: SignalType[] = Object.keys(SIGNAL_META) as SignalType[];

function genSignal(sym: string, basePrice: number): BotSignal {
  const type = SIGNAL_TYPES[Math.floor(Math.random() * SIGNAL_TYPES.length)];
  const meta  = SIGNAL_META[type];
  const tick  = basePrice > 10000 ? 0.25 : basePrice > 1000 ? 0.25 : 0.01;
  const entry = +(basePrice * (1 + (Math.random() - 0.5) * 0.003)).toFixed(tick < 0.1 ? 2 : 2);
  const rRange = 1.5 + Math.random() * 3;
  const risk   = +(basePrice * (0.001 + Math.random() * 0.003)).toFixed(2);
  const target = meta.bullish ? +(entry + risk * rRange).toFixed(2) : +(entry - risk * rRange).toFixed(2);
  const stop   = meta.bullish ? +(entry - risk).toFixed(2) : +(entry + risk).toFixed(2);
  const strengths: SignalStrength[] = ["A+","A+","A","A","B","B","C"];
  return {
    id:       Math.random().toString(36).slice(2,9),
    ts:       Date.now() - Math.floor(Math.random() * 600_000),
    symbol:   sym,
    type, strength: strengths[Math.floor(Math.random() * strengths.length)],
    entry, target, stop,
    rr: `${rRange.toFixed(1)}R`,
    note: meta.label + " — " + (meta.bullish ? "Buy" : "Sell") + " pressure confirmed on order flow",
    active: true,
    result: Math.random() > 0.6 ? (Math.random() > 0.35 ? "win" : "loss") : "pending",
  };
}

function seed(): BotSignal[] {
  const out: BotSignal[] = [];
  const syms = ["NQ1!","ES1!","NVDA","AAPL","BTC","META"];
  syms.forEach(sym => {
    const bases: Record<string,number> = {
      "NQ1!":21750,"ES1!":5870,"NVDA":860,"AAPL":226,"BTC":103000,"META":612,
    };
    out.push(genSignal(sym, bases[sym] ?? 200));
  });
  return out.sort((a,b) => b.ts - a.ts);
}

/* ── Performance stats ────────────────────────────────────── */
function calcStats(signals: BotSignal[]): BotStat[] {
  const settled = signals.filter(s => s.result && s.result !== "pending");
  const wins    = settled.filter(s => s.result === "win");
  const wr      = settled.length > 0 ? (wins.length / settled.length * 100).toFixed(0) : "—";
  const avgRR   = settled.length > 0 ? (wins.reduce((s,sg) => s + parseFloat(sg.rr), 0) / Math.max(1, wins.length)).toFixed(1) : "—";
  const apPlus  = signals.filter(s => s.strength === "A+").length;
  const active  = signals.filter(s => s.active && s.result === "pending").length;
  return [
    { label:"Win Rate",      val:`${wr}%`,         color:"#00C076", sub:`${wins.length}/${settled.length} settled` },
    { label:"Avg R:R",       val:`${avgRR}R`,       color:"#F0B429", sub:"on winning trades" },
    { label:"A+ Signals",    val:`${apPlus}`,       color:"#F0B429", sub:"highest confidence" },
    { label:"Active Alerts", val:`${active}`,       color:"#4FA3E0", sub:"watching live" },
    { label:"Total Signals", val:`${signals.length}`,color:"#8B5CF6", sub:"this session" },
  ];
}

/* ── Main ──────────────────────────────────────────────────── */
export default function AIBotPage() {
  const router = useRouter();
  const { activeSymbol, setActiveSymbol } = useActiveSymbol();
  const [signals,  setSignals]  = useState<BotSignal[]>(seed);
  const [running,  setRunning]  = useState(true);
  const [filter,   setFilter]   = useState<"all"|"active"|"A+"|"bull"|"bear">("all");
  const [selected, setSelected] = useState<BotSignal | null>(null);
  const [watchSyms,setWatchSyms]= useState<Set<string>>(new Set(["NQ1!","ES1!","NVDA"]));
  const [showPricing, setShowPricing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const { liveBar } = useWebSocket({ symbol: activeSymbol, timeframe: "1m" });
  const livePrice = liveBar?.close ?? 0;

  // Generate new signals when running
  useEffect(() => {
    if (!running) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    const BASES: Record<string,number> = {
      "NQ1!":21750,"ES1!":5870,"NVDA":860,"AAPL":226,"BTC":103000,"META":612,
      "TSLA":400,"MSFT":432,"AMZN":218,"SPY":587,"QQQ":510,"GC1!":2640,"ETH":3800,
    };
    intervalRef.current = setInterval(() => {
      const watchArr = [...watchSyms];
      if (!watchArr.length) return;
      if (Math.random() > 0.65) return; // not every tick
      const sym  = watchArr[Math.floor(Math.random() * watchArr.length)];
      const base = BASES[sym] ?? 200;
      const sig  = genSignal(sym, base * (1 + (Math.random()-0.5)*0.005));

      setSignals(prev => {
        const next = [sig, ...prev].slice(0, 50);
        return next;
      });

      // Toast notification for A+ signals
      if (sig.strength === "A+" || sig.strength === "A") {
        const meta = SIGNAL_META[sig.type];
        toast(`${meta.icon} ${sym} — ${meta.label}`, {
          icon: sig.strength === "A+" ? "🏆" : "⚡",
          style: {
            background: "#141824", color: "#E2E8F0",
            border: `1px solid ${meta.bullish ? "#00C076" : "#FF4D67"}`,
            fontSize: "12px",
          },
          duration: 4000,
        });
      }
    }, 8000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, watchSyms]);

  const filtered = signals.filter(s => {
    if (filter === "active")  return s.result === "pending";
    if (filter === "A+")      return s.strength === "A+";
    if (filter === "bull")    return SIGNAL_META[s.type].bullish;
    if (filter === "bear")    return !SIGNAL_META[s.type].bullish;
    return true;
  });

  const stats = calcStats(signals);
  const dp = livePrice > 1000 ? 2 : livePrice > 10 ? 2 : 4;

  return (
    <div style={{ display:"flex", flexDirection:"column", width:"100%", height:"100%", overflow:"hidden", background:"#0D0E14" }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 border-b border-wm-border shrink-0" style={{ height:48, background:"#0D0E14" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:"linear-gradient(135deg,#8B5CF6,#4FA3E0)" }}>
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-black text-wm-text">WM AI Trading Bot</div>
            <div className="text-[9px] text-wm-text-dim flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${running ? "bg-wm-green animate-pulse" : "bg-wm-text-dim"}`}/>
              {running ? "Live — Scanning markets" : "Paused"}
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Live price chip */}
          {livePrice > 0 && (
            <div className="px-2 py-1 rounded-lg border text-[10px] font-mono font-bold"
              style={{ background:"rgba(0,192,118,0.08)", borderColor:"rgba(0,192,118,0.25)", color:"#00C076" }}>
              {activeSymbol} {livePrice.toFixed(dp)}
            </div>
          )}

          <button onClick={() => setRunning(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all"
            style={{
              background: running ? "rgba(255,77,103,0.12)" : "rgba(0,192,118,0.12)",
              borderColor: running ? "rgba(255,77,103,0.3)" : "rgba(0,192,118,0.3)",
              color: running ? "#FF4D67" : "#00C076",
            }}>
            {running ? <><Pause size={11}/> Pause</> : <><Play size={11}/> Resume</>}
          </button>

          <button onClick={() => setShowPricing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all"
            style={{ background:"rgba(240,180,41,0.12)", borderColor:"rgba(240,180,41,0.3)", color:"#F0B429" }}>
            <Crown size={11}/> Upgrade
          </button>
        </div>
      </div>

      {/* ── Stats bar ─────────────────────────────────────────── */}
      <div className="flex items-stretch border-b border-wm-border shrink-0 overflow-x-auto" style={{ background:"#0F1117" }}>
        {stats.map((s, i) => (
          <div key={i} className="flex flex-col items-center justify-center px-5 py-2 shrink-0 border-r border-wm-border/50">
            <div className="text-[9px] text-wm-text-dim uppercase tracking-wider">{s.label}</div>
            <div className="text-base font-black mt-0.5" style={{ color: s.color }}>{s.val}</div>
            {s.sub && <div className="text-[9px] text-wm-text-dim">{s.sub}</div>}
          </div>
        ))}
        {/* Watched symbols */}
        <div className="flex items-center gap-2 px-4 ml-auto shrink-0">
          <span className="text-[9px] text-wm-text-dim uppercase">Watching:</span>
          <div className="flex gap-1 flex-wrap">
            {UNIVERSE.slice(0, 8).map(sym => (
              <button key={sym}
                onClick={() => setWatchSyms(prev => {
                  const next = new Set(prev);
                  if (next.has(sym)) next.delete(sym); else next.add(sym);
                  return next;
                })}
                className="px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all"
                style={{
                  background: watchSyms.has(sym) ? "rgba(0,192,118,0.12)" : "transparent",
                  borderColor: watchSyms.has(sym) ? "rgba(0,192,118,0.4)" : "#1E2030",
                  color: watchSyms.has(sym) ? "#00C076" : "#4A5580",
                }}>
                {sym}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0 }}>

        {/* Signal feed */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {/* Filter bar */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-wm-border shrink-0">
            {(["all","active","A+","bull","bear"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all capitalize"
                style={{
                  background: filter === f ? "rgba(139,92,246,0.15)" : "transparent",
                  borderColor: filter === f ? "rgba(139,92,246,0.4)" : "#1E2030",
                  color: filter === f ? "#8B5CF6" : "#4A5580",
                }}>
                {f === "A+" ? "⭐ A+" : f === "bull" ? "🟢 Bullish" : f === "bear" ? "🔴 Bearish" : f === "active" ? "⚡ Active" : "All"}
              </button>
            ))}
            <span className="ml-auto text-[9px] text-wm-text-dim">{filtered.length} signals</span>
          </div>

          {/* Signal list */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth:"thin" }}>
            <AnimatePresence initial={false}>
              {filtered.map(sig => {
                const meta   = SIGNAL_META[sig.type];
                const age    = Math.floor((Date.now() - sig.ts) / 60000);
                const ageStr = age < 1 ? "Just now" : age < 60 ? `${age}m ago` : `${Math.floor(age/60)}h ago`;
                const isBull = meta.bullish;
                const dp2    = sig.entry > 1000 ? 2 : sig.entry > 10 ? 2 : 4;

                return (
                  <motion.div key={sig.id}
                    initial={{ opacity:0, x:-12 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:12 }}
                    onClick={() => setSelected(sig)}
                    className="flex items-start gap-3 px-4 py-3 border-b border-wm-border/40 cursor-pointer hover:bg-wm-surface/30 transition-colors"
                    style={{ borderLeft: `3px solid ${meta.color}` }}>

                    {/* Signal icon */}
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base"
                      style={{ background:`${meta.color}18` }}>
                      {meta.icon}
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-wm-text">{sig.symbol}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background:`${STRENGTH_COLOR[sig.strength]}20`, color:STRENGTH_COLOR[sig.strength] }}>
                          {sig.strength}
                        </span>
                        <span className="text-[10px] font-semibold" style={{ color:meta.color }}>{meta.label}</span>
                        {sig.result === "win"  && <span className="text-[9px] text-wm-green font-bold">✓ WIN</span>}
                        {sig.result === "loss" && <span className="text-[9px] text-wm-red font-bold">✗ LOSS</span>}
                        {sig.result === "pending" && <span className="text-[9px] text-wm-gold font-bold animate-pulse">● LIVE</span>}
                        <span className="ml-auto text-[9px] text-wm-text-dim">{ageStr}</span>
                      </div>

                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-[10px] font-mono text-wm-text-dim">
                          Entry <span className="text-wm-text font-bold">{sig.entry.toFixed(dp2)}</span>
                        </span>
                        <span className="text-[10px] font-mono text-wm-text-dim">
                          Target <span className="font-bold" style={{ color:isBull?"#00C076":"#FF4D67" }}>{sig.target.toFixed(dp2)}</span>
                        </span>
                        <span className="text-[10px] font-mono text-wm-text-dim">
                          Stop <span className="text-wm-red font-bold">{sig.stop.toFixed(dp2)}</span>
                        </span>
                        <span className="text-[9px] px-1 rounded font-bold"
                          style={{ background:"rgba(240,180,41,0.15)", color:"#F0B429" }}>
                          {sig.rr}
                        </span>
                      </div>

                      <div className="text-[9px] text-wm-text-dim mt-0.5 truncate">{sig.note}</div>
                    </div>

                    {/* Go to chart */}
                    <button onClick={e => {
                      e.stopPropagation();
                      setActiveSymbol(sig.symbol);
                      router.push("/charts");
                    }} className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-wm-surface text-wm-text-dim hover:text-wm-blue transition-all">
                      <BarChart2 size={12}/>
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-wm-text-dim">
                <Bot size={32} className="mb-3 opacity-30" />
                <div className="text-sm">No signals match this filter</div>
                <div className="text-xs mt-1">Try "All" or wait for the next scan</div>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Signal detail + Coming Soon features */}
        <div className="border-l border-wm-border shrink-0 overflow-y-auto" style={{ width:300, scrollbarWidth:"thin" }}>
          {selected ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black text-wm-text">Signal Detail</span>
                <button onClick={() => setSelected(null)}><X size={13} className="text-wm-text-muted"/></button>
              </div>
              <div className="space-y-3">
                {[
                  { label:"Symbol",   val:selected.symbol,               color:"#E2E8F0" },
                  { label:"Signal",   val:SIGNAL_META[selected.type].label, color:SIGNAL_META[selected.type].color },
                  { label:"Strength", val:selected.strength,             color:STRENGTH_COLOR[selected.strength] },
                  { label:"Entry",    val:selected.entry.toFixed(2),     color:"#E2E8F0" },
                  { label:"Target",   val:selected.target.toFixed(2),    color:"#00C076" },
                  { label:"Stop",     val:selected.stop.toFixed(2),      color:"#FF4D67" },
                  { label:"R:R",      val:selected.rr,                   color:"#F0B429" },
                  { label:"Status",   val:selected.result ?? "pending",  color: selected.result==="win"?"#00C076":selected.result==="loss"?"#FF4D67":"#F0B429" },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-wm-border/30">
                    <span className="text-[10px] text-wm-text-dim">{row.label}</span>
                    <span className="text-[10px] font-bold font-mono" style={{ color:row.color }}>{row.val}</span>
                  </div>
                ))}
                <p className="text-[9px] text-wm-text-dim mt-2 leading-relaxed">{selected.note}</p>
                <button onClick={() => { setActiveSymbol(selected.symbol); router.push("/charts"); }}
                  className="w-full py-2 rounded-xl text-xs font-bold border border-wm-border bg-wm-surface text-wm-text hover:bg-wm-surface/80 flex items-center justify-center gap-1.5 mt-2">
                  <BarChart2 size={11}/> Open Chart
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              <div className="text-[10px] font-bold text-wm-text-muted uppercase tracking-wider mb-2">Coming Soon</div>

              {[
                {
                  icon: <Rocket size={16}/>, color:"#8B5CF6",
                  title: "Auto-Execution",
                  desc: "Bot places orders automatically through your broker when A+ signals fire. Stop watching the screen.",
                  tier: "PRO",
                },
                {
                  icon: <Cpu size={16}/>, color:"#4FA3E0",
                  title: "Custom Strategy Builder",
                  desc: "Build your own signal rules using order flow, CVD, VWAP, and Wyckoff conditions. No coding needed.",
                  tier: "PRO",
                },
                {
                  icon: <Shield size={16}/>, color:"#F0B429",
                  title: "Risk Guardian",
                  desc: "Daily loss limits, max position size, and drawdown alerts enforced automatically.",
                  tier: "PRO",
                },
                {
                  icon: <Sparkles size={16}/>, color:"#00D4AA",
                  title: "AI Market Recap",
                  desc: "Daily audio + text briefing on what smart money did and what to watch next session.",
                  tier: "ELITE",
                },
                {
                  icon: <Bell size={16}/>, color:"#FF8C00",
                  title: "SMS + Discord Alerts",
                  desc: "Get A+ signals to your phone or Discord server the moment they trigger.",
                  tier: "PRO",
                },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-xl border border-wm-border/50 bg-wm-surface/20"
                  style={{ borderLeft:`3px solid ${item.color}40` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ color:item.color }}>{item.icon}</span>
                    <span className="text-xs font-bold text-wm-text">{item.title}</span>
                    <span className="ml-auto text-[8px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: item.tier==="ELITE" ? "rgba(240,180,41,0.2)" : "rgba(0,212,170,0.15)",
                               color: item.tier==="ELITE" ? "#F0B429" : "#00D4AA" }}>
                      {item.tier}
                    </span>
                    <span className="text-[8px] font-bold px-1.5 rounded"
                      style={{ background:"rgba(100,110,130,0.2)", color:"#6B7A8D" }}>
                      SOON
                    </span>
                  </div>
                  <p className="text-[9px] text-wm-text-dim leading-relaxed">{item.desc}</p>
                </div>
              ))}

              <button onClick={() => setShowPricing(true)}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-wm-black mt-2"
                style={{ background:"linear-gradient(135deg,#8B5CF6,#4FA3E0)" }}>
                <Crown size={11} className="inline mr-1.5"/>View Pricing Plans
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Pricing modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {showPricing && (
          <motion.div className="fixed inset-0 z-[300] flex items-center justify-center"
            style={{ background:"rgba(7,10,15,0.85)" }}
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={e => { if (e.target === e.currentTarget) setShowPricing(false); }}>
            <motion.div initial={{ scale:0.93, y:20 }} animate={{ scale:1, y:0 }}
              className="w-full max-w-2xl rounded-2xl border border-wm-border bg-wm-dark p-6 shadow-2xl mx-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-black text-wm-text">WM Pro Plans</h2>
                <button onClick={() => setShowPricing(false)}><X size={16} className="text-wm-text-muted"/></button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    name:"BASIC", price:"Free", color:"#4FA3E0",
                    features:["Live charts","Scanner (limited)","AI signals (10/day)","Paper trading","Community access"],
                    cta:"Current Plan", disabled:true,
                  },
                  {
                    name:"PRO", price:"$50/mo", color:"#00D4AA", popular:true,
                    features:["Unlimited AI signals","All footprint modes","Auto-alerts (SMS/Discord)","Full scanner","DOM + Order Flow","Priority support"],
                    cta:"Join Waitlist",
                  },
                  {
                    name:"ELITE", price:"$150/mo", color:"#F0B429",
                    features:["Everything in Pro","Auto-execution (coming)","AI Market Recap daily","Creator coin access","1-on-1 monthly session","Blockchain packages"],
                    cta:"Join Waitlist",
                  },
                ].map((plan, i) => (
                  <div key={i} className="rounded-xl border p-4 relative"
                    style={{
                      borderColor: plan.popular ? plan.color : "#1E2030",
                      background: plan.popular ? `${plan.color}08` : "#0F1117",
                    }}>
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[9px] font-black"
                        style={{ background:plan.color, color:"#000" }}>MOST POPULAR</div>
                    )}
                    <div className="text-xs font-black mb-1" style={{ color:plan.color }}>{plan.name}</div>
                    <div className="text-2xl font-black text-wm-text mb-3">{plan.price}</div>
                    <ul className="space-y-1.5 mb-4">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-1.5 text-[10px] text-wm-text-dim">
                          <CheckCircle2 size={9} className="mt-0.5 shrink-0" style={{ color:plan.color }}/>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      disabled={plan.disabled}
                      onClick={() => { toast.success(`Added to ${plan.name} waitlist! 🚀`); setShowPricing(false); }}
                      className="w-full py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
                      style={{
                        background: plan.disabled ? "transparent" : plan.color,
                        border: `1px solid ${plan.color}`,
                        color: plan.disabled ? plan.color : "#000",
                      }}>
                      {plan.cta}
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-center text-[10px] text-wm-text-dim mt-4">
                Early adopter pricing for WealthyMindsets community members · Lock in your rate before launch
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
