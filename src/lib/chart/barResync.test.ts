import { describe, expect, it } from "vitest";
import { RESYNC_MAX_SPACING_MS, RESYNC_MIN_SPACING_MS, barsBehindClock, resyncSpacingMs, shouldResyncAfterReconnect, shouldResyncBehind } from "./barResync";

// Serving MNQ1! 15m, 2026-11-11 19:11 CT: newest bar opened 17:15 CT — seven bars behind the clock.
const NOW = Date.UTC(2026, 10, 12, 1, 11, 30);
const T15 = 15 * 60;
const SEVEN_BEHIND = Math.floor(NOW / 1000 / T15) * T15 - 7 * T15;
const base = { lastBarTimeSec: SEVEN_BEHIND, intervalSec: T15, nowMs: NOW, sessionOpen: true, visible: true, lastResyncAtMs: 0, misses: 0 };

describe("bar resync — a chart behind the clock re-reads its bars", () => {
  it("counts the Founder's 15m chart as seven bars behind", () => {
    expect(barsBehindClock(SEVEN_BEHIND, T15, NOW, true)).toBe(7);
  });
  it("re-reads when ≥ 2 bars behind, in an open session, on a visible page", () => {
    expect(shouldResyncBehind(base)).toBe(true);
  });
  it("the forming bar is current: no resync", () => {
    const cur = Math.floor(NOW / 1000 / T15) * T15;
    expect(barsBehindClock(cur, T15, NOW, true)).toBe(0);
    expect(shouldResyncBehind({ ...base, lastBarTimeSec: cur })).toBe(false);
  });
  it("one bar behind (first print of a new bar not in yet) is not a resync", () => {
    expect(shouldResyncBehind({ ...base, lastBarTimeSec: Math.floor(NOW / 1000 / T15) * T15 - T15 })).toBe(false);
  });
  it("a proven-closed session or a hidden page never resyncs", () => {
    expect(shouldResyncBehind({ ...base, sessionOpen: false })).toBe(false);
    expect(shouldResyncBehind({ ...base, visible: false })).toBe(false);
  });
  it("daily bars and unknown intervals are left to the load path", () => {
    expect(shouldResyncBehind({ ...base, intervalSec: 86_400 })).toBe(false);
    expect(shouldResyncBehind({ ...base, intervalSec: null })).toBe(false);
  });
  it("is spaced, and backs off while a quiet market stays behind", () => {
    expect(shouldResyncBehind({ ...base, lastResyncAtMs: NOW - 10_000 })).toBe(false);
    expect(shouldResyncBehind({ ...base, lastResyncAtMs: NOW - RESYNC_MIN_SPACING_MS })).toBe(true);
    expect(resyncSpacingMs(1)).toBe(2 * RESYNC_MIN_SPACING_MS);
    expect(resyncSpacingMs(20)).toBe(RESYNC_MAX_SPACING_MS);
  });
  it("a stream that REOPENED (not the first open) is a gap to re-read", () => {
    expect(shouldResyncAfterReconnect(0, 1, true)).toBe(false);
    expect(shouldResyncAfterReconnect(1, 2, true)).toBe(true);
    expect(shouldResyncAfterReconnect(1, 2, false)).toBe(false);
    expect(shouldResyncAfterReconnect(2, 2, true)).toBe(false);
  });
});
