import { describe, expect, it } from "vitest";
import { memoryMass } from "./memoryMass";

const bar = (time: number, low: number, high: number, volume: number) => ({ time, low, high, volume });

describe("memoryMass (Codex plate 14 memory body)", () => {
  it("normalises against the heaviest row and covers the session's range", () => {
    const bars = [bar(1, 100, 110, 10), bar(2, 104, 106, 50), bar(3, 100, 102, 5), bar(4, 108, 110, 5), bar(5, 104, 106, 40)];
    const rows = memoryMass(bars, 0, 5, 10);
    expect(Math.max(...rows.map(r => r.share))).toBe(1);
    expect(rows[0].lo).toBe(100);
    expect(rows[rows.length - 1].hi).toBeCloseTo(110);
    const heavy = rows.find(r => r.share === 1)!;
    expect(heavy.lo).toBeGreaterThanOrEqual(104);
    expect(heavy.hi).toBeLessThanOrEqual(106.01);
  });
  it("only the session's own bars, and too few bars → nothing", () => {
    expect(memoryMass([bar(1, 1, 2, 1), bar(2, 1, 2, 1)], 0, 9)).toEqual([]);
    const bars = [1, 2, 3, 4, 5, 6].map(t => bar(t, 10, 11, 1));
    expect(memoryMass(bars, 3, 6).length).toBe(0); // 3 bars in (3, 6]
  });
});
