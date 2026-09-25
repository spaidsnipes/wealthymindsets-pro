import { describe, expect, it } from "vitest";
import type { ValueMigrationVM } from "./selectValueMigration";
import { selectLivingBiography } from "./selectLivingBiography";

const vm = (points: Array<[number, number, number, number, number]>): ValueMigrationVM => ({
  version: 1, drawn: true, reason: "DRAWN", sessions: 2, quality: "candle-estimated", latestPocTravel: null,
  points: points.map(([time, poc, vah, val, session]) => ({ time, poc, vah, val, session })),
} as unknown as ValueMigrationVM);

describe("Living Profile biography", () => {
  it("reads the CURRENT session only and lists every POC move, oldest first", () => {
    const b = selectLivingBiography(vm([
      [60, 90, 95, 85, 0],            // previous session — ignored
      [120, 100, 102, 98, 1],
      [180, 100, 103, 98, 1],
      [240, 101, 104, 98, 1],
      [300, 103, 106, 99, 1],
    ]))!;
    expect(b.sessionStart).toBe(120);
    expect(b.bars).toBe(4);
    expect(b.pocPath.map(p => p.poc)).toEqual([100, 101, 103]);
    expect(b.migrations).toBe(2);
    expect(b.firstPoc).toBe(100);
    expect(b.currentPoc).toBe(103);
  });

  it("names expansion / contraction and translation from the owner's value area", () => {
    const up = selectLivingBiography(vm([[1, 100, 102, 98, 0], [2, 104, 108, 100, 0]]))!;
    expect(up.width).toBe("EXPANDED");        // 4 → 8
    expect(up.drift).toBe("TRANSLATED UP");   // midpoint 100 → 104
    const narrow = selectLivingBiography(vm([[1, 100, 104, 96, 0], [2, 100, 101, 99, 0]]))!;
    expect(narrow.width).toBe("CONTRACTED");
    expect(narrow.drift).toBe("HELD");
  });

  it("no measured movie → no biography (never an invented one)", () => {
    expect(selectLivingBiography(null)).toBeNull();
    expect(selectLivingBiography({ ...vm([]), drawn: false } as ValueMigrationVM)).toBeNull();
  });
});
