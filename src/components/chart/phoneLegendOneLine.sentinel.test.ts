import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const CHART = readFileSync("src/components/chart/MainChart.tsx", "utf8");
const CSS = readFileSync("src/app/globals.css", "utf8");

describe("phone chart header never overprints itself (serving TSLA at 390px, 2026-10-01)", () => {
  it("the price group never wraps and the band clips below 640", () => {
    expect(CHART).toContain('<div className="flex items-baseline gap-2 shrink-0 whitespace-nowrap" data-legend-group="price">');
    expect(CHART).toContain('className="flex items-center gap-4 px-3 max-sm:overflow-hidden"');
  });
  it("the evidence chip leaves the legend row below 1024", () => {
    expect(CSS).toMatch(/@media \(max-width: 1023px\)\s*\{\s*\.wm-nectar-vault-chip\s*\{[\s\S]*?top: 64px !important;/);
  });
});
