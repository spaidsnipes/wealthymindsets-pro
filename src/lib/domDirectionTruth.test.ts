import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const dom = fs.readFileSync(
  path.join(process.cwd(), "src/components/chart/DOMPanel.tsx"),
  "utf8",
);

/**
 * DOM header direction Sentinel — LIVING-PIXEL LAW.
 *
 * The DOM's headline price (fontSize 16) was coloured by:
 *   (liveBar?.close ?? 0) >= (liveBar?.open ?? 0)
 *
 * With no observed bar both sides collapse to 0, and `0 >= 0` is true, so a
 * MISSING bar rendered the price green — asserting an up move that was never
 * measured. Absence has no direction.
 */
describe("DOM header direction truth", () => {
  it("no longer decides direction from coerced zeros", () => {
    expect(dom).not.toMatch(/liveBar\?\.close \?\? 0\) >= \(liveBar\?\.open \?\? 0/);
  });

  it("requires both sides of the comparison to be observed", () => {
    expect(dom).toContain("Number.isFinite(liveBar?.close) && Number.isFinite(liveBar?.open)");
  });

  it("falls back to a neutral colour rather than green or red", () => {
    expect(dom).toContain('"#8A90A8"');
  });

  it("says why no direction is shown", () => {
    expect(dom).toContain("No bar observed for this interval");
  });
});
