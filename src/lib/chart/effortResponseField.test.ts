import { describe, expect, it } from "vitest";
import { atrSeries, extendAtrSeries, effortResponseWords, FIELD_MIN_BARS, readEffortResponseField, responseColumnHeight, type FieldBar } from "./effortResponseField";

const bar = (i: number, body: number, volume: number, range = 2): FieldBar => ({
  time: 1000 + i * 60, open: 100, close: 100 + body, high: 100 + Math.max(body, 0) + range / 2, low: 100 + Math.min(body, 0) - range / 2, volume,
});
const series = (n: number) => Array.from({ length: n }, (_, i) => bar(i, i % 2 ? 1 : -1, 1000));

describe("effort → response field", () => {
  it("is SILENT with the plain reason when volume is not real (spot FX)", () => {
    const f = readEffortResponseField(series(40), 0, 39, { volumeReal: false, volumeSilenceWhy: "spot FX has none" });
    expect(f.state).toBe("SILENT");
    if (f.state === "SILENT") { expect(f.reason).toBe("NEEDS_TRADED_VOLUME"); expect(f.why).toBe("spot FX has none"); }
  });

  it("needs enough finished bars to set its own median", () => {
    const f = readEffortResponseField(series(20), 15, 19, { volumeReal: true });
    expect(f.state).toBe("SILENT");
  });

  it("separates large effort + small response from large effort + large response", () => {
    const bs = series(40);
    bs[30] = bar(30, 0.1, 5000); // heavy volume, tiny body
    bs[32] = bar(32, 3, 5000);   // heavy volume, big body
    bs[34] = bar(34, 3, 200);    // light volume, big body
    const f = readEffortResponseField(bs, 14, 39, { volumeReal: true });
    expect(f.state).toBe("DRAWN");
    if (f.state !== "DRAWN") return;
    const at = (t: number) => f.bars.find(b => b.time === t)!;
    expect(at(bs[30].time).cell).toBe("ABSORBED");
    expect(at(bs[32].time).cell).toBe("INITIATIVE");
    expect(at(bs[34].time).cell).toBe("VACUUM");
    expect(at(bs[30].time).efficiency).toBeLessThan(at(bs[32].time).efficiency);
    expect(effortResponseWords(at(bs[30].time))).toMatch(/^large effort · small response/);
  });

  it("excludes the forming bar and zero-volume bars", () => {
    const bs = series(40);
    bs[20] = { ...bs[20], volume: 0 };
    const f = readEffortResponseField(bs, 14, 39, { volumeReal: true, formingTime: bs[39].time });
    if (f.state !== "DRAWN") throw new Error("expected DRAWN");
    expect(f.bars.some(b => b.time === bs[39].time)).toBe(false);
    expect(f.bars.some(b => b.time === bs[20].time)).toBe(false);
    expect(f.bars.length).toBeGreaterThanOrEqual(FIELD_MIN_BARS);
  });

  it("response column fills its own volume bar when response is as ordinary as effort, capped", () => {
    expect(responseColumnHeight(40, { effort: 2, response: 2 })).toBeCloseTo(40);
    expect(responseColumnHeight(40, { effort: 2, response: 0.5 })).toBeCloseTo(10);
    expect(responseColumnHeight(10, { effort: 0.5, response: 10 })).toBeCloseTo(60); // cap 3 × median (20px)
    expect(responseColumnHeight(0, { effort: 1, response: 1 })).toBe(0);
  });

  it("ATR warms up over its period", () => {
    const a = atrSeries(series(20));
    expect(Number.isNaN(a[12])).toBe(true);
    expect(a[13]).toBeGreaterThan(0);
  });
});

describe("extendAtrSeries ≡ atrSeries (keel peak fix, 2026-10-07)", () => {
  it("continuing from a previous series equals the full walk — appended bars and a revised last bar", () => {
    const mk = (n: number, bump = 0) => Array.from({ length: n }, (_, i) => {
      const c = 100 + Math.sin(i / 3) * 4 + (i === n - 1 ? bump : 0);
      return { time: i, open: c - 0.5, high: c + 1 + (i % 5) * 0.3, low: c - 1 - (i % 7) * 0.2, close: c, volume: 10 };
    });
    const a = mk(200);
    const prev = atrSeries(a);
    const b = [...mk(200, 0.9).slice(0, 199), ...mk(203).slice(199)];
    expect(extendAtrSeries(prev, b)).toEqual(atrSeries(b));
    expect(extendAtrSeries(atrSeries(mk(10)), mk(30))).toEqual(atrSeries(mk(30)));
  });
});
