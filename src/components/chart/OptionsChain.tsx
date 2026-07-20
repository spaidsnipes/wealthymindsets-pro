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
  itm:      "call" | "put" | "atm";
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

// Generate realistic FUTURE expiries (the nearest Fridays + monthlies) from today,
// so the synthetic fallback never shows stale/expired dates.
function genSyntheticExpiries(): { label: string; dte: number }[] {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Next Friday (weekday 5)
  const firstFri = new Date(today);
  const delta = (5 - firstFri.getDay() + 7) % 7 || 7; // always at least next Friday
  firstFri.setDate(firstFri.getDate() + delta);
  const out: { label: string; dte: number }[] = [];
  const seen = new Set<string>();
  // 4 weekly Fridays, then monthly (3rd Friday) for the next several months
  for (let i = 0; i < 4; i++) {
    const d = new Date(firstFri);
    d.setDate(d.getDate() + i * 7);
    const label = `${months[d.getMonth()]} ${d.getDate()} '${String(d.getFullYear()).slice(2)}`;
    const dte = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (!seen.has(label)) { seen.add(label); out.push({ label, dte }); }
  }
  for (let m = 1; m <= 6; m++) {
    const dt = new Date(today.getFullYear(), today.getMonth() + m, 1);
    // 3rd Friday of that month
    const firstDay = dt.getDay();
    const thirdFri = 1 + ((5 - firstDay + 7) % 7) + 14;
    dt.setDate(thirdFri);
    const label = `${months[dt.getMonth()]} ${dt.getDate()} '${String(dt.getFullYear()).slice(2)}`;
    const dte = Math.round((dt.getTime() - today.getTime()) / 86400000);
    if (!seen.has(label)) { seen.add(label); out.push({ label, dte }); }
  }
  return out;
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
  // Find ATM strike (closest to spot)
  const atm = strikes.reduce((best, s) => Math.abs(s - spot) < Math.abs(best - spot) ? s : best, strikes[0] ?? spot);
  return strikes.map(strike => {
    const call = calls.get(strike);
    const put  = puts.get(strike);
    const itm: "call" | "put" | "atm" = strike === atm ? "atm" : strike < spot ? "call" : "put";
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

// Black-Scholes synthetic fallback when FMP has no data for a symbol
function generateChain(base: number, dte: number): OptionRow[] {
  const rows: OptionRow[] = [];
  const rfr = 0.053;
  const iv  = 0.22;
  for (let i = -10; i <= 10; i++) {
    const tickSize = base > 10_000 ? 25 : base > 1_000 ? 5 : base > 100 ? 1 : 0.5;
    const strike   = Math.round((base + i * tickSize) / tickSize) * tickSize;
    const d1       = ((base/strike > 0 ? Math.log(base/strike) : 0) + (rfr + iv*iv/2)*(dte/365)) / (iv*Math.sqrt(dte/365));
    const absd1    = Math.abs(d1);
    const callDelta = Math.max(0.01, Math.min(0.99, 0.5 + 0.4*d1/(1+absd1)));
    const gamma    = Math.max(0.0001, 0.001*Math.exp(-0.5*d1*d1));
    const theta    = -0.05*base*iv*gamma;
    const vega     = 0.01*base*Math.sqrt(dte/365);
    const cMid     = Math.max(0.05, base*iv*Math.sqrt(dte/365)*0.4*Math.exp(-0.5*d1*d1));
    const pMid     = Math.max(0.05, cMid + strike - base + base*rfr*dte/365);
    const sp       = cMid*0.04;
    const sn       = Math.floor(Math.abs(strike)*100) + i*997;
    const sr1      = Math.abs(Math.sin(sn*12.9898)*43758.5453%1);
    const sr2      = Math.abs(Math.sin(sn*78.233)*43758.5453%1);
    const sr3      = Math.abs(Math.sin(sn*37.719)*43758.5453%1);
    const cIV      = iv+(sr1-0.5)*0.02;
    const pIV      = iv+(sr2-0.5)*0.025+0.01;
    const oi       = Math.floor(500+sr3*8000);
    const vol      = Math.floor(oi*0.1*(0.5+sr1));
    const itm: "call"|"put"|"atm" = i===0?"atm":i>0?"put":"call";
    rows.push({
      strike,
      cBid:+(cMid-sp).toFixed(2), cAsk:+(cMid+sp).toFixed(2), cLast:+cMid.toFixed(2),
      cIV, cDelta:+callDelta.toFixed(3), cGamma:+gamma.toFixed(5),
      cTheta:+theta.toFixed(3), cVega:+vega.toFixed(3),
      cOI:oi, cVol:vol,
      pBid:+(pMid-sp).toFixed(2), pAsk:+(pMid+sp).toFixed(2), pLast:+pMid.toFixed(2),
      pIV, pDelta:+(-(1-callDelta)).toFixed(3), pGamma:+gamma.toFixed(5),
      pTheta:+theta.toFixed(3), pVega:+vega.toFixed(3),
      pOI:Math.floor(oi*(0.8+sr2*0.6)), pVol:Math.floor(vol*(0.6+sr3*0.8)),
      itm,
    });
  }
  return rows;
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

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0,       opacity: 1 }}
      exit={{   x: "100%",  opacity: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 35 }}
      className="w-[700px] border-l border-wm-border bg-wm-dark flex flex-col shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 border-b border-wm-border shrink-0" style={{ height: 44 }}>
        <TrendingUp size={13} className="text-wm-green" />
        <span className="text-sm font-bold text-wm-text">{symbol} Options</span>
        <div className={clsx("flex items-center gap-1 text-[10px]", dataSource === "fmp" ? "text-wm-green" : "text-wm-red")}>
          <span className={clsx("w-1.5 h-1.5 rounded-full", dataSource === "fmp" ? "bg-wm-green animate-pulse" : "bg-wm-red")} />
          {dataSource === "fmp" ? "LIVE • FMP" : "UNAVAILABLE"}
        </div>
        <span className="text-[10px] font-mono text-wm-text-muted ml-1">
          Spot: <span className="text-wm-text font-bold">{price.toLocaleString("en-US",{minimumFractionDigits:2})}</span>
        </span>
        {atm && (
          <div className="ml-3 flex items-center gap-2 text-[10px] text-wm-text-dim">
            <span>ATM IV: <span className="text-wm-gold font-bold">{(atm.cIV * 100).toFixed(1)}%</span></span>
            <span>ATM Δ: <span className="text-wm-blue font-bold">{atm.cDelta.toFixed(2)}</span></span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={fetchContracts} title="Refresh options data"
            className="p-1 hover:bg-wm-surface rounded transition-colors">
            <RefreshCw size={12} className={clsx("text-wm-text-muted", loading && "animate-spin")} />
          </button>
          <button onClick={() => setShowGreeks(g => !g)}
            className={clsx("px-2 py-0.5 rounded text-[10px] font-semibold border transition-all",
              showGreeks ? "bg-wm-purple/20 text-wm-purple border-wm-purple/40"
                        : "text-wm-text-muted border-wm-border hover:text-wm-text")}>
            Greeks
          </button>
          <button onClick={onClose} className="p-1 hover:bg-wm-surface rounded transition-colors">
            <X size={13} className="text-wm-text-muted hover:text-wm-text" />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && dataSource === "unavailable" && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-wm-red/10 border-b border-wm-red/20 text-[10px] text-wm-red shrink-0">
          <AlertTriangle size={10} />
          <span>Real options data is unavailable for {symbol}. No contracts were generated. Error: {error}</span>
        </div>
      )}

      {/* Expiry selector */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-wm-border shrink-0 overflow-x-auto" style={{ scrollbarWidth:"none" }}>
        {loading ? (
          <span className="text-[10px] text-wm-text-dim animate-pulse">Loading expirations...</span>
        ) : expirations.map(e => (
          <button key={e} onClick={() => setExpiry(e)}
            className={clsx("px-2.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap border transition-all",
              expiry === e ? "bg-wm-green/15 text-wm-green border-wm-green/35"
                          : "text-wm-text-muted border-transparent hover:border-wm-border")}>
            {e}
          </button>
        ))}
      </div>

      {/* View tabs */}
      <div className="flex gap-1 px-3 py-1 border-b border-wm-border shrink-0">
        {(["chain","calls","puts"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx("px-3 py-0.5 rounded text-xs font-semibold capitalize transition-all",
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
        <table className="w-full text-[10px] border-collapse">
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
      <div className="flex items-center gap-6 px-4 py-2 border-t border-wm-border shrink-0 bg-wm-dark">
        <div className="text-[9px] text-wm-text-dim">
          Calls OI: <span className="text-wm-green font-mono">{chain.reduce((s,r) => s+r.cOI,0).toLocaleString()}</span>
        </div>
        <div className="text-[9px] text-wm-text-dim">
          Puts OI: <span className="text-wm-red font-mono">{chain.reduce((s,r) => s+r.pOI,0).toLocaleString()}</span>
        </div>
        <div className="text-[9px] text-wm-text-dim">
          P/C Ratio: <span className="text-wm-gold font-mono">
            {chain.length ? (chain.reduce((s,r)=>s+r.pOI,0)/Math.max(1,chain.reduce((s,r)=>s+r.cOI,0))).toFixed(2) : "—"}
          </span>
        </div>
        <div className="ml-auto text-[9px] text-wm-text-dim italic">
          {dataSource === "fmp" ? "Real data: Financial Modeling Prep API" : "No real contracts available"}
        </div>
      </div>
    </motion.div>
  );
}
