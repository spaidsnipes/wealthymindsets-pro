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

  const sinceSec = startsAtHorizon && points[0].time === start && input.horizonStartedAtSec != null
    ? input.horizonStartedAtSec
    : points[0].time;
  return { points, sinceSec, startsAtHorizon: startsAtHorizon && points[0].time === start, sidesInferred, refused: null };
}

/** The pane's one caption. `hhmm` formats epoch seconds in the chart's zone. */
export function tapeCvdCaption(r: TapeCvdResult, hhmm: (sec: number) => string): string {
  if (r.refused === "NO_VERIFIED_TAPE") return "CVD · REFUSED · no verified aggressor tape";
  if (r.refused === "NO_TAPE_IN_VIEW" || r.sinceSec == null) return "CVD · REFUSED · no tape heard on these bars";
  return `CVD · signed tape since ${hhmm(r.sinceSec)}${r.sidesInferred ? " · SIDES INFERRED" : ""}`;
}
