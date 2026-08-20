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
  Tv, Handshake, Crosshair,
} from "lucide-react";
import { WMLogo } from "@/components/ui/WMLogo";
import WmWordmark from "@/components/brand/WmWordmark";
import MobileSessionPill from "@/components/layout/MobileSessionPill";
import { ShellModalDrawer } from "@/components/layout/ShellModalDrawer";
import { useShellModalFocus } from "@/components/layout/useShellModalFocus";
import { TickerTape } from "@/components/layout/TickerTape";
import { SpadeBotButton } from "@/components/layout/SpaidBotButton";
import { MusicPlayer } from "@/components/layout/MusicPlayer";
import { BrokerConnectPanel } from "@/components/broker/BrokerConnectPanel";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import { useAuth } from "@/contexts/AuthContext";
import { clsx } from "clsx";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { WMSBar } from "@/components/wms/WMSBar";
import { isPublicAuthPath } from "@/lib/authRoutes";

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

const INITIAL_NOTIFS: Array<{ id:number; read:boolean; time:string; icon:string; title:string; body:string }> = [];

const CAT_COLOR: Record<string,string> = {
  Futures:"text-wm-gold",  Stock:"text-wm-blue",
  ETF:"text-wm-green",     Crypto:"text-wm-purple",
  Forex:"text-wm-text-muted",
};

const DEFAULT_QUICK = ["NQ1!","ES1!","BTC","AAPL","NVDA","TSLA","SPY","GC1!"];

/* ── Search Panel ────────────────────────────────────────── */
function SearchPanel({
  onClose,
  fallbackTriggerRef,
}: {
  onClose: () => void;
  fallbackTriggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [query, setQuery] = useState("");
  const { setActiveSymbol } = useActiveSymbol();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
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

  const onDialogKeyDown = useShellModalFocus({
    panelRef,
    initialFocusRef: inputRef,
    fallbackTriggerRef,
    onClose,
  });

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
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-start justify-center overflow-hidden p-4 sm:items-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        ref={panelRef}
        id="wm-symbol-search-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wm-symbol-search-title"
        aria-describedby="wm-symbol-search-description"
        initial={{ scale: 0.95, y: -10 }} animate={{ scale: 1, y: 0 }}
        className="max-h-[calc(100dvh-32px)] w-full max-w-xl overflow-y-auto overscroll-contain rounded-2xl border border-wm-border bg-wm-dark shadow-2xl"
        onClick={e => e.stopPropagation()}
        onKeyDown={onDialogKeyDown}
      >
        <h2 id="wm-symbol-search-title" className="sr-only">Search symbols</h2>
        <p id="wm-symbol-search-description" className="sr-only">Search markets or manage browser quick access symbols.</p>
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-wm-border">
          <Search size={16} className="text-wm-text-dim shrink-0" />
          <label htmlFor="wm-symbol-search-input" className="sr-only">Search symbols</label>
          <input
            id="wm-symbol-search-input"
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search any symbol — NQ1!, AAPL, RIVN, BTC, EUR/USD…"
            className="flex-1 bg-transparent text-sm text-wm-text outline-none placeholder-wm-text-dim"
          />
          {searching && <div aria-hidden="true" className="w-3 h-3 rounded-full border-2 border-wm-blue border-t-transparent animate-spin shrink-0" />}
          {query && !searching && (
            <button type="button" aria-label="Clear symbol search" onClick={() => { setQuery(""); setLiveResults([]); }} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-wm-text-dim hover:bg-wm-surface hover:text-wm-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold">
              <X size={14} aria-hidden="true" />
            </button>
          )}
          <kbd className="text-[10px] text-wm-text-dim border border-wm-border rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div role="status" aria-live="polite" className="sr-only">
          {searching ? "Searching" : query ? `${allResults.length} result${allResults.length === 1 ? "" : "s"}` : "Quick access"}
        </div>

        {/* Results */}
        {allResults.length > 0 && (
          <div className="max-h-80 overflow-y-auto">
            {allResults.map((s, i) => (
              <button
                key={`${s.sym}-${i}`}
                onClick={() => pick(s.sym)}
                aria-label={`Open ${s.sym}, ${s.label}, ${s.cat}`}
                className="flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-wm-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-wm-gold"
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
              aria-label={`Open ${query.trim().toUpperCase()} as entered`}
              className="mt-1 inline-flex min-h-11 items-center rounded-lg px-3 text-xs text-wm-blue hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold"
            >
              Open &ldquo;{query.trim().toUpperCase()}&rdquo; anyway →
            </button>
          </div>
        )}

        {!query && (
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] text-wm-text-dim uppercase tracking-wider">Quick access</div>
              <button type="button" onClick={() => setEditingQuick(v => !v)}
                aria-label={editingQuick ? "Finish editing quick access" : "Edit quick access"}
                className="inline-flex min-h-11 items-center rounded-lg px-2 text-[10px] text-wm-blue transition-colors hover:text-wm-blue/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold">
                {editingQuick ? "Done" : "✎ Edit"}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickSyms.map(s => (
                <div key={s} className="relative group">
                  <button type="button" onClick={() => editingQuick ? removeQuick(s) : pick(s)}
                    aria-label={editingQuick ? `Remove ${s} from quick access` : `Open ${s}`}
                    className={`min-h-11 px-2.5 py-1 rounded-lg bg-wm-surface border text-xs font-bold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold ${
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
                    aria-label="Quick access symbol"
                    value={newQuickInput}
                    onChange={e => setNewQuickInput(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === "Enter") addQuick(newQuickInput); }}
                    placeholder="+ Add…"
                    className="h-11 w-24 px-2 py-0.5 rounded-lg bg-wm-surface border border-wm-border text-xs text-wm-text outline-none focus:border-wm-blue/50 placeholder-wm-text-dim"
                  />
                  <button type="button" onClick={() => addQuick(newQuickInput)}
                    disabled={!newQuickInput.trim() || quickSyms.includes(newQuickInput.trim().toUpperCase())}
                    aria-label="Add quick access symbol"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-xs font-bold text-wm-green hover:text-wm-green/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold disabled:cursor-not-allowed disabled:opacity-40">
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
function NotificationsPanel({
  onClose,
  fallbackTriggerRef,
}: {
  onClose: () => void;
  fallbackTriggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [notifs, setNotifs] = useState(INITIAL_NOTIFS);
  const unread = notifs.filter(n => !n.read).length;

  const markAll = () => setNotifs(n => n.map(x => ({ ...x, read: true })));
  const remove  = (id: number) => setNotifs(n => n.filter(x => x.id !== id));
  const markOne = (id: number) => setNotifs(n => n.map(x => x.id === id ? { ...x, read: true } : x));

  return (
    <ShellModalDrawer
      id="wm-notifications-drawer"
      titleId="wm-notifications-title"
      descriptionId="wm-notifications-description"
      title="Notifications"
      description="Market alerts, strategy coaching, reminders"
      closeLabel="Close notifications"
      width={380}
      onClose={onClose}
      fallbackTriggerRef={fallbackTriggerRef}
      titleIcon={<Bell size={14} className="text-wm-gold" aria-hidden="true" />}
      headerActions={unread > 0 ? (
        <button
          type="button"
          onClick={markAll}
          className="inline-flex min-h-11 items-center justify-center rounded px-2 text-[10px] text-wm-blue transition-colors hover:bg-wm-surface hover:text-wm-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold"
        >
          Mark all read
        </button>
      ) : undefined}
      footer={<p className="text-center text-[10px] text-wm-text-dim">Alerts are generated from your strategy win rate and market data</p>}
    >
      <div className="h-full">
        {notifs.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-wm-text-muted">
            <Bell size={32} className="opacity-20" aria-hidden="true" />
            <span className="text-sm">All caught up!</span>
          </div>
        )}
        {notifs.map(n => (
          <article
            key={n.id}
            className={clsx(
              "flex items-start gap-2 border-b border-wm-border/40 px-3 py-2 transition-colors",
              n.read ? "hover:bg-wm-surface/30" : "bg-wm-surface/50 hover:bg-wm-surface"
            )}
          >
            <button
              type="button"
              onClick={() => markOne(n.id)}
              aria-label={n.read ? `Notification: ${n.title}` : `Mark ${n.title} as read`}
              className="flex min-h-11 min-w-0 flex-1 items-start gap-3 rounded-lg p-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold"
            >
              <span className="mt-0.5 shrink-0 text-xl" aria-hidden="true">{n.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="mb-0.5 flex items-center gap-1.5">
                  <span className={clsx("text-xs font-bold", n.read ? "text-wm-text-muted" : "text-wm-text")}>{n.title}</span>
                  {!n.read && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-wm-blue" />}
                  <span className="sr-only">{n.read ? "Read" : "Unread"}</span>
                </span>
                <span className="block text-[11px] leading-relaxed text-wm-text-dim">{n.body}</span>
                <span className="mt-1 block text-[10px] text-wm-text-dim">{n.time}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => remove(n.id)}
              aria-label={`Dismiss notification: ${n.title}`}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-wm-text-dim transition-colors hover:bg-wm-surface hover:text-wm-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>
    </ShellModalDrawer>
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
      className="min-h-11 w-full rounded-xl py-2 text-sm font-bold transition-all hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold disabled:opacity-50"
      style={{ background: "rgba(255,77,106,0.12)", border: "1px solid rgba(255,77,106,0.3)", color: "#FF4D6A" }}
    >
      {busy ? "Signing out…" : "Sign Out"}
    </button>
  );
}

/* ── Settings Panel ──────────────────────────────────────── */
function SettingsPanel({
  onClose,
  fallbackTriggerRef,
}: {
  onClose: () => void;
  fallbackTriggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
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

  const Toggle = ({ label, on, set }: { label: string; on: boolean; set: (v:boolean)=>void }) => (
    <button
      type="button"
      onClick={() => set(!on)}
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={clsx(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold"
      )}
    >
      <span aria-hidden="true" className={clsx(
        "relative inline-flex h-5 w-9 rounded-full transition-colors",
        on ? "bg-wm-green" : "border border-wm-border bg-wm-surface"
      )}>
        <span className={clsx(
          "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
          on ? "translate-x-4" : "translate-x-0"
        )} />
      </span>
    </button>
  );

  const Row = ({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) => (
    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-wm-border/40 py-3">
      <div className="min-w-0">
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

  const onTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    current: (typeof TABS)[number]["id"],
  ) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = TABS.findIndex(item => item.id === current);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? TABS.length - 1
        : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
    const next = TABS[nextIndex].id;
    setTab(next);
    window.requestAnimationFrame(() => document.getElementById(`wm-settings-tab-${next}`)?.focus());
  };

  return (
    <ShellModalDrawer
      id="wm-settings-drawer"
      titleId="wm-settings-title"
      descriptionId="wm-settings-description"
      title="Settings"
      description="Display, trading, alert, and account preferences"
      closeLabel="Close settings"
      width={420}
      onClose={onClose}
      fallbackTriggerRef={fallbackTriggerRef}
      titleIcon={<Settings size={15} className="text-wm-blue" aria-hidden="true" />}
      footer={(
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              localStorage.setItem("wm_settings", JSON.stringify({
                darkMode, soundOn, showPnl, defaultTF, defSym, chartTheme, fontSize,
                priceAlert, newsAlert, wrAlert, autoSave, paperWarn,
                confirmOrders, overtrading, fomoDetect, inAppNotifs, twoFactor,
              }));
              window.dispatchEvent(new CustomEvent("wm-settings-changed"));
              onClose();
            }}
            className="min-h-11 w-full rounded-xl text-sm font-bold text-wm-black transition-all hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold"
            style={{ background:"linear-gradient(135deg,#00D4AA,#4FA3E0)" }}
          >
            Save Settings
          </button>
          <SignOutButton onClose={onClose} />
        </div>
      )}
    >
        {/* Tabs */}
        <div role="tablist" aria-label="Settings sections" className="flex shrink-0 border-b border-wm-border">
          {TABS.map(t => (
            <button key={t.id} type="button" role="tab"
              id={`wm-settings-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`wm-settings-panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => setTab(t.id)}
              onKeyDown={event => onTabKeyDown(event, t.id)}
              className={clsx(
                "flex min-h-11 flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-wm-gold",
                tab === t.id ? "text-wm-blue border-b-2 border-wm-blue" : "text-wm-text-muted hover:text-wm-text"
              )}>
              <t.icon size={13} aria-hidden="true" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-4 py-2">
          {tab === "display" && (
            <div role="tabpanel" id="wm-settings-panel-display" aria-labelledby="wm-settings-tab-display">
              <Row label="Dark Mode" sub="Premium dark theme for night trading">
                <Toggle label="Dark Mode" on={darkMode} set={setDarkMode} />
              </Row>
              <Row label="Show P&L in header" sub="Display live profit/loss in the top bar">
                <Toggle label="Show P&L in header" on={showPnl} set={setShowPnl} />
              </Row>
              <Row label="Sound Effects" sub="Tick sounds, alert chimes, order fills">
                <Toggle label="Sound Effects" on={soundOn} set={setSoundOn} />
              </Row>
              <Row label="Chart Theme" sub="Candle color scheme">
                <select aria-label="Chart Theme" value={chartTheme} onChange={e => setChartTheme(e.target.value)}
                  className="min-h-11 max-w-[55%] rounded-lg border border-wm-border bg-wm-surface px-2 py-1 text-xs text-wm-text outline-none focus-visible:ring-2 focus-visible:ring-wm-gold">
                  <option value="green-red">Green/Red (Default)</option>
                  <option value="blue-purple">Royal Blue/Purple</option>
                  <option value="blue-orange">Blue/Yellow</option>
                  <option value="mono">Monochrome</option>
                </select>
              </Row>
              <Row label="Font Size" sub="Chart label and UI text size">
                <select aria-label="Font Size" value={fontSize} onChange={e => setFontSize(e.target.value)}
                  className="min-h-11 max-w-[55%] rounded-lg border border-wm-border bg-wm-surface px-2 py-1 text-xs text-wm-text outline-none focus-visible:ring-2 focus-visible:ring-wm-gold">
                  <option value="small">Small</option>
                  <option value="medium">Medium (Default)</option>
                  <option value="large">Large</option>
                </select>
              </Row>
            </div>
          )}

          {tab === "trading" && (
            <div role="tabpanel" id="wm-settings-panel-trading" aria-labelledby="wm-settings-tab-trading">
              <Row label="Default Symbol" sub="Symbol loaded when opening Charts — type any ticker">
                <>
                  <input
                    list="wm-defsym-list"
                    aria-label="Default Symbol"
                    value={defSym}
                    onChange={e => setDefSym(e.target.value.toUpperCase())}
                    placeholder="Search symbol…"
                    className="min-h-11 w-28 rounded-lg border border-wm-border bg-wm-surface px-2 py-1 text-xs uppercase text-wm-text outline-none focus:border-wm-blue focus-visible:ring-2 focus-visible:ring-wm-gold" />
                  <datalist id="wm-defsym-list">
                    {["NQ1!","ES1!","BTC","ETH","AAPL","SPY","GC1!","TSLA","NVDA","MSFT","QQQ","EUR/USD","XAU/USD"].map(s => <option key={s} value={s} />)}
                  </datalist>
                </>
              </Row>
              <Row label="Default Timeframe" sub="Timeframe loaded on chart open">
                <select
                  aria-label="Default Timeframe"
                  value={defaultTF} onChange={e => setDefaultTF(e.target.value)}
                  className="min-h-11 rounded-lg border border-wm-border bg-wm-surface px-2 py-1 text-xs text-wm-text outline-none focus-visible:ring-2 focus-visible:ring-wm-gold">
                  <option value="last">Last Used</option>
                  <option value="none">None</option>
                  {["1m","2m","5m","15m","30m","1h","D","W","M"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Row>
              <Row label="Auto-save Journal" sub="Prompt to log trades when session ends">
                <Toggle label="Auto-save Journal" on={autoSave} set={setAutoSave} />
              </Row>
              <Row label="Paper Trade Warnings" sub="Alert before placing paper trade orders">
                <Toggle label="Paper Trade Warnings" on={paperWarn} set={setPaperWarn} />
              </Row>
              <Row label="Confirm Order Submissions" sub="Require confirmation before submitting">
                <Toggle label="Confirm Order Submissions" on={confirmOrders} set={setConfirmOrders} />
              </Row>
            </div>
          )}

          {tab === "alerts" && (
            <div role="tabpanel" id="wm-settings-panel-alerts" aria-labelledby="wm-settings-tab-alerts">
              <div className="text-[10px] text-wm-text-dim uppercase tracking-wider mb-3 mt-1">Market Alerts</div>
              <Row label="Price Level Alerts" sub="Notify when price reaches your set levels">
                <Toggle label="Price Level Alerts" on={priceAlert} set={setPriceAlert} />
              </Row>
              <Row label="News & Events" sub="Breaking news that may impact your positions">
                <Toggle label="News & Events" on={newsAlert} set={setNewsAlert} />
              </Row>
              <div className="text-[10px] text-wm-text-dim uppercase tracking-wider mb-3 mt-4">AI Coaching Alerts</div>
              <Row label="Win Rate Warning" sub="Alert when strategy win rate drops below 40%">
                <Toggle label="Win Rate Warning" on={wrAlert} set={setWrAlert} />
              </Row>
              <Row label="Overtrading Alert" sub="Warn when daily trade count exceeds your limit">
                <Toggle label="Overtrading Alert" on={overtrading} set={setOvertrading} />
              </Row>
              <Row label="FOMO Entry Detection" sub="Flag trades that match past losing patterns">
                <Toggle label="FOMO Entry Detection" on={fomoDetect} set={setFomoDetect} />
              </Row>
              <div className="text-[10px] text-wm-text-dim uppercase tracking-wider mb-3 mt-4">Delivery</div>
              <Row label="In-App Notifications" sub="Show alerts in the notification panel">
                <Toggle label="In-App Notifications" on={inAppNotifs} set={setInAppNotifs} />
              </Row>
              <Row label="Sound Chime" sub="Play sound when alert fires">
                <Toggle label="Sound Chime" on={soundOn} set={setSoundOn} />
              </Row>
            </div>
          )}

          {tab === "account" && (
            <div role="tabpanel" id="wm-settings-panel-account" aria-labelledby="wm-settings-tab-account">
              <Row label="Subscription" sub="WealthyMindsets PRO — Active">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-wm-gold/20 text-wm-gold border border-wm-gold/40">PRO</span>
              </Row>
              <Row label="Data Source" sub="Live market data status">
                {/* WM-CHART-PROV-EMERG-01 (2026-08-09): vendor identity removed
                    from user-visible chrome per Founder directive. Provenance
                    kept internal for the diagnostics inspector. */}
                <span className="text-xs text-wm-blue font-semibold">Real-time feeds active</span>
              </Row>
              <Row label="Two-Factor Auth" sub="Protect your account with 2FA">
                <Toggle label="Two-Factor Auth" on={twoFactor} set={setTwoFactor} />
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
                  className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-wm-border px-2.5 py-1.5 text-xs text-wm-text-muted transition-colors hover:text-wm-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold">
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
                  className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-wm-border px-2.5 py-1.5 text-xs text-wm-red/70 transition-colors hover:text-wm-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold">
                  <Trash2 size={10} /> Clear
                </button>
              </Row>
            </div>
          )}
        </div>

    </ShellModalDrawer>
  );
}

/* ── Nav items ──────────────────────────────────────────────
   Ordered along the founder-canon trader loop:
   PREP → UNDERSTAND (OS flagship) → OBSERVE → DISCOVER → LEARN → REVIEW.
   Command Deck is the flagship surface — it leads the top group after
   Morning Prep (the loop's actual entry point). Charts sits next as
   the primary auction surface. Discovery (Heatmaps/Scanner) then
   Learning (News/Education) then Review (Journal). Trading-mode
   surfaces (Paper/Copy/Backtest/AI Bot) live below the main loop. */
const NAV_TOP = [
  { href: "/morning-prep", icon: Sun,           label: "Morning Prep" },
  { href: "/command-deck", icon: Crosshair,     label: "Command Deck" },
  { href: "/charts",       icon: BarChart2,     label: "Charts"       },
  { href: "/heatmaps",     icon: Map,           label: "Heatmaps"     },
  { href: "/scanner",      icon: ScanLine,      label: "Scanner"      },
  { href: "/news",         icon: Newspaper,     label: "News"         },
  { href: "/education",    icon: GraduationCap, label: "Education"    },
  { href: "/journal",      icon: BookOpen,      label: "Journal"      },
  { href: "/paper",        icon: TrendingUp,    label: "Paper Trade"  },
  { href: "/copy-trading", icon: Copy,          label: "Copy Trading" },
  { href: "/backtesting",  icon: FlaskConical,  label: "Backtest"     },
  { href: "/ai-bot",       icon: Zap,           label: "AI Bot"       },
];
const NAV_BOTTOM = [
  { href: "/lounge",       icon: Users,         label: "Lounge"       },
  { href: "/tv",           icon: Tv,            label: "WM TV"        },
  { href: "/radio",        icon: Radio,         label: "WM Radio"     },
  { href: "/creator",      icon: Globe,         label: "Creator"      },
  { href: "/partnerships", icon: Handshake,     label: "Partnerships" },
  { href: "/shop",         icon: ShoppingBag,   label: "Shop"         },
  { href: "/profile",      icon: User,          label: "Profile"      },
];

// Mobile primary nav — 5 slots per iOS/Android convention. Public navigation
// names trader jobs and destinations, never private collection infrastructure.
// Scanner remains desktop-first via NAV_TOP. Order follows the trader loop:
// OBSERVE (Charts) → DECIDE (Command Deck) → PRACTICE (Paper) →
// REVIEW (Journal) → IDENTITY (Profile).
const MOBILE_NAV_ITEMS = [
  { href: "/charts", icon: BarChart2, label: "Charts" },
  { href: "/command-deck", icon: Crosshair, label: "Command Deck" },
  { href: "/paper", icon: TrendingUp, label: "Paper" },
  { href: "/journal", icon: BookOpen, label: "Journal" },
  { href: "/profile", icon: User, label: "Profile" },
] as const;
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
      className="wm-mobile-hide flex items-center gap-1 px-2 py-0.5 rounded-lg border mr-1"
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
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const notificationsTriggerRef = useRef<HTMLButtonElement>(null);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  // Full-document product surfaces own their vertical rhythm and must remain
  // reachable inside the fixed application shell. Workspace surfaces (charts,
  // scanner, journal, etc.) keep their existing internally managed overflow.
  const documentScroll = pathname === "/command-deck"
    || pathname === "/nectar"
    || pathname.startsWith("/nectar/");
  const router   = useRouter();
  const { user, signOut, signOutAllDevices } = useAuth();

  const unreadCount = INITIAL_NOTIFS.filter(n => !n.read).length;

  const openSearch = useCallback(() => {
    setNotifsOpen(false);
    setSettingsOpen(false);
    setProfileOpen(false);
    setSearchOpen(true);
  }, []);

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
        openSearch();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openSearch]);

  // Skip shell on auth pages — MUST be after all hooks to keep hook order stable
  if (isPublicAuthPath(pathname)) {
    return <>{children}</>;
  }

  return (
    <div
      style={{ display: "flex", flexDirection: "column", width: "100vw", height: "100vh", overflow: "hidden" }}
      className="bg-wm-black wm-universe"
    >
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header
        style={{ minHeight: 44, flexShrink: 0 }}
        className="flex items-center px-3 border-b border-wm-border bg-wm-dark z-50 wm-shell-header"
      >
        {/* Brand — WM wordmark shipped with the shell so every route
            (education, news, paper, copy-trading, backtesting, ai-bot,
            lounge, tv, radio, shop, creator, partnerships, ...) inherits
            the same brand identity. Per-page subtitles remain on hero
            surfaces (Command Deck, Growth, Morning Prep, Journal, ...) */}
        <div className="flex items-center gap-2 shrink-0">
          <WMLogo size={26} />
          <div className="hidden md:block">
            <WmWordmark size="compact" />
          </div>
        </div>

        {/* Ticker tape (desktop) — hidden on ≤639px via wm-shell-ticker rule */}
        <div className="wm-shell-ticker flex-1 overflow-hidden mx-2">
          <TickerTape />
        </div>

        {/* Mobile Session Pill — fills the phone header when the ticker
            is hidden, giving phone users a canonical "active symbol +
            live/observed" read that ties into the Market Truth graph
            without shrinking the desktop ticker into a broken thin bar. */}
        <div className="wm-mobile-session-slot flex-1 min-w-0 overflow-hidden mx-1 flex items-center justify-center">
          <MobileSessionPill />
        </div>

        {/* Right controls */}
        <div className="wm-shell-actions flex items-center gap-1 shrink-0">
          {/* Live P&L (toggled by Settings → Show P&L in header) */}
          <HeaderPnL />

          {/* Search — opens modal */}
          <button
            ref={searchTriggerRef}
            onClick={openSearch}
            aria-label="Search symbols"
            aria-haspopup="dialog"
            aria-expanded={searchOpen}
            aria-controls="wm-symbol-search-dialog"
            className="wm-shell-action flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-wm-surface text-wm-text-muted hover:text-wm-text transition-colors group"
            title="Search symbols (Ctrl+K)"
          >
            <Search size={14} />
            <span className="text-[10px] hidden group-hover:inline text-wm-text-dim">⌘K</span>
          </button>

          {/* Notifications */}
          <button
            ref={notificationsTriggerRef}
            onClick={() => { setNotifsOpen(true); setSettingsOpen(false); }}
            aria-label={unreadCount > 0 ? `Open notifications, ${unreadCount} unread` : "Open notifications"}
            aria-haspopup="dialog"
            aria-expanded={notifsOpen}
            aria-controls="wm-notifications-drawer"
            className="wm-shell-action relative p-1.5 rounded hover:bg-wm-surface text-wm-text-muted hover:text-wm-text transition-colors"
            title="Notifications"
          >
            <Bell size={14} />
            {unreadCount > 0 && (
              <span aria-hidden="true" className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-wm-red rounded-full ring-1 ring-wm-dark" />
            )}
          </button>

          {/* Settings */}
          <button
            ref={settingsTriggerRef}
            onClick={() => { setSettingsOpen(true); setNotifsOpen(false); }}
            aria-label="Open settings"
            aria-haspopup="dialog"
            aria-expanded={settingsOpen}
            aria-controls="wm-settings-drawer"
            className="wm-shell-action p-1.5 rounded hover:bg-wm-surface text-wm-text-muted hover:text-wm-text transition-colors"
            title="Settings"
          >
            <Settings size={14} />
          </button>

          {/* WM$ balance */}
          <div className="wm-mobile-hide"><WMSBar /></div>

          {/* PRO badge */}
          <div className="wm-mobile-hide ml-1 flex items-center gap-1 bg-gradient-to-r from-wm-gold/25 to-wm-gold/10 border border-wm-gold/40 rounded-full px-2.5 py-0.5">
            <Zap size={10} className="text-wm-gold fill-wm-gold" />
            <span className="text-[10px] font-bold text-wm-gold tracking-wide">PRO</span>
          </div>

          {/* User avatar — click to open dropdown */}
          <div className="wm-shell-profile relative ml-2">
            <button
              onClick={() => setProfileOpen(o => !o)}
              aria-label={profileOpen ? "Close profile menu" : "Open profile menu"}
              className="wm-shell-avatar w-7 h-7 rounded-full overflow-hidden ring-2 ring-wm-green/30 hover:ring-wm-green/60 transition-all shrink-0"
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
                      className="flex min-h-11 w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-wm-text-muted transition-colors hover:bg-wm-surface hover:text-wm-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-wm-gold">
                      <span>{item.icon}</span>{item.label}
                    </button>
                  ))}
                  <div className="border-t border-wm-border/60 mt-1">
                    <button
                      onClick={async () => { setProfileOpen(false); await signOut(); }}
                      className="flex min-h-11 w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-wm-gold"
                      style={{ color: "#FF4D6A" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,77,106,0.08)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <span>🚪</span> Sign Out
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm("Log out of WealthyMindsets Pro on ALL devices? Every other signed-in device will be signed out at its next check.")) return;
                        setProfileOpen(false);
                        await signOutAllDevices();
                      }}
                      className="flex min-h-11 w-full items-center gap-2.5 px-3 py-2.5 text-left text-[11px] text-wm-text-muted transition-colors hover:text-wm-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-wm-gold"
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <span>🔒</span> Log out all devices
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
        <aside className="wm-primary-sidebar" style={{
          width: 72, flexShrink: 0,
          background: "linear-gradient(180deg,#111018 0%,#0b0b11 55%,#120b0e 100%)",
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
                    background: active ? "linear-gradient(90deg,rgba(232,185,35,.16),rgba(5,150,105,.04))" : "transparent",
                    borderLeft: active ? "2px solid #E8B923" : "2px solid transparent",
                    transition: "background 0.12s",
                    position: "relative",
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                >
                  <Icon size={18} style={{ color: active ? "#E8B923" : "#8B8FA8", flexShrink: 0 }} />
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
                    background: active ? "linear-gradient(90deg,rgba(232,185,35,.16),rgba(5,150,105,.04))" : "transparent",
                    borderLeft: active ? "2px solid #E8B923" : "2px solid transparent",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                >
                  <Icon size={18} style={{ color: active ? "#E8B923" : "#8B8FA8", flexShrink: 0 }} />
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
        <main
          className="wm-app-surface"
          data-scroll-owner={documentScroll ? "shell" : "workspace"}
          style={{
            flex: 1,
            overflowX: "hidden",
            overflowY: documentScroll ? "auto" : "hidden",
            minWidth: 0,
            position: "relative",
            height: "100%",
            overscrollBehaviorY: documentScroll ? "contain" : undefined,
          }}
        >
          {mounted ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                style={documentScroll
                  ? { position: "relative", minHeight: "100%" }
                  : { position: "absolute", inset: 0 }}
              >
                <ErrorBoundary>{children}</ErrorBoundary>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div style={documentScroll
              ? { position: "relative", minHeight: "100%" }
              : { position: "absolute", inset: 0 }}><ErrorBoundary>{children}</ErrorBoundary></div>
          )}
        </main>
      </div>

      <nav className="wm-mobile-nav" aria-label="Primary navigation">
        {MOBILE_NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={clsx("wm-mobile-nav-link", active && "is-active")}
            >
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
        {/* Landscape-only trio: header is hidden in landscape-short mode
            (globals.css:192), so Notifications / Settings / Profile would
            otherwise be unreachable. Render them here as native buttons
            reusing the same state setters. Hidden in portrait via CSS. */}
        <div className="wm-mobile-nav-landscape-actions" aria-label="Access">
          <button
            type="button"
            onClick={() => { setNotifsOpen(true); setSettingsOpen(false); }}
            aria-label={unreadCount > 0 ? `Open notifications, ${unreadCount} unread` : "Open notifications"}
            className="wm-mobile-nav-link wm-mobile-nav-action"
          >
            <span className="relative inline-flex" aria-hidden="true">
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-wm-red rounded-full ring-1 ring-wm-dark" />
              )}
            </span>
            <span>Alerts</span>
          </button>
          <button
            type="button"
            onClick={() => { setSettingsOpen(true); setNotifsOpen(false); }}
            aria-label="Open settings"
            className="wm-mobile-nav-link wm-mobile-nav-action"
          >
            <Settings size={19} aria-hidden="true" />
            <span>Settings</span>
          </button>
          <Link
            href="/profile"
            aria-label="Open profile"
            className={clsx(
              "wm-mobile-nav-link wm-mobile-nav-action",
              pathname.startsWith("/profile") && "is-active",
            )}
          >
            <User size={19} aria-hidden="true" />
            <span>Profile</span>
          </Link>
        </div>
      </nav>

      {/* ── Overlays ─────────────────────────────────────────── */}
      {mounted && (
        <AnimatePresence>
          {searchOpen   && <SearchPanel        key="search"   onClose={() => setSearchOpen(false)} fallbackTriggerRef={searchTriggerRef} />}
          {notifsOpen   && <NotificationsPanel key="notifs" onClose={() => setNotifsOpen(false)} fallbackTriggerRef={notificationsTriggerRef} />}
          {settingsOpen && <SettingsPanel key="settings" onClose={() => setSettingsOpen(false)} fallbackTriggerRef={settingsTriggerRef} />}
          {brokerOpen   && <BrokerConnectPanel key="broker"   onClose={() => setBrokerOpen(false)} />}
        </AnimatePresence>
      )}

      {/* ── Persistent Music Player bar ─────────────────────── */}
      <MusicPlayer />

      {/* SpaidBot floating button */}
      <div className={pathname === "/charts" ? "wm-spaidbot-chart-context" : undefined}>
        <SpadeBotButton />
      </div>

    </div>
  );
}
