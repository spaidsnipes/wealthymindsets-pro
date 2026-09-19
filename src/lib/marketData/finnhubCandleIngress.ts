/**
 * THE FOURTH INGRESS THAT SPEAKS CanonicalBar (2026-09-18).
 *
 * `/api/finnhub` is what `MainChart` reaches for on the real-time US equity
 * lane, so every defect below is one a trader is looking at right now. It was
 * taken ahead of `/api/memecoin` for the reason recorded in
 * `alpacaCandleIngress.ts`: memecoin is classified DARK in
 * `apiEndpointsHaveConsumers.test.ts` — zero callers — and growing a may-only-
 * grow ratchet with an edge no live request traverses is adoption theater.
 *
 * ── THE FABRICATION THAT IS WORSE THAN `?? 0` ────────────────────────────────
 *
 * The first three ingresses each carried a fabricated VALUE (`volume ?? 0`,
 * `prevClose ?? price`). This route carries a fabricated GEOMETRY:
 *
 *     high: h ?? Math.max(o, c),
 *     low:  l ?? Math.min(o, c),
 *
 * A bar with no high is not a bar whose high happens to equal the body. That
 * expression MANUFACTURES A CANDLE WITH NO WICK, and a wick is precisely the
 * thing an order-flow reader is looking at: rejection, absorption, failed
 * auction, stop runs. It does not throw, it does not look broken, and it is
 * indistinguishable on screen from a real wickless print. Every sweep, spring
 * and upthrust detector in this repo would read it as a true observation.
 *
 * > A refused bar is a visible gap the trader can be told about.
 * > A repaired bar is a lie with a timestamp.
 *
 * Here the four prices and the volume are passed through UNTOUCHED and
 * `checkBarGeometry` refuses a bar whose numbers are not finite, so an absent
 * high becomes a COUNTED, DISCLOSED refusal instead of an invented candle.
 * `volume: json.v?.[i] ?? 0` — the same family, third route — goes with it.
 *
 * ── THE SILENT DROP ──────────────────────────────────────────────────────────
 *
 *     if (o == null || c == null) continue;
 *
 * Two of six fields checked, and the bar leaves with no count and no record.
 * A silently dropped bar is an INVISIBLE gap: the chart simply has fewer
 * candles than the market printed, and nothing anywhere says so. Every rejected
 * row here is returned in `refusals` with the timestamp as it arrived.
 *
 * ── THE UNIT TRAP, IN BOTH DIRECTIONS ────────────────────────────────────────
 *
 * This is the first ingress whose PROVIDER speaks epoch SECONDS. `CanonicalBar`
 * is epoch MILLISECONDS and `LegacyOhlcvTuple.time` is epoch SECONDS, and all
 * three are a bare `number`. So the conversion happens twice, explicitly, in
 * opposite directions, and is stated in the code rather than in anyone's head.
 * Getting it wrong in either direction places every bar ~50,000 years away or
 * in 1970 with no type error and no throw.
 *
 * ── IDENTITY COMES FROM THE INSTRUMENT ANSWERED, NOT THE ONE ASKED FOR ───────
 *
 * `toFinnhubSym` resolves a request naming USD ("BTCUSD") to `BINANCE:BTCUSDT`.
 * USDT is not USD; that is a real quote-currency substitution, and the route
 * already discloses it as `providerSymbol`. Minting identity from the REQUEST
 * would put a Binance USDT bar on the books under the name of a USD
 * instrument — the label and the number with different owners.
 *
 * So identity is minted from the RESOLVED provider symbol. When that symbol is
 * already venue-qualified (`BINANCE:BTCUSDT`) it is used as-is, because the
 * venue is the thing that owns an order book and `BINANCE` is a truer statement
 * than the name of the vendor we happened to ask. When it is not (a plain US
 * equity ticker) it is prefixed `FINNHUB:`, for the collision reason
 * `exchangeCandleIngress` and `alpacaCandleIngress` both document.
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

/**
 * The instrument identity for a RESOLVED Finnhub provider symbol.
 *
 * Takes the provider symbol, never the request: "BTCUSD" is answered from
 * "BINANCE:BTCUSDT" and the bar belongs to the instrument that was answered.
 *
 * Returns "" for blank, for the reason `exchangeSymbolId` documents: the naive
 * prefixed form yields "FINNHUB:", which is NOT blank, so the prefix would
 * smuggle emptiness past the very check `mintBarId` exists to perform.
 */
export function finnhubSymbolId(providerSym: string): string {
  const s = providerSym.trim().toUpperCase();
  if (s === "") return "";
  // Already venue-qualified by `toFinnhubSym` ("BINANCE:BTCUSDT"). The venue
  // owns the book; re-prefixing with the vendor name would claim Finnhub is
  // the market. A bare colon is not a qualification.
  if (s.includes(":")) {
    const [venue, rest] = [s.slice(0, s.indexOf(":")), s.slice(s.indexOf(":") + 1)];
    return venue === "" || rest === "" ? "" : s;
  }
  return `FINNHUB:${s}`;
}

/**
 * The session fact for a resolved Finnhub symbol. Two different KINDS of
 * statement, decided by the venue actually answering.
 *
 * Binance → `SESSION_CONTINUOUS`: there are no sessions on that venue.
 * US equity → `SESSION_UNKNOWN`: there ARE sessions and the candle payload
 * carries no marking at all, so deriving RTH from the timestamp would be
 * inventing a fact `isSessionKnown` would then report as confidence.
 */
export function finnhubSessionModel(providerSym: string): string {
  return providerSym.trim().toUpperCase().startsWith("BINANCE:")
    ? SESSION_CONTINUOUS
    : SESSION_UNKNOWN;
}

/**
 * The canonical timeframe for a Finnhub RESOLUTION — never for a request.
 *
 * The route's `FH_NATIVE_RES` map is already fail-closed (WM-CHART-P0-03: the
 * "1-minute bars labelled 2m" defect), so request and resolution agree today.
 * Deriving from the resolution anyway keeps that true structurally rather than
 * by the continued good behaviour of a second map, and is the same rule the
 * Alpaca ingress needed for real when seven spellings collapsed onto `1Month`.
 *
 * Returns "" for an unknown resolution, which routes the bar to a counted
 * refusal rather than letting it inherit some neighbouring bar size.
 */
const RESOLUTION_TO_CANONICAL: Record<string, string> = {
  "1": "1m", "5": "5m", "15": "15m", "30": "30m", "60": "1h",
  D: "1D", W: "1W", M: "1M",
};

export function canonicalTimeframeForFinnhubResolution(resolution: string): string {
  return RESOLUTION_TO_CANONICAL[resolution.trim()] ?? "";
}

/**
 * One Finnhub candle response, exactly as it arrives: COLUMNAR parallel arrays.
 *
 * Every column is optional and may be SHORTER than `t`, and that is the point.
 * Reading `json.h?.[i]` for an `i` past the end of `h` yields `undefined`, which
 * the old mapping then replaced with a manufactured wick. A short column is a
 * misaligned response, not a set of bars with missing highs.
 */
export interface FinnhubCandleColumns {
  /** Epoch SECONDS, one per bar. The provider's unit, not ours. */
  readonly t?: readonly (number | null | undefined)[];
  readonly o?: readonly (number | null | undefined)[];
  readonly h?: readonly (number | null | undefined)[];
  readonly l?: readonly (number | null | undefined)[];
  readonly c?: readonly (number | null | undefined)[];
  readonly v?: readonly (number | null | undefined)[];
}

export interface FinnhubCandleIngressInput {
  /** The RESOLVED provider symbol ("BINANCE:BTCUSDT"), never the request. */
  readonly providerSym: string;
  /** The RESOLVED Finnhub resolution ("1", "D"), never the request ("1m"). */
  readonly resolution: string;
  readonly columns: FinnhubCandleColumns;
  /** When WE heard, epoch MILLISECONDS. Never an ordering authority. */
  readonly receivedAt: number;
  readonly truthEpoch?: number;
}

export interface FinnhubCandleRefusal {
  /** The instant as it arrived, in the PROVIDER's unit (seconds), or null. */
  readonly at: number | null;
  readonly reason: string;
}

export interface FinnhubCandleIngressResult {
  readonly bars: readonly CanonicalBar[];
  readonly refusals: readonly FinnhubCandleRefusal[];
  /** The canonical timeframe actually returned. "" if the resolution was unknown. */
  readonly timeframe: string;
}

/**
 * Narrow back to the six numbers the chart eats, in epoch SECONDS — the unit
 * this route has always published, and the unit Finnhub itself sent.
 *
 * `toLegacyTuple` is deliberately not used: it copies `asOf` (MILLISECONDS)
 * straight into `time` (SECONDS), placing every bar ~50,000 years in the future
 * with no type error and no throw. See `canonicalBar.ts`.
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
 * Mint canonical bars from one Finnhub columnar candle response.
 *
 * Ordering is by `asOf` and only by `asOf`, so a provider that ever returned a
 * non-monotonic `t` column could no longer reach a chart time-reversed.
 */
export function ingestFinnhubCandles(
  input: FinnhubCandleIngressInput,
): FinnhubCandleIngressResult {
  const truthEpoch = input.truthEpoch ?? 0;
  const symbolId = finnhubSymbolId(input.providerSym);
  const sessionId = finnhubSessionModel(input.providerSym);
  const timeframe = canonicalTimeframeForFinnhubResolution(input.resolution);

  const col = input.columns;
  const t = col.t ?? [];

  const held = new Map<number, CanonicalBar>();
  const order: number[] = [];
  const refusals: FinnhubCandleRefusal[] = [];

  for (let i = 0; i < t.length; i++) {
    const rawT = t[i];
    const at = typeof rawT === "number" ? rawT : null;
    if (at === null || !Number.isFinite(at)) {
      refusals.push({
        at,
        reason: "Bar timestamp is missing or not a finite number — it cannot be placed on any axis.",
      });
      continue;
    }

    // SECONDS IN. The provider's unit is seconds; CanonicalBar.asOf is
    // milliseconds. Stated here rather than assumed anywhere downstream.
    const asOf = at * 1000;

    const barId = mintBarId({ symbolId, timeframe, asOf, truthEpoch });
    if (barId === null) {
      refusals.push({
        at,
        reason: "A bar with no symbol or no resolved timeframe has no identity to mint.",
      });
      continue;
    }

    // A column SHORTER than `t` is a misaligned response, not a bar with a
    // missing field. Either way the number is absent, and an absent number
    // must reach checkBarGeometry and be refused — never repaired into
    // `Math.max(o, c)`, which draws a candle with no wick.
    const incoming: CanonicalBar = {
      barId,
      symbolId,
      sessionId,
      timeframe,
      open: col.o?.[i] as number,
      high: col.h?.[i] as number,
      low: col.l?.[i] as number,
      close: col.c?.[i] as number,
      volume: col.v?.[i] as number,
      asOf,
      receivedAt: input.receivedAt,
      // Finnhub is a real-time vendor feed, not an execution venue, and no
      // execution adapter routes through this proxy. Real-time is a statement
      // about LATENCY; EXECUTABLE is a statement about what an order would
      // meet, and nobody here can make the second one.
      fidelity: MARKET_FIDELITIES.INDICATIVE,
      source: "finnhub",
      // The route's resolution map is fail-closed to NATIVE buckets only, so
      // this lane never folds a finer interval into a coarser one and DERIVED
      // is not reachable here.
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
