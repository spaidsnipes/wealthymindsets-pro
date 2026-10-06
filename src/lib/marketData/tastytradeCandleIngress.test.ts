import { describe, expect, it } from "vitest";
import { ingestTastytradeCandles, tastytradeSymbolId } from "./tastytradeCandleIngress";
import { alignCanonicalBarIdentities } from "./alignCanonicalBarIdentities";
import { selectMarketStructure } from "./viewModels/selectMarketStructure";
import { selectStructureZoneObjects } from "./viewModels/selectStructureZoneObjects";

const bar = (time: number, o: number, h: number, l: number, c: number) => ({ time, open: o, high: h, low: l, close: c, volume: 10 });

describe("tastytrade candle ingress (fifth ingress)", () => {
  it("names the contract, not the chart symbol", () => {
    expect(tastytradeSymbolId("/nqz26:xcme")).toBe("TASTYTRADE:/NQZ26:XCME");
    expect(tastytradeSymbolId("  ")).toBe("");
  });

  it("mints one canonical identity per bar: contract | timeframe | open time (ms) | epoch", () => {
    const r = ingestTastytradeCandles({
      streamer: "/NQZ26:XCME", timeframe: "15m", receivedAt: 1,
      tuples: [bar(1_791_300_000, 10, 12, 9, 11), bar(1_791_300_900, 11, 13, 10, 12)],
    });
    expect(r.refused).toBe(0);
    expect(r.identities.map(i => i.barId)).toEqual([
      "TASTYTRADE:/NQZ26:XCME|15m|1791300000000|e0",
      "TASTYTRADE:/NQZ26:XCME|15m|1791300900000|e0",
    ]);
    expect(r.identities[0]).toMatchObject({ source: "tastytrade", sessionId: "SESSION_UNKNOWN", fidelity: "INDICATIVE", provenance: "REST_BACKFILL", timeframe: "15m" });
  });

  it("the same bar redelivered is the same id; broken geometry and a blank contract mint nothing", () => {
    const a = ingestTastytradeCandles({ streamer: "/ESZ26:XCME", timeframe: "5m", receivedAt: 1, tuples: [bar(100, 1, 2, 0.5, 1.5)] });
    const b = ingestTastytradeCandles({ streamer: "/ESZ26:XCME", timeframe: "5m", receivedAt: 2, tuples: [bar(100, 1, 2, 0.5, 1.5)] });
    expect(a.identities[0].barId).toBe(b.identities[0].barId);
    expect(ingestTastytradeCandles({ streamer: "/ESZ26:XCME", timeframe: "5m", receivedAt: 1, tuples: [bar(100, 1, 0.5, 2, 1.5)] }).identities).toHaveLength(0);
    expect(ingestTastytradeCandles({ streamer: "", timeframe: "5m", receivedAt: 1, tuples: [bar(100, 1, 2, 0.5, 1.5)] }).refused).toBe(1);
  });

  it("with identities the zone owner can give a futures pivot a birth bar (it refused every one before)", () => {
    // A rise, a swing high, a fall, a swing low, a rise — enough pivots for structure.
    const closes = [100, 102, 104, 106, 108, 110, 108, 106, 104, 102, 100, 102, 104, 106, 108, 110, 112, 110, 108, 106, 104, 106, 108, 110, 112, 114];
    const bars = closes.map((c, i) => bar(1_791_000_000 + i * 900, c - 0.5, c + 1, c - 1, c));
    const structure = selectMarketStructure(bars);
    const none = selectStructureZoneObjects({ structure, bars, identities: [] });
    expect(none).toHaveLength(0);
    const ingress = ingestTastytradeCandles({ streamer: "/NQZ26:XCME", timeframe: "15m", receivedAt: 1, tuples: bars });
    const aligned = alignCanonicalBarIdentities({ bars, identities: ingress.identities, acceptedSymbolIds: ["NQ1!", "TASTYTRADE:/NQZ26:XCME"], timeframe: "15m" });
    expect(aligned).toHaveLength(bars.length);
    expect(structure.measured).toBe(true);
    {
      const zones = selectStructureZoneObjects({ structure, bars, identities: aligned });
      expect(zones.length).toBeGreaterThan(0);
      expect(zones[0].object.birthBarId.startsWith("TASTYTRADE:/NQZ26:XCME|15m|")).toBe(true);
      expect(zones[0].object.objectId.startsWith("ZONE:TASTYTRADE:/NQZ26:XCME|15m|")).toBe(true);
    }
  });
});
