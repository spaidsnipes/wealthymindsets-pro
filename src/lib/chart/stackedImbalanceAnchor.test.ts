import { describe, expect, it } from "vitest";

import { barTimeAtOrBefore, stackAnchor, stackSlab, type StackAnchorChart } from "./stackedImbalanceAnchor";

/** One bar a minute from t=0; bar k sits at x = x0 + k·spacing, on screen or not. */
function camera(x0: number, spacing: number): StackAnchorChart {
  return {
    timeScale: () => ({
      timeToCoordinate: (t: never) => x0 + (Number(t) / 60) * spacing,
      options: () => ({ barSpacing: spacing }),
    }),
  };
}
const bars = Array.from({ length: 200 }, (_, k) => ({ time: k * 60 }));
const PLOT_RIGHT = 600;

describe("the stack sits on the bars that built it, or says why it cannot", () => {
  it("formation in view → cells on exactly those bars", () => {
    // Bars 100..102 at x = 100·10−900 … → 100, 110, 120.
    const p = stackAnchor(camera(-900, 10), bars, 100 * 60, 102 * 60, PLOT_RIGHT);
    expect(p).toEqual({ kind: "ON_BARS", x0: 95, x1: 125, key: `${100 * 60}-${102 * 60}` });
  });

  it("formation wholly off the LEFT → no cells on the bars at the plot edge", () => {
    // Bars 10..12 land at x = −800 … −780: they built the stack and none is in view.
    const p = stackAnchor(camera(-900, 10), bars, 10 * 60, 12 * 60, PLOT_RIGHT);
    expect(p).toEqual({ kind: "FORMED_BEFORE_VIEW" });
  });

  it("formation wholly off the RIGHT → nothing, never a level painted onto earlier bars", () => {
    // Scrolled back: bars 150..152 land at x = 1500+, past the plot.
    const p = stackAnchor(camera(0, 10), bars, 150 * 60, 152 * 60, PLOT_RIGHT);
    expect(p).toEqual({ kind: "FORMED_AFTER_VIEW" });
  });

  it("formation straddling an edge keeps only its visible part", () => {
    const left = stackAnchor(camera(-900, 10), bars, 88 * 60, 92 * 60, PLOT_RIGHT);
    expect(left).toMatchObject({ kind: "ON_BARS", x0: 0, x1: 25 });
    const right = stackAnchor(camera(0, 10), bars, 58 * 60, 70 * 60, PLOT_RIGHT);
    expect(right).toMatchObject({ kind: "ON_BARS", x0: 575, x1: PLOT_RIGHT });
  });

  it("no formation time → TIME_UNKNOWN, the full band that claims no bar", () => {
    expect(stackAnchor(camera(0, 10), bars, null, 60, PLOT_RIGHT)).toEqual({ kind: "TIME_UNKNOWN" });
    expect(stackAnchor(camera(0, 10), bars, -120, -60, PLOT_RIGHT)).toEqual({ kind: "TIME_UNKNOWN" });
  });
});

describe("finding the formation bars costs a search, not a walk of the history", () => {
  it("returns the last bar at or before the time, as a forward walk would", () => {
    expect(barTimeAtOrBefore(bars, null)).toBeNull();
    expect(barTimeAtOrBefore(bars, -1)).toBeNull();
    expect(barTimeAtOrBefore(bars, 0)).toBe(0);
    expect(barTimeAtOrBefore(bars, 125)).toBe(120);
    expect(barTimeAtOrBefore(bars, 120)).toBe(120);
    expect(barTimeAtOrBefore(bars, 1e9)).toBe(199 * 60);
    expect(barTimeAtOrBefore([], 60)).toBeNull();
  });

  it("reads a logarithmic number of bars on a 3000-bar history, every frame", () => {
    let reads = 0;
    const counted = Array.from({ length: 3000 }, (_, k) => ({ get time() { reads++; return k * 60; } }));
    const p = stackAnchor(camera(-29500, 10), counted, 2990 * 60, 2992 * 60, PLOT_RIGHT);
    expect(p.kind).toBe("ON_BARS");
    // Two searches of at most ⌈log2 3000⌉ + 1 = 13 reads each; a forward walk
    // reads about 6000.
    expect(reads).toBeLessThanOrEqual(26);
  });
});

describe("each level's slab stays on the bars that built the stack", () => {
  it("never runs past the formation span, however strong the level", () => {
    // One formation bar at NEAR (30px spacing), five bars back: the span is 30px.
    const one = { x0: 400, x1: 430 };
    for (const weight of [0, 0.25, 0.5, 1, 1.4]) {
      const s = stackSlab(one, weight);
      expect(s.x).toBe(one.x0);
      expect(s.x + s.w).toBeLessThanOrEqual(one.x1);
    }
    // At FAR the span can be a single 4px bar; the slab still ends inside it.
    const far = stackSlab({ x0: 100, x1: 104 }, 1);
    expect(far.x + far.w).toBeLessThanOrEqual(104);
  });

  it("length is the level's dominance as a share of the span", () => {
    const a = { x0: 0, x1: 100 };
    expect(stackSlab(a, 0).w).toBeCloseTo(30);
    expect(stackSlab(a, 0.5).w).toBeCloseTo(65);
    expect(stackSlab(a, 1).w).toBeCloseTo(100);
    expect(stackSlab(a, Number.NaN).w).toBeCloseTo(30);
  });
});
