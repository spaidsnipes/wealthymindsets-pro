import { describe, expect, it } from "vitest";
import { provenTapeWireBlock, FRESH_OBSERVATION_MS } from "./provenTapeWireBlock";

const NOW = 1_780_000_000_000;

describe("provenTapeWireBlock", () => {
  /**
   * The measured case. MEASURED 2026-09-21: the Webull entitlement probe
   * returned APP_KEY_ENTITLEMENT_ISOLATED — accounts and profiles 200, every
   * market-data rung 403 MARKET_DATA_NOT_SUBSCRIBED under both signing
   * profiles — while the deck kept printing a live price. Prices flowing,
   * prints denied: that is a wire fact, and the bell will not change it.
   */
  it("concludes a wire block when the feed is alive and no tape has ever arrived", () => {
    expect(provenTapeWireBlock({ tapeSource: null, lastObservedAtMs: NOW - 1_000 }, NOW)).toBe(true);
  });

  it("concludes nothing when an aggressor tape is actually arriving", () => {
    // The wire is plainly working; a missing reading is then about the market.
    expect(provenTapeWireBlock({ tapeSource: "finnhub", lastObservedAtMs: NOW - 1_000 }, NOW)).toBeNull();
  });

  it("concludes nothing when the provider has said nothing at all", () => {
    // Indistinguishable from a feed that has not started. Silence is not proof.
    expect(provenTapeWireBlock({ tapeSource: null, lastObservedAtMs: null }, NOW)).toBeNull();
  });

  it("concludes nothing from a stale observation — that is what a closed session looks like", () => {
    // The whole point of the freshness bar: a weekend REST seed must NOT be
    // read as "the provider is talking to us and withholding prints".
    expect(
      provenTapeWireBlock({ tapeSource: null, lastObservedAtMs: NOW - FRESH_OBSERVATION_MS - 1 }, NOW),
    ).toBeNull();
    // Exactly at the boundary still counts as fresh.
    expect(
      provenTapeWireBlock({ tapeSource: null, lastObservedAtMs: NOW - FRESH_OBSERVATION_MS }, NOW),
    ).toBe(true);
  });

  it("refuses to conclude from a future timestamp or absent evidence", () => {
    expect(provenTapeWireBlock({ tapeSource: null, lastObservedAtMs: NOW + 5_000 }, NOW)).toBeNull();
    expect(provenTapeWireBlock({ tapeSource: null, lastObservedAtMs: Number.NaN }, NOW)).toBeNull();
    expect(provenTapeWireBlock(null, NOW)).toBeNull();
    expect(provenTapeWireBlock(undefined, NOW)).toBeNull();
  });

  it("never returns false — a quiet complaint is not a healthy-lane receipt", () => {
    for (const evidence of [
      { tapeSource: "coinbase" as const, lastObservedAtMs: NOW },
      { tapeSource: null, lastObservedAtMs: null },
      { tapeSource: null, lastObservedAtMs: NOW },
    ]) {
      expect(provenTapeWireBlock(evidence, NOW)).not.toBe(false);
    }
  });
});
