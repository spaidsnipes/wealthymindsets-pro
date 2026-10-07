/**
 * FVG CAMERA — the ONE door a chart (live or Replay) and any other camera reader
 * use to get FVG state for what the camera shows (Garden 19 §20–§21, Replay).
 *
 * Replay is a companion camera onto frozen ancestry (`replayWindow.ts`). While
 * it walks history, FVG state MUST be what was knowable at the replay clock —
 * the close of the cursor bar — and nothing later: `fvgStateAsOf(ledger,
 * replayT)`, the same reducer the live chart folds, so a replayed gap can never
 * show a touch, a mitigation or a response that happened after the cursor.
 * (Mirrors the AFTER_REPLAY_CLOCK guard the derivatives lane carries.)
 *
 * The chart lane CALLS this; it does not detect. Pinned by
 * fvgCamera.sentinel.test.ts: chart / scanner code that reads FVG objects goes
 * through `fvgSceneForCamera`, and never calls `detectFvgs` itself.
 *
 * PURE. No React, no canvas, no clock (the caller passes `nowMs`).
 */

import type { CanonicalBar, CanonicalBarIdentity, LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import {
  createFvgEngine,
  detectFvgs,
  fvgStateAsOf,
  selectFvgVisibility,
  type FvgEngine,
  type FvgEngineConfig,
  type FvgLedger,
  type FvgVisibility,
} from "./fvgEngine";
import { closedFvgBars, rejoinCanonicalBars } from "./fvgWireBars";
import { getTimeframe, normalizeTFId } from "@/lib/timeframes";

export type FvgCameraMode = "LIVE" | "REPLAY";

export interface FvgCameraInput {
  /**
   * The ancestry the chart holds, epoch-SECONDS candles (the renderer tuple):
   * the live bars, or the frozen replay snapshot. Passing only the replay
   * window gives the same answer — as-of equals a scan of the bars closed by then.
   */
  readonly candles: readonly LegacyOhlcvTuple[];
  /** The canonical identities published beside those candles. */
  readonly identities: readonly CanonicalBarIdentity[];
  readonly symbolId: string;
  readonly timeframe: string;
  readonly extendedHours?: boolean;
  /** Wall clock (epoch ms) — only to drop the forming bar. */
  readonly nowMs: number;
  /**
   * Null = LIVE. While Replay drives the camera: the open time (epoch SECONDS)
   * of the camera's last (cursor) bar.
   */
  readonly replayCursorTimeSec: number | null;
  readonly openBudget?: number;
  readonly scarBudget?: number;
  /**
   * TICK BARS (chart lane D, 2026-10-07). A tick timeframe ("500T") has no
   * registry clock, so `closedFvgBars` closes nothing. With `tickBars` the
   * NEWEST bar is the forming one (dropped) and every other bar CLOSED when
   * the next bar's first print opened it: close(bar k) = asOf(bar k+1) — the
   * engine's `closeTimeOf`, never a guessed interval. Replay reads nothing on
   * tick bars (no replay clock), as before.
   */
  readonly tickBars?: boolean;
  /**
   * The instrument tick as the chart's ONE tick owner reads it for the
   * DISPLAY symbol (pricePrecision.instrumentTickFor). A broker streamer id
   * ("TASTYTRADE:/NQZ26:XCME") is not a symbol the tick table knows, so the
   * engine's own lookup finds none and an NQ gap read in points only
   * (serving 2026-10-07). Omitted → the engine looks it up itself.
   */
  readonly tickSize?: number;
}

/**
 * LIVE INCREMENT (chart lane D, 2026-10-07: "compute on CLOSED bars only …
 * incremental push for live"). A caller-held memo: when the closed bars only
 * GREW (same instrument, timeframe and first bar, same bar at the old tail)
 * the new bars are pushed into the SAME engine; anything else rebuilds it.
 * One engine either way — fvgEngine.test proves push ≡ full scan — so a memo
 * can never change what the ledger says, only what it costs.
 */
export interface FvgCameraMemo {
  state: {
    readonly key: string;
    readonly engine: FvgEngine;
    readonly closeMs: Map<number, number> | null;
    count: number;
    readonly firstAsOf: number;
    lastAsOf: number;
    ledger: FvgLedger;
  } | null;
  /** "PUSH:n" | "REBUILD:n" | "SAME" — the last step taken (a receipt). */
  lastStep: string;
  /**
   * §58 PERFORMANCE LAW: the last scene handed out, and what it was read from.
   * When nothing it depends on changed (same ledger object, same replay clock,
   * same budgets, same refusal counts) the SAME scene object is returned, so a
   * room that publishes the scene into React state re-renders only when a bar
   * closes — never per tick.
   */
  lastScene?: { readonly ledger: FvgLedger; readonly key: string; readonly scene: FvgCameraScene } | null;
}

export function createFvgCameraMemo(): FvgCameraMemo {
  return { state: null, lastStep: "NONE", lastScene: null };
}

function ledgerThroughMemo(memo: FvgCameraMemo, closed: readonly CanonicalBar[], cfg: FvgEngineConfig, closeMs: Map<number, number> | null): FvgLedger {
  const n = closed.length;
  const key = `${cfg.symbolId}|${cfg.timeframe}|${cfg.extendedHours !== false}|${closeMs ? "T" : "C"}|${cfg.tickSize ?? "auto"}`;
  const st = memo.state;
  const grows = st != null && n > 0 && st.key === key && st.firstAsOf === closed[0].asOf
    && n >= st.count && closed[st.count - 1]?.asOf === st.lastAsOf;
  if (st && grows && n === st.count) { memo.lastStep = "SAME"; return st.ledger; }
  if (st && grows) {
    if (st.closeMs && closeMs) for (const [k, v] of closeMs) st.closeMs.set(k, v);
    for (let k = st.count; k < n; k++) st.engine.push(closed[k]);
    memo.lastStep = `PUSH:${n - st.count}`;
    st.count = n; st.lastAsOf = closed[n - 1].asOf; st.ledger = st.engine.snapshot();
    return st.ledger;
  }
  const cm = closeMs ? new Map(closeMs) : null;
  const engine = createFvgEngine(cm ? { ...cfg, closeTimeOf: b => cm.get(b.asOf) ?? Number.NaN } : cfg);
  for (const b of closed) engine.push(b);
  const ledger = engine.snapshot();
  memo.state = n ? { key, engine, closeMs: cm, count: n, firstAsOf: closed[0].asOf, lastAsOf: closed[n - 1].asOf, ledger } : null;
  memo.lastStep = `REBUILD:${n}`;
  return ledger;
}

export interface FvgCameraScene {
  readonly mode: FvgCameraMode;
  /** The instant the ledger is read at (epoch ms): the replay clock, or the newest closed bar. */
  readonly clockMs: number | null;
  readonly ledger: FvgLedger;
  readonly visibility: FvgVisibility;
  /** Candles refused for want of exactly one canonical identity. */
  readonly unpaired: number;
  /** Bars not read because they had not closed by `nowMs`. */
  readonly forming: number;
  /** Renderer open time (epoch SECONDS) of each closed bar fed, by ledger bar index. */
  readonly barTimesSec: readonly number[];
}

/** The replay clock: the CLOSE of the cursor bar (its open + the registry interval), epoch ms. */
export function fvgReplayClockMs(cursorTimeSec: number, timeframe: string): number | null {
  const id = normalizeTFId(timeframe.trim());
  if (!id || !Number.isFinite(cursorTimeSec)) return null;
  return cursorTimeSec * 1000 + getTimeframe(id).candleIntervalSec * 1000;
}

/**
 * Tick bars sit on the axis at their first print's time in seconds WITH
 * millisecond precision (tickBars.ts), so the whole-second pairing rule cannot
 * see them. Same rule otherwise: a candle pairs with exactly ONE identity of
 * this instrument and timeframe whose `asOf` is that millisecond; zero or two
 * → refused and counted (a bar nudged 1 ms to keep the axis increasing has no
 * identity at its axis time and is refused, never guessed).
 */
function rejoinTickBars(input: Pick<FvgCameraInput, "candles" | "identities" | "symbolId" | "timeframe">): { bars: CanonicalBar[]; unpaired: number } {
  const sym = input.symbolId.trim().toUpperCase();
  const byMs = new Map<number, CanonicalBarIdentity | null>();
  for (const id of input.identities) {
    if (id.symbolId.trim().toUpperCase() !== sym || id.timeframe !== input.timeframe) continue;
    byMs.set(id.asOf, byMs.has(id.asOf) ? null : id);
  }
  const bars: CanonicalBar[] = [];
  let unpaired = 0;
  for (const c of input.candles) {
    const id = byMs.get(Math.round(Number(c.time) * 1000)) ?? null;
    if (!id) { unpaired += 1; continue; }
    bars.push({ ...id, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume });
  }
  bars.sort((a, b) => a.asOf - b.asOf);
  return { bars, unpaired };
}

export function fvgSceneForCamera(input: FvgCameraInput, memo?: FvgCameraMemo): FvgCameraScene {
  const joined = input.tickBars ? rejoinTickBars(input) : rejoinCanonicalBars({
    candles: input.candles,
    identities: input.identities,
    symbolId: input.symbolId,
    timeframe: input.timeframe,
  });
  let closeMs: Map<number, number> | null = null;
  let closed: readonly CanonicalBar[];
  let forming: number;
  if (input.tickBars) {
    // The newest tick bar is forming; each other closed when the next opened.
    closed = joined.bars.slice(0, -1);
    forming = joined.bars.length - closed.length;
    closeMs = new Map();
    for (let k = 0; k < closed.length; k++) closeMs.set(closed[k].asOf, joined.bars[k + 1].asOf);
  } else {
    ({ closed, forming } = closedFvgBars(joined.bars, input.timeframe, input.nowMs));
  }
  const cfg: FvgEngineConfig = {
    symbolId: input.symbolId,
    timeframe: input.timeframe,
    extendedHours: input.extendedHours,
    ...(input.tickSize != null && input.tickSize > 0 ? { tickSize: input.tickSize } : {}),
  };
  const cmFull = closeMs;
  const full = memo
    ? ledgerThroughMemo(memo, closed, cfg, closeMs)
    : detectFvgs(closed, cmFull ? { ...cfg, closeTimeOf: b => cmFull.get(b.asOf) ?? Number.NaN } : cfg);
  const replayClock = input.replayCursorTimeSec === null ? null : fvgReplayClockMs(input.replayCursorTimeSec, input.timeframe);
  // REPLAY: what was knowable at the replay clock — never later. An unknowable
  // clock reads NOTHING rather than the live ledger.
  const sceneKey = `${input.replayCursorTimeSec}|${input.openBudget ?? ""}|${input.scarBudget ?? ""}|${joined.unpaired}|${forming}|${closed.length}`;
  const prev = memo?.lastScene;
  if (memo && prev && prev.ledger === full && prev.key === sceneKey) return prev.scene;
  const ledger = input.replayCursorTimeSec === null
    ? full
    : fvgStateAsOf(full, replayClock ?? Number.NEGATIVE_INFINITY);
  const scene: FvgCameraScene = {
    mode: input.replayCursorTimeSec === null ? "LIVE" : "REPLAY",
    clockMs: input.replayCursorTimeSec === null ? ledger.asOf : replayClock,
    ledger,
    visibility: selectFvgVisibility(ledger, { openBudget: input.openBudget, scarBudget: input.scarBudget }),
    unpaired: joined.unpaired,
    forming,
    // Axis time: whole seconds for clock bars; tick bars keep their millisecond.
    barTimesSec: closed.map(b => (input.tickBars ? b.asOf / 1000 : Math.floor(b.asOf / 1000))),
  };
  if (memo) memo.lastScene = { ledger: full, key: sceneKey, scene };
  return scene;
}
