/**
 * /api/yahoo — Server-side Yahoo Finance proxy
 * Handles CORS by running server-side. No API key needed.
 *
 * GET /api/yahoo?sym=NQ1!&type=quote   → current price + day OHLC
 * GET /api/yahoo?sym=NQ1!&type=candles&tf=1m&bars=300 → OHLCV array
 */

import { NextResponse } from "next/server";
import { aggregateYahooBars, resolveYahooTimeframe, type YahooOhlcvBar } from "@/lib/yahooTimeframes";
import { buildYahooQuoteObservation } from "@/lib/marketData/yahooQuoteObservation";
import { toYahooSymbol } from "@/lib/yahooSymbol";

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
  const parsedBars = parseInt(searchParams.get("bars") ?? "300", 10);
  const bars = Number.isFinite(parsedBars) ? Math.max(1, Math.min(3000, parsedBars)) : 300;

  const yfSym  = toYahooSymbol(rawSym);

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
      let livePrice = 0, liveHigh = 0, liveLow = 0, liveOpen = 0, liveVolume = 0;
      // SF-D01: capture the REAL observation epoch-ms of the chosen live price.
      // Yahoo intraday timestamps are epoch SECONDS; ×1000 → ms. Previously this
      // was discarded and every quote was stamped with server Date.now(), which
      // borrowed server time as observation chronology (forbidden).
      let liveObservedAt: number | null = null;
      const ir = intraJson?.chart?.result?.[0];
      if (ir?.timestamp?.length) {
        const ts: (number|null)[] = ir.timestamp ?? [];
        const q = ir.indicators?.quote?.[0] ?? {};
        const cl: (number|null)[] = q.close ?? [];
        const hi: (number|null)[] = q.high  ?? [];
        const lo: (number|null)[] = q.low   ?? [];
        const op: (number|null)[] = q.open  ?? [];
        const vo: (number|null)[] = q.volume ?? [];
        for (let i = cl.length - 1; i >= 0; i--) {
          if (cl[i] != null && (cl[i] as number) > 0) {
            livePrice = cl[i] as number;
            const tsec = ts[i];
            liveObservedAt = (tsec != null && Number.isFinite(tsec) && tsec > 0) ? tsec * 1000 : null;
            break;
          }
        }
        const validHi = hi.filter((v): v is number => v != null && v > 0);
        const validLo = lo.filter((v): v is number => v != null && v > 0);
        const firstOp = op.find((v): v is number => v != null && v > 0);
        if (validHi.length) liveHigh = Math.max(...validHi);
        if (validLo.length) liveLow  = Math.min(...validLo);
        if (firstOp) liveOpen = firstOp;
        liveVolume = vo.reduce<number>((sum, value) => sum + (value ?? 0), 0);
      }

      /* ── An answer is not a price ───────────────────────────────────────────
         Yahoo replies for listings it holds but has no quote for with `meta`
         present and every price field zero or absent. Observed on BRETT-USD:
         regularMarketPrice 0, previousClose undefined, zero daily closes — and a
         real chartPreviousClose of 0.0023591456 alongside them.

         The guard here used to read `!meta && !livePrice`, which asks "did Yahoo
         answer", not "was a price observed". `meta` was present, so it passed,
         and the chain below terminated in `|| 0` — so the answer became "yes,
         zero". Zero measured against that real prevClose ships
         `change: -0.0024, changePct: -100`: a total wipeout the market never had.

         This was never on screen. All ten `type=quote` consumers independently
         guard on `price > 0` and drop the row, so the fabrication was held back
         by a convention repeated in ten call sites rather than by the producer
         that emits it — one new consumer away from being rendered.

         `!== 0`, not `> 0`: zero is Yahoo's absence marker, but a negative
         settlement is a real observation (CL settled at -$37.63 in April 2020)
         and the `||` chain passed it through. Rejecting it here would be a new
         defect wearing the fix's clothes. */
      const price = [livePrice, meta?.regularMarketPrice, meta?.previousClose]
        .find((v): v is number => typeof v === "number" && Number.isFinite(v) && v !== 0);
      if (price === undefined) return NextResponse.json({ error: "No data" }, { status: 404 });
      const open  = liveOpen  || meta?.regularMarketOpen   || price;
      const high  = Math.max(liveHigh || 0, meta?.regularMarketDayHigh || 0) || price;
      const low   = (liveLow && meta?.regularMarketDayLow) ? Math.min(liveLow, meta.regularMarketDayLow)
                  : (liveLow || meta?.regularMarketDayLow || price);

      // prevClose from daily closes (yesterday's close), for change vs prior session.
      const closes: (number | null)[] = dayRes?.indicators?.quote?.[0]?.close ?? [];
      const validCloses = closes.filter((c): c is number => c != null && c > 0);
      const ohlcObservation = {
        open: Boolean(liveOpen || meta?.regularMarketOpen),
        high: Boolean(liveHigh || meta?.regularMarketDayHigh),
        low: Boolean(liveLow || meta?.regularMarketDayLow),
        prevClose: Boolean(validCloses.length >= 2 || meta?.chartPreviousClose || meta?.previousClose),
      };
      const dailyVolumes: (number | null)[] = dayRes?.indicators?.quote?.[0]?.volume ?? [];
      const validDailyVolumes = dailyVolumes.filter((v): v is number => v != null && v > 0);
      const completedDailyVolumes = validDailyVolumes.length > 1 ? validDailyVolumes.slice(0, -1) : validDailyVolumes;
      const observedAvgVolume = completedDailyVolumes.length
        ? completedDailyVolumes.reduce((sum, value) => sum + value, 0) / completedDailyVolumes.length
        : 0;
      let prevClose = validCloses.length >= 2
        ? validCloses[validCloses.length - 2]
        : (meta?.chartPreviousClose ?? meta?.previousClose ?? price);
      if (!prevClose || prevClose <= 0) prevClose = price;

      // SF-D01: build the truthful quote observation ALONGSIDE the legacy
      // fields. RESOLVED only when there is a real live price WITH a real
      // observation timestamp; otherwise UNKNOWN with nonempty reasons and no
      // borrowed chronology. Legacy `price`/`ts` are retained for existing
      // consumers, but `observation` is the honest, resolution-typed truth: a
      // consumer that only had a day/meta fallback will see observation.resolution
      // === "UNKNOWN" instead of a stale number stamped with server time.
      const capturedAt = Date.now();
      const observation = buildYahooQuoteObservation({
        symbol:         rawSym,
        normalizedSymbol: rawSym.trim().toUpperCase(),
        livePrice:      livePrice > 0 ? livePrice : null,
        liveObservedAt,                     // real intraday epoch-ms, or null
        receivedAt:     capturedAt,         // transport receipt (server) — never used as observation time
        capturedAt,
      });

      return NextResponse.json({
        sym:       rawSym,
        price,
        open,
        high,
        low,
        prevClose,
        change:    +(price - prevClose).toFixed(4),
        changePct: prevClose ? +(((price - prevClose) / prevClose) * 100).toFixed(4) : 0,
        volume:     liveVolume || meta?.regularMarketVolume || 0,
        avgVolume:  observedAvgVolume || meta?.averageDailyVolume10Day || meta?.averageDailyVolume3Month || 0,
        // Identifies which legacy session fields came from an actual provider
        // observation rather than a compatibility fallback to current price.
        ohlcObservation,
        // `ts` is transport/response time only — NOT observation chronology.
        ts:        capturedAt,
        // SF-D01 truthful observation (RESOLVED | UNKNOWN discriminated union).
        observation,
      });
    }

    if (type === "candles") {
      /* ── OHLCV candle array ──────────────────────────────── */
      const plan = resolveYahooTimeframe(tf);
      if (!plan) {
        return NextResponse.json({
          candles: [],
          tf,
          qualityState: "UNAVAILABLE",
          reason: `Unsupported timeframe: ${tf}`,
        }, { status: 400 });
      }
      const { interval, range } = plan;
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

      // Reconstructed timeframes need enough finer-grained bars to build the
      // requested number of candles. Unknown intervals never reach this path.
      const sourceBars = Math.min(timestamps.length, bars * plan.multiplier);
      const start = Math.max(0, timestamps.length - sourceBars);
      const baseCandles: YahooOhlcvBar[] = [];
      for (let i = start; i < timestamps.length; i++) {
        const o = opens?.[i], h = highs?.[i], l = lows?.[i], c = closes?.[i];
        if (o == null || c == null) continue;
        baseCandles.push({
          time:   timestamps[i],
          open:   o,
          high:   h ?? Math.max(o, c),
          low:    l ?? Math.min(o, c),
          close:  c,
          volume: vols?.[i] ?? 0,
        });
      }

      const candles = aggregateYahooBars(baseCandles, plan, bars);

      return NextResponse.json({
        sym: rawSym,
        tf,
        requestedTf: tf,
        returnedTf: tf,
        sourceMode: plan.sourceMode,
        baseInterval: plan.interval,
        candles,
      });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });

  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
