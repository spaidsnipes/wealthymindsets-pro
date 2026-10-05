"use client";

/**
 * CRYPTO DERIVATIVES — a VIEW-ONLY Deribit option chain over the live chart
 * (Garden 18 §LX, serving BTC-USD 2026-10-01 22:30 CDT: the tab was a dead
 * button while the product already read this public book for Derivatives
 * Pressure).
 *
 * Same sidecar material as the futures/equity chain. Every number is
 * Deribit's own public answer, USD = coin price × the expiry's forward. It
 * says, on its face, that nothing here can be traded in WM.
 */

import React, { useEffect, useMemo, useState } from "react";

import { deribitStrikesNear, normalizeDeribitChain, type DeribitChain, type DeribitChainLeg } from "@/lib/marketData/deribitChain";
import { deribitCurrencyFor } from "@/lib/marketData/deribitOptions";

const GOLD = "#C9A55C";
const INK = "#ede6d3";
const MUTED = "#8a8271";
const LINE = "rgba(201,165,92,.18)";
const PANEL = "linear-gradient(180deg, rgba(14,12,9,.985), rgba(8,7,5,.985))";
const MONO: React.CSSProperties = { fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum"' };

const money = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? "—" : n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : n.toFixed(2);
const pct = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? "—" : `${(n * 100).toFixed(1)}%`);
const oiw = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? "—" : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(1));

/** Browser first (Deribit allows this origin; the worker's shared egress is throttled), then the worker route. */
async function loadChain(cur: "BTC" | "ETH", symbol: string, signal: AbortSignal): Promise<DeribitChain> {
  try {
    const r = await fetch(`https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=${cur}&kind=option`, { cache: "no-store", signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return normalizeDeribitChain(await r.json(), cur, Date.now());
  } catch (e) {
    if (signal.aborted) throw e;
    const r = await fetch(`/api/market-data/deribit/options?symbol=${encodeURIComponent(symbol)}&view=chain`, { cache: "no-store", signal });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || !Array.isArray(j.expiries)) throw new Error(j?.error ?? `HTTP ${r.status}`);
    return j as DeribitChain;
  }
}

function Leg({ leg, side }: { leg: DeribitChainLeg | null; side: "CALL" | "PUT" }) {
  const cells = leg
    ? [money(leg.bidUsd), money(leg.askUsd), money(leg.markUsd), pct(leg.iv), oiw(leg.oi)]
    : ["—", "—", "—", "—", "—"];
  const ordered = side === "CALL" ? [...cells].reverse() : cells;
  return <>{ordered.map((c, i) => <td key={i} style={{ padding: "3px 6px", textAlign: "right", color: c === "—" ? MUTED : INK, ...MONO }}>{c}</td>)}</>;
}

export function DeribitChainPanel({ chartSymbol, onClose }: { readonly chartSymbol: string; readonly onClose: () => void }) {
  const cur = deribitCurrencyFor(chartSymbol);
  const [chain, setChain] = useState<DeribitChain | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exp, setExp] = useState<string | null>(null);

  useEffect(() => {
    if (!cur) return;
    let alive = true;
    const ctl = new AbortController();
    const run = () => {
      loadChain(cur, chartSymbol, ctl.signal)
        .then(c => { if (alive) { setChain(c); setError(null); } })
        .catch(e => { if (alive && !ctl.signal.aborted) setError(String(e?.message ?? e)); });
    };
    run();
    const t = setInterval(run, 30_000);
    return () => { alive = false; ctl.abort(); clearInterval(t); };
  }, [cur, chartSymbol]);

  const expiry = useMemo(() => {
    if (!chain || chain.expiries.length === 0) return null;
    return chain.expiries.find(e => e.expiration === exp) ?? chain.expiries[0];
  }, [chain, exp]);
  const rows = useMemo(() => (expiry ? deribitStrikesNear(expiry, 10) : []), [expiry]);
  const atm = useMemo(() => (expiry?.forward != null ? rows.find(r => r.strike >= expiry.forward!)?.strike ?? null : null), [rows, expiry]);

  return (
    <section data-testid="deribit-chain-panel" aria-label={`${cur ?? chartSymbol} options chain, view only`}
      style={{ position: "fixed", top: 108, left: 12, bottom: 12, width: "min(760px, calc(100vw - 24px))", zIndex: 60, display: "flex", flexDirection: "column",
        background: PANEL, border: `1px solid ${LINE}`, borderRadius: 10, boxShadow: "0 18px 48px rgba(0,0,0,.55)", color: INK, fontSize: 12 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: `1px solid ${LINE}` }}>
        <strong style={{ color: GOLD, letterSpacing: ".08em", fontSize: 11 }}>{cur ?? "—"} OPTIONS · DERIBIT</strong>
        <span style={{ color: MUTED, fontSize: 10 }}>public book · view only · not tradeable in WM</span>
        <span style={{ marginLeft: "auto", color: MUTED, fontSize: 10, ...MONO }}>
          {chain?.index != null ? `index ${money(chain.index)}` : ""}{chain?.asOf ? ` · asOf ${chain.asOf.slice(11, 19)}Z` : ""}
        </span>
        <button type="button" onClick={onClose} aria-label="Close options chain"
          style={{ background: "transparent", border: `1px solid ${LINE}`, color: INK, borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>×</button>
      </header>
      {!cur ? (
        <p style={{ padding: 12, color: MUTED }}>Deribit lists options on BTC and ETH only.</p>
      ) : error && !chain ? (
        <p role="status" title={error} style={{ padding: 12, color: MUTED }}>Deribit did not answer just now. The chain retries on its own.</p>
      ) : !chain ? (
        <p role="status" style={{ padding: 12, color: MUTED }}>Reading Deribit&apos;s public option book…</p>
      ) : (
        <>
          <nav aria-label="Expirations" style={{ display: "flex", gap: 6, padding: "8px 12px", overflowX: "auto", borderBottom: `1px solid ${LINE}` }}>
            {chain.expiries.map(e => {
              const on = e.expiration === expiry?.expiration;
              return (
                <button key={e.expiration} type="button" onClick={() => setExp(e.expiration)} aria-pressed={on}
                  style={{ whiteSpace: "nowrap", background: on ? "rgba(201,165,92,.14)" : "transparent", border: `1px solid ${on ? GOLD : LINE}`,
                    color: on ? INK : MUTED, borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11, ...MONO }}>
                  {e.expiration.slice(5)} · {e.dte}d
                </button>
              );
            })}
          </nav>
          <div style={{ padding: "6px 12px", color: MUTED, fontSize: 10, ...MONO }}>
            {expiry?.forward != null ? `forward ${money(expiry.forward)} · ` : ""}USD per 1 {cur} contract · mark IV · OI in contracts
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, background: "#0d0b08", zIndex: 1 }}>
                <tr style={{ color: MUTED, fontSize: 10 }}>
                  {["OI", "IV", "Mark", "Ask", "Bid"].map(h => <th key={`c${h}`} style={{ padding: "4px 6px", textAlign: "right" }}>{h}</th>)}
                  <th style={{ padding: "4px 6px", color: GOLD }}>CALLS · STRIKE · PUTS</th>
                  {["Bid", "Ask", "Mark", "IV", "OI"].map(h => <th key={`p${h}`} style={{ padding: "4px 6px", textAlign: "right" }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.strike} data-atm={r.strike === atm ? "1" : undefined}
                    style={{ borderTop: r.strike === atm ? `1px solid ${GOLD}` : `1px solid rgba(201,165,92,.06)` }}>
                    <Leg leg={r.call} side="CALL" />
                    <td style={{ padding: "3px 8px", textAlign: "center", color: r.strike === atm ? GOLD : INK, fontWeight: 700, ...MONO }}>{money(r.strike)}</td>
                    <Leg leg={r.put} side="PUT" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
