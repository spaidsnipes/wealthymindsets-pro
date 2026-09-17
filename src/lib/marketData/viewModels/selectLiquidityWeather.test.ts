/**
 * "Liquidity is thinning" is a sentence that makes a trader size down. It is
 * also trivially easy to produce from nothing: any tape has halves, and one of
 * them is always cheaper than the other. This suite exists so that sentence
 * has to be earned.
 *
 * Five cheap routes to it, each forbidden below:
 *
 *   · from ticks or cents, so the same cost is "thin" on one instrument and
 *     "thick" on the next
 *   · from a division by zero travel, calling a stalled segment infinitely deep
 *   · from noise, by picking whichever half of a wild window suits the story
 *   · from too few prints to have halves at all
 *   · by borrowing the absorption panel's aggressor evidence for a question
 *     that never reads `side`
 */

import { describe, it, expect } from "vitest";
import {
  selectLiquidityWeather,
  LIQUIDITY_WEATHER_VERSION,
  LIQUIDITY_MIN_PRINTS,
  AIRLESS_RATIO,
  HEAVY_RATIO,
  TREND_RATIO,
  ERRATIC_DISPERSION,
  formatRatio,
} from "./selectLiquidityWeather";
import type { AggressorTick } from "../selectAggressorFlow";

const tick = (
  price: number,
  size: number,
  side: "buy" | "sell" = "buy",
  method: string = "PROVIDER",
): AggressorTick => ({
  price,
  size,
  side,
  trade: true,
  marketEvent: { aggressorMethod: method as never },
});

/**
 * A leg that travels `span` in price over `prints` prints at a fixed size.
 * Size-per-print IS the variable under test: the same travel bought with more
 * size is a dearer market, which is the whole finding.
 */
function leg(
  from: number,
  span: number,
  prints: number,
  size: number,
  method = "PROVIDER",
): AggressorTick[] {
  const out: AggressorTick[] = [];
  for (let i = 0; i < prints; i++) {
    const p = from + (span * (i + 1)) / prints;
    out.push(tick(Number(p.toFixed(4)), size, i % 2 === 0 ? "buy" : "sell", method));
  }
  return out;
}

/** A leg that oscillates within `span` so range is real but net travel is not. */
function chop(centre: number, span: number, prints: number, size: number): AggressorTick[] {
  const out: AggressorTick[] = [];
  for (let i = 0; i < prints; i++) {
    const p = centre + (i % 2 === 0 ? span / 2 : -span / 2);
    out.push(tick(Number(p.toFixed(4)), size, i % 2 === 0 ? "buy" : "sell"));
  }
  return out;
}

describe("selectLiquidityWeather — it refuses before it reports", () => {
  it("is UNMEASURED with no tape at all", () => {
    for (const input of [null, undefined, [] as AggressorTick[]]) {
      const vm = selectLiquidityWeather(input);
      expect(vm.stage).toBe("UNMEASURED");
      expect(vm.medianCost).toBeNull();
      expect(vm.trendRatio).toBeNull();
      expect(vm.detail.length).toBeGreaterThan(10);
    }
  });

  it("is UNMEASURED below the print floor, and says how many it had", () => {
    const vm = selectLiquidityWeather(leg(100, 1, 8, 10));
    expect(vm.stage).toBe("UNMEASURED");
    expect(vm.detail).toContain("8");
    expect(LIQUIDITY_MIN_PRINTS).toBeGreaterThan(8);
  });

  it("ignores quotes, and counts only executions", () => {
    // 40 quotes at a walking price would look like a perfectly measurable
    // window. None of them bought anything.
    const quotes: AggressorTick[] = leg(100, 1, 40, 10).map((t) => ({ ...t, trade: false }));
    expect(selectLiquidityWeather(quotes).stage).toBe("UNMEASURED");
  });

  it("ignores zero-size prints rather than letting them dilute a cost", () => {
    // Cost is denominated in size. A zero-size print contributes no size but
    // would contribute a price, quietly widening range for free.
    const padded = [...leg(100, 1, 40, 10), ...leg(100, 5, 20, 0)];
    const clean = selectLiquidityWeather(leg(100, 1, 40, 10));
    const vm = selectLiquidityWeather(padded);
    expect(vm.spread).toBe(clean.spread);
  });

  it("is UNMEASURED — not infinitely deep — when nothing ever moved", () => {
    const flat = Array.from({ length: 60 }, () => tick(100, 50));
    const vm = selectLiquidityWeather(flat);
    expect(vm.stage).toBe("UNMEASURED");
    expect(vm.medianCost).toBeNull();
    expect(vm.detail).toContain("one price");
  });
});

describe("selectLiquidityWeather — the reading is a cost, not a guess", () => {
  it("calls THINNING when the same travel starts costing less size", () => {
    const vm = selectLiquidityWeather([
      ...leg(100, 1, 60, 400), // expensive half
      ...leg(101, 1, 60, 40), // same distance, a tenth of the size
    ]);
    expect(vm.stage).toBe("THINNING");
    expect(vm.trendRatio!).toBeLessThan(1 / TREND_RATIO);
  });

  it("calls THICKENING when the same travel starts costing more size", () => {
    const vm = selectLiquidityWeather([
      ...leg(100, 1, 60, 40),
      ...leg(101, 1, 60, 400),
    ]);
    expect(vm.stage).toBe("THICKENING");
    expect(vm.trendRatio!).toBeGreaterThan(TREND_RATIO);
  });

  it("calls STEADY when the cost simply holds", () => {
    const vm = selectLiquidityWeather(leg(100, 2, 120, 100));
    expect(vm.stage).toBe("STEADY");
    expect(vm.trendRatio!).toBeGreaterThan(1 / TREND_RATIO);
    expect(vm.trendRatio!).toBeLessThan(TREND_RATIO);
  });

  it("calls HEAVY when the segment that just closed did not move at all", () => {
    // The strongest form: size went in, price did not respond. This must not
    // fall through to a trend verdict computed from the segments before it.
    const vm = selectLiquidityWeather([
      ...leg(100, 2, 110, 50),
      ...Array.from({ length: 10 }, () => tick(102, 800)),
    ]);
    expect(vm.stage).toBe("HEAVY");
    expect(vm.segments[vm.segments.length - 1].stalled).toBe(true);
    expect(vm.segments[vm.segments.length - 1].cost).toBeNull();
    expect(vm.detail).toContain("without moving price");
  });

  it("calls AIRLESS when the last segment travels on a fraction of the usual size", () => {
    const vm = selectLiquidityWeather([
      ...leg(100, 1, 110, 500),
      ...leg(101, 1, 10, 5), // same distance on 1% of the size
    ]);
    expect(vm.stage).toBe("AIRLESS");
    expect(vm.latestVsPeers!).toBeLessThanOrEqual(AIRLESS_RATIO);
  });

  it("does NOT call an orderly step-down a vacuum", () => {
    // WRITTEN BECAUSE THE FIRST DRAFT DID EXACTLY THAT, and it was the same
    // fixture as the THINNING test above. When a window steps cleanly from dear
    // to cheap, the last segment is the cheapest in the window — measured
    // against the WHOLE window's median it looks like an outlier, and the
    // module shouted AIRLESS at what is simply a trend.
    //
    // An outlier is only an outlier against its NEIGHBOURS. "There is nothing
    // in the way right now" and "it has been getting easier all session" are
    // different claims, and the louder one must not be produced by the quieter
    // one's evidence.
    const vm = selectLiquidityWeather([...leg(100, 1, 60, 400), ...leg(101, 1, 60, 40)]);
    expect(vm.latestVsMedian!).toBeLessThan(AIRLESS_RATIO);
    expect(vm.latestVsPeers!).toBeGreaterThan(AIRLESS_RATIO);
    expect(vm.stage).toBe("THINNING");
  });

  it("lets a present-state reading outrank a trend reading", () => {
    // Thickening across the window, then a vacuum in the final segment. An
    // observation about the segment that just closed must beat an inference
    // about a direction.
    const vm = selectLiquidityWeather([
      ...leg(100, 1, 55, 40),
      ...leg(101, 1, 55, 600),
      ...leg(102, 1, 10, 3),
    ]);
    expect(vm.trendRatio!).toBeGreaterThan(1);
    expect(vm.stage).toBe("AIRLESS");
  });

  it("does not let a vacuum erase itself by widening the scatter it is judged against", () => {
    // WRITTEN BECAUSE THE SECOND DRAFT DID EXACTLY THAT. The fixture above is
    // a thickening window that ends in a vacuum. Because the vacuum was
    // included when measuring its own half's scatter, it inflated that scatter
    // past the ERRATIC threshold — and ERRATIC then suppressed the very reading
    // the segment was evidence FOR.
    //
    // The failure mode is self-refuting and gets worse the louder the finding:
    // the emptier the last segment, the more effectively it silences itself.
    // The fix is that the segment under judgement is not part of the court.
    const vm = selectLiquidityWeather([
      ...leg(100, 1, 55, 40),
      ...leg(101, 1, 55, 600),
      ...leg(102, 1, 10, 3),
    ]);
    expect(vm.stage).toBe("AIRLESS");
    expect(vm.dispersion!).toBeLessThan(ERRATIC_DISPERSION);

    // And the deeper the vacuum, the more certain the verdict — never less.
    const deeper = selectLiquidityWeather([
      ...leg(100, 1, 55, 40),
      ...leg(101, 1, 55, 600),
      ...leg(102, 1, 10, 1),
    ]);
    expect(deeper.stage).toBe("AIRLESS");
    expect(deeper.latestVsPeers!).toBeLessThan(vm.latestVsPeers!);
  });
});

describe("selectLiquidityWeather — it will not call noise a trend", () => {
  it("says ERRATIC rather than picking the half that suits the story", () => {
    // Alternating cheap and dear segments. There IS a half-over-half ratio
    // here; it just means nothing, and a module that reports it is selling a
    // direction it does not have.
    const ticks: AggressorTick[] = [];
    for (let s = 0; s < 12; s++) {
      ticks.push(...leg(100 + s * 0.5, 0.5, 12, s % 2 === 0 ? 20 : 2000));
    }
    const vm = selectLiquidityWeather(ticks);
    expect(vm.stage).toBe("ERRATIC");
    expect(vm.dispersion!).toBeGreaterThan(0);
    expect(vm.detail).toContain("no trend");
  });

  it("measures scatter WITHIN each half, so a clean trend is not reported as noise", () => {
    // A window that steps from dear to cheap has enormous whole-window scatter
    // and is perfectly orderly. If dispersion were measured about the window's
    // median, every trend this module exists to find would be suppressed as
    // ERRATIC.
    const stepped = selectLiquidityWeather([...leg(100, 1, 60, 400), ...leg(101, 1, 60, 40)]);
    expect(stepped.stage).toBe("THINNING");
    expect(stepped.dispersion!).toBeLessThan(ERRATIC_DISPERSION);
  });

  it("uses the median as the centre, so one runaway segment cannot define it", () => {
    const calm = leg(100, 2, 132, 100);
    const withSpike = [...leg(100, 1, 66, 100), ...chop(101, 0.001, 12, 90000), ...leg(101, 1, 54, 100)];
    expect(selectLiquidityWeather(calm).stage).toBe("STEADY");
    // The spike is real and must move the reading — but it must not make the
    // window's centre so large that every ordinary segment reads AIRLESS.
    const vm = selectLiquidityWeather(withSpike);
    expect(vm.stage).not.toBe("AIRLESS");
    expect(vm.medianCost!).toBeLessThan(90000);
  });
});

describe("selectLiquidityWeather — the move is measured in the window's own scale", () => {
  it("reads a penny instrument and a thousand-dollar one the same way", () => {
    // THE TEST THAT FAILS ON ANY IMPLEMENTATION USING TICKS, CENTS OR PERCENT.
    // Two tapes with identical geometry at different price levels must produce
    // an identical verdict and an identical trend ratio.
    const shape = (base: number, scale: number) => [
      ...leg(base, 1 * scale, 60, 400),
      ...leg(base + 1 * scale, 1 * scale, 60, 40),
    ];
    const penny = selectLiquidityWeather(shape(2, 0.01));
    const grand = selectLiquidityWeather(shape(2000, 10));
    expect(penny.stage).toBe(grand.stage);
    expect(penny.stage).toBe("THINNING");
    expect(penny.trendRatio).toBeCloseTo(grand.trendRatio!, 2);
  });

  it("publishes each segment's travel in spreads as well as in price", () => {
    const vm = selectLiquidityWeather(leg(100, 2, 120, 100));
    expect(vm.spread).not.toBeNull();
    for (const s of vm.segments) {
      if (s.stalled) continue;
      expect(s.rangeInSpread).not.toBeNull();
      expect(s.rangeInSpread!).toBeGreaterThan(0);
      expect(s.cost).not.toBeNull();
    }
  });

  it("does not round a real-scale cost away to zero", () => {
    // The absorption panel shipped a bug where six-decimal rounding annihilated
    // a real ratio. The same hazard lives here with the division inverted.
    const vm = selectLiquidityWeather(leg(100, 0.02, 400, 70));
    expect(vm.medianCost).not.toBeNull();
    expect(vm.medianCost).not.toBe(0);
    expect(vm.medianCost!).toBeGreaterThan(0);
  });
});

describe("selectLiquidityWeather — it does not borrow evidence it never used", () => {
  it("reports the same weather on a tick-rule tape as on a venue-stamped one", () => {
    // This module never reads `side`. Proving that with a fixture is stronger
    // than asserting it in a comment: if a future edit starts weighting by
    // aggressor, this test breaks.
    const stamped = [...leg(100, 1, 60, 400), ...leg(101, 1, 60, 40)];
    const guessed = [
      ...leg(100, 1, 60, 400, "TICK_RULE"),
      ...leg(101, 1, 60, 40, "TICK_RULE"),
    ];
    const a = selectLiquidityWeather(stamped);
    const b = selectLiquidityWeather(guessed);
    expect(b.stage).toBe(a.stage);
    expect(b.medianCost).toBe(a.medianCost);
    expect(b.trendRatio).toBe(a.trendRatio);
  });

  it("demands no aggressor disclosure, on every tape, including one with no sides", () => {
    const unsided: AggressorTick[] = Array.from({ length: 60 }, (_, i) => ({
      price: 100 + i * 0.01,
      size: 10,
      trade: true,
    }));
    for (const input of [unsided, leg(100, 1, 60, 400, "TICK_RULE"), leg(100, 1, 60, 400)]) {
      expect(selectLiquidityWeather(input).requiresDisclosure).toBe(false);
    }
  });

  it("still carries the provenance it observed, so a surface can show it as context", () => {
    expect(selectLiquidityWeather(leg(100, 1, 60, 400)).provenance).toBe("PROVIDER");
    expect(selectLiquidityWeather(leg(100, 1, 60, 400, "TICK_RULE")).provenance).toBe("INFERRED");
  });
});

describe("selectLiquidityWeather — shape", () => {
  it("is versioned and pure", () => {
    const ticks = leg(100, 2, 120, 100);
    expect(selectLiquidityWeather(ticks).version).toBe(LIQUIDITY_WEATHER_VERSION);
    expect(selectLiquidityWeather(ticks)).toEqual(selectLiquidityWeather(ticks));
  });

  it("never ships an empty detail, and every segment accounts for its own prints", () => {
    const cases: Array<AggressorTick[] | null> = [
      null,
      leg(100, 1, 5, 10),
      leg(100, 2, 120, 100),
      [...leg(100, 1, 60, 400), ...leg(101, 1, 60, 40)],
    ];
    for (const c of cases) {
      const vm = selectLiquidityWeather(c);
      expect(vm.detail.length).toBeGreaterThan(0);
      for (const s of vm.segments) {
        expect(s.prints).toBeGreaterThan(0);
        expect(s.volume).toBeGreaterThan(0);
        expect(s.high).toBeGreaterThanOrEqual(s.low);
      }
    }
  });

  it("honours a caller's segment count without ever making empty buckets", () => {
    for (const n of [2, 5, 12, 40]) {
      const vm = selectLiquidityWeather(leg(100, 2, 120, 100), n);
      expect(vm.segments.length).toBeGreaterThan(1);
      expect(vm.segments.length).toBeLessThanOrEqual(Math.max(2, n));
      expect(vm.segments.reduce((a, s) => a + s.prints, 0)).toBe(120);
    }
  });

  /**
   * WRITTEN BECAUSE A RENDERED PANEL SAID `0.00×`. A genuine vacuum measured
   * at roughly 0.002 was printed with two decimals, and "0.00×" does not read
   * as "very cheap" — it reads as "free", which is a claim this module never
   * made and cannot support. The number had a scale, and a fixed-decimal
   * formatter threw the scale away.
   *
   * The same class of bug shipped once before, on the absorption panel's
   * efficiency ratio. That it recurred in a different module by a different
   * route is the reason the formatter is now shared and the reason this test
   * asserts on the FORMATTED STRING rather than on the underlying number: the
   * number was always right. It was the rendering that lied.
   */
  it("never renders a real, non-zero ratio as zero", () => {
    const vm = selectLiquidityWeather([
      ...leg(100, 1, 55, 40),
      ...leg(101, 1, 55, 600),
      ...leg(102, 1, 10, 3),
    ]);
    expect(vm.latestVsPeers!).toBeGreaterThan(0);
    expect(vm.latestVsPeers!).toBeLessThan(0.01);
    expect(formatRatio(vm.latestVsPeers)).not.toBe("0.00");
    expect(formatRatio(vm.latestVsPeers)).not.toBe("0");
    expect(Number(formatRatio(vm.latestVsPeers))).toBeGreaterThan(0);
    // The prose is the same claim as the tile, so it must not lie either.
    expect(vm.detail).not.toContain("0.00×");
  });

  it("formats a ratio at whatever scale it actually has", () => {
    expect(formatRatio(null)).toBe("—");
    expect(formatRatio(Number.NaN)).toBe("—");
    expect(formatRatio(0)).toBe("0"); // an exact zero is allowed to say zero
    expect(formatRatio(1)).toBe("1.00");
    expect(formatRatio(2.5)).toBe("2.50");
    expect(formatRatio(0.0021)).toBe("0.0021");
    expect(formatRatio(0.000004)).toBe("0.000004");
    expect(formatRatio(1240)).toBe("1,240");
  });

  it("is a statement about SEQUENCE — a reversed tape may read the other way", () => {
    const thinning = [...leg(100, 1, 60, 400), ...leg(101, 1, 60, 40)];
    const a = selectLiquidityWeather(thinning);
    const b = selectLiquidityWeather([...thinning].reverse());
    expect(a.stage).toBe("THINNING");
    expect(b.stage).not.toBe("THINNING");
  });
});
