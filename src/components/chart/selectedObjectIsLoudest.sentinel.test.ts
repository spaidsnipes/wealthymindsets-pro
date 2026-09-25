/**
 * THE SELECTED OBJECT IS LOUDEST — AND EVERYTHING ELSE RECEDES.
 *
 * Found at HEAD (2026-09-25): selection brightened only the zone layer's own
 * item; the Living slice outline was stroked INSIDE Living's alpha, so at FAR
 * with a 30% lane the thing Inspect was reading sat near 0.1; and a bubble
 * click opened Inspect while the canvas never learned which bubble — the
 * selected print reached only the ticket.
 *
 * The attention governor now takes the room's ONE selection (object, slice or
 * print — never a second state in MainChart), located on this frame's camera,
 * and recedes every governed layer that is not the selected item while
 * Inspect reads it. This file pins the wiring; the arithmetic is unit-tested
 * in selectAttentionGovernor.test.ts.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

const CHART = strip(read("src/components/chart/MainChart.tsx"));
const ROOM = read("src/components/chart/ChartsDashboard.tsx");

const slice = (from: string, to: string) => {
  const a = CHART.indexOf(from);
  const b = a < 0 ? -1 : CHART.indexOf(to, a);
  expect(a, from).toBeGreaterThan(-1);
  expect(b, to).toBeGreaterThan(a);
  return CHART.slice(a, b);
};

describe("the selected object is loudest", () => {
  it("the selection comes from the room's props, located on camera, and reaches the governor", () => {
    const sel = slice("const selectedBubbleKey = ", "let att = selectAttentionGovernor({");
    expect(sel).toMatch(/const selectedBubbleKey = selectedPrintRef\.current\?\.printKey \?\? null;/);
    for (const ref of ["selectedObjectIdRef.current", "selectedSliceRef.current", "selectionInspectedRef.current"]) {
      expect(sel, ref).toContain(ref);
    }
    for (const kind of ["ZONE", "LEVEL", "SLICE", "BUBBLE", "ANATOMY"]) expect(sel).toContain(`kind: "${kind}"`);
    // An absorption shelf / exhaustion mark is on camera only while the window
    // still draws it — the reducer's last resolution, never assumed.
    expect(sel).toContain("selectedAnatomyRef.current");
    expect(sel).toContain("onCamera: anatomyReadingDrawn(picked.reading),");
    // Every kind is measured against the plot, not assumed visible.
    expect(sel.match(/onCamera/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(sel).toMatch(/pane0Bottom/);
    expect(sel).toMatch(/plotRight/);
    const gov = slice("let att = selectAttentionGovernor({", "});");
    expect(gov).toMatch(/selection: attSelection,/);
    expect(CHART).toMatch(/canvas\.dataset\.attentionSelection = att\.selectionReceipt;/);
    // No second selection state in the chart.
    expect(CHART).not.toMatch(/useState[^\n]*[Ss]elected[A-Z]\w*Bubble|selectedBubbleKeyRef|useRef[^\n]*selectedBubble/);
  });

  it("both bubble loops read the selected print's key, recede the rest, and mark the selected one at full strength", () => {
    const delta = slice("const hoverIdD = bubbleHoverRef.current;", "} else if (deltaBubblesRef.current.length) {");
    const big = slice("for (const b of [...bubblesRef.current].sort(", "canvas.dataset.bigTradeLabelsStaggered");
    for (const [name, loop, key] of [["delta", delta, "bubbles"], ["big-trade", big, "bigTrades"]] as const) {
      expect(loop, name).toMatch(/const selB = selectedBubbleKey != null && b\.spawnKey === selectedBubbleKey;/);
      expect(loop, name).toContain(`ctx.globalAlpha = att.alpha("${key}", { selectedItem: selB });`);
      expect(loop, name).toContain(`ctx.globalAlpha = att.textAlpha("${key}", { selectedItem: selB });`);
      // The mark is drawn AFTER the bubble's own save/restore, outside its alpha.
      const restore = loop.lastIndexOf("ctx.restore();");
      const mark = loop.indexOf("if (selB) markSelectedBubble(b, Rx, Ry);");
      expect(mark, name).toBeGreaterThan(restore);
    }
    // The selected big trade is never demoted to a quiet ring.
    expect(big).toMatch(/if \(bubbleRank\+\+ >= BIG_TRADE_FULL && hoverId !== b\.id && !selB\) \{/);
    const mark = slice("const markSelectedBubble = ", "};");
    expect(mark).toMatch(/ctx\.globalAlpha = 1;/);
    expect(mark).toMatch(/ctx\.ellipse\(b\.x, b\.y, rx \+ 6, ry \+ 6,/);
    expect(mark).toMatch(/srs\.priceToCoordinate\(b\.anchorPrice\)/);
    expect(mark).toMatch(/setLineDash\(\[1, 3\]\)/);
  });

  it("the Living slice outline is stroked after Living's alpha is restored, at globalAlpha 1", () => {
    const living = slice("let sliceOutline: ", "if (drawnBars > 0) ds.livingProfileBars");
    const stroke = living.indexOf("ctx.strokeRect(sliceOutline.x, sliceOutline.y, sliceOutline.w, sliceOutline.h);");
    expect(stroke).toBeGreaterThan(-1);
    // Living's own restore is the last one before the stroke; nothing but the
    // full-strength save sits between them.
    const rowsEnd = living.lastIndexOf("ctx.restore();", stroke);
    expect(rowsEnd).toBeGreaterThan(-1);
    expect(living.slice(rowsEnd, stroke)).toMatch(/^ctx\.restore\(\);\s*if \(sliceOutline\) \{\s*ctx\.save\(\); ctx\.globalAlpha = 1;\s*ctx\.strokeStyle = "rgba\(201,165,92,1\)"; ctx\.lineWidth = 1\.5;\s*$/);
    // Inside the rows loop the slice is only located, never stroked.
    const rows = living.slice(0, rowsEnd);
    expect(rows).toMatch(/sliceOutline = \{ x: rightEdge - histMax - 2\.5,/);
    expect(rows).not.toMatch(/strokeRect\(rightEdge - histMax - 2\.5/);
    // Its receipt is profile geometry: withdrawn every frame with the rest.
    expect(read("src/components/chart/MainChart.tsx")).toMatch(/const PROFILE_GEOMETRY_RECEIPTS = \[[^\]]*"livingProfileSelected"/);
  });

  it("the selected zone asks for SELECTED; the other zones ask for the layer's alpha", () => {
    expect(CHART).toMatch(/ctx\.globalAlpha = att\.alpha\("marketZones", \{ selectedItem: selected \}\);/);
  });

  it("the selected shelf or mark asks for SELECTED; its peers ask the governor — no second dimmer", () => {
    expect(CHART).toContain('ctx.globalAlpha = att.alpha("absorption", { selectedItem: shelfSelected });');
    expect(CHART).toContain('ctx.globalAlpha = att.alpha("exhaustion", { selectedItem: markSelected });');
    expect(CHART).not.toMatch(/anatomyPeersQuiet/);
  });

  it("the room hands the canvas its selection and whether Inspect is reading it", () => {
    const main = ROOM.slice(ROOM.indexOf("<MainChart"), ROOM.indexOf("/>", ROOM.indexOf("selectedMarketObjectId={selectedMarketObjectId}")));
    expect(main).toMatch(/selectedPrintOnChart=\{activeSelectedPrint\}/);
    expect(main).toMatch(/selectedProfileSlicePrice=\{activeProfileSlice\?\.found \? activeProfileSlice\.price : null\}/);
    expect(main).toMatch(/selectedMarketObjectId=\{selectedMarketObjectId\}/);
    expect(main).toMatch(/selectionInspected=\{inspectOpen\}/);
  });
});
