"use client";

/**
 * Options Chain Panel
 * Read-only option snapshots via WM Pro's explicit Alpaca market-data route.
 * Never fabricates contracts when the provider returns no data.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, TrendingUp, RefreshCw, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import { formatOptionCount, formatOptionNumber, formatOptionPercent,
         summariseOpenInterest } from "@/lib/optionCellFormat";
import { type OptionContract } from "@/lib/optionContractResponse";
import { optionsReceiptAge, readOptionsResponse, optionsReadFailure, type OptionsReadFailure, type OptionsSourceReceipt } from "@/lib/optionsChainRead";

/**
 * Every quoted field is optional: an unquoted strike has NO number, and must
 * not be coerced to 0. Only `strike` and `itm` are always known.
 */
type Quoted = number | undefined;

interface OptionRow {
  call?: OptionContract;
  put?: OptionContract;
  strike:   number;
  cBid:     Quoted;  cAsk:   Quoted;  cLast:  Quoted;
  cIV:      Quoted;  cDelta: Quoted;  cGamma: Quoted;
  cTheta:   Quoted;  cVega:  Quoted;  cOI:    Quoted;  cVol: Quoted;
  pBid:     Quoted;  pAsk:   Quoted;  pLast:  Quoted;
  pIV:      Quoted;  pDelta: Quoted;  pGamma: Quoted;
  pTheta:   Quoted;  pVega:  Quoted;  pOI:    Quoted;  pVol: Quoted;
  itm:      "call" | "put" | "atm" | "unknown";
}

// The normalized route returns contracts grouped by expiration date YYYY-MM-DD.
// We pull all available expirations from the API response

function fmtExp(d: string): string {
  // "2025-07-18" → "Jul 18 '25"
  const [, mm, dd] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[+mm - 1]} ${+dd} '${d.slice(2, 4)}`;
}

function buildChain(contracts: OptionContract[], spot: number, expiry: string): OptionRow[] {
  const calls = new Map<number, OptionContract>();
  const puts  = new Map<number, OptionContract>();
  for (const c of contracts) {
    const type = c.contractType;
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
      call,
      put,
      strike,
      // No `?? 0`: an unquoted contract stays undefined all the way to the
      // cell, which renders it as "—" instead of a confident zero.
      cBid:   call?.bid,   cAsk:  call?.ask,  cLast: call?.last,
      cIV:    call?.impliedVolatility,
      cDelta: call?.delta, cGamma: call?.gamma,
      cTheta: call?.theta, cVega:  call?.vega,
      cOI:    call?.openInterest, cVol: call?.volume,
      pBid:   put?.bid,    pAsk:  put?.ask,   pLast: put?.last,
      pIV:    put?.impliedVolatility,
      pDelta: put?.delta,  pGamma: put?.gamma,
      pTheta: put?.theta,  pVega:  put?.vega,
      pOI:    put?.openInterest, pVol: put?.volume,
      itm,
    };
  });
}

interface Props {
  symbol: string;
  price: number;
  onClose: () => void;
  /**
   * Optional strike handler. The row only ADVERTISES itself as clickable when
   * this is supplied — a hand cursor with no handler behind it is a promise
   * the surface cannot keep (LIVING-PIXEL LAW: no design theater).
   */
  onSelectStrike?: (row: OptionRow) => void;
  onSelectContract?: (contract: OptionContract, receipt: OptionsSourceReceipt) => void;
  onInvalidateSelection?: () => void;
  expression?: React.ReactNode;
  onOpenBrokerConnect?: (trigger: HTMLButtonElement) => void;
}

export function OptionsChain({ symbol, price, onClose, onSelectStrike, onSelectContract, onInvalidateSelection, expression, onOpenBrokerConnect }: Props) {
  const [scene, setScene] = useState<"expression" | "inspect">("expression");
  const expressionHeading = useRef<HTMLHeadingElement>(null);
  const focusExpression = useRef(false);
  const [chain,      setChain]      = useState<OptionRow[]>([]);
  const [expirations, setExpirations] = useState<string[]>([]);
  const [expiry,     setExpiry]     = useState<string>("");
  const [tab,        setTab]        = useState<"chain"|"calls"|"puts">("chain");
  const [showGreeks, setShowGreeks] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<OptionsReadFailure | null>(null);
  const [dataSource, setDataSource] = useState<"alpaca"|"unavailable">("unavailable");
  const [sourceReceipt, setSourceReceipt] = useState<OptionsSourceReceipt>({ source: "unknown", fidelity: "UNKNOWN", coverage: "UNKNOWN", newestProviderTimestamp: null });
  const [receiptClock, setReceiptClock] = useState<number | null>(null);
  const [allContracts, setAllContracts] = useState<OptionContract[]>([]);
  const [receivedSymbol, setReceivedSymbol] = useState<string | null>(null);
  const contractRead = useRef<{ cancel: () => void } | null>(null);
  const invalidateSelection = useRef(onInvalidateSelection);
  invalidateSelection.current = onInvalidateSelection;

  // Inspection is a projection, not a new expression owner. Keep the intent
  // subtree mounted across modes so a lost ACK retains its same-ID retry.
  useEffect(() => {
    if (scene === "expression" && focusExpression.current) {
      expressionHeading.current?.focus();
      focusExpression.current = false;
    }
  }, [scene, expression]);

  useEffect(() => {
    const tick = () => setReceiptClock(Date.now());
    tick();
    const clock = window.setInterval(tick, 60_000);
    return () => window.clearInterval(clock);
  }, []);
  function reviewContract(contract: OptionContract) {
    onSelectContract?.(contract, sourceReceipt);
    focusExpression.current = true;
    setScene("expression");
  }

  // Keep latest price in a ref so the network fetch does NOT re-run on every
  // live price tick (that caused setLoading(true) to fire repeatedly → blink).
  const priceRef = useRef(price);
  priceRef.current = price;
  // Round price for chain-math dependencies so sub-dollar ticks don't churn the
  // table on every poll. Cents-level moves still update via the live ticker.
  const priceKey = Math.round(price * 100) / 100;

  // Fetch an explicitly sourced Alpaca indicative chain for this symbol.
  const fetchContracts = useCallback(async () => {
    invalidateSelection.current?.();
    contractRead.current?.cancel();
    const controller = new AbortController();
    let active = true;
    const cancel = () => {
      active = false;
      clearTimeout(deadline);
      controller.abort();
    };
    const deadline = setTimeout(() => {
      if (!active) return;
      setError(optionsReadFailure("TIMEOUT"));
      setLoading(false);
      cancel();
    }, 12_000);
    contractRead.current = { cancel };
    setLoading(true);
    setError(null);
    setReceivedSymbol(null);
    setDataSource("unavailable");
    setSourceReceipt({ source: "unknown", fidelity: "UNKNOWN", coverage: "UNKNOWN", newestProviderTimestamp: null });
    setAllContracts([]);
    setExpirations([]);
    setExpiry("");
    setChain([]);
    try {
      const spotParam = Number.isFinite(priceRef.current) && priceRef.current > 0
        ? `&spot=${encodeURIComponent(String(priceRef.current))}`
        : "";
      const res = await fetch(`/api/market-data/alpaca/options?symbol=${encodeURIComponent(symbol)}${spotParam}`, { signal: controller.signal });
      if (!active) return;
      const result = await readOptionsResponse(res);
      if (!active) return;
      if (!result.ok) {
        setError(result.failure);
        return;
      }
      const contracts = result.contracts;
      if (result.receipt.source !== "alpaca" || result.receipt.fidelity !== "INDICATIVE") {
        setError(optionsReadFailure("INVALID RESPONSE"));
        return;
      }
      setAllContracts(contracts);
      // Extract unique expiration dates
      const expDates = [...new Set(contracts.map((c: OptionContract) => c.expirationDate))].sort();
      const expLabels = expDates.map(fmtExp);
      setExpirations(expLabels);
      // Select nearest expiry by default
      const firstExp = expDates[0] ?? "";
      setExpiry(fmtExp(firstExp));
      // Build chain for first expiry
      const p = priceRef.current;
      const rows = buildChain(contracts, p, firstExp);
      if (!rows.length) {
        setError(optionsReadFailure("NO EVENTS"));
        setAllContracts([]);
        setExpirations([]);
        setExpiry("");
        return;
      }
      setChain(rows);
      setSourceReceipt(result.receipt);
      setDataSource("alpaca");
      setReceivedSymbol(symbol);
    } catch {
      if (!active) return;
      setError(optionsReadFailure("NETWORK ERROR"));
      setDataSource("unavailable");
      setExpirations([]);
      setExpiry("");
      setChain([]);
    } finally {
      if (active) setLoading(false);
      cancel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  useEffect(() => {
    fetchContracts();
    return () => contractRead.current?.cancel();
  }, [fetchContracts]);

  // When expiry changes, rebuild chain
  useEffect(() => {
    if (!expiry || receivedSymbol !== symbol) return;
    if (dataSource === "alpaca" && allContracts.length) {
      // Find the ISO date for this label
      const isoDate = allContracts.find(c => fmtExp(c.expirationDate) === expiry)?.expirationDate ?? "";
      const rows = buildChain(allContracts, priceKey, isoDate);
      if (rows.length) { setChain(rows); return; }
    }
    setChain([]);
  }, [expiry, allContracts, priceKey, dataSource, receivedSymbol, symbol]);

  const atm = chain.find(r => r.itm === "atm");
  const hasObservedSpot = Number.isFinite(price) && price > 0;
  const hasAvailableData = !loading && receivedSymbol === symbol && dataSource === "alpaca" && sourceReceipt.source === "alpaca" && chain.length > 0;
  const receiptAge = receiptClock === null
    ? { label: "age checking", recorded: true }
    : optionsReceiptAge(sourceReceipt.newestProviderTimestamp, receiptClock);
  const dataStatus = loading
    ? "CHECKING · FIDELITY UNKNOWN"
    : hasAvailableData
      ? `${receiptAge.recorded ? "RECORDED REFERENCE" : "REFERENCE AVAILABLE"} · INDICATIVE`
      : "UNAVAILABLE";

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0,       opacity: 1 }}
      exit={{   x: "100%",  opacity: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 35 }}
      className="w-full max-w-[700px] min-w-0 md:w-[45%] border-l border-wm-border bg-wm-dark flex flex-col shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex min-h-11 flex-wrap items-center gap-2 border-b border-wm-border px-3 py-2 sm:px-4 shrink-0">
        <TrendingUp size={13} className="text-wm-green" />
        <span className="text-sm font-bold text-wm-text">{symbol} Options · Expression</span>
        <div
          className={clsx("flex items-center gap-1 text-[10px]", (loading || hasAvailableData) ? "text-wm-gold" : "text-wm-red")}
          title={loading
            ? "Checking options availability; delivery freshness and entitlement are not established."
            : hasAvailableData
              ? "Alpaca indicative option snapshots received. Indicative quotes are modified and trades are delayed; this is not an executable quote."
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
            <span>ATM IV: <span className="text-wm-gold font-bold">{formatOptionPercent(atm.cIV)}</span></span>
            <span>ATM Δ: <span className="text-wm-blue font-bold">{formatOptionNumber(atm.cDelta, 2)}</span></span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={fetchContracts} title="Refresh options data" aria-label="Refresh options data"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded transition-colors hover:bg-wm-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold">
            <RefreshCw size={12} className={clsx("text-wm-text-muted", loading && "animate-spin")} />
          </button>
          <button style={{ display: scene === "inspect" ? undefined : "none" }} onClick={() => setShowGreeks(g => !g)} aria-pressed={showGreeks}
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

      <div className="flex shrink-0 gap-2 border-b border-wm-border px-3 py-2" aria-label="Options workspace view">
        <button type="button" aria-pressed={scene === "expression"} onClick={() => setScene("expression")}
          className={clsx("min-h-11 rounded border px-3 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold",
            scene === "expression" ? "border-wm-gold/60 bg-wm-gold/10 text-wm-gold" : "border-wm-border text-wm-text-muted")}>Expression</button>
        <button type="button" aria-pressed={scene === "inspect"} onClick={() => setScene("inspect")}
          className={clsx("min-h-11 rounded border px-3 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold",
            scene === "inspect" ? "border-wm-gold/60 bg-wm-gold/10 text-wm-gold" : "border-wm-border text-wm-text-muted")}>Inspect contracts</button>
      </div>

      <div hidden={scene !== "expression"} className="min-h-0 flex-1 overflow-y-auto">
        <section aria-label="Option expression workflow" className="px-4 py-5 text-wm-text">
          <p className="text-[10px] uppercase tracking-[0.18em] text-wm-gold">Underlying → expression → shared intent</p>
          <h2 ref={expressionHeading} tabIndex={-1} className="mt-3 text-xl font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold">
            {expression ? "Review your expression" : "Keep the thesis on the chart"}
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-wm-text-muted">The underlying tells the story. Inspect a sourced contract, then record why it expresses your thesis. Selection is not an order.</p>
          {!expression && <div className="mt-5 border-l-2 border-wm-gold/60 pl-3">
            <h3 className="text-sm font-semibold">{loading ? "Checking contract evidence" : hasAvailableData ? "Choose an expression" : "Contract evidence is missing"}</h3>
            {!loading && error && <p role="status" className="mt-2 text-xs text-wm-gold"><strong>{error.edge}</strong> · {error.message}</p>}
            <p className="mt-2 text-xs leading-relaxed text-wm-text-muted">{loading ? "No contract is selected while the source is being checked." : hasAvailableData ? `${allContracts.length} source contracts are available for inspection. Provider observation: ${receiptAge.label}. Broker binding remains unverified.` : error?.recovery ?? "Refresh to check options availability."}</p>
            <button type="button" disabled={!hasAvailableData} onClick={() => setScene("inspect")} className="mt-3 min-h-11 rounded border border-wm-gold/50 px-3 text-xs text-wm-gold disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold">Choose from source contracts</button>
          </div>}
        </section>
        {expression}
        <section aria-label="Execution boundary" className="mx-4 mb-4 border-t border-wm-border pt-4 text-xs leading-relaxed text-wm-text-muted">
          <h3 className="font-semibold text-wm-text">Before capital can move</h3>
          <p className="mt-2">Executable quote, contract binding, buying power and broker support are not established by this reference feed. Recording intent does not submit an order or establish protection.</p>
          {onOpenBrokerConnect && <button type="button" onClick={event => onOpenBrokerConnect(event.currentTarget)} className="mt-3 min-h-11 rounded border border-wm-border px-3 text-xs font-semibold text-wm-text hover:border-wm-gold/50 hover:text-wm-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold">Connect or inspect brokers</button>}
        </section>
      </div>

      <div hidden={scene !== "inspect"} className="min-h-0 flex-1 flex-col overflow-y-auto" style={{ display: scene === "inspect" ? "flex" : "none" }}>
      {/* Error banner */}
      {error && dataSource === "unavailable" && (
        <div role="status" className="flex min-w-0 items-start gap-2 border-b border-wm-red/20 bg-wm-red/10 px-3 py-2 text-[10px] leading-relaxed text-wm-red shrink-0 sm:px-4">
          <AlertTriangle size={10} className="mt-0.5 shrink-0" />
          <span className="min-w-0 break-words"><strong>{error.edge}</strong> · {error.message}</span>
        </div>
      )}

      {/* Expiry selector */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-wm-border shrink-0 overflow-x-auto" style={{ scrollbarWidth:"none" }}>
        {loading ? (
          <span className="text-[10px] text-wm-text-dim animate-pulse">Loading expirations...</span>
        ) : (hasAvailableData ? expirations : []).map(e => (
          <button key={e} onClick={() => { if (e === expiry) return; invalidateSelection.current?.(); setChain([]); setExpiry(e); }} aria-pressed={expiry === e}
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
            <RefreshCw size={14} className="animate-spin mr-2" /> Checking Alpaca indicative option snapshots...
          </div>
        ) : !hasAvailableData ? (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <AlertTriangle size={22} className="text-wm-red mb-3" />
            <div className="text-sm font-bold text-wm-text">Real options chain unavailable</div>
            <div className="text-[11px] text-wm-text-dim mt-1">{error?.recovery ?? "Refresh to check options availability."} WealthyMindsets will not fabricate contracts.</div>
          </div>
        ) : (
        <table className="w-full min-w-max text-[10px] border-collapse">
          <thead className="sticky top-0 bg-wm-dark z-10">
            <tr className="border-b border-wm-border">
              {tab !== "puts" && <>
                {onSelectContract && <th scope="col" className="px-2">Call</th>}
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
                {onSelectContract && <th scope="col" className="px-2">Put</th>}
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
                  onClick={onSelectStrike ? () => onSelectStrike(row) : undefined}
                  tabIndex={onSelectStrike ? 0 : undefined}
                  role={onSelectStrike ? "button" : undefined}
                  onKeyDown={onSelectStrike
                    ? e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectStrike(row); } }
                    : undefined}
                  aria-label={onSelectStrike ? `Select ${row.strike} strike` : undefined}
                  className={clsx("border-b border-wm-border/25 transition-colors",
                    // Interactive styling is earned by an actual handler.
                    onSelectStrike && "hover:bg-wm-surface/30 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold",
                    isATM ? "bg-wm-gold/05 border-y border-wm-gold/20" : "")}>
                  {tab !== "puts" && <>
                    {onSelectContract && <td className="px-2 py-1.5">{row.call ? <button type="button" className="min-h-11 rounded border border-wm-green/40 px-2 py-1 text-wm-green focus-visible:outline focus-visible:outline-2" aria-label={`Review call ${row.call.symbol}`} onClick={e => { e.stopPropagation(); reviewContract(row.call!); }}>Review call</button> : "—"}</td>}
                    {showGreeks ? <>
                      <td className={clsx("px-2 py-1.5 font-mono", callITM ? "text-wm-green font-semibold" : "text-wm-text-dim")}>{formatOptionNumber(row.cDelta, 2)}</td>
                      <td className="px-2 py-1.5 font-mono text-wm-text-dim">{formatOptionNumber(row.cGamma, 4)}</td>
                      <td className="px-2 py-1.5 font-mono text-wm-text-dim">{formatOptionNumber(row.cTheta, 2)}</td>
                      <td className="px-2 py-1.5 font-mono text-wm-text-dim">{formatOptionNumber(row.cVega, 2)}</td>
                    </> : <>
                      <td className={clsx("px-2 py-1.5 font-mono", callITM ? "text-wm-text" : "text-wm-text-dim")}>{formatOptionCount(row.cOI)}</td>
                      <td className="px-2 py-1.5 font-mono text-wm-text-dim">{formatOptionCount(row.cVol)}</td>
                    </>}
                    <td className="px-2 py-1.5 font-mono text-wm-gold">{formatOptionPercent(row.cIV)}</td>
                    <td className={clsx("px-2 py-1.5 font-mono font-semibold", callITM ? "text-wm-green" : "text-wm-text-muted")}>{formatOptionNumber(row.cBid, 2)}</td>
                    <td className={clsx("px-2 py-1.5 font-mono font-semibold", callITM ? "text-wm-green" : "text-wm-text-muted")}>{formatOptionNumber(row.cAsk, 2)}</td>
                  </>}
                  <td className={clsx("px-3 py-1.5 text-center font-mono font-bold",
                    isATM ? "text-wm-gold bg-wm-gold/08" : "text-wm-text bg-wm-surface/20")}>
                    {row.strike.toLocaleString()}
                    {isATM && <span className="ml-1 text-[8px] text-wm-gold">ATM</span>}
                  </td>
                  {tab !== "calls" && <>
                    {onSelectContract && <td className="px-2 py-1.5">{row.put ? <button type="button" className="min-h-11 rounded border border-wm-red/40 px-2 py-1 text-wm-red focus-visible:outline focus-visible:outline-2" aria-label={`Review put ${row.put.symbol}`} onClick={e => { e.stopPropagation(); reviewContract(row.put!); }}>Review put</button> : "—"}</td>}
                    <td className={clsx("px-2 py-1.5 font-mono text-right font-semibold", putITM ? "text-wm-red" : "text-wm-text-muted")}>{formatOptionNumber(row.pBid, 2)}</td>
                    <td className={clsx("px-2 py-1.5 font-mono text-right font-semibold", putITM ? "text-wm-red" : "text-wm-text-muted")}>{formatOptionNumber(row.pAsk, 2)}</td>
                    <td className="px-2 py-1.5 font-mono text-right text-wm-gold">{formatOptionPercent(row.pIV)}</td>
                    {showGreeks ? <>
                      <td className={clsx("px-2 py-1.5 font-mono text-right", putITM ? "text-wm-red font-semibold" : "text-wm-text-dim")}>{formatOptionNumber(row.pDelta, 2)}</td>
                      <td className="px-2 py-1.5 font-mono text-right text-wm-text-dim">{formatOptionNumber(row.pGamma, 4)}</td>
                      <td className="px-2 py-1.5 font-mono text-right text-wm-text-dim">{formatOptionNumber(row.pTheta, 2)}</td>
                      <td className="px-2 py-1.5 font-mono text-right text-wm-text-dim">{formatOptionNumber(row.pVega, 2)}</td>
                    </> : <>
                      <td className="px-2 py-1.5 font-mono text-right text-wm-text-dim">{formatOptionCount(row.pVol)}</td>
                      <td className={clsx("px-2 py-1.5 font-mono text-right", putITM ? "text-wm-text" : "text-wm-text-dim")}>{formatOptionCount(row.pOI)}</td>
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
        {hasAvailableData && (() => {
          // Totals derived only from quoted strikes; coverage stated when partial.
          const oi = summariseOpenInterest(chain);
          const coverage = oi.complete
            ? "Every strike in this expiry reported open interest."
            : `Derived from ${oi.observedCalls} call and ${oi.observedPuts} put strikes of ${oi.totalRows} listed.`;
          return <>
            <div className="text-[9px] text-wm-text-dim" title={coverage}>
              Calls OI: <span className="text-wm-green font-mono">{formatOptionCount(oi.observedCalls > 0 ? oi.callsOI : undefined)}</span>
            </div>
            <div className="text-[9px] text-wm-text-dim" title={coverage}>
              Puts OI: <span className="text-wm-red font-mono">{formatOptionCount(oi.observedPuts > 0 ? oi.putsOI : undefined)}</span>
            </div>
            <div className="text-[9px] text-wm-text-dim"
              title={oi.putCallRatio == null
                ? "Both sides must report open interest with a positive call total; otherwise a put/call ratio is not defined."
                : coverage}>
              P/C Ratio: <span className="text-wm-gold font-mono">
                {formatOptionNumber(oi.putCallRatio, 2)}
              </span>
            </div>
            {!oi.complete && (
              <div className="text-[9px] text-wm-text-muted italic">
                partial coverage · {oi.observedCalls}/{oi.totalRows} calls, {oi.observedPuts}/{oi.totalRows} puts
              </div>
            )}
          </>;
        })()}
        <div className="text-[9px] text-wm-text-dim italic sm:ml-auto">
          {loading
            ? "Checking options availability · fidelity UNKNOWN"
            : hasAvailableData
              ? `Source response: Alpaca · ${sourceReceipt.fidelity} · response page ${sourceReceipt.coverage.toLowerCase()} · provider ${receiptAge.label}`
              : "No contracts available"}
        </div>
      </div>
      </div>
    </motion.div>
  );
}
