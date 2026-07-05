/**
 * /api/memecoin — Server-side meme-coin / DEX proxy (CORS-free, no API key).
 *
 * GET /api/memecoin?type=search&q=pepe
 *     → DexScreener token search → list of pairs (price, liq, vol, chain, pool)
 * GET /api/memecoin?type=trending
 *     → DexScreener boosted/trending tokens
 * GET /api/memecoin?type=candles&network=solana&pool=<poolAddress>&tf=hour&agg=1
 *     → GeckoTerminal OHLCV → chartable candle series
 *
 * DexScreener (api.dexscreener.com) and GeckoTerminal (api.geckoterminal.com)
 * are both free + keyless. We proxy them server-side to dodge CORS and
 * normalise into the candle/quote shape the chart layer already consumes.
 */

import { NextResponse } from "next/server";

const DEX = "https://api.dexscreener.com";
const GECKO = "https://api.geckoterminal.com/api/v2";

const CACHE = new Map<string, { data: unknown; ts: number }>();
async function cachedJson(url: string, ttlMs: number, headers: Record<string, string> = {}): Promise<any> {
  const hit = CACHE.get(url);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data;
  const res = await fetch(url, { headers: { Accept: "application/json", ...headers }, cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  CACHE.set(url, { data, ts: Date.now() });
  return data;
}

function normPair(p: any) {
  return {
    chain: p?.chainId ?? null,
    dex: p?.dexId ?? null,
    pair: p?.pairAddress ?? null,
    base: p?.baseToken?.symbol ?? null,
    baseName: p?.baseToken?.name ?? null,
    baseAddress: p?.baseToken?.address ?? null,
    quote: p?.quoteToken?.symbol ?? null,
    price: Number(p?.priceUsd ?? 0) || null,
    priceNative: Number(p?.priceNative ?? 0) || null,
    liquidity: Number(p?.liquidity?.usd ?? 0) || 0,
    fdv: Number(p?.fdv ?? 0) || 0,
    marketCap: Number(p?.marketCap ?? 0) || 0,
    volume24h: Number(p?.volume?.h24 ?? 0) || 0,
    change24h: Number(p?.priceChange?.h24 ?? 0) || 0,
    change1h: Number(p?.priceChange?.h1 ?? 0) || 0,
    url: p?.url ?? null,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "search";

  try {
    if (type === "candles") {
      // GeckoTerminal OHLCV — real DEX candles, free + keyless.
      const network = searchParams.get("network") ?? "solana";
      const pool = searchParams.get("pool");
      if (!pool) return NextResponse.json({ error: "pool required" }, { status: 400 });
      const tf = searchParams.get("tf") ?? "hour"; // minute | hour | day
      const agg = searchParams.get("agg") ?? "1";  // 1,5,15 (minute); 1,4,12 (hour); 1 (day)
      const limit = Math.min(1000, parseInt(searchParams.get("limit") ?? "300", 10));
      const url = `${GECKO}/networks/${encodeURIComponent(network)}/pools/${encodeURIComponent(pool)}/ohlcv/${encodeURIComponent(tf)}?aggregate=${encodeURIComponent(agg)}&limit=${limit}&currency=usd`;
      const j = await cachedJson(url, 30_000, { Accept: "application/json;version=20230302" });
      const list: any[] = j?.data?.attributes?.ohlcv_list ?? [];
      // each row: [timestamp, open, high, low, close, volume]
      const candles = list
        .map(r => ({
          time: Number(r[0]),
          open: Number(r[1]),
          high: Number(r[2]),
          low: Number(r[3]),
          close: Number(r[4]),
          volume: Number(r[5]),
        }))
        .filter(c => isFinite(c.time) && isFinite(c.close))
        .sort((a, b) => a.time - b.time);
      return NextResponse.json({ network, pool, tf, agg, candles, ts: Date.now() });
    }

    if (type === "trending") {
      // DexScreener token boosts → trending meme tokens.
      const j = await cachedJson(`${DEX}/token-boosts/top/v1`, 60_000);
      const arr: any[] = Array.isArray(j) ? j : [];
      const tokens = arr.slice(0, 30).map(t => ({
        chain: t?.chainId ?? null,
        address: t?.tokenAddress ?? null,
        icon: t?.icon ?? null,
        description: t?.description ?? null,
        amount: Number(t?.totalAmount ?? 0) || 0,
        url: t?.url ?? null,
      }));
      return NextResponse.json({ tokens, ts: Date.now() });
    }

    // search
    const q = (searchParams.get("q") ?? "").trim();
    if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });
    const j = await cachedJson(`${DEX}/latest/dex/search?q=${encodeURIComponent(q)}`, 30_000);
    const pairs: any[] = Array.isArray(j?.pairs) ? j.pairs : [];
    const out = pairs
      .map(normPair)
      .filter(p => p.liquidity > 0)
      .sort((a, b) => b.liquidity - a.liquidity)
      .slice(0, 30);
    return NextResponse.json({ pairs: out, ts: Date.now() });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
