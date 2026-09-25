import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import selectScaffoldingRead, { SEGMENT_BARS } from "./selectScaffoldingRead";
import {
  PRO_PLAQUE,
  SCAFFOLD_CARD_BOX,
  SCAFFOLDING_GLASS_RECEIPTS,
  SLEEVE_PAD_EFFORT,
  SLEEVE_PAD_MIN,
  countRectHits,
  dockClearOfCandles,
  planProSleeve,
  proPlaqueSlots,
  type GlassRect,
} from "./scaffoldingGlass";
import type { AbsorptionAnatomyVM, AnatomyBar } from "@/lib/marketData/selectAbsorptionAnatomy";
import type { MarketStructureVM } from "./selectMarketStructure";

// A camera like the chart's: 10px per bar, 1 price unit = 4px, price 100 at y=500.
const X = (t: number) => 100 + (t / 60) * 10;
const Y = (p: number) => 500 - (p - 100) * 4;
const cam = { timeToX: (t: number) => X(t), priceToY: (p: number) => Y(p) };

const bar = (i: number, close: number, effortNorm: number, displacementNorm: number): AnatomyBar => ({
  time: i * 60, open: close - 0.5, high: close + 0.5, low: close - 1, close,
  effort: effortNorm * 100, effortNorm, delta: null, displacement: 0.5, displacementNorm, absorbing: false,
});
const anatomy = (bars: AnatomyBar[]) => ({
  basis: "VOLUME", measured: true, bars, zones: [], windowBars: bars.length,
  effortConcentration: null, effortQualifyingBars: 0, zoneQualificationPossible: true, effortSpreadNote: null,
} as AbsorptionAnatomyVM);
const structure = (over: Partial<MarketStructureVM> = {}): MarketStructureVM => ({
  measured: true, lookback: 3, barCount: 20, unconfirmedBars: 3, confirmationLagNote: "",
  swingHighs: [], swingLows: [], lastSwingHigh: null, lastSwingLow: null,
  bias: "HIGHER_HIGHS", biasNote: "", insufficientNote: null, ...over,
});
// The plate's story: a rise that is paid for early and stops paying late.
const story = Array.from({ length: 24 }, (_, i) => bar(i, 100 + i, i < 14 ? 0.3 : 0.9, i < 14 ? 0.9 : 0.2));
const read = selectScaffoldingRead({ structure: structure(), absorption: anatomy(story), exhaustion: null });

describe("PRO — the pressure mass is drawn on the REAL candles", () => {
  it("maps every window bar with the chart's own transforms — the read's last 20 bars, not a toy chart", () => {
    const s = planProSleeve(read, cam, 10);
    expect(s.drawn).toBe(true);
    expect(s.points).toHaveLength(20);
    const win = story.slice(-20);
    s.points.forEach((p, i) => {
      expect(p.time).toBe(win[i].time);
      expect(p.x).toBe(X(win[i].time));
      expect(p.yHigh).toBe(Y(win[i].high));
      expect(p.yLow).toBe(Y(win[i].low));
    });
  });

  it("the mass sits AROUND each candle, thicker where the effort was bigger", () => {
    const s = planProSleeve(read, cam, 10);
    for (const p of s.points) {
      expect(p.top).toBeLessThan(p.yHigh); // above the wick
      expect(p.bottom).toBeGreaterThan(p.yLow); // below the wick
    }
    // Neighbour-aware edges: never inside the neighbours' wicks either.
    s.points.forEach((p, i) => {
      for (const q of s.points.slice(Math.max(0, i - 1), i + 2)) {
        expect(p.top).toBeLessThan(q.yHigh);
        expect(p.bottom).toBeGreaterThan(q.yLow);
      }
    });
    // An isolated flat window: the pad past the wick IS the effort.
    const flat = selectScaffoldingRead({
      structure: structure(),
      absorption: anatomy(Array.from({ length: 20 }, (_, i) => bar(i, 100, i === 10 ? 1 : 0, 0.5))),
      exhaustion: null,
    });
    const f = planProSleeve(flat, cam, 10);
    expect(f.points[10].yHigh - f.points[10].top).toBeCloseTo(SLEEVE_PAD_MIN + SLEEVE_PAD_EFFORT);
    expect(f.points[3].yHigh - f.points[3].top).toBeCloseTo(SLEEVE_PAD_MIN);
  });

  it("is split into the read's own conversion cells, tiling the window edge to edge", () => {
    const s = planProSleeve(read, cam, 10);
    expect(s.segments.map(g => g.conversion)).toEqual(read.segments.map(g => g.conversion));
    expect(s.segments).toHaveLength(Math.ceil(20 / SEGMENT_BARS));
    expect(s.segments[0].x0).toBeCloseTo(s.points[0].x - s.halfBar);
    expect(s.segments.at(-1)!.x1).toBeCloseTo(s.points.at(-1)!.x + s.halfBar);
    for (let i = 1; i < s.segments.length; i++) expect(s.segments[i].x0).toBeCloseTo(s.segments[i - 1].x1);
    // Paid for early, not paid for late — the plate's slate → maroon.
    expect(s.segments[0].conversion).toBe("CONVERTING");
    expect(s.segments.at(-1)!.conversion).toBe("NOT CONVERTING");
  });

  it("draws nothing it cannot place: unmeasured → NO_WINDOW, off camera → OFF_CAMERA", () => {
    const none = selectScaffoldingRead({ structure: null, absorption: null, exhaustion: null });
    expect(planProSleeve(none, cam, 10)).toMatchObject({ drawn: false, reason: "NO_WINDOW" });
    const off = planProSleeve(read, { timeToX: () => null, priceToY: Y }, 10);
    expect(off).toMatchObject({ drawn: false, reason: "OFF_CAMERA", points: [] });
  });

  it("the ONE plaque is offered beside the window's last bar, inside the bounds", () => {
    const s = planProSleeve(read, cam, 10);
    const bounds = { x0: 12, y0: 94, x1: 900, y1: 700 };
    const slots = proPlaqueSlots(s, PRO_PLAQUE, bounds)!;
    const last = s.points.at(-1)!;
    expect(slots.preferred.x + slots.preferred.w).toBeLessThanOrEqual(last.x);
    expect(slots.preferred.y + slots.preferred.h).toBeLessThanOrEqual(last.top);
    for (const r of [slots.preferred, ...slots.alternates]) {
      expect(r.w).toBe(PRO_PLAQUE.w);
      expect(r.h).toBe(PRO_PLAQUE.h);
      expect(r.x).toBeGreaterThanOrEqual(bounds.x0);
      expect(r.y).toBeGreaterThanOrEqual(bounds.y0);
      expect(r.x + r.w).toBeLessThanOrEqual(bounds.x1);
      expect(r.y + r.h).toBeLessThanOrEqual(bounds.y1);
    }
    // Small: a plaque, not a card (the old Pro card was 300 × 266 with its own chart).
    expect(PRO_PLAQUE.w * PRO_PLAQUE.h).toBeLessThan((300 * 266) / 5);
  });
});

describe("FOUNDATION / INTERMEDIATE — the card docks where it hides no candle", () => {
  const bounds = { x0: 12, y0: 94, x1: 1200, y1: 800 };
  // A rising market: candles on a diagonal from bottom-left to top-right.
  const candles: GlassRect[] = Array.from({ length: 110 }, (_, i) => ({ x: 12 + i * 10, y: 760 - i * 6, w: 8, h: 40 }));

  it("keeps the preferred spot when it is already clear", () => {
    const d = dockClearOfCandles({ size: { w: 200, h: 100 }, bounds, candles, blockers: [], preferred: { x: 20, y: 100 } });
    expect(d).toMatchObject({ mode: "PREFERRED", hits: 0, rect: { x: 20, y: 100 } });
  });

  it("moves off the candles to the nearest clear spot — never onto a candle or a chip", () => {
    const blockers: GlassRect[] = [{ x: 12, y: 94, w: 300, h: 60 }];
    const d = dockClearOfCandles({ size: SCAFFOLD_CARD_BOX.FOUNDATION, bounds, candles, blockers, preferred: { x: 400, y: 300 } });
    expect(d.mode).toBe("DOCKED");
    expect(countRectHits(d.rect, candles)).toBe(0);
    expect(countRectHits(d.rect, blockers)).toBe(0);
    expect(d.rect.x).toBeGreaterThanOrEqual(bounds.x0);
    expect(d.rect.y).toBeGreaterThanOrEqual(bounds.y0);
    expect(d.rect.x + d.rect.w).toBeLessThanOrEqual(bounds.x1);
    expect(d.rect.y + d.rect.h).toBeLessThanOrEqual(bounds.y1);
  });

  it("any camera: a docked card never covers a candle (seeded fields)", () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let run = 0; run < 60; run++) {
      const field: GlassRect[] = Array.from({ length: 80 }, (_, i) => {
        const y = 120 + rnd() * 600;
        return { x: 12 + i * 14, y, w: 8, h: 10 + rnd() * 80 };
      });
      const d = dockClearOfCandles({ size: SCAFFOLD_CARD_BOX.INTERMEDIATE, bounds, candles: field, blockers: [], preferred: { x: 12, y: 167 } });
      if (d.mode !== "NONE") expect(countRectHits(d.rect, field)).toBe(0);
      else expect(d.hits).toBeGreaterThan(0);
    }
  });

  it("says NONE, with what it covers, when the camera has no room", () => {
    const wall: GlassRect[] = Array.from({ length: 120 }, (_, i) => ({ x: 12 + i * 10, y: 94, w: 10, h: 706 }));
    const d = dockClearOfCandles({ size: SCAFFOLD_CARD_BOX.INTERMEDIATE, bounds, candles: wall, blockers: [], preferred: { x: 12, y: 167 } });
    expect(d.mode).toBe("NONE");
    expect(d.hits).toBeGreaterThan(0);
    expect(d.rect).toMatchObject({ x: 12, y: 167 });
  });
});

describe("receipts", () => {
  it("every scaffolding glass receipt is withdrawn with the anatomy block", () => {
    const SRC = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
    const at = SRC.indexOf("const ANATOMY_BLOCK_RECEIPTS = [");
    const list = SRC.slice(at, SRC.indexOf("] as const;", at));
    for (const k of SCAFFOLDING_GLASS_RECEIPTS) expect(list, k).toContain(`"${k}"`);
  });
});
