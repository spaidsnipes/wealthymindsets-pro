import { describe, expect, it } from "vitest";

import {
  ATTENTION_FLOOR,
  LAYER_ATTENTION,
  TIER_CEILING,
  selectAttentionGovernor,
  type AttentionGovernorInput,
  type AttentionLayerKey,
} from "./selectAttentionGovernor";
import { selectSemanticDensity } from "./selectSemanticDensity";
import { DEFAULT_STACK_PREFS, stackOpacity, type ProfileStackPrefs } from "./profileStackPrefs";
import type { StackSpecies } from "./profileStackPlan";

const DEPTHS = ["FAR", "MID", "NEAR", "UNMEASURED"] as const;
const KEYS = Object.keys(LAYER_ATTENTION) as AttentionLayerKey[];

const input = (over: Partial<AttentionGovernorInput> = {}): AttentionGovernorInput => ({
  density: selectSemanticDensity(null),
  questionQuiet: 1,
  regimeLight: null,
  stackPrefs: DEFAULT_STACK_PREFS,
  fusedParents: [],
  feedState: null,
  ...over,
});

/**
 * TODAY'S HAND PRODUCTS — the expressions MainChart multiplied at each site
 * before the governor owned them, written out independently here so the
 * table proves the routing changed nothing but the memory ceiling and the
 * floor. `q` was folded into the density before any of these ran.
 */
function handProduct(
  key: AttentionLayerKey,
  i: AttentionGovernorInput,
): number | null {
  const d = i.density, q = i.questionQuiet;
  const m = i.regimeLight?.magnets ?? 1, t = i.regimeLight?.trend ?? 1;
  const op = (sp: StackSpecies) => stackOpacity(sp, i.stackPrefs);
  const fade = (sp: StackSpecies) => ((i.fusedParents ?? []).includes(sp) ? 0.45 : 1);
  switch (key) {
    case "valueCandle": case "stack": case "divergence": case "weather": case "effort": case "deltaLevels":
      return d.micro * q;
    case "livingProfile": return m * d.mid * q * op("LIVING") * fade("LIVING");
    case "sessionGhosts": return m * d.mid * q * op("LIVING") * fade("LIVING"); // drawn inside Living's alpha
    case "compositeProfile": return m * d.macro * q * op("COMPOSITE") * fade("COMPOSITE");
    case "visibleRangeProfile": return m * d.mid * q * op("VISIBLE_RANGE") * fade("VISIBLE_RANGE");
    case "livingProfileMovie": return m * d.mid * q * op("LIVING");
    case "fusedObject": case "tpo": return m * d.mid * q;
    case "structureProfile": return t * d.mid * q;
    case "profileFusion": case "profileMemory": return m * d.macro * q;
    case "valueMigration": return t * d.mid * q;
    case "marketZones": return d.mid * q;
    case "marketStructure": return t * d.macro * q;
    default: return null;
  }
}
const ROUTED = KEYS.filter(k => handProduct(k, input()) != null);

describe("attention governor — one owner for every governed layer's alpha", () => {
  it("the routed table is the one MainChart painted by hand (proves the table is not empty)", () => {
    expect(ROUTED.length).toBe(19);
  });

  it("UNMEASURED, no quiet, no selection: alpha = today's hand product, except MEMORY capped at 0.5", () => {
    const prefs: ProfileStackPrefs = { ...DEFAULT_STACK_PREFS, opacity: { LIVING: 0.6, COMPOSITE: 1, VISIBLE_RANGE: 0.3 } };
    for (const regimeLight of [null, { magnets: 0.3, trend: 1 }, { magnets: 1, trend: 0.3 }, { magnets: 0.5, trend: 0.5 }]) {
      const i = input({ regimeLight, stackPrefs: prefs });
      const g = selectAttentionGovernor(i);
      for (const k of ROUTED) {
        const today = Math.max(ATTENTION_FLOOR, handProduct(k, i)!);
        const want = LAYER_ATTENTION[k].tier === "MEMORY" ? Math.max(ATTENTION_FLOOR, Math.min(0.5, today)) : today;
        expect(g.alpha(k), `${k} @ ${JSON.stringify(regimeLight)}`).toBeCloseTo(want, 10);
      }
    }
  });

  it("every depth, quiet and fusion: the same product, clamped only by the tier ceiling and the floor", () => {
    for (const depth of DEPTHS) {
      for (const questionQuiet of [1, 0.35]) {
        for (const fusedParents of [[], ["LIVING", "COMPOSITE"]] as StackSpecies[][]) {
          const i = input({ density: selectSemanticDensity(depth), questionQuiet, fusedParents, regimeLight: { magnets: 0.5, trend: 0.3 } });
          const g = selectAttentionGovernor(i);
          for (const k of ROUTED) {
            if (k === "livingProfileMovie" && fusedParents.length) continue; // see the next test
            const ceil = TIER_CEILING[LAYER_ATTENTION[k].tier];
            expect(g.alpha(k), `${k} ${depth} q${questionQuiet}`).toBeCloseTo(Math.max(ATTENTION_FLOOR, Math.min(ceil, handProduct(k, i)!)), 10);
          }
        }
      }
    }
  });

  it("Living's movie now steps back with Living when Living is a fusion parent (it is Living's own trail)", () => {
    const i = input({ fusedParents: ["LIVING", "VISIBLE_RANGE"] });
    const g = selectAttentionGovernor(i);
    expect(g.alpha("livingProfileMovie")).toBeCloseTo(g.alpha("livingProfile"), 10);
    expect(g.alpha("livingProfileMovie")).toBeCloseTo(0.45, 10);
  });

  it("MEMORY sits below the present it remembers, at every depth, quiet and light", () => {
    const pairs: [AttentionLayerKey, AttentionLayerKey][] = [
      ["profileMemory", "compositeProfile"],
      ["sessionGhosts", "livingProfile"],
      ["valueMigration", "structureProfile"],
    ];
    let strictlyBelow = 0;
    for (const depth of DEPTHS) {
      for (const questionQuiet of [1, 0.35]) {
        for (const regimeLight of [null, { magnets: 0.3, trend: 0.3 }]) {
          const g = selectAttentionGovernor(input({ density: selectSemanticDensity(depth), questionQuiet, regimeLight }));
          for (const [mem, present] of pairs) {
            expect(g.alpha(mem), `${mem} vs ${present} @ ${depth}`).toBeLessThanOrEqual(g.alpha(present));
            if (g.alpha(mem) < g.alpha(present)) strictlyBelow++;
          }
          for (const k of KEYS) {
            if (LAYER_ATTENTION[k].tier === "MEMORY") {
              expect(g.alpha(k)).toBeLessThanOrEqual(TIER_CEILING.MEMORY);
              expect(g.alpha(k)).toBeLessThanOrEqual(TIER_CEILING.SUPPORTING);
            }
          }
        }
      }
    }
    // At rest the memory ceiling actually bites (Composite 1, Memory 0.5).
    expect(strictlyBelow).toBeGreaterThan(0);
  });

  it("dims, never deletes: every key > 0 and ≥ the floor, at every depth, quiet and light", () => {
    for (const depth of DEPTHS) {
      for (const questionQuiet of [1, 0.35, 0]) {
        const g = selectAttentionGovernor(input({
          density: selectSemanticDensity(depth), questionQuiet,
          regimeLight: { magnets: 0.3, trend: 0.3 },
          stackPrefs: { ...DEFAULT_STACK_PREFS, opacity: { LIVING: 0.3, COMPOSITE: 0.3, VISIBLE_RANGE: 0.3 } },
          fusedParents: ["LIVING", "COMPOSITE"],
        }));
        for (const k of KEYS) {
          expect(g.alpha(k), k).toBeGreaterThan(0);
          expect(g.alpha(k), k).toBeGreaterThanOrEqual(ATTENTION_FLOOR);
        }
      }
    }
  });

  it("SELECTED = 1 for every governed key, exempt from depth, quiet and light", () => {
    for (const depth of DEPTHS) {
      const g = selectAttentionGovernor(input({ density: selectSemanticDensity(depth), questionQuiet: 0.35, regimeLight: { magnets: 0.3, trend: 0.3 } }));
      for (const k of KEYS) {
        expect(g.alpha(k, { selectedItem: true }), k).toBe(1);
        if (LAYER_ATTENTION[k].tier !== "CHROME") expect(g.tierOf(k, { selectedItem: true })).toBe("SELECTED");
      }
    }
  });

  it("CHROME is never dimmed — not by depth, quiet, light or a stale feed", () => {
    const chrome = KEYS.filter(k => LAYER_ATTENTION[k].tier === "CHROME");
    expect(chrome).toEqual(expect.arrayContaining(["riskOnPrice", "questionLens", "scaffolding", "zoomPlate"]));
    for (const depth of DEPTHS) {
      const g = selectAttentionGovernor(input({ density: selectSemanticDensity(depth), questionQuiet: 0.35, regimeLight: { magnets: 0.3, trend: 0.3 }, feedState: "STALE" }));
      for (const k of chrome) expect(g.alpha(k), k).toBe(1);
    }
  });

  it("STALE feed: the present drops to the STALE ceiling (≤ 0.3); memory keeps its own", () => {
    for (const depth of DEPTHS) {
      const g = selectAttentionGovernor(input({ density: selectSemanticDensity(depth), feedState: "STALE" }));
      for (const k of KEYS) {
        if (LAYER_ATTENTION[k].tier === "LIVE") {
          expect(g.tierOf(k)).toBe("STALE");
          expect(g.alpha(k), k).toBeLessThanOrEqual(0.3);
        }
      }
      expect(g.receipt).toContain("STALE:1");
    }
    const live = selectAttentionGovernor(input({ feedState: "LIVE" }));
    expect(live.alpha("livingProfile")).toBe(1);
    expect(live.receipt).toContain("STALE:0");
  });

  it("the receipt names the depth even when UNMEASURED, and the quiet", () => {
    expect(selectAttentionGovernor(input()).receipt).toBe("D:UNMEASURED|Q:1|SEL:NONE|STALE:0");
    const g = selectAttentionGovernor(input({ density: selectSemanticDensity("NEAR") })).withQuestionQuiet(0.35);
    expect(g.receipt).toBe("D:NEAR|Q:0.35|SEL:NONE|STALE:0");
  });

  it("attentionTiers lists exactly the layers that asked, with the alpha they were given when they asked", () => {
    const g0 = selectAttentionGovernor(input({ density: selectSemanticDensity("MID") }));
    expect(g0.tiersReceipt()).toBe("");
    g0.alpha("bubbles");                       // painted before the Question Lens: not quieted
    const g = g0.withQuestionQuiet(0.35);
    g.alpha("livingProfile");
    g.alpha("marketZones", { selectedItem: true }); // the selected item is not the layer's alpha
    g.alpha("marketZones");
    g.alpha("livingProfile");                  // asked twice, listed once
    g.alpha("profileMemory");
    expect(g.tiersReceipt()).toBe("bubbles:LIVE:1,livingProfile:LIVE:0.35,marketZones:LIVE:0.35,profileMemory:MEMORY:0.21");
    // A layer that never asked (switched OFF) is not listed.
    expect(g.tiersReceipt()).not.toContain("compositeProfile");
  });
});
