import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

describe("H-101 selected-object wire", () => {
  const dashboard = read("src/components/chart/ChartsDashboard.tsx");
  const chart = read("src/components/chart/MainChart.tsx");

  it("derives objects from the canonical structure owner and resolves their birth identities", () => {
    expect(dashboard).toContain("selectStructureMarketObjects({");
    expect(dashboard).toContain("identity.barId === object.birthBarId");
    expect(dashboard).toContain("buildInspectChain({");
  });

  it("attaches WAIT only after a real object selection", () => {
    expect(dashboard).toContain("selectedMarketObjectId");
    expect(dashboard).toContain("selectedObjectChain?.ok && chartCanvasVM.oneStory");
    expect(dashboard).toContain("selectWaitStanding(chartCanvasVM.oneStory.decision, chartCanvasVM.oneStory.debt)");
    expect(chart).toContain("selectedMarketObjectTarget && selectedMarketObjectWait");
    expect(chart).toContain("data-h101-wait-plaque");
  });

  it("projects from birth time and object price without a latest-bar or cursor fallback", () => {
    expect(chart).toContain("time: target.birthTime");
    // The object's own price: a LEVEL's price, a ZONE's middle (a supply
    // zone's high is its swing LEVEL's price — one pixel, two objects).
    expect(chart).toContain("price: pinPrice(target.object)");
    expect(chart).toContain('o.kind === "ZONE" ? (o.priceLow + o.priceHigh) / 2 : o.priceHigh;');
    expect(chart).not.toMatch(/selectedMarketObjectTarget[\s\S]{0,500}(latestBar|cursor)/);
  });
});
