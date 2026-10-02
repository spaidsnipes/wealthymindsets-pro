/**
 * CRYPTO MARKET INFO (2026-10-02): BTC-USD's Market Info was an empty "company
 * fundamentals apply to equities only" card. A crypto trader opens it for the
 * coin's day: Coinbase's own public 24-hour stats (open / high / low / last /
 * base-unit volume, 30-day volume) and, for BTC / ETH, Deribit's DVOL (the
 * 30-day implied volatility index). Every figure is the venue's own; a field
 * the venue did not send is left out. PURE.
 */
import type { MetricRow } from "@/lib/marketData/tastyMarketMetrics";

const n = (v: unknown): number | null => {
  const x = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(x) ? x : null;
};
const px = (v: number | null) => (v == null ? null : v.toLocaleString(undefined, { maximumFractionDigits: v >= 100 ? 2 : 6 }));
const qty = (v: number | null, unit: string) => (v == null ? null : `${v.toLocaleString(undefined, { maximumFractionDigits: v >= 1000 ? 0 : 2 })} ${unit}`);

export function readCoinbaseStats(body: unknown, base: string, dvol: number | null): MetricRow[] {
  const o = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const open = n(o.open), high = n(o.high), low = n(o.low), last = n(o.last);
  const rows: MetricRow[] = [];
  const push = (label: string, value: string | null, note?: string) => { if (value != null) rows.push(note ? { label, value, note } : { label, value }); };
  push("Last", px(last));
  if (open != null && open > 0 && last != null) {
    const ch = ((last - open) / open) * 100;
    push("24h change", `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%`);
  }
  push("24h high", px(high));
  push("24h low", px(low));
  if (high != null && low != null && low > 0) push("24h range", `${(((high - low) / low) * 100).toFixed(2)}%`);
  push("24h volume", qty(n(o.volume), base));
  push("30d volume", qty(n(o.volume_30day), base));
  if (dvol != null && dvol > 0) push("Implied vol (DVOL 30d)", `${dvol.toFixed(1)}%`, "Deribit");
  return rows;
}
