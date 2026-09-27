/**
 * GARDEN 15 §2–§7 / GARDEN 16 §20 — DERIVATIVES PRESSURE IS A WORLD, NOT A CARD.
 *
 * Emergency order (2026-09-27): "build the static Founder form first" — the
 * derivatives environment under price, walls as material, the transition as a
 * front. These pins keep the manifestation from sliding back into a band + a
 * label, and keep its truth chain (Cboe delayed → one owner → canvas) intact.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");
const CD = readFileSync("src/components/chart/ChartsDashboard.tsx", "utf8");
const block = (() => {
  const a = MC.indexOf("GARDEN 15 §2–§7 · DERIVATIVES PRESSURE");
  const b = MC.indexOf("T-210 / F10 · MTF IS NOT FOUR CHARTS");
  return a > 0 && b > a ? MC.slice(a, b) : "";
})();

describe("the pressure world on the glass", () => {
  it("paints only the room's ONE compilation, through the governor", () => {
    expect(block.length).toBeGreaterThan(0);
    expect(block).toContain('layerOnRef.current.derivativesPressure === true && att.paints("derivativesPressure")');
    expect(block).not.toMatch(/selectDerivativesPressure\(/);
    expect(CD).toMatch(/selectDerivativesPressure\(derivativesReceipt\.receipt, chartBars\.slice\(-400\), Date\.now\(\)\)/);
    expect(CD).toContain("/api/market-data/cboe/options?symbol=");
  });
  it("FIELD: every price level tinted by its pressure, with climate texture (strata / wind)", () => {
    expect(block).toContain("const geo = dp.geography;");
    expect(block).toMatch(/net >= 0 \? `rgba\(84,140,204/);
    expect(block).toMatch(/: `rgba\(222,108,44/);
  });
  it("FRONT: zero-gamma transition as a weather front (triangles + semicircles)", () => {
    expect(block).toContain("ZERO-GAMMA FRONT");
    expect(block).toMatch(/Triangles point into the amplifying side/);
  });
  it("WALLS: brick courses in running bond with depth; cracks = observed tests; lifecycle changes material", () => {
    expect(block).toMatch(/const off = c % 2 === 0 \? 0 : brickW \/ 2;/);
    expect(block).toContain("const cracks = broken ? 0 : Math.min(6, w.tests);");
    expect(block).toMatch(/if \(weak && r < 0\.16\) continue;/);
    expect(block).toMatch(/if \(broken\) \{/);
    expect(block).toContain("a lit cap on top, a cast shadow below");
  });
  it("price stays sovereign; words are placed and permitted; off-camera walls are said", () => {
    expect(block).toContain('ctx.clip(cutD, "evenodd");');
    expect(block).toContain('const dpSpeaks = att.speaks("derivativesPressure");');
    expect(block).toContain("placeClearOfKeepOut(");
    expect(block).toContain("OFF_CAMERA");
  });
  it("truth is named on the glass: source, delay, OI clock, epistemic class", () => {
    expect(block).toContain("Cboe delayed · OI prior session · INFERRED");
  });
});
