/**
 * /api/sentiment — Server-side market-sentiment proxy (CORS-free, no API key).
 *
 * GET /api/sentiment?type=stocks  → CNN Fear & Greed (0–100) + components + history
 * GET /api/sentiment?type=crypto  → alternative.me Crypto Fear & Greed + history
 *
 * Both upstreams are free and keyless. We proxy them server-side to dodge CORS
 * and normalise the shape so the chart layer consumes one format.
 */

import { NextResponse } from "next/server";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

interface SentPoint { time: number; value: number; label?: string; }

const CACHE = new Map<string, { data: unknown; ts: number }>();
async function cachedJson(url: string, ttlMs: number, headers: Record<string, string> = {}): Promise<any> {
  const hit = CACHE.get(url);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json", ...headers }, cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  CACHE.set(url, { data, ts: Date.now() });
  return data;
}

function classify(v: number): string {
  if (v <= 24) return "Extreme Fear";
  if (v <= 44) return "Fear";
  if (v <= 55) return "Neutral";
  if (v <= 74) return "Greed";
  return "Extreme Greed";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "stocks";

  try {
    if (type === "crypto") {
      // alternative.me Crypto Fear & Greed — 90-day history, free, keyless.
      const j = await cachedJson("https://api.alternative.me/fng/?limit=90&format=json", 5 * 60_000);
      const arr: any[] = Array.isArray(j?.data) ? j.data : [];
      const history: SentPoint[] = arr
        .map(d => ({ time: Number(d.timestamp), value: Number(d.value), label: d.value_classification }))
        .filter(p => isFinite(p.time) && isFinite(p.value))
        .sort((a, b) => a.time - b.time);
      const latest = history[history.length - 1];
      return NextResponse.json({
        source: "alternative.me",
        type: "crypto",
        score: latest?.value ?? 0,
        rating: latest?.label ?? classify(latest?.value ?? 0),
        history,
        ts: Date.now(),
      });
    }

    // CNN Fear & Greed — stocks. Undocumented but stable JSON viz endpoint.
    const j = await cachedJson(
      "https://production.dataviz.cnn.io/index/fearandgreed/graphdata",
      5 * 60_000,
      { Origin: "https://www.cnn.com", Referer: "https://www.cnn.com/markets/fear-and-greed" },
    );
    const fg = j?.fear_and_greed ?? {};
    const score = Math.round(Number(fg?.score ?? 0));
    const hist: any[] = Array.isArray(j?.fear_and_greed_historical?.data) ? j.fear_and_greed_historical.data : [];
    const history: SentPoint[] = hist
      .map(d => ({ time: Math.floor(Number(d.x) / 1000), value: Number(d.y) }))
      .filter(p => isFinite(p.time) && isFinite(p.value));
    // Component sub-indicators (momentum, put/call, VIX, junk bond, etc.)
    const components: Record<string, { score: number; rating: string }> = {};
    for (const k of ["market_momentum_sp500", "stock_price_strength", "stock_price_breadth", "put_call_options", "market_volatility_vix", "junk_bond_demand", "safe_haven_demand"]) {
      const c = j?.[k];
      if (c) components[k] = { score: Math.round(Number(c.score ?? 0)), rating: c.rating ?? classify(Number(c.score ?? 0)) };
    }
    return NextResponse.json({
      source: "CNN",
      type: "stocks",
      score,
      rating: fg?.rating ?? classify(score),
      components,
      history,
      ts: Date.now(),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
