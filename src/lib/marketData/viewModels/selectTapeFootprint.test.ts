import { describe, expect, it } from "vitest";
import { selectTapeFootprint } from "./selectTapeFootprint";

const acc = (rows: [number, number, number, number][]) => {
  const m = new Map<number, Map<number, { bid: number; ask: number }>>();
  for (const [bar, price, ask, bid] of rows) {
    if (!m.has(bar)) m.set(bar, new Map());
    m.get(bar)!.set(price, { ask, bid });
  }
  return m;
};

describe("selectTapeFootprint — buy and sell by price from the heard tape", () => {
  it("buckets every sided level into rows, highest price first, with totals", () => {
    const vm = selectTapeFootprint(acc([[60, 100, 5, 1], [60, 109, 0, 4], [120, 104.5, 2, 2]]), 50, 2)!;
    expect(vm.rows).toHaveLength(2);
    expect(vm.rows[0].priceLo).toBeGreaterThan(vm.rows[1].priceLo);
    expect(vm.rows[0]).toMatchObject({ buy: 2, sell: 6 });
    expect(vm.rows[1]).toMatchObject({ buy: 5, sell: 1 });
    expect(vm).toMatchObject({ buy: 7, sell: 7, sinceSec: 50 });
  });
  it("no sided prints, or no 'since', → no footprint (never an empty picture of a balanced tape)", () => {
    expect(selectTapeFootprint(acc([[60, 100, 0, 0]]), 50)).toBeNull();
    expect(selectTapeFootprint(acc([[60, 100, 1, 0]]), null)).toBeNull();
  });
  it("one price only → one row", () => {
    expect(selectTapeFootprint(acc([[60, 100, 1, 2]]), 1)!.rows).toEqual([{ priceLo: 100, priceHi: 100, buy: 1, sell: 2 }]);
  });
});
