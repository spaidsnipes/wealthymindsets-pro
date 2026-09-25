/**
 * M9 repair 2 — the replay camera's window is pure, and these are its laws:
 * frozen at the press, no lookahead, and live ticks never paint the camera.
 */
import { describe, expect, it } from "vitest";

import type { CanonicalBarIdentity, LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import {
  REPLAY_DEFAULT_WALK,
  clampReplayCursor,
  defaultReplayCursor,
  foldLiveBar,
  freezeReplaySnapshot,
  replayScope,
  routeLiveTick,
  selectReplayWindow,
  stepReplayCursor,
} from "./replayWindow";

const T0 = 1_758_204_000; // epoch seconds
const STEP = 300;

function bar(i: number, over: Partial<LegacyOhlcvTuple> = {}): LegacyOhlcvTuple {
  return { time: T0 + i * STEP, open: 100 + i, high: 101 + i, low: 99 + i, close: 100.5 + i, volume: 1000 + i, ...over };
}
function identity(i: number): CanonicalBarIdentity {
  return {
    barId: `NVDA|5m|${(T0 + i * STEP) * 1000}|e0`,
    symbolId: "NVDA",
    sessionId: "2025-09-18",
    timeframe: "5m",
    asOf: (T0 + i * STEP) * 1000, // MILLISECONDS
    receivedAt: (T0 + i * STEP) * 1000 + 50,
    fidelity: "INDICATIVE",
    source: "alpaca",
    provenance: "REST_BACKFILL",
    truthEpoch: 0,
  };
}
const bars = (n: number) => Array.from({ length: n }, (_, i) => bar(i));
const ids = (n: number) => Array.from({ length: n }, (_, i) => identity(i));
const SCOPE = replayScope("NVDA", "5m", true);

describe("freezeReplaySnapshot — frozen at the press", () => {
  it("refuses to open over fewer than two bars (nothing to walk)", () => {
    expect(freezeReplaySnapshot({ scope: SCOPE, frozenAtMs: 1, bars: [], identities: [] })).toBeNull();
    expect(freezeReplaySnapshot({ scope: SCOPE, frozenAtMs: 1, bars: bars(1), identities: ids(1) })).toBeNull();
    expect(freezeReplaySnapshot({ scope: SCOPE, frozenAtMs: 1, bars: bars(2), identities: ids(2) })).not.toBeNull();
  });

  it("COPIES the bars: a later edit to the live store cannot reach the ancestry", () => {
    const live = bars(10) as LegacyOhlcvTuple[];
    const snap = freezeReplaySnapshot({ scope: SCOPE, frozenAtMs: 1, bars: live, identities: ids(10) })!;
    // The live store keeps running: a tick appends, a re-fetch replaces a bar
    // with a corrected one (a truthEpoch bump), the forming bar is folded.
    live.push(bar(10));
    live[3] = bar(3, { close: 9_999 });
    live[9] = { ...live[9], close: 1 };
    expect(snap.bars).toHaveLength(10);
    expect(snap.bars[3].close).toBe(100.5 + 3);
    expect(snap.bars[9].close).toBe(100.5 + 9);
  });

  it("FREEZES the copy — the array, every bar, and every identity", () => {
    const snap = freezeReplaySnapshot({ scope: SCOPE, frozenAtMs: 1, bars: bars(5), identities: ids(5) })!;
    expect(Object.isFrozen(snap)).toBe(true);
    expect(Object.isFrozen(snap.bars)).toBe(true);
    expect(snap.bars.every(b => Object.isFrozen(b))).toBe(true);
    expect(Object.isFrozen(snap.identities)).toBe(true);
    expect(snap.identities.every(id => Object.isFrozen(id))).toBe(true);
    // ESM test modules are strict, so a write is a TypeError, not a silent no-op.
    expect(() => { (snap.bars[0] as { close: number }).close = 0; }).toThrow(TypeError);
    expect(() => { (snap.bars as LegacyOhlcvTuple[]).push(bar(99)); }).toThrow(TypeError);
    expect(() => { (snap.identities[0] as { truthEpoch: number }).truthEpoch = 9; }).toThrow(TypeError);
  });

  it("does NOT freeze the caller's own objects — the live store must stay writable", () => {
    const live = bars(4) as LegacyOhlcvTuple[];
    const liveIds = ids(4);
    freezeReplaySnapshot({ scope: SCOPE, frozenAtMs: 1, bars: live, identities: liveIds });
    expect(Object.isFrozen(live)).toBe(false);
    expect(live.some(b => Object.isFrozen(b))).toBe(false);
    expect(liveIds.some(id => Object.isFrozen(id))).toBe(false);
  });
});

describe("cursor arithmetic — never off either end", () => {
  it("clamps any request onto a real bar", () => {
    expect(clampReplayCursor(-1, 10)).toBe(0);
    expect(clampReplayCursor(10, 10)).toBe(9);
    expect(clampReplayCursor(1_000, 10)).toBe(9);
    expect(clampReplayCursor(4.9, 10)).toBe(4);
    expect(clampReplayCursor(Number.NaN, 10)).toBe(0);
    expect(clampReplayCursor(Infinity, 10)).toBe(9);
    expect(clampReplayCursor(-Infinity, 10)).toBe(0);
    expect(clampReplayCursor(3, 0)).toBe(0);
  });

  it("steps forward and back, stopping at both ends", () => {
    expect(stepReplayCursor(4, 1, 10)).toBe(5);
    expect(stepReplayCursor(4, -1, 10)).toBe(3);
    expect(stepReplayCursor(9, 1, 10)).toBe(9);
    expect(stepReplayCursor(0, -1, 10)).toBe(0);
    // A stale cursor from a longer snapshot is clamped before it is stepped.
    expect(stepReplayCursor(50, -1, 10)).toBe(8);
  });

  it("opens a fresh replay with bars to walk, never at bar 0 of a long chart and never at the end", () => {
    expect(defaultReplayCursor(1_000)).toBe(1_000 - 1 - REPLAY_DEFAULT_WALK);
    expect(defaultReplayCursor(2)).toBe(0);
    expect(defaultReplayCursor(3)).toBe(1);
    expect(defaultReplayCursor(0)).toBe(0);
    for (const n of [2, 3, 10, 121, 240, 241, 5_000]) {
      const c = defaultReplayCursor(n);
      expect(c, `total ${n}`).toBeGreaterThanOrEqual(0);
      expect(c, `total ${n}: nothing left to walk`).toBeLessThan(n - 1);
    }
  });
});

describe("selectReplayWindow — the camera sees 0..cursor and nothing past it", () => {
  const snap = freezeReplaySnapshot({ scope: SCOPE, frozenAtMs: 1, bars: bars(20), identities: ids(20) })!;

  it("hands the camera exactly bars 0..cursor", () => {
    const w = selectReplayWindow(snap, 7, SCOPE)!;
    expect(w.bars).toHaveLength(8);
    expect(w.bars[w.bars.length - 1].time).toBe(T0 + 7 * STEP);
    expect(w.bars.every(b => b.time <= w.time)).toBe(true);
    expect(w).toMatchObject({ cursor: 7, total: 20, position: 8, time: T0 + 7 * STEP, atEnd: false });
    expect(selectReplayWindow(snap, 19, SCOPE)!.atEnd).toBe(true);
  });

  it("has no lookahead in the LINEAGE either (asOf ms vs bar time s)", () => {
    const w = selectReplayWindow(snap, 7, SCOPE)!;
    expect(w.identities).toHaveLength(8);
    expect(w.identities.every(id => id.asOf / 1000 <= w.time)).toBe(true);
  });

  it("clamps a cursor past either end instead of showing the future or nothing", () => {
    expect(selectReplayWindow(snap, 500, SCOPE)!.bars).toHaveLength(20);
    expect(selectReplayWindow(snap, -3, SCOPE)!.bars).toHaveLength(1);
  });

  it("answers null — LIVE — with no snapshot, or a snapshot of a different chart", () => {
    expect(selectReplayWindow(null, 3, SCOPE)).toBeNull();
    expect(selectReplayWindow(snap, 3, replayScope("TSLA", "5m", true))).toBeNull();
    expect(selectReplayWindow(snap, 3, replayScope("NVDA", "1h", true))).toBeNull();
    expect(selectReplayWindow(snap, 3, replayScope("NVDA", "5m", false))).toBeNull();
  });

  it("hands out a FRESH array: a consumer's push cannot extend the ancestry", () => {
    const w = selectReplayWindow(snap, 4, SCOPE)!;
    w.bars.push(bar(99));
    expect(snap.bars).toHaveLength(20);
    expect(selectReplayWindow(snap, 4, SCOPE)!.bars).toHaveLength(5);
    // …while the bars inside it are the frozen ancestry itself.
    expect(Object.isFrozen(w.bars[0])).toBe(true);
  });
});

describe("live ticks never paint the replay camera", () => {
  it("routes a tick OFF the camera while replay drives it, and onto it otherwise", () => {
    expect(routeLiveTick(true)).toBe("HOLD_OFF_CAMERA");
    expect(routeLiveTick(false)).toBe("PAINT_CAMERA");
  });

  it("foldLiveBar replaces the forming bar or appends, and never edits its input", () => {
    const base = Object.freeze(bars(3).map(b => Object.freeze(b)));
    const replaced = foldLiveBar(base, bar(2, { close: 555 }));
    expect(replaced).toHaveLength(3);
    expect(replaced[2].close).toBe(555);
    const appended = foldLiveBar(base, bar(3));
    expect(appended).toHaveLength(4);
    expect(base).toHaveLength(3);
    expect(base[2].close).toBe(100.5 + 2);
    expect(foldLiveBar([], bar(0))).toHaveLength(1);
  });

  it("END TO END: ticks during a replay are held, the camera is untouched, Stop restores them all", () => {
    // The composition MainChart performs, step for step, over the pure parts.
    let live: LegacyOhlcvTuple[] = bars(30);
    const snap = freezeReplaySnapshot({ scope: SCOPE, frozenAtMs: 1, bars: live, identities: ids(30) })!;
    const camera = selectReplayWindow(snap, defaultReplayCursor(snap.bars.length), SCOPE)!;
    const shown = camera.bars;
    const shownBefore = JSON.stringify(shown);
    let held = live; // ENTER: the live bars are held

    const ticks = [bar(29, { close: 131 }), bar(30), bar(31), bar(31, { close: 140 })];
    for (const t of ticks) {
      if (routeLiveTick(true) === "HOLD_OFF_CAMERA") held = foldLiveBar(held, t);
      else throw new Error("a tick reached the replay camera");
    }
    // The camera still shows the frozen window — not one tick landed on it.
    expect(JSON.stringify(shown)).toBe(shownBefore);
    expect(shown[shown.length - 1].time).toBe(camera.time);
    // STOP: the held live bars come back, including every tick that arrived.
    live = held;
    expect(live).toHaveLength(32);
    expect(live[29].close).toBe(131);
    expect(live[31].close).toBe(140);
    // And the ancestry the replay walked was never touched by any of it.
    expect(snap.bars).toHaveLength(30);
    expect(snap.bars[29].close).toBe(100.5 + 29);
  });
});
