/**
 * ONE FEED CLOCK. The masthead and the chart room's rail grade freshness
 * against the same sampled instant (Sentinel 2026-09-25: two timers with
 * independent phases could disagree for up to one interval).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { subscribeFeedClock } from "./useProvenSessionClosure";

describe("subscribeFeedClock", () => {
  afterEach(() => vi.useRealTimers());

  it("two subscribers receive the identical instant on every tick", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const a: number[] = [], b: number[] = [];
    const offA = subscribeFeedClock(15_000, n => a.push(n));
    vi.advanceTimersByTime(7_000);
    const offB = subscribeFeedClock(15_000, n => b.push(n));
    vi.advanceTimersByTime(15_000);
    vi.advanceTimersByTime(15_000);
    // B joined mid-interval and was handed the SAME current sample, not its own.
    expect(b[0]).toBe(a[0]);
    expect(a.slice(-2)).toEqual(b.slice(-2));
    offA(); offB();
  });

  it("the timer stops when the last subscriber leaves", () => {
    vi.useFakeTimers();
    const seen: number[] = [];
    const off = subscribeFeedClock(10_000, n => seen.push(n));
    off();
    const before = seen.length;
    vi.advanceTimersByTime(50_000);
    expect(seen.length).toBe(before);
  });
});
