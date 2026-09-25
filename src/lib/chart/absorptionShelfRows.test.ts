import { describe, expect, it } from "vitest";
import { absorptionShelfRows, shelfRowCount, SHELF_ROWS_MAX } from "./absorptionShelfRows";

const zone = { startTime: 100, endTime: 400, priceLo: 10, priceHi: 14 };

describe("absorptionShelfRows — FL-06 ① / F06A row blocks", () => {
  it("cuts the owner's own range into equal rows, high first, ending exactly on its edges", () => {
    const rows = absorptionShelfRows(zone, [{ time: 100, high: 14, low: 10 }], 4);
    expect(rows.map(r => [r.hi, r.lo])).toEqual([[14, 13], [13, 12], [12, 11], [11, 10]]);
  });

  it("a row's runs are the consecutive shelf bars whose traded range reached it", () => {
    const bars = [
      { time: 100, high: 14, low: 12.5 }, // top two rows
      { time: 200, high: 13.5, low: 10 }, // all rows
      { time: 300, high: 11.5, low: 10 }, // bottom two rows
      { time: 400, high: 14, low: 13.2 }, // top row only
    ];
    const rows = absorptionShelfRows(zone, bars, 4);
    // Top row (13..14): bars 100, 200 then a gap at 300, then 400.
    expect(rows[0]!.runs).toEqual([
      { fromTime: 100, toTime: 200, bars: 2 },
      { fromTime: 400, toTime: 400, bars: 1 },
    ]);
    // Bottom row (10..11): bars 200, 300.
    expect(rows[3]!.runs).toEqual([{ fromTime: 200, toTime: 300, bars: 2 }]);
  });

  it("uses only the zone's own bars — a bar outside the run never extends a row", () => {
    const rows = absorptionShelfRows(zone, [
      { time: 50, high: 14, low: 10 },
      { time: 200, high: 14, low: 10 },
      { time: 500, high: 14, low: 10 },
    ], 2);
    for (const r of rows) expect(r.runs).toEqual([{ fromTime: 200, toTime: 200, bars: 1 }]);
  });

  it("draws nothing it cannot place: no bars, a flat or non-finite range", () => {
    expect(absorptionShelfRows(zone, [], 4)).toEqual([]);
    expect(absorptionShelfRows({ ...zone, priceHi: 10 }, [{ time: 100, high: 10, low: 10 }], 4)).toEqual([]);
    expect(absorptionShelfRows({ ...zone, priceHi: Number.NaN }, [{ time: 100, high: 10, low: 10 }], 4)).toEqual([]);
  });

  it("row count is a pixel resolution, bounded 1..MAX", () => {
    expect(shelfRowCount(0)).toBe(1);
    expect(shelfRowCount(5)).toBe(1);
    expect(shelfRowCount(24)).toBe(4);
    expect(shelfRowCount(10_000)).toBe(SHELF_ROWS_MAX);
    expect(absorptionShelfRows(zone, [{ time: 100, high: 14, low: 10 }], 99)).toHaveLength(SHELF_ROWS_MAX);
  });
});
