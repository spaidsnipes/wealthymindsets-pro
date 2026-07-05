"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart2, ScanLine, Map, Newspaper, GraduationCap,
  Users, ShoppingBag, Globe, User, ChevronLeft, ChevronRight,
  Bell, Settings, Search, Zap, BookOpen, FlaskConical, TrendingUp,
  X, Check, Moon, Sun, Volume2, VolumeX, Eye, EyeOff,
  Palette, Monitor, Keyboard, Shield, RefreshCw, Trash2, Radio, Copy, Heart,
  Tv, Handshake,
} from "lucide-react";
import { WMLogo } from "@/components/ui/WMLogo";
import { TickerTape } from "@/components/layout/TickerTape";
import { SpadeBotButton } from "@/components/layout/SpaidBotButton";
import { MusicPlayer } from "@/components/layout/MusicPlayer";
import { BrokerConnectPanel } from "@/components/broker/BrokerConnectPanel";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import { useAuth } from "@/contexts/AuthContext";
import { clsx } from "clsx";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { WMSBar } from "@/components/wms/WMSBar";

/* ── All searchable symbols ─────────────────────────────── */
const ALL_SYMBOLS = [
  // Futures
  { sym:"NQ1!",  label:"Nasdaq-100 Futures",         cat:"Futures", aliases:["nasdaq","nq","tech","mnq"] },
  { sym:"ES1!",  label:"S&P 500 Futures",            cat:"Futures", aliases:["sp500","es","mes","spy"] },
  { sym:"RTY1!", label:"Russell 2000 Futures",       cat:"Futures", aliases:["rty","russell","m2k"] },
  { sym:"YM1!",  label:"Dow Jones Futures",          cat:"Futures", aliases:["ym","dow","us30","mym"] },
  { sym:"GC1!",  label:"Gold Futures",               cat:"Futures", aliases:["gold","xauusd","xau","mgc"] },
  { sym:"CL1!",  label:"Crude Oil WTI Futures",      cat:"Futures", aliases:["oil","crude","wti","mcl"] },
  { sym:"SI1!",  label:"Silver Futures",             cat:"Futures", aliases:["silver","xagusd","xag"] },
  { sym:"HG1!",  label:"Copper Futures",             cat:"Futures", aliases:["copper"] },
  { sym:"ZB1!",  label:"30-Year T-Bond Futures",     cat:"Futures", aliases:["bonds","treasury"] },
  { sym:"ZN1!",  label:"10-Year T-Note Futures",     cat:"Futures", aliases:["10yr","notes"] },
  { sym:"NG1!",  label:"Natural Gas Futures",        cat:"Futures", aliases:["natgas","natural gas"] },
  { sym:"6E1!",  label:"Euro FX Futures",            cat:"Futures", aliases:["euro","eur"] },
  { sym:"6J1!",  label:"Yen Futures",                cat:"Futures", aliases:["yen","jpy"] },
  { sym:"VX1!",  label:"VIX Futures",                cat:"Futures", aliases:["vix","volatility","fear"] },
  // Forex / Spot
  { sym:"EURUSD", label:"Euro / US Dollar",          cat:"Forex", aliases:["euro dollar","eur","6e"] },
  { sym:"GBPUSD", label:"British Pound / USD",       cat:"Forex", aliases:["cable","pound","gbp","sterling"] },
  { sym:"USDJPY", label:"US Dollar / Japanese Yen",  cat:"Forex", aliases:["dollar yen","jpy","yen"] },
  { sym:"XAUUSD", label:"Gold / US Dollar (Spot)",   cat:"Forex", aliases:["gold","xau","spot gold","gc1"] },
  { sym:"XAGUSD", label:"Silver / US Dollar (Spot)", cat:"Forex", aliases:["silver","xag","spot silver"] },
  { sym:"US30",   label:"Dow Jones Index (Cash)",    cat:"Forex", aliases:["dow","dji","dow jones","ym"] },
  { sym:"US500",  label:"S&P 500 Index (Cash)",      cat:"Forex", aliases:["spx","s&p","sp500","es"] },
  { sym:"US100",  label:"Nasdaq 100 Index (Cash)",   cat:"Forex", aliases:["nasdaq","ndx","nq","us100"] },
  { sym:"USDCAD", label:"US Dollar / Canadian Dollar",cat:"Forex", aliases:["loonie","cad"] },
  { sym:"AUDUSD", label:"Australian Dollar / USD",   cat:"Forex", aliases:["aussie","aud"] },
  { sym:"NZDUSD", label:"New Zealand Dollar / USD",  cat:"Forex", aliases:["kiwi","nzd"] },
  { sym:"USDCHF", label:"US Dollar / Swiss Franc",   cat:"Forex", aliases:["swissy","chf"] },
  { sym:"GBPJPY", label:"British Pound / Yen",       cat:"Forex", aliases:["guppy"] },
  { sym:"EURJPY", label:"Euro / Japanese Yen",       cat:"Forex", aliases:["ej"] },
  { sym:"USOIL",  label:"US Oil (WTI Spot)",         cat:"Forex", aliases:["oil","crude","wti"] },
  // Stocks
  { sym:"AAPL",  label:"Apple Inc.",                 cat:"Stock" },
  { sym:"TSLA",  label:"Tesla Inc.",                 cat:"Stock" },
  { sym:"NVDA",  label:"NVIDIA Corporation",         cat:"Stock" },
  { sym:"AMZN",  label:"Amazon.com Inc.",            cat:"Stock" },
  { sym:"META",  label:"Meta Platforms",             cat:"Stock" },
  { sym:"MSFT",  label:"Microsoft Corp.",            cat:"Stock" },
  { sym:"GOOG",  label:"Alphabet Inc.",              cat:"Stock" },
  { sym:"GOOGL", label:"Alphabet Inc. (A)",          cat:"Stock" },
  { sym:"AVGO",  label:"Broadcom Inc.",              cat:"Stock" },
  { sym:"AMD",   label:"Advanced Micro Devices",     cat:"Stock" },
  { sym:"INTC",  label:"Intel Corporation",          cat:"Stock" },
  { sym:"NFLX",  label:"Netflix Inc.",               cat:"Stock" },
  { sym:"JPM",   label:"JPMorgan Chase",             cat:"Stock" },
  { sym:"GS",    label:"Goldman Sachs",              cat:"Stock" },
  { sym:"V",     label:"Visa Inc.",                  cat:"Stock" },
  { sym:"MA",    label:"Mastercard",                 cat:"Stock" },
  { sym:"LLY",   label:"Eli Lilly",                  cat:"Stock" },
  { sym:"RIVN",  label:"Rivian Automotive",          cat:"Stock" },
  { sym:"PLTR",  label:"Palantir Technologies",      cat:"Stock" },
  { sym:"COIN",  label:"Coinbase Global",            cat:"Stock" },
  { sym:"HOOD",  label:"Robinhood Markets",          cat:"Stock" },
  { sym:"GME",   label:"GameStop Corp.",             cat:"Stock" },
  { sym:"AMC",   label:"AMC Entertainment",          cat:"Stock" },
  { sym:"MSTR",  label:"MicroStrategy",              cat:"Stock" },
  { sym:"ARM",   label:"ARM Holdings",               cat:"Stock" },
  { sym:"DJT",   label:"Trump Media & Technology",   cat:"Stock" },
  { sym:"SMCI",  label:"Super Micro Computer",       cat:"Stock" },
  { sym:"RKLB",  label:"Rocket Lab",                 cat:"Stock" },
  // ETFs
  { sym:"SPY",   label:"SPDR S&P 500 ETF",           cat:"ETF" },
  { sym:"QQQ",   label:"Invesco QQQ (Nasdaq 100)",   cat:"ETF" },
  { sym:"IWM",   label:"iShares Russell 2000 ETF",   cat:"ETF" },
  { sym:"GLD",   label:"SPDR Gold Shares",           cat:"ETF" },
  { sym:"SLV",   label:"iShares Silver Trust",       cat:"ETF" },
  { sym:"TLT",   label:"iShares 20+ Year T-Bond",    cat:"ETF" },
  { sym:"XLK",   label:"Technology Select SPDR",     cat:"ETF" },
  { sym:"XLF",   label:"Financial Select SPDR",      cat:"ETF" },
  { sym:"XLE",   label:"Energy Select SPDR",         cat:"ETF" },
  { sym:"TQQQ",  label:"ProShares UltraPro QQQ 3x",  cat:"ETF" },
  { sym:"SQQQ",  label:"ProShares UltraPro Sh QQQ",  cat:"ETF" },
  { sym:"SOXL",  label:"Direxion Semi Bull 3x",      cat:"ETF" },
  { sym:"SOXS",  label:"Direxion Semi Bear 3x",      cat:"ETF" },
  { sym:"UVXY",  label:"ProShares Ultra VIX",         cat:"ETF" },
  { sym:"VXX",   label:"iPath VIX Short-Term Futures",cat:"ETF" },
  // Crypto
  { sym:"BTCUSD", label:"Bitcoin / USD",             cat:"Crypto", aliases:["btc","bitcoin"] },
  { sym:"ETHUSD", label:"Ethereum / USD",            cat:"Crypto", aliases:["eth","ethereum"] },
  { sym:"SOLUSD", label:"Solana / USD",              cat:"Crypto", aliases:["sol","solana"] },
  { sym:"BNBUSD", label:"BNB / USD",                 cat:"Crypto", aliases:["bnb"] },
  { sym:"XRPUSD", label:"XRP / USD",                cat:"Crypto", aliases:["xrp","ripple"] },
  { sym:"DOGEUSD",label:"Dogecoin / USD",            cat:"Crypto", aliases:["doge","dogecoin"] },
  { sym:"ADAUSD", label:"Cardano / USD",             cat:"Crypto", aliases:["ada"] },
  { sym:"AVAXUSD",label:"Avalanche / USD",           cat:"Crypto", aliases:["avax"] },
  { sym:"PEPEUSD",label:"Pepe Coin / USD",           cat:"Crypto", aliases:["pepe","meme"] },
  { sym:"SHIBUSD",label:"Shiba Inu / USD",           cat:"Crypto", aliases:["shib","shiba"] },
  { sym:"WIFUSD", label:"dogwifhat / USD",           cat:"Crypto", aliases:["wif","dogwifhat"] },
  { sym:"BONKUSD",label:"Bonk / USD",                cat:"Crypto", aliases:["bonk"] },
];

/* ── Sample notifications ────────────────────────────────── */
const INITIAL_NOTIFS = [
  { id:1, read:false, time:"2m ago",  icon:"🔥", title:"NQ1! momentum surge",       body:"Aggressive buy prints at 21,850 — CLC setup forming on 5m chart." },
  { id:2, read:false, time:"8m ago",  icon:"⚠️", title:"Win rate alert",             body:"Your FOMO entries have a 22% win rate this week. Review your rules." },
  { id:3, read:false, time:"15m ago", icon:"📊", title:"Dark pool activity",         body:"Unusual block prints on NVDA — $480M swept above $875." },
  { id:4, read:true,  time:"1h ago",  icon:"🎯", title:"Strategy target hit",        body:"ES1! Wyckoff Spring target reached at 5,845 — +22 handles." },
  { id:5, read:true,  time:"2h ago",  icon:"📰", title:"Fed minutes released",       body:"FOMC minutes showed 2 members favoring rate cut — market reacting." },
  { id:6, read:true,  time:"4h ago",  icon:"💰", title:"Journal reminder",           body:"You logged 3 trades today. Add your lessons before market close." },
];

const CAT_COLOR: Record<string,string> = {
  Futures:"text-wm-gold",  Stock:"text-wm-blue",
  ETF:"text-wm-green",     Crypto:"text-wm-purple",
  Forex:"text-wm-text-muted",
};

const DEFAULT_QUICK = ["NQ1!","ES1!","BTC","AAPL","NVDA","TSLA","SPY","GC1!"];

/* ── Search Panel ────────────────────────────────────────── */
function SearchPanel({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const { setActiveSymbol } = useActiveSymbol();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live Finnhub search results
  const [liveResults, setLiveResults] = useState<{ sym: string; label: string; cat: string }[]>([]);
  const [searching, setSearching] = useState(false);

  const [quickSyms, setQuickSyms] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("wm_quick_syms") ?? "null") ?? DEFAULT_QUICK; } catch { return DEFAULT_QUICK; }
  });
  const [editingQuick, setEditingQuick] = useState(false);
  const [newQuickInput, setNewQuickInput] = useState("");

  const saveQuick = (syms: string[]) => {
    setQuickSyms(syms);
    localStorage.setItem("wm_quick_syms", JSON.stringify(syms));
  };
  const addQuick = (sym: string) => {
    const upper = sym.trim().toUpperCase();
    if (!upper || quickSyms.includes(upper)) return;
    saveQuick([...quickSyms, upper]);
    setNewQuickInput("");
  };
  const removeQuick = (sym: string) => saveQuick(quickSyms.filter(s => s !== sym));

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Local filtered results — matches symbol, label, and aliases
  const qLow = query.toLowerCase().replace(/[/\-_\s!]/g, "");
  const localResults = query.length < 1 ? [] : ALL_SYMBOLS.filter(s => {
    const symClean = s.sym.toLowerCase().replace(/[/\-_\s!]/g, "");
    return symClean.startsWith(qLow) ||
           symClean.includes(qLow) ||
           s.label.toLowerCase().includes(query.toLowerCase()) ||
           (s as typeof s & { aliases?: string[] }).aliases?.some(a => a.includes(query.toLowerCase()));
  }).sort((a, b) => {
    const aE = a.sym.toLowerCase().startsWith(qLow);
    const bE = b.sym.toLowerCase().startsWith(qLow);
    return (aE === bE) ? 0 : aE ? -1 : 1;
  }).slice(0, 10);

  // Debounced Finnhub live search for any symbol not in local list
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (query.length < 1) { setLiveResults([]); setSearching(false); return; }
    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/finnhub?q=${encodeURIComponent(query)}&type=search`, { cache: "no-store" });
        const json = await res.json();
        const localSymSet = new Set(localResults.map(s => s.sym));
        const live = (json.results ?? [])
          .filter((r: any) => !localSymSet.has(r.sym) && r.sym && r.name)
          .slice(0, 12)
          .map((r: any) => ({
            sym:   r.sym,
            label: r.name,
            cat:   r.type === "Crypto" ? "Crypto" : r.type === "ETF" ? "ETF" :
                   r.type === "Forex" ? "Forex" : "Stock",
          }));
        setLiveResults(live);
      } catch { setLiveResults([]); }
      finally { setSearching(false); }
    }, 250);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const allResults = [...localResults, ...liveResults];

  const pick = useCallback((sym: string) => {
    setActiveSymbol(sym.toUpperCase());
    router.push("/charts");
    onClose();
  }, [setActiveSymbol, router, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // Priority: local results → live Finnhub → raw typed symbol
      const target = allResults[0]?.sym ?? (query.trim().toUpperCase() || null);
      if (target) pick(target);
    }
    if (e.key === "Escape") onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-start justify-center pt-20"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, y: -10 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-xl bg-wm-dark border border-wm-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-wm-border">
          <Search size={16} className="text-wm-text-dim shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search any symbol — NQ1!, AAPL, RIVN, BTC, EUR/USD…"
            className="flex-1 bg-transparent text-sm text-wm-text outline-none placeholder-wm-text-dim"
          />
          {searching && <div className="w-3 h-3 rounded-full border-2 border-wm-blue border-t-transparent animate-spin shrink-0" />}
          {query && !searching && (
            <button onClick={() => { setQuery(""); setLiveResults([]); }} className="text-wm-text-dim hover:text-wm-text">
              <X size={14} />
            </button>
          )}
          <kbd className="text-[10px] text-wm-text-dim border border-wm-border rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        {/* Results */}
        {allResults.length > 0 && (
          <div className="max-h-80 overflow-y-auto">
            {allResults.map((s, i) => (
              <button
                key={`${s.sym}-${i}`}
                onClick={() => pick(s.sym)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-wm-surface transition-colors text-left"
              >
                <div className="w-10 h-8 rounded-lg bg-wm-surface flex items-center justify-center text-[10px] font-black text-wm-text border border-wm-border shrink-0">
                  {s.sym.slice(0, 4)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-wm-text">{s.sym}</div>
                  <div className="text-[10px] text-wm-text-dim truncate">{s.label}</div>
                </div>
                <span className={clsx("text-[10px] font-semibold", CAT_COLOR[s.cat] ?? "text-wm-text-muted")}>
                  {s.cat}
                </span>
              </button>
            ))}
          </div>
        )}

        {query.length > 0 && allResults.length === 0 && !searching && (
          <div className="px-4 py-5 text-center">
            <div className="text-wm-text-dim text-sm mb-1">No results for &ldquo;{query}&rdquo;</div>
            <button
              onClick={() => pick(query.trim().toUpperCase())}
              className="mt-1 text-wm-blue text-xs hover:underline"
            >
              Open &ldquo;{query.trim().toUpperCase()}&rdquo; anyway →
            </button>
          </div>
        )}

        {!query && (
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] text-wm-text-dim uppercase tracking-wider">Quick access</div>
              <button onClick={() => setEditingQuick(v => !v)}
                className="text-[10px] text-wm-blue hover:text-wm-blue/80 transition-colors">
                {editingQuick ? "Done" : "✎ Edit"}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickSyms.map(s => (
                <div key={s} className="relative group">
                  <button onClick={() => editingQuick ? removeQuick(s) : pick(s)}
                    className={`px-2.5 py-1 rounded-lg bg-wm-surface border text-xs font-bold transition-all ${
                      editingQuick
                        ? "border-wm-red/50 text-wm-red hover:bg-wm-red/10"
                        : "border-wm-border text-wm-text hover:border-wm-green/50 hover:text-wm-green"
                    }`}>
                    {editingQuick ? "✕ " : ""}{s}
                  </button>
                </div>
              ))}
              {editingQuick && (
                <div className="flex items-center gap-1">
                  <input
                    value={newQuickInput}
                    onChange={e => setNewQuickInput(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === "Enter") addQuick(newQuickInput); }}
                    placeholder="+ Add…"
                    className="w-20 px-2 py-0.5 rounded-lg bg-wm-surface border border-wm-border text-xs text-wm-text outline-none focus:border-wm-blue/50 placeholder-wm-text-dim"
                  />
                  <button onClick={() => addQuick(newQuickInput)}
                    className="text-wm-green text-xs font-bold hover:text-wm-green/80">
                    ✓
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="px-4 py-2 border-t border-wm-border text-[10px] text-wm-text-dim flex items-center justify-between">
          <span>Search any stock, ETF, future, crypto, or forex worldwide</span>
          <span>
            <kbd className="border border-wm-border rounded px-1">↵</kbd> open &nbsp;
            <kbd className="border border-wm-border rounded px-1">ESC</kbd> close
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Notifications Panel ─────────────────────────────────── */
function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const [notifs, setNotifs] = useState(INITIAL_NOTIFS);
  const unread = notifs.filter(n => !n.read).length;

  const markAll = () => setNotifs(n => n.map(x => ({ ...x, read: true })));
  const remove  = (id: number) => setNotifs(n => n.filter(x => x.id !== id));
  const markOne = (id: number) => setNotifs(n => n.map(x => x.id === id ? { ...x, read: true } : x));

  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-[200] flex items-start justify-end"
      style={{ background:"rgba(0,0,0,0.55)", backdropFilter:"blur(3px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
        transition={{ type:"spring", stiffness:300, damping:30 }}
        className="relative h-full flex flex-col bg-wm-dark border-l border-wm-border shadow-2xl"
        style={{ width: 380 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-wm-border shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-wm-gold" />
              <span className="font-black text-wm-text text-sm">Notifications</span>
              {unread > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-wm-red/20 text-wm-red border border-wm-red/40">
                  {unread} NEW
                </span>
              )}
            </div>
            <div className="text-[10px] text-wm-text-dim mt-0.5">Market alerts, strategy coaching, reminders</div>
          </div>
          <div className="flex items-center gap-1">
            {unread > 0 && (
              <button onClick={markAll}
                className="text-[10px] text-wm-blue hover:text-wm-text transition-colors px-2 py-1 rounded hover:bg-wm-surface">
                Mark all read
              </button>
            )}
            <button onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-wm-surface text-wm-text-muted hover:text-wm-text transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {notifs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-wm-text-muted gap-3">
              <Bell size={32} className="opacity-20" />
              <span className="text-sm">All caught up!</span>
            </div>
          )}
          {notifs.map(n => (
            <div
              key={n.id}
              onClick={() => markOne(n.id)}
              className={clsx(
                "flex items-start gap-3 px-4 py-3 border-b border-wm-border/40 cursor-pointer transition-colors",
                n.read ? "hover:bg-wm-surface/30" : "bg-wm-surface/50 hover:bg-wm-surface"
              )}
            >
              <span className="text-xl shrink-0 mt-0.5">{n.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={clsx("text-xs font-bold", n.read ? "text-wm-text-muted" : "text-wm-text")}>{n.title}</span>
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-wm-blue shrink-0" />}
                </div>
                <div className="text-[11px] text-wm-text-dim leading-relaxed">{n.body}</div>
                <div className="text-[10px] text-wm-text-dim mt-1">{n.time}</div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); remove(n.id); }}
                className="text-wm-text-dim hover:text-wm-red transition-colors shrink-0 mt-1"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-wm-border shrink-0 text-[10px] text-wm-text-dim text-center">
          Alerts are generated from your strategy win rate and market data
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Sign-out helper (needs auth context inside component) ── */
function SignOutButton({ onClose }: { onClose: () => void }) {
  const { signOut } = useAuth();
  const [busy, setBusy] = React.useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await signOut();
        onClose();
      }}
      className="w-full py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
      style={{ background: "rgba(255,77,106,0.12)", border: "1px solid rgba(255,77,106,0.3)", color: "#FF4D6A" }}
    >
      {busy ? "Signing out…" : "Sign Out"}
    </button>
  );
}

/* ── Settings Panel ──────────────────────────────────────── */
function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [tab,       setTab]       = useState<"display"|"trading"|"alerts"|"account">("display");
  const [darkMode,  setDarkMode]  = useState(true);
  const [soundOn,   setSoundOn]   = useState(true);
  const [showPnl,   setShowPnl]   = useState(true);
  const [defaultTF, setDefaultTF] = useState("5m");
  const [defSym,    setDefSym]    = useState("NQ1!");
  const [priceAlert,  setPriceAlert]   = useState(true);
  const [newsAlert,   setNewsAlert]   = useState(true);
  const [wrAlert,     setWrAlert]     = useState(true);
  const [autoSave,    setAutoSave]    = useState(true);
  const [paperWarn,   setPaperWarn]   = useState(true);
  const [confirmOrders,setConfirmOrders] = useState(true);
  const [overtrading, setOvertrading] = useState(true);
  const [fomoDetect,  setFomoDetect]  = useState(true);
  const [inAppNotifs, setInAppNotifs] = useState(true);
  const [twoFactor,   setTwoFactor]   = useState(false);
  const [chartTheme,  setChartTheme]  = useState("green-red");
  const [fontSize,    setFontSize]    = useState("medium");

  // Load persisted settings on mount so the panel reflects saved state
  useEffect(() => {
    try {
      const raw = localStorage.getItem("wm_settings");
      if (!raw) return;
      const s = JSON.parse(raw);
      if (typeof s.darkMode === "boolean") setDarkMode(s.darkMode);
      if (typeof s.soundOn === "boolean") setSoundOn(s.soundOn);
      if (typeof s.showPnl === "boolean") setShowPnl(s.showPnl);
      if (s.defaultTF) setDefaultTF(s.defaultTF);
      if (s.defSym) setDefSym(s.defSym);
      if (s.chartTheme) setChartTheme(s.chartTheme);
      if (s.fontSize) setFontSize(s.fontSize);
      if (typeof s.priceAlert === "boolean") setPriceAlert(s.priceAlert);
      if (typeof s.newsAlert === "boolean") setNewsAlert(s.newsAlert);
      if (typeof s.wrAlert === "boolean") setWrAlert(s.wrAlert);
      if (typeof s.autoSave === "boolean") setAutoSave(s.autoSave);
      if (typeof s.paperWarn === "boolean") setPaperWarn(s.paperWarn);
      if (typeof s.confirmOrders === "boolean") setConfirmOrders(s.confirmOrders);
      if (typeof s.overtrading === "boolean") setOvertrading(s.overtrading);
      if (typeof s.fomoDetect === "boolean") setFomoDetect(s.fomoDetect);
      if (typeof s.inAppNotifs === "boolean") setInAppNotifs(s.inAppNotifs);
      if (typeof s.twoFactor === "boolean") setTwoFactor(s.twoFactor);
    } catch {}
  }, []);

  // Apply font size live to the document so the choice has visible effect
  useEffect(() => {
    const px = fontSize === "small" ? "14px" : fontSize === "large" ? "18px" : "16px";
    document.documentElement.style.fontSize = px;
  }, [fontSize]);

  const Toggle = ({ on, set }: { on: boolean; set: (v:boolean)=>void }) => (
    <button
      onClick={() => set(!on)}
      className={clsx(
        "relative inline-flex h-5 w-9 rounded-full transition-colors shrink-0",
        on ? "bg-wm-green" : "bg-wm-surface border border-wm-border"
      )}
    >
      <span className={clsx(
        "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
        on ? "translate-x-4" : "translate-x-0"
      )} />
    </button>
  );

  const Row = ({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between py-3 border-b border-wm-border/40">
      <div>
        <div className="text-xs font-semibold text-wm-text">{label}</div>
        {sub && <div className="text-[10px] text-wm-text-dim mt-0.5">{sub}</div>}
      </div>
      {children}
    </div>
  );

  const TABS = [
    { id:"display" as const, label:"Display", icon:Monitor },
    { id:"trading" as const, label:"Trading", icon:BarChart2 },
    { id:"alerts"  as const, label:"Alerts",  icon:Bell },
    { id:"account" as const, label:"Account", icon:Shield },
  ];

  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-[200] flex items-start justify-end"
      style={{ background:"rgba(0,0,0,0.55)", backdropFilter:"blur(3px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}
        transition={{ type:"spring", stiffness:300, damping:30 }}
        className="relative h-full flex flex-col bg-wm-dark border-l border-wm-border shadow-2xl"
        style={{ width: 420 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-wm-border shrink-0">
          <div className="flex items-center gap-2">
            <Settings size={15} className="text-wm-blue" />
            <span className="font-black text-wm-text text-sm">Settings</span>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-wm-surface text-wm-text-muted hover:text-wm-text transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-wm-border shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={clsx(
                "flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-all",
                tab === t.id ? "text-wm-blue border-b-2 border-wm-blue" : "text-wm-text-muted hover:text-wm-text"
              )}>
              <t.icon size={13} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-2">
          {tab === "display" && (
            <div>
              <Row label="Dark Mode" sub="Premium dark theme for night trading">
                <Toggle on={darkMode} set={setDarkMode} />
              </Row>
              <Row label="Show P&L in header" sub="Display live profit/loss in the top bar">
                <Toggle on={showPnl} set={setShowPnl} />
              </Row>
              <Row label="Sound Effects" sub="Tick sounds, alert chimes, order fills">
                <Toggle on={soundOn} set={setSoundOn} />
              </Row>
              <Row label="Chart Theme" sub="Candle color scheme">
                <select value={chartTheme} onChange={e => setChartTheme(e.target.value)}
                  className="bg-wm-surface border border-wm-border rounded-lg px-2 py-1 text-xs text-wm-text outline-none">
                  <option value="green-red">Green/Red (Default)</option>
                  <option value="blue-purple">Royal Blue/Purple</option>
                  <option value="blue-orange">Blue/Yellow</option>
                  <option value="mono">Monochrome</option>
                </select>
              </Row>
              <Row label="Font Size" sub="Chart label and UI text size">
                <select value={fontSize} onChange={e => setFontSize(e.target.value)}
                  className="bg-wm-surface border border-wm-border rounded-lg px-2 py-1 text-xs text-wm-text outline-none">
                  <option value="small">Small</option>
                  <option value="medium">Medium (Default)</option>
                  <option value="large">Large</option>
                </select>
              </Row>
            </div>
          )}

          {tab === "trading" && (
            <div>
              <Row label="Default Symbol" sub="Symbol loaded when opening Charts — type any ticker">
                <>
                  <input
                    list="wm-defsym-list"
                    value={defSym}
                    onChange={e => setDefSym(e.target.value.toUpperCase())}
                    placeholder="Search symbol…"
                    className="w-28 bg-wm-surface border border-wm-border rounded-lg px-2 py-1 text-xs text-wm-text outline-none focus:border-wm-blue uppercase" />
                  <datalist id="wm-defsym-list">
                    {["NQ1!","ES1!","BTC","ETH","AAPL","SPY","GC1!","TSLA","NVDA","MSFT","QQQ","EUR/USD","XAU/USD"].map(s => <option key={s} value={s} />)}
                  </datalist>
                </>
              </Row>
              <Row label="Default Timeframe" sub="Timeframe loaded on chart open">
                <select
                  value={defaultTF} onChange={e => setDefaultTF(e.target.value)}
                  className="bg-wm-surface border border-wm-border rounded-lg px-2 py-1 text-xs text-wm-text outline-none">
                  <option value="last">Last Used</option>
                  <option value="none">None</option>
                  {["1t","5t","1m","3m","5m","15m","1h","4h","D"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Row>
              <Row label="Auto-save Journal" sub="Prompt to log trades when session ends">
                <Toggle on={autoSave} set={setAutoSave} />
              </Row>
              <Row label="Paper Trade Warnings" sub="Alert before placing paper trade orders">
                <Toggle on={paperWarn} set={setPaperWarn} />
              </Row>
              <Row label="Confirm Order Submissions" sub="Require confirmation before submitting">
                <Toggle on={confirmOrders} set={setConfirmOrders} />
              </Row>
            </div>
          )}

          {tab === "alerts" && (
            <div>
              <div className="text-[10px] text-wm-text-dim uppercase tracking-wider mb-3 mt-1">Market Alerts</div>
              <Row label="Price Level Alerts" sub="Notify when price reaches your set levels">
                <Toggle on={priceAlert} set={setPriceAlert} />
              </Row>
              <Row label="News & Events" sub="Breaking news that may impact your positions">
                <Toggle on={newsAlert} set={setNewsAlert} />
              </Row>
              <div className="text-[10px] text-wm-text-dim uppercase tracking-wider mb-3 mt-4">AI Coaching Alerts</div>
              <Row label="Win Rate Warning" sub="Alert when strategy win rate drops below 40%">
                <Toggle on={wrAlert} set={setWrAlert} />
              </Row>
              <Row label="Overtrading Alert" sub="Warn when daily trade count exceeds your limit">
                <Toggle on={overtrading} set={setOvertrading} />
              </Row>
              <Row label="FOMO Entry Detection" sub="Flag trades that match past losing patterns">
                <Toggle on={fomoDetect} set={setFomoDetect} />
              </Row>
              <div className="text-[10px] text-wm-text-dim uppercase tracking-wider mb-3 mt-4">Delivery</div>
              <Row label="In-App Notifications" sub="Show alerts in the notification panel">
                <Toggle on={inAppNotifs} set={setInAppNotifs} />
              </Row>
              <Row label="Sound Chime" sub="Play sound when alert fires">
                <Toggle on={soundOn} set={setSoundOn} />
              </Row>
            </div>
          )}

          {tab === "account" && (
            <div>
              <Row label="Subscription" sub="WealthyMindsets PRO — Active">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-wm-gold/20 text-wm-gold border border-wm-gold/40">PRO</span>
              </Row>
              <Row label="Data Source" sub="Current market data provider">
                <span className="text-xs text-wm-blue font-semibold">Finnhub + Polygon.io</span>
              </Row>
              <Row label="Two-Factor Auth" sub="Protect your account with 2FA">
                <Toggle on={twoFactor} set={setTwoFactor} />
              </Row>
              <Row label="Export All Data" sub="Download journal, trades, settings as JSON">
                <button
                  onClick={() => {
                    const data = {
                      journal: JSON.parse(localStorage.getItem("wm_journal_entries") ?? "[]"),
                      paper:   JSON.parse(localStorage.getItem("wm_paper_state") ?? "{}"),
                      profile: JSON.parse(localStorage.getItem("wm-profile") ?? "{}"),
                      exportedAt: new Date().toISOString(),
                    };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                    const url  = URL.createObjectURL(blob);
                    const a    = document.createElement("a");
                    a.href = url; a.download = "wealthymindsets-export.json"; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-wm-border text-wm-text-muted hover:text-wm-text transition-colors">
                  Export
                </button>
              </Row>
              <Row label="Clear Cache" sub="Reset stored chart data and preferences">
                <button
                  onClick={() => {
                    const keep = ["wm-profile","wm-profile-avatar","wm-profile-bg","wm-radio-liked","wm_journal_entries","wm_paper_state","wm_quick_syms"];
                    Object.keys(localStorage).forEach(k => { if (!keep.includes(k)) localStorage.removeItem(k); });
                    window.location.reload();
                  }}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-wm-border text-wm-red/70 hover:text-wm-red transition-colors">
                  <Trash2 size={10} /> Clear
                </button>
              </Row>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-wm-border shrink-0 space-y-2">
          <button
            onClick={() => {
              localStorage.setItem("wm_settings", JSON.stringify({
                darkMode, soundOn, showPnl, defaultTF, defSym, chartTheme, fontSize,
                priceAlert, newsAlert, wrAlert, autoSave, paperWarn,
                confirmOrders, overtrading, fomoDetect, inAppNotifs, twoFactor,
              }));
              window.dispatchEvent(new CustomEvent("wm-settings-changed"));
              onClose();
            }}
            className="w-full py-2 rounded-xl text-sm font-bold text-wm-black transition-all hover:opacity-90"
            style={{ background:"linear-gradient(135deg,#00D4AA,#4FA3E0)" }}
          >
            Save Settings
          </button>
          <SignOutButton onClose={onClose} />
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Nav items ──────────────────────────────────────────── */
const NAV_TOP = [
  { href: "/charts",      icon: BarChart2,     label: "Charts"     },
  { href: "/heatmaps",    icon: Map,           label: "Heatmaps"   },
  { href: "/scanner",     icon: ScanLine,      label: "Scanner"    },
  { href: "/news",        icon: Newspaper,     label: "News"       },
  { href: "/education",   icon: GraduationCap, label: "Education"  },
  { href: "/journal",     icon: BookOpen,      label: "Journal"    },
  { href: "/paper",         icon: TrendingUp,    label: "Paper Trade"  },
  { href: "/copy-trading",  icon: Copy,          label: "Copy Trading" },
  { href: "/backtesting",   icon: FlaskConical,  label: "Backtest"     },
  { href: "/ai-bot",      icon: Zap,           label: "AI Bot"     },
];
const NAV_BOTTOM = [
  { href: "/morning-prep", icon: Sun,           label: "Morning Prep" },
  { href: "/lounge",       icon: Users,         label: "Lounge"       },
  { href: "/tv",           icon: Tv,            label: "WM TV"        },
  { href: "/radio",        icon: Radio,         label: "WM Radio"     },
  { href: "/creator",      icon: Globe,         label: "Creator"      },
  { href: "/partnerships", icon: Handshake,     label: "Partnerships" },
  { href: "/shop",         icon: ShoppingBag,   label: "Shop"         },
  { href: "/profile",      icon: User,          label: "Profile"      },
];
/* Legacy — kept for any code that may reference NAV_ITEMS */
const NAV_ITEMS = [
  ...NAV_TOP,
  ...NAV_BOTTOM,
  { href: "/veddbuild",   icon: Globe,         label: "VeddBuild"  },
];

/* ── Main Layout ─────────────────────────────────────────── */
/* ── Header live P&L badge ───────────────────────────────── */
function HeaderPnL() {
  const [show, setShow] = useState(false);
  const [pnl,  setPnl]  = useState<number | null>(null);

  useEffect(() => {
    const read = () => {
      try {
        const s = JSON.parse(localStorage.getItem("wm_settings") || "{}");
        // showPnl defaults to true in the panel; treat missing as on
        setShow(s.showPnl === undefined ? true : !!s.showPnl);
        const paper = JSON.parse(localStorage.getItem("wm_paper_state") || "null");
        if (paper && Array.isArray(paper.trades)) {
          const realized = paper.trades.reduce(
            (acc: number, t: { pnl?: number }) => acc + (t.pnl ?? 0), 0);
          setPnl(realized);
        } else { setPnl(null); }
      } catch { setShow(false); }
    };
    read();
    window.addEventListener("wm-settings-changed", read);
    const iv = setInterval(read, 4000);
    return () => { window.removeEventListener("wm-settings-changed", read); clearInterval(iv); };
  }, []);

  if (!show) return null;
  const val = pnl ?? 0;
  const up = val >= 0;
  return (
    <div
      className="flex items-center gap-1 px-2 py-0.5 rounded-lg border mr-1"
      style={{ borderColor: up ? "rgba(0,212,170,0.4)" : "rgba(255,77,77,0.4)" }}
      title="Realized paper-trading P&L"
    >
      <span className="text-[9px] text-wm-text-dim font-semibold">P&L</span>
      <span className={clsx("text-[11px] font-bold font-mono", up ? "text-wm-green" : "text-wm-red")}>
        {up ? "+" : "-"}${Math.abs(val).toLocaleString("en-US", { maximumFractionDigits: 2 })}
      </span>
    </div>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [brokerOpen,    setBrokerOpen]    = useState(false);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [notifsOpen,    setNotifsOpen]    = useState(false);
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [profileOpen,   setProfileOpen]   = useState(false);
  const [mounted,       setMounted]       = useState(false);
  const pathname = usePathname();
  const router   = useRouter();
  const { user, signOut } = useAuth();

  const unreadCount = INITIAL_NOTIFS.filter(n => !n.read).length;

  React.useEffect(() => { setMounted(true); }, []);

  // ── Global settings applier ─────────────────────────────────
  // Reads wm_settings and applies app-wide visual settings (light/dark
  // theme + base font size) on mount and whenever Settings is saved.
  useEffect(() => {
    const apply = () => {
      try {
        const raw = localStorage.getItem("wm_settings");
        const s = raw ? JSON.parse(raw) : {};
        // Dark mode: when explicitly false → light theme class on <html>
        const dark = s.darkMode !== false;
        document.documentElement.classList.toggle("wm-light", !dark);
        // Base font size
        const fs = s.fontSize === "small" ? "14px" : s.fontSize === "large" ? "18px" : "16px";
        document.documentElement.style.fontSize = fs;
      } catch {}
    };
    apply();
    window.addEventListener("wm-settings-changed", apply);
    return () => window.removeEventListener("wm-settings-changed", apply);
  }, []);

  // Keyboard shortcut: Ctrl+K / Cmd+K → open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setNotifsOpen(false);
        setSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Skip shell on auth pages — MUST be after all hooks to keep hook order stable
  const PUBLIC_AUTH_PATHS = ["/login", "/signup"];
  if (PUBLIC_AUTH_PATHS.some(p => pathname.startsWith(p))) {
    return <>{children}</>;
  }

  return (
    <div
      style={{ display: "flex", flexDirection: "column", width: "100vw", height: "100vh", overflow: "hidden" }}
      className="bg-wm-black"
    >
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header
        style={{ height: 44, flexShrink: 0 }}
        className="flex items-center px-3 border-b border-wm-border bg-wm-dark z-50"
      >
        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0" style={{ width: 72 }}>
          <WMLogo size={26} />
        </div>

        {/* Ticker tape */}
        <div className="flex-1 overflow-hidden mx-2">
          <TickerTape />
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Live P&L (toggled by Settings → Show P&L in header) */}
          <HeaderPnL />

          {/* Search — opens modal */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-wm-surface text-wm-text-muted hover:text-wm-text transition-colors group"
            title="Search symbols (Ctrl+K)"
          >
            <Search size={14} />
            <span className="text-[10px] hidden group-hover:inline text-wm-text-dim">⌘K</span>
          </button>

          {/* Notifications */}
          <button
            onClick={() => { setNotifsOpen(true); setSettingsOpen(false); }}
            className="relative p-1.5 rounded hover:bg-wm-surface text-wm-text-muted hover:text-wm-text transition-colors"
            title="Notifications"
          >
            <Bell size={14} />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-wm-red rounded-full ring-1 ring-wm-dark" />
            )}
          </button>

          {/* Settings */}
          <button
            onClick={() => { setSettingsOpen(true); setNotifsOpen(false); }}
            className="p-1.5 rounded hover:bg-wm-surface text-wm-text-muted hover:text-wm-text transition-colors"
            title="Settings"
          >
            <Settings size={14} />
          </button>

          {/* WM$ balance */}
          <WMSBar />

          {/* PRO badge */}
          <div className="ml-1 flex items-center gap-1 bg-gradient-to-r from-wm-gold/25 to-wm-gold/10 border border-wm-gold/40 rounded-full px-2.5 py-0.5">
            <Zap size={10} className="text-wm-gold fill-wm-gold" />
            <span className="text-[10px] font-bold text-wm-gold tracking-wide">PRO</span>
          </div>

          {/* User avatar — click to open dropdown */}
          <div className="relative ml-2">
            <button
              onClick={() => setProfileOpen(o => !o)}
              className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-wm-green/30 hover:ring-wm-green/60 transition-all shrink-0"
              title={user?.displayName ?? "Profile"}
            >
              {user?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-wm-green to-wm-blue flex items-center justify-center text-[11px] font-black text-wm-black">
                  {user?.displayName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "W"}
                </div>
              )}
            </button>

            {/* Dropdown */}
            {profileOpen && (
              <>
                {/* backdrop */}
                <div className="fixed inset-0 z-[149]" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-9 z-[150] w-52 rounded-xl border border-wm-border bg-wm-dark shadow-2xl overflow-hidden"
                  style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
                  {/* User info */}
                  <div className="px-3 py-3 border-b border-wm-border/60">
                    <div className="text-xs font-bold text-wm-text truncate">{user?.displayName ?? "Guest"}</div>
                    <div className="text-[10px] text-wm-text-dim truncate">{user?.email ?? ""}</div>
                  </div>
                  {/* Menu items */}
                  {[
                    { label: "My Profile",  icon: "👤", action: () => { router.push("/profile"); setProfileOpen(false); } },
                    { label: "Settings",    icon: "⚙️", action: () => { setSettingsOpen(true); setProfileOpen(false); } },
                  ].map(item => (
                    <button key={item.label} onClick={item.action}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-wm-text-muted hover:bg-wm-surface hover:text-wm-text transition-colors text-left">
                      <span>{item.icon}</span>{item.label}
                    </button>
                  ))}
                  <div className="border-t border-wm-border/60 mt-1">
                    <button
                      onClick={async () => { setProfileOpen(false); await signOut(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold transition-colors text-left"
                      style={{ color: "#FF4D6A" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,77,106,0.08)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <span>🚪</span> Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Body row (sidebar + content) ───────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0, height: 0 }}>
        {/* MooMoo-style 72px icon+label sidebar */}
        <aside style={{
          width: 72, flexShrink: 0,
          background: "#0D0E14",
          borderRight: "1px solid #1E2030",
          display: "flex", flexDirection: "column",
          zIndex: 40, overflow: "hidden",
        }}>
          {/* Top nav items */}
          <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none", paddingTop: 4 }}>
            {NAV_TOP.map(({ href, icon: Icon, label }) => {
              const active = pathname.startsWith(href);
              return (
                <Link key={href} href={href} title={label}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 3, height: 58, cursor: "pointer", textDecoration: "none",
                    background: active ? "rgba(255,140,0,0.08)" : "transparent",
                    borderLeft: active ? "2px solid #FF8C00" : "2px solid transparent",
                    transition: "background 0.12s",
                    position: "relative",
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                >
                  <Icon size={18} style={{ color: active ? "#FF8C00" : "#8B8FA8", flexShrink: 0 }} />
                  <span style={{
                    fontSize: 9, fontWeight: active ? 600 : 400,
                    color: active ? "#E2E8F0" : "#8B8FA8",
                    textAlign: "center", lineHeight: 1.2, maxWidth: 62,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    letterSpacing: "0.01em",
                  }}>
                    {label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom nav items */}
          <div style={{ borderTop: "1px solid #1E2030", paddingBottom: 4 }}>
            {NAV_BOTTOM.map(({ href, icon: Icon, label }) => {
              const active = pathname.startsWith(href);
              return (
                <Link key={href} href={href} title={label}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 3, height: 54, cursor: "pointer", textDecoration: "none",
                    background: active ? "rgba(255,140,0,0.08)" : "transparent",
                    borderLeft: active ? "2px solid #FF8C00" : "2px solid transparent",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                >
                  <Icon size={18} style={{ color: active ? "#FF8C00" : "#8B8FA8", flexShrink: 0 }} />
                  <span style={{
                    fontSize: 9, fontWeight: active ? 600 : 400,
                    color: active ? "#E2E8F0" : "#8B8FA8",
                    textAlign: "center", lineHeight: 1.2,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    maxWidth: 62,
                  }}>
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflow: "hidden", minWidth: 0, position: "relative", height: "100%" }}>
          {mounted ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                style={{ position: "absolute", inset: 0 }}
              >
                <ErrorBoundary>{children}</ErrorBoundary>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div style={{ position: "absolute", inset: 0 }}><ErrorBoundary>{children}</ErrorBoundary></div>
          )}
        </main>
      </div>

      {/* ── Overlays ─────────────────────────────────────────── */}
      {mounted && (
        <AnimatePresence>
          {searchOpen   && <SearchPanel        key="search"   onClose={() => setSearchOpen(false)} />}
          {notifsOpen   && <NotificationsPanel key="notifs"   onClose={() => setNotifsOpen(false)} />}
          {settingsOpen && <SettingsPanel      key="settings" onClose={() => setSettingsOpen(false)} />}
          {brokerOpen   && <BrokerConnectPanel key="broker"   onClose={() => setBrokerOpen(false)} />}
        </AnimatePresence>
      )}

      {/* ── Persistent Music Player bar ─────────────────────── */}
      <MusicPlayer />

      {/* SpaidBot floating button */}
      <SpadeBotButton />

    </div>
  );
}
