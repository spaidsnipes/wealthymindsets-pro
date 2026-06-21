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

function loadPaperState() {
  try {
    const raw = localStorage.getItem(PAPER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as {
      cash: number; positions: Position[]; orders: Order[];
      trades: Trade[]; equity: EquityPoint[];
    };
  } catch { return null; }
}

function fmt2(n: number) {
  return n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
}

/* ── Live price feed (simulated) ─────────────────────────── */
function useLivePrices() {
  const [prices, setPrices] = useState<Record<string,number>>(() =>
    Object.fromEntries(Object.entries(UNIVERSE).map(([k,v]) => [k, v.base]))
  );

  useEffect(() => {
    const iv = setInterval(() => {
      setPrices(prev => {
        const next: Record<string,number> = {};
        for (const [sym, info] of Object.entries(UNIVERSE)) {
          const cur = prev[sym] ?? info.base;
          const move = (Math.random() - 0.498) * cur * 0.0008;
          next[sym] = Math.max(info.tick, +(cur + move).toFixed(sym==="BTC"?0:2));
        }
        return next;
      });
    }, 800);
    return () => clearInterval(iv);
  }, []);

  return prices;
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

// Simulated global leaderboard entries (in production, pull from your backend)
const MOCK_LEADERBOARD = [
  { name: "TradeMaster_X",   pct: 84.2,  pnl: 84_200,  trades: 127, win: 71 },
  { name: "WealthBuilder",   pct: 61.5,  pnl: 61_500,  trades: 89,  win: 65 },
  { name: "NQ_Sniper",       pct: 47.8,  pnl: 47_800,  trades: 203, win: 58 },
  { name: "GoldDigger99",    pct: 39.1,  pnl: 39_100,  trades: 54,  win: 72 },
  { name: "CryptoKing_ES",   pct: 31.4,  pnl: 31_400,  trades: 311, win: 54 },
  { name: "FuturesPhenom",   pct: 28.9,  pnl: 28_900,  trades: 88,  win: 61 },
  { name: "BullMktVibes",    pct: 22.3,  pnl: 22_300,  trades: 44,  win: 68 },
  { name: "TeslaTrader",     pct: 19.7,  pnl: 19_700,  trades: 76,  win: 55 },
  { name: "AlgoAlpha",       pct: 14.2,  pnl: 14_200,  trades: 512, win: 53 },
  { name: "YoungMindset",    pct: 11.8,  pnl: 11_800,  trades: 33,  win: 60 },
];

function Leaderboard({ myPct, myPnl, myTrades, myWin }: {
  myPct: number; myPnl: number; myTrades: number; myWin: number;
}) {
  // Insert "You" into leaderboard at correct rank
  const myEntry = { name: "You ⭐", pct: myPct, pnl: myPnl, trades: myTrades, win: myWin, isMe: true };
  const board = [...MOCK_LEADERBOARD, myEntry]
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

/* ── Main page ───────────────────────────────────────────── */
export default function PaperTradingPage() {
  const { activeSymbol } = useActiveSymbol();
  const { earnWMS } = useWMS();
  const prices  = useLivePrices();
  const saved = typeof window !== "undefined" ? loadPaperState() : null;
  const [cash,      setCash]      = useState(saved?.cash      ?? STARTING_CASH);
  const [positions, setPositions] = useState<Position[]>(saved?.positions ?? []);
  const [orders,    setOrders]    = useState<Order[]>(saved?.orders    ?? []);
  const [trades,    setTrades]    = useState<Trade[]>(saved?.trades    ?? []);
  const [equity,    setEquity]    = useState<EquityPoint[]>(saved?.equity ?? [{ ts:Date.now(), equity:STARTING_CASH }]);
  const [tab,       setTab]       = useState<"positions"|"orders"|"trades"|"leaderboard">("positions");
  const [resetKey,  setResetKey]  = useState(0);

  // Update unrealized P&L whenever prices change
  const updatedPositions = positions.map(pos => ({
    ...pos,
    marketPx:   prices[pos.symbol] ?? pos.avgPx,
    unrealPnl:  (prices[pos.symbol] ?? pos.avgPx - pos.avgPx) * pos.qty,
  }));

  // Real P&L = unrealized sum across all positions
  const totalUnreal = updatedPositions.reduce((s,p) => s + p.unrealPnl, 0);
  const totalEquity = cash + updatedPositions.reduce((s,p) => s + Math.abs(p.qty)*p.marketPx, 0);
  const totalRealPnl = trades.reduce((s,t) => s + (t.pnl ?? 0), 0);
  const dayPnl = totalRealPnl + totalUnreal;

  // Persist state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(PAPER_KEY, JSON.stringify({ cash, positions, orders, trades, equity }));
    } catch {}
  }, [cash, positions, orders, trades, equity]);

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

  // Process pending orders when price crosses limit/stop
  useEffect(() => {
    setOrders(prev => prev.map(ord => {
      if (ord.status !== "pending") return ord;
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

      if (!fill) return ord;
      // Execute fill
      const fillPx = ord.limitPx ?? px;
      executeFill(ord, fillPx);
      return { ...ord, status:"filled", fillPx };
    }));
  }, [prices]);

  const executeFill = useCallback((ord: Order, fillPx: number) => {
    const side = ord.side;
    const qty  = side==="buy" ? ord.qty : -ord.qty;

    // Record trade
    const trade: Trade = { id:uid(), symbol:ord.symbol, side, qty:ord.qty, px:fillPx, ts:Date.now() };

    setPositions(prev => {
      const idx = prev.findIndex(p => p.symbol===ord.symbol);
      if (idx === -1) {
        // New position
        return [...prev, { symbol:ord.symbol, qty, avgPx:fillPx, unrealPnl:0, marketPx:fillPx }];
      }
      const pos = prev[idx];
      const newQty = pos.qty + qty;
      if (newQty === 0) {
        // Position closed
        const pnl = (fillPx - pos.avgPx) * pos.qty;
        trade.pnl = pnl;
        setTrades(t => [{ ...trade }, ...t]);
        setCash(c => c + Math.abs(pos.qty)*fillPx + (side==="sell"?-1:1)*0);
        // Reward WM$ for paper trading wins
        if (pnl > 0) earnWMS(25, `📈 Paper trade win on ${ord.symbol}`);
        return prev.filter((_,i)=>i!==idx);
      }
      // Partial / add to position
      const newAvg = (pos.avgPx*pos.qty + fillPx*qty) / newQty;
      return prev.map((p,i) => i===idx ? { ...p, qty:newQty, avgPx:Math.abs(newAvg) } : p);
    });

    setCash(c => c - (side==="buy"?1:-1) * ord.qty * fillPx);
    if (!trade.pnl) setTrades(t => [trade, ...t]);
  }, []);

  const handleOrder = (ord: Order) => {
    setOrders(prev => [ord, ...prev]);
  };

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
    setEquity([{ ts:Date.now(), equity:STARTING_CASH }]);
    setResetKey(k=>k+1);
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
              const px  = prices[sym] ?? info.base;
              const chg = ((px - info.base)/info.base)*100;
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
