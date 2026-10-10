import { describe, expect, it } from "vitest";
import { mergeIntoBands, rowsPerBand, PROFILE_ROW_MIN_PX, type DisplayRowIn } from "./profileDisplayBands";

const row = (price: number, share: number, extra: Partial<DisplayRowIn> = {}): DisplayRowIn => ({
  price, share, isPoc: false, insideValueArea: false, ...extra,
});

describe("rowsPerBand", () => {
  it("merges just enough rows to reach the floor", () => {
    expect(PROFILE_ROW_MIN_PX).toBe(4);
    expect(rowsPerBand(2, 4)).toBe(2);
    expect(rowsPerBand(1.5, 4)).toBe(3);
    expect(rowsPerBand(5, 4)).toBe(1);
  });
  it("never divides by nothing", () => {
    expect(rowsPerBand(0, 4)).toBe(1);
    expect(rowsPerBand(Number.NaN, 4)).toBe(1);
  });
});

describe("mergeIntoBands", () => {
  it("returns the profile row for row when no merge is needed", () => {
    const rows = [row(3, 0.5), row(1, 1, { isPoc: true }), row(2, 0.25)];
    const b = mergeIntoBands(rows, 1);
    expect(b.map(x => x.lo)).toEqual([1, 2, 3]);
    expect(b.map(x => x.share)).toEqual([1, 0.25, 0.5]);
    expect(b[0].isPoc).toBe(true);
  });

  it("sums volume per band and re-normalises against the heaviest band", () => {
    const b = mergeIntoBands([row(1, 0.2), row(2, 0.2), row(3, 1), row(4, 0.6)], 2);
    expect(b).toHaveLength(2);
    expect(b[0]).toMatchObject({ lo: 1, hi: 2, rows: 2 });
    expect(b[1]).toMatchObject({ lo: 3, hi: 4, rows: 2, share: 1 });
    expect(b[0].share).toBeCloseTo(0.4 / 1.6, 10);
  });

  it("keeps the POC flag on the band that holds it", () => {
    const b = mergeIntoBands([row(1, 0.1), row(2, 1, { isPoc: true }), row(3, 0.3)], 2);
    expect(b[0].isPoc).toBe(true);
    expect(b[1].isPoc).toBe(false);
  });

  it("calls a band value only when every row in it is value — an edge band reads as tail", () => {
    const b = mergeIntoBands([
      row(1, 0.1), row(2, 0.5, { insideValueArea: true }),
      row(3, 0.9, { insideValueArea: true }), row(4, 0.8, { insideValueArea: true }),
    ], 2);
    expect(b[0].insideValueArea).toBe(false);
    expect(b[1].insideValueArea).toBe(true);
  });

  it("invents nothing: total rows carried equals rows given, a short last band is kept", () => {
    const rows = [1, 2, 3, 4, 5].map(p => row(p, p / 5));
    const b = mergeIntoBands(rows, 2);
    expect(b.reduce((s, x) => s + x.rows, 0)).toBe(5);
    expect(b[b.length - 1]).toMatchObject({ lo: 5, hi: 5, rows: 1 });
  });

  it("drops non-finite rows and survives an empty profile", () => {
    expect(mergeIntoBands([], 3)).toEqual([]);
    expect(mergeIntoBands([row(Number.NaN, 1), row(1, 1)], 2)).toHaveLength(1);
  });
});
