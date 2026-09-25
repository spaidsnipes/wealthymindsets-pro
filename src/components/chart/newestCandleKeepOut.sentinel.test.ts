/**
 * THE NEWEST CANDLES ARE A KEEP-OUT — Garden Pass 12, Defect 4.
 *
 *     Candle-preservation zones … the market remains dominant.
 *
 * The profile stack's label column, the Profile Memory labels, the selected
 * zone's callout and the narrow absorption chip all print opaque backings, and
 * all of them land at the live edge, because that is where "now" is. Each one
 * now asks the ONE keep-out owner (src/lib/chartKeepOut.ts) where it may
 * print: it slides off the newest 3 bodies, and when nothing is clear its
 * backing yields — the words are never deleted.
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

describe("one keep-out owner per frame", () => {
  it("builds the boxes from the chart's own bars and transforms, through the pure owner", () => {
    const getter = slice("const keepOut = () => {", "const keepOutMinX");
    expect(getter).toMatch(/newestCandleKeepOut\(barsRef\.current \?\? \[\]/);
    expect(getter).toMatch(/tsK\.timeToCoordinate\(/);
    expect(getter).toMatch(/srs\.priceToCoordinate\(/);
    expect(getter).toMatch(/barSpacing: bsp/);
  });

  it("withdraws the receipt with the glass clear and republishes it only from the ledger", () => {
    expect(CHART).toMatch(/ctx\.clearRect\(0, 0, W, H\);\s*for \(const k of KEEP_OUT_RECEIPTS\) delete canvas\.dataset\[k\];/);
    expect(CHART).toMatch(/const keepOutNow = keepOutReceipt\(keepOutLedger\);\s*if \(keepOutNow\) Object\.assign\(canvas\.dataset, keepOutNow\);/);
  });
});

describe("the profile stack's label column yields to the newest bodies", () => {
  const stackLabel = slice("const stackLabel = (y: number, text: string, ink: string) => {", "ctx.restore();\n        };");

  it("asks the keep-out where the label may print, stepping around chips too", () => {
    expect(stackLabel).toMatch(/placeClearOfKeepOut\(\s*\{ x: stackPlan\.labelRight - lwS - 3, y: yy - 5\.5, w: lwS \+ 5, h: 11 \},\s*keepOut\(\),\s*\{ minX: keepOutMinX\(\), blockers: floatingChips \},?\s*\)/);
    expect(stackLabel).toMatch(/recordKeepOut\(keepOutLedger, spotS\)/);
  });

  it("paints the backing where the placement says, at an alpha the placement allows", () => {
    expect(stackLabel).toMatch(/ctx\.fillStyle = `rgba\(11,10,8,\$\{keepOutBackingAlpha\(spotS, 0\.72\)\}\)`;\s*ctx\.fillRect\(spotS\.rect\.x, spotS\.rect\.y, spotS\.rect\.w, spotS\.rect\.h\);/);
    expect(stackLabel).not.toMatch(/fillRect\(stackPlan\.labelRight/);
  });

  it("ties a slid label back to the lane at the true price with a dotted leader", () => {
    expect(stackLabel).toMatch(/if \(spotS\.mode === "SLID"\) \{[\s\S]*?setLineDash\(\[1, 2\]\)[\s\S]*?lineTo\(stackPlan\.stackLeft, y\)/);
  });
});

describe("Profile Memory labels yield to the newest bodies", () => {
  const memory = slice("const text = `S-${l.sessionsAgo} ${l.kind}", "ds.profileMemoryLevels = String(drawn);");

  it("asks the keep-out, sliding only along the level's own line and never left of its birth", () => {
    expect(memory).toMatch(/placeClearOfKeepOut\(\s*\{ x: lx, y: y - 7, w, h: 14 \},\s*keepOut\(\),\s*\{ minX: Math\.max\(x0, keepOutMinX\(\)\), blockers: floatingChips \},?\s*\)/);
    expect(memory).toMatch(/recordKeepOut\(keepOutLedger, spotM\)/);
  });

  it("paints backing and words where the placement says, at an alpha it allows", () => {
    expect(memory).toMatch(/ctx\.fillStyle = `rgba\(11,10,8,\$\{keepOutBackingAlpha\(spotM, 0\.80\)\}\)`;\s*ctx\.fillRect\(spotM\.rect\.x, spotM\.rect\.y, w, 14\);/);
    expect(memory).toMatch(/ctx\.fillText\(text, spotM\.rect\.x \+ 4, y\);/);
    expect(memory).not.toMatch(/fillRect\(lx,/);
  });
});
