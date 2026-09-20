import { describe, expect, it } from "vitest";
import {
  composeOrderFlowOverlay,
  ORDER_FLOW_OVERLAY_VERSION,
  type ComposeOrderFlowOverlayInput,
  type OverlayBand,
  type OverlayPoint,
  type TapeWindow,
} from "./composeOrderFlowOverlay";
import type { LiquidityWeatherVM } from "./selectLiquidityWeather";
import type { AbsorptionVM } from "./selectAbsorption";
import type { StackedImbalanceVM } from "./selectStackedImbalance";
import type { BigTradeIntelligenceVM } from "./selectBigTradeIntelligence";
import type { ValueCandleVM } from "./selectValueCandle";

const WINDOW: TapeWindow = { startMs: 1_000, endMs: 5_000 };

function liquidity(
  overrides: Partial<LiquidityWeatherVM> = {},
): LiquidityWeatherVM {
  return {
    version: 1,
    stage: "STEADY",
    segments: [
      {
        index: 0,
        volume: 400,
        prints: 20,
        high: 101,
        low: 100,
        range: 1,
        rangeInSpread: 2,
        cost: 200,
        stalled: false,
      },
      {
        index: 1,
        volume: 600,
        prints: 20,
        high: 102,
        low: 102,
        range: 0,
        rangeInSpread: 0,
        cost: null,
        stalled: true,
      },
    ],
    spread: 0.5,
    medianCost: 200,
    latestCost: null,
    latestVsMedian: null,
    latestVsPeers: null,
    trendRatio: null,
    dispersion: null,
    provenance: "PROVIDER",
    requiresDisclosure: false,
    detail: "steady",
    ...overrides,
  } as LiquidityWeatherVM;
}

function absorption(overrides: Partial<AbsorptionVM> = {}): AbsorptionVM {
  return {
    version: 1,
    verdict: "ABSORBED",
    pressingSide: "BUYERS",
    buyEffort: 900,
    sellEffort: 300,
    netEffort: 600,
    imbalance: 0.5,
    displacement: 0.25,
    displacementInSpread: 0.5,
    efficiency: 0.0004,
    provenance: "PROVIDER",
    requiresDisclosure: false,
    detail: "buyers pressed and price did not go",
    ...overrides,
  } as AbsorptionVM;
}

function value(overrides: Partial<ValueCandleVM> = {}): ValueCandleVM {
  return {
    centerOfGravity: 100.5,
    valueLow: 100,
    valueHigh: 101,
    ...overrides,
  } as ValueCandleVM;
}

function imbalance(
  overrides: Partial<StackedImbalanceVM> = {},
): StackedImbalanceVM {
  return {
    version: 1,
    verdict: "DEFENDED",
    direction: "BUY",
    levels: [
      {
        price: 99,
        dominantVolume: 300,
        opposingVolume: 80,
        ratio: 375,
        oneSided: false,
      },
      {
        price: 99.25,
        dominantVolume: 220,
        opposingVolume: 0,
        ratio: 300,
        oneSided: true,
      },
    ],
    stackLow: 99,
    stackHigh: 99.25,
    tickSize: 0.25,
    formationPrints: 40,
    responsePrints: 22,
    retestedTo: 99.1,
    beyondInSpreads: -0.4,
    spread: 0.5,
    provenance: "PROVIDER",
    requiresDisclosure: true,
    detail: "the stack held",
    ...overrides,
  } as StackedImbalanceVM;
}

function bigTrades(
  overrides: Partial<BigTradeIntelligenceVM> = {},
): BigTradeIntelligenceVM {
  return {
    measured: true,
    missingInput: null,
    missingInputNote: null,
    windowPrints: 500,
    windowVolume: 40_000,
    thresholdSize: 250,
    thresholdPercentile: 0.99,
    lotFloor: 200,
    lotFloorCount: 3,
    basisDivergenceNote: null,
    percentileBasisNote: "measured over 500 prints",
    largePrints: [
      {
        time: 2_500,
        price: 100.75,
        size: 400,
        side: "buy",
        sizePercentile: 0.995,
        clearsLotFloor: true,
      },
    ],
    largeCount: 1,
    largeVolume: 400,
    largeShareOfVolume: 0.01,
    largeBuyVolume: 400,
    largeSellVolume: 0,
    largeUnsidedCount: 0,
    largeNet: 400,
    provenance: "PROVIDER",
    provenanceNote: "venue asserted every side",
    ...overrides,
  } as BigTradeIntelligenceVM;
}

function compose(input: Partial<ComposeOrderFlowOverlayInput> = {}) {
  return composeOrderFlowOverlay({ window: WINDOW, ...input });
}

describe("composeOrderFlowOverlay — empty and version", () => {
  it("publishes its version", () => {
    expect(compose().version).toBe(ORDER_FLOW_OVERLAY_VERSION);
  });

  it("places nothing and refuses nothing when no reading is supplied", () => {
    const vm = compose();
    expect(vm.marks).toEqual([]);
    expect(vm.refusals).toEqual([]);
    expect(vm.placed).toBe(false);
    expect(vm.detail).not.toBe("");
  });

  it("never publishes an empty detail line in any state", () => {
    const states = [
      compose(),
      compose({ window: null }),
      compose({ liquidity: liquidity() }),
      compose({ absorption: absorption({ verdict: "UNMEASURED" }) }),
      compose({ bigTrades: bigTrades({ measured: false }) }),
    ];
    for (const vm of states) {
      expect(vm.detail.length).toBeGreaterThan(0);
    }
  });
});

describe("composeOrderFlowOverlay — it refuses rather than fabricates time", () => {
  it("refuses every window-level reading when no window is supplied", () => {
    const vm = composeOrderFlowOverlay({
      window: null,
      liquidity: liquidity(),
      absorption: absorption(),
      value: value(),
      imbalance: imbalance(),
    });
    expect(vm.marks).toEqual([]);
    expect(vm.refusals.map((r) => r.source)).toEqual(
      expect.arrayContaining(["WINDOW", "LIQUIDITY", "ABSORPTION", "IMBALANCE"]),
    );
  });

  it("refuses a window whose end does not follow its start", () => {
    const vm = composeOrderFlowOverlay({
      window: { startMs: 5_000, endMs: 5_000 },
      liquidity: liquidity(),
    });
    expect(vm.marks).toEqual([]);
    expect(vm.refusals.some((r) => r.source === "WINDOW")).toBe(true);
  });

  it("does NOT spread ordinal liquidity segments across the window by index", () => {
    const vm = compose({ liquidity: liquidity() });
    const bands = vm.marks.filter((m): m is OverlayBand => m.kind === "BAND");
    expect(bands).toHaveLength(2);
    // The lie this test exists to prevent: segment 0 occupying the first half
    // and segment 1 the second. Every segment spans the FULL window.
    for (const band of bands) {
      expect(band.startMs).toBe(WINDOW.startMs);
      expect(band.endMs).toBe(WINDOW.endMs);
      expect(band.spansWholeWindow).toBe(true);
      expect(band.ordinalOnly).toBe(true);
    }
    // And no two segments carry different time spans.
    expect(new Set(bands.map((b) => `${b.startMs}-${b.endMs}`)).size).toBe(1);
  });

  it("raises the ordinal disclosure flag whenever an ordinal band is placed", () => {
    expect(compose({ liquidity: liquidity() }).requiresOrdinalDisclosure).toBe(
      true,
    );
  });

  it("does not raise the ordinal flag for readings with measured prices", () => {
    const vm = compose({ imbalance: imbalance() });
    expect(vm.placed).toBe(true);
    expect(vm.requiresOrdinalDisclosure).toBe(false);
  });
});

describe("composeOrderFlowOverlay — liquidity", () => {
  it("places each segment at its own measured price extent", () => {
    const vm = compose({ liquidity: liquidity() });
    const bands = vm.marks.filter((m): m is OverlayBand => m.kind === "BAND");
    expect(bands[0].priceLow).toBe(100);
    expect(bands[0].priceHigh).toBe(101);
    expect(bands[1].priceLow).toBe(102);
    expect(bands[1].priceHigh).toBe(102);
  });

  it("names a stalled segment as stalled", () => {
    const vm = compose({ liquidity: liquidity() });
    const bands = vm.marks.filter((m): m is OverlayBand => m.kind === "BAND");
    expect(bands[1].label).toBe("STALLED");
  });

  it("refuses an unmeasured stage and carries the selector's own line", () => {
    const vm = compose({
      liquidity: liquidity({ stage: "UNMEASURED", detail: "no tape" }),
    });
    expect(vm.marks).toEqual([]);
    expect(vm.refusals).toContainEqual({ source: "LIQUIDITY", reason: "no tape" });
  });

  it("refuses a segment with no price extent instead of dropping it silently", () => {
    const vm = compose({
      liquidity: liquidity({
        segments: [
          {
            index: 0,
            volume: 1,
            prints: 1,
            high: Number.NaN,
            low: Number.NaN,
            range: 0,
            rangeInSpread: null,
            cost: null,
            stalled: false,
          },
        ],
      }),
    });
    expect(vm.marks).toEqual([]);
    expect(vm.refusals.some((r) => r.source === "LIQUIDITY")).toBe(true);
  });
});

describe("composeOrderFlowOverlay — absorption borrows its band lawfully", () => {
  it("refuses when no value candle names a band", () => {
    const vm = compose({ absorption: absorption() });
    expect(vm.marks).toEqual([]);
    expect(vm.refusals.some((r) => r.source === "ABSORPTION")).toBe(true);
  });

  it("places the shelf at the value candle's own band, not an invented one", () => {
    const vm = compose({ absorption: absorption(), value: value() });
    const band = vm.marks.find((m): m is OverlayBand => m.kind === "BAND");
    expect(band?.priceLow).toBe(100);
    expect(band?.priceHigh).toBe(101);
    expect(band?.label).toBe("ABSORBED");
    expect(band?.ordinalOnly).toBe(false);
  });

  it("adds the centre-of-gravity level when the value candle measured one", () => {
    const vm = compose({ absorption: absorption(), value: value() });
    expect(vm.marks.some((m) => m.kind === "LEVEL" && m.price === 100.5)).toBe(
      true,
    );
  });

  it("omits the centre-of-gravity level when it was not measured", () => {
    const vm = compose({
      absorption: absorption(),
      value: value({ centerOfGravity: null }),
    });
    expect(vm.marks.some((m) => m.kind === "LEVEL")).toBe(false);
  });

  it("refuses an unmeasured verdict even when a band is available", () => {
    const vm = compose({
      absorption: absorption({ verdict: "UNMEASURED", detail: "no effort" }),
      value: value(),
    });
    expect(vm.marks).toEqual([]);
    expect(vm.refusals).toContainEqual({
      source: "ABSORPTION",
      reason: "no effort",
    });
  });
});

describe("composeOrderFlowOverlay — imbalance stack", () => {
  it("places the stack at its measured extent and each level as a line", () => {
    const vm = compose({ imbalance: imbalance() });
    const band = vm.marks.find((m): m is OverlayBand => m.kind === "BAND");
    expect(band?.priceLow).toBe(99);
    expect(band?.priceHigh).toBe(99.25);
    expect(vm.marks.filter((m) => m.kind === "LEVEL")).toHaveLength(2);
  });

  it("names a one-sided level as one-sided", () => {
    const vm = compose({ imbalance: imbalance() });
    const levels = vm.marks.filter((m) => m.kind === "LEVEL");
    expect(levels[1].label).toBe("ONE-SIDED");
  });

  it("refuses NO_STACK and UNMEASURED verdicts", () => {
    for (const verdict of ["NO_STACK", "UNMEASURED"] as const) {
      const vm = compose({ imbalance: imbalance({ verdict }) });
      expect(vm.marks).toEqual([]);
      expect(vm.refusals.some((r) => r.source === "IMBALANCE")).toBe(true);
    }
  });

  it("refuses a stack whose extent was never measured", () => {
    const vm = compose({
      imbalance: imbalance({ stackLow: null, stackHigh: null }),
    });
    expect(vm.marks).toEqual([]);
    expect(vm.refusals.some((r) => r.source === "IMBALANCE")).toBe(true);
  });
});

describe("composeOrderFlowOverlay — big trades are the only exact placement", () => {
  it("places a large print at its own real time and price", () => {
    const vm = compose({ bigTrades: bigTrades() });
    const point = vm.marks.find((m): m is OverlayPoint => m.kind === "POINT");
    expect(point?.timeMs).toBe(2_500);
    expect(point?.price).toBe(100.75);
    expect(point?.size).toBe(400);
    expect(point?.side).toBe("buy");
  });

  it("places big trades even with no window, because they carry their own time", () => {
    const vm = composeOrderFlowOverlay({
      window: null,
      bigTrades: bigTrades(),
    });
    expect(vm.marks.filter((m) => m.kind === "POINT")).toHaveLength(1);
  });

  it("refuses a print that stated no time rather than placing it at the edge", () => {
    const vm = compose({
      bigTrades: bigTrades({
        largePrints: [
          {
            time: null,
            price: 100.75,
            size: 400,
            side: "buy",
            sizePercentile: 0.995,
            clearsLotFloor: true,
          },
        ],
      }),
    });
    expect(vm.marks).toEqual([]);
    expect(vm.refusals.some((r) => r.source === "BIG_TRADES")).toBe(true);
  });

  it("never defaults an unsided print to a side", () => {
    const vm = compose({
      bigTrades: bigTrades({
        largePrints: [
          {
            time: 2_500,
            price: 100.75,
            size: 400,
            side: null,
            sizePercentile: 0.995,
            clearsLotFloor: true,
          },
        ],
        largeNet: null,
        largeUnsidedCount: 1,
      }),
    });
    const point = vm.marks.find((m): m is OverlayPoint => m.kind === "POINT");
    expect(point?.side).toBeNull();
    expect(point?.label).toBe("UNSIDED");
    expect(point?.detail).toContain("no aggressor side");
  });

  it("refuses the whole reading when the window could not compute a size cut", () => {
    const vm = compose({
      bigTrades: bigTrades({
        measured: false,
        missingInput: "TOO_FEW_PRINTS",
        missingInputNote: "only 4 prints",
        largePrints: [],
      }),
    });
    expect(vm.marks).toEqual([]);
    expect(vm.refusals).toContainEqual({
      source: "BIG_TRADES",
      reason: "only 4 prints",
    });
  });
});

describe("composeOrderFlowOverlay — determinism and composition", () => {
  it("returns identical output for identical input", () => {
    const input: ComposeOrderFlowOverlayInput = {
      window: WINDOW,
      liquidity: liquidity(),
      absorption: absorption(),
      value: value(),
      imbalance: imbalance(),
      bigTrades: bigTrades(),
    };
    expect(composeOrderFlowOverlay(input)).toEqual(
      composeOrderFlowOverlay(input),
    );
  });

  it("composes all five readings onto one canvas", () => {
    const vm = compose({
      liquidity: liquidity(),
      absorption: absorption(),
      value: value(),
      imbalance: imbalance(),
      bigTrades: bigTrades(),
    });
    expect(vm.placed).toBe(true);
    expect(vm.marks.filter((m) => m.kind === "BAND").length).toBeGreaterThan(2);
    expect(vm.marks.some((m) => m.kind === "POINT")).toBe(true);
    expect(vm.marks.some((m) => m.kind === "LEVEL")).toBe(true);
    expect(vm.requiresOrdinalDisclosure).toBe(true);
  });

  it("gives every mark a unique id", () => {
    const vm = compose({
      liquidity: liquidity(),
      absorption: absorption(),
      value: value(),
      imbalance: imbalance(),
      bigTrades: bigTrades(),
    });
    const ids = vm.marks.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
