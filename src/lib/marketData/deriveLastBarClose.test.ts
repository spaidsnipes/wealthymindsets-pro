/**
 * Truth-lock for the second price owner.
 *
 * This selector exists because /charts rendered `7,622.25 HISTORICAL BARS
 * VERIFIED` and `PRICE UNKNOWN` for the SAME instrument in the SAME viewport.
 * The repair is only honest if the value it publishes is provably bar-derived
 * and correctly timestamped — otherwise it trades one truth defect (silence
 * about knowledge we hold) for a worse one (a fabricated provenance claim).
 *
 * So the assertions below are mostly REFUSALS.
 */
import { describe, it, expect } from "vitest";
import { deriveLastBarClose } from "./deriveLastBarClose";
import type { OHLCVBar } from "../pine/types";

const bar = (time: number, close: number): OHLCVBar => ({
  time, open: close, high: close, low: close, close, volume: 1,
});

describe("deriveLastBarClose", () => {
  it("names the close of the NEWEST bar", () => {
    const out = deriveLastBarClose([bar(1_700_000_000, 10), bar(1_700_003_600, 12)], "1h");
    expect(out?.close).toBe(12);
  });

  it("converts the seconds bar stamp to milliseconds exactly once", () => {
    // OHLCVBar.time is SECONDS (the lightweight-charts convention that
    // liveBarPolicy also emits). Every other field in canonical market state
    // is milliseconds; leaking seconds through would render as 1970.
    const out = deriveLastBarClose([bar(1_700_003_600, 12)], "1h");
    expect(out?.barOpenedAtMs).toBe(1_700_003_600_000);
  });

  it("does NOT assume the array is sorted", () => {
    // A close attributed to the wrong bar is a fabricated timestamp even when
    // the number happens to be right.
    const out = deriveLastBarClose([bar(1_700_003_600, 12), bar(1_700_000_000, 10)], "1h");
    expect(out).toEqual({ close: 12, barOpenedAtMs: 1_700_003_600_000, timeframe: "1h" });
  });

  it("carries the timeframe — a close is meaningless without it", () => {
    expect(deriveLastBarClose([bar(1_700_000_000, 10)], "5m")?.timeframe).toBe("5m");
  });

  it.each([
    ["no bars at all", [] as OHLCVBar[]],
    ["a null array", null],
    ["an undefined array", undefined],
  ])("refuses %s", (_label, bars) => {
    expect(deriveLastBarClose(bars as OHLCVBar[] | null, "1h")).toBeNull();
  });

  it.each([
    ["an empty timeframe", ""],
    ["a whitespace timeframe", "   "],
    ["a null timeframe", null],
  ])("refuses %s", (_label, tf) => {
    expect(deriveLastBarClose([bar(1_700_000_000, 10)], tf)).toBeNull();
  });

  it.each([
    ["a zero close", bar(1_700_000_000, 0)],
    ["a negative close", bar(1_700_000_000, -3)],
    ["a NaN close", bar(1_700_000_000, Number.NaN)],
    ["an Infinity close", bar(1_700_000_000, Number.POSITIVE_INFINITY)],
    ["a zero stamp", bar(0, 10)],
    ["a NaN stamp", bar(Number.NaN, 10)],
  ])("refuses a lone bar with %s", (_label, only) => {
    expect(deriveLastBarClose([only], "1h")).toBeNull();
  });

  it("skips an unusable bar rather than failing the whole read", () => {
    // Partial corruption must not blind the trader to a good adjacent bar,
    // and must not let the corrupt bar win the newest-bar race.
    const out = deriveLastBarClose(
      [bar(1_700_000_000, 10), bar(1_700_007_200, Number.NaN)],
      "1h",
    );
    expect(out).toEqual({ close: 10, barOpenedAtMs: 1_700_000_000_000, timeframe: "1h" });
  });

  it("trims the timeframe it publishes", () => {
    expect(deriveLastBarClose([bar(1_700_000_000, 10)], " 1D ")?.timeframe).toBe("1D");
  });

  it("is pure — it does not mutate or reorder the caller's array", () => {
    const bars = [bar(1_700_003_600, 12), bar(1_700_000_000, 10)];
    const before = JSON.stringify(bars);
    deriveLastBarClose(bars, "1h");
    expect(JSON.stringify(bars)).toBe(before);
  });
});
