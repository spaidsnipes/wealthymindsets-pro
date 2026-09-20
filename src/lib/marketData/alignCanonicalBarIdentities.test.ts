import { describe, expect, it } from "vitest";

import type { CanonicalBarIdentity, LegacyOhlcvTuple } from "./canonicalBar";
import { alignCanonicalBarIdentities } from "./alignCanonicalBarIdentities";

const candle = (time: number): LegacyOhlcvTuple => ({
  time, open: 1, high: 2, low: 1, close: 2, volume: 3,
});

const identity = (over: Partial<CanonicalBarIdentity> = {}): CanonicalBarIdentity => ({
  barId: "BTC|1h|1000000|e0",
  symbolId: "BTC",
  sessionId: "CONTINUOUS",
  timeframe: "1h",
  asOf: 1_000_000,
  receivedAt: 1_000_100,
  fidelity: "INDICATIVE",
  source: "coinbase",
  provenance: "REST_BACKFILL",
  truthEpoch: 0,
  ...over,
});

describe("alignCanonicalBarIdentities", () => {
  it("preserves exact canonical identity for visible renderer seconds", () => {
    expect(alignCanonicalBarIdentities({
      bars: [candle(1000)], identities: [identity()], acceptedSymbolIds: ["BTC"], timeframe: "1h",
    })).toEqual([identity()]);
  });

  it("refuses a different symbol, timeframe, or filtered-out candle", () => {
    const result = alignCanonicalBarIdentities({
      bars: [candle(1000)],
      identities: [
        identity({ symbolId: "ETH" }),
        identity({ timeframe: "5m" }),
        identity({ asOf: 2_000_000, barId: "BTC|1h|2000000|e0" }),
      ],
      acceptedSymbolIds: ["BTC"],
      timeframe: "1h",
    });
    expect(result).toEqual([]);
  });

  it("refuses two identities at one renderer instant instead of choosing a past", () => {
    const result = alignCanonicalBarIdentities({
      bars: [candle(1000)],
      identities: [identity(), identity({ barId: "BTC|1h|1000000|e1", truthEpoch: 1 })],
      acceptedSymbolIds: ["BTC"],
      timeframe: "1h",
    });
    expect(result).toEqual([]);
  });

  it("returns none for a noncanonical fallback", () => {
    expect(alignCanonicalBarIdentities({
      bars: [candle(1000)], identities: [], acceptedSymbolIds: ["BTC"], timeframe: "1h",
    })).toEqual([]);
  });
});
