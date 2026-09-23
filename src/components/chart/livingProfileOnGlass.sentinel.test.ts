/**
 * LIVING PROFILE REACHES THE CANDLES — H-703, family F04 Profiles.
 *
 * `selectLivingProfile` publishes real, measured prices — HVN and LVN — with
 * the bucket LOW edge as the price. Its only consumer had been `LivingProfileView`,
 * a card. The classic PRICES-TRAPPED-IN-A-DRAWER defect, third occurrence.
 *
 * Two guards pulling opposite ways, the same shape as the four order-flow
 * sentinels above:
 *
 *   1. The marks MUST reach the axis at the compiler's own bucket prices.
 *   2. NOTHING ELSE may. `weight`, `distanceFromPoc` and the raw `volume`
 *      would map onto a price scale without complaint, and every such mapping
 *      is a level the house invented.
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
const ROOM = strip(read("src/components/chart/ChartsDashboard.tsx"));

const block = (() => {
  const at = CHART.indexOf("const lp = livingProfileRef.current");
  expect(at, "the living-profile block was renamed or removed").toBeGreaterThan(-1);
  // Bounded by the next known landmark — no fixed reach.
  const candidates = ["selectHeatLens", "P-601 HEAT LENS", "/* ══"];
  let end = -1;
  for (const c of candidates) {
    const i = CHART.indexOf(c, at + 100);
    if (i > 0 && (end < 0 || i < end)) end = i;
  }
  expect(end, "no landmark follows this block").toBeGreaterThan(at);
  return CHART.slice(at, end);
})();

describe("the reading reaches the chart", () => {
  it("the room hands the CHART the same glass verdict", () => {
    expect(ROOM).toMatch(/livingProfileGlass=\{livingProfileGlass\}/);
    expect(ROOM).toMatch(/selectLivingProfileGlass\(livingProfileVM\)/);
  });

  it("the chart accepts it as a prop and re-derives nothing", () => {
    expect(CHART).toMatch(/livingProfileGlass\?: LivingProfileGlass \| null/);
    expect(CHART).not.toMatch(/\bselectLivingProfile\s*\(/);
    expect(CHART).not.toMatch(/\bselectLivingProfileGlass\s*\(/);
  });

  it("the overlay reads it through a ref, not through its dependency array", () => {
    expect(CHART).toMatch(/livingProfileRef/);
    const deps = CHART.slice(CHART.lastIndexOf("}, [footprintType"));
    expect(deps.slice(0, 400)).not.toMatch(/\blivingProfile(?:Glass)?\b/);
  });
});

describe("A NODE IS A PRICE, and only a price", () => {
  it("passes only the compiler's own price to a coordinate function", () => {
    expect(block).toMatch(/srs\.priceToCoordinate\(m\.price\)/);
    expect(block).not.toMatch(
      /Coordinate\([^)]*(?:eight|olume|hare|istance|ntraded)/,
    );
  });

  it("counts marks actually painted rather than the whole list", () => {
    expect(block).toMatch(/if \(yr == null\) continue/);
    expect(block).toMatch(/drawnMarks\+\+/);
    expect(block).toMatch(/ds\.livingProfileMarks = String\(drawnMarks\)/);
  });

  it("never reads a tempting size field — the compiler emits none", () => {
    // `LivingProfileGlass` deliberately does not carry raw volumes, distances,
    // or shares. This file must not try to fish them out.
    expect(block).not.toMatch(/m\.(?:volume|distanceFromPoc|shareOfTotal)\b/);
  });
});

describe("HVN vs LVN — told apart by mark shape, never by hue", () => {
  it("chooses the SHAPE from kind, not a colour", () => {
    expect(block).toMatch(/m\.kind === "HVN"/);
    expect(block).toMatch(/fillRect|strokeRect/);
  });

  it("HVN is filled, LVN is hollow — fill/weight law, not hue", () => {
    // Filled = the market lingered here; hollow = a level nobody chose.
    // Absence rendered as an outline, not as a value.
    expect(block).toMatch(/ctx\.fillRect/);
    expect(block).toMatch(/ctx\.strokeRect/);
  });

  it("spends no green and no red on the marks", () => {
    const rgbas = [...block.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)];
    expect(rgbas.length, "no literal colours found — did the block move?").toBeGreaterThan(0);
    for (const m of rgbas) {
      const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
      expect(g > r && g > b, `green-dominant colour on the marks: ${m[0]}`).toBe(false);
      expect(r > g * 1.6 && r > b * 1.6, `red-dominant colour on the marks: ${m[0]}`).toBe(false);
    }
  });
});

describe("the trader can quiet this layer, and the chart says WHICH silence it is", () => {
  it("a switched-off layer paints NOTHING", () => {
    expect(block).toMatch(/if \(on && lp\?\.drawn\) \{/);
  });

  it("reads the switch from a REF, never from the overlay's dependency array", () => {
    expect(block).toMatch(/const on = layerOnRef\.current\.livingProfile/);
    const deps = CHART.slice(CHART.lastIndexOf("}, [footprintType"));
    expect(deps.slice(0, 400)).not.toMatch(/livingProfileOnChart/);
  });

  it("the switch travels as its OWN prop, not as a null verdict", () => {
    expect(CHART).toMatch(/livingProfileOnChart\?: boolean/);
    expect(ROOM).toMatch(/livingProfileOnChart=\{livingProfileOn\}/);
  });

  it("OFF and NO_READING are different words in the receipt", () => {
    expect(block).toMatch(/ds\.livingProfile = on \? \(lp \? lp\.reason : "NO_READING"\) : "OFF"/);
  });
});

describe("the layer publishes a receipt in every state", () => {
  it("stamps the reason even when nothing is painted", () => {
    expect(block).toMatch(/ds\.livingProfile = on \?/);
  });

  it("withdraws ancillary receipts on OFF or when unpainted", () => {
    expect(block.match(/delete ds\.livingProfileMarks/g)?.length).toBeGreaterThanOrEqual(2);
    expect(block.match(/delete ds\.livingProfileUntraded/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
