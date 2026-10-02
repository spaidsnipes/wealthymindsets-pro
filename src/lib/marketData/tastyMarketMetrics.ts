/**
 * MARKET METRICS FOR THE MARKET INFO / VALUATION VIEWS (2026-10-01).
 *
 * Serving BTC-USD and TSLA, 23:55 CDT: Market Info, Contract and Valuation
 * were a dead end — the company-fundamentals provider has no key on the host,
 * and the panel told the trader to set a Cloudflare secret. tastytrade's own
 * market metrics (already proxied at /api/broker/tastytrade/market-metrics)
 * carry the reading a trader opens Market Info for: implied volatility, its
 * rank and percentile, realised volatility, beta and SPY correlation, market
 * cap, P/E, EPS, the next earnings date, dividend yield and liquidity.
 *
 * Every row is tastytrade's own number, formatted; a missing or zero
 * placeholder (futures report market cap 0 and P/E 0.0) is left out rather
 * than printed. PURE.
 */
import { futuresProductFor } from "@/lib/broker/tastytradeFuturesChain";
import { classifySymbol } from "@/lib/marketData/symbolAssetClass";

export interface MetricRow { readonly label: string; readonly value: string; readonly note?: string }

/** The symbol tastytrade answers metrics for, or null (crypto and spot FX get none). */
export function metricsSymbolFor(chartSymbol: string): string | null {
  const cls = classifySymbol(chartSymbol);
  const sym = chartSymbol.trim().toUpperCase();
  if (cls === "FUTURES") { const p = futuresProductFor(sym); return p ? `/${p}` : null; }
  if ((cls === "EQUITY" || cls === "INDEX") && /^[A-Z]{1,5}(\.[A-Z])?$/.test(sym)) return sym;
  return null;
}

const n = (v: unknown): number | null => {
  const x = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(x) ? x : null;
};
const pct = (f: number | null, d = 1) => (f == null ? null : `${(f * 100).toFixed(d)}%`);
const big = (v: number | null) => (v == null || v <= 0 ? null
  : v >= 1e12 ? `$${(v / 1e12).toFixed(2)}T` : v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${v.toLocaleString()}`);

export function readMarketMetrics(item: unknown): MetricRow[] {
  const i = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
  const rows: MetricRow[] = [];
  const push = (label: string, value: string | null, note?: string) => { if (value != null) rows.push(note ? { label, value, note } : { label, value }); };
  const iv = n(i["implied-volatility-index"]);
  push("Implied volatility (IVx)", pct(iv));
  push("IV rank", pct(n(i["implied-volatility-index-rank"])));
  push("IV percentile", pct(n(i["implied-volatility-percentile"])));
  const hv30 = n(i["historical-volatility-30-day"]);
  push("Realised vol · 30d", hv30 == null ? null : `${hv30.toFixed(1)}%`);
  const ivhv = n(i["iv-hv-30-day-difference"]);
  push("IV − HV · 30d", ivhv == null ? null : `${ivhv > 0 ? "+" : ""}${ivhv.toFixed(1)} pts`);
  const beta = n(i.beta);
  push("Beta", beta == null ? null : beta.toFixed(2));
  const corr = n(i["corr-spy-3month"]);
  push("Correlation to SPY · 3m", corr == null ? null : corr.toFixed(2));
  push("Market cap", big(n(i["market-cap"])));
  const pe = n(i["price-earnings-ratio"]);
  push("P/E", pe == null || pe <= 0 ? null : pe.toFixed(1));
  const eps = n(i["earnings-per-share"]);
  push("EPS", eps == null || eps === 0 ? null : eps.toFixed(2));
  const e = (i.earnings && typeof i.earnings === "object" ? i.earnings : null) as Record<string, unknown> | null;
  if (e && typeof e["expected-report-date"] === "string") {
    push("Next earnings", e["expected-report-date"] as string, e.estimated === true ? "estimated" : "confirmed");
  }
  const dy = n(i["dividend-yield"]);
  push("Dividend yield", dy == null || dy <= 0 ? null : pct(dy, 2));
  const liq = n(i["liquidity-rating"]);
  push("Options liquidity", liq == null ? null : `${"●".repeat(Math.max(0, Math.min(5, Math.round(liq))))}${"○".repeat(Math.max(0, 5 - Math.round(liq)))}`);
  if (typeof i["listed-market"] === "string") push("Listed on", i["listed-market"] as string);
  return rows;
}
