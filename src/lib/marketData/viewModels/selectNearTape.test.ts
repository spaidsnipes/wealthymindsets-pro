import { describe, expect, it } from "vitest";
import type { BigTradeTick } from "@/lib/bigTradeLevels";
import { selectBarTape, selectNearTape, selectPrintRawTape, sideFidelity, type NearTapeCache } from "./selectNearTape";

const tick = (timeMs: number | undefined, price = 100, buy = true): BigTradeTick =>
  ({ price, bid: buy ? 0 : 1, ask: buy ? 1 : 0, timeMs });

/** How the accumulator really fills: each flush pushes a NEWEST-FIRST batch. */
function pushBatch(arr: BigTradeTick[], times: number[]) {
  for (const t of [...times].sort((a, b) => b - a)) arr.push(tick(t, t / 1000));
}

/** Count numeric index reads on an array. */
function counted(arr: BigTradeTick[]) {
  const box = { reads: 0 };
  const proxy = new Proxy(arr, {
    get(target, prop, recv) {
      if (typeof prop === "string" && /^\d+$/.test(prop)) box.reads++;
      return Reflect.get(target, prop, recv);
    },
  });
  return { proxy, box };
}

describe("selectNearTape — the newest captured prints, exactly", () => {
  it("takes the newest ten by execution time across the two newest bars, not the array tail", () => {
    const acc = new Map<number, BigTradeTick[]>();
    const old: BigTradeTick[] = [], prev: BigTradeTick[] = [], live: BigTradeTick[] = [];
    // Keys inserted out of order: the newest bar is found by value, not position.
    acc.set(120, live); acc.set(0, old); acc.set(60, prev);
    pushBatch(old, [1000, 2000]);
    pushBatch(prev, [61_000, 62_000, 63_000]);
    pushBatch(live, [121_000, 122_000]);
    pushBatch(live, [123_000, 124_000, 125_000, 126_000, 127_000, 128_000, 129_000, 130_000]);
    live.push(tick(undefined)); // no execution time → never a row
    const vm = selectNearTape(acc, null).vm;
    expect(vm.rows.map(r => r.timeMs)).toEqual([130_000, 129_000, 128_000, 127_000, 126_000, 125_000, 124_000, 123_000, 122_000, 121_000]);
    // The tail of the live array is the OLDEST print of the last batch — a tail walk would be wrong.
    expect(live[live.length - 2].timeMs).toBe(123_000);
  });

  it("reaches into the previous bar only for what the newest bar lacks, and never the third", () => {
    const acc = new Map<number, BigTradeTick[]>();
    const old: BigTradeTick[] = [], prev: BigTradeTick[] = [], live: BigTradeTick[] = [];
    acc.set(0, old); acc.set(60, prev); acc.set(120, live);
    pushBatch(old, [5_000]);
    pushBatch(prev, [61_000, 62_000]);
    pushBatch(live, [121_000]);
    expect(selectNearTape(acc, null).vm.rows.map(r => r.timeMs)).toEqual([121_000, 62_000, 61_000]);
  });

  it("formats prices with the house formatter (sub-dollar keeps its digits)", () => {
    const acc = new Map<number, BigTradeTick[]>([[60, [tick(61_000, 0.1234), tick(61_500, 245.3)]]]);
    expect(selectNearTape(acc, null).vm.rows.map(r => r.price)).toEqual(["245.30", "0.1234"]);
  });

  it("does no work on a frame where nothing new was captured, and only reads the new prints when some were", () => {
    const acc = new Map<number, BigTradeTick[]>();
    const raw: BigTradeTick[] = [];
    pushBatch(raw, Array.from({ length: 5000 }, (_, i) => 1_000 + i));
    const { proxy, box } = counted(raw);
    acc.set(0, proxy);
    const first = selectNearTape(acc, null);
    expect(box.reads).toBeGreaterThanOrEqual(5000);

    box.reads = 0;
    const same = selectNearTape(acc, first);
    expect(same).toBe(first);
    expect(box.reads).toBe(0);

    pushBatch(raw, [900_000, 900_001, 900_002]);
    box.reads = 0;
    const grown = selectNearTape(acc, same);
    expect(box.reads).toBe(3);
    expect(grown.vm.rows[0].timeMs).toBe(900_002);
    // Exact: the incremental answer equals a cold recompute.
    expect(grown.vm.rows).toEqual(selectNearTape(acc, null).vm.rows);
  });

  it("a side guessed by tick rule or quote test is marked INFERRED, never shown as an observed initiator", () => {
    const acc = new Map<number, BigTradeTick[]>([[60, [
      { ...tick(61_000, 10, true), aggressorMethod: "TICK_RULE" },
      { ...tick(61_100, 10, false), aggressorMethod: "QUOTE_TEST" },
    ]]]);
    const vm = selectNearTape(acc, null).vm;
    expect(vm.rows.map(r => [r.fidelity, r.glyph])).toEqual([["INFERRED", "~−"], ["INFERRED", "~+"]]);
    expect(vm.fidelityNote).toBe("~ = SIDE INFERRED");
  });

  it("only a venue stamp is OBSERVED; an undisclosed method is UNKNOWN; the legend names every kind present", () => {
    const acc = new Map<number, BigTradeTick[]>([[60, [
      { ...tick(61_000), aggressorMethod: "PROVIDER" },
      { ...tick(61_100, 10, false), aggressorMethod: "MAKER_SIDE_INVERTED" },
    ]]]);
    const observed = selectNearTape(acc, null).vm;
    expect(observed.rows.map(r => r.glyph)).toEqual(["−", "+"]);
    expect(observed.fidelityNote).toBeNull();

    acc.get(60)!.push(tick(61_200), { ...tick(61_300), aggressorMethod: "NONE" }, { ...tick(61_400), aggressorMethod: "TICK_RULE" });
    const mixed = selectNearTape(acc, null).vm;
    expect(mixed.rows.slice(0, 3).map(r => [r.fidelity, r.glyph])).toEqual([["INFERRED", "~+"], ["UNKNOWN", "?+"], ["UNKNOWN", "?+"]]);
    expect(mixed.fidelityNote).toBe("~ INFERRED · ? UNKNOWN");
    expect(sideFidelity(undefined)).toBe("UNKNOWN");
  });

  it("recomputes cold when a new bar starts or the tape is reset", () => {
    const acc = new Map<number, BigTradeTick[]>([[60, [tick(61_000)]]]);
    const c1 = selectNearTape(acc, null);
    acc.set(120, [tick(121_000)]);
    const c2 = selectNearTape(acc, c1);
    expect(c2.vm.rows.map(r => r.timeMs)).toEqual([121_000, 61_000]);
    const reset = new Map<number, BigTradeTick[]>();
    const c3 = selectNearTape(reset, c2);
    expect(c3.vm.rows).toEqual([]);
    expect((c3 as NearTapeCache).acc).toBe(reset);
  });
});

describe("selectBarTape — one bar's held tape as geometry (H-501 NEAR · H-701)", () => {
  const pt = (timeMs: number, price: number, size: number, buy = true, method?: BigTradeTick["aggressorMethod"]): BigTradeTick =>
    ({ price, bid: buy ? 0 : size, ask: buy ? size : 0, timeMs, printKey: `k${timeMs}`, aggressorMethod: method });
  const opts = { barTime: 60, intervalSec: 60, maxDots: 3, withPath: true };

  it("growing the bar incrementally gives exactly the from-scratch answer, reading only the new prints", () => {
    const arr: BigTradeTick[] = [pt(60_500, 100, 1), pt(61_000, 101, 4), pt(62_000, 99, 2)];
    const c1 = selectBarTape(arr, null, opts);
    expect(selectBarTape(arr, c1, opts)).toBe(c1);
    arr.push(pt(63_000, 102, 9), pt(62_500, 98, 0.5));
    const { proxy, box } = counted(arr);
    const c2 = selectBarTape(proxy, { ...c1, arr: proxy }, opts);
    expect(box.reads).toBe(2);
    const cold = selectBarTape(arr, null, opts);
    expect(c2.vm).toEqual(cold.vm);
    expect(cold.vm.dots.map(d => d.size)).toEqual([9, 4, 2]);
  });

  it("the value area is 70% of the bar's held volume around its POC, by exact price", () => {
    const arr = [pt(60_100, 100, 10), pt(60_200, 101, 50), pt(60_300, 102, 20), pt(60_400, 103, 15), pt(60_500, 104, 5)];
    const va = selectBarTape(arr, null, opts).vm.valueArea;
    // POC 101 (50) → +102 (20) = 70/100 → 70%.
    expect(va).toEqual({ low: 101, high: 102, poc: 101 });
  });

  it("holds nothing it cannot place: no time, no price or no size is not a print", () => {
    const arr: BigTradeTick[] = [{ price: 100, bid: 0, ask: 1 }, pt(60_100, NaN, 1), pt(60_200, 100, 0), pt(60_300, 100, 1)];
    const vm = selectBarTape(arr, null, opts).vm;
    expect(vm.held).toBe(1);
    expect(vm.dots).toHaveLength(1);
  });

  it("no path unless asked (only the forming bar draws one)", () => {
    expect(selectBarTape([pt(60_100, 100, 1)], null, { ...opts, withPath: false }).vm.path).toBeNull();
  });
});

describe("selectPrintRawTape — F06B raw rows for the selected object only", () => {
  it("a print it cannot find marks nothing and lists the bar's newest", () => {
    const arr: BigTradeTick[] = Array.from({ length: 4 }, (_, i) => ({ price: 100 + i, bid: 0, ask: 1, timeMs: 60_000 + i, printKey: `p${i}` }));
    const vm = selectPrintRawTape(arr, { barTime: 60, printKey: "nope", timeMs: 1, price: 1 }, 3);
    expect(vm.rows.map(r => r.printKey)).toEqual(["p3", "p2", "p1"]);
    expect(vm.rows.some(r => r.selected)).toBe(false);
    expect(vm.sizeRank).toBeNull();
  });

  it("finds a print by time and price when it has no identity", () => {
    const arr: BigTradeTick[] = [{ price: 100, bid: 0, ask: 1, timeMs: 60_001 }, { price: 101, bid: 2, ask: 0, timeMs: 60_002 }];
    const vm = selectPrintRawTape(arr, { barTime: 60, timeMs: 60_002, price: 101 });
    expect(vm.rows[0]).toMatchObject({ selected: true, glyph: "?−", size: 2 });
    expect(vm.fidelityNote).toBe("? = SIDE UNKNOWN");
  });
});
