/**
 * /api/alpaca — Server-side Alpaca Market Data proxy
 * Handles CORS. Keys are never exposed to the browser.
 *
 * GET /api/alpaca?sym=TSLA&type=quote        → latest quote  (stocks: requires key)
 * GET /api/alpaca?sym=BTC&type=quote         → latest quote  (crypto: NO key required)
 * GET /api/alpaca?sym=TSLA&type=candles&tf=1m&bars=300 → OHLCV bars
 * GET /api/alpaca?sym=BTC&type=candles&tf=1m&bars=300  → crypto bars (NO key required)
 *
 * Crypto data is FREE with no authentication on Alpaca.
 * Stock/ETF data requires an Alpaca API key (free paper trading account).
 * Futures: NOT supported — caller falls back to Yahoo.
 */

import { NextResponse } from "next/server";

const ALPACA_KEY    = process.env.ALPACA_KEY    ?? process.env.NEXT_PUBLIC_ALPACA_KEY    ?? "";
const ALPACA_SECRET = process.env.ALPACA_SECRET ?? process.env.NEXT_PUBLIC_ALPACA_SECRET ?? "";

const DATA_BASE = "https://data.alpaca.markets";

// Auth headers — only included when keys are present
function getHeaders(requireAuth = false): Record<string, string> {
  const h: Record<string, string> = { "Accept": "application/json" };
  if (ALPACA_KEY && ALPACA_SECRET) {
    h["APCA-API-KEY-ID"]     = ALPACA_KEY;
    h["APCA-API-SECRET-KEY"] = ALPACA_SECRET;
  } else if (requireAuth) {
    throw new Error("Alpaca API keys not configured — add ALPACA_KEY and ALPACA_SECRET to .env.local");
  }
  return h;
}

const CACHE = new Map<string, { data: unknown; ts: number }>();

async function alpacaFetch(url: string, ttlMs = 5_000, requireAuth = false): Promise<unknown> {
  const cached = CACHE.get(url);
  if (cached && Date.now() - cached.ts < ttlMs) return cached.data;
  const res = await fetch(url, { headers: getHeaders(requireAuth), cache: "no-store" });
  if (!res.ok) throw new Error(`Alpaca HTTP ${res.status}`);
  const data = await res.json();
  CACHE.set(url, { data, ts: Date.now() });
  return data;
}

// Alpaca timeframe strings
function toAlpacaTF(tf: string): { timeframe: string; daysBack: number } {
  const map: Record<string, { timeframe: string; daysBack: number }> = {
    "1m":  { timeframe: "1Min",  daysBack: 2   },
    "2m":  { timeframe: "2Min",  daysBack: 5   },
    "3m":  { timeframe: "3Min",  daysBack: 5   },
    "5m":  { timeframe: "5Min",  daysBack: 5   },
    "10m": { timeframe: "10Min", daysBack: 10  },
    "15m": { timeframe: "15Min", daysBack: 30  },
    "30m": { timeframe: "30Min", daysBack: 60  },
    "1h":  { timeframe: "1Hour", daysBack: 90  },
    "2h":  { timeframe: "2Hour", daysBack: 120 },
    "4h":  { timeframe: "4Hour", daysBack: 180 },
    "D":   { timeframe: "1Day",  daysBack: 2000 },
    "W":   { timeframe: "1Week", daysBack: 3650 },
    // Monthly & multi-month/year period selectors → monthly candles spanning
    // years. Alpaca's largest bucket is 1Month; without these entries they fell
    // through to the "1Min" default, which is why Monthly showed minute bars.
    "M":   { timeframe: "1Month", daysBack: 5475 },   // ~15y
    "3M":  { timeframe: "1Month", daysBack: 7300 },
    "6M":  { timeframe: "1Month", daysBack: 7300 },
    "1Y":  { timeframe: "1Month", daysBack: 7300 },
    "3Y":  { timeframe: "1Month", daysBack: 7300 },
    "5Y":  { timeframe: "1Month", daysBack: 7300 },
  };
  return map[tf] ?? { timeframe: "1Day", daysBack: 2000 };
}

const CRYPTO_SYMS = new Set(["BTC","ETH","SOL","BNB","XRP","DOGE","ADA","AVAX","LINK","DOT","LTC","MATIC","UNI","ATOM"]);

function isCryptoSym(sym: string) { return CRYPTO_SYMS.has(sym.toUpperCase()); }
function isFuturesSym(sym: string) { return sym.endsWith("1!") || sym.includes("=F"); }

// Alpaca crypto symbols use "BTC/USD" format
function toCryptoSym(sym: string): string {
  const up = sym.replace(/[/-]USD$/i, "").toUpperCase();
  return `${up}/USD`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawSym = (searchParams.get("sym") ?? "").toUpperCase();
  const type   = searchParams.get("type") ?? "quote";
  const tf     = searchParams.get("tf") ?? "1m";
  // Cap raised to 5000 so Daily/Weekly/Monthly can return multi-year history
  // (500 capped Daily to <2y — the user could never see their full 5 years).
  const bars   = Math.min(5000, parseInt(searchParams.get("bars") ?? "300", 10));

  // Futures → not supported
  if (rawSym && isFuturesSym(rawSym)) {
    return NextResponse.json({ error: "Futures not supported by Alpaca — use /api/yahoo" }, { status: 404 });
  }

  const crypto  = isCryptoSym(rawSym);
  const needKey = !crypto; // stocks require key; crypto is free

  try {
    /* ── Latest quote ──────────────────────────────────────── */
    if (type === "quote") {
      if (!rawSym) return NextResponse.json({ error: "sym required" }, { status: 400 });

      let price = 0, open = 0, high = 0, low = 0, prevClose = 0, volume = 0;

      if (crypto) {
        // Crypto bars — no key needed
        const cryptoSym = toCryptoSym(rawSym);
        const now  = new Date().toISOString();
        const from = new Date(Date.now() - 2 * 86_400_000).toISOString();
        const url  = `${DATA_BASE}/v1beta3/crypto/us/bars?symbols=${encodeURIComponent(cryptoSym)}&timeframe=1Day&start=${from}&end=${now}&limit=2`;
        const json = await alpacaFetch(url, 5_000, false) as any;
        const barsArr: any[] = json?.bars?.[cryptoSym] ?? [];
        if (barsArr.length > 0) {
          const last = barsArr[barsArr.length - 1];
          const prev2 = barsArr.length > 1 ? barsArr[barsArr.length - 2] : null;
          price     = last.c;
          open      = last.o;
          high      = last.h;
          low       = last.l;
          volume    = last.v;
          prevClose = prev2 ? prev2.c : last.o;
        }
      } else {
        // Stocks/ETFs — requires key
        if (!ALPACA_KEY || !ALPACA_SECRET) {
          return NextResponse.json({ error: "Alpaca keys not set" }, { status: 503 });
        }
        const snapshotUrl = `${DATA_BASE}/v2/stocks/${encodeURIComponent(rawSym)}/snapshot?feed=iex`;
        const json = await alpacaFetch(snapshotUrl, 3_000, true) as any;
        price     = json?.latestTrade?.p  ?? json?.minuteBar?.c ?? 0;
        open      = json?.dailyBar?.o     ?? 0;
        high      = json?.dailyBar?.h     ?? price;
        low       = json?.dailyBar?.l     ?? price;
        volume    = json?.dailyBar?.v     ?? 0;
        prevClose = json?.prevDailyBar?.c ?? price;

        // STALENESS GUARD: Alpaca's free IEX feed does NOT receive pre/post-market
        // trades, so outside regular hours its "latestTrade" is stuck on the prior
        // session close (e.g. TSLA 375 while the live pre-market is 369). When the
        // last trade is older than ~3 min, treat Alpaca as stale and 404 so the
        // caller falls through to Yahoo (which includes pre/post-market prices).
        const tradeTs = json?.latestTrade?.t ? Date.parse(json.latestTrade.t) : 0;
        if (tradeTs && Date.now() - tradeTs > 3 * 60_000) {
          return NextResponse.json({ error: "Alpaca quote stale (extended hours) — use Yahoo", stale: true }, { status: 404 });
        }
      }

      if (!price) return NextResponse.json({ error: "No data from Alpaca" }, { status: 404 });

      return NextResponse.json({
        sym:       rawSym,
        price,
        open,
        high,
        low,
        prevClose,
        volume,
        change:    +(price - prevClose).toFixed(4),
        changePct: prevClose ? +(((price - prevClose) / prevClose) * 100).toFixed(4) : 0,
        ts:        Date.now(),
        source:    "alpaca",
      });
    }

    /* ── Historical candles ─────────────────────────────────── */
    if (type === "candles") {
      if (!rawSym) return NextResponse.json({ candles: [] });
      const { timeframe, daysBack } = toAlpacaTF(tf);
      const end   = new Date().toISOString();
      const start = new Date(Date.now() - daysBack * 86_400_000).toISOString();

      let rawBars: any[] = [];

      if (crypto) {
        // Crypto: MUST use sort=desc then reverse — with sort=asc+limit Alpaca
        // returns the OLDEST bars in the window and hits the limit before
        // reaching the present, so intraday history ends hours/days ago while
        // the live bar sits at "now" → a huge empty gap in the middle of the
        // chart. sort=desc grabs the MOST RECENT `limit` bars (reaching today),
        // then we reverse to chronological order — identical to the stocks path.
        const cryptoSym = toCryptoSym(rawSym);
        const url = `${DATA_BASE}/v1beta3/crypto/us/bars?symbols=${encodeURIComponent(cryptoSym)}&timeframe=${timeframe}&start=${start}&end=${end}&limit=${bars}&sort=desc`;
        const json = await alpacaFetch(url, 20_000, false) as any;
        rawBars = (json?.bars?.[cryptoSym] ?? []).slice().reverse();
      } else {
        if (!ALPACA_KEY || !ALPACA_SECRET) {
          return NextResponse.json({ candles: [], error: "Alpaca keys not set" }, { status: 503 });
        }
        // Use sort=desc to get MOST RECENT bars first (avoids hitting limit before reaching today)
        // Then reverse to get chronological order for the chart
        const url = `${DATA_BASE}/v2/stocks/${encodeURIComponent(rawSym)}/bars?timeframe=${timeframe}&start=${start}&end=${end}&limit=${bars}&feed=iex&adjustment=raw&sort=desc`;
        const json = await alpacaFetch(url, 20_000, true) as any;
        rawBars = (json?.bars ?? []).reverse(); // reverse to chronological order
      }

      const candles = rawBars.map((b: any) => ({
        time:   Math.floor(new Date(b.t).getTime() / 1000),
        open:   b.o,
        high:   b.h,
        low:    b.l,
        close:  b.c,
        volume: b.v ?? 0,
      }));

      return NextResponse.json({ sym: rawSym, tf, candles, source: "alpaca" });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });

  } catch (err: unknown) {
    const msg = String(err);
    const status = msg.includes("not configured") || msg.includes("not set") ? 503 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
