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
    expect(dashboard).not.toContain("wm-chart-passport-trigger");
    // ── REMAPPED 2026-09-19 · THE SECOND THRONE ──────────────────────────
    // This used to assert the Command Deck link was PRESENT in the action row
    // and merely hidden below the phone breakpoint. That pair of assertions
    // was the sentinel keeping a competing home advertised directly above
    // price on the desk, and it would have failed the cut it was meant to
    // survive. The Founder's order for this shift: "two URLs that both feel
    // like home" is a failed shot. So the gate now asserts the ABSENCE —
    // neither the markup nor the stylesheet may carry the chip back.
    //
    // This does NOT assert /command-deck is unreachable. The deck keeps its
    // door in every rail room and in the July 72px rail; what it does not
    // keep is a gold chip over a live chart.
    expect(dashboard).not.toContain("wm-chart-command-deck-link");
    expect(dashboard).not.toContain("Command Deck →");
    expect(css).toMatch(/\.wm-chart-orientation-action\s*\{[\s\S]*?min-height:\s*44px\s*!important/);
    expect(css).toMatch(/\.wm-chart-orientation-actions\s*\{[\s\S]*?width:\s*100%/);
    expect(css).toMatch(/\.wm-chart-orientation-actions\s*\{[\s\S]*?flex-wrap:\s*nowrap/);
    expect(css).not.toMatch(/\.wm-chart-command-deck-link\s*\{/);
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
