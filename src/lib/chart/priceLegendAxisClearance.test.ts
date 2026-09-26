/**
 * The price legend ends left of the price-axis column. Numbers MEASURED on
 * local /charts TSLA 15m, 2026-09-26 (pane-relative: the pane starts at x 0).
 */
import { describe, expect, it } from "vitest";
import {
  PRICE_LEGEND_AXIS_GAP_PX,
  legendOverprintsPriceAxis,
  priceLegendRightInset,
} from "./priceLegendAxisClearance";

describe("priceLegendRightInset", () => {
  it("is the chart's own axis width plus the gap", () => {
    expect(priceLegendRightInset(60)).toBe(60 + PRICE_LEGEND_AXIS_GAP_PX);
    expect(priceLegendRightInset(59.2)).toBe(60 + PRICE_LEGEND_AXIS_GAP_PX); // never a sub-pixel short
  });

  it("is 0 when there is no right scale to clear (hidden, not laid out, or unreadable)", () => {
    for (const w of [0, -4, NaN, Infinity, null, undefined]) expect(priceLegendRightInset(w as number)).toBe(0);
  });
});

describe("the 1600x900 finding: MARKET CLOSED · LAST BAR OPENED 07:45 PM vs \"390.00\"", () => {
  const paneW = 1328; // pane x 0–1328, axis column x 1268–1328
  const axisW = 60;

  it("BEFORE: the band ran to the pane edge and the words ended 16px inside the axis column", () => {
    const wordsRight = 1284; // measured
    expect(legendOverprintsPriceAxis(wordsRight, paneW, axisW)).toBe(true);
    expect(wordsRight - (paneW - axisW)).toBe(16);
  });

  it("AFTER: the band's right edge sits left of the column, so nothing in it can reach the column", () => {
    const bandRight = paneW - priceLegendRightInset(axisW);
    expect(bandRight).toBe(1262); // measured: band 0–1262
    expect(legendOverprintsPriceAxis(bandRight, paneW, axisW)).toBe(false);
    expect(legendOverprintsPriceAxis(1218, paneW, axisW)).toBe(false); // measured words right edge
  });

  it("holds for every axis width a chart can report (a wider price → a wider column → a wider inset)", () => {
    for (let w = 1; w <= 140; w += 0.5) {
      for (const pane of [330, 792, 1048, 1195, 1328, 1800]) {
        expect(legendOverprintsPriceAxis(pane - priceLegendRightInset(w), pane, w)).toBe(false);
      }
    }
  });
});
