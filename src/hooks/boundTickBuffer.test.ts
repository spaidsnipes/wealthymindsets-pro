import { describe, it, expect } from "vitest";
import { boundTickBuffer, retainRecentTicks, RECENT_TICK_RETENTION, type Tick } from "@/hooks/useWebSocket";

const tick = (n: number): Tick => ({ price: 100 + n, size: 2, side: "buy", time: 1_700_000_000_000 + n, trade: true });

describe("boundTickBuffer — a hidden tab cannot hoard the tape", () => {
  it("never lets the buffer exceed the retention ceiling and sheds the OLDEST prints", () => {
    const buf: Tick[] = [];
    const shed = { count: 0, size: 0 };
    for (let i = 0; i < RECENT_TICK_RETENTION * 3; i++) {
      buf.push(tick(i));
      boundTickBuffer(buf, shed);
      expect(buf.length).toBeLessThanOrEqual(RECENT_TICK_RETENTION);
    }
    expect(buf[0].time).toBe(tick(RECENT_TICK_RETENTION * 2).time);
    expect(buf.at(-1)!.time).toBe(tick(RECENT_TICK_RETENTION * 3 - 1).time);
    expect(shed).toEqual({ count: RECENT_TICK_RETENTION * 2, size: RECENT_TICK_RETENTION * 4 });
  });

  it("after a backlog, the retained tape holds the NEWEST print (it used to keep the oldest 2,000)", () => {
    const buf: Tick[] = [];
    const shed = { count: 0, size: 0 };
    for (let i = 0; i < 5000; i++) { buf.push(tick(i)); boundTickBuffer(buf, shed); }
    const kept = retainRecentTicks(buf, []);
    expect(kept.some(t => t.time === tick(4999).time)).toBe(true);
  });
});
