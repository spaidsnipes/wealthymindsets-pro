import { describe, expect, it } from "vitest";
import {
  selectDeltaDivergenceGlass,
  DIVERGENCE_GLASS_VERSION,
} from "./selectDeltaDivergenceGlass";
import {
  DELTA_DIVERGENCE_VERSION,
  type DeltaDivergenceVM,
} from "./selectDeltaDivergence";

function vm(over: Partial<DeltaDivergenceVM> = {}): DeltaDivergenceVM {
  return {
    version: DELTA_DIVERGENCE_VERSION,
    verdict: "BEARISH",
    priorPivot: { segment: 3, price: 430.4, cvd: 1820 },
    recentPivot: { segment: 9, price: 432.1, cvd: 640 },
    priceChange: 1.7,
    cvdChange: -1180,
    swingInSpread: 1.4,
    segments: [
      { index: 0, high: 430.6, low: 430.0, close: 430.4, cvd: 400, prints: 30 },
      { index: 1, high: 432.2, low: 431.4, close: 432.1, cvd: 640, prints: 28 },
    ],
    provenance: "TICK_RULE",
    requiresDisclosure: true,
    detail: "price made a higher high; cumulative delta fell 1,180",
    ...over,
  } as DeltaDivergenceVM;
}

describe("nothing is drawn where nothing was compared", () => {
  it("a null reading draws nothing and says UNMEASURED", () => {
    const g = selectDeltaDivergenceGlass(null);
    expect(g.drawn).toBe(false);
    expect(g.reason).toBe("UNMEASURED");
    expect(g.priorPrice).toBeNull();
    expect(g.recentPrice).toBeNull();
  });

  it("NO_SWING is its own reason and draws nothing", () => {
    // The engine spends most of its length refusing to compare two points that
    // are not far enough apart. Drawing the nearest two anyway would be the
    // manufactured divergence it exists to prevent.
    const g = selectDeltaDivergenceGlass(vm({ verdict: "NO_SWING" }));
    expect(g.drawn).toBe(false);
    expect(g.reason).toBe("NO_SWING");
  });

  it("does not reconstruct a missing pivot out of the segments", () => {
    // A verdict with no pivots is a bug upstream. Reading the nearest segment
    // extreme would hide it behind a confident picture.
    expect(selectDeltaDivergenceGlass(vm({ priorPivot: null })).drawn).toBe(false);
    expect(selectDeltaDivergenceGlass(vm({ recentPivot: null })).drawn).toBe(false);
  });
});

describe("the two prices reach the price axis", () => {
  it("carries both pivot prices through untouched", () => {
    const g = selectDeltaDivergenceGlass(vm());
    expect(g.drawn).toBe(true);
    expect(g.priorPrice).toBe(430.4);
    expect(g.recentPrice).toBe(432.1);
  });

  it("names the LEAN from the prices, so the drawing points where price went", () => {
    expect(selectDeltaDivergenceGlass(vm()).lean).toBe("UP");
    expect(
      selectDeltaDivergenceGlass(
        vm({
          verdict: "BULLISH",
          priorPivot: { segment: 2, price: 432.1, cvd: 900 },
          recentPivot: { segment: 8, price: 430.4, cvd: 880 },
        }),
      ).lean,
    ).toBe("DOWN");
  });

  it("a swing that ended where it began is FLAT, not silently UP", () => {
    const g = selectDeltaDivergenceGlass(
      vm({
        priorPivot: { segment: 2, price: 431, cvd: 900 },
        recentPivot: { segment: 8, price: 431, cvd: 100 },
      }),
    );
    expect(g.lean).toBe("FLAT");
  });
});

describe("CUMULATIVE DELTA NEVER BECOMES A COORDINATE", () => {
  it("emits no cvd-shaped number the canvas could mistake for a price", () => {
    // Delta is measured in contracts; the axis is measured in dollars. Any
    // mapping between them is a scale the house invented, and a trader reading
    // two lines crossing reads an event that did not happen.
    const g = selectDeltaDivergenceGlass(vm());
    const keys = Object.keys(g);
    expect(keys.filter((k) => /cvd|delta(High|Low|Y)|segments/i.test(k))).toEqual([]);
    expect(g.priorPrice).not.toBe(vm().priorPivot!.cvd);
  });

  it("carries no segment path at all — there is nothing honest to do with it", () => {
    const g = selectDeltaDivergenceGlass(vm()) as unknown as Record<string, unknown>;
    expect(g.segments).toBeUndefined();
  });
});

describe("the glass does not pretend to know WHEN", () => {
  it("timeKnown is false, because the engine indexes pivots by segment", () => {
    // A segment index is not a timestamp. A mark placed at the wrong bar is
    // worse than no mark: it is a specific false claim.
    expect(selectDeltaDivergenceGlass(vm()).timeKnown).toBe(false);
  });
});

describe("a finding is announced only when one was found", () => {
  it("BEARISH carries the engine's own sentence, unedited", () => {
    const g = selectDeltaDivergenceGlass(vm({ detail: "price made a higher high; delta fell" }));
    expect(g.diverged).toBe(true);
    expect(g.findingLabel).toBe("price made a higher high; delta fell");
  });

  it("CONFIRMED IS SILENT — the move being paid for is not a reassurance to print", () => {
    // §9: the absence of a warning is only honest if the calm state is
    // genuinely quiet.
    const g = selectDeltaDivergenceGlass(vm({ verdict: "CONFIRMED" }));
    expect(g.drawn).toBe(true);
    expect(g.diverged).toBe(false);
    expect(g.findingLabel).toBeNull();
    expect(g.label).toContain("FOLLOWED");
  });
});

describe("the headline is the swing in the window's own spread", () => {
  it("prints the swing in sigma, the unit the whole family measures travel in", () => {
    expect(selectDeltaDivergenceGlass(vm({ swingInSpread: 1.4 })).label).toContain("1.4σ");
  });

  it("says SWING UNMEASURED rather than printing a zero it did not measure", () => {
    const g = selectDeltaDivergenceGlass(vm({ swingInSpread: null }));
    expect(g.label).toContain("SWING UNMEASURED");
    expect(g.drawn).toBe(true);
  });
});

describe("the aggressor-side disclosure rides on the glass", () => {
  it("discloses when the sides were inferred rather than asserted", () => {
    // Cumulative delta IS a claim about who initiated, and a chart has no fine
    // print to put that in.
    expect(selectDeltaDivergenceGlass(vm({ requiresDisclosure: true })).disclosure).toBe(
      "SIDES INFERRED",
    );
  });

  it("is silent when the venue asserted the sides itself", () => {
    expect(
      selectDeltaDivergenceGlass(vm({ requiresDisclosure: false, provenance: "PROVIDER" }))
        .disclosure,
    ).toBeNull();
  });
});

describe("§9 — the compiler hands the canvas no colour to grade with", () => {
  it("emits no colour field and no literal colour anywhere", () => {
    const g = selectDeltaDivergenceGlass(vm());
    expect(Object.keys(g).filter((k) => /colou?r|hue|fill|stroke/i.test(k))).toEqual([]);
    expect(JSON.stringify(g)).not.toMatch(/#[0-9a-f]{3,6}|rgba?\(/i);
  });

  it("BEARISH and BULLISH are the same measurement pointing two ways", () => {
    // Neither is a scolding and neither is a cheer, so the two must not differ
    // in anything but geometry and the engine's sentence.
    const bear = selectDeltaDivergenceGlass(vm({ verdict: "BEARISH" }));
    const bull = selectDeltaDivergenceGlass(vm({ verdict: "BULLISH" }));
    expect(bull.diverged).toBe(bear.diverged);
    expect(bull.label).toBe(bear.label);
  });
});

describe("the reading is stamped", () => {
  it("carries its version in every state", () => {
    expect(selectDeltaDivergenceGlass(vm()).version).toBe(DIVERGENCE_GLASS_VERSION);
    expect(selectDeltaDivergenceGlass(null).version).toBe(DIVERGENCE_GLASS_VERSION);
  });
});
