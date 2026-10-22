import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { liftNeonRoom, NEON_ROOM, traderEdit } from "./chartSettingsEdit";

// Founder 2026-10-22: changing a profile colour in WM Neon left the chart dark behind the screen.
const raw = { background: "#0b0f14", gridColor: "rgba(255,255,255,0.04)", candleUp: "#26a69a", candleDown: "#ef5350", wickUp: "#26a69a", wickDown: "#ef5350", borderUp: "#26a69a", borderDown: "#ef5350" } as Record<string, unknown>;
const neonShown: Record<string, unknown> = { ...raw, ...NEON_ROOM };

describe("traderEdit — only the trader's change is stored", () => {
  it("a profile colour changed in WM Neon stores the colour and not the neon room", () => {
    const next = { ...neonShown, profileSpeciesInk: { STRUCTURE: "#f472b6" } };
    const { settings, candlePaintChanged } = traderEdit(raw, neonShown, next);
    expect(settings.profileSpeciesInk).toEqual({ STRUCTURE: "#f472b6" });
    expect(settings.background).toBe("#0b0f14");
    expect(settings.gridColor).toBe(raw.gridColor);
    expect("neon" in settings).toBe(false);
    expect(candlePaintChanged).toBe(false);
  });

  it("nothing changed returns the same object", () => {
    expect(traderEdit(raw, neonShown, { ...neonShown }).settings).toBe(raw);
  });

  it("one candle channel changed keeps the other five as they were shown", () => {
    const shown = { ...raw, candleUp: "#2563EB", candleDown: "#F59E0B", wickUp: "#60A5FA", wickDown: "#FCD34D", borderUp: "#3B82F6", borderDown: "#FBBF24" };
    const { settings, candlePaintChanged } = traderEdit(raw, shown, { ...shown, candleUp: "#ffffff" });
    expect(candlePaintChanged).toBe(true);
    expect(settings).toMatchObject({ candleUp: "#ffffff", candleDown: "#F59E0B", wickUp: "#60A5FA", borderDown: "#FBBF24" });
  });

  it("a key the edit removes is cleared", () => {
    const shown: Record<string, unknown> = { ...raw, profileSpeciesInk: { STRUCTURE: "#f472b6" } };
    const { profileSpeciesInk: _drop, ...next } = shown;
    expect(traderEdit<Record<string, unknown>>(shown, shown, next).settings.profileSpeciesInk).toBeUndefined();
  });
});

describe("liftNeonRoom — a neon room already stored is lifted on read", () => {
  it("removes the stored neon field, grid, crosshair and flag", () => {
    const out = liftNeonRoom<Record<string, unknown>>({ ...raw, ...NEON_ROOM, profileSpeciesInk: { STRUCTURE: "#f472b6" } });
    for (const k of Object.keys(NEON_ROOM)) expect(k in out).toBe(false);
    expect(out.profileSpeciesInk).toEqual({ STRUCTURE: "#f472b6" });
    expect(out.candleUp).toBe("#26a69a");
  });
  it("leaves settings without the neon room untouched (same object)", () => {
    expect(liftNeonRoom(raw)).toBe(raw);
  });
});

describe("the dashboard and the Structure Profile use these owners", () => {
  const dash = readFileSync("src/components/chart/ChartsDashboard.tsx", "utf8");
  const chart = readFileSync("src/components/chart/MainChart.tsx", "utf8");
  it("applyChartSettings stores the trader's edit, not the shown settings", () => {
    expect(dash).toMatch(/traderEdit\(chartSettings, effChartSettings, next\)/);
    expect(dash).toMatch(/liftNeonRoom\(lsGet/);
    expect(dash).not.toMatch(/background: "#02060A"/);
  });
  it("a chosen Structure colour paints the Structure rows", () => {
    expect(chart).toMatch(/const legRgb = pk\.chosen\.VALUE \? pk\.rgb\("VALUE"\) : tpoPlateRamp\(legT\);/);
  });
});
