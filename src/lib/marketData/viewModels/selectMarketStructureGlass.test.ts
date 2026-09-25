import { describe, expect, it } from "vitest";

import selectMarketStructureGlass, { MAX_STRUCTURE_PIVOTS } from "./selectMarketStructureGlass";
import type { MarketStructureVM } from "./selectMarketStructure";

const vm = (over: Partial<MarketStructureVM> = {}): MarketStructureVM => ({
  measured: true,
  lookback: 5,
  barCount: 50,
  unconfirmedBars: 5,
  confirmationLagNote: "the newest 5 bars cannot yet be a pivot",
  swingHighs: [
    { time: 100, price: 101 },
    { time: 200, price: 103 },
    { time: 300, price: 105 },
  ],
  swingLows: [
    { time: 150, price: 99 },
    { time: 250, price: 100 },
  ],
  lastSwingHigh: { time: 300, price: 105 },
  lastSwingLow: { time: 250, price: 100 },
  bias: "HIGHER_HIGHS",
  biasNote: "highs printed higher, lows printed higher",
  insufficientNote: null,
  ...over,
});

describe("H-704 · structure glass", () => {
  it("REFUSES with NO_READING when nothing was compiled", () => {
    expect(selectMarketStructureGlass(null).reason).toBe("NO_READING");
  });

  it("REFUSES with INSUFFICIENT when the compiler could not read a sequence", () => {
    const v = selectMarketStructureGlass(vm({
      measured: false, insufficientNote: "too few bars",
      swingHighs: [], swingLows: [], lastSwingHigh: null, lastSwingLow: null,
    }));
    expect(v.drawn).toBe(false);
    expect(v.reason).toBe("INSUFFICIENT");
    expect(v.confirmationLagNote.length).toBeGreaterThan(0);
  });

  it("REFUSES with NO_PIVOTS when the sequence was read but empty", () => {
    const v = selectMarketStructureGlass(vm({
      swingHighs: [], swingLows: [], lastSwingHigh: null, lastSwingLow: null,
    }));
    expect(v.drawn).toBe(false);
    expect(v.reason).toBe("NO_PIVOTS");
  });

  it("EMITS ONE PIVOT PER SWING — high and low together", () => {
    const v = selectMarketStructureGlass(vm());
    expect(v.drawn).toBe(true);
    if (!v.drawn) return;
    expect(v.pivots.length).toBe(5);
    expect(v.pivots.some(p => p.kind === "HIGH" && p.price === 105)).toBe(true);
    expect(v.pivots.some(p => p.kind === "LOW" && p.price === 100)).toBe(true);
  });

  it("marks the last pivot of each kind as isLast", () => {
    const v = selectMarketStructureGlass(vm());
    if (!v.drawn) throw new Error("expected drawn");
    const lastH = v.pivots.find(p => p.kind === "HIGH" && p.isLast);
    const lastL = v.pivots.find(p => p.kind === "LOW" && p.isLast);
    expect(lastH?.price).toBe(105);
    expect(lastL?.price).toBe(100);
  });

  it("caps at the newest pivots — MAX_STRUCTURE_PIVOTS", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ time: i, price: 100 + i }));
    const v = selectMarketStructureGlass(vm({
      swingHighs: many, swingLows: [],
      lastSwingHigh: many[many.length - 1], lastSwingLow: null,
    }));
    expect(v.drawn && v.pivots.length).toBe(MAX_STRUCTURE_PIVOTS);
    // Newest kept.
    expect(v.drawn && v.pivots[0].time).toBe(29);
  });

  // 2026-09-25 — canon M32 / H-704: each swing carries the trader's letters.
  it("names each swing against the previous swing of its kind — HH/LH/EQH, HL/LL/EQL, none for the first", () => {
    const v = selectMarketStructureGlass(vm({
      swingHighs: [{ time: 100, price: 105 }, { time: 300, price: 103 }, { time: 500, price: 103 }, { time: 700, price: 108 }],
      swingLows: [{ time: 200, price: 99 }, { time: 400, price: 97 }, { time: 600, price: 98 }, { time: 800, price: 98 }],
      lastSwingHigh: { time: 700, price: 108 }, lastSwingLow: { time: 800, price: 98 },
    }));
    if (!v.drawn) throw new Error("expected drawn");
    const at = (t: number) => v.pivots.find(p => p.time === t)!.label;
    expect([at(100), at(300), at(500), at(700)]).toEqual([null, "LH", "EQH", "HH"]);
    expect([at(200), at(400), at(600), at(800)]).toEqual([null, "LL", "HL", "EQL"]);
  });

  it("the letters are read over the whole sequence, so the cap never renames its oldest kept swing", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ time: i, price: 100 + i }));
    const v = selectMarketStructureGlass(vm({ swingHighs: many, swingLows: [], lastSwingHigh: many[29], lastSwingLow: null }));
    if (!v.drawn) throw new Error("expected drawn");
    expect(v.pivots.every(p => p.label === "HH")).toBe(true);
  });

  it("carries bias, biasNote, and the unconfirmed count verbatim", () => {
    const v = selectMarketStructureGlass(vm());
    if (!v.drawn) throw new Error("expected drawn");
    expect(v.bias).toBe("HIGHER_HIGHS");
    expect(v.biasNote).toBe("highs printed higher, lows printed higher");
    expect(v.unconfirmedBars).toBe(5);
  });

  it("emits no permission, no colour, no score", async () => {
    const mod = await import("./selectMarketStructureGlass");
    for (const key of Object.keys(mod as Record<string, unknown>)) {
      expect(key, key).not.toMatch(/canProceed|isGo|allow|permit|shouldTrade|signal|entry/i);
    }
    const v = selectMarketStructureGlass(vm());
    expect(JSON.stringify(v)).not.toMatch(/#[0-9a-f]{3,6}\b|\brgba?\(/i);
  });
});
