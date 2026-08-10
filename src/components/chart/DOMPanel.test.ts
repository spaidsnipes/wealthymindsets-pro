import { describe, expect, it } from "vitest";
import { buildObservedDom, deriveDomCenter } from "../../lib/marketData/domTruth";

describe("DOM ladder identity and center truth", () => {
  it("keeps the closest asks when a provider supplies a deep book", () => {
    const asks = Array.from({ length: 20 }, (_, index) => ({ price: 101 + index, size: 1 }));
    const levels = buildObservedDom([{ price: 100, size: 2 }], asks, 2);
    const shownAsks = levels.filter(level => !level.isBid).map(level => level.price);
    expect(shownAsks).toHaveLength(12);
    expect(Math.min(...shownAsks)).toBe(101);
    expect(Math.max(...shownAsks)).toBe(112);
  });

  it("derives the headline from the observed spread, not a stale quote seed", () => {
    const levels = buildObservedDom(
      [{ price: 64_762.4, size: 2 }, { price: 64_762.3, size: 1 }],
      [{ price: 64_762.6, size: 2 }, { price: 64_762.7, size: 1 }],
      2,
    );
    expect(deriveDomCenter(levels, 65_770)).toBe(64_762.5);
  });

  it("fails over to the only observed side before using a seed", () => {
    const bidOnly = buildObservedDom([{ price: 100, size: 1 }], [], 2);
    const askOnly = buildObservedDom([], [{ price: 101, size: 1 }], 2);
    expect(deriveDomCenter(bidOnly, 999)).toBe(100);
    expect(deriveDomCenter(askOnly, 999)).toBe(101);
    expect(deriveDomCenter([], 999)).toBe(999);
  });
});
