import { describe, expect, it } from "vitest";
import { getMarketDataCapability } from "./capabilityRegistry";
import { createChannelCoverage, observeChannel } from "./coverageMap";
import {
  COVERAGE_CONTINUITY_POLICY_ID,
  createCoverageContinuityRecord,
  mergeCoverageChannels,
  parseCoverageContinuityRecord,
} from "./coverageContinuity";

const observed = (count = 1) => {
  let channel = createChannelCoverage("BTC-USD", getMarketDataCapability("coinbase-client-ws", "crypto", "trade"));
  for (let index = 0; index < count; index += 1) {
    channel = observeChannel(channel, { eventAt: 1_786_335_700_000 + index, receivedAt: 1_786_335_700_010 + index });
  }
  return channel;
};

describe("Nectar coverage continuity", () => {
  it("persists bounded operational summaries without raw events", () => {
    const record = createCoverageContinuityRecord([observed(3)], 1_786_335_800_000);
    expect(record.policyId).toBe(COVERAGE_CONTINUITY_POLICY_ID);
    expect(record.channels[0]).toMatchObject({ memoryState: "SUMMARY_ONLY", observedEventCount: 3 });
    expect(JSON.stringify(record)).not.toContain("price");
    expect(JSON.stringify(record)).not.toContain("eventId");
  });

  it("restores valid summaries as stale, never as retained raw memory", () => {
    const now = 1_786_335_800_000;
    const parsed = parseCoverageContinuityRecord(JSON.stringify(createCoverageContinuityRecord([observed(2)], now)), now + 1);
    expect(parsed?.channels[0]).toMatchObject({ coverageState: "STALE", memoryState: "SUMMARY_ONLY", observedEventCount: 2 });
  });

  it("drops untrusted extra fields and rebinds rights to the current registry", () => {
    const now = 1_786_335_800_000;
    const record = createCoverageContinuityRecord([observed(2)], now);
    const malicious = JSON.parse(JSON.stringify(record));
    malicious.channels[0].price = 65_000;
    malicious.channels[0].eventId = "must-not-survive";
    malicious.channels[0].persistenceRight = "ALLOWED";
    const parsed = parseCoverageContinuityRecord(JSON.stringify(malicious), now + 1);
    expect(parsed?.channels[0]).not.toHaveProperty("price");
    expect(parsed?.channels[0]).not.toHaveProperty("eventId");
    expect(parsed?.channels[0].persistenceRight).toBe("UNKNOWN");
  });

  it("rejects expired or malformed records", () => {
    const now = 1_786_335_800_000;
    const record = createCoverageContinuityRecord([observed()], now);
    expect(parseCoverageContinuityRecord(JSON.stringify(record), record.expiresAt + 1)).toBeNull();
    expect(parseCoverageContinuityRecord("not-json", now)).toBeNull();
  });

  it("uses maxima across tabs to avoid double-counting broadcast tape", () => {
    const merged = mergeCoverageChannels([observed(5)], [observed(8)]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ observedEventCount: 8, memoryState: "SUMMARY_ONLY" });
  });
});
