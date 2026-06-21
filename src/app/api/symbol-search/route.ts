/**
 * /api/symbol-search — Polygon.io ticker search
 * Covers stocks, ETFs, forex, crypto, indices, commodities, futures, meme coins.
 *
 * GET /api/symbol-search?q=bitcoin
 * GET /api/symbol-search?q=BTC&type=crypto
 */

import { NextResponse } from "next/server";

const POLYGON_KEY = process.env.NEXT_PUBLIC_POLYGON_KEY ?? "";

const CACHE = new Map<string, { data: unknown; ts: number }>();
const TTL_MS = 30_000; // 30s cache

async function polyFetch(url: string): Promise<unknown> {
  const cached = CACHE.get(url);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.data;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Polygon ${res.status}`);
  const data = await res.json();
  CACHE.set(url, { data, ts: Date.now() });
  return data;
}

type PolyTicker = {
  ticker: string;
  name: string;
  market: string;
  type: string;
  currency_name?: string;
  primary_exchange?: string;
};

function marketToCategory(market: string, type: string): string {
  const m = market.toLowerCase();
  const t = type.toLowerCase();
  if (m === "crypto" || t === "crypto") return "Crypto";
  if (m === "fx" || t === "fx" || t === "forex") return "Forex";
  if (t === "etf") return "ETF";
  if (t === "index" || t === "indices") return "Index";
  if (t === "fund" || t === "mutual_fund") return "Fund";
  if (m === "stocks" || t === "cs" || t === "common_stock" || t === "adrc") return "Stock";
  return "Stock";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ results: [] });

  if (!POLYGON_KEY) {
    return NextResponse.json({ error: "Polygon API key not configured" }, { status: 500 });
  }

  try {
    // Search across all markets
    const url = `https://api.polygon.io/v3/reference/tickers?search=${encodeURIComponent(q)}&active=true&limit=20&apiKey=${POLYGON_KEY}`;
    const json = await polyFetch(url) as { results?: PolyTicker[]; error?: string };

    if (json.error) {
      return NextResponse.json({ error: json.error }, { status: 400 });
    }

    const results = (json.results ?? []).map((r: PolyTicker) => ({
      sym:      r.ticker,
      label:    r.name,
      cat:      marketToCategory(r.market, r.type),
      exchange: r.primary_exchange ?? r.market ?? "",
    }));

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
