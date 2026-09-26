/**
 * The price legend ends left of the price-axis column. Numbers MEASURED on
 * local /charts TSLA 15m, 2026-09-26 (pane-relative: the pane starts at x 0).
 */
import { describe, expect, it } from "vitest";
import {
  PRICE_LEGEND_AXIS_GAP_PX,
  bindPriceLegendInset,
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

describe("bindPriceLegendInset — what the legend band's setter actually receives (G1)", () => {
  /** A chart stub: the right scale is `width()` px; the time scale records its size handler. */
  function stubChart(width: () => number) {
    const handlers: Array<() => void> = [];
    const removed: Array<() => void> = [];
    const chart = {
      priceScale: (_id: "right") => ({ width }),
      timeScale: () => ({
        subscribeSizeChange: (h: () => void) => { handlers.push(h); },
        unsubscribeSizeChange: (h: () => void) => { removed.push(h); },
      }),
    };
    return { chart, handlers, removed };
  }
  /** A React-like state cell: applies each updater, records the values set. */
  function stateCell(initial = 0) {
    let value = initial;
    const seen: number[] = [];
    const set = (u: (prev: number) => number) => { value = u(value); seen.push(value); };
    return { set, seen, get: () => value };
  }

  it("a 60px right axis hands the band priceLegendRightInset(60) — 66 — on bind", () => {
    const { chart } = stubChart(() => 60);
    const cell = stateCell(0);
    bindPriceLegendInset(chart, cell.set);
    expect(cell.get()).toBe(priceLegendRightInset(60));
    expect(cell.get()).toBe(60 + PRICE_LEGEND_AXIS_GAP_PX);
    expect(cell.get()).toBeGreaterThan(0);
  });

  it("re-reads when the time scale resizes, and unsubscribes the same handler on cleanup", () => {
    let w = 60;
    const { chart, handlers, removed } = stubChart(() => w);
    const cell = stateCell(0);
    const cleanup = bindPriceLegendInset(chart, cell.set);
    expect(handlers).toHaveLength(1);
    w = 74.4;
    handlers[0]();
    expect(cell.get()).toBe(75 + PRICE_LEGEND_AXIS_GAP_PX);
    handlers[0]();
    expect(cell.seen).toEqual([66, 81, 81]);
    cleanup();
    expect(removed).toEqual([handlers[0]]);
  });

  it("a chart with no right scale (throws) hands the band 0, not a stale inset", () => {
    const cell = stateCell(66);
    bindPriceLegendInset({ priceScale: () => { throw new Error("no right scale"); }, timeScale: () => null }, cell.set);
    expect(cell.get()).toBe(0);
  });
});
