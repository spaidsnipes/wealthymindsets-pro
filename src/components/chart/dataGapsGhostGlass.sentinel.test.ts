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
    const quiet = b.indexOf('if (semanticDensity.depth === "FAR" && g.emptyIntervals < 3) continue;');
    const words = b.indexOf("fillText(t, mx, my)");
    expect(bridge).toBeGreaterThan(-1);
    expect(quiet).toBeGreaterThan(bridge);
    expect(words).toBeGreaterThan(quiet);
    expect(CHART).toContain("canvas.dataset.dataGapsWorded = String(worded);");
  });
});

describe("memory ghost candles", () => {
  const ghostBlock = () => slice("if (layerOnRef.current.memoryGhost === true && srs) {", 'ds.memoryGhost = "OFF";');
  const candleForm = () => slice("if (ghost.candles.length > 1 && bsp >= GHOST_CANDLE_MIN_SPACING) {", "ds.memoryGhostForm = `CANDLES:");

  it("never paints brighter than the owner's ceiling: every ghost stroke is at ghost.opacity (the attention governor may only lower it)", () => {
    const b = ghostBlock();
    const label = b.indexOf("ctx.globalAlpha = 0.85;");
    expect(label).toBeGreaterThan(-1);
    const alphas = b.slice(0, label).match(/globalAlpha = [^;]+;/g) ?? [];
    expect(alphas.length).toBeGreaterThan(0);
    for (const a of alphas) expect(a).toBe('globalAlpha = Math.min(ghost.opacity, att.alpha("memoryGhost"));');
    expect(b).not.toMatch(/ghost\.opacity \*/);
  });

  it("is time-true on the live bars it matched: no sideways offset past the newest bar", () => {
    const c = candleForm();
    expect(c).toMatch(/const cxg = Math\.round\(\+x\) \+ 0\.5;/);
    expect(c).not.toMatch(/\+x \+ off|const off =|spacing \/ 2/);
  });

  it("stays under the market: live bodies are clipped out first, and the ghost is outline only", () => {
    const c = candleForm();
    const clip = c.indexOf('ctx.clip("evenodd");');
    const firstInk = c.indexOf("ctx.strokeRect(");
    expect(clip).toBeGreaterThan(-1);
    expect(firstInk).toBeGreaterThan(clip);
    expect(c).toMatch(/ctx\.rect\(\+x - bsp \* 0\.46, Math\.min\(\+lo, \+lc\) - 1, bsp \* 0\.92, Math\.abs\(\+lc - \+lo\) \+ 2\);/);
    expect(c).not.toMatch(/fillRect|ctx\.fill\(/);
  });

  it("falls back to the path where a hollow body cannot be read", () => {
    expect(CHART).toMatch(/const GHOST_CANDLE_MIN_SPACING = 8;/);
  });

  it("the form receipt is withdrawn when the ghost is silent or switched off, and says PATH only when a path was drawn", () => {
    expect(CHART.match(/ds\.memoryGhost = "OFF";/g) ?? []).toHaveLength(1);
    const silent = slice('"MEMORY · not enough history on this chart for an analogue"', "ctx.restore();");
    expect(silent).toMatch(/delete ds\.memoryGhostForm;/);
    const off = slice('ds.memoryGhost = "OFF";', "onMemoryGhostRef.current?.(null);");
    expect(off).toMatch(/delete ds\.memoryGhostForm;/);
    expect(CHART).toMatch(/if \(started\) ds\.memoryGhostForm = "PATH";\s*else delete ds\.memoryGhostForm;/);
  });
});
