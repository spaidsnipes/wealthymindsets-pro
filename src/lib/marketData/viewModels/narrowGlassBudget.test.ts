import { describe, it, expect } from "vitest";
import {
  selectSemanticPermission, permissionAt, DEPTH_LAYERS, NARROW_GLASS_KEEPS_WORDS, NARROW_GLASS_MAX_PX,
} from "./selectSemanticPermission";

describe("the narrow-glass word budget (phone, 2026-10-04)", () => {
  const desk = selectSemanticPermission("MID");
  const phone = selectSemanticPermission("MID", { narrow: true });

  it("the budget is phone-sized: an iPad portrait plot keeps every word", () => {
    expect(NARROW_GLASS_MAX_PX).toBeLessThanOrEqual(640);
    expect(NARROW_GLASS_MAX_PX).toBeGreaterThan(360);
  });

  it("secondary readings keep their shape and lose their words", () => {
    for (const layer of ["absorption", "effort", "marketZones", "deltaLevels", "bubbles"] as const) {
      expect(desk.speaks(layer), layer).toBe(true);
      expect(phone.paints(layer), `${layer} must still paint`).toBe(true);
      expect(phone.speaks(layer), `${layer} must not print words on a phone`).toBe(false);
    }
  });

  it("the primary reading, price chrome and the trader's own tools keep their words", () => {
    for (const layer of ["livingProfile", "candles", "riskOnPrice", "questionLens", "dataGaps", "debtTag"] as const) {
      expect(phone.speaks(layer), layer).toBe(desk.speaks(layer));
    }
  });

  it("the selected item speaks at every width", () => {
    expect(phone.speaks("absorption", { selectedItem: true })).toBe(true);
  });

  it("never revives a silent layer and never silences a painting one", () => {
    for (const depth of ["FAR", "MID", "NEAR"] as const) {
      const n = selectSemanticPermission(depth, { narrow: true });
      for (const layer of DEPTH_LAYERS) {
        const base = permissionAt(layer, depth);
        if (base === "SILENT") expect(n.of(layer), `${layer}@${depth}`).toBe("SILENT");
        else expect(n.paints(layer), `${layer}@${depth}`).toBe(true);
        if (NARROW_GLASS_KEEPS_WORDS.has(layer)) expect(n.of(layer)).toBe(base);
      }
    }
  });

  it("the desk is unchanged and the receipt names the budget", () => {
    for (const layer of DEPTH_LAYERS) expect(desk.of(layer)).toBe(permissionAt(layer, "MID"));
    expect(phone.receipt).toMatch(/\|NARROW$/);
    expect(desk.receipt).not.toMatch(/NARROW/);
  });
});
