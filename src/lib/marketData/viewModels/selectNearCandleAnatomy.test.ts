import { describe, expect, it } from "vitest";
import { nearCandleAnatomyParts } from "./selectNearCandleAnatomy";

const words = (b: { open: number; high: number; low: number; close: number }) => nearCandleAnatomyParts(b).map(p => p.word);

describe("NEAR candle anatomy — words decided on prices", () => {
  it("an open and a close that differ by cents are two words, whatever the pixels say", () => {
    const parts = nearCandleAnatomyParts({ open: 245.1, high: 245.6, low: 244.9, close: 245.3 });
    expect(parts.map(p => p.word)).toEqual(["HIGH (WICK)", "CLOSE", "OPEN", "LOW (WICK)"]);
    expect(parts.find(p => p.word === "OPEN")?.price).toBe(245.1);
    expect(parts.find(p => p.word === "CLOSE")?.price).toBe(245.3);
  });

  it("OPEN = CLOSE only when the prices are equal", () => {
    expect(words({ open: 10, high: 11, low: 9, close: 10 })).toEqual(["HIGH (WICK)", "OPEN = CLOSE", "LOW (WICK)"]);
  });

  it("no wick is named where the range ends at the body", () => {
    // Closed on its high, opened on its low: no wick either side.
    expect(words({ open: 9, high: 11, low: 9, close: 11 })).toEqual(["HIGH", "CLOSE", "OPEN", "LOW"]);
    // Down bar opened on its high: no upper wick, a real lower one.
    expect(words({ open: 11, high: 11, low: 8, close: 9 })).toEqual(["HIGH", "OPEN", "CLOSE", "LOW (WICK)"]);
  });

  it("names nothing when a price is unreadable", () => {
    expect(nearCandleAnatomyParts(null)).toEqual([]);
    expect(nearCandleAnatomyParts({ open: NaN, high: 1, low: 0, close: 1 })).toEqual([]);
  });
});
