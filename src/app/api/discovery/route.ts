/**
 * /api/discovery — DISCOVERY · UNUSUAL STATES (F14) for a symbol universe.
 *
 * GET /api/discovery?syms=AAPL,MSFT,…
 *
 * Per symbol: the provider's daily bars (3 months) and its 52-week range,
 * measured into five states by discoveryStates.measureStates, then ranked
 * across the universe by rankDiscovery. The answer carries the provider's own
 * newest observation time (not receipt time) and how many symbols answered.
 * A symbol the provider does not answer is COUNTED as missing, never zeroed.
 */

import { NextResponse } from "next/server";

import { toYahooSymbol } from "@/lib/marketData/symbolAssetClass";
import { newestObservationMs, yahooMarketTimeToMs } from "@/lib/marketData/heatmapObservation";
import { DISCOVERY_VERSION, measureStates, rankDiscovery, type DailyBar, type StateValues } from "@/lib/marketData/discoveryStates";
import { requireAuth } from "@/lib/requireAuth";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
const TTL_MS = 5 * 60_000;
const MAX_SYMS = 250;
const CACHE = new Map<string, { at: number; body: unknown }>();

interface V8 {
  chart?: {
    result?: {
      meta?: { regularMarketTime?: number; fiftyTwoWeekHigh?: number; fiftyTwoWeekLow?: number };
      timestamp?: number[];
      indicators?: { quote?: { open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[]; volume?: (number | null)[] }[] };
    }[];
  };
}

async function measureOne(sym: string): Promise<{ values: StateValues; observedAt: number | null } | null> {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(toYahooSymbol(sym))}?interval=1d&range=3mo`, {
      headers: { "User-Agent": UA },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const r = ((await res.json()) as V8).chart?.result?.[0];
    const q = r?.indicators?.quote?.[0];
    const ts = r?.timestamp ?? [];
    if (!q || ts.length === 0) return null;
    const bars: DailyBar[] = [];
    ts.forEach((_t, i) => {
      const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i], v = q.volume?.[i];
      if ([o, h, l, c, v].every(x => typeof x === "number")) bars.push({ open: o!, high: h!, low: l!, close: c!, volume: v! });
    });
    const values = measureStates(bars, { high: r?.meta?.fiftyTwoWeekHigh ?? null, low: r?.meta?.fiftyTwoWeekLow ?? null });
    return { values, observedAt: yahooMarketTimeToMs(r?.meta?.regularMarketTime) };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  // Signed-in only (security pass 2026-10-05): one anonymous request fanned out
  // to 250 Yahoo fetches from our Worker IP, and a reordered list missed the
  // cache — enough to get the IP throttled, which also starves /api/yahoo.
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const syms = [...new Set((new URL(request.url).searchParams.get("syms") ?? "")
    .split(",").map(s => s.trim().toUpperCase()).filter(s => /^[A-Z0-9.\-=!^]{1,12}$/.test(s)))].slice(0, MAX_SYMS);
  if (syms.length === 0) return NextResponse.json({ error: "syms required" }, { status: 400 });
  const key = [...syms].sort().join(",");
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return NextResponse.json({ ...(hit.body as object), retained: true });

  const measured: { symbol: string; values: StateValues }[] = [];
  const seen: (number | null)[] = [];
  const missing: string[] = [];
  const CHUNK = 40;
  for (let i = 0; i < syms.length; i += CHUNK) {
    const batch = syms.slice(i, i + CHUNK);
    const out = await Promise.all(batch.map(measureOne));
    batch.forEach((s, j) => {
      const m = out[j];
      if (!m || Object.values(m.values).every(v => v == null)) { missing.push(s); return; }
      measured.push({ symbol: s, values: m.values });
      seen.push(m.observedAt);
    });
  }
  const body = {
    version: DISCOVERY_VERSION,
    rows: rankDiscovery(measured),
    observedAt: newestObservationMs(seen),
    asked: syms.length,
    answered: measured.length,
    missing,
    basis: "PROVIDER_DAILY_BARS",
  };
  CACHE.set(key, { at: Date.now(), body });
  return NextResponse.json({ ...body, retained: false });
}
