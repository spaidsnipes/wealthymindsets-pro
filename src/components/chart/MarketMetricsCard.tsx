"use client";

/**
 * MARKET METRICS — tastytrade's own reading of an instrument, on the Market
 * Info / Contract / Valuation views (2026-10-01). See tastyMarketMetrics.ts.
 * Says where the numbers came from and when; says plainly when there are none.
 */
import { owned, readOwned, UNOWNED, type Owned } from "@/lib/marketData/symbolOwned";
import React, { useEffect, useState } from "react";
import { symbolDoorHref } from "@/contexts/SymbolContext";

import { futuresProductFor, readFuturesOptionChain, type FutureContract } from "@/lib/broker/tastytradeFuturesChain";
import { metricsSymbolFor, readMarketMetrics, type MetricRow } from "@/lib/marketData/tastyMarketMetrics";
import { classifySymbol } from "@/lib/marketData/symbolAssetClass";
import { coinbaseProductFor } from "@/lib/marketData/coinbaseTradeBackfill";
import { readCoinbaseStats } from "@/lib/marketData/cryptoMarketInfo";
import { readFxMarketInfo } from "@/lib/marketData/fxMarketInfo";
import { fxFuturesDoor } from "@/lib/chart/fxFuturesDoor";

/** A spot pair's own facts (pip, centres open now) and its CME future door (2026-10-02). */
function FxMarketInfo({ symbol }: { readonly symbol: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);
  const rows = readFxMarketInfo(symbol, now);
  if (rows.length === 0) return null;
  const door = fxFuturesDoor(symbol);
  return (
    <section data-testid="fx-market-info" aria-label={`${symbol} market info`}
      style={{ background: "#141824", border: "1px solid #1E2030", borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0", marginBottom: 10 }}>Market info — {symbol.toUpperCase()}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 10 }}>
        {rows.map(r => (
          <div key={r.label} style={{ background: "#0f121b", border: "1px solid #1E2030", borderRadius: 6, padding: "8px 10px" }}>
            <div style={{ fontSize: 10, color: "#8b8fa8", marginBottom: 2 }}>{r.label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>{r.value}{r.note ? <span style={{ fontSize: 10, color: "#8896BE", fontWeight: 400 }}> · {r.note}</span> : null}</div>
          </div>
        ))}
      </div>
      {door ? (
        <p style={{ fontSize: 12, color: "#B0B8D0", margin: "12px 0 0" }}>
          Live traded volume and sides: {door.futures} ({door.note}) — a different market.{" "}
          <a
            href={`?symbol=${encodeURIComponent(door.futures)}`}
            // Keep the rest of the camera (tf, desk…) — a bare "?symbol=" replaced the whole query (hallway audit 2026-10-04).
            onClick={e => { e.preventDefault(); window.location.assign(symbolDoorHref(window.location.href, door.futures)); }}
            style={{ color: "#C9A55C" }}
          >Open {door.futures} →</a>
        </p>
      ) : null}
    </section>
  );
}
import { deribitCurrencyFor, dvolFrom } from "@/lib/marketData/deribitOptions";

/** A coin's day from Coinbase's public stats, plus Deribit DVOL for BTC / ETH (2026-10-02). */
function CryptoMarketInfo({ symbol }: { readonly symbol: string }) {
  const product = coinbaseProductFor(symbol);
  // Garden 18 §4: stored WITH the product they were read for — a switch never
  // paints the previous coin's 24h stats under the new coin's name.
  const [ownedRows, setOwnedRows] = useState<Owned<MetricRow[]>>(UNOWNED);
  const [ownedFailed, setOwnedFailed] = useState<Owned<true>>(UNOWNED);
  const rows = readOwned(ownedRows, product);
  const failed = readOwned(ownedFailed, product) === true;
  useEffect(() => {
    if (!product) return;
    let alive = true;
    setOwnedRows(UNOWNED); setOwnedFailed(UNOWNED);
    const cur = deribitCurrencyFor(symbol);
    const now = Date.now();
    const dvolP = cur
      ? fetch(`https://www.deribit.com/api/v2/public/get_volatility_index_data?currency=${cur}&start_timestamp=${now - 3 * 3_600_000}&end_timestamp=${now}&resolution=3600`, { cache: "no-store" })
          .then(r => (r.ok ? r.json() : null)).then(dvolFrom).catch(() => null)
      : Promise.resolve(null);
    Promise.all([fetch(`https://api.exchange.coinbase.com/products/${product}/stats`, { cache: "no-store" }).then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))), dvolP])
      .then(([stats, dvol]) => { if (alive) setOwnedRows(owned(product, readCoinbaseStats(stats, product.split("-")[0], dvol))); })
      .catch(() => { if (alive) setOwnedFailed(owned(product, true as const)); });
    return () => { alive = false; };
  }, [product, symbol]);
  if (!product) return null;
  return (
    <section data-testid="crypto-market-info" aria-label={`${symbol} market info`}
      style={{ background: "#141824", border: "1px solid #1E2030", borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0" }}>Market info — {product}</div>
        <div style={{ fontSize: 10, color: "#8b8fa8" }}>Coinbase public 24h stats{deribitCurrencyFor(symbol) ? " · Deribit DVOL" : ""}</div>
      </div>
      {failed ? (
        <p style={{ fontSize: 12, color: "#8896BE", margin: 0 }}>Coinbase did not answer for {product} — nothing is shown in its place.</p>
      ) : rows == null ? (
        <p style={{ fontSize: 12, color: "#8b8fa8", margin: 0 }}>Reading Coinbase…</p>
      ) : rows.length === 0 ? (
        <p style={{ fontSize: 12, color: "#8896BE", margin: 0 }}>Coinbase publishes no stats for {product}.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 10 }}>
          {rows.map(r => (
            <div key={r.label} style={{ background: "#0f121b", border: "1px solid #1E2030", borderRadius: 6, padding: "8px 10px" }}>
              <div style={{ fontSize: 10, color: "#8b8fa8", marginBottom: 2 }}>{r.label}</div>
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

/** A future's listed contracts, tastytrade's own (Contract view, 2026-10-01). */
function FuturesContracts({ symbol }: { readonly symbol: string }) {
  const product = classifySymbol(symbol) === "FUTURES" ? futuresProductFor(symbol) : null;
  // Garden 18 §4: this list was never reset on a switch — ES's contracts stayed
  // under NQ until NQ's chain answered. Stored WITH its product now.
  const [ownedList, setOwnedList] = useState<Owned<readonly FutureContract[]>>(UNOWNED);
  const list = readOwned(ownedList, product);
  useEffect(() => {
    if (!product) return;
    let alive = true;
    fetch(`/api/broker/tastytrade/chain?futuresOptions=${encodeURIComponent(product)}`, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (alive) setOwnedList(owned(product, j?.state === "OK" ? readFuturesOptionChain(j.data).futures : [])); })
      .catch(() => { if (alive) setOwnedList(owned(product, [] as readonly FutureContract[])); });
    return () => { alive = false; };
  }, [product]);
  if (!product || !list || list.length === 0) return null;
  const sorted = [...list].sort((a, b) => (a.dte ?? 1e9) - (b.dte ?? 1e9)).slice(0, 6);
  return (
    <div data-testid="futures-contracts" style={{ marginTop: 12 }}>
      <div style={{ fontSize: 10, color: "#8b8fa8", marginBottom: 6 }}>Listed contracts · tastytrade</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 10 }}>
        {sorted.map(f => (
          <div key={f.symbol} style={{ background: "#0f121b", border: `1px solid ${f.activeMonth ? "rgba(201,165,92,.6)" : "#1E2030"}`, borderRadius: 6, padding: "8px 10px" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>{f.symbol}{f.activeMonth ? <span style={{ fontSize: 10, color: "#C9A55C" }}> · active</span> : null}</div>
            <div style={{ fontSize: 10, color: "#8896BE", fontVariantNumeric: "tabular-nums" }}>expires {f.expiration ?? "—"}{f.dte != null ? ` · ${f.dte}d` : ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MarketMetricsCard({ symbol }: { readonly symbol: string }) {
  const q = metricsSymbolFor(symbol);
  // Garden 18 §4: every reading is stored WITH the symbol it was read for, so
  // the first frame after a switch never shows the previous symbol's metrics.
  const [ownedRead, setOwnedRead] = useState<Owned<{ rows: MetricRow[]; asOf: string | null }>>(UNOWNED);
  const [ownedFailed, setOwnedFailed] = useState<Owned<true>>(UNOWNED);
  const [ownedNotMine, setOwnedNotMine] = useState<Owned<true>>(UNOWNED);
  const read = readOwned(ownedRead, q);
  const rows = read?.rows ?? null;
  const asOf = read?.asOf ?? null;
  const failed = readOwned(ownedFailed, q) === true;
  const notMine = readOwned(ownedNotMine, q) === true;

  useEffect(() => {
    if (!q) return;
    let alive = true;
    setOwnedRead(UNOWNED); setOwnedFailed(UNOWNED); setOwnedNotMine(UNOWNED);
    const setNotMine = (_: true) => setOwnedNotMine(owned(q, true as const));
    const setFailed = (_: true) => setOwnedFailed(owned(q, true as const));
    fetch(`/api/broker/tastytrade/market-metrics?symbols=${encodeURIComponent(q)}`, { cache: "no-store" })
      .then(r => {
        // Not the broker owner: these metrics come from the owner's tastytrade
        // session, so for anyone else the card is not drawn at all — not
        // "tastytrade did not answer" (garden pass 2026-10-05).
        if (r.status === 401 || r.status === 403) { if (alive) setNotMine(true); return Promise.reject(new Error("not-mine")); }
        return r.ok ? r.json() : Promise.reject(new Error(String(r.status)));
      })
      .then(j => {
        if (!alive) return;
        const item = (j?.items ?? []).find((x: { symbol?: string }) => x?.symbol === q) ?? null;
        setOwnedRead(owned(q, {
          rows: item ? readMarketMetrics(item) : [],
          asOf: item && typeof item["updated-at"] === "string" ? item["updated-at"] : null,
        }));
      })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [q]);

  if (q && notMine) return null;
  if (!q) {
    const cls = classifySymbol(symbol);
    return cls === "CRYPTO" ? <CryptoMarketInfo symbol={symbol} /> : cls === "FOREX" ? <FxMarketInfo symbol={symbol} /> : null;
  }
  return (
    <section data-testid="market-metrics-card" aria-label={`${symbol} market metrics`}
      style={{ background: "#141824", border: "1px solid #1E2030", borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0" }}>Market metrics — {q}</div>
        <div style={{ fontSize: 10, color: "#8b8fa8" }}>tastytrade{asOf ? ` · updated ${new Date(asOf).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}` : ""}</div>
      </div>
      {failed ? (
        <p style={{ fontSize: 12, color: "#8896BE", margin: 0 }}>tastytrade did not answer for {q} — nothing is shown in its place.</p>
      ) : rows == null ? (
        <p style={{ fontSize: 12, color: "#8b8fa8", margin: 0 }}>Reading tastytrade market metrics…</p>
      ) : rows.length === 0 ? (
        <p style={{ fontSize: 12, color: "#8896BE", margin: 0 }}>tastytrade publishes no market metrics for {q}.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 10 }}>
          {rows.map(r => (
            <div key={r.label} style={{ background: "#0f121b", border: "1px solid #1E2030", borderRadius: 6, padding: "8px 10px" }}>
              <div style={{ fontSize: 10, color: "#8b8fa8", marginBottom: 2 }}>{r.label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", fontVariantNumeric: "tabular-nums" }}>
                {r.value}{r.note ? <span style={{ fontSize: 10, color: "#8896BE", fontWeight: 400 }}> · {r.note}</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
      <FuturesContracts symbol={symbol} />
    </section>
  );
}
