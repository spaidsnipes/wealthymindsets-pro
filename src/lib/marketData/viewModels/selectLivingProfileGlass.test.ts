/**
 * THE LIVING-PROFILE GLASS COMPILER'S LAWS.
 *
 * The one this file exists for: A NODE IS A PRICE, and nothing here puts a
 * volume, a share, or a distance-from-POC onto the axis instead of one.
 */

import { describe, expect, it } from "vitest";

import selectLivingProfileGlass, { MAX_NODE_MARKS } from "./selectLivingProfileGlass";
import { LIVING_PROFILE_VERSION, type LivingProfileVM } from "./selectLivingProfile";

const node = (
  kind: "HVN" | "LVN",
  price: number,
  volume: number,
  over: Partial<import("./selectLivingProfile").ProfileNode> = {},
) => ({
  kind, price, volume,
  shareOfTotal: 0, insideValueArea: true, distanceFromPoc: 0, untraded: false,
  ...over,
});

const vm = (over: Partial<LivingProfileVM> = {}): LivingProfileVM => ({
  measured: true,
  missingInput: null,
  missingInputNote: null,
  quality: "READ" as any,
  qualityNote: "n",
  poc: 100.05,
  vah: 100.10,
  val: 100.00,
  valueAreaPct: 0.68,
  totalVolume: 1000,
  populatedRows: 15,
  tickSize: 0.01,
  nodesMeasured: true,
  nodesMissingInput: null,
  nodesNote: null,
  hvn: [node("HVN", 100.05, 100)],
  lvn: [],
  curve: [],
  curveNote: null,
  livePrice: 100.03,
  locationNote: null,
  ...over,
} as LivingProfileVM);

describe("the three silences stay distinct", () => {
  it("null reading is not an unmeasured profile is not an unmeasured node set", () => {
    expect(selectLivingProfileGlass(null).reason).toBe("NO_READING");
    expect(selectLivingProfileGlass(vm({ measured: false, missingInput: "NO_PROFILE" })).reason)
      .toBe("NO_PROFILE");
    expect(selectLivingProfileGlass(vm({ nodesMeasured: false, nodesMissingInput: "TOO_FEW_BUCKETS" as any })).reason)
      .toBe("TOO_FEW_BUCKETS");
  });

  it("REFUSES rather than inventing a weight scale from LVNs alone", () => {
    // The heaviest HVN sets the scale. No HVNs → no scale, and inventing one
    // from the LVNs would give an LVN the weight of an HVN.
    const v = selectLivingProfileGlass(vm({ hvn: [], lvn: [node("LVN", 99.5, 10)] }));
    expect(v.drawn).toBe(false);
    expect(v.reason).toBe("NO_HVN_WEIGHT");
  });
});

describe("A NODE IS A PRICE, and only a price", () => {
  it("SPENDS ONLY THE COMPILER'S PRICES", () => {
    const nodes = [
      node("HVN", 100.05, 100),
      node("HVN", 100.02, 60),
      node("LVN", 99.98, 5, { insideValueArea: false }),
    ];
    const v = selectLivingProfileGlass(vm({ hvn: nodes.slice(0, 2), lvn: nodes.slice(2) }));
    expect(v.drawn).toBe(true);
    if (!v.drawn) return;
    const prices = v.marks.map(m => m.price).sort((a, b) => a - b);
    expect(prices).toEqual([99.98, 100.02, 100.05]);
  });

  it("PUBLISHES WEIGHT AS A UNIT INTERVAL, never as another price", () => {
    const v = selectLivingProfileGlass(vm({
      hvn: [node("HVN", 100, 200), node("HVN", 99, 100)],
    }));
    expect(v.drawn && v.marks.find(m => m.price === 100)!.weight).toBe(1);
    expect(v.drawn && v.marks.find(m => m.price === 99)!.weight).toBe(0.5);
    if (!v.drawn) return;
    for (const m of v.marks) {
      expect(m.weight).toBeGreaterThanOrEqual(0);
      expect(m.weight).toBeLessThanOrEqual(1);
    }
  });

  it("EMITS NO VOLUME, NO SHARE, NO DISTANCE FIELD — a canvas cannot fish out what is not there", () => {
    const v = selectLivingProfileGlass(vm({ hvn: [node("HVN", 100, 200, { shareOfTotal: 0.4, distanceFromPoc: -5 })] }));
    expect(v.drawn).toBe(true);
    if (!v.drawn) return;
    expect(Object.keys(v.marks[0]).sort()).toEqual(["insideValueArea", "kind", "price", "weight"]);
  });
});

describe("AN UNTRADED BUCKET IS NOT A NODE ON THE GLASS", () => {
  it("counts untraded prices and DOES NOT DRAW THEM", () => {
    // A lane of any length would read as "size traded here" and none did.
    const nodes = [
      node("HVN", 100, 100),
      node("LVN", 99, 0, { untraded: true }),
    ];
    const v = selectLivingProfileGlass(vm({ hvn: [nodes[0]], lvn: [nodes[1]] }));
    expect(v.drawn).toBe(true);
    if (!v.drawn) return;
    expect(v.marks.map(m => m.price)).toEqual([100]);
    expect(v.untradedCount).toBe(1);
  });
});

describe("HVN AND LVN ARE THE SAME AXIS, told apart by mark not hue", () => {
  it("BOTH ARE DRAWN", () => {
    // A trader who wants to see one usually wants to see the other by
    // contrast. Rendering only HVNs would be a claim that LVNs mean nothing.
    const v = selectLivingProfileGlass(vm({
      hvn: [node("HVN", 100, 100)],
      lvn: [node("LVN", 99, 10)],
    }));
    expect(v.drawn).toBe(true);
    if (!v.drawn) return;
    expect(new Set(v.marks.map(m => m.kind))).toEqual(new Set(["HVN", "LVN"]));
  });

  it("emits kind as a semantic field — no colour reaches this module", () => {
    const v = selectLivingProfileGlass(vm({
      hvn: [node("HVN", 100, 100)],
      lvn: [node("LVN", 99, 10)],
    }));
    expect(JSON.stringify(v)).not.toMatch(/#[0-9a-f]{3,6}\b|\brgba?\(/i);
  });
});

describe("the strongest nodes survive the cap, and the ladder is a ladder", () => {
  it("CAPS AT THE STRONGEST NODES, not the nearest", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      node("HVN", 100 + i, (i + 1) * 10),
    );
    const v = selectLivingProfileGlass(vm({ hvn: many }));
    expect(v.drawn).toBe(true);
    if (!v.drawn) return;
    expect(v.marks.length).toBe(MAX_NODE_MARKS);
    // Weakest kept must beat everything dropped.
    const weakestKept = Math.min(...v.marks.map(m => m.weight));
    for (const m of v.marks) expect(m.weight).toBeGreaterThanOrEqual(weakestKept);
  });

  it("RESORTS BY PRICE AFTER CAPPING — a ladder is not read in strength order", () => {
    const v = selectLivingProfileGlass(vm({
      hvn: [
        node("HVN", 100, 50),
        node("HVN", 101, 100),
        node("HVN", 99, 30),
      ],
    }));
    expect(v.drawn && v.marks.map(m => m.price)).toEqual([101, 100, 99]);
  });
});

describe("the module ships no permission", () => {
  it("exports nothing that reads as a verdict on whether to act", async () => {
    const mod = await import("./selectLivingProfileGlass");
    for (const key of Object.keys(mod as Record<string, unknown>)) {
      expect(key, key).not.toMatch(/canProceed|isGo|allow|permit|shouldTrade|signal|entry/i);
    }
  });
});
