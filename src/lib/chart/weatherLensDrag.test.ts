import { describe, it, expect } from "vitest";
import { constrainWeatherLens, weatherLensBarSpan, isWeatherLensBezel, weatherInspectReading } from "./weatherLensDrag";
describe("grabbed weather aperture", () => {
  it("Inspect keeps an unmeasured selected aperture instead of borrowing measured live weather", () => {
    const live = { stage: "HEAVY", sample: "latest tape" };
    const selected = { stage: "UNMEASURED", sample: "historical aperture without volume" };
    const scope = { symbol: "BTCUSD", timeframe: "15m", vm: selected };
    expect(weatherInspectReading(scope, live, "BTCUSD", "15m", true)).toBe(selected);
    expect(weatherInspectReading(scope, live, "TSLA", "15m", true)).toBe(live);
    expect(weatherInspectReading(scope, live, "BTCUSD", "1m", true)).toBe(live);
    expect(weatherInspectReading(scope, live, "BTCUSD", "15m", false)).toBe(live);
    expect(weatherInspectReading(null, live, "BTCUSD", "15m", true)).toBe(live);
  });
  it("grabs the brass rim without stealing candle clicks in the interior", () => {
    const lens = { cx: 200, cy: 200, rx: 100, ry: 80 };
    expect(isWeatherLensBezel(200, 200, lens)).toBe(false);
    expect(isWeatherLensBezel(300, 200, lens)).toBe(true);
    expect(isWeatherLensBezel(200, 120, lens)).toBe(true);
    expect(isWeatherLensBezel(340, 200, lens)).toBe(false);
  });
  it("keeps the entire bezel away from axes and header", () => {
    expect(constrainWeatherLens(-80, 900, 100, 80, 800, 500, 40)).toEqual({ x: 120, y: 396 });
    expect(constrainWeatherLens(900, -40, 100, 80, 800, 500, 40)).toEqual({ x: 680, y: 144 });
  });
  it("selects only retained candles instead of borrowing the newest window", () => {
    expect(weatherLensBarSpan(30, 100, 10, 400)).toEqual({ from: 20, to: 41 });
    expect(weatherLensBarSpan(-30, 100, 10, 400)).toEqual({ from: 0, to: 0 });
    expect(weatherLensBarSpan(410, 100, 10, 400)).toEqual({ from: 400, to: 400 });
    expect(weatherLensBarSpan(30, 100, 0, 400)).toEqual({ from: 0, to: 0 });
  });
});
