/**
 * SENTINEL — LIQUIDITY WEATHER (Canon Asset 08) must be reachable on EVERY
 * asset class, must consume the room's ONE liquidity compilation, and may
 * not grow a voice — or an order book — of its own.
 *
 * Same regression class as the sentinels beside this file: an OMISSION at a
 * wiring site renders something rather than nothing. `categoryTabsFor`
 * returning one fewer tab is still a valid list; ChartsDashboard forgetting
 * the `!== "Liquidity"` exclusion still paints a panel — the company
 * reference sheet, silently, under a tab that promised a market reading.
 *
 * Two assertions belong to this asset alone.
 *
 * ONE COMPILATION. The room already compiles the tape once —
 * `chartOrderFlowReadings.liquidityWeather` — and the order-flow drawer and
 * the on-glass weather band both read that same VM. If this view called
 * `selectLiquidityWeather` itself it would segment a DIFFERENT moment of the
 * same tape than the drawer a few pixels away, and two surfaces could print
 * two defensible stages for one instrument at one instant.
 *
 * NO FABRICATED BOOK. The 2026-09-02 debt register imagined this asset as a
 * "heatmap" waiting on a Level 2 depth provider. The owner's whole doctrine
 * is the refusal of that framing: it measures what the market DID (volume
 * spent per spread of travel), never what resting orders claim. This view
 * must not reintroduce depth/book language the measurement cannot back, and
 * it must not read the aggressor side — `requiresDisclosure: false` is
 * structural in the owner (`selectLiquidityWeather` never inspects `side`).
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

describe("Liquidity view wiring", () => {
  it.each(CLASSES)("is offered on %s", (cls) => {
    expect(categoryTabsFor(cls)).toContain("Liquidity");
  });

  it("is a microstructure tab — the candles stay on screen above the cost it measures", () => {
    expect(isMicrostructureTab("Liquidity")).toBe(true);
  });

  it("ChartsDashboard renders the view and excludes it from the fundamentals arm", () => {
    const src = read("src/components/chart/ChartsDashboard.tsx");
    expect(src).toContain("<LiquidityWeatherView");
    expect(src).toContain('activeTab === "Liquidity"');
    expect(src).toContain('activeTab !== "Liquidity"');
  });

  it("ONE COMPILATION — the view is fed the room's liquidityWeather, and the room does not compile a second one", () => {
    const src = stripComments(read("src/components/chart/ChartsDashboard.tsx"));
    expect(src).toMatch(/<LiquidityWeatherView\s+vm=\{chartOrderFlowReadings\.liquidityWeather\}/);
    // The room must not reach around useOrderFlowReadings into the selector.
    expect(src).not.toMatch(/selectLiquidityWeather\s*\(/);
  });

  it("the view itself never compiles — it consumes the VM only", () => {
    const src = stripComments(read("src/components/experience/LiquidityWeatherView.tsx"));
    expect(src).not.toMatch(/selectLiquidityWeather\s*\(/);
    expect(src).not.toMatch(/useOrderFlowReadings/);
  });

  it("ONE RENDERER — the view mounts LiquidityWeatherPanel rather than redrawing the segments", () => {
    const src = stripComments(read("src/components/experience/LiquidityWeatherView.tsx"));
    expect(src).toContain("<LiquidityWeatherPanel");
    // Redrawing would be a second set of cost bars with its own geometry
    // decisions — the two could disagree about which segment stalled.
    expect(src).not.toMatch(/<svg/i);
  });

  it("ONE VOICE — the verdict is carried verbatim from the compiler", () => {
    const src = stripComments(read("src/components/experience/LiquidityWeatherView.tsx"));
    expect(src).toContain("vm.stage");
    expect(src).toContain("vm.detail");
  });

  it("refuses the fabricated book and the aggressor question", () => {
    const src = stripComments(read("src/components/experience/LiquidityWeatherView.tsx"));
    // No depth/book claims the tape measurement cannot back.
    expect(src).not.toMatch(/\bLevel 2\b|\border book\b|\bresting size\b/i);
    // Who paid the cost belongs to selectAggressorFlow, not here.
    expect(src).not.toMatch(/selectAggressorFlow\s*\(/);
    expect(src).not.toMatch(/\.side\b/);
  });
});
