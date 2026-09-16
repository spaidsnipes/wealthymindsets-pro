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
  deltaBubbleLevelKey,
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

/**
 * THE BOTH-SIDES GUARANTEE — the module's own documented contract.
 *
 * `computeDeltaBubbleLevels` promises "guaranteed buy + sell leaders so every
 * active bar shows both sides". Nothing tested that sentence, and it was false.
 *
 * The leaders were inserted into `picked` AFTER the threshold picks had already
 * been trimmed to `limit`, so the final `.slice(0, limit)` — which ranks by
 * |delta| desc — could evict the level the guarantee had just forced in. It did
 * so exactly on the one-sided bar the guarantee exists for, because the lone
 * opposing level has, by construction, the smallest |delta| on such a bar.
 *
 * Nothing threw and tsc stayed at exit 0: the output was a well-formed array of
 * the right length. The only symptom was a sell bubble that never appeared, and
 * a bubble that is never drawn is indistinguishable, on the chart, from flow
 * that never happened. Same shape as the vocabulary-drift defect on the deck.
 *
 * These cases pin BOTH directions: the leaders must survive the trim, and the
 * fix must not start inventing a side that has no flow at all.
 */
describe("delta bubbles — both-sides guarantee survives the cap", () => {
  /** Five buckets of heavy buying and one lone seller — the defect's own shape. */
  const oneSidedBuyTicks = [
    tick(150.00, 0, 100),
    tick(150.01, 0, 100),
    tick(150.02, 0, 100),
    tick(150.03, 0, 100),
    tick(150.04, 0, 100),
    tick(150.05, 10, 0), // the lone opposing print
  ];

  it("keeps the lone seller on an overwhelmingly one-sided buy bar", () => {
    // Before the fix this returned [100, 100, 100, 100, 100] — five buy
    // bubbles and no sell bubble, at the trader's default cap.
    const levels = computeDeltaBubbleLevels(oneSidedBuyTicks, 150.00, 150.05, 150, 5);
    expect(levels.some((l) => l.delta < 0)).toBe(true);
    expect(levels.some((l) => l.delta > 0)).toBe(true);
  });

  it("keeps the lone buyer on the mirrored one-sided sell bar", () => {
    // Mirrored so the fix cannot be a special case that only helps sellers.
    const mirrored = oneSidedBuyTicks.map((t) => tick(t.price, t.ask, t.bid));
    const levels = computeDeltaBubbleLevels(mirrored, 150.00, 150.05, 150, 5);
    expect(levels.some((l) => l.delta > 0)).toBe(true);
    expect(levels.some((l) => l.delta < 0)).toBe(true);
  });

  it("holds the guarantee at every cap the trader can actually pick", () => {
    // The preference offers 5/7/10/15. The defect fired at all of them,
    // because the opposing level loses on |delta| rank regardless of cap.
    for (const cap of [5, 7, 10, 15]) {
      const levels = computeDeltaBubbleLevels(oneSidedBuyTicks, 150.00, 150.05, 150, cap);
      expect(levels.some((l) => l.delta < 0), `cap ${cap} lost the sell side`).toBe(true);
    }
  });

  it("never returns more levels than the cap", () => {
    // ANTI-OVERCORRECTION: reserving two slots must not let the result exceed
    // the trader's cap. A guarantee that leaks past the limit is a new defect.
    for (const cap of [1, 2, 5, 7]) {
      const levels = computeDeltaBubbleLevels(oneSidedBuyTicks, 150.00, 150.05, 150, cap);
      expect(levels.length, `cap ${cap} overflowed`).toBeLessThanOrEqual(cap);
    }
  });

  it("invents no sell side on a bar where nothing sold", () => {
    // ANTI-VACUITY: the guarantee is "show both sides WHEN both sides traded",
    // not "always print a sell bubble". A fix that fabricated one would pass
    // every test above while lying about the tape.
    const allBuy = [tick(150.00, 0, 50), tick(150.02, 0, 80), tick(150.04, 0, 30)];
    const levels = computeDeltaBubbleLevels(allBuy, 150.00, 150.05, 150, 5);
    expect(levels.length).toBeGreaterThan(0);
    expect(levels.every((l) => l.delta > 0)).toBe(true);
  });

  it("at cap 1 shows the stronger side rather than dropping both", () => {
    // One slot cannot hold two sides. The honest answer is the dominant flow,
    // and it must still be exactly one level — not zero, not two.
    const levels = computeDeltaBubbleLevels(oneSidedBuyTicks, 150.00, 150.05, 150, 1);
    expect(levels).toHaveLength(1);
    expect(levels[0]!.delta).toBeGreaterThan(0);
  });

  it("still yields identical output for identical input", () => {
    // Reserving slots must not make the result order-dependent — bubbles that
    // reshuffle between frames on unchanged data would read as fake motion.
    const a = computeDeltaBubbleLevels(oneSidedBuyTicks, 150.00, 150.05, 150, 5);
    const b = computeDeltaBubbleLevels(oneSidedBuyTicks, 150.00, 150.05, 150, 5);
    expect(a).toEqual(b);
  });
});

/**
 * ── LEVEL IDENTITY ──────────────────────────────────────────────────────────
 *
 * The renderer keeps a per-bar Set of spawn keys so one price zone yields one
 * bubble. Everything above this point tests what a level CONTAINS. Nothing
 * tested what a level IS — and the identity formula lived inline in the
 * canvas block, where no test could reach it.
 *
 * It was `dt:<time>:L<levelIdx>`. `levelIdx` is an offset into a lattice laid
 * over [barLow, barHigh], and a LIVE bar's window moves. The tests below are
 * the ones that would have caught that; they are written against the key
 * function so they keep being true of the SHIPPED identity.
 */
describe("delta bubble level identity", () => {
  /**
   * The load-bearing premise. `deltaBubbleLevelKey` is only safe to key on
   * price because two buckets cannot hold the same owning price — and that is
   * exactly the collision the old index key was introduced to avoid, so it
   * gets proven here rather than argued in a comment.
   *
   * It holds because bucket assignment is a pure function of price: the same
   * price always lands in the same bucket, so buckets partition the price axis
   * and `ownerPrice` is drawn from disjoint sets. Swept across tight, wide and
   * degenerate bars because "tight bar" was the precise case the old comment
   * named.
   */
  it("two buckets can never share an owning price", () => {
    const bars: Array<[number, number, number]> = [
      [150.00, 150.03, 150],      // tight: 3 cents, the named danger case
      [150.00, 150.05, 150],
      [149.97, 150.06, 150],
      [100.00, 101.00, 226],      // wide
      [21_750.00, 21_752.00, 21_750], // 0.25-tick futures
      [0.5000, 0.5004, 0.5],      // sub-dollar, 0.0001 tick
      [150.00, 150.00, 150],      // degenerate: zero range
    ];
    for (const [lo, hi, base] of bars) {
      const ticks = ladder(lo, hi, priceTickFor(base)).map((p, i) => tick(p, i + 1, i + 2));
      const levels = binDeltaTicks(ticks, lo, hi, base);
      const prices = levels.map((l) => l.priceLevel);
      expect(
        new Set(prices).size,
        `bar [${lo},${hi}] base ${base} produced a duplicate owning price: ${prices.join(", ")}`,
      ).toBe(prices.length);
    }
  });

  it("distinct zones on one bar get distinct keys", () => {
    const ticks = [tick(150.00, 5, 1), tick(150.02, 1, 9), tick(150.04, 7, 2)];
    const levels = binDeltaTicks(ticks, 150.00, 150.04, 150);
    const keys = levels.map((l) => deltaBubbleLevelKey(1_700_000_000, l));
    expect(keys.length).toBeGreaterThan(1);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keys are scoped to their bar — the same zone on two bars is two bubbles", () => {
    const level = binDeltaTicks([tick(150.02, 1, 9)], 150.00, 150.04, 150)[0]!;
    expect(deltaBubbleLevelKey(1_700_000_000, level)).not.toBe(
      deltaBubbleLevelKey(1_700_000_060, level),
    );
  });

  /**
   * THE REGRESSION. This is the defect, stated as the property that was
   * violated: a price zone's identity must not change because the BAR moved.
   *
   * The sequence is one forming 1m bar. Each step adds a real print; steps 3
   * and 4 make a new high and a new low, which is what re-ranges the lattice.
   * Under the old index key the 150.02 zone was L5, L5, L3, L5 — so it
   * double-spawned at step 3 — and at step 4 the 150.00 zone landed on L3,
   * an index step 3 had already burned, so it never drew at all.
   *
   * Asserting on the KEY rather than on levelIdx is deliberate: levelIdx is
   * still allowed to move, because it is a lattice offset and the lattice
   * genuinely does move. What may not move is the bubble's identity.
   */
  it("a zone keeps its identity while the bar's window moves beneath it", () => {
    const BAR = 1_700_000_000;
    const steps: Array<{ ticks: DeltaTick[]; lo: number; hi: number }> = [
      { ticks: [tick(150.00, 5, 1), tick(150.02, 1, 9)], lo: 150.00, hi: 150.02 },
      { ticks: [tick(150.00, 5, 1), tick(150.02, 1, 9), tick(150.01, 2, 6)], lo: 150.00, hi: 150.02 },
      { ticks: [tick(150.00, 5, 1), tick(150.02, 1, 9), tick(150.01, 2, 6), tick(150.06, 1, 8)], lo: 150.00, hi: 150.06 },
      { ticks: [tick(150.00, 5, 1), tick(150.02, 1, 9), tick(150.01, 2, 6), tick(150.06, 1, 8), tick(149.97, 7, 1)], lo: 149.97, hi: 150.06 },
    ];

    // price -> the key it was first seen under
    const firstKey = new Map<number, string>();
    // key -> the price that claimed it
    const claimedBy = new Map<string, number>();

    let windowMoved = false;
    let priorIdx: Map<number, number> | null = null;

    for (const [n, step] of steps.entries()) {
      const levels = binDeltaTicks(step.ticks, step.lo, step.hi, 150);
      const idxNow = new Map(levels.map((l) => [l.priceLevel, l.levelIdx]));

      for (const l of levels) {
        const key = deltaBubbleLevelKey(BAR, l);

        const seen = firstKey.get(l.priceLevel);
        if (seen === undefined) firstKey.set(l.priceLevel, key);
        else {
          expect(
            key,
            `step ${n + 1}: the ${l.priceLevel} zone changed identity (${seen} -> ${key}); ` +
              `the renderer would spawn a second bubble for one price zone`,
          ).toBe(seen);
        }

        const owner = claimedBy.get(key);
        if (owner === undefined) claimedBy.set(key, l.priceLevel);
        else {
          expect(
            owner,
            `step ${n + 1}: key ${key} is claimed by both ${owner} and ${l.priceLevel}; ` +
              `the later zone is silently suppressed and its aggressor volume never draws`,
          ).toBe(l.priceLevel);
        }
      }

      // POSITIVE CONTROL. If the lattice never actually renumbered, the loop
      // above would pass on a sequence that exercises nothing. Prove the
      // window really did move under at least one zone that survived.
      if (priorIdx) {
        for (const [price, idx] of idxNow) {
          const before = priorIdx.get(price);
          if (before !== undefined && before !== idx) windowMoved = true;
        }
      }
      priorIdx = idxNow;
    }

    expect(
      windowMoved,
      "no zone was ever renumbered, so this sequence does not exercise window drift " +
        "and the assertions above proved nothing",
    ).toBe(true);
  });
});
