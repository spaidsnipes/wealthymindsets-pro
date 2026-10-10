/**
 * SENTINEL — complete appearance control, and no appearance that lies
 * (Founder order §5, 2026-10-09). The chart reads its settings through the one
 * appearance-law pass; every dial and colour the modal offers is read; the
 * opposed inks the trader cannot change (call vs put) stay distinct.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { inksDistinct } from "@/lib/chart/appearanceLaw";

const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");
const CHART = read("src/components/chart/MainChart.tsx");
const MODAL = read("src/components/chart/ChartSettingsModal.tsx");

describe("appearance stays lawful", () => {
  it("the chart reads its settings through the appearance-law pass, once, memoised", () => {
    expect(CHART).toContain("chartSettings: chartSettingsIn,");
    expect(CHART).toContain("() => lawfulSettings(chartSettingsIn, APPEARANCE_ROOM_PAIRS) ?? undefined,");
  });
  it("every dial and volume colour the modal offers is read by the chart (no dead control)", () => {
    for (const k of ["profileOpacity", "wallOpacity", "memoryOpacity", "volumeUp", "volumeDown"]) {
      expect(MODAL, k).toContain(`s.${k}`);
      expect(CHART, k).toMatch(new RegExp(`chartSettings\\?\\.${k}\\b`));
    }
    expect(CHART).toContain("userOpacity: userOpacityRef.current,");
  });
  it("call ≠ put: every OI wall / options-flow ink pair the chart paints is distinct", () => {
    const pairs = [...CHART.matchAll(/\? "(\d+,\d+,\d+)" : "(\d+,\d+,\d+)"/g)].filter(m => /call|CALL/.test(CHART.slice(Math.max(0, (m.index ?? 0) - 60), m.index)));
    expect(pairs.length).toBeGreaterThanOrEqual(3);
    for (const m of pairs) expect(inksDistinct(`rgb(${m[1]})`, `rgb(${m[2]})`), `${m[1]} vs ${m[2]}`).toBe(true);
  });
});

describe("Slice B marks are read by the chart and clamped by the one owner", () => {
  it("bubble size, footprint numbers and wall thickness reach the paint through appearanceLaw", () => {
    for (const k of ["bubbleScale", "footprintNumberStep", "wallThickness"]) {
      expect(MODAL, k).toContain(`s.${k}`);
      expect(CHART, k).toMatch(new RegExp(`chartSettings\\?\\.${k}\\b`));
    }
    expect(CHART).toContain("footprintNumberPx(footprintCellPx(rH), rH, userMarksRef.current.fpStep, MARKET_NUMBER_MIN_PX)");
    expect(CHART).toContain("ctx.lineWidth = 2 * userMarksRef.current.wall;");
    expect(CHART).toContain("const bubbleK = userMarksRef.current.bubble;");
  });
  it("the profile preset writes the five VP keys through the one helper and tells the chart", () => {
    expect(MODAL).toContain('applyProfilePreset(localStorage, preset, () => window.dispatchEvent(new Event("wm-vp-colors")))');
    expect(CHART).toContain('window.addEventListener("wm-vp-colors", load);');
  });
});
