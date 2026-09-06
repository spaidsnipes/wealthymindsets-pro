"use client";

import React, { useEffect, useState, useRef } from "react";
import { TrendingUp, TrendingDown, Pencil, X, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import { priceSourceBadge } from "@/lib/priceSource";
import { CanonicalFidelityBadge } from "@/components/marketData/CanonicalFidelityBadge";
import { selectPerCapabilityFidelity } from "@/lib/marketData/selectPerCapabilityFidelity";
import { yahooQuoteObserved } from "@/lib/marketData/yahooQuoteObserved";
import { useProvenSessionClosure } from "@/lib/marketData/useProvenSessionClosure";

// WM-SEC-P0-05 (2026-08-08): client-side Polygon key read removed. The
// NEXT_PUBLIC_POLYGON_KEY that used to live here shipped the API key
// into the browser bundle (same class as the Finnhub bug WM-SEC-P0-03
// just fixed) and the key value is in public git history — see
// docs/operations/AUDIT_2026-08-08_10-POINT.md CRITICAL-A. Any Polygon
// call chain originating here no-ops via the empty-key guards below;
// tape falls back to the Yahoo / Alpaca REST paths. Rebuild via a
// server proxy once POLYGON_KEY is set server-only in Vercel.
const POLYGON_KEY = "";

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

import { selectQuoteChange } from "@/lib/quoteChange";

interface TickerState {
  sym:   string;
  price: number;
  chg:   number;
  pct:   number;
  /** False when the provider gave a price but no session change. */
  chgObserved: boolean;
  up:    boolean;
  poly:  string | null;
  base:  number;
  _open: number;
  live:  boolean;
  src?:  string;
}

/* ── Multi-source quote fetcher ───────────────────────────────── *
 *  Stocks/ETFs  → Finnhub /api/finnhub (real-time)              *
 *  Futures/Crypto → Yahoo /api/yahoo (15-min delayed but best   *
 *    available free source for these instruments)                *
 * ────────────────────────────────────────────────────────────── */
const FUTURES_SYMS = new Set(["NQ1!","ES1!","RTY1!","YM1!","GC1!","SI1!","CL1!","NG1!","ZB1!","ZN1!","ZF1!","ZT1!","HG1!","MNQ1!","MES1!","MYM1!","M2K1!","MGC1!","MCL1!"]);
const CRYPTO_SYMS  = new Set(["BTC","ETH","SOL","BNB","XRP","DOGE","ADA","AVAX","LINK","DOT","LTC","ATOM","UNI"]);

// SF-D01 consumer gate — shared with paper + scanner consumers so all
// three surfaces consult one predicate. See yahooQuoteObserved.ts +
// yahooQuoteObserved.test.ts for the truth contract.

async function fetchQuote(sym: string): Promise<{ price:number; chg:number; pct:number; chgObserved:boolean; src:string } | null> {
  const up = sym.toUpperCase();

  // Futures → Yahoo (only free source for futures)
  if (FUTURES_SYMS.has(up) || up.endsWith("1!")) {
    try {
      const j = await fetch(`/api/yahoo?sym=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json());
      const price = j?.price ?? 0;
      const yc = selectQuoteChange({ price, prevClose: j?.prevClose });
      if (price > 0 && yahooQuoteObserved(j)) return { price, chg: yc.observed ? yc.chg : 0, pct: yc.observed ? yc.pct : 0, chgObserved: yc.observed, src: "yahoo" };
    } catch {}
    return null;
  }

  // Crypto → public Coinbase quote. The real executed tape is owned by the
  // WebSocket path; this bounded quote request must never hit Alpaca's equity
  // route or claim a broker connection.
  if (CRYPTO_SYMS.has(up)) {
    try {
      const j = await fetch(`/api/exchange?ex=coinbase&coin=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json());
      if (j?.price > 0) { const qc = selectQuoteChange({ price: j.price, prevClose: j?.prevClose, change: j?.change, changePct: j?.changePct }); return { price: j.price, chg: qc.observed ? qc.chg : 0, pct: qc.observed ? qc.pct : 0, chgObserved: qc.observed, src: "coinbase" }; }
    } catch {}
    // Fallback to Yahoo for crypto
    try {
      const j = await fetch(`/api/yahoo?sym=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json());
      const price = j?.price ?? 0;
      const yc = selectQuoteChange({ price, prevClose: j?.prevClose });
      if (price > 0 && yahooQuoteObserved(j)) return { price, chg: yc.observed ? yc.chg : 0, pct: yc.observed ? yc.pct : 0, chgObserved: yc.observed, src: "yahoo" };
    } catch {}
    return null;
  }

  // Stocks/ETFs use the same consolidated-first semantic as MainChart and the
  // watchlist. Independent consumers must not disagree on LIVE vs DELAYED.
  try {
    const j = await fetch(`/api/yahoo?sym=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json());
    const price = j?.price ?? 0;
    const yc = selectQuoteChange({ price, prevClose: j?.prevClose });
    if (price > 0 && yahooQuoteObserved(j)) return { price, chg: yc.observed ? yc.chg : 0, pct: yc.observed ? yc.pct : 0, chgObserved: yc.observed, src: "yahoo" };
  } catch {}
  try {
    const j = await fetch(`/api/alpaca?sym=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json());
    if (j?.price > 0 && j.source === "alpaca") { const qc = selectQuoteChange({ price: j.price, prevClose: j?.prevClose, change: j?.change, changePct: j?.changePct }); return { price: j.price, chg: qc.observed ? qc.chg : 0, pct: qc.observed ? qc.pct : 0, chgObserved: qc.observed, src: "alpaca" }; }
  } catch {}
  try {
    const j = await fetch(`/api/finnhub?sym=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json());
    if (j?.price > 0) { const qc = selectQuoteChange({ price: j.price, prevClose: j?.prevClose, change: j?.change, changePct: j?.changePct }); return { price: j.price, chg: qc.observed ? qc.chg : 0, pct: qc.observed ? qc.pct : 0, chgObserved: qc.observed, src: "finnhub" }; }
  } catch {}
  return null;
}

async function fetchPolygonPrices(symbols: readonly (typeof TAPE_SYMBOLS)[number][]): Promise<Record<string, { price:number; chg:number; pct:number; chgObserved:boolean; src:string }>> {
  const results: Record<string, { price:number; chg:number; pct:number; chgObserved:boolean; src:string }> = {};
  await Promise.all(symbols.filter(t => !t.sym.includes("/")).map(async t => {
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
  const { sym, price, chg, pct, chgObserved, up, live, src } = item;
  const dp = price > 10_000 ? 0 : price > 100 ? 2 : price > 1 ? 4 : 6;
  // Provenance: name the feed each quote came from so a value that differs from
  // the chart header or watchlist is explainable, not a silent contradiction.
  // Canon "CLOSED IS NOT DELAYED": on a proven-closed session the rail must
  // not print ACTIVE over a market that is not trading. `null` until mount and
  // on every weekday, so provider labelling is untouched the rest of the time.
  const sessionOpen = useProvenSessionClosure(sym);
  const quoteObservation = {present: Boolean(src) && Number.isFinite(price) && price > 0};
  const badge = priceSourceBadge(src ?? "unavailable", live, sessionOpen, quoteObservation);
  // SHIFT-U continuation — per-capability tooltip enrichment: bars +
  // quotes lit from the ticker's own source; other slots silent.
  const capabilityReport = selectPerCapabilityFidelity({
    source: src ?? "unavailable",
    connected: live,
    hasCandles: false, // The rail owns quote receipts, not candle observations.
    quoteObservation,
    // The visible chip took closure into account one line above; omitting
    // it here made the HOVER tooltip contradict the very chip it explains.
    // Canon §Provider Status: one fact, one answer, per capability.
    sessionOpen,
  });
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded transition-colors group cursor-pointer ${
        active ? "bg-wm-surface" : "hover:bg-wm-surface/50"
      }`}
      title={live ? `${sym} — ${badge.title}. Click to chart.` : `${sym}: waiting for a verified market quote`}
    >
      <span className={`text-[11px] font-bold ${active ? "text-wm-green" : "text-wm-text group-hover:text-wm-green"}`}>{sym}</span>
      {live ? (
        <>
          {/* SHIFT-R atom 4 — CanonicalFidelityBadge (ticker variant)
              replaces the hand-rolled dot + freshness label. The canon
              7-question tooltip enrichment now appears on every ticker
              row for free (canon §Failure Recovery Grammar). */}
          <CanonicalFidelityBadge badge={badge} variant="ticker" titleSuffix={`${sym} — Click to chart.`} capabilityReport={capabilityReport} />
          <span className="font-mono text-[11px] text-wm-text-muted">
            {price.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}
          </span>
          {chgObserved ? (
            <span className={`flex items-center gap-0.5 font-mono text-[10px] ${up ? "text-wm-green" : "text-wm-red"}`}>
              {up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
              {chg >= 0 ? "+" : ""}{chg.toFixed(dp > 2 ? 4 : 2)} ({pct >= 0 ? "+" : ""}{pct.toFixed(2)}%)
            </span>
          ) : (
            // Price observed, session change was not. "+0.00 (+0.00%)" here
            // would assert this symbol is flat on the day.
            <span className="font-mono text-[10px] text-wm-text-dim"
              title={`${sym}: this feed returned a price but no session change.`}>
              chg —
            </span>
          )}
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
    TAPE_SYMBOLS.map(t => ({ sym: t.sym, poly: t.poly, base: t.base, price: t.base, chg: 0, pct: 0, chgObserved: false, up: true, _open: t.base, live: false }))
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
            ? { sym: t.sym, poly: t.poly, base: t.base, price: p.price, chg: p.chg, pct: p.pct,
                chgObserved: p.chgObserved === true, up: p.chg >= 0, _open: t.base, live: true, src: p.src }
            : { sym: t.sym, poly: t.poly, base: t.base, price: t.base, chg: 0, pct: 0, chgObserved: false, up: true, _open: t.base, live: false };
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

  // Resolve the user's tape once. Charts already has a full watchlist and
  // symbol header, so its global rail becomes a calm four-symbol pulse rather
  // than a second competing watchlist. Other routes keep the full custom tape.
  const activeTapeSymbols = customSyms
    .map(sym => TAPE_SYMBOLS.find(t => t.sym === sym))
    .filter((t): t is typeof TAPE_SYMBOLS[0] => t !== undefined);
  const chartPulseSymbols = [
    ...activeTapeSymbols.filter(t => t.sym === activeSymbol),
    ...activeTapeSymbols.filter(t => t.sym !== activeSymbol),
  ].slice(0, 4);
  const requestedTapeSymbols = pathname === "/charts" ? chartPulseSymbols : activeTapeSymbols;
  // Depend on the CONTENT of the requested list, not the array identity.
  // `customSyms` is state holding an array: the after-mount effect calls
  // setCustomSyms(stored), which produces a NEW array even when the contents
  // are identical to the default. The polling effect below listed `customSyms`
  // as a dependency, so every mount ran a full fetch round for each new
  // identity — measured on prod as 39 quote requests per page load where 13
  // would do, on every route (this tape lives in the shell).
  // Canon §MACHINE PERFORMANCE: bounded compute, no duplicate subscriptions.
  const requestedTapeKey = requestedTapeSymbols.map(t => t.sym).join(",");

  /* ── Yahoo REST fetch on mount + every 10s ────────────── */
  useEffect(() => {
    const doFetch = async () => {
      const live = await fetchPolygonPrices(requestedTapeSymbols);
      if (!Object.keys(live).length) return;
      setTickers(prev => {
        const updated = prev.map(t => {
          const key = t.sym.toUpperCase();
          if (live[key] && live[key].price > 0) {
            const { price, chg, pct, chgObserved, src } = live[key];
            return { ...t, price, chg, pct, chgObserved, up: chg >= 0, live: true, src };
          }
          return t;
        });
        // Write to window cache + localStorage so future HMR/reloads start with correct prices
        const priceCache: Record<string, any> = { _ts: Date.now() };
        for (const t of updated) {
          if (t.live) priceCache[t.sym] = { price: t.price, chg: t.chg, pct: t.pct, chgObserved: t.chgObserved, verified: true, src: t.src };
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
    // requestedTapeKey is a stable string: re-subscribe only when the SET of
    // symbols actually changes, never merely because a new array was allocated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedTapeKey]);

  const handleClick = (sym: string) => {
    setActiveSymbol(sym);
    if (pathname !== "/charts") {
      router.push("/charts");
    }
  };

  // Visible tickers = only those in customSyms, in order
  const visibleTickers = (pathname === "/charts" ? chartPulseSymbols.map(t => t.sym) : customSyms)
    .map(sym => tickers.find(t => t.sym === sym))
    .filter((t): t is TickerState => t !== undefined);

  /* Charts keeps one stable pulse; other routes retain the seamless loop. */
  const renderedTickers: TickerState[] = pathname === "/charts"
    ? visibleTickers
    : [...visibleTickers, ...visibleTickers];

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
      setTickers(prev => [...prev, { sym:s, poly: s.includes("1!") || s.includes("/") ? null : s, base, price:base, chg:0, pct:0, chgObserved:false, up:true, _open:base, live:false }]);
    }
    setCustomSyms(prev => [...prev, s]);
  };

  return (
    <div className="h-full flex items-center relative" style={{ overflow: "hidden" }}>
      <div className="ticker-wrap flex-1 h-full flex items-center" style={{ overflow: "hidden" }}>
        <div className="ticker-inner" style={pathname === "/charts" ? { animation: "none" } : undefined}>
          {renderedTickers.map((t, i) => (
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
