import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { CHART_PROP_FOR, chartPropsForSwitches } from "./deskView";

describe("Garden 18 §LVI — a View per Desk screen", () => {
  it("every mapped prop is a real MainChart prop (no ghost switch)", () => {
    const src = readFileSync(join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
    for (const prop of Object.values(CHART_PROP_FOR)) expect(src, prop).toMatch(new RegExp(`\\b${prop}\\?:`));
  });
  it("a View's ON switches are on; every other mapped sense is off; Clean is all off", () => {
    const p = chartPropsForSwitches({ ABSORPTION: true, TPO_PROFILE: true, VALUE_CANDLE: false });
    expect(p.absorptionAnatomyActive).toBe(true);
    expect(p.tpoProfileOnChart).toBe(true);
    expect(p.valueCandleOnChart).toBe(false);
    expect(p.brickWallsOnChart).toBe(false);
    expect(Object.values(chartPropsForSwitches(null)).every(v => v === false)).toBe(true);
  });
});
