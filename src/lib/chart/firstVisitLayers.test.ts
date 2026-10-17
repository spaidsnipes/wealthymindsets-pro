import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { FIRST_VISIT_ON, firstVisitOn } from "./firstVisitLayers";

const DASH = readFileSync("src/components/chart/ChartsDashboard.tsx", "utf8");

// Founder 2026-10-17: "shit needs to be done one by one … browser, every device".
describe("a first visit opens on one profile and one reading, not every invention", () => {
  it("only the Living Profile and Absorption Anatomy start on", () => {
    expect([...FIRST_VISIT_ON].sort()).toEqual(["wm_absorptionAnatomy", "wm_ofLivingProfile"]);
    expect(firstVisitOn("wm_ofLiquidityWeather")).toBe(false);
    expect(firstVisitOn("wm_ofMarketStructure")).toBe(false);
  });
  it("no layer switch in the dashboard defaults to a bare true any more", () => {
    expect(DASH).not.toMatch(/lsGet\("wm_of[A-Za-z]+", true\)/);
    for (const k of ["wm_effortResponse", "wm_deltaKeel", "wm_wisdomLine", "wm_rvolTone", "wm_absorptionAnatomy"]) {
      expect(DASH).toContain(`lsGet("${k}", firstVisitOn("${k}"))`);
    }
  });
});
