/**
 * /api/finnhub — Server-side Finnhub proxy
 * Real-time quotes for stocks/ETFs/crypto via Finnhub REST API.
 * Finnhub is REAL-TIME for US equities (not delayed like Yahoo).
 *
 * GET /api/finnhub?sym=TSLA&type=quote
 * GET /api/finnhub?sym=TSLA&type=candles&tf=1m&bars=300
 * GET /api/finnhub?q=tesla&type=search  → symbol search results
 */

import { NextResponse } from "next/server";

/**
 * Server-only Finnhub key. In production, unset or committed-fallback-equal
 * throws at module load so the route refuses to sign a request with a value
 * visible in the public repo (WM-SEC-P0-03). NEXT_PUBLIC_FINNHUB_KEY is still
 * read as a transitional fallback so an in-flight client-side rotation doesn't
 * strand this route; remove that fallback and this comment once every client
 * caller has moved to this proxy and NEXT_PUBLIC_FINNHUB_KEY is deleted.
 */
const COMMITTED_FALLBACK = "d8efu9hr01qth3ch5f20d8efu9hr01qth3ch5f2g";
const BASE = "https://finnhub.io/api/v1";

// Lazy resolution so Vercel's build-time page-data collection doesn't
// crash when the prod key isn't available in the build environment. Real
// GET handlers still fail-fast in production at the first request.
let _finnhubKeyCache: string | null = null;
function getFinnhubKey(): string {
  if (_finnhubKeyCache !== null) return _finnhubKeyCache;
  const fromEnv = process.env.FINNHUB_KEY ?? process.env.NEXT_PUBLIC_FINNHUB_KEY;
  const isProd  = process.env.NODE_ENV === "production";
  if (isProd) {
    if (!fromEnv) {
      throw new Error(
        "FINNHUB_KEY is not set in production. Refusing to call Finnhub with " +
        "a committed fallback. Set FINNHUB_KEY in Vercel and redeploy.",
      );
    }
    if (fromEnv === COMMITTED_FALLBACK) {
      throw new Error(
        "FINNHUB_KEY equals the committed dev fallback in production. Rotate " +
        "immediately at finnhub.io, update the value in Vercel, redeploy.",
      );
    }
    _finnhubKeyCache = fromEnv;
    return fromEnv;
  }
  _finnhubKeyCache = fromEnv ?? "";
  return _finnhubKeyCache;
}

/* ── Symbol mapping: WM internal → Finnhub ─────────────────── */
// Finnhub does not support futures directly on the free plan; we fall back to Yahoo for those.
// Crypto uses Binance exchange format.
const FH_MAP: Record<string, string> = {
  // Crypto (Binance)
  "BTC":    "BINANCE:BTCUSDT", "BTCUSD": "BINANCE:BTCUSDT",
  "ETH":    "BINANCE:ETHUSDT", "ETHUSD": "BINANCE:ETHUSDT",
  "SOL":    "BINANCE:SOLUSDT", "SOLUSD": "BINANCE:SOLUSDT",
  "BNB":   "BINANCE:BNBUSDT",
  "XRP":   "BINANCE:XRPUSDT",
  "DOGE":  "BINANCE:DOGEUSDT",
  "ADA":   "BINANCE:ADAUSDT",
  "AVAX":  "BINANCE:AVAXUSDT",
  "LINK":  "BINANCE:LINKUSDT",
  "DOT":   "BINANCE:DOTUSDT",
  "LTC":   "BINANCE:LTCUSDT",
  "ATOM":  "BINANCE:ATOMUSDT",
  "UNI":   "BINANCE:UNIUSDT",
  // Futures → NOT supported by Finnhub REST for candles; return null so caller falls back to Yahoo
};

// Finnhub candle resolution mapping — FAIL-CLOSED (WM-CHART-P0-03).
// Only intervals Finnhub serves NATIVELY are mapped here. Requests for
// intervals Finnhub does not support natively (2m, 3m, 10m, 2h, 4h)
// return `null` so the route responds with an honest UNAVAILABLE state
// rather than silently substituting a different bar size and labelling
// it with the requested one — the exact defect that produced
// "1-minute bars labelled 2m" in prod.
// Finnhub free-tier native resolutions (per finnhub.io/docs/api/stock-candles):
//   1, 5, 15, 30, 60, D, W, M.
const FH_NATIVE_RES: Record<string, string> = {
  "1m": "1",
  "5m": "5",
  "15m": "15",
  "30m": "30",
  "1h": "60",
  "D":  "D",
  "1D": "D",
  "W":  "W",
  "1W": "W",
  "M":  "M",
  "1M": "M",
};

function toFinnhubSym(sym: string): string | null {
  const up = sym.toUpperCase();
  if (FH_MAP[up]) return FH_MAP[up];
  // Futures not supported
  if (up.endsWith("1!") || up.includes("=F") || up.includes("/")) return null;
  // Plain stock/ETF — use as-is
  return up;
}

const CACHE = new Map<string, { data: unknown; ts: number }>();

/**
 * A failed upstream Finnhub response, classified into an honest edge. Monday
 * Test 2: name the ACTUAL proven failure class — a 401 (Finnhub rejected our
 * token) is AUTH BLOCKED, not a generic HTTP 500 and never "delayed by
 * entitlement". The upstream status is preserved for the caller.
 */
class FinnhubUpstreamError extends Error {
  constructor(readonly status: number, readonly edge: string, message: string) {
    super(message);
    this.name = "FinnhubUpstreamError";
  }
}

function classifyFinnhubStatus(status: number): string {
  if (status === 401) return "AUTH BLOCKED";  // Finnhub rejected the API token (invalid/expired)
  if (status === 403) return "FORBIDDEN";     // token lacks access to this resource / plan
  if (status === 429) return "RATE LIMITED";  // Finnhub free-tier throttle
  if (status === 404) return "NOT FOUND";     // symbol / endpoint not found upstream
  if (status >= 500) return "PROVIDER ERROR"; // Finnhub-side failure
  return "UPSTREAM ERROR";
}

async function fhFetch(url: string, ttlMs = 5_000): Promise<unknown> {
  const cached = CACHE.get(url);
  if (cached && Date.now() - cached.ts < ttlMs) return cached.data;
  const res = await fetch(url, { headers: { "X-Finnhub-Token": getFinnhubKey() }, cache: "no-store" });
  if (!res.ok) {
    const edge = classifyFinnhubStatus(res.status);
    throw new FinnhubUpstreamError(res.status, edge, `Finnhub ${edge} (HTTP ${res.status})`);
  }
  const data = await res.json();
  CACHE.set(url, { data, ts: Date.now() });
  return data;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawSym = (searchParams.get("sym") ?? "").toUpperCase();
  const type   = searchParams.get("type") ?? "quote";
  const q      = searchParams.get("q") ?? rawSym;
  const tf     = searchParams.get("tf") ?? "1m";
  const bars   = Math.min(500, parseInt(searchParams.get("bars") ?? "300", 10));

  try {
    /* ── Symbol search ──────────────────────────────────────── */
    if (type === "search") {
      const url  = `${BASE}/search?q=${encodeURIComponent(q)}&token=${getFinnhubKey()}`;
      const json = await fhFetch(url, 30_000) as any;
      const results = (json.result ?? []).slice(0, 50).map((r: any) => ({
        sym:  r.symbol,
        name: r.description,
        type: r.type,
        exchange: r.primaryExchange ?? r.exchange ?? "",
      }));
      return NextResponse.json({ results });
    }

    const fhSym = toFinnhubSym(rawSym);
    if (!fhSym) {
      return NextResponse.json({ error: "Symbol not supported by Finnhub — use Yahoo proxy" }, { status: 404 });
    }

    /* ── Real-time quote ────────────────────────────────────── */
    if (type === "quote") {
      const url  = `${BASE}/quote?symbol=${encodeURIComponent(fhSym)}&token=${getFinnhubKey()}`;
      const json = await fhFetch(url, 3_000) as any;
      const price     = json.c ?? 0;   // current price
      const prevClose = json.pc ?? price;
      const open      = json.o  ?? price;
      const high      = json.h  ?? price;
      const low       = json.l  ?? price;
      if (!price) return NextResponse.json({ error: "No data from Finnhub" }, { status: 404 });
      return NextResponse.json({
        sym:       rawSym,
        price,
        open,
        high,
        low,
        prevClose,
        change:    +(price - prevClose).toFixed(4),
        changePct: prevClose ? +(((price - prevClose) / prevClose) * 100).toFixed(4) : 0,
        ts:        json.t ? json.t * 1000 : Date.now(),
        source:    "finnhub",
      });
    }

    /* ── Historical candles ─────────────────────────────────── */
    if (type === "candles") {
      // WM-CHART-P0-03: fail-closed. Non-native intervals return
      // UNAVAILABLE rather than a silently-substituted bar size.
      const resolution = FH_NATIVE_RES[tf];
      if (!resolution) {
        return NextResponse.json({
          sym: rawSym,
          tf,
          candles: [],
          qualityState: "UNAVAILABLE",
          reason: `Interval "${tf}" is not natively supported by Finnhub (native: ${Object.keys(FH_NATIVE_RES).join(", ")}). Caller should try another provider or accept unavailability.`,
        }, { status: 200 });
      }
      const now  = Math.floor(Date.now() / 1000);
      // Calculate `from` timestamp based on desired bar count + resolution.
      // secPerBar is complete for every value the fail-closed map above emits.
      const secPerBar: Record<string, number> = {
        "1": 60, "5": 300, "15": 900, "30": 1800,
        "60": 3600, "D": 86400, "W": 604800, "M": 2_592_000,
      };
      const perBar = secPerBar[resolution];
      if (!perBar) {
        // Defensive — map + this table are hand-linked; if they drift, refuse
        // rather than silently pick a 60s default.
        throw new Error(`Internal: no secPerBar for resolution "${resolution}"`);
      }
      const secs = perBar * bars * 1.5; // 1.5x buffer for gaps/weekends
      const from = now - Math.round(secs);

      const url = `${BASE}/stock/candle?symbol=${encodeURIComponent(fhSym)}&resolution=${resolution}&from=${from}&to=${now}&token=${getFinnhubKey()}`;
      const json = await fhFetch(url, 20_000) as any;
      if (json.s !== "ok" || !Array.isArray(json.t)) {
        return NextResponse.json({ candles: [], qualityState: "UNAVAILABLE", reason: json.s === "no_data" ? "Finnhub reports no data for this symbol/range" : "Finnhub error" });
      }

      const candles = [];
      const start = Math.max(0, json.t.length - bars);
      for (let i = start; i < json.t.length; i++) {
        const o = json.o?.[i], h = json.h?.[i], l = json.l?.[i], c = json.c?.[i];
        if (o == null || c == null) continue;
        candles.push({
          time:   json.t[i],
          open:   o,
          high:   h ?? Math.max(o, c),
          low:    l ?? Math.min(o, c),
          close:  c,
          volume: json.v?.[i] ?? 0,
        });
      }
      return NextResponse.json({ sym: rawSym, tf, candles, source: "finnhub" });
    }

    /* ── News (general or per-category) ─────────────────────── */
    if (type === "news") {
      const category = searchParams.get("category") ?? "general";
      const url  = `${BASE}/news?category=${encodeURIComponent(category)}&token=${getFinnhubKey()}`;
      const json = await fhFetch(url, 60_000) as any;
      return NextResponse.json({ items: Array.isArray(json) ? json : [] });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });

  } catch (err: unknown) {
    // Preserve the provider's real failure class + status. A rejected token
    // surfaces as 401 AUTH BLOCKED so the consumer can degrade honestly instead
    // of reading a generic 500 (and never "delayed by entitlement").
    if (err instanceof FinnhubUpstreamError) {
      return NextResponse.json(
        { error: err.message, edge: err.edge, source: "finnhub" },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
