/**
 * The heat lens is a drawn claim, so these tests are about what it REFUSES to
 * draw at least as much as what it draws. A lens that paints something for
 * every input is not a lens, it is decoration.
 */

import { describe, expect, it } from "vitest";

import {
  HEAT_MAX_OPACITY,
  HEAT_PAINT_FLOOR,
  selectHeatLens,
} from "./selectHeatLens";
import type {
  LiquiditySegment,
  LiquidityWeatherVM,
} from "./selectLiquidityWeather";
import { LIQUIDITY_WEATHER_VERSION } from "./selectLiquidityWeather";

function segment(p: Partial<LiquiditySegment> & { index: number }): LiquiditySegment {
  return {
    volume: 1000,
    prints: 40,
    high: 101,
    low: 100,
    range: 1,
    rangeInSpread: 2,
    cost: 500,
    stalled: false,
    ...p,
  };
}

function weather(p: Partial<LiquidityWeatherVM>): LiquidityWeatherVM {
  return {
    version: LIQUIDITY_WEATHER_VERSION,
    stage: "STEADY",
    segments: [],
    spread: 0.5,
    medianCost: 500,
    latestCost: 500,
    latestVsMedian: 1,
    latestVsPeers: 1,
    trendRatio: 1,
    dispersion: 0.2,
    provenance: "VENUE",
    requiresDisclosure: false,
    detail: "",
    ...p,
  } as LiquidityWeatherVM;
}

describe("selectHeatLens — P-601 weather lens piped onto the canvas tank", () => {
  it("paints a cell per measurable segment, hottest at exactly the regulator", () => {
    const vm = selectHeatLens(
      weather({
        segments: [
          segment({ index: 0, cost: 250 }),
          segment({ index: 1, cost: 500 }),
          segment({ index: 2, cost: 1000 }),
        ],
      }),
    );

    expect(vm.drawable).toBe(true);
    expect(vm.cells).toHaveLength(3);
    // The dearest segment is the hottest, and it sits ON the cap — not above.
    expect(vm.cells[2].intensity).toBe(1);
    expect(vm.cells[2].opacity).toBe(HEAT_MAX_OPACITY);
    // Cost against the window's own median is what "dear" means here.
    expect(vm.cells[2].costVsMedian).toBe(2);
    expect(vm.cells[0].costVsMedian).toBe(0.5);
  });

  it("never lets any cell exceed the P-601 opacity regulator", () => {
    // OPACITY REGULATOR (MAX 0.30) is a physical cap. Feed it a wildly skewed
    // window and every cell must still be legible-over.
    const vm = selectHeatLens(
      weather({
        segments: [
          segment({ index: 0, cost: 1 }),
          segment({ index: 1, cost: 999_999 }),
        ],
      }),
    );

    expect(vm.maxOpacity).toBe(HEAT_MAX_OPACITY);
    for (const cell of vm.cells) {
      expect(cell.opacity).toBeLessThanOrEqual(HEAT_MAX_OPACITY);
    }
  });

  it("REFUSAL 1: a stalled segment is counted, not coloured", () => {
    const vm = selectHeatLens(
      weather({
        segments: [
          segment({ index: 0, cost: 500 }),
          segment({ index: 1, cost: null, stalled: true }),
          segment({ index: 2, cost: 700 }),
        ],
      }),
    );

    expect(vm.cells).toHaveLength(2);
    expect(vm.cells.map((c) => c.index)).toEqual([0, 2]);
    expect(vm.unmeasuredCells).toBe(1);
    // And it says so in words, because a silently-dropped segment is a lie of
    // omission on a page that looks complete.
    expect(vm.detail).toContain("traded without moving");
  });

  it("REFUSAL 2: UNMEASURED weather draws no lens at all", () => {
    const vm = selectHeatLens(
      weather({ stage: "UNMEASURED", segments: [segment({ index: 0 })] }),
    );

    expect(vm.drawable).toBe(false);
    expect(vm.cells).toHaveLength(0);
    expect(vm.detail).toContain("too thin");
  });

  it("REFUSAL 2: a missing weather VM draws no lens either", () => {
    for (const input of [null, undefined]) {
      const vm = selectHeatLens(input);
      expect(vm.drawable).toBe(false);
      expect(vm.cells).toHaveLength(0);
    }
  });

  it("REFUSAL 3: an unmeasurable gauge needle reads null, never zero", () => {
    const vm = selectHeatLens(
      weather({
        segments: [segment({ index: 0 })],
        dispersion: null,
        latestVsPeers: null,
      }),
    );

    expect(vm.gauge.persistence).toBeNull();
    expect(vm.gauge.response).toBeNull();
    // Zero would claim "measured, and it is nothing". Guard that explicitly.
    expect(vm.gauge.persistence).not.toBe(0);
    expect(vm.gauge.missing).toEqual(["persistence", "response"]);
  });

  it("derives PERSISTENCE as the inverse of dispersion", () => {
    // Stated in the module header; pinned here so the inversion cannot be
    // quietly dropped and leave the needle reading backwards.
    const coherent = selectHeatLens(
      weather({ segments: [segment({ index: 0 })], dispersion: 0.1 }),
    );
    const scattered = selectHeatLens(
      weather({ segments: [segment({ index: 0 })], dispersion: 0.9 }),
    );

    expect(coherent.gauge.persistence).toBeCloseTo(0.9, 10);
    expect(scattered.gauge.persistence).toBeCloseTo(0.1, 10);
    expect(coherent.gauge.persistence!).toBeGreaterThan(
      scattered.gauge.persistence!,
    );
  });

  it("publishes RESPONSE on its own ratio scale, not squashed to 0..1", () => {
    const vm = selectHeatLens(
      weather({ segments: [segment({ index: 0 })], latestVsPeers: 3.4 }),
    );
    expect(vm.gauge.response).toBe(3.4);
  });

  it("refuses when the window has no median to measure against", () => {
    for (const median of [null, 0]) {
      const vm = selectHeatLens(
        weather({ segments: [segment({ index: 0 })], medianCost: median }),
      );
      expect(vm.drawable).toBe(false);
      expect(vm.detail).toContain("median cost");
    }
  });

  it("refuses when every segment stalled", () => {
    const vm = selectHeatLens(
      weather({
        segments: [
          segment({ index: 0, cost: null, stalled: true }),
          segment({ index: 1, cost: null, stalled: true }),
        ],
      }),
    );
    expect(vm.drawable).toBe(false);
    expect(vm.cells).toHaveLength(0);
    expect(vm.detail).toContain("without moving");
  });

  it("marks cool cells unpaintable so the default overlay stays quiet", () => {
    const vm = selectHeatLens(
      weather({
        segments: [
          segment({ index: 0, cost: 1 }), // 1/1000 — far under the floor
          segment({ index: 1, cost: 1000 }),
        ],
      }),
    );

    expect(vm.cells[0].intensity).toBeLessThan(HEAT_PAINT_FLOOR);
    expect(vm.cells[0].paintable).toBe(false);
    expect(vm.cells[1].paintable).toBe(true);
    // The cool cell still EXISTS — quiet is not the same as deleted.
    expect(vm.cells).toHaveLength(2);
  });

  it("carries the price band so a click can pan the existing camera", () => {
    // ATTACHED TO ZONE OBJECT (NOT A SEPARATE ROOM) / NO ROUTE /heat.
    const vm = selectHeatLens(
      weather({ segments: [segment({ index: 0, low: 98.5, high: 102.25 })] }),
    );

    expect(vm.cells[0].low).toBe(98.5);
    expect(vm.cells[0].high).toBe(102.25);
  });

  it("is pure — the same weather yields identical geometry", () => {
    const w = weather({
      segments: [segment({ index: 0, cost: 300 }), segment({ index: 1, cost: 900 })],
    });
    expect(selectHeatLens(w)).toEqual(selectHeatLens(w));
  });
});
