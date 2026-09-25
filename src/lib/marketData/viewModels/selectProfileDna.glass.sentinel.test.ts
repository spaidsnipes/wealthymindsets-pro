/**
 * SENTINEL — Profile DNA is GEOMETRY on the Living lane, not a text box over
 * the candles.
 *
 * The defect this stands over: DNA was a strip of text in an opaque 0.85 box
 * printed over price, describing only four of its numbers and drawing none of
 * them. The mass centre was never on the glass; there was no uncertainty mark.
 *
 * The law now: the canvas projects prices the DNA owner published (lo, hi,
 * VAL/VAH, POC, mass centre) onto a spine 6px left of the lane; the numbers
 * live in Inspect; receipts name what was drawn and are withdrawn when not.
 *
 * SOURCE-TEXT scope, read two named files. It cannot witness the raster; it
 * can hold the block to what it may and may not do.
 */

import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..", "..");
const chartSrc = readFileSync(path.join(ROOT, "src", "components", "chart", "MainChart.tsx"), "utf8");
const dashSrc = readFileSync(path.join(ROOT, "src", "components", "chart", "ChartsDashboard.tsx"), "utf8");
const ticketSrc = readFileSync(path.join(ROOT, "src", "components", "chart", "ChartInspectTicket.tsx"), "utf8");

/** The DNA draw block: the first brace block after its P-110 #5 header. */
function dnaBlock(src: string): string {
  const marker = src.indexOf("P-110 #5 · PROFILE DNA");
  if (marker === -1) throw new Error("Profile DNA draw block not found in MainChart.tsx");
  const open = src.indexOf("{", src.indexOf("*/", marker));
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(open, i + 1);
  }
  throw new Error("Profile DNA draw block never closes");
}

const BLOCK = dnaBlock(chartSrc);

describe("Profile DNA on the glass (Sentinel)", () => {
  it("finds the real DNA block to police", () => {
    // An emptiness assertion over a stub would pass vacuously.
    expect(BLOCK.length).toBeGreaterThan(1200);
    expect(BLOCK).toContain("profileDnaRef.current");
    expect(BLOCK).toMatch(/\.stroke\(\)/);
  });

  it("paints no opaque box and prints no text over price", () => {
    expect(BLOCK).not.toMatch(/fillRect\([^)]*\)/);
    expect(BLOCK).not.toContain("rgba(11,10,8");
    expect(BLOCK).not.toMatch(/fillText\(/);
    expect(BLOCK).not.toMatch(/dna\.strip/);
  });

  it("sits in the lane's own gutter and projects only owner-published prices", () => {
    expect(BLOCK).toContain("rightEdge - histMax - 6");
    for (const field of ["dna.lo", "dna.hi", "dna.val", "dna.vah", "dna.poc", "dna.massCentrePrice"]) {
      expect(BLOCK, `${field} is not projected`).toContain(field);
    }
    // No re-measuring on the canvas: the moments and range belong to the owner.
    expect(BLOCK).not.toMatch(/\.curve\b|Math\.pow|reduce\(/);
  });

  it("shows uncertainty as a dashed spine and a thin sample as the range alone", () => {
    expect(BLOCK).toContain("setLineDash(dna.estimated ? [2, 2] : [])");
    expect(BLOCK).toContain('dna.reason === "THIN_SAMPLE"');
    expect(BLOCK).toContain("rgba(237,230,211,0.25)");
    // Bracket, notch and diamond are drawn only for a measured reading.
    const measuredArm = BLOCK.slice(BLOCK.indexOf("if (dna.measured) {"));
    expect(measuredArm).toContain("lineWidth = 3");
    expect(measuredArm).toContain("sx - 3");
  });

  it("names what it drew in receipts and withdraws them when it did not", () => {
    expect(BLOCK).toMatch(/ds\.profileDnaSpine = `\$\{Math\.round\(\+yLo\)\}-\$\{Math\.round\(\+yHi\)\}`/);
    expect(BLOCK).toContain("ds.profileDnaDiamond = String(");
    expect(BLOCK).toContain("delete ds.profileDnaSpine");
    expect(BLOCK).toContain("delete ds.profileDnaDiamond");
    // With no Living Profile on the glass, DNA says so and withdraws its marks.
    const notDrawn = chartSrc.indexOf('ds.profileDna = layerOnRef.current.profileDna ? "LIVING_PROFILE_NOT_DRAWN" : "OFF"');
    expect(notDrawn).toBeGreaterThan(-1);
    const tail = chartSrc.slice(notDrawn, notDrawn + 400);
    expect(tail).toContain("delete ds.profileDnaSpine");
    expect(tail).toContain("delete ds.profileDnaDiamond");
  });

  it("puts the numbers in Inspect, fed by the same DNA reading", () => {
    expect(dashSrc).toContain("rowStep: livingProfileVM.tickSize");
    expect(dashSrc).toMatch(/profileDna=\{profileDnaOn \? profileDnaVM : null\}/);
    expect(dashSrc).toMatch(/profileDnaOnGlass=\{livingProfileOn && livingProfileGlass\.drawn\}/);
    expect(ticketSrc).toContain("data-inspect-profile-dna");
    for (const field of ["dna.skew", "dna.excessKurtosis", "dna.massCentre", "dna.rowStep", "dna.rows", "dna.bars"]) {
      expect(ticketSrc, `Inspect does not show ${field}`).toContain(field);
    }
  });
});
