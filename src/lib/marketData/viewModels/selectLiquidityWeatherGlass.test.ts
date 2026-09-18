import { describe, expect, it } from "vitest";
import {
  selectLiquidityWeatherGlass,
  WEATHER_GLASS_VERSION,
} from "./selectLiquidityWeatherGlass";
import {
  LIQUIDITY_WEATHER_VERSION,
  type LiquidityWeatherVM,
  type LiquiditySegment,
} from "./selectLiquidityWeather";

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

function vm(over: Partial<LiquidityWeatherVM> = {}): LiquidityWeatherVM {
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
    provenance: "TICK_RULE",
    requiresDisclosure: false,
    detail: "the late half cost 38% less size per unit of travel",
    ...over,
  } as LiquidityWeatherVM;
}

describe("the engine's refusal is carried, not overruled", () => {
  it("a null reading draws nothing", () => {
    const g = selectLiquidityWeatherGlass(null);
    expect(g.drawn).toBe(false);
    expect(g.reason).toBe("UNMEASURED");
    expect(g.stage).toBe("UNMEASURED");
  });

  it("UNMEASURED is a refusal to report weather, not a seventh mood to draw", () => {
    const g = selectLiquidityWeatherGlass(vm({ stage: "UNMEASURED" }));
    expect(g.drawn).toBe(false);
    expect(g.label).toBe("");
  });
});

describe("A COST HAS NO PRICE, and the glass does not invent one for it", () => {
  it("emits no level, band or coordinate for the stage itself", () => {
    // THINNING is a statement about the window, not about $431.40. Drawing it
    // at a price would be inventing a location for a finding that has none.
    const g = selectLiquidityWeatherGlass(vm());
    const keys = Object.keys(g);
    expect(keys.filter((k) => /price(Low|High)|band|level|cog|y\b/i.test(k))).toEqual([]);
  });

  it("carries no cost figure the canvas could place on the axis", () => {
    const g = selectLiquidityWeatherGlass(vm()) as unknown as Record<string, unknown>;
    expect(g.medianCost).toBeUndefined();
    expect(g.latestCost).toBeUndefined();
    expect(g.segments).toBeUndefined();
  });
});

describe("A STALLED SEGMENT IS A PRICE, and it is the one thing that goes on the axis", () => {
  it("carries the price of every segment that traded without moving", () => {
    const g = selectLiquidityWeatherGlass(
      vm({
        segments: [
          seg({ index: 0 }),
          seg({ index: 1, high: 430.5, low: 430.5, range: 0, cost: null, stalled: true }),
        ],
      }),
    );
    expect(g.stallPrices).toEqual([430.5]);
  });

  it("no stalls is the ordinary case and says so with an empty list, not a zero", () => {
    const g = selectLiquidityWeatherGlass(vm());
    expect(g.stallPrices).toEqual([]);
    expect(g.stallLabel).toBeNull();
  });

  it("does not draw a shelf twice when two segments stalled at the same price", () => {
    const g = selectLiquidityWeatherGlass(
      vm({
        segments: [
          seg({ index: 0, high: 430.5, low: 430.5, range: 0, cost: null, stalled: true }),
          seg({ index: 1, high: 430.5, low: 430.5, range: 0, cost: null, stalled: true }),
        ],
      }),
    );
    expect(g.stallPrices).toEqual([430.5]);
  });

  it("REFUSES a segment marked stalled whose edges disagree", () => {
    // Stalled means high === low by construction. Edges that disagree are a
    // contradiction upstream, and drawing the high would be silently choosing
    // one of two numbers that were supposed to be the same one.
    const g = selectLiquidityWeatherGlass(
      vm({
        segments: [seg({ index: 0, high: 431.2, low: 430.4, range: 0.8, stalled: true })],
      }),
    );
    expect(g.stallPrices).toEqual([]);
  });

  it("sorts the shelves so the drawing order does not depend on tape order", () => {
    const g = selectLiquidityWeatherGlass(
      vm({
        segments: [
          seg({ index: 0, high: 432.1, low: 432.1, range: 0, cost: null, stalled: true }),
          seg({ index: 1, high: 430.5, low: 430.5, range: 0, cost: null, stalled: true }),
        ],
      }),
    );
    expect(g.stallPrices).toEqual([430.5, 432.1]);
    expect(g.stallLabel).toContain("2 SHELFS");
  });
});

describe("the headline shows the numbers the stage was decided by", () => {
  it("names the stage in words", () => {
    expect(selectLiquidityWeatherGlass(vm({ stage: "AIRLESS" })).label).toContain(
      "LIQUIDITY AIRLESS",
    );
  });

  it("shows the half-over-half trend the stage rests on", () => {
    expect(selectLiquidityWeatherGlass(vm({ trendRatio: 1.83 })).label).toContain("1.83×");
  });

  it("shows the incoherence share rather than keeping it a private gate", () => {
    // It is the number that decides whether the two halves may be compared at
    // all. A reader who cannot see it cannot check ERRATIC against the bars.
    expect(selectLiquidityWeatherGlass(vm({ dispersion: 0.42 })).label).toContain("42% INCOHERENT");
  });

  it("omits a statistic it does not have rather than printing a zero", () => {
    const g = selectLiquidityWeatherGlass(vm({ trendRatio: null, dispersion: null }));
    expect(g.label).toBe("LIQUIDITY THINNING");
    expect(g.drawn).toBe(true);
  });

  it("carries the engine's own sentence unedited", () => {
    expect(selectLiquidityWeatherGlass(vm({ detail: "cost halved across the window" })).detail).toBe(
      "cost halved across the window",
    );
  });
});

describe("§9 — seven stages are a gradient, and no gradient gets a hue", () => {
  it("emits no colour field and no literal colour anywhere", () => {
    const g = selectLiquidityWeatherGlass(vm());
    expect(Object.keys(g).filter((k) => /colou?r|hue|fill|stroke/i.test(k))).toEqual([]);
    expect(JSON.stringify(g)).not.toMatch(/#[0-9a-f]{3,6}|rgba?\(/i);
  });

  it("AIRLESS and HEAVY differ only in the word, never in a severity field", () => {
    // A thin tape is where a stop slips and also where a breakout runs. The
    // house has no standing to call either one good or bad.
    const airless = selectLiquidityWeatherGlass(vm({ stage: "AIRLESS" }));
    const heavy = selectLiquidityWeatherGlass(vm({ stage: "HEAVY" }));
    expect(Object.keys(airless)).toEqual(Object.keys(heavy));
    expect(Object.keys(airless).filter((k) => /severity|danger|score|rank/i.test(k))).toEqual([]);
  });
});

describe("it asks for no aggressor disclosure, because it never read a side", () => {
  it("emits no disclosure field at all", () => {
    // The engine's `requiresDisclosure` is `false` BY TYPE. Emitting a
    // disclosure here would imply a dependency this reading does not have.
    const g = selectLiquidityWeatherGlass(vm()) as unknown as Record<string, unknown>;
    expect(g.disclosure).toBeUndefined();
    expect(g.requiresDisclosure).toBeUndefined();
  });
});

describe("the reading is stamped", () => {
  it("carries its version in every state", () => {
    expect(selectLiquidityWeatherGlass(vm()).version).toBe(WEATHER_GLASS_VERSION);
    expect(selectLiquidityWeatherGlass(null).version).toBe(WEATHER_GLASS_VERSION);
  });
});
