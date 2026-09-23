/**
 * THE DELTA-LEVELS GLASS COMPILER'S LAWS.
 *
 * The one this file exists for: SIZE HAS NO PRICE, and nothing in this module
 * may put one on the axis. Grade the levels' shape and no more.
 */

import { describe, expect, it } from "vitest";

import selectDeltaLevelsGlass, { MAX_LANE_RUNGS } from "./selectDeltaLevelsGlass";
import { DELTA_LEVELS_VERSION, type DeltaLevelsVM } from "./selectDeltaLevels";

const vm = (over: Partial<DeltaLevelsVM> = {}): DeltaLevelsVM => ({
  version: DELTA_LEVELS_VERSION,
  levels: [],
  tickSize: 0.01,
  ticksPerLevel: 1,
  maxAbsDelta: 0,
  ...over,
});

describe("H1 — the three silences stay distinct", () => {
  it("null reading is NOT the same as a measured empty window", () => {
    expect(selectDeltaLevelsGlass(null).reason).toBe("NO_READING");
    expect(selectDeltaLevelsGlass(vm({ levels: [] })).reason).toBe("NO_LEVELS");
  });

  it("NO MEASURED GRID means the window never established where a level is", () => {
    // The whole safety argument for this layer. A mark drawn without a
    // measured grid is a price this module cannot vouch for wearing the same
    // ink as one it can.
    const v = selectDeltaLevelsGlass(vm({ tickSize: null, levels: [
      { price: 100, delta: 5, vol: 5 },
    ] as any, maxAbsDelta: 5 }));
    expect(v.drawn).toBe(false);
    expect(v.reason).toBe("NO_MEASURED_GRID");
  });

  it("EVERY LEVEL BALANCED is different from no levels at all", () => {
    // Real, and not a ladder. Counted; not rendered.
    const v = selectDeltaLevelsGlass(vm({
      levels: [{ price: 100, delta: 0, vol: 10 }] as any,
      maxAbsDelta: 0,
    }));
    expect(v.drawn).toBe(false);
    expect(v.reason).toBe("NO_NET_DELTA");
  });
});

describe("A LEVEL IS A PRICE, and nothing here invents one for it", () => {
  it("SPENDS ONLY PRICES THE MODULE VOUCHES FOR", () => {
    // The prices this module emits are the prices `selectDeltaLevels`
    // emitted, unchanged. Any transformation is a level invented here.
    const levels = [
      { price: 100.05, delta: 8, vol: 12 },
      { price: 100.04, delta: -3, vol: 5 },
      { price: 100.03, delta: 0, vol: 4 },
    ];
    const v = selectDeltaLevelsGlass(vm({ levels: levels as any, maxAbsDelta: 8 }));
    expect(v.drawn).toBe(true);
    if (!v.drawn) return;
    const prices = v.rungs.map(r => r.price);
    expect(prices.every(p => levels.some(l => l.price === p))).toBe(true);
  });

  it("PUBLISHES SIZE ONLY AS A UNIT-INTERVAL WEIGHT, never as another price", () => {
    // A ratio has no price. `weight` is a length, for a lane of fixed width in
    // the chrome — a coordinate function may never see it and it may never be
    // handed to a price scale.
    const v = selectDeltaLevelsGlass(vm({
      levels: [{ price: 100, delta: 4, vol: 4 }] as any,
      maxAbsDelta: 8,
    }));
    expect(v.drawn && v.rungs[0].weight).toBe(0.5);
    if (!v.drawn) return;
    for (const r of v.rungs) {
      expect(r.weight).toBeGreaterThanOrEqual(0);
      expect(r.weight).toBeLessThanOrEqual(1);
    }
  });

  it("drops a zero-delta rung — a zero-length lane is indistinguishable from silence", () => {
    const v = selectDeltaLevelsGlass(vm({
      levels: [
        { price: 100, delta: 5, vol: 5 },
        { price: 99, delta: 0, vol: 3 },
        { price: 98, delta: -2, vol: 2 },
      ] as any,
      maxAbsDelta: 5,
    }));
    expect(v.drawn).toBe(true);
    if (!v.drawn) return;
    expect(v.rungs.map(r => r.price)).toEqual([100, 98]);
    expect(v.balanced).toBe(1);
  });
});

describe("§9 — delta is not the direction; two sides told apart by lane, not hue", () => {
  it("SIDE IS A SEMANTIC FIELD, and no colour reaches this module", () => {
    // The house permits classic red/green for DIRECTIONAL price paint. Delta
    // is not that; it is which side crossed the spread. Colouring buy delta
    // green would borrow the candle's meaning for a reading that does not
    // share it.
    const v = selectDeltaLevelsGlass(vm({
      levels: [
        { price: 100, delta: 5, vol: 5 },
        { price: 99, delta: -3, vol: 3 },
      ] as any,
      maxAbsDelta: 5,
    }));
    expect(v.drawn).toBe(true);
    if (!v.drawn) return;
    expect(v.rungs.find(r => r.price === 100)!.side).toBe("BUY");
    expect(v.rungs.find(r => r.price === 99)!.side).toBe("SELL");
    // Aimed at the thing, not the word: `measured` contains "red" and
    // `gridNote` contains "green"-ish substrings that mean neither colour.
    // What §9 forbids is a hue reaching this module — a hex or rgb literal.
    expect(JSON.stringify(v)).not.toMatch(/#[0-9a-f]{3,6}\b|\brgba?\(/i);
  });
});

describe("the strongest levels survive the cap, and the ladder is a ladder", () => {
  it("CAPS AT THE STRONGEST LEVELS, not the nearest", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      price: 100 + i,
      delta: (i + 1) * (i % 2 ? 1 : -1),
      vol: i + 1,
    }));
    const v = selectDeltaLevelsGlass(vm({
      levels: many as any,
      maxAbsDelta: 40,
    }));
    expect(v.drawn).toBe(true);
    if (!v.drawn) return;
    expect(v.rungs.length).toBe(MAX_LANE_RUNGS);
    // The 24 strongest had |delta| >= 17. Anything below must not appear.
    for (const r of v.rungs) {
      const src = many.find(m => m.price === r.price)!;
      expect(Math.abs(src.delta)).toBeGreaterThanOrEqual(17);
    }
  });

  it("RESORTS BY PRICE AFTER CAPPING so a ladder is not read in strength order", () => {
    const v = selectDeltaLevelsGlass(vm({
      levels: [
        { price: 100, delta: 2, vol: 2 },
        { price: 101, delta: 5, vol: 5 },
        { price: 99, delta: -3, vol: 3 },
      ] as any,
      maxAbsDelta: 5,
    }));
    expect(v.drawn && v.rungs.map(r => r.price)).toEqual([101, 100, 99]);
  });
});

describe("the reading names what a level IS on this tape", () => {
  it("prints a grid note that says how a rung was measured, in words", () => {
    const v = selectDeltaLevelsGlass(vm({
      levels: [{ price: 100, delta: 5, vol: 5 }] as any,
      maxAbsDelta: 5,
      tickSize: 0.01,
      ticksPerLevel: 3,
    }));
    expect(v.drawn && v.gridNote).toBe("1 rung = 3 ticks of 0.01, measured off the prints");
  });

  it("says '1 tick' rather than '1 ticks' — small honesty, but still honesty", () => {
    const v = selectDeltaLevelsGlass(vm({
      levels: [{ price: 100, delta: 5, vol: 5 }] as any,
      maxAbsDelta: 5,
      tickSize: 0.25,
      ticksPerLevel: 1,
    }));
    expect(v.drawn && v.gridNote).toBe("1 rung = 1 tick of 0.25, measured off the prints");
  });
});

describe("the module ships no permission", () => {
  it("exports nothing that reads as a verdict on whether to act", async () => {
    const mod = await import("./selectDeltaLevelsGlass");
    for (const key of Object.keys(mod as Record<string, unknown>)) {
      expect(key, key).not.toMatch(/canProceed|isGo|allow|permit|shouldTrade|signal|entry/i);
    }
  });
});
