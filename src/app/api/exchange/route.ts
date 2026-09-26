/**
 * /api/exchange — unified per-exchange crypto proxy (quote + candles).
 * Normalizes Coinbase, Kraken, Bitstamp, Binance.US, Gemini into one shape.
 * Public market data — NO API KEY required (keys are only needed to TRADE).
 *
 * GET ?ex=coinbase&coin=BTC&type=quote
 * GET ?ex=coinbase&coin=BTC&type=candles&tf=15m&bars=300
 */

import { NextResponse } from "next/server";
import {
  resolveExchangeTimeframe,
  type ExchangeTimeframe,
  type PublicCryptoExchange,
} from "@/lib/marketData/exchangeTimeframes";
import { resolveRollingChange, type ChangeWindow } from "@/lib/marketData/changeWindow";
import { strictProviderNumber } from "@/lib/marketData/strictProviderNumber";
// This route declared its own six-field `Bar` until 2026-09-18. It was
// byte-for-byte `LegacyOhlcvTuple`, so it now speaks that name instead of being
// a private synonym for it. The rename removes a duplicate decision about what
// a bar is; it does not give this route's output canonical identity, which the
// legacy tuple deliberately does not carry.
//
// THAT SECOND SENTENCE STOPPED BEING TRUE LATER THE SAME DAY. This import is
// still type-only — erased by the compiler, present in no bundle — which is
// exactly the vacuous kind of "adoption" the M8 ratchet was rewritten to stop
// counting. The RUNTIME edge is the one below.
import {
  canonicalBarIdentity,
  type LegacyOhlcvTuple,
} from "@/lib/marketData/canonicalBar";
import {
  ingestExchangeCandles,
  toLegacySecondsTuple,
} from "@/lib/marketData/exchangeCandleIngress";
import { mergeVenueTail, VENUE_TAIL_INTERVALS } from "@/lib/marketData/venueTailFill";

type Ex = PublicCryptoExchange;

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

/* ── QUOTE: latest price + 24h change ───────────────────────────
 *
 * Every venue below reports a ROLLING 24-HOUR change, not a change against a
 * daily close — crypto trades continuously and has no close. That distinction
 * used to live only in this comment, while the response published a bare
 * `changePct` that consumers rendered in the same slot as equity day-changes.
 * It is now published as `changeWindow` so a surface can disclose the measure.
 * See src/lib/marketData/changeWindow.ts for the full defect note.
 *
 * Two fabrication doors were also closed here:
 *   - `open = parseFloat(...) || price` treated a missing 24h stat as "open
 *     equals price", manufacturing change = 0 out of absent data.
 *   - `changePct: open ? ... : 0` — parseFloat of an unknown symbol yields NaN,
 *     and NaN is FALSY, so an instrument the venue had never heard of was
 *     published as `price: null, changePct: 0`: a flat quote for a thing that
 *     does not exist.
 * resolveRollingChange refuses both, returning nulls instead of a zero.
 */
type ExchangeQuote = {
  price: number | null;
  change: number | null;
  changePct: number | null;
  changeWindow: ChangeWindow;
  referenceOpen: number | null;
};

function quote(price: unknown, open: unknown): ExchangeQuote {
  const p = strictProviderNumber(price);
  const r = resolveRollingChange(p, strictProviderNumber(open), "ROLLING_24H");
  return { price: p, change: r.change, changePct: r.changePct, changeWindow: r.changeWindow, referenceOpen: r.referenceOpen };
}

async function getQuote(ex: Ex, coin: string): Promise<ExchangeQuote> {
  const p = pair(ex, coin);
  if (ex === "coinbase") {
    const [t, s] = await Promise.all([
      j(`https://api.exchange.coinbase.com/products/${p}/ticker`),
      j(`https://api.exchange.coinbase.com/products/${p}/stats`),
    ]);
    return quote(t?.price, s?.open);
  }
  if (ex === "kraken") {
    const r = await j(`https://api.kraken.com/0/public/Ticker?pair=${p}`);
    const k = Object.values(r?.result ?? {})[0] as any;
    return quote(k?.c?.[0], k?.o);
  }
  if (ex === "bitstamp") {
    const r = await j(`https://www.bitstamp.net/api/v2/ticker/${p}/`);
    return quote(r?.last, r?.open);
  }
  if (ex === "binanceus") {
    // Binance publishes the 24h delta directly. Prefer the venue's own
    // arithmetic (as resolveQuoteDayChange does) so a healthy quote renders
    // byte-identically, but derive the reference open so the window is provable.
    const r = await j(`https://api.binance.us/api/v3/ticker/24hr?symbol=${p}`);
    const price = strictProviderNumber(r?.lastPrice);
    const change = strictProviderNumber(r?.priceChange);
    const changePct = strictProviderNumber(r?.priceChangePercent);
    if (price === null || price <= 0 || change === null || changePct === null || change === 0) {
      return quote(r?.lastPrice, r?.openPrice);
    }
    return {
      price,
      change: +change.toFixed(2),
      changePct: +changePct.toFixed(2),
      changeWindow: "ROLLING_24H",
      referenceOpen: +(price - change).toFixed(8),
    };
  }
  // gemini
  const r = await j(`https://api.gemini.com/v1/pubticker/${p}`);
  return quote(r?.last, r?.open);
}

/* ── CANDLES: normalized OHLCV ────────────────────────────────── */
const coinbaseTuples = (r: unknown): LegacyOhlcvTuple[] =>
  (Array.isArray(r) ? r : []).map((c: any) => ({ time: c[0], low: c[1], high: c[2], open: c[3], close: c[4], volume: c[5] }));

/**
 * THE LIVE EDGE'S CLOSED MINUTES (2026-09-26). Coinbase's un-windowed candles
 * page answers from a snapshot that lags the book by minutes — measured on
 * BTC-USD 1m its newest candle stayed pinned at 09:28 UTC while the clock ran
 * to 09:32, so every fresh load drew "NO BAR · 3 intervals" between history
 * and the forming bar the Coinbase tape was already building. The same
 * endpoint asked for an explicit window returns every closed minute. So the
 * same venue is re-read for a BOUNDED tail window and merged in (see
 * venueTailFill.ts): closed intervals only, one bar per instant, replaced
 * never summed. `null` = no tail was read (it failed, or not this venue).
 */
async function getCoinbaseTail(coin: string, sec: number): Promise<LegacyOhlcvTuple[] | null> {
  const endSec = Math.floor(Date.now() / 1000);
  const startSec = endSec - VENUE_TAIL_INTERVALS * sec;
  const iso = (t: number) => new Date(t * 1000).toISOString();
  try {
    const r = await j(`https://api.exchange.coinbase.com/products/${pair("coinbase", coin)}/candles?granularity=${sec}&start=${encodeURIComponent(iso(startSec))}&end=${encodeURIComponent(iso(endSec))}`);
    return Array.isArray(r) ? coinbaseTuples(r) : null;
  } catch {
    return null;
  }
}

interface VenueCandlePage {
  readonly tuples: LegacyOhlcvTuple[];
  /** Closed intervals the tail read supplied that the history page lacked; null = no tail read. */
  readonly tailFilled: number | null;
}

async function getCandlePage(ex: Ex, coin: string, tf: ExchangeTimeframe, sec: number, bars: number): Promise<VenueCandlePage> {
  if (ex !== "coinbase") return { tuples: await getCandles(ex, coin, tf, sec, bars), tailFilled: null };
  const [history, tail] = await Promise.all([
    getCandles(ex, coin, tf, sec, bars),
    getCoinbaseTail(coin, sec),
  ]);
  if (tail === null) return { tuples: history, tailFilled: null };
  const merged = mergeVenueTail({ history, tail, intervalSec: sec, nowSec: Math.floor(Date.now() / 1000) });
  return { tuples: merged.bars.slice(-bars), tailFilled: merged.filled };
}

async function getCandles(ex: Ex, coin: string, tf: ExchangeTimeframe, sec: number, bars: number): Promise<LegacyOhlcvTuple[]> {
  const p = pair(ex, coin);

  if (ex === "coinbase") {
    const r = await j(`https://api.exchange.coinbase.com/products/${p}/candles?granularity=${sec}`);
    // [time, low, high, open, close, volume] newest-first
    return coinbaseTuples(r).sort((a, b) => a.time - b.time).slice(-bars);
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
  const gtf = tf === "D" ? "1d" : tf;
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
  const requestedBars = parseInt(searchParams.get("bars") ?? "300", 10);
  const bars = Number.isFinite(requestedBars) ? Math.max(1, Math.min(1000, requestedBars)) : 300;

  if (!["coinbase", "kraken", "bitstamp", "binanceus", "gemini"].includes(ex)) {
    return NextResponse.json({ error: "Unknown exchange" }, { status: 400 });
  }

  try {
    if (type === "candles") {
      const resolution = resolveExchangeTimeframe(ex, tf);
      if (resolution.status === "UNAVAILABLE") {
        return NextResponse.json({
          ex,
          coin,
          candles: [],
          qualityState: "UNAVAILABLE",
          requestedTimeframe: tf,
          supportedTimeframes: resolution.supported,
          reason: resolution.reason,
        }, { status: 422 });
      }
      const page = await cached(
        `c:${ex}:${coin}:${resolution.timeframe}:${bars}`,
        4000,
        () => getCandlePage(ex, coin, resolution.timeframe, resolution.seconds, bars),
      ) as VenueCandlePage;
      const normalized = page.tuples;

      /* M8: THE ARTERY'S SECOND PRODUCTION CONSUMER.
       *
       * Five venues, five hand-written array mappings, and until now nothing
       * downstream checked any of them. Coinbase publishes
       * [time, low, high, open, close, volume]; Kraken publishes
       * [time, open, high, low, close, vwap, volume, count] — low and high
       * transposed, volume at a different index. A wrong index in one branch
       * throws nothing and type-checks fine; it renders a full chart of
       * inside-out candles on one venue only.
       *
       * Three things are newly true for these bars:
       *   - geometry is CHECKED, so a transposed venue mapping is refused and
       *     counted rather than drawn;
       *   - one instant delivered twice is refused rather than double-counted;
       *   - ordering is by asOf here, so a missing per-venue .sort() in one of
       *     the five branches can no longer reach a chart time-reversed.
       *
       * And one thing is newly SAYABLE: these bars carry SESSION_CONTINUOUS,
       * not SESSION_UNKNOWN. A crypto book has no open, close or pre/post, so
       * unlike Yahoo this is a real answer rather than an admission. They are
       * still INDICATIVE — no execution adapter routes through a public REST
       * proxy, so nobody can claim this price is the one an order would meet.
       *
       * `candles` is byte-identical to what this route published before.
       */
      const ingress = ingestExchangeCandles({
        exchange: ex,
        coin,
        timeframe: resolution.timeframe,
        tuples: normalized,
        receivedAt: Date.now(),
      });
      const candles = ingress.bars.map(toLegacySecondsTuple);
      const barIdentities = ingress.bars.map(canonicalBarIdentity);

      return NextResponse.json({
        ex,
        coin,
        candles,
        barIdentities,
        qualityState: "LIVE",
        timeframe: resolution.timeframe,
        // `qualityState: "LIVE"` above is about the route being up. It is NOT a
        // claim that these bars streamed — every one was fetched over REST.
        // Published separately rather than by editing qualityState, which
        // existing consumers read.
        barSource: ex,
        barProvenance: "REST_BACKFILL",
        barFidelity: "INDICATIVE",
        sessionKnown: true,
        sessionModel: "CONTINUOUS",
        // Closed intervals the same venue's windowed tail read supplied that
        // its lagging history page did not hold (venueTailFill.ts); null =
        // no tail was read. The chart publishes it as `dataGapsTailFilled`.
        tailFilled: page.tailFilled,
        refusedBars: ingress.refusals.length,
        refusals: ingress.refusals,
      });
    }
    const q = await cached(`q:${ex}:${coin}`, 1500, () => getQuote(ex, coin)) as ExchangeQuote;
    // A venue that has never heard of this symbol returns a shape parseFloat
    // turns into NaN. That used to leave here as HTTP 200 with
    // `price: null, changePct: 0` — an unknown exchange was rejected with 400,
    // but an unknown COIN was answered with a flat quote. Match the precedent.
    if (q.price === null || q.price <= 0) {
      return NextResponse.json(
        { ex, coin, error: "Unknown or unquoted symbol", price: null, change: null, changePct: null, changeWindow: "UNKNOWN" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ex, coin, ...q });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
