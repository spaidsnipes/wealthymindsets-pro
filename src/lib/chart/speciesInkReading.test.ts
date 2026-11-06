import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { speciesInkReading } from "./speciesInkReading";
import { MARKET_FIELD_DEFAULT, VP_POC_DEFAULT } from "./marketFieldMaterial";

/*
 * P0 (Founder, Drive 1Cmn0x9B…, 2026-11-02): "while adjusting Structure Profile colors, chart indicators unexpectedly
 * dimmed, became dark, faded behind the chart, or appeared covered by a shadow … like a blinking/dimming lamp."
 *
 * Reproduced headless on BTC 1m (scratchpad repro sp-sheet.mjs / sp-colour.mjs, 2026-11-06):
 *  1. Chart Settings laid a 60% black backdrop over the chart while it was open: the chart strip beside the sheet read
 *     40% of its own luminance (11.44 → 4.55). Every indicator looked dark and shadowed while its colour was chosen,
 *     and came back when the sheet closed — the lamp.
 *  2. Three owners read the species inks three ways. The chart ran the law over defaults + choices (a Structure pick
 *     of the popover's own blue swatch twinned Visible Range's default and was REFUSED on the glass — its rows fell
 *     back to the leg ramp), while the popover and the sheet ran it over choices only and said nothing; the sheet even
 *     showed "#ede6d3" for Visible Range while the chart painted it blue.
 */
const ctx = { field: MARKET_FIELD_DEFAULT, poc: VP_POC_DEFAULT };

describe("speciesInkReading — one answer for the chart, the popover and the sheet", () => {
  it("a trader's choice always wins over a house default (no silent refusal, no flip to the leg ramp)", () => {
    const r = speciesInkReading({ STRUCTURE: "#5fa8ff" }, ctx);
    expect(r.refused).toEqual({});
    expect(r.inks.STRUCTURE).toEqual([0x5f, 0xa8, 0xff]);
    // Visible Range's house blue steps aside to the family ink instead of stealing the trader's pick.
    expect(r.inks.VISIBLE_RANGE).toBeUndefined();
    expect(r.shown.STRUCTURE).toBe("#5fa8ff");
    expect(r.shown.VISIBLE_RANGE).toBe(r.familyHex);
  });

  it("with no choices the house defaults paint, and the sheet shows what the glass paints", () => {
    const r = speciesInkReading(undefined, ctx);
    expect(r.inks.VISIBLE_RANGE).toEqual([0x5f, 0xa8, 0xff]);
    expect(r.inks.COMPOSITE).toEqual([0x3f, 0xe0, 0xc0]);
    expect(r.shown.VISIBLE_RANGE).toBe("#5fa8ff");
    expect(r.shown.STRUCTURE).toBe(r.familyHex);
    expect(r.familyHex).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("two of the trader's own choices that twin are still refused (the law is unchanged)", () => {
    const r = speciesInkReading({ STRUCTURE: "#f87171", MEMORY: "#f87172" }, ctx);
    expect(r.inks.STRUCTURE).toBeDefined();
    expect(r.refused.MEMORY).toBe("TWIN");
    expect(r.shown.MEMORY).toBe(r.familyHex);
  });

  it("the chart, the popover and the sheet all read the one owner", () => {
    const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");
    for (const f of ["src/components/chart/MainChart.tsx", "src/components/chart/ToolStylePopover.tsx", "src/components/chart/ChartSettingsModal.tsx"]) {
      const src = read(f);
      expect(src, f).toContain("speciesInkReading(");
      expect(src, f).not.toContain("lawfulSpeciesInks(");
    }
  });

  it("choosing a colour never darkens the chart: the appearance sheet lays no black backdrop over it", () => {
    const sheet = readFileSync(path.join(process.cwd(), "src/components/chart/ChartSettingsModal.tsx"), "utf8");
    expect(sheet).not.toContain('background: "rgba(0,0,0,0.6)", zIndex: 800');
    expect(sheet).toContain('data-testid="chart-settings-backdrop"');
  });
});
