import { describe, it, expect } from "vitest";
import {
  chartIdentityLabel,
  IDENTITY_SEPARATOR,
} from "./chartIdentityLabel";

/**
 * These tests guard a PRECONDITION, not a decoration. The toolbar row above the
 * candles is scheduled to move into the Tools room; the instrument's name lives
 * in that row's search field. If this label ever goes blank, removing the row
 * takes the symbol off the market surface with it.
 *
 * So every test below asserts on CONTENT, never merely on "did not throw".
 */
describe("chartIdentityLabel", () => {
  it("prints the instrument and the bar size, leading edge first", () => {
    const label = chartIdentityLabel("NQ1!", "5m");
    expect(label).not.toBeNull();
    expect(label!.parts.map(p => p.kind)).toEqual(["symbol", "timeframe"]);
    expect(label!.text).toBe(`NQ1!${IDENTITY_SEPARATOR}5m`);
  });

  it("says it aloud as sentences, not as glyphs", () => {
    // A screen reader reading "NQ1! · 5m" says the separator. The spoken form
    // is the reason `spoken` is a separate field rather than a formatted text.
    const label = chartIdentityLabel("TSLA", "1D");
    expect(label!.spoken).toBe("Instrument TSLA. 1D bars.");
    expect(label!.spoken).not.toContain(IDENTITY_SEPARATOR);
  });

  it("normalises the ticker the way the classifier does", () => {
    expect(chartIdentityLabel("  tsla  ", "1D")!.parts[0].text).toBe("TSLA");
  });

  it("accepts the pre-migration timeframe literals still sitting in saved layouts", () => {
    // "D"/"W"/"M" predate src/lib/timeframes.ts. A trader whose localStorage is
    // old must not get a label with the bar size missing.
    for (const [legacy, canonical] of [["D", "1D"], ["W", "1W"], ["M", "1M"]]) {
      const label = chartIdentityLabel("AAPL", legacy);
      expect(label!.parts.map(p => p.kind), `legacy ${legacy} lost its timeframe part`)
        .toEqual(["symbol", "timeframe"]);
      expect(label!.parts[1].text).toBe(canonical);
    }
  });

  it("drops the bar size rather than inventing one when the timeframe is unknown", () => {
    const label = chartIdentityLabel("AAPL", "7q");
    expect(label!.parts.map(p => p.kind)).toEqual(["symbol"]);
    expect(label!.text).toBe("AAPL");
    // The separator is a JOIN artefact. One part must not trail one.
    expect(label!.text).not.toContain(IDENTITY_SEPARATOR);
  });

  it("refuses a blank symbol instead of returning an empty label", () => {
    // ANTI-VACUITY. An empty string satisfies every `toContain` downstream, so
    // "" would let the pane lose its identity under a green suite.
    expect(chartIdentityLabel("", "5m")).toBeNull();
    expect(chartIdentityLabel("   ", "5m")).toBeNull();
  });

  it("never returns a part whose text is empty", () => {
    for (const tf of ["1m", "5m", "1h", "1D", "1W", "1M", "5Y", "nonsense"]) {
      for (const part of chartIdentityLabel("ES1!", tf)!.parts) {
        expect(part.text.length, `${tf} produced an empty ${part.kind} part`).toBeGreaterThan(0);
        expect(part.spoken.length, `${tf} produced a mute ${part.kind} part`).toBeGreaterThan(0);
      }
    }
  });
});
