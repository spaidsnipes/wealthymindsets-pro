import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dashboard = readFileSync(resolve(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");
const toolbar = readFileSync(resolve(process.cwd(), "src/components/chart/ChartToolbar.tsx"), "utf8");
const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

describe("phone chart control reachability", () => {
  it("keeps decision disclosures in a dedicated visible action row", () => {
    expect(dashboard).toContain('className="wm-chart-orientation-strip"');
    expect(dashboard).toContain('className="wm-chart-orientation-actions"');
    expect(dashboard).toContain("wm-chart-why-trigger");
    expect(dashboard).toContain("wm-chart-passport-trigger");
    expect(dashboard).toContain("wm-chart-command-deck-link");
    expect(css).toMatch(/\.wm-chart-orientation-action\s*\{[\s\S]*?min-height:\s*44px\s*!important/);
    expect(css).toMatch(/\.wm-chart-orientation-actions\s*\{[\s\S]*?width:\s*100%/);
  });

  it("gives all timeframes their own touch-sized horizontal rail", () => {
    expect(toolbar).toContain('className="wm-chart-timeframes');
    expect(toolbar).toContain("wm-chart-timeframe px-1.5");
    expect(css).toMatch(/\.wm-chart-timeframes\s*\{[\s\S]*?flex:\s*0 0 100%/);
    expect(css).toMatch(/\.wm-chart-timeframes\s*\{[\s\S]*?overflow-x:\s*auto/);
    expect(css).toMatch(/\.wm-chart-timeframe\s*\{[\s\S]*?min-width:\s*44px/);
  });

  it("prevents the pinned tools cluster from covering late timeframes", () => {
    expect(toolbar).toContain('className="wm-chart-toolbar-pinned');
    expect(css).toMatch(/\.wm-chart-toolbar-pinned\s*\{[\s\S]*?position:\s*static\s*!important/);
    expect(css).toMatch(/\.wm-chart-toolbar\s*\{[\s\S]*?flex-wrap:\s*wrap/);
  });
});
