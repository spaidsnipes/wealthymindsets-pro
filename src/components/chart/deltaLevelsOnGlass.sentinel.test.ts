/**
 * DELTA LEVELS REACH THE CANDLES — H-702, family Order Flow / Aggressor Delta.
 *
 * `selectDeltaLevels` measures where each side crossed the spread hardest, on
 * the tape's OWN grid. Its only consumer had been `SmartMoneyPanel`, a drawer,
 * so a canvas rendering delta divergence at swing pivots was showing next to a
 * panel where delta actually concentrated — measured, and invisible to the
 * trader. That is the classic PRICES-TRAPPED-IN-A-DRAWER defect this file
 * exists to guard against.
 *
 * The rules pull in the same two directions the other order-flow breadcrumbs
 * do:
 *
 *   1. The rungs MUST reach the axis, at the compiler's own prices.
 *   2. NOTHING ELSE may. `weight`, `balanced`, `maxAbsDelta` and any of the
 *      raw `delta` counts would map onto a price scale without complaint, and
 *      every such mapping is a level the house invented.
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
  const at = CHART.indexOf("const dl = deltaLevelsRef.current");
  expect(at, "the delta-levels block was renamed or removed").toBeGreaterThan(-1);
  const end = CHART.indexOf("selectHeatLens", at);
  expect(end, "the heat lens no longer follows this block").toBeGreaterThan(at);
  return CHART.slice(at, end);
})();

describe("the reading reaches the chart", () => {
  it("the room hands the CHART the same glass verdict — no second selector on canvas", () => {
    expect(ROOM).toMatch(/deltaLevelsGlass=\{deltaLevelsGlass\}/);
    // The compilation is owned by `useOrderFlowReadings`; the room reads the
    // finished VM off the single-owner set rather than computing a second
    // copy. Guarding the shape of the read, not the exact tape argument.
    expect(ROOM).toMatch(/selectDeltaLevelsGlass\(chartOrderFlowReadings\.deltaLevels\)/);
  });

  it("the chart accepts it as a prop and re-derives nothing", () => {
    expect(CHART).toMatch(/deltaLevelsGlass\?: DeltaLevelsGlass \| null/);
    expect(CHART).not.toMatch(/\bselectDeltaLevels\s*\(/);
    expect(CHART).not.toMatch(/\bselectDeltaLevelsGlass\s*\(/);
  });

  it("the overlay reads it through a ref, not through its dependency array", () => {
    // Delta levels move at tape rate. Naming this in the deps tears the rAF
    // loop down several times a second — the documented cause of layers
    // flashing off.
    expect(CHART).toMatch(/deltaLevelsRef/);
    const deps = CHART.slice(CHART.lastIndexOf("}, [footprintType"));
    expect(deps.slice(0, 400)).not.toMatch(/\bdeltaLevels(?:Glass)?\b/);
  });
});

describe("A RUNG IS A PRICE, and only a price", () => {
  it("passes only the compiler's own price to a coordinate function", () => {
    expect(block).toMatch(/srs\.priceToCoordinate\(r\.price\)/);
    // Never a weight, never a delta count, never the balanced count.
    expect(block).not.toMatch(
      /Coordinate\([^)]*(?:eight|elta|alanced|rid|axAbs)/,
    );
  });

  it("counts rungs actually painted rather than the whole list", () => {
    // A rung outside the visible range yields no coordinate. Reporting the
    // list length would claim lanes that were never drawn.
    expect(block).toMatch(/if \(yr == null\) continue/);
    expect(block).toMatch(/drawnRungs\+\+/);
    expect(block).toMatch(/ds\.deltaLevelsRungs = String\(drawnRungs\)/);
  });

  it("never reads the tempting size fields — the compiler emits none", () => {
    // `selectDeltaLevelsGlass` deliberately does not carry `delta`, `vol`, or
    // `maxAbsDelta`; this file must not try to fish them out anyway.
    expect(block).not.toMatch(/\bdl\.(?:levels|maxAbsDelta|balanced)\b/);
    expect(block).not.toMatch(/r\.(?:delta|vol)\b/);
  });
});

describe("§9 — the two sides are told apart by lane, never by hue", () => {
  it("chooses no colour from the side", () => {
    expect(block).not.toMatch(/r\.side\s*===\s*"BUY"\s*\?\s*"#/);
    expect(block).not.toMatch(/-wm-green|-wm-red/);
  });

  it("spends no green and no red on the lanes", () => {
    const rgbas = [...block.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)];
    expect(rgbas.length, "no literal colours found — did the block move?").toBeGreaterThan(0);
    for (const m of rgbas) {
      const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
      expect(g > r && g > b, `green-dominant colour on the lanes: ${m[0]}`).toBe(false);
      expect(r > g * 1.6 && r > b * 1.6, `red-dominant colour on the lanes: ${m[0]}`).toBe(false);
    }
  });

  it("takes the side from the verdict and only chooses direction from it", () => {
    expect(block).toMatch(/r\.side === "BUY" \? centerX \+ len : centerX - len/);
  });
});

describe("the trader can quiet this layer, and the chart says WHICH silence it is", () => {
  it("a switched-off layer paints NOTHING", () => {
    expect(block).toMatch(/if \(on && dl\?\.drawn\) \{/);
  });

  it("reads the switch from a REF, never from the overlay's dependency array", () => {
    expect(block).toMatch(/const on = layerOnRef\.current\.deltaLevels/);
    const deps = CHART.slice(CHART.lastIndexOf("}, [footprintType"));
    expect(deps.slice(0, 400)).not.toMatch(/deltaLevelsOnChart/);
  });

  it("the switch travels as its OWN prop, not as a null verdict", () => {
    expect(CHART).toMatch(/deltaLevelsOnChart\?: boolean/);
    expect(ROOM).toMatch(/deltaLevelsOnChart=\{deltaLevelsOn\}/);
  });

  it("OFF and NO_READING are different words in the receipt", () => {
    expect(block).toMatch(/ds\.deltaLevels = on \? \(dl \? dl\.reason : "NO_READING"\) : "OFF"/);
  });
});

describe("the layer publishes a receipt in every state", () => {
  it("stamps the reason even when nothing is painted", () => {
    expect(block).toMatch(/ds\.deltaLevels = on \?/);
  });

  it("withdraws the rungs receipt rather than letting a stale count describe a new window", () => {
    expect(block.match(/delete ds\.deltaLevelsRungs/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
