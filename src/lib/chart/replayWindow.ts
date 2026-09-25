/**
 * BAR REPLAY — THE CAMERA'S WINDOW ONTO FROZEN ANCESTRY (M9, repair 2).
 *
 * Replay is a COMPANION CAMERA, not a second market. The live store keeps
 * running untouched underneath it; the only thing replay is allowed to change
 * is which bars the chart's one camera shows. This module is the whole of that
 * decision, pure, so the room (ChartsDashboard) and the glass (MainChart) are
 * two readers of one answer instead of two authors of two answers.
 *
 * THREE RULES, each with a test in `replayWindow.test.ts`:
 *
 *   1. FROZEN AT THE PRESS. `freezeReplaySnapshot` copies the bars (and their
 *      CanonicalBar identities) that the chart is rendering at the moment the
 *      trader engages replay, and freezes the copies. Nothing after that moment
 *      — a live tick, a re-fetch, a truthEpoch bump — can reach a replayed bar.
 *      Replay walks what the trader was looking at; it never re-derives
 *      today's version of old bars.
 *
 *   2. NO LOOKAHEAD. `selectReplayWindow` hands the camera bars 0..cursor and
 *      NOTHING past the cursor — not the bars, not their identities. Every
 *      overlay drawn from the window therefore describes the replayed past.
 *
 *   3. LIVE TICKS NEVER PAINT THE REPLAY CAMERA. `routeLiveTick` is the gate
 *      MainChart's tick fold asks before it touches a series. While the camera
 *      is on history, a tick is folded into the HELD live bars (so Stop returns
 *      to a live chart that did not miss anything) and nothing is painted.
 */
import type { CanonicalBarIdentity, LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";

/** Fewer bars than this and there is nothing to walk: replay does not open. */
export const REPLAY_MIN_BARS = 2;

/**
 * How many bars a fresh replay leaves AHEAD of the cursor to walk. Starting at
 * bar 0 put one lonely candle on a 5,000-bar chart and a forty-minute walk
 * back to the present; starting at the end left nothing to replay at all.
 */
export const REPLAY_DEFAULT_WALK = 120;

/**
 * Which chart a snapshot belongs to. A snapshot frozen on NVDA 5m ETH is not a
 * replay of TSLA, of 1h, or of the regular session, so a change to any of the
 * three ends the replay rather than walking the wrong ancestry.
 */
export function replayScope(symbol: string, timeframe: string, extendedHours: boolean): string {
  return `${symbol}|${timeframe}|${extendedHours ? "ETH" : "RTH"}`;
}

export interface ReplaySnapshot {
  readonly scope: string;
  /** Wall clock at the press — when the ancestry was frozen, not a bar time. */
  readonly frozenAtMs: number;
  readonly bars: readonly LegacyOhlcvTuple[];
  readonly identities: readonly CanonicalBarIdentity[];
}

/**
 * Freeze the chart's canonical bars at the moment of the press.
 *
 * COPIES, then freezes. Freezing the caller's own objects would reach back
 * into the live store and make its next fold throw; copying without freezing
 * would leave the ancestry editable by anyone handed a window. Returns null
 * when there is nothing to walk, and the room does not open replay at all.
 */
export function freezeReplaySnapshot(input: {
  readonly scope: string;
  readonly frozenAtMs: number;
  readonly bars: readonly LegacyOhlcvTuple[];
  readonly identities: readonly CanonicalBarIdentity[];
}): ReplaySnapshot | null {
  if (input.bars.length < REPLAY_MIN_BARS) return null;
  const bars = Object.freeze(input.bars.map(b => Object.freeze({ ...b })));
  const identities = Object.freeze(input.identities.map(id => Object.freeze({ ...id })));
  return Object.freeze({ scope: input.scope, frozenAtMs: input.frozenAtMs, bars, identities });
}

/** Clamp any requested cursor onto a real bar of a `total`-bar snapshot. */
export function clampReplayCursor(cursor: number, total: number): number {
  if (!(total > 0)) return 0;
  if (Number.isNaN(cursor)) return 0;
  if (cursor === Infinity) return total - 1;
  if (cursor === -Infinity) return 0;
  return Math.min(total - 1, Math.max(0, Math.trunc(cursor)));
}

/** One step (or `delta` steps) along the snapshot, never off either end. */
export function stepReplayCursor(cursor: number, delta: number, total: number): number {
  return clampReplayCursor(clampReplayCursor(cursor, total) + delta, total);
}

/** Where a fresh replay puts the cursor: REPLAY_DEFAULT_WALK bars short of the end. */
export function defaultReplayCursor(total: number): number {
  if (!(total > 0)) return 0;
  const walk = Math.min(REPLAY_DEFAULT_WALK, Math.ceil((total - 1) / 2));
  return clampReplayCursor(total - 1 - walk, total);
}

export interface ReplayWindow {
  /**
   * Bars 0..cursor. A FRESH array on every call — handing a consumer the
   * snapshot's own array would let one `push` extend the ancestry — whose
   * elements are the snapshot's frozen bars.
   */
  readonly bars: LegacyOhlcvTuple[];
  /** Identities of bars at or before the cursor only; lineage has no lookahead either. */
  readonly identities: readonly CanonicalBarIdentity[];
  readonly cursor: number;
  readonly total: number;
  /** Bars on the camera (cursor + 1) — what the panel's counter reads. */
  readonly position: number;
  /** The cursor bar's own time (epoch seconds) — the panel's walking clock. */
  readonly time: number;
  readonly atEnd: boolean;
}

/**
 * The bars the camera shows at `cursor`, or null when there is no replay to
 * show — no snapshot, or a snapshot that belongs to a different chart. Null is
 * the whole "camera is live" answer; there is no third state.
 */
export function selectReplayWindow(
  snapshot: ReplaySnapshot | null,
  cursor: number,
  scope: string,
): ReplayWindow | null {
  if (!snapshot || snapshot.scope !== scope) return null;
  const total = snapshot.bars.length;
  if (total === 0) return null;
  const at = clampReplayCursor(cursor, total);
  const bars = snapshot.bars.slice(0, at + 1);
  const time = bars[at].time;
  // Identity `asOf` is epoch MILLISECONDS; renderer bar `time` is SECONDS.
  const identities = snapshot.identities.filter(id => Math.floor(id.asOf / 1000) <= time);
  return { bars, identities, cursor: at, total, position: at + 1, time, atEnd: at === total - 1 };
}

export type LiveTickRoute =
  /** The camera is live: paint the tick onto the series, as always. */
  | "PAINT_CAMERA"
  /** The camera is on history: fold the tick into the held live bars only. */
  | "HOLD_OFF_CAMERA";

/** The one question MainChart's tick fold asks before it touches a series. */
export function routeLiveTick(replayCameraEngaged: boolean): LiveTickRoute {
  return replayCameraEngaged ? "HOLD_OFF_CAMERA" : "PAINT_CAMERA";
}

/**
 * Fold one live bar into a bar list: replace the forming bar when the times
 * match, append otherwise. Never edits `bars` — the list it returns is new.
 */
export function foldLiveBar(
  bars: readonly LegacyOhlcvTuple[],
  bar: LegacyOhlcvTuple,
): LegacyOhlcvTuple[] {
  const last = bars[bars.length - 1];
  if (last && last.time === bar.time) {
    const next = bars.slice(0, -1);
    next.push(bar);
    return next;
  }
  return [...bars, bar];
}
