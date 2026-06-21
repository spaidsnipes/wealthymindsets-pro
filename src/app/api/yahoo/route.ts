/**
 * /api/yahoo — Server-side Yahoo Finance proxy
 * Handles CORS by running server-side. No API key needed.
 *
 * GET /api/yahoo?sym=NQ1!&type=quote   → current price + day OHLC
 * GET /api/yahoo?sym=NQ1!&type=candles&tf=1m&bars=300 → OHLCV array
 */

import { NextResponse } from "next/server";

/* ── Symbol mapping: WM internal → Yahoo Finance ticker ─────── */
const YF_MAP: Record<string, string> = {
  // Futures
  "NQ1!":  "NQ=F",   "MNQ1!": "MNQ=F",
  "ES1!":  "ES=F",   "MES1!": "MES=F",
  "YM1!":  "YM=F",   "MYM1!": "MYM=F",
  "RTY1!": "RTY=F",  "M2K1!": "M2K=F",
  "GC1!":  "GC=F",   "MGC1!": "MGC=F",
  "SI1!":  "SI=F",
  "CL1!":  "CL=F",   "MCL1!": "MCL=F",
  "NG1!":  "NG=F",
  "HG1!":  "HG=F",
  "ZB1!":  "ZB=F",
  "ZN1!":  "ZN=F",
  "ZF1!":  "ZF=F",
  "ZT1!":  "ZT=F",
  "ZC1!":  "ZC=F",
  "ZW1!":  "ZW=F",
  "ZS1!":  "ZS=F",
  "LE1!":  "LE=F",
  "VX1!":  "^VIX",
  // Crypto (Yahoo uses -USD suffix) — also accept common aliases like BTCUSD
  "BTC":    "BTC-USD",  "BTCUSD":  "BTC-USD",
  "ETH":    "ETH-USD",  "ETHUSD":  "ETH-USD",
  "SOL":    "SOL-USD",  "SOLUSD":  "SOL-USD",
  "BNB":   "BNB-USD",
  "XRP":   "XRP-USD",
  "DOGE":  "DOGE-USD",
  "ADA":   "ADA-USD",
  "AVAX":  "AVAX-USD",
  "LINK":  "LINK-USD",
  "DOT":   "DOT-USD",
  "MATIC": "MATIC-USD",
  "LTC":   "LTC-USD",
  "ATOM":  "ATOM-USD",
  "UNI":   "UNI-USD",
};

function toYFSym(sym: string): string {
  return YF_MAP[sym.toUpperCase()] ?? sym.toUpperCase();
}

/* ── Interval mapping ──────────────────────────────────────── */
function toYFInterval(tf: string): { interval: string; range: string } {
  const map: Record<string, { interval: string; range: string }> = {
    "1m":  { interval: "1m",  range: "1d"  },
    "2m":  { interval: "2m",  range: "5d"  },
    "3m":  { interval: "5m",  range: "5d"  },   // YF has no 3m
    "5m":  { interval: "5m",  range: "5d"  },
    "10m": { interval: "15m", range: "5d"  },   // YF has no 10m
    "15m": { interval: "15m", range: "60d" },
    "30m": { interval: "30m", range: "60d" },
    "1h":  { interval: "60m", range: "60d" },
    "2h":  { interval: "60m", range: "60d" },
    "4h":  { interval: "60m", range: "60d" },
    "D":   { interval: "1d",  range: "2y"  },
    "W":   { interval: "1wk", range: "5y"  },
  };
  return map[tf] ?? { interval: "1m", range: "1d" };
}

const CACHE = new Map<string, { data: unknown; ts: number }>();

async function yfFetch(url: string, ttlMs = 10_000): Promise<unknown> {
  const cached = CACHE.get(url);
  if (cached && Date.now() - cached.ts < ttlMs) return cached.data;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Accept": "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
  const data = await res.json();
  CACHE.set(url, { data, ts: Date.now() });
  return data;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawSym = (searchParams.get("sym") ?? "NQ1!").toUpperCase();
  const type   = searchParams.get("type") ?? "quote";   // "quote" | "candles"
  const tf     = searchParams.get("tf")   ?? "1m";
  const bars   = Math.min(500, parseInt(searchParams.get("bars") ?? "300", 10));

  const yfSym  = toYFSym(rawSym);

  try {
    if (type === "quote") {
      /* ── Current quote ──────────────────────────────────── */
      // Use 5d/1d range to guarantee ≥2 daily bars so we can derive prevClose for futures
      const url  = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym)}?interval=1d&range=5d`;
      const json = await yfFetch(url, 8_000) as any;
      const result = json?.chart?.result?.[0];
      const meta   = result?.meta;
      if (!meta) return NextResponse.json({ error: "No data" }, { status: 404 });

      const price = meta.regularMarketPrice ?? meta.previousClose ?? 0;
      const open  = meta.regularMarketOpen  ?? price;
      const high  = meta.regularMarketDayHigh ?? price;
      const low   = meta.regularMarketDayLow  ?? price;

      // ALWAYS derive prevClose from the actual daily candle closes — more reliable
      // than meta.previousClose which can be stale or split-adjusted incorrectly.
      const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close ?? [];
      const validCloses = closes.filter((c): c is number => c != null && c > 0);
      // Last close in the array is today's partial (intraday), second-to-last is yesterday's close
      let prevClose = validCloses.length >= 2
        ? validCloses[validCloses.length - 2]
        : (meta.chartPreviousClose ?? meta.previousClose ?? price);
      if (!prevClose || prevClose <= 0) prevClose = price;

      return NextResponse.json({
        sym:       rawSym,
        price,
        open,
        high,
        low,
        prevClose,
        change:    +(price - prevClose).toFixed(4),
        changePct: prevClose ? +(((price - prevClose) / prevClose) * 100).toFixed(4) : 0,
        ts:        Date.now(),
      });
    }

    if (type === "candles") {
      /* ── OHLCV candle array ──────────────────────────────── */
      const { interval, range } = toYFInterval(tf);
      const url  = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym)}?interval=${interval}&range=${range}`;
      const json = await yfFetch(url, 30_000) as any;
      const result = json?.chart?.result?.[0];
      if (!result) return NextResponse.json({ candles: [] });

      const timestamps: number[] = result.timestamp ?? [];
      const q = result.indicators?.quote?.[0] ?? {};
      const opens  = q.open   as (number|null)[];
      const highs  = q.high   as (number|null)[];
      const lows   = q.low    as (number|null)[];
      const closes = q.close  as (number|null)[];
      const vols   = q.volume as (number|null)[];

      // Take last `bars` candles, skip nulls
      const start = Math.max(0, timestamps.length - bars);
      const candles = [];
      for (let i = start; i < timestamps.length; i++) {
        const o = opens?.[i], h = highs?.[i], l = lows?.[i], c = closes?.[i];
        if (o == null || c == null) continue;
        candles.push({
          time:   timestamps[i],
          open:   o,
          high:   h ?? Math.max(o, c),
          low:    l ?? Math.min(o, c),
          close:  c,
          volume: vols?.[i] ?? 0,
        });
      }

      return NextResponse.json({ sym: rawSym, tf, candles });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });

  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
