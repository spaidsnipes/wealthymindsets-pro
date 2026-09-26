import { describe, expect, it } from "vitest";

import { LAYER_ATTENTION } from "./selectAttentionGovernor";
import {
  DEPTH_FORMS,
  DEPTH_LAYERS,
  FAR_CANDLES_DIM,
  SEMANTIC_PERMISSION,
  permissionAt,
  selectSemanticPermission,
  type DepthLayer,
  type Permission,
} from "./selectSemanticPermission";

const DEPTHS = ["FAR", "MID", "NEAR"] as const;
const at = (depth: (typeof DEPTHS)[number], p: Permission) => DEPTH_LAYERS.filter(k => permissionAt(k, depth) === p).sort();

/** Every profile species the right-edge stack or the left edge can carry. */
const PROFILES: DepthLayer[] = [
  "livingProfile", "livingProfileMovie", "profileDna", "sessionGhosts", "compositeProfile", "visibleRangeProfile",
  "tpo", "structureProfile", "profileFusion", "fusedObject", "profileMemory", "valueMigration", "volumeProfile",
];

describe("semantic permission — one table, every painting layer", () => {
  it("every layer the attention governor tiers has a permission row (the two tables stay joined)", () => {
    for (const k of Object.keys(LAYER_ATTENTION)) {
      expect(k in SEMANTIC_PERMISSION, `${k} paints with no permission row`).toBe(true);
    }
    // And the painting blocks the governor does not tier.
    for (const k of ["candles", "farEnvelope", "dataGaps", "microDelta", "nearGeometry", "forceResponse", "tapeHorizon", "volumeProfile", "debtTag", "candleTimer"]) {
      expect(k in SEMANTIC_PERMISSION, k).toBe(true);
    }
    expect(DEPTH_LAYERS.length).toBe(Object.keys(LAYER_ATTENTION).length + 10);
  });

  it("FAR is the plate's left panel: DIM CANDLES · REGIME ENVELOPE · MAJOR STRUCTURE ONLY", () => {
    // Words and full form: the envelope, the regime light and its one title,
    // the expected envelope, and the house hardware the trader placed.
    expect(at("FAR", "SPEAK")).toEqual(
      ["candleTimer", "expectedEnvelope", "farEnvelope", "questionLens", "regimeField", "regimeLighting", "riskOnPrice", "zoomPlate"].sort(),
    );
    // Reduced forms: dimmed candles, major swings with the owner's letters,
    // Living's skeleton, and the fidelity bridges (an outage keeps its words).
    expect(at("FAR", "QUIET")).toEqual(["candles", "dataGaps", "livingProfile", "marketStructure"].sort());
    // What serving still carried at FAR on 2026-09-25 (TSLA 15m, 755 bars) is silent.
    for (const k of [
      "scaffolding", "exhaustion", "debtTag", "valueCandle", "weather", "liquidityLifecycle",
      "absorption", "anatomyCards", "regimeMagnets", "regimeChannel", "marketZones",
      "footprint", "bubbles", "bigTrades", "nearGeometry", "microDelta",
    ] as DepthLayer[]) {
      expect(permissionAt(k, "FAR"), k).toBe("SILENT");
    }
    for (const k of PROFILES) if (k !== "livingProfile") expect(permissionAt(k, "FAR"), k).toBe("SILENT");
  });

  it("MID is the centre panel: zones, profiles, liquidity, market objects speak; tape and anatomy do not", () => {
    for (const k of ["marketZones", "livingProfile", "compositeProfile", "visibleRangeProfile", "tpo", "weather",
      "liquidityLifecycle", "absorption", "exhaustion", "regimeChannel", "regimeMagnets", "marketStructure", "debtTag"] as DepthLayer[]) {
      expect(permissionAt(k, "MID"), k).toBe("SPEAK");
    }
    expect(permissionAt("nearGeometry", "MID")).toBe("SILENT");
    expect(permissionAt("microDelta", "MID")).toBe("SILENT");
    expect(permissionAt("footprint", "MID"), "cells, no numbers").toBe("QUIET");
    expect(permissionAt("farEnvelope", "MID")).toBe("SILENT");
    expect(permissionAt("candles", "MID")).toBe("SPEAK");
  });

  it("NEAR is the right panel: anatomy, footprint and tape speak; profiles and liquidity are quiet or silent; regime fixtures silent", () => {
    for (const k of ["nearGeometry", "microDelta", "footprint", "bubbles", "bigTrades", "absorption", "forceResponse"] as DepthLayer[]) {
      expect(permissionAt(k, "NEAR"), k).toBe("SPEAK");
    }
    for (const k of [...PROFILES, "weather", "liquidityLifecycle", "heatLens"] as DepthLayer[]) {
      expect(["QUIET", "SILENT"], k).toContain(permissionAt(k, "NEAR"));
    }
    for (const k of ["regimeChannel", "regimeMagnets", "farEnvelope", "expectedEnvelope"] as DepthLayer[]) {
      expect(permissionAt(k, "NEAR"), k).toBe("SILENT");
    }
    // The micro plate's "faint bias light only".
    expect(permissionAt("regimeField", "NEAR")).toBe("QUIET");
  });

  it("THE SELECTED OBJECT ALWAYS SPEAKS — every layer, every depth", () => {
    for (const d of DEPTHS) {
      const vm = selectSemanticPermission(d);
      for (const k of DEPTH_LAYERS) {
        expect(vm.of(k, { selectedItem: true }), `${k} @ ${d}`).toBe("SPEAK");
        expect(vm.paints(k, { selectedItem: true })).toBe(true);
        expect(vm.speaks(k, { selectedItem: true })).toBe(true);
      }
    }
  });

  it("paints = not SILENT; speaks = SPEAK only", () => {
    for (const d of DEPTHS) {
      const vm = selectSemanticPermission(d);
      for (const k of DEPTH_LAYERS) {
        const p = permissionAt(k, d);
        expect(vm.of(k)).toBe(p);
        expect(vm.paints(k)).toBe(p !== "SILENT");
        expect(vm.speaks(k)).toBe(p === "SPEAK");
      }
    }
  });

  it("UNMEASURED changes nothing: every layer speaks, candles undimmed, no receipt (H1) — a depth's own form waits for its depth", () => {
    expect([...DEPTH_FORMS].sort()).toEqual(["farEnvelope", "microDelta", "nearGeometry"]);
    for (const d of [null, undefined, "UNMEASURED"] as const) {
      const vm = selectSemanticPermission(d);
      expect(vm.depth).toBe("UNMEASURED");
      expect(vm.candlesDim).toBe(1);
      expect(vm.silent).toEqual([]);
      expect(vm.receipt).toBeNull();
      for (const k of DEPTH_LAYERS) expect(vm.of(k), k).toBe(DEPTH_FORMS.has(k) ? "SILENT" : "SPEAK");
      // Selected still speaks.
      expect(vm.of("farEnvelope", { selectedItem: true })).toBe("SPEAK");
    }
  });

  it("the candles dim only at FAR, by the table's constant", () => {
    expect(selectSemanticPermission("FAR").candlesDim).toBe(FAR_CANDLES_DIM);
    expect(FAR_CANDLES_DIM).toBeGreaterThan(0.3);
    expect(FAR_CANDLES_DIM).toBeLessThan(0.6);
    expect(selectSemanticPermission("MID").candlesDim).toBe(1);
    expect(selectSemanticPermission("NEAR").candlesDim).toBe(1);
  });

  it("the receipt names the depth and every layer it silences, in table order", () => {
    const far = selectSemanticPermission("FAR");
    expect(far.receipt).toBe(`FAR|SILENT=${far.silent.join(",")}`);
    expect(far.silent).toEqual(DEPTH_LAYERS.filter(k => SEMANTIC_PERMISSION[k][0] === "SILENT"));
    expect(far.silent).toContain("scaffolding");
    expect(far.silent).not.toContain("farEnvelope");
    const mid = selectSemanticPermission("MID");
    expect(mid.receipt?.startsWith("MID|SILENT=")).toBe(true);
    expect(mid.silent).toContain("farEnvelope");
    expect(mid.silent).not.toContain("marketZones");
  });

  it("no depth silences everything, and every layer speaks at SOME depth (a switch always has a place to be read)", () => {
    for (const d of DEPTHS) expect(at(d, "SILENT").length).toBeLessThan(DEPTH_LAYERS.length);
    for (const k of DEPTH_LAYERS) {
      expect(DEPTHS.some(d => permissionAt(k, d) === "SPEAK"), `${k} never speaks`).toBe(true);
    }
  });
});
