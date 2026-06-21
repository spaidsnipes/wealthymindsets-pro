/**
 * Kraken WebSocket & REST API — FREE, no key required for public market data
 * Provides: real-time order book, OHLCV, recent trades for crypto
 * WebSocket: wss://ws.kraken.com/v2
 */

const REST_BASE = "https://api.kraken.com/0/public";

// Kraken pair mapping from common crypto symbols
const KRAKEN_PAIRS: Record<string, string> = {
  BTC:   "XBT/USD",
  ETH:   "ETH/USD",
  SOL:   "SOL/USD",
  XRP:   "XRP/USD",
  ADA:   "ADA/USD",
  DOGE:  "DOGE/USD",
  AVAX:  "AVAX/USD",
  LINK:  "LINK/USD",
  DOT:   "DOT/USD",
  LTC:   "LTC/USD",
  ATOM:  "ATOM/USD",
  UNI:   "UNI/USD",
};

export function toKrakenPair(sym: string): string | null {
  return KRAKEN_PAIRS[sym.toUpperCase()] ?? null;
}

export function krakenWsPair(sym: string): string | null {
  const pair = toKrakenPair(sym);
  if (!pair) return null;
  // WebSocket v2 uses format like "BTC/USD"
  return pair.replace("XBT", "BTC");
}

export interface OrderBookLevel {
  price: number;
  size:  number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastUpdate: number;
}

const cache = new Map<string, { data: unknown; ts: number }>();

async function krakenFetch<T>(path: string, ttlMs = 5000): Promise<T | null> {
  const url = `${REST_BASE}${path}`;
  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < ttlMs) return cached.data as T;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.error?.length) return null;
    cache.set(url, { data: json.result, ts: Date.now() });
    return json.result as T;
  } catch {
    return null;
  }
}

export async function getOrderBook(sym: string, depth = 20): Promise<OrderBook | null> {
  const pair = toKrakenPair(sym);
  if (!pair) return null;
  // Kraken uses XBTUSD instead of BTC/USD internally
  const krakenInternal = pair.replace("/", "").replace("XBT", "XBT");

  const data = await krakenFetch<Record<string, { bids: string[][]; asks: string[][] }>>(
    `/Depth?pair=${krakenInternal}&count=${depth}`,
    2000
  );
  if (!data) return null;

  const key = Object.keys(data)[0];
  if (!key) return null;

  return {
    bids: data[key].bids.slice(0, depth).map(([p, s]) => ({ price: +p, size: +s })),
    asks: data[key].asks.slice(0, depth).map(([p, s]) => ({ price: +p, size: +s })),
    lastUpdate: Date.now(),
  };
}

export interface KrakenTrade {
  price: number;
  volume: number;
  time: number;
  side: "buy" | "sell";
}

export async function getRecentTrades(sym: string): Promise<KrakenTrade[]> {
  const pair = toKrakenPair(sym);
  if (!pair) return [];
  const krakenInternal = pair.replace("/", "").replace("BTC", "XBT");

  const data = await krakenFetch<Record<string, (string | number)[][]>>(
    `/Trades?pair=${krakenInternal}`,
    3000
  );
  if (!data) return [];

  const key = Object.keys(data).find(k => k !== "last");
  if (!key) return [];

  return (data[key] as (string | number)[][])
    .slice(-50)
    .map(([price, vol, time, side]) => ({
      price:  +price,
      volume: +vol,
      time:   Math.floor((+time) * 1000),
      side:   side === "b" ? "buy" : "sell" as "buy" | "sell",
    }))
    .reverse();
}

export interface KrakenOHLC {
  time:   number;
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number;
}

// Interval in minutes: 1,5,15,30,60,240,1440,10080,21600
export async function getOHLC(sym: string, intervalMin = 1): Promise<KrakenOHLC[]> {
  const pair = toKrakenPair(sym);
  if (!pair) return [];
  const krakenInternal = pair.replace("/", "").replace("BTC", "XBT");
  const since = Math.floor(Date.now() / 1000) - intervalMin * 60 * 300;

  const data = await krakenFetch<Record<string, (string | number)[][]>>(
    `/OHLC?pair=${krakenInternal}&interval=${intervalMin}&since=${since}`,
    30_000
  );
  if (!data) return [];

  const key = Object.keys(data).find(k => k !== "last");
  if (!key) return [];

  return (data[key] as (string | number)[][]).map(([t, o, h, l, c, , v]) => ({
    time:   +t,
    open:   +o,
    high:   +h,
    low:    +l,
    close:  +c,
    volume: +v,
  }));
}

/**
 * Kraken WebSocket v2 subscription message for order book
 * Connect to: wss://ws.kraken.com/v2
 */
export function krakenBookSubscribe(sym: string): string | null {
  const pair = krakenWsPair(sym);
  if (!pair) return null;
  return JSON.stringify({
    method: "subscribe",
    params: {
      channel: "book",
      symbol: [pair],
      depth: 10,
    },
  });
}

export function krakenTradeSubscribe(sym: string): string | null {
  const pair = krakenWsPair(sym);
  if (!pair) return null;
  return JSON.stringify({
    method: "subscribe",
    params: {
      channel: "trade",
      symbol: [pair],
    },
  });
}

export const KRAKEN_WS_URL = "wss://ws.kraken.com/v2";
