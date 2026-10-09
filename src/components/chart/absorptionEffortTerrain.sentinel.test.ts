/**
 * UI-06 · ABSORPTION IS EFFORT AGAINST DISPLACEMENT, DRAWN (2026-09-27).
 * The plate's effort ridges under price against a weaker displacement line,
 * gold where effort ran high and displacement stayed weak — painted from the
 * ONE anatomy measurement, behind the candles.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");
const at = MC.indexOf("UI-06 · THE EFFORT TERRAIN");
// The block runs from its own heading to the NEXT block's heading — anchored on
// markers, not a character count (2026-10-09: a fixed 9,500-character window
// put this sentinel one comment away from failing for the wrong reason).
const end = at > 0 ? MC.indexOf("// ── BASIS. Compact, always visible", at) : -1;
const block = at > 0 && end > at ? MC.slice(at, end) : "";

describe("effort terrain", () => {
  it("reads the anatomy owner's own fields — nothing re-measured", () => {
    expect(block.length).toBeGreaterThan(0);
    expect(block).toContain("terr[j].b.effortNorm");
    // Garden 16 reconstruction (plate UI_06): the displacement IS the price
    // path — the ridges wrap the close path (terr[j].y), not a separate line.
    expect(block).toContain("sum += terr[j].y;");
    expect(block).toContain("terr[i].b.absorbing");
    expect(block).not.toMatch(/selectAbsorptionAnatomy\(/);
  });
  it("multi-scale ridges, gold absorbing span, displacement line; behind the candles; silent when UNMEASURED", () => {
    expect(block).toContain("const layers = [9, 5, 3, 1];");
    expect(block).toContain('ctx.clip(cutT, "evenodd");');
    expect(block).toContain('anatomy.basis !== "UNMEASURED"');
    // Depth is the ONE permission table's: absorption is SILENT at FAR.
    expect(block).toContain("if (!absorbPaints) {");
    expect(block).toContain("ds.absorptionTerrain = `BARS:");
  });
  it("words ask speaks(); the receipt is withdrawn with the layer", () => {
    expect(block).toContain('if (att.speaks("absorption")) {');
    expect(MC).toContain('"absorptionTerrain", "absorptionTravel"');
  });
});
