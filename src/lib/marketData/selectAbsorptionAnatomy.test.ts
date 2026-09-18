import { describe, expect, it } from "vitest";
import {
  selectAbsorptionAnatomy,
  strengthOfRatio,
  type AnatomyBarInput,
} from "./selectAbsorptionAnatomy";

/** A quiet, well-formed bar. Callers override only what the case is about. */
function bar(over: Partial<AnatomyBarInput> = {}): AnatomyBarInput {
  return { time: 1, open: 100, high: 100.5, low: 99.5, close: 100.2, volume: 1_000, ...over };
}

function series(specs: Array<Partial<AnatomyBarInput>>): AnatomyBarInput[] {
  return specs.map((spec, i) => bar({ time: i + 1, ...spec }));
}

describe("selectAbsorptionAnatomy — basis is tiered and never invented", () => {
  it("SIGNED_DELTA only when every bar carries a PROVIDER-asserted split", () => {
    const vm = selectAbsorptionAnatomy(
      series([
        { askVol: 600, bidVol: 400, aggressorProvenance: "PROVIDER" },
        { askVol: 300, bidVol: 700, aggressorProvenance: "PROVIDER" },
      ]),
    );
    expect(vm.basis).toBe("SIGNED_DELTA");
    expect(vm.measured).toBe(true);
  });

  it("weakest-link: ONE inferred bar drags the whole window to INFERRED_DELTA", () => {
    const vm = selectAbsorptionAnatomy(
      series([
        { askVol: 600, bidVol: 400, aggressorProvenance: "PROVIDER" },
        { askVol: 300, bidVol: 700, aggressorProvenance: "INFERRED" },
      ]),
    );
    expect(vm.basis).toBe("INFERRED_DELTA");
  });

  it("a bar with no split at all drops the window to VOLUME, not to a delta tier", () => {
    const vm = selectAbsorptionAnatomy(
      series([
        { askVol: 600, bidVol: 400, aggressorProvenance: "PROVIDER" },
        { askVol: null, bidVol: null, volume: 900 },
      ]),
    );
    expect(vm.basis).toBe("VOLUME");
  });

  it("no volume and no split is UNMEASURED — and draws nothing, rather than a flat band", () => {
    const vm = selectAbsorptionAnatomy(series([{ volume: 0 }, { volume: null }]));
    expect(vm.basis).toBe("UNMEASURED");
    expect(vm.measured).toBe(false);
    expect(vm.bars).toEqual([]);
    expect(vm.zones).toEqual([]);
  });

  it("empty and nullish input are UNMEASURED, not a crash and not a fabricated window", () => {
    for (const input of [null, undefined, []] as const) {
      const vm = selectAbsorptionAnatomy(input);
      expect(vm.basis).toBe("UNMEASURED");
      expect(vm.measured).toBe(false);
    }
  });

  it("§Silence — bars with non-finite OHLC are dropped, never repaired", () => {
    const vm = selectAbsorptionAnatomy(
      series([{ close: Number.NaN }, { volume: 500 }, { open: Number.POSITIVE_INFINITY }]),
    );
    expect(vm.windowBars).toBe(1);
    expect(vm.bars).toHaveLength(1);
  });
});

describe("selectAbsorptionAnatomy — delta is only published when it was observed", () => {
  it("VOLUME basis publishes delta === null on every bar (candle colour is not evidence)", () => {
    const vm = selectAbsorptionAnatomy(
      series([
        { volume: 900, close: 101, open: 100 },
        { volume: 800, close: 99, open: 100 },
      ]),
    );
    expect(vm.basis).toBe("VOLUME");
    expect(vm.bars.every(b => b.delta === null)).toBe(true);
  });

  it("delta tiers publish the signed split, sign intact", () => {
    const vm = selectAbsorptionAnatomy(
      series([
        { askVol: 600, bidVol: 400, aggressorProvenance: "PROVIDER" },
        { askVol: 100, bidVol: 900, aggressorProvenance: "PROVIDER" },
      ]),
    );
    expect(vm.bars.map(b => b.delta)).toEqual([200, -800]);
  });

  it("effort on a delta tier is the MAGNITUDE of the split, so both sides raise the field", () => {
    const vm = selectAbsorptionAnatomy(
      series([
        { askVol: 100, bidVol: 900, aggressorProvenance: "PROVIDER" },
        { askVol: 900, bidVol: 100, aggressorProvenance: "PROVIDER" },
      ]),
    );
    expect(vm.bars.map(b => b.effort)).toEqual([800, 800]);
    expect(vm.bars.map(b => b.effortNorm)).toEqual([1, 1]);
  });

  it("effort on VOLUME basis is traded volume", () => {
    const vm = selectAbsorptionAnatomy(series([{ volume: 250 }, { volume: 1_000 }]));
    expect(vm.bars.map(b => b.effort)).toEqual([250, 1_000]);
    expect(vm.bars.map(b => b.effortNorm)).toEqual([0.25, 1]);
  });
});

describe("selectAbsorptionAnatomy — the window is self-scaling", () => {
  it("normalisation is over the supplied window only", () => {
    const vm = selectAbsorptionAnatomy(series([{ volume: 10 }, { volume: 20 }, { volume: 40 }]));
    expect(vm.bars.map(b => b.effortNorm)).toEqual([0.25, 0.5, 1]);
  });

  it("windowBars trims to the TRAILING bars — the read is about now", () => {
    const vm = selectAbsorptionAnatomy(
      series([{ volume: 1 }, { volume: 2 }, { volume: 3 }, { volume: 4 }]),
      { windowBars: 2 },
    );
    expect(vm.windowBars).toBe(2);
    expect(vm.bars.map(b => b.time)).toEqual([3, 4]);
  });

  it("displacement is |close − open| in price units", () => {
    const vm = selectAbsorptionAnatomy(
      series([
        { open: 100, close: 102, volume: 500 },
        { open: 100, close: 99, volume: 500 },
      ]),
    );
    expect(vm.bars.map(b => b.displacement)).toEqual([2, 1]);
    expect(vm.bars.map(b => b.displacementNorm)).toEqual([1, 0.5]);
  });
});

describe("selectAbsorptionAnatomy — a zone needs BOTH conditions and TIME EXTENSION", () => {
  /** Tall effort, flat price. */
  const absorbing = { volume: 1_000, open: 100, close: 100, high: 100.4, low: 99.6 };
  /** Tall effort, price actually went somewhere. */
  const efficient = { volume: 1_000, open: 100, close: 104, high: 104, low: 100 };
  /** Flat price, but nobody was trying. */
  const quiet = { volume: 10, open: 100, close: 100, high: 100.1, low: 99.9 };

  it("high effort + weak displacement over 2+ bars seals a zone", () => {
    const vm = selectAbsorptionAnatomy(series([efficient, absorbing, absorbing, efficient]));
    expect(vm.zones).toHaveLength(1);
    expect(vm.zones[0]!.barCount).toBe(2);
    expect(vm.zones[0]!.startTime).toBe(2);
    expect(vm.zones[0]!.endTime).toBe(3);
  });

  it("TIME EXTENSION — a LONE absorbing bar is a sweep, not a zone", () => {
    const vm = selectAbsorptionAnatomy(series([efficient, absorbing, efficient]));
    expect(vm.bars[1]!.absorbing).toBe(true);
    expect(vm.zones).toEqual([]);
  });

  it("HIGH EFFORT is required — flat price on tiny volume is not absorption", () => {
    const vm = selectAbsorptionAnatomy(series([efficient, quiet, quiet, efficient]));
    expect(vm.bars.filter(b => b.absorbing)).toEqual([]);
    expect(vm.zones).toEqual([]);
  });

  it("WEAK DISPLACEMENT is required — heavy volume that moved price is EFFICIENT, not absorbed", () => {
    const vm = selectAbsorptionAnatomy(series([efficient, efficient, efficient]));
    expect(vm.zones).toEqual([]);
  });

  it("the band is pinned to the run's ACTUAL price extent, not to a single close", () => {
    const vm = selectAbsorptionAnatomy(
      series([
        efficient,
        { ...absorbing, high: 100.4, low: 99.6 },
        { ...absorbing, high: 100.9, low: 99.1 },
        efficient,
      ]),
    );
    expect(vm.zones[0]!.priceHi).toBe(100.9);
    expect(vm.zones[0]!.priceLo).toBe(99.1);
  });

  it("two separated runs seal as two zones, not one merged smear", () => {
    const vm = selectAbsorptionAnatomy(
      series([absorbing, absorbing, efficient, absorbing, absorbing]),
    );
    expect(vm.zones).toHaveLength(2);
    expect(vm.zones.map(z => z.barCount)).toEqual([2, 2]);
  });

  it("a run that is still open at the last bar is sealed, not discarded", () => {
    const vm = selectAbsorptionAnatomy(series([efficient, absorbing, absorbing]));
    expect(vm.zones).toHaveLength(1);
    expect(vm.zones[0]!.endTime).toBe(3);
  });
});

describe("selectAbsorptionAnatomy — the efficiency ratio is never fabricated", () => {
  it("zero displacement across a run is UNBOUNDED, and the ratio is null, not a big number", () => {
    const flat = { volume: 1_000, open: 100, close: 100, high: 100, low: 100 };
    const moved = { volume: 1_000, open: 100, close: 105, high: 105, low: 100 };
    const vm = selectAbsorptionAnatomy(series([moved, flat, flat]));
    const zone = vm.zones[0]!;
    expect(zone.unbounded).toBe(true);
    expect(zone.efficiencyRatio).toBeNull();
    expect(Number.isFinite(zone.efficiencyRatio as number)).toBe(false);
  });

  it("a finite ratio is normalised effort over normalised displacement", () => {
    const vm = selectAbsorptionAnatomy(
      series([
        { volume: 1_000, open: 100, close: 110, high: 110, low: 100 },
        { volume: 1_000, open: 100, close: 101, high: 101, low: 100 },
        { volume: 1_000, open: 100, close: 101, high: 101, low: 100 },
      ]),
    );
    const zone = vm.zones[0]!;
    // Both run bars: effortNorm 1, displacementNorm 1/10.
    expect(zone.unbounded).toBe(false);
    expect(zone.efficiencyRatio).toBeCloseTo(10, 10);
  });

  it("strengthOfRatio follows the mockup's legend exactly", () => {
    expect(strengthOfRatio(7.42, false)).toBe("STRONG");
    expect(strengthOfRatio(5.0001, false)).toBe("STRONG");
    expect(strengthOfRatio(5, false)).toBe("MODERATE");
    expect(strengthOfRatio(2, false)).toBe("MODERATE");
    expect(strengthOfRatio(1.99, false)).toBe("WEAK");
    expect(strengthOfRatio(null, false)).toBe("WEAK");
  });

  it("unbounded reads STRONG — infinite effort per unit of result is the strongest case", () => {
    expect(strengthOfRatio(null, true)).toBe("STRONG");
  });
});

describe("selectAbsorptionAnatomy — thresholds are tunable but honest by default", () => {
  it("raising the effort threshold can disqualify a previously absorbing bar", () => {
    const specs = [
      { volume: 1_000, open: 100, close: 104, high: 104, low: 100 },
      { volume: 700, open: 100, close: 100, high: 100.2, low: 99.8 },
      { volume: 700, open: 100, close: 100, high: 100.2, low: 99.8 },
    ];
    expect(selectAbsorptionAnatomy(series(specs)).zones).toHaveLength(1);
    expect(selectAbsorptionAnatomy(series(specs), { effortThreshold: 0.95 }).zones).toEqual([]);
  });

  it("minZoneBars is the TIME EXTENSION gate and can be tightened", () => {
    const absorbing = { volume: 1_000, open: 100, close: 100, high: 100.4, low: 99.6 };
    const efficient = { volume: 1_000, open: 100, close: 104, high: 104, low: 100 };
    const specs = [efficient, absorbing, absorbing, efficient];
    expect(selectAbsorptionAnatomy(series(specs), { minZoneBars: 2 }).zones).toHaveLength(1);
    expect(selectAbsorptionAnatomy(series(specs), { minZoneBars: 3 }).zones).toEqual([]);
  });
});

/**
 * These were written from a LIVE OBSERVATION, not from imagination.
 *
 * On a thin crypto venue a 15-minute BTC window carried per-bar volumes of
 * 0.0003–0.137 BTC — one print held roughly 85% of the whole window. Every
 * other bar's `effortNorm` therefore sat near zero, no run could clear the
 * effort gate, and the panel printed "NO ZONE QUALIFIED — no run of bars held
 * high effort against weak displacement long enough". That is a sentence about
 * the market. The truth was a sentence about the feed. The same window on a
 * deep venue read a healthy 5.6× max-to-median.
 *
 * The fix is not to suppress the reading — it is to publish the incapacity as a
 * field so no surface can present arithmetic as observation.
 */
describe("selectAbsorptionAnatomy — a window that CANNOT answer says so", () => {
  it("one dominant print makes zone qualification impossible, and that is published", () => {
    // 1 monster bar, 11 dust bars — exactly the live BTC shape.
    const specs = [
      { volume: 1_000_000, open: 100, close: 100, high: 100.4, low: 99.6 },
      ...Array.from({ length: 11 }, () => ({
        volume: 3, open: 100, close: 100, high: 100.4, low: 99.6,
      })),
    ];
    const vm = selectAbsorptionAnatomy(series(specs));

    expect(vm.measured).toBe(true);
    expect(vm.zones).toEqual([]);           // the same empty result as before…
    expect(vm.zoneQualificationPossible).toBe(false); // …but now it is EXPLAINED
    expect(vm.effortQualifyingBars).toBe(1);
    expect(vm.effortConcentration).toBeGreaterThan(0.9);
    expect(vm.effortSpreadNote).toContain("no run could have qualified");
  });

  it("the note names the arithmetic, not a market opinion", () => {
    const vm = selectAbsorptionAnatomy(
      series([
        { volume: 1_000_000, open: 100, close: 100, high: 100.4, low: 99.6 },
        ...Array.from({ length: 5 }, () => ({
          volume: 1, open: 100, close: 100, high: 100.4, low: 99.6,
        })),
      ]),
    );
    // BEHAVIOUR, not wording: it must not be sayable as an absorption claim.
    expect(vm.effortSpreadNote).not.toMatch(/absorb/i);
    expect(vm.effortSpreadNote).toContain("high-effort line");
  });

  it("a well-spread window stays capable, and carries no incapacity note", () => {
    const absorbing = { volume: 1_000, open: 100, close: 100, high: 100.4, low: 99.6 };
    const vm = selectAbsorptionAnatomy(
      series([absorbing, absorbing, absorbing, { volume: 900, open: 100, close: 104, high: 104, low: 100 }]),
    );
    expect(vm.zoneQualificationPossible).toBe(true);
    expect(vm.effortSpreadNote).toBeNull();
    expect(vm.effortQualifyingBars).toBeGreaterThanOrEqual(2);
  });

  it("an unmeasured window publishes the fields as absent, never as zero findings", () => {
    const vm = selectAbsorptionAnatomy([]);
    expect(vm.effortConcentration).toBeNull();
    expect(vm.zoneQualificationPossible).toBe(false);
    // `measured: false` is already the louder disclosure; the note must not
    // double up and start nagging with a second sentence about the same gap.
    expect(vm.effortSpreadNote).toBeNull();
  });

  it("concentration is a SHARE of the window, so it never exceeds 1", () => {
    const vm = selectAbsorptionAnatomy(
      series(Array.from({ length: 8 }, (_, i) => ({ volume: 100 * (i + 1) }))),
    );
    expect(vm.effortConcentration).toBeGreaterThan(0);
    expect(vm.effortConcentration).toBeLessThanOrEqual(1);
  });
});
