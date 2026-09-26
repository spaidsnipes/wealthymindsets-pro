/**
 * THE WAIT PLAQUE HEARS THE ROOM'S BARS — Garden 16 §31, 2026-09-26.
 * ES1! 15m with NO BAR HISTORY read "DIRECTION UNRESOLVED · LET STRUCTURE
 * DEVELOP". The rail now hands the plaque the settled request and its bar
 * count; this pins that the dashboard passes its OWN chartBars and the band
 * passes them only when settled. A breadcrumb that reads source.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const BAND = readFileSync(path.join(process.cwd(), "src/components/experience/DecisionSpineBand.tsx"), "utf8");
const DASH = readFileSync(path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");

describe("WAIT plaque material wiring", () => {
  it("the band hands the plaque the material only for a settled request", () => {
    expect(BAND).toMatch(/selectWaitPlaque\(\n\s*nowDecision,\n\s*oneStory \? oneStory\.debt : null,\n\s*market\.barsSettled === true && typeof market\.barsInHand === "number" \? \{ settled: true, bars: market\.barsInHand \} : null,\n\s*\);/);
  });
  it("the dashboard passes its own bars beside barsSettled", () => {
    expect(DASH).toMatch(/\n\s*barsSettled,\n(?:\s*\/\/[^\n]*\n)*\s*barsInHand: chartBars\.length,/);
  });
});
