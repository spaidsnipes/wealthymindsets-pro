import { describe, expect, it } from "vitest";
import type { BigTradeTick } from "@/lib/bigTradeLevels";
import { selectNearTape, type NearTapeCache } from "./selectNearTape";

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
