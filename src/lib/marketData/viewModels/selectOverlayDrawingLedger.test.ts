import { describe, expect, it } from "vitest";

import {
  OVERLAY_LEDGER_VERSION,
  selectOverlayDrawingLedger,
  type OverlayDrawingLedgerInput,
} from "./selectOverlayDrawingLedger";
import {
  LIQUIDITY_WEATHER_VERSION,
  type LiquiditySegment,
  type LiquidityWeatherVM,
} from "./selectLiquidityWeather";
import { selectLiquidityWeatherGlass } from "./selectLiquidityWeatherGlass";

function seg(over: Partial<LiquiditySegment> = {}): LiquiditySegment {
  return {
    index: 0,
    volume: 1200,
    prints: 40,
    high: 431.6,
    low: 431.0,
    range: 0.6,
    rangeInSpread: 1.5,
    cost: 2000,
    stalled: false,
    ...over,
  } as LiquiditySegment;
}

/** A weather reading the glass selector genuinely DRAWS. */
function weatherVM(): LiquidityWeatherVM {
  return {
    version: LIQUIDITY_WEATHER_VERSION,
    stage: "THINNING",
    segments: [seg({ index: 0 }), seg({ index: 1 })],
    spread: 0.4,
    medianCost: 2000,
    latestCost: 900,
    latestVsMedian: 0.45,
    latestVsPeers: 0.4,
    trendRatio: 0.62,
    dispersion: 0.17,
    provenance: "INFERRED",
    requiresDisclosure: false,
    detail: "the late half cost 38% less size per unit of travel",
  } as LiquidityWeatherVM;
}

/**
 * Everything switched ON and nothing measured — the state of a chart in the
 * first seconds after a symbol change, which is exactly when a trader is
 * likeliest to conclude the product is broken.
 */
function allOnNothingMeasured(): OverlayDrawingLedgerInput {
  return {
    valueCandleOn: true,
    valueCandle: null,
    imbalanceStackOn: true,
    imbalanceStack: null,
    deltaDivergenceOn: true,
    deltaDivergence: null,
    liquidityWeatherOn: true,
    liquidityWeather: null,
  };
}

describe("selectOverlayDrawingLedger", () => {
  it("stamps its version so a stale consumer cannot pass silently", () => {
    expect(selectOverlayDrawingLedger(allOnNothingMeasured()).version).toBe(
      OVERLAY_LEDGER_VERSION,
    );
  });

  it("separates ON-but-silent from OFF — the whole reason it exists", () => {
    const led = selectOverlayDrawingLedger({
      ...allOnNothingMeasured(),
      deltaDivergenceOn: false,
    });

    const byId = Object.fromEntries(led.rows.map(r => [r.id, r]));

    expect(byId.VALUE_CANDLE.state, "on and silent is not off").toBe("NOTHING_TO_DRAW");
    expect(byId.DELTA_DIVERGENCE.state).toBe("OFF");
    expect(byId.DELTA_DIVERGENCE.reason).toBe("OFF");
    // A trader who switched it off must not be told the market is quiet.
    expect(byId.DELTA_DIVERGENCE.detail).toMatch(/switched off/i);
    expect(byId.VALUE_CANDLE.detail).not.toMatch(/switched off/i);
  });

  it("every row carries a sentence — silence is never left blank", () => {
    for (const r of selectOverlayDrawingLedger(allOnNothingMeasured()).rows) {
      expect(r.detail.length, `${r.id} said nothing about drawing nothing`)
        .toBeGreaterThan(20);
    }
  });

  it("a drawing layer is described in the GLASS SELECTOR'S OWN words", () => {
    const vm = weatherVM();
    const led = selectOverlayDrawingLedger({
      ...allOnNothingMeasured(),
      liquidityWeather: vm,
    });
    const row = led.rows.find(r => r.id === "LIQUIDITY_WEATHER")!;
    const glass = selectLiquidityWeatherGlass(vm);

    expect(row.state).toBe("DRAWN");
    expect(glass.label.length).toBeGreaterThan(0);
    // Verbatim. A second sentence about one pixel is a second owner for it.
    expect(row.detail).toBe(glass.label);
    expect(row.reason).toBe(glass.reason);
  });

  it("counts are checkable against the canvas, and the headline is only counts", () => {
    const led = selectOverlayDrawingLedger({
      ...allOnNothingMeasured(),
      liquidityWeather: weatherVM(),
      valueCandleOn: false,
    });

    expect(led.onCount).toBe(3);
    expect(led.drawnCount).toBe(1);
    expect(led.headline).toContain("1 of the 3");
    // Build Order §9 — a verdict may never be graded, and counts are not a
    // verdict. The headline must not reach for one.
    expect(led.headline).not.toMatch(/healthy|good|strong|weak|bad|ready/i);
  });

  it("says plainly when the trader has turned everything off", () => {
    const led = selectOverlayDrawingLedger({
      valueCandleOn: false,
      valueCandle: null,
      imbalanceStackOn: false,
      imbalanceStack: null,
      deltaDivergenceOn: false,
      deltaDivergence: null,
      liquidityWeatherOn: false,
      liquidityWeather: null,
    });

    expect(led.onCount).toBe(0);
    expect(led.drawnCount).toBe(0);
    expect(led.headline).toMatch(/switched off/i);
    expect(led.rows).toHaveLength(4);
  });

  it("names the one on-chart layer it does not speak for", () => {
    // The absorption field is computed from the VISIBLE range inside the draw
    // loop. A ledger that quietly omitted it would read as a complete list.
    expect(selectOverlayDrawingLedger(allOnNothingMeasured()).note)
      .toMatch(/absorption/i);
  });

  it("is pure — the same input twice gives the same answer", () => {
    const a = selectOverlayDrawingLedger(allOnNothingMeasured());
    const b = selectOverlayDrawingLedger(allOnNothingMeasured());
    expect(a).toEqual(b);
  });
});
