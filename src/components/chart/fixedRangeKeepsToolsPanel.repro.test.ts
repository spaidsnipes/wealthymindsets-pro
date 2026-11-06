/**
 * GARDEN 19 B1 — "selecting Fixed Range Profile dismisses Chart Tools"
 * (Codex 01a1426c, reproduced on the glass 2026-10-16). The ordinary profile
 * toggles kept the panel; the two DRAW gestures put it down (rightly, Garden
 * 16 §17/§18 — the backdrop ate the drag) and NOTHING brought it back, so the
 * trader lost the panel and their place in it after every fixed range.
 *
 * Reproduced first against the pre-fix tree (the wiring test went red: no
 * owner reopened the sheet). The fix: drawGestureSheetReturn — close on arm,
 * return when the gesture ends at the cursor.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = readFileSync(path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");

describe("B1 · Fixed Range Profile hands the chart back, then the Tools panel returns", () => {
  it("the dashboard routes arming and tool changes through the one return owner", () => {
    expect(SRC).toMatch(/from "@\/lib\/chart\/drawGestureSheetReturn"/);
    expect(SRC).toContain("sheetReturnRef.current = onArmFromSheet(sheetReturnRef.current, arming && chartEquipmentOpen).state;");
    expect(SRC).toMatch(/onToolChange\(sheetReturnRef\.current, sheetReturnPrevToolRef\.current, drawingTool\)[\s\S]{0,200}if \(r\.reopenSheet\) setChartEquipmentOpen\(true\);/);
    // Garden 16 §17/§18 still holds: arming puts the sheet down.
    expect(SRC).toContain("if (arming) setChartEquipmentOpen(false);");
  });

  it("the full gesture: open sheet → arm Fixed Range → drag → placed → sheet is back", async () => {
    const m = await import("@/lib/chart/drawGestureSheetReturn");
    let sheetOpen = true;
    let st = m.SHEET_RETURN_IDLE;
    let tool = "cursor";
    const setTool = (next: string) => {
      const r = m.onToolChange(st, tool, next);
      tool = next; st = r.state;
      if (r.reopenSheet) sheetOpen = true;
    };
    // Pick "Fixed Range Profile" in the open sheet.
    const arm = m.onArmFromSheet(st, sheetOpen);
    st = arm.state;
    if (arm.closeSheet) sheetOpen = false;
    setTool("anchored-vp");
    expect(sheetOpen).toBe(false); // the drag lands on the market, not the backdrop
    // The range is placed → onDrawingComplete → cursor.
    setTool("cursor");
    expect(sheetOpen).toBe(true);
    // A later, unrelated return to the cursor does not reopen it again.
    sheetOpen = false;
    setTool("trendline"); setTool("cursor");
    expect(sheetOpen).toBe(false);
  });

  it("Escape and re-pick return the panel; switching to another drawing tool does not", async () => {
    const m = await import("@/lib/chart/drawGestureSheetReturn");
    let st = m.onArmFromSheet(m.SHEET_RETURN_IDLE, true).state;
    expect(m.onToolChange(st, "anchored-vp", "cursor").reopenSheet).toBe(true);
    st = m.onArmFromSheet(m.SHEET_RETURN_IDLE, true).state;
    const toTrend = m.onToolChange(st, "delta-vp", "trendline");
    expect(toTrend.reopenSheet).toBe(false);
    expect(toTrend.state.pending).toBe(false);
  });

  it("armed from outside the sheet (rail, finder with the sheet closed) owes no return", async () => {
    const m = await import("@/lib/chart/drawGestureSheetReturn");
    const st = m.onArmFromSheet(m.SHEET_RETURN_IDLE, false).state;
    expect(m.onToolChange(st, "anchored-vp", "cursor").reopenSheet).toBe(false);
  });

  it("the trader reopening the sheet mid-gesture clears the debt", async () => {
    const m = await import("@/lib/chart/drawGestureSheetReturn");
    const st = m.onSheetOpened(m.onArmFromSheet(m.SHEET_RETURN_IDLE, true).state);
    expect(m.onToolChange(st, "anchored-vp", "cursor").reopenSheet).toBe(false);
  });
});
