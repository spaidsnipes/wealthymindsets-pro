"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";
import { CURATED_SYMBOLS, matchCuratedSymbols } from "@/lib/marketData/curatedSymbolCatalog";

/**
 * The shortlist is NOT declared here any more. It is owned by
 * `curatedSymbolCatalog`, because the shell's search dialog offers the same
 * list and the two copies had already drifted — including one calling `VX1!`
 * an index while the other promised a futures contract.
 */
const LOCAL_SYMBOLS = CURATED_SYMBOLS;

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
  // Matching is the catalog owner's job too: two surfaces that rank the same
  // query differently are still two answers to one question.
  const localMatches = query.length >= 1
    ? matchCuratedSymbols(query, 10)
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
