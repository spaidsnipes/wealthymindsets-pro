import { describe, expect, it } from "vitest";

import {
  ORGANISM_KINDS,
  organismGlyph,
  tpoPeriodInk,
  type OrganismKind,
  LEFT_CHROME_RIGHT,
  LEVEL_PAIR_GAP,
  placeLevelPair,
  LEVEL_CHIP_FONT,
  LEVEL_CHIP_H,
  LIVING_BODY_CANON,
  MEMORY_LEVEL_CAP,
  STRUCTURE_MIN_READABLE_BARS,
  STRUCTURE_MIN_READABLE_PX,
  fusionSilenceWords,
  levelChipNeedsLeader,
  levelChipSlots,
  nearestMemoryLevels,
  structureProfileForm,
  structureSilenceWords,
} from "./profileCanonGlass";
import { placeClearOfKeepOut, rectHits } from "@/lib/chartKeepOut";

describe("the level chip's slots (P-110 / M47)", () => {
  const base = { w: 70, rightX: 1297, floorY: 90, footY: 600 };

  it("prefers the rule's own row, right-aligned to the plot edge", () => {
    const s = levelChipSlots({ ...base, y: 300 });
    expect(s.preferred).toEqual({ x: 1227, y: 300 - LEVEL_CHIP_H / 2, w: 70, h: LEVEL_CHIP_H });
    // Then just above the rule, then just below it — same x.
    expect(s.alternates.map(a => a.y)).toEqual([300 - LEVEL_CHIP_H - 2, 302]);
    expect(s.alternates.every(a => a.x === 1227)).toBe(true);
    expect(s.top).toBe(300 - LEVEL_CHIP_H - 2);
    expect(s.bottom).toBe(302 + LEVEL_CHIP_H);
  });

  it("never rises into the header band or sinks under the pane foot, and collapses duplicate slots", () => {
    const top = levelChipSlots({ ...base, y: 40 });
    expect(top.preferred.y).toBe(90);
    expect([top.preferred, ...top.alternates].every(r => r.y >= 90)).toBe(true);
    // All three rows clamp to the floor except "below the rule" (42 → 90 too): one slot.
    expect(top.alternates.length).toBe(0);
    const foot = levelChipSlots({ ...base, y: 598 });
    expect([foot.preferred, ...foot.alternates].every(r => r.y + r.h <= 600)).toBe(true);
  });

  it("a candle under the rule's row moves the chip to a clear slot — never onto the candle", () => {
    const s = levelChipSlots({ ...base, y: 300 });
    // A candle body straddling the rule's row under the preferred slot.
    const candle = { x: 1250, y: 290, w: 8, h: 18 };
    const spot = placeClearOfKeepOut(s.preferred, [candle], { minX: 4, blockers: [], strict: true, alternates: s.alternates });
    expect(spot.mode).not.toBe("CLEAR");
    expect(spot.onCandles).toBe(false);
    expect(rectHits(spot.rect, [candle])).toBe(0);
  });

  it("prints at the house's 11px readable floor, in a box taller than its glyphs", () => {
    const px = Number(/(\d+(?:\.\d+)?)px/.exec(LEVEL_CHIP_FONT)?.[1]);
    expect(px).toBeGreaterThanOrEqual(11);
    expect(LEVEL_CHIP_H).toBeGreaterThanOrEqual(px + 3);
  });

  it("names when a leader is owed", () => {
    expect(levelChipNeedsLeader({ x: 0, y: 293.5, w: 10, h: 13 }, 300, false)).toBe(false);
    expect(levelChipNeedsLeader({ x: 0, y: 285, w: 10, h: 13 }, 300, false)).toBe(true);
    expect(levelChipNeedsLeader({ x: 0, y: 293.5, w: 10, h: 13 }, 300, true)).toBe(true);
  });
});

describe("the level pair (M47: one name + one price chip, placed as a unit)", () => {
  const base = { y: 300, nameW: 24, chipW: 50, nameX: 1000, chipRightX: 1150, floorY: 90, footY: 600, minX: 84, blockers: [] as { x: number; y: number; w: number; h: number }[] };
  const clear = (r: { x: number; y: number; w: number; h: number } | null, boxes: { x: number; y: number; w: number; h: number }[]) =>
    r != null && rectHits(r, boxes) === 0;

  it("no candles: name at the column's left, chip at the axis, both on the rule's row", () => {
    const p = placeLevelPair({ ...base, keepOut: [] });
    expect(p.mode).toBe("ROW");
    expect(p.chip).toEqual({ x: 1100, y: 300 - LEVEL_CHIP_H / 2, w: 50, h: LEVEL_CHIP_H });
    expect(p.name).toEqual({ x: 1000, y: 300 - LEVEL_CHIP_H / 2, w: 24, h: LEVEL_CHIP_H });
    expect(p.leader).toBe(false);
  });

  it("candles under the whole column across every nearby row (the Regime-desk case): the pair slides left together, clear of all of them", () => {
    // Sep 25 bodies at x 1040–1150 spanning y 250–360 — every row of the column is taken.
    const candles = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => ({ x: 1040 + k * 11, y: 250, w: 9, h: 110 }));
    const p = placeLevelPair({ ...base, keepOut: candles });
    expect(p.mode).toBe("SLID");
    expect(clear(p.chip, candles)).toBe(true);
    expect(clear(p.name, candles)).toBe(true);
    expect(p.name!.x + p.name!.w).toBeLessThanOrEqual(p.chip.x);
    expect(p.chip.x - (p.name!.x + p.name!.w)).toBe(LEVEL_PAIR_GAP);
    expect(p.leader).toBe(true);
  });

  it("never prints the pair on a chip already on the glass; steps to a clear row first", () => {
    const chipThere = { x: 1090, y: 290, w: 70, h: 20 };
    const p = placeLevelPair({ ...base, keepOut: [], blockers: [chipThere] });
    expect(p.mode).toBe("ROW");
    expect(clear(p.chip, [chipThere])).toBe(true);
  });

  it("nowhere clear: the chip keeps its row and yields, the name is withheld — never a name on a candle", () => {
    const wall = [{ x: 0, y: 0, w: 2000, h: 1000 }];
    const p = placeLevelPair({ ...base, keepOut: wall });
    expect(p.mode).toBe("YIELDED");
    expect(p.name).toBeNull();
    expect(p.onCandles).toBe(true);
  });

  it("never slides left of the left chrome", () => {
    expect(LEFT_CHROME_RIGHT).toBe(84);
    const candles = [{ x: 90, y: 0, w: 1100, h: 1000 }];
    const p = placeLevelPair({ ...base, keepOut: candles });
    expect(p.mode).toBe("YIELDED");
  });
});

describe("Structure readability", () => {
  it("a short leg or a leg with no room draws its rule, not a histogram", () => {
    expect(structureProfileForm(13, 400)).toBe("RULE_SHORT_LEG");
    expect(structureProfileForm(STRUCTURE_MIN_READABLE_BARS - 1, 400)).toBe("RULE_SHORT_LEG");
    expect(structureProfileForm(STRUCTURE_MIN_READABLE_BARS, STRUCTURE_MIN_READABLE_PX - 1)).toBe("RULE_NO_ROOM");
    expect(structureProfileForm(STRUCTURE_MIN_READABLE_BARS, STRUCTURE_MIN_READABLE_PX)).toBe("HISTOGRAM");
    expect(structureProfileForm(Number.NaN, 400)).toBe("RULE_SHORT_LEG");
  });

  it("names the silence from the leg's own numbers, at the market's precision", () => {
    expect(structureSilenceWords({ form: "RULE_SHORT_LEG", kind: "HIGH", anchorPrice: 374.54, legBars: 13, poc: 372.35, dp: 2 }))
      .toBe("STRUCTURE · 13-BAR LEG FROM SWING HIGH 374.54 · TOO SHORT TO PROFILE (21+)");
    expect(structureSilenceWords({ form: "RULE_NO_ROOM", kind: "LOW", anchorPrice: 1.08412, legBars: 40, poc: null, dp: 5 }))
      .toBe("STRUCTURE · LEG FROM SWING LOW 1.08412 BEGAN TOO NEAR NOW TO PROFILE");
    expect(structureSilenceWords({ form: "HISTOGRAM", kind: "LOW", anchorPrice: 1, legBars: 40, poc: 1, dp: 2 })).toBeNull();
  });
});

describe("Fusion names its silence", () => {
  it("alone: needs two species, says how many are on", () => {
    expect(fusionSilenceWords({ reason: "FEWER_THAN_TWO_SPECIES", speciesOffered: [], tolerance: null }, 2))
      .toBe("PROFILE FUSION · silent — needs 2 profile species on, 0 on");
    expect(fusionSilenceWords({ reason: "FEWER_THAN_TWO_SPECIES", speciesOffered: ["LIVING"], tolerance: null }, 2))
      .toBe("PROFILE FUSION · silent — needs 2 profile species on, 1 on (LIVING)");
  });

  it("no agreement: the tolerance at the market's precision", () => {
    expect(fusionSilenceWords({ reason: "NO_AGREEMENT", speciesOffered: ["LIVING", "TPO"], tolerance: 0.2936 }, 2))
      .toBe("PROFILE FUSION · silent — 2 species on (LIVING, TPO), no levels agree within ±0.29");
  });

  it("drawn: no silence", () => {
    expect(fusionSilenceWords({ reason: "DRAWN", speciesOffered: ["LIVING", "TPO"], tolerance: 0.3 }, 2)).toBeNull();
  });
});

describe("Memory keeps the nearest few levels to price", () => {
  const lv = (sessionsAgo: number, kind: string, price: number) => ({ sessionsAgo, kind, price });
  const levels = [
    lv(1, "POC", 366), lv(1, "VAH", 371.8), lv(1, "VAL", 361),
    lv(2, "POC", 376), lv(2, "VAH", 380), lv(2, "VAL", 372),
    lv(5, "VAH", 365.3), lv(5, "POC", 358), lv(5, "VAL", 350),
  ];

  it("keeps the cap nearest to the last price, in input order", () => {
    const r = nearestMemoryLevels(levels, 366.2, 4);
    // Distances: 1POC 0.2 · 5VAH 0.9 · 1VAL 5.2 · 1VAH 5.6 — then 2VAL 5.8 (withheld).
    expect(r.kept.map(l => `${l.sessionsAgo}${l.kind}`)).toEqual(["1POC", "1VAH", "1VAL", "5VAH"]);
    expect(r.withheld).toBe(5);
  });

  it("the tier decides the count: memory at rest keeps fewer than a selected level", () => {
    expect(MEMORY_LEVEL_CAP.MEMORY).toBeLessThan(MEMORY_LEVEL_CAP.SELECTED);
    expect(MEMORY_LEVEL_CAP.STALE).toBeLessThan(MEMORY_LEVEL_CAP.MEMORY);
    expect(nearestMemoryLevels(levels, 366, MEMORY_LEVEL_CAP.MEMORY).kept.length).toBe(4);
    expect(nearestMemoryLevels(levels, 366, MEMORY_LEVEL_CAP.SELECTED).kept.length).toBe(9);
  });

  it("no last price: the most recent sessions first; a cap of 0 keeps nothing", () => {
    expect(nearestMemoryLevels(levels, null, 3).kept.map(l => l.sessionsAgo)).toEqual([1, 1, 1]);
    expect(nearestMemoryLevels(levels, 366, 0)).toEqual({ kept: [], withheld: 9 });
  });
});

describe("the P-110 body is a solid mass, not a wash", () => {
  it("value is the densest ink, the tails quieter, both far above the old 0.04–0.40 wash", () => {
    expect(LIVING_BODY_CANON.valueBase).toBeGreaterThanOrEqual(0.75);
    expect(LIVING_BODY_CANON.valueTip).toBeGreaterThan(LIVING_BODY_CANON.valueBase);
    expect(LIVING_BODY_CANON.tailBase).toBeGreaterThanOrEqual(0.45);
    expect(LIVING_BODY_CANON.tailBase).toBeLessThan(LIVING_BODY_CANON.valueBase);
    expect(LIVING_BODY_CANON.valueTip).toBeLessThanOrEqual(1);
  });
});

describe("the organism glyphs (P-110 organism plate)", () => {
  it("all eleven kinds have a glyph of pure geometry inside the unit box — no text primitive exists", () => {
    expect(ORGANISM_KINDS.length).toBe(11);
    const signatures = new Set<string>();
    for (const k of ORGANISM_KINDS) {
      const g = organismGlyph(k);
      expect(g.length, k).toBeGreaterThanOrEqual(2);
      for (const p of g) {
        expect(["poly", "circle", "arc"], k).toContain(p.k);
        const pts = p.k === "poly" ? p.pts : [[p.cx - p.r, p.cy - p.r], [p.cx + p.r, p.cy + p.r]];
        for (const [x, y] of pts) {
          expect(Math.abs(x), k).toBeLessThanOrEqual(1.0001);
          expect(Math.abs(y), k).toBeLessThanOrEqual(1.0001);
        }
      }
      signatures.add(JSON.stringify(g));
    }
    // Eleven different shapes: no two species share a glyph.
    expect(signatures.size).toBe(11);
  });

  it("the three the recognition test could not tell apart are unlike one another", () => {
    const kinds = (k: OrganismKind) => organismGlyph(k).map(p => p.k).sort().join(",");
    expect(kinds("TPO")).not.toBe(kinds("COMPOSITE"));
    expect(kinds("COMPOSITE")).not.toBe(kinds("VRP"));
    expect(organismGlyph("TPO").every(p => p.k === "poly" && p.fill === true)).toBe(true);
  });

  it("TPO's period ink runs from the recessed voice (early) to brass (late)", () => {
    expect(tpoPeriodInk([194, 184, 146], [201, 165, 92], 0)).toBe("194,184,146");
    expect(tpoPeriodInk([194, 184, 146], [201, 165, 92], 1)).toBe("201,165,92");
    expect(tpoPeriodInk([0, 0, 0], [100, 100, 100], 0.5)).toBe("50,50,50");
    expect(tpoPeriodInk([0, 0, 0], [100, 100, 100], 7)).toBe("100,100,100");
  });
});
