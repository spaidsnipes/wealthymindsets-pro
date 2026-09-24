import { describe, expect, it } from "vitest";

import type { CanonicalBarIdentity, LegacyOhlcvTuple } from "../canonicalBar";
import { REJECTED_KIND_NAMES } from "../marketObjectKinds";
import type { MarketStructureVM } from "./selectMarketStructure";
import { selectStructureZoneObjects } from "./selectStructureZoneObjects";

const bars: LegacyOhlcvTuple[] = [
  { time: 1, open: 8, high: 10, low: 7, close: 9, volume: 1 },    // swing low bar → demand 7–10
  { time: 2, open: 9, high: 14, low: 11, close: 13, volume: 1 },  // swing high bar → supply 11–14
  { time: 3, open: 12, high: 13, low: 9.5, close: 12, volume: 1 }, // dips into demand, leaves
  { time: 4, open: 12, high: 13, low: 11.5, close: 12.5, volume: 1 },
];
const identities: CanonicalBarIdentity[] = bars.map(bar => ({
  barId: `BTC|1h|${bar.time * 1000}|e0`, symbolId: "BTC", sessionId: "CONTINUOUS",
  timeframe: "1h", asOf: bar.time * 1000, receivedAt: bar.time * 1000 + 1,
  fidelity: "INDICATIVE", source: "coinbase", provenance: "REST_BACKFILL", truthEpoch: 0,
}));
const structure = (over: Partial<MarketStructureVM> = {}): MarketStructureVM => ({
  measured: true, lookback: 1, barCount: bars.length, unconfirmedBars: 1,
  confirmationLagNote: "one bar", swingHighs: [{ time: 2, price: 14 }],
  swingLows: [{ time: 1, price: 7 }], lastSwingHigh: { time: 2, price: 14 },
  lastSwingLow: { time: 1, price: 7 }, bias: "RANGE", biasNote: "range",
  insufficientNote: null, ...over,
});

describe("selectStructureZoneObjects", () => {
  it("emits one SUPPLY and one DEMAND zone spanning the swing bar's own range", () => {
    const zones = selectStructureZoneObjects({ structure: structure(), bars, identities });
    expect(zones.map(z => z.side)).toEqual(["SUPPLY", "DEMAND"]);
    const d = zones.find(z => z.side === "DEMAND")!;
    expect(d.object.kind).toBe("ZONE");
    expect([d.object.priceLow, d.object.priceHigh]).toEqual([7, 10]);
    expect(d.origin).toBe("SWING-LOW ORIGIN");
  });

  it("carries the lifecycle owner's verdict and names test bars by canonical id", () => {
    const d = selectStructureZoneObjects({ structure: structure(), bars, identities })
      .find(z => z.side === "DEMAND")!;
    expect(d.lifecycle.state).toBe("DEFENDED");
    expect(d.object.state).toBe("DEFENDED");
    expect(d.object.testBarIds).toEqual(["BTC|1h|3000|e0"]);
    expect(d.object.invalidationPrice).toBe(7);
  });

  it("never uses a rejected kind name (order block is a reading, not a kind)", () => {
    const zones = selectStructureZoneObjects({ structure: structure(), bars, identities });
    for (const z of zones) {
      expect(REJECTED_KIND_NAMES).not.toContain(z.object.kind);
      expect(z.object.objectId).not.toMatch(/ORDER/i);
    }
  });

  it("unmeasured structure or a missing identity emits nothing", () => {
    expect(selectStructureZoneObjects({ structure: structure({ measured: false }), bars, identities })).toEqual([]);
    expect(selectStructureZoneObjects({ structure: structure(), bars, identities: [] })).toEqual([]);
  });
});
