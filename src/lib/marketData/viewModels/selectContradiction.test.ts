import { describe, expect, it } from "vitest";

import selectContradiction, { type ContradictionInput } from "./selectContradiction";

const base: ContradictionInput = {
  lastClose: 100, lastBarLow: 99.5, lastBarHigh: 100.5,
  structureBias: null, structureNote: null, exhaustion: null, zones: [], medianRange: 1, recentDelta: null,
};

describe("H-401 · contradiction not averaged", () => {
  it("opposing families at price → UNRESOLVED, both lists in full, WAIT", () => {
    const v = selectContradiction({
      ...base,
      structureBias: "HIGHER_HIGHS", structureNote: "last two highs printed higher",
      exhaustion: { direction: "UP", price: 101, followThrough: 0 },
    });
    expect(v.state).toBe("UNRESOLVED");
    expect(v.up.map(l => l.family)).toEqual(["STRUCTURE"]);
    expect(v.down.map(l => l.family)).toEqual(["EXHAUSTION"]);
    expect(v.posture).toMatch(/^WAIT/);
  });

  it("never blends: no score, weight, net or confidence field anywhere", () => {
    const v = selectContradiction({ ...base, structureBias: "LOWER_LOWS", exhaustion: { direction: "DOWN", price: 99, followThrough: 0 } });
    expect(JSON.stringify(Object.keys(v))).not.toMatch(/score|weight|net|confidence|probab/i);
  });

  it("a defended zone at price speaks for its side and sets the band", () => {
    const v = selectContradiction({ ...base, structureBias: "LOWER_LOWS", zones: [{ side: "DEMAND", low: 99, high: 99.8, state: "DEFENDED" }] });
    expect(v.state).toBe("UNRESOLVED");
    expect(v.up[0]).toMatchObject({ family: "ZONE" });
    expect([v.bandLow, v.bandHigh]).toEqual([99, 99.8]);
  });

  it("an unsided tape gives EFFORT no lean — said, not guessed", () => {
    const v = selectContradiction(base);
    expect(v.silent.find(s => s.family === "EFFORT")!.why).toMatch(/no aggressor side/);
    expect(v.state).toBe("NOT_ENOUGH");
    const sided = selectContradiction({ ...base, structureBias: "HIGHER_HIGHS", recentDelta: [-10, -20, 5] });
    expect(sided.state).toBe("UNRESOLVED");
    expect(sided.down[0].family).toBe("EFFORT");
  });

  it("agreement is AGREE, not 'clear'", () => {
    const v = selectContradiction({ ...base, structureBias: "HIGHER_HIGHS", exhaustion: { direction: "DOWN", price: 99, followThrough: 0 } });
    expect(v.state).toBe("AGREE");
    expect(v.posture).not.toMatch(/clear/i);
  });

  it("structure states its evidence as the confirmed pivots, not a sentence", () => {
    const v = selectContradiction({
      ...base, structureBias: "HIGHER_HIGHS", structureNote: "a long owner sentence",
      structurePivots: { h1: 211.7, h2: 213.7, l1: 209.9, l2: 211.9 },
    });
    expect(v.up[0].evidence).toBe("highs 211.70 → 213.70 · lows 209.90 → 211.90");
    const noPivots = selectContradiction({ ...base, structureBias: "HIGHER_HIGHS", structureNote: "owner note" });
    expect(noPivots.up[0].evidence).toBe("owner note");
  });

  // 2026-09-25 — H-401 draws the zone box from where the band began to NOW.
  it("the band knows when it began: the earliest defended zone's birth, else the newest bar", () => {
    const v = selectContradiction({
      ...base, structureBias: "LOWER_LOWS", lastBarTime: 5000,
      zones: [
        { side: "DEMAND", low: 99, high: 99.8, state: "DEFENDED", birthTime: 3000 },
        { side: "DEMAND", low: 99.6, high: 100.2, state: "DEFENDED", birthTime: 2000 },
      ],
    });
    expect(v.bandFrom).toBe(2000);
    const bar = selectContradiction({ ...base, structureBias: "LOWER_LOWS", lastBarTime: 5000 });
    expect([bar.bandLow, bar.bandHigh, bar.bandFrom]).toEqual([99.5, 100.5, 5000]);
    expect(selectContradiction(base).bandFrom).toBeNull();
  });

  it("prices in the evidence speak the market's own decimals", () => {
    const v = selectContradiction({
      ...base, dp: 4, structureBias: "HIGHER_HIGHS",
      structurePivots: { h1: 1.08527, h2: 1.0862, l1: 1.0848, l2: 1.0851 },
      exhaustion: { direction: "UP", price: 1.08619, followThrough: 1 },
    });
    expect(v.up[0].evidence).toBe("highs 1.0853 → 1.0862 · lows 1.0848 → 1.0851");
    expect(v.down[0].evidence).toBe("up-push exhausted at 1.0862 · follow-through 1/3");
  });
});
