import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  INVENTION_DIALS, INVENTION_DIAL_LABEL, INVENTION_DIAL_LAYERS, PROFILE_SPECIES_LAYERS,
  layerDialOpacity, lawfulInventionOpacity,
} from "./appearanceLaw";
import { LAYER_ATTENTION, selectAttentionGovernor, type AttentionGovernorInput } from "@/lib/marketData/viewModels/selectAttentionGovernor";
import { selectSemanticDensity } from "@/lib/marketData/viewModels/selectSemanticDensity";
import { DEFAULT_STACK_PREFS } from "@/lib/marketData/viewModels/profileStackPrefs";

/**
 * PER-INVENTION OPACITY (Founder G19 Supermax §5, 2026-10-10): one dial per market
 * invention, independent of its siblings, never under the readable floor, and never
 * on the order / protection geometry.
 */
describe("the law", () => {
  it("every invention has a label and maps to real governed layers", () => {
    expect(INVENTION_DIALS.length).toBeGreaterThanOrEqual(20);
    for (const k of INVENTION_DIALS) {
      expect(INVENTION_DIAL_LABEL[k].length).toBeGreaterThan(2);
      expect(INVENTION_DIAL_LAYERS[k].length).toBeGreaterThan(0);
      for (const l of INVENTION_DIAL_LAYERS[k]) expect(LAYER_ATTENTION).toHaveProperty(l);
    }
  });
  it("no layer answers to two inventions, and none is a profile species' layer", () => {
    const seen = new Set<string>();
    const species = new Set(Object.values(PROFILE_SPECIES_LAYERS).flat());
    for (const k of INVENTION_DIALS) for (const l of INVENTION_DIAL_LAYERS[k]) {
      expect(seen.has(l), l).toBe(false);
      expect(species.has(l), l).toBe(false);
      seen.add(l);
    }
  });
  it("execution protection and chrome are never dialled", () => {
    const all = INVENTION_DIALS.flatMap(k => INVENTION_DIAL_LAYERS[k]);
    expect(all).not.toContain("riskOnPrice");
    expect(all).not.toContain("questionLens");
    expect(all).not.toContain("zoomPlate");
  });
  it("drops unknown keys and untouched dials; clamps", () => {
    expect(lawfulInventionOpacity({ GAMMA: 0.5, NOPE: 0.5, FVG: 1, WEATHER: 9 })).toEqual({ GAMMA: 0.5, WEATHER: 1.6 });
    expect(lawfulInventionOpacity("x")).toEqual({});
  });
  it("hands the governor one entry per layer, beside the species dials", () => {
    expect(layerDialOpacity({ LIVING: 0.6 }, { CALL_PUT_WALLS: 0.5 })).toEqual({
      livingProfile: 0.6, livingProfileMovie: 0.6, callWall: 0.5, putWall: 0.5,
    });
  });
});

describe("the governor: one invention dims, its siblings stay, the floor holds", () => {
  const base: AttentionGovernorInput = {
    density: selectSemanticDensity(null), questionQuiet: 1, regimeLight: null,
    stackPrefs: DEFAULT_STACK_PREFS, fusedParents: [], feedState: null,
  };
  it("Call / Put Walls dim; Gamma and Brick Walls do not (the Founder's Walls & Gamma separation)", () => {
    const g0 = selectAttentionGovernor(base);
    const g1 = selectAttentionGovernor({ ...base, speciesOpacity: layerDialOpacity(null, { CALL_PUT_WALLS: 0.5 }) });
    expect(g1.alpha("callWall")).toBeLessThan(g0.alpha("callWall"));
    expect(g1.alpha("putWall")).toBeLessThan(g0.alpha("putWall"));
    expect(g1.alpha("gammaHeatmap")).toBe(g0.alpha("gammaHeatmap"));
    expect(g1.alpha("brickWalls")).toBe(g0.alpha("brickWalls"));
  });
  it("a dial up brightens, never past its tier's ceiling", () => {
    const g0 = selectAttentionGovernor(base);
    const g1 = selectAttentionGovernor({ ...base, speciesOpacity: layerDialOpacity(null, { FVG: 1.6 }) });
    expect(g1.alpha("fvg")).toBeGreaterThanOrEqual(g0.alpha("fvg"));
    expect(g1.alpha("fvg")).toBeLessThanOrEqual(1);
  });
  it("family dial × invention dial at their minimum still reads", () => {
    const g = selectAttentionGovernor({ ...base, userOpacity: { WALLS: 0.4 }, speciesOpacity: layerDialOpacity(null, { BRICK_WALLS: 0.4 }) });
    expect(g.alpha("brickWalls")).toBeGreaterThanOrEqual(0.12);
  });
  it("order lines are untouched by every invention dial", () => {
    const all = Object.fromEntries(INVENTION_DIALS.map(k => [k, 0.4]));
    expect(selectAttentionGovernor({ ...base, speciesOpacity: layerDialOpacity(null, all) }).alpha("riskOnPrice"))
      .toBe(selectAttentionGovernor(base).alpha("riskOnPrice"));
  });
});

describe("wired end to end", () => {
  const CHART = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
  const MODAL = readFileSync(path.join(process.cwd(), "src/components/chart/ChartSettingsModal.tsx"), "utf8");
  it("reads the sources", () => {
    expect(CHART.length).toBeGreaterThan(100000);
    expect(MODAL.length).toBeGreaterThan(5000);
  });
  it("MainChart hands both dial sets to the governor", () => {
    expect(CHART).toContain("layerDialOpacity(chartSettings?.profileSpeciesOpacity, chartSettings?.inventionOpacity)");
    expect(CHART).toContain("speciesOpacity: speciesOpacityRef.current,");
  });
  it("Chart Settings offers one dial per invention, written through the law", () => {
    expect(MODAL).toContain("{INVENTION_DIALS.map(k => (");
    expect(MODAL).toContain("set({ inventionOpacity: lawfulInventionOpacity({ ...(s.inventionOpacity ?? {}), [k]: v }) })");
  });
});
