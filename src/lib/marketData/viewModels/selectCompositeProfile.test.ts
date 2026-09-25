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

describe("sessionStarts — what went into the composite, stated", () => {
  it("one start per aggregated session, oldest first, the current session excluded", async () => {
    const { default: sel } = await import("./selectCompositeProfile");
    const day = (d: number) => Array.from({ length: 6 }, (_, k) => ({ time: d * 86400 + k * 300, open: 100, high: 101 + k * 0.1, low: 99, close: 100.5, volume: 10 }));
    const vm = sel([...day(1), ...day(2), ...day(3)] as never);
    expect(vm.drawn).toBe(true);
    expect(vm.sessionStarts).toEqual([86400, 2 * 86400]);
    expect(vm.sessionStarts.length).toBe(vm.sessions);
  });
});

describe("the strata — what the composite is made of", () => {
  it("each row carries its volume from each aggregated session, oldest first, summing to the row", () => {
    // Sessions at 100, 101, 102 (each 1 wide) and the developing one at 150.
    const v = selectCompositeProfile(days(4, d => (d === 3 ? 150 : 100 + d)));
    expect(v.drawn).toBe(true);
    for (const r of v.rows) {
      expect(r.bySession).toHaveLength(v.sessions);
      const sum = r.bySession.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(r.volume, 6);
    }
    // A price only the oldest session traded carries only the oldest stratum.
    const low = v.rows.find(r => r.price < 101)!;
    expect(low.bySession[0]).toBeGreaterThan(0);
    expect(low.bySession.slice(1).every(x => x === 0)).toBe(true);
  });
});
