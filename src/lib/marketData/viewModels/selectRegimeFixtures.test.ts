import { describe, expect, it } from "vitest";

import selectRegimeFixtures, {
  CHANNEL_SIGMAS,
  REGIME_FIXTURES_MIN_BARS,
  type RegimeFixtureBar,
} from "./selectRegimeFixtures";

const T0 = 1_758_800_000;
const bars = (closes: number[]): RegimeFixtureBar[] => closes.map((close, i) => ({ time: T0 + i * 900, close }));

describe("H-901 fixtures — measured from the closes, never from a regime", () => {
  it("☆ magnets sit at MEAN, ±σ and ±2σ of the real closes", () => {
    // 10 × 100 and 10 × 110: mean 105, population σ 5.
    const closes = [...Array(10).fill(100), ...Array(10).fill(110)];
    const vm = selectRegimeFixtures(bars(closes));
    expect(vm.drawn).toBe(true);
    expect(vm.magnets!.mean).toBeCloseTo(105, 10);
    expect(vm.magnets!.sigma).toBeCloseTo(5, 10);
    expect(vm.magnets!.levels.map(l => [l.k, l.price, l.label])).toEqual([
      [-2, 95, "−2σ"], [-1, 100, "−σ"], [0, 105, "MEAN"], [1, 110, "+σ"], [2, 115, "+2σ"],
    ]);
  });

  it("△ channel rides the path: a perfect ramp is its own centre line, boundaries collapse onto it", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 50 + 0.5 * i);
    const vm = selectRegimeFixtures(bars(closes));
    expect(vm.channel!.slopePerBar).toBeCloseTo(0.5, 10);
    expect(vm.channel!.sigma).toBeCloseTo(0, 10);
    const [lo, mid, hi] = vm.channel!.lines;
    expect([lo.side, mid.side, hi.side]).toEqual([-1, 0, 1]);
    expect(mid.fromPrice).toBeCloseTo(50, 10);
    expect(mid.toPrice).toBeCloseTo(64.5, 10);
    expect(lo.fromPrice).toBeCloseTo(50, 10);
    expect(hi.toPrice).toBeCloseTo(64.5, 10);
  });

  it("the channel's boundaries are parallel, ±2 residual σ about a least-squares line", () => {
    // A ramp with an alternating ±1 wiggle: slope survives, residual σ = 1.
    const closes = Array.from({ length: 40 }, (_, i) => 200 + 0.25 * i + (i % 2 === 0 ? 1 : -1));
    const vm = selectRegimeFixtures(bars(closes));
    const [lo, mid, hi] = vm.channel!.lines;
    const width = (l: { fromPrice: number; toPrice: number }) => l.toPrice - l.fromPrice;
    expect(width(lo)).toBeCloseTo(width(mid), 10);
    expect(width(hi)).toBeCloseTo(width(mid), 10);
    expect(hi.fromPrice - mid.fromPrice).toBeCloseTo(CHANNEL_SIGMAS * vm.channel!.sigma, 10);
    expect(mid.fromPrice - lo.fromPrice).toBeCloseTo(CHANNEL_SIGMAS * vm.channel!.sigma, 10);
    expect(vm.channel!.slopePerBar).toBeGreaterThan(0.2);
    expect(vm.channel!.slopePerBar).toBeLessThan(0.3);
    expect(vm.channel!.sigma).toBeGreaterThan(0.9);
    expect(vm.channel!.sigma).toBeLessThan(1.1);
  });

  it("spans exactly the first and newest measured bar — nothing right of now", () => {
    const b = bars(Array.from({ length: 25 }, (_, i) => 10 + Math.sin(i)));
    const vm = selectRegimeFixtures(b);
    expect(vm.fromTime).toBe(b[0].time);
    expect(vm.toTime).toBe(b[b.length - 1].time);
    expect(vm.bars).toBe(25);
  });

  it("a non-finite close keeps its slot: the line stays on the candles it measured", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 50 + 0.5 * i);
    const holed = bars(closes).map((b, i) => (i === 7 ? { ...b, close: Number.NaN } : b));
    const vm = selectRegimeFixtures(holed);
    expect(vm.bars).toBe(29);
    expect(vm.channel!.slopePerBar).toBeCloseTo(0.5, 10);
    expect(vm.channel!.lines[1].toPrice).toBeCloseTo(64.5, 10);
  });

  it("names its silence: too few bars, or no spread at all", () => {
    const few = selectRegimeFixtures(bars(Array.from({ length: REGIME_FIXTURES_MIN_BARS - 1 }, (_, i) => i)));
    expect(few.drawn).toBe(false);
    expect(few.reason).toBe("FEW_BARS");
    expect(few.magnets).toBeNull();
    expect(few.channel).toBeNull();
    const flat = selectRegimeFixtures(bars(Array(30).fill(42)));
    expect(flat.drawn).toBe(false);
    expect(flat.reason).toBe("FLAT");
    expect(selectRegimeFixtures([]).reason).toBe("FEW_BARS");
  });
});
