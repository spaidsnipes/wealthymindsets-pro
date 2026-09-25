/**
 * ORDER FLOW LIVES ON PRICE — the shelf as rows, the imbalance as tagged blocks.
 *
 * Canon F06A draws the ABSORPTION SHELF as stacked row blocks on the shelf's
 * own prices, spanning the bars that built it, and STACKED IMBALANCE as rows
 * fanned out at their prices. FL-06 hatches both: ① the shelf, ② each
 * imbalance block with a compact "×2.1". Before 2026-09-25 the desktop shelf
 * was one hatched box and the stack's ratio never reached the glass.
 *
 * What these pins hold:
 *   · shelf rows come from the anatomy owner's zone and bars (never a close),
 *     through the pure `absorptionShelfRows` owner;
 *   · side ink ONLY from the owner's signed-aggression `holdingEdge`, dashed
 *     when the sides were inferred, grey when no side is named;
 *   · the ratio tag is the ratio owner's `multipleLabel`, at its own level's
 *     row, placed strictly through the keep-out owner and HELD when blocked;
 *   · every receipt describes the glass and is withdrawn with it.
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
  const start = CHART.indexOf(from);
  const end = CHART.indexOf(to, start);
  expect(start, from).toBeGreaterThan(-1);
  expect(end, to).toBeGreaterThan(start);
  return CHART.slice(start, end);
};

describe("FL-06 ① / F06A · the absorption shelf is rows on its own prices", () => {
  const loop = slice("for (const zone of anatomy.zones) {", "ds.absorptionChips =");

  it("cuts rows from the owner's zone and bars through the pure row owner", () => {
    expect(loop).toContain("absorptionShelfRows(zone, anatomy.bars, shelfRowCount(bh))");
    expect(loop).toContain("const xa = ts.timeToCoordinate(run.fromTime as never);");
    expect(loop).toContain("const xz = ts.timeToCoordinate(run.toTime as never);");
    // Rows never run past the shelf the owner measured.
    expect(loop).toContain("const rx0 = Math.max(x0, +xa - spacing / 2);");
    expect(loop).toContain("const rx1 = Math.min(x1, +xz + spacing / 2);");
    expect(loop).not.toMatch(/\.close\b/);
  });

  it("colours a side only from the owner's signed-aggression edge; grey otherwise", () => {
    expect(loop).toMatch(/const rowSideInk = zone\.holdingEdge == null\s*\? null\s*: zone\.holdingEdge === "LOW" \? flowColorsRef\.current\.dSell : flowColorsRef\.current\.dBuy;/);
    expect(loop).toContain('const rowInk = rowSideInk ?? "210,214,219";');
    expect(loop).toContain('const rowSideInferred = zone.holdingBasis === "INFERRED";');
    expect(loop).toContain("ctx.setLineDash(rowSideInk != null && rowSideInferred ? [3, 2] : []);");
    // No candle colour, no bullish/bearish read of a bar.
    expect(loop).not.toMatch(/candleUp|candleDown|isUp\b|bullish|bearish/);
  });

  it("fills and hatches the row blocks (the whole-shelf box is only the no-rows fallback)", () => {
    expect(loop).toMatch(/if \(rowRects\.length > 0\) \{[\s\S]*?for \(const r of rowRects\) ctx\.fillRect\(r\.x, r\.y, r\.w, r\.h\);[\s\S]*?\} else \{[\s\S]*?ctx\.fillRect\(x0, yHi, bw, bh\);/);
    expect(loop).toContain("if (rowRects.length > 0) for (const r of rowRects) ctx.rect(r.x, r.y, r.w, r.h);");
  });

  it("publishes the rows it drew with their side evidence, withdrawn with the shelf", () => {
    expect(loop).toContain('shelfRowsDrawn.push(`${rowsWithRuns}R:${zone.holdingBasis == null ? "NO_SIDE" : `${zone.holdingEdge}_${zone.holdingBasis}`}`);');
    expect(CHART).toMatch(/if \(shelfRowsDrawn\.length > 0\) ds\.absorptionRows = shelfRowsDrawn\.join\(","\);\s*else delete ds\.absorptionRows;/);
    expect(CHART).toMatch(/const ANATOMY_BLOCK_RECEIPTS = \[[\s\S]*"absorptionRows"/);
  });
});

describe("FL-06 ② · each imbalance block carries its ratio at its own row", () => {
  const stack = slice("selectStackedImbalanceGlass(imbalanceStackRef.current)", "delete ds.imbalanceStackAnchor;\n        }");

  it("the tag is the ratio owner's multipleLabel, for the strongest measured level, at that level's price", () => {
    expect(stack).toContain("for (const l of glass.levels) if (l.multipleLabel != null && (!lead || l.weight > lead.weight)) lead = l;");
    expect(stack).toContain("const lyR = lead ? srs.priceToCoordinate(lead.price) : null;");
    expect(stack).toContain("const slab = stackSlab(anchor, lead.weight);");
    expect(stack).toContain("const tagPref = { x: slab.x + slab.w + 3, y: tagY, w: tagW, h: tagH };");
    // Only for cells on their own bars.
    expect(stack).toMatch(/let stackTag = "NONE";\s*if \(anchor\) \{/);
  });

  it("places strictly through the keep-out owner and holds the tag when every spot is taken", () => {
    expect(stack).toMatch(/placeClearOfKeepOut\(\s*tagPref,\s*\[\.\.\.keepOut\(\), \.\.\.rowBodiesAt\(/);
    expect(stack).toContain("{ minX: anchor.x0, blockers: floatingChips, strict: true, alternates: tagAlts },");
    expect(stack).toMatch(/if \(tagSpot\.mode === "BLOCKED" \|\| tagSpot\.rect\.x \+ tagW > plotRight - 2\) \{\s*stackTag = "HELD";\s*\} else \{\s*recordKeepOut\(keepOutLedger, tagSpot\);\s*floatingChips\.push\(\{ \.\.\.tagSpot\.rect \}\);/);
    const painted = [...stack.matchAll(/ctx\.fillText\(lead\.multipleLabel,/g)];
    expect(painted.length).toBe(1);
  });

  it("the tag receipt names what was painted and is withdrawn when nothing is drawn", () => {
    expect(stack).toContain("stackTag = `${lead.multipleLabel}@${lead.price}`;");
    expect(stack).toContain("ds.imbalanceStackTag = stackTag;");
    expect([...stack.matchAll(/delete ds\.imbalanceStackTag;/g)].length).toBe(2);
  });

  it("the cells are hatched blocks inside their slab", () => {
    const at = CHART.indexOf("function paintStackCell(");
    const body = CHART.slice(at, CHART.indexOf("\n}\n", at));
    expect(body).toMatch(/ctx\.beginPath\(\); ctx\.rect\(x, y - h \/ 2 \+ 0\.5, w, h - 1\); ctx\.clip\(\);/);
    expect(body).toMatch(/for \(let hx = x - h; hx < x \+ w \+ h; hx \+= 4\)/);
  });
});
