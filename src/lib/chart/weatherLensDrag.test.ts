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
  it("a hand-placed loupe may overhang by 2/3 of its radius; its centre stays on the glass (2026-10-02)", () => {
    const a = constrainWeatherLens(-80, 900, 100, 80, 800, 500, 40);
    expect(a.x).toBeCloseTo(100 / 3 + 12, 6);
    expect(a.y).toBeCloseTo(500 - (80 / 3 + 12), 6);
    const b = constrainWeatherLens(900, -40, 100, 80, 800, 500, 40);
    expect(b.x).toBeCloseTo(800 - (100 / 3 + 12), 6);
    expect(b.y).toBeCloseTo(40 + 80 / 3 + 12, 6);
    // Inside the glass it follows the hand exactly.
    expect(constrainWeatherLens(400, 300, 100, 80, 800, 500, 40)).toEqual({ x: 400, y: 300 });
  });
  it("selects only retained candles instead of borrowing the newest window", () => {
    expect(weatherLensBarSpan(30, 100, 10, 400)).toEqual({ from: 20, to: 41 });
    expect(weatherLensBarSpan(-30, 100, 10, 400)).toEqual({ from: 0, to: 0 });
    expect(weatherLensBarSpan(410, 100, 10, 400)).toEqual({ from: 400, to: 400 });
    expect(weatherLensBarSpan(30, 100, 0, 400)).toEqual({ from: 0, to: 0 });
  });
});

import { isInsideWeatherLens, LENS_DRAG_SLOP } from "./weatherLensDrag";
import { readFileSync as rf } from "node:fs";
describe("the glass itself can be taken and moved anywhere along the candles (Founder, 2026-10-02)", () => {
  const lens = { cx: 500, cy: 300, rx: 120, ry: 120 };
  it("inside the glass is grabbable; outside is not", () => {
    expect(isInsideWeatherLens(500, 300, lens)).toBe(true);
    expect(isInsideWeatherLens(600, 300, lens)).toBe(true);
    expect(isInsideWeatherLens(700, 300, lens)).toBe(false);
    expect(LENS_DRAG_SLOP).toBe(5);
  });
  it("a press inside waits for movement, so a still press stays a candle click", () => {
    const c = rf("src/components/chart/MainChart.tsx", "utf8");
    expect(c).toContain("if (isInsideWeatherLens(px, py, hit)) {");
    expect(c).toContain("e.preventDefault(); e.stopImmediatePropagation();\n          pending = {");
    expect(c).toContain('p.target.dispatchEvent(new PointerEvent("pointerdown", p.init));');
    expect(c).toContain("if (Math.hypot(e.clientX - pending.x0, e.clientY - pending.y0) <= LENS_DRAG_SLOP) return;");
    expect(c).toContain("weatherGrabRef.current = { pointer: e.pointerId, dx: pending.dx, dy: pending.dy, rx: pending.rx, ry: pending.ry };");
  });
});

describe("a finger inside the glass belongs to the glass on a tablet", () => {
  it("touches inside the lens never reach the chart's pan", () => {
    const c = rf("src/components/chart/MainChart.tsx", "utf8");
    expect(c).toContain('host.addEventListener("touchstart", touchGuard, { capture: true, passive: true });');
    expect(c).toContain("if (weatherGrabRef.current || pending || isInsideWeatherLens(x, y, hit) || isWeatherLensBezel(x, y, hit)) e.stopImmediatePropagation();");
  });
});
