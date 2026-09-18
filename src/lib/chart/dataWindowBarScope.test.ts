import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dataWindowBarScope } from "./dataWindowBarScope";

function codeOf(rel: string): string {
  return readFileSync(join(process.cwd(), "src", rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * The live reading that produced this owner. 2026-09-17, NQ1! 30m: the Data
 * Window showed C 29558.25 while the strip and header showed 29698.25.
 * Bar opens at 18:30 UTC; "now" is two hours later, so the bar is long closed
 * AND is not the latest — exactly the state that was rendered unlabelled.
 */
const BAR_OPEN_S = Date.UTC(2026, 8, 17, 18, 30, 0) / 1000;
const TWO_HOURS_LATER = Date.UTC(2026, 8, 17, 20, 30, 0);
const MID_BAR = Date.UTC(2026, 8, 17, 18, 45, 0);
const UTC = "UTC";

describe("dataWindowBarScope — two numbers for one instrument, both wearing C", () => {
  it("× THE UNSCOPED READING: the heading names the BAR, not the furniture", () => {
    // The defect: the heading was the word "DATA WINDOW" and every cell's
    // title was the empty string, so C 29558.25 competed with C 29698.25.
    const s = dataWindowBarScope(BAR_OPEN_S, "30m", false, TWO_HOURS_LATER, UTC);
    expect(s.heading).not.toMatch(/DATA WINDOW/i);
    expect(s.heading).toContain("30M BAR");
    expect(s.heading).toMatch(/18:30/);
  });

  it("× THE COMPETING CLOSE: a non-latest bar says so, in visible text", () => {
    const s = dataWindowBarScope(BAR_OPEN_S, "30m", false, TWO_HOURS_LATER, UTC);
    expect(s.historical).toBe(true);
    expect(s.subheading).toMatch(/NOT the latest bar/);
    // And the reason it cannot be read as the header's number is stated.
    expect(s.close.title).toMatch(/NOT the latest price/);
    expect(s.close.title).toMatch(/will not match the header/);
  });

  it("every cell carries the bar's identity — no cell can be read loose", () => {
    const s = dataWindowBarScope(BAR_OPEN_S, "30m", false, TWO_HOURS_LATER, UTC);
    for (const c of [s.open, s.high, s.low, s.close, s.volume]) {
      expect(c.title, c.label).toContain("30m bar beginning");
      expect(c.title, c.label).toMatch(/18:30/);
      expect(c.title.length, c.label).toBeGreaterThan(40);
    }
  });

  it("× THE SECOND OPINION: `C` is composed from selectChartCloseLabel, not re-decided", () => {
    // Crosshair resting on the latest bar, mid-interval: the bar has not ended,
    // so the letter C is a provenance claim it has not earned.
    const forming = dataWindowBarScope(BAR_OPEN_S, "30m", true, MID_BAR, UTC);
    expect(forming.close.label).toBe("NOW");
    expect(forming.subheading).toMatch(/still forming/);
    // Same bar, after the interval has elapsed.
    const closed = dataWindowBarScope(BAR_OPEN_S, "30m", true, TWO_HOURS_LATER, UTC);
    expect(closed.close.label).toBe("C");
    expect(closed.subheading).toMatch(/closed/);
  });

  it("the three states are genuinely distinct — historical is not 'forming'", () => {
    const hist = dataWindowBarScope(BAR_OPEN_S, "30m", false, TWO_HOURS_LATER, UTC);
    const forming = dataWindowBarScope(BAR_OPEN_S, "30m", true, MID_BAR, UTC);
    const closed = dataWindowBarScope(BAR_OPEN_S, "30m", true, TWO_HOURS_LATER, UTC);
    const subs = [hist.subheading, forming.subheading, closed.subheading];
    expect(new Set(subs).size, "two states are wearing the same sentence").toBe(3);
    expect(hist.historical).toBe(true);
    expect(forming.historical).toBe(false);
    expect(closed.historical).toBe(false);
  });

  it("× THE UNIT THAT IS NOT CURRENCY: V names what it counts", () => {
    const s = dataWindowBarScope(BAR_OPEN_S, "30m", false, TWO_HOURS_LATER, UTC);
    expect(s.volume.title).toMatch(/never currency/i);
  });

  it("× THE QUALIFIER MUST NOT BE SCOPED TO ONE BAR", () => {
    /**
     * The first shipped version of this module rendered, LIVE:
     *
     *   "Volume — contracts, shares or coins traded, never currency of the
     *    30m bar beginning Sep 14, 00:00."
     *
     * The unit qualifier ran straight into the bar clause, producing "never
     * currency OF THE 30m bar" — scoping a universal refusal to a single bar,
     * which is not what this module believes. Any qualifier that is not a
     * noun phrase must land in its OWN sentence, after the bar is named.
     */
    const s = dataWindowBarScope(BAR_OPEN_S, "30m", false, TWO_HOURS_LATER, UTC);
    expect(s.volume.title).not.toMatch(/never currency of the/i);
    // And the refusal must still be present, in a sentence of its own: the
    // fix may not be achieved by simply deleting the qualifier.
    const sentences = s.volume.title.split(". ");
    const refusal = sentences.find((x) => /never currency/i.test(x));
    expect(refusal, "the currency refusal was deleted rather than re-homed").toBeTruthy();
    expect(refusal, "the refusal is still sharing a sentence with the bar").not.toMatch(
      /30m bar/,
    );
  });

  it("the scope is SPOKEN, not hover-only", () => {
    const s = dataWindowBarScope(BAR_OPEN_S, "30m", false, TWO_HOURS_LATER, UTC);
    expect(s.spoken).toMatch(/NOT the latest bar/);
    expect(s.spoken).toMatch(/Data window/i);
  });

  it("a missing timestamp says TIME UNKNOWN rather than faking a scope", () => {
    for (const bad of [null, undefined, 0, -1, Number.NaN]) {
      const s = dataWindowBarScope(bad as never, "30m", false, TWO_HOURS_LATER, UTC);
      expect(s.heading, String(bad)).toMatch(/TIME UNKNOWN/);
      expect(s.open.title, String(bad)).toMatch(/unknown time/);
    }
  });

  it("a missing clock degrades the close word to NOW — it never overstates", () => {
    // Understating (a closed bar labelled forming) is the safe direction; the
    // reverse would put the word C on a bar that never ended.
    const s = dataWindowBarScope(BAR_OPEN_S, "30m", true, null, UTC);
    expect(s.close.label).toBe("NOW");
  });

  it("a missing timeframe still produces a scoped heading", () => {
    const s = dataWindowBarScope(BAR_OPEN_S, "", false, TWO_HOURS_LATER, UTC);
    expect(s.heading).toMatch(/^BAR · /);
    expect(s.heading).toMatch(/18:30/);
  });
});

describe("MainChart adoption", () => {
  const CODE = codeOf("components/chart/MainChart.tsx");

  it("× THE FURNITURE HEADING: the unscoped literal is gone from the source", () => {
    expect(CODE, 'the panel is titled "Data Window" again, with no bar named')
      .not.toMatch(/>\s*Data Window\s*</);
  });

  it("× THE UNCONSULTED OWNER: the panel compiles through dataWindowBarScope", () => {
    expect(CODE).toContain("dataWindowBarScope(");
    // The scope must be derived from the real series, not hardcoded true.
    expect(CODE).toContain("lastBar.time === dataWindow.time");
  });

  it("× THE RESURRECTED BARE LETTERS: cell labels come from the owner", () => {
    expect(CODE).toContain("{row.cell.label}");
    expect(CODE).toContain("title={row.cell.title}");
    // The old hardcoded label/value pairs must not come back.
    expect(CODE).not.toMatch(/label:\s*"C",\s*value:\s*dataWindow\.c/);
  });

  it("the scope reaches the eye and assistive tech, not just a hover", () => {
    expect(CODE).toContain("{scope.heading}");
    expect(CODE).toContain("{scope.subheading}");
    expect(CODE).toContain("aria-label={scope.spoken}");
    expect(CODE).toContain('data-data-window-historical=');
  });

  it("colour is chosen from the verdict, never from mere presence", () => {
    expect(CODE).toContain("scope.historical ? \"#F0B429\"");
  });

  it("× THE HALF-CLOSED PAIR: the OHLC strip is scoped by the SAME owner", () => {
    /**
     * The Data Window and the OHLC strip are the two panels that showed
     * `C 29558.25` and `C 29698.25` in one viewport. Scoping only one of them
     * leaves the trader one hover away from the same confusion — measured
     * live after the first fix shipped, the strip's cells still read back
     * [text, "", ""] with empty title AND empty aria-label.
     *
     * Both panels must derive their scope from dataWindowBarScope, so that
     * no edit can make them disagree about what a bar is.
     */
    expect((CODE.match(/dataWindowBarScope\(/g) || []).length,
      "one of the two disagreeing panels is no longer scoped by the owner",
    ).toBe(2);
    expect(CODE).toContain("stripScope.open.title");
    expect(CODE).toContain("stripScope.high.title");
    expect(CODE).toContain("stripScope.low.title");
    expect(CODE).toContain("stripScope.close.title");
    expect(CODE).toContain("stripScope.volume.title");
    // The strip's C must come from the owner too — not a second opinion.
    expect(CODE).toContain("{stripScope.close.label}");
    // Scope must not be hover-only here either.
    expect(CODE).toContain("aria-label={stripScope.spoken}");
    expect(CODE).toContain("data-ohlc-strip-scope=");
  });

  it("the strip's isLatestBar is a fact, not an inference", () => {
    // `last` IS the final candle by construction, so `true` is a statement
    // about the code's own structure. Passing a guessed value here would
    // manufacture the certainty the panel lacked in the first place.
    expect(CODE).toMatch(/last\.time as number,\s*timeframe,\s*true,\s*nowMs/);
  });
});
