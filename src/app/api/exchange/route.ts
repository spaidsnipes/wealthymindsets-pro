/**
 * /api/exchange — unified per-exchange crypto proxy (quote + candles).
 * Normalizes Coinbase, Kraken, Bitstamp, Binance.US, Gemini into one shape.
 * Public market data — NO API KEY required (keys are only needed to TRADE).
 *
 * GET ?ex=coinbase&coin=BTC&type=quote
 * GET ?ex=coinbase&coin=BTC&type=candles&tf=15m&bars=300
 */

import { NextResponse } from "next/server";

type Ex = "coinbase" | "kraken" | "bitstamp" | "binanceus" | "gemini";
type Bar = { time: number; open: number; high: number; low: number; close: number; volume: number };

/* Per-exchange trading-pair format for a coin */
function pair(ex: Ex, coin: string): string {
  const c = coin.toUpperCase();
  switch (ex) {
    case "coinbase":  return `${c}-USD`;
    case "kraken":    return c === "BTC" ? "XBTUSD" : `${c}USD`;
    case "bitstamp":  return `${c.toLowerCase()}usd`;
    case "binanceus": return `${c}USDT`;
    case "gemini":    return `${c.toLowerCase()}usd`;
  }
}

const CACHE = new Map<string, { data: unknown; ts: number }>();
async function cached(key: string, ttl: number, fn: () => Promise<unknown>) {
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.ts < ttl) return hit.data;
  const data = await fn();
  CACHE.set(key, { data, ts: Date.now() });
  return data;
}

const UA = { "User-Agent": "Mozilla/5.0 WM" };
const j = (url: string) => fetch(url, { headers: UA, cache: "no-store" }).then(r => r.json());

/* ── QUOTE: latest price + 24h change ─────────────────────────── */
async function getQuote(ex: Ex, coin: string): Promise<{ price: number; change: number; changePct: number }> {
  const p = pair(ex, coin);
  if (ex === "coinbase") {
    const [t, s] = await Promise.all([
      j(`https://api.exchange.coinbase.com/products/${p}/ticker`),
      j(`https://api.exchange.coinbase.com/products/${p}/stats`),
    ]);
    const price = parseFloat(t.price), open = parseFloat(s.open) || price;
    return { price, change: +(price - open).toFixed(2), changePct: open ? +((price - open) / open * 100).toFixed(2) : 0 };
  }
  if (ex === "kraken") {
    const r = await j(`https://api.kraken.com/0/public/Ticker?pair=${p}`);
    const k = Object.values(r.result ?? {})[0] as any;
    const price = parseFloat(k.c[0]), open = parseFloat(k.o) || price;
    return { price, change: +(price - open).toFixed(2), changePct: open ? +((price - open) / open * 100).toFixed(2) : 0 };
  }
  if (ex === "bitstamp") {
    const r = await j(`https://www.bitstamp.net/api/v2/ticker/${p}/`);
    const price = parseFloat(r.last), open = parseFloat(r.open) || price;
    return { price, change: +(price - open).toFixed(2), changePct: open ? +((price - open) / open * 100).toFixed(2) : 0 };
  }
  if (ex === "binanceus") {
    const r = await j(`https://api.binance.us/api/v3/ticker/24hr?symbol=${p}`);
    return { price: parseFloat(r.lastPrice), change: +parseFloat(r.priceChange).toFixed(2), changePct: +parseFloat(r.priceChangePercent).toFixed(2) };
  }
  // gemini
  const r = await j(`https://api.gemini.com/v1/pubticker/${p}`);
  const price = parseFloat(r.last), open = parseFloat(r.open ?? r.last) || price;
  return { price, change: +(price - open).toFixed(2), changePct: open ? +((price - open) / open * 100).toFixed(2) : 0 };
}

/* ── CANDLES: normalized OHLCV ────────────────────────────────── */
const TF_SEC: Record<string, number> = {
  "1m": 60, "5m": 300, "15m": 900, "30m": 1800, "1h": 3600, "2h": 7200, "4h": 14400, "D": 86400, "W": 604800,
};

async function getCandles(ex: Ex, coin: string, tf: string, bars: number): Promise<Bar[]> {
  const p = pair(ex, coin);
  const sec = TF_SEC[tf] ?? 900;

  if (ex === "coinbase") {
    const g = [60, 300, 900, 3600, 21600, 86400].reduce((a, b) => Math.abs(b - sec) < Math.abs(a - sec) ? b : a);
    const r = await j(`https://api.exchange.coinbase.com/products/${p}/candles?granularity=${g}`);
    // [time, low, high, open, close, volume] newest-first
    return (r as any[]).map(c => ({ time: c[0], low: c[1], high: c[2], open: c[3], close: c[4], volume: c[5] }))
      .sort((a, b) => a.time - b.time).slice(-bars);
  }
  if (ex === "kraken") {
    const min = Math.max(1, Math.round(sec / 60));
    const r = await j(`https://api.kraken.com/0/public/OHLC?pair=${p}&interval=${min}`);
    const arr = Object.values(r.result ?? {}).find(Array.isArray) as any[] ?? [];
    // [time, open, high, low, close, vwap, volume, count]
    return arr.map(c => ({ time: +c[0], open: +c[1], high: +c[2], low: +c[3], close: +c[4], volume: +c[6] })).slice(-bars);
  }
  if (ex === "bitstamp") {
    const r = await j(`https://www.bitstamp.net/api/v2/ohlc/${p}/?step=${sec}&limit=${Math.min(1000, bars)}`);
    return (r?.data?.ohlc ?? []).map((c: any) => ({ time: +c.timestamp, open: +c.open, high: +c.high, low: +c.low, close: +c.close, volume: +c.volume }));
  }
  if (ex === "binanceus") {
    const iv = tf === "D" ? "1d" : tf === "W" ? "1w" : tf;
    const r = await j(`https://api.binance.us/api/v3/klines?symbol=${p}&interval=${iv}&limit=${Math.min(1000, bars)}`);
    // [openTime(ms), open, high, low, close, volume, ...]
    return (r as any[]).map(c => ({ time: Math.floor(c[0] / 1000), open: +c[1], high: +c[2], low: +c[3], close: +c[4], volume: +c[5] }));
  }
  // gemini — supports 1m,5m,15m,30m,1h,6h,1d
  const gtf = ["1m", "5m", "15m", "30m", "1h", "6h", "1d"].includes(tf === "D" ? "1d" : tf) ? (tf === "D" ? "1d" : tf) : "15m";
  const r = await j(`https://api.gemini.com/v2/candles/${p}/${gtf}`);
  // [time(ms), open, high, low, close, volume] newest-first
  return (r as any[]).map(c => ({ time: Math.floor(c[0] / 1000), open: c[1], high: c[2], low: c[3], close: c[4], volume: c[5] }))
    .sort((a, b) => a.time - b.time).slice(-bars);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ex   = (searchParams.get("ex") ?? "coinbase").toLowerCase() as Ex;
  const coin = (searchParams.get("coin") ?? "BTC").toUpperCase();
  const type = searchParams.get("type") ?? "quote";
  const tf   = searchParams.get("tf") ?? "15m";
  const bars = Math.min(1000, parseInt(searchParams.get("bars") ?? "300", 10));

  if (!["coinbase", "kraken", "bitstamp", "binanceus", "gemini"].includes(ex)) {
    return NextResponse.json({ error: "Unknown exchange" }, { status: 400 });
  }

  try {
    if (type === "candles") {
      const candles = await cached(`c:${ex}:${coin}:${tf}`, 4000, () => getCandles(ex, coin, tf, bars)) as Bar[];
      return NextResponse.json({ ex, coin, candles });
    }
    const q = await cached(`q:${ex}:${coin}`, 1500, () => getQuote(ex, coin));
    return NextResponse.json({ ex, coin, ...(q as object) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
