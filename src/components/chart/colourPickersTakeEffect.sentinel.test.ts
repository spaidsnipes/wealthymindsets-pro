import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * A COLOUR PICKER CHANGES WHAT IT NAMES (Founder 2026-10-22: "people shouldnt have issues with changing colors
 * of indicators and tools"). An audit of every picker on /charts found these painting from somewhere else.
 */
const chart = readFileSync("src/components/chart/MainChart.tsx", "utf8");
const sheet = readFileSync("src/components/chart/ChartSettingsModal.tsx", "utf8");

describe("every colour picker reaches the glass", () => {
  it("Memory's mass wears a chosen Memory colour", () => {
    expect(chart).toMatch(/pk\.chosen\.VALUE \? pk\.rgba\("VALUE", inVA \? 0\.8 : 0\.5\) : `rgba\(\$\{MEMORY_MASS_RGB\}/);
  });
  it("DNA's silhouette and its label wear a chosen DNA colour", () => {
    expect(chart).toMatch(/const dnaPk = pkFamily\.species\("DNA"\);/);
    expect(chart).toMatch(/dnaPk\.chosen\.VALUE \? \{ \.\.\.DNA_SHAPE_INK\[dnaAlone\.shape!\], rgb: dnaPk\.rgb\("VALUE"\) \}/);
  });
  it("the live volume bar keeps the trader's volume colours (no hard-coded teal/red repaint)", () => {
    expect(chart).not.toMatch(/"rgba\(0,212,170,0\.55\)" : "rgba\(255,77,106|: "rgba\(255,77,106,0\.55\)"\)/);
    expect(chart).toMatch(/color: u\.close >= u\.open \? volUp : volDown/);
    expect(chart).toMatch(/color: bar\.close >= bar\.open \? volUp : volDown/);
  });
  it("the Delta gear's colours paint the Delta band", () => {
    expect(chart).toMatch(/effectiveFP === "delta"\s*\n\s*\? \(d >= 0 \? buyRgba\(a\) : sellRgba\(a\)\)/);
  });
  it("the Volume indicator and histogram / session-line indicators take the indicator's colour", () => {
    expect(chart).toMatch(/const vc = hexToRgbTriplet\(indSettings\?\.Volume\?\.color \|\| ""\);/);
    const hist = chart.slice(chart.indexOf("const addHist = "), chart.indexOf("// ── Native bottom panes"));
    expect(hist).toMatch(/styleInd\(s as never\);/);
    const sess = chart.slice(chart.indexOf("const addSessionLine = "), chart.indexOf("const vwapBand = "));
    expect(sess).toMatch(/styleInd\(s as never\);/);
  });
  it("the fused-profile swatch names only what it paints", () => {
    expect(sheet).toMatch(/label="Fused profile · outline \+ knots"/);
    expect(sheet).not.toMatch(/Fused profile · outline \+ POC\/VA/);
  });
});
