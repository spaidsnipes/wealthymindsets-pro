import { describe, expect, it } from "vitest";

import type { CboeOptionsReceipt } from "@/lib/marketData/cboeDelayedOptions";
import type { ConcentrationWall } from "./selectOptionsBarrierEvidence";
import { mappedFuturesRoot, nyLocalToEpoch, selectIndexFuturesMapping } from "./selectIndexFuturesMapping";

const receipt = (spot: number, underlyingAsOf: string): CboeOptionsReceipt =>
  ({ underlying: "NDX", spot, iv30: 18, rows: [], chainAsOf: "2026-10-06 00:27:44", underlyingAsOf, source: "CBOE_DELAYED" } as unknown as CboeOptionsReceipt);
const wall = (type: ConcentrationWall["type"], strike: number): ConcentrationWall =>
  ({ type, strike, openInterest: 1000, share: 0.2, volume: null, side: "ABOVE" });

describe("New York local time → instant (EDT and EST)", () => {
  it("16:14:59 ET on 2026-10-05 (EDT) is 20:14:59Z", () => {
    expect(nyLocalToEpoch("2026-10-05T16:14:59")).toBe(Date.parse("2026-10-05T20:14:59Z") / 1000);
  });
  it("16:00 ET on 2026-01-15 (EST) is 21:00Z", () => {
    expect(nyLocalToEpoch("2026-01-15 16:00:00")).toBe(Date.parse("2026-01-15T21:00:00Z") / 1000);
  });
  it("garbage is refused", () => {
    expect(nyLocalToEpoch("yesterday")).toBeNull();
  });
});

describe("futures roots that may be mapped", () => {
  it("continuous, dated and micro symbols resolve; others do not", () => {
    expect(mappedFuturesRoot("NQ1!")).toBe("NQ");
    expect(mappedFuturesRoot("/NQZ6")).toBe("NQ");
    expect(mappedFuturesRoot("MNQ1!")).toBe("MNQ");
    expect(mappedFuturesRoot("ES1!")).toBe("ES");
    expect(mappedFuturesRoot("CL1!")).toBeNull();
    expect(mappedFuturesRoot("AAPL")).toBeNull();
  });
});

describe("index → futures mapping through a same-time basis", () => {
  const at = Date.parse("2026-10-05T20:14:59Z") / 1000;
  const barStart = at - (at % 300);
  const bars = [
    { time: barStart - 300, high: 31330, low: 31300, close: 31310 },
    { time: barStart, high: 31335, low: 31318, close: 31328.5 },   // contains the instant
    { time: barStart + 300, high: 31400, low: 31350, close: 31390 }, // later — never used
  ];

  it("uses the futures bar that CONTAINS the index's instant, maps both levels, rounds to tick", () => {
    const vm = selectIndexFuturesMapping({ futuresSymbol: "NQ1!", indexReceipt: receipt(31076.44, "2026-10-05T16:14:59"), indexWalls: [wall("CALL_OI", 31000), wall("PUT_OI", 30500)], futuresBars: bars, barSeconds: 300 });
    if (!vm.mapped) throw new Error(vm.reason);
    expect(vm.futuresAtInstant).toBe(31328.5);
    expect(vm.basis).toBeCloseTo(252.06, 2);
    expect(vm.uncertainty).toBe(17);
    expect(vm.levels).toEqual([
      { kind: "CALL_OI", indexLevel: 31000, futuresLevel: 31252, openInterest: 1000 },
      { kind: "PUT_OI", indexLevel: 30500, futuresLevel: 30752, openInterest: 1000 },
    ]);
    expect(vm.receipt).toMatch(/^IDXMAP:NDX->NQ\|BASIS:252\.06±17\.00@/);
  });

  it("no futures bar at the instant (gap / stale history) refuses — a stale basis never maps", () => {
    const vm = selectIndexFuturesMapping({ futuresSymbol: "NQ1!", indexReceipt: receipt(31076.44, "2026-10-05T16:14:59"), indexWalls: [wall("CALL_OI", 31000)], futuresBars: [bars[0]], barSeconds: 300 });
    expect(vm).toMatchObject({ mapped: false, reason: "NO_FUTURES_BAR_AT_INSTANT" });
  });

  it("refuses non-mapped futures, missing chains, missing times and empty walls", () => {
    expect(selectIndexFuturesMapping({ futuresSymbol: "CL1!", indexReceipt: null, indexWalls: [], futuresBars: bars, barSeconds: 300 })).toMatchObject({ reason: "NOT_A_MAPPED_FUTURE" });
    expect(selectIndexFuturesMapping({ futuresSymbol: "ES1!", indexReceipt: null, indexWalls: [], futuresBars: bars, barSeconds: 300 })).toMatchObject({ reason: "NO_INDEX_CHAIN", index: "SPX" });
    expect(selectIndexFuturesMapping({ futuresSymbol: "NQ1!", indexReceipt: receipt(31076, "late"), indexWalls: [wall("CALL_OI", 1)], futuresBars: bars, barSeconds: 300 })).toMatchObject({ reason: "NO_INDEX_TIME" });
    expect(selectIndexFuturesMapping({ futuresSymbol: "NQ1!", indexReceipt: receipt(31076.44, "2026-10-05T16:14:59"), indexWalls: [], futuresBars: bars, barSeconds: 300 })).toMatchObject({ reason: "NO_WALLS" });
  });
});
