/**
 * The live profile (closed bars once per bar + the forming bar per paint) answers EXACTLY what
 * the full build answers, and builds the closed buckets once while the forming bar ticks
 * (Garden 19 finish-line order §7, 2026-10-15: VP columns cost 18–20 ms per paint on a busy tape).
 */
import { beforeEach, describe, expect, it } from "vitest";
import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import { computeProfileFromBars, computeProfileFromBarsLive, liveProfileClosedBuilds, resetLiveProfileCache } from "./vpEngine";

function bars(n: number, seed = 7): LegacyOhlcvTuple[] {
  let x = seed, p = 29800;
  const out: LegacyOhlcvTuple[] = [];
  for (let i = 0; i < n; i++) {
    x = (x * 1103515245 + 12345) % 2147483648;
    const r = x / 2147483648;
    const o = p, c = p + (r - 0.5) * 40;
    out.push({ time: 1_792_000_000 + i * 300, open: o, high: Math.max(o, c) + r * 10, low: Math.min(o, c) - (1 - r) * 10, close: c, volume: 100 + Math.round(r * 900) });
    p = c;
  }
  return out;
}

describe("computeProfileFromBarsLive", () => {
  beforeEach(() => resetLiveProfileCache());

  it("equals the full build, forming bar included, on every reading of the forming bar", () => {
    const base = bars(400);
    const opts = { targetRows: 120, valueAreaPct: 0.7, instrumentTick: 0.25 };
    for (const dv of [0, 50, 125, 999]) {
      const last = base[base.length - 1];
      const live = [...base.slice(0, -1), { ...last, high: last.high + dv * 0.01, close: last.close + dv * 0.005, volume: last.volume + dv }];
      expect(computeProfileFromBarsLive(live, opts, "NQ1!")).toEqual(computeProfileFromBars(live, opts));
    }
    // The closed buckets were built ONCE for the four readings (same closed bars, same tick).
    expect(liveProfileClosedBuilds()).toBe(1);
  });

  it("a new bar closing rebuilds the closed buckets once; a forming bar that widens the range changes the tick and rebuilds honestly", () => {
    const base = bars(300);
    const opts = { targetRows: 100 };
    computeProfileFromBarsLive(base, opts, "k");
    computeProfileFromBarsLive([...base, { ...base[base.length - 1], time: base[base.length - 1].time + 300 }], opts, "k");
    expect(liveProfileClosedBuilds()).toBe(2);
    const wide = [...base.slice(0, -1), { ...base[base.length - 1], high: base[base.length - 1].high + 5000, volume: 50 }];
    expect(computeProfileFromBarsLive(wide, opts, "k")).toEqual(computeProfileFromBars(wide, opts));
  });

  it("one or zero bars fall back to the full build", () => {
    expect(computeProfileFromBarsLive([], {}, "k")).toEqual(computeProfileFromBars([], {}));
    const one = bars(1);
    expect(computeProfileFromBarsLive(one, { targetRows: 50 }, "k")).toEqual(computeProfileFromBars(one, { targetRows: 50 }));
  });
});
