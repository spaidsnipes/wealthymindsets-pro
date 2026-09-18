import { describe, expect, it } from "vitest";
import {
  selectBigTradeIntelligence,
  LARGE_PRINT_PERCENTILE,
  MIN_PRINTS_FOR_PERCENTILE,
  type BigTradePrint,
} from "./selectBigTradeIntelligence";

/**
 * A window of `n` real prints of ascending size, all on the same side unless
 * told otherwise. Sizes are 1..n so the percentile arithmetic is checkable by
 * hand rather than by re-implementing the selector in the test.
 */
function window_(n: number, over: Partial<BigTradePrint> = {}): BigTradePrint[] {
  return Array.from({ length: n }, (_, i) => ({
    time: 1_000 + i,
    price: 100 + i * 0.01,
    size: i + 1,
    side: "buy" as const,
    trade: true,
    ...over,
  }));
}

describe("selectBigTradeIntelligence — the window must be able to answer", () => {
  it("NO TAPE is distinguished from a thin tape, by name", () => {
    const none = selectBigTradeIntelligence([]);
    expect(none.measured).toBe(false);
    expect(none.missingInput).toBe("NO_TAPE");
    expect(none.missingInputNote).toMatch(/no per-trade tape/i);

    const thin = selectBigTradeIntelligence(window_(MIN_PRINTS_FOR_PERCENTILE - 1));
    expect(thin.measured).toBe(false);
    expect(thin.missingInput).toBe("TOO_FEW_PRINTS");
    expect(thin.missingInputNote).toMatch(/too few prints/i);
  });

  it("null and undefined are NO_TAPE, not a crash", () => {
    expect(selectBigTradeIntelligence(null).missingInput).toBe("NO_TAPE");
    expect(selectBigTradeIntelligence(undefined).missingInput).toBe("NO_TAPE");
  });

  it("an unmeasured window publishes NO threshold and NO net — never a zero", () => {
    const vm = selectBigTradeIntelligence(window_(3));
    expect(vm.thresholdSize).toBeNull();
    expect(vm.largeNet).toBeNull();
    expect(vm.largeShareOfVolume).toBeNull();
    expect(vm.largePrints).toEqual([]);
  });

  it("quotes and bookTicker updates are not prints", () => {
    const quotes = window_(40).map((p) => ({ ...p, trade: false }));
    expect(selectBigTradeIntelligence(quotes).missingInput).toBe("NO_TAPE");
  });

  it("non-finite and non-positive sizes and prices are dropped, not defaulted", () => {
    const junk: BigTradePrint[] = [
      { time: 1, price: 100, size: 0, side: "buy", trade: true },
      { time: 2, price: 100, size: -5, side: "buy", trade: true },
      { time: 3, price: 0, size: 5, side: "buy", trade: true },
      { time: 4, price: Number.NaN, size: 5, side: "buy", trade: true },
      { time: 5, price: 100, size: Number.NaN, side: "buy", trade: true },
    ];
    expect(selectBigTradeIntelligence(junk).windowPrints).toBe(0);
  });
});

describe("selectBigTradeIntelligence — the percentile cut", () => {
  it("cuts at a size the tape actually produced (nearest rank, never interpolated)", () => {
    const vm = selectBigTradeIntelligence(window_(20));
    expect(vm.measured).toBe(true);
    // 20 prints of size 1..20, p90 nearest-rank → index ceil(0.9*20)-1 = 17 → 18.
    expect(vm.thresholdSize).toBe(18);
    expect(Number.isInteger(vm.thresholdSize)).toBe(true);
  });

  it("keeps every print at or above the cut, heaviest first", () => {
    const vm = selectBigTradeIntelligence(window_(20));
    expect(vm.largeCount).toBe(3); // sizes 18, 19, 20
    expect(vm.largePrints.map((p) => p.size)).toEqual([20, 19, 18]);
  });

  it("sizePercentile counts prints STRICTLY smaller, so ties cannot outrank each other", () => {
    const prints = [...window_(20)];
    prints[18] = { ...prints[18], size: 20 }; // two prints of size 20
    const vm = selectBigTradeIntelligence(prints);
    const twenties = vm.largePrints.filter((p) => p.size === 20);
    expect(twenties).toHaveLength(2);
    expect(twenties[0].sizePercentile).toBe(twenties[1].sizePercentile);
  });

  it("ties break on time ascending so identical input yields identical rows", () => {
    const flat = window_(24, { size: 5 });
    const a = selectBigTradeIntelligence(flat);
    const b = selectBigTradeIntelligence(flat);
    expect(a.largePrints.map((p) => p.time)).toEqual(b.largePrints.map((p) => p.time));
  });

  it("caps the rows but reports the true qualifying count", () => {
    const flat = window_(40, { size: 5 }); // every print ties, all qualify
    const vm = selectBigTradeIntelligence(flat, { maxRows: 4 });
    expect(vm.largeCount).toBe(40);
    expect(vm.largePrints).toHaveLength(4);
  });

  it("publishes the percentile basis as a window-relative claim", () => {
    const vm = selectBigTradeIntelligence(window_(20));
    expect(vm.thresholdPercentile).toBe(LARGE_PRINT_PERCENTILE);
    expect(vm.percentileBasisNote).toMatch(/WITHIN THIS WINDOW/);
    expect(vm.percentileBasisNote).toMatch(/not to any other symbol or session/);
  });
});

describe("selectBigTradeIntelligence — the two bases are published unblended", () => {
  it("names a QUIET tape when the percentile finds more than the absolute floor does", () => {
    // base 200 → minBigTradeLot = 2 (the `base > 100` bucket; 100 itself falls
    // into the bucket BELOW it). Sizes 0.1..2.0 in 0.1 steps: only the last
    // clears the floor, but the top decile stands out all the same.
    const prints = Array.from({ length: 20 }, (_, i) => ({
      time: 1_000 + i,
      price: 200,
      size: (i + 1) / 10,
      side: "buy" as const,
      trade: true,
    }));
    const vm = selectBigTradeIntelligence(prints);
    expect(vm.lotFloor).toBe(2);
    expect(vm.lotFloorCount).toBe(1);
    expect(vm.largeCount).toBeGreaterThan(vm.lotFloorCount);
    expect(vm.basisDivergenceNote).toMatch(/quiet tape/i);
  });

  it("names a BUSY tape when the absolute floor finds more than the percentile does", () => {
    const prints = window_(40, { price: 100, size: 50 }); // all far above floor 2
    const vm = selectBigTradeIntelligence(prints, { maxRows: 5 });
    // Everything ties, so everything qualifies on both bases — no divergence.
    expect(vm.basisDivergenceNote).toBeNull();

    const skewed = window_(40, { price: 100 }).map((p, i) => ({ ...p, size: 10 + i }));
    const vm2 = selectBigTradeIntelligence(skewed);
    expect(vm2.lotFloorCount).toBe(40);
    expect(vm2.largeCount).toBeLessThan(40);
    expect(vm2.basisDivergenceNote).toMatch(/busy tape/i);
  });

  it("the absolute floor is keyed on the LATEST price, and is overridable", () => {
    const vm = selectBigTradeIntelligence(window_(20, { price: 50_000 }));
    expect(vm.lotFloor).toBe(0.15);
    expect(selectBigTradeIntelligence(window_(20), { base: 50_000 }).lotFloor).toBe(0.15);
  });
});

describe("selectBigTradeIntelligence — the side is the half most likely to be a lie", () => {
  it("a single unsided LARGE print withholds the net entirely", () => {
    const prints = [...window_(20)];
    prints[19] = { ...prints[19], side: null }; // the biggest print, no side
    const vm = selectBigTradeIntelligence(prints);
    expect(vm.largeUnsidedCount).toBe(1);
    expect(vm.largeNet).toBeNull();
    // The sided volume is still published — the gap is visible, not erased.
    expect(vm.largeBuyVolume).toBe(18 + 19);
  });

  it("an unsided print is NOT counted as a sell", () => {
    const vm = selectBigTradeIntelligence(
      [...window_(20)].map((p, i) => (i === 19 ? { ...p, side: null } : p)),
    );
    expect(vm.largeSellVolume).toBe(0);
  });

  it("a fully sided window yields a signed net", () => {
    const prints = [...window_(20)];
    prints[19] = { ...prints[19], side: "sell" };
    const vm = selectBigTradeIntelligence(prints);
    expect(vm.largeUnsidedCount).toBe(0);
    expect(vm.largeNet).toBe(18 + 19 - 20);
  });

  it("provenance is weakest-link: one tick-rule print makes the whole net MIXED", () => {
    const provider = window_(20).map((p) => ({
      ...p,
      marketEvent: { aggressorMethod: "PROVIDER" as const },
    }));
    expect(selectBigTradeIntelligence(provider).provenance).toBe("PROVIDER");

    const mixed = provider.map((p, i) =>
      i === 19 ? { ...p, marketEvent: { aggressorMethod: "TICK_RULE" as const } } : p,
    );
    const vm = selectBigTradeIntelligence(mixed);
    expect(vm.provenance).toBe("MIXED");
    expect(vm.provenanceNote).toMatch(/no single method backs/i);
  });

  it("a wholly reconstructed tape says RECONSTRUCTED, not nothing", () => {
    const vm = selectBigTradeIntelligence(
      window_(20).map((p) => ({ ...p, marketEvent: { aggressorMethod: "TICK_RULE" as const } })),
    );
    expect(vm.provenance).toBe("INFERRED");
    expect(vm.provenanceNote).toMatch(/RECONSTRUCTED/);
  });

  it("MAKER_SIDE_INVERTED is provider-grade — it is a definition, not a guess", () => {
    const vm = selectBigTradeIntelligence(
      window_(20).map((p) => ({
        ...p,
        marketEvent: { aggressorMethod: "MAKER_SIDE_INVERTED" as const },
      })),
    );
    expect(vm.provenance).toBe("PROVIDER");
  });
});

describe("selectBigTradeIntelligence — window arithmetic", () => {
  it("large share of volume is a real fraction of the window it measured", () => {
    const vm = selectBigTradeIntelligence(window_(20));
    const total = (20 * 21) / 2;
    expect(vm.windowVolume).toBe(total);
    expect(vm.largeVolume).toBe(18 + 19 + 20);
    expect(vm.largeShareOfVolume).toBeCloseTo((18 + 19 + 20) / total, 10);
  });

  it("every large print is flagged for whether the chart's bubble would have fired", () => {
    const vm = selectBigTradeIntelligence(window_(20, { price: 100 }));
    // floor 2, sizes 18/19/20 — all clear it.
    expect(vm.largePrints.every((p) => p.clearsLotFloor)).toBe(true);
  });

  it("the price on a row is the price as printed — never rounded by this layer", () => {
    const prints = [...window_(20)];
    prints[19] = { ...prints[19], price: 60_123.4587 };
    const vm = selectBigTradeIntelligence(prints);
    expect(vm.largePrints[0].price).toBe(60_123.4587);
  });
});
