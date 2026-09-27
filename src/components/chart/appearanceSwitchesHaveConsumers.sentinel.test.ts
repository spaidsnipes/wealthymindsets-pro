/**
 * GARDEN 16 §46 · EVERY APPEARANCE SWITCH HAS A VISIBLE CONSUMER — 2026-09-27.
 *
 * Founder Tour on serving (a4cbe829, TSLA 5m): Tools › Chart tools ›
 * Appearance › "Show gridlines" was clicked OFF; localStorage wrote
 * `gridVisible:false` and the grid stayed on the glass. MainChart never read
 * gridVisible, crosshairVisible, crosshairStyle, priceScaleVisible or
 * timeScaleVisible; the Scales tab duplicated the price-axis LOG / % / AUTO
 * buttons with no reader, Indexed-to-100 had no implementation, and the Trading
 * tab's position / P&L switches had no overlay behind them.
 *
 * Rule: a switch the modal offers is read by the chart, or it is not offered.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");
const MODAL = read("src/components/chart/ChartSettingsModal.tsx");
const CHART = read("src/components/chart/MainChart.tsx");

const offered = [...MODAL.matchAll(/<Toggle value=\{s\.(\w+)\}/g)].map(m => m[1]);

describe("Appearance switches", () => {
  it("the modal still offers switches (positive control)", () => {
    expect(offered).toEqual(expect.arrayContaining(["gridVisible", "candleTimer", "crosshairVisible", "priceScaleVisible", "timeScaleVisible"]));
  });

  it("every offered switch is read by MainChart", () => {
    for (const k of offered) expect(CHART, `Appearance offers ${k} but MainChart never reads it`).toMatch(new RegExp(`chartSettings\\??\\.${k}\\b`));
  });

  it("the crosshair line style reaches the chart through the one table", () => {
    expect(CHART).toContain('style: CROSSHAIR_LINE_STYLE[chartSettings.crosshairStyle ?? "solid"]');
  });

  it("the withdrawn switches stay withdrawn until something reads them", () => {
    for (const k of ["logScale", "autoScale", "percentageMode", "indexedTo100", "showPositions", "showPnL"]) {
      expect(offered, `${k} is offered with no reader`).not.toContain(k);
    }
  });

  it("switches announce their state", () => {
    expect(MODAL).toContain('role="switch"');
    expect(MODAL).toContain("aria-checked={value}");
  });
});
