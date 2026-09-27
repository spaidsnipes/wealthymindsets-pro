/**
 * Garden 16 §30 — Liquidity Weather from an OBSERVED book: every stage is a
 * thing that was seen, PULLED is said only when absence is observable, and a
 * level that scrolls out of the depth window is never called anything.
 */
import { describe, expect, it } from "vitest";

import {
  ABSENCE_MS, PERSIST_MS, bookBucketStep, createBookLifecycleTracker, krakenBookPairForChart, placeBookEventsOnBars,
} from "./bookLiquidityLifecycle";
import { rankPoolsForGlass } from "./viewModels/selectLiquidityLifecycle";
import { poolSpan } from "@/lib/chart/liquidityGlassGeometry";

/** A thin bid book 100..91 (1 lot each) with an optional wall. */
const bids = (wall?: { price: number; size: number }) => {
  const rows = Array.from({ length: 10 }, (_, i) => ({ price: 100 - i, size: 1 }));
  return wall ? rows.map(r => (r.price === wall.price ? { ...r, size: wall.size } : r)) : rows;
};
const asks = Array.from({ length: 10 }, (_, i) => ({ price: 101 + i, size: 1 }));
const stages = (t: ReturnType<typeof createBookLifecycleTracker>, at = 0) => t.read(at).pools.map(p => p.events.map(e => e.stage).join(">"));

describe("observed-book liquidity lifecycle", () => {
  it("a wall APPEARS, GROWS and PERSISTS as it is seen", () => {
    const t = createBookLifecycleTracker({ step: 1, venue: "Kraken" });
    t.applyBook(0, bids({ price: 95, size: 5 }), asks);
    t.applyBook(1_000, bids({ price: 95, size: 8 }), asks);
    t.applyBook(PERSIST_MS, bids({ price: 95, size: 8 }), asks);
    const vm = t.read(PERSIST_MS);
    expect(vm.basis).toBe("OBSERVED_BOOK");
    expect(vm.venue).toBe("Kraken");
    expect(vm.pulledRefusal).toBeNull();
    expect(stages(t)).toEqual(["APPEARED>GREW>PERSISTED"]);
    expect(vm.pools[0]).toMatchObject({ side: "bid", low: 95, high: 96, volume: 8 });
  });

  it("CONSUMED only when trades inside the bucket explain the size that left", () => {
    const t = createBookLifecycleTracker({ step: 1, venue: "Kraken" });
    t.applyBook(0, bids({ price: 95, size: 6 }), asks);
    t.applyTrade(500, 95.5, 4);
    t.applyBook(1_000, bids(), asks);
    t.applyBook(1_000 + ABSENCE_MS, bids(), asks);
    expect(stages(t)).toEqual(["APPEARED>TOUCHED>CONSUMED"]);
  });

  it("PULLED when the size leaves without trading while its price is still inside the observed book", () => {
    const t = createBookLifecycleTracker({ step: 1, venue: "Kraken" });
    t.applyBook(0, bids({ price: 95, size: 6 }), asks);
    t.applyBook(1_000, bids(), asks);
    t.applyBook(1_000 + ABSENCE_MS, bids(), asks);
    expect(stages(t)).toEqual(["APPEARED>PULLED"]);
  });

  it("a flicker shorter than the absence window is not a leaving", () => {
    const t = createBookLifecycleTracker({ step: 1, venue: "Kraken" });
    t.applyBook(0, bids({ price: 95, size: 6 }), asks);
    t.applyBook(100, bids(), asks);
    t.applyBook(100 + ABSENCE_MS - 1, bids({ price: 95, size: 6 }), asks);
    t.applyBook(10_000, bids({ price: 95, size: 6 }), asks);
    expect(stages(t)).toEqual(["APPEARED"]);
  });

  it("a wall that scrolls out of the depth window is dropped with NO claim", () => {
    const t = createBookLifecycleTracker({ step: 1, venue: "Kraken" });
    t.applyBook(0, bids({ price: 91, size: 6 }), asks);
    const shifted = Array.from({ length: 10 }, (_, i) => ({ price: 110 - i, size: 1 })); // book moved up: 91 is no longer observed
    t.applyBook(1_000, shifted, asks.map(a => ({ ...a, price: a.price + 10 })));
    t.applyBook(1_000 + ABSENCE_MS, shifted, asks.map(a => ({ ...a, price: a.price + 10 })));
    expect(t.read(0).pools).toEqual([]);
  });

  it("REFILLED after a touch when size comes back", () => {
    const t = createBookLifecycleTracker({ step: 1, venue: "Kraken" });
    t.applyBook(0, bids({ price: 95, size: 5 }), asks);
    t.applyTrade(100, 95, 1);
    t.applyBook(200, bids({ price: 95, size: 7 }), asks);
    expect(stages(t)).toEqual(["APPEARED>TOUCHED>GREW>REFILLED"]);
  });

  it("an ended pool is memory on the glass, and its span ends at the leaving", () => {
    const t = createBookLifecycleTracker({ step: 1, venue: "Kraken" });
    t.applyBook(0, bids({ price: 95, size: 6 }), asks);
    t.applyBook(1_000, bids(), asks);
    t.applyBook(1_000 + ABSENCE_MS, bids(), asks);
    const vm = t.read(0);
    expect(rankPoolsForGlass(vm.pools, 100)).toEqual(["MEMORY"]);
    const span = poolSpan(vm.pools[0].events)!;
    expect(span).toMatchObject({ pulled: true, consumed: false, endTime: 1_000 });
  });

  it("events land on the bar that contains them (ms → bar seconds)", () => {
    const t = createBookLifecycleTracker({ step: 1, venue: "Kraken" });
    t.applyBook(630_000, bids({ price: 95, size: 6 }), asks); // 630 s
    const placed = placeBookEventsOnBars(t.read(0), [300, 600, 900]);
    expect(placed.pools[0].events[0].time).toBe(600);
    expect(placeBookEventsOnBars(t.read(0), []).pools).toEqual([]);
  });

  it("only USD crypto maps to a Kraken book; USDT and stocks do not", () => {
    expect(krakenBookPairForChart("BTCUSD")).toBe("BTC/USD");
    expect(krakenBookPairForChart("BTC-USD")).toBe("BTC/USD");
    expect(krakenBookPairForChart("ETH/USD")).toBe("ETH/USD");
    expect(krakenBookPairForChart("BTCUSDT")).toBeNull();
    expect(krakenBookPairForChart("TSLA")).toBeNull();
    expect(krakenBookPairForChart("NQ1!")).toBeNull();
  });

  it("the bucket is a third of the median bar range", () => {
    expect(bookBucketStep([{ high: 10, low: 7 }, { high: 10, low: 4 }, { high: 10, low: 1 }])).toBe(2);
    expect(bookBucketStep([])).toBe(0);
  });
});
