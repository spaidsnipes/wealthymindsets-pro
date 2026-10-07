import { describe, expect, it } from "vitest";
import { readCrossCandleWisdom } from "./crossCandleWisdom";
import type { Keel } from "./barDeltaKeel";
import type { EffortResponseBar } from "./effortResponseField";

const keel = (time: number, ratio: number, failed: boolean): Keel => ({ time, ratio, delta: Math.round(ratio * 100), basis: "SIDES", failed, change: null });
const er = (time: number, effort: number, efficiency: number): EffortResponseBar =>
  ({ time, volume: effort * 1000, effort, responseAtr: effort * efficiency * 0.5, response: effort * efficiency, efficiency, cell: "ORDINARY", up: true });

describe("cross-candle wisdom (§17) — one line, only from a real evidence object", () => {
  it("is silent with no evidence", () => {
    expect(readCrossCandleWisdom({})).toBeNull();
  });

  it("names failed sell aggression on the newest bars, with provenance", () => {
    const w = readCrossCandleWisdom({ keels: [keel(0, 0.3, false), keel(300, -0.5, true)], newestClosedTime: 300, barSec: 300 });
    expect(w?.text).toBe("SELL AGGRESSION FAILED TO DISPLACE");
    expect(w?.provenance).toMatch(/^Delta Keel · provider bar sides · bar 300/);
  });

  it("an old failure is history, not news", () => {
    expect(readCrossCandleWisdom({ keels: [keel(0, -0.5, true)], newestClosedTime: 3000, barSec: 300 })).toBeNull();
  });

  it("reads effort increasing while response weakens across contiguous bars", () => {
    const f = [er(0, 0.8, 1.2), er(60, 1.0, 1.0), er(120, 1.3, 0.8), er(180, 1.6, 0.6), er(240, 2.0, 0.4)];
    expect(readCrossCandleWisdom({ field: f, barSec: 60 })?.text).toBe("EFFORT INCREASING — RESPONSE WEAKENING");
    const gapped = f.map((b, i) => ({ ...b, time: i * 600 }));
    expect(readCrossCandleWisdom({ field: gapped, barSec: 60 })).toBeNull();
  });

  it("value migration needs half an ATR of POC travel", () => {
    expect(readCrossCandleWisdom({ valueTravel: { travel: 6, atr: 10, time: 1 } })?.text).toBe("VALUE MIGRATING HIGHER");
    expect(readCrossCandleWisdom({ valueTravel: { travel: -2, atr: 10, time: 1 } })).toBeNull();
  });

  it("a fresh failure outranks a divergence", () => {
    const f = [er(0, 0.8, 1.2), er(60, 1.0, 1.0), er(120, 1.3, 0.8), er(180, 1.6, 0.6), er(240, 2.0, 0.4)];
    expect(readCrossCandleWisdom({ field: f, keels: [keel(240, 0.4, true)], newestClosedTime: 240, barSec: 60 })?.kind).toBe("FAILED_AGGRESSION");
  });
});
