import { describe, expect, it } from "vitest";

import {
  ATTENTION_FLOOR,
  LAYER_ATTENTION,
  SELECTION_RECEDE,
  STALE_DIM,
  TEXT_ALPHA_FLOOR,
  TIER_CEILING,
  selectAttentionGovernor,
  type AttentionGovernorInput,
  type AttentionLayerKey,
  type AttentionSelection,
} from "./selectAttentionGovernor";
import { selectSemanticDensity } from "./selectSemanticDensity";
import { DEFAULT_STACK_PREFS, stackOpacity, type ProfileStackPrefs } from "./profileStackPrefs";
import type { StackSpecies } from "./profileStackPlan";
import selectRegimeLighting from "./selectRegimeLighting";
import type { RegimeVerdict } from "./selectRegime";

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

  it("STALE feed: every governed layer steps back by one factor and the order LIVE > SUPPORTING > MEMORY holds", () => {
    for (const depth of DEPTHS) {
      const fresh = selectAttentionGovernor(input({ density: selectSemanticDensity(depth) }));
      const g = selectAttentionGovernor(input({ density: selectSemanticDensity(depth), feedState: "STALE" }));
      for (const k of KEYS) {
        if (LAYER_ATTENTION[k].tier === "LIVE") expect(g.tierOf(k)).toBe("STALE");
        if (LAYER_ATTENTION[k].tier === "CHROME") continue;
        expect(g.alpha(k), k).toBeCloseTo(Math.max(ATTENTION_FLOOR, fresh.alpha(k) * STALE_DIM), 10);
      }
      expect(g.receipt).toContain("STALE:1");
    }
    // The present never sinks below memory or its own context.
    const g = selectAttentionGovernor(input({ feedState: "STALE" }));
    expect(g.alpha("absorption")).toBeGreaterThan(g.alpha("expectedEnvelope"));
    expect(g.alpha("expectedEnvelope")).toBeGreaterThan(g.alpha("memoryGhost"));
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

describe("selection focus — the selected object is loudest and everything else recedes", () => {
  const zone: AttentionSelection = { kind: "ZONE", key: "zone:abc", onCamera: true, inspecting: true };

  it("a ZONE inspected on camera: other layers × 0.45, the selected zone at 1", () => {
    const base = selectAttentionGovernor(input());
    const g = selectAttentionGovernor(input({ selection: zone }));
    expect(g.receding).toBe(true);
    expect(g.alpha("livingProfile")).toBeCloseTo(SELECTION_RECEDE * base.alpha("livingProfile"), 10);
    expect(g.alpha("livingProfile")).toBeCloseTo(0.45, 10);
    expect(g.alpha("marketZones", { selectedItem: true })).toBe(1);
    // Unselected zones of the same layer recede with everything else.
    expect(g.alpha("marketZones")).toBeCloseTo(0.45, 10);
    // Memory recedes from its own ceiling, so it stays below the receded present.
    expect(g.alpha("profileMemory")).toBeCloseTo(0.5 * SELECTION_RECEDE, 10);
    expect(g.receipt).toBe("D:UNMEASURED|Q:1|SEL:ZONE|STALE:0");
    expect(g.selectionReceipt).toBe("ZONE:zone:abc");
  });

  it("every governed layer recedes at every depth — but never below the floor, and CHROME never", () => {
    for (const depth of DEPTHS) {
      const i = input({ density: selectSemanticDensity(depth), questionQuiet: 0.35, regimeLight: { magnets: 0.3, trend: 0.3 } });
      const at = selectAttentionGovernor(i);
      const g = selectAttentionGovernor({ ...i, selection: zone });
      for (const k of KEYS) {
        if (LAYER_ATTENTION[k].tier === "CHROME") { expect(g.alpha(k), k).toBe(1); continue; }
        expect(g.alpha(k), k).toBeGreaterThanOrEqual(ATTENTION_FLOOR);
        expect(g.alpha(k), k).toBeLessThanOrEqual(at.alpha(k));
        expect(g.alpha(k), k).toBeCloseTo(Math.max(ATTENTION_FLOOR, at.alpha(k) * SELECTION_RECEDE), 10);
        expect(g.alpha(k, { selectedItem: true }), k).toBe(1);
      }
    }
  });

  it("a selection OFF CAMERA recedes nothing, and says so", () => {
    const g = selectAttentionGovernor(input({ selection: { ...zone, onCamera: false } }));
    expect(g.receding).toBe(false);
    for (const k of KEYS) expect(g.alpha(k), k).toBe(selectAttentionGovernor(input()).alpha(k));
    expect(g.selectionReceipt).toBe("OFF_CAMERA:ZONE");
    expect(g.receipt).toContain("SEL:OFF_CAMERA");
  });

  it("a selection restored with Inspect closed arrives calm: nothing recedes", () => {
    const g = selectAttentionGovernor(input({ selection: { ...zone, inspecting: false } }));
    expect(g.receding).toBe(false);
    expect(g.alpha("livingProfile")).toBe(1);
    expect(g.selectionReceipt).toBe("AT_REST:ZONE");
    expect(g.receipt).toContain("SEL:AT_REST");
  });

  it("names each kind of selection by its own key", () => {
    const rc = (sel: AttentionSelection | null) => selectAttentionGovernor(input({ selection: sel })).selectionReceipt;
    expect(rc(null)).toBe("NONE");
    expect(rc({ kind: "SLICE", key: "101.25", onCamera: true, inspecting: true })).toBe("SLICE:101.25");
    expect(rc({ kind: "BUBBLE", key: "bt:1700000000:101.25", onCamera: true, inspecting: true })).toBe("BUBBLE:bt:1700000000:101.25");
    expect(rc({ kind: "LEVEL", key: "lvl:9", onCamera: true, inspecting: true })).toBe("LEVEL:lvl:9");
    expect(rc({ kind: "BUBBLE", key: "k", onCamera: false, inspecting: true })).toBe("OFF_CAMERA:BUBBLE");
    expect(rc({ kind: "ANATOMY", key: "abs:1700000000", onCamera: true, inspecting: true })).toBe("ANATOMY:abs:1700000000");
  });

  it("an inspected absorption shelf is loudest: its peers and every other layer recede, it paints at 1", () => {
    const g = selectAttentionGovernor(input({
      selection: { kind: "ANATOMY", key: "abs:1700000000", onCamera: true, inspecting: true },
    }));
    expect(g.receding).toBe(true);
    expect(g.alpha("absorption", { selectedItem: true })).toBe(1);
    expect(g.alpha("absorption")).toBeCloseTo(SELECTION_RECEDE, 10);
    expect(g.alpha("exhaustion")).toBeCloseTo(SELECTION_RECEDE, 10);
    // A shelf the window no longer draws recedes nothing.
    const gone = selectAttentionGovernor(input({
      selection: { kind: "ANATOMY", key: "abs:1700000000", onCamera: false, inspecting: true },
    }));
    expect(gone.receding).toBe(false);
    expect(gone.alpha("absorption")).toBe(1);
  });

  it("the Question Lens quiet keeps the focus", () => {
    const g = selectAttentionGovernor(input({ selection: zone })).withQuestionQuiet(0.35);
    expect(g.receding).toBe(true);
    expect(g.alpha("livingProfile")).toBeCloseTo(Math.max(ATTENTION_FLOOR, 0.35 * SELECTION_RECEDE), 10);
    expect(g.selectionReceipt).toBe("ZONE:zone:abc");
  });

  it("words of a receding layer stay legible (≥ 0.5); a louder layer's words are not dimmed", () => {
    const g = selectAttentionGovernor(input({ selection: zone }));
    expect(g.alpha("bigTrades")).toBeCloseTo(0.45, 10);
    expect(g.textAlpha("bigTrades")).toBe(TEXT_ALPHA_FLOOR);
    expect(g.textAlpha("bigTrades", { selectedItem: true })).toBe(1);
    const rest = selectAttentionGovernor(input());
    expect(rest.textAlpha("bigTrades")).toBe(1);
    expect(rest.textAlpha("riskOnPrice")).toBe(1);
  });

  it("the receipt records the receded alpha the layer was given", () => {
    const g = selectAttentionGovernor(input({ selection: zone }));
    g.alpha("livingProfile");
    g.alpha("bubbles", { selectedItem: true });
    g.alpha("bubbles");
    expect(g.tiersReceipt()).toBe("livingProfile:LIVE:0.45,bubbles:LIVE:0.45");
  });
});

describe("H-901 v2 — the regime's own fixtures are dimmed by the governor, not at the paint site", () => {
  // The VM MainChart hands the governor, per verdict.
  const vm = (verdict: RegimeVerdict | null) => selectRegimeLighting(verdict ? { verdict } : null);

  it("each fixture class takes its breaker's fixture light under the SUPPORTING ceiling", () => {
    for (const verdict of ["TREND", "BALANCE", "TRANSITION", "UNKNOWN", null] as const) {
      const light = vm(verdict);
      const g = selectAttentionGovernor(input({ regimeLight: light }));
      expect(g.alpha("regimeChannel"), String(verdict)).toBeCloseTo(Math.max(ATTENTION_FLOOR, Math.min(TIER_CEILING.SUPPORTING, light.fixtures.trend)), 10);
      expect(g.alpha("regimeMagnets"), String(verdict)).toBeCloseTo(Math.max(ATTENTION_FLOOR, Math.min(TIER_CEILING.SUPPORTING, light.fixtures.magnets)), 10);
    }
  });

  it("TREND: channel louder than magnets; RANGE: magnets louder than channel; TRANSITION: both below lit", () => {
    const t = selectAttentionGovernor(input({ regimeLight: vm("TREND") }));
    expect(t.alpha("regimeChannel")).toBeGreaterThan(t.alpha("regimeMagnets"));
    const r = selectAttentionGovernor(input({ regimeLight: vm("BALANCE") }));
    expect(r.alpha("regimeMagnets")).toBeGreaterThan(r.alpha("regimeChannel"));
    const x = selectAttentionGovernor(input({ regimeLight: vm("TRANSITION") }));
    expect(x.alpha("regimeChannel")).toBeLessThan(t.alpha("regimeChannel"));
    expect(x.alpha("regimeMagnets")).toBeLessThan(r.alpha("regimeMagnets"));
  });

  it("NO breaker: the profile family keeps full light while the plate's fixtures stay at pilot — never both blazing", () => {
    const g = selectAttentionGovernor(input({ regimeLight: vm("UNKNOWN") }));
    expect(g.alpha("livingProfile")).toBe(1);
    expect(g.alpha("structureProfile")).toBe(1);
    const lit = selectAttentionGovernor(input({ regimeLight: vm("TREND") })).alpha("regimeChannel");
    expect(g.alpha("regimeChannel")).toBeLessThan(lit);
    expect(g.alpha("regimeMagnets")).toBeLessThan(lit);
  });

  it("a selection recedes the fixtures and the field like any other context", () => {
    const zone: AttentionSelection = { kind: "ZONE", key: "z", onCamera: true, inspecting: true };
    const at = selectAttentionGovernor(input({ regimeLight: vm("TREND") }));
    const g = selectAttentionGovernor(input({ regimeLight: vm("TREND"), selection: zone }));
    for (const k of ["regimeChannel", "regimeMagnets", "regimeField"] as const) {
      expect(LAYER_ATTENTION[k].tier).toBe("SUPPORTING");
      expect(g.alpha(k), k).toBeCloseTo(Math.max(ATTENTION_FLOOR, at.alpha(k) * SELECTION_RECEDE), 10);
    }
  });
});
