import { describe, expect, it } from "vitest";
import { saneMidpoint } from "./useTastyWatchQuotes";

describe("saneMidpoint — a book's middle is a price only when the book is tight", () => {
  it("a normal equity book gives its midpoint", () => {
    expect(saneMidpoint(251.37, 251.38)).toBeCloseTo(251.375, 6);
  });
  it("the serving GLD weekend book (380.50 / 420.00) is not a price", () => {
    expect(saneMidpoint(380.5, 420)).toBeNull();
  });
  it("a crossed, one-sided or empty book is not a price", () => {
    expect(saneMidpoint(10, 9)).toBeNull();
    expect(saneMidpoint(null, 10)).toBeNull();
    expect(saneMidpoint(0, 10)).toBeNull();
  });
});
