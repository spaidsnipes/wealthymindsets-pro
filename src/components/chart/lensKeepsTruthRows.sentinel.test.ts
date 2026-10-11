import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * THE LOUPE NEVER LIES ACROSS A TRUTH LINE (serving 834, BTC-USD 5m all-on, 2026-10-10):
 * the brass handle and the DRAG LENS chip covered "… MODEL, ASSUMED DEALER SIDE" and the
 * options-flow scope. Material yields to fact: the handle shortens / turns / is not drawn,
 * and the chip goes above the lens, before either crosses a silence / truth row.
 */
const MC = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");

describe("weather lens yields to the truth rows", () => {
  it("reads the chart", () => {
    expect(MC.length).toBeGreaterThan(100_000);
  });
  it("the handle's fit test refuses a truth row", () => {
    expect(MC).toContain("return floatingChips.some(c => c.x === silenceX && c.x < bx1 && c.x + c.w > bx0 && c.y < by1 && c.y + c.h > by0);");
    expect(MC).toContain("return ex + hw <= plotR && ex - hw >= 0 && ey + hw <= plotB && !onTruthRow(ex, ey);");
  });
  it("the DRAG LENS chip goes above the lens when below would cover a truth row, and says so", () => {
    expect(MC).toContain("const dhTop = dhOnTruth(dhBelow) && !dhOnTruth(dhAbove) ? dhAbove : dhBelow;");
    expect(MC).toContain('ds.weatherLensDragChip = dhTop === dhBelow ? (dhOnTruth(dhBelow) ? "BELOW:ON_TRUTH" : "BELOW") : "ABOVE:TRUTH_BELOW";');
    expect(MC).toContain("delete ds.weatherLensDragChip;");
  });
});

describe("the gamma truth line says MODEL before its provenance", () => {
  it("a fitted line can only lose the trailing source / scope detail, never the model disclosure", () => {
    expect(MC).toContain("parts.push(`GAMMA · ${gex.grade} · MODEL, ASSUMED DEALER SIDE · ${src!.name}");
  });
});

