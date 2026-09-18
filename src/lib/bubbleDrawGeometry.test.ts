/**
 * The bubble size law, measured.
 *
 * Every test below is written against the CLAIM ("area is proportional to
 * value", "the floor never adds to a bubble that earned its size") rather than
 * against the arithmetic that currently satisfies it. A test that re-types
 * `maxR * Math.sqrt(v / peak)` and asserts equality proves the file compiles
 * and nothing else — this repo has already paid for that lesson twice, in
 * deltaBubbleBinning.test.ts and in the deleted scripts/audit-bubbles.mjs.
 *
 * Each of the three defects named in the module header has a test that FAILS
 * against the old inline formula. Those are recorded at the bottom, running the
 * old formulas directly, so the regressions cannot be argued about later.
 */
import { describe, expect, it } from "vitest";
import {
  BIG_TRADE_MAX_R,
  BUBBLE_MIN_R,
  DELTA_BUBBLE_MAX_R,
  bigTradeBubbleRadius,
  bubbleEarnedRadius,
  bubbleFramePeak,
  bubbleRadius,
  bubbleRadiusIsFloored,
  deltaBubbleRadius,
} from "./bubbleDrawGeometry";

const OPTS = { maxR: DELTA_BUBBLE_MAX_R } as const;
const area = (r: number) => Math.PI * r * r;

describe("bubble size — area is directly proportional to value", () => {
  it("doubling the value doubles the painted AREA, not the radius", () => {
    const peak = 1000;
    for (const v of [50, 125, 250, 400]) {
      const small = bubbleEarnedRadius(v, peak, OPTS);
      const big = bubbleEarnedRadius(v * 2, peak, OPTS);
      expect(area(big) / area(small)).toBeCloseTo(2, 10);
      // And explicitly NOT the naive reading — the radius must NOT double.
      expect(big / small).toBeCloseTo(Math.SQRT2, 10);
    }
  });

  it("area per unit of value is the same constant at every value", () => {
    const peak = 777;
    const ratios = [1, 7, 77, 200, 500, 776, 777].map(
      v => area(bubbleEarnedRadius(v, peak, OPTS)) / v,
    );
    for (const r of ratios) expect(r).toBeCloseTo(ratios[0], 9);
  });

  it("the peak value — and only the peak — reaches maxR", () => {
    const peak = 420;
    expect(bubbleEarnedRadius(peak, peak, OPTS)).toBeCloseTo(DELTA_BUBBLE_MAX_R, 10);
    for (const v of [419, 300, 100, 1]) {
      expect(bubbleEarnedRadius(v, peak, OPTS)).toBeLessThan(DELTA_BUBBLE_MAX_R);
    }
  });

  it("never exceeds maxR, even when a value is reported above the peak", () => {
    // A live bar can report a level larger than the peak it was normalized
    // against for one frame. That must clamp, not paint off the disc budget.
    expect(bubbleRadius(5000, 100, OPTS)).toBe(DELTA_BUBBLE_MAX_R);
  });
});

describe("bubble size — no saturation, no dead zone", () => {
  it("distinct values above the floor paint distinct radii", () => {
    // The old big-trade form clamped at 28: every print ≥ 3.98× the bar mean
    // painted the SAME bubble. This is that defect stated as a law.
    const peak = 10_000;
    const seen = new Set<number>();
    const vals = [2_000, 3_000, 4_500, 6_000, 7_500, 9_000, 10_000];
    for (const v of vals) seen.add(bigTradeBubbleRadius(v, peak));
    expect(seen.size).toBe(vals.length);
  });

  it("is monotonic — more value is never a smaller bubble", () => {
    const peak = 5_000;
    let last = -1;
    for (let v = 0; v <= peak; v += 17) {
      const r = bigTradeBubbleRadius(v, peak);
      expect(r).toBeGreaterThanOrEqual(last);
      last = r;
    }
  });

  it("the largest print in a bar is always the largest bubble in that bar", () => {
    const bar = [12, 4_000, 90, 55_000, 3, 900];
    const peak = Math.max(...bar);
    const radii = bar.map(v => bigTradeBubbleRadius(v, peak));
    const maxIdx = radii.indexOf(Math.max(...radii));
    expect(bar[maxIdx]).toBe(peak);
    expect(radii[maxIdx]).toBe(BIG_TRADE_MAX_R);
  });
});

describe("bubble size — the floor is a floor, never a baseline", () => {
  it("adds nothing to a bubble that earned more than the floor", () => {
    const peak = 1_000;
    for (const v of [200, 500, 1_000]) {
      const earned = bubbleEarnedRadius(v, peak, OPTS);
      expect(earned).toBeGreaterThan(BUBBLE_MIN_R);
      expect(bubbleRadius(v, peak, OPTS)).toBe(Math.round(earned));
      expect(bubbleRadiusIsFloored(v, peak, OPTS)).toBe(false);
    }
  });

  it("a zone carrying nothing paints the floor and is DISCLOSED as floored", () => {
    expect(deltaBubbleRadius(0, 1_000)).toBe(BUBBLE_MIN_R);
    expect(bubbleRadiusIsFloored(0, 1_000, OPTS)).toBe(true);
  });

  it("a near-zero zone cannot look like a fifth of the peak", () => {
    // The OLD formula gave r = 11 against a peak of 25 for a value of zero —
    // 19% of the peak area for 0% of the flow. This is the number that must
    // not come back.
    const peak = 1_000;
    const tiny = deltaBubbleRadius(peak * 0.005, peak);
    expect(area(tiny) / area(DELTA_BUBBLE_MAX_R)).toBeLessThan(0.07);
  });

  it("degenerate peaks fall back to the floor instead of NaN", () => {
    for (const peak of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const r = deltaBubbleRadius(100, peak);
      expect(Number.isFinite(r)).toBe(true);
      expect(r).toBe(BUBBLE_MIN_R);
    }
    expect(deltaBubbleRadius(Number.NaN, 100)).toBe(BUBBLE_MIN_R);
  });

  it("sign is not size — a sell zone paints the same disc as a buy zone", () => {
    expect(deltaBubbleRadius(-640, 1_000)).toBe(deltaBubbleRadius(640, 1_000));
  });
});

describe("bubble size — both surfaces obey ONE law", () => {
  it("delta and big-trade differ only in their ceiling", () => {
    const peak = 3_000;
    for (const v of [30, 300, 1_500, 3_000]) {
      const d = bubbleEarnedRadius(v, peak, { maxR: DELTA_BUBBLE_MAX_R });
      const b = bubbleEarnedRadius(v, peak, { maxR: BIG_TRADE_MAX_R });
      expect(b / d).toBeCloseTo(BIG_TRADE_MAX_R / DELTA_BUBBLE_MAX_R, 10);
    }
  });

  it("normalizes against a PEAK, so one outlier cannot resize its neighbours", () => {
    // The old big-trade form divided by the bar MEAN, which the outlier itself
    // drags upward — so adding one huge print SHRANK every other bubble in the
    // bar, with no change in their own volume.
    const quiet = [100, 200, 300];
    const loud = [...quiet, 50_000];
    const rQuiet = quiet.map(v => bigTradeBubbleRadius(v, Math.max(...quiet)));
    const rLoud = loud.slice(0, 3).map(v => bigTradeBubbleRadius(v, Math.max(...quiet)));
    expect(rLoud).toEqual(rQuiet);
  });
});

/**
 * REGRESSION RECORD — the two old inline formulas, reproduced exactly, so the
 * defects this module fixes are measurements rather than assertions in prose.
 *
 * These are NOT the shipped code. They are quoted from MainChart.tsx as it
 * stood before the extraction.
 */
describe("regression record — the inline formulas that used to ship", () => {
  /** MainChart.tsx ≈4917, verbatim. */
  const oldDelta = (absDelta: number, maxAbsD: number) =>
    Math.round(11 + Math.sqrt(absDelta / maxAbsD) * 14);

  /** MainChart.tsx ≈5395, verbatim. */
  const oldBigTrade = (total: number, barMean: number) =>
    Math.round(
      Math.max(9, Math.min(28, 9 + Math.sqrt(Math.max(0, total / Math.max(1, barMean) - 1)) * 11)),
    );

  it("BASELINE BLEND: an empty zone painted a fifth of the peak's area", () => {
    const share = area(oldDelta(0, 1_000)) / area(oldDelta(1_000, 1_000));
    expect(share).toBeGreaterThan(0.18);
    // The owner answers the same question honestly.
    expect(area(deltaBubbleRadius(0, 1_000)) / area(deltaBubbleRadius(1_000, 1_000)))
      .toBeLessThan(0.06);
  });

  it("SATURATION: a 4× print and a 40× print painted an identical bubble", () => {
    expect(oldBigTrade(4_000, 1_000)).toBe(oldBigTrade(40_000, 1_000));
    expect(bigTradeBubbleRadius(4_000, 40_000)).not.toBe(bigTradeBubbleRadius(40_000, 40_000));
  });

  it("DEAD ZONE: every print at or below the bar mean collapsed into one dot", () => {
    const collapsed = new Set([100, 400, 700, 1_000].map(v => oldBigTrade(v, 1_000)));
    expect(collapsed.size).toBe(1);
    expect(new Set([100, 400, 700, 1_000].map(v => bigTradeBubbleRadius(v, 1_000))).size).toBe(4);
  });

  it("MEAN NORMALIZER: one new outlier shrank every untouched bubble in the bar", () => {
    const quiet = [100, 200, 300];
    const meanQuiet = quiet.reduce((s, v) => s + v, 0) / quiet.length;
    const loud = [...quiet, 50_000];
    const meanLoud = loud.reduce((s, v) => s + v, 0) / loud.length;
    // Same three prints, same volumes, smaller bubbles — because of a trade
    // that happened somewhere else on the bar.
    expect(oldBigTrade(300, meanLoud)).toBeLessThan(oldBigTrade(300, meanQuiet));
  });
});

// ───────────────────────────────────────────────────────────────────
/**
 * ── 2026-09-18: THE PEAK WAS THE RIGHT STATISTIC OVER THE WRONG SET ───────
 *
 * The "TWO NORMALIZERS" fix chose PEAK over MEAN and never asked over WHICH
 * SET. Both callers used one BAR, so every bar's loudest zone painted at
 * exactly maxR — a three-lot bar and a thirty-thousand-lot bar drew the same
 * 25px disc, side by side, in one frame.
 *
 * MainChart's own type comment states the law that breaks: "TRUE trade size
 * (bigger order → bigger bubble)". Under a per-bar peak a bigger order does
 * not get a bigger bubble.
 */
describe("the peak is taken over the frame, not over one bar", () => {
  it("MEASURED: a per-bar peak paints every bar's loudest zone identically", () => {
    // Two bars in one frame. Bar B carried 1,000x the flow of bar A.
    const quietBar = [3, 1];
    const violentBar = [30_000, 12_000];

    const perBar = (bar: number[]) => bar.map(v => deltaBubbleRadius(v, Math.max(...bar)));
    expect(perBar(quietBar)[0]).toBe(DELTA_BUBBLE_MAX_R);
    expect(perBar(violentBar)[0]).toBe(DELTA_BUBBLE_MAX_R);
    // Same picture, three orders of magnitude apart. That is the defect.

    const framePeak = bubbleFramePeak([...quietBar, ...violentBar]);
    expect(framePeak).toBe(30_000);
    expect(deltaBubbleRadius(quietBar[0]!, framePeak))
      .toBeLessThan(deltaBubbleRadius(violentBar[0]!, framePeak));
  });

  it("is a magnitude over the whole population, sign-blind", () => {
    // Delta bubbles carry a SIGNED value (side). A sell-dominant zone is not
    // a smaller zone, so the peak reads magnitudes.
    expect(bubbleFramePeak([-40, 12, -3])).toBe(40);
    expect(bubbleFramePeak([12, -40, 3])).toBe(40);
  });

  it("an empty frame has no peak, and no bubble claims one", () => {
    expect(bubbleFramePeak([])).toBe(0);
    // peak <= 0 is the `fraction` guard: zero share, so the floor is all that
    // survives — a legible dot, never a confident full-size disc.
    expect(bubbleEarnedRadius(500, bubbleFramePeak([]), { maxR: DELTA_BUBBLE_MAX_R })).toBe(0);
    expect(deltaBubbleRadius(500, bubbleFramePeak([]))).toBe(BUBBLE_MIN_R);
  });

  it("skips non-finite values rather than poisoning the whole frame", () => {
    // One NaN from a bad tick must not make every bubble on screen floor out.
    expect(bubbleFramePeak([Number.NaN, 7, Number.POSITIVE_INFINITY, 2])).toBe(7);
  });

  it("area stays linear in value across the frame, not within a bar", () => {
    const peak = bubbleFramePeak([-30_000, 7_500, 3]);
    const rQuarter = bubbleEarnedRadius(7_500, peak, { maxR: DELTA_BUBBLE_MAX_R });
    const rFull = bubbleEarnedRadius(30_000, peak, { maxR: DELTA_BUBBLE_MAX_R });
    // 1/4 the value → 1/4 the AREA → 1/2 the radius. The whole claim.
    expect(rQuarter / rFull).toBeCloseTo(0.5, 10);
  });
});
