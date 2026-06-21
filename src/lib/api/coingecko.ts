/**
 * CoinGecko API — FREE public API, no key required for basic endpoints
 * Rate limit: ~30 calls/min on free tier (no key), 500 req/min with key
 */

const BASE = "https://api.coingecko.com/api/v3";
const API_KEY = process.env.NEXT_PUBLIC_COINGECKO_API ?? "";

// CoinGecko ID mapping from common symbols
export const COINGECKO_IDS: Record<string, string> = {
  BTC:   "bitcoin",
  ETH:   "ethereum",
  SOL:   "solana",
  BNB:   "binancecoin",
  XRP:   "ripple",
  DOGE:  "dogecoin",
  ADA:   "cardano",
  AVAX:  "avalanche-2",
  LINK:  "chainlink",
  DOT:   "polkadot",
  MATIC: "matic-network",
  LTC:   "litecoin",
  ATOM:  "cosmos",
  UNI:   "uniswap",
  AAVE:  "aave",
};

export function getCoinGeckoId(sym: string): string | null {
  return COINGECKO_IDS[sym.toUpperCase()] ?? null;
}

const cache = new Map<string, { data: unknown; ts: number }>();

async function cgFetch<T>(path: string, ttlMs = 30_000): Promise<T | null> {
  const url = `${BASE}${path}${path.includes("?") ? "&" : "?"}${API_KEY ? `x_cg_demo_api_key=${API_KEY}` : ""}`;
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

export interface CoinPrice {
  usd: number;
  usd_24h_change: number;
  usd_24h_vol?: number;
  usd_market_cap?: number;
}

export async function getCryptoPrices(
  symbols: string[]
): Promise<Record<string, CoinPrice>> {
  const ids = symbols
    .map(s => getCoinGeckoId(s))
    .filter(Boolean)
    .join(",");
  if (!ids) return {};

  const data = await cgFetch<Record<string, CoinPrice>>(
    `/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`,
    20_000
  );
  if (!data) return {};

  // Re-key by symbol
  const result: Record<string, CoinPrice> = {};
  for (const [sym, id] of Object.entries(COINGECKO_IDS)) {
    if (data[id]) result[sym] = data[id];
  }
  return result;
}

export interface OHLCCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/** Get OHLCV candles from CoinGecko (daily or 4h granularity based on `days`) */
export async function getCryptoOHLC(
  sym: string,
  days: 1 | 7 | 14 | 30 | 90 | 180 | 365
): Promise<OHLCCandle[]> {
  const id = getCoinGeckoId(sym);
  if (!id) return [];

  // CoinGecko returns [timestamp_ms, open, high, low, close]
  const data = await cgFetch<number[][]>(
    `/coins/${id}/ohlc?vs_currency=usd&days=${days}`,
    60_000
  );
  if (!data) return [];

  return data.map(([t, o, h, l, c]) => ({
    time:  Math.floor(t / 1000),
    open:  o,
    high:  h,
    low:   l,
    close: c,
  }));
}

export interface CoinMarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
}

export async function getTopCoins(limit = 20): Promise<CoinMarketData[]> {
  const data = await cgFetch<CoinMarketData[]>(
    `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false`,
    60_000
  );
  return data ?? [];
}

export async function getCoinDetails(sym: string): Promise<{
  marketCap: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  ath: number;
  circulatingSupply: number;
} | null> {
  const id = getCoinGeckoId(sym);
  if (!id) return null;

  const data = await cgFetch<{
    market_data: {
      market_cap: { usd: number };
      total_volume: { usd: number };
      high_24h: { usd: number };
      low_24h: { usd: number };
      ath: { usd: number };
      circulating_supply: number;
    };
  }>(`/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false`, 120_000);

  if (!data?.market_data) return null;
  const md = data.market_data;
  return {
    marketCap:         md.market_cap.usd,
    volume24h:         md.total_volume.usd,
    high24h:           md.high_24h.usd,
    low24h:            md.low_24h.usd,
    ath:               md.ath.usd,
    circulatingSupply: md.circulating_supply,
  };
}
