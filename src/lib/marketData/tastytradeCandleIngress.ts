/**
 * FIFTH INGRESS — TASTYTRADE CANDLES INTO THE CANONICALBAR ARTERY (2026-10-06).
 *
 * Serving NQ1! (the Founder's instrument): `select=zone` answered
 * `zone:NONE_AVAILABLE` and `marketZones 0` while Market Structure drew twelve
 * pivots. The zone owner (selectStructureZoneObjects) needs each pivot's bar
 * IDENTITY — a MarketObject's `birthBarId` must resolve back to the exact
 * admitted bar — and every other candle door (Yahoo, the crypto venues,
 * Alpaca, Finnhub) mints identities at its ingress. tastytrade's door, the one
 * futures come through, published `identities: []`. So the futures chart had
 * candles and no past an object could be born on.
 *
 * The cure is at the owner, by the same rule as every other ingress: one
 * CanonicalBar per bar, `barId = symbolId | timeframe | open time | epoch`
 * (mintBarId), geometry admitted by admitBar. The zone builder is untouched —
 * it still refuses a pivot with no identity.
 *
 * symbolId is the CONTRACT tastytrade served — `TASTYTRADE:/NQZ26:XCME` — not
 * the continuous chart symbol. The bars are that contract's own bars (see
 * adapters/tastytradeCandles.ts); after a roll the new contract's bars are a
 * different past, and their identities say so.
 *
 * sessionId is SESSION_UNKNOWN: the snapshot carries no session field and this
 * ingress does not model the CME calendar — an admission, not a guess.
 * fidelity is INDICATIVE: the chart's bars are not the price an order routes
 * on. provenance is REST_BACKFILL: a snapshot of the contract's history asked
 * for after the fact (the live forming bar is folded elsewhere). PURE.
 */
import {
  BAR_PROVENANCES,
  SESSION_UNKNOWN,
  admitBar,
  canonicalBarIdentity,
  mintBarId,
  type CanonicalBar,
  type CanonicalBarIdentity,
  type LegacyOhlcvTuple,
} from "./canonicalBar";
import { MARKET_FIDELITIES } from "./marketFidelityAlgebra";

export const TASTYTRADE_BAR_SOURCE = "tastytrade";

/** `TASTYTRADE:/NQZ26:XCME` — the contract's streamer symbol under the source prefix; "" for a blank streamer. */
export function tastytradeSymbolId(streamer: string): string {
  const s = streamer.trim().toUpperCase();
  return s === "" ? "" : `TASTYTRADE:${s}`;
}

export interface TastytradeCandleIngressResult {
  readonly bars: readonly CanonicalBar[];
  readonly identities: readonly CanonicalBarIdentity[];
  /** Bars that could not be admitted (no identity, broken geometry) — counted, not drawn as truth. */
  readonly refused: number;
}

export function ingestTastytradeCandles(input: {
  readonly streamer: string;
  readonly timeframe: string;
  /** The adapter's bars, epoch SECONDS, oldest first. */
  readonly tuples: readonly LegacyOhlcvTuple[];
  readonly receivedAt: number;
  readonly truthEpoch?: number;
}): TastytradeCandleIngressResult {
  const truthEpoch = input.truthEpoch ?? 0;
  const symbolId = tastytradeSymbolId(input.streamer);
  const held = new Map<number, CanonicalBar>();
  let refused = 0;
  for (const t of input.tuples) {
    if (!Number.isFinite(t.time)) { refused++; continue; }
    const asOf = t.time * 1000;
    const barId = mintBarId({ symbolId, timeframe: input.timeframe, asOf, truthEpoch });
    if (barId === null) { refused++; continue; }
    const incoming: CanonicalBar = {
      barId,
      symbolId,
      sessionId: SESSION_UNKNOWN,
      timeframe: input.timeframe,
      open: t.open,
      high: t.high,
      low: t.low,
      close: t.close,
      volume: t.volume,
      asOf,
      receivedAt: input.receivedAt,
      fidelity: MARKET_FIDELITIES.INDICATIVE,
      source: TASTYTRADE_BAR_SOURCE,
      provenance: BAR_PROVENANCES.REST_BACKFILL,
      truthEpoch,
    };
    const verdict = admitBar(held.get(asOf) ?? null, incoming);
    if (!verdict.admitted) { refused++; continue; }
    held.set(asOf, verdict.bar);
  }
  const bars = [...held.values()].sort((a, b) => a.asOf - b.asOf);
  return { bars, identities: bars.map(canonicalBarIdentity), refused };
}
