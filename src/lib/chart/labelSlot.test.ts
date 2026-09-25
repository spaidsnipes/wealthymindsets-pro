import { describe, expect, it } from "vitest";
import { nearestFreeLabelY } from "./labelSlot";

const overlaps = (ys: number[], gap = 12) =>
  ys.some((a, i) => ys.some((b, j) => i !== j && Math.abs(a - b) < gap));

describe("nearest free label row", () => {
  it("a free row is kept", () => {
    expect(nearestFreeLabelY(100, [50, 150])).toBe(100);
  });

  it("the serving smear: three labels a few px apart end on three separate rows, in price order", () => {
    // LIVING POC 229, LIVING VAL 232, then VRP POC 233 (the old rule oscillated
    // between the two and printed on both).
    const placed: number[] = [];
    for (const y of [229, 232, 233]) placed.push(nearestFreeLabelY(y, placed));
    expect(overlaps(placed)).toBe(false);
    expect(placed[0]).toBe(229);
    expect(placed[1]).toBeGreaterThan(placed[0]);
  });

  it("never crosses the label it first hit (price order holds)", () => {
    // A label just ABOVE an existing one stays above it even when below is closer to free.
    const y = nearestFreeLabelY(198, [200, 188]);
    expect(y).toBeLessThan(200);
    expect(overlaps([200, 188, y])).toBe(false);
  });

  it("a dense column still never overprints", () => {
    const placed: number[] = [];
    for (const y of [100, 101, 102, 103, 104, 105, 106]) placed.push(nearestFreeLabelY(y, placed));
    expect(overlaps(placed)).toBe(false);
  });
});
