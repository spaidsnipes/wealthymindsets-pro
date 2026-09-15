/**
 * Truth-lock for the chart header's fourth OHLC word.
 *
 * Measured live 2026-09-15 on /charts, NQ1! 1h: the header read
 * `C 29403.00  V 0` with 5:04 left on the bar countdown, two inches from a
 * MARKET tile reading `29405 LAST 1h BAR CLOSE`. Two owners, one viewport, two
 * different numbers, both wearing the word "close".
 *
 * `C` is a provenance claim. These assertions are mostly refusals to make it.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { selectChartCloseLabel } from "./selectChartCloseLabel";

/** 1h bar opening at this second. */
const OPEN = 1_700_003_600;
const HOUR_MS = 3_600_000;

describe("selectChartCloseLabel", () => {
  it("says C once the bar's interval has fully elapsed", () => {
    const out = selectChartCloseLabel(OPEN, "1h", OPEN * 1000 + HOUR_MS);
    expect(out.label).toBe("C");
    expect(out.forming).toBe(false);
  });

  it("accepts the boundary exactly — open + one interval is over", () => {
    // A bar that ends at T is closed AT T, not one millisecond after.
    expect(selectChartCloseLabel(OPEN, "1h", OPEN * 1000 + HOUR_MS).label).toBe("C");
    expect(selectChartCloseLabel(OPEN, "1h", OPEN * 1000 + HOUR_MS - 1).label).toBe("NOW");
  });

  it("refuses to say C about a bar that is still forming", () => {
    // The live condition: ten minutes into a one-hour bar.
    const out = selectChartCloseLabel(OPEN, "1h", OPEN * 1000 + 600_000);
    expect(out.label).toBe("NOW");
    expect(out.forming).toBe(true);
  });

  it("names the timeframe in the forming explanation", () => {
    // "This bar has not closed" is weaker than "This 1h bar has not closed" —
    // on a surface with six visible timeframes the trader needs to know which.
    expect(selectChartCloseLabel(OPEN, "1h", OPEN * 1000 + 600_000).title).toContain("1h");
  });

  it("always carries a title — the label alone is too terse to explain itself", () => {
    expect(selectChartCloseLabel(OPEN, "1h", OPEN * 1000 + HOUR_MS).title.length).toBeGreaterThan(20);
    expect(selectChartCloseLabel(OPEN, "1h", OPEN * 1000 + 1).title.length).toBeGreaterThan(20);
  });

  it("promises a closed bar will not move — that is what C means", () => {
    expect(selectChartCloseLabel(OPEN, "1h", OPEN * 1000 + HOUR_MS).title).toMatch(/will not change/i);
  });

  /**
   * DEGRADATION, NOT GUESSING. Every missing piece of the proof must fall to
   * NOW. Understating costs one render; overstating publishes a close that
   * never happened.
   */
  describe("degrades to NOW whenever closure cannot be proven", () => {
    it.each([
      ["no clock", undefined],
      ["a null clock", null],
      ["a NaN clock", Number.NaN],
      ["a zero clock", 0],
      ["a negative clock", -1],
    ])("refuses C given %s", (_label, now) => {
      expect(selectChartCloseLabel(OPEN, "1h", now).label).toBe("NOW");
    });

    it.each([
      ["a week timeframe this app spells with a capital W", "1W"],
      ["a month timeframe, ambiguous by design", "1M"],
      ["an empty timeframe", ""],
      ["a whitespace timeframe", "   "],
    ])("refuses C given %s", (_label, tf) => {
      // The clock is deliberately far in the future: only the unparseable
      // interval can be responsible for the refusal.
      expect(selectChartCloseLabel(OPEN, tf, 1_799_999_999_999).label).toBe("NOW");
    });

    it.each([
      ["a null timeframe", null],
      ["an undefined timeframe", undefined],
    ])("refuses C given %s", (_label, tf) => {
      expect(selectChartCloseLabel(OPEN, tf, 1_799_999_999_999).label).toBe("NOW");
    });

    it.each([
      ["a zero stamp", 0],
      ["a negative stamp", -1],
      ["a NaN stamp", Number.NaN],
      ["a null stamp", null],
      ["an undefined stamp", undefined],
    ])("refuses C given %s", (_label, open) => {
      expect(selectChartCloseLabel(open, "1h", 1_799_999_999_999).label).toBe("NOW");
    });
  });

  it("trims the timeframe before parsing it", () => {
    expect(selectChartCloseLabel(OPEN, " 1h ", OPEN * 1000 + HOUR_MS).label).toBe("C");
  });

  it("does not reach for a hidden clock", () => {
    // If the selector called Date.now() itself, omitting nowMs would still
    // resolve a 2023 bar as closed. It must not.
    expect(selectChartCloseLabel(OPEN, "1h").label).toBe("NOW");
  });
});

/**
 * SOURCE-TEXT SENTINEL.
 *
 * The defect did not live in a selector — it lived in a hard-coded string
 * literal in JSX. No type can guard a letter. So the guard reads the source.
 */
describe("MainChart's OHLC strip routes its close word through the selector", () => {
  const MAIN_CHART = readFileSync(
    resolve(__dirname, "../../components/chart/MainChart.tsx"),
    "utf8",
  );

  it("imports the selector", () => {
    expect(
      MAIN_CHART,
      "the header's fourth OHLC word must be graded, not asserted",
    ).toMatch(/selectChartCloseLabel/);
  });

  it("does not hard-code the bare letter C in the OHLC strip", () => {
    // The original line was `<span>C <span …>{last.close.toFixed(dp)}</span></span>`.
    // Its siblings O/H/L/V are safe — they describe a forming bar truthfully.
    expect(
      MAIN_CHART,
      "`C` printed beside a running countdown claims a close that has not " +
        "happened; measured live 2026-09-15 on NQ1! 1h",
    ).not.toMatch(/<span>C \{?/);
  });
});
