"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Plus, ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
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

      // Stocks/ETFs → Alpaca (if key set) → Finnhub → Yahoo
      const alpacaJ = await fetch(`/api/alpaca?sym=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json()).catch(() => null);
      if ((alpacaJ?.price ?? 0) > 0) { result[up] = { price: alpacaJ.price, change: alpacaJ.change ?? 0, changePct: alpacaJ.changePct ?? 0 }; return; }

      const fhJ = await fetch(`/api/finnhub?sym=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json()).catch(() => null);
      if (fhJ?.price > 0) { result[up] = { price: fhJ.price, change: fhJ.change ?? 0, changePct: fhJ.changePct ?? 0 }; return; }

      const yhJ = await fetch(`/api/yahoo?sym=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json()).catch(() => null);
      if (yhJ?.price > 0) result[up] = { price: yhJ.price, change: yhJ.change ?? 0, changePct: yhJ.changePct ?? 0 };
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
}

export function WatchlistPanel({ open, onToggle }: Props) {
  const { activeSymbol, setActiveSymbol } = useActiveSymbol();
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [items, setItems] = useState<WatchItem[]>([]);
  const [search, setSearch] = useState("");
  const [addInput, setAddInput] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Right-click context menu
  const [ctxMenu, setCtxMenu] = useState<{ sym: string; x: number; y: number } | null>(null);
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

  const filtered = items.filter(i =>
    !search || i.sym.toLowerCase().includes(search.toLowerCase())
  );

  const addSymbol = () => {
    const sym = addInput.trim().toUpperCase();
    if (sym && !symbols.includes(sym)) {
      setSymbols(prev => [...prev, sym]);
    }
    setAddInput("");
    setShowAdd(false);
  };

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
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#E2E8F0" }}>
                  Watchlists
                </span>
                <span style={{ fontSize: 10, color: "#8B8FA8" }}>▼</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ background: "none", border: "none", cursor: "pointer", color: "#4A5070", fontSize: 12 }}>⊞</button>
                <button
                  onClick={() => setShowAdd(v => !v)}
                  style={{ color: "#8B8FA8", background: "none", border: "none", cursor: "pointer", padding: 2, borderRadius: 4 }}
                  title="Add symbol"
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
              <button style={{
                display: "flex", alignItems: "center", gap: 3, background: "#131520",
                border: "1px solid #1E2030", borderRadius: 4, padding: "2px 8px",
                color: "#8B8FA8", fontSize: 10, cursor: "pointer",
              }}>
                All <span>▼</span>
              </button>
              <div style={{ flex: 1 }} />
              <button style={{ background: "none", border: "none", cursor: "pointer", color: "#4A5070", fontSize: 11 }}>⇅</button>
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
                  style={{ overflow: "hidden", borderBottom: "1px solid #1E2030", flexShrink: 0 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px" }}>
                    <input
                      autoFocus
                      value={addInput}
                      onChange={e => setAddInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addSymbol(); if (e.key === "Escape") { setShowAdd(false); setAddInput(""); }}}
                      placeholder="Add symbol…"
                      style={{
                        flex: 1, background: "#131520", border: "1px solid #1E2030", borderRadius: 4,
                        color: "#E2E8F0", fontSize: 11, padding: "3px 7px", outline: "none",
                      }}
                    />
                    <button onClick={addSymbol} style={{ color: "#FF8C00", background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>+</button>
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

      {/* Toggle button — RIGHT side of watchlist, between watchlist and chart */}
      <button
        onClick={onToggle}
        style={{
          width: 18,
          background: "#0D0E14",
          borderRight: "1px solid #1E2030",
          borderLeft: open ? "1px solid #1E2030" : "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#4A5070",
          flexShrink: 0,
          gap: 3,
          transition: "color 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "#00D4AA")}
        onMouseLeave={e => (e.currentTarget.style.color = "#4A5070")}
        title={open ? "Collapse watchlist" : "Expand watchlist"}
      >
        {open ? <ChevronLeft size={11} /> : <ChevronRight size={11} />}
        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1, writingMode: "vertical-rl", color: "inherit", textTransform: "uppercase" }}>
          {open ? "Hide" : "List"}
        </span>
      </button>
    </div>
  );
}
