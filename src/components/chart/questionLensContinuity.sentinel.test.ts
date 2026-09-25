/**
 * THE QUESTION LENS AND A RESTORED SELECTION STAY USABLE — Garden Pass 12,
 * Defects 4, 6, 7 and the 390 law.
 *
 * Found reviewing the cloud team's lens / continuity commits (35d3fbf4,
 * d764d1fb, 29b0acc5) on 2026-09-25:
 * - the Ask row (the only way to change the question, and the only Show raw)
 *   sat at a fixed top:532 in an overflow-hidden pane and was hidden below
 *   640px, so short panes and phones lost both controls;
 * - a refused question drew a 420px strip on a 390px canvas;
 * - TPO stepped 314px into the candles whenever the lens layer was ON, even
 *   with no question painted;
 * - after a refresh restored a zone, the first click on it DESELECTED it and
 *   opened the bar ticket instead of its Passport.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { CHART_SELECTION_AT_REST, selectChartSelection } from "@/lib/marketData/viewModels/chartSelection";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const read = (rel: string) => strip(readFileSync(path.join(process.cwd(), rel), "utf8"));
const CHART = read("src/components/chart/MainChart.tsx");
const ROOM = read("src/components/chart/ChartsDashboard.tsx");

describe("question lens and restored selection", () => {
  it("the Ask row stays inside the pane at every height and renders on phones", () => {
    const at = ROOM.indexOf('data-testid="question-lens-chooser"');
    expect(at).toBeGreaterThan(-1);
    const row = ROOM.slice(at, at + 900);
    expect(row).toContain('top: "min(532px, calc(100% - 96px))"');
    expect(row).not.toMatch(/top: 532\b/);
    expect(row).not.toMatch(/\bhidden\b[^"]*sm:flex/);
  });

  it("a refused question fits narrow glass", () => {
    expect(CHART).toMatch(/const refuseW = W < 640 \? Math\.max\(120, W - 24\) : stripW;/);
    expect(CHART).toMatch(/ctx\.fillRect\(bx, by, refuseW, bh\)/);
  });

  it("TPO yields the left column only when the lens actually painted it this frame", () => {
    // Pin moved 64 → 84 (2026-09-25): the EFFORT reopen button's box ends at x 76.
    expect(CHART).toMatch(/const leftEdge = lensColumnActive \? QUESTION_LENS_COLUMN_RIGHT : 84;/);
    expect(CHART).toMatch(/lensColumnActive = !narrowLens;/);
    expect(CHART).toMatch(/if \(!lensFormPainted\) delete ds\.questionLensForm;/);
  });

  it("TPO letters yield to the price legend and to chips already in their column", () => {
    // Serving, NQ1! 5m desktop, 2026-09-25: the top rows printed under the
    // transparent legend band and beside the BASIS caption.
    const at = CHART.indexOf("const tpoYields = [");
    expect(at).toBeGreaterThan(-1);
    const block = CHART.slice(at, at + 700);
    expect(block).toContain("{ x: 0, y: 0, w: W, h: PRICE_LEGEND_OVERLAY_H }");
    expect(block).toContain("...floatingChips.filter(");
    expect(block).toContain('ctx.clip("evenodd")');
    expect(block).toContain("ds.tpoYields = String(tpoYields.length)");
    // The BASIS caption announces itself so later layers can yield to it.
    expect(CHART).toMatch(/floatingChips\.push\(\{ x: bx, y: by, w: bwTxt \+ 6, h: 15 \}\)/);
  });

  it("clicking a restored zone opens its Passport and keeps it selected", () => {
    // The click semantics moved into the one selection reducer; the room
    // routes every pin click to it and restores through it.
    expect(ROOM).toMatch(/onSelectMarketObject=\{id => actOnChartSelection\(\{ type: "toggleObject", objectId: id \}\)\}/);
    expect(ROOM).toMatch(/type: "reconcile",/);
    const restored = selectChartSelection(CHART_SELECTION_AT_REST, {
      type: "reconcile", symbol: "AAPL", timeframe: "5m", compiledObjectIds: ["ZONE-1"], savedObjectId: "ZONE-1",
    });
    expect(restored).toEqual({ selection: { kind: "OBJECT", objectId: "ZONE-1" }, inspectOpen: false });
    expect(selectChartSelection(restored, { type: "toggleObject", objectId: "ZONE-1" }))
      .toEqual({ selection: { kind: "OBJECT", objectId: "ZONE-1" }, inspectOpen: true });
  });
});
