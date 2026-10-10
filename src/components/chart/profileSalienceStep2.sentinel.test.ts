/**
 * PROFILE SALIENCE · STEP 2 (G19, Founder 2026-10-10: "white-line profiles
 * without adequate visual embodiment").
 *
 *   · Profile DNA (cert P110.5 open item: "the spine and diamond are too small
 *     to read with words erased"): salience by GEOMETRY, never alpha — the
 *     ASK-6 ceiling (DNA quieter than the 0.76 body) stands. A dark halo under
 *     the spine and the diamond, and a larger mass diamond.
 *   · Structure Profile (serving BTC-USD 15m at 1440: soft 0.4 / 0.2 haze in
 *     the cube box): every width takes the crisp row form with a bright
 *     leading edge; desktop one step quieter than the phone.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const RAW = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
const CHART = RAW.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

const block = (from: string, to: string) => {
  const a = CHART.indexOf(from);
  const b = CHART.indexOf(to, a + from.length);
  expect(a, `"${from}" is gone`).toBeGreaterThan(-1);
  expect(b, `"${to}" no longer follows`).toBeGreaterThan(a);
  return CHART.slice(a, b);
};

describe("Profile DNA reads with words erased — geometry, not alpha", () => {
  it("reads the chart source", () => {
    expect(RAW.length).toBeGreaterThan(100000);
  });

  const DNA = block("const paintProfileDnaAt = (sx: number): boolean => {", "const lp = livingProfileRef.current;");

  it("keeps the ASK-6 alpha ceiling", () => {
    expect(CHART).toContain("const DNA_SPINE_A = 0.6;");
    expect(CHART).toContain("const DNA_BRACKET_A = 0.65;");
  });

  it("haloes the spine before it strokes it", () => {
    expect(DNA.length).toBeGreaterThan(1500);
    const halo = DNA.indexOf("ctx.strokeStyle = DNA_HALO; ctx.lineWidth = 4;");
    const spine = DNA.indexOf("ctx.setLineDash(dna.estimated ? [2, 2] : []);");
    expect(halo).toBeGreaterThan(-1);
    expect(spine).toBeGreaterThan(halo);
  });

  it("draws a larger, haloed, still-hollow mass diamond", () => {
    expect(CHART).toContain("const DNA_DIAMOND_R = 6;");
    expect(DNA).toContain("const dr = DNA_DIAMOND_R;");
    expect(DNA).toContain("ctx.strokeStyle = DNA_HALO; ctx.lineWidth = 3.5; ctx.stroke();");
    const diamond = DNA.slice(DNA.indexOf("const dr = DNA_DIAMOND_R;"), DNA.indexOf("ctx.restore();", DNA.indexOf("const dr = DNA_DIAMOND_R;")));
    expect(diamond).not.toContain("ctx.fill()");
  });

  it("receipts the step", () => {
    expect(DNA).toContain("ds.profileDnaSalience = `STEP2|SPINE:${DNA_SPINE_A}@1.5+HALO|BRACKET:${DNA_BRACKET_A}|DIAMOND:R${DNA_DIAMOND_R}`;");
  });
});

describe("Structure Profile rows are crisp at every width", () => {
  const ST = block('if (form === "HISTOGRAM") {', "const legDrawn = Number.isFinite(top) && Number.isFinite(bot);");

  it("desktop rows are one step quieter than the phone, never the old haze", () => {
    expect(ST.length).toBeGreaterThan(400);
    expect(ST).toContain('ctx.fillStyle = r.isPoc ? pk.rgba("POC", 0.82) : r.insideValueArea ? pk.rgba("VALUE", 0.54) : pk.rgba("TAIL", 0.32);');
    expect(ST).not.toContain('pk.rgba("TAIL", 0.2)');
  });

  it("every width carries the bright leading edge", () => {
    expect(ST).toContain("if (w >= 3) {");
    expect(ST).not.toContain("if (narrowGlass && w >= 3) {");
  });

  it("receipts the row edge and withdraws it", () => {
    expect(CHART).toContain('ds.structureProfileRowEdge = narrowGlass ? "CRISP+EDGE:NARROW" : "CRISP+EDGE"');
    expect(CHART).toContain("delete ds.structureProfileRowEdge;");
  });
});
