import { describe, it, expect } from "vitest";
import {
  classifyMoomooTicksOutcome,
  type MoomooTicksProbeInput,
} from "./moomooTicksWireStatus";
import type { MoomooTickRow } from "./moomooTicks";

const RECEIVED = 1_756_000_000_000;
const PROCESSED = 1_756_000_000_050;

const buyRow: MoomooTickRow = {
  code: "US.TSLA",
  seq: 4021,
  time: "2026-08-31 09:30:01.250",
  timestamp_ms: RECEIVED - 1_250,
  price: 248.13,
  volume: 120,
  turnover: 29775.6,
  direction: "BUY",
  type: "AUTO_MATCH",
};

const classify = (input: MoomooTicksProbeInput) =>
  classifyMoomooTicksOutcome(input, "TSLA", "LIVE", RECEIVED, PROCESSED);

describe("classifyMoomooTicksOutcome — honest visible-blocker labeling", () => {
  it("a missing bridge URL / secret is NOT CONFIGURED, never an entitlement edge", () => {
    const s = classify({ configured: false, transportReached: false });
    expect(s.label).toBe("NOT CONFIGURED");
    expect(s.receiving).toBe(false);
    expect(s.eventCount).toBe(0);
  });

  it("an unreachable bridge process is BRIDGE UNREACHABLE with the transport error", () => {
    const s = classify({
      configured: true,
      transportReached: false,
      transportError: "getaddrinfo ENOTFOUND bridge.internal",
    });
    expect(s.label).toBe("BRIDGE UNREACHABLE");
    expect(s.detail).toContain("ENOTFOUND");
  });

  it("a rejected bearer token is AUTH BLOCKED, not delayed", () => {
    const s = classify({
      configured: true,
      transportReached: true,
      httpStatus: 401,
      body: { ok: false, error: "missing or bad bearer token" },
    });
    expect(s.label).toBe("AUTH BLOCKED");
  });

  it("OpenD down behind a reachable bridge is BRIDGE UNREACHABLE (the proven edge)", () => {
    const s = classify({
      configured: true,
      transportReached: true,
      httpStatus: 502,
      body: { ok: false, error: "OpenD not reachable on 127.0.0.1:11111", source: "moomoo-opend" },
    });
    expect(s.label).toBe("BRIDGE UNREACHABLE");
    expect(s.detail).toContain("127.0.0.1:11111");
  });

  it("a failed TICKER subscribe is SUBSCRIPTION FAILED", () => {
    const s = classify({
      configured: true,
      transportReached: true,
      httpStatus: 502,
      body: { ok: false, error: "TICKER subscribe failed: RET_ERROR quota exceeded" },
    });
    expect(s.label).toBe("SUBSCRIPTION FAILED");
  });

  it("a failed get_rt_ticker is SUBSCRIPTION FAILED", () => {
    const s = classify({
      configured: true,
      transportReached: true,
      httpStatus: 502,
      body: { ok: false, error: "get_rt_ticker(US.TSLA) failed: RET_ERROR no data" },
    });
    expect(s.label).toBe("SUBSCRIPTION FAILED");
  });

  it("an ok envelope with zero usable prints is NO EVENTS RECEIVED, not a fake tick", () => {
    const s = classify({
      configured: true,
      transportReached: true,
      httpStatus: 200,
      body: { ok: true, ticks: [], count: 0, source: "moomoo-opend" },
    });
    expect(s.label).toBe("NO EVENTS RECEIVED");
    expect(s.receiving).toBe(false);
  });

  it("real executed prints normalize to RECEIVING with a truthful count", () => {
    const s = classify({
      configured: true,
      transportReached: true,
      httpStatus: 200,
      body: {
        ok: true,
        ticks: [buyRow, { ...buyRow, seq: 4022, price: 248.2, volume: 5, direction: "SELL" }],
        count: 2,
        source: "moomoo-opend",
      },
    });
    expect(s.label).toBe("RECEIVING");
    expect(s.receiving).toBe(true);
    expect(s.eventCount).toBe(2);
  });

  it("does not promote old provider prints into a current receiving tape", () => {
    const s = classify({
      configured: true,
      transportReached: true,
      httpStatus: 200,
      body: { ok: true, ticks: [{ ...buyRow, timestamp_ms: RECEIVED - 30_001 }] },
    });
    expect(s.label).toBe("STALE");
    expect(s.receiving).toBe(false);
    expect(s.eventCount).toBe(0);
  });

  it("an ok envelope whose rows are all unusable degrades to NO EVENTS RECEIVED (not RECEIVING)", () => {
    const s = classify({
      configured: true,
      transportReached: true,
      httpStatus: 200,
      body: { ok: true, ticks: [{ ...buyRow, price: 0 }, { ...buyRow, volume: 0 }] },
    });
    expect(s.label).toBe("NO EVENTS RECEIVED");
    expect(s.eventCount).toBe(0);
  });

  it("NEVER emits an entitlement label for any moomoo bridge outcome", () => {
    const outcomes: MoomooTicksProbeInput[] = [
      { configured: false, transportReached: false },
      { configured: true, transportReached: false, transportError: "timeout" },
      { configured: true, transportReached: true, httpStatus: 401, body: { ok: false, error: "bad token" } },
      { configured: true, transportReached: true, httpStatus: 502, body: { ok: false, error: "OpenD not reachable" } },
      { configured: true, transportReached: true, httpStatus: 502, body: { ok: false, error: "TICKER subscribe failed: x" } },
      { configured: true, transportReached: true, httpStatus: 200, body: { ok: true, ticks: [] } },
      { configured: true, transportReached: true, httpStatus: 200, body: { ok: true, ticks: [buyRow] } },
    ];
    for (const o of outcomes) {
      const label = classify(o).label;
      expect(label).not.toContain("ENTITLEMENT");
      expect(label).not.toBe("DELAYED BY ENTITLEMENT");
    }
  });

  it("an unclassified non-ok body is named UNKNOWN — honestly, not as success", () => {
    const s = classify({
      configured: true,
      transportReached: true,
      httpStatus: 500,
      body: { ok: false, error: "internal server error" },
    });
    expect(s.label).toBe("UNKNOWN");
    expect(s.receiving).toBe(false);
  });
});
