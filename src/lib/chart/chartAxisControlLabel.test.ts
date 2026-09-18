import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chartAxisControlLabel, type ChartAxisControl } from "./chartAxisControlLabel";

function codeOf(rel: string): string {
  return readFileSync(join(process.cwd(), "src", rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const TOGGLES: ChartAxisControl[] = ["AUTO_SCALE", "PERCENT", "LOG"];
const ALL: ChartAxisControl[] = ["RESET", ...TOGGLES];

describe("chartAxisControlLabel — a mode that changes what every number means may not be announced by colour", () => {
  it("× THE COLOUR-ONLY STATE: every toggle's hover DIFFERS between on and off", () => {
    // The defect: `%` read "Percentage mode" and `L` read "Log scale" in BOTH
    // states, so `active` fed nothing but a background colour.
    for (const c of TOGGLES) {
      expect(chartAxisControlLabel(c, true).title, c)
        .not.toBe(chartAxisControlLabel(c, false).title);
      expect(chartAxisControlLabel(c, true).spoken, c)
        .not.toBe(chartAxisControlLabel(c, false).spoken);
    }
  });

  it("× THE GLYPH AS A NAME: the accessible name is a sentence, never a single character", () => {
    for (const c of ALL) {
      for (const active of [true, false]) {
        const l = chartAxisControlLabel(c, active);
        expect(l.spoken.length, `${c} ${active}`).toBeGreaterThan(20);
        expect(l.spoken).not.toBe(l.glyph);
      }
    }
  });

  it("× THE PERCENT OVERCLAIM: when on, it says the axis is NOT showing prices", () => {
    // Percentage mode rewrites every number on the price axis from a PRICE
    // into a PERCENT CHANGE. That is canon Weakness #1's exact shape.
    const on = chartAxisControlLabel("PERCENT", true);
    expect(on.title).toMatch(/NOT showing prices/);
    expect(on.title).toMatch(/percent change/i);
    expect(on.spoken).toMatch(/percent change from the first bar, not prices/i);
    const off = chartAxisControlLabel("PERCENT", false);
    expect(off.title).toMatch(/showing prices/);
  });

  it("LOG states what the DISTANCE means, in both directions", () => {
    expect(chartAxisControlLabel("LOG", true).title).toMatch(/PERCENT move/);
    expect(chartAxisControlLabel("LOG", false).title).toMatch(/PRICE move/);
  });

  it("an ACTION does not wear a state: RESET has no aria-pressed, the toggles do", () => {
    expect(chartAxisControlLabel("RESET", false).pressed).toBeUndefined();
    expect(chartAxisControlLabel("RESET", true).pressed).toBeUndefined();
    for (const c of TOGGLES) {
      expect(chartAxisControlLabel(c, true).pressed, c).toBe(true);
      expect(chartAxisControlLabel(c, false).pressed, c).toBe(false);
    }
  });

  it("the glyph vocabulary is preserved exactly — the fix is the NAME, not the strip", () => {
    expect(chartAxisControlLabel("RESET", false).glyph).toBe("R");
    expect(chartAxisControlLabel("AUTO_SCALE", true).glyph).toBe("A");
    expect(chartAxisControlLabel("PERCENT", true).glyph).toBe("%");
    expect(chartAxisControlLabel("LOG", true).glyph).toBe("L");
    // The glyph never depends on the state.
    for (const c of ALL) {
      expect(chartAxisControlLabel(c, true).glyph).toBe(chartAxisControlLabel(c, false).glyph);
    }
  });

  it("the two sentences AUTO_SCALE already shipped are carried across verbatim", () => {
    expect(chartAxisControlLabel("AUTO_SCALE", true).title).toContain("A — Auto Scale ON");
    expect(chartAxisControlLabel("AUTO_SCALE", false).title).toContain("A — Scale LOCKED");
  });
});

describe("MainChart adoption", () => {
  const CODE = codeOf("components/chart/MainChart.tsx");

  it("× THE BARE NOUN: the identical-in-both-states titles are gone from the source", () => {
    expect(CODE, 'the bare-noun title "Percentage mode" is back')
      .not.toContain('"Percentage mode"');
    expect(CODE, 'the bare-noun title "Log scale" is back')
      .not.toContain('"Log scale"');
  });

  it("× THE UNCONSULTED OWNER: all four glyphs compile through chartAxisControlLabel", () => {
    expect(CODE).toContain('chartAxisControlLabel("RESET"');
    expect(CODE).toContain('chartAxisControlLabel("AUTO_SCALE", autoScale)');
    expect(CODE).toContain("chartAxisControlLabel(btn.control, btn.active)");
    expect(CODE).toContain('control: "PERCENT"');
    expect(CODE).toContain('control: "LOG"');
  });

  it("the state reaches assistive tech, not only the background colour", () => {
    expect(CODE).toContain("aria-pressed={c.pressed}");
    expect(CODE).toContain("aria-label={c.spoken}");
    expect(CODE).toContain('aria-pressed={chartAxisControlLabel("AUTO_SCALE", autoScale).pressed}');
  });

  it("the visible glyph is the owner's glyph, not a retyped literal", () => {
    expect(CODE).toContain("{c.glyph}");
    expect(CODE).toContain('{chartAxisControlLabel("AUTO_SCALE", autoScale).glyph}');
  });
});
