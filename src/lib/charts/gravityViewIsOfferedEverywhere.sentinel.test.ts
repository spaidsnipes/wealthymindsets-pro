/**
 * SENTINEL — GRAVITY / VALUE CENTER (Canon Asset 02) must be reachable on
 * EVERY asset class, must consume the room's ONE Value Candle compilation,
 * and may not grow a voice of its own.
 *
 * Same regression class as the sentinels beside this file: an OMISSION at a
 * wiring site renders something rather than nothing. `categoryTabsFor`
 * returning one fewer tab is still a valid list; ChartsDashboard forgetting
 * the `!== "Gravity"` exclusion still paints a panel — the company reference
 * sheet, silently, under a tab that promised a market reading.
 *
 * Two assertions belong to this asset alone.
 *
 * ONE COMPILATION. The room already compiles the tape once —
 * `chartOrderFlowReadings.valueCandle` — and the on-glass value band and the
 * Smart Money drawer both read that same VM. If this view called
 * `selectValueCandle` itself it would read a DIFFERENT moment of the same
 * tape than the band a few pixels away, and two surfaces could print two
 * defensible CoGs for one instrument at one instant.
 *
 * ONE VOICE. The migration verdict is compiled prose (`migration` +
 * `migrationDetail`). The view must carry both VERBATIM and must not
 * manufacture the mockup's design theater: fixed 68/70% value-area targets,
 * or "who moved value" attribution — the latter belongs to
 * `selectAggressorFlow` and its provenance disclosure.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { categoryTabsFor, isMicrostructureTab } from "@/lib/charts/categoryTabsFor";
import { stripComments } from "@/lib/sourceScan";
import type { CanonicalAssetClass } from "@/lib/marketData/canonicalIdentity";

const CLASSES: readonly CanonicalAssetClass[] = ["equity", "etf", "options", "crypto", "futures", "forex"];

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

describe("Gravity view wiring", () => {
  it.each(CLASSES)("is offered on %s", (cls) => {
    expect(categoryTabsFor(cls)).toContain("Gravity");
  });

  it("is a microstructure tab — the candles stay on screen above the level it names", () => {
    expect(isMicrostructureTab("Gravity")).toBe(true);
  });

  it("does not collide with Value Profile — two tabs, two different questions", () => {
    // Value Profile answers "where did this auction actually trade" as a full
    // distribution; Gravity answers "where is value, in one number, and has
    // price left it". Both exist, and both must remain distinct entries.
    for (const cls of CLASSES) {
      const tabs = categoryTabsFor(cls);
      expect(tabs).toContain("Value Profile");
      expect(tabs).toContain("Gravity");
      expect(new Set(tabs).size).toBe(tabs.length);
    }
  });

  it("ChartsDashboard renders the view and excludes it from the fundamentals arm", () => {
    const src = read("src/components/chart/ChartsDashboard.tsx");
    expect(src).toContain("<GravityValueView");
    expect(src).toContain('activeTab === "Gravity"');
    expect(src).toContain('activeTab !== "Gravity"');
  });

  it("ONE COMPILATION — the view is fed the room's valueCandle, and the room does not compile a second one", () => {
    const src = stripComments(read("src/components/chart/ChartsDashboard.tsx"));
    expect(src).toMatch(/<GravityValueView\s+vm=\{chartOrderFlowReadings\.valueCandle\}/);
    // The room must not reach around useOrderFlowReadings into the selector.
    expect(src).not.toMatch(/selectValueCandle\s*\(/);
  });

  it("the view itself never compiles — it consumes the VM only", () => {
    const src = stripComments(read("src/components/experience/GravityValueView.tsx"));
    expect(src).not.toMatch(/selectValueCandle\s*\(/);
    expect(src).not.toMatch(/useOrderFlowReadings/);
  });

  it("ONE RENDERER — the view mounts ValueCandlePanel rather than redrawing the distribution", () => {
    const src = stripComments(read("src/components/experience/GravityValueView.tsx"));
    expect(src).toContain("<ValueCandlePanel");
    // Redrawing would be a second SVG of the same bins with its own geometry
    // decisions — the two could disagree about where the band sits.
    expect(src).not.toMatch(/<svg/i);
  });

  it("ONE VOICE — the verdict is carried verbatim from the compiler", () => {
    const src = stripComments(read("src/components/experience/GravityValueView.tsx"));
    expect(src).toContain("vm.migration");
    expect(src).toContain("vm.migrationDetail");
  });

  it("refuses the mockup's design theater", () => {
    const src = stripComments(read("src/components/experience/GravityValueView.tsx"));
    // A fixed value-area target echoed back as a finding.
    expect(src).not.toMatch(/\b68%|\b70%/);
    // "Who moved value" belongs to selectAggressorFlow's provenance, not here.
    expect(src).not.toMatch(/selectAggressorFlow\s*\(/);
    expect(src).not.toMatch(/\bBUYERS MOVED\b|\bSELLERS MOVED\b/i);
  });
});
