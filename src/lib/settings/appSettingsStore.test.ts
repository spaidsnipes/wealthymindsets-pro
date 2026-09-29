import { describe, expect, it, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { readAppSettings, writeAppSettings } from "./appSettingsStore";

describe("wm_settings has one writer (G12, 2026-09-29)", () => {
  beforeEach(() => {
    const mem = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) });
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  });
  it("a write touches only the keys it names and announces once", () => {
    writeAppSettings({ defaultTF: "5m", chartTheme: "green-red" });
    writeAppSettings({ chartTheme: "custom" });
    expect(readAppSettings()).toEqual({ defaultTF: "5m", chartTheme: "custom" });
    expect((window as unknown as { dispatchEvent: ReturnType<typeof vi.fn> }).dispatchEvent).toHaveBeenCalledTimes(2);
  });
  it("no other module writes the key by hand", () => {
    for (const f of ["src/components/chart/ChartsDashboard.tsx", "src/components/layout/shellPanels.tsx"]) {
      expect(readFileSync(f, "utf8")).not.toContain('localStorage.setItem("wm_settings"');
    }
  });
});
