import { describe, expect, it } from "vitest";

import selectValueMigration, { MIN_SESSION_BARS } from "./selectValueMigration";

const bar = (time: number, low: number, high: number, volume = 100) => ({
  time, open: low, high, low, close: high, volume,
});

/** 10 bars balancing at 100–101, then 10 bars that migrate up to 105–106. */
function migrating() {
  const out = [];
  for (let i = 0; i < 10; i++) out.push(bar(i * 60, 100, 101));
  for (let i = 0; i < 10; i++) out.push(bar(600 + i * 60, 100 + (i + 1) * 0.5, 101 + (i + 1) * 0.5, 400));
  return out;
}

describe("refusals", () => {
  it("a window far too wide for the first bar's grid is refused, not re-bucketed", () => {
    expect(selectValueMigration([bar(0, 100, 101), bar(60, 100, 10_000_000)]).reason).toBe("RANGE_TOO_WIDE");
  });

  it("no bars, flat range, and no volume are named", () => {
    expect(selectValueMigration(null).reason).toBe("NO_BARS");
    expect(selectValueMigration([bar(0, 100, 100), bar(60, 100, 100)]).reason).toBe("FLAT_RANGE");
    expect(selectValueMigration([bar(0, 100, 101, 0), bar(60, 100, 102, 0)]).reason).toBe("NO_VOLUME");
  });
});

describe("NO LOOKAHEAD", () => {
  it("the point at bar i is unchanged by any bar after i — even one that widens the range", () => {
    const all = migrating();
    const full = selectValueMigration(all);
    for (const k of [5, 9, 12, 16]) {
      const prefix = selectValueMigration(all.slice(0, k));
      expect(full.points.slice(0, prefix.points.length)).toEqual(prefix.points);
    }
    // A far outlier bar at the end must not re-bucket anything before it.
    const spiked = selectValueMigration([...all, bar(20 * 60 + 600, 90, 120, 1)]);
    expect(spiked.points.slice(0, full.points.length)).toEqual(full.points);
  });

  it("the first MIN_SESSION_BARS - 1 bars of a session draw no point", () => {
    const v = selectValueMigration(migrating());
    expect(v.points[0].time).toBe((MIN_SESSION_BARS - 1) * 60);
  });
});

describe("migration", () => {
  it("POC migrates up when heavier volume is accepted higher", () => {
    const v = selectValueMigration(migrating());
    const first = v.points[0];
    const last = v.points[v.points.length - 1];
    expect(last.poc).toBeGreaterThan(first.poc);
    expect(v.latestPocTravel!).toBeGreaterThan(0);
  });

  it("value area always brackets the POC", () => {
    for (const p of selectValueMigration(migrating()).points) {
      expect(p.val).toBeLessThanOrEqual(p.poc);
      expect(p.vah).toBeGreaterThanOrEqual(p.poc);
    }
  });

  it("a long gap starts a new session and value does not carry over", () => {
    const day2 = [0, 1, 2, 3, 4].map(i => bar(100_000 + i * 60, 108, 109));
    const v = selectValueMigration([...migrating(), ...day2]);
    expect(v.sessions).toBe(2);
    const s2 = v.points.filter(p => p.session === 1);
    expect(s2.length).toBe(5 - (MIN_SESSION_BARS - 1));
    for (const p of s2) expect(p.poc).toBeGreaterThanOrEqual(108);
  });

  it("is order-independent (input is sorted by time)", () => {
    const a = selectValueMigration(migrating());
    const b = selectValueMigration([...migrating()].reverse());
    expect(b.points).toEqual(a.points);
  });
});
