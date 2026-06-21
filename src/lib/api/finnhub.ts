/**
 * Finnhub API client — real market data
 * Free tier: 60 REST calls/min, WebSocket trades (unlimited)
 * Key: d8efu9hr01qth3ch5f20d8efu9hr01qth3ch5f2g
 */

const KEY = process.env.NEXT_PUBLIC_FINNHUB_KEY ?? "d8efu9hr01qth3ch5f20d8efu9hr01qth3ch5f2g";
const BASE = "https://finnhub.io/api/v1";

// Simple in-memory cache to avoid burning rate limits
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL: Record<string, number> = {
  quote:   15_000,  // 15s — price data
  candle:  60_000,  // 60s — OHLCV
  news:   120_000,  // 2min — news
};

async function cachedFetch<T>(url: string, ttlMs: number): Promise<T | null> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < ttlMs) return cached.data as T;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    cache.set(url, { data, ts: Date.now() });
    return data as T;
  } catch {
    return null;
  }
}

export interface FinnhubQuote {
  c: number;  // current price
  d: number;  // change
  dp: number; // change %
  h: number;  // high
  l: number;  // low
  o: number;  // open
  pc: number; // previous close
  t: number;  // timestamp
  v: number;  // volume (not always present)
}

export interface FinnhubCandle {
  s: string;
  t: number[];
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
}

export interface FinnhubNewsItem {
  id: number;
  category: string;
  datetime: number;
  headline: string;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

const CRYPTO_SYMS = new Set(["BTC","ETH","SOL","BNB","XRP","DOGE","ADA","AVAX","LINK","DOT","MATIC","LTC"]);

export function toFinnhubSym(sym: string): string {
  const u = sym.toUpperCase();
  if (CRYPTO_SYMS.has(u)) return `BINANCE:${u}USDT`;
  return u;
}

export function isFinnhubSupported(sym: string): boolean {
  const u = sym.toUpperCase();
  // Futures (NQ1!, ES1!, etc.) and forex not reliably supported
  if (u.includes("1!") || u.includes("/")) return false;
  return true;
}

export async function getQuote(sym: string): Promise<FinnhubQuote | null> {
  if (!isFinnhubSupported(sym)) return null;
  const finnSym = toFinnhubSym(sym);
  const url = `${BASE}/quote?symbol=${finnSym}&token=${KEY}`;
  const data = await cachedFetch<FinnhubQuote>(url, CACHE_TTL.quote);
  if (!data || data.c === 0) return null;
  return data;
}

export async function getCandles(
  sym: string,
  resolution: string,
  from: number,
  to: number
): Promise<FinnhubCandle | null> {
  if (!isFinnhubSupported(sym)) return null;
  const u = sym.toUpperCase();
  let url: string;
  if (CRYPTO_SYMS.has(u)) {
    url = `${BASE}/crypto/candle?symbol=BINANCE:${u}USDT&resolution=${resolution}&from=${from}&to=${to}&token=${KEY}`;
  } else {
    url = `${BASE}/stock/candle?symbol=${u}&resolution=${resolution}&from=${from}&to=${to}&token=${KEY}`;
  }
  const data = await cachedFetch<FinnhubCandle>(url, CACHE_TTL.candle);
  if (!data || data.s !== "ok") return null;
  return data;
}

export async function getGeneralNews(count = 50): Promise<FinnhubNewsItem[]> {
  const url = `${BASE}/news?category=general&minId=0&token=${KEY}`;
  const data = await cachedFetch<FinnhubNewsItem[]>(url, CACHE_TTL.news);
  return (data ?? []).slice(0, count);
}

export async function getCompanyNews(sym: string, days = 7): Promise<FinnhubNewsItem[]> {
  if (!isFinnhubSupported(sym) || CRYPTO_SYMS.has(sym.toUpperCase())) return [];
  const to = new Date();
  const from = new Date(Date.now() - days * 86400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const url = `${BASE}/company-news?symbol=${sym.toUpperCase()}&from=${fmt(from)}&to=${fmt(to)}&token=${KEY}`;
  const data = await cachedFetch<FinnhubNewsItem[]>(url, CACHE_TTL.news);
  return (data ?? []).slice(0, 30);
}

export async function searchSymbol(q: string): Promise<Array<{ symbol: string; description: string; type: string }>> {
  if (q.length < 1) return [];
  const url = `${BASE}/search?q=${encodeURIComponent(q)}&token=${KEY}`;
  const data = await cachedFetch<{ result: Array<{ symbol: string; description: string; type: string }> }>(url, 30_000);
  return (data?.result ?? []).slice(0, 20);
}

export async function getBasicFinancials(sym: string): Promise<Record<string, unknown> | null> {
  if (!isFinnhubSupported(sym) || CRYPTO_SYMS.has(sym.toUpperCase())) return null;
  const url = `${BASE}/stock/metric?symbol=${sym.toUpperCase()}&metric=all&token=${KEY}`;
  const data = await cachedFetch<{ metric: Record<string, unknown> }>(url, 300_000);
  return data?.metric ?? null;
}

/** Finnhub WebSocket URL for real-time trade streaming */
export function getFinnhubWSUrl(): string {
  return `wss://ws.finnhub.io?token=${KEY}`;
}
