/**
 * /api/polymarket — Server-side Polymarket proxy (public, no auth needed).
 *
 * GET /api/polymarket?type=markets&q=election&limit=20
 *     → list of active markets (question, outcomes, current odds, volume)
 * GET /api/polymarket?type=history&token=<clobTokenId>&interval=1d
 *     → outcome price-history time series (chartable as a line series)
 *
 * Gamma + CLOB read endpoints are fully public/free. We proxy them to dodge CORS
 * and normalise the shape for the chart layer.
 */

import { NextResponse } from "next/server";

const GAMMA = "https://gamma-api.polymarket.com";
const CLOB  = "https://clob.polymarket.com";

const CACHE = new Map<string, { data: unknown; ts: number }>();
async function cachedJson(url: string, ttlMs: number): Promise<any> {
  const hit = CACHE.get(url);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data;
  const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  CACHE.set(url, { data, ts: Date.now() });
  return data;
}

function safeParse(v: unknown): any {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") { try { return JSON.parse(v); } catch { return []; } }
  return [];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "markets";

  try {
    if (type === "history") {
      const token = searchParams.get("token");
      if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });
      const interval = searchParams.get("interval") ?? "1d"; // 1m,1h,6h,1d,1w,max
      const url = `${CLOB}/prices-history?market=${encodeURIComponent(token)}&interval=${encodeURIComponent(interval)}&fidelity=60`;
      const j = await cachedJson(url, 60_000);
      const pts: any[] = Array.isArray(j?.history) ? j.history : [];
      const series = pts
        .map(p => ({ time: Number(p.t), value: Number(p.p) }))
        .filter(p => isFinite(p.time) && isFinite(p.value));
      return NextResponse.json({ token, interval, series, ts: Date.now() });
    }

    // markets list
    const q = (searchParams.get("q") ?? "").trim();
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "24", 10));
    const url = `${GAMMA}/markets?active=true&closed=false&archived=false&order=volume24hr&ascending=false&limit=${limit}${q ? `&search=${encodeURIComponent(q)}` : ""}`;
    const j = await cachedJson(url, 30_000);
    const rows: any[] = Array.isArray(j) ? j : (Array.isArray(j?.data) ? j.data : []);
    const markets = rows.map(m => {
      const outcomes = safeParse(m.outcomes);
      const prices = safeParse(m.outcomePrices).map((p: any) => Number(p));
      const tokenIds = safeParse(m.clobTokenIds);
      return {
        id: m.id,
        slug: m.slug,
        question: m.question,
        volume24hr: Number(m.volume24hr ?? 0),
        liquidity: Number(m.liquidity ?? 0),
        endDate: m.endDate,
        outcomes: outcomes.map((label: string, i: number) => ({
          label,
          price: isFinite(prices[i]) ? prices[i] : null,
          token: tokenIds[i] ?? null,
        })),
      };
    });
    return NextResponse.json({ markets, ts: Date.now() });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
