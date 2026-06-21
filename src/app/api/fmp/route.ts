/**
 * /api/fmp — Server-side Financial Modeling Prep proxy
 * Keeps FMP key off the client bundle.
 *
 * GET /api/fmp?path=/v3/profile/AAPL
 * GET /api/fmp?path=/v3/options/AAPL
 * GET /api/fmp?path=/v3/income-statement/AAPL&limit=5
 * GET /api/fmp?path=/v3/ratios-ttm/AAPL
 * GET /api/fmp?path=/v3/key-metrics-ttm/AAPL
 */

import { NextResponse } from "next/server";

const FMP_KEY = process.env.NEXT_PUBLIC_FMP_KEY ?? "";
const FMP_BASE = "https://financialmodelingprep.com";

const CACHE = new Map<string, { data: unknown; ts: number }>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path") ?? "";
  const extra = searchParams.get("limit") ? `&limit=${searchParams.get("limit")}` : "";

  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });
  if (!FMP_KEY) return NextResponse.json({ error: "FMP_KEY not configured" }, { status: 503 });

  const cacheKey = path + extra;
  const ttl = path.includes("/options/") ? 60_000 : path.includes("/profile/") ? 300_000 : 300_000;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < ttl) {
    return NextResponse.json(cached.data);
  }

  try {
    const sep = path.includes("?") ? "&" : "?";
    const url = `${FMP_BASE}${path}${sep}apikey=${FMP_KEY}${extra}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: `FMP HTTP ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    CACHE.set(cacheKey, { data, ts: Date.now() });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
