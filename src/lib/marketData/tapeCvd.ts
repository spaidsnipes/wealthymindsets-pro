/**
 * TAPE CVD — cumulative signed tape, one candle per bar, only where the tape
 * was heard (Garden Pass 12, H-701).
 *
 * The candle-colour "CVD" that booked 65% of a green candle's volume to buyers
 * was retired (c8e291cc). This is the lawful replacement, and it owns one
 * sentence: for each bar the accumulator actually holds executions for,
 * delta = Σ(ask − bid) over that bar's price levels (ask = buyer-initiated
 * size, bid = seller-initiated size, exactly as the tape labelled them), and
 * the cumulative is summed from the first bar the tape can vouch for.
 *
 * What it refuses to do:
 *   - no point for a bar the accumulator holds nothing for (before the tape
 *     horizon, evicted past the 400-bar cap, or simply unheard): whitespace,
 *     never a zero and never a guess;
 *   - no side from the candle: a bar with executions but no labelled sides
 *     contributes 0, it is not signed by its body;
 *   - the FIRST bar is always PARTIAL. Either the tape began mid-bar (the
 *     horizon) or the retained window begins mid-bar (eviction, or the bounded
 *     recent-tick buffer a timeframe switch refolds from). Nothing here can
 *     prove that bar whole, so it is drawn hollow.
 *
 * `since` names where the cumulative starts: the horizon's own timestamp when
 * the series starts at the horizon bar, otherwise the oldest retained bar.
 */

export interface TapeCvdLevel { bid: number; ask: number }

/**
 * One bar's step of the cumulative. Deliberately NOT an OHLC shape: this is a
 * reading of the tape, not a market bar, so it carries the two cumulatives it
 * moved between (the pane draws them as a body) and never a high/low of its
 * own that could be mistaken for a second 09:31 (canonicalBarAdoption M8).
 */
export interface TapeCvdPoint {
  time: number;
  /** Cumulative before this bar (the prior bar's `to`, 0 on the first). */
  from: number;
  /** Cumulative after this bar. */
  to: number;
  /** This bar's own Σ(ask − bid). */
  delta: number;
  /** First bar of the series — its tape cannot be proven whole. */
  partial: boolean;
}

export type TapeCvdRefusal = "NO_VERIFIED_TAPE" | "NO_TAPE_IN_VIEW";

export interface TapeCvdResult {
  points: TapeCvdPoint[];
  /** Epoch seconds the cumulative starts from, or null when refused. */
  sinceSec: number | null;
  /** True when the series starts at the tape horizon bar (vs the oldest retained bar). */
  startsAtHorizon: boolean;
  /** Sides were inferred (tick rule), not stamped by the venue. */
  sidesInferred: boolean;
  /** Bars whose step came from the provider's bar sides (0 = tape only). */
  barSideBars?: number;
  /** First bar the TAPE carries after the bar-side span, epoch seconds (null = none). */
  tapeFromSec?: number | null;
  refused: TapeCvdRefusal | null;
}

export interface TapeCvdInput {
  /** Chart bars, oldest first. Only `time` (bar open, epoch seconds) is read. */
  bars: ReadonlyArray<{ time: number }>;
  /** Accumulator: bar open time → price level → labelled sizes. */
  accumulator: ReadonlyMap<number, ReadonlyMap<number, TapeCvdLevel>>;
  /** Bar-aligned start of the bar the tape horizon falls in, or null. */
  horizonBarSec: number | null;
  /** The horizon's own timestamp (epoch seconds), or null. */
  horizonStartedAtSec: number | null;
  /** Provenance of the sides: "TICK_RULE" means inferred. */
  aggressorMethod: string | null | undefined;
  /** False when the active tape source is not a verified aggressor tape. */
  verifiedTape: boolean;
  /**
   * The first trade the accumulator actually holds (epoch seconds), or null
   * when unknown. The horizon is persisted for days; the accumulator is
   * in-memory and restarts on reload (or refolds from the bounded recent
   * buffer on a timeframe switch) — so "since" can never be earlier than this.
   */
  accumulatorStartedAtSec?: number | null;
  /**
   * THE BARS' OWN SIDES from their provider (tastytrade candle askVolume /
   * bidVolume, 2026-10-05): bar open second → buy / sell volume for the WHOLE
   * bar. They carry the cumulative back through the history the held tape
   * cannot reach. Used for every bar OLDER than the newest side-bearing bar
   * (that one was still forming when the candles were read, so it and every
   * later bar come from the tape). Absent / empty → the tape-only rule above.
   */
  barSides?: ReadonlyMap<number, { buy: number; sell: number }> | null;
}

export function barTapeDelta(levels: ReadonlyMap<number, TapeCvdLevel>): number {
  let d = 0;
  for (const lv of levels.values()) {
    const ask = Number.isFinite(lv.ask) ? lv.ask : 0;
    const bid = Number.isFinite(lv.bid) ? lv.bid : 0;
    d += ask - bid;
  }
  return d;
}

export function selectTapeCvd(input: TapeCvdInput): TapeCvdResult {
  const sides = input.barSides;
  if (sides && sides.size > 0) {
    const mixed = selectSidedCvd(input, sides);
    if (mixed) return mixed;
  }
  const sidesInferred = input.aggressorMethod === "TICK_RULE";
  const refuse = (refused: TapeCvdRefusal): TapeCvdResult =>
    ({ points: [], sinceSec: null, startsAtHorizon: false, sidesInferred, refused });
  if (!input.verifiedTape) return refuse("NO_VERIFIED_TAPE");

  // The first bar that is both at/after the horizon and still retained.
  let oldestRetained = Infinity;
  for (const t of input.accumulator.keys()) if (t < oldestRetained) oldestRetained = t;
  if (!Number.isFinite(oldestRetained)) return refuse("NO_TAPE_IN_VIEW");
  const horizon = input.horizonBarSec;
  const start = horizon != null && horizon >= oldestRetained ? horizon : oldestRetained;
  const startsAtHorizon = horizon != null && start === horizon;

  const points: TapeCvdPoint[] = [];
  let cum = 0;
  for (const bar of input.bars) {
    if (bar.time < start) continue;
    const levels = input.accumulator.get(bar.time);
    if (!levels) continue; // unheard bar: whitespace, cumulative carries unchanged
    const delta = barTapeDelta(levels);
    const from = cum;
    cum += delta;
    points.push({ time: bar.time, from, to: cum, delta, partial: points.length === 0 });
  }
  if (!points.length) return refuse("NO_TAPE_IN_VIEW");

  // Honest "since": the horizon only when the accumulator has held the tape
  // from the horizon on; otherwise the first trade it actually holds (never a
  // bar's open time, which can sit hours before the first trade on 1D).
  const acc = Number.isFinite(input.accumulatorStartedAtSec as number) ? (input.accumulatorStartedAtSec as number) : null;
  const heldFromHorizon = startsAtHorizon && points[0].time === start && input.horizonStartedAtSec != null
    && (acc == null || acc <= input.horizonStartedAtSec);
  const sinceSec = heldFromHorizon
    ? input.horizonStartedAtSec!
    : acc != null ? Math.max(acc, points[0].time) : points[0].time;
  return { points, sinceSec, startsAtHorizon: heldFromHorizon, sidesInferred, refused: null };
}

/**
 * Bar sides for the closed history, the tape from the newest side-bearing bar
 * on. The cumulative starts at the first side-bearing bar in `bars`; it is
 * whole there (the provider's sides cover the whole bar), so no point is
 * PARTIAL unless the tape takes over mid-span on a bar it cannot prove whole —
 * the tape's own bars keep the tape rule (labelled sides only; a bar the
 * accumulator lacks is whitespace and the cumulative carries).
 */
function selectSidedCvd(input: TapeCvdInput, sides: ReadonlyMap<number, { buy: number; sell: number }>): TapeCvdResult | null {
  let newestSide = -Infinity;
  for (const t of sides.keys()) if (t > newestSide) newestSide = t;
  const points: TapeCvdPoint[] = [];
  let cum = 0, barSideBars = 0;
  let tapeFromSec: number | null = null;
  const tapeOk = input.verifiedTape;
  for (const bar of input.bars) {
    const sd = bar.time < newestSide ? sides.get(bar.time) : undefined;
    let delta: number | null = null;
    let partial = false;
    if (sd && Number.isFinite(sd.buy) && Number.isFinite(sd.sell)) {
      delta = sd.buy - sd.sell;
      barSideBars++;
    } else if (tapeOk && bar.time >= newestSide && points.length) {
      const levels = input.accumulator.get(bar.time);
      if (levels) {
        delta = barTapeDelta(levels);
        // The hand-over bar: the tape is proven whole on it only when the
        // accumulator held prints from before it opened.
        if (tapeFromSec == null) {
          tapeFromSec = bar.time;
          const acc = input.accumulatorStartedAtSec;
          partial = !(Number.isFinite(acc as number) && (acc as number) <= bar.time);
        }
      }
    }
    if (delta == null) continue;
    const from = cum;
    cum += delta;
    points.push({ time: bar.time, from, to: cum, delta, partial });
  }
  if (!barSideBars) return null;
  return {
    points, sinceSec: points[0].time, startsAtHorizon: false,
    sidesInferred: input.aggressorMethod === "TICK_RULE" && tapeFromSec != null,
    refused: null, barSideBars, tapeFromSec,
  };
}

/** The pane's one caption. `hhmm` formats epoch seconds in the chart's zone. */
export function tapeCvdCaption(r: TapeCvdResult, hhmm: (sec: number) => string): string {
  if (r.refused === "NO_VERIFIED_TAPE") return "CVD · REFUSED · no verified aggressor tape";
  if (r.refused === "NO_TAPE_IN_VIEW" || r.sinceSec == null) return "CVD · REFUSED · no tape heard on these bars";
  if (r.barSideBars) {
    return `CVD · bar sides (provider) since ${hhmm(r.sinceSec)}` +
      (r.tapeFromSec != null ? ` · signed tape from ${hhmm(r.tapeFromSec)}` : "") +
      (r.sidesInferred ? " · SIDES INFERRED" : "");
  }
  return `CVD · signed tape since ${hhmm(r.sinceSec)}${r.sidesInferred ? " · SIDES INFERRED" : ""}`;
}
