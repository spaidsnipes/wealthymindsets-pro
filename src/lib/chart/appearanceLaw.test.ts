import { describe, expect, it } from "vitest";
import { inksDistinct, lawfulPair, lawfulSettings, OPPOSED_PAIRS, rgbOf, volumeInk } from "./appearanceLaw";
import { DEFAULT_CHART_SETTINGS, FLOW_COLOR_DEFAULTS, VOLUME_COLOR_PICKER_DEFAULTS } from "@/components/chart/ChartSettingsModal";

const ROOM = { ...DEFAULT_CHART_SETTINGS, ...FLOW_COLOR_DEFAULTS, ...VOLUME_COLOR_PICKER_DEFAULTS } as Record<string, unknown>;

describe("appearance law — no preset or pick may make two opposed objects identical", () => {
  it("reads colours and judges distance", () => {
    expect(rgbOf("#ff0000")).toEqual([255, 0, 0]);
    expect(rgbOf("#f00")).toEqual([255, 0, 0]);
    expect(rgbOf("rgba(196,165,116,0.38)")).toEqual([196, 165, 116]);
    expect(inksDistinct("#22c55e", "#ef4444")).toBe(true);
    expect(inksDistinct("#22c55e", "#22C55E")).toBe(false);
    expect(inksDistinct("#22c55e", "#25c860")).toBe(false); // too close to tell apart
  });
  it("every opposed pair of the room's own defaults is distinct (bull ≠ bear, up ≠ down, buy ≠ sell)", () => {
    for (const [a, b] of OPPOSED_PAIRS) {
      const x = ROOM[a] as string | undefined, y = ROOM[b] as string | undefined;
      if (typeof x === "string" && typeof y === "string") expect(inksDistinct(x, y), `${a} vs ${b}`).toBe(true);
    }
  });
  it("a pair made identical falls back to the room's pair WHOLE; a distinct pick is kept; defaults keep identity", () => {
    expect(lawfulPair({ a: "#ff0000", b: "#ff0000" }, { a: "#00ff00", b: "#ff0000" })).toEqual({ a: "#00ff00", b: "#ff0000" });
    const s = { ...DEFAULT_CHART_SETTINGS, candleUp: "#123456", candleDown: "#123456", volumeUp: "#00ff00", volumeDown: "#ff0000" };
    const out = lawfulSettings(s, ROOM)!;
    expect(out.candleUp).toBe(DEFAULT_CHART_SETTINGS.candleUp);
    expect(out.candleDown).toBe(DEFAULT_CHART_SETTINGS.candleDown);
    expect(out.volumeUp).toBe("#00ff00");
    expect(lawfulSettings(DEFAULT_CHART_SETTINGS, ROOM)).toBe(DEFAULT_CHART_SETTINGS);
    // A trader who sets only ONE half to the other's colour is caught too.
    const half = { ...DEFAULT_CHART_SETTINGS, deltaBuy: FLOW_COLOR_DEFAULTS.deltaSell };
    expect(lawfulSettings(half, ROOM)!.deltaBuy).toBe(FLOW_COLOR_DEFAULTS.deltaBuy);
  });
  it("a trader's volume colour keeps the room's alpha (bars stay behind price)", () => {
    expect(volumeInk("#00ff00", "rgba(196,165,116,0.38)")).toBe("rgba(0,255,0,0.38)");
    expect(volumeInk(undefined, "rgba(196,165,116,0.38)")).toBe("rgba(196,165,116,0.38)");
  });
});
