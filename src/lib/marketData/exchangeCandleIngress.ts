/**
 * THE SECOND INGRESS THAT SPEAKS CanonicalBar (2026-09-18).
 *
 * `/api/exchange` normalises FIVE public crypto venues — Coinbase, Kraken,
 * Bitstamp, Binance.US, Gemini — into one six-number tuple. It was chosen as
 * the second migration for a reason the first did not have: it is the place in
 * this repo where an UNCHECKED BAR IS MOST LIKELY TO BE WRONG, and where being
 * wrong is hardest to see.
 *
 * ── THE LATENT DEFECT THIS INGRESS IS AIMED AT ───────────────────────────────
 *
 * The five venues do not agree on array order. Coinbase returns
 * `[time, low, high, open, close, volume]`. Kraken returns
 * `[time, open, high, low, close, vwap, volume, count]` — low and high in the
 * opposite positions, and volume at index SIX rather than five. The route maps
 * each by hand, and until now nothing downstream checked the result.
 *
 * A transposed index does not throw, does not fail a type check, and does not
 * produce an empty chart. It produces a full chart of inside-out candles that
 * looks like a rendering bug, on one venue only, and only for whoever happened
 * to select it. `checkBarGeometry` refuses that bar and says why, which turns a
 * silent five-way normalisation hazard into a counted, reportable refusal.
 *
 * ── SESSION: A DIFFERENT ANSWER, NOT A BETTER GUESS ──────────────────────────
 *
 * The Yahoo ingress mints `SESSION_UNKNOWN` because Yahoo withholds the
 * session. These bars mint `SESSION_CONTINUOUS`, which is not an upgrade of
 * "unknown" — it is a different claim. A crypto spot book has no open, no
 * close, no auction and no pre/post, so the session question has a real answer
 * and the answer is "there are none." See that constant's note for why this
 * loosens `admitBar`'s EXECUTABLE guard, and why these bars are still never
 * EXECUTABLE: no execution adapter routes through a public REST proxy, so
 * nobody can say this price is the one an order would meet.
 *
 * ── WHY symbolId CARRIES THE VENUE ───────────────────────────────────────────
 *
 * `mintBarId` keys on `symbolId|timeframe|asOf|epoch`. If these bars called
 * themselves "BTC", then Coinbase's 15:00 BTC bar and Kraken's 15:00 BTC bar
 * would mint THE SAME ID, and `admitBar` would refuse the second as a duplicate
 * at equal truthEpoch — silently discarding a real bar from a real venue as
 * though it were a redelivery.
 *
 * That would be the wrong fix applied to a real fact: they genuinely ARE
 * different instruments. Two exchanges are two order books, with two prices,
 * two volumes and two last trades. So the instrument identity minted here is
 * `COINBASE:BTC`, and the collision stops being possible rather than being
 * detected after the fact.
 *
 * ── PROVENANCE IS UNIFORMLY REST_BACKFILL, AND THAT IS MEASURED ──────────────
 *
 * Every one of these bars is `fetch`ed over REST; none arrives on a socket. And
 * unlike Yahoo, NONE is derived: `resolveExchangeTimeframe` REFUSES a timeframe
 * a venue does not natively publish (returning `UNAVAILABLE` with the supported
 * list) rather than folding a finer interval into it. So there is no honest
 * DERIVED case here, and this module does not offer one — a provenance switch
 * with an unreachable branch is an invitation to reach it.
 */

import {
  BAR_PROVENANCES,
  SESSION_CONTINUOUS,
  admitBar,
  mintBarId,
  type CanonicalBar,
  type LegacyOhlcvTuple,
} from "./canonicalBar";
import { MARKET_FIDELITIES } from "./marketFidelityAlgebra";
import type { PublicCryptoExchange } from "./exchangeTimeframes";

/**
 * The instrument identity for a coin ON A GIVEN VENUE.
 *
 * Exported and tested on its own because the venue prefix is the load-bearing
 * part: without it two venues' bars collide in `mintBarId`. See the header.
 *
 * Returns "" for a blank coin, ON PURPOSE. The naive form returns "COINBASE:",
 * which is not blank, so `mintBarId` would happily mint an identity for an
 * instrument that does not exist — the venue prefix would be smuggling
 * emptiness past the exact check written to catch it. Returning "" hands the
 * refusal back to `mintBarId` where it belongs, rather than adding a second
 * place that decides what counts as a symbol.
 */
export function exchangeSymbolId(exchange: PublicCryptoExchange, coin: string): string {
  const c = coin.trim().toUpperCase();
  if (c === "") return "";
  return `${exchange.toUpperCase()}:${c}`;
}

export interface ExchangeCandleIngressInput {
  readonly exchange: PublicCryptoExchange;
  readonly coin: string;
  /** The RESOLVED timeframe the venue natively publishes, never the request. */
  readonly timeframe: string;
  /** Normalised tuples. `time` is epoch SECONDS. */
  readonly tuples: readonly LegacyOhlcvTuple[];
  /** When WE heard, epoch ms. Never an ordering authority. */
  readonly receivedAt: number;
  readonly truthEpoch?: number;
}

export interface ExchangeCandleRefusal {
  /** Epoch seconds, as it arrived — so a refusal can be matched to the feed. */
  readonly atSeconds: number;
  readonly reason: string;
}

export interface ExchangeCandleIngressResult {
  readonly bars: readonly CanonicalBar[];
  /** Kept, not swallowed. A counted gap can be disclosed; a dropped one reads
   *  as a quiet market — and on a 24/7 venue a quiet market is always a lie. */
  readonly refusals: readonly ExchangeCandleRefusal[];
}

/**
 * Narrow back to the six numbers the chart renderer eats, converting the
 * canonical millisecond clock to the epoch SECONDS this route has always
 * published. `toLegacyTuple` is deliberately not used — it copies `asOf`
 * straight into `time`, which would place every bar here about fifty thousand
 * years in the future without a single type error. See `canonicalBar.ts`.
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
 * Mint canonical bars from one venue's normalised candle array.
 *
 * Ordering is by `asOf` and only by `asOf`. This matters more here than it did
 * for Yahoo: the five venues disagree about direction too — Coinbase and Gemini
 * return NEWEST-FIRST while Kraken, Bitstamp and Binance return oldest-first —
 * and the route corrects that per-venue by hand. Sorting here means a missed
 * `.sort()` in one of those five branches can no longer reach a chart as a
 * time-reversed series.
 */
export function ingestExchangeCandles(
  input: ExchangeCandleIngressInput,
): ExchangeCandleIngressResult {
  const truthEpoch = input.truthEpoch ?? 0;
  const symbolId = exchangeSymbolId(input.exchange, input.coin);

  const held = new Map<number, CanonicalBar>();
  const order: number[] = [];
  const refusals: ExchangeCandleRefusal[] = [];

  for (const tuple of input.tuples) {
    const atSeconds = tuple.time;
    if (!Number.isFinite(atSeconds)) {
      refusals.push({
        atSeconds,
        reason: "Bar timestamp is not a finite number — it cannot be placed on any axis.",
      });
      continue;
    }
    const asOf = atSeconds * 1000;

    const barId = mintBarId({ symbolId, timeframe: input.timeframe, asOf, truthEpoch });
    if (barId === null) {
      refusals.push({
        atSeconds,
        reason: "A bar with no symbol or no timeframe has no identity to mint.",
      });
      continue;
    }

    const incoming: CanonicalBar = {
      barId,
      symbolId,
      // Not ignorance. These venues have no sessions to belong to.
      sessionId: SESSION_CONTINUOUS,
      timeframe: input.timeframe,
      open: tuple.open,
      high: tuple.high,
      low: tuple.low,
      close: tuple.close,
      volume: tuple.volume,
      asOf,
      receivedAt: input.receivedAt,
      // Never EXECUTABLE — not because the session is unknown (it is not), but
      // because no execution adapter routes through this public REST proxy.
      fidelity: MARKET_FIDELITIES.INDICATIVE,
      source: input.exchange,
      // Always REST_BACKFILL: fetched, never streamed, and never folded —
      // resolveExchangeTimeframe refuses unsupported timeframes outright.
      provenance: BAR_PROVENANCES.REST_BACKFILL,
      truthEpoch,
    };

    const verdict = admitBar(held.get(asOf) ?? null, incoming);
    if (!verdict.admitted) {
      refusals.push({ atSeconds, reason: verdict.reason });
      continue;
    }
    if (!held.has(asOf)) order.push(asOf);
    held.set(asOf, verdict.bar);
  }

  order.sort((a, b) => a - b);

  return {
    bars: order.map(asOf => held.get(asOf) as CanonicalBar),
    refusals,
  };
}
