import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { CHART_PROP_FOR, chartPropsForSwitches, chartPropsForView, pendingDeskReadings, compileDeskBarReadings } from "./deskView";

describe("Garden 18 §LVI — a View per Desk screen", () => {
  it("FX keeps time/range TPO while refusing volume-weather, and empty screens invent no reading", () => {
    const bars = Array.from({ length: 48 }, (_, i) => ({ time: 1800000000 + i * 300, high: 1.12 + (i % 7) * 0.001, low: 1.1 + (i % 7) * 0.001, volume: 100 + i }));
    const fx = compileDeskBarReadings("EURUSD", bars);
    const equity = compileDeskBarReadings("TSLA", bars);
    expect(fx.weather.stage).toBe("UNMEASURED");
    expect(equity.weather.stage).not.toBe("UNMEASURED");
    expect(fx.tpo).toEqual(equity.tpo);
    expect(compileDeskBarReadings("TSLA", []).weather.stage).toBe("UNMEASURED");
  });
  it("restores independent footprint, Big Trades, strength and roles without changing another screen", () => {
    const first = chartPropsForView({ id: "tape", name: "Tape", switches: { TPO_PROFILE: true }, roles: { TPO_PROFILE: "PRIMARY" }, profileStrength: "STRONG", footprint: { mode: "delta", enabled: true, bigTrades: true } });
    const clean = chartPropsForView(null);
    expect(first.footprintType).toBe("delta");
    expect(first.footprintEnabled).toBe(true);
    expect(first.bigTradesOverlay).toBe(true);
    expect(first.visualRoles).toEqual({ TPO_PROFILE: "PRIMARY" });
    expect(first.profileStrength).toBe("STRONG");
    expect(clean.footprintEnabled).toBe(false);
    expect(clean.bigTradesOverlay).toBe(false);
    expect(clean.visualRoles).toEqual({});
    expect(clean.profileStrength).toBe("CANON");
  });
  it("reports missing Desk readers without switching the user's preferences off", () => {
    const view = { ABSORPTION: true, TPO_PROFILE: true, CLARITY_CANDLE: true, LIQUIDITY_WEATHER: true, LIVING_PROFILE: true } as const;
    expect(pendingDeskReadings(view)).toEqual(["LIVING_PROFILE"]);
    expect(chartPropsForSwitches(view).livingProfileOnChart).toBe(true);
  });
  it("every mapped prop is a real MainChart prop (no ghost switch)", () => {
    const src = readFileSync(join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
    for (const prop of Object.values(CHART_PROP_FOR)) expect(src, prop).toMatch(new RegExp(`\\b${prop}\\?:`));
  });
  it("a View's ON switches are on; every other mapped sense is off; Clean is all off", () => {
    const p = chartPropsForSwitches({ ABSORPTION: true, TPO_PROFILE: true, VALUE_CANDLE: false });
    expect(p.absorptionAnatomyActive).toBe(true);
    expect(p.tpoProfileOnChart).toBe(true);
    expect(p.valueCandleOnChart).toBe(false);
    expect(p.brickWallsOnChart).toBe(false);
    expect(Object.values(chartPropsForSwitches(null)).every(v => v === false)).toBe(true);
  });
});
