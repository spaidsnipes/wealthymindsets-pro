/**
 * THE LIVE FOLD — how the hook's live bars reach the chart's bars (PURE).
 *
 * Founder defect (2026-10-10): "15-second charts freeze or update
 * incorrectly." Traced tick → hook bar (useWebSocket.processTick /
 * applyTickToLiveBar) → one rAF flush → MainChart's liveBar effect → series.
 * Three losses lived on the last leg, all worst on short clocks:
 *
 *  1. THE WICK BETWEEN FLUSHES. A flush folds every print since the last frame
 *     into the hook's bar (measured on serving BTC-USD 15s, 542ae83: up to 6
 *     prints per flush). The chart's same-bucket fold read only the CLOSE —
 *     `high: max(lastBar.high, price)` — so a print that made the high and was
 *     followed by a lower one in the same frame never reached the candle.
 *  2. THE BAR THAT CLOSED BETWEEN FLUSHES. The hook publishes only its current
 *     bar. When a bucket rolled between two flushes the closing bar's last
 *     prints were lost; with the tab hidden (rAF paused) EVERY bar that closed
 *     while hidden was lost, and the chart silently stitched the next forming
 *     bar onto a stale one.
 *  3. THE LIVE DE-SPIKE (MainChart) clipped the forming bar's wicks to 4× the
 *     median range of the last 30 bars — on 15 s bars a real burst routinely
 *     exceeds that, and the clipped value was written back into the bars.
 *
 * Here: the closed bars the hook publishes are folded in first (idempotent —
 * the same list may arrive again), then the forming bar folds with its OWN
 * high/low when it is the same bucket.
 */
import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";

type Bar = LegacyOhlcvTuple;

/** How many closed bars the hook keeps for the chart to catch up from. */
export const CLOSED_LIVE_BARS_MAX = 64;

/** Hook side: remember the bar that just closed when a print opens the next one. */
export function noteClosedLiveBar(ring: Bar[], prev: Bar | null, next: Bar | null): boolean {
  if (!prev || !next || !(next.time > prev.time)) return false;
  ring.push({ ...prev });
  if (ring.length > CLOSED_LIVE_BARS_MAX) ring.splice(0, ring.length - CLOSED_LIVE_BARS_MAX);
  return true;
}

/** A price within `maxDev` of `ref` (the 8% live guard MainChart already applies to the close). */
export function withinLiveGuard(p: number, ref: number, maxDev = 0.08): boolean {
  return Number.isFinite(p) && p > 0 && (!(ref > 0) || Math.abs(p - ref) / ref <= maxDev);
}

/**
 * Fold the hook's closed bars into the chart's bars. Returns the new bars and
 * the bars to hand `series.update`, in order. A closed bar older than the
 * newest drawn bar was already folded (or is stale) — skipped, so the same
 * list folds to the same result however many times it arrives.
 */
export function foldClosedLiveBars(
  bars: readonly Bar[],
  closed: readonly Bar[] | null | undefined,
  admit: (b: Bar) => boolean = () => true,
): { bars: Bar[]; updates: Bar[] } {
  if (!closed?.length || !bars.length) return { bars: bars as Bar[], updates: [] };
  let out: Bar[] | null = null;
  const updates: Bar[] = [];
  for (const c of [...closed].sort((a, b) => a.time - b.time)) {
    const cur: readonly Bar[] = out ?? bars;
    const last = cur[cur.length - 1];
    if (!last || c.time < last.time) continue;
    const ref = last.close;
    if (!withinLiveGuard(c.close, ref) || !admit(c)) continue;
    const hi = withinLiveGuard(c.high, ref) ? Math.max(c.high, c.close) : c.close;
    const lo = withinLiveGuard(c.low, ref) ? Math.min(c.low, c.close) : c.close;
    let next: Bar;
    if (c.time === last.time) {
      next = { ...last, high: Math.max(last.high, hi), low: Math.min(last.low, lo), close: c.close, volume: Math.max(last.volume, c.volume || 0) };
      if (next.high === last.high && next.low === last.low && next.close === last.close && next.volume === last.volume) continue;
      out = [...cur.slice(0, -1), next];
    } else {
      next = { time: c.time, open: c.open, high: Math.max(hi, c.open), low: Math.min(lo, c.open), close: c.close, volume: c.volume || 0 };
      out = [...cur, next];
    }
    updates.push(next);
  }
  return { bars: out ?? (bars as Bar[]), updates };
}

/**
 * The forming bar folded into the newest drawn bar. When the hook's bar IS that
 * bucket (`live.time === last.time`) its own high/low carry every print the
 * flush coalesced; otherwise (a provider bar stamped ahead, an off-hours print
 * folded into the last regular bar) only the price is known to belong.
 */
export function foldFormingBar(last: Bar, live: Bar, price: number): Bar {
  const sameBucket = Math.floor(live.time) === last.time;
  const hi = sameBucket && withinLiveGuard(live.high, last.close) ? Math.max(live.high, price) : price;
  const lo = sameBucket && withinLiveGuard(live.low, last.close) ? Math.min(live.low, price) : price;
  return {
    time: last.time,
    open: last.open,
    high: Math.max(last.high, hi),
    low: Math.min(last.low, lo),
    close: price,
    volume: Math.max(last.volume, live.volume || 0),
  };
}

/**
 * Live de-spike only where it was meant (bad in-threshold prints on slow
 * vendor bars). Sub-minute clocks are built from the venue's own prints; their
 * ranges are tiny, so 4× the median is an ordinary burst there.
 */
export function liveDespikeApplies(intervalSec: number): boolean {
  return intervalSec >= 60;
}

/* ── ONE VENUE BUILDS THE BAR ─────────────────────────────────────────────
 * Serving c4d4d4c (BTC-USD 15 s, 2026-10-10): a fallback venue left running
 * beside the primary folded its own prices into the same candles. The same
 * class exists for equities: the consolidated Finnhub tape and Alpaca's IEX
 * relay (a SUBSET of the same prints) both fed the bar, so every IEX print was
 * counted twice in volume, and a polled provider lane could join them. One
 * venue owns the bar at a time: a higher-ranked venue takes it over, a
 * lower-ranked one is admitted only after the owner has been silent for
 * BAR_VENUE_SILENT_MS.
 */
export const BAR_VENUE_SILENT_MS = 15_000;
const BAR_VENUE_RANK: Readonly<Record<string, number>> = {
  tastytrade: 5,
  coinbase: 4, finnhub: 4,
  moomoo: 3, longbridge: 3, webull: 3,
  alpaca: 2,
  binance: 1,
};
export interface BarVenueOwner { readonly venue: string; readonly at: number }

/** Does a print from `venue` at `now` (ms) build the bar? Returns the next owner. */
export function admitBarVenue(owner: BarVenueOwner | null, venueIn: string, now: number): { admit: boolean; owner: BarVenueOwner | null } {
  // One feed under two labels (tastytrade's equity lane names its signed prints
  // "tastytrade-equity", its unsigned ones "tastytrade") is one venue.
  const venue = venueIn === "tastytrade-equity" ? "tastytrade" : venueIn;
  if (!owner || owner.venue === venue || now - owner.at >= BAR_VENUE_SILENT_MS
    || (BAR_VENUE_RANK[venue] ?? 0) > (BAR_VENUE_RANK[owner.venue] ?? 0)) {
    return { admit: true, owner: { venue, at: now } };
  }
  return { admit: false, owner };
}
