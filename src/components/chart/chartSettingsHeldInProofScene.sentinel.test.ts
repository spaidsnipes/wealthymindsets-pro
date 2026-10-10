/**
 * CHART SETTINGS ARE HELD INSIDE A PROOF SCENE (coordinator, 2026-10-10).
 *
 * Every lane reads glass in `scene=clean` / `scene=verify` in the Founder's own
 * Chrome. A dial moved there (per-species profile opacity, order-line looks,
 * candle swatches …) must live for that page load only and never reach the
 * Founder's saved `wm_chartSettings`. Today that holds because ChartSettings
 * persist through ONE hook, and the hook returns before it writes when the
 * scene holds writes. This pins all three facts.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const DASH = readFileSync(path.join(process.cwd(), "src/components/chart/ChartsDashboard.tsx"), "utf8");
const MODAL = readFileSync(path.join(process.cwd(), "src/components/chart/ChartSettingsModal.tsx"), "utf8");

describe("ChartSettings never write back inside a proof scene", () => {
  it("reads the sources", () => {
    expect(DASH.length).toBeGreaterThan(20000);
    expect(MODAL.length).toBeGreaterThan(5000);
  });

  it("the persist hook returns before localStorage when the scene holds writes", () => {
    const a = DASH.indexOf("function usePersistOnChange(");
    expect(a).toBeGreaterThan(-1);
    const hook = DASH.slice(a, DASH.indexOf("\n}\n", a));
    const held = hook.indexOf("if (proofSceneHoldsWrites()) return;");
    const write = hook.indexOf("localStorage.setItem(");
    expect(held).toBeGreaterThan(-1);
    expect(write).toBeGreaterThan(held);
  });

  it("chart settings persist only through that hook", () => {
    expect(DASH).toContain('usePersistOnChange("wm_chartSettings", chartSettings);');
    const direct = DASH.match(/localStorage\.setItem\(\s*["']wm_chartSettings["']/g) ?? [];
    expect(direct).toHaveLength(0);
    expect(DASH).not.toMatch(/lsSet\(\s*["']wm_chartSettings["']/);
  });

  it("the settings dials write through onSettingsChange, never storage", () => {
    expect(MODAL).toContain("set({ profileSpeciesOpacity: lawfulSpeciesOpacity(");
    expect(MODAL).not.toMatch(/localStorage\.setItem\(\s*["']wm_chartSettings/);
  });
});
