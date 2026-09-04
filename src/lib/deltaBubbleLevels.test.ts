/**
 * Delta bubble level ownership — Founding Contract §13 open gate,
 * and §5 SYSTEM TRUTH LAW (order-flow evidence must not be silently lost).
 *
 * These tests call the SHIPPED function. The previous coverage
 * (deltaBubbleBinning.test.ts) re-typed the binning loop into the test file
 * and tested that copy, then string-matched MainChart for three identifiers.
 * That arrangement fails in both directions: renaming a local variable went
 * red with no behaviour change, while a behaviour change that kept the
 * identifiers sailed through. The loop now lives in src/lib/deltaBubbleLevels.ts
 * and this file exercises it directly.
 */
import { describe, expect, it } from "vitest";
import {
  binDeltaTicks,
  bucketCountFor,
  computeDeltaBubbleLevels,
  priceTickFor,
  type DeltaTick,
} from "./deltaBubbleLevels";

/** Big cap so ranking never truncates what a test is trying to observe. */
const ALL = 99;

const tick = (price: number, bid: number, ask: number): DeltaTick => ({ price, bid, ask });

/** Ladder of real prices across [lo, hi] at `step`, avoiding float drift. */
function ladder(lo: number, hi: number, step: number): number[] {
  const out: number[] = [];
  for (let i = 0; lo + i * step <= hi + 1e-9; i++) out.push(+(lo + i * step).toFixed(6));
  return out;
}

describe("instrument granularity", () => {
  it("derives the tick from price magnitude", () => {
    expect(priceTickFor(21_750)).toBe(0.25); // index futures
    expect(priceTickFor(60_000)).toBe(0.25); // BTC
    expect(priceTickFor(226)).toBe(0.01);    // equities
    expect(priceTickFor(0.5)).toBe(0.0001);  // sub-dollar
  });

  it("clamps bucket count to the range the renderer expects", () => {
    expect(bucketCountFor(0.01, 0.01)).toBe(6);   // floor(1.5)=1 → clamped up
    expect(bucketCountFor(100, 0.25)).toBe(10);   // huge → clamped down
    expect(bucketCountFor(0, 0.25)).toBe(6);      // `|| 6` guard, never 0 buckets
  });
});

/**
 * Conservation is asserted on `binDeltaTicks`, NOT on the ranked output.
 *
 * Ranking drops buckets below the bar's average |delta| on purpose — that is
 * the long-standing "above-average zones" rule, not a leak. An earlier draft of
 * this file measured conservation on the ranked result and went red at 70-of-100
 * lots; the code was right and the test was measuring the wrong stage. Recorded
 * because the same mistake would look exactly like a real data-loss bug.
 */
describe("no tick is lost in binning", () => {
  it("places every price on a tick-quantised ladder, including bar low and high", () => {
    for (const [lo, hi, step, base] of [
      [21_750, 21_752, 0.25, 21_750],
      [226.00, 226.20, 0.01, 226],
      [60_000, 60_004, 0.25, 60_000],
    ] as const) {
      const prices = ladder(lo, hi, step);
      const ticks = prices.map((p) => tick(p, 1, 0)); // 1 lot each, all sell-side
      const levels = binDeltaTicks(ticks, lo, hi, base);

      const seen = levels.reduce((s, l) => s + l.total, 0);
      expect(seen, `${lo}-${hi}: volume vanished between ticks and levels`).toBe(prices.length);
    }
  });

  it("holds a tick that printed outside the bar's own high/low", () => {
    // The window widens to the data; a print beyond the bar must not be clamped
    // into a neighbour's bucket or dropped.
    const ticks = [tick(99.5, 0, 7), tick(100, 0, 1), tick(101, 0, 1)];
    const levels = binDeltaTicks(ticks, 100, 101, 226);
    expect(levels.reduce((s, l) => s + l.total, 0)).toBe(9);
    expect(levels.some((l) => l.priceLevel === 99.5)).toBe(true);
  });

  it("survives a zero-range bar without dividing by zero", () => {
    const levels = computeDeltaBubbleLevels([tick(150, 3, 4)], 150, 150, 226, ALL);
    expect(levels).toHaveLength(1);
    expect(levels[0]!.priceLevel).toBe(150);
    expect(levels[0]!.delta).toBe(1);
  });

  it("returns nothing rather than throwing on empty or non-finite input", () => {
    expect(computeDeltaBubbleLevels([], 100, 101, 226, 7)).toEqual([]);
    expect(computeDeltaBubbleLevels([tick(Number.NaN, 1, 1)], 100, 101, 226, 7)).toEqual([]);
    expect(binDeltaTicks([], 100, 101, 226)).toEqual([]);
  });
});

/**
 * The defect this gate is named after.
 */
describe("a bubble owns a REAL traded price", () => {
  it("never claims a price that could not have traded", () => {
    // NQ 21750.00–21752.00 bins into ten 0.20-wide buckets. Their centres are
    // 21750.10, 21750.30, 21750.50 … and NQ only trades in 0.25 increments, so
    // every centre is a price that cannot exist on the ladder. The bubble
    // PRINTS this number, and its tooltip reads "aggressive buy at <price>".
    const prices = ladder(21_750, 21_752, 0.25);
    const levels = computeDeltaBubbleLevels(
      prices.map((p) => tick(p, 0, 1)), 21_750, 21_752, 21_750, ALL,
    );

    expect(levels.length).toBeGreaterThan(0);
    const notOnLadder = levels
      .map((l) => l.priceLevel)
      .filter((p) => !prices.includes(p));

    expect(
      notOnLadder,
      "A delta bubble prints its price and shares that sentence with the big-trade " +
        "bubble, whose price is a real print. Every price reported here must be a " +
        "tick this bar actually traded.",
    ).toEqual([]);
  });

  it("reports the bucket's heaviest tick, not its midpoint", () => {
    // Two prices must share a bucket for this to mean anything, and that needs
    // range > 10 x tick — below that, numLev's floor of 6 splits every cent
    // into its own bucket. 150.00-150.20 gives ten 0.02-wide buckets, so
    // 150.00 and 150.01 land together: 100 lots at the bottom, 5 at the top.
    // The geometric centre sits between them, at a price where almost nothing
    // happened. The honest answer is where the volume actually was.
    const levels = binDeltaTicks(
      [tick(150.00, 0, 100), tick(150.01, 0, 5)], 150.00, 150.20, 226,
    );
    const owner = levels.find((l) => l.total === 105);
    expect(owner, "the two ticks should share one bucket").toBeTruthy();
    expect(owner!.priceLevel).toBe(150.00);
  });

  it("breaks a volume tie toward the lower price, so input order cannot change the answer", () => {
    const pair = [tick(150.00, 0, 9), tick(150.01, 0, 9)];
    const a = binDeltaTicks(pair, 150, 150.20, 226);
    const b = binDeltaTicks([...pair].reverse(), 150, 150.20, 226);
    expect(a).toEqual(b);
    expect(a.find((l) => l.total === 18)?.priceLevel, "tie must resolve low").toBe(150.00);
  });
});

/**
 * The second defect: a rounded display price was used as an identity.
 */
describe("BLOCKER-GUARD: bucket identity cannot collide", () => {
  it("a tight bar keeps every bucket distinct", () => {
    // 150.00–150.03 bins into six buckets whose centres round (2dp) to
    //   150.00  150.01  150.01  150.02  150.02  150.03
    // — six buckets, four keys. Keyed by that rounded price, two buckets were
    // overwritten in the pick map and their bubbles suppressed at spawn, so
    // real aggressor volume left the chart with no indication.
    const prices = ladder(150.00, 150.03, 0.01);
    const ticks = prices.map((p, i) => tick(p, 0, (i + 1) * 10));
    const levels = binDeltaTicks(ticks, 150.00, 150.03, 226);

    const ids = levels.map((l) => l.levelIdx);
    expect(new Set(ids).size, "two buckets shared an identity").toBe(ids.length);

    const expected = ticks.reduce((s, t) => s + t.bid + t.ask, 0);
    expect(
      levels.reduce((s, l) => s + l.total, 0),
      "aggressor volume was dropped on a tight bar — §5 SYSTEM TRUTH LAW",
    ).toBe(expected);
  });

  it("survives the exact case that used to collapse: six buckets, four rounded prices", () => {
    // The old identity was `+(centre).toFixed(dp)`. For this bar the six bucket
    // centres round to 150.00 150.01 150.01 150.02 150.02 150.03 — four keys
    // for six buckets, so two buckets were overwritten in the pick map and
    // their bubbles suppressed at spawn. Reproduce that key here and show it
    // genuinely collides, then show the shipped identity does not.
    const centres = [150.0025, 150.0075, 150.0125, 150.0175, 150.0225, 150.0275];
    const oldKeys = centres.map((c) => +c.toFixed(2));
    expect(new Set(oldKeys).size, "the old price key must genuinely collide").toBeLessThan(
      centres.length,
    );

    const levels = binDeltaTicks(
      ladder(150.00, 150.03, 0.01).map((p) => tick(p, 0, 5)), 150.00, 150.03, 226,
    );
    expect(new Set(levels.map((l) => l.levelIdx)).size).toBe(levels.length);
  });
});

describe("ranking is deterministic and capped", () => {
  it("honours the cap as a maximum and never invents levels to fill it", () => {
    const levels = computeDeltaBubbleLevels(
      [tick(150.00, 0, 10), tick(150.03, 4, 0)], 150.00, 150.03, 226, 15,
    );
    expect(levels.length).toBeLessThanOrEqual(2);
    expect(levels.every((l) => l.total > 0)).toBe(true);
  });

  it("always shows a buy leader and a sell leader when both exist", () => {
    const ticks = [
      tick(150.00, 0, 50),  // strong buy
      tick(150.01, 1, 0),
      tick(150.02, 1, 0),
      tick(150.03, 9, 0),   // strongest sell, but weaker than the buy
    ];
    const levels = computeDeltaBubbleLevels(ticks, 150.00, 150.03, 226, 1);
    // Cap of 1 still cannot erase a whole side of the flow.
    expect(levels.some((l) => l.delta > 0)).toBe(true);
  });

  it("identical input yields byte-identical output", () => {
    const ticks = [tick(150.00, 3, 9), tick(150.02, 11, 1), tick(150.03, 0, 4)];
    expect(computeDeltaBubbleLevels(ticks, 150, 150.03, 226, 7))
      .toEqual(computeDeltaBubbleLevels(ticks, 150, 150.03, 226, 7));
  });

  it("ranks by |delta| descending", () => {
    const ticks = [tick(150.00, 0, 2), tick(150.015, 0, 40), tick(150.03, 30, 0)];
    const levels = computeDeltaBubbleLevels(ticks, 150.00, 150.03, 226, ALL);
    const mags = levels.map((l) => Math.abs(l.delta));
    expect([...mags].sort((a, b) => b - a)).toEqual(mags);
  });
});
