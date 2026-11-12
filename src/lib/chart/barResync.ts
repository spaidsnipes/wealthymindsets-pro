import { chartFeedRecency } from "./chartFeedRecency";

/**
 * BARS THAT STOPPED TRACKING THE CLOCK ARE RE-READ, NOT WAITED ON (P0 2026-11-12).
 *
 * Serving, MNQ1! 15m, 2026-11-11 19:11 CT: the chart read "STALE PIPELINE" seven bars behind the clock
 * while the header, the 1h tab and the Founder's P&L moved. The live clock only ever APPENDS the bar a
 * new print opens; nothing re-read the history after the feed came back, so bars lost to a background-tab
 * release, a reconnect or a dead socket were never drawn, and a feed that never came back left the chart
 * frozen until a reload. A reload was the only cure — this is the reload's bar half, done by the chart.
 *
 * Two triggers, one owner:
 *   · BEHIND  — the newest bar is ≥ 2 bars behind the clock in an open session on a visible page.
 *   · GAP     — the live stream reopened (a reconnect = prints were missed) while bars were on the glass.
 * Spaced by a backoff so a quiet market (no prints → honestly no new bar) is re-read rarely, not hammered.
 */
export const RESYNC_MIN_SPACING_MS = 45_000;
export const RESYNC_MAX_SPACING_MS = 10 * 60_000;
/** Bars behind (whole bars that should have opened since) before the chart re-reads its history. */
export const RESYNC_BARS_BEHIND = 2;

export interface BarResyncInput {
  readonly lastBarTimeSec: number | null;
  readonly intervalSec: number | null;
  readonly nowMs: number;
  /** `false` only when the session is PROVEN closed (a closed exchange is not a lagging feed). */
  readonly sessionOpen: boolean | null | undefined;
  readonly visible: boolean;
  readonly lastResyncAtMs: number;
  /** Resyncs in a row that did not bring the chart back to the clock. */
  readonly misses: number;
}

/** The spacing after `misses` resyncs that did not cure the lag (45 s, 90 s, 3 min … ≤ 10 min). */
export function resyncSpacingMs(misses: number): number {
  return Math.min(RESYNC_MAX_SPACING_MS, RESYNC_MIN_SPACING_MS * 2 ** Math.max(0, Math.min(misses, 8)));
}

/** How many whole bars behind the clock the newest bar is, or null when that cannot be told. */
export function barsBehindClock(lastBarTimeSec: number | null, intervalSec: number | null, nowMs: number, sessionOpen: boolean | null | undefined): number | null {
  if (lastBarTimeSec == null || !(intervalSec != null && intervalSec > 0)) return null;
  const r = chartFeedRecency(lastBarTimeSec, intervalSec, nowMs, undefined, sessionOpen === false);
  if (r.kind !== "BARS_BEHIND") return 0;
  return r.barsBehind;
}

/** BEHIND: should the chart re-read its bars now? PURE. */
export function shouldResyncBehind(i: BarResyncInput): boolean {
  if (!i.visible || i.sessionOpen === false) return false;
  // Daily and longer bars: a missing print is a day, not a lag; the load path owns them.
  if (!(i.intervalSec != null && i.intervalSec > 0 && i.intervalSec < 86_400)) return false;
  const behind = barsBehindClock(i.lastBarTimeSec, i.intervalSec, i.nowMs, i.sessionOpen);
  if (behind == null || behind < RESYNC_BARS_BEHIND) return false;
  return i.nowMs - i.lastResyncAtMs >= resyncSpacingMs(i.misses);
}

/** GAP: the stream reopened after an earlier open while bars were drawn. PURE. */
export function shouldResyncAfterReconnect(prevEpoch: number, epoch: number, haveBars: boolean): boolean {
  return haveBars && prevEpoch > 0 && epoch > prevEpoch;
}
