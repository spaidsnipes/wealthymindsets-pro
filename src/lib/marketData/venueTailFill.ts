/**
 * VENUE TAIL FILL — the closed minutes between history and the live edge.
 *
 * ── THE DEFECT (measured 2026-09-26, BTC-USD 1m, serving) ────────────────────
 *
 * Every fresh BTC 1m load drew "NO BAR · 3 intervals" between the last
 * backfilled bar and the forming bar the Coinbase tape was building. BTC
 * trades 24/7 and the tape was live, so those minutes traded: the hole was
 * ours, not the market's.
 *
 * Root cause, measured against the venue directly: Coinbase's
 * `/products/BTC-USD/candles?granularity=60` WITHOUT `start`/`end` answers
 * from a snapshot that lags the book. Sampled every ~15 s for a minute, its
 * newest candle stayed pinned at 09:28 UTC while the clock ran 09:30 → 09:32
 * — two, then three, closed minutes absent. The SAME endpoint asked for an
 * explicit window (`&start=…&end=…`, ten minutes) returned every closed minute
 * AND the forming one on every sample. The chart's history page is the stale
 * snapshot; the tape starts at load; the minutes between were read by nobody.
 *
 * ── THE FIX, AND WHAT IT MAY NOT DO ──────────────────────────────────────────
 *
 * The owner of Coinbase bars (`/api/exchange`) now also reads a BOUNDED tail
 * window from the same venue and merges it here, before the one canonical
 * ingress (`ingestExchangeCandles`) mints identities. Rules:
 *
 *   • SAME VENUE ONLY. The tail is the history's own venue re-read with a
 *     window; nothing is borrowed from another vendor, and nothing is made up.
 *     A minute the venue has no candle for stays absent, so selectDataGaps
 *     still reads it and the glass still says "NO BAR".
 *   • CLOSED MINUTES ONLY. A tail candle at or after the forming interval's
 *     start is not taken: the forming bar is the tape's. Taking the venue's
 *     partial forming candle as history would hand the live fold a second
 *     partial volume for the same minute.
 *   • ONE BAR PER INSTANT. Where history and tail both hold a minute, the
 *     tail's reading REPLACES the history's — it is a later read of the same
 *     venue minute (the stale snapshot's newest bar may have been taken while
 *     that minute was still open). Replaced, never summed: volume is the
 *     venue's figure for that minute exactly once.
 *   • A TAIL BAR MUST BE WHOLE to be taken (finite time and OHLC); a partial
 *     one never replaces a history bar. Duplicate tail instants keep the
 *     first. History is not judged here — the ingress still refuses and
 *     counts its bad rows.
 *
 * `filled` is how many closed intervals the tail supplied that the history
 * page did not hold — the receipt the chart publishes as `dataGapsTailFilled`.
 *
 * PURE. DETERMINISTIC. The route owns the clock and the fetch.
 */
import type { LegacyOhlcvTuple } from "./canonicalBar";

/** The tail window, in intervals. Bounded: one windowed venue read, never a crawl. */
export const VENUE_TAIL_INTERVALS = 10;

export interface VenueTailMergeInput {
  /** The venue's history page (any order). */
  readonly history: readonly LegacyOhlcvTuple[];
  /** The same venue's windowed tail read (any order), or null when not read. */
  readonly tail: readonly LegacyOhlcvTuple[] | null;
  /** Bar interval, seconds. */
  readonly intervalSec: number;
  /** The route's clock, epoch seconds. Defines the forming interval. */
  readonly nowSec: number;
}

export interface VenueTailMergeResult {
  /** Ascending, one bar per `time` (history's own unplaceable/repeated rows trail, for the ingress to refuse). */
  readonly bars: readonly LegacyOhlcvTuple[];
  /** Closed intervals the tail supplied that the history page did not hold. */
  readonly filled: number;
  /** Instants both held, where the tail's later reading replaced the history's. */
  readonly refreshed: number;
  /** Start (epoch s) of the forming interval the tail was not allowed to supply. */
  readonly formingStart: number;
}

const finiteBar = (b: LegacyOhlcvTuple | null | undefined): b is LegacyOhlcvTuple =>
  !!b
  && Number.isFinite(b.time)
  && Number.isFinite(b.open) && Number.isFinite(b.high)
  && Number.isFinite(b.low) && Number.isFinite(b.close);

export function mergeVenueTail(input: VenueTailMergeInput): VenueTailMergeResult {
  const step = input.intervalSec > 0 ? input.intervalSec : 60;
  const formingStart = Math.floor(input.nowSec / step) * step;

  // History passes through as the venue published it — this merge is not the
  // place that judges a history bar. An unplaceable one is handed on untouched
  // so the canonical ingress refuses AND COUNTS it, exactly as before; a
  // repeated instant is handed on too, for the same reason.
  const byTime = new Map<number, LegacyOhlcvTuple>();
  const passThrough: LegacyOhlcvTuple[] = [];
  for (const b of input.history) {
    if (!b || !Number.isFinite(b.time) || byTime.has(b.time)) { if (b) passThrough.push(b); continue; }
    byTime.set(b.time, b);
  }

  let filled = 0;
  let refreshed = 0;
  const seenTail = new Set<number>();
  for (const b of input.tail ?? []) {
    if (!finiteBar(b) || seenTail.has(b.time)) continue;
    seenTail.add(b.time);
    if (b.time >= formingStart) continue; // the forming bar is the tape's
    if (byTime.has(b.time)) refreshed++;
    else filled++;
    byTime.set(b.time, b);
  }

  const bars = [...byTime.values()].sort((a, z) => a.time - z.time).concat(passThrough);
  return { bars, filled, refreshed, formingStart };
}
