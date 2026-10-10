import { describe, expect, it } from "vitest";
import { applyProfilePreset, clampBubbleScale, clampFootprintNumberStep, clampWallThickness, footprintNumberPx, inksDistinct, lawfulPair, lawfulSettings, OPPOSED_PAIRS, PROFILE_PALETTE_KEYS, PROFILE_PRESET_RED_GREEN, rgbOf, volumeInk } from "./appearanceLaw";
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

describe("Slice B knobs stay inside their floors", () => {
  it("bubble size, footprint step and wall thickness clamp to their ranges", () => {
    expect(clampBubbleScale(undefined)).toBe(1); expect(clampBubbleScale(9)).toBe(1.4); expect(clampBubbleScale(0)).toBe(0.6);
    expect(clampFootprintNumberStep(5)).toBe(2); expect(clampFootprintNumberStep(-5)).toBe(-1); expect(clampFootprintNumberStep("x")).toBe(0);
    expect(clampWallThickness(undefined)).toBe(1); expect(clampWallThickness(10)).toBe(3); expect(clampWallThickness(0)).toBe(1);
  });
  it("a footprint number never grows past its row and never shrinks below the number floor", () => {
    expect(footprintNumberPx(11, 18, 0, 9)).toBe(11);
    expect(footprintNumberPx(11, 18, 2, 9)).toBe(13);
    expect(footprintNumberPx(10, 11, 2, 9)).toBe(11);   // row is 11px tall
    expect(footprintNumberPx(9, 9, -1, 9)).toBe(9);     // floor holds
  });
  it("the red / green profile preset keeps up ≠ down and a POC that is neither; the room preset removes the keys", () => {
    const p = PROFILE_PRESET_RED_GREEN;
    expect(inksDistinct(p.wm_vp_up, p.wm_vp_dn)).toBe(true);
    expect(inksDistinct(p.wm_vp_poc, p.wm_vp_up)).toBe(true);
    expect(inksDistinct(p.wm_vp_poc, p.wm_vp_dn)).toBe(true);
    expect(inksDistinct(p.wm_vp_poc, p.wm_vp_vah)).toBe(true);
    const m = new Map<string, string>(); let told = 0;
    const store = { setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
    applyProfilePreset(store, p, () => told++);
    expect([...m.keys()].sort()).toEqual([...PROFILE_PALETTE_KEYS].sort());
    applyProfilePreset(store, null, () => told++);
    expect(m.size).toBe(0); expect(told).toBe(2);
  });
});
