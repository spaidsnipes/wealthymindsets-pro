/**
 * THE FIRST INGRESS THAT SPEAKS CanonicalBar (2026-09-18).
 *
 * `canonicalBar.ts` had ZERO production consumers for the entire life of the
 * M8 census. Twenty-two private bar shapes were collapsed to four and that
 * number did not move, because renaming duplicates onto one legacy tuple moves
 * no ingress closer to the artery. This module is the first thing that moves it.
 *
 * ── WHY THIS INGRESS AND NOT ANOTHER ─────────────────────────────────────────
 *
 * Because `yahooTimeframes.ts` ALREADY KNOWS the fact the artery was built to
 * carry and has had nowhere to put it. Eight of its eighteen plans are
 * `sourceMode: "reconstructed"`: the bars handed back for 3m, 10m, 2h, 4h, 6M,
 * 1Y, 3Y and 5Y were FOLDED FROM A FINER INTERVAL and never printed at the
 * requested timeframe on any exchange. `BAR_PROVENANCES.DERIVED` exists for
 * exactly that sentence. So this migration fills canonical fields TRUTHFULLY
 * rather than by invention, which is the only kind worth doing — every other
 * candidate ingress would have had to guess at least one field.
 *
 * ── WHAT THIS INGRESS HONESTLY CANNOT SAY ────────────────────────────────────
 *
 * `sessionId` is `SESSION_UNKNOWN`, and that is not a TODO. Yahoo's chart
 * endpoint returns a timestamp and five numbers; it does not say whether the
 * print landed in RTH, pre-market or after-hours, and `includePrePost=true`
 * merges all three into one undifferentiated array. The two forbidden doors
 * were to INVENT a session (laundering unknown data into a canonical field) or
 * to REFUSE every non-session-bearing bar (amputating the live chart). The
 * third door is to say so out loud in the field itself, which is what
 * `SESSION_UNKNOWN` is for.
 *
 * `fidelity` is therefore `INDICATIVE` and can never be `EXECUTABLE` here —
 * `admitBar` enforces that directly, because a price is a different fact inside
 * RTH than outside it and nobody can back an executability claim about a print
 * they cannot place in a session.
 *
 * ── THE UNIT TRAP, WHICH IS WHY `toLegacyTuple` IS NOT CALLED BELOW ──────────
 *
 * `CanonicalBar.asOf` and `receivedAt` are epoch MILLISECONDS, because they are
 * two clocks meant to be compared and a comparison between a seconds clock and
 * a millisecond clock is worse than no comparison at all. But this repo's
 * `LegacyOhlcvTuple.time` is epoch SECONDS — Yahoo's native unit and the one
 * lightweight-charts expects. `toLegacyTuple` copies `asOf` into `time`
 * unchanged, which is correct for a caller whose tuple is in milliseconds and
 * would place every bar here roughly fifty thousand years in the future.
 *
 * So the narrowing is done by `toLegacySecondsTuple` below, which states the
 * conversion instead of inheriting it. This is the same class of defect the
 * census was opened over: two shapes that are structurally identical and
 * semantically unrelated, where the compiler cannot object.
 */

import {
  BAR_PROVENANCES,
  SESSION_UNKNOWN,
  admitBar,
  mintBarId,
  type CanonicalBar,
  type LegacyOhlcvTuple,
} from "./canonicalBar";
import { MARKET_FIDELITIES } from "./marketFidelityAlgebra";

/** The provider string every bar minted here carries. */
export const YAHOO_BAR_SOURCE = "yahoo";

export interface YahooCandleIngressInput {
  readonly symbolId: string;
  readonly timeframe: string;
  /** From `YahooTimeframePlan.sourceMode` — the fact that decides provenance. */
  readonly sourceMode: "native" | "reconstructed";
  /** Post-aggregation tuples. `time` is epoch SECONDS. */
  readonly tuples: readonly LegacyOhlcvTuple[];
  /** When WE heard, epoch ms. Never an ordering authority. */
  readonly receivedAt: number;
  /** Bumped only when the pipeline's truth changes under us. */
  readonly truthEpoch?: number;
}

export interface YahooCandleRefusal {
  /** Epoch seconds, as it arrived — so a refusal can be matched to the feed. */
  readonly atSeconds: number;
  readonly reason: string;
}

export interface YahooCandleIngressResult {
  readonly bars: readonly CanonicalBar[];
  /**
   * Bars the artery would not admit, kept rather than swallowed.
   *
   * A refused bar is a visible gap the trader can be told about; a silently
   * dropped one is a gap they will read as a quiet market.
   */
  readonly refusals: readonly YahooCandleRefusal[];
}

/**
 * How a Yahoo bar got here.
 *
 * REST_BACKFILL when the venue printed it at this timeframe. DERIVED when this
 * product folded it from a finer interval — real, but not something a venue
 * printed, and a trader reading a 4h candle deserves to be able to find that
 * out rather than assume a 4h auction happened.
 */
export function yahooProvenance(sourceMode: "native" | "reconstructed") {
  return sourceMode === "reconstructed"
    ? BAR_PROVENANCES.DERIVED
    : BAR_PROVENANCES.REST_BACKFILL;
}

/**
 * Narrow a canonical bar back to the six numbers the chart renderer eats,
 * converting the canonical millisecond clock to the seconds this repo's tuple
 * has always used. See the unit-trap note in this file's header for why
 * `toLegacyTuple` is deliberately not used.
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
 * Mint canonical bars from an aggregated Yahoo series.
 *
 * Every bar goes through `admitBar`, which means geometry is CHECKED rather
 * than trusted (an inside-out bar is refused, never clamped) and a timestamp
 * Yahoo delivers twice is refused the second time rather than double-counted.
 * Neither guard existed on this path before: the route pushed whatever the
 * provider sent straight into the response.
 */
export function ingestYahooCandles(
  input: YahooCandleIngressInput,
): YahooCandleIngressResult {
  const truthEpoch = input.truthEpoch ?? 0;
  const provenance = yahooProvenance(input.sourceMode);

  const held = new Map<number, CanonicalBar>();
  const order: number[] = [];
  const refusals: YahooCandleRefusal[] = [];

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

    const barId = mintBarId({
      symbolId: input.symbolId,
      timeframe: input.timeframe,
      asOf,
      truthEpoch,
    });
    if (barId === null) {
      refusals.push({
        atSeconds,
        reason: "A bar with no symbol or no timeframe has no identity to mint.",
      });
      continue;
    }

    const incoming: CanonicalBar = {
      barId,
      symbolId: input.symbolId,
      sessionId: SESSION_UNKNOWN,
      timeframe: input.timeframe,
      open: tuple.open,
      high: tuple.high,
      low: tuple.low,
      close: tuple.close,
      volume: tuple.volume,
      asOf,
      receivedAt: input.receivedAt,
      // Never EXECUTABLE. See the header: the session is unknown, and `admitBar`
      // would refuse the bar outright if this line claimed otherwise.
      fidelity: MARKET_FIDELITIES.INDICATIVE,
      source: YAHOO_BAR_SOURCE,
      provenance,
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

  // Chronological, by asOf. Arrival order is explicitly not authority order,
  // and `order` only exists to keep the output stable for equal timestamps.
  order.sort((a, b) => a - b);

  return {
    bars: order.map(asOf => held.get(asOf) as CanonicalBar),
    refusals,
  };
}
