"use client";

/**
 * SEC FUNDAMENTALS — the company's own filed figures (SEC EDGAR, keyless) on
 * the Profile / Financials / Corporate Actions views (2026-10-02). Replaces the
 * dependency on a paid fundamentals key for these three views. Names its source
 * and filing dates; a derived fourth quarter says so; nothing is invented.
 */
import React, { useEffect, useState } from "react";

import type { SecQuarter } from "@/lib/fundamentals/secEdgar";
import { secValuation } from "@/lib/fundamentals/secValuation";
import { yahooQuoteObserved, yahooQuoteRefusal } from "@/lib/marketData/yahooQuoteObserved";

interface SecBody {
  readonly state: string;
  readonly symbol?: string;
  readonly cik?: string;
  readonly profile?: { name: string | null; industry: string | null; exchanges: string[]; fiscalYearEnd: string | null; stateOfIncorporation: string | null; filerCategory: string | null; headquarters: string | null; website: string | null } | null;
  readonly shares?: { shares: number; asOf: string } | null;
  readonly quarters?: SecQuarter[];
  readonly dividends?: { end: string; perShare: number }[];
  readonly filings?: { form: string; filed: string; url: string }[];
  readonly readAt?: string;
}

const BOX: React.CSSProperties = { background: "#141824", border: "1px solid #1E2030", borderRadius: 8, padding: 16, marginBottom: 16 };
const CELL: React.CSSProperties = { background: "#0f121b", border: "1px solid #1E2030", borderRadius: 6, padding: "8px 10px" };

export function fmtUsdBig(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const a = Math.abs(n), s = n < 0 ? "−" : "";
  if (a >= 1e12) return `${s}$${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(1)}K`;
  return `${s}$${a.toFixed(2)}`;
}
const fye = (mmdd: string | null | undefined) => (mmdd && /^\d{4}$/.test(mmdd) ? new Date(Date.UTC(2000, Number(mmdd.slice(0, 2)) - 1, Number(mmdd.slice(2)))).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" }) : "—");

export function SecFundamentalsCard({ symbol, tab }: { readonly symbol: string; readonly tab: string }) {
  const [body, setBody] = useState<SecBody | null>(null);
  const [failed, setFailed] = useState(false);
  // The price the Valuation view divides by — the same quote route the room reads.
  const [quote, setQuote] = useState<{ price: number; ts: number | null } | null>(null);
  // SF-D01: a refused quote (e.g. a day close presented as live) never prices
  // the valuation, and the refusal's own words are shown instead.
  const [quoteRefused, setQuoteRefused] = useState<string | null>(null);
  useEffect(() => {
    if (tab !== "Valuation") return;
    let off = false;
    fetch(`/api/yahoo?sym=${encodeURIComponent(symbol.toUpperCase())}&type=quote`, { cache: "no-store" })
      .then(r => r.json() as Promise<{ price?: number; ts?: number }>)
      .then(j => {
        if (off) return;
        if (!yahooQuoteObserved(j)) { setQuote(null); setQuoteRefused(yahooQuoteRefusal(j) ?? "The quote was refused."); return; }
        setQuoteRefused(null);
        if (typeof j.price === "number" && j.price > 0) setQuote({ price: j.price, ts: typeof j.ts === "number" ? j.ts : null });
      })
      .catch(() => {});
    return () => { off = true; };
  }, [symbol, tab]);
  useEffect(() => {
    let off = false;
    setBody(null); setFailed(false);
    fetch(`/api/fundamentals/sec?symbol=${encodeURIComponent(symbol.toUpperCase())}`)
      .then(r => r.json() as Promise<SecBody>)
      .then(j => { if (!off) setBody(j); })
      .catch(() => { if (!off) setFailed(true); });
    return () => { off = true; };
  }, [symbol]);

  if (failed || body?.state === "SEC_UNAVAILABLE") {
    return <p data-testid="sec-fundamentals-unavailable" style={{ fontSize: 12, color: "#8896BE" }}>SEC EDGAR did not answer just now — company filings for {symbol.toUpperCase()} will load on the next visit.</p>;
  }
  if (!body) return <div style={{ color: "#6B7094", fontSize: 13, padding: "12px 4px" }}>Reading {symbol.toUpperCase()}&apos;s SEC filings…</div>;
  if (body.state === "NOT_LISTED") {
    return <p data-testid="sec-fundamentals-not-listed" style={{ fontSize: 12, color: "#8896BE", maxWidth: 560 }}>{symbol.toUpperCase()} does not file with the SEC under this ticker (funds, foreign listings and some ETFs do not), so there are no filed company figures to show.</p>;
  }
  if (body.state !== "OK") return null;

  const source = (
    <div style={{ fontSize: 10, color: "#6B7094", marginTop: 10 }}>
      Source: SEC EDGAR — the company&apos;s own filings (CIK {body.cik}). Read {body.readAt ? new Date(body.readAt).toLocaleString() : "—"}.
    </div>
  );

  if (tab === "Profile") {
    const p = body.profile;
    const rows: [string, string][] = [
      ["Legal name", p?.name ?? "—"],
      ["Industry (SEC SIC)", p?.industry ?? "—"],
      ["Exchange", p?.exchanges?.length ? p.exchanges.join(", ") : "—"],
      ["Headquarters", p?.headquarters ?? "—"],
      ["Incorporated in", p?.stateOfIncorporation ?? "—"],
      ["Fiscal year ends", fye(p?.fiscalYearEnd)],
      ["Filer category", p?.filerCategory ?? "—"],
      ["Shares outstanding", body.shares ? `${(body.shares.shares / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 })}M (cover page, ${body.shares.asOf})` : "—"],
    ];
    return (
      <section data-testid="sec-fundamentals-profile" style={BOX}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0", marginBottom: 10 }}>Company — {p?.name ?? symbol.toUpperCase()}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(190px,100%),1fr))", gap: 10 }}>
          {rows.map(([l, v]) => <div key={l} style={CELL}><div style={{ fontSize: 10, color: "#6B7094", marginBottom: 2 }}>{l}</div><div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>{v}</div></div>)}
        </div>
        {body.filings?.length ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, color: "#6B7094", marginBottom: 6 }}>Recent filings</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {body.filings.map(f => <a key={f.url} href={f.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#C9A55C", textDecoration: "none", border: "1px solid #1E2030", borderRadius: 4, padding: "2px 8px" }}>{f.form} · {f.filed}</a>)}
            </div>
          </div>
        ) : null}
        {source}
      </section>
    );
  }

  if (tab === "Valuation") {
    const v = secValuation(body.quarters ?? [], body.shares?.shares, quote?.price, body.dividends ?? []);
    const pct = (x: number | null) => (x == null ? "—" : `${(x * 100).toFixed(1)}%`);
    const mult = (x: number | null) => (x == null ? "—" : `${x.toFixed(1)}×`);
    const rows: [string, string][] = [
      ["Market cap", fmtUsdBig(v.marketCap)],
      ["P/E (market cap ÷ TTM net income)", v.ttmNetIncome != null && v.ttmNetIncome <= 0 ? "n/a — trailing loss" : mult(v.pe)],
      ["P/S (market cap ÷ TTM revenue)", mult(v.ps)],
      ["TTM revenue", fmtUsdBig(v.ttmRevenue)],
      ["TTM net income", fmtUsdBig(v.ttmNetIncome)],
      ["Gross margin (TTM)", pct(v.grossMargin)],
      ["Operating margin (TTM)", pct(v.operatingMargin)],
      ["Net margin (TTM)", pct(v.netMargin)],
      ["Dividend yield (last 4 declared)", pct(v.dividendYield)],
    ];
    return (
      <section data-testid="sec-fundamentals-valuation" style={BOX}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0", marginBottom: 10 }}>Valuation — computed from filings × price</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(190px,100%),1fr))", gap: 10 }}>
          {rows.map(([l, val]) => <div key={l} style={CELL}><div style={{ fontSize: 10, color: "#6B7094", marginBottom: 2 }}>{l}</div><div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>{val}</div></div>)}
        </div>
        <div style={{ fontSize: 11, color: "#8896BE", marginTop: 8 }}>
          WM calculation: shares outstanding{body.shares ? ` (cover page, ${body.shares.asOf})` : ""} × price {quote ? `$${quote.price.toFixed(2)}` : quoteRefused ? `— (quote refused: ${quoteRefused})` : "— (no quote yet)"}
          {v.ttmQuarters.length ? `; trailing twelve months = quarters ended ${v.ttmQuarters.join(", ")}` : "; fewer than four filed quarters, so no trailing figures"}. Not a provider estimate.
        </div>
        {source}
      </section>
    );
  }

  if (tab === "Financials") {
    const qs = body.quarters ?? [];
    if (!qs.length) return <p style={{ fontSize: 12, color: "#8896BE" }}>{symbol.toUpperCase()}&apos;s filings carry no standard quarterly income figures.</p>;
    const anyDerived = qs.some(q => q.derived.length);
    const rows: [string, (q: SecQuarter) => string, keyof SecQuarter | null][] = [
      ["Revenue", q => fmtUsdBig(q.revenue), "revenue"],
      ["Gross profit", q => fmtUsdBig(q.grossProfit), "grossProfit"],
      ["Operating income", q => fmtUsdBig(q.operatingIncome), "operatingIncome"],
      ["Net income", q => fmtUsdBig(q.netIncome), "netIncome"],
      ["EPS (diluted)", q => (q.epsDiluted == null ? "—" : `${q.epsDiluted < 0 ? "−" : ""}$${Math.abs(q.epsDiluted).toFixed(2)}`), null],
    ];
    return (
      <section data-testid="sec-fundamentals-financials" style={BOX}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0", marginBottom: 10 }}>Quarterly results — as filed</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ color: "#6B7094" }}>
              <th style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid #1E2030", fontWeight: 500 }}>Quarter ended</th>
              {qs.map(q => <th key={q.end} style={{ textAlign: "right", padding: "6px 10px", borderBottom: "1px solid #1E2030", fontWeight: 500, whiteSpace: "nowrap" }}>{q.end}</th>)}
            </tr></thead>
            <tbody>
              {rows.map(([label, fn, field]) => (
                <tr key={label}>
                  <td style={{ padding: "6px 10px", color: "#B0B8D0", borderBottom: "1px solid #1E2030" }}>{label}</td>
                  {qs.map(q => <td key={q.end} style={{ padding: "6px 10px", color: "#E2E8F0", textAlign: "right", borderBottom: "1px solid #1E2030", whiteSpace: "nowrap" }}>{fn(q)}{field && q.derived.includes(field) ? <sup style={{ color: "#C9A55C" }}>†</sup> : null}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {anyDerived ? <div style={{ fontSize: 11, color: "#8896BE", marginTop: 8 }}>† DERIVED — companies file the fourth quarter only inside the annual 10-K; this is the year minus the three filed quarters. Per-share figures are never derived.</div> : null}
        {source}
      </section>
    );
  }

  if (tab === "Corporate Actions") {
    const divs = body.dividends ?? [];
    const filings = (body.filings ?? []).filter(f => f.form === "8-K").slice(0, 6);
    return (
      <section data-testid="sec-fundamentals-actions" style={BOX}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0", marginBottom: 10 }}>Dividends declared</div>
        {divs.length ? (
          <div style={{ display: "grid", gap: 6 }}>{divs.map(d => <div key={d.end} style={{ ...CELL, display: "flex", justifyContent: "space-between", fontSize: 12, color: "#E2E8F0" }}><span>Quarter to {d.end}</span><span>${d.perShare.toFixed(4).replace(/0{1,2}$/, "")} per share</span></div>)}</div>
        ) : <p style={{ fontSize: 12, color: "#8896BE", margin: 0 }}>No dividend declared in {symbol.toUpperCase()}&apos;s quarterly filings.</p>}
        {filings.length ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, color: "#6B7094", marginBottom: 6 }}>Material events (8-K)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{filings.map(f => <a key={f.url} href={f.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#C9A55C", textDecoration: "none", border: "1px solid #1E2030", borderRadius: 4, padding: "2px 8px" }}>8-K · {f.filed}</a>)}</div>
          </div>
        ) : null}
        <div style={{ fontSize: 10, color: "#6B7094", marginTop: 8 }}>Stock splits are not in a standard filed field; they are not shown rather than guessed.</div>
        {source}
      </section>
    );
  }
  return null;
}
