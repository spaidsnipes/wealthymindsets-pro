/**
 * THE THIRD INGRESS THAT SPEAKS CanonicalBar (2026-09-18).
 *
 * `/api/alpaca` was chosen over `/api/memecoin` and `/api/finnhub` on evidence.
 * `/api/memecoin` is classified DARK in `apiEndpointsHaveConsumers.test.ts` —
 * zero callers — and migrating a dark route would grow `REQUIRED_ARTERY_EDGES`
 * (a ratchet that may only grow) with an edge no live request ever traverses.
 * That is the "a rename is not a migration" trap wearing a new costume.
 * `/api/alpaca` is what `MainChart` actually draws, which means every defect
 * below is a defect a trader is looking at right now.
 *
 * ── THE FABRICATION THAT SURVIVED TWO FIXES OF ITS OWN FAMILY ────────────────
 *
 * The route's own comments record the `?? fallback` fabrication being killed
 * TWICE in the quote branch: `prevClose = json?.prevDailyBar?.c ?? price` (which
 * made `change` exactly zero out of missing data) and `changePct: ... : 0`. Both
 * were replaced with null, and the reasoning was written down.
 *
 * The candles branch kept `volume: b.v ?? 0`.
 *
 * It is the same bug. "Zero shares traded in this bar" is not an absence, it is
 * a CLAIM, and it is the single most load-bearing input to every volume profile,
 * delta and absorption tool in this repo. A fabricated zero does not throw and
 * does not look wrong on a price chart — it silently drills a hole through the
 * VP. Here the volume is passed through untouched and `checkBarGeometry` refuses
 * a bar whose volume is not a finite number, so an absent volume becomes a
 * COUNTED, DISCLOSED refusal instead of a fake print.
 *
 * Measured before changing behaviour, on production: TSLA 15m returned 300 bars
 * with zero absent volumes, and BTC 15m returned one genuine `0` (crypto volumes
 * are fractional; `checkBarGeometry` refuses only NEGATIVE and NON-FINITE, so a
 * real zero-volume bar still draws). The `?? 0` was fabricating for a case that
 * does not occur while corrupting the profile if it ever did.
 *
 * ── THE TIMEFRAME THAT LIES, MEASURED LIVE ───────────────────────────────────
 *
 * `ALPACA_TF_MAP` maps SEVEN request spellings — "M", "1M", "3M", "6M", "1Y",
 * "3Y", "5Y" — onto the single Alpaca bucket `1Month`, because 1Month is the
 * largest bucket Alpaca publishes. The route then echoes the REQUEST back as
 * `tf`. Probed on production: `?tf=6M` returned 75 bars spaced 30.4 days apart.
 * Those are monthly candles labelled "6M", and a consumer reading `tf` believes
 * it holds six-month candles.
 *
 * `/api/yahoo` already publishes `requestedTf` AND `returnedTf` for exactly this
 * reason. This ingress makes the distinction structural rather than optional:
 * the canonical `timeframe` is derived from the RESOLVED bucket and never from
 * the request. That is also what stops a collision — with the request in the id,
 * one physical monthly bar would mint SEVEN different `barId`s and the same bar
 * would be held seven times.
 *
 * ── SESSION VARIES PER REQUEST, FOR A REAL REASON ────────────────────────────
 *
 * This is the first ingress whose `sessionId` is not a constant, and it is not a
 * guess either. `/v1beta3/crypto/us` is a continuous venue: no open, no close,
 * no auction — `SESSION_CONTINUOUS`, the same true statement `/api/exchange`
 * makes. `/v2/stocks` bars carry no session marking at all, so the honest answer
 * there is `SESSION_UNKNOWN`. Inventing RTH from a timestamp would be the exact
 * kind of invention the artery exists to prevent.
 *
 * ── WHY NEITHER HALF IS EXECUTABLE, FOR TWO DIFFERENT REASONS ────────────────
 *
 * Crypto: no execution adapter routes through this data proxy — the same reason
 * `/api/exchange` withholds it, and the one `SESSION_CONTINUOUS` does not touch.
 *
 * Stocks: `feed=iex`. IEX is a real tape and a PARTIAL one — a few per cent of
 * US consolidated volume. The route says so itself ("a real (if partial) tape").
 * An IEX bar's `v` is IEX volume, not national volume, so it is not the price or
 * the size an order would meet. INDICATIVE is not a hedge here, it is the
 * measurement.
 */

import {
  BAR_PROVENANCES,
  SESSION_CONTINUOUS,
  SESSION_UNKNOWN,
  admitBar,
  mintBarId,
  type CanonicalBar,
  type LegacyOhlcvTuple,
} from "./canonicalBar";
import { MARKET_FIDELITIES } from "./marketFidelityAlgebra";

/** Which Alpaca data family a request was routed to. Decides the session fact. */
export type AlpacaAssetClass = "STOCK" | "CRYPTO";

/**
 * The instrument identity for an Alpaca symbol.
 *
 * The `ALPACA:` prefix is not decoration and this is now demonstrable rather
 * than hypothetical: `/api/exchange` already mints `COINBASE:BTC` into the same
 * artery. Alpaca's BTC and Coinbase's BTC are two order books with two prices.
 * Unprefixed, both would mint the identical `barId` for the same instant and
 * `admitBar` would refuse the second at equal truthEpoch as a redelivery —
 * silently discarding a real bar from a real venue. This is the first place
 * where TWO INGRESSES could have collided with EACH OTHER.
 *
 * Returns "" for a blank symbol, for the reason `exchangeSymbolId` documents:
 * the naive form yields "ALPACA:", which is not blank, so the prefix would
 * smuggle emptiness past the very check `mintBarId` exists to perform.
 */
export function alpacaSymbolId(sym: string): string {
  const s = sym.trim().toUpperCase();
  if (s === "") return "";
  return `ALPACA:${s}`;
}

/**
 * The session fact for an Alpaca data family. Two different KINDS of statement.
 *
 * CRYPTO → `SESSION_CONTINUOUS`: there are no sessions on this venue.
 * STOCK  → `SESSION_UNKNOWN`: there ARE sessions and the bar does not say which.
 *
 * Deriving RTH from the timestamp instead would be inventing a fact, and
 * `isSessionKnown` would then report confidence the feed never supplied.
 */
export function alpacaSessionModel(assetClass: AlpacaAssetClass): string {
  return assetClass === "CRYPTO" ? SESSION_CONTINUOUS : SESSION_UNKNOWN;
}

/**
 * The canonical timeframe for an Alpaca bucket — NEVER for a request.
 *
 * Seven request spellings collapse onto `1Month` upstream. Keying identity on
 * the request would mint seven ids for one bar; keying on the bucket mints one.
 * Returns "" for a bucket this map does not know, which routes the bar to a
 * counted refusal rather than letting it inherit some neighbouring resolution —
 * the "Monthly showed minute bars" family the route already fought twice.
 */
const BUCKET_TO_CANONICAL: Record<string, string> = {
  "1Min": "1m", "2Min": "2m", "3Min": "3m", "5Min": "5m",
  "10Min": "10m", "15Min": "15m", "30Min": "30m",
  "1Hour": "1h", "2Hour": "2h", "4Hour": "4h",
  "1Day": "1D", "1Week": "1W", "1Month": "1M",
};

export function canonicalTimeframeForAlpacaBucket(bucket: string): string {
  return BUCKET_TO_CANONICAL[bucket.trim()] ?? "";
}

/**
 * One row exactly as Alpaca sends it. Every OHLCV field is OPTIONAL and that is
 * the point — `?? 0` was only reachable because the shape pretended otherwise.
 */
export interface AlpacaBarRow {
  /** RFC3339 instant, e.g. "2026-09-18T14:30:00Z". */
  readonly t?: string;
  readonly o?: number;
  readonly h?: number;
  readonly l?: number;
  readonly c?: number;
  readonly v?: number;
}

export interface AlpacaCandleIngressInput {
  readonly sym: string;
  readonly assetClass: AlpacaAssetClass;
  /** The RESOLVED Alpaca bucket ("15Min", "1Month"), never the request ("6M"). */
  readonly bucket: string;
  readonly rows: readonly AlpacaBarRow[];
  /** When WE heard, epoch ms. Never an ordering authority. */
  readonly receivedAt: number;
  readonly truthEpoch?: number;
}

export interface AlpacaCandleRefusal {
  /** The instant as it arrived, so a refusal can be matched back to the feed. */
  readonly at: string;
  readonly reason: string;
}

export interface AlpacaCandleIngressResult {
  readonly bars: readonly CanonicalBar[];
  readonly refusals: readonly AlpacaCandleRefusal[];
  /** The canonical timeframe actually returned. "" if the bucket was unknown. */
  readonly timeframe: string;
}

/**
 * Narrow back to the six numbers the chart eats, in epoch SECONDS — the unit
 * this route has always published. `toLegacyTuple` is deliberately not used: it
 * copies `asOf` (MILLISECONDS) straight into `time` (SECONDS), placing every bar
 * ~50,000 years in the future with no type error. See `canonicalBar.ts`.
 */
export function toLegacySecondsTuple(bar: CanonicalBar): LegacyOhlcvTuple {
  return {
    time: Math.floor(bar.asOf / 1000),
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  };
}

/**
 * Mint canonical bars from one Alpaca bars response.
 *
 * Ordering is by `asOf` and only by `asOf`. The route fetches `sort=desc` and
 * calls `.reverse()` on BOTH branches to get chronological order — two hand
 * corrections of the provider's direction, either of which could be dropped in
 * a refactor and neither of which throws when it is. Sorting here means a
 * time-reversed series can no longer reach a chart.
 */
export function ingestAlpacaCandles(
  input: AlpacaCandleIngressInput,
): AlpacaCandleIngressResult {
  const truthEpoch = input.truthEpoch ?? 0;
  const symbolId = alpacaSymbolId(input.sym);
  const sessionId = alpacaSessionModel(input.assetClass);
  const timeframe = canonicalTimeframeForAlpacaBucket(input.bucket);

  const held = new Map<number, CanonicalBar>();
  const order: number[] = [];
  const refusals: AlpacaCandleRefusal[] = [];

  for (const row of input.rows) {
    const at = row.t ?? "";
    // `new Date(undefined).getTime()` is NaN and `Math.floor(NaN)` is NaN, so
    // the old mapping emitted a NaN timestamp with no filter and no throw.
    const asOf = at === "" ? Number.NaN : Date.parse(at);
    if (!Number.isFinite(asOf)) {
      refusals.push({
        at,
        reason: "Bar timestamp is missing or unparseable — it cannot be placed on any axis.",
      });
      continue;
    }

    const barId = mintBarId({ symbolId, timeframe, asOf, truthEpoch });
    if (barId === null) {
      refusals.push({
        at,
        reason: "A bar with no symbol or no resolved timeframe has no identity to mint.",
      });
      continue;
    }

    const incoming: CanonicalBar = {
      barId,
      symbolId,
      sessionId,
      timeframe,
      // Passed through UNTOUCHED. No `?? 0` on any of the five: an absent
      // number must reach checkBarGeometry and be refused, not be invented.
      open: row.o as number,
      high: row.h as number,
      low: row.l as number,
      close: row.c as number,
      volume: row.v as number,
      asOf,
      receivedAt: input.receivedAt,
      // Crypto: no execution adapter routes through this data proxy.
      // Stocks: feed=iex is a partial tape, so this is not the size an order
      // would meet. Two different reasons, one honest answer.
      fidelity: MARKET_FIDELITIES.INDICATIVE,
      source: "alpaca",
      // Alpaca publishes every bucket natively; this route never folds a finer
      // interval into a coarser one, so DERIVED is not reachable here.
      provenance: BAR_PROVENANCES.REST_BACKFILL,
      truthEpoch,
    };

    const verdict = admitBar(held.get(asOf) ?? null, incoming);
    if (!verdict.admitted) {
      refusals.push({ at, reason: verdict.reason });
      continue;
    }
    if (!held.has(asOf)) order.push(asOf);
    held.set(asOf, verdict.bar);
  }

  order.sort((a, b) => a - b);

  return {
    bars: order.map(asOf => held.get(asOf) as CanonicalBar),
    refusals,
    timeframe,
  };
}
