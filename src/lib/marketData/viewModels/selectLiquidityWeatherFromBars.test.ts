import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { selectLiquidityWeatherFromBars, WEATHER_MIN_BARS } from "./selectLiquidityWeather";

const bars = (n: number, vol: (i: number) => number, range = (_i: number) => 1) =>
  Array.from({ length: n }, (_, i) => ({ time: 1_790_000_000 + i * 900, high: 100 + range(i) / 2, low: 100 - range(i) / 2, volume: vol(i) }));

describe("Liquidity Weather from the chart's own bars", () => {
  it("too few bars / no volume / no travel are named silences", () => {
    expect(selectLiquidityWeatherFromBars(bars(WEATHER_MIN_BARS - 1, () => 10)).stage).toBe("UNMEASURED");
    expect(selectLiquidityWeatherFromBars(bars(40, () => 0)).stage).toBe("UNMEASURED");
    expect(selectLiquidityWeatherFromBars(bars(40, () => 10, () => 0)).stage).toBe("UNMEASURED");
  });
  it("cost rising across the window reads THICKENING through the one judge, and says it is bar-derived", () => {
    const vm = selectLiquidityWeatherFromBars(bars(48, i => (i < 24 ? 100 : 400)));
    expect(vm.stage).toBe("THICKENING");
    expect(vm.detail).toMatch(/^From this chart's last 48 traded bars \(volume per bar-range travel; DERIVED, not tape\)\./);
    expect(vm.provenance).toBe("UNDISCLOSED");
  });
  it("cost falling reads THINNING; segments carry real bar times (ms)", () => {
    const vm = selectLiquidityWeatherFromBars(bars(48, i => (i < 24 ? 400 : 100)));
    expect(vm.stage).toBe("THINNING");
    expect(vm.segments[0].fromTime).toBe(1_790_000_000 * 1000);
  });
});

describe("weather is measured where trading happened", () => {
  it("an untraded tail (after hours / weekend) does not blank the reading", () => {
    const session = bars(48, i => (i < 24 ? 100 : 400));
    const tail = Array.from({ length: 60 }, (_, i) => ({ time: 1_790_100_000 + i * 900, high: 100.2, low: 99.8, volume: 0 }));
    const vm = selectLiquidityWeatherFromBars([...session, ...tail]);
    expect(vm.stage).toBe("THICKENING");
    expect(vm.segments[vm.segments.length - 1].toTime).toBe(session[47].time * 1000);
  });
});

describe("the room hands ONE weather reading to every surface", () => {
  const CD = readFileSync("src/components/chart/ChartsDashboard.tsx", "utf8");
  const MC = readFileSync("src/components/chart/MainChart.tsx", "utf8");
  it("tape when its window spans the lens's six bars, else the bars (volume-gated)", () => {
    expect(CD).toContain("if (tape.stage !== \"UNMEASURED\" && spanMs >= 6 * barMs) return tape;");
    expect(CD).toContain("const bars = volumeBars.map(");
    expect(CD).toContain("liquidityWeather={chartLiquidityWeather}");
    expect(CD).toContain("<LiquidityWeatherView vm={chartLiquidityWeather}");
    expect(CD).toContain("liquidityWeather: chartLiquidityWeather,");
    expect(CD).not.toContain("liquidityWeather={chartOrderFlowReadings.liquidityWeather}");
  });
  it("F08B smoke spreads each cell's OWN tone; the regulator still owns brightness", () => {
    expect(MC).toContain("F08B SMOKE");
    expect(MC).toMatch(/const seed = \(cell\.index \+ 1\) \* 2654435761;/);
    const at = MC.indexOf("F08B SMOKE");
    expect(MC.slice(at, at + 2600)).not.toMatch(/Math\.random\(\)/);
  });
});
