/**
 * Garden 16 §29 / F14 — Discovery heat is how UNUSUAL a measured state is,
 * against the symbol's own history and ranked across the universe.
 */
import { describe, expect, it } from "vitest";

import { formatState, intensityColor, measureStates, rankDiscovery, type DailyBar } from "./discoveryStates";

/** 60 calm sessions (±0.5% alternating, volume 100, range 1), then one chosen session. */
function history(last: Partial<DailyBar> = {}): DailyBar[] {
  const bars: DailyBar[] = [];
  let c = 100;
  for (let i = 0; i < 60; i++) {
    c = c * (i % 2 ? 1.005 : 0.995);
    bars.push({ open: c, high: c + 0.5, low: c - 0.5, close: c, volume: 100 });
  }
  const p = bars[bars.length - 1].close;
  bars.push({ open: p, high: p + 0.5, low: p - 0.5, close: p, volume: 100, ...last });
  return bars;
}

describe("measured states", () => {
  it("a calm session measures calm", () => {
    const v = measureStates(history(), { high: 110, low: 90 });
    expect(v.RVOL).toBeCloseTo(1, 5);
    expect(Math.abs(v.MOVE!)).toBeLessThan(0.01);
    expect(v.RANGE).toBeCloseTo(1, 5);
    expect(v.W52).not.toBeNull();
  });

  it("triple volume, a big move and a wide range read as such", () => {
    const base = history();
    const p = base[base.length - 2].close;
    const v = measureStates(history({ volume: 300, close: p * 1.05, high: p * 1.06, low: p * 0.99 }));
    expect(v.RVOL).toBeCloseTo(3, 5);
    expect(v.MOVE!).toBeGreaterThan(5);
    expect(v.RANGE!).toBeGreaterThan(5);
    expect(v.W52).toBeNull(); // no 52-week range given: not measured, not zero
  });

  it("too little history measures nothing", () => {
    expect(Object.values(measureStates(history().slice(-10)))).toEqual([null, null, null, null, null]);
  });
});

describe("ranking", () => {
  it("ranks by unusualness per state; a missing state stays null; most unusual symbol first", () => {
    const rows = rankDiscovery([
      { symbol: "CALM", values: { RVOL: 1, MOVE: 0.1, GAP: 0, RANGE: 1, W52: 0.5 } },
      { symbol: "HOT", values: { RVOL: 4, MOVE: -3, GAP: 1, RANGE: 2, W52: null } },
      { symbol: "MID", values: { RVOL: 2, MOVE: 1, GAP: -2, RANGE: 1.5, W52: 0.98 } },
    ]);
    expect(rows[0].symbol).toBe("HOT");
    expect(rows[0].pct.MOVE).toBe(100); // |−3| is the largest magnitude
    expect(rows[0].pct.W52).toBeNull();
    const mid = rows.find(r => r.symbol === "MID")!;
    expect(mid.pct.GAP).toBe(100);
    expect(mid.pct.W52).toBe(100); // 0.98 is furthest from the middle
    expect(rows.find(r => r.symbol === "CALM")!.pct.RVOL).toBe(0);
  });
});

describe("words and heat", () => {
  it("formats each state and never prints a missing one as zero", () => {
    expect(formatState("RVOL", 2.345)).toBe("2.35×");
    expect(formatState("MOVE", -1.26)).toBe("−1.3σ");
    expect(formatState("W52", 0.975)).toBe("98%");
    expect(formatState("GAP", null)).toBe("—");
  });

  it("heat is unusualness: indigo low, brass high, no up/down colours", () => {
    expect(intensityColor(0)).toBe("rgb(22,20,52)");
    expect(intensityColor(100)).toBe("rgb(232,196,120)");
    expect(intensityColor(null)).toBe("rgba(255,255,255,0.03)");
  });
});
