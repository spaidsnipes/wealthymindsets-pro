"use client";

/**
 * Options Chain Panel
 * Real options data via Financial Modeling Prep API (/api/fmp proxy).
 * Never fabricates contracts when the provider returns no data.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, TrendingUp, RefreshCw, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { clsx } from "clsx";

interface OptionRow {
  strike:   number;
  cBid:     number;  cAsk:   number;  cLast:  number;
  cIV:      number;  cDelta: number;  cGamma: number;
  cTheta:   number;  cVega:  number;  cOI:    number;  cVol: number;
  pBid:     number;  pAsk:   number;  pLast:  number;
  pIV:      number;  pDelta: number;  pGamma: number;
  pTheta:   number;  pVega:  number;  pOI:    number;  pVol: number;
  itm:      "call" | "put" | "atm" | "unknown";
}

// FMP returns contracts grouped by expiration date YYYY-MM-DD
// We pull all available expirations from the API response
interface FMPContract {
  symbol: string;
  contractType?: string;
  type?: string;             // some versions use "type" instead
  expirationDate: string;
  strike: number;
  bid: number;
  ask: number;
  last: number;
  impliedVolatility?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  openInterest?: number;
  volume?: number;
}

function fmtExp(d: string): string {
  // "2025-07-18" → "Jul 18 '25"
  const [, mm, dd] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[+mm - 1]} ${+dd} '${d.slice(2, 4)}`;
}

function buildChain(contracts: FMPContract[], spot: number, expiry: string): OptionRow[] {
  const calls = new Map<number, FMPContract>();
  const puts  = new Map<number, FMPContract>();
  for (const c of contracts) {
    const type = (c.contractType ?? c.type ?? "").toLowerCase();
    if (c.expirationDate !== expiry) continue;
    if (type === "call") calls.set(c.strike, c);
    else if (type === "put") puts.set(c.strike, c);
  }
  const strikes = [...new Set([...calls.keys(), ...puts.keys()])].sort((a, b) => a - b);
  // A missing quote is represented upstream as zero. Never turn that sentinel
  // into an ATM/ITM assertion: strike classification needs an observed spot.
  const hasObservedSpot = Number.isFinite(spot) && spot > 0;
  const atm = hasObservedSpot
    ? strikes.reduce((best, s) => Math.abs(s - spot) < Math.abs(best - spot) ? s : best, strikes[0] ?? spot)
    : null;
  return strikes.map(strike => {
    const call = calls.get(strike);
    const put  = puts.get(strike);
    const itm: OptionRow["itm"] = atm == null ? "unknown" : strike === atm ? "atm" : strike < spot ? "call" : "put";
    return {
      strike,
      cBid:   call?.bid   ?? 0,  cAsk:  call?.ask  ?? 0,  cLast: call?.last ?? 0,
      cIV:    call?.impliedVolatility ?? 0,
      cDelta: call?.delta ?? 0,  cGamma: call?.gamma ?? 0,
      cTheta: call?.theta ?? 0,  cVega:  call?.vega  ?? 0,
      cOI:    call?.openInterest ?? 0, cVol: call?.volume ?? 0,
      pBid:   put?.bid   ?? 0,   pAsk:  put?.ask   ?? 0,  pLast: put?.last ?? 0,
      pIV:    put?.impliedVolatility ?? 0,
      pDelta: put?.delta ?? 0,   pGamma: put?.gamma ?? 0,
      pTheta: put?.theta ?? 0,   pVega:  put?.vega  ?? 0,
      pOI:    put?.openInterest ?? 0, pVol: put?.volume ?? 0,
      itm,
    };
  });
}

interface Props { symbol: string; price: number; onClose: () => void; }

export function OptionsChain({ symbol, price, onClose }: Props) {
  const [chain,      setChain]      = useState<OptionRow[]>([]);
  const [expirations, setExpirations] = useState<string[]>([]);
  const [expiry,     setExpiry]     = useState<string>("");
  const [tab,        setTab]        = useState<"chain"|"calls"|"puts">("chain");
  const [showGreeks, setShowGreeks] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<"fmp"|"unavailable">("unavailable");
  const [allContracts, setAllContracts] = useState<FMPContract[]>([]);

  // Keep latest price in a ref so the network fetch does NOT re-run on every
  // live price tick (that caused setLoading(true) to fire repeatedly → blink).
  const priceRef = useRef(price);
  priceRef.current = price;
  // Round price for chain-math dependencies so sub-dollar ticks don't churn the
  // table on every poll. Cents-level moves still update via the live ticker.
  const priceKey = Math.round(price * 100) / 100;

  // Fetch all contracts for this symbol from FMP
  const fetchContracts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fmp?path=/v3/options/${encodeURIComponent(symbol)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // FMP returns { chain: [...] } or just [...]
      const contracts: FMPContract[] = Array.isArray(data) ? data : (data?.chain ?? data?.optionChain ?? []);
      if (contracts.length === 0) throw new Error("No options data");
      setAllContracts(contracts);
      // Extract unique expiration dates
      const expDates = [...new Set(contracts.map((c: FMPContract) => c.expirationDate))].sort();
      const expLabels = expDates.map(fmtExp);
      setExpirations(expLabels);
      // Select nearest expiry by default
      const firstExp = expDates[0] ?? "";
      setExpiry(fmtExp(firstExp));
      // Build chain for first expiry
      const p = priceRef.current;
      const rows = buildChain(contracts, p, firstExp);
      if (!rows.length) throw new Error("No contracts for the selected expiration");
      setChain(rows);
      setDataSource("fmp");
    } catch (e) {
      setError(String(e));
      setDataSource("unavailable");
      setExpirations([]);
      setExpiry("");
      setChain([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  // When expiry changes, rebuild chain
  useEffect(() => {
    if (!expiry) return;
    if (dataSource === "fmp" && allContracts.length) {
      // Find the ISO date for this label
      const isoDate = allContracts.find(c => fmtExp(c.expirationDate) === expiry)?.expirationDate ?? "";
      const rows = buildChain(allContracts, priceKey, isoDate);
      if (rows.length) { setChain(rows); return; }
    }
    setChain([]);
  }, [expiry, allContracts, priceKey, dataSource]);

  const atm = chain.find(r => r.itm === "atm");
  const hasObservedSpot = Number.isFinite(price) && price > 0;
  const hasAvailableData = !loading && dataSource === "fmp" && chain.length > 0;
  const dataStatus = loading
    ? "CHECKING · FIDELITY UNKNOWN"
    : hasAvailableData
      ? "DATA AVAILABLE · FIDELITY UNKNOWN"
      : "UNAVAILABLE";

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0,       opacity: 1 }}
      exit={{   x: "100%",  opacity: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 35 }}
      className="w-full max-w-[700px] min-w-0 border-l border-wm-border bg-wm-dark flex flex-col shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex min-h-11 flex-wrap items-center gap-2 border-b border-wm-border px-3 py-2 sm:px-4 shrink-0">
        <TrendingUp size={13} className="text-wm-green" />
        <span className="text-sm font-bold text-wm-text">{symbol} Options</span>
        <div
          className={clsx("flex items-center gap-1 text-[10px]", (loading || hasAvailableData) ? "text-wm-gold" : "text-wm-red")}
          title={loading
            ? "Checking options availability; delivery freshness and entitlement are not established."
            : hasAvailableData
              ? "Options contracts received; delivery freshness and entitlement are not established."
              : "Options contracts are unavailable."}
        >
          <span className={clsx("w-1.5 h-1.5 rounded-full", (loading || hasAvailableData) ? "bg-wm-gold" : "bg-wm-red")} aria-hidden="true" />
          {dataStatus}
        </div>
        <span className="text-[10px] font-mono text-wm-text-muted ml-1" title={hasObservedSpot ? "Observed underlying quote" : "Underlying quote has not been observed"}>
          Spot: <span className="text-wm-text font-bold">{hasObservedSpot ? price.toLocaleString("en-US",{minimumFractionDigits:2}) : "—"}</span>
        </span>
        {hasAvailableData && atm && (
          <div className="ml-3 flex items-center gap-2 text-[10px] text-wm-text-dim">
            <span>ATM IV: <span className="text-wm-gold font-bold">{(atm.cIV * 100).toFixed(1)}%</span></span>
            <span>ATM Δ: <span className="text-wm-blue font-bold">{atm.cDelta.toFixed(2)}</span></span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={fetchContracts} title="Refresh options data" aria-label="Refresh options data"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded transition-colors hover:bg-wm-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold">
            <RefreshCw size={12} className={clsx("text-wm-text-muted", loading && "animate-spin")} />
          </button>
          <button onClick={() => setShowGreeks(g => !g)} aria-pressed={showGreeks}
            className={clsx("inline-flex min-h-11 min-w-11 items-center justify-center px-3 rounded text-[10px] font-semibold border transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold",
              showGreeks ? "bg-wm-purple/20 text-wm-purple border-wm-purple/40"
                        : "text-wm-text-muted border-wm-border hover:text-wm-text")}>
            Greeks
          </button>
          <button onClick={onClose} aria-label="Close options chain"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded transition-colors hover:bg-wm-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold">
            <X size={13} className="text-wm-text-muted hover:text-wm-text" />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && dataSource === "unavailable" && (
        <div className="flex min-w-0 items-start gap-2 border-b border-wm-red/20 bg-wm-red/10 px-3 py-2 text-[10px] leading-relaxed text-wm-red shrink-0 sm:px-4">
          <AlertTriangle size={10} className="mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">Real options data is unavailable for {symbol}. No contracts were generated. Error: {error}</span>
        </div>
      )}

      {/* Expiry selector */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-wm-border shrink-0 overflow-x-auto" style={{ scrollbarWidth:"none" }}>
        {loading ? (
          <span className="text-[10px] text-wm-text-dim animate-pulse">Loading expirations...</span>
        ) : expirations.map(e => (
          <button key={e} onClick={() => setExpiry(e)} aria-pressed={expiry === e}
            className={clsx("inline-flex min-h-11 min-w-11 items-center justify-center px-3 rounded-full text-[10px] font-semibold whitespace-nowrap border transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold",
              expiry === e ? "bg-wm-green/15 text-wm-green border-wm-green/35"
                          : "text-wm-text-muted border-transparent hover:border-wm-border")}>
            {e}
          </button>
        ))}
      </div>

      {/* View tabs */}
      <div className="flex gap-1 px-3 py-1 border-b border-wm-border shrink-0">
        {(["chain","calls","puts"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t}
            className={clsx("inline-flex min-h-11 min-w-11 items-center justify-center px-3 rounded text-xs font-semibold capitalize transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold",
              tab === t ? "bg-wm-surface text-wm-text" : "text-wm-text-muted hover:text-wm-text")}>
            {t === "chain" ? "Full Chain" : t}
          </button>
        ))}
      </div>

      {/* Chain table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-wm-text-dim text-xs">
            <RefreshCw size={14} className="animate-spin mr-2" /> Loading options data from FMP...
          </div>
        ) : chain.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <AlertTriangle size={22} className="text-wm-red mb-3" />
            <div className="text-sm font-bold text-wm-text">Real options chain unavailable</div>
            <div className="text-[11px] text-wm-text-dim mt-1">Connect a supported options-data provider and refresh. WealthyMindsets will not fabricate contracts.</div>
          </div>
        ) : (
        <table className="w-full min-w-max text-[10px] border-collapse">
          <thead className="sticky top-0 bg-wm-dark z-10">
            <tr className="border-b border-wm-border">
              {tab !== "puts" && <>
                {showGreeks ? <>
                  <th className="px-2 py-1.5 text-left text-wm-green font-semibold">Δ</th>
                  <th className="px-2 py-1.5 text-left text-wm-green font-semibold">Γ</th>
                  <th className="px-2 py-1.5 text-left text-wm-green font-semibold">Θ</th>
                  <th className="px-2 py-1.5 text-left text-wm-green font-semibold">V</th>
                </> : <>
                  <th className="px-2 py-1.5 text-left text-wm-green font-semibold">OI</th>
                  <th className="px-2 py-1.5 text-left text-wm-green font-semibold">Vol</th>
                </>}
                <th className="px-2 py-1.5 text-left text-wm-green font-semibold">IV%</th>
                <th className="px-2 py-1.5 text-left text-wm-green font-semibold">Bid</th>
                <th className="px-2 py-1.5 text-left text-wm-green font-semibold">Ask</th>
              </>}
              <th className="px-3 py-1.5 text-center font-bold text-wm-text bg-wm-surface/50">Strike</th>
              {tab !== "calls" && <>
                <th className="px-2 py-1.5 text-right text-wm-red font-semibold">Bid</th>
                <th className="px-2 py-1.5 text-right text-wm-red font-semibold">Ask</th>
                <th className="px-2 py-1.5 text-right text-wm-red font-semibold">IV%</th>
                {showGreeks ? <>
                  <th className="px-2 py-1.5 text-right text-wm-red font-semibold">Δ</th>
                  <th className="px-2 py-1.5 text-right text-wm-red font-semibold">Γ</th>
                  <th className="px-2 py-1.5 text-right text-wm-red font-semibold">Θ</th>
                  <th className="px-2 py-1.5 text-right text-wm-red font-semibold">V</th>
                </> : <>
                  <th className="px-2 py-1.5 text-right text-wm-red font-semibold">Vol</th>
                  <th className="px-2 py-1.5 text-right text-wm-red font-semibold">OI</th>
                </>}
              </>}
            </tr>
          </thead>
          <tbody>
            {chain.map(row => {
              const isATM  = row.itm === "atm";
              const callITM= row.itm === "call";
              const putITM = row.itm === "put";
              return (
                <tr key={row.strike}
                  className={clsx("border-b border-wm-border/25 hover:bg-wm-surface/30 transition-colors cursor-pointer",
                    isATM ? "bg-wm-gold/05 border-y border-wm-gold/20" : "")}>
                  {tab !== "puts" && <>
                    {showGreeks ? <>
                      <td className={clsx("px-2 py-1.5 font-mono", callITM ? "text-wm-green font-semibold" : "text-wm-text-dim")}>{row.cDelta.toFixed(2)}</td>
                      <td className="px-2 py-1.5 font-mono text-wm-text-dim">{row.cGamma.toFixed(4)}</td>
                      <td className="px-2 py-1.5 font-mono text-wm-text-dim">{row.cTheta.toFixed(2)}</td>
                      <td className="px-2 py-1.5 font-mono text-wm-text-dim">{row.cVega.toFixed(2)}</td>
                    </> : <>
                      <td className={clsx("px-2 py-1.5 font-mono", callITM ? "text-wm-text" : "text-wm-text-dim")}>{row.cOI.toLocaleString()}</td>
                      <td className="px-2 py-1.5 font-mono text-wm-text-dim">{row.cVol.toLocaleString()}</td>
                    </>}
                    <td className="px-2 py-1.5 font-mono text-wm-gold">{(row.cIV * 100).toFixed(1)}%</td>
                    <td className={clsx("px-2 py-1.5 font-mono font-semibold", callITM ? "text-wm-green" : "text-wm-text-muted")}>{row.cBid.toFixed(2)}</td>
                    <td className={clsx("px-2 py-1.5 font-mono font-semibold", callITM ? "text-wm-green" : "text-wm-text-muted")}>{row.cAsk.toFixed(2)}</td>
                  </>}
                  <td className={clsx("px-3 py-1.5 text-center font-mono font-bold",
                    isATM ? "text-wm-gold bg-wm-gold/08" : "text-wm-text bg-wm-surface/20")}>
                    {row.strike.toLocaleString()}
                    {isATM && <span className="ml-1 text-[8px] text-wm-gold">ATM</span>}
                  </td>
                  {tab !== "calls" && <>
                    <td className={clsx("px-2 py-1.5 font-mono text-right font-semibold", putITM ? "text-wm-red" : "text-wm-text-muted")}>{row.pBid.toFixed(2)}</td>
                    <td className={clsx("px-2 py-1.5 font-mono text-right font-semibold", putITM ? "text-wm-red" : "text-wm-text-muted")}>{row.pAsk.toFixed(2)}</td>
                    <td className="px-2 py-1.5 font-mono text-right text-wm-gold">{(row.pIV * 100).toFixed(1)}%</td>
                    {showGreeks ? <>
                      <td className={clsx("px-2 py-1.5 font-mono text-right", putITM ? "text-wm-red font-semibold" : "text-wm-text-dim")}>{row.pDelta.toFixed(2)}</td>
                      <td className="px-2 py-1.5 font-mono text-right text-wm-text-dim">{row.pGamma.toFixed(4)}</td>
                      <td className="px-2 py-1.5 font-mono text-right text-wm-text-dim">{row.pTheta.toFixed(2)}</td>
                      <td className="px-2 py-1.5 font-mono text-right text-wm-text-dim">{row.pVega.toFixed(2)}</td>
                    </> : <>
                      <td className="px-2 py-1.5 font-mono text-right text-wm-text-dim">{row.pVol.toLocaleString()}</td>
                      <td className={clsx("px-2 py-1.5 font-mono text-right", putITM ? "text-wm-text" : "text-wm-text-dim")}>{row.pOI.toLocaleString()}</td>
                    </>}
                  </>}
                </tr>
              );
            })}
          </tbody>
        </table>
        )}
      </div>

      {/* Footer stats */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 border-t border-wm-border shrink-0 bg-wm-dark">
        {hasAvailableData && <>
          <div className="text-[9px] text-wm-text-dim">
            Calls OI: <span className="text-wm-green font-mono">{chain.reduce((s,r) => s+r.cOI,0).toLocaleString()}</span>
          </div>
          <div className="text-[9px] text-wm-text-dim">
            Puts OI: <span className="text-wm-red font-mono">{chain.reduce((s,r) => s+r.pOI,0).toLocaleString()}</span>
          </div>
          <div className="text-[9px] text-wm-text-dim">
            P/C Ratio: <span className="text-wm-gold font-mono">
              {(chain.reduce((s,r)=>s+r.pOI,0)/Math.max(1,chain.reduce((s,r)=>s+r.cOI,0))).toFixed(2)}
            </span>
          </div>
        </>}
        <div className="text-[9px] text-wm-text-dim italic sm:ml-auto">
          {loading
            ? "Checking options availability · fidelity UNKNOWN"
            : hasAvailableData
              ? "Source response: Financial Modeling Prep · freshness UNKNOWN"
              : "No contracts available"}
        </div>
      </div>
    </motion.div>
  );
}
