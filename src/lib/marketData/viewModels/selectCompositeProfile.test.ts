import { describe, expect, it } from "vitest";

import selectCompositeProfile, { MAX_COMPOSITE_SESSIONS } from "./selectCompositeProfile";

const bar = (time: number, low: number, high: number, volume = 100) => ({
  time, open: low, high, low, close: high, volume,
});

function days(n: number, baseFor = (d: number) => 100 + d) {
  const out = [];
  for (let d = 0; d < n; d++) {
    for (let i = 0; i < 10; i++) out.push(bar(d * 100_000 + i * 60, baseFor(d), baseFor(d) + 1));
  }
  return out;
}

describe("refusals", () => {
  it("no bars, one session only, and no volume are named", () => {
    expect(selectCompositeProfile(null).reason).toBe("NO_BARS");
    expect(selectCompositeProfile(days(1)).reason).toBe("NO_COMPLETED_SESSION");
    expect(selectCompositeProfile(days(2).map(b => ({ ...b, volume: 0 }))).reason).toBe("NO_VOLUME");
  });
});

describe("the composite", () => {
  it("includes ONLY completed sessions — the developing one is excluded", () => {
    // Today (day 2) trades far away at 150; the composite must not see it.
    const bars = days(3, d => (d === 2 ? 150 : 100 + d));
    const v = selectCompositeProfile(bars);
    expect(v.drawn).toBe(true);
    expect(v.sessions).toBe(2);
    expect(v.bars).toBe(20);
    expect(Math.max(...v.rows.map(r => r.price))).toBeLessThan(150);
    expect(v.asOf).toBe(1 * 100_000 + 9 * 60);
  });

  it("caps at MAX_COMPOSITE_SESSIONS completed sessions, newest kept", () => {
    const v = selectCompositeProfile(days(MAX_COMPOSITE_SESSIONS + 3));
    expect(v.sessions).toBe(MAX_COMPOSITE_SESSIONS);
    // The oldest two completed sessions (100, 101) fall outside the window.
    expect(Math.min(...v.rows.map(r => r.price))).toBeGreaterThanOrEqual(102);
  });

  it("POC inside value; shares in (0,1]; quality stated", () => {
    const v = selectCompositeProfile(days(3));
    expect(v.poc!).toBeGreaterThanOrEqual(v.val!);
    expect(v.poc!).toBeLessThanOrEqual(v.vah!);
    for (const r of v.rows) { expect(r.share).toBeGreaterThan(0); expect(r.share).toBeLessThanOrEqual(1); }
    expect(v.quality).toBe("candle-estimated");
  });
});
