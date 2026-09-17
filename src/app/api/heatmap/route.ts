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
import { toYahooSymbol } from "@/lib/marketData/symbolAssetClass";
import { newestObservationMs, yahooMarketTimeToMs } from "@/lib/marketData/heatmapObservation";

/**
 * A ROUND OF THIS ROUTE, INCLUDING WHEN THE PROVIDER SAW IT.
 *
 * `observedAt` used to not exist, and /heatmaps therefore wore FEED UNKNOWN
 * over eight real session moves — it had no observation epoch to publish, so
 * the frame's correct default for a silent room rendered as an open question.
 *
 * It travels INSIDE the cached value, not alongside it. A cache hit is still
 * showing the earlier round's observation, so renewing this to "now" on a hit
 * would make a retained figure report itself as freshly seen — the same
 * substitution `receiveTimestamp` is documented below to avoid.
 */
interface HeatmapRound {
  readonly results: Record<string, number>;
  readonly observedAt: number | null;
}

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

const SERVER_CACHE = new Map<string, { data: unknown; ts: number }>();
const SERVER_INFLIGHT = new Map<string, Promise<unknown>>();
async function withCache<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<{ data: T; cacheHit: boolean }> {
  const hit = SERVER_CACHE.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) return { data: hit.data as T, cacheHit: true };

  // A heat-map request can fan out to many chart observations. Reuse the same
  // pending refresh so tab restores, Strict Mode, and timer boundaries do not
  // launch duplicate provider bursts for an identical symbol universe.
  const pending = SERVER_INFLIGHT.get(key) as Promise<T> | undefined;
  if (pending) return { data: await pending, cacheHit: false };

  const refresh = fn();
  SERVER_INFLIGHT.set(key, refresh);
  try {
    const data = await refresh;
    SERVER_CACHE.set(key, { data, ts: Date.now() });
    return { data, cacheHit: false };
  } finally {
    if (SERVER_INFLIGHT.get(key) === refresh) SERVER_INFLIGHT.delete(key);
  }
}

/**
 * Yahoo Finance symbol mapping — MOVED to @/lib/marketData/symbolAssetClass.
 *
 * The table used to live here as a private `YF_MAP`. It was not merely a
 * formatting convenience: it encoded the FACT that "NQ1!" and "NQ=F" are the
 * same contract, and it was the only place in the codebase that knew it.
 * Because it was private, `/api/market` could not consult it, hand-typed its
 * own futures test that recognised one notation and not the other, and told
 * traders asking for NQ=F that the symbol had "No data".
 *
 * A fact that two routes need is not a detail of either one.
 *
 * Behaviour is identical for every symbol the old private map covered. It is
 * additionally correct for six crypto bases the old map omitted (LINK, DOT,
 * LTC, MATIC, UNI, ATOM) — those previously fell through `?? sym` and were sent
 * to Yahoo bare, which is not a symbol Yahoo resolves. That is a widening, not
 * a no-op, and saying "unchanged" would have been the same overclaim this
 * whole atom exists to remove.
 */
function toYF(sym: string) { return toYahooSymbol(sym); }

async function yfGet(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`YF ${res.status}`);
  return res.json();
}

// ── 1D: Yahoo Finance v7 batch quote (single request for all syms) ──────────
async function fetch1D(syms: string[]): Promise<HeatmapRound> {
  const yfSyms = syms.map(toYF);
  // `regularMarketTime` is NEW in this field list, and it is the whole point:
  // the route used to ask for the number and not for when the number was seen,
  // which is why the board above it could only say FEED UNKNOWN.
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yfSyms.join(","))}&fields=symbol,regularMarketChangePercent,regularMarketTime`;
  const json = await yfGet(url) as { quoteResponse?: { result?: { symbol: string; regularMarketChangePercent?: number; regularMarketTime?: number }[] } };
  const quotes = json?.quoteResponse?.result ?? [];
  const results: Record<string, number> = {};
  const seen: (number | null)[] = [];
  quotes.forEach(q => {
    const wmSym = syms.find(s => toYF(s) === q.symbol) ?? q.symbol;
    const pct = q.regularMarketChangePercent;
    if (typeof pct === "number") {
      results[wmSym] = +pct.toFixed(2);
      // Collected only for a tile that actually rendered. An observation
      // attached to a symbol whose percentage was discarded would date a
      // figure nobody can see.
      seen.push(yahooMarketTimeToMs(q.regularMarketTime));
    }
  });
  return { results, observedAt: newestObservationMs(seen) };
}

// ── Multi-day: fetch daily chart for one sym, return pct change over daysBack ─
async function fetchDayOffset(
  sym: string,
  daysBack: number,
): Promise<{ pct: number; observedAt: number | null } | null> {
  const yfSym = toYF(sym);
  const range = daysBack <= 10 ? "1mo" : daysBack <= 70 ? "3mo" : daysBack <= 140 ? "6mo"
              : daysBack <= 260 ? "2y" : "5y";
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym)}?interval=1d&range=${range}`;
  try {
    const json = await yfGet(url) as { chart?: { result?: { meta?: { regularMarketPrice?: number; regularMarketTime?: number }; indicators?: { quote?: { close?: (number | null)[] }[] } }[] } };
    const result = json?.chart?.result?.[0];
    const meta = result?.meta;
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    const valid = closes.filter((c): c is number => c != null && c > 0);
    if (valid.length < 2) return null;
    const now  = meta?.regularMarketPrice ?? valid[valid.length - 1];
    const idx  = Math.max(0, valid.length - 1 - daysBack);
    const prev = valid[idx];
    if (!prev || !now) return null;
    return {
      pct: +((( now - prev) / prev) * 100).toFixed(2),
      observedAt: yahooMarketTimeToMs(meta?.regularMarketTime),
    };
  } catch { return null; }
}

// ── Multi-day: parallel fetch in chunks (Yahoo is lenient, no API key needed) ─
async function fetchMultiDay(syms: string[], daysBack: number): Promise<HeatmapRound> {
  const results: Record<string, number> = {};
  const seen: (number | null)[] = [];
  const CHUNK = 50; // higher parallelism — Yahoo tolerates it; halves first-load latency
  for (let i = 0; i < syms.length; i += CHUNK) {
    const batch = syms.slice(i, i + CHUNK);
    const vals  = await Promise.all(batch.map(s => fetchDayOffset(s, daysBack)));
    batch.forEach((s, j) => {
      const v = vals[j];
      if (v == null) return;
      results[s] = v.pct;
      seen.push(v.observedAt);
    });
    if (i + CHUNK < syms.length) await new Promise(r => setTimeout(r, 20));
  }
  return { results, observedAt: newestObservationMs(seen) };
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
    case "5Y":  return 1260;
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
  // Include the complete requested universe. First-five-plus-count aliases
  // different watchlists and can return a valid-looking snapshot for the
  // wrong symbols.
  const cacheKey = `heatmap:${period}:${syms.join(",")}`;

  try {
    const { data: round, cacheHit } = await withCache<HeatmapRound>(cacheKey, ttl, async () => {
      // 1D primary path: Yahoo's v7 batch quote endpoint now returns
      // "Unauthorized", which silently produced all +0.00% tiles. Fall back to
      // the still-working v8 chart endpoint (prev close → current) when v7 is
      // empty so 1D actually shows real performance.
      if (period === "1D") {
        let r: HeatmapRound = { results: {}, observedAt: null };
        try { r = await fetch1D(syms); } catch { r = { results: {}, observedAt: null }; }
        if (Object.keys(r.results).length === 0) {
          r = await fetchMultiDay(syms, 1);
        }
        return r;
      }
      return fetchMultiDay(syms, daysForPeriod(period));
    });
    const results = round.results;
    const hasResults = Object.keys(results).length > 0;
    const qualityState = !hasResults ? "UNKNOWN" : cacheHit ? "DEGRADED" : period === "1D" ? "UNKNOWN" : "HISTORICAL";
    const fidelityReason = !hasResults
      ? "No market observations returned."
      : cacheHit
        ? "Retained server snapshot; current provider refresh was not performed."
      : period === "1D"
        ? "Source response received; delivery freshness and entitlement are not established."
        : "Calculated from historical daily closes.";
    return NextResponse.json({
      period,
      results,
      qualityState,
      fidelityReason,
      cacheHit,
      // Receipt chronology only. This is not a provider event timestamp and
      // must never be used to claim market-observation freshness.
      receiveTimestamp: new Date().toISOString(),
      // THE PROVIDER'S OWN `regularMarketTime`, in epoch-ms, or null.
      //
      // This is the field `receiveTimestamp` has always disclaimed being, and
      // its absence is why /heatmaps wore FEED UNKNOWN over eight real session
      // moves. Null is a real answer here — Yahoo may omit the field, and the
      // honest reading of that is an open question, not a receipt promoted to
      // an observation. On a cache hit it is the EARLIER round's epoch,
      // because that is the round still on screen.
      observedAt: round.observedAt,
      sourceProvenance: "yahoo-finance-proxy",
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
