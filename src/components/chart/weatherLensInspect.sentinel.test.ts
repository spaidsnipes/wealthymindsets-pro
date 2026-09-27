/**
 * F08B · THE STORM IS AN OBJECT — Garden 16 reconstruction §39 (2026-09-27).
 * Click inside the lens → the ONE selection reducer's WEATHER kind → Inspect
 * explains the room's ONE weather reading (what / where / evidence / class /
 * fidelity / lineage). Switched off, the selection goes with the layer.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");
const CD = readFileSync("src/components/chart/ChartsDashboard.tsx", "utf8");
const SEL = readFileSync("src/lib/marketData/viewModels/chartSelection.ts", "utf8");
const IT = readFileSync("src/components/chart/ChartInspectTicket.tsx", "utf8");

describe("the weather lens is selectable and inspectable", () => {
  it("the glass publishes the lens disc it drew and a click inside selects it", () => {
    expect(MC).toContain("weatherLensHitRef.current = { cx: L.cx, cy: L.cy, rx: L.rx, ry: L.ry };");
    expect(MC).toContain("((x - lensHit.cx) / lensHit.rx) ** 2 + ((y - lensHit.cy) / lensHit.ry) ** 2 <= 1");
    expect(MC).toContain("onSelectWeather?.();");
    expect(MC).toContain("ds.weatherLensHitAt =");
  });
  it("one reducer, scoped to its chart, released with the layer", () => {
    expect(SEL).toContain('readonly kind: "WEATHER";');
    expect(CD).toContain('selection: { kind: "WEATHER", symbol, timeframe }');
    expect(CD).toContain('if (!liquidityWeatherOn) actOnChartSelection({ type: "clear", kinds: ["WEATHER"] });');
    expect(CD).toContain("weatherLens={activeSelectedWeather ? chartLiquidityWeather : null}");
  });
  it("Inspect answers what / where / evidence / class / fidelity / lineage from the one reading", () => {
    for (const w of ["LIQUIDITY WEATHER ·", "What ·", "Where ·", "Evidence ·", "Class ·", "Fidelity ·", "Lineage ·"]) expect(IT).toContain(w);
    expect(IT).toContain("no weather is guessed at");
  });
});

describe("depth: structure stands in front of environment (Garden 16 §22)", () => {
  it("the storm and its ring are cut around every pressure wall body, on the chip clip (never cancelling a candle's cut)", () => {
    expect(MC).toContain("for (const wr of pressureWallHitRef.current) chipCut.rect(wr.x, wr.y, wr.w, wr.h);");
    expect(MC.indexOf("for (const wr of pressureWallHitRef.current) chipCut.rect(")).toBeLessThan(MC.indexOf("weatherLensChipCut = chipCut;"));
  });
});
