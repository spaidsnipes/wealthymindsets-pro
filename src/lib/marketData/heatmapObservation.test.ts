import { describe, expect, it } from "vitest";

import { newestObservationMs, yahooMarketTimeToMs } from "./heatmapObservation";

describe("yahooMarketTimeToMs — the provider's seconds, or nothing", () => {
  it("converts a plausible epoch-seconds market time to ms", () => {
    expect(yahooMarketTimeToMs(1_758_000_000)).toBe(1_758_000_000_000);
  });

  it("REFUSES a value already in milliseconds rather than guessing the unit", () => {
    // The tempting heuristic is "small number ⇒ seconds, big number ⇒ ms".
    // That silently absorbs a provider contract change and keeps printing a
    // confident age either way. Null compiles to FEED UNKNOWN, which is true.
    expect(yahooMarketTimeToMs(1_758_000_000_000)).toBeNull();
  });

  it("refuses absent, non-numeric and non-finite values", () => {
    for (const raw of [undefined, null, "1758000000", {}, [], Number.NaN, Infinity, -Infinity]) {
      expect(yahooMarketTimeToMs(raw), JSON.stringify(raw) ?? "undefined").toBeNull();
    }
  });

  it("refuses zero, negatives, and epochs before the plausible window", () => {
    for (const raw of [0, -1, 999_999_999]) {
      expect(yahooMarketTimeToMs(raw), String(raw)).toBeNull();
    }
  });

  it("accepts the exact window edges and nothing outside them", () => {
    expect(yahooMarketTimeToMs(1_000_000_000)).toBe(1_000_000_000_000);
    expect(yahooMarketTimeToMs(4_102_444_800)).toBe(4_102_444_800_000);
    expect(yahooMarketTimeToMs(4_102_444_801)).toBeNull();
  });
});

describe("newestObservationMs — when WM last saw the market", () => {
  it("returns the NEWEST, not the oldest or the last in the list", () => {
    // A single lagging constituent must not age the whole board.
    expect(newestObservationMs([1_000, 9_000, 5_000])).toBe(9_000);
  });

  it("returns null for an empty batch — silence is not an observation", () => {
    expect(newestObservationMs([])).toBeNull();
  });

  it("returns null when every candidate is absent", () => {
    expect(newestObservationMs([null, undefined, null])).toBeNull();
  });

  it("skips unusable candidates without discarding the usable ones", () => {
    expect(newestObservationMs([null, 0, -5, Number.NaN, 7_000, undefined])).toBe(7_000);
  });
});
