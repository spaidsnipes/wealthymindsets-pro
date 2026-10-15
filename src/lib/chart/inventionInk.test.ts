import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CALL_WALL_RGB, PUT_WALL_RGB } from "@/components/chart/wallsGammaGlass";
import { FLOW_COLOR_DEFAULTS } from "@/components/chart/ChartSettingsModal";
import { inksDistinct } from "./appearanceLaw";

/**
 * PER-INVENTION COLOUR (Founder G19 Supermax §5, 2026-10-10): FVG bull / bear and
 * Call / Put Walls take the trader's own ink; untouched they look exactly as before;
 * a pair made identical falls back to the room's pair.
 */
const hex = (rgb: string) => "#" + rgb.split(",").map(n => Number(n).toString(16).padStart(2, "0")).join("").toUpperCase();
const CHART = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
const GLASS = readFileSync(path.join(process.cwd(), "src/components/chart/wallsGammaGlass.ts"), "utf8");
const MODAL = readFileSync(path.join(process.cwd(), "src/components/chart/ChartSettingsModal.tsx"), "utf8");

describe("defaults are today's look", () => {
  it("reads the sources", () => {
    expect(CHART.length).toBeGreaterThan(100_000);
    expect(GLASS.length).toBeGreaterThan(5_000);
    expect(MODAL.length).toBeGreaterThan(5_000);
  });
  it("the swatches open on the inks the glass paints untouched", () => {
    expect(FLOW_COLOR_DEFAULTS.callWallInk).toBe(hex(CALL_WALL_RGB));
    expect(FLOW_COLOR_DEFAULTS.putWallInk).toBe(hex(PUT_WALL_RGB));
    expect(FLOW_COLOR_DEFAULTS.fvgBullInk).toBe(FLOW_COLOR_DEFAULTS.deltaBuy);
    expect(FLOW_COLOR_DEFAULTS.fvgBearInk).toBe(FLOW_COLOR_DEFAULTS.deltaSell);
  });
  it("the room's pairs are themselves lawful", () => {
    expect(inksDistinct(`rgb(${CALL_WALL_RGB})`, `rgb(${PUT_WALL_RGB})`)).toBe(true);
  });
});

describe("wired", () => {
  it("FVG bands paint their own ink, falling back to the delta inks", () => {
    expect(CHART).toContain("ink: g.bullish ? flowColorsRef.current.fvgBull : flowColorsRef.current.fvgBear");
    expect(CHART).toContain('fvgBull: hexRgb(chartSettings?.fvgBullInk ?? chartSettings?.deltaBuy, "34,197,94")');
  });
  it("walls glass takes the trader's call / put ink and keeps call solid, put dashed", () => {
    expect(CHART).toContain("callRgb: flowColorsRef.current.callWall, putRgb: flowColorsRef.current.putWall,");
    expect(GLASS).toContain("rgb = call ? (env.callRgb ?? CALL_WALL_RGB) : (env.putRgb ?? PUT_WALL_RGB);");
    expect(GLASS).toContain("ctx.setLineDash(call ? [] : [5, 3]);");
  });
  it("an identical pair goes back to the room's pair", () => {
    expect(CHART).toContain("if (!inksDistinct(`rgb(${fc.callWall})`, `rgb(${fc.putWall})`)) { fc.callWall = CALL_WALL_RGB; fc.putWall = PUT_WALL_RGB; }");
    expect(CHART).toContain("if (!inksDistinct(`rgb(${fc.fvgBull})`, `rgb(${fc.fvgBear})`))");
  });
  it("Chart Settings offers the five swatches", () => {
    for (const l of ["Fair Value Gap · bullish", "Fair Value Gap · bearish", "Call Wall (solid)", "Put Wall (dashed)", "Brick Wall · brick face"]) expect(MODAL).toContain(`label="${l}"`);
  });
  it("Brick Walls: the trader's ink is the lit face; the shade keeps the clay ratios; untouched = the room's clay", () => {
    expect(FLOW_COLOR_DEFAULTS.brickWallInk).toBe("#D6B070");
    expect(CHART).toContain('brickFaceRef.current = (hexRgb(chartSettings?.brickWallInk, "214,176,112")');
    expect(CHART).toContain("const [fr0, fg0, fb0] = brickFaceRef.current;");
    // PUT-heavy masonry is fired darker and redder from the same ink (2026-10-15).
    expect(CHART).toContain('const putHeavy = w.polarity === "PUT_HEAVY";');
    expect(CHART).toContain("rgba(${Math.round(fr * 0.682 * tone)},${Math.round(fg * 0.625 * tone)},${Math.round(fb * 0.554 * tone)}");
  });
});
