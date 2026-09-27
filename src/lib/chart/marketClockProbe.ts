/**
 * MARKET CLOCK → PAINT, MEASURED (Garden 16 five-hour order: "There is one
 * market clock … MARKET CLOCK → CURRENT VISUAL PROJECTION … Measure it …
 * produce evidence that stale animation is not accumulating").
 *
 * Three legs, each a rolling window of the newest samples (performance.now ms):
 *   event → state    a print arrives (useWebSocket.processTick) → the rAF flush
 *                    folds EVERY buffered print into ONE newest snapshot
 *   state → series   that snapshot → the forming candle's series.update
 *   series → paint   the candle update → the next overlay paint
 * plus `coalesced`: how many prints each flush folded. A flush that folds 40
 * prints paints the newest one and throws the other 39 frames away — there is
 * no queue to replay, and `backlog` (prints received but not yet folded when a
 * paint runs) proves it stays bounded.
 *
 * Module-level on purpose: the socket hook and the chart are separate
 * components, and the probe must add nothing to either's render path.
 */

const WINDOW = 240;

class Ring {
  private a: number[] = [];
  push(v: number): void {
    if (!Number.isFinite(v) || v < 0) return;
    this.a.push(v);
    if (this.a.length > WINDOW) this.a.shift();
  }
  get n(): number { return this.a.length; }
  q(p: number): number | null {
    if (!this.a.length) return null;
    const s = [...this.a].sort((x, y) => x - y);
    return s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))];
  }
  max(): number | null { return this.a.length ? Math.max(...this.a) : null; }
  reset(): void { this.a = []; }
}

const eventToState = new Ring();
const stateToSeries = new Ring();
const seriesToPaint = new Ring();
const coalesced = new Ring();
const backlogAtPaint = new Ring();

let oldestPending: number | null = null;
let pendingCount = 0;
let lastFlushAt: number | null = null;
let lastSeriesAt: number | null = null;
let lastPaintedSeriesAt: number | null = null;

/** A print was accepted (hot path — O(1)). */
export function noteArrival(now: number): void {
  if (oldestPending == null) oldestPending = now;
  pendingCount++;
}

/** The rAF flush folded `count` prints into one snapshot. */
export function noteFlush(now: number, count: number): void {
  if (oldestPending != null) eventToState.push(now - oldestPending);
  coalesced.push(count);
  oldestPending = null;
  pendingCount = 0;
  lastFlushAt = now;
}

/** The forming candle's series was updated from the newest snapshot. */
export function noteSeries(now: number): void {
  if (lastFlushAt != null) stateToSeries.push(now - lastFlushAt);
  lastSeriesAt = now;
}

/** An overlay paint ran. Counts each series update once. */
export function notePaint(now: number): void {
  backlogAtPaint.push(pendingCount);
  if (lastSeriesAt != null && lastSeriesAt !== lastPaintedSeriesAt) {
    seriesToPaint.push(now - lastSeriesAt);
    lastPaintedSeriesAt = lastSeriesAt;
  }
}

/** A symbol/timeframe change starts a fresh measurement. */
export function resetMarketClock(): void {
  for (const r of [eventToState, stateToSeries, seriesToPaint, coalesced, backlogAtPaint]) r.reset();
  oldestPending = null; pendingCount = 0; lastFlushAt = null; lastSeriesAt = null; lastPaintedSeriesAt = null;
}

const fmt = (v: number | null) => (v == null ? "—" : v < 10 ? v.toFixed(1) : String(Math.round(v)));

/** `evt→state 4/9 · state→series 1/3 · series→paint 12/31 · fold 1/6 · backlog max 3 · n 120` (p50/p95 ms). */
export function marketClockReceipt(): string {
  return [
    `evt→state ${fmt(eventToState.q(0.5))}/${fmt(eventToState.q(0.95))}`,
    `state→series ${fmt(stateToSeries.q(0.5))}/${fmt(stateToSeries.q(0.95))}`,
    `series→paint ${fmt(seriesToPaint.q(0.5))}/${fmt(seriesToPaint.q(0.95))}`,
    `fold ${fmt(coalesced.q(0.5))}/${fmt(coalesced.max())}`,
    `backlog max ${fmt(backlogAtPaint.max())}`,
    `n ${eventToState.n}`,
  ].join(" · ");
}

/** The numbers, for a proof harness. */
export function marketClockStats() {
  return {
    eventToState: { p50: eventToState.q(0.5), p95: eventToState.q(0.95), n: eventToState.n },
    stateToSeries: { p50: stateToSeries.q(0.5), p95: stateToSeries.q(0.95), n: stateToSeries.n },
    seriesToPaint: { p50: seriesToPaint.q(0.5), p95: seriesToPaint.q(0.95), n: seriesToPaint.n },
    coalesced: { p50: coalesced.q(0.5), max: coalesced.max() },
    backlogMax: backlogAtPaint.max(),
  };
}
