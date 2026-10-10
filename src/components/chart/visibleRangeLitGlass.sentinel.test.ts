/**
 * VISIBLE RANGE PROFILE · LIT GLASS (G19, Founder 2026-10-10: "white-line
 * profiles without adequate visual embodiment"). The VRP rows were hollow
 * hairline outlines over a 0.08–0.2 wash — on serving (BTC-USD 15m) they read
 * as white lines, not a histogram. This gate holds the repair:
 *   1. rows are SOLID, lit by a lane-wide gradient (dim at the axis, bright at
 *      full reach) so heavy and thin prices read apart without claiming a
 *      node — HVN / LVN stay trade-based only (selectLivingProfile);
 *   2. every row carries a crisp 2-px leading tip, and no outline rectangle;
 *   3. the material is receipted on the canvas and withdrawn when not drawn;
 *   4. the inks are the family's roles (pk), never a literal.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const RAW = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
const CHART = RAW.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

const a = CHART.indexOf("const lane = stackPlan.lanes.VISIBLE_RANGE;");
const b = CHART.indexOf("const autoPair: StackSpecies[] | null =", a);
const VRP = CHART.slice(a, b);

describe("Visible Range Profile paints lit glass, not white lines", () => {
  it("reads the chart source and finds the VRP block", () => {
    expect(RAW.length).toBeGreaterThan(100000);
    expect(a).toBeGreaterThan(-1);
    expect(b).toBeGreaterThan(a);
    expect(VRP.length).toBeGreaterThan(2800);
  });

  it("builds one lane-wide gradient per role, dim at the axis and lit at full reach", () => {
    expect(VRP).toContain("ctx.createLinearGradient(right, 0, right - width, 0)");
    expect(VRP).toMatch(/poc: vrpLitOf\(pk\.rgba\("POC", [0-9.]+\), pk\.rgba\("POC", [0-9.]+\)\)/);
    expect(VRP).toMatch(/value: vrpLitOf\(pk\.rgba\("VALUE", [0-9.]+\), pk\.rgba\("VALUE", [0-9.]+\)\)/);
    expect(VRP).toMatch(/tail: vrpLitOf\(pk\.rgbaAs\("TAIL", "VALUE", [0-9.]+\), pk\.rgbaAs\("TAIL", "VALUE", [0-9.]+\)\)/);
  });

  it("fills each row solid, caps it with a 2-px tip, and draws no outline box", () => {
    const loop = VRP.slice(VRP.indexOf("for (const r of vrpVM.rows)"), VRP.indexOf('ds.visibleRangeProfileMaterial = "LIT_GLASS+TIP";'));
    expect(loop.length).toBeGreaterThan(200);
    expect(loop).toContain("ctx.fillStyle = r.isPoc ? vrpLit.poc : r.insideValueArea ? vrpLit.value : vrpLit.tail;");
    expect(loop).toContain("ctx.fillRect(right - w, y, Math.min(2, w), h);");
    expect(loop).not.toContain("strokeRect");
  });

  it("receipts the material and withdraws it when the lane does not draw", () => {
    expect(VRP).toContain('ds.visibleRangeProfileMaterial = "LIT_GLASS+TIP";');
    expect(VRP).toContain("delete ds.visibleRangeProfileMaterial;");
  });

  it("speaks only the family's ink roles", () => {
    const loop = VRP.slice(VRP.indexOf("const vrpLitOf"), VRP.indexOf('ds.visibleRangeProfileMaterial = "LIT_GLASS+TIP";'));
    expect(loop).not.toMatch(/rgba\(\d/);
    expect(loop).not.toMatch(/#[0-9a-fA-F]{6}/);
  });
});
