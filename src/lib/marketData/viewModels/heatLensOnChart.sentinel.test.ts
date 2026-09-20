/**
 * THE HEAT LENS IS ON THE CANDLES, AND THE REGULATOR IS WHY IT MAY BE.
 *
 * P-601 lets weather sit ON the market canvas rather than beside it for exactly
 * one reason: the OPACITY REGULATOR (MAX 0.30) guarantees the candles stay
 * legible through the hottest band. Remove the cap and the sheet's own S-501
 * rule — "ZONES SHALL NOT BURY CANDLES" — is broken by the layer that was
 * supposed to demonstrate it.
 *
 * This is a PRESERVATION rule, not a discovery one. It has zero offenders today
 * and that is the point; its acceptance evidence is its mutation proof, not a
 * list of things it caught. What it forbids is specific and easy to do by
 * accident: reaching for a literal alpha at the paint site. A renderer that
 * writes its own `globalAlpha = 0.5` has moved the regulator out of the module
 * that publishes it and into a file where nobody is looking for it.
 *
 * It reads the SOURCE rather than rendering, because MainChart paints to a
 * canvas inside a requestAnimationFrame loop against a live chart instance —
 * there is no honest way to assert the drawn pixel in a unit test, and a test
 * that pretended otherwise would be worse than this one.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { HEAT_MAX_OPACITY } from "./selectHeatLens";

const CHART = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "components",
  "chart",
  "MainChart.tsx",
);

const SOURCE = readFileSync(CHART, "utf8");

/** The heat block, sliced out so the assertions cannot drift onto other layers. */
function heatBlock(): string {
  const start = SOURCE.indexOf("const heat = selectHeatLens(");
  expect(start, "MainChart no longer compiles a heat lens at all").toBeGreaterThan(-1);
  const end = SOURCE.indexOf("delete ds.heatLensCells;", start);
  expect(end, "the heat block lost its receipt teardown").toBeGreaterThan(start);
  return SOURCE.slice(start, end);
}

describe("P-601 heat on the candles — the regulator travels with the cell", () => {
  it("compiles heat through the selector, never from raw segments", () => {
    // The chart is a RENDERER. If it started reading `segments` to decide what
    // is hot, the refusals in selectHeatLens — stalled segments, UNMEASURED
    // weather, a missing median — would be bypassed silently.
    expect(SOURCE).toContain(
      'import { heatRampColor, selectHeatLens } from "@/lib/marketData/viewModels/selectHeatLens"',
    );
    expect(heatBlock()).toContain("selectHeatLens(liquidityWeatherRef.current)");
  });

  it("paints at the cell's own opacity, capped by the published regulator", () => {
    const block = heatBlock();
    expect(block).toContain("Math.min(cell.opacity, heat.maxOpacity)");
    // No literal alpha anywhere in the block. `globalAlpha = 0.45` is the exact
    // shape this rule exists to stop, and it would look perfectly reasonable in
    // a diff that was only "making the heat a bit easier to see".
    const literalAlpha = block.match(/globalAlpha\s*=\s*[\d.]/g) ?? [];
    expect(literalAlpha).toEqual([]);
  });

  it("refuses to paint the cells the selector marked quiet", () => {
    expect(heatBlock()).toContain("if (!cell.paintable) continue;");
  });

  it("shares ONE ramp with the DOM overlay", () => {
    // Two renderers, one palette. A copied ramp would let the same cost read as
    // two different temperatures on two surfaces of one product.
    expect(heatBlock()).toContain("heatRampColor(cell.intensity)");
    const overlay = readFileSync(
      path.resolve(__dirname, "..", "..", "..", "components", "experience", "HeatLensOverlay.tsx"),
      "utf8",
    );
    expect(overlay).toContain("heatRampColor(cell.intensity)");
  });

  it("publishes a receipt that tells OFF apart from REFUSED", () => {
    // A switched-off lens and a lens the tape could not feed must not look the
    // same from outside — that conflation is the defect the weather layer
    // beside this one already fixed once.
    expect(heatBlock()).toContain(
      'ds.heatLens = !on ? "OFF" : heat.drawable ? "DRAWN" : "REFUSED";',
    );
  });

  it("keeps the regulator a real number the chart cannot exceed", () => {
    expect(HEAT_MAX_OPACITY).toBeLessThanOrEqual(0.3);
    expect(HEAT_MAX_OPACITY).toBeGreaterThan(0);
  });
});
