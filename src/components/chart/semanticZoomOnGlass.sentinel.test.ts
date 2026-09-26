/**
 * SEMANTIC ZOOM TAG ON THE GLASS — F13 SEMANTIC ZOOM.
 *
 * Canon: FAR · MID · NEAR are semantic STATES of the SAME camera, and the
 * forbidden opposite is "convert the teaching plate into a permanent 3-column
 * chart" or "confuse semantic resolution with data/source resolution."
 *
 * This breadcrumb guards the paint at the point it is most at risk of being
 * refactored into either failure:
 *
 *   1. The tag MUST be one word on the same camera, not a route.
 *   2. It MUST be driven by the visible BAR COUNT, not by a timeframe or a
 *      price span. Timeframe would tie semantic resolution to data
 *      resolution — the exact confusion the canon forbids.
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

const block = (() => {
  // Start a bit before the compile call so `getVisibleLogicalRange()` above
  // it is still inside the window we grep.
  const call = CHART.indexOf("selectSemanticZoom(");
  const at = Math.max(0, call - 400);
  expect(at, "the semantic-zoom block was renamed or removed").toBeGreaterThan(-1);
  const candidates = ["P-601 HEAT LENS", "selectHeatLens", "/* ══"];
  let end = -1;
  for (const c of candidates) {
    const i = CHART.indexOf(c, at + 100);
    if (i > 0 && (end < 0 || i < end)) end = i;
  }
  expect(end, "no landmark follows this block").toBeGreaterThan(at);
  return CHART.slice(at, end);
})();

describe("resolution is bar count, not timeframe or price span", () => {
  it("READS THE VISIBLE BAR COUNT", () => {
    // The safety property. Timeframe would tie semantic resolution to data
    // resolution — a chart on 1m at NEAR and a chart on 1d at NEAR should mean
    // the same thing (few large bars, anatomy scale), and only bar count keeps
    // that promise.
    expect(block).toMatch(/getVisibleLogicalRange\(\)/);
    expect(block).toMatch(/selectSemanticZoom\(\{ visibleBarCount:/);
  });

  it("NEVER READS TIMEFRAME OR PRICE SPAN inside this block", () => {
    expect(block).not.toMatch(/\btimeframe\b/);
    expect(block).not.toMatch(/priceToCoordinate/);
    expect(block).not.toMatch(/getVisibleRange\b/);
  });
});

describe("the tag lives on the same camera, not on a route", () => {
  it("PAINTS INTO THE OVERLAY CANVAS — no href, no navigate, no push", () => {
    expect(block).toMatch(/ctx\.fillText\(zoom\.tag,/);
    expect(block).not.toMatch(/\bhref\b|\brouter\b|\bnavigate\b|window\.location/i);
  });

  it("prints ONE WORD, not three columns", () => {
    // The canon's own forbidden opposite. FAR/MID/NEAR are not three panels.
    expect(block).not.toMatch(/FAR.*MID.*NEAR/s);
    // The paint call takes `zoom.tag`, which is exactly one of the three.
    expect(block).toMatch(/fillText\(zoom\.tag,/);
  });

  it("HOUSE HARDWARE brass on the tag — not a market direction hue", () => {
    // Gold/brass is ATH hardware/identity per canon. This tag is house
    // hardware, so brass is lawful; §9's ban on hue is on VERDICTS about the
    // market, and a resolution label is neither bullish nor bearish.
    expect(block).toMatch(/rgba\(201,165,92,\s*0\.85\)/);
  });

  it("spends no green and no red on the tag", () => {
    const rgbas = [...block.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)];
    expect(rgbas.length).toBeGreaterThan(0);
    for (const m of rgbas) {
      const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
      expect(g > r && g > b, `green-dominant colour on the tag: ${m[0]}`).toBe(false);
      expect(r > g * 1.6 && r > b * 1.6, `red-dominant colour on the tag: ${m[0]}`).toBe(false);
    }
  });
});

describe("H1 — never looked is not looked and found nothing", () => {
  it("PAINTS NOTHING WHEN THE RANGE IS UNMEASURED", () => {
    // Rendering NEAR of an empty chart would say "you are reading candle
    // anatomy of nothing" — absence rendered as a value.
    // 2026-09-26 (H-501 permission): the plate also asks the permission
    // table (zoomPlate SPEAKs at every measured depth); UNMEASURED still paints nothing.
    expect(block).toMatch(/if \(zoom\.tag && att\.paints\("zoomPlate"\)\) \{/);
  });

  it("still publishes an UNMEASURED reason in the receipt, and the bar count", () => {
    expect(block).toMatch(/ds\.semanticZoom = zoom\.tag \?\? `UNMEASURED:/);
    expect(block).toMatch(/ds\.semanticZoomBars/);
  });
});

describe("the module ships no data-resolution field", () => {
  it("never emits timeframe alongside the tag", () => {
    expect(block).not.toMatch(/timeframe/);
  });
});
