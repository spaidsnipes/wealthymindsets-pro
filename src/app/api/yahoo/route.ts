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
  const up = sym.toUpperCase();
  if (YF_MAP[up]) return YF_MAP[up];
  // Precious-metals spot (XAUUSD = gold, XAGUSD = silver, etc.) — Yahoo has no
  // spot FX ticker for these, so map to the nearest continuous futures contract.
  const metal = up.replace("/", "");
  if (metal === "XAUUSD" || metal === "XAU") return "GC=F"; // gold
  if (metal === "XAGUSD" || metal === "XAG") return "SI=F"; // silver
  if (metal === "XPTUSD") return "PL=F"; // platinum
  if (metal === "XPDUSD") return "PA=F"; // palladium
  // Forex pairs: Yahoo uses the "EURUSD=X" format (no slash).
  // Handles "EUR/USD", "GBP/JPY", and also bare 6-letter pairs like "EURUSD".
  if (up.includes("/")) return `${up.replace("/", "")}=X`;
  if (/^(EUR|GBP|USD|JPY|AUD|NZD|CAD|CHF|CNH)(USD|JPY|EUR|GBP|AUD|NZD|CAD|CHF|CNH)$/.test(up)) return `${up}=X`;
  return up;
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
    // Hourly: Yahoo serves up to ~2y of 60-minute bars — pull the full window so
    // the chart scrolls back years instead of stopping at 60 days.
    "1h":  { interval: "60m", range: "730d" },
    "2h":  { interval: "60m", range: "730d" },
    "4h":  { interval: "60m", range: "730d" },
    "D":   { interval: "1d",  range: "5y"   },
    "W":   { interval: "1wk", range: "10y"  },
    "M":   { interval: "1mo", range: "max"  },
    // Long-range bar intervals — Yahoo's coarsest interval is 3mo, so these
    // best-effort to monthly/quarterly bars over the maximum available history.
    "3M":  { interval: "3mo", range: "max"  },
    "6M":  { interval: "3mo", range: "max"  },
    "1Y":  { interval: "1mo", range: "max"  },
    "3Y":  { interval: "1mo", range: "max"  },
    "5Y":  { interval: "1mo", range: "max"  },
  };
  return map[tf] ?? { interval: "1d", range: "5y" };
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
  const bars   = Math.min(3000, parseInt(searchParams.get("bars") ?? "300", 10));

  const yfSym  = toYFSym(rawSym);

  try {
    if (type === "quote") {
      /* ── Current quote — TRUE real-time incl. pre/post-market ──────────────
         meta.regularMarketPrice is STALE outside regular hours (it stays at the
         prior session close, e.g. TSLA 375 while the live pre-market is 369).
         To match TradingView we pull a 1-minute intraday series WITH
         includePrePost=true and use the most recent traded candle as the price.
         The daily meta is still used as a fallback + for prevClose. */
      const dayUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym)}?interval=1d&range=5d`;
      const intraUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym)}?interval=1m&range=1d&includePrePost=true`;

      const [dayJson, intraJson] = await Promise.all([
        yfFetch(dayUrl, 5_000).catch(() => null) as Promise<any>,
        yfFetch(intraUrl, 2_000).catch(() => null) as Promise<any>,   // 2s cache → near-live
      ]);

      const dayRes = dayJson?.chart?.result?.[0];
      const meta   = dayRes?.meta;

      // Most-recent live price from the intraday (pre/post-aware) series.
      let livePrice = 0, liveHigh = 0, liveLow = 0, liveOpen = 0;
      const ir = intraJson?.chart?.result?.[0];
      if (ir?.timestamp?.length) {
        const q = ir.indicators?.quote?.[0] ?? {};
        const cl: (number|null)[] = q.close ?? [];
        const hi: (number|null)[] = q.high  ?? [];
        const lo: (number|null)[] = q.low   ?? [];
        const op: (number|null)[] = q.open  ?? [];
        for (let i = cl.length - 1; i >= 0; i--) {
          if (cl[i] != null && (cl[i] as number) > 0) { livePrice = cl[i] as number; break; }
        }
        const validHi = hi.filter((v): v is number => v != null && v > 0);
        const validLo = lo.filter((v): v is number => v != null && v > 0);
        const firstOp = op.find((v): v is number => v != null && v > 0);
        if (validHi.length) liveHigh = Math.max(...validHi);
        if (validLo.length) liveLow  = Math.min(...validLo);
        if (firstOp) liveOpen = firstOp;
      }

      if (!meta && !livePrice) return NextResponse.json({ error: "No data" }, { status: 404 });

      // Live price preferred; fall back to regular-market meta.
      const price = livePrice || meta?.regularMarketPrice || meta?.previousClose || 0;
      const open  = liveOpen  || meta?.regularMarketOpen   || price;
      const high  = Math.max(liveHigh || 0, meta?.regularMarketDayHigh || 0) || price;
      const low   = (liveLow && meta?.regularMarketDayLow) ? Math.min(liveLow, meta.regularMarketDayLow)
                  : (liveLow || meta?.regularMarketDayLow || price);

      // prevClose from daily closes (yesterday's close), for change vs prior session.
      const closes: (number | null)[] = dayRes?.indicators?.quote?.[0]?.close ?? [];
      const validCloses = closes.filter((c): c is number => c != null && c > 0);
      let prevClose = validCloses.length >= 2
        ? validCloses[validCloses.length - 2]
        : (meta?.chartPreviousClose ?? meta?.previousClose ?? price);
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
      // includePrePost=true returns pre-market (4:00) + after-hours (20:00) bars
      // so the chart can show extended trading hours when the user enables them.
      const ext  = searchParams.get("ext") === "1";
      const url  = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSym)}?interval=${interval}&range=${range}${ext ? "&includePrePost=true" : ""}`;
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
