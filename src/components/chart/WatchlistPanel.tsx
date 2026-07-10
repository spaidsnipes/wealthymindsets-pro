"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Plus, TrendingUp, TrendingDown, LayoutGrid, List } from "lucide-react";
import { useActiveSymbol } from "@/contexts/SymbolContext";

const DEFAULT_SYMBOLS = [
  "ES1!", "NQ1!", "RTY1!", "YM1!", "SPY", "QQQ",
  "AAPL", "TSLA", "NVDA", "AMZN", "MSFT", "META",
  "GC1!", "CL1!", "BTC", "ETH",
];

// Fallback seed prices — Yahoo REST snapshot updates these at load
// Updated Jun 17 2026 from Yahoo Finance proxy
const SEED_PRICES: Record<string, number> = {
  "ES1!":  7_595,  "NQ1!":  30_476,  "RTY1!": 2_968,   "YM1!": 52_464,
  "SPY":   750,    "QQQ":   730,     "AAPL":  299,     "TSLA":  405,
  "NVDA":  207,    "AMZN":  246,     "MSFT":  394,     "META":  600,
  "GC1!":  4_349,  "CL1!":  75.68,   "BTC":  64_500,   "ETH":  1_760,
};

function getBase(sym: string) { return SEED_PRICES[sym.toUpperCase()] ?? 100; }

// Full display names for watchlist sub-labels
const SYM_NAMES: Record<string, string> = {
  "ES1!": "E-Mini S&P 500", "NQ1!": "E-Mini Nasdaq 100", "RTY1!": "E-Mini Russell 2000",
  "YM1!": "E-Mini Dow Jones", "GC1!": "Gold Futures", "CL1!": "Crude Oil WTI",
  "SI1!": "Silver Futures",   "NG1!": "Natural Gas",    "ZB1!": "US 30Y T-Bond",
  "MNQ1!": "Micro Nasdaq", "MES1!": "Micro S&P 500", "MYM1!": "Micro Dow",
  "SPY": "S&P 500 ETF",   "QQQ": "Nasdaq 100 ETF",  "IWM": "Russell 2000 ETF",
  "DIA": "Dow Jones ETF", "VXX": "VIX Short-Term",  "UVXY": "Ultra VIX",
  "AAPL": "Apple Inc",    "TSLA": "Tesla Inc",       "NVDA": "NVIDIA Corp",
  "AMZN": "Amazon.com",   "MSFT": "Microsoft Corp",  "META": "Meta Platforms",
  "GOOGL": "Alphabet Inc","GOOG": "Alphabet Inc",    "NFLX": "Netflix Inc",
  "AMD": "Advanced Micro Devices", "INTC": "Intel Corp", "QCOM": "Qualcomm Inc",
  "JPM": "JPMorgan Chase","BAC": "Bank of America",  "GS": "Goldman Sachs",
  "BRK.B": "Berkshire Hathaway","V": "Visa Inc","MA": "Mastercard Inc",
  "BTC": "Bitcoin",       "ETH": "Ethereum",         "SOL": "Solana",
  "BNB": "Binance Coin",  "XRP": "Ripple",            "DOGE": "Dogecoin",
  "ADA": "Cardano",       "AVAX": "Avalanche",        "LINK": "Chainlink",
};
function getSymName(sym: string): string {
  return SYM_NAMES[sym.toUpperCase()] ?? sym;
}

/* ── Yahoo Finance quotes — all symbols including futures ─── */
interface FinnhubQuote { price: number; change: number; changePct: number; }

const FUTURES_WL = new Set(["NQ1!","ES1!","RTY1!","YM1!","GC1!","SI1!","CL1!","NG1!","ZB1!","ZN1!","ZF1!","HG1!","MNQ1!","MES1!","MYM1!","M2K1!","MGC1!","MCL1!","VX1!"]);
const CRYPTO_WL  = new Set(["BTC","ETH","SOL","BNB","XRP","DOGE","ADA","AVAX","LINK","DOT","LTC"]);

async function fetchPolygonSnapshot(syms: string[]): Promise<Record<string, FinnhubQuote>> {
  const result: Record<string, FinnhubQuote> = {};
  const fetchable = syms.filter(s => !s.includes("/"));
  await Promise.all(fetchable.map(async sym => {
    const up = sym.toUpperCase();
    try {
      const isFutures = FUTURES_WL.has(up) || up.endsWith("1!");
      const isCrypto  = CRYPTO_WL.has(up);

      // Crypto → Alpaca (FREE, no key, real-time)
      if (isCrypto) {
        const j = await fetch(`/api/alpaca?sym=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json());
        if ((j?.price ?? 0) > 0) { result[up] = { price: j.price, change: j.change ?? 0, changePct: j.changePct ?? 0 }; return; }
        // Fallback to Yahoo
        const y = await fetch(`/api/yahoo?sym=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json());
        if ((y?.price ?? 0) > 0) { result[up] = { price: y.price, change: y.change ?? 0, changePct: y.changePct ?? 0 }; return; }
        return;
      }

      // Futures → Yahoo only
      if (isFutures) {
        const j = await fetch(`/api/yahoo?sym=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json());
        if ((j?.price ?? 0) > 0) result[up] = { price: j.price, change: j.change ?? 0, changePct: j.changePct ?? 0 };
        return;
      }

      // Stocks/ETFs → Alpaca (real-time RTH; 404s when stale) → Yahoo (pre/post
      // market, matches TradingView) → Finnhub (regular-hours-only fallback).
      const alpacaJ = await fetch(`/api/alpaca?sym=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json()).catch(() => null);
      if ((alpacaJ?.price ?? 0) > 0) { result[up] = { price: alpacaJ.price, change: alpacaJ.change ?? 0, changePct: alpacaJ.changePct ?? 0 }; return; }

      const yhJ = await fetch(`/api/yahoo?sym=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json()).catch(() => null);
      if (yhJ?.price > 0) { result[up] = { price: yhJ.price, change: yhJ.change ?? 0, changePct: yhJ.changePct ?? 0 }; return; }

      const fhJ = await fetch(`/api/finnhub?sym=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json()).catch(() => null);
      if (fhJ?.price > 0) result[up] = { price: fhJ.price, change: fhJ.change ?? 0, changePct: fhJ.changePct ?? 0 };
    } catch {}
  }));
  return result;
}

interface WatchItem {
  sym: string;
  price: number;
  change: number;
  changePct: number;
  history: number[]; // last 20 prices for sparkline
}

function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 48, h = 20;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={h} style={{ display: "block", flexShrink: 0 }}>
      <polyline
        points={pts}
        fill="none"
        stroke={up ? "#00C076" : "#FF4D67"}
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.8}
      />
    </svg>
  );
}

interface Props {
  open: boolean;
  onToggle: () => void;
  gridView?: boolean;
  onGridViewChange?: (v: boolean) => void;
}

export function WatchlistPanel({ open, gridView = false, onGridViewChange }: Props) {
  const { activeSymbol, setActiveSymbol } = useActiveSymbol();
  // ── Named custom watchlists (persisted) ──────────────────────
  const [lists, setLists] = useState<Record<string, string[]>>(() => {
    if (typeof window === "undefined") return { "My Watchlist": DEFAULT_SYMBOLS };
    try {
      const raw = localStorage.getItem("wm_watchlists");
      if (raw) {
        const p = JSON.parse(raw);
        if (p && typeof p === "object" && Object.keys(p).length) {
          // Dedupe any symbols that were persisted before the dedupe-on-add fix.
          const cleaned: Record<string, string[]> = {};
          for (const k of Object.keys(p)) {
            cleaned[k] = Array.isArray(p[k]) ? Array.from(new Set(p[k])) : p[k];
          }
          return cleaned;
        }
      }
    } catch {}
    return { "My Watchlist": DEFAULT_SYMBOLS };
  });
  const [activeList, setActiveList] = useState<string>(() => {
    if (typeof window === "undefined") return "My Watchlist";
    try { return localStorage.getItem("wm_active_watchlist") || "My Watchlist"; } catch { return "My Watchlist"; }
  });
  const [showLists, setShowLists] = useState(false);
  const listMenuRef = useRef<HTMLDivElement>(null);
  // Active list's symbols (falls back to default if the active name is missing)
  const symbols = lists[activeList] ?? lists[Object.keys(lists)[0]] ?? DEFAULT_SYMBOLS;
  const setSymbols = (updater: string[] | ((prev: string[]) => string[])) => {
    setLists(prev => {
      const cur = prev[activeList] ?? DEFAULT_SYMBOLS;
      const next = typeof updater === "function" ? (updater as (p: string[]) => string[])(cur) : updater;
      return { ...prev, [activeList]: next };
    });
  };
  // Persist lists + active selection
  useEffect(() => { try { localStorage.setItem("wm_watchlists", JSON.stringify(lists)); } catch {} }, [lists]);
  useEffect(() => { try { localStorage.setItem("wm_active_watchlist", activeList); } catch {} }, [activeList]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (listMenuRef.current && !listMenuRef.current.contains(e.target as Node)) setShowLists(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const createList = () => { setNewListName(""); setCreatingList(true); };
  const commitNewList = () => {
    const name = newListName.trim();
    if (!name) return;
    setLists(prev => prev[name] ? prev : { ...prev, [name]: [] });
    setActiveList(name);
    setCreatingList(false);
    setNewListName("");
    setShowLists(false);
  };
  const importInputRef = useRef<HTMLInputElement>(null);
  const exportLists = () => {
    try {
      const blob = new Blob([JSON.stringify(lists, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "wm-watchlists.json"; a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };
  const importLists = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed && typeof parsed === "object") {
          const cleaned: Record<string, string[]> = {};
          for (const k of Object.keys(parsed)) {
            if (Array.isArray(parsed[k])) cleaned[k] = Array.from(new Set(parsed[k].map((s: any) => String(s).toUpperCase())));
          }
          if (Object.keys(cleaned).length) {
            setLists(prev => ({ ...prev, ...cleaned }));
            setActiveList(Object.keys(cleaned)[0]);
          }
        }
      } catch {}
    };
    reader.readAsText(file);
    e.target.value = "";
  };
  const deleteList = (name: string) => {
    setLists(prev => {
      if (Object.keys(prev).length <= 1) return prev; // keep at least one
      const next = { ...prev }; delete next[name];
      if (activeList === name) setActiveList(Object.keys(next)[0]);
      return next;
    });
  };

  const [items, setItems] = useState<WatchItem[]>([]);
  const [search, setSearch] = useState("");
  const [addInput, setAddInput] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addResults, setAddResults] = useState<{ sym: string; label: string }[]>([]);
  const addTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Right-click context menu
  const [ctxMenu, setCtxMenu] = useState<{ sym: string; x: number; y: number } | null>(null);
  // Filter bar state — the "All ▼" and "⇅" controls used to be inert <button>s
  // with no onClick at all, so neither did anything when clicked.
  const [viewFilter, setViewFilter] = useState<"all" | "gainers" | "losers">("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [sortMode, setSortMode] = useState<"manual" | "chgDesc" | "chgAsc" | "symAsc">("manual");
  // Inline new-list naming. Replaces window.prompt(), which Chrome suppresses
  // after a page opens a few dialogs — making the button look simply dead.
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const ctxRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [ctxMenu]);

  // Initialize items — priority: 1) window cache (HMR-safe, <30s), 2) localStorage (<30s), 3) seeds
  // NOTE: TTL is 30s — changePct must always be fresh so we never show stale day-change
  useEffect(() => {
    const CACHE_TTL = 30_000; // 30 seconds only — never show stale change%
    // Clear any old caches to prevent stale change% from persisting
    try { localStorage.removeItem("wm-watchlist-prices"); } catch {}
    try { delete (window as any).__wmWatchlist; } catch {}
    let cached: Record<string, { price: number; change: number; changePct: number }> = {};
    try {
      // Window cache (fastest — survives HMR module re-eval)
      const w = (window as any).__wmWatchlist as (typeof cached & { _ts?: number }) | undefined;
      const wAge = w?._ts ? Date.now() - w._ts : Infinity;
      if (w && Object.keys(w).length > 0 && wAge < CACHE_TTL) {
        cached = w;
      }
    } catch {}

    const init = symbols.map(sym => {
      const base = getBase(sym);
      const c = cached[sym.toUpperCase()];
      if (c && c.price > 0) {
        const dp = c.price < 10 ? 4 : 2;
        return {
          sym,
          price: +c.price.toFixed(dp),
          change: c.change,
          changePct: c.changePct,
          history: Array.from({ length: 20 }, () => +c.price.toFixed(dp)),
        };
      }
      const change = (Math.random() - 0.48) * base * 0.012;
      return {
        sym,
        price: +(base + change).toFixed(base < 10 ? 4 : 2),
        change: +change.toFixed(base < 10 ? 4 : 2),
        changePct: +((change / base) * 100).toFixed(2),
        history: Array.from({ length: 20 }, (_, i) => {
          const drift = (Math.random() - 0.48) * base * 0.003 * i;
          return +(base + drift).toFixed(base < 10 ? 4 : 2);
        }),
      };
    });
    setItems(init);
  }, [symbols]);

  // Tick updates: only drift futures (1!) and forex (/), real prices stay via 15s Finnhub refresh
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setItems(prev => prev.map(item => {
        // Only animate forex with synthetic drift — futures/stocks/crypto get real Yahoo prices
        if (!item.sym.includes("/")) return item;
        const base = getBase(item.sym);
        const tick = (Math.random() - 0.50) * base * 0.0004;
        const price = Math.max(0.0001, +(item.price + tick).toFixed(base < 10 ? 4 : 2));
        const change = +(price - base).toFixed(base < 10 ? 4 : 2);
        const changePct = +((change / base) * 100).toFixed(2);
        const history = [...item.history.slice(-19), price];
        return { ...item, price, change, changePct, history };
      }));
    }, 600);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Re-fetch real prices from Yahoo every 10s (fires immediately on mount)
  // Persists prices to localStorage so HMR re-mounts start with correct data
  useEffect(() => {
    const doFetch = () => {
      fetchPolygonSnapshot(symbols).then(liveMap => {
        if (!Object.keys(liveMap).length) return;
        setItems(prev => {
          const updated = prev.map(item => {
            const q = liveMap[item.sym.toUpperCase()];
            if (!q) return item;
            const { price, change, changePct } = q;
            SEED_PRICES[item.sym.toUpperCase()] = price;
            const dp = price < 10 ? 4 : 2;
            return { ...item, price: +price.toFixed(dp), change, changePct };
          });
          // Persist to window cache only (localStorage cleared on init to prevent stale change%)
          try {
            const cache: Record<string, any> = { _ts: Date.now() };
            for (const it of updated) cache[it.sym.toUpperCase()] = { price: it.price, change: it.change, changePct: it.changePct };
            (window as any).__wmWatchlist = cache;
          } catch {}
          return updated;
        });
      });
    };
    doFetch();
    const iv = setInterval(doFetch, 10_000);
    const onVisible = () => { if (document.visibilityState === "visible") doFetch(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", onVisible); };
  }, [symbols]);

  const filtered = React.useMemo(() => {
    const rows = items.filter(i => {
      if (search && !i.sym.toLowerCase().includes(search.toLowerCase())) return false;
      if (viewFilter === "gainers") return i.changePct > 0;
      if (viewFilter === "losers")  return i.changePct < 0;
      return true;
    });
    switch (sortMode) {
      case "chgDesc": return [...rows].sort((a, b) => b.changePct - a.changePct);
      case "chgAsc":  return [...rows].sort((a, b) => a.changePct - b.changePct);
      case "symAsc":  return [...rows].sort((a, b) => a.sym.localeCompare(b.sym));
      default:        return rows;   // "manual" preserves the user's own ordering
    }
  }, [items, search, viewFilter, sortMode]);

  const addSymbol = (explicit?: string) => {
    const sym = (explicit ?? addInput).trim().toUpperCase();
    if (sym) {
      // Dedupe against CURRENT state inside the updater, not a stale closure.
      setSymbols(prev => prev.includes(sym) ? prev : [...prev, sym]);
    }
    setAddInput("");
    setAddResults([]);
    setShowAdd(false);
    setSearch(""); // clear filter so the newly added symbol is always visible
  };

  // Live symbol search (matches main chart search: debounced Finnhub lookup)
  useEffect(() => {
    if (addTimerRef.current) clearTimeout(addTimerRef.current);
    const q = addInput.trim();
    if (!showAdd || q.length < 1) { setAddResults([]); return; }
    addTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/finnhub?q=${encodeURIComponent(q)}&type=search`, { cache: "no-store" });
        const json = await res.json();
        const live = (json.results ?? [])
          .filter((r: any) => r.sym && r.name)
          .slice(0, 10)
          .map((r: any) => ({ sym: r.sym, label: r.name }));
        setAddResults(live);
      } catch { setAddResults([]); }
    }, 250);
    return () => { if (addTimerRef.current) clearTimeout(addTimerRef.current); };
  }, [addInput, showAdd]);

  const removeSymbol = (sym: string) => {
    setSymbols(prev => prev.filter(s => s !== sym));
    setItems(prev => prev.filter(i => i.sym !== sym));
  };

  return (
    <div style={{ display: "flex", alignItems: "stretch", flexShrink: 0, position: "relative" }}>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 200, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            style={{
              overflow: "hidden",
              borderLeft: "1px solid #1E2030",
              background: "#0D0E14",
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
            }}
          >
            {/* Header — "Watchlists ▼" + grid/list icons */}
            <div style={{
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 10px",
              borderBottom: "1px solid #1E2030",
              flexShrink: 0,
            }}>
              <div ref={listMenuRef} style={{ display: "flex", alignItems: "center", gap: 4, position: "relative" }}>
                <button
                  onClick={() => setShowLists(v => !v)}
                  title="Switch or create a custom watchlist"
                  style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#E2E8F0", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {activeList}
                  </span>
                  <span style={{ fontSize: 10, color: "#8B8FA8", transform: showLists ? "rotate(180deg)" : "none" }}>▼</span>
                </button>
                {showLists && (
                  <div style={{
                    position: "absolute", top: 24, left: 0, zIndex: 9999, width: 210,
                    background: "#0C0F1A", border: "1px solid #252a3a", borderRadius: 8,
                    boxShadow: "0 14px 40px rgba(0,0,0,0.7)", overflow: "hidden", padding: 4,
                  }}>
                    {Object.keys(lists).map(name => (
                      <div key={name} style={{ display: "flex", alignItems: "center" }}>
                        <button
                          onClick={() => { setActiveList(name); setShowLists(false); }}
                          style={{
                            flex: 1, textAlign: "left", padding: "7px 9px", borderRadius: 5, border: "none", cursor: "pointer",
                            fontSize: 12, fontWeight: name === activeList ? 800 : 600,
                            color: name === activeList ? "#00D4AA" : "#cdd6e8",
                            background: name === activeList ? "rgba(0,212,170,0.1)" : "transparent",
                          }}
                        >{name} <span style={{ color: "#6A7290", fontWeight: 500 }}>({(lists[name]||[]).length})</span></button>
                        {Object.keys(lists).length > 1 && (
                          <button onClick={() => deleteList(name)} title="Delete list"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#FF4D67", fontSize: 13, padding: "0 6px" }}>×</button>
                        )}
                      </div>
                    ))}
                    {creatingList ? (
                      <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                        <input
                          autoFocus
                          value={newListName}
                          onChange={e => setNewListName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") commitNewList();
                            if (e.key === "Escape") { setCreatingList(false); setNewListName(""); }
                          }}
                          placeholder="Name your new watchlist…"
                          style={{ flex: 1, background: "#131520", border: "1px solid #2a3550", borderRadius: 5,
                            color: "#E2E8F0", fontSize: 12, padding: "6px 8px", outline: "none" }}
                        />
                        <button onClick={commitNewList} disabled={!newListName.trim()}
                          style={{ padding: "6px 10px", borderRadius: 5, border: "none",
                            cursor: newListName.trim() ? "pointer" : "not-allowed",
                            fontSize: 12, fontWeight: 800,
                            color: newListName.trim() ? "#0B0E1A" : "#4A5070",
                            background: newListName.trim() ? "#00D4AA" : "#1E2030" }}>Add</button>
                      </div>
                    ) : (
                      <button onClick={createList}
                        style={{ width: "100%", textAlign: "left", padding: "7px 9px", marginTop: 2, borderRadius: 5,
                          border: "1px dashed #2a3550", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#4FA3E0", background: "none" }}>
                        ＋ New watchlist
                      </button>
                    )}
                    {/* Import / Export — Moomoo "Manage Watchlists" parity */}
                    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                      <button onClick={exportLists}
                        style={{ flex: 1, padding: "6px 8px", borderRadius: 5, border: "1px solid #252a3a",
                          cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#cdd6e8", background: "none" }}>
                        ⤓ Export
                      </button>
                      <button onClick={() => importInputRef.current?.click()}
                        style={{ flex: 1, padding: "6px 8px", borderRadius: 5, border: "1px solid #252a3a",
                          cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#cdd6e8", background: "none" }}>
                        ⤒ Import
                      </button>
                      <input ref={importInputRef} type="file" accept="application/json" style={{ display: "none" }}
                        onChange={importLists} />
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => onGridViewChange?.(true)} title="Grid view — live mini-chart cards"
                  style={{ background: "none", border: "none", cursor: "pointer", color: gridView ? "#00D4AA" : "#4A5070", display: "flex", padding: 0 }}>
                  <LayoutGrid size={12} />
                </button>
                <button onClick={() => onGridViewChange?.(false)} title="List view"
                  style={{ background: "none", border: "none", cursor: "pointer", color: !gridView ? "#00D4AA" : "#4A5070", display: "flex", padding: 0 }}>
                  <List size={12} />
                </button>
                <button onClick={createList} title="Create new watchlist"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#4A5070", fontSize: 13 }}>⊞</button>
                <button
                  onClick={() => setShowAdd(v => !v)}
                  style={{ color: "#8B8FA8", background: "none", border: "none", cursor: "pointer", padding: 2, borderRadius: 4 }}
                  title="Add symbol to this watchlist"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>

            {/* Filter bar — "All ▼" + sort icon */}
            <div style={{
              height: 28, display: "flex", alignItems: "center", gap: 6,
              padding: "0 8px", borderBottom: "1px solid #1E2030", flexShrink: 0,
            }}>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowFilterMenu(v => !v)}
                  title="Filter rows: all, gainers only, or losers only"
                  style={{
                    display: "flex", alignItems: "center", gap: 3, background: "#131520",
                    border: "1px solid #1E2030", borderRadius: 4, padding: "2px 8px",
                    color: viewFilter === "all" ? "#8B8FA8" : "#FF8C00", fontSize: 10, cursor: "pointer",
                  }}>
                  {viewFilter === "all" ? "All" : viewFilter === "gainers" ? "Gainers" : "Losers"}{" "}
                  <span style={{ transform: showFilterMenu ? "rotate(180deg)" : "none" }}>▼</span>
                </button>
                {showFilterMenu && (
                  <div style={{
                    position: "absolute", top: 22, left: 0, zIndex: 9999, width: 110,
                    background: "#0C0F1A", border: "1px solid #252a3a", borderRadius: 6,
                    boxShadow: "0 12px 32px rgba(0,0,0,0.7)", overflow: "hidden", padding: 3,
                  }}>
                    {([["all", "All"], ["gainers", "Gainers"], ["losers", "Losers"]] as const).map(([key, lbl]) => (
                      <button key={key}
                        onClick={() => { setViewFilter(key); setShowFilterMenu(false); }}
                        style={{
                          width: "100%", textAlign: "left", padding: "6px 8px", borderRadius: 4, border: "none",
                          cursor: "pointer", fontSize: 11, fontWeight: viewFilter === key ? 800 : 600,
                          color: viewFilter === key ? "#00D4AA" : "#cdd6e8",
                          background: viewFilter === key ? "rgba(0,212,170,0.1)" : "transparent",
                        }}>{lbl}</button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => setSortMode(m => m === "manual" ? "chgDesc" : m === "chgDesc" ? "chgAsc" : m === "chgAsc" ? "symAsc" : "manual")}
                title={
                  sortMode === "manual"  ? "Sort: manual order (click to sort by % change ↓)" :
                  sortMode === "chgDesc" ? "Sort: % change ↓ (click for % change ↑)" :
                  sortMode === "chgAsc"  ? "Sort: % change ↑ (click for symbol A–Z)" :
                                           "Sort: symbol A–Z (click to restore manual order)"
                }
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11,
                  color: sortMode === "manual" ? "#4A5070" : "#FF8C00" }}>
                {sortMode === "chgDesc" ? "↓" : sortMode === "chgAsc" ? "↑" : sortMode === "symAsc" ? "A–Z" : "⇅"}
              </button>
            </div>

            {/* Column headers */}
            <div style={{
              display: "flex", alignItems: "center",
              padding: "0 8px", height: 22,
              borderBottom: "1px solid #1E2030", flexShrink: 0,
            }}>
              <span style={{ flex: 1, fontSize: 9, color: "#4A5070", textTransform: "uppercase" }}>Symbol</span>
              <span style={{ width: 64, textAlign: "right", fontSize: 9, color: "#4A5070", textTransform: "uppercase" }}>Price</span>
              <span style={{ width: 48, textAlign: "right", fontSize: 9, color: "#4A5070", textTransform: "uppercase" }}>% Chg</span>
            </div>

            {/* Add symbol */}
            <AnimatePresence>
              {showAdd && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 36 }}
                  exit={{ height: 0 }}
                  // overflow must stay visible so the search-results dropdown
                  // (absolutely positioned below the input) isn't clipped by the
                  // 36px-tall animated container.
                  style={{ overflow: "visible", borderBottom: "1px solid #1E2030", flexShrink: 0, position: "relative", zIndex: 300 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", position: "relative" }}>
                    <input
                      autoFocus
                      value={addInput}
                      onChange={e => setAddInput(e.target.value.toUpperCase())}
                      onKeyDown={e => { if (e.key === "Enter") addSymbol(addResults[0]?.sym); if (e.key === "Escape") { setShowAdd(false); setAddInput(""); setAddResults([]); }}}
                      placeholder="Search symbol…"
                      style={{
                        flex: 1, background: "#131520", border: "1px solid #1E2030", borderRadius: 4,
                        color: "#E2E8F0", fontSize: 11, padding: "3px 7px", outline: "none",
                      }}
                    />
                    <button onClick={() => addSymbol()} style={{ color: "#FF8C00", background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>+</button>
                    {addResults.length > 0 && (
                      <div style={{
                        position: "absolute", top: "100%", left: 8, right: 8, zIndex: 400,
                        background: "#0C0E16", border: "1px solid #1E2030", borderRadius: 6,
                        marginTop: 2, maxHeight: 220, overflowY: "auto", boxShadow: "0 14px 40px rgba(0,0,0,0.7)",
                      }}>
                        {addResults.map(r => (
                          <button key={r.sym}
                            onClick={() => addSymbol(r.sym)}
                            style={{
                              display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%",
                              textAlign: "left", padding: "6px 9px", background: "none", border: "none",
                              cursor: "pointer", borderBottom: "1px solid #15171F",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#151826")}
                            onMouseLeave={e => (e.currentTarget.style.background = "none")}
                          >
                            <span style={{ color: "#E2E8F0", fontSize: 11, fontWeight: 700 }}>{r.sym}</span>
                            <span style={{ color: "#6B7280", fontSize: 9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{r.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search */}
            <div style={{ padding: "5px 8px", borderBottom: "1px solid #1E2030", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#131520", border: "1px solid #1E2030", borderRadius: 5, padding: "3px 7px" }}>
                <Search size={10} color="#4A5070" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filter…"
                  style={{ flex: 1, background: "none", border: "none", color: "#E2E8F0", fontSize: 11, outline: "none" }}
                />
                {search && (
                  <button onClick={() => setSearch("")} style={{ color: "#4A5070", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    <X size={10} />
                  </button>
                )}
              </div>
            </div>

            {/* Symbol rows */}
            <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
              {filtered.map(item => {
                const up = item.change >= 0;
                const isActive = item.sym === activeSymbol;
                const base = getBase(item.sym);
                const dp = base < 10 ? 4 : 2;
                const fullName = getSymName(item.sym);

                return (
                  <div
                    key={item.sym}
                    onClick={() => setActiveSymbol(item.sym)}
                    onContextMenu={e => { e.preventDefault(); setCtxMenu({ sym: item.sym, x: e.clientX, y: e.clientY }); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "5px 8px",
                      cursor: "pointer",
                      background: isActive ? "rgba(255,140,0,0.06)" : "transparent",
                      borderBottom: "1px solid rgba(30,32,48,0.6)",
                      borderLeft: isActive ? "2px solid #FF8C00" : "2px solid transparent",
                      transition: "background 0.12s",
                      gap: 4,
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)"; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                  >
                    {/* Left: ticker + full name */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 700,
                        color: isActive ? "#FF8C00" : "#E2E8F0",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {item.sym}
                      </div>
                      <div style={{
                        fontSize: 9, color: "#4A5070",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        marginTop: 1,
                      }}>
                        {fullName}
                      </div>
                    </div>

                    {/* Price + % change stacked */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: up ? "#00C076" : "#FF4D67", fontFamily: "monospace", fontWeight: 600 }}>
                        {item.price.toFixed(dp)}
                      </div>
                      <div style={{ fontSize: 9, color: up ? "#00C076" : "#FF4D67", fontFamily: "monospace" }}>
                        {up ? "+" : ""}{item.changePct.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right-click context menu */}
            {ctxMenu && (
              <div
                ref={ctxRef}
                style={{
                  position: "fixed", top: ctxMenu.y, left: ctxMenu.x, zIndex: 99999,
                  background: "#0D0E14", border: "1px solid #1E2030", borderRadius: 6,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.7)", minWidth: 160, overflow: "hidden",
                }}
              >
                <div style={{ padding: "4px 0" }}>
                  <div style={{
                    padding: "6px 14px", fontSize: 10, color: "#8B8FA8",
                    borderBottom: "1px solid #1E2030", fontWeight: 600, letterSpacing: 1,
                    textTransform: "uppercase",
                  }}>
                    {ctxMenu.sym}
                  </div>
                  <button
                    onClick={() => { setActiveSymbol(ctxMenu.sym); setCtxMenu(null); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "7px 14px", fontSize: 11, color: "#E2E8F0",
                      background: "none", border: "none", cursor: "pointer",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                  >
                    📈 Open Chart
                  </button>
                  <button
                    onClick={() => { removeSymbol(ctxMenu.sym); setCtxMenu(null); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "7px 14px", fontSize: 11, color: "#FF4D67",
                      background: "none", border: "none", cursor: "pointer",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,77,103,0.08)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                  >
                    🗑 Remove from Watchlist
                  </button>
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ borderTop: "1px solid #1E2030", padding: "4px 10px", flexShrink: 0 }}>
              <span style={{ fontSize: 9, color: "#4A5070" }}>{filtered.length} symbols · live</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Collapse/expand toggle moved to the LeftSidebar tool strip. */}
    </div>
  );
}
