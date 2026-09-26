/**
 * The Data Window beside its bar — never on the price legend (serving
 * 2026-09-26: it sat at top 8 / left 48 over the symbol and headline price).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  CHIP_COLUMN_BOTTOM,
  CHIP_COLUMN_RIGHT,
  DATA_WINDOW_AXIS_RESERVE,
  DATA_WINDOW_H,
  DATA_WINDOW_MARGIN,
  DATA_WINDOW_TIME_AXIS,
  DATA_WINDOW_W,
  placeDataWindow,
} from "./dataWindowPlacement";

const pane = { paneW: 1300, paneH: 620, topFloor: 66 };
const overlaps = (a: { l: number; t: number; w: number; h: number }, b: { l: number; t: number; w: number; h: number }) =>
  a.l < b.l + b.w && b.l < a.l + a.w && a.t < b.t + b.h && b.t < a.t + a.h;

describe("placeDataWindow", () => {
  it("sits to the RIGHT of the bar when there is room, level with its high", () => {
    const p = placeDataWindow({ ...pane, barX: 400, barHighY: 300, barSpacing: 10 });
    expect(p.side).toBe("RIGHT");
    expect(p.left).toBe(400 + 5 + DATA_WINDOW_MARGIN);
    expect(p.top).toBe(290);
  });

  it("flips LEFT near the price axis and never reaches into it", () => {
    const p = placeDataWindow({ ...pane, barX: 1150, barHighY: 300, barSpacing: 10 });
    expect(p.side).toBe("LEFT");
    expect(p.left + DATA_WINDOW_W).toBeLessThanOrEqual(1150 - 5 - DATA_WINDOW_MARGIN);
    const right = placeDataWindow({ ...pane, barX: 800, barHighY: 300, barSpacing: 10 });
    expect(right.left + DATA_WINDOW_W).toBeLessThanOrEqual(pane.paneW - DATA_WINDOW_AXIS_RESERVE);
  });

  it("never covers the bar it describes, however wide the bars are", () => {
    for (const spacing of [3, 10, 24, 48]) {
      for (const x of [150, 600, 1100]) {
        const p = placeDataWindow({ ...pane, barX: x, barHighY: 200, barSpacing: spacing });
        const bar = { l: x - spacing / 2, t: 0, w: spacing, h: pane.paneH };
        expect(overlaps({ l: p.left, t: p.top, w: DATA_WINDOW_W, h: DATA_WINDOW_H }, bar), `${spacing}@${x}`).toBe(false);
      }
    }
  });

  it("never rises into the legend band or the chip row under it", () => {
    const p = placeDataWindow({ ...pane, barX: 600, barHighY: 12, barSpacing: 10 });
    expect(p.top).toBe(pane.topFloor);
  });

  it("never sinks into the time axis", () => {
    const p = placeDataWindow({ ...pane, barX: 600, barHighY: 610, barSpacing: 10 });
    expect(p.top + DATA_WINDOW_H).toBeLessThanOrEqual(pane.paneH - DATA_WINDOW_TIME_AXIS);
  });

  it("stays out of the top-left chip column (D, EFF, the countdown)", () => {
    const p = placeDataWindow({ ...pane, barX: 20, barHighY: 70, barSpacing: 10 });
    const chips = { l: 0, t: 0, w: CHIP_COLUMN_RIGHT, h: CHIP_COLUMN_BOTTOM };
    expect(overlaps({ l: p.left, t: p.top, w: DATA_WINDOW_W, h: DATA_WINDOW_H }, chips)).toBe(false);
  });

  it("an unprojectable bar parks the panel beside the chip column, still under the legend", () => {
    const p = placeDataWindow({ ...pane, barX: null, barHighY: null, barSpacing: 10 });
    expect(p.side).toBe("PARKED");
    expect(p.left).toBe(CHIP_COLUMN_RIGHT);
    expect(p.top).toBeGreaterThanOrEqual(pane.topFloor);
  });
});

describe("MainChart places the Data Window through the owner", () => {
  const code = readFileSync(resolve(__dirname, "..", "..", "components/chart/MainChart.tsx"), "utf8");
  it("no longer pins the panel to the legend corner", () => {
    expect(code).not.toMatch(/position: "absolute", top: 8, left: 48, zIndex: 60/);
    expect(code).toContain("placeDataWindow({");
    expect(code).toContain("top: dwPlace.top, left: dwPlace.left, zIndex: 60");
    expect(code).toContain("data-data-window-side={dwPlace.side}");
    // Anchored to the described bar's high, with the chip row's floor derived, not re-typed.
    expect(code).toContain("logicalToPixel({ time: dataWindow.time, price: dataWindow.h })");
    expect(code).toContain("topFloor: BELOW_PRICE_LEGEND + DATA_WINDOW_TOGGLE_PX + 2 * PANE_TOP_LEFT_INSET");
  });
});
