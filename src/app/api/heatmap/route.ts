/**
 * /api/heatmap — Fast batch heatmap data
 *
 * GET /api/heatmap?period=1D&syms=AAPL,MSFT,NVDA,...
 *
 * period:
 *   1D  → today's change% from Yahoo Finance v7 batch (ONE call, ~200ms)
 *   1W  → (price_now - price_5d_ago) / price_5d_ago  from Yahoo daily chart
 *   1M  → (price_now - price_22d_ago) / price_22d_ago
 *   3M  → (price_now - price_65d_ago) / price_65d_ago
 *   6M  → (price_now - price_130d_ago) / price_130d_ago
 *   YTD → (price_now - price_jan1) / price_jan1
 *   1Y  → (price_now - price_252d_ago) / price_252d_ago
 */

import { NextResponse } from "next/server";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

const SERVER_CACHE = new Map<string, { data: unknown; ts: number }>();
async function withCache<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = SERVER_CACHE.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data as T;
  const data = await fn();
  SERVER_CACHE.set(key, { data, ts: Date.now() });
  return data;
}

// Yahoo Finance symbol mapping
const YF_MAP: Record<string, string> = {
  "NQ1!":"NQ=F","ES1!":"ES=F","YM1!":"YM=F","RTY1!":"RTY=F",
  "GC1!":"GC=F","CL1!":"CL=F","SI1!":"SI=F","HG1!":"HG=F",
  "ZB1!":"ZB=F","ZN1!":"ZN=F","NG1!":"NG=F","VX1!":"^VIX",
  "BTC":"BTC-USD","ETH":"ETH-USD","SOL":"SOL-USD","BNB":"BNB-USD",
  "XRP":"XRP-USD","DOGE":"DOGE-USD","ADA":"ADA-USD","AVAX":"AVAX-USD",
};
function toYF(sym: string) { return YF_MAP[sym] ?? sym; }

async function yfGet(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`YF ${res.status}`);
  return res.json();
}

// ── 1D: Yahoo Finance v7 batch quote (single request for all syms) ──────────
async function fetch1D(syms: string[]): Promise<Record<string, number>> {
  const yfSyms = syms.map(toYF);
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yfSyms.join(","))}&fields=symbol,regularMarketChangePercent`;
  const json = await yfGet(url) as { quoteResponse?: { result?: { symbol: string; regularMarketChangePercent?: number }[] } };
  const quotes = json?.quoteResponse?.result ?? [];
  const results: Record<string, number> = {};
  quotes.forEach(q => {
    const wmSym = syms.find(s => toYF(s) === q.symbol) ?? q.symbol;
    const pct = q.regularMarketChangePercent;
    if (typeof pct === "number") results[wmSym] = +pct.toFixed(2);
  });
  return results;
}

// ── Multi-day: fetch daily chart for one sym, return pct change over daysBack ─
async function fetchDayOffset(sym: string, daysBack: number): Promise<number | null> {
  const yfSym = toYF(sym);
  const range = daysBack <= 10 ? "1mo" : daysBack <= 70 ? "3mo" : daysBack <= 140 ? "6mo" : "2y";
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym)}?interval=1d&range=${range}`;
  try {
    const json = await yfGet(url) as { chart?: { result?: { meta?: { regularMarketPrice?: number }; indicators?: { quote?: { close?: (number | null)[] }[] } }[] } };
    const result = json?.chart?.result?.[0];
    const meta = result?.meta;
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    const valid = closes.filter((c): c is number => c != null && c > 0);
    if (valid.length < 2) return null;
    const now  = meta?.regularMarketPrice ?? valid[valid.length - 1];
    const idx  = Math.max(0, valid.length - 1 - daysBack);
    const prev = valid[idx];
    if (!prev || !now) return null;
    return +((( now - prev) / prev) * 100).toFixed(2);
  } catch { return null; }
}

// ── Multi-day: parallel fetch in chunks (Yahoo is lenient, no API key needed) ─
async function fetchMultiDay(syms: string[], daysBack: number): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  const CHUNK = 25; // parallel within chunk, sequential between chunks
  for (let i = 0; i < syms.length; i += CHUNK) {
    const batch = syms.slice(i, i + CHUNK);
    const vals  = await Promise.all(batch.map(s => fetchDayOffset(s, daysBack)));
    batch.forEach((s, j) => { if (vals[j] != null) results[s] = vals[j]!; });
    // Small yield between chunks — avoids overwhelming Yahoo
    if (i + CHUNK < syms.length) await new Promise(r => setTimeout(r, 50));
  }
  return results;
}

function daysForPeriod(period: string): number {
  const now = new Date();
  switch (period) {
    case "1W":  return 5;
    case "1M":  return 21;
    case "3M":  return 63;
    case "6M":  return 126;
    case "YTD": return Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86_400_000);
    case "1Y":  return 252;
    default:    return 5;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period    = (searchParams.get("period") ?? "1D").toUpperCase();
  const symsParam = searchParams.get("syms") ?? "";
  const syms      = symsParam.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);

  if (syms.length === 0) return NextResponse.json({ error: "No symbols" }, { status: 400 });

  // Cache 1D for 30s, historical for 3 minutes
  const ttl      = period === "1D" ? 30_000 : 180_000;
  const cacheKey = `heatmap:${period}:${syms.slice(0, 5).join(",")}:${syms.length}`;

  try {
    const results = await withCache(cacheKey, ttl, async () =>
      period === "1D" ? fetch1D(syms) : fetchMultiDay(syms, daysForPeriod(period))
    );
    return NextResponse.json({ period, results });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
