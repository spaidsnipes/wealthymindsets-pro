/**
 * FIXED RANGE PROFILE · SOLID SLAB (G19, Founder 2026-10-10: "white-line
 * profiles without adequate visual embodiment"). Serving BTC-USD 15m, 41 bars:
 * the Fixed Range's rows were 1-px white hairlines (≈2 px pitch, drawn at
 * rowH − 1). This gate holds the repair:
 *   1. rows merge into display bands of at least PROFILE_ROW_MIN_PX through
 *      the one pure owner (profileDisplayBands.ts) — no canvas-side re-measure;
 *   2. its own material: a solid slab with a brass seam at the anchor rail,
 *      distinct from VRP's lit glass and Structure's crisp edge;
 *   3. inks are the family's roles; the material is receipted.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const RAW = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
const CHART = RAW.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const a = CHART.indexOf('else if (t === "anchored-vp") {');
const b = CHART.indexOf('else if (t === "delta-vp") {', a);
const FR = CHART.slice(a, b);

describe("Fixed Range Profile paints a solid slab, not white hairlines", () => {
  it("reads the chart source and finds the Fixed Range block", () => {
    expect(RAW.length).toBeGreaterThan(100000);
    expect(a).toBeGreaterThan(-1);
    expect(b).toBeGreaterThan(a);
    expect(FR.length).toBeGreaterThan(1500);
  });

  it("merges rows into readable bands through the one owner", () => {
    expect(CHART).toContain('import { mergeIntoBands, rowsPerBand, PROFILE_ROW_MIN_PX } from "@/lib/chart/profileDisplayBands";');
    expect(FR).toContain("const k = rowsPerBand(rowH, PROFILE_ROW_MIN_PX);");
    expect(FR).toContain("const bands = mergeIntoBands(vm.rows, k);");
    expect(FR).not.toContain("for (const r of vm.rows) {");
  });

  it("fills each band solid and hangs it from a brass seam at the anchor", () => {
    expect(FR).toContain('ctx.fillStyle = bd.isPoc ? pk.rgba("POC", 0.78) : bd.insideValueArea ? pk.rgba("VALUE", 0.5) : pk.rgba("TAIL", 0.3);');
    expect(FR).toContain("ctx.fillRect(x0 + 2, yTopB, w, hB);");
    expect(FR).toContain('ctx.fillStyle = pk.rgba("ANCHOR", bd.isPoc ? 1 : 0.85);');
    expect(FR).toContain("ctx.fillRect(x0 + 2, yTopB, 2, hB);");
  });

  it("keeps the exact levels on their own rules and receipts the slab", () => {
    expect(FR).toContain('hline(vm.poc, pk.rgba("POC", 0.9), []);');
    expect(FR).toContain("fixedRangeReceipts.push(`SLAB:${bands.length}x${k}`);");
  });
});
