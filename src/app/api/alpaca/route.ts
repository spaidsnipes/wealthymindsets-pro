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
import {
  parseRetryAfterMs,
  ProviderHttpError,
  ProviderRequestGovernor,
  type GovernedResult,
} from "@/lib/marketData/providerRequestGovernor";

// WM-ENV-P1-02: server-only. NEXT_PUBLIC_* prefix on a broker-secret env var
// invites a future client-side read that would leak the key into the browser
// bundle — the exact failure mode WM-SEC-P0-03 just closed for Finnhub.
// After confirming ALPACA_KEY / ALPACA_SECRET are set server-side in Vercel,
// the NEXT_PUBLIC_ALPACA_KEY / NEXT_PUBLIC_ALPACA_SECRET vars can be deleted.
const ALPACA_KEY    = process.env.ALPACA_KEY    ?? "";
const ALPACA_SECRET = process.env.ALPACA_SECRET ?? "";

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

const REQUEST_GOVERNOR = new ProviderRequestGovernor();

async function alpacaFetch(
  semanticKey: string,
  url: string,
  ttlMs = 5_000,
  requireAuth = false,
): Promise<GovernedResult<unknown>> {
  return REQUEST_GOVERNOR.execute({
    key: semanticKey,
    ttlMs,
    maxStaleMs: Math.max(60_000, ttlMs * 6),
    fetcher: async () => {
      const res = await fetch(url, { headers: getHeaders(requireAuth), cache: "no-store" });
      if (!res.ok) {
        throw new ProviderHttpError(
          res.status,
          parseRetryAfterMs(res.headers.get("retry-after")),
          `Alpaca HTTP ${res.status}`,
        );
      }
      return res.json();
    },
  });
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
    "1D":  { timeframe: "1Day",  daysBack: 2000 },
    "W":   { timeframe: "1Week", daysBack: 3650 },
    "1W":  { timeframe: "1Week", daysBack: 3650 },
    // Monthly & multi-month/year period selectors → monthly candles spanning
    // years. Alpaca's largest bucket is 1Month; without these entries they fell
    // through to the "1Min" default, which is why Monthly showed minute bars.
    "M":   { timeframe: "1Month", daysBack: 5475 },   // ~15y
    "1M":  { timeframe: "1Month", daysBack: 5475 },
    "3M":  { timeframe: "1Month", daysBack: 7300 },
    "6M":  { timeframe: "1Month", daysBack: 7300 },
    "1Y":  { timeframe: "1Month", daysBack: 7300 },
    "2Y":  { timeframe: "1Week", daysBack: 3650 },
    "3Y":  { timeframe: "1Month", daysBack: 7300 },
    "5Y":  { timeframe: "1Month", daysBack: 7300 },
  };
  return map[tf] ?? { timeframe: "1Day", daysBack: 2000 };
}

const CRYPTO_SYMS = new Set(["BTC","ETH","SOL","BNB","XRP","DOGE","ADA","AVAX","LINK","DOT","LTC","MATIC","UNI","ATOM"]);
const ALPACA_TIMEFRAMES = new Set(["1m","2m","3m","5m","10m","15m","30m","1h","2h","4h","D","1D","W","1W","M","1M","3M","6M","1Y","2Y","3Y","5Y"]);

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
  const parsedBars = parseInt(searchParams.get("bars") ?? "300", 10);
  const bars   = Number.isFinite(parsedBars) ? Math.max(1, Math.min(5000, parsedBars)) : 300;
  const consumer = (searchParams.get("consumer") ?? "unattributed").slice(0, 64);
  let providerMeta: Pick<GovernedResult<unknown>, "health" | "cache" | "retryAfterMs"> = {
    health: "HEALTHY",
    cache: "MISS",
    retryAfterMs: null,
  };
  const governed = async (key: string, url: string, ttlMs: number, requireAuth: boolean) => {
    const result = await alpacaFetch(key, url, ttlMs, requireAuth);
    providerMeta = result;
    if (result.health !== "HEALTHY") {
      console.warn("[wm-provider-health]", {
        provider: "alpaca",
        health: result.health,
        cache: result.cache,
        retryAfterMs: result.retryAfterMs,
        symbol: rawSym,
        channel: type,
        consumer,
      });
      // No current consumer propagates providerHealth into the visible quote
      // fidelity. Returning cached data here would restamp it with Date.now()
      // and falsely paint an old observation as LIVE. Fail closed until every
      // consumer can render STALE/PARTIAL explicitly.
      throw new ProviderHttpError(
        429,
        result.retryAfterMs,
        "Alpaca observations are temporarily unavailable after rate limiting",
      );
    }
    return result.data as any;
  };
  const withProviderMeta = <T extends Record<string, unknown>>(body: T) => ({
    ...body,
    providerHealth: providerMeta.health,
    providerCache: providerMeta.cache,
    retryAfterMs: providerMeta.retryAfterMs,
  });

  if (rawSym && !/^[A-Z0-9.!_-]{1,16}$/.test(rawSym)) {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }
  if (!new Set(["quote", "trades", "candles"]).has(type)) {
    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  }
  if (type === "candles" && !ALPACA_TIMEFRAMES.has(tf)) {
    return NextResponse.json({ error: "unsupported timeframe" }, { status: 400 });
  }

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
        const json = await governed(`quote:crypto:${cryptoSym}`, url, 5_000, false);
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
        const json = await governed(`quote:stock:${rawSym}:iex`, snapshotUrl, 5_000, true);
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

      return NextResponse.json(withProviderMeta({
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
      }));
    }

    /* ── Recent per-trade tape (drives Big Trades bubbles) ──────
     * Real executed trades from Alpaca's free IEX feed, for ANY US stock —
     * this is what lets bubbles populate on every symbol instead of only the
     * handful the Finnhub WS happens to serve. Secret stays server-side.
     * `since` (ms) returns only trades after the caller's last-seen trade so
     * the client can poll incrementally. IEX is a real (if partial) tape and
     * carries no pre/post-market prints — honest real data, never synthetic. */
    if (type === "trades") {
      if (!rawSym) return NextResponse.json({ trades: [] });
      const sinceMs  = parseInt(searchParams.get("since") ?? "0", 10);
      const startIso = sinceMs > 0
        ? new Date(sinceMs + 1).toISOString()
        : new Date(Date.now() - 30_000).toISOString();

      if (crypto) {
        const cryptoSym = toCryptoSym(rawSym);
        const url  = `${DATA_BASE}/v1beta3/crypto/us/trades?symbols=${encodeURIComponent(cryptoSym)}&start=${startIso}&limit=1000&sort=asc`;
        const json = await governed(`trades:crypto:${cryptoSym}:${startIso}`, url, 900, false);
        const arr: any[] = json?.trades?.[cryptoSym] ?? [];
        return NextResponse.json(withProviderMeta({ sym: rawSym, trades: arr.map(t => ({ p: t.p, s: t.s, t: Date.parse(t.t) })), source: "alpaca" }));
      }

      if (!ALPACA_KEY || !ALPACA_SECRET) {
        return NextResponse.json({ trades: [], error: "Alpaca keys not set" }, { status: 503 });
      }
      const url  = `${DATA_BASE}/v2/stocks/${encodeURIComponent(rawSym)}/trades?start=${startIso}&limit=1000&feed=iex&sort=asc`;
      const json = await governed(`trades:stock:${rawSym}:${startIso}`, url, 900, true);
      const arr: any[] = json?.trades ?? [];
      return NextResponse.json(withProviderMeta({ sym: rawSym, trades: arr.map(t => ({ p: t.p, s: t.s, t: Date.parse(t.t) })), source: "alpaca" }));
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
        const json = await governed(`candles:crypto:${cryptoSym}:${timeframe}:${bars}`, url, 20_000, false);
        rawBars = (json?.bars?.[cryptoSym] ?? []).slice().reverse();
      } else {
        if (!ALPACA_KEY || !ALPACA_SECRET) {
          return NextResponse.json({ candles: [], error: "Alpaca keys not set" }, { status: 503 });
        }
        // Use sort=desc to get MOST RECENT bars first (avoids hitting limit before reaching today)
        // Then reverse to get chronological order for the chart
        const url = `${DATA_BASE}/v2/stocks/${encodeURIComponent(rawSym)}/bars?timeframe=${timeframe}&start=${start}&end=${end}&limit=${bars}&feed=iex&adjustment=raw&sort=desc`;
        const json = await governed(`candles:stock:${rawSym}:${timeframe}:${bars}:iex`, url, 20_000, true);
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

      return NextResponse.json(withProviderMeta({ sym: rawSym, tf, candles, source: "alpaca" }));
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });

  } catch (err: unknown) {
    const msg = String(err);
    const providerError = err instanceof ProviderHttpError ? err : null;
    const status = providerError?.status
      ?? (msg.includes("not configured") || msg.includes("not set") ? 503 : 500);
    console.error("[wm-provider-request-failed]", {
      provider: "alpaca",
      status,
      retryAfterMs: providerError?.retryAfterMs ?? null,
      symbol: rawSym,
      channel: type,
      consumer,
    });
    return NextResponse.json({
      error: msg,
      providerHealth: status === 429 ? "RATE_LIMITED" : "UNAVAILABLE",
      retryAfterMs: providerError?.retryAfterMs ?? null,
    }, {
      status,
      headers: providerError?.retryAfterMs
        ? { "Retry-After": String(Math.ceil(providerError.retryAfterMs / 1_000)) }
        : undefined,
    });
  }
}
