import { describe, expect, it } from "vitest";
import { selectValueCandleGlass, VALUE_GLASS_VERSION } from "./selectValueCandleGlass";
import { VALUE_CANDLE_VERSION, type ValueCandleVM } from "./selectValueCandle";

function vm(over: Partial<ValueCandleVM> = {}): ValueCandleVM {
  return {
    version: VALUE_CANDLE_VERSION,
    measured: true,
    centerOfGravity: 431.2,
    spread: 0.4,
    valueLow: 430.8,
    valueHigh: 431.6,
    concentration: 74,
    bandCoverage: 0.24,
    high: 432.4,
    low: 430.1,
    last: 431.9,
    volume: 18400,
    prints: 512,
    migration: "ALIGNED",
    migrationDetail: "price and value agree",
    bins: [
      { price: 430.3, loPrice: 430.1, hiPrice: 430.5, volume: 900, share: 0.05, inValue: false },
      { price: 431.0, loPrice: 430.8, hiPrice: 431.2, volume: 7400, share: 0.40, inValue: true },
      { price: 431.4, loPrice: 431.2, hiPrice: 431.6, volume: 3700, share: 0.20, inValue: true },
      { price: 432.1, loPrice: 431.9, hiPrice: 432.3, volume: 1850, share: 0.10, inValue: false },
    ],
    ...over,
  } as ValueCandleVM;
}

describe("nothing is drawn where nothing was measured", () => {
  it("a null reading draws nothing and says UNMEASURED", () => {
    const g = selectValueCandleGlass(null);
    expect(g.drawn).toBe(false);
    expect(g.reason).toBe("UNMEASURED");
    expect(g.cog).toBeNull();
    expect(g.rungs).toEqual([]);
  });

  it("measured:false is a state of our knowledge, not a CoG of zero", () => {
    // The upstream engine is explicit: a stream with no sizes is not a candle
    // with a centre of gravity of zero, it is a candle with no centre. A glass
    // that draws a spine at 0 has invented a price.
    const g = selectValueCandleGlass(vm({ measured: false }));
    expect(g.drawn).toBe(false);
    expect(g.cog).toBeNull();
  });

  it("does not reconstruct a missing band out of the bins", () => {
    // A measured reading with no valueLow is a bug upstream. Deriving the band
    // from the distribution would hide it behind a confident picture.
    expect(selectValueCandleGlass(vm({ valueLow: null })).drawn).toBe(false);
    expect(selectValueCandleGlass(vm({ centerOfGravity: null })).drawn).toBe(false);
  });
});

describe("the prices reach the price axis", () => {
  it("carries the spine and the band through untouched", () => {
    const g = selectValueCandleGlass(vm());
    expect(g.drawn).toBe(true);
    expect(g.cog).toBe(431.2);
    expect(g.valueLow).toBe(430.8);
    expect(g.valueHigh).toBe(431.6);
  });

  it("carries every usable bin as a rung with its own price edges", () => {
    const g = selectValueCandleGlass(vm());
    expect(g.rungs).toHaveLength(4);
    expect(g.rungs[1]!.loPrice).toBe(430.8);
    expect(g.rungs[1]!.hiPrice).toBe(431.2);
    expect(g.rungs[1]!.inValue).toBe(true);
    expect(g.rungs[0]!.inValue).toBe(false);
  });

  it("drops bins that traded nothing rather than drawing a zero-width rung", () => {
    const g = selectValueCandleGlass(
      vm({
        bins: [
          { price: 430.3, loPrice: 430.1, hiPrice: 430.5, volume: 0, share: 0, inValue: false },
          { price: 431.0, loPrice: 430.8, hiPrice: 431.2, volume: 7400, share: 0.4, inValue: true },
        ],
      }),
    );
    expect(g.rungs).toHaveLength(1);
    expect(g.rungs[0]!.loPrice).toBe(430.8);
  });
});

describe("the histogram is self-scaling, and makes no other claim", () => {
  it("the heaviest bin in THIS window is full width, and it is the heaviest one", () => {
    const g = selectValueCandleGlass(vm());
    expect(g.rungs[1]!.widthFrac).toBe(1);
    expect(Math.max(...g.rungs.map((r) => r.widthFrac))).toBe(1);
  });

  it("widths are RELATIVE, so no absolute volume scale is implied", () => {
    // Multiplying every share by the same factor must not change the picture:
    // there is no volume scale that survives a symbol change, so the drawing
    // must not depend on one.
    const base = selectValueCandleGlass(vm());
    const scaled = selectValueCandleGlass(
      vm({ bins: vm().bins.map((b) => ({ ...b, share: b.share / 4, volume: b.volume / 4 })) }),
    );
    expect(scaled.rungs.map((r) => r.widthFrac)).toEqual(base.rungs.map((r) => r.widthFrac));
  });

  it("a window where nothing traded produces no rungs, not a divide by zero", () => {
    const g = selectValueCandleGlass(
      vm({
        bins: vm().bins.map((b) => ({ ...b, share: 0, volume: 0 })),
      }),
    );
    expect(g.rungs).toEqual([]);
    expect(g.rungs.every((r) => Number.isFinite(r.widthFrac))).toBe(true);
  });
});

describe("CONCENTRATION IS NOT TIGHTNESS, and the glass does not let it pretend to be", () => {
  it("the headline number is BAND COVERAGE, the honest width", () => {
    expect(selectValueCandleGlass(vm({ bandCoverage: 0.24 })).label).toContain("BAND 24% OF RANGE");
  });

  it("a hollow two-sided auction reads WIDE even though concentration is 100%", () => {
    // The trap the upstream docblock names: two heavy shelves and a hollow
    // middle put all the volume inside ±1σ and report 100% concentration. What
    // makes it loose is that the band had to cover the whole candle. If the
    // glass led with concentration, the loosest possible auction would show the
    // most flattering number on the chart.
    const barbell = selectValueCandleGlass(vm({ concentration: 100, bandCoverage: 0.98 }));
    expect(barbell.label).toContain("BAND 98% OF RANGE");
    expect(barbell.label).not.toContain("100");
  });

  it("says WIDTH UNMEASURED rather than falling back to the other number", () => {
    const g = selectValueCandleGlass(vm({ bandCoverage: null }));
    expect(g.label).toContain("WIDTH UNMEASURED");
    expect(g.drawn).toBe(true);
  });
});

describe("a migration is announced only when one was found", () => {
  it("LAGGED carries the engine's own sentence, unedited", () => {
    const g = selectValueCandleGlass(
      vm({ migration: "LAGGED", migrationDetail: "value trailing price by 1.4σ" }),
    );
    expect(g.migrationLabel).toBe("value trailing price by 1.4σ");
  });

  it("ALIGNED IS SILENT — it does not get a reassurance printed on the chart", () => {
    // §9: the absence of a warning is only honest if the calm state is
    // genuinely quiet. "Price and value agree" painted on every quiet bar is a
    // safety claim the house did not earn and cannot withdraw in time.
    expect(selectValueCandleGlass(vm({ migration: "ALIGNED" })).migrationLabel).toBeNull();
  });

  it("UNMEASURED is silent too, for the same reason and a different cause", () => {
    expect(selectValueCandleGlass(vm({ migration: "UNMEASURED" })).migrationLabel).toBeNull();
  });
});

describe("§9 — the compiler hands the canvas no colour to grade with", () => {
  it("emits no colour field and no literal colour anywhere", () => {
    const g = selectValueCandleGlass(vm());
    expect(Object.keys(g).filter((k) => /colou?r|hue|fill|stroke/i.test(k))).toEqual([]);
    expect(JSON.stringify(g)).not.toMatch(/#[0-9a-f]{3,6}|rgba?\(/i);
  });
});

describe("the reading is stamped", () => {
  it("carries its version in every state", () => {
    expect(selectValueCandleGlass(vm()).version).toBe(VALUE_GLASS_VERSION);
    expect(selectValueCandleGlass(null).version).toBe(VALUE_GLASS_VERSION);
  });
});
