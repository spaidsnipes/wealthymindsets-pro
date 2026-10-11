import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { INVENTION_DIALS, PROFILE_SPECIES } from "@/lib/chart/appearanceLaw";
import { settingsAnchorFor } from "./inventionSettingsAnchor";

describe("the gear on every invention lands on its own controls", () => {
  it("every profile species has a gear that opens its colour / opacity", () => {
    const rows = ["LIVING_PROFILE", "STRUCTURE_PROFILE", "PROFILE_FUSION", "PROFILE_MEMORY", "PROFILE_DNA", "SESSION",
      "VISIBLE_RANGE_PROFILE", "FIXED_RANGE", "COMPOSITE_PROFILE", "TPO_PROFILE", "DELTA_VP"];
    const anchors = rows.map(settingsAnchorFor);
    expect(anchors.every(a => a?.startsWith("species:"))).toBe(true);
    expect(new Set(anchors.map(a => a!.slice(8)))).toEqual(new Set(PROFILE_SPECIES));
  });
  it("walls, gamma and the order-flow inventions land on their own controls", () => {
    expect(settingsAnchorFor("BRICK_WALLS")).toBe("inv:BRICK_WALLS");
    expect(settingsAnchorFor("CALL_WALL")).toBe("inv:CALL_PUT_WALLS");
    expect(settingsAnchorFor("GAMMA_HEATMAP")).toBe("gamma-heat");
    expect(settingsAnchorFor("ABSORPTION")).toBe("inv:ABSORPTION");
    for (const id of ["ABSORPTION", "EXHAUSTION", "IMBALANCE_STACK", "FLOW_CURRENT", "VALUE_CANDLE", "LIQUIDITY_WEATHER", "DELTA_LEVELS"]) {
      const a = settingsAnchorFor(id)!;
      expect(INVENTION_DIALS as readonly string[]).toContain(a.slice(4));
    }
  });
  it("the modal carries an anchor for every species and every invention dial, and the menu draws the gear", () => {
    const modal = readFileSync(path.join(process.cwd(), "src/components/chart/ChartSettingsModal.tsx"), "utf8");
    const menu = readFileSync(path.join(process.cwd(), "src/components/chart/ProfilesMenu.tsx"), "utf8");
    expect(modal).toContain("data-settings-section={`inv:${k}`}");
    expect(modal).toContain("data-settings-section={`species:${sp}`}");
    expect(menu).toContain("data-testid={`appearance-gear-${entry.id}`}");
  });
});
