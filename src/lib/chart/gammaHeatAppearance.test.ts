import { describe, expect, it } from "vitest";
import { GAMMA_HEAT_MAX_ALPHA, GAMMA_HEAT_PRESETS, gammaHeatPreset } from "@/lib/chart/gammaHeatAppearance";
import { inksDistinct } from "@/lib/chart/appearanceLaw";

describe("gamma heatmap presets", () => {
  it("every preset keeps positive and negative distinct and under the candle-readable cap", () => {
    const all = Object.values(GAMMA_HEAT_PRESETS);
    expect(all.length).toBeGreaterThanOrEqual(5);
    for (const p of all) {
      expect(inksDistinct(`rgb(${p.posRgb})`, `rgb(${p.negRgb})`), p.id).toBe(true);
      expect(p.maxAlpha).toBeLessThanOrEqual(GAMMA_HEAT_MAX_ALPHA);
    }
    expect(GAMMA_HEAT_PRESETS.FOCUS_POSITIVE.focus).toBe("POSITIVE");
    expect(GAMMA_HEAT_PRESETS.FOCUS_NEGATIVE.focus).toBe("NEGATIVE");
  });

  it("unknown ids read Balanced", () => {
    expect(gammaHeatPreset("nonsense").id).toBe("BALANCED");
    expect(gammaHeatPreset(undefined).id).toBe("BALANCED");
  });

  it("CUSTOM: identical inks fall back to the room's pair, whole; opacity is clamped", () => {
    const same = gammaHeatPreset("CUSTOM", { posRgb: "200,10,10", negRgb: "201,11,10", maxAlpha: 0.9 });
    expect([same.posRgb, same.negRgb]).toEqual([GAMMA_HEAT_PRESETS.BALANCED.posRgb, GAMMA_HEAT_PRESETS.BALANCED.negRgb]);
    expect(same.maxAlpha).toBe(GAMMA_HEAT_MAX_ALPHA);
    const ok = gammaHeatPreset("CUSTOM", { posRgb: "0,200,255", negRgb: "255,80,0", maxAlpha: 0.2 });
    expect(ok).toMatchObject({ posRgb: "0,200,255", negRgb: "255,80,0", maxAlpha: 0.2 });
    expect(gammaHeatPreset("CUSTOM", { posRgb: "#fff" }).posRgb).toBe(GAMMA_HEAT_PRESETS.BALANCED.posRgb);
  });
});
