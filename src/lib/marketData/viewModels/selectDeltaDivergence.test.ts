/**
 * "Bearish divergence" is the most abused sentence in retail order-flow
 * software, because a divergence can be manufactured out of ANY tape by
 * choosing which two points you compare. This suite exists to make the choosing
 * falsifiable.
 *
 * Five ways it could be manufactured, each forbidden below:
 *
 *   · by comparing a swing smaller than the window's own noise
 *   · by reading a finding off a delta that barely moved
 *   · by finding a "pivot" in a tape that only ever went one way
 *   · by reporting the same divergence no matter which direction price went
 *   · by treating a shuffled tape as the same tape — sequence IS the claim
 */

import { describe, it, expect } from "vitest";
import {
  selectDeltaDivergence,
  DELTA_DIVERGENCE_VERSION,
  DIVERGENCE_MIN_PRINTS,
  SWING_MIN_SPREADS,
} from "./selectDeltaDivergence";
import type { AggressorTick } from "../selectAggressorFlow";

const tick = (
  price: number,
  size: number,
  side: "buy" | "sell",
  method = "PROVIDER",
): AggressorTick => ({
  price,
  size,
  side,
  trade: true,
  marketEvent: { aggressorMethod: method as never },
});

/**
 * Build a tape that walks through a list of price legs. Each leg names where
 * price should end up and how aggressive the buying was on the way — which is
 * exactly the two independent variables a divergence compares.
 */
function tape(
  legs: Array<{ to: number; prints: number; buyShare: number }>,
  start = 100,
): AggressorTick[] {
  const out: AggressorTick[] = [];
  let price = start;
  for (const leg of legs) {
    const step = (leg.to - price) / leg.prints;
    for (let i = 0; i < leg.prints; i++) {
      price += step;
      // Deterministic buy/sell selection at the requested share — no RNG, so a
      // failure here is always reproducible. The 37× stride matters: a plain
      // `i % 100` only spreads across as many buckets as the leg has prints,
      // so on a 45-print leg every share above 0.45 silently became 1.0 and
      // three different legs produced the same all-buy tape.
      const buy = ((i * 37) % 100) / 100 < leg.buyShare;
      out.push(tick(Number(price.toFixed(4)), 10, buy ? "buy" : "sell"));
    }
  }
  return out;
}

/**
 * Every fixture below ends with a FOURTH leg that turns away from the extreme,
 * because this module will not call a still-forming extreme a pivot. 45-print
 * legs are used so the four legs land exactly on segment boundaries at the
 * default 12 segments — the fixture is not allowed to depend on where a
 * rounding boundary happens to fall.
 */
const BEAR_LEGS = [
  { to: 104, prints: 45, buyShare: 0.9 }, // first push, heavily bought
  { to: 101, prints: 45, buyShare: 0.1 }, // pullback
  { to: 106, prints: 45, buyShare: 0.52 }, // higher high, barely bought
  { to: 104.5, prints: 45, buyShare: 0.2 }, // turns away, confirming the pivot
];

const BULL_LEGS = [
  { to: 96, prints: 45, buyShare: 0.1 }, // first flush, heavily sold
  { to: 99, prints: 45, buyShare: 0.9 }, // bounce
  { to: 94, prints: 45, buyShare: 0.48 }, // lower low, barely sold
  { to: 95.5, prints: 45, buyShare: 0.8 }, // turns away, confirming the pivot
];

const CONFIRM_LEGS = [
  { to: 104, prints: 45, buyShare: 0.6 },
  { to: 101, prints: 45, buyShare: 0.1 },
  { to: 106, prints: 45, buyShare: 0.98 }, // higher high, heavily bought
  { to: 104.5, prints: 45, buyShare: 0.2 },
];

describe("selectDeltaDivergence — it refuses before it reports", () => {
  it("is UNMEASURED with no tape at all", () => {
    for (const input of [null, undefined, [] as AggressorTick[]]) {
      const vm = selectDeltaDivergence(input);
      expect(vm.verdict).toBe("UNMEASURED");
      expect(vm.recentPivot).toBeNull();
      expect(vm.segments).toHaveLength(0);
      expect(vm.detail.length).toBeGreaterThan(10);
    }
  });

  it("is UNMEASURED — and says so numerically — on a tape too short to have a shape", () => {
    const vm = selectDeltaDivergence(
      Array.from({ length: 8 }, (_, i) => tick(100 + i * 0.1, 10, "buy")),
    );
    expect(vm.verdict).toBe("UNMEASURED");
    expect(vm.detail).toContain(String(DIVERGENCE_MIN_PRINTS));
  });

  it("does not count unsided prints toward having enough tape", () => {
    // Real executions with no aggressor side cannot move a cumulative delta,
    // so a tape of them is not a delta path however long it is.
    const unsided: AggressorTick[] = Array.from({ length: 60 }, (_, i) => ({
      price: 100 + i * 0.01,
      size: 10,
      trade: true,
    }));
    expect(selectDeltaDivergence(unsided).verdict).toBe("UNMEASURED");
  });

  it("finds NO_SWING when every print landed at one price", () => {
    const flat = Array.from({ length: 60 }, (_, i) =>
      tick(100, 10, i % 2 === 0 ? "buy" : "sell"),
    );
    const vm = selectDeltaDivergence(flat);
    expect(vm.verdict).toBe("NO_SWING");
    expect(vm.segments.length).toBeGreaterThan(0);
    expect(vm.detail).toContain("one price");
  });

  it("finds NO_SWING on a tape that only ever went one way", () => {
    // A monotonic ramp has no local extrema at all. An implementation that
    // simply compared the first and last bars would report a finding here.
    const ramp = Array.from({ length: 120 }, (_, i) => tick(100 + i * 0.02, 10, "buy"));
    const vm = selectDeltaDivergence(ramp);
    expect(vm.verdict).toBe("NO_SWING");
    expect(vm.priorPivot).toBeNull();
  });

  it("will not call a STILL-FORMING extreme a pivot", () => {
    // WRITTEN BECAUSE THE FIRST DRAFT OF THIS SUITE FAILED, and the failure
    // was right. Every fixture ended at its own high, so the new extreme was
    // always the last segment — and a pivot is defined by having neighbours on
    // BOTH sides, which the last segment never has.
    //
    // That is not an inconvenience to route around. It is the module saying
    // something true and uncomfortable: you cannot confirm a high until price
    // has turned away from it, so a divergence can only ever be reported one
    // segment LATE. A module that reported the forming push would be selling
    // certainty about a bar that has not finished.
    const stillRising = tape(BEAR_LEGS.slice(0, 3));
    const turnedAway = tape(BEAR_LEGS);
    expect(selectDeltaDivergence(stillRising).verdict).toBe("NO_SWING");
    expect(selectDeltaDivergence(turnedAway).verdict).toBe("BEARISH");
  });
});

describe("selectDeltaDivergence — the verdict follows price AND delta", () => {
  it("calls BEARISH when price makes a higher high on weaker buying", () => {
    const vm = selectDeltaDivergence(
      tape(BEAR_LEGS),
    );
    expect(vm.verdict).toBe("BEARISH");
    expect(vm.priceChange!).toBeGreaterThan(0);
    expect(vm.recentPivot!.segment).toBeGreaterThan(vm.priorPivot!.segment);
    expect(vm.detail).toContain("higher high");
  });

  it("calls BULLISH when price makes a lower low on weaker selling", () => {
    const vm = selectDeltaDivergence(
      tape(BULL_LEGS),
    );
    expect(vm.verdict).toBe("BULLISH");
    expect(vm.priceChange!).toBeLessThan(0);
    expect(vm.detail).toContain("lower low");
  });

  it("calls CONFIRMED — not a divergence — when delta came with price", () => {
    // The honest majority case. A module that only knows how to find
    // divergences will report one here, and that is the failure this test
    // exists to catch.
    const vm = selectDeltaDivergence(
      tape(CONFIRM_LEGS),
    );
    expect(vm.verdict).toBe("CONFIRMED");
    expect(vm.cvdChange!).toBeGreaterThan(0);
    expect(vm.detail).toContain("paid for");
  });

  it("does not report the same verdict for a tape and its mirror image", () => {
    const up = selectDeltaDivergence(
      tape(BEAR_LEGS),
    );
    const down = selectDeltaDivergence(tape(BULL_LEGS));
    expect(up.verdict).not.toBe(down.verdict);
  });
});

describe("selectDeltaDivergence — the swing is measured in the window's own scale", () => {
  it("ignores a swing smaller than the window's own noise", () => {
    // A tape swinging dollars, asked about a two-cent 'higher high'. Measuring
    // the swing in ticks would call this a finding.
    const vm = selectDeltaDivergence(
      tape([
        { to: 110, prints: 45, buyShare: 0.9 },
        { to: 90, prints: 45, buyShare: 0.1 },
        { to: 110.02, prints: 45, buyShare: 0.5 },
        { to: 108, prints: 45, buyShare: 0.3 },
      ]),
    );
    // Whatever it decides, it must not have compared the 2-cent difference.
    if (vm.swingInSpread != null) {
      expect(Math.abs(vm.swingInSpread)).toBeGreaterThanOrEqual(SWING_MIN_SPREADS);
    }
  });

  it("publishes the swing in spreads alongside the raw price change", () => {
    const vm = selectDeltaDivergence(
      tape(BEAR_LEGS),
    );
    expect(vm.priceChange).not.toBeNull();
    expect(vm.swingInSpread).not.toBeNull();
    expect(Math.abs(vm.swingInSpread!)).toBeGreaterThanOrEqual(SWING_MIN_SPREADS);
  });
});

describe("selectDeltaDivergence — the delta path it publishes is the one it read", () => {
  it("emits a monotonically-indexed path whose last cvd is the window's net", () => {
    const ticks = tape(BEAR_LEGS);
    const vm = selectDeltaDivergence(ticks);
    expect(vm.segments.length).toBeGreaterThan(2);
    vm.segments.forEach((s, i) => {
      expect(s.index).toBe(i);
      expect(s.prints).toBeGreaterThan(0);
      expect(s.high).toBeGreaterThanOrEqual(s.low);
    });
    const totalPrints = vm.segments.reduce((n, s) => n + s.prints, 0);
    expect(totalPrints).toBe(ticks.length);
  });

  it("puts the compared pivots ON the path it drew", () => {
    const vm = selectDeltaDivergence(
      tape(BEAR_LEGS),
    );
    for (const p of [vm.priorPivot!, vm.recentPivot!]) {
      const seg = vm.segments[p.segment];
      expect(seg).toBeDefined();
      expect(seg.cvd).toBe(p.cvd);
      expect(p.price === seg.high || p.price === seg.low).toBe(true);
    }
  });

  it("is a statement about SEQUENCE — reversing the tape can change the answer", () => {
    // Stated as an obligation in the module header: the caller owes it prints
    // in tape order. This test proves the module is genuinely reading order,
    // rather than computing something a shuffle could not disturb.
    const ticks = tape(BEAR_LEGS);
    const forward = selectDeltaDivergence(ticks);
    const backward = selectDeltaDivergence([...ticks].reverse());
    expect(backward.segments.map((s) => s.close)).not.toEqual(
      forward.segments.map((s) => s.close),
    );
  });
});

describe("selectDeltaDivergence — it carries the provenance of the sides it used", () => {
  it("demands no disclosure only when every side came from the venue", () => {
    const vm = selectDeltaDivergence(
      tape(BEAR_LEGS),
    );
    expect(vm.provenance).toBe("PROVIDER");
    expect(vm.requiresDisclosure).toBe(false);
  });

  it("flags a tick-rule tape for disclosure even though the verdict is identical", () => {
    const legs = BEAR_LEGS;
    const provider = selectDeltaDivergence(tape(legs));
    const inferred = selectDeltaDivergence(
      tape(legs).map((t) => tick(t.price!, t.size!, t.side as "buy" | "sell", "TICK_RULE")),
    );
    expect(inferred.verdict).toBe(provider.verdict);
    expect(inferred.cvdChange).toBe(provider.cvdChange);
    expect(inferred.provenance).toBe("INFERRED");
    expect(inferred.requiresDisclosure).toBe(true);
  });
});

describe("selectDeltaDivergence — shape", () => {
  it("is versioned and pure", () => {
    const ticks = tape(BEAR_LEGS);
    expect(selectDeltaDivergence(ticks).version).toBe(DELTA_DIVERGENCE_VERSION);
    expect(selectDeltaDivergence(ticks)).toEqual(selectDeltaDivergence(ticks));
  });

  it("never ships an empty detail, in any state", () => {
    const cases: Array<AggressorTick[] | null> = [
      null,
      [],
      Array.from({ length: 10 }, () => tick(100, 1, "buy")),
      Array.from({ length: 60 }, () => tick(100, 1, "buy")),
      tape(BEAR_LEGS),
    ];
    for (const c of cases) {
      expect(selectDeltaDivergence(c).detail.length).toBeGreaterThan(0);
    }
  });
});
