"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";
import {
  reconcileSearchCategory,
  type SearchCategory,
} from "@/lib/marketData/searchResultCategory";

/**
 * The built-in shortlist. Its `cat` is a CURATOR'S OPINION, and is treated
 * exactly like a search vendor's: authoritative where the class owner has none,
 * allowed to refine an equity into an ETF, and overruled where it contradicts.
 * See `CURATED_SYMBOLS` below for what that reconciliation changed and why.
 */
const RAW_LOCAL_SYMBOLS = [
  // ── Futures ──────────────────────────────────────────────
  { sym:"NQ1!",  label:"Nasdaq-100 Futures",        cat:"Futures", aliases:["nasdaq","nq","tech futures","mnq"] },
  { sym:"ES1!",  label:"S&P 500 Futures",           cat:"Futures", aliases:["sp500","es","spy futures","mes"] },
  { sym:"RTY1!", label:"Russell 2000 Futures",      cat:"Futures", aliases:["rty","russell","m2k"] },
  { sym:"YM1!",  label:"Dow Jones Futures",         cat:"Futures", aliases:["ym","dow","us30 futures","mym"] },
  { sym:"GC1!",  label:"Gold Futures",              cat:"Futures", aliases:["gold","xauusd","xau","mgc"] },
  { sym:"CL1!",  label:"Crude Oil WTI Futures",     cat:"Futures", aliases:["oil","crude","wti","mcl"] },
  { sym:"SI1!",  label:"Silver Futures",            cat:"Futures", aliases:["silver","xagusd","sil"] },
  { sym:"HG1!",  label:"Copper Futures",            cat:"Futures", aliases:["copper"] },
  { sym:"ZB1!",  label:"30-Year T-Bond Futures",    cat:"Futures", aliases:["bonds","treasury","zb"] },
  { sym:"ZN1!",  label:"10-Year T-Note Futures",    cat:"Futures", aliases:["10yr","zn","notes"] },
  { sym:"6E1!",  label:"Euro Futures",              cat:"Futures", aliases:["euro","eurusd futures","6e"] },
  { sym:"6J1!",  label:"Yen Futures",               cat:"Futures", aliases:["yen","usdjpy futures","6j"] },
  { sym:"6B1!",  label:"British Pound Futures",     cat:"Futures", aliases:["pound","gbpusd futures","6b"] },
  // Labelled for what LOADS, not for what the ticker looks like: this app
  // resolves `VX1!` to the `^VIX` cash index (yahooSymbol.ts), so a trader who
  // picked "VIX Futures" here was handed the index and told it was a contract.
  { sym:"VX1!",  label:"VIX Index (via VX1!)",      cat:"Index",   aliases:["vix","volatility","fear"] },
  { sym:"NG1!",  label:"Natural Gas Futures",       cat:"Futures", aliases:["natgas","natural gas"] },
  // ── Forex / FX ───────────────────────────────────────────
  { sym:"EURUSD", label:"Euro / US Dollar",         cat:"Forex", aliases:["euro dollar","6e","eur"] },
  { sym:"GBPUSD", label:"British Pound / USD",      cat:"Forex", aliases:["cable","pound","gbp","sterling"] },
  { sym:"USDJPY", label:"US Dollar / Japanese Yen", cat:"Forex", aliases:["dollar yen","jpy","yen"] },
  { sym:"XAUUSD", label:"Gold / US Dollar (Spot)",  cat:"Forex", aliases:["gold","xau","spot gold","gc"] },
  { sym:"XAGUSD", label:"Silver / US Dollar (Spot)",cat:"Forex", aliases:["silver","xag","spot silver"] },
  { sym:"US30",   label:"Dow Jones Index (Cash)",   cat:"Forex", aliases:["dow","dji","dow jones","us30","ym"] },
  { sym:"US500",  label:"S&P 500 Index (Cash)",     cat:"Forex", aliases:["sp500","spx","s&p","us500"] },
  { sym:"US100",  label:"Nasdaq 100 Index (Cash)",  cat:"Forex", aliases:["nasdaq","ndx","us100","nq"] },
  { sym:"USDCAD", label:"US Dollar / Canadian Dollar",  cat:"Forex", aliases:["loonie","cad","usdcad"] },
  { sym:"AUDUSD", label:"Australian Dollar / USD",  cat:"Forex", aliases:["aussie","aud","audusd"] },
  { sym:"NZDUSD", label:"New Zealand Dollar / USD", cat:"Forex", aliases:["kiwi","nzd"] },
  { sym:"USDCHF", label:"US Dollar / Swiss Franc",  cat:"Forex", aliases:["swissy","chf"] },
  { sym:"GBPJPY", label:"British Pound / Yen",      cat:"Forex", aliases:["guppy","gbpjpy"] },
  { sym:"EURJPY", label:"Euro / Japanese Yen",      cat:"Forex", aliases:["eurjpy","ej"] },
  { sym:"EURGBP", label:"Euro / British Pound",     cat:"Forex", aliases:["eurgbp"] },
  { sym:"USOIL",  label:"US Oil (WTI Spot)",        cat:"Forex", aliases:["oil","crude","wti","usoil"] },
  { sym:"UKOIL",  label:"Brent Crude Oil",          cat:"Forex", aliases:["brent","brent crude"] },
  // ── Stocks ───────────────────────────────────────────────
  { sym:"AAPL",  label:"Apple Inc.",                cat:"Stock" },
  { sym:"TSLA",  label:"Tesla Inc.",                cat:"Stock" },
  { sym:"NVDA",  label:"NVIDIA Corporation",        cat:"Stock" },
  { sym:"AMZN",  label:"Amazon.com Inc.",           cat:"Stock" },
  { sym:"META",  label:"Meta Platforms",            cat:"Stock" },
  { sym:"MSFT",  label:"Microsoft Corp.",           cat:"Stock" },
  { sym:"GOOG",  label:"Alphabet Inc.",             cat:"Stock" },
  { sym:"GOOGL", label:"Alphabet Inc. (A)",         cat:"Stock" },
  { sym:"AVGO",  label:"Broadcom Inc.",             cat:"Stock" },
  { sym:"AMD",   label:"Advanced Micro Devices",    cat:"Stock" },
  { sym:"INTC",  label:"Intel Corporation",         cat:"Stock" },
  { sym:"NFLX",  label:"Netflix Inc.",              cat:"Stock" },
  { sym:"JPM",   label:"JPMorgan Chase",            cat:"Stock" },
  { sym:"GS",    label:"Goldman Sachs",             cat:"Stock" },
  { sym:"V",     label:"Visa Inc.",                 cat:"Stock" },
  { sym:"MA",    label:"Mastercard",                cat:"Stock" },
  { sym:"LLY",   label:"Eli Lilly",                 cat:"Stock" },
  { sym:"RIVN",  label:"Rivian Automotive",         cat:"Stock" },
  { sym:"PLTR",  label:"Palantir Technologies",     cat:"Stock" },
  { sym:"COIN",  label:"Coinbase Global",           cat:"Stock" },
  { sym:"HOOD",  label:"Robinhood Markets",         cat:"Stock" },
  { sym:"GME",   label:"GameStop Corp.",            cat:"Stock" },
  { sym:"AMC",   label:"AMC Entertainment",         cat:"Stock" },
  { sym:"MSTR",  label:"MicroStrategy (BTC proxy)", cat:"Stock" },
  { sym:"SMCI",  label:"Super Micro Computer",      cat:"Stock" },
  { sym:"ARM",   label:"ARM Holdings",              cat:"Stock" },
  { sym:"DJT",   label:"Trump Media & Technology",  cat:"Stock" },
  { sym:"RKLB",  label:"Rocket Lab",                cat:"Stock" },
  { sym:"LUNR",  label:"Intuitive Machines",        cat:"Stock" },
  // ── ETFs ─────────────────────────────────────────────────
  { sym:"SPY",   label:"SPDR S&P 500 ETF",          cat:"ETF" },
  { sym:"QQQ",   label:"Invesco QQQ (Nasdaq 100)",  cat:"ETF" },
  { sym:"IWM",   label:"iShares Russell 2000 ETF",  cat:"ETF" },
  { sym:"GLD",   label:"SPDR Gold Shares",          cat:"ETF" },
  { sym:"SLV",   label:"iShares Silver Trust",      cat:"ETF" },
  { sym:"TLT",   label:"iShares 20+ Year T-Bond",   cat:"ETF" },
  { sym:"XLK",   label:"Technology Select SPDR",    cat:"ETF" },
  { sym:"XLF",   label:"Financial Select SPDR",     cat:"ETF" },
  { sym:"XLE",   label:"Energy Select SPDR",        cat:"ETF" },
  { sym:"SOXS",  label:"Direxion Semi Bear 3x",     cat:"ETF" },
  { sym:"SOXL",  label:"Direxion Semi Bull 3x",     cat:"ETF" },
  { sym:"TQQQ",  label:"ProShares UltraPro QQQ 3x", cat:"ETF" },
  { sym:"SQQQ",  label:"ProShares UltraPro Sh QQQ", cat:"ETF" },
  { sym:"UVXY",  label:"ProShares Ultra VIX",        cat:"ETF" },
  { sym:"VXX",   label:"iPath VIX Short-Term Futures",cat:"ETF" },
  // ── Crypto ───────────────────────────────────────────────
  { sym:"BTCUSD", label:"Bitcoin / USD",            cat:"Crypto", aliases:["btc","bitcoin"] },
  { sym:"ETHUSD", label:"Ethereum / USD",           cat:"Crypto", aliases:["eth","ethereum"] },
  { sym:"SOLUSD", label:"Solana / USD",             cat:"Crypto", aliases:["sol","solana"] },
  { sym:"BNBUSD", label:"BNB / USD",                cat:"Crypto", aliases:["bnb"] },
  { sym:"XRPUSD", label:"XRP / USD",               cat:"Crypto", aliases:["xrp","ripple"] },
  { sym:"DOGEUSD",label:"Dogecoin / USD",           cat:"Crypto", aliases:["doge","dogecoin"] },
  { sym:"ADAUSD", label:"Cardano / USD",            cat:"Crypto", aliases:["ada","cardano"] },
  { sym:"AVAXUSD",label:"Avalanche / USD",          cat:"Crypto", aliases:["avax"] },
  { sym:"LINKUSD",label:"Chainlink / USD",          cat:"Crypto", aliases:["link","chainlink"] },
  { sym:"MATICUSD",label:"Polygon / USD",           cat:"Crypto", aliases:["matic","polygon"] },
  { sym:"PEPEUSD",label:"Pepe / USD",               cat:"Crypto", aliases:["pepe","meme"] },
  { sym:"SHIBUSD",label:"Shiba Inu / USD",          cat:"Crypto", aliases:["shib","shiba"] },
  { sym:"SUIUSD", label:"Sui / USD",                cat:"Crypto", aliases:["sui"] },
  { sym:"WIFUSD", label:"dogwifhat / USD",          cat:"Crypto", aliases:["wif","dogwifhat"] },
  { sym:"BONKUSD",label:"Bonk / USD",               cat:"Crypto", aliases:["bonk"] },
  { sym:"FLOKIUSD",label:"Floki / USD",             cat:"Crypto", aliases:["floki"] },
];

/**
 * The shortlist, reconciled against the class owner — the SAME rule the live
 * vendor results go through, so the two halves of one dropdown cannot disagree
 * in front of the trader.
 *
 * MEASURED before this was added (2026-09-11), local badge vs owner:
 *
 *   KEPT, curator is more specific — the owner cannot see a fund wrapper:
 *     SPY QQQ IWM GLD SLV TLT XLK XLF XLE SOXL SOXS TQQQ SQQQ UVXY VXX → ETF
 *   KEPT, owner has NO opinion, so the curator is the only source:
 *     US30 US500 US100 USOIL UKOIL → Forex
 *   CORRECTED, curator contradicted the owner:
 *     VX1!   Futures → Index    resolves to ^VIX, a cash index
 *     XAUUSD Forex   → Futures  resolves to GC=F
 *     XAGUSD Forex   → Futures  resolves to SI=F
 *
 * SEPARATELY KNOWN AND STILL BROKEN: those five CFD rows answer
 * {"error":"No data"}. They are offered here and cannot be charted. Mapping
 * them to ^DJI/CL=F was tried this session and reverted — see yahooSymbol.ts.
 * The badge is not the defect and must not be used to hide it.
 *
 * The last three are the point. A badge saying "Forex" over a row whose data
 * arrives from a CME futures contract names a venue the price never came from.
 */
const LOCAL_SYMBOLS = RAW_LOCAL_SYMBOLS.map((s) => ({
  ...s,
  cat: reconcileSearchCategory(s.sym, s.cat as SearchCategory),
}));

const CAT_COLOR: Record<string, string> = {
  Futures: "text-wm-gold",
  Stock: "text-wm-blue",
  ETF: "text-wm-green",
  Crypto: "text-wm-purple",
  Forex: "text-wm-text-muted",
};

interface Props {
  value: string;
  onChange: (sym: string) => void;
  placeholder?: string;
  className?: string;
}

export function SymbolSearch({ value, onChange, placeholder = "Search symbol…", className = "" }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [liveResults, setLiveResults] = useState<{ sym: string; label: string; cat: string }[]>([]);
  const [searching, setSearching] = useState(false);
  /**
   * Why the LIVE half of this dropdown is empty, when it is empty for a reason
   * other than "no such ticker".
   *
   * `doSearch` used to `catch { /* ignore *\/ }` and read `json.results ?? []`,
   * so a route that had answered 503 with the exact missing variable named
   * rendered as "No results for ..." — a sentence about the MARKET, produced by
   * a failure in this app. The trader's next move after those two messages is
   * different, so they may not look the same.
   */
  const [liveFailure, setLiveFailure] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Keep query in sync when value changes externally
  useEffect(() => { setQuery(value); }, [value]);

  // Local filter — matches symbol, label, and aliases
  const q = query.toLowerCase().replace(/[/\-_\s]/g, "");
  const localMatches = query.length >= 1
    ? LOCAL_SYMBOLS.filter(s => {
        const symClean = s.sym.toLowerCase().replace(/[/\-_\s!]/g, "");
        const qClean   = q.replace(/!/g, "");
        return symClean.startsWith(qClean) ||
               symClean.includes(qClean) ||
               s.label.toLowerCase().includes(query.toLowerCase()) ||
               (s as typeof s & { aliases?: string[] }).aliases?.some(a => a.includes(query.toLowerCase()));
      })
      .sort((a, b) => {
        // Exact prefix matches first
        const aExact = a.sym.toLowerCase().startsWith(q);
        const bExact = b.sym.toLowerCase().startsWith(q);
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return 0;
      })
      .slice(0, 10)
    : LOCAL_SYMBOLS.slice(0, 8);

  // Dedupe live results against local
  const localSymSet = new Set(localMatches.map(s => s.sym));
  const allResults = [
    ...localMatches,
    ...liveResults.filter(r => !localSymSet.has(r.sym)),
  ].slice(0, 14);

  // Debounced Polygon search
  const doSearch = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.length < 1) { setLiveResults([]); setLiveFailure(null); setSearching(false); return; }
    setSearching(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/symbol-search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const json = await res.json() as {
          results?: { sym: string; label: string; cat: string }[];
          error?: string;
        };
        if (json.error) {
          setLiveResults([]);
          setLiveFailure(json.error);
          return;
        }
        const hits = (json.results ?? []).slice(0, 8).map((r) => ({
          sym: r.sym,
          label: r.label,
          cat: r.cat,
        }));
        setLiveResults(hits);
        setLiveFailure(null);
      } catch (err) {
        setLiveResults([]);
        setLiveFailure(`Symbol search could not be reached (${String(err)}). Local symbols are still listed.`);
      }
      finally { setSearching(false); }
    }, 300);
  }, []);

  const handleInput = (q: string) => {
    setQuery(q);
    setOpen(true);
    doSearch(q);
  };

  const pick = (sym: string) => {
    setQuery(sym);
    setOpen(false);
    onChange(sym);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2 bg-wm-surface border border-wm-border rounded-lg px-2.5 py-1.5 focus-within:border-wm-green/50 transition-colors">
        <Search size={12} className="text-wm-text-dim shrink-0" />
        <input
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === "Enter" && query) pick(query.toUpperCase());
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-xs text-wm-text outline-none font-mono placeholder-wm-text-dim"
          autoComplete="off"
        />
        {searching && <div className="w-3 h-3 rounded-full border-2 border-wm-blue border-t-transparent animate-spin shrink-0" />}
        {query && !searching && (
          <button onClick={() => { setQuery(""); setLiveResults([]); onChange(""); }} className="text-wm-text-dim hover:text-wm-text">
            <X size={11} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-wm-dark border border-wm-border rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
          {allResults.map((s, i) => (
            <button
              key={`${s.sym}-${i}`}
              onMouseDown={() => pick(s.sym)}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-wm-surface transition-colors text-left"
            >
              <div className="w-9 h-7 rounded bg-wm-surface border border-wm-border flex items-center justify-center text-[9px] font-black text-wm-text shrink-0">
                {s.sym.slice(0, 4)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-wm-text">{s.sym}</div>
                <div className="text-[9px] text-wm-text-dim truncate">{s.label}</div>
              </div>
              <span className={`text-[9px] font-semibold shrink-0 ${CAT_COLOR[s.cat] ?? "text-wm-text-muted"}`}>
                {s.cat}
              </span>
            </button>
          ))}
          {/*
            A failure to ASK is reported even when local symbols matched, because
            otherwise a partial list looks like a complete one.
          */}
          {liveFailure && !searching && (
            <div className="px-3 py-2 border-b border-wm-border/60 text-[9px] leading-relaxed text-wm-gold">
              Live search unavailable — showing built-in symbols only. {liveFailure}
            </div>
          )}
          {query && allResults.length === 0 && !searching && (
            <div className="px-3 py-3 text-center">
              <div className="text-wm-text-dim text-xs mb-1">
                {liveFailure
                  ? `No built-in symbol matches “${query}”`
                  : `No results for “${query}”`}
              </div>
              <button onMouseDown={() => pick(query.toUpperCase())} className="text-wm-blue text-xs hover:underline">
                Use &ldquo;{query.toUpperCase()}&rdquo; anyway →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
