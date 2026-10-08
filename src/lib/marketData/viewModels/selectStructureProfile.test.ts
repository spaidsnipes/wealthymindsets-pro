import { describe, expect, it } from "vitest";

import selectStructureProfile, { MIN_LEG_BARS } from "./selectStructureProfile";
import type { MarketStructureVM } from "./selectMarketStructure";

const structure = (over: Partial<MarketStructureVM> = {}): MarketStructureVM => ({
  measured: true,
  lookback: 3,
  barCount: 40,
  unconfirmedBars: 3,
  confirmationLagNote: "",
  swingHighs: [],
  swingLows: [],
  lastSwingHigh: { time: 1_000, price: 110 },
  lastSwingLow: { time: 2_000, price: 100 },
  bias: "UNCLEAR",
  biasNote: "",
  insufficientNote: null,
  ...over,
} as MarketStructureVM);

const bars = (from: number, n: number) =>
  Array.from({ length: n }, (_, i) => ({
    time: from + i * 60,
    open: 100 + i * 0.2,
    high: 100.5 + i * 0.2,
    low: 99.8 + i * 0.2,
    close: 100.3 + i * 0.2,
    volume: 1_000 + (i === 3 ? 9_000 : 0),
  }));

describe("the silences stay distinct", () => {
  it("no structure, no pivot and a short leg are different refusals", () => {
    expect(selectStructureProfile(null, []).reason).toBe("NO_STRUCTURE");
    expect(selectStructureProfile(structure({ measured: false }), []).reason).toBe("NO_STRUCTURE");
    expect(
      selectStructureProfile(structure({ lastSwingHigh: null, lastSwingLow: null }), bars(0, 50)).reason,
    ).toBe("NO_CONFIRMED_PIVOT");
    const short = selectStructureProfile(structure(), bars(2_000, MIN_LEG_BARS - 1));
    expect(short.reason).toBe("LEG_TOO_SHORT");
    expect(short.anchor?.kind).toBe("LOW");
    expect(short.rows).toEqual([]);
  });

  it("zero-volume bars are refused, not drawn as a flat profile", () => {
    const zero = bars(2_000, 12).map(b => ({ ...b, volume: 0 }));
    expect(selectStructureProfile(structure(), zero).reason).toBe("NO_VOLUME");
  });
});

describe("the leg", () => {
  it("anchors at the MORE RECENT confirmed pivot and profiles only bars since it", () => {
    const all = [...bars(0, 20), ...bars(2_000, 12)];
    const v = selectStructureProfile(structure(), all);
    expect(v.drawn).toBe(true);
    expect(v.anchor).toEqual({ kind: "LOW", time: 2_000, price: 100 });
    expect(v.legBars).toBe(12);
    expect(v.asOf).toBe(2_000 + 11 * 60);
  });

  it("a later swing high moves the anchor to the high", () => {
    const v = selectStructureProfile(
      structure({ lastSwingHigh: { time: 3_000, price: 105 } }),
      bars(3_000, 10),
    );
    expect(v.anchor?.kind).toBe("HIGH");
    expect(v.legBars).toBe(10);
  });

  it("POC sits inside the value area; shares are lengths in (0,1]; quality is stated", () => {
    const v = selectStructureProfile(structure(), bars(2_000, 12));
    expect(v.poc!).toBeGreaterThanOrEqual(v.val!);
    expect(v.poc!).toBeLessThanOrEqual(v.vah!);
    expect(v.rows.filter(r => r.isPoc)).toHaveLength(1);
    for (const r of v.rows) {
      expect(r.share).toBeGreaterThan(0);
      expect(r.share).toBeLessThanOrEqual(1);
    }
    expect(v.quality).toBe("candle-estimated");
  });
});

describe("the readable floor (cert lane 2026-10-08: the histogram was nearly unreachable)", () => {
  it("anchors on the newest swing whose leg reaches the floor, else the newest swing", () => {
    // Swings at 0 (high) and 1_200 (low, newest). 20 bars from 0 at 60s → the
    // newest swing's leg is 10 bars, the older one's 30.
    const all = bars(0, 30);
    const s = structure({
      swingHighs: [{ time: 0, price: 106 }], swingLows: [{ time: 1_200, price: 102 }],
      lastSwingHigh: { time: 0, price: 106 }, lastSwingLow: { time: 1_200, price: 102 },
    });
    expect(selectStructureProfile(s, all).anchor).toEqual({ kind: "LOW", time: 1_200, price: 102 });
    const floored = selectStructureProfile(s, all, null, 21);
    expect(floored.anchor).toEqual({ kind: "HIGH", time: 0, price: 106 });
    expect(floored.legBars).toBe(30);
    // No swing reaches the floor → the newest swing, as before.
    expect(selectStructureProfile(s, all, null, 99).anchor).toEqual({ kind: "LOW", time: 1_200, price: 102 });
  });
});
