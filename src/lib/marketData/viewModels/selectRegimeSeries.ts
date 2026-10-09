/**
 * PER-BAR REGIME STATE SERIES — census #7 (F15A regime state line), Garden 19.
 *
 * The canvas's regime is ONE verdict: `selectRegime` over the canonical state
 * the chart publisher seals from the held per-trade tape (volatility +
 * direction → `deriveRegimeDimension`). The chart lane needs the same verdict
 * PER BAR to paint a state line along the candles. This module re-asks the
 * SAME question at each bar's close — nothing new is classified:
 *
 *   tape at bar close  = the held prints with time ≤ close, newest first, at
 *                        most the room's tape retention (the same ring depth
 *                        the live verdict reads)
 *   dimensions         = deriveVolatilityDimension + deriveDirectionDimension
 *                        → deriveRegimeDimension   (the publisher's derivers)
 *   verdict            = classifyRegime            (selectRegime's classifier)
 *                        with the previous bars as its history
 *
 * So at the newest bar the series reads exactly the tape the live verdict
 * reads, through exactly the same derivers and classifier: its last value IS
 * the canvas verdict (the test pins it). The one documented difference: the
 * live verdict's TRANSITION / COMPRESSION history is the room's last canonical
 * SNAPSHOTS; the series' history is its own previous BARS.
 *
 * Bars the held tape does not reach (older than the oldest print) are
 * `UNKNOWN` with basis `NO_TAPE` — the line is silent there, never guessed
 * from candles. Spot FX / venues with no tape: every point is NO_TAPE.
 *
 * Cost: one window per bar (binary search + a slice of ≤ retention prints).
 * Callers key it on the newest CLOSED bar + tape length, not every tick.
 */
import { deriveDirectionDimension, countTradeTicks } from "../deriveDirectionDimension";
import { deriveVolatilityDimension } from "../deriveVolatilityDimension";
import { deriveRegimeDimension } from "../deriveRegimeDimension";
import type { AggressorTick } from "../selectAggressorFlow";
import type { MarketStateResolution } from "../canonicalMarketState";
import { classifyRegime, type RegimeDimensions, type RegimeMatchers, type RegimeVerdict } from "./selectRegime";

/** The live tape ring's depth (useWebSocket RECENT_TICK_RETENTION). */
export const REGIME_SERIES_TAPE_RETENTION = 2000;

export type RegimeSeriesBasis = "TAPE" | "NO_TAPE";

export interface RegimeSeriesPoint {
  /** The bar's open, epoch SECONDS (the chart's bar time). */
  readonly time: number;
  /** The same verdict vocabulary as selectRegime. */
  readonly state: RegimeVerdict;
  readonly resolution: MarketStateResolution;
  readonly basis: RegimeSeriesBasis;
  /** Classified trades behind this point's window. */
  readonly trades: number;
  /** The classifier's narrative (Inspect words), or why it is silent. */
  readonly why: string;
}

export interface RegimeSeriesInput {
  /** The chart's bars (epoch SECONDS), oldest first. */
  readonly bars: readonly { readonly time: number }[];
  /** Bar length in seconds. */
  readonly barSec: number;
  /**
   * TICK (N-trade) BARS (2026-10-07): a trade-count bar has no length — it
   * owns [its open, the next bar's open). When given, bar i closes at
   * `barCloses[i]` (epoch seconds; Infinity for the forming bar) and `barSec`
   * is not read.
   */
  readonly barCloses?: readonly number[];
  /** The held tape, any order; `time` in epoch MS. Untimed prints are ignored. */
  readonly ticks: readonly AggressorTick[];
  readonly source: string | null;
  /** Wall clock (ms): the forming bar is read at `now`, not at its future close. */
  readonly now: number;
  readonly retention?: number;
  readonly matchers?: Partial<RegimeMatchers>;
  readonly minHistoryDepth?: number;
}

/** The publisher's dimension derivation, at one cutoff, over a newest-first window. */
export function regimeDimensionsAt(windowNewestFirst: readonly AggressorTick[], cutoffMs: number, source: string | null, seed: string): RegimeDimensions {
  const latest = windowNewestFirst.length ? Number(windowNewestFirst[0].time) : null;
  const base = { ticks: windowNewestFirst, source, latestTickAtMs: latest != null && latest > 0 ? latest : null, capturedAt: cutoffMs, snapshotIdSeed: seed };
  const volatility = deriveVolatilityDimension(base);
  const direction = deriveDirectionDimension(base);
  const regime = deriveRegimeDimension({ direction, volatility, tradeCount: countTradeTicks(windowNewestFirst) });
  return { regime, volatility };
}

export function selectRegimeSeries(input: RegimeSeriesInput): RegimeSeriesPoint[] {
  const retention = input.retention ?? REGIME_SERIES_TAPE_RETENTION;
  const timed = input.ticks
    .filter(t => typeof t.time === "number" && Number.isFinite(t.time))
    .slice()
    .sort((a, b) => Number(b.time) - Number(a.time)); // newest first, like the ring
  const oldest = timed.length ? Number(timed[timed.length - 1].time) : null;
  const out: RegimeSeriesPoint[] = [];
  const history: RegimeDimensions[] = [];
  for (let bi = 0; bi < input.bars.length; bi++) {
    const bar = input.bars[bi];
    // A bar owns [open, close): a print stamped at the next bar's open is not this bar's.
    const closeSec = input.barCloses ? input.barCloses[bi] ?? Infinity : bar.time + input.barSec;
    const cutoff = Math.min(closeSec * 1000 - 1, input.now);
    if (oldest == null || cutoff < oldest) {
      out.push({ time: bar.time, state: "UNKNOWN", resolution: "UNKNOWN", basis: "NO_TAPE", trades: 0, why: "The held tape does not reach this bar — regime is read from per-trade prints, never from candles." });
      continue;
    }
    // First index whose print is at or before the cutoff (array is newest first).
    let lo = 0, hi = timed.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (Number(timed[mid].time) > cutoff) lo = mid + 1; else hi = mid; }
    const window = timed.slice(lo, lo + retention);
    const dims = regimeDimensionsAt(window, cutoff, input.source, `regime-series:${bar.time}`);
    const vm = classifyRegime({ now: dims, capturedAt: cutoff, history: history.slice(), matchers: input.matchers, minHistoryDepth: input.minHistoryDepth });
    out.push({ time: bar.time, state: vm.verdict, resolution: vm.resolution, basis: "TAPE", trades: countTradeTicks(window), why: vm.reason ?? vm.narrative });
    history.push(dims);
    if (history.length > 16) history.shift();
  }
  return out;
}

/**
 * HOW FAR BACK THE TAPE REGIME REACHES (cert lane, 2026-10-09: "Regime at
 * formation" never read a word — the series reaches only ~11 one-minute bars).
 * The series is read from per-trade prints, and the room holds the newest
 * REGIME_SERIES_TAPE_RETENTION of them — a count of PRINTS, not of bars. So the
 * reach in bars depends on how fast the instrument trades: a busy future burns
 * 2,000 prints in minutes. This returns the reach of a computed series so a row
 * can say it: "the tape regime is kept for the last N bars".
 */
export interface RegimeSeriesReach {
  /** Bars at the newest end of the series that the held tape reaches. */
  readonly bars: number;
  /** The oldest reached bar's open (epoch seconds), or null when none is reached. */
  readonly fromTime: number | null;
  /** The print count the room holds — the real bound. */
  readonly prints: number;
  /** One sentence for a row. */
  readonly words: string;
}

export function regimeSeriesReach(points: readonly RegimeSeriesPoint[], retention: number = REGIME_SERIES_TAPE_RETENTION): RegimeSeriesReach {
  let bars = 0;
  let fromTime: number | null = null;
  for (let i = points.length - 1; i >= 0 && points[i].basis === "TAPE"; i--) { bars++; fromTime = points[i].time; }
  const words = bars === 0
    ? `The tape regime is read from the newest ${retention.toLocaleString("en-US")} prints; none reach these bars.`
    : `The tape regime is kept for the last ${bars} bar${bars === 1 ? "" : "s"} — as far back as the newest ${retention.toLocaleString("en-US")} prints reach.`;
  return { bars, fromTime, prints: retention, words };
}
