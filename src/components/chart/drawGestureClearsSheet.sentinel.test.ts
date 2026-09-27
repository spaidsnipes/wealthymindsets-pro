/**
 * ARMING A DRAW GESTURE PUTS THE CHART TOOLS SHEET DOWN — Garden 16 §17/§18,
 * found on the glass 2026-09-27 (local /charts TSLA 15m, real Webull bars).
 * Tools › Chart tools › Profiles › "Fixed Range Profile" armed the anchored-VP
 * tool but left the modal sheet (and its full-screen backdrop, fixed inset-0
 * z 200) over the candles. The trader's drag started on the backdrop: the
 * press closed the sheet, the release dropped ONE anchor, and the chart said
 * "FIXED RANGE · 1 bars in the span — drag across at least 5"; the range never
 * committed and was gone after refresh. Bid/Ask Split (Delta + VP) is the same
 * gesture. Source read; the glass run is the proof.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SRC = readFileSync(path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");

describe("a DRAW gesture armed from the sheet hands the chart back", () => {
  it("both draw-gesture profiles close the sheet when armed, and only when armed", () => {
    const i = SRC.indexOf('else if (id === "DELTA_VP" || id === "ANCHORED_RANGE") {');
    expect(i, "the draw-gesture branch moved").toBeGreaterThan(-1);
    const block = SRC.slice(i, SRC.indexOf("};", i));
    expect(block).toContain("const arming = drawingTool !== tool;");
    expect(block).toContain('setDrawingTool(arming ? tool : "cursor");');
    expect(block).toContain("if (arming) setChartEquipmentOpen(false);");
  });
});
