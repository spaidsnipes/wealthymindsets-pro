import { describe, it, expect } from "vitest";
import {
  normalizeMoomooTick,
  normalizeMoomooTicksEnvelope,
  MOOMOO_TICK_NORMALIZATION_VERSION,
  type MoomooTickRow,
} from "./moomooTicks";
import { MarketEventGuard, MARKET_EVENT_SCHEMA_VERSION } from "../marketEvent";

const RECEIVED = 1_756_000_000_000;
const PROCESSED = 1_756_000_000_050;
const PROVIDER_TS = RECEIVED - 1_250;

const buyRow: MoomooTickRow = {
  code: "US.TSLA",
  seq: 4021,
  time: "2026-08-31 09:30:01.250",
  timestamp_ms: PROVIDER_TS,
  price: 248.13,
  volume: 120,
  turnover: 29775.6,
  direction: "BUY",
  type: "AUTO_MATCH",
};

describe("normalizeMoomooTick", () => {
  it("maps a real executed print to a canonical TRADE event, preserving provider fields", () => {
    const e = normalizeMoomooTick(buyRow, "TSLA", "LIVE", RECEIVED, PROCESSED)!;
    expect(e).not.toBeNull();
    expect(e.schemaVersion).toBe(MARKET_EVENT_SCHEMA_VERSION);
    expect(e.normalizationVersion).toBe(MOOMOO_TICK_NORMALIZATION_VERSION);
    expect(e.eventType).toBe("TRADE");
    expect(e.price).toBe(248.13);
    expect(e.size).toBe(120);
    expect(e.volume).toBe(120);
    expect(e.sequenceId).toBe(4021);
    expect(e.normalizedSymbol).toBe("TSLA");
    expect(e.providerPath).toBe("moomoo-opend-bridge");
    expect(e.dataMode).toBe("LIVE");
    expect(e.fidelityClass).toBe("OBSERVED");
  });

  it("treats moomoo direction as PROVIDER-declared aggressor (not inferred)", () => {
    const e = normalizeMoomooTick(buyRow, "TSLA", "LIVE", RECEIVED, PROCESSED)!;
    expect(e.aggressorSide).toBe("BUY");
    expect(e.aggressorMethod).toBe("PROVIDER");
  });

  it("NEUTRAL / unknown direction never becomes a fabricated side", () => {
    const neutral = normalizeMoomooTick({ ...buyRow, direction: "NEUTRAL" }, "TSLA", "LIVE", RECEIVED, PROCESSED)!;
    expect(neutral.aggressorSide).toBeUndefined();
    expect(neutral.aggressorMethod).toBe("NONE");

    const blank = normalizeMoomooTick({ ...buyRow, direction: "" }, "TSLA", "LIVE", RECEIVED, PROCESSED)!;
    expect(blank.aggressorSide).toBeUndefined();
    expect(blank.aggressorMethod).toBe("NONE");
  });

  it("preserves the bridge's explicit provider epoch without parsing the raw local-time string", () => {
    const e = normalizeMoomooTick(buyRow, "TSLA", "DELAYED", RECEIVED, PROCESSED)!;
    expect(e.timestampProvider).toBe(PROVIDER_TS);
    expect(e.timestampExchange).toBeUndefined();
    // the raw string is preserved as lineage, not silently dropped
    expect(e.rawLineageRef).toContain("2026-08-31 09:30:01.250");
    expect(e.dataMode).toBe("DELAYED");
  });

  it("drops a row with no usable price or executed size (truthful-or-nothing)", () => {
    expect(normalizeMoomooTick({ ...buyRow, price: 0 }, "TSLA", "LIVE", RECEIVED)).toBeNull();
    expect(normalizeMoomooTick({ ...buyRow, price: "n/a" }, "TSLA", "LIVE", RECEIVED)).toBeNull();
    expect(normalizeMoomooTick({ ...buyRow, volume: 0 }, "TSLA", "LIVE", RECEIVED)).toBeNull();
    expect(normalizeMoomooTick({ ...buyRow, volume: undefined }, "TSLA", "LIVE", RECEIVED)).toBeNull();
    expect(normalizeMoomooTick({ ...buyRow, timestamp_ms: undefined }, "TSLA", "LIVE", RECEIVED)).toBeNull();
  });

  it("strips the moomoo market prefix and rejects a wrong-symbol row", () => {
    expect(normalizeMoomooTick({ ...buyRow, code: "HK.00700" }, "00700", "LIVE", RECEIVED)!.normalizedSymbol).toBe("00700");
    expect(normalizeMoomooTick({ ...buyRow, code: "US.SPY" }, "SPY", "LIVE", RECEIVED)!.normalizedSymbol).toBe("SPY");
    expect(normalizeMoomooTick({ ...buyRow, code: "US.SPY" }, "TSLA", "LIVE", RECEIVED)).toBeNull();
  });
});

describe("normalizeMoomooTicksEnvelope", () => {
  const okEnvelope = {
    ok: true,
    source: "moomoo-opend",
    count: 2,
    ticks: [buyRow, { ...buyRow, seq: 4022, price: 248.2, volume: 5, direction: "SELL" }],
  };

  it("normalizes an ok envelope into canonical events", () => {
    const events = normalizeMoomooTicksEnvelope(okEnvelope, "TSLA", "LIVE", RECEIVED, PROCESSED);
    expect(events).toHaveLength(2);
    expect(events[1].aggressorSide).toBe("SELL");
    expect(events[1].sequenceId).toBe(4022);
  });

  it("returns [] for an error / non-ok envelope — never a fabricated event", () => {
    expect(normalizeMoomooTicksEnvelope({ ok: false, error: "OpenD not reachable on 127.0.0.1:11111" }, "TSLA", "LIVE", RECEIVED)).toEqual([]);
    expect(normalizeMoomooTicksEnvelope({ ok: true }, "TSLA", "LIVE", RECEIVED)).toEqual([]);
    expect(normalizeMoomooTicksEnvelope({} as never, "TSLA", "LIVE", RECEIVED)).toEqual([]);
  });

  it("skips unusable rows but keeps the valid ones", () => {
    const mixed = { ok: true, ticks: [buyRow, { ...buyRow, price: 0 }, { ...buyRow, seq: 4099 }] };
    const events = normalizeMoomooTicksEnvelope(mixed, "TSLA", "LIVE", RECEIVED, PROCESSED);
    expect(events).toHaveLength(2);
  });
});

describe("canonical MarketEventGuard accepts the normalized moomoo ticks", () => {
  it("a real print survives the canonical ingress guard (ACCEPTED, not quarantined)", () => {
    const guard = new MarketEventGuard();
    const e = normalizeMoomooTick(buyRow, "TSLA", "LIVE", RECEIVED, PROCESSED)!;
    const result = guard.inspect(e);
    expect(result.status).toBe("ACCEPTED");
    // sequence semantics are uncertified → the guard is told so, honestly
    if (result.status === "ACCEPTED") {
      expect(result.warnings).toContain("SEQUENCE_UNAVAILABLE");
    }
  });

  it("a duplicate eventId is quarantined by the canonical guard", () => {
    const guard = new MarketEventGuard();
    const e = normalizeMoomooTick(buyRow, "TSLA", "LIVE", RECEIVED, PROCESSED)!;
    guard.inspect(e);
    const second = guard.inspect(e);
    expect(second.status).toBe("QUARANTINED");
    if (second.status === "QUARANTINED") expect(second.reasons).toContain("DUPLICATE_EVENT");
  });
});
