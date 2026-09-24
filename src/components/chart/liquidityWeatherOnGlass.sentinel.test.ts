/**
 * LIQUIDITY WEATHER ON THE GLASS — AND THE HARDER GUARD, WHICH IS AN ABSENCE.
 *
 * The three readings sentinelled before this one were PRICES trapped in a
 * drawer, and the regression to guard was the wire going quiet: the panel keeps
 * naming a level while the chart stops drawing it.
 *
 * This reading is not that. Liquidity weather measures COST — size per unit of
 * the window's own spread — and a cost has no level. So there are two guards
 * here pulling opposite ways:
 *
 *   1. The shelves MUST reach the axis. A stalled segment is the one genuinely
 *      price-anchored fact the reading owns: size traded and price did not move.
 *   2. Nothing ELSE may reach it. `medianCost`, `latestCost`, `trendRatio` and
 *      the segment array would all map onto a price scale without complaint and
 *      every one of those mappings is a number the house invented.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

/** Prose paints nothing and these files explain themselves at length. */
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

const CHART = strip(read("src/components/chart/MainChart.tsx"));
const ROOM = strip(read("src/components/chart/ChartsDashboard.tsx"));

const block = (() => {
  const at = CHART.indexOf("selectLiquidityWeatherGlass(liquidityWeatherRef.current)");
  expect(at, "the glass call was renamed or removed").toBeGreaterThan(-1);
  return CHART.slice(at, at + 3600);
})();

describe("the reading reaches the chart", () => {
  it("the room hands the SAME reading it gives the drawer to the glass", () => {
    expect(ROOM).toMatch(/liquidityWeather=\{chartOrderFlowReadings\.liquidityWeather\}/);
  });

  it("the chart accepts it as a prop and does NOT recompute the tape", () => {
    expect(CHART).toMatch(/liquidityWeather\?:/);
    expect(CHART).toMatch(/selectLiquidityWeatherGlass/);
    // Canon weakness #1: one reading, two renderings. The engine segments the
    // tape by its own rules; a second caller is a second answer.
    expect(CHART).not.toMatch(/\bselectLiquidityWeather\s*\(/);
  });

  it("the overlay reads it through a ref, not through its dependency array", () => {
    // Naming a tape-rate value in the overlay's deps tears the rAF loop down
    // several times a second — the documented cause of layers flashing off.
    expect(CHART).toMatch(/liquidityWeatherRef/);
    const deps = CHART.slice(CHART.lastIndexOf("}, [footprintType"));
    expect(deps.slice(0, 400)).not.toMatch(/\bliquidityWeather\b/);
  });
});

describe("A STALLED SEGMENT IS A PRICE, and it is the one thing on the axis", () => {
  it("places every stall price on the same scale the candles use", () => {
    expect(block).toMatch(/for \(const p of glass\.stallPrices\)/);
    expect(block).toMatch(/srs\.priceToCoordinate\(p\)/);
  });

  it("counts what it actually painted rather than what it was handed", () => {
    // A price outside the visible range yields no coordinate. Reporting the
    // list length would claim shelves that were never drawn.
    expect(block).toMatch(/shelves\+\+/);
    expect(block).toMatch(/if \(yr == null\) continue/);
  });
});

describe("A COST HAS NO PRICE, and nothing here invents one for it", () => {
  it("passes no cost figure to a coordinate function", () => {
    expect(block).not.toMatch(/priceToCoordinate\([^)]*(?:ost|rend|ispersion|pread)/);
  });

  it("never reads the fields that would tempt it — the compiler emits none", () => {
    expect(block).not.toMatch(
      /glass\.(?:medianCost|latestCost|segments|trendRatio|dispersion|spread)/,
    );
  });

  it("paints the stage as WORDS in the chrome, not as a band at a level", () => {
    expect(block).toMatch(/fillText\(glass\.label/);
    expect(block).toMatch(/textAlign = "left"/);
    // Fixed chrome offsets, never a price-derived y.
    expect(block).toMatch(/fillText\(glass\.label, 8,/);
  });
});

describe("§9 — seven stages are a gradient, and no gradient gets a hue", () => {
  it("chooses no colour from the stage", () => {
    // AIRLESS is not danger and HEAVY is not safety: a thin tape is where a
    // stop slips and also where a breakout runs. The house grades neither.
    expect(block).not.toMatch(/glass\.stage\s*===/);
    expect(block).not.toMatch(/-wm-green|-wm-red/);
  });

  it("spends no green and no red on the weather", () => {
    const rgbas = [...block.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)];
    expect(rgbas.length, "no literal colours found — did the block move?").toBeGreaterThan(0);
    for (const m of rgbas) {
      const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
      expect(g > r && g > b, `green-dominant colour on the weather: ${m[0]}`).toBe(false);
      expect(r > g * 1.6 && r > b * 1.6, `red-dominant colour on the weather: ${m[0]}`).toBe(false);
    }
  });
});

describe("a shelf does not pose as a defended level", () => {
  it("draws the stalls dotted and short, not as a full-width support line", () => {
    // "Nothing moved here" is an observation. A solid line spanning the pane
    // reads as a level somebody is holding, which is a claim about intent.
    expect(block).toMatch(/setLineDash\(\[1, 3\]\)/);
    expect(block).toMatch(/moveTo\(158,/);
    expect(block).toMatch(/lineTo\(238,/);
  });

  it("restores the solid dash before the words, so the chrome is not dotted too", () => {
    expect(block).toMatch(/setLineDash\(\[\]\)/);
  });

  it("captions the shelves only when it drew some", () => {
    expect(block).toMatch(/glass\.stallLabel && shelves > 0/);
  });
});

describe("the layer publishes a receipt in every state, including the silent ones", () => {
  it("stamps the reason even when nothing is painted", () => {
    expect(block).toMatch(/ds\.liquidityWeather = on \? glass\.reason : "OFF"/);
  });

  it("withdraws the stage receipt rather than letting a stale one describe the tape", () => {
    expect(block).toMatch(/delete ds\.liquidityWeatherStage/);
    expect(block).toMatch(/delete ds\.liquidityWeatherShelves/);
  });
});

describe("the heat lens reads as a tide without inventing another market fact", () => {
  it("fades inside the observed price band rather than laying an opaque slab over candles", () => {
    expect(CHART).toMatch(/createLinearGradient\(0, top, 0, top \+ band\)/);
    expect(CHART).toMatch(/wash\.addColorStop\(0, "rgba\(0,0,0,0\)"\)/);
    expect(CHART).toMatch(/wash\.addColorStop\(1, "rgba\(0,0,0,0\)"\)/);
    // Each cell paints at its strength RELATIVE to the regulator into an
    // offscreen layer; the layer meets the glass once at maxOpacity × 0.72, so
    // a lone cell looks exactly as before and overlapping cells cannot stack
    // past the cap (the slab observed on a fixture tape, 2026-09-24).
    expect(CHART).toMatch(/ctxHeat\.globalAlpha = heat\.maxOpacity > 0 \? alpha \/ heat\.maxOpacity : 0/);
    expect(CHART).toMatch(/const glassAlpha = heat\.maxOpacity \* 0\.72/);
    expect(CHART).toMatch(/mainCtx\.globalAlpha = glassAlpha;\s*mainCtx\.drawImage\(hc, 0, 0\)/);
  });

  it("clips every contour to the segment's measured high and low", () => {
    expect(CHART).toMatch(/ctxHeat\.rect\(0, top, W, band\)/);
    expect(CHART).toMatch(/ctxHeat\.clip\(\)/);
    expect(CHART).toMatch(/const y = top \+ \(band \* ci\) \/ \(contourCount \+ 1\)/);
  });

  it("lets measured intensity control texture while the regulator still caps opacity", () => {
    expect(CHART).toMatch(/1 \+ Math\.round\(cell\.intensity \* 2\)/);
    // Relative to the regulator here; the regulator itself is applied once, at the blit.
    expect(CHART).toMatch(/Math\.min\(1, \(alpha \* 0\.9\) \/ heat\.maxOpacity\)/);
    expect(CHART).toMatch(/heatRampColor\(cell\.intensity\)/);
  });

  it("publishes and withdraws a contour receipt with the cells it describes", () => {
    expect(CHART).toMatch(/ds\.heatLensContours = String\(contours\)/);
    expect(CHART.match(/delete ds\.heatLensContours/g)?.length).toBeGreaterThanOrEqual(2);
  });
});

describe("the trader can quiet this layer, and the chart says WHICH silence it is", () => {
  it("a switched-off layer paints NOTHING, not merely fewer shelves", () => {
    expect(block).toMatch(/if \(on && glass\.drawn\) \{/);
  });

  it("reads the switch from a REF, never from the overlay's dependency array", () => {
    expect(block).toMatch(/const on = layerOnRef\.current\.weather/);
    const deps = CHART.slice(CHART.lastIndexOf("}, [footprintType"));
    expect(deps.slice(0, 400)).not.toMatch(/liquidityWeatherOnChart/);
  });

  it("the switch travels as its OWN prop, not as a null reading", () => {
    expect(CHART).toMatch(/liquidityWeatherOnChart\?: boolean/);
    expect(ROOM).toMatch(/liquidityWeatherOnChart=\{liquidityWeatherOn\}/);
  });
});
