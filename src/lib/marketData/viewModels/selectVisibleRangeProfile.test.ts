import { describe, expect, it } from "vitest";

import selectVisibleRangeProfile, { MIN_VISIBLE_BARS } from "./selectVisibleRangeProfile";

const bars = Array.from({ length: 40 }, (_, i) => ({
  time: 1_000 + i * 60,
  open: 100 + i, high: 100.5 + i, low: 99.5 + i, close: 100.2 + i, volume: 100,
}));

describe("refusals", () => {
  it("no range, too few bars in view, no volume", () => {
    expect(selectVisibleRangeProfile(bars, null, 2_000).reason).toBe("NO_RANGE");
    expect(selectVisibleRangeProfile(bars, 3_000, 2_000).reason).toBe("NO_RANGE");
    const few = selectVisibleRangeProfile(bars, 1_000, 1_000 + (MIN_VISIBLE_BARS - 2) * 60);
    expect(few.reason).toBe("TOO_FEW_BARS_IN_VIEW");
    expect(few.barsInView).toBe(MIN_VISIBLE_BARS - 1);
    expect(selectVisibleRangeProfile(bars.map(b => ({ ...b, volume: 0 })), 1_000, 4_000).reason).toBe("NO_VOLUME");
  });
});

describe("it describes exactly what is in view", () => {
  it("only bars inside [from, to] (inclusive) contribute", () => {
    const v = selectVisibleRangeProfile(bars, 1_000 + 10 * 60, 1_000 + 19 * 60);
    expect(v.drawn).toBe(true);
    expect(v.barsInView).toBe(10);
    expect(Math.min(...v.rows.map(r => r.price))).toBeGreaterThanOrEqual(109);
    expect(Math.max(...v.rows.map(r => r.price))).toBeLessThanOrEqual(119.5);
  });

  it("MOVES when the view moves — that is the contract, not a defect", () => {
    const a = selectVisibleRangeProfile(bars, 1_000, 1_000 + 9 * 60);
    const b = selectVisibleRangeProfile(bars, 1_000 + 30 * 60, 1_000 + 39 * 60);
    expect(a.poc).not.toBe(b.poc);
  });

  it("POC inside value; quality stated", () => {
    const v = selectVisibleRangeProfile(bars, 1_000, 4_000);
    expect(v.poc!).toBeGreaterThanOrEqual(v.val!);
    expect(v.poc!).toBeLessThanOrEqual(v.vah!);
    expect(v.quality).toBe("candle-estimated");
  });
});
