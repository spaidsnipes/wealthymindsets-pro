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
    expect(selectExpectedEnvelope(bars).reason).toBe("TOO_FEW_SESSIONS");
  });
});
