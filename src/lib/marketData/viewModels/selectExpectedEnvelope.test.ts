import { describe, expect, it } from "vitest";

import selectExpectedEnvelope from "./selectExpectedEnvelope";

// A session = 10 bars 5 min apart; sessions separated by a 1-day gap.
const session = (day: number, open: number, upReach: number, downReach: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const t = day * 86400 + i * 300;
    const high = i === 5 ? open + upReach : open + 0.1;
    const low = i === 7 ? open - downReach : open - 0.1;
    return { time: t, open: i === 0 ? open : open, high, low, close: open };
  });

describe("H-801 · expected envelope is a measurement of this chart's past", () => {
  it("refuses with fewer than three completed sessions", () => {
    const v = selectExpectedEnvelope([...session(0, 100, 1, 1), ...session(1, 100, 1, 1)]);
    expect(v.drawn).toBe(false);
    expect(v.reason).toBe("TOO_FEW_SESSIONS");
  });

  it("median up/down reach from each open, laid on today's open", () => {
    const bars = [
      ...session(0, 100, 1, 2), ...session(1, 100, 3, 1), ...session(2, 100, 2, 3),
      ...session(3, 200, 0.5, 0.5),
    ];
    const v = selectExpectedEnvelope(bars);
    expect(v.drawn).toBe(true);
    expect(v.sessions).toBe(3);
    expect(v.open).toBe(200);
    expect(v.upper).toBeCloseTo(202);
    expect(v.lower).toBeCloseTo(198);
  });

  it("surprise is a count of prior sessions that went as far — never a probability", () => {
    const bars = [
      ...session(0, 100, 1, 2), ...session(1, 100, 3, 1), ...session(2, 100, 2, 3),
      ...session(3, 200, 2.5, 0.5),
    ];
    const v = selectExpectedEnvelope(bars);
    expect(v.up).toMatchObject({ matchedBy: 1, outside: true });
    expect(v.down!.outside).toBe(false);
    expect(JSON.stringify(v)).not.toMatch(/prob|confidence|forecast/i);
  });

  it("a 24/7 tape with no session gap is one session — refused, no clock cut invented", () => {
    const bars = Array.from({ length: 200 }, (_, i) => ({ time: i * 300, open: 100, high: 101, low: 99, close: 100 }));
    const v = selectExpectedEnvelope(bars);
    expect(v.reason).toBe("TOO_FEW_SESSIONS");
    expect(v.fan).toBeNull();
  });
});

// A session whose close walks `drift` per bar from `open`, `len` bars long.
const walk = (day: number, open: number, drift: number, len = 10) =>
  Array.from({ length: len }, (_, i) => {
    const c = open + drift * i;
    return { time: day * 86400 + i * 300, open: i === 0 ? open : c - drift, high: c + 0.05, low: c - 0.05, close: c };
  });

describe("H-801 · the analogue fan — prior sessions' paths from the open, laid on today's open (2026-09-25)", () => {
  // Five prior sessions drifting −2 … +2 per bar: at step k their close − open
  // is {−2k, −k, 0, k, 2k}, so p10/p25/p50/p75/p90 (nearest rank) are exactly those.
  const prior = [-2, -1, 0, 1, 2].flatMap((d, i) => walk(i, 100, d));

  it("each column is the quantiles of close − open at that step, on today's open", () => {
    const v = selectExpectedEnvelope([...prior, ...walk(5, 300, 0, 4)]);
    const fan = v.fan!;
    expect(fan.stepSeconds).toBe(300);
    expect(fan.steps).toHaveLength(10);
    expect(fan.steps[3]).toMatchObject({ k: 3, n: 5, p10: 294, p25: 297, p50: 300, p75: 303, p90: 306 });
    expect(fan.steps[0]).toMatchObject({ p10: 300, p90: 300 });
  });

  it("it projects right of NOW: steps beyond today's newest bar come from how far the prior sessions went on", () => {
    const fan = selectExpectedEnvelope([...prior, ...walk(5, 300, 0, 4)]).fan!;
    expect(fan.nowK).toBe(3);
    expect(fan.steps.at(-1)!.k).toBeGreaterThan(fan.nowK);
  });

  it("the fan stops where fewer than three prior sessions reached the step", () => {
    const uneven = [...walk(0, 100, 1, 12), ...walk(1, 100, 1, 6), ...walk(2, 100, 1, 6), ...walk(3, 100, 1, 4)];
    const fan = selectExpectedEnvelope([...uneven, ...walk(4, 100, 0, 2)]).fan!;
    expect(fan.steps.map(s => s.n)).toEqual([4, 4, 4, 4, 3, 3]);
  });

  it("a newest close outside p10…p90 is a MARKET SURPRISE, with a count and the bar that left", () => {
    // Today: flat for 2 bars, then +3 per bar — above p90 (= +2k) from step 3 on.
    const today = walk(5, 300, 0, 3);
    const run = [3, 4].map(k => ({ time: 5 * 86400 + k * 300, open: 300, high: 300 + 3 * k + 0.05, low: 300, close: 300 + 3 * k }));
    const fan = selectExpectedEnvelope([...prior, ...today, ...run]).fan!;
    expect(fan.surprise).toMatchObject({ side: "ABOVE", k: 4, price: 312, matchedBy: 0, n: 5, leftAt: 5 * 86400 + 3 * 300 });
    expect(JSON.stringify(fan)).not.toMatch(/prob|confidence|forecast|predict/i);
  });

  it("riding inside the fan names no surprise", () => {
    expect(selectExpectedEnvelope([...prior, ...walk(5, 300, 1, 5)]).fan!.surprise).toBeNull();
  });

  it("the matched count is of sessions at least as far at the SAME step", () => {
    // Today −1.5/bar: below p25 but inside p10 → none. At −2.5/bar: below p10;
    // only the −2 drift session is not as far → 0 of 5 matched.
    expect(selectExpectedEnvelope([...prior, ...walk(5, 300, -1.5, 5)]).fan!.surprise).toBeNull();
    const s = selectExpectedEnvelope([...prior, ...walk(5, 300, -2.5, 5)]).fan!.surprise!;
    expect(s).toMatchObject({ side: "BELOW", matchedBy: 0, n: 5, leftAt: 5 * 86400 + 300 });
  });

  it("a halted prior session carries its last close forward — nothing is interpolated", () => {
    const gappy = walk(0, 100, 1, 10).filter((_, i) => i !== 4 && i !== 5);
    const fan = selectExpectedEnvelope([...gappy, ...walk(1, 100, 1), ...walk(2, 100, 1), ...walk(3, 100, 0, 2)]).fan!;
    // At steps 4 and 5 the gappy session still stands at step 3's +3.
    expect(fan.steps[5]).toMatchObject({ p10: 103, p90: 105 });
  });
});
