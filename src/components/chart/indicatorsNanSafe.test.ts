import { describe, expect, it } from "vitest";
import { ema, rsi, schaffTrendCycle, stochasticMomentumIndex } from "./indicators";

describe("Garden 19 §8 audit · indicators survive their own warm-up", () => {
  const closes = Array.from({ length: 200 }, (_, i) => 100 + Math.sin(i / 7) * 5 + i * 0.05);
  const bars = closes.map((c, i) => ({ time: i, open: c - 0.3, high: c + 1, low: c - 1, close: c, volume: 100 }));
  it("an EMA of a series with leading NaN seeds at the first real value (was NaN for ever)", () => {
    const e = ema([NaN, NaN, 10, 10, 10], 3);
    expect(Number.isNaN(e[0]) && Number.isNaN(e[1])).toBe(true);
    expect(e[4]).toBeCloseTo(10);
    expect(ema([1, 2, 3], 2)).toEqual([1, 1 * (1 / 3) + 2 * (2 / 3), (1 * (1 / 3) + 2 * (2 / 3)) * (1 / 3) + 3 * (2 / 3)]);
  });
  it("Smoothed RSI, Schaff Trend Cycle and SMI end on a real number", () => {
    expect(Number.isFinite(ema(rsi(closes), 3).at(-1)!)).toBe(true);
    expect(Number.isFinite(schaffTrendCycle(closes).at(-1)!)).toBe(true);
    const smi = stochasticMomentumIndex(bars as never).smi.at(-1)!;
    expect(Number.isFinite(smi) && smi !== 0).toBe(true);
  });
});
