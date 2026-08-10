import { describe, expect, it } from "vitest";
import { MarketEventGuard } from "../marketEvent";
import { normalizeAlpacaRelayTrade } from "./alpacaRelay";

const raw = {
  T: "t",
  S: "TSLA",
  i: 991,
  x: "V",
  p: 329.25,
  s: 12,
  t: "2026-08-10T04:30:00.250Z",
  c: ["@"],
};

describe("Alpaca external-relay canonical adapter", () => {
  it("preserves observed trade identity, timestamp, conditions, and provenance", () => {
    const received = Date.parse(raw.t) + 25;
    expect(normalizeAlpacaRelayTrade(raw, "TSLA", 329, received, received + 2)).toMatchObject({
      eventId: "alpaca-relay:TSLA:991",
      sourceEventId: "991",
      normalizedSymbol: "TSLA",
      timestampProvider: Date.parse(raw.t),
      providerPath: "alpaca-external-relay",
      sourceClass: "PROXY",
      price: 329.25,
      size: 12,
      tradeConditions: ["@"],
    });
  });

  it("labels price-direction classification as tick-rule inference", () => {
    expect(normalizeAlpacaRelayTrade(raw, "TSLA", 329, Date.parse(raw.t) + 25)).toMatchObject({
      aggressorSide: "BUY",
      aggressorMethod: "TICK_RULE",
      aggressorConfidence: 0.5,
    });
    expect(normalizeAlpacaRelayTrade(raw, "TSLA", 330, Date.parse(raw.t) + 25)?.aggressorSide).toBe("SELL");
  });

  it("keeps equal-price and first prints UNKNOWN", () => {
    expect(normalizeAlpacaRelayTrade(raw, "TSLA", raw.p, Date.parse(raw.t) + 25)?.aggressorSide).toBe("UNKNOWN");
    expect(normalizeAlpacaRelayTrade(raw, "TSLA", 0, Date.parse(raw.t) + 25)?.aggressorSide).toBe("UNKNOWN");
  });

  it("rejects wrong-symbol, missing-time, and non-trade messages", () => {
    expect(normalizeAlpacaRelayTrade({ ...raw, S: "AAPL" }, "TSLA", 329, Date.now())).toBeNull();
    expect(normalizeAlpacaRelayTrade({ ...raw, t: undefined }, "TSLA", 329, Date.now())).toBeNull();
    expect(normalizeAlpacaRelayTrade({ ...raw, T: "q" }, "TSLA", 329, Date.now())).toBeNull();
  });

  it("passes the canonical guard and exposes missing sequence", () => {
    const event = normalizeAlpacaRelayTrade(raw, "TSLA", 329, Date.parse(raw.t) + 25)!;
    const result = new MarketEventGuard().inspect(event);
    expect(result.status).toBe("ACCEPTED");
    if (result.status === "ACCEPTED") expect(result.warnings).toContain("SEQUENCE_UNAVAILABLE");
  });
});
