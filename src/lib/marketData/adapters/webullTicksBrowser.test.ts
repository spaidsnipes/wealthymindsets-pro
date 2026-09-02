import { describe, expect, it } from "vitest";
import { selectFreshWebullObservedEvents, selectFreshWebullTapeEvents } from "./webullTicksBrowser";

const NOW = 1_756_000_000_000;

function body(overrides: Record<string, unknown> = {}) {
  return {
    source: "webull",
    state: "OBSERVED",
    fidelity: "SNAPSHOT",
    symbol: "TSLA",
    ticks: [{ symbol: "TSLA", price: 248.13, volume: 120, observedAtMs: NOW - 500, side: "BUY", tradingSession: "RTH" }],
    ...overrides,
  };
}

describe("selectFreshWebullTapeEvents", () => {
  it("normalizes a fresh exact-symbol provider-sided print without claiming LIVE", () => {
    const events = selectFreshWebullTapeEvents(body(), "TSLA", NOW);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      providerPath: "webull-openapi-ticks",
      normalizedSymbol: "TSLA",
      price: 248.13,
      size: 120,
      aggressorSide: "BUY",
      aggressorMethod: "PROVIDER",
      dataMode: "DELAYED",
      fidelityClass: "OBSERVED",
    });
  });

  it("keeps identities stable across overlapping snapshots and orders events oldest-first", () => {
    const older = { symbol: "TSLA", price: 247.9, volume: 3, observedAtMs: NOW - 1_000, side: "SELL" };
    const newer = { symbol: "TSLA", price: 248.1, volume: 5, observedAtMs: NOW - 100, side: "BUY" };
    const first = selectFreshWebullTapeEvents(body({ ticks: [newer, older] }), "TSLA", NOW);
    const second = selectFreshWebullTapeEvents(body({ ticks: [older, newer] }), "TSLA", NOW);
    expect(first.map((event) => event.timestampProvider)).toEqual([NOW - 1_000, NOW - 100]);
    expect(first.map((event) => event.eventId)).toEqual(second.map((event) => event.eventId));
  });

  it("admits a fresh unknown-side print for price and volume without admitting it to order flow", () => {
    const unknown = body({ ticks: [{ symbol: "TSLA", price: 248, volume: 2, observedAtMs: NOW, side: "UNKNOWN" }] });
    expect(selectFreshWebullObservedEvents(unknown, "TSLA", NOW)).toMatchObject([{
      price: 248,
      size: 2,
      aggressorSide: "UNKNOWN",
      aggressorMethod: "NONE",
      aggressorConfidence: 0,
    }]);
    expect(selectFreshWebullTapeEvents(unknown, "TSLA", NOW)).toEqual([]);
  });

  it.each([
    ["blocker", { state: "BLOCKED_AUTH" }],
    ["wrong symbol envelope", { symbol: "SPY" }],
    ["stale", { ticks: [{ symbol: "TSLA", price: 248, volume: 2, observedAtMs: NOW - 30_001, side: "SELL" }] }],
    ["future clock", { ticks: [{ symbol: "TSLA", price: 248, volume: 2, observedAtMs: NOW + 5 * 60_000 + 1, side: "SELL" }] }],
    ["zero size", { ticks: [{ symbol: "TSLA", price: 248, volume: 0, observedAtMs: NOW, side: "BUY" }] }],
  ])("rejects %s truth", (_name, overrides) => {
    expect(selectFreshWebullTapeEvents(body(overrides), "TSLA", NOW)).toEqual([]);
  });
});
