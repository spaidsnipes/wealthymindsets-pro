/**
 * THE DRAGGABLE MAGNIFIER (Liquidity Weather lens) — shift 1106.
 * Drag on mouse and touch, kept in bounds, and its position persists.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  WEATHER_LENS_PLACEMENT_KEY, WEATHER_LENS_PLACEMENT_MAX, apertureFromPlacement, clearWeatherLensPlacement,
  placementFromAperture, readWeatherLensPlacement, writeWeatherLensPlacement,
} from "./weatherLensPlacement";
import { constrainWeatherLens } from "./weatherLensDrag";

const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
};
const bars15 = Array.from({ length: 200 }, (_, i) => ({ time: 1_700_000_000 + i * 900 }));

describe("persistence: a market point, not pixels", () => {
  it("round-trips on the same timeframe exactly (bar + fraction + price + radii)", () => {
    const a = { logical: 120.4, price: 21543.25, rx: 96, ry: 80 };
    const p = placementFromAperture(a, bars15, "15m", 1)!;
    expect(p.time).toBe(bars15[120].time);
    expect(p.offset).toBeCloseTo(0.4, 9);
    expect(apertureFromPlacement(p, bars15, "15m")).toEqual({ logical: 120.4, price: 21543.25, rx: 96, ry: 80 });
  });
  it("a timeframe switch lands the same instant inside the new bar", () => {
    const p = placementFromAperture({ logical: 121, price: 100, rx: 90, ry: 90 }, bars15, "15m")!;
    const bars1h = Array.from({ length: 60 }, (_, i) => ({ time: 1_700_000_000 + i * 3600 }));
    // 121 × 15m = 30.25 h → the 1h bar at index 30, no carried fraction.
    expect(apertureFromPlacement(p, bars1h, "1h")).toEqual({ logical: 30, price: 100, rx: 90, ry: 90 });
  });
  it("history not loaded yet → null (restore waits), never a guessed bar", () => {
    const p = placementFromAperture({ logical: 5, price: 1, rx: 50, ry: 50 }, bars15, "15m")!;
    expect(apertureFromPlacement(p, bars15.slice(50), "15m")).toBeNull();
    expect(apertureFromPlacement(p, [], "15m")).toBeNull();
  });
  it("logical beyond the loaded bars is clamped to the edge bar, NaN is refused", () => {
    expect(placementFromAperture({ logical: 999, price: 1, rx: 50, ry: 50 }, bars15, "15m")!.time).toBe(bars15[199].time);
    expect(placementFromAperture({ logical: -3, price: 1, rx: 50, ry: 50 }, bars15, "15m")!.time).toBe(bars15[0].time);
    expect(placementFromAperture({ logical: NaN, price: 1, rx: 50, ry: 50 }, bars15, "15m")).toBeNull();
    expect(placementFromAperture({ logical: 3, price: 1, rx: 0, ry: 50 }, bars15, "15m")).toBeNull();
  });
  it("per symbol; Return-to-live forgets; capped; blocked storage never throws", () => {
    const s = mem();
    const p = placementFromAperture({ logical: 10, price: 5, rx: 60, ry: 60 }, bars15, "15m", 10)!;
    expect(writeWeatherLensPlacement(s, "NQ1!", p)).toBe(true);
    expect(readWeatherLensPlacement(s, "NQ1!")).toEqual(p);
    expect(readWeatherLensPlacement(s, "BTCUSD")).toBeNull();
    expect(clearWeatherLensPlacement(s, "NQ1!")).toBe(true);
    expect(readWeatherLensPlacement(s, "NQ1!")).toBeNull();
    for (let i = 0; i < WEATHER_LENS_PLACEMENT_MAX + 5; i++) writeWeatherLensPlacement(s, `S${i}`, { ...p, savedAt: i });
    expect(Object.keys(JSON.parse(s.m.get(WEATHER_LENS_PLACEMENT_KEY)!))).toHaveLength(WEATHER_LENS_PLACEMENT_MAX);
    expect(readWeatherLensPlacement(s, "S0")).toBeNull(); // the oldest went
    const blocked = { getItem: () => { throw new Error("SecurityError"); }, setItem: () => { throw new Error("QuotaExceeded"); } };
    expect(readWeatherLensPlacement(blocked, "NQ1!")).toBeNull();
    expect(writeWeatherLensPlacement(blocked, "NQ1!", p)).toBe(false);
    s.m.set(WEATHER_LENS_PLACEMENT_KEY, "{not json");
    expect(readWeatherLensPlacement(s, "NQ1!")).toBeNull();
  });
});

describe("bounds: every way of moving the glass keeps its centre on the pane", () => {
  it("the hand and the arrow keys share constrainWeatherLens", () => {
    // Arrow-walked 50 presses left from the edge stays on the glass.
    let x = 60;
    for (let i = 0; i < 50; i++) x = constrainWeatherLens(x - 12, 200, 90, 90, 800, 500, 64).x;
    expect(x).toBeCloseTo(90 / 3 + 12, 6);
  });
  const c = readFileSync("src/components/chart/MainChart.tsx", "utf8");
  it("the keyboard path is bounded (it used to walk off the pane)", () => {
    expect(c).toMatch(/const c = constrainWeatherLens\(hit\.cx \+ \(e\.key === "ArrowRight"/);
  });
  it("mouse (glass + ring), touch (ring), and the DRAG LENS chip all write the aperture through the bounded centre", () => {
    expect(c.match(/const center = constrainWeatherLens\(e\.clientX - rect\.left - grab\.dx, e\.clientY - rect\.top - grab\.dy/g)?.length).toBe(2);
    expect(c).toContain('if (e.pointerType === "touch") return;'); // interior touch pans the chart
    expect(c).toContain('if (weatherGrabRef.current || (e.type === "touchstart" && isWeatherLensBezel(x, y, hit))) e.stopImmediatePropagation();');
    expect(c).toMatch(/data-testid="weather-lens-drag"[\s\S]{0,900}touchAction: "none"/);
  });
});

describe("wiring: placement saved at the end of every move, restored, forgotten on Return to live", () => {
  const c = readFileSync("src/components/chart/MainChart.tsx", "utf8");
  it("saved on host pointer-up, chip pointer-up and arrow keys", () => {
    expect(c.match(/persistWeatherApertureRef\.current\(\);/g)?.length).toBeGreaterThanOrEqual(3);
  });
  it("restored once the bars hold it, and the lens reads as hand-placed", () => {
    expect(c).toContain("weatherRestoreRef.current = liquidityWeatherOnChart ? readWeatherLensPlacement(lensStore(), String(symbol)) : null;");
    expect(c).toMatch(/const restored = apertureFromPlacement\(weatherRestoreRef\.current, barsRef\.current \?\? \[\], String\(timeframe\)\);[\s\S]{0,200}weatherApertureRef\.current = restored;[\s\S]{0,120}setWeatherDetached\(true\)/);
  });
  it("every Return-to-live door forgets the placement", () => {
    expect(c.match(/setWeatherDetached\(false\); forgetWeatherPlacementRef\.current\(\);/g)?.length).toBe(3);
  });
});
