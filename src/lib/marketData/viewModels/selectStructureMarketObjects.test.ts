import { describe, expect, it } from "vitest";

import type { CanonicalBarIdentity, LegacyOhlcvTuple } from "../canonicalBar";
import type { MarketStructureVM } from "./selectMarketStructure";
import { selectStructureMarketObjects } from "./selectStructureMarketObjects";

const bars: LegacyOhlcvTuple[] = [
  { time: 1, open: 8, high: 10, low: 7, close: 9, volume: 1 },
  { time: 2, open: 9, high: 12, low: 8, close: 11, volume: 1 },
  { time: 3, open: 10, high: 11, low: 9, close: 10, volume: 1 },
];
const identities: CanonicalBarIdentity[] = bars.map(bar => ({
  barId: `BTC|1h|${bar.time * 1000}|e0`, symbolId: "BTC", sessionId: "CONTINUOUS",
  timeframe: "1h", asOf: bar.time * 1000, receivedAt: bar.time * 1000 + 1,
  fidelity: "INDICATIVE", source: "coinbase", provenance: "REST_BACKFILL", truthEpoch: 0,
}));
const structure = (over: Partial<MarketStructureVM> = {}): MarketStructureVM => ({
  measured: true, lookback: 1, barCount: bars.length, unconfirmedBars: 1,
  confirmationLagNote: "one bar", swingHighs: [{ time: 2, price: 12 }],
  swingLows: [{ time: 1, price: 7 }], lastSwingHigh: { time: 2, price: 12 },
  lastSwingLow: { time: 1, price: 7 }, bias: "RANGE", biasNote: "range",
  insufficientNote: null, ...over,
});

describe("selectStructureMarketObjects", () => {
  it("publishes only real confirmed untouched levels with canonical birth identity", () => {
    const result = selectStructureMarketObjects({ structure: structure(), bars, identities });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      objectId: "LEVEL:BTC|1h|2000|e0:HIGH", kind: "LEVEL", priceLow: 12,
      priceHigh: 12, birthBarId: "BTC|1h|2000|e0", state: "ALIVE",
      fidelityAtBirth: "INDICATIVE", asOf: 3000,
    });
    expect(result[0]).not.toHaveProperty("open");
    expect(result[0]).not.toHaveProperty("close");
  });

  it("refuses a pivot with no exact canonical identity", () => {
    expect(selectStructureMarketObjects({
      structure: structure(), bars, identities: identities.filter(item => item.asOf !== 2000),
    }).some(object => object.objectId.endsWith(":HIGH"))).toBe(false);
  });

  it("refuses a later-touched level instead of inventing lifecycle state", () => {
    const touched = [...bars, { time: 4, open: 11, high: 13, low: 11, close: 12, volume: 1 }];
    expect(selectStructureMarketObjects({ structure: structure(), bars: touched, identities })
      .some(object => object.objectId.endsWith(":HIGH"))).toBe(false);
  });

  it("refuses the entire reading when structure is not measured", () => {
    expect(selectStructureMarketObjects({
      structure: structure({ measured: false }), bars, identities,
    })).toEqual([]);
  });
});

