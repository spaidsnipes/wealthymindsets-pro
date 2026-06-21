"use client";

/**
 * Scanner — Real-time multi-filter market scanner
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, SlidersHorizontal, RefreshCw, TrendingUp, TrendingDown,
  Zap, AlertCircle, Bell, Star, BarChart2, Activity,
  Filter, ChevronDown, ChevronUp, Pause, Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { useRouter } from "next/navigation";
import { useActiveSymbol } from "@/contexts/SymbolContext";

type Signal =
  | "momentum-long"  | "momentum-short"
  | "breakout-bull"  | "breakout-bear"
  | "volume-surge"   | "dark-pool"
  | "vwap-reclaim"   | "gap-fill"
  | "wyckoff-accum"  | "wyckoff-dist"
  | "cvd-div-bull"   | "cvd-div-bear"
  | "options-flow"   | "earnings-play"
  | "fib-bounce"     | "supply-reject";

type AlertStrength = "A+" | "A" | "B" | "C";

interface ScanResult {
  id: string; symbol: string; name: string;
  price: number; change: number; changePct: number;
  volume: number; volRatio: number;
  signal: Signal; strength: AlertStrength;
  rsi: number; sector: string; float: string; mktcap: string;
  time: number; starred: boolean; alerted: boolean;
}

type SortKey = "time" | "changePct" | "volRatio" | "rsi" | "strength";
type SortDir = "asc" | "desc";

const SIGNAL_META: Record<Signal, { label: string; color: string; icon: string }> = {
  "momentum-long":  { label:"Momentum Long",    color:"#00D4AA", icon:"🚀" },
  "momentum-short": { label:"Momentum Short",   color:"#FF4D6A", icon:"📉" },
  "breakout-bull":  { label:"Breakout ↑",       color:"#4FA3E0", icon:"⬆" },
  "breakout-bear":  { label:"Breakdown ↓",      color:"#FF4D6A", icon:"⬇" },
  "volume-surge":   { label:"Volume Surge",      color:"#F0B429", icon:"⚡" },
  "dark-pool":      { label:"Dark Pool Print",   color:"#8B5CF6", icon:"🌑" },
  "vwap-reclaim":   { label:"VWAP Reclaim",      color:"#00D4AA", icon:"🎯" },
  "gap-fill":       { label:"Gap Fill",          color:"#F0B429", icon:"↩" },
  "wyckoff-accum":  { label:"Wyckoff Accum.",    color:"#00D4AA", icon:"⚖" },
  "wyckoff-dist":   { label:"Wyckoff Dist.",     color:"#FF4D6A", icon:"⚖" },
  "cvd-div-bull":   { label:"CVD Divergence ↑",  color:"#4FA3E0", icon:"〰" },
  "cvd-div-bear":   { label:"CVD Divergence ↓",  color:"#FF4D6A", icon:"〰" },
  "options-flow":   { label:"Options Flow",      color:"#8B5CF6", icon:"💎" },
  "earnings-play":  { label:"Earnings Play",     color:"#F0B429", icon:"📊" },
  "fib-bounce":     { label:"Fib Bounce",        color:"#4FA3E0", icon:"🌀" },
  "supply-reject":  { label:"Supply Reject",     color:"#FF4D6A", icon:"⛔" },
};

const STRENGTH_COLOR: Record<AlertStrength, string> = {
  "A+":"#00D4AA","A":"#4FA3E0","B":"#F0B429","C":"#94A3B8",
};

const SIGNALS: Signal[] = Object.keys(SIGNAL_META) as Signal[];
const SECTORS = ["Technology","Energy","Financials","Healthcare","Consumer","Industrials","Crypto","Futures","ETF"];
const STRENGTHS: AlertStrength[] = ["A+","A","B","C"];

const SYMS: [string,string][] = [
  ["NQ1!","Nasdaq Futures"],["ES1!","S&P 500 Futures"],["NVDA","NVIDIA"],
  ["TSLA","Tesla"],["AAPL","Apple"],["META","Meta"],["AMZN","Amazon"],
  ["MSFT","Microsoft"],["GOOG","Alphabet"],["AMD","Advanced Micro"],
  ["PLTR","Palantir"],["MSTR","MicroStrategy"],["COIN","Coinbase"],
  ["SMCI","Super Micro"],["ARM","Arm Holdings"],["RIVN","Rivian"],
  ["SOFI","SoFi Technologies"],["LCID","Lucid Motors"],["GME","GameStop"],
  ["AMC","AMC Entertainment"],["SOUN","SoundHound AI"],["AI","C3.ai"],
  ["IONQ","IonQ"],["QBTS","D-Wave Quantum"],["RGTI","Rigetti"],
  ["SPY","S&P 500 ETF"],["QQQ","Nasdaq 100 ETF"],["IWM","Russell 2000 ETF"],
  ["GLD","Gold ETF"],["TLT","20yr Treasury ETF"],
];

const FINNHUB_KEY = "d8efu9hr01qth3ch5f20d8efu9hr01qth3ch5f2g";

// Sector mapping for known symbols
const SYM_SECTOR: Record<string,string> = {
  "NVDA":"Technology","TSLA":"Consumer","AAPL":"Technology","META":"Technology",
  "AMZN":"Consumer","MSFT":"Technology","GOOG":"Technology","AMD":"Technology",
  "PLTR":"Technology","MSTR":"Financials","COIN":"Financials","SMCI":"Technology",
  "ARM":"Technology","RIVN":"Consumer","SOFI":"Financials","LCID":"Consumer",
  "GME":"Consumer","AMC":"Consumer","SOUN":"Technology","AI":"Technology",
  "IONQ":"Technology","QBTS":"Technology","RGTI":"Technology",
  "SPY":"ETF","QQQ":"ETF","IWM":"ETF","GLD":"ETF","TLT":"ETF",
  "NQ1!":"Futures","ES1!":"Futures",
};

// Compute a signal from real quote data
function signalFromQuote(changePct: number, volRatio: number, rsi: number): Signal {
  if (changePct > 3  && volRatio > 3) return "breakout-bull";
  if (changePct < -3 && volRatio > 3) return "breakout-bear";
  if (changePct > 1.5 && volRatio > 2) return "momentum-long";
  if (changePct < -1.5 && volRatio > 2) return "momentum-short";
  if (volRatio > 5) return "volume-surge";
  if (rsi < 35) return "fib-bounce";
  if (rsi > 70) return "supply-reject";
  if (changePct > 0.5) return "vwap-reclaim";
  return "gap-fill";
}

function strengthFromData(changePct: number, volRatio: number): AlertStrength {
  const score = Math.abs(changePct) * 0.5 + volRatio * 0.3;
  if (score > 5)  return "A+";
  if (score > 3)  return "A";
  if (score > 1.5) return "B";
  return "C";
}

// Fetch real quotes from Finnhub for scanner symbols (stocks only)
const SCANNER_STOCKS = SYMS.filter(([s]) => !s.includes("1!") && !s.includes("/")).map(([s]) => s);

// Cache FMP profiles (mktcap, float) — changes slowly, cache 10 min
let fmpProfileCache: Map<string, { mktcap: string; float: string }> | null = null;
let fmpProfileCacheTs = 0;

async function fetchFmpProfiles(): Promise<Map<string, { mktcap: string; float: string }>> {
  if (fmpProfileCache && Date.now() - fmpProfileCacheTs < 600_000) return fmpProfileCache;
  const map = new Map<string, { mktcap: string; float: string }>();
  try {
    const syms = SCANNER_STOCKS.join(",");
    const res  = await fetch(`/api/fmp?path=/v3/profile/${encodeURIComponent(syms)}`);
    if (!res.ok) return map;
    const data = await res.json();
    const arr: Array<{ symbol: string; mktCap?: number; floatShares?: number }> = Array.isArray(data) ? data : [];
    for (const p of arr) {
      const mc = p.mktCap ?? 0;
      const fl = p.floatShares ?? 0;
      const fmtB = (n: number) => {
        if (n >= 1e12) return (n/1e12).toFixed(1)+"T";
        if (n >= 1e9)  return (n/1e9).toFixed(1)+"B";
        if (n >= 1e6)  return (n/1e6).toFixed(0)+"M";
        return n > 0 ? n.toLocaleString() : "—";
      };
      map.set(p.symbol, { mktcap: mc > 0 ? fmtB(mc) : "—", float: fl > 0 ? fmtB(fl) : "—" });
    }
  } catch {}
  fmpProfileCache = map;
  fmpProfileCacheTs = Date.now();
  return map;
}

// Cache RSI per symbol — recomputed every 5 min
const rsiCache = new Map<string, { rsi: number; ts: number }>();

async function fetchRSI(sym: string): Promise<number | null> {
  const cached = rsiCache.get(sym);
  if (cached && Date.now() - cached.ts < 300_000) return cached.rsi;
  try {
    const now  = Math.floor(Date.now() / 1000);
    const from = now - 40 * 86_400; // 40 days back for 14-period RSI
    const url  = `https://finnhub.io/api/v1/indicator?symbol=${sym}&resolution=D&indicator=rsi&timeperiod=14&from=${from}&to=${now}&token=${FINNHUB_KEY}`;
    const json = await fetch(url, { cache: "no-store" }).then(r => r.json());
    const vals: number[] = json?.technicalAnalysis?.rsi ?? [];
    if (!vals.length) return null;
    const rsi = Math.round(vals[vals.length - 1]);
    rsiCache.set(sym, { rsi, ts: Date.now() });
    return rsi;
  } catch {
    return null;
  }
}

interface QuoteData { price:number; change:number; changePct:number; volume:number; rsi:number|null }

async function fetchScannerQuotes(): Promise<Map<string, QuoteData>> {
  const results = new Map<string, QuoteData>();
  // Batch in groups of 3 to respect Finnhub rate limits (30 req/s — each sym = 2 calls: quote + RSI)
  const BATCH = 3;
  for (let i = 0; i < SCANNER_STOCKS.length; i += BATCH) {
    const batch = SCANNER_STOCKS.slice(i, i + BATCH);
    await Promise.all(batch.map(async sym => {
      try {
        const [quoteJson, rsi] = await Promise.all([
          fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${FINNHUB_KEY}`, { cache: "no-store" }).then(r => r.json()),
          fetchRSI(sym),
        ]);
        const price = quoteJson?.c ?? 0;
        const prev  = quoteJson?.pc ?? price;
        if (price > 0) {
          const change    = +(price - prev).toFixed(2);
          const changePct = prev > 0 ? +((change / prev) * 100).toFixed(2) : 0;
          // Finnhub basic quote doesn't include intraday volume.
          // Use a hash-stable estimate boosted by actual move magnitude.
          const n = sym.split("").reduce((a,c) => a + c.charCodeAt(0), 0);
          const baseVol   = 1_500_000 + (n % 8_000_000);
          const moveBoost = Math.abs(changePct) * 500_000;
          const volume    = Math.floor(baseVol + moveBoost);
          results.set(sym, { price, change, changePct, volume, rsi });
        }
      } catch {}
    }));
    if (i + BATCH < SCANNER_STOCKS.length) await new Promise(r => setTimeout(r, 200));
  }
  return results;
}

function buildResults(
  quotes: Map<string, QuoteData>,
  profiles: Map<string, { mktcap: string; float: string }>,
  prev: ScanResult[],
): ScanResult[] {
  const prevMap = new Map(prev.map(r => [r.symbol, r]));
  let starredSet = new Set<string>();
  let alertedSet = new Set<string>();
  try {
    starredSet = new Set(JSON.parse(localStorage.getItem("wm_scanner_starred") || "[]") as string[]);
    alertedSet = new Set(JSON.parse(localStorage.getItem("wm_scanner_alerted") || "[]") as string[]);
  } catch {}
  return SYMS.map(([sym, name], i) => {
    const q   = quotes.get(sym);
    const old = prevMap.get(sym);
    const prf = profiles.get(sym);
    const price     = q?.price     ?? old?.price     ?? 100;
    const change    = q?.change    ?? old?.change    ?? 0;
    const changePct = q?.changePct ?? old?.changePct ?? 0;
    const volume    = q?.volume    ?? old?.volume    ?? 0;
    const avgVol    = 2_500_000;
    const volRatio  = +(volume / avgVol).toFixed(1);
    // Real RSI from Finnhub indicator API; fall back to old cached value if available
    const rsi = q?.rsi ?? old?.rsi ?? 50;
    return {
      id:        sym + "-" + i,
      symbol:    sym,
      name,
      price:     +price.toFixed(2),
      change:    +change.toFixed(2),
      changePct: +changePct.toFixed(2),
      volume,
      volRatio:  Math.max(0.1, volRatio),
      signal:    signalFromQuote(changePct, volRatio, rsi),
      strength:  strengthFromData(changePct, volRatio),
      rsi,
      sector:    SYM_SECTOR[sym] ?? "Technology",
      // Real float + mktcap from FMP profile; fall back to old cached value
      float:     prf?.float   ?? old?.float   ?? "—",
      mktcap:    prf?.mktcap  ?? old?.mktcap  ?? "—",
      time:      Date.now(),
      starred:   starredSet.has(sym) ?? old?.starred ?? false,
      alerted:   alertedSet.has(sym) ?? old?.alerted ?? false,
    };
  });
}

const PRESETS = [
  { id:"hot",      label:"🔥 Hot Movers",   sigs:["momentum-long","breakout-bull","volume-surge"] as Signal[] },
  { id:"darkpool", label:"🌑 Dark Pool",     sigs:["dark-pool","options-flow"] as Signal[] },
  { id:"wyckoff",  label:"⚖ Wyckoff",       sigs:["wyckoff-accum","wyckoff-dist"] as Signal[] },
  { id:"vwap",     label:"🎯 VWAP",         sigs:["vwap-reclaim","fib-bounce"] as Signal[] },
  { id:"short",    label:"🩸 Shorts",        sigs:["momentum-short","breakout-bear","supply-reject","cvd-div-bear"] as Signal[] },
  { id:"earnings", label:"📊 Earnings",      sigs:["earnings-play"] as Signal[] },
  { id:"all",      label:"📋 All",           sigs:SIGNALS },
];

function Sparkline({ up, id }: { up: boolean; id: string }) {
  const pts = Array.from({ length: 12 }, (_, i) => {
    const v = Math.sin(i * 0.9 + id.charCodeAt(0)) * 15 + (up ? i * 2 : -i * 2) + 30;
    return i * 8 + "," + (50 - v);
  }).join(" ");
  return (
    <svg width={90} height={28}>
      <polyline points={pts} fill="none" stroke={up ? "#00D4AA" : "#FF4D6A"} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
    </svg>
  );
}

export default function ScannerPage() {
  const router = useRouter();
  const { setActiveSymbol } = useActiveSymbol();
  const [results,       setResults]       = useState<ScanResult[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [preset,        setPreset]        = useState("hot");
  const [sortKey,       setSortKey]       = useState<SortKey>("time");
  const [sortDir,       setSortDir]       = useState<SortDir>("desc");
  const [live,          setLive]          = useState(true);
  const [lastRefresh,   setLastRefresh]   = useState(Date.now());
  const [selected,      setSelected]      = useState<ScanResult | null>(null);
  const [filterOpen,    setFilterOpen]    = useState(true);
  const [activeSignals, setActiveSignals] = useState<Signal[]>(PRESETS[0].sigs);
  const [minVol,        setMinVol]        = useState(0);
  const [minPct,        setMinPct]        = useState(0);
  const [selSectors,    setSelSectors]    = useState<string[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const applyPreset = (id: string) => {
    setPreset(id);
    const p = PRESETS.find(x => x.id === id);
    if (p) setActiveSignals(p.sigs);
  };

  // Initial load + periodic refresh — real Finnhub quotes + RSI, real FMP profiles
  const refresh = useCallback(async () => {
    try {
      const [quotes, profiles] = await Promise.all([
        fetchScannerQuotes(),
        fetchFmpProfiles(),
      ]);
      setResults(prev => buildResults(quotes, profiles, prev));
      setLastRefresh(Date.now());
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!live) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    // Refresh every 30s with real data
    intervalRef.current = setInterval(refresh, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [live, refresh]);

  const toggleStar = (id: string) => {
    setResults(p => {
      const next = p.map(r => r.id === id ? { ...r, starred: !r.starred } : r);
      const starred = new Set(next.filter(r => r.starred).map(r => r.symbol));
      try { localStorage.setItem("wm_scanner_starred", JSON.stringify([...starred])); } catch {}
      return next;
    });
  };
  const toggleAlert = (id: string) => {
    setResults(p => {
      const next = p.map(r => r.id === id ? { ...r, alerted: !r.alerted } : r);
      const alerted = new Set(next.filter(r => r.alerted).map(r => r.symbol));
      try { localStorage.setItem("wm_scanner_alerted", JSON.stringify([...alerted])); } catch {}
      return next;
    });
  };
  const toggleSig   = (s: Signal) => setActiveSignals(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const toggleSec   = (s: string) => setSelSectors(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const sortToggle = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const filtered = results
    .filter(r =>
      (!search || r.symbol.toLowerCase().includes(search.toLowerCase()) || r.name.toLowerCase().includes(search.toLowerCase())) &&
      activeSignals.includes(r.signal) &&
      r.volRatio >= minVol &&
      Math.abs(r.changePct) >= minPct &&
      (selSectors.length === 0 || selSectors.includes(r.sector))
    )
    .sort((a, b) => {
      const ord = {"A+":4,"A":3,"B":2,"C":1};
      const av = sortKey === "strength" ? ord[a.strength] : (a as unknown as Record<string,number>)[sortKey];
      const bv = sortKey === "strength" ? ord[b.strength] : (b as unknown as Record<string,number>)[sortKey];
      return sortDir === "desc" ? bv - av : av - bv;
    });

  const bullCount = filtered.filter(r => r.changePct > 0).length;
  const bearCount = filtered.filter(r => r.changePct < 0).length;

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? (sortDir === "desc" ? <ChevronDown size={10}/> : <ChevronUp size={10}/>)
      : <ChevronDown size={10} className="opacity-30"/>;

  return (
    <div style={{ display:"flex",flexDirection:"column",width:"100%",height:"100%",overflow:"hidden" }} className="bg-wm-black">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 border-b border-wm-border bg-wm-dark shrink-0" style={{ height:44 }}>
        <Zap size={15} className="text-wm-gold shrink-0"/>
        <h1 className="text-sm font-bold text-wm-text">Scanner</h1>
        <div className="flex items-center gap-3 ml-2">
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="w-2 h-2 rounded-full bg-wm-green animate-pulse"/>
            <span className="text-wm-text-muted">{filtered.length} signals</span>
          </div>
          <span className="text-[10px] text-wm-green font-bold">{bullCount}▲</span>
          <span className="text-[10px] text-wm-red font-bold">{bearCount}▼</span>
        </div>
        <div className="flex items-center gap-1 ml-2 overflow-x-auto" style={{ scrollbarWidth:"none" }}>
          {PRESETS.map(p => (
            <button key={p.id} onClick={() => applyPreset(p.id)}
              className={clsx("whitespace-nowrap px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all",
                preset===p.id ? "bg-wm-blue/20 text-wm-blue border-wm-blue/40" : "text-wm-text-muted border-transparent hover:border-wm-border hover:text-wm-text"
              )}>{p.label}</button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-wm-surface border border-wm-border rounded-lg px-2.5 py-1">
            <Search size={11} className="text-wm-text-muted"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Symbol..."
              className="bg-transparent text-xs text-wm-text outline-none w-24 placeholder-wm-text-dim"/>
          </div>
          <button onClick={() => setFilterOpen(v => !v)}
            className={clsx("flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border transition-all",
              filterOpen ? "bg-wm-blue/15 text-wm-blue border-wm-blue/40" : "text-wm-text-muted border-wm-border hover:text-wm-text")}>
            <SlidersHorizontal size={11}/> Filters
          </button>
          <button onClick={() => setLive(v => !v)}
            className={clsx("flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border font-bold transition-all",
              live ? "bg-wm-green/15 text-wm-green border-wm-green/40" : "text-wm-text-muted border-wm-border")}>
            {live ? <><Activity size={11}/> LIVE</> : <><Pause size={11}/> Paused</>}
          </button>
          <button onClick={() => { refresh(); }}
            className="p-1.5 rounded-lg text-wm-text-muted hover:text-wm-text hover:bg-wm-surface border border-wm-border transition-colors">
            <RefreshCw size={12}/>
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1,display:"flex",overflow:"hidden",minHeight:0 }}>

        {/* Filter panel */}
        <AnimatePresence>
          {filterOpen && (
            <motion.div initial={{ width:0,opacity:0 }} animate={{ width:200,opacity:1 }} exit={{ width:0,opacity:0 }}
              className="overflow-hidden shrink-0 border-r border-wm-border bg-wm-dark flex flex-col">
              <div className="px-3 py-2 border-b border-wm-border text-[9px] font-bold text-wm-text-dim uppercase tracking-wider flex items-center gap-1.5">
                <Filter size={11} className="text-wm-blue"/> Filters
              </div>
              <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4" style={{ scrollbarWidth:"thin" }}>
                <div>
                  <div className="text-[9px] text-wm-text-dim uppercase tracking-wider mb-2">Signal Type</div>
                  <div className="space-y-0.5">
                    {SIGNALS.map(sig => {
                      const m = SIGNAL_META[sig];
                      const on = activeSignals.includes(sig);
                      return (
                        <button key={sig} onClick={() => toggleSig(sig)}
                          className={clsx("w-full flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all",
                            on ? "bg-wm-surface text-wm-text" : "text-wm-text-dim hover:text-wm-text hover:bg-wm-surface/50")}>
                          <span style={{ color:on ? m.color : undefined }}>{m.icon}</span>
                          <span className="truncate">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] mb-1">
                    <span className="text-wm-text-dim uppercase tracking-wider">Min Vol Ratio</span>
                    <span className="text-wm-gold font-mono font-bold">{minVol}×</span>
                  </div>
                  <input type="range" min={1} max={10} step={0.5} value={minVol} onChange={e => setMinVol(+e.target.value)}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer" style={{ accentColor:"#F0B429" }}/>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] mb-1">
                    <span className="text-wm-text-dim uppercase tracking-wider">Min |Change|%</span>
                    <span className="text-wm-blue font-mono font-bold">{minPct}%</span>
                  </div>
                  <input type="range" min={0} max={10} step={0.5} value={minPct} onChange={e => setMinPct(+e.target.value)}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer" style={{ accentColor:"#4FA3E0" }}/>
                </div>
                <div>
                  <div className="text-[9px] text-wm-text-dim uppercase tracking-wider mb-2">Sector</div>
                  <div className="flex flex-wrap gap-1">
                    {SECTORS.map(s => (
                      <button key={s} onClick={() => toggleSec(s)}
                        className={clsx("px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-all",
                          selSectors.includes(s) ? "bg-wm-blue/20 text-wm-blue border-wm-blue/40" : "text-wm-text-dim border-wm-border hover:text-wm-text")}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Column headers */}
          <div className="grid border-b border-wm-border bg-wm-dark shrink-0"
            style={{ gridTemplateColumns:"36px 80px 1fr 90px 90px 80px 80px 60px 80px 100px 60px" }}>
            {[
              {l:"",k:null},{l:"Symbol",k:null},{l:"Signal",k:null},{l:"Price",k:null},
              {l:"Chg%",k:"changePct"},{l:"Vol×",k:"volRatio"},{l:"RSI",k:"rsi"},
              {l:"Str",k:"strength"},{l:"Sector",k:null},{l:"Chart",k:null},{l:"",k:null},
            ].map(({l,k},i) => (
              <div key={i} className={clsx("px-2 py-1.5 text-[9px] font-bold text-wm-text-dim uppercase tracking-wider flex items-center gap-0.5",
                k && "cursor-pointer hover:text-wm-text select-none")}
                onClick={() => k && sortToggle(k as SortKey)}>
                {l}{k && <SortIcon k={k as SortKey}/>}
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth:"thin" }}>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-wm-text-muted gap-2">
                <AlertCircle size={24} className="opacity-30"/>
                <span className="text-xs">No signals match current filters</span>
              </div>
            )}
            {filtered.map((r, idx) => {
              const meta = SIGNAL_META[r.signal];
              const up   = r.changePct >= 0;
              const isSel = selected?.id === r.id;
              return (
                <motion.div key={r.id}
                  initial={{ opacity:0,x:-8 }} animate={{ opacity:1,x:0 }} transition={{ delay:idx*0.015,duration:0.2 }}
                  onClick={() => setSelected(isSel ? null : r)}
                  className={clsx("grid border-b border-wm-border/30 cursor-pointer transition-colors items-center",
                    isSel ? "bg-wm-surface" : "hover:bg-wm-surface/50")}
                  style={{ gridTemplateColumns:"36px 80px 1fr 90px 90px 80px 80px 60px 80px 100px 60px",height:40 }}>
                  <div className="flex items-center justify-center">
                    <button onClick={e=>{e.stopPropagation();toggleStar(r.id)}} className="text-wm-text-dim hover:text-wm-gold transition-colors">
                      <Star size={11} className={r.starred?"text-wm-gold fill-wm-gold":""}/>
                    </button>
                  </div>
                  <div className="px-2">
                    <div className="text-xs font-bold text-wm-text">{r.symbol}</div>
                    <div className="text-[9px] text-wm-text-dim truncate">{r.name}</div>
                  </div>
                  <div className="px-2">
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background:`${meta.color}18`,color:meta.color }}>
                      {meta.icon} {meta.label}
                    </span>
                  </div>
                  <div className="px-2 text-xs font-mono font-bold text-wm-text">
                    ${r.price.toLocaleString("en-US",{minimumFractionDigits:2})}
                  </div>
                  <div className={clsx("px-2 text-xs font-mono font-bold",up?"text-wm-green":"text-wm-red")}>
                    {up?"+":""}{r.changePct.toFixed(2)}%
                  </div>
                  <div className="px-2">
                    <span className={clsx("text-[10px] font-mono font-bold",
                      r.volRatio>=4?"text-wm-gold":r.volRatio>=2?"text-wm-blue":"text-wm-text-muted")}>
                      {r.volRatio}×
                    </span>
                  </div>
                  <div className="px-2">
                    <span className={clsx("text-[10px] font-mono font-bold",
                      r.rsi>=70?"text-wm-red":r.rsi<=30?"text-wm-green":"text-wm-text-muted")}>{r.rsi}</span>
                    <div className="h-1 mt-0.5 rounded-full bg-wm-surface" style={{ width:36 }}>
                      <div className="h-full rounded-full" style={{ width:`${r.rsi}%`,
                        background:r.rsi>=70?"#FF4D6A":r.rsi<=30?"#00D4AA":"#F0B429" }}/>
                    </div>
                  </div>
                  <div className="px-2">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded"
                      style={{ background:`${STRENGTH_COLOR[r.strength]}22`,color:STRENGTH_COLOR[r.strength] }}>
                      {r.strength}
                    </span>
                  </div>
                  <div className="px-2 text-[9px] text-wm-text-dim truncate">{r.sector}</div>
                  <div className="px-1"><Sparkline up={up} id={r.id}/></div>
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={e=>{e.stopPropagation();toggleAlert(r.id)}}
                      className={clsx("p-1 rounded transition-colors",r.alerted?"text-wm-gold":"text-wm-text-dim hover:text-wm-gold")}>
                      <Bell size={11} className={r.alerted?"fill-wm-gold":""}/>
                    </button>
                    <button onClick={e=>{e.stopPropagation();setActiveSymbol(r.symbol);router.push("/charts");}}
                      className="p-1 rounded text-wm-text-dim hover:text-wm-blue transition-colors" title="Open chart">
                      <BarChart2 size={11}/>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selected && (
            <motion.div initial={{ width:0,opacity:0 }} animate={{ width:252,opacity:1 }} exit={{ width:0,opacity:0 }}
              className="border-l border-wm-border bg-wm-dark flex flex-col shrink-0 overflow-hidden">
              <div className="px-3 py-2 border-b border-wm-border flex items-center justify-between">
                <span className="text-xs font-bold text-wm-text">{selected.symbol} Detail</span>
                <button onClick={()=>setSelected(null)} className="text-wm-text-dim hover:text-wm-text text-xs">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ scrollbarWidth:"thin" }}>
                <div className="rounded-xl border border-wm-border bg-wm-surface/30 p-3">
                  <div className="text-xl font-black text-wm-text">
                    ${selected.price.toLocaleString("en-US",{minimumFractionDigits:2})}
                  </div>
                  <div className={clsx("text-sm font-bold mt-0.5",selected.changePct>=0?"text-wm-green":"text-wm-red")}>
                    {selected.changePct>=0?"+":""}{selected.changePct.toFixed(2)}%
                  </div>
                  <Sparkline up={selected.changePct>=0} id={selected.id}/>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                  style={{ background:`${SIGNAL_META[selected.signal].color}12`,
                           border:`1px solid ${SIGNAL_META[selected.signal].color}30` }}>
                  <span className="text-base">{SIGNAL_META[selected.signal].icon}</span>
                  <span className="text-xs font-bold" style={{ color:SIGNAL_META[selected.signal].color }}>
                    {SIGNAL_META[selected.signal].label}
                  </span>
                  <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded"
                    style={{ background:`${STRENGTH_COLOR[selected.strength]}22`,color:STRENGTH_COLOR[selected.strength] }}>
                    {selected.strength}
                  </span>
                </div>
                {[
                  {l:"Vol Ratio",v:`${selected.volRatio}×`,c:selected.volRatio>=3?"#F0B429":"#94A3B8"},
                  {l:"RSI",      v:String(selected.rsi),   c:selected.rsi>=70?"#FF4D6A":selected.rsi<=30?"#00D4AA":"#94A3B8"},
                  {l:"Sector",   v:selected.sector,        c:"#94A3B8"},
                  {l:"Mkt Cap",  v:selected.mktcap,        c:"#94A3B8"},
                  {l:"Float",    v:selected.float,         c:"#94A3B8"},
                  {l:"Volume",   v:(selected.volume/1e6).toFixed(1)+"M",c:"#94A3B8"},
                ].map(({l,v,c})=>(
                  <div key={l} className="flex justify-between items-center py-1 border-b border-wm-border/30">
                    <span className="text-[10px] text-wm-text-dim">{l}</span>
                    <span className="text-[10px] font-mono font-bold" style={{ color:c }}>{v}</span>
                  </div>
                ))}
                <div className="space-y-2 pt-1">
                  <button onClick={()=>toggleAlert(selected.id)}
                    className={clsx("w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all",
                      selected.alerted ? "bg-wm-gold/15 text-wm-gold border-wm-gold/40" : "bg-wm-surface border-wm-border text-wm-text-muted hover:text-wm-gold hover:border-wm-gold/40")}>
                    <Bell size={12}/> {selected.alerted?"Alert ON":"Set Alert"}
                  </button>
                  <button onClick={()=>{setActiveSymbol(selected.symbol);router.push("/charts");}}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold bg-wm-blue/15 text-wm-blue border border-wm-blue/40 hover:bg-wm-blue/25 transition-all">
                    <BarChart2 size={12}/> Open Chart
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 px-4 py-1 border-t border-wm-border bg-wm-dark shrink-0 text-[9px] text-wm-text-dim">
        <span>Refreshed: {new Date(lastRefresh).toLocaleTimeString()}</span>
        <span>·</span>
        <span>{filtered.length}/{results.length} results</span>
        <span>·</span>
        <span className={live?"text-wm-green":""}>● {live?"LIVE (30s)":"Paused"}</span>
        <span>·</span>
        <span>{activeSignals.length} signal types</span>
      </div>
    </div>
  );
}
