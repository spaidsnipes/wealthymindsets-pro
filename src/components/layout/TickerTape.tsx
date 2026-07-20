"use client";

import React, { useEffect, useState, useRef } from "react";
import { TrendingUp, TrendingDown, Pencil, X, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useActiveSymbol } from "@/contexts/SymbolContext";

const POLYGON_KEY = process.env.NEXT_PUBLIC_POLYGON_KEY ?? "";

/* ── Ticker catalogue ──────────────────────────────────────────
   `base` is an internal formatting/fetch bootstrap only. It must never be
   rendered or restored as a verified quote.
─────────────────────────────────────────────────────────────── */
// Verified against MooMoo + TradingView on Jun 16, 2026
// Updated Jun 17 2026 — Yahoo Finance proxy corrects these at load
const TAPE_SYMBOLS = [
  { sym:"NQ1!",   poly:null,          base:30_476  },
  { sym:"ES1!",   poly:null,          base: 7_595  },
  { sym:"RTY1!",  poly:null,          base: 2_968  },
  { sym:"YM1!",   poly:null,          base:52_464  },
  { sym:"GC1!",   poly:null,          base: 4_349  },
  { sym:"CL1!",   poly:null,          base: 75.68  },
  { sym:"AAPL",   poly:"AAPL",        base:   299  },
  { sym:"TSLA",   poly:"TSLA",        base:   405  },
  { sym:"NVDA",   poly:"NVDA",        base:   207  },
  { sym:"SPY",    poly:"SPY",         base:   750  },
  { sym:"QQQ",    poly:"QQQ",         base:   730  },
  { sym:"BTC",    poly:"X:BTCUSD",    base:64_500  },
  { sym:"ETH",    poly:"X:ETHUSD",    base: 1_760  },
];

/* ── All available tape symbols ─────────────────────────── */
const ALL_TAPE_SYMS = [
  "NQ1!","ES1!","RTY1!","YM1!","GC1!","CL1!","SI1!","ZB1!",
  "AAPL","TSLA","NVDA","AMZN","META","MSFT","GOOG","AMD","INTC","NFLX",
  "JPM","GS","V","MA","LLY","UNH","SPY","QQQ","IWM","GLD","TLT","XLK","XLF",
  "BTC","ETH","SOL","BNB","XRP","DOGE","ADA","AVAX",
  "EUR/USD","GBP/USD","USD/JPY","AUD/USD",
];

interface TickerState {
  sym:   string;
  price: number;
  chg:   number;
  pct:   number;
  up:    boolean;
  poly:  string | null;
  base:  number;
  _open: number;
  live:  boolean;
}

/* ── Multi-source quote fetcher ───────────────────────────────── *
 *  Stocks/ETFs  → Finnhub /api/finnhub (real-time)              *
 *  Futures/Crypto → Yahoo /api/yahoo (15-min delayed but best   *
 *    available free source for these instruments)                *
 * ────────────────────────────────────────────────────────────── */
const FUTURES_SYMS = new Set(["NQ1!","ES1!","RTY1!","YM1!","GC1!","SI1!","CL1!","NG1!","ZB1!","ZN1!","ZF1!","ZT1!","HG1!","MNQ1!","MES1!","MYM1!","M2K1!","MGC1!","MCL1!"]);
const CRYPTO_SYMS  = new Set(["BTC","ETH","SOL","BNB","XRP","DOGE","ADA","AVAX","LINK","DOT","LTC","ATOM","UNI"]);

async function fetchQuote(sym: string): Promise<{ price:number; chg:number; pct:number } | null> {
  const up = sym.toUpperCase();

  // Futures → Yahoo (only free source for futures)
  if (FUTURES_SYMS.has(up) || up.endsWith("1!")) {
    try {
      const j = await fetch(`/api/yahoo?sym=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json());
      const price = j?.price ?? 0;
      const prev  = j?.prevClose ?? price;
      if (price > 0) return { price, chg: +(price-prev).toFixed(2), pct: prev ? +((price-prev)/prev*100).toFixed(2) : 0 };
    } catch {}
    return null;
  }

  // Crypto → Alpaca (FREE, no key required, real-time)
  if (CRYPTO_SYMS.has(up)) {
    try {
      const j = await fetch(`/api/alpaca?sym=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json());
      if (j?.price > 0) return { price: j.price, chg: j.change ?? 0, pct: j.changePct ?? 0 };
    } catch {}
    // Fallback to Yahoo for crypto
    try {
      const j = await fetch(`/api/yahoo?sym=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json());
      const price = j?.price ?? 0;
      const prev  = j?.prevClose ?? price;
      if (price > 0) return { price, chg: +(price-prev).toFixed(2), pct: prev ? +((price-prev)/prev*100).toFixed(2) : 0 };
    } catch {}
    return null;
  }

  // Stocks/ETFs → Alpaca first (if key set), then Finnhub, then Yahoo
  try {
    const j = await fetch(`/api/alpaca?sym=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json());
    if (j?.price > 0 && j.source === "alpaca") return { price: j.price, chg: j.change ?? 0, pct: j.changePct ?? 0 };
  } catch {}
  // Yahoo BEFORE Finnhub — Yahoo includes pre/post-market (matches TradingView);
  // Finnhub free is regular-hours-only and goes stale outside RTH.
  try {
    const j = await fetch(`/api/yahoo?sym=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json());
    const price = j?.price ?? 0;
    const prev  = j?.prevClose ?? price;
    if (price > 0) return { price, chg: +(price-prev).toFixed(2), pct: prev ? +((price-prev)/prev*100).toFixed(2) : 0 };
  } catch {}
  try {
    const j = await fetch(`/api/finnhub?sym=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json());
    if (j?.price > 0) return { price: j.price, chg: j.change ?? 0, pct: j.changePct ?? 0 };
  } catch {}
  return null;
}

async function fetchPolygonPrices(): Promise<Record<string, { price:number; chg:number; pct:number }>> {
  const results: Record<string, { price:number; chg:number; pct:number }> = {};
  await Promise.all(TAPE_SYMBOLS.filter(t => !t.sym.includes("/")).map(async t => {
    const q = await fetchQuote(t.sym);
    if (q) results[t.sym.toUpperCase()] = q;
  }));
  return results;
}

/* ── Individual item ───────────────────────────────────────── */
function TickerItem({ item, onClick, active }: {
  item: TickerState;
  onClick: () => void;
  active: boolean;
}) {
  const { sym, price, chg, pct, up, live } = item;
  const dp = price > 10_000 ? 0 : price > 100 ? 2 : price > 1 ? 4 : 6;
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded transition-colors group cursor-pointer ${
        active ? "bg-wm-surface" : "hover:bg-wm-surface/50"
      }`}
      title={live ? `Click to chart ${sym}` : `${sym}: waiting for a verified market quote`}
    >
      <span className={`text-[11px] font-bold ${active ? "text-wm-green" : "text-wm-text group-hover:text-wm-green"}`}>{sym}</span>
      {live ? (
        <>
          <span className="font-mono text-[11px] text-wm-text-muted">
            {price.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}
          </span>
          <span className={`flex items-center gap-0.5 font-mono text-[10px] ${up ? "text-wm-green" : "text-wm-red"}`}>
            {up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
            {chg >= 0 ? "+" : ""}{chg.toFixed(dp > 2 ? 4 : 2)} ({pct >= 0 ? "+" : ""}{pct.toFixed(2)}%)
          </span>
        </>
      ) : (
        <span className="font-mono text-[10px] text-wm-text-dim">quote pending</span>
      )}
    </button>
  );
}

/* ── Main component ────────────────────────────────────────── */
export function TickerTape() {
  const { activeSymbol, setActiveSymbol } = useActiveSymbol();
  const router   = useRouter();
  const pathname = usePathname();

  // Custom symbol list (persisted to localStorage).
  // HYDRATION-SAFE: the first render MUST match the server HTML, so we seed with
  // the deterministic default list and load the localStorage override in an
  // after-mount effect below. Reading localStorage in the initializer caused a
  // server/client text mismatch (React #418) for users with a customized tape.
  const [customSyms, setCustomSyms] = useState<string[]>(() => TAPE_SYMBOLS.map(t => t.sym));
  const [hydrated, setHydrated]   = useState(false);
  const [editOpen, setEditOpen]   = useState(false);
  const [addInput, setAddInput]   = useState("");
  const editRef = useRef<HTMLDivElement>(null);

  // HYDRATION-SAFE: seed with deterministic base prices so the first client
  // render matches the server HTML exactly. The window-cache fast-path (which
  // is non-deterministic vs SSR and caused React #418) runs in the after-mount
  // effect below.
  const [tickers, setTickers] = useState<TickerState[]>(() =>
    TAPE_SYMBOLS.map(t => ({ sym: t.sym, poly: t.poly, base: t.base, price: t.base, chg: 0, pct: 0, up: true, _open: t.base, live: false }))
  );

  // After mount (client only): pull the persisted symbol list + cached prices.
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("wm-tape-symbols") ?? "null");
      if (Array.isArray(stored) && stored.length) setCustomSyms(stored);
    } catch {}
    try {
      const w = (window as any).__wmTicker as Record<string, any> | undefined;
      const wAge = w?._ts ? Date.now() - w._ts : Infinity;
      if (w && Object.keys(w).length > 0 && wAge < 30_000) {
        setTickers(TAPE_SYMBOLS.map(t => {
          const p = w[t.sym.toUpperCase()];
          return p && p.verified === true && p.price > 0
            ? { sym: t.sym, poly: t.poly, base: t.base, price: p.price, chg: p.chg, pct: p.pct, up: p.chg >= 0, _open: t.base, live: true }
            : { sym: t.sym, poly: t.poly, base: t.base, price: t.base, chg: 0, pct: 0, up: true, _open: t.base, live: false };
        }));
      }
    } catch {}
    setHydrated(true);
  }, []);

  // Persist custom symbols (skip the initial pre-hydration default so we don't
  // clobber the stored list before the after-mount load runs).
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem("wm-tape-symbols", JSON.stringify(customSyms)); } catch {}
  }, [customSyms, hydrated]);

  // Close edit panel on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (editRef.current && !editRef.current.contains(e.target as Node)) setEditOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Derive the active TAPE_SYMBOLS entries filtered + ordered by customSyms
  const activeTapeSymbols = customSyms
    .map(sym => TAPE_SYMBOLS.find(t => t.sym === sym))
    .filter((t): t is typeof TAPE_SYMBOLS[0] => t !== undefined);

  /* ── Yahoo REST fetch on mount + every 10s ────────────── */
  useEffect(() => {
    const doFetch = async () => {
      const live = await fetchPolygonPrices();
      if (!Object.keys(live).length) return;
      setTickers(prev => {
        const updated = prev.map(t => {
          const key = t.sym.toUpperCase();
          if (live[key] && live[key].price > 0) {
            const { price, chg, pct } = live[key];
            return { ...t, price, chg, pct, up: chg >= 0, live: true };
          }
          return t;
        });
        // Write to window cache + localStorage so future HMR/reloads start with correct prices
        const priceCache: Record<string, any> = { _ts: Date.now() };
        for (const t of updated) {
          if (t.live) priceCache[t.sym] = { price: t.price, chg: t.chg, pct: t.pct, verified: true };
        }
        try { (window as any).__wmTicker = priceCache; } catch {}
        // NOTE: Not persisting to localStorage — cleared on init to prevent stale day-change%
        return updated;
      });
    };

    doFetch();
    const id = setInterval(doFetch, 10_000);
    // Fire immediately when tab becomes visible (fixes background-tab throttling)
    const onVisible = () => { if (document.visibilityState === "visible") doFetch(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  const handleClick = (sym: string) => {
    setActiveSymbol(sym);
    if (pathname !== "/charts") {
      router.push("/charts");
    }
  };

  // Visible tickers = only those in customSyms, in order
  const visibleTickers = customSyms
    .map(sym => tickers.find(t => t.sym === sym))
    .filter((t): t is TickerState => t !== undefined);

  /* Double the list for seamless scroll loop */
  const doubled: TickerState[] = [...visibleTickers, ...visibleTickers];

  const handleAddSym = (sym: string) => {
    const s = sym.trim().toUpperCase();
    if (!s || customSyms.includes(s)) return;
    // Allow any symbol — add to TAPE_SYMBOLS runtime if not already there
    if (!TAPE_SYMBOLS.find(t => t.sym === s)) {
      // Determine a base price from common symbols or default
      const BASES: Record<string,number> = {
        "NQ1!":30_476,"ES1!":7_595,"RTY1!":2_968,"YM1!":52_464,
        "GC1!":4_349,"CL1!":75.68,"SI1!":69.97,"ZB1!":113.06,"ZN1!":109.88,"HG1!":4.50,
        "BTC":64_500,"ETH":1_760,"SOL":71.77,"XRP":1.188,"DOGE":0.086,
        "ADA":0.75,"AVAX":25,"BNB":601,
        "AAPL":299,"TSLA":405,"NVDA":207,"SPY":750,"QQQ":730,
        "GLD":398,"AMZN":246,"META":600,"MSFT":394,"GOOG":371,
        "AMD":507,"INTC":22,"NFLX":78.72,"IWM":292,"XLK":240,
        "JPM":331,"GS":1_091,"BAC":46,"V":360,"MA":560,"UNH":310,"LLY":870,
        "EUR/USD":1.13,"GBP/USD":1.34,"USD/JPY":144,"AUD/USD":0.645,
      };
      const base = BASES[s] ?? 100;
      (TAPE_SYMBOLS as any[]).push({ sym: s, poly: s.includes("1!") || s.includes("/") ? null : s, base });
      setTickers(prev => [...prev, { sym:s, poly: s.includes("1!") || s.includes("/") ? null : s, base, price:base, chg:0, pct:0, up:true, _open:base, live:false }]);
    }
    setCustomSyms(prev => [...prev, s]);
  };

  return (
    <div className="h-full flex items-center relative" style={{ overflow: "hidden" }}>
      <div className="ticker-wrap flex-1 h-full flex items-center" style={{ overflow: "hidden" }}>
        <div className="ticker-inner">
          {doubled.map((t, i) => (
            <React.Fragment key={i}>
              <TickerItem
                item={t}
                onClick={() => handleClick(t.sym)}
                active={t.sym === activeSymbol && pathname === "/charts"}
              />
              <span className="text-wm-border text-xs select-none">|</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Edit button */}
      <div className="relative shrink-0" ref={editRef}>
        <button
          onClick={() => setEditOpen(o => !o)}
          className="flex items-center justify-center w-6 h-6 mx-1 rounded hover:bg-wm-surface text-wm-text-dim hover:text-wm-text transition-colors"
          title="Customize ticker tape symbols"
        >
          <Pencil size={11} />
        </button>

        {editOpen && (
          <div
            className="absolute right-0 bottom-full mb-1 z-[300] w-64 bg-wm-card border border-wm-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: 320 }}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-wm-border shrink-0">
              <span className="text-[11px] font-black text-wm-text">Tape Symbols</span>
              <button onClick={() => setEditOpen(false)}>
                <X size={12} className="text-wm-text-muted hover:text-wm-text" />
              </button>
            </div>

            {/* Current symbols list */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {customSyms.map(sym => (
                <div key={sym} className="flex items-center justify-between px-3 py-1.5 hover:bg-wm-surface/50 group">
                  <span className="text-[11px] font-bold text-wm-text">{sym}</span>
                  <button
                    onClick={() => setCustomSyms(prev => prev.filter(s => s !== sym))}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-wm-text-muted hover:text-wm-red"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add input */}
            <div className="border-t border-wm-border px-2 py-2 shrink-0">
              <div className="flex items-center gap-1 bg-wm-surface rounded border border-wm-border px-2 py-1">
                <input
                  value={addInput}
                  onChange={e => setAddInput(e.target.value.toUpperCase())}
                  onKeyDown={e => {
                    if (e.key === "Enter") { handleAddSym(addInput); setAddInput(""); }
                  }}
                  placeholder="Add symbol…"
                  list="tape-syms-list"
                  className="flex-1 bg-transparent text-[11px] text-wm-text outline-none placeholder-wm-text-dim"
                />
                <button
                  onClick={() => { handleAddSym(addInput); setAddInput(""); }}
                  className="text-wm-green hover:text-wm-text transition-colors"
                >
                  <Plus size={12} />
                </button>
              </div>
              <datalist id="tape-syms-list">
                {ALL_TAPE_SYMS.map(s => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <div className="text-[9px] text-wm-text-dim mt-1 px-1">
                Type any ticker (stocks, futures, crypto, forex) and press Enter.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
