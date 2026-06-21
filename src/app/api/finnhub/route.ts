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

const FINNHUB_KEY = process.env.FINNHUB_KEY ?? process.env.NEXT_PUBLIC_FINNHUB_KEY ?? "d8efu9hr01qth3ch5f20d8efu9hr01qth3ch5f2g";
const BASE = "https://finnhub.io/api/v1";

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

// Finnhub candle resolution mapping
const FH_RES: Record<string, string> = {
  "1m": "1", "2m": "1", "3m": "5", "5m": "5", "10m": "15",
  "15m": "15", "30m": "30", "1h": "60", "2h": "60", "4h": "60",
  "D": "D", "W": "W",
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

async function fhFetch(url: string, ttlMs = 5_000): Promise<unknown> {
  const cached = CACHE.get(url);
  if (cached && Date.now() - cached.ts < ttlMs) return cached.data;
  const res = await fetch(url, { headers: { "X-Finnhub-Token": FINNHUB_KEY }, cache: "no-store" });
  if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`);
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
      const url  = `${BASE}/search?q=${encodeURIComponent(q)}&token=${FINNHUB_KEY}`;
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
      const url  = `${BASE}/quote?symbol=${encodeURIComponent(fhSym)}&token=${FINNHUB_KEY}`;
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
      const resolution = FH_RES[tf] ?? "1";
      const now  = Math.floor(Date.now() / 1000);
      // Calculate `from` timestamp based on desired bar count + resolution
      const secPerBar: Record<string, number> = {
        "1": 60, "5": 300, "15": 900, "30": 1800,
        "60": 3600, "D": 86400, "W": 604800,
      };
      const secs  = (secPerBar[resolution] ?? 60) * bars * 1.5; // 1.5x buffer for gaps/weekends
      const from  = now - Math.round(secs);

      const url = `${BASE}/stock/candle?symbol=${encodeURIComponent(fhSym)}&resolution=${resolution}&from=${from}&to=${now}&token=${FINNHUB_KEY}`;
      const json = await fhFetch(url, 20_000) as any;
      if (json.s !== "ok" || !Array.isArray(json.t)) {
        return NextResponse.json({ candles: [] });
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

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });

  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
