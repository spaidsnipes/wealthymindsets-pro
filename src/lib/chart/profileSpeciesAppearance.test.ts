import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PROFILE_SPECIES, PROFILE_SPECIES_LABEL, PROFILE_SPECIES_LAYERS,
  clampSpeciesOpacity, drawingSpeciesAlpha, lawfulSpeciesOpacity, speciesLayerOpacity,
} from "./appearanceLaw";
import { LAYER_ATTENTION, selectAttentionGovernor, type AttentionGovernorInput } from "@/lib/marketData/viewModels/selectAttentionGovernor";
import { selectSemanticDensity } from "@/lib/marketData/viewModels/selectSemanticDensity";
import { DEFAULT_STACK_PREFS } from "@/lib/marketData/viewModels/profileStackPrefs";

/**
 * PER-SPECIES PROFILE DIALS (Founder 2026-10-10: "all eleven profiles …
 * independent colour / opacity"). Loudness only — a dial never changes a
 * species' form, so no setting can make two species identical.
 */
describe("the law", () => {
  it("names all eleven species (Session and Classic VP share one painter, one dial)", () => {
    expect(PROFILE_SPECIES).toHaveLength(11);
    for (const sp of PROFILE_SPECIES) expect(PROFILE_SPECIES_LABEL[sp].length).toBeGreaterThan(1);
  });
  it("maps every governed species to real governor layers; drawings have none", () => {
    for (const sp of PROFILE_SPECIES) for (const l of PROFILE_SPECIES_LAYERS[sp]) expect(LAYER_ATTENTION).toHaveProperty(l);
    expect(PROFILE_SPECIES_LAYERS.FIXED_RANGE).toEqual([]);
    expect(PROFILE_SPECIES_LAYERS.BID_ASK).toEqual([]);
  });
  it("clamps to the governor's dial range", () => {
    expect(clampSpeciesOpacity(0)).toBe(0.4);
    expect(clampSpeciesOpacity(9)).toBe(1.6);
    expect(clampSpeciesOpacity("x")).toBe(1);
    expect(clampSpeciesOpacity(0.84)).toBe(0.8);
  });
  it("drops unknown keys and untouched dials", () => {
    expect(lawfulSpeciesOpacity({ LIVING: 0.5, NOT_A_SPECIES: 0.5, TPO: 1 })).toEqual({ LIVING: 0.5 });
    expect(lawfulSpeciesOpacity(null)).toEqual({});
  });
  it("hands the governor one entry per governed layer", () => {
    expect(speciesLayerOpacity({ LIVING: 0.6, FIXED_RANGE: 0.5 })).toEqual({ livingProfile: 0.6, livingProfileMovie: 0.6 });
  });
  it("a drawing's dial multiplies its site alpha, never above 1 and never under the readable floor", () => {
    expect(drawingSpeciesAlpha(1, undefined)).toBe(1);
    expect(drawingSpeciesAlpha(1, 1.6)).toBe(1);
    expect(drawingSpeciesAlpha(0.5, 0.4)).toBe(0.2);
    expect(drawingSpeciesAlpha(0.1, 0.4)).toBe(0.1);
  });
});

describe("the governor applies a species dial after the family dial, under the same floor", () => {
  const base: AttentionGovernorInput = {
    density: selectSemanticDensity(null), questionQuiet: 1, regimeLight: null,
    stackPrefs: DEFAULT_STACK_PREFS, fusedParents: [], feedState: null,
  };
  it("dims one species and leaves its siblings alone", () => {
    const g0 = selectAttentionGovernor(base);
    const g1 = selectAttentionGovernor({ ...base, speciesOpacity: speciesLayerOpacity({ COMPOSITE: 0.5 }) });
    expect(g1.alpha("compositeProfile")).toBeLessThan(g0.alpha("compositeProfile"));
    expect(g1.alpha("tpo")).toBe(g0.alpha("tpo"));
  });
  it("never takes a governed species under the readable floor", () => {
    const g = selectAttentionGovernor({ ...base, userOpacity: { PROFILES: 0.4 }, speciesOpacity: speciesLayerOpacity({ COMPOSITE: 0.4 }) });
    expect(g.alpha("compositeProfile")).toBeGreaterThanOrEqual(0.12);
  });
});

describe("wired end to end", () => {
  const CHART = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
  const MODAL = readFileSync(path.join(process.cwd(), "src/components/chart/ChartSettingsModal.tsx"), "utf8");
  it("reads the sources", () => {
    expect(CHART.length).toBeGreaterThan(100000);
    expect(MODAL.length).toBeGreaterThan(5000);
  });
  it("MainChart feeds the governor and the two drawing species", () => {
    expect(CHART).toContain("speciesOpacityRef.current = speciesLayerOpacity(chartSettings?.profileSpeciesOpacity);");
    expect(CHART).toContain("speciesOpacity: speciesOpacityRef.current,");
    expect(CHART).toContain("ctx.globalAlpha = drawingSpeciesAlpha(ctx.globalAlpha, speciesDrawDialRef.current.FIXED_RANGE);");
    expect(CHART).toContain("ctx.globalAlpha = drawingSpeciesAlpha(ctx.globalAlpha, speciesDrawDialRef.current.BID_ASK);");
  });
  it("Chart Settings offers one dial per species, written through the law", () => {
    expect(MODAL).toContain("{PROFILE_SPECIES.map(sp => (");
    expect(MODAL).toContain("set({ profileSpeciesOpacity: lawfulSpeciesOpacity({ ...(s.profileSpeciesOpacity ?? {}), [sp]: v }) })");
  });
});
