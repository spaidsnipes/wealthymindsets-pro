import { describe, expect, it } from "vitest";
import { MarketEventGuard } from "../marketEvent";
import { normalizeCoinbaseTicker } from "./coinbase";

const rawTicker = {
  type: "ticker",
  product_id: "BTC-USD",
  trade_id: 42,
  sequence: 100,
  time: "2026-08-10T04:24:00.123Z",
  price: "65000.25",
  last_size: "0.125",
  side: "sell",
};

describe("Coinbase canonical Market Event adapter", () => {
  it("preserves provider identity, timestamp, sequence, price, and size", () => {
    const event = normalizeCoinbaseTicker(rawTicker, "BTC", Date.parse(rawTicker.time) + 20, Date.parse(rawTicker.time) + 25);
    expect(event).toMatchObject({
      eventId: "coinbase:BTC-USD:42",
      sourceEventId: "42",
      normalizedSymbol: "BTC",
      providerPath: "coinbase-client-ws",
      timestampExchange: Date.parse(rawTicker.time),
      timestampProvider: Date.parse(rawTicker.time),
      sequenceId: 100,
      price: 65000.25,
      size: 0.125,
      fidelityClass: "OBSERVED",
    });
  });

  it("labels maker-side inversion instead of claiming provider aggressor side", () => {
    const event = normalizeCoinbaseTicker(rawTicker, "BTC", Date.parse(rawTicker.time) + 20);
    expect(event?.aggressorSide).toBe("BUY");
    expect(event?.aggressorMethod).toBe("MAKER_SIDE_INVERTED");
  });

  it("fails closed when execution identity, time, price, size, or side is missing", () => {
    expect(normalizeCoinbaseTicker({ ...rawTicker, trade_id: undefined, sequence: undefined }, "BTC", Date.now())).toBeNull();
    expect(normalizeCoinbaseTicker({ ...rawTicker, time: "invalid" }, "BTC", Date.now())).toBeNull();
    expect(normalizeCoinbaseTicker({ ...rawTicker, price: "0" }, "BTC", Date.now())).toBeNull();
    expect(normalizeCoinbaseTicker({ ...rawTicker, last_size: "0" }, "BTC", Date.now())).toBeNull();
    expect(normalizeCoinbaseTicker({ ...rawTicker, side: "unknown" }, "BTC", Date.now())).toBeNull();
  });

  it("is accepted once and quarantined as a duplicate thereafter", () => {
    const event = normalizeCoinbaseTicker(rawTicker, "BTC", Date.parse(rawTicker.time) + 20)!;
    const guard = new MarketEventGuard();
    expect(guard.inspect(event).status).toBe("ACCEPTED");
    expect(guard.inspect(event).status).toBe("QUARANTINED");
  });
});
