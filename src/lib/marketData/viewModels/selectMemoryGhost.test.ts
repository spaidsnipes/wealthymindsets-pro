import { describe, expect, it } from "vitest";

import selectMemoryGhost, { GHOST_MAX_OPACITY } from "./selectMemoryGhost";

const series = (closes: number[]) => closes.map((close, i) => ({ time: i * 300, close }));
// A distinctive shape: up 5, down 3, repeated noise elsewhere.
const shape = (base: number) => [0, 1, 2, 3, 4, 5, 4, 3, 2, 3, 4, 5, 6, 7, 6, 5, 6, 7, 8, 9].map(x => base + x);
const flat = (n: number, base: number) => Array.from({ length: n }, (_, i) => base + ((i * 7) % 5) * 0.3);

describe("H-201 · memory ghost", () => {
  it("refuses without enough history", () => {
    expect(selectMemoryGhost(series(flat(40, 100))).reason).toBe("INSUFFICIENT_HISTORY");
  });

  it("finds the earlier window that made the same shape, and re-bases it under the live bars", () => {
    const closes = [...flat(10, 100), ...shape(100), ...flat(30, 110), ...shape(200)];
    const v = selectMemoryGhost(series(closes));
    expect(v.drawn).toBe(true);
    expect(v.fit).toBeCloseTo(1, 1);
    expect(v.analogueStart).toBe(10 * 300);
    // Ghost sits on the LIVE bars' times, never beyond the newest bar.
    const liveTimes = series(closes).slice(-20).map(b => b.time);
    expect(v.points.map(p => p.time)).toEqual(liveTimes);
    expect(v.points[0].price).toBeCloseTo(200);
    expect(v.opacity).toBeLessThanOrEqual(0.18);
    expect(GHOST_MAX_OPACITY).toBe(0.18);
  });

  it("no lookahead: the analogue always ends before the live window begins", () => {
    const closes = [...flat(10, 100), ...shape(100), ...flat(30, 110), ...shape(200)];
    const v = selectMemoryGhost(series(closes));
    expect(v.analogueEnd!).toBeLessThan((closes.length - 20) * 300);
  });

  it("a weak fit is silence with a reason, not a faint guess", () => {
    const noise = Array.from({ length: 90 }, (_, i) => 100 + Math.sin(i * 1.7) * 0.2 + ((i * 13) % 7) * 0.05);
    const live = [0, 3, -2, 4, -1, 5, -3, 2, 0, 6, -4, 1, 3, -2, 5, 0, -1, 4, -3, 2].map(x => 100 + x);
    const v = selectMemoryGhost(series([...noise, ...live]));
    if (!v.drawn) expect(v.reason).toBe("NO_ANALOGUE");
    expect(Object.keys(v).some(k => /prob|score|confidence|forecast/i.test(k))).toBe(false);
  });
});
