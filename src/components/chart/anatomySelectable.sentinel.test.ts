/**
 * A SHELF OR MARK ON THE GLASS IS SELECTABLE, AND WHAT IS SELECTED IS WHAT WAS DRAWN.
 *
 * Before: handleCursorSelectUp hit-tested drawings, bubbles and the Living
 * lane only; a shelf whose chip lost its slot sat under a comment promising
 * "Inspect on the shelf still reads it" with no path that did. Now the anatomy
 * block publishes a hit rect for every shelf and mark it paints, the click
 * path tests exactly those, and the selection lives in the ONE reducer.
 *
 * The traps this pins:
 *   · a hit list that outlives the paint (hits must clear with the glass);
 *   · a shelf whose words were hidden becoming unclickable (push before the
 *     chip-slot `continue`s);
 *   · a second measurement at click time (the click reads the drawn frame;
 *     `selectAbsorptionAnatomy(` is called once in the file);
 *   · Inspect fed from the room's 30-bar `absorptionAnatomyVM`, a DIFFERENT
 *     measurement from the visible-window shelves (M8);
 *   · a selected shelf painted as an opaque slab over its own candles.
 *
 * A breadcrumb, not a renderer. It reads source, and each scan proves it found
 * the code it vouches for before asserting what is absent.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const CHART = strip(readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8"));
const ROOM = strip(readFileSync(path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8"));

const between = (src: string, from: string, to: string) => {
  const a = src.indexOf(from);
  expect(a, from).toBeGreaterThan(-1);
  const b = src.indexOf(to, a + from.length);
  expect(b, to).toBeGreaterThan(a);
  return src.slice(a, b);
};

describe("the glass publishes what a click can select", () => {
  it("the hit list is cleared with the glass, before the anatomy block runs", () => {
    const clear = CHART.search(/ctx\.clearRect\(0, 0, W, H\);\s*anatomyHitsRef\.current = \[\];/);
    expect(clear).toBeGreaterThan(-1);
    expect(CHART.indexOf("if (!absorptionAnatomyActive) {")).toBeGreaterThan(clear);
    // Exactly one reset: a second would drop the hits of the frame on screen.
    expect(CHART.match(/anatomyHitsRef\.current = \[\];/g)).toHaveLength(1);
  });

  it("every painted shelf pushes its hit before a chip slot can `continue` past it, and its chip joins it", () => {
    const loop = between(CHART, "for (const zone of anatomy.zones) {", "ds.absorptionChips =");
    const push = loop.indexOf("anatomyHitsRef.current.push({ target: zoneTarget(zone), rects: shelfRects });");
    expect(push).toBeGreaterThan(-1);
    const farSkip = loop.indexOf('if (shelfDepth === "FAR") { absorbChipsHidden++; continue; }');
    const slotSkip = loop.indexOf("if (freeY == null) { absorbChipsHidden++; continue; }");
    expect(farSkip).toBeGreaterThan(push);
    expect(slotSkip).toBeGreaterThan(push);
    // Nothing between the geometry and the push can skip the shelf.
    const geometryAt = loop.indexOf("const bh = Math.max(2, yLo - yHi);");
    expect(geometryAt).toBeGreaterThan(-1);
    expect(loop.slice(geometryAt, push)).not.toMatch(/continue;/);
    expect(loop).toContain("shelfRects.push({ x: chipX, y: chipY, w: chipW, h: chipH });");
    expect(loop).toContain("padHitRect({ x: x0, y: yHi, w: bw, h: bh })");
  });

  it("every drawn mark pushes its body and its chip", () => {
    const marks = between(CHART, "for (const m of ex.marks) {", "if (exhaustionDrawn.length > 0)");
    expect(marks).toMatch(/anatomyHitsRef\.current\.push\(\{\s*target: markTarget\(m\),\s*rects: \[padHitRect\(\{ x: mx0, y: my0, w: mx1 - mx0, h: my1 - my0 \}\), \{ x: cxx, y: cy, w: cw, h: 14 \}\],/);
  });
});

describe("selected is loudest, and never a slab over the candles", () => {
  const loop = between(CHART, "for (const zone of anatomy.zones) {", "ds.absorptionChips =");

  it("the selected shelf's fill stays a veil (≤ 0.16) and its peers quiet to ×0.4", () => {
    const fill = loop.match(/const shelfFillA = shelfSelected \? ([0-9.]+) : ([0-9.]+);/);
    expect(fill).not.toBeNull();
    expect(Number(fill![1])).toBeLessThanOrEqual(0.16);
    expect(Number(fill![1])).toBeGreaterThan(Number(fill![2]));
    expect(loop).toContain("ctx.globalAlpha = anatomyPeersQuiet && !shelfSelected ? 0.4 : 1;");
    // Reset before anything else in the block paints.
    expect(CHART).toMatch(/ctx\.globalAlpha = 1;\s*ds\.absorptionChips =/);
    expect(between(CHART, "for (const m of ex.marks) {", "if (exhaustionDrawn.length > 0)"))
      .toContain("ctx.globalAlpha = anatomyPeersQuiet && !markSelected ? 0.4 : 1;");
  });

  it("the selected shelf's edges are drawn alike (no defended side) with a halo, in the Appearance owner's ink", () => {
    const sel = between(loop, "if (shelfSelected) {", 'if (shelfDepth === "FAR")');
    expect(sel).toContain("ctx.strokeStyle = `rgba(${flowColorsRef.current.absorb},0.9)`;");
    expect(sel).toContain("ctx.moveTo(x0, yHi + 0.5); ctx.lineTo(x1, yHi + 0.5);");
    expect(sel).toContain("ctx.moveTo(x0, yLo - 0.5); ctx.lineTo(x1, yLo - 0.5);");
    expect(sel).toContain("ctx.strokeRect(x0 - 1.5, yHi - 1.5, bw + 3, bh + 3);");
    expect(sel).not.toMatch(/fillRect/);
  });

  it("which drawn object is selected comes from the resolver on THIS frame's owners", () => {
    expect(CHART).toContain(
      "? selectAnatomyInspect(anatomySel.reading.target, anatomy, selectExhaustion(anatomy), windowCapped)",
    );
    expect(loop).toContain("const shelfSelected = anatomySelReading?.currentId === anatomyTargetId(zoneTarget(zone));");
    expect(CHART).toContain("const markSelected = anatomySelReading?.currentId === anatomyTargetId(markTarget(m));");
    expect(CHART).toContain("const anatomyPeersQuiet = anatomyReadingDrawn(anatomySelReading);");
  });
});

describe("the click path selects what was painted, from the drawn frame", () => {
  const up = between(CHART, "const handleCursorSelectUp = useCallback(", "const handleOverlayPointerMove");

  it("tests the published hits after the Living lane, which returns because it is painted on top", () => {
    const lane = up.indexOf("if (pr != null && Number.isFinite(+pr)) { onSelectProfileSlice?.(+pr); return; }");
    const hit = up.indexOf("const anatomyHit = pickAnatomyHit(anatomyHitsRef.current, x, y);");
    expect(lane).toBeGreaterThan(-1);
    expect(hit).toBeGreaterThan(lane);
    expect(up).toMatch(/onSelectAnatomy\?\.\(\{\s*target: anatomyHit\.target,/);
    expect(up).toMatch(/\}, \[[^\]]*\bonSelectAnatomy\b[^\]]*\]\);\s*$/);
  });

  it("the reading handed up is resolved from the frame on screen, never a second measurement", () => {
    expect(up).toContain(
      "reading: selectAnatomyInspect(anatomyHit.target, anatomyFrame.anatomy, selectExhaustion(anatomyFrame.anatomy), anatomyFrame.windowCapped),",
    );
    expect(up).not.toContain("anatomyInView(");
    expect(CHART.match(/selectAbsorptionAnatomy\(/g)).toHaveLength(1);
    // The frame applies the owner's default gates, so Inspect may print them from ABSORPTION_ANATOMY_DEFAULTS.
    expect(CHART).toContain("selectAbsorptionAnatomy(anatomyInput, { windowBars: WINDOW })");
  });

  it("a changed reading goes back to Inspect only when it changed — the loop cannot feed itself", () => {
    const pub = between(CHART, "if (anatomySel && anatomySelReading) {", "} catch");
    expect(pub).toContain("if (key !== sent.key) {");
    expect(pub).toContain("onAnatomyReadingRef.current?.(anatomySelReading);");
    expect(pub).toMatch(/ds\.anatomySelected = `\$\{anatomySelReading\.id\}:\$\{anatomySelReading\.state\}:\$\{anatomySelectedPainted \? "HALO" : "NOT_DRAWN"\}`;/);
  });
});

describe("the room routes it through the ONE selection, never through its own 30-bar anatomy", () => {
  it("select, re-resolve and the selected object all go through actOnChartSelection", () => {
    expect(ROOM).toMatch(/onSelectAnatomy=\{pick => actOnChartSelection\(\{ type: "select", selection: \{ kind: "ANATOMY", symbol, timeframe, \.\.\.pick, lastDrawn: null \} \}\)\}/);
    expect(ROOM).toMatch(/onAnatomyReading=\{reading => actOnChartSelection\(\{ type: "resolveAnatomy", reading \}\)\}/);
    expect(ROOM).toContain("selectedAnatomy={activeSelectedAnatomy}");
    expect(ROOM).toContain("const selectedAnatomy = selectedAnatomyOf(chartSelection);");
  });

  it("no anatomy prop or ticket input reads absorptionAnatomyVM", () => {
    const props = [...ROOM.matchAll(/(onSelectAnatomy|onAnatomyReading|selectedAnatomy)=\{[^\n]*/g)].map(m => m[0]);
    // The scan found the three MainChart props and the ticket's one.
    expect(props.length).toBeGreaterThanOrEqual(4);
    for (const p of props) expect(p).not.toContain("absorptionAnatomyVM");
    expect(ROOM).toContain("absorptionAnatomyVM"); // it exists — and is not what these read
  });

  it("switching the Absorption layer off lets the selection go", () => {
    expect(ROOM).toMatch(/if \(!absorptionAnatomy\) actOnChartSelection\(\{ type: "clear", kinds: \["ANATOMY"\] \}\);/);
  });
});
