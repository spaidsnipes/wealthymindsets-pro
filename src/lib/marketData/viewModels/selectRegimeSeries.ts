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
  for (const bar of input.bars) {
    // A bar owns [open, close): a print stamped at the next bar's open is not this bar's.
    const cutoff = Math.min((bar.time + input.barSec) * 1000 - 1, input.now);
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
