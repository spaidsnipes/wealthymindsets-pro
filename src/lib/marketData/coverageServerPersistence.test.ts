import { describe, expect, it } from "vitest";
import { createCoverageContinuityRecord } from "./coverageContinuity";
import { getMarketDataCapability } from "./capabilityRegistry";
import { createChannelCoverage, observeChannel } from "./coverageMap";
import {
  continuityRecordToRpcChannels,
  databaseRowsToContinuityRecord,
} from "./coverageServerPersistence";

function record() {
  let channel = createChannelCoverage(
    "BTC-USD",
    getMarketDataCapability("coinbase-client-ws", "crypto", "trade"),
  );
  channel = observeChannel(channel, {
    eventAt: 1_786_335_700_000,
    receivedAt: 1_786_335_700_020,
  });
  return createCoverageContinuityRecord([channel], 1_786_335_800_000);
}

describe("server coverage persistence", () => {
  it("sends only allow-listed operational fields to the database RPC", () => {
    const channels = continuityRecordToRpcChannels(record());
    expect(channels[0]).toMatchObject({
      instrument_id: "BTC-USD",
      channel: "trade",
      observed_event_count: 1,
      persistence_right: "UNKNOWN",
    });
    expect(JSON.stringify(channels)).not.toContain("price");
    expect(JSON.stringify(channels)).not.toContain("eventId");
  });

  it("revalidates database rows against the current capability registry", () => {
    const row = continuityRecordToRpcChannels(record())[0];
    const restored = databaseRowsToContinuityRecord([{ ...row, persistence_right: "ALLOWED" }], 1_786_335_900_000);
    expect(restored?.channels[0]).toMatchObject({
      persistenceRight: "UNKNOWN",
      memoryState: "SUMMARY_ONLY",
      coverageState: "STALE",
    });
  });

  it("rejects payload-shaped or unsupported database rows", () => {
    const row = continuityRecordToRpcChannels(record())[0];
    const malformed = { ...row, provider_path: "unreviewed-feed", price: 65_000 };
    expect(databaseRowsToContinuityRecord([malformed], 1_786_335_900_000)?.channels).toEqual([]);
  });
});
