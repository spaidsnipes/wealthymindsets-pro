import { describe, expect, it } from "vitest";
import { readRelativeVolume, rvolToneAlpha, SLOT_MIN_SESSIONS } from "./relativeVolume";

const DAY = 86_400;
describe("relative volume tone (C-03)", () => {
  it("uses the same time-of-day slot once enough sessions are loaded", () => {
    const bars: { time: number; volume: number }[] = [];
    for (let d = 0; d <= SLOT_MIN_SESSIONS; d++) {
      bars.push({ time: d * DAY + 3600, volume: 100 + d });     // 01:00 slot
      bars.push({ time: d * DAY + 7200, volume: 10 });          // 02:00 slot (quiet)
    }
    bars[bars.length - 2] = { ...bars[bars.length - 2], volume: 500 }; // today's 01:00 is busy
    const r = readRelativeVolume(bars, bars.length - 2, bars.length - 1, 3600);
    expect(r[0].basis).toBe("SLOT");
    expect(r[0].pct).toBe(1);
    expect(r[0].sample).toBe(SLOT_MIN_SESSIONS);
  });

  it("falls back to a labelled ROLLING baseline with too few sessions", () => {
    const bars = Array.from({ length: 30 }, (_, i) => ({ time: i * 300, volume: i === 29 ? 50 : 100 }));
    const r = readRelativeVolume(bars, 29, 29, 300);
    expect(r[0].basis).toBe("ROLLING");
    expect(r[0].pct).toBe(0);
  });

  it("skips zero / placeholder volume and bars with no baseline", () => {
    const bars = Array.from({ length: 5 }, (_, i) => ({ time: i * 300, volume: i === 4 ? 0 : 100 }));
    expect(readRelativeVolume(bars, 0, 4, 300)).toEqual([]);
  });

  it("ordinary bars take no tone; the busiest take the most", () => {
    expect(rvolToneAlpha(0.5)).toBe(0);
    expect(rvolToneAlpha(0.6)).toBeCloseTo(0.12);
    expect(rvolToneAlpha(1)).toBeCloseTo(0.42);
  });
});
