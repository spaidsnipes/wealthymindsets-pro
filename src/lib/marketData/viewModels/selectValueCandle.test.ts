/**
 * The Value Candle's whole claim is that its numbers are MEASURED. This suite
 * exists to make that claim falsifiable.
 *
 * Three failures are forbidden here, and each one is a real habit of real
 * volume-profile surfaces:
 *
 *   1. Reporting the target back as a finding. A "68% value area" that always
 *      says 68% has told the trader nothing. `concentration` must move when
 *      the distribution moves.
 *   2. Announcing a migration that is really just noise. A gap always exists;
 *      it is only a finding when it is large relative to the distribution's
 *      own spread.
 *   3. Printing 0 for absent. A window with no volume has no Center of
 *      Gravity, and zero is a different sentence.
 */

import { describe, it, expect } from "vitest";
import {
  selectValueCandle,
  VALUE_CANDLE_VERSION,
  MIGRATION_SIGMA_THRESHOLD,
  type ValueCandleTick,
} from "./selectValueCandle";

const t = (price: number, size: number): ValueCandleTick => ({ price, size });

describe("selectValueCandle — absent is not zero", () => {
  it("has no Center of Gravity when nothing traded", () => {
    for (const input of [null, undefined, [] as ValueCandleTick[]]) {
      const vm = selectValueCandle(input);
      expect(vm.measured).toBe(false);
      expect(vm.centerOfGravity).toBeNull();
      expect(vm.concentration).toBeNull();
      expect(vm.migration).toBe("UNMEASURED");
      expect(vm.bins).toHaveLength(0);
      expect(vm.migrationDetail.length).toBeGreaterThan(10);
    }
  });

  it("treats a sizeless print as no evidence, not as zero-weight value", () => {
    // A price with no size cannot weight anything. Counting it as size 0 would
    // be harmless; counting it as size 1 would silently equal-weight the tape.
    const vm = selectValueCandle([t(100, 0), { price: 101 }, { size: 5 }]);
    expect(vm.measured).toBe(false);
    expect(vm.volume).toBe(0);
    expect(vm.prints).toBe(0);
  });

  it("ignores impossible prints without discarding the real ones beside them", () => {
    const vm = selectValueCandle([t(-1, 10), t(100, 10), t(0, 99), t(100, 10)]);
    expect(vm.measured).toBe(true);
    expect(vm.prints).toBe(2);
    expect(vm.volume).toBe(20);
    expect(vm.centerOfGravity).toBe(100);
  });
});

describe("selectValueCandle — the Center of Gravity is the stated formula", () => {
  it("weights by volume, not by print count", () => {
    // One 1000-lot at 100 against nine 1-lots at 110. A mean of the PRICES is
    // 109; the volume-weighted mean is 100.09. The difference is the entire
    // point of the measurement.
    const ticks = [t(100, 1000), ...Array.from({ length: 9 }, () => t(110, 1))];
    const vm = selectValueCandle(ticks);
    expect(vm.centerOfGravity).toBeCloseTo((100 * 1000 + 110 * 9) / 1009, 2);
    expect(vm.centerOfGravity!).toBeLessThan(101);
  });

  it("sits at the single price when every print landed there", () => {
    const vm = selectValueCandle([t(250, 5), t(250, 7), t(250, 1)]);
    expect(vm.centerOfGravity).toBe(250);
    expect(vm.spread).toBe(0);
    expect(vm.concentration).toBe(100);
    expect(vm.migrationDetail).toContain("one price");
  });

  it("is order-independent — the same prints in any order give one answer", () => {
    const ticks = [t(100, 3), t(104, 9), t(102, 5), t(101, 1)];
    const forward = selectValueCandle(ticks);
    const backward = selectValueCandle([...ticks].reverse());
    expect(backward.centerOfGravity).toBe(forward.centerOfGravity);
    expect(backward.spread).toBe(forward.spread);
    expect(backward.concentration).toBe(forward.concentration);
  });

  it("is pure — same input, same output", () => {
    const ticks = [t(100, 3), t(104, 9), t(102, 5)];
    expect(selectValueCandle(ticks)).toEqual(selectValueCandle(ticks));
  });
});

describe("selectValueCandle — concentration is measured, never echoed", () => {
  it("reports a HIGHER concentration for a tight auction than a smeared one", () => {
    // This is the test that would fail on any implementation that draws the
    // band to contain a fixed percentage: both readings would be the same
    // number, and that number would be the constant we asked for.
    const tight = selectValueCandle([
      t(100, 50), t(100.01, 60), t(100.02, 55), t(99.99, 40), t(100.03, 10),
    ]);
    const smeared = selectValueCandle([
      t(90, 50), t(95, 5), t(100, 5), t(105, 5), t(110, 50),
    ]);
    expect(tight.concentration!).toBeGreaterThan(smeared.concentration!);
  });

  it("cannot let a hollow two-sided auction LOOK tight", () => {
    // WRITTEN BECAUSE THE FIRST VERSION OF THIS TEST FAILED, and the failure
    // was right. Two heavy shelves and a hollow middle put both shelves
    // exactly one sigma from the CoG, so 100% of the volume really is inside
    // the band. `concentration` alone therefore CANNOT separate a barbell from
    // a tight auction — not because it lies, but because the sentence it says
    // is true of both.
    //
    // The number that separates them is how WIDE the band had to be. A
    // barbell's band covers the entire candle; a single-mode auction's covers
    // a fraction of it. That is why `bandCoverage` exists and why a surface
    // must render it next to the percentage rather than the percentage alone.
    const barbell = selectValueCandle([t(90, 100), t(110, 100)]);
    const single = selectValueCandle([t(99, 100), t(100, 200), t(101, 100)]);

    expect(barbell.concentration).toBe(100);
    expect(barbell.bandCoverage).toBe(1);
    expect(single.bandCoverage!).toBeLessThan(barbell.bandCoverage!);
  });

  it("keeps bandCoverage inside 0..1 and tight where the volume is tight", () => {
    const tight = selectValueCandle([
      ...Array.from({ length: 30 }, () => t(100, 100)),
      t(90, 1), t(110, 1),
    ]);
    expect(tight.bandCoverage!).toBeGreaterThan(0);
    expect(tight.bandCoverage!).toBeLessThan(0.3);
  });

  it("keeps concentration inside 0..100 on every shape it is given", () => {
    const shapes: ValueCandleTick[][] = [
      [t(1, 1)],
      [t(1, 1), t(1000, 1)],
      [t(0.5, 3), t(0.5001, 900), t(0.50005, 12)],
      Array.from({ length: 200 }, (_, i) => t(100 + i * 0.01, i + 1)),
    ];
    for (const s of shapes) {
      const vm = selectValueCandle(s);
      expect(vm.concentration!).toBeGreaterThanOrEqual(0);
      expect(vm.concentration!).toBeLessThanOrEqual(100);
    }
  });
});

describe("selectValueCandle — migration is a finding, not an arithmetic accident", () => {
  it("stays ALIGNED when the last print is inside the value band", () => {
    const vm = selectValueCandle([t(99, 100), t(101, 100), t(100, 100)]);
    expect(vm.migration).toBe("ALIGNED");
  });

  it("calls LAGGED only when price has left value by more than half a sigma", () => {
    // Heavy volume at 100, then one print far above it. Value has not followed.
    const vm = selectValueCandle([
      ...Array.from({ length: 20 }, () => t(100, 100)),
      t(108, 1),
    ]);
    expect(vm.migration).toBe("LAGGED");
    expect(vm.migrationDetail).toContain("above");
    expect(vm.last).toBe(108);
    expect(vm.centerOfGravity!).toBeLessThan(101);
  });

  it("names the direction when price has fallen away from value", () => {
    const vm = selectValueCandle([
      ...Array.from({ length: 20 }, () => t(100, 100)),
      t(92, 1),
    ]);
    expect(vm.migration).toBe("LAGGED");
    expect(vm.migrationDetail).toContain("below");
  });

  it("requires a BIGGER move to claim migration in a wider auction", () => {
    // The same 3-point gap is a finding in a quiet market and noise in a loud
    // one. Measuring the gap in ticks instead of sigmas would report both.
    const quiet = selectValueCandle([
      ...Array.from({ length: 20 }, () => t(100, 100)), t(103, 1),
    ]);
    const loud = selectValueCandle([
      ...Array.from({ length: 20 }, (_, i) => t(80 + i * 2, 100)), t(103, 1),
    ]);
    expect(quiet.migration).toBe("LAGGED");
    expect(loud.migration).toBe("ALIGNED");
    expect(MIGRATION_SIGMA_THRESHOLD).toBeGreaterThan(0);
  });
});

describe("selectValueCandle — the rendered distribution matches the numbers", () => {
  it("accounts for every unit of observed volume across the bins", () => {
    const ticks = [t(100, 5), t(102, 9), t(104, 1), t(101, 30)];
    const vm = selectValueCandle(ticks);
    const binned = vm.bins.reduce((s, b) => s + b.volume, 0);
    expect(binned).toBe(vm.volume);
    expect(vm.volume).toBe(45);
  });

  it("gives shares that sum to one and never emits an empty bin", () => {
    const vm = selectValueCandle([t(100, 5), t(110, 5)], 24);
    expect(vm.bins.every((b) => b.volume > 0)).toBe(true);
    expect(vm.bins.reduce((s, b) => s + b.share, 0)).toBeCloseTo(1, 10);
  });

  it("marks value bins by the band it published, not by a second rule", () => {
    const vm = selectValueCandle([t(99, 100), t(100, 300), t(101, 100), t(120, 1)]);
    for (const b of vm.bins) {
      const inside = b.price >= vm.valueLow! && b.price <= vm.valueHigh!;
      expect(b.inValue, `bin at ${b.price} disagrees with the published band`).toBe(inside);
    }
  });

  it("keeps the high and low inside the outermost bin edges", () => {
    const vm = selectValueCandle([t(100, 5), t(110, 5), t(105, 5)]);
    expect(vm.low).toBe(100);
    expect(vm.high).toBe(110);
    expect(vm.bins[0].loPrice).toBeLessThanOrEqual(vm.low!);
    expect(vm.bins[vm.bins.length - 1].hiPrice).toBeGreaterThanOrEqual(vm.high!);
  });
});

describe("selectValueCandle — shape", () => {
  it("is versioned so a surface can refuse a shape it does not understand", () => {
    expect(selectValueCandle([t(1, 1)]).version).toBe(VALUE_CANDLE_VERSION);
    expect(selectValueCandle(null).version).toBe(VALUE_CANDLE_VERSION);
  });

  it("never ships an empty migration line, measured or not", () => {
    const cases: Array<ValueCandleTick[] | null> = [
      null, [], [t(1, 1)], [t(1, 1), t(2, 1)],
      [...Array.from({ length: 9 }, () => t(100, 10)), t(140, 1)],
    ];
    for (const c of cases) {
      expect(selectValueCandle(c).migrationDetail.length).toBeGreaterThan(0);
    }
  });

  it("keeps sub-dollar instruments readable instead of rounding them to zero", () => {
    // An FX-style 1.08940 quote and a sub-dollar token both lose their whole
    // signal at 2 decimals. The precision follows the price.
    const fx = selectValueCandle([t(1.0894, 100), t(1.0896, 100)]);
    expect(fx.centerOfGravity).toBe(1.0895);
    const micro = selectValueCandle([t(0.000123, 100), t(0.000125, 100)]);
    expect(micro.centerOfGravity).not.toBe(0);
  });
});

describe("selectValueCandle — σ is a width, and a width has its own scale", () => {
  /**
   * FOUND BY A SCALE-INVARIANCE TEST IN A DIFFERENT MODULE.
   * `selectStackedImbalance` measured the same tape shape at $100/1-cent and
   * at $2,000/25-cent and got two different answers. That can only happen if
   * something here is denominated in dollars, and it was: σ was rounded with
   * `decimalsFor(price)`, which picks decimals from how big the PRICE is.
   *
   * That is correct for a price and wrong for a distance between two of them.
   * A $400 name in a three-cent band has σ ≈ 0.004, and two decimals makes
   * that 0.00 — while σ is the denominator FOUR other modules quote their
   * findings in. A zero denominator does not make them cautious.
   */
  it("does not round a tight band's spread away on an expensive instrument", () => {
    const vm = selectValueCandle([
      t(412.01, 100),
      t(412.02, 100),
      t(412.03, 100),
      t(412.02, 100),
    ]);
    expect(vm.spread!).toBeGreaterThan(0);
    expect(vm.spread!).toBeLessThan(0.02);
    // The band must be usable as a denominator, which is the only reason it
    // ships at all.
    expect(Number.isFinite(0.05 / vm.spread!)).toBe(true);
  });

  it("measures the same shape identically at two instrument scales", () => {
    // Same distribution, multiplied by 20 in price and in width. σ must scale
    // exactly with it, so the ratio of the two is exactly 20.
    const cheap = selectValueCandle([t(100, 10), t(100.02, 30), t(100.04, 10)]);
    const dear = selectValueCandle([t(2000, 10), t(2000.4, 30), t(2000.8, 10)]);
    expect(dear.spread! / cheap.spread!).toBeCloseTo(20, 6);
  });

  it("does not tell a tight tape that price is within zero of value", () => {
    const vm = selectValueCandle([t(412.01, 100), t(412.02, 100), t(412.03, 100)]);
    expect(vm.migrationDetail).not.toContain("within 0 of");
  });

  it("still reports an exact zero spread when every print landed at one price", () => {
    // Zero here is a fact, not a rounding artefact, and must survive the fix.
    expect(selectValueCandle([t(412.01, 5), t(412.01, 9)]).spread).toBe(0);
  });
});
