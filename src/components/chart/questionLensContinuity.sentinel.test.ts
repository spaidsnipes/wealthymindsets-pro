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
const ASK = read("src/components/chart/QuestionLensChooser.tsx");

describe("question lens and restored selection", () => {
  it("the Ask row stays inside the pane at every height and renders on phones", () => {
    // Pin repointed 2026-09-26 (UI-04, the ASK chooser lives with the lens):
    // the row's ONE markup moved into QuestionLensChooser, whose "floating"
    // placement carries the same in-pane top and the same no-hidden-on-phones
    // law. The room builds ONE element and floats it only where the rail is
    // not mounted; the rail gets it otherwise. The law is unchanged.
    const at = ASK.indexOf('data-testid="question-lens-chooser"');
    expect(at).toBeGreaterThan(-1);
    const style = ASK.slice(ASK.indexOf("const FLOATING_STYLE"), ASK.indexOf("const FLOATING_STYLE") + 300);
    expect(style).toContain('top: "min(532px, calc(100% - 96px))"');
    expect(ASK).toContain("style={floating ? FLOATING_STYLE : undefined}");
    expect(ASK).not.toMatch(/top: 532\b/);
    expect(ASK).not.toMatch(/\bhidden\b[^"]*sm:flex/);
    // ONE copy of the markup in the room; it floats only where there is no rail,
    // and nothing but the lens being on (on the Chart tab) gates it — no width
    // gate, so phones keep it.
    expect(ROOM).not.toContain('data-testid="question-lens-chooser"');
    expect(ROOM).toContain("const lensRailMounted = !narrowViewport && !optionsOpen;");
    expect(ROOM).toContain('const lensChooser = activeTab === "Chart" && !gridView && questionLensOn ? (');
    expect(ROOM).toContain("{!lensRailMounted && lensChooser}");
    expect(ROOM).toContain("lensChooser: lensRailMounted ? lensChooser : null,");
    expect(ROOM.split("<QuestionLensChooser").length - 1).toBe(1);
  });

  it("a refused question fits narrow glass", () => {
    expect(CHART).toMatch(/const refuseW = W < 640 \? Math\.max\(120, W - 24\) : stripW;/);
    expect(CHART).toMatch(/ctx\.fillRect\(bx, by, refuseW, bh\)/);
  });

  it("TPO yields the left column only when the lens actually painted it this frame", () => {
    // Pin moved 64 → 84 (2026-09-25): the EFFORT reopen button's box ends at x 76.
    expect(CHART).toMatch(/const leftEdge = lensColumnActive \? QUESTION_LENS_COLUMN_RIGHT : 84;/);
    expect(CHART).toMatch(/lensColumnActive = !narrowLens && !lensInRailRef\.current;/);
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
    // …and to the bottom-left word stack (serving NQ1! 5m, order-flow set on:
    // CONTRADICTION and LIQUIDITY LIFECYCLE words printed across the letters).
    // Pin moved 2026-09-25 (F08A/F08B canon pass): the LIQUIDITY LIFECYCLE
    // caption and the LIQUIDITY WEATHER word lines are no longer on the glass
    // at all (the weather is a lens, the lifecycle ladders on price), so TPO
    // reserves no caption row for them; CONTRADICTION's chip still yields.
    expect(block).not.toContain("lcLine");
    expect(CHART).not.toContain("liquidityCaptionLine");
    expect(CHART).toContain("floatingChips.push({ x: 12, y: H - 100 - 10, w: ctx.measureText(t).width, h: 14 });");
    expect(CHART).not.toMatch(/wordChip\(glass\.label, wy\);/);
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
