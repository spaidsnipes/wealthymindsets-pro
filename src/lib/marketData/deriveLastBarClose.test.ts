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

/**
 * A clock positioned AFTER the given bar's interval has fully elapsed, so the
 * bar is provably closed. Most assertions below are about which bar gets
 * named, not about closure detection, so they pin the clock out of the way.
 */
const afterClose = (barTimeSeconds: number, intervalMs: number) =>
  barTimeSeconds * 1000 + intervalMs;

describe("deriveLastBarClose", () => {
  it("names the close of the newest CLOSED bar", () => {
    const out = deriveLastBarClose(
      [bar(1_700_000_000, 10), bar(1_700_003_600, 12)],
      "1h",
      afterClose(1_700_003_600, 3_600_000),
    );
    expect(out?.close).toBe(12);
  });

  it("converts the seconds bar stamp to milliseconds exactly once", () => {
    // OHLCVBar.time is SECONDS (the lightweight-charts convention that
    // liveBarPolicy also emits). Every other field in canonical market state
    // is milliseconds; leaking seconds through would render as 1970.
    const out = deriveLastBarClose(
      [bar(1_700_003_600, 12)], "1h", afterClose(1_700_003_600, 3_600_000),
    );
    expect(out?.barOpenedAtMs).toBe(1_700_003_600_000);
  });

  it("does NOT assume the array is sorted", () => {
    // A close attributed to the wrong bar is a fabricated timestamp even when
    // the number happens to be right.
    const out = deriveLastBarClose(
      [bar(1_700_003_600, 12), bar(1_700_000_000, 10)],
      "1h",
      afterClose(1_700_003_600, 3_600_000),
    );
    expect(out).toEqual({ close: 12, barOpenedAtMs: 1_700_003_600_000, timeframe: "1h" });
  });

  it("carries the timeframe — a close is meaningless without it", () => {
    expect(
      deriveLastBarClose([bar(1_700_000_000, 10)], "5m", afterClose(1_700_000_000, 300_000))
        ?.timeframe,
    ).toBe("5m");
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
      afterClose(1_700_007_200, 3_600_000),
    );
    expect(out).toEqual({ close: 10, barOpenedAtMs: 1_700_000_000_000, timeframe: "1h" });
  });

  it("trims the timeframe it publishes", () => {
    expect(
      deriveLastBarClose([bar(1_700_000_000, 10)], " 1D ", afterClose(1_700_000_000, 86_400_000))
        ?.timeframe,
    ).toBe("1D");
  });

  /**
   * A BAR THAT HAS NOT CLOSED HAS NO CLOSE.
   *
   * Observed live 2026-09-15, NQ1! 1h at 10:34:19Z: the newest bar had
   * O=H=L=C=29355.75 and V=0 with 24 minutes left on its countdown — it had
   * opened at 10:00Z and taken no trades, so its "close" was just the seed it
   * was born with. The tile published that as "29355.75 LAST 1h BAR CLOSE".
   */
  describe("refuses a bar that is still forming", () => {
    // 1h bar opens at 1_700_003_600s; 10 minutes into it nothing has closed.
    const FORMING_OPEN = 1_700_003_600;
    const TEN_MIN_IN = FORMING_OPEN * 1000 + 600_000;

    it("names the PREVIOUS bar, not the one still forming", () => {
      const out = deriveLastBarClose(
        [bar(1_700_000_000, 10), bar(FORMING_OPEN, 12)],
        "1h",
        TEN_MIN_IN,
      );
      expect(out).toEqual({ close: 10, barOpenedAtMs: 1_700_000_000_000, timeframe: "1h" });
    });

    it("returns null rather than name a forming bar with nothing behind it", () => {
      // One bar, still forming. There is no closed bar to fall back to, and
      // inventing one would be the exact fabrication this file refuses.
      expect(deriveLastBarClose([bar(FORMING_OPEN, 12)], "1h", TEN_MIN_IN)).toBeNull();
    });

    it("accepts the newest bar the instant its interval has fully elapsed", () => {
      // Boundary: open + exactly one interval. The bar is over.
      const out = deriveLastBarClose(
        [bar(FORMING_OPEN, 12)], "1h", FORMING_OPEN * 1000 + 3_600_000,
      );
      expect(out?.close).toBe(12);
    });

    it("is not fooled by a zero-volume forming bar that looks like a real one", () => {
      // The live signature: zero range, zero volume, seeded close.
      const seeded: OHLCVBar = {
        time: FORMING_OPEN, open: 29355.75, high: 29355.75,
        low: 29355.75, close: 29355.75, volume: 0,
      };
      const out = deriveLastBarClose([bar(1_700_000_000, 29_300), seeded], "1h", TEN_MIN_IN);
      expect(out?.close).toBe(29_300);
    });
  });

  /**
   * DEGRADATION, NOT GUESSING. When closure cannot be proven by the clock, the
   * selector must fall back to the proof that needs no clock — "a strictly
   * newer bar exists, therefore this one ended" — and never to a guess.
   */
  describe("degrades conservatively when closure cannot be proven", () => {
    it("falls back to the previous bar when no clock is supplied", () => {
      const out = deriveLastBarClose([bar(1_700_000_000, 10), bar(1_700_003_600, 12)], "1h");
      expect(out?.close).toBe(10);
    });

    it.each([
      ["an unparseable timeframe", "1W"],
      ["a month timeframe, which is ambiguous by design", "1M"],
    ])("falls back to the previous bar with %s", (_label, tf) => {
      const out = deriveLastBarClose(
        [bar(1_700_000_000, 10), bar(1_700_003_600, 12)], tf, 1_799_999_999_999,
      );
      expect(out?.close).toBe(10);
      expect(out?.timeframe).toBe(tf);
    });

    it.each([
      ["a NaN clock", Number.NaN],
      ["a zero clock", 0],
      ["a negative clock", -1],
      ["a null clock", null],
    ])("falls back to the previous bar given %s", (_label, now) => {
      const out = deriveLastBarClose(
        [bar(1_700_000_000, 10), bar(1_700_003_600, 12)], "1h", now,
      );
      expect(out?.close).toBe(10);
    });

    it("understates by at most ONE bar — never more", () => {
      const bars = [bar(1_700_000_000, 10), bar(1_700_003_600, 11), bar(1_700_007_200, 12)];
      // Newest is forming; the answer is the one immediately before it, not older.
      expect(deriveLastBarClose(bars, "1h", 1_700_007_200_000 + 600_000)?.close).toBe(11);
    });
  });

  it("is pure — it does not mutate or reorder the caller's array", () => {
    const bars = [bar(1_700_003_600, 12), bar(1_700_000_000, 10)];
    const before = JSON.stringify(bars);
    deriveLastBarClose(bars, "1h");
    expect(JSON.stringify(bars)).toBe(before);
  });
});
