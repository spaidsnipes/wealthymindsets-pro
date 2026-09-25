/**
 * THE STACK'S CELLS SIT ON THE BARS THAT BUILT IT, OR NOWHERE.
 *
 * Garden 12 review: `stackAnchor` clamped an off-screen formation to the plot
 * edge, so a stack formed twenty bars back painted gold slabs on whichever
 * bars sat at x = 0 — bars that built nothing — while the anchor receipt kept
 * naming a formation key. Placement is now decided in
 * `src/lib/chart/stackedImbalanceAnchor.ts` (unit-tested); this file checks
 * the paint block obeys it.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const CHART = strip(readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8"));

const block = (() => {
  const start = CHART.indexOf("selectStackedImbalanceGlass(imbalanceStackRef.current)");
  const end = CHART.indexOf("delete ds.imbalanceStackAnchor;\n        }", start);
  expect(start, "the stack glass call was renamed or removed").toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return CHART.slice(start, end);
})();

describe("stack placement on the glass", () => {
  it("takes its placement from the tested owner, not a local clamp", () => {
    expect(CHART).toMatch(/import \{ stackAnchor \} from "@\/lib\/chart\/stackedImbalanceAnchor";/);
    expect(CHART).not.toMatch(/^function stackAnchor\(/m);
    expect(block).toMatch(/const placement = stackAnchor\(chart, barsRef\.current \?\? \[\], glass\.formedFrom, glass\.formedTo, plotRight\);/);
  });

  it("the receipt names the placement word, never a formation key for bars not in view", () => {
    expect(block).toMatch(/ds\.imbalanceStackAnchor = placement\.kind === "ON_BARS" \? placement\.key : placement\.kind;/);
  });

  it("a stack formed after every bar in view draws nothing (no lookahead)", () => {
    expect(block).toMatch(/if \(yHiR != null && yLoR != null && placement\.kind !== "FORMED_AFTER_VIEW"\) \{/);
  });

  it("cells are painted only from an ON_BARS placement", () => {
    expect(block).toMatch(/const anchor = placement\.kind === "ON_BARS" \? placement : null;/);
    const calls = [...block.matchAll(/paintStackCell\(ctx, (\w+),/g)].map(m => m[1]);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every(a => a === "anchor")).toBe(true);
  });
});
