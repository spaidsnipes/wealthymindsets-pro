/**
 * TPO's laws. The one this file exists for: TIME, NOT SIZE — no volume and no
 * aggressor side can move a single count.
 */

import { describe, expect, it } from "vitest";

import selectTpoProfile, { MIN_TPO_PERIODS, type TpoBarInput } from "./selectTpoProfile";

const bar = (time: number, low: number, high: number): TpoBarInput => ({ time, low, high });

/** Ten bars, all overlapping 100–101, two excursions up to 104 and one down to 97. */
function balanced(): TpoBarInput[] {
  const out: TpoBarInput[] = [];
  for (let i = 0; i < 10; i++) out.push(bar(1_000 + i * 60, 100, 101));
  out.push(bar(1_600, 101, 104));
  out.push(bar(1_660, 97, 100));
  return out;
}

describe("the silences stay distinct", () => {
  it("no bars, too few periods and a flat range are three different refusals", () => {
    expect(selectTpoProfile(null).reason).toBe("NO_BARS");
    expect(selectTpoProfile([]).reason).toBe("NO_BARS");
    const few = Array.from({ length: MIN_TPO_PERIODS - 1 }, (_, i) => bar(i, 100, 101));
    const r = selectTpoProfile(few);
    expect(r.reason).toBe("TOO_FEW_PERIODS");
    expect(r.periods).toBe(MIN_TPO_PERIODS - 1);
    const flat = Array.from({ length: MIN_TPO_PERIODS }, (_, i) => bar(i, 100, 100));
    expect(selectTpoProfile(flat).reason).toBe("FLAT_RANGE");
  });

  it("a refusal paints nothing and claims no level", () => {
    const r = selectTpoProfile([]);
    expect(r.drawn).toBe(false);
    expect(r.rows).toEqual([]);
    expect(r.poc).toBeNull();
    expect(r.vah).toBeNull();
    expect(r.val).toBeNull();
  });

  it("malformed bars are dropped, not counted", () => {
    const bars = [...balanced(), { time: 9, high: NaN, low: 1 }, { time: 9, high: 1, low: 2 }];
    expect(selectTpoProfile(bars).periods).toBe(12);
  });
});

describe("the distribution", () => {
  it("POC sits where the most periods overlapped", () => {
    const r = selectTpoProfile(balanced());
    expect(r.drawn).toBe(true);
    expect(r.poc).not.toBeNull();
    expect(r.poc!).toBeGreaterThanOrEqual(100);
    expect(r.poc!).toBeLessThanOrEqual(101);
    const poc = r.rows.find(x => x.isPoc)!;
    expect(poc.share).toBe(1);
    expect(r.rows.filter(x => x.isPoc)).toHaveLength(1);
  });

  it("value area brackets the POC and holds at least 70% of TPOs", () => {
    const r = selectTpoProfile(balanced());
    expect(r.val!).toBeLessThanOrEqual(r.poc!);
    expect(r.vah!).toBeGreaterThanOrEqual(r.poc!);
    const inside = r.rows.filter(x => x.insideValueArea).reduce((s, x) => s + x.count, 0);
    expect(inside / r.totalTpo).toBeGreaterThanOrEqual(0.7);
  });

  it("excursions touched once are single prints; the extremes are tails, not singles", () => {
    const r = selectTpoProfile(balanced());
    const singles = r.rows.filter(x => x.single);
    expect(singles.length).toBe(r.singlePrintCount);
    expect(singles.length).toBeGreaterThan(0);
    const top = r.rows[r.rows.length - 1];
    const bottom = r.rows[0];
    expect(top.single).toBe(false);
    expect(bottom.single).toBe(false);
    for (const s of singles) expect(s.count).toBe(1);
  });

  it("rows are ascending real grid prices with shares in [0,1]", () => {
    const r = selectTpoProfile(balanced());
    for (let i = 1; i < r.rows.length; i++) expect(r.rows[i].price).toBeGreaterThan(r.rows[i - 1].price);
    for (const row of r.rows) {
      expect(row.share).toBeGreaterThan(0);
      expect(row.share).toBeLessThanOrEqual(1);
      // On the grid: price is an integer number of ticks.
      expect(Math.abs(row.price / r.tickSize - Math.round(row.price / r.tickSize))).toBeLessThan(1e-6);
    }
  });

  it("asOf is the last period counted, and the period is stated", () => {
    const r = selectTpoProfile(balanced());
    expect(r.asOf).toBe(1_660);
    expect(r.periodNote.length).toBeGreaterThan(0);
  });

  it("is deterministic and order-independent", () => {
    const a = selectTpoProfile(balanced());
    const b = selectTpoProfile([...balanced()].reverse());
    expect(b.rows).toEqual(a.rows);
    expect(b.poc).toBe(a.poc);
  });

  it("TIME, NOT SIZE: extra fields such as volume cannot move a count", () => {
    const withVolume = balanced().map((b, i) => ({ ...b, volume: i === 10 ? 1e9 : 1 }));
    expect(selectTpoProfile(withVolume).rows).toEqual(selectTpoProfile(balanced()).rows);
  });

  it("caps the grid on a pathological range", () => {
    const bars = Array.from({ length: 20 }, (_, i) => bar(i, 0.0001, 100_000));
    const r = selectTpoProfile(bars);
    expect(r.rows.length).toBeLessThanOrEqual(400);
  });
});
