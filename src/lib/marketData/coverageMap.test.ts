import { describe, expect, it } from "vitest";
import { getMarketDataCapability } from "./capabilityRegistry";
import {
  canClaimRetainedCoverage,
  createChannelCoverage,
  markCoverageStale,
  observeChannel,
} from "./coverageMap";

describe("Market Channel Coverage Map", () => {
  it("starts supported foreground channels without claiming memory", () => {
    const capability = getMarketDataCapability("coinbase-client-ws", "crypto", "trade");
    const coverage = createChannelCoverage("BTC-USD", capability);

    expect(coverage.coverageState).toBe("CONNECTING");
    expect(coverage.memoryState).toBe("NO_MEMORY");
    expect(canClaimRetainedCoverage(coverage)).toBe(false);
  });

  it("records a runtime observation as session-only coverage", () => {
    const initial = createChannelCoverage(
      "BTC-USD",
      getMarketDataCapability("coinbase-client-ws", "crypto", "trade"),
    );
    const coverage = observeChannel(initial, { eventAt: 1_000, receivedAt: 1_010 });

    expect(coverage).toMatchObject({
      coverageState: "COLLECTING",
      memoryState: "SESSION_ONLY",
      observedFrom: 1_000,
      observedThrough: 1_000,
      gapCount: 0,
    });
    expect(canClaimRetainedCoverage(coverage)).toBe(false);
  });

  it("makes a known sequence gap explicit", () => {
    const initial = createChannelCoverage(
      "BTC-USD",
      getMarketDataCapability("coinbase-client-ws", "crypto", "trade"),
    );
    const coverage = observeChannel(initial, {
      eventAt: 2_000,
      receivedAt: 2_010,
      sequenceGap: true,
    });

    expect(coverage.coverageState).toBe("GAPPED");
    expect(coverage.gapCount).toBe(1);
    expect(coverage.lastGapAt).toBe(2_010);
    expect(canClaimRetainedCoverage(coverage)).toBe(false);
  });

  it("marks an observed channel stale without erasing its coverage range", () => {
    const initial = createChannelCoverage(
      "BTC-USD",
      getMarketDataCapability("coinbase-client-ws", "crypto", "trade"),
    );
    const observed = observeChannel(initial, { eventAt: 5_000, receivedAt: 5_010 });
    const stale = markCoverageStale(observed, 7_011, 2_000);

    expect(stale.coverageState).toBe("STALE");
    expect(stale.observedFrom).toBe(5_000);
    expect(stale.memoryState).toBe("SESSION_ONLY");
  });

  it("keeps unsupported channels unavailable", () => {
    const unsupported = createChannelCoverage(
      "ES-CONTINUOUS",
      getMarketDataCapability("coinbase-client-ws", "futures", "trade"),
    );

    expect(unsupported.coverageState).toBe("UNAVAILABLE");
    expect(observeChannel(unsupported, { eventAt: 1_000, receivedAt: 1_001 })).toBe(unsupported);
  });
});
