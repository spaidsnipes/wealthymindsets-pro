/**
 * WHICH ROUTE SERVES THE CHART'S BARS, FOR THIS SYMBOL AT THIS TIMEFRAME — and
 * whether what it serves is the provider's own bucket or one WM rebuilt.
 *
 * Garden 16 §26: "Provider-native is native. WM-generated is derived. Do not
 * label derived intervals native."
 *
 * THE DEFECT (verifier, 2026-09-26). CANON_LADDER marked 3m / 10m / 2h / 4h
 * NATIVE_PROVIDER for every symbol. That is true of the chart's first EQUITY
 * route — /api/alpaca maps them to 3Min / 10Min / 2Hour / 4Hour — and of
 * nothing else. ES1! never reaches Alpaca (equityVendorSkipNoun: futures), so
 * its 4h bars come from /api/yahoo, whose plan folds four 60m bars into one
 * (`sourceMode: "reconstructed"`). The ladder called those bars native.
 *
 * THE ANSWER IS READ OFF THE CODE THAT FETCHES, NOT RESTATED. This walks the
 * same waterfall MainChart's history load walks, in the same order, asking
 * the same owners each door asks:
 *
 *   1. /api/exchange   — a venue symbol ("BTC.KRAKEN"), else the tape's own
 *                        Coinbase product (coinbaseProduct). Served when the
 *                        venue publishes that granularity
 *                        (resolveExchangeTimeframe, with the id sent as-is:
 *                        "1D" is not a key there, so Coinbase declines it).
 *   2. /api/alpaca     — not asked for futures / forex / spot metals
 *                        (equityVendorSkipNoun). Served when ALPACA_TF_MAP
 *                        has the id. A crypto symbol is asked as
 *                        toAlpacaCryptoSymbol(sym), and when that is not the
 *                        coin's own "BASE/USD" pair Alpaca has nothing to
 *                        answer ("BTCUSD" → "BTCUSD/USD"), so the chart falls on.
 *   3. /api/finnhub    — "Finnhub REST": equities only (crypto is not asked
 *                        here). Served when toFinnhubSym resolves and
 *                        FH_NATIVE_RES has the id. UNREACHABLE TODAY: for a
 *                        non-crypto symbol door 3 is reached only when Alpaca
 *                        (door 2) declined the id, and every FH_NATIVE_RES id
 *                        is in ALPACA_TF_MAP, so Alpaca never declines one
 *                        Finnhub would serve. Kept (not deleted) because it is
 *                        the chart's real order; the invariant that makes it
 *                        dead is pinned in chartBarRoute.test.ts, so a row
 *                        added to FH_NATIVE_RES alone turns it live and RED.
 *   4. /api/yahoo      — resolveYahooSymbol must resolve; resolveYahooTimeframe
 *                        names the plan, and its `sourceMode` says native or
 *                        reconstructed.
 *   5. /api/finnhub    — the last door, asked for crypto too
 *                        (fetchFinnhubCandles: only equityVendorSkipNoun stops
 *                        it). Same table, same symbol owner as door 3. A
 *                        BINANCE: pair is asked of Finnhub's /crypto/candle,
 *                        an equity of /stock/candle (finnhubCandlePath; the
 *                        request URL is pinned in finnhubBarRoute.test.ts and
 *                        on the wire in api/finnhub/route.test.ts).
 *
 * DOOR 5 IS WHY THE WALK HAS NO SHORTCUT (verifier, 2026-09-27). This module
 * used to skip Finnhub on the claim "its intervals are a subset of Alpaca's".
 * That holds only when Alpaca ANSWERS. For a USDT pair (BTCUSDT) Alpaca is
 * asked for "BTCUSDT/USD", which is no pair, and Yahoo refuses to answer a
 * USDT request with a USD price, so Finnhub's BINANCE:BTCUSDT is the door that
 * serves 1D / 1W / 1M (and, where no Coinbase product exists — SHIBUSDT —
 * 1m / 5m / 15m / 30m / 1h too). The ladder called those "No bar route".
 *
 * ── ONE ASSUMPTION, STATED ───────────────────────────────────────────────────
 * A door that WOULD answer is taken to answer. Alpaca's equity lane needs a
 * key (503 without one) and any vendor can be down; then the chart falls to
 * the next door and the bars carry THAT door's provenance at ingress. This
 * module describes the route the chart is BUILT to take, which is what a
 * rung's label is a claim about. It does not watch the wire.
 *
 * PURE. No fetch, no React.
 */
import { ALPACA_TF_MAP, toAlpacaCryptoSymbol } from "@/lib/marketData/alpacaBarRoute";
import { coinbaseProduct } from "@/lib/marketData/coinbaseProduct";
import { FH_NATIVE_RES } from "@/lib/marketData/finnhubBarRoute";
import { toFinnhubSym } from "@/lib/finnhubSymbol";
import { cryptoBaseTicker } from "@/lib/marketData/canonicalIdentity";
import { resolveExchangeTimeframe } from "@/lib/marketData/exchangeTimeframes";
import { classifySymbol, equityVendorSkipNoun } from "@/lib/marketData/symbolAssetClass";
import { EXCHANGE_LABEL, parseExchangeSymbol, type Exchange } from "@/lib/exchanges";
import { resolveYahooSymbol } from "@/lib/yahooSymbol";
import { resolveYahooTimeframe } from "@/lib/yahooTimeframes";
import {
  canonRungSpokenName, getTimeframe, isTFId, timeframePendingFounderDecision,
  type CanonRung, type TFId,
} from "@/lib/timeframes";

type BucketUnit = "minute" | "hour" | "day" | "week" | "month";

/** A bar size as a count of a calendar-honest unit (a month is not 30 days). */
export interface BarBucket {
  readonly n: number;
  readonly unit: BucketUnit;
}

export interface ChartBarRoute {
  /** The door that serves: a venue name ("Coinbase"), "Alpaca", "Finnhub" or "Yahoo". */
  readonly vendor: string;
  /** NATIVE = the vendor publishes this bucket. RECONSTRUCTED = WM folds it
   *  from a finer one the vendor does publish. */
  readonly mode: "NATIVE" | "RECONSTRUCTED";
  /** The bucket the bars on the glass actually have. */
  readonly bucket: BarBucket;
  /** RECONSTRUCTED only: the finer bucket it is folded from. */
  readonly from: BarBucket | null;
  /** True only when `bucket` is exactly the timeframe's own bar size. False
   *  for every id whose meaning is pending the Founder's decision. */
  readonly exact: boolean;
  /** Words for the glass: "monthly candles", "4-hour candles rebuilt from hourly bars". */
  readonly served: string;
}

function normalize(b: BarBucket): BarBucket {
  if (b.unit === "minute" && b.n % 60 === 0) return { n: b.n / 60, unit: "hour" };
  return b;
}

function fromSeconds(sec: number): BarBucket {
  if (sec % 604_800 === 0) return { n: sec / 604_800, unit: "week" };
  if (sec % 86_400 === 0) return { n: sec / 86_400, unit: "day" };
  return normalize({ n: sec / 60, unit: "minute" });
}

/** Alpaca's bucket name ("3Min", "1Hour", "1Month") as a bucket. */
function fromAlpaca(name: string): BarBucket | null {
  const m = /^(\d+)(Min|Hour|Day|Week|Month)$/.exec(name);
  if (!m) return null;
  const unit = ({ Min: "minute", Hour: "hour", Day: "day", Week: "week", Month: "month" } as const)[m[2] as "Min"];
  return normalize({ n: Number(m[1]), unit });
}

/** Finnhub's resolution ("1", "60", "D", "W", "M") as a bucket. */
function fromFinnhub(resolution: string): BarBucket | null {
  if (/^\d+$/.test(resolution)) return normalize({ n: Number(resolution), unit: "minute" });
  return ({ D: { n: 1, unit: "day" }, W: { n: 1, unit: "week" }, M: { n: 1, unit: "month" } } as const)[resolution as "D"] ?? null;
}

/** Yahoo's interval string ("1m", "60m", "1d", "1wk", "1mo", "3mo") as a bucket. */
function fromYahoo(interval: string): BarBucket | null {
  const m = /^(\d+)(m|d|wk|mo)$/.exec(interval);
  if (!m) return null;
  const unit = ({ m: "minute", d: "day", wk: "week", mo: "month" } as const)[m[2] as "m"];
  return normalize({ n: Number(m[1]), unit });
}

export function bucketWords(b: BarBucket): string {
  const { n, unit } = b;
  if (n === 1) return ({ minute: "1-minute", hour: "hourly", day: "daily", week: "weekly", month: "monthly" } as const)[unit];
  if (unit === "month") {
    if (n === 3) return "quarterly";
    if (n === 6) return "half-year";
    if (n === 12) return "yearly";
    if (n % 12 === 0) return `${n / 12}-year`;
  }
  return `${n}-${unit}`;
}

/** The timeframe's OWN bar size, or null when its meaning is not decided. */
function ownBucket(tf: TFId): BarBucket | null {
  if (timeframePendingFounderDecision(tf)) return null;
  if (tf === "1M") return { n: 1, unit: "month" };
  return fromSeconds(getTimeframe(tf).candleIntervalSec);
}

function route(tf: string, vendor: string, mode: ChartBarRoute["mode"], bucket: BarBucket, from: BarBucket | null): ChartBarRoute {
  const own = isTFId(tf) ? ownBucket(tf) : null;
  const exact = own !== null && own.n === bucket.n && own.unit === bucket.unit;
  const served = mode === "NATIVE"
    ? `${bucketWords(bucket)} candles`
    : `${bucketWords(bucket)} candles rebuilt from ${bucketWords(from!)} bars`;
  return { vendor, mode, bucket, from, exact, served };
}

/**
 * Does Alpaca's crypto lane have a pair to answer with? Only when the route's
 * own spelling of the pair is the coin's "BASE/USD". Read from the same
 * function the route calls, so the two cannot disagree about the spelling.
 */
export function alpacaCryptoPairResolves(symbol: string): boolean {
  const base = cryptoBaseTicker(symbol);
  return base !== null && toAlpacaCryptoSymbol(symbol.toUpperCase()) === `${base}/USD`;
}

/**
 * Does /api/finnhub serve this id for this symbol, and as what bucket? The
 * route answers 404 when toFinnhubSym is null and UNAVAILABLE (no bars) when
 * FH_NATIVE_RES lacks the id; MainChart does not ask it for futures / forex /
 * spot metals (equityVendorSkipNoun).
 */
export function finnhubBucket(tf: string, sym: string): BarBucket | null {
  if (equityVendorSkipNoun(sym) || toFinnhubSym(sym) === null) return null;
  if (!Object.prototype.hasOwnProperty.call(FH_NATIVE_RES, tf)) return null;
  return fromFinnhub(FH_NATIVE_RES[tf]);
}

/** The venue lane MainChart opens for this symbol, or null. */
function venueOf(symbol: string): Exchange | null {
  const pinned = parseExchangeSymbol(symbol);
  if (pinned) return pinned.exchange;
  return coinbaseProduct(symbol) ? "coinbase" : null;
}

/**
 * The route the chart's history load takes for `timeframe` on `symbol`, and
 * what it serves — or null when no door in the waterfall serves that id for
 * that instrument.
 */
export function chartBarRouteFor(timeframe: string, symbol: string): ChartBarRoute | null {
  const tf = timeframe.trim();
  const sym = symbol.trim();
  if (!tf || !sym) return null;

  // 1. The venue lane.
  const venue = venueOf(sym);
  if (venue) {
    const r = resolveExchangeTimeframe(venue, tf);
    if (r.status === "SUPPORTED") return route(tf, EXCHANGE_LABEL[venue], "NATIVE", fromSeconds(r.seconds), null);
  }

  // 2. Alpaca.
  if (!equityVendorSkipNoun(sym) && Object.prototype.hasOwnProperty.call(ALPACA_TF_MAP, tf)) {
    const crypto = classifySymbol(sym) === "CRYPTO";
    const bucket = fromAlpaca(ALPACA_TF_MAP[tf].timeframe);
    if (bucket && (!crypto || alpacaCryptoPairResolves(sym))) return route(tf, "Alpaca", "NATIVE", bucket, null);
  }

  // 3. Finnhub REST — equities only (fetchFinnhubCandlesDirect skips crypto).
  if (classifySymbol(sym) !== "CRYPTO") {
    const fh = finnhubBucket(tf, sym);
    if (fh) return route(tf, "Finnhub", "NATIVE", fh, null);
  }

  // 4. Yahoo.
  if (resolveYahooSymbol(sym).kind !== "UNRESOLVED") {
    const plan = resolveYahooTimeframe(tf);
    const base = plan ? fromYahoo(plan.interval) : null;
    if (plan && base) {
      if (plan.sourceMode === "native" && plan.multiplier === 1) return route(tf, "Yahoo", "NATIVE", base, null);
      const bucket: BarBucket = plan.calendarMonths
        ? { n: plan.calendarMonths, unit: "month" }
        : base.unit === "month"
          ? { n: base.n * plan.multiplier, unit: "month" }
          : fromSeconds((plan.baseSeconds ?? 0) * plan.multiplier);
      return route(tf, "Yahoo", "RECONSTRUCTED", bucket, base);
    }
  }

  // 5. Finnhub — the last door, crypto included (fetchFinnhubCandles).
  const fh = finnhubBucket(tf, sym);
  if (fh) return route(tf, "Finnhub", "NATIVE", fh, null);
  return null;
}

const NO_ROUTE_REASON = "No bar route serves this instrument at this size.";

/**
 * THE LADDER'S RUNG, FOR THIS SYMBOL. CANON_LADDER is the symbol-free table
 * (what the chart's first equity route does); this is what the glass may say
 * about the instrument actually on it.
 *
 *   route serves the rung's exact bucket natively   → NATIVE_PROVIDER
 *   route REBUILDS the rung's exact bucket          → DERIVED_CANONICAL
 *                                                     (the chip says "derived")
 *   no route, or a bucket of another size           → UNAVAILABLE, with why
 *
 * An UNAVAILABLE rung stays unavailable for every symbol: no route can promote
 * a rung the registry has not built.
 */
export function canonAvailabilityFor(rung: CanonRung, symbol: string): CanonRung {
  if (rung.availability === "UNAVAILABLE") return rung;
  const { id, group, n, unit } = rung;
  const r = chartBarRouteFor(rung.chartTf, symbol);
  if (!r) return { id, group, n, unit, availability: "UNAVAILABLE", reason: NO_ROUTE_REASON };
  if (!r.exact) {
    return { id, group, n, unit, availability: "UNAVAILABLE",
      reason: `Served as ${r.served} here — not ${canonRungSpokenName(rung)}.` };
  }
  return r.mode === "RECONSTRUCTED"
    ? { id, group, n, unit, availability: "DERIVED_CANONICAL", chartTf: rung.chartTf }
    : { id, group, n, unit, availability: "NATIVE_PROVIDER", chartTf: rung.chartTf };
}

/**
 * THE SENTENCE AT THE TOP OF THE LADDER WHEN NO RUNG IS THE CHART'S TIMEFRAME.
 *
 * On 6M / 1Y (drawn UNAVAILABLE) or 45m / 3M / 2Y / 5Y (not rungs at all) the
 * reopened ladder used to mark nothing current, so the chart's timeframe was
 * nowhere on the panel. Marking the dashed 6M rung "current" would dress an
 * unavailable rung as a healthy one; saying it in words does not.
 *
 * The served bucket comes from the route the chart takes (chartBarRouteFor),
 * and "pending the Founder's decision" only for the ids the registry names as
 * pending (timeframePendingFounderDecision). Nothing here chooses a meaning.
 *
 * Returns null when a servable rung in `rungs` already IS the timeframe — the
 * rung's own aria-current says it then, and a second statement would be noise.
 */
export function ladderOnNowSentence(timeframe: string, symbol: string, rungs: readonly CanonRung[]): string | null {
  if (rungs.some(r => r.availability !== "UNAVAILABLE" && r.chartTf === timeframe)) return null;
  const r = chartBarRouteFor(timeframe, symbol);
  const served = r ? `served as ${r.served}` : "no bar route serves it for this instrument";
  const pending = timeframePendingFounderDecision(timeframe) ? " · pending the Founder's decision" : "";
  return `On now: ${timeframe} — ${served}${pending}`;
}


/**
 * THE TIMEFRAME THE BARS ON THE GLASS ACTUALLY ARE (Garden 16 §26, found on
 * serving 2026-09-27). TSLA "6M" and "1Y" are served as Alpaca's MONTHLY
 * candles while their meaning is pending the Founder's decision, and the
 * header read "LAST 6M BAR CLOSE … vs prior 6M bar" over monthly bars. When
 * the route is not exact and its bucket is itself a registry timeframe, that
 * id is returned; otherwise the requested id stands. PURE.
 */
export function servedTimeframeFor(timeframe: string, symbol: string): string {
  const r = chartBarRouteFor(timeframe, symbol);
  if (!r || r.exact) return timeframe;
  const { n, unit } = r.bucket;
  const id = n === 1
    ? ({ month: "1M", week: "1W", day: "1D", hour: "1h", minute: "1m" } as const)[unit]
    : unit === "minute" ? `${n}m` : unit === "hour" ? `${n}h` : null;
  return id && isTFId(id) ? id : timeframe;
}
