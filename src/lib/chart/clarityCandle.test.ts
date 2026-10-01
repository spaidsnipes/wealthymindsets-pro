import { describe, expect, it } from "vitest";

import { clarityBodyAlpha, readClarity, truthGaps } from "./clarityCandle";

const bar = (time: number, open: number, high: number, low: number, close: number) => ({ time, open, high, low, close });

describe("Clarity Candle — the candle's own decision, from its own OHLC", () => {
  it("a full-range body is fully decided; a doji is not", () => {
    expect(readClarity(bar(1, 10, 12, 10, 12)).efficiency).toBe(1);
    expect(readClarity(bar(1, 11, 12, 10, 11)).efficiency).toBe(0);
    expect(readClarity(bar(1, 11, 11, 11, 11)).efficiency).toBeNull();
  });

  it("names the dominant rejection wick, and only when it dominates", () => {
    expect(readClarity(bar(1, 10, 14, 9.8, 10.4)).wick).toBe("UPPER_REJECTION");
    expect(readClarity(bar(1, 13.6, 14, 10, 14)).wick).toBe("LOWER_REJECTION");
    expect(readClarity(bar(1, 10, 11, 9.5, 10.5)).wick).toBe("BALANCED");
  });

  it("marks real gaps and when a later bar fills them", () => {
    const gaps = truthGaps([
      bar(1, 10, 11, 9, 10.5),
      bar(2, 12, 13, 11.5, 12.5), // gap up 11 → 11.5
      bar(3, 12.5, 13, 12, 12.2),
      bar(4, 12, 12.1, 10.9, 11), // trades back to 11: filled
    ]);
    expect(gaps).toEqual([{ time: 2, direction: "UP", low: 11, high: 11.5, filledAt: 4 }]);
  });

  it("overlapping bars are not gaps", () => {
    expect(truthGaps([bar(1, 10, 11, 9, 10.5), bar(2, 11, 12, 10.9, 11.5)])).toEqual([]);
  });

  it("body alpha has a visibility floor and never a flat slab", () => {
    expect(clarityBodyAlpha(0)).toBeCloseTo(0.14);
    expect(clarityBodyAlpha(null)).toBeCloseTo(0.14);
    expect(clarityBodyAlpha(1)).toBeCloseTo(0.92);
  });
});
