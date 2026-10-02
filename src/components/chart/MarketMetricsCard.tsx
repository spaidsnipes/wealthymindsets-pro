"use client";

/**
 * MARKET METRICS — tastytrade's own reading of an instrument, on the Market
 * Info / Contract / Valuation views (2026-10-01). See tastyMarketMetrics.ts.
 * Says where the numbers came from and when; says plainly when there are none.
 */
import React, { useEffect, useState } from "react";

import { metricsSymbolFor, readMarketMetrics, type MetricRow } from "@/lib/marketData/tastyMarketMetrics";

export function MarketMetricsCard({ symbol }: { readonly symbol: string }) {
  const q = metricsSymbolFor(symbol);
  const [rows, setRows] = useState<MetricRow[] | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!q) return;
    let alive = true;
    setRows(null); setFailed(false); setAsOf(null);
    fetch(`/api/broker/tastytrade/market-metrics?symbols=${encodeURIComponent(q)}`, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(j => {
        if (!alive) return;
        const item = (j?.items ?? []).find((x: { symbol?: string }) => x?.symbol === q) ?? null;
        setRows(item ? readMarketMetrics(item) : []);
        setAsOf(item && typeof item["updated-at"] === "string" ? item["updated-at"] : null);
      })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [q]);

  if (!q) return null;
  return (
    <section data-testid="market-metrics-card" aria-label={`${symbol} market metrics`}
      style={{ background: "#141824", border: "1px solid #1E2030", borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0" }}>Market metrics — {q}</div>
        <div style={{ fontSize: 10, color: "#6B7094" }}>tastytrade{asOf ? ` · updated ${asOf.slice(0, 16).replace("T", " ")}Z` : ""}</div>
      </div>
      {failed ? (
        <p style={{ fontSize: 12, color: "#8896BE", margin: 0 }}>tastytrade did not answer for {q} — nothing is shown in its place.</p>
      ) : rows == null ? (
        <p style={{ fontSize: 12, color: "#6B7094", margin: 0 }}>Reading tastytrade market metrics…</p>
      ) : rows.length === 0 ? (
        <p style={{ fontSize: 12, color: "#8896BE", margin: 0 }}>tastytrade publishes no market metrics for {q}.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 10 }}>
          {rows.map(r => (
            <div key={r.label} style={{ background: "#0f121b", border: "1px solid #1E2030", borderRadius: 6, padding: "8px 10px" }}>
              <div style={{ fontSize: 10, color: "#6B7094", marginBottom: 2 }}>{r.label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", fontVariantNumeric: "tabular-nums" }}>
                {r.value}{r.note ? <span style={{ fontSize: 10, color: "#8896BE", fontWeight: 400 }}> · {r.note}</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
