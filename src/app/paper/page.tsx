"use client";

/**
 * Paper Trading — Full simulated brokerage with live P&L, positions, order book,
 * blotter, equity curve, and risk controls. All state is in-memory.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import { useWMS } from "@/contexts/WMSContext";
import {
  TrendingUp, TrendingDown, Plus, Minus, X, RefreshCw,
  BarChart2, DollarSign, Activity, Target, AlertCircle,
  ChevronUp, ChevronDown, Trash2, Clock, Zap, BookOpen,
  ExternalLink, ArrowUpRight, Trophy, Medal, Crown, Users, Gift,
} from "lucide-react";
import { SymbolSearch } from "@/components/ui/SymbolSearch";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

/* ── Symbol universe with live-ish prices ────────────────── */
const UNIVERSE: Record<string,{ name:string; base:number; tick:number }> = {
  "NQ1!": { name:"Nasdaq Futures",  base:21_750, tick:0.25 },
  "ES1!": { name:"S&P Futures",     base:5_870,  tick:0.25 },
  "RTY1!":{ name:"Russell Futures", base:2_170,  tick:0.10 },
  "GC1!": { name:"Gold Futures",    base:2_640,  tick:0.10 },
  "CL1!": { name:"Crude Oil",       base:78.00,  tick:0.01 },
  "AAPL": { name:"Apple",           base:226,    tick:0.01 },
  "TSLA": { name:"Tesla",           base:400,    tick:0.01 },
  "NVDA": { name:"NVIDIA",          base:860,    tick:0.01 },
  "MSFT": { name:"Microsoft",       base:432,    tick:0.01 },
  "META": { name:"Meta",            base:612,    tick:0.01 },
  "AMZN": { name:"Amazon",          base:218,    tick:0.01 },
  "AMD":  { name:"AMD",             base:162,    tick:0.01 },
  "SPY":  { name:"S&P 500 ETF",     base:587,    tick:0.01 },
  "QQQ":  { name:"Nasdaq 100 ETF",  base:510,    tick:0.01 },
  "BTC":  { name:"Bitcoin",         base:103_000,tick:1.00 },
  "ETH":  { name:"Ethereum",        base:3_800,  tick:0.10 },
};

type OrderType   = "market" | "limit" | "stop" | "stop-limit";
type OrderSide   = "buy" | "sell";
type OrderStatus = "pending" | "filled" | "cancelled" | "rejected";

interface Order {
  id:        string;
  symbol:    string;
  side:      OrderSide;
  type:      OrderType;
  qty:       number;
  limitPx?:  number;
  stopPx?:   number;
  fillPx?:   number;
  status:    OrderStatus;
  ts:        number;
}

interface Position {
  symbol:  string;
  qty:     number;   // negative = short
  avgPx:   number;
  unrealPnl: number;
  marketPx:  number;
}

interface Trade {
  id:     string;
  symbol: string;
  side:   OrderSide;
  qty:    number;
  px:     number;
  ts:     number;
  pnl?:  number; // for closing trades
}

interface EquityPoint { ts: number; equity: number; }

const STARTING_CASH = 100_000;
const PAPER_KEY = "wm_paper_state";

function uid() { return Math.random().toString(36).slice(2,9); }

/**
 * Pure position-fill reducer with correct long/short realized-P&L accounting.
 *
 * Returns the next positions array, the blotter `trade` (carrying realized P&L
 * only on reducing/closing fills), and the `cashDelta`. Cash already embodies
 * realized P&L via double-entry: you pay `qty*px` to buy and receive `qty*px`
 * to sell, so realized profit is the net of those cash flows — it must NOT be
 * added to cash a second time. `trade.pnl` is purely for the blotter/stats.
 *
 * Handles: open, add (same direction), partial close, full close, and reversal
 * (close all + open the leftover on the opposite side at the fill price).
 */
function applyFill(
  positions: Position[],
  ord: Order,
  fillPx: number,
): { positions: Position[]; trade: Trade; cashDelta: number; realized: number } {
  const signedQty = ord.side === "buy" ? ord.qty : -ord.qty; // signed fill size
  const cashDelta = -signedQty * fillPx;                     // pay to buy, receive to sell
  const trade: Trade = {
    id: uid(), symbol: ord.symbol, side: ord.side,
    qty: ord.qty, px: fillPx, ts: Date.now(),
  };

  const idx = positions.findIndex(p => p.symbol === ord.symbol);
  if (idx === -1 || positions[idx].qty === 0) {
    // Brand-new position — opening only, no realized P&L
    const next = idx === -1
      ? [...positions, { symbol: ord.symbol, qty: signedQty, avgPx: fillPx, unrealPnl: 0, marketPx: fillPx }]
      : positions.map((p, i) => i === idx ? { ...p, qty: signedQty, avgPx: fillPx, marketPx: fillPx } : p);
    return { positions: next, trade, cashDelta, realized: 0 };
  }

  const pos = positions[idx];
  const sameDir = Math.sign(signedQty) === Math.sign(pos.qty);
  let realized = 0;
  let newPos: Position | null;

  if (sameDir) {
    // Adding to the position → volume-weighted average, no realized P&L
    const newQty = pos.qty + signedQty;
    const newAvg = (pos.avgPx * pos.qty + fillPx * signedQty) / newQty;
    newPos = { ...pos, qty: newQty, avgPx: newAvg, marketPx: fillPx };
  } else {
    // Opposite direction → reduce / close / reverse. Book realized P&L on the
    // portion that offsets the existing position: (exit-entry)*closed*dir.
    const closeQty = Math.min(Math.abs(signedQty), Math.abs(pos.qty));
    realized = closeQty * (fillPx - pos.avgPx) * Math.sign(pos.qty);
    const newQty = pos.qty + signedQty;
    if (newQty === 0) {
      newPos = null;                                            // fully closed
    } else if (Math.sign(newQty) === Math.sign(pos.qty)) {
      newPos = { ...pos, qty: newQty, marketPx: fillPx };       // partial close, avg unchanged
    } else {
      newPos = { ...pos, qty: newQty, avgPx: fillPx, marketPx: fillPx }; // reversal: leftover opens fresh
    }
  }

  if (realized !== 0) trade.pnl = realized;
  const next = newPos
    ? positions.map((p, i) => (i === idx ? newPos! : p))
    : positions.filter((_, i) => i !== idx);
  return { positions: next, trade, cashDelta, realized };
}

function loadPaperState() {
  try {
    const raw = localStorage.getItem(PAPER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as {
      cash: number; positions: Position[]; orders: Order[];
      trades: Trade[]; equity: EquityPoint[]; optionPositions?: OptionPosition[];
    };
  } catch { return null; }
}

function fmt2(n: number) {
  return n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
}

/* ── Black-Scholes options pricing + greeks ──────────────────
 * Standard European model. Paper-sim only — no real market data,
 * uses a flat IV assumption per underlying so the chain is fully
 * self-contained and repriceable against the live underlying tick. */
function normCdf(x: number): number {
  // Abramowitz & Stegun 7.1.26 approximation of the standard normal CDF.
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  let p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}
function normPdf(x: number): number {
  return 0.3989422804014327 * Math.exp(-x * x / 2);
}
interface Greeks { price:number; delta:number; gamma:number; theta:number; vega:number; iv:number; }
function blackScholes(spot:number, strike:number, tYears:number, iv:number, isCall:boolean, r=0.045): Greeks {
  const T = Math.max(tYears, 1/365/24); // floor ~1hr so 0DTE doesn't blow up
  const sig = Math.max(iv, 0.01);
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(spot/strike) + (r + sig*sig/2)*T) / (sig*sqrtT);
  const d2 = d1 - sig*sqrtT;
  const disc = Math.exp(-r*T);
  let price:number, delta:number;
  if (isCall) {
    price = spot*normCdf(d1) - strike*disc*normCdf(d2);
    delta = normCdf(d1);
  } else {
    price = strike*disc*normCdf(-d2) - spot*normCdf(-d1);
    delta = normCdf(d1) - 1;
  }
  const gamma = normPdf(d1) / (spot*sig*sqrtT);
  const vega  = spot*normPdf(d1)*sqrtT / 100;                 // per 1% vol
  const theta = (-(spot*normPdf(d1)*sig)/(2*sqrtT)
                 - (isCall?1:-1)*r*strike*disc*normCdf((isCall?1:-1)*d2)) / 365; // per day
  return { price:Math.max(price,0), delta, gamma, theta, vega, iv:sig };
}
// Per-underlying flat implied-vol assumption for the paper chain.
function underlyingIV(sym:string): number {
  if (sym==="BTC"||sym==="ETH") return 0.65;
  if (sym==="CL1!"||sym==="GC1!"||sym==="NVDA"||sym==="TSLA"||sym==="AMD") return 0.50;
  if (sym==="NQ1!"||sym==="ES1!"||sym==="RTY1!"||sym==="QQQ") return 0.22;
  return 0.32;
}
// Round a strike to a sensible increment for the underlying's price scale.
function strikeStep(spot:number): number {
  if (spot >= 20_000) return 250;
  if (spot >= 5_000)  return 50;
  if (spot >= 1_000)  return 25;
  if (spot >= 500)    return 10;
  if (spot >= 100)    return 5;
  if (spot >= 25)     return 1;
  return 0.5;
}

type OptType = "call" | "put";
interface OptionPosition {
  id:        string;
  underlying: string;
  type:      OptType;
  strike:    number;
  expiryTs:  number;   // expiration timestamp
  qty:       number;   // contracts (negative = short/sold)
  entryPrem: number;   // premium per contract at entry (per share)
  entryTs:   number;
}
const OPT_MULTIPLIER = 100; // 1 contract = 100 shares
const EXPIRY_CHOICES = [
  { label:"0DTE",  days:0  },
  { label:"7D",    days:7  },
  { label:"30D",   days:30 },
  { label:"60D",   days:60 },
];

/* ── Live price feed (real anchor + smooth ticks) ────────────
 * Anchors each symbol to a real quote (/api/yahoo, same source as
 * the chart/ticker) on mount and every 20s, then mean-reverts a
 * smooth 800ms micro-walk toward that anchor so paper fills track
 * the real market instead of drifting from a stale base. Futures
 * that have no free real feed gracefully fall back to their base. */
function useLivePrices() {
  const [prices, setPrices] = useState<Record<string,number>>(() =>
    Object.fromEntries(Object.entries(UNIVERSE).map(([k,v]) => [k, v.base]))
  );
  // Real anchor + previous close per symbol — seeded to base, refreshed live.
  const anchors    = useRef<Record<string,number>>(
    Object.fromEntries(Object.entries(UNIVERSE).map(([k,v]) => [k, v.base]))
  );
  const [prevCloses, setPrevCloses] = useState<Record<string,number>>({});
  const seeded = useRef(false);

  // Refresh real anchors from the same quote API the chart uses.
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const snap: Record<string,number> = {};
      const pc:   Record<string,number> = {};
      await Promise.all(Object.keys(UNIVERSE).map(async sym => {
        try {
          const j = await fetch(`/api/yahoo?sym=${encodeURIComponent(sym)}&type=quote`, { cache: "no-store" }).then(r => r.json());
          const price = j?.price ?? 0;
          if (alive && price > 0) {
            anchors.current[sym] = price;
            snap[sym] = price;
            if (j?.prevClose > 0) pc[sym] = j.prevClose;
          }
        } catch { /* keep prior anchor */ }
      }));
      if (!alive) return;
      if (Object.keys(pc).length) setPrevCloses(prev => ({ ...prev, ...pc }));
      if (Object.keys(snap).length) {
        seeded.current = true;
        setPrices(prev => ({ ...prev, ...snap }));
      }
    };
    refresh();
    const iv = setInterval(refresh, 20_000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  return { prices, prevCloses };
}

/* ── Equity sparkline ────────────────────────────────────── */
function EquitySparkline({ points }: { points: EquityPoint[] }) {
  if (points.length < 2) return null;
  const vals = points.map(p => p.equity);
  const min  = Math.min(...vals);
  const max  = Math.max(...vals);
  const range = max - min || 1;
  const W = 220, H = 48;
  const pts = vals.map((v,i) =>
    `${(i/(vals.length-1))*W},${H - ((v-min)/range)*H*0.9 - H*0.05}`
  ).join(" ");
  const last = vals[vals.length-1];
  const first = vals[0];
  const color = last >= first ? "#00D4AA" : "#FF4D6A";

  return (
    <svg width={W} height={H}>
      <defs>
        <linearGradient id="egGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill="url(#egGrad)"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Order ticket ────────────────────────────────────────── */
function OrderTicket({
  prices, onSubmit, initialSymbol,
}: {
  prices: Record<string,number>;
  onSubmit: (o: Order) => void;
  initialSymbol?: string;
}) {
  const [sym,    setSym]    = useState(initialSymbol ?? "NQ1!");
  const [side,   setSide]   = useState<OrderSide>("buy");
  const [type,   setType]   = useState<OrderType>("market");
  const [qty,    setQty]    = useState(1);
  const [limitPx,setLimitPx]= useState("");
  const [stopPx, setStopPx] = useState("");
  const [flash,  setFlash]  = useState(false);

  const px  = prices[sym] ?? 0;
  const est = qty * px;

  const submit = () => {
    if (!qty || qty <= 0) return;
    const order: Order = {
      id:     uid(),
      symbol: sym,
      side, type, qty, status:"pending",
      ts:     Date.now(),
      limitPx:type==="limit"||type==="stop-limit" ? +limitPx||px : undefined,
      stopPx: type==="stop"||type==="stop-limit"  ? +stopPx||px  : undefined,
    };
    onSubmit(order);
    setFlash(true);
    setTimeout(()=>setFlash(false), 600);
  };

  return (
    <div className={clsx("rounded-xl border bg-wm-dark p-4 transition-all", flash && "border-wm-green/60 bg-wm-green/5")}>
      <div className="text-xs font-black text-wm-text mb-3 flex items-center gap-2">
        <Zap size={13} className="text-wm-gold"/> Order Ticket
      </div>

      {/* Symbol */}
      <div className="mb-3">
        <label className="text-[9px] text-wm-text-dim uppercase tracking-wider block mb-1">Symbol</label>
        <SymbolSearch value={sym} onChange={s => s && setSym(s)} placeholder="Search any symbol…" />
      </div>

      {/* Live price display */}
      <div className="mb-3 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-wm-surface/40 border border-wm-border/50">
        <span className="text-[10px] text-wm-text-muted">Last Price</span>
        <span className="text-sm font-black text-wm-text font-mono">${fmt2(px)}</span>
      </div>

      {/* Side */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {(["buy","sell"] as OrderSide[]).map(s=>(
          <button key={s} onClick={()=>setSide(s)}
            className={clsx("py-2 rounded-lg text-xs font-black transition-all",
              side===s
                ? s==="buy"  ? "bg-wm-green text-wm-black"
                             : "bg-wm-red text-white"
                : s==="buy"  ? "bg-wm-green/10 text-wm-green border border-wm-green/30 hover:bg-wm-green/20"
                             : "bg-wm-red/10 text-wm-red border border-wm-red/30 hover:bg-wm-red/20"
            )}>
            {s==="buy" ? "▲ BUY / LONG" : "▼ SELL / SHORT"}
          </button>
        ))}
      </div>

      {/* Order type */}
      <div className="mb-3">
        <label className="text-[9px] text-wm-text-dim uppercase tracking-wider block mb-1">Order Type</label>
        <div className="grid grid-cols-2 gap-1">
          {(["market","limit","stop","stop-limit"] as OrderType[]).map(t=>(
            <button key={t} onClick={()=>setType(t)}
              className={clsx("py-1 rounded text-[10px] font-bold border transition-all",
                type===t ? "bg-wm-blue/20 text-wm-blue border-wm-blue/40" : "text-wm-text-muted border-wm-border hover:text-wm-text")}>
              {t.charAt(0).toUpperCase()+t.slice(1).replace("-"," ")}
            </button>
          ))}
        </div>
      </div>

      {/* Qty */}
      <div className="mb-3">
        <label className="text-[9px] text-wm-text-dim uppercase tracking-wider block mb-1">Quantity</label>
        <div className="flex items-center gap-2">
          <button onClick={()=>setQty(q=>Math.max(1,q-1))}
            className="w-7 h-7 rounded-lg border border-wm-border text-wm-text-muted hover:text-wm-text flex items-center justify-center transition-colors">
            <Minus size={11}/>
          </button>
          <input type="number" min={1} value={qty} onChange={e=>setQty(+e.target.value||1)}
            className="flex-1 bg-wm-surface border border-wm-border rounded-lg px-2 py-1.5 text-xs text-wm-text text-center outline-none focus:border-wm-green/50 font-mono font-bold"/>
          <button onClick={()=>setQty(q=>q+1)}
            className="w-7 h-7 rounded-lg border border-wm-border text-wm-text-muted hover:text-wm-text flex items-center justify-center transition-colors">
            <Plus size={11}/>
          </button>
        </div>
      </div>

      {/* Limit/Stop price inputs */}
      {(type==="limit"||type==="stop-limit") && (
        <div className="mb-3">
          <label className="text-[9px] text-wm-text-dim uppercase tracking-wider block mb-1">Limit Price</label>
          <input type="number" value={limitPx} onChange={e=>setLimitPx(e.target.value)}
            placeholder={fmt2(px)} className="w-full bg-wm-surface border border-wm-border rounded-lg px-2.5 py-1.5 text-xs text-wm-text outline-none focus:border-wm-gold/50 font-mono"/>
        </div>
      )}
      {(type==="stop"||type==="stop-limit") && (
        <div className="mb-3">
          <label className="text-[9px] text-wm-text-dim uppercase tracking-wider block mb-1">Stop Price</label>
          <input type="number" value={stopPx} onChange={e=>setStopPx(e.target.value)}
            placeholder={fmt2(px)} className="w-full bg-wm-surface border border-wm-border rounded-lg px-2.5 py-1.5 text-xs text-wm-text outline-none focus:border-wm-red/50 font-mono"/>
        </div>
      )}

      {/* Est value */}
      <div className="flex justify-between text-[10px] text-wm-text-dim mb-3 px-1">
        <span>Est. Value</span>
        <span className="font-mono font-bold text-wm-text">${est.toLocaleString("en-US",{maximumFractionDigits:0})}</span>
      </div>

      {/* Submit */}
      <button onClick={submit}
        className={clsx("w-full py-3 rounded-xl text-sm font-black transition-all hover:opacity-90 active:scale-[0.99]",
          side==="buy" ? "bg-wm-green text-wm-black" : "bg-wm-red text-white")}>
        {side==="buy"?"▲ Place Buy Order":"▼ Place Sell Order"}
      </button>
    </div>
  );
}

/* ── Position row ────────────────────────────────────────── */
function PositionRow({ pos, onClose }: { pos: Position; onClose: ()=>void }) {
  const up  = pos.unrealPnl >= 0;
  const pct = pos.avgPx ? ((pos.marketPx - pos.avgPx) / pos.avgPx * 100 * (pos.qty<0?-1:1)) : 0;

  return (
    <div className="grid items-center border-b border-wm-border/30 px-2 py-2"
      style={{ gridTemplateColumns:"80px 50px 90px 90px 90px 80px 48px" }}>
      <span className="text-xs font-bold text-wm-text">{pos.symbol}</span>
      <span className={clsx("text-xs font-bold", pos.qty>0?"text-wm-green":"text-wm-red")}>
        {pos.qty>0?"LONG":"SHORT"} {Math.abs(pos.qty)}
      </span>
      <span className="text-xs font-mono text-wm-text">${fmt2(pos.avgPx)}</span>
      <span className="text-xs font-mono text-wm-text">${fmt2(pos.marketPx)}</span>
      <span className={clsx("text-xs font-mono font-bold", up?"text-wm-green":"text-wm-red")}>
        {up?"+":""}{fmt2(pos.unrealPnl)}
      </span>
      <span className={clsx("text-[10px] font-mono", up?"text-wm-green":"text-wm-red")}>
        {pct>=0?"+":""}{pct.toFixed(2)}%
      </span>
      <button onClick={onClose}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-wm-text-dim hover:text-wm-red hover:bg-wm-red/10 transition-all">
        <X size={12}/>
      </button>
    </div>
  );
}

/* ── Leaderboard ─────────────────────────────────────────── */
const PRIZE_TIERS = [
  { rank: 1, prize: "$500",  label: "1st Place", color: "#FFD700", icon: "👑" },
  { rank: 2, prize: "$250",  label: "2nd Place", color: "#C0C0C0", icon: "🥈" },
  { rank: 3, prize: "$100",  label: "3rd Place", color: "#CD7F32", icon: "🥉" },
  { rank: 4, prize: "$50",   label: "4th–5th",   color: "#00D4AA", icon: "🏅" },
  { rank: 5, prize: "$50",   label: "4th–5th",   color: "#00D4AA", icon: "🏅" },
];

function Leaderboard({ myPct, myPnl, myTrades, myWin }: {
  myPct: number; myPnl: number; myTrades: number; myWin: number;
}) {
  // Insert "You" into leaderboard at correct rank
  const myEntry = { name: "You ⭐", pct: myPct, pnl: myPnl, trades: myTrades, win: myWin, isMe: true };
  const board = [myEntry]
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 12);
  const myRank = board.findIndex(e => (e as any).isMe) + 1;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Prize pool header */}
      <div className="shrink-0 p-4 border-b border-wm-border bg-gradient-to-r from-[#FFD700]/5 via-transparent to-[#00D4AA]/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-[#FFD700]"/>
            <span className="text-sm font-black text-wm-text">Upside Only — Win Real Money</span>
          </div>
          <button
            onClick={() => window.open("https://www.upsideonly.com", "_blank", "noopener,noreferrer")}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00C853] text-black text-[10px] font-black hover:bg-[#00E060] transition-all"
          >
            Join Contest <ExternalLink size={9}/>
          </button>
        </div>

        {/* Prize tiers */}
        <div className="grid grid-cols-5 gap-1.5">
          {PRIZE_TIERS.map(tier => (
            <div key={tier.rank}
              className="rounded-lg border p-2 text-center"
              style={{ borderColor: tier.color + "40", background: tier.color + "10" }}>
              <div className="text-base mb-0.5">{tier.icon}</div>
              <div className="text-[10px] font-black font-mono" style={{ color: tier.color }}>{tier.prize}</div>
              <div className="text-[8px] text-wm-text-dim">{tier.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-2.5 rounded-lg bg-[#00C853]/10 border border-[#00C853]/20 px-3 py-2 text-[9px] text-wm-text-dim">
          💵 <span className="font-black text-[#00C853]">Real cash payouts.</span> Paper trade here to climb the leaderboard — top performers win actual money through Upside Only. No gimmicks, no points. <span className="font-bold text-wm-text">Real dollars, paid out weekly.</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[9px] text-wm-text-dim">
          <span>📅 Contest resets weekly · Paid directly via Upside Only</span>
          <span className="font-mono font-bold text-wm-text">Total Pool: <span className="text-[#FFD700]">$950</span></span>
        </div>
      </div>

      {/* Your rank callout */}
      {myTrades > 0 && (
        <div className="shrink-0 mx-4 mt-3 rounded-xl border border-wm-green/30 bg-wm-green/5 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-wm-green/20 border border-wm-green/40 flex items-center justify-center text-[10px] font-black text-wm-green">
              #{myRank}
            </div>
            <div>
              <div className="text-[10px] font-black text-wm-text">Your Current Rank</div>
              <div className="text-[9px] text-wm-text-muted">
                {myRank <= 5 ? "🎉 You're in the prize zone!" : `${myRank - 5} spots to top 5`}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={clsx("text-sm font-black font-mono", myPct >= 0 ? "text-wm-green" : "text-wm-red")}>
              {myPct >= 0 ? "+" : ""}{myPct.toFixed(1)}%
            </div>
            <div className="text-[9px] text-wm-text-dim font-mono">return</div>
          </div>
        </div>
      )}

      {/* Leaderboard table */}
      <div className="flex-1 overflow-y-auto mt-3" style={{ scrollbarWidth: "thin" }}>
        {/* Header */}
        <div className="grid text-[9px] font-bold text-wm-text-dim uppercase tracking-wider border-b border-wm-border px-4 py-1.5 sticky top-0 bg-wm-dark"
          style={{ gridTemplateColumns: "36px 1fr 80px 80px 60px 55px" }}>
          <span>#</span><span>Trader</span><span>Return</span><span>P&L</span><span>Trades</span><span>Win%</span>
        </div>

        {board.map((entry, i) => {
          const isMe = (entry as any).isMe;
          const prize = PRIZE_TIERS.find(p => p.rank === i + 1);
          return (
            <div key={entry.name}
              className={clsx(
                "grid items-center border-b border-wm-border/20 px-4 py-2 transition-colors",
                isMe ? "bg-wm-green/5 border-l-2 border-l-wm-green" : "hover:bg-wm-surface/20"
              )}
              style={{ gridTemplateColumns: "36px 1fr 80px 80px 60px 55px" }}>

              {/* Rank */}
              <div className="flex items-center">
                {prize ? (
                  <span className="text-base leading-none">{prize.icon}</span>
                ) : (
                  <span className="text-[11px] font-bold text-wm-text-dim">{i + 1}</span>
                )}
              </div>

              {/* Name */}
              <div>
                <div className={clsx("text-xs font-bold", isMe ? "text-wm-green" : "text-wm-text")}>
                  {entry.name}
                </div>
                {prize && (
                  <div className="text-[8px] font-bold" style={{ color: prize.color }}>
                    {prize.prize} prize
                  </div>
                )}
              </div>

              {/* Return */}
              <div className={clsx("text-xs font-black font-mono", entry.pct >= 0 ? "text-wm-green" : "text-wm-red")}>
                {entry.pct >= 0 ? "+" : ""}{entry.pct.toFixed(1)}%
              </div>

              {/* P&L */}
              <div className={clsx("text-[10px] font-mono font-bold", entry.pnl >= 0 ? "text-wm-green" : "text-wm-red")}>
                {entry.pnl >= 0 ? "+$" : "-$"}{Math.abs(entry.pnl).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>

              {/* Trades */}
              <div className="text-[10px] text-wm-text-muted font-mono">{entry.trades}</div>

              {/* Win rate */}
              <div className={clsx("text-[10px] font-mono font-bold",
                entry.win >= 60 ? "text-wm-green" : entry.win >= 50 ? "text-wm-gold" : "text-wm-red")}>
                {entry.win}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="shrink-0 p-4 border-t border-wm-border bg-gradient-to-r from-[#00C853]/10 to-transparent">
        <button
          onClick={() => window.open("https://www.upsideonly.com", "_blank", "noopener,noreferrer")}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#00C853] to-[#00A844] text-black text-xs font-black hover:opacity-90 active:scale-[0.99] transition-all shadow-lg shadow-[#00C853]/20"
        >
          <ArrowUpRight size={14}/> Join Upside Only — Claim Your Cash Prize
        </button>
        <p className="text-[9px] text-wm-text-dim text-center mt-2">
          🏆 Top leaderboard traders win <span className="font-black text-[#FFD700]">real money</span> — paid out by Upside Only every week
        </p>
      </div>
    </div>
  );
}

/* ── Options chain (Black-Scholes) ───────────────────────── */
function OptionsChain({
  prices, optionPositions, onTrade, onClose, initialSymbol,
}: {
  prices: Record<string,number>;
  optionPositions: OptionPosition[];
  onTrade: (p: Omit<OptionPosition,"id"|"entryTs"|"entryPrem">, side:"buy"|"sell") => void;
  onClose: (id:string, exitPrem:number) => void;
  initialSymbol?: string;
}) {
  const [sym, setSym] = useState(initialSymbol && UNIVERSE[initialSymbol] ? initialSymbol : "TSLA");
  const [expIdx, setExpIdx] = useState(2); // default 30D
  const [qty, setQty] = useState(1);

  const spot = prices[sym] ?? UNIVERSE[sym]?.base ?? 100;
  const iv   = underlyingIV(sym);
  const days = EXPIRY_CHOICES[expIdx].days;
  const expiryTs = Date.now() + days*86_400_000 + (days===0 ? 6*3600_000 : 0);
  const tYears = Math.max((expiryTs - Date.now())/86_400_000, 0.0001) / 365;

  const step = strikeStep(spot);
  const atm  = Math.round(spot/step)*step;
  const strikes: number[] = [];
  for (let i=-6;i<=6;i++) strikes.push(+(atm + i*step).toFixed(2));

  const openForSym = optionPositions.filter(p => p.underlying===sym);

  return (
    <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth:"thin" }}>
      {/* Controls */}
      <div className="sticky top-0 z-10 bg-wm-dark border-b border-wm-border px-3 py-2.5 flex items-center gap-3 flex-wrap">
        <div className="w-44"><SymbolSearch value={sym} onChange={s=>s&&UNIVERSE[s]&&setSym(s)} placeholder="Underlying…"/></div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-wm-surface/40 border border-wm-border/50">
          <span className="text-[9px] text-wm-text-muted">Spot</span>
          <span className="text-xs font-black font-mono text-wm-text">${fmt2(spot)}</span>
        </div>
        <div className="flex gap-1">
          {EXPIRY_CHOICES.map((e,i)=>(
            <button key={e.label} onClick={()=>setExpIdx(i)}
              className={clsx("px-2 py-1 rounded text-[10px] font-bold border transition-all",
                expIdx===i?"bg-wm-blue/20 text-wm-blue border-wm-blue/40":"text-wm-text-muted border-wm-border hover:text-wm-text")}>
              {e.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-wm-text-dim uppercase">Qty</span>
          <button onClick={()=>setQty(q=>Math.max(1,q-1))} className="w-6 h-6 rounded border border-wm-border text-wm-text-muted flex items-center justify-center"><Minus size={10}/></button>
          <span className="text-xs font-mono font-bold text-wm-text w-6 text-center">{qty}</span>
          <button onClick={()=>setQty(q=>q+1)} className="w-6 h-6 rounded border border-wm-border text-wm-text-muted flex items-center justify-center"><Plus size={10}/></button>
        </div>
        <span className="text-[9px] text-wm-text-dim ml-auto">IV {(iv*100).toFixed(0)}% · {OPT_MULTIPLIER}×/contract · BS model</span>
      </div>

      {/* Chain table */}
      <div className="grid text-[9px] font-bold text-wm-text-dim uppercase tracking-wider border-b border-wm-border px-3 py-1.5 sticky bg-wm-dark" style={{ top:49, gridTemplateColumns:"1fr 60px 46px 46px 46px 70px 1fr" }}>
        <span className="text-wm-green text-right pr-2">CALL bid/ask · δ</span><span className="text-center">CallMid</span>
        <span></span><span className="text-center">Strike</span><span></span>
        <span className="text-center">PutMid</span><span className="text-wm-red pl-2">δ · PUT bid/ask</span>
      </div>
      {strikes.map(k=>{
        const c = blackScholes(spot,k,tYears,iv,true);
        const p = blackScholes(spot,k,tYears,iv,false);
        const spread = (mid:number)=>Math.max(0.02, mid*0.03);
        const cAsk = c.price+spread(c.price), cBid = Math.max(0,c.price-spread(c.price));
        const pAsk = p.price+spread(p.price), pBid = Math.max(0,p.price-spread(p.price));
        const itmC = k < spot, itmP = k > spot, atmRow = Math.abs(k-atm)<step/2;
        return (
          <div key={k} className={clsx("grid items-center border-b border-wm-border/20 px-3 py-1.5 text-[10px]",
              atmRow&&"bg-wm-gold/5")}
            style={{ gridTemplateColumns:"1fr 60px 46px 46px 46px 70px 1fr" }}>
            {/* CALL side */}
            <button onClick={()=>onTrade({underlying:sym,type:"call",strike:k,expiryTs,qty},"buy")}
              className={clsx("text-right pr-2 font-mono hover:bg-wm-green/10 rounded py-0.5 transition-colors",
                itmC?"text-wm-green":"text-wm-text-muted")}>
              {fmt2(cBid)}/{fmt2(cAsk)} · {c.delta.toFixed(2)}
            </button>
            <span className={clsx("text-center font-mono font-bold", itmC?"text-wm-green":"text-wm-text")}>{fmt2(c.price)}</span>
            <span></span>
            <span className="text-center font-mono font-black text-wm-text">{k>=1000?k.toLocaleString():fmt2(k)}</span>
            <span></span>
            <span className={clsx("text-center font-mono font-bold", itmP?"text-wm-red":"text-wm-text")}>{fmt2(p.price)}</span>
            <button onClick={()=>onTrade({underlying:sym,type:"put",strike:k,expiryTs,qty},"buy")}
              className={clsx("text-left pl-2 font-mono hover:bg-wm-red/10 rounded py-0.5 transition-colors",
                itmP?"text-wm-red":"text-wm-text-muted")}>
              {p.delta.toFixed(2)} · {fmt2(pBid)}/{fmt2(pAsk)}
            </button>
          </div>
        );
      })}

      {/* Open option positions */}
      <div className="px-3 py-2 text-[9px] font-black text-wm-text-dim uppercase tracking-wider border-b border-t border-wm-border mt-2">
        Open Contracts ({optionPositions.length})
      </div>
      {optionPositions.length===0 ? (
        <div className="px-3 py-4 text-[10px] text-wm-text-muted text-center">Click any bid/ask to buy a contract.</div>
      ) : optionPositions.map(op=>{
        const uPx = prices[op.underlying] ?? UNIVERSE[op.underlying]?.base ?? op.strike;
        const t   = Math.max((op.expiryTs-Date.now())/86_400_000,0)/365;
        const g   = blackScholes(uPx, op.strike, t, underlyingIV(op.underlying), op.type==="call");
        const pnl = (g.price - op.entryPrem) * op.qty * OPT_MULTIPLIER;
        const dte = Math.max(0,Math.ceil((op.expiryTs-Date.now())/86_400_000));
        return (
          <div key={op.id} className="grid items-center border-b border-wm-border/20 px-3 py-1.5 text-[10px]"
            style={{ gridTemplateColumns:"1.4fr 60px 60px 70px 60px 60px" }}>
            <span className="font-bold text-wm-text">
              {op.underlying} {op.strike>=1000?op.strike.toLocaleString():fmt2(op.strike)}
              <span className={clsx("ml-1 font-black", op.type==="call"?"text-wm-green":"text-wm-red")}>{op.type==="call"?"C":"P"}</span>
              <span className="text-wm-text-dim ml-1">×{op.qty}</span>
            </span>
            <span className="font-mono text-wm-text-muted">{dte}d</span>
            <span className="font-mono text-wm-text-muted" title="entry premium">${fmt2(op.entryPrem)}</span>
            <span className="font-mono font-bold text-wm-text" title="mark">${fmt2(g.price)}</span>
            <span className={clsx("font-mono font-black", pnl>=0?"text-wm-green":"text-wm-red")}>
              {pnl>=0?"+":""}{fmt2(pnl)}
            </span>
            <button onClick={()=>onClose(op.id, g.price)}
              className="text-[9px] font-bold px-2 py-1 rounded border border-wm-border text-wm-text-muted hover:text-wm-red hover:border-wm-red/40 transition-all">
              Close
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ── AI Trading Bot (paper-sim only) ─────────────────────────
 * Generates signals from a mean-reversion / momentum read on the
 * live paper price walk and auto-submits paper orders through the
 * SAME order flow. Never touches real money or real brokerage. */
type BotStrategy = "momentum" | "meanrev";
function AIBot({
  prices, onSignalOrder, running, setRunning, strategy, setStrategy, log,
}: {
  prices: Record<string,number>;
  onSignalOrder: (o: Order)=>void;
  running: boolean; setRunning:(v:boolean)=>void;
  strategy: BotStrategy; setStrategy:(s:BotStrategy)=>void;
  log: { ts:number; msg:string; side:OrderSide }[];
}) {
  const [botSym, setBotSym] = useState("NQ1!");
  return (
    <div className="rounded-xl border border-wm-blue/30 bg-gradient-to-br from-wm-blue/10 to-transparent p-3.5 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-xs font-black text-wm-text">
          <Zap size={13} className="text-wm-blue"/> AI Trading Bot
        </div>
        <span className={clsx("text-[8px] font-black px-1.5 py-0.5 rounded", running?"bg-wm-green/20 text-wm-green":"bg-wm-text-dim/10 text-wm-text-dim")}>
          {running?"● RUNNING":"○ IDLE"}
        </span>
      </div>
      <div className="mb-2"><SymbolSearch value={botSym} onChange={s=>s&&UNIVERSE[s]&&setBotSym(s)} placeholder="Bot symbol…"/></div>
      <div className="grid grid-cols-2 gap-1 mb-2">
        {(["momentum","meanrev"] as BotStrategy[]).map(s=>(
          <button key={s} onClick={()=>setStrategy(s)}
            className={clsx("py-1 rounded text-[10px] font-bold border transition-all",
              strategy===s?"bg-wm-blue/20 text-wm-blue border-wm-blue/40":"text-wm-text-muted border-wm-border hover:text-wm-text")}>
            {s==="momentum"?"Momentum":"Mean Reversion"}
          </button>
        ))}
      </div>
      <button onClick={()=>setRunning(!running)}
        data-bot-symbol={botSym}
        className={clsx("w-full py-2 rounded-lg text-xs font-black transition-all active:scale-[0.99]",
          running?"bg-wm-red text-white":"bg-wm-blue text-white hover:opacity-90")}>
        {running?"■ Stop Bot":"▶ Start Bot"}
      </button>
      <div className="mt-2 max-h-32 overflow-y-auto space-y-1" style={{ scrollbarWidth:"none" }}>
        {log.length===0 ? (
          <div className="text-[9px] text-wm-text-dim text-center py-2">Signals will appear here.</div>
        ) : log.slice(0,20).map((l,i)=>(
          <div key={i} className="flex items-center gap-1.5 text-[9px]">
            <span className={clsx("font-black", l.side==="buy"?"text-wm-green":"text-wm-red")}>{l.side==="buy"?"▲":"▼"}</span>
            <span className="text-wm-text-muted flex-1 truncate">{l.msg}</span>
            <span className="text-wm-text-dim font-mono">{new Date(l.ts).toLocaleTimeString([], {hour12:false})}</span>
          </div>
        ))}
      </div>
      <p className="text-[8px] text-wm-text-dim mt-2 leading-relaxed">
        ⚠ Paper simulation only. The bot places <span className="font-bold">simulated</span> orders in this account — it never trades real money.
      </p>
      <input type="hidden" data-bot-active={running?"1":"0"} readOnly/>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────── */
export default function PaperTradingPage() {
  const { activeSymbol } = useActiveSymbol();
  const { earnWMS } = useWMS();
  const { prices, prevCloses } = useLivePrices();
  // Start from deterministic defaults so server and client render identically,
  // then hydrate persisted state in a post-mount effect (avoids React #418).
  const [cash,      setCash]      = useState(STARTING_CASH);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders,    setOrders]    = useState<Order[]>([]);
  const [trades,    setTrades]    = useState<Trade[]>([]);
  const [equity,    setEquity]    = useState<EquityPoint[]>([{ ts:Date.now(), equity:STARTING_CASH }]);
  const [tab,       setTab]       = useState<"positions"|"orders"|"trades"|"options"|"leaderboard">("positions");
  const [resetKey,  setResetKey]  = useState(0);
  const [hydrated,  setHydrated]  = useState(false);

  // Options positions (Black-Scholes paper sim)
  const [optionPositions, setOptionPositions] = useState<OptionPosition[]>([]);

  // Hydrate saved account state once, after mount (client only).
  useEffect(() => {
    const saved = loadPaperState();
    if (saved) {
      setCash(saved.cash ?? STARTING_CASH);
      setPositions(saved.positions ?? []);
      setOrders(saved.orders ?? []);
      setTrades(saved.trades ?? []);
      setEquity(saved.equity ?? [{ ts:Date.now(), equity:STARTING_CASH }]);
      setOptionPositions(saved.optionPositions ?? []);
    }
    setHydrated(true);
  }, []);

  // AI bot state
  const [botRunning,  setBotRunning]  = useState(false);
  const [botStrategy, setBotStrategy] = useState<BotStrategy>("momentum");
  const [botLog,      setBotLog]      = useState<{ ts:number; msg:string; side:OrderSide }[]>([]);
  const botHist = useRef<Record<string,number[]>>({});

  // Latest positions mirror (read inside the fill effect without stale closures)
  // and a guard that guarantees each order fills exactly once, even if the
  // effect re-runs (StrictMode / concurrent re-invoke).
  const posRef    = useRef<Position[]>(positions);
  useEffect(() => { posRef.current = positions; }, [positions]);
  const filledRef = useRef<Set<string>>(new Set());

  // Update unrealized P&L whenever prices change
  const updatedPositions = positions.map(pos => ({
    ...pos,
    marketPx:   prices[pos.symbol] ?? pos.avgPx,
    unrealPnl:  ((prices[pos.symbol] ?? pos.avgPx) - pos.avgPx) * pos.qty,
  }));

  // Real P&L = unrealized sum across all positions
  const totalUnreal = updatedPositions.reduce((s,p) => s + p.unrealPnl, 0);
  // Mark-to-market value of open option contracts (Black-Scholes).
  const optionsMark = optionPositions.reduce((s,op)=>{
    const uPx = prices[op.underlying] ?? UNIVERSE[op.underlying]?.base ?? op.strike;
    const t   = Math.max((op.expiryTs-Date.now())/86_400_000,0)/365;
    const g   = blackScholes(uPx, op.strike, t, underlyingIV(op.underlying), op.type==="call");
    return s + g.price * op.qty * OPT_MULTIPLIER;
  }, 0);
  // Signed market value: a long adds +qty*px, a short subtracts (you owe it).
  const totalEquity = cash + updatedPositions.reduce((s,p) => s + p.qty*p.marketPx, 0) + optionsMark;
  const totalRealPnl = trades.reduce((s,t) => s + (t.pnl ?? 0), 0);
  const dayPnl = totalRealPnl + totalUnreal;

  // Persist state to localStorage
  useEffect(() => {
    if (!hydrated) return; // don't clobber saved state with pre-hydration defaults
    try {
      localStorage.setItem(PAPER_KEY, JSON.stringify({ cash, positions, orders, trades, equity, optionPositions }));
    } catch {}
  }, [hydrated, cash, positions, orders, trades, equity, optionPositions]);

  // Track equity curve every 10s
  useEffect(() => {
    const iv = setInterval(() => {
      setEquity(prev => {
        const pt = { ts: Date.now(), equity: totalEquity };
        const next = [...prev, pt];
        return next.length > 200 ? next.slice(-200) : next;
      });
    }, 10_000);
    return () => clearInterval(iv);
  }, [totalEquity]);

  // Process pending orders when price crosses limit/stop.
  // Fills are computed purely, applied once (filledRef guards against any
  // re-invoke), then committed with pure functional updaters — no side effects
  // inside a setState updater, so cash/positions/trades never double-apply.
  useEffect(() => {
    const pend = orders.filter(o => o.status === "pending" && !filledRef.current.has(o.id));
    if (pend.length === 0) return;

    const fills: { ord: Order; fillPx: number }[] = [];
    for (const ord of pend) {
      const px = prices[ord.symbol] ?? 100;
      let fill = false;
      if (ord.type === "market") fill = true;
      else if (ord.type === "limit") {
        fill = ord.side==="buy" ? px <= (ord.limitPx??px) : px >= (ord.limitPx??px);
      } else if (ord.type === "stop") {
        fill = ord.side==="buy" ? px >= (ord.stopPx??px) : px <= (ord.stopPx??px);
      } else if (ord.type === "stop-limit") {
        const triggered = ord.side==="buy" ? px >= (ord.stopPx??px) : px <= (ord.stopPx??px);
        if (triggered) fill = ord.side==="buy" ? px <= (ord.limitPx??px) : px >= (ord.limitPx??px);
      }
      if (!fill) continue;
      filledRef.current.add(ord.id);            // exactly-once guard
      fills.push({ ord, fillPx: ord.limitPx ?? px });
    }
    if (fills.length === 0) return;

    // Apply every fill to a working copy (correct long/short realized P&L).
    let work = posRef.current;
    let cashDelta = 0;
    const newTrades: Trade[] = [];
    const wins: string[] = [];
    for (const { ord, fillPx } of fills) {
      const r = applyFill(work, ord, fillPx);
      work = r.positions;
      cashDelta += r.cashDelta;
      newTrades.push(r.trade);
      if (r.realized > 0) wins.push(ord.symbol);
    }
    posRef.current = work;                       // keep mirror in lockstep

    const fillPxById = new Map(fills.map(f => [f.ord.id, f.fillPx]));
    setPositions(work);
    setCash(c => c + cashDelta);
    setTrades(t => [...newTrades.reverse(), ...t]);
    setOrders(prev => prev.map(o => fillPxById.has(o.id)
      ? { ...o, status:"filled", fillPx: fillPxById.get(o.id)! } : o));
    wins.forEach(sym => earnWMS(25, `📈 Paper trade win on ${sym}`));
  }, [prices, orders, earnWMS]);

  // AI bot: evaluate a simple momentum / mean-reversion signal on an
  // interval and auto-submit PAPER orders through the same flow.
  useEffect(() => {
    if (!botRunning) return;
    const iv = setInterval(() => {
      // Read the bot symbol off the rendered control (set by AIBot).
      const el = typeof document !== "undefined"
        ? document.querySelector<HTMLElement>("[data-bot-symbol]") : null;
      const sym = el?.dataset.botSymbol || "NQ1!";
      const px  = prices[sym];
      if (!px) return;
      const hist = botHist.current[sym] ?? [];
      hist.push(px);
      if (hist.length > 40) hist.shift();
      botHist.current[sym] = hist;
      if (hist.length < 20) return; // warm up

      const sma = hist.slice(-20).reduce((s,v)=>s+v,0)/20;
      const dev = (px - sma) / sma;
      let side: OrderSide | null = null;
      if (botStrategy === "momentum") {
        if (dev > 0.0012) side = "buy";
        else if (dev < -0.0012) side = "sell";
      } else { // mean reversion
        if (dev > 0.0018) side = "sell";
        else if (dev < -0.0018) side = "buy";
      }
      if (!side) return;

      // Throttle: don't spam more than 1 signal / 8s per direction.
      const last = botLog[0];
      if (last && Date.now()-last.ts < 8000 && last.side===side) return;

      const ord: Order = { id:uid(), symbol:sym, side, type:"market", qty:1, status:"pending", ts:Date.now() };
      setOrders(prev => [ord, ...prev]);
      setBotLog(prev => [{
        ts:Date.now(),
        msg:`${botStrategy==="momentum"?"MOM":"MR"} ${side!.toUpperCase()} ${sym} @ ${fmt2(px)} (dev ${(dev*100).toFixed(2)}%)`,
        side: side!,
      }, ...prev].slice(0,40));
    }, 3000);
    return () => clearInterval(iv);
  }, [botRunning, botStrategy, prices, botLog]);

  const handleOrder = (ord: Order) => {
    setOrders(prev => [ord, ...prev]);
  };

  /* ── Options: open / close (paper sim, Black-Scholes) ──── */
  const openOption = useCallback((p: Omit<OptionPosition,"id"|"entryTs"|"entryPrem">, _side:"buy"|"sell") => {
    const uPx = prices[p.underlying] ?? UNIVERSE[p.underlying]?.base ?? p.strike;
    const t   = Math.max((p.expiryTs-Date.now())/86_400_000,0.0001)/365;
    const g   = blackScholes(uPx, p.strike, t, underlyingIV(p.underlying), p.type==="call");
    const ask = g.price + Math.max(0.02, g.price*0.03); // pay the ask
    const cost = ask * p.qty * OPT_MULTIPLIER;
    setCash(c => c - cost);
    setOptionPositions(prev => [
      { ...p, id:uid(), entryTs:Date.now(), entryPrem:ask },
      ...prev,
    ]);
  }, [prices]);

  const closeOption = useCallback((id:string, exitPrem:number) => {
    setOptionPositions(prev => {
      const op = prev.find(o => o.id===id);
      if (!op) return prev;
      const bid = Math.max(0, exitPrem - Math.max(0.02, exitPrem*0.03)); // sell the bid
      const proceeds = bid * op.qty * OPT_MULTIPLIER;
      const pnl = (bid - op.entryPrem) * op.qty * OPT_MULTIPLIER;
      setCash(c => c + proceeds);
      setTrades(t => [{
        id:uid(),
        symbol:`${op.underlying} ${op.strike}${op.type==="call"?"C":"P"}`,
        side:"sell", qty:op.qty, px:bid, ts:Date.now(), pnl,
      }, ...t]);
      if (pnl > 0) earnWMS(25, `📈 Options win on ${op.underlying}`);
      return prev.filter(o => o.id!==id);
    });
  }, [earnWMS]);

  const cancelOrder = (id: string) => {
    setOrders(prev => prev.map(o => o.id===id ? { ...o, status:"cancelled" } : o));
  };

  const closePosition = (symbol: string) => {
    const pos = updatedPositions.find(p => p.symbol===symbol);
    if (!pos) return;
    const closeOrd: Order = {
      id:uid(), symbol, side:pos.qty>0?"sell":"buy",
      type:"market", qty:Math.abs(pos.qty), status:"pending", ts:Date.now(),
    };
    setOrders(prev => [closeOrd, ...prev]);
  };

  const resetAccount = () => {
    setCash(STARTING_CASH); setPositions([]); setOrders([]); setTrades([]);
    setOptionPositions([]); setBotRunning(false); setBotLog([]);
    setEquity([{ ts:Date.now(), equity:STARTING_CASH }]);
    setResetKey(k=>k+1);
    filledRef.current.clear(); posRef.current = [];
    try { localStorage.removeItem(PAPER_KEY); } catch {}
  };

  const pendingOrders = orders.filter(o=>o.status==="pending");
  const filledOrders  = orders.filter(o=>o.status==="filled");

  return (
    <div style={{ display:"flex",flexDirection:"column",width:"100%",height:"100%",overflow:"hidden" }}
         className="bg-wm-black">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 border-b border-wm-border bg-wm-dark shrink-0" style={{ height:44 }}>
        <Activity size={15} className="text-wm-green shrink-0"/>
        <h1 className="text-sm font-bold text-wm-text">Paper Trading</h1>
        <div className="flex items-center gap-1.5 ml-1">
          <span className="w-1.5 h-1.5 rounded-full bg-wm-green animate-pulse"/>
          <span className="text-[10px] text-wm-green font-bold">LIVE SIMULATION</span>
        </div>

        {/* Account stats in header */}
        <div className="flex items-center gap-4 ml-6">
          {[
            { l:"Equity",   v:`$${totalEquity.toLocaleString("en-US",{maximumFractionDigits:0})}`,  c:"text-wm-text" },
            { l:"Cash",     v:`$${cash.toLocaleString("en-US",{maximumFractionDigits:0})}`,          c:"text-wm-text-muted" },
            { l:"Day P&L",  v:`${dayPnl>=0?"+":""}$${fmt2(Math.abs(dayPnl))}`,                       c:dayPnl>=0?"text-wm-green":"text-wm-red" },
            { l:"Realized", v:`${totalRealPnl>=0?"+":""}$${fmt2(Math.abs(totalRealPnl))}`,          c:totalRealPnl>=0?"text-wm-green":"text-wm-red" },
          ].map(({l,v,c})=>(
            <div key={l} className="text-center">
              <div className="text-[9px] text-wm-text-dim uppercase tracking-wider">{l}</div>
              <div className={clsx("text-xs font-black font-mono", c)}>{v}</div>
            </div>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={resetAccount}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-wm-border text-wm-text-muted hover:text-wm-red hover:border-wm-red/40 transition-all">
            <RefreshCw size={10}/> Reset
          </button>
          <div className="text-[10px] px-2 py-1 rounded-lg border border-wm-border/50 text-wm-text-dim font-mono">
            Start: $100,000
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1,display:"flex",overflow:"hidden",minHeight:0 }}>

        {/* Left: Order ticket */}
        <div className="w-64 border-r border-wm-border shrink-0 overflow-y-auto p-3" style={{ scrollbarWidth:"thin" }}>
          <OrderTicket key={resetKey} prices={prices} onSubmit={handleOrder} initialSymbol={UNIVERSE[activeSymbol] ? activeSymbol : undefined}/>

          <AIBot
            prices={prices}
            onSignalOrder={handleOrder}
            running={botRunning} setRunning={setBotRunning}
            strategy={botStrategy} setStrategy={setBotStrategy}
            log={botLog}
          />

          {/* Quick stats */}
          <div className="mt-3 space-y-2">
            <div className="text-[9px] text-wm-text-dim uppercase tracking-wider mb-2 font-bold">Quick Stats</div>
            {[
              { l:"Positions",  v:updatedPositions.length },
              { l:"Pending",    v:pendingOrders.length    },
              { l:"Total Trades",v:trades.length          },
              { l:"Win Rate",   v:trades.length
                  ? `${Math.round(trades.filter(t=>(t.pnl??0)>0).length/trades.length*100)}%`
                  : "—" },
            ].map(({l,v})=>(
              <div key={l} className="flex justify-between text-[10px]">
                <span className="text-wm-text-dim">{l}</span>
                <span className="text-wm-text font-mono font-bold">{v}</span>
              </div>
            ))}
          </div>

          {/* Upside Only Banner */}
          <div className="mt-4">
            <div className="text-[9px] text-wm-text-dim uppercase tracking-wider mb-2 font-bold">Partner Platform</div>
            <div className="rounded-xl border border-[#00C853]/30 bg-gradient-to-br from-[#00C853]/10 via-[#00C853]/5 to-transparent p-3.5 relative overflow-hidden">
              {/* Decorative glow */}
              <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-[#00C853]/20 blur-xl pointer-events-none"/>

              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-[#00C853] flex items-center justify-center shrink-0">
                  <ArrowUpRight size={13} className="text-black font-black"/>
                </div>
                <span className="text-xs font-black text-white">Upside Only</span>
              </div>

              <p className="text-[10px] text-wm-text-muted leading-relaxed mb-3">
                Take your trading to the next level. Access premium trade ideas, real-time alerts, and community insights on Upside Only.
              </p>

              <button
                onClick={() => window.open("https://www.upsideonly.com", "_blank", "noopener,noreferrer")}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#00C853] text-black text-[10px] font-black hover:bg-[#00E060] active:scale-[0.98] transition-all"
              >
                Visit Upside Only <ExternalLink size={10}/>
              </button>

              <div className="flex items-center gap-1 mt-2 justify-center">
                <span className="w-1 h-1 rounded-full bg-[#00C853] animate-pulse"/>
                <span className="text-[8px] text-[#00C853] font-bold">LIVE COMMUNITY</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Equity curve + positions/orders */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Equity curve card */}
          <div className="border-b border-wm-border px-4 py-3 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[9px] text-wm-text-dim uppercase tracking-wider">Portfolio Equity</div>
                <div className="text-xl font-black text-wm-text font-mono">
                  ${totalEquity.toLocaleString("en-US",{maximumFractionDigits:0})}
                </div>
                <div className={clsx("text-xs font-bold font-mono", dayPnl>=0?"text-wm-green":"text-wm-red")}>
                  {dayPnl>=0?"+":""}{fmt2(dayPnl)} today ({((dayPnl/STARTING_CASH)*100).toFixed(2)}%)
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <EquitySparkline points={equity}/>
                <div className="text-[9px] text-wm-text-dim">{equity.length} data points</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-wm-border shrink-0">
            {([
              ["positions",`Positions (${updatedPositions.length})`],
              ["orders",`Orders (${pendingOrders.length} pending)`],
              ["options",`Options (${optionPositions.length})`],
              ["trades",`Blotter (${trades.length})`],
            ] as [string,string][]).map(([t,l])=>(
              <button key={t} onClick={()=>setTab(t as any)}
                className={clsx("px-4 py-2 text-xs font-bold border-b-2 transition-all",
                  tab===t ? "border-wm-green text-wm-green" : "border-transparent text-wm-text-muted hover:text-wm-text")}>
                {l}
              </button>
            ))}
            <button onClick={()=>setTab("leaderboard")}
              className={clsx("px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5",
                tab==="leaderboard" ? "border-[#FFD700] text-[#FFD700]" : "border-transparent text-wm-text-muted hover:text-[#FFD700]")}>
              <Trophy size={11}/> Leaderboard
            </button>
          </div>

          {/* Positions */}
          {tab==="positions" && (
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth:"thin" }}>
              {updatedPositions.length===0 ? (
                <div className="flex flex-col items-center justify-center h-full text-wm-text-muted gap-2">
                  <BookOpen size={28} className="opacity-20"/>
                  <span className="text-xs">No open positions. Place an order to start.</span>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="grid text-[9px] font-bold text-wm-text-dim uppercase tracking-wider border-b border-wm-border px-2 py-1.5 sticky top-0 bg-wm-dark"
                    style={{ gridTemplateColumns:"80px 50px 90px 90px 90px 80px 48px" }}>
                    <span>Symbol</span><span>Side</span><span>Avg Px</span>
                    <span>Market</span><span>Unreal P&L</span><span>%</span><span></span>
                  </div>
                  <AnimatePresence>
                    {updatedPositions.map(pos=>(
                      <motion.div key={pos.symbol} initial={{ opacity:0,x:-8 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:8 }}>
                        <PositionRow pos={pos} onClose={()=>closePosition(pos.symbol)}/>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Totals */}
                  <div className="px-2 py-2 border-t border-wm-border bg-wm-surface/20">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-wm-text">Total Unrealized P&L</span>
                      <span className={clsx("font-black font-mono", totalUnreal>=0?"text-wm-green":"text-wm-red")}>
                        {totalUnreal>=0?"+":""}{fmt2(totalUnreal)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Orders */}
          {tab==="orders" && (
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth:"thin" }}>
              {orders.length===0 ? (
                <div className="flex flex-col items-center justify-center h-full text-wm-text-muted gap-2">
                  <AlertCircle size={28} className="opacity-20"/>
                  <span className="text-xs">No orders yet.</span>
                </div>
              ) : (
                <>
                  <div className="grid text-[9px] font-bold text-wm-text-dim uppercase tracking-wider border-b border-wm-border px-3 py-1.5 sticky top-0 bg-wm-dark"
                    style={{ gridTemplateColumns:"70px 50px 50px 60px 80px 80px 90px 48px" }}>
                    <span>Symbol</span><span>Side</span><span>Type</span><span>Qty</span>
                    <span>Limit Px</span><span>Fill Px</span><span>Status</span><span></span>
                  </div>
                  {orders.map(ord=>(
                    <div key={ord.id} className="grid items-center border-b border-wm-border/30 px-3 py-2"
                      style={{ gridTemplateColumns:"70px 50px 50px 60px 80px 80px 90px 48px" }}>
                      <span className="text-xs font-bold text-wm-text">{ord.symbol}</span>
                      <span className={clsx("text-xs font-bold", ord.side==="buy"?"text-wm-green":"text-wm-red")}>
                        {ord.side.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-wm-text-muted capitalize">{ord.type}</span>
                      <span className="text-xs font-mono text-wm-text">{ord.qty}</span>
                      <span className="text-[10px] font-mono text-wm-text-muted">
                        {ord.limitPx ? "$"+fmt2(ord.limitPx) : "—"}
                      </span>
                      <span className="text-[10px] font-mono text-wm-text-muted">
                        {ord.fillPx ? "$"+fmt2(ord.fillPx) : "—"}
                      </span>
                      <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded",
                        ord.status==="filled"    ? "bg-wm-green/15 text-wm-green"
                        :ord.status==="pending"  ? "bg-wm-gold/15 text-wm-gold"
                        :ord.status==="cancelled"? "bg-wm-text-dim/10 text-wm-text-dim"
                        :                          "bg-wm-red/15 text-wm-red"
                      )}>
                        {ord.status}
                      </span>
                      {ord.status==="pending" && (
                        <button onClick={()=>cancelOrder(ord.id)}
                          className="w-7 h-7 flex items-center justify-center rounded text-wm-text-dim hover:text-wm-red transition-colors">
                          <X size={12}/>
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Options chain */}
          {tab==="options" && (
            <OptionsChain
              prices={prices}
              optionPositions={optionPositions}
              onTrade={openOption}
              onClose={closeOption}
              initialSymbol={UNIVERSE[activeSymbol] ? activeSymbol : undefined}
            />
          )}

          {/* Blotter / trades */}
          {tab==="trades" && (
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth:"thin" }}>
              {trades.length===0 ? (
                <div className="flex flex-col items-center justify-center h-full text-wm-text-muted gap-2">
                  <BarChart2 size={28} className="opacity-20"/>
                  <span className="text-xs">No trades yet.</span>
                </div>
              ) : (
                <>
                  <div className="grid text-[9px] font-bold text-wm-text-dim uppercase tracking-wider border-b border-wm-border px-3 py-1.5 sticky top-0 bg-wm-dark"
                    style={{ gridTemplateColumns:"70px 50px 50px 90px 100px 90px" }}>
                    <span>Symbol</span><span>Side</span><span>Qty</span>
                    <span>Fill Px</span><span>Time</span><span>P&L</span>
                  </div>
                  {trades.map(t=>(
                    <div key={t.id} className="grid items-center border-b border-wm-border/30 px-3 py-1.5"
                      style={{ gridTemplateColumns:"70px 50px 50px 90px 100px 90px" }}>
                      <span className="text-xs font-bold text-wm-text">{t.symbol}</span>
                      <span className={clsx("text-xs font-bold", t.side==="buy"?"text-wm-green":"text-wm-red")}>
                        {t.side.toUpperCase()}
                      </span>
                      <span className="text-xs font-mono text-wm-text">{t.qty}</span>
                      <span className="text-xs font-mono text-wm-text">${fmt2(t.px)}</span>
                      <span className="text-[10px] text-wm-text-dim font-mono">
                        {new Date(t.ts).toLocaleTimeString()}
                      </span>
                      {t.pnl !== undefined ? (
                        <span className={clsx("text-xs font-black font-mono", t.pnl>=0?"text-wm-green":"text-wm-red")}>
                          {t.pnl>=0?"+":""}{fmt2(t.pnl)}
                        </span>
                      ) : <span className="text-[10px] text-wm-text-dim">Open</span>}
                    </div>
                  ))}

                  {/* P&L summary */}
                  <div className="px-3 py-2 border-t border-wm-border bg-wm-surface/20">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-wm-text">Realized P&L</span>
                      <span className={clsx("font-black font-mono", totalRealPnl>=0?"text-wm-green":"text-wm-red")}>
                        {totalRealPnl>=0?"+":""}{fmt2(totalRealPnl)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] mt-1 text-wm-text-muted">
                      <span>Win Rate</span>
                      <span className="font-mono">
                        {trades.length
                          ? `${Math.round(trades.filter(t=>(t.pnl??0)>0).length/trades.length*100)}% (${trades.filter(t=>(t.pnl??0)>0).length}W/${trades.filter(t=>(t.pnl??0)<0).length}L)`
                          : "—"}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

          {/* Leaderboard */}
          {tab==="leaderboard" && (
            <div className="flex-1 overflow-hidden">
              <Leaderboard
                myPct={((totalEquity - STARTING_CASH) / STARTING_CASH) * 100}
                myPnl={totalEquity - STARTING_CASH}
                myTrades={trades.length}
                myWin={trades.length ? Math.round(trades.filter(t=>(t.pnl??0)>0).length/trades.length*100) : 0}
              />
            </div>
          )}

        {/* Right: Market prices ticker */}
        <div className="w-48 border-l border-wm-border flex flex-col overflow-hidden shrink-0">
          <div className="px-3 py-2 border-b border-wm-border text-[9px] font-black text-wm-text-dim uppercase tracking-wider flex items-center gap-1.5">
            <Activity size={10} className="text-wm-green"/> Live Prices
          </div>
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth:"none" }}>
            {Object.entries(UNIVERSE).map(([sym,info])=>{
              const px   = prices[sym] ?? info.base;
              const ref  = prevCloses[sym] ?? info.base;
              const chg  = ref ? ((px - ref)/ref)*100 : 0;
              return (
                <div key={sym} className="flex items-center justify-between px-2.5 py-1.5 border-b border-wm-border/20 hover:bg-wm-surface/30 transition-colors">
                  <div>
                    <div className="text-[10px] font-bold text-wm-text">{sym}</div>
                    <div className="text-[8px] text-wm-text-dim truncate" style={{ maxWidth:70 }}>{info.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-mono font-bold text-wm-text">
                      {px>=1000 ? px.toLocaleString("en-US",{maximumFractionDigits:0}) : fmt2(px)}
                    </div>
                    <div className={clsx("text-[9px] font-mono font-bold", chg>=0?"text-wm-green":"text-wm-red")}>
                      {chg>=0?"+":""}{chg.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
