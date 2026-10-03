/**
 * §16 (Garden 18 v2) — TYPOGRAPHY IS PRODUCT INFRASTRUCTURE. The glass names
 * its type through lib/chart/marketType: no hand-typed system-font label
 * strings, nothing printed below 9 px, no synthetic italic weights.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const CHART = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");

describe("market typography on the glass (§15/§16)", () => {
  it("no hand-typed label font in the system family — the roles own them", () => {
    // Proves it scanned: the glass sets dozens of canvas fonts.
    expect((CHART.match(/ctx\.font = /g) ?? []).length).toBeGreaterThan(50);
    expect(CHART).not.toMatch(/"(?:italic )?\d00 \d+(?:\.\d+)?px ui-sans-serif, system-ui, sans-serif"/);
  });
  it("no literal canvas font below the 9 px floor", () => {
    const small = [...CHART.matchAll(/ctx\.font = ["`][^"`]*?(?<![\d.])(\d+(?:\.\d+)?)px/g)].map(m => Number(m[1]));
    expect(small.length).toBeGreaterThan(20);
    const tooSmall = small.filter(n => n < 9);
    expect(tooSmall).toEqual([]);
  });
  it("footprint cell digits are crisp — outline on a whole pixel, no blur halo", () => {
    expect(CHART).toContain('ctx.font = marketFont("FOOTPRINT_NUMBER", fs);');
    expect(CHART).toContain("crispText(ctx, txt, px, py, { fill: color, outline: true, align });");
  });
});
