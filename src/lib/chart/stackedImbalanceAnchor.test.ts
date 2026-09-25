import { describe, expect, it } from "vitest";

import { stackAnchor, type StackAnchorChart } from "./stackedImbalanceAnchor";

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
