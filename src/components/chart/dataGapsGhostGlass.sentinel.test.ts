/**
 * DATA GAPS AND MEMORY GHOST — WHAT THE GLASS MAY NOT CLAIM.
 *
 * Found reviewing the Garden Pass 12 commits (586d3c62, f0ca2eaa) against HEAD
 * (2026-09-25): the hole mark called market closes "missing" bars, and the
 * ghost candles were painted brighter than their owner's ceiling and past the
 * newest bar. The owners' rules are unit-tested beside them; this pins the
 * canvas to projecting those owners and nothing more.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const CHART = strip(readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8"));

const slice = (from: string, to: string) => {
  const a = CHART.indexOf(from);
  const b = a < 0 ? -1 : CHART.indexOf(to, a);
  expect(a, from).toBeGreaterThan(-1);
  expect(b, to).toBeGreaterThan(a);
  return CHART.slice(a, b);
};

describe("data gap marks", () => {
  const block = () => slice("const gapSrc = ", "canvas.dataset.dataGaps");

  it("the session question goes to the owner with the bars' own session identity and the instrument's continuity", () => {
    const b = block();
    expect(b).toMatch(/const gapSrc = barsRef\.current, gapIds = barIdentitiesRef\.current;/);
    expect(b).toMatch(/bars: gapSrc,\s*identities: gapIds,/);
    expect(b).toMatch(/continuous: canonicalAssetClass\(symbol\) === "crypto"/);
  });

  it("the words at the hole are the owner's label; the canvas never calls an empty interval missing", () => {
    const b = block();
    expect(b).toMatch(/`‑ ‑ \$\{g\.label\} ‑`/);
    expect(b).toMatch(/fillText\(t, mx, my\)/);
    expect(b).not.toMatch(/missing/i);
    expect(b).not.toMatch(/GAP ·/);
  });

  it("the whole-history scan runs when the bars or their identities change, not every frame", () => {
    expect(CHART.match(/selectDataGaps\(/g) ?? []).toHaveLength(1);
    expect(CHART).toMatch(/let dataGapsCache: \{[^}]*\} \| null = null;/);
    expect(CHART).toMatch(/if \(dataGapsCache\?\.source !== gapSrc \|\| dataGapsCache\.ids !== gapIds\) dataGapsCache = \{\s*source: gapSrc, ids: gapIds,\s*vm: selectDataGaps\(/);
    expect(CHART).toMatch(/const dg = dataGapsCache\.vm;/);
  });

  it("the receipt names the refusal instead of reporting an empty measurement", () => {
    expect(CHART).toMatch(/canvas\.dataset\.dataGaps = dg\.reason === "MEASURED" \? `\$\{dg\.gaps\.length\}:\$\{painted\}` : dg\.reason;/);
  });

  it("FAR keeps every bridge but words only an outage of ≥ 3 intervals (H-501: FAR speaks macro)", () => {
    const b = block();
    const bridge = b.indexOf("ctx.lineTo(+x1 - 3, +y1); ctx.stroke();");
    // 2026-09-26 (H-501 permission): the depth rule is the permission
    // table's — dataGaps is QUIET at FAR (bridges, words only for outages).
    const quiet = b.indexOf('if (!att.speaks("dataGaps") && g.emptyIntervals < 3) continue;');
    const words = b.indexOf("fillText(t, mx, my)");
    expect(bridge).toBeGreaterThan(-1);
    expect(quiet).toBeGreaterThan(bridge);
    expect(words).toBeGreaterThan(quiet);
    expect(CHART).toContain("canvas.dataset.dataGapsWorded = String(worded);");
  });
});

describe("memory ghost candles", () => {
  // 2026-09-26 (H-501 permission): the gate asks the permission table and
  // the off receipt names OFF vs SILENT:<depth> (att.offWord).
  const ghostBlock = () => slice('if (layerOnRef.current.memoryGhost === true && att.paints("memoryGhost") && srs) {', "ds.memoryGhost = att.offWord(layerOnRef.current.memoryGhost === true);");
  // 2026-09-26 (H-201 plate pass): the candle form's receipt now names its
  // form DASHED (the plate's dashed-outline bodies); the anchor follows it.
  // Every pin below still reads the same candle-form slice.
  const candleForm = () => slice("if (ghost.candles.length > 1 && bsp >= GHOST_CANDLE_MIN_SPACING) {", "ds.memoryGhostForm = `DASHED:");

  it("never paints brighter than the owner's ceiling: every ghost stroke is at ghost.opacity (the attention governor may only lower it)", () => {
    const b = ghostBlock();
    const label = b.indexOf("ctx.globalAlpha = 0.85;");
    expect(label).toBeGreaterThan(-1);
    const alphas = b.slice(0, label).match(/globalAlpha = [^;]+;/g) ?? [];
    expect(alphas.length).toBeGreaterThan(0);
    // Garden 18 §XXXVI (2026-10-01): a visibility floor of 0.55 under the
    // owner's ceiling and the governor — the ghost alone read near zero.
    for (const a of alphas) expect(a).toBe('globalAlpha = Math.max(0.55, Math.min(ghost.opacity, att.alpha("memoryGhost")));');
    expect(b).not.toMatch(/ghost\.opacity \*/);
  });

  it("is time-true on the live bars it matched: no sideways offset past the newest bar", () => {
    const c = candleForm();
    expect(c).toMatch(/const cxg = Math\.round\(\+x\) \+ 0\.5;/);
    expect(c).not.toMatch(/\+x \+ off|const off =|spacing \/ 2/);
  });

  it("stays under the market: live bodies are clipped out first, and the ghost is a filled silver-blue body under its dashed outline", () => {
    const c = candleForm();
    const clip = c.indexOf('ctx.clip("evenodd");');
    const firstInk = c.indexOf("ctx.strokeRect(");
    expect(clip).toBeGreaterThan(-1);
    expect(firstInk).toBeGreaterThan(clip);
    expect(c).toMatch(/ctx\.rect\(\+x - bsp \* 0\.46, Math\.min\(\+lo, \+lc\) - 1, bsp \* 0\.92, Math\.abs\(\+lc - \+lo\) \+ 2\);/);
    // Plate 68's filled ghost (2026-10-01): a silver-blue body under the dashed
    // outline — still only where the live candle is not (clipped above).
    expect(c).toContain('ctx.fillStyle = c.close >= c.open ? "rgba(168,196,232,0.30)" : "rgba(120,140,178,0.30)";');
  });

  it("falls back to the path where a hollow body cannot be read", () => {
    expect(CHART).toMatch(/const GHOST_CANDLE_MIN_SPACING = 8;/);
  });

  it("the form receipt is withdrawn when the ghost is silent or switched off, and says PATH only when a path was drawn", () => {
    expect(CHART.match(/ds\.memoryGhost = att\.offWord\(layerOnRef\.current\.memoryGhost === true\);/g) ?? []).toHaveLength(1);
    const silent = slice('"MEMORY · not enough history on this chart for an analogue"', "ctx.restore();");
    expect(silent).toMatch(/delete ds\.memoryGhostForm;/);
    const off = slice("ds.memoryGhost = att.offWord(layerOnRef.current.memoryGhost === true);", "onMemoryGhostRef.current?.(null);");
    expect(off).toMatch(/delete ds\.memoryGhostForm;/);
    expect(CHART).toMatch(/if \(started\) ds\.memoryGhostForm = "PATH";\s*else delete ds\.memoryGhostForm;/);
  });
});

/*
  H-201 · THE PLATE'S GHOST (2026-09-26). Serving TSLA 5m 04:58 CDT: solid
  hollow outlines that could not be told from the live candles, a faint box
  for a bracket, and the caption printed across the newest live bars at the
  price line. WM_Contractor_H-201_MEMORY_GHOST_ON_CANVAS: dashed-outline
  bodies on dashed wicks at "GHOST OPACITY 0.18 MAX", dashed rules at the
  analogue's high and low across its span and a dashed vertical at the
  segment start; "CLICK GHOST OPENS PASSPORT OF THAT HISTORICAL OBJECT WITH
  FROZEN ASOF".
*/
describe("H-201 memory ghost — the plate's form on the glass", () => {
  const ghostBlock = () => slice('if (layerOnRef.current.memoryGhost === true && att.paints("memoryGhost") && srs) {', "ds.memoryGhost = att.offWord(layerOnRef.current.memoryGhost === true);");
  const candleForm = () => slice("if (ghost.candles.length > 1 && bsp >= GHOST_CANDLE_MIN_SPACING) {", "ds.memoryGhostForm = `DASHED:");

  it("bodies and wicks are DASHED, in bone ink, at a stroke of at least 1.2 — before the first body is stroked", () => {
    const c = candleForm();
    const dash = c.indexOf("ctx.setLineDash([3, 2]);");
    const firstBody = c.indexOf("ctx.strokeRect(");
    const firstWick = c.indexOf("ctx.lineTo(cxg, top);");
    expect(dash).toBeGreaterThan(-1);
    expect(firstBody).toBeGreaterThan(dash);
    expect(firstWick).toBeGreaterThan(dash);
    expect(c).toMatch(/ctx\.strokeStyle = GHOST_INK; ctx\.lineWidth = 1\.25; ctx\.setLineDash\(\[3, 2\]\);/);
    expect(ghostBlock()).toMatch(/const GHOST_INK = "rgba\(237,230,211,1\)";/);
    expect(CHART).toMatch(/ds\.memoryGhostForm = `DASHED:\$\{drawnCandles\}`;/);
    expect(CHART).not.toMatch(/ds\.memoryGhostForm = `CANDLES:/);
  });

  it("the bracket: dashed rules at the analogue's high and low across its span, a dashed vertical at its start, ending at the newest bar's own body", () => {
    const b = ghostBlock();
    expect(b).toMatch(/const hiG = Math\.max\(\.\.\.extremes\.map\(e => e\[0\]\)\), loG = Math\.min\(\.\.\.extremes\.map\(e => e\[1\]\)\);/);
    expect(b).toMatch(/x1: \+xLastG \+ bwG \/ 2,/);
    expect(b).toMatch(/const xLastG = tsG\.timeToCoordinate\(ghost\.points\[ghost\.points\.length - 1\]\.time as never\);/);
    const fn = b.slice(b.indexOf("const strokeBracket = () => {"), b.indexOf("const ghostHits"));
    expect(fn).toContain("ctx.setLineDash([4, 3]);");
    expect(fn).toContain("ctx.lineTo(bracket.x1, bracket.yHi);");
    expect(fn).toContain("ctx.lineTo(bracket.x1, bracket.yLo);");
    expect(fn).toContain("ctx.moveTo(bracket.x0, bracket.yHi - 8); ctx.lineTo(bracket.x0, bracket.yLo + 8);");
    // Drawn under the same live-body clip as the ghost, before it is lifted.
    const c = candleForm();
    expect(c.indexOf("strokeBracket();")).toBeGreaterThan(c.indexOf('ctx.clip("evenodd");'));
  });

  it("stays in the pane below the header floor, with every chip cut out, and says what it lost", () => {
    const b = ghostBlock();
    const pane = b.indexOf("ctx.rect(0, HEADER_FLOOR_Y, plotRight, Math.max(0, pane0Bottom - HEADER_FLOOR_Y));");
    const chips = b.indexOf("for (const r of floatingChips) {");
    const form = b.indexOf("if (ghost.candles.length > 1 && bsp >= GHOST_CANDLE_MIN_SPACING) {");
    expect(pane).toBeGreaterThan(-1);
    expect(chips).toBeGreaterThan(pane);
    expect(form).toBeGreaterThan(chips);
    expect(b.slice(chips, form)).toMatch(/ctx\.rect\(r\.x - 2, r\.y - 2, r\.w \+ 4, r\.h \+ 4\);\s*ctx\.clip\("evenodd"\);/);
    expect(b).toMatch(/ds\.memoryGhostClipped = \[/);
    expect(b).toMatch(/\.filter\(Boolean\)\.join\("\|"\) \|\| "NONE";/);
  });

  it("the caption goes through the keep-out owner strictly, speaks only where H-501 lets it, and is HELD rather than printed on a candle", () => {
    const b = ghostBlock();
    const words = b.slice(b.indexOf("ctx.globalAlpha = 0.85;"));
    expect(words).toMatch(/if \(!att\.speaks\("memoryGhost"\)\) \{\s*ds\.memoryGhostCaption = "QUIET";/);
    expect(words).toMatch(/\{ minX: keepOutMinX\(\), blockers: floatingChips, strict: true, alternates: \[capBelow\] \}/);
    expect(words).toMatch(/\[\.\.\.keepOut\(\), \.\.\.rowBodiesAt\(/);
    expect(words).toMatch(/if \(spotG\.mode === "BLOCKED" \|\| spotG\.rect\.x \+ capW > plotRight - 2\) \{\s*ds\.memoryGhostCaption = "HELD";/);
    expect(words).toMatch(/recordKeepOut\(keepOutLedger, spotG\);\s*floatingChips\.push\(\{ \.\.\.spotG\.rect \}\);/);
    // The words of a drawn ghost are the placed caption and (2026-09-27) the
    // placed clip marker — both through the keep-out owner, nothing else.
    const texts = words.slice(0, words.indexOf("memoryGhostHitRef.current = ")).match(/fillText\([^)]*\)/g) ?? [];
    expect(texts).toEqual(["fillText(t, r.x + 5, r.y + capH / 2 + 0.5)", "fillText(word, r.x + w / 2, r.y + 7.5)"]);
    expect(words).toMatch(/const spotE = placeClearOfKeepOut\(/);
  });

  it("a click on the painted ghost opens its frozen analogue through the one selection", () => {
    expect(CHART).toMatch(/memoryGhostHitRef\.current = ghostHits\.length \? \{ rects: ghostHits, vm: ghost \} : null;/);
    expect(CHART).toMatch(/zoneHitsRef\.current = \[\];\s*nearTapeHitsRef\.current = \[\];\s*memoryGhostHitRef\.current = null;/);
    expect(CHART).toMatch(/const ghostHit = memoryGhostHitRef\.current;\s*if \(ghostHit && ghostHit\.rects\.some\(g => x >= g\.x && x <= g\.x \+ g\.w && y >= g\.y && y <= g\.y \+ g\.h\)\) \{\s*onSelectMemoryGhost\?\.\(ghostHit\.vm\);/);
    const ROOM = strip(readFileSync(path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8"));
    expect(ROOM).toMatch(/onSelectMemoryGhost=\{ghost => ghost\.analogueEnd != null && actOnChartSelection\(\{ type: "select", selection: \{ kind: "MEMORY_GHOST", symbol, timeframe, ghost, asOf: ghost\.analogueEnd \} \}\)\}/);
    expect(ROOM).toContain("memoryGhost={activeSelectedGhost?.ghost ?? memoryGhostVM}");
    expect(ROOM).toContain("memoryGhostFrozenAsOf={activeSelectedGhost?.asOf ?? null}");
    expect(ROOM).toMatch(/if \(!memoryGhostOn\) actOnChartSelection\(\{ type: "clear", kinds: \["MEMORY_GHOST"\] \}\);/);
  });
});
