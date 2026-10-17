import { describe, expect, it } from "vitest";
import { INVENTION_SWITCH_KEYS, LAYER_RESET_EPOCH, LAYER_RESET_MARK, resetInventionSwitchesOnce } from "./firstVisitLayers";

const mem = (init: Record<string, string>) => {
  const m = new Map(Object.entries(init));
  return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};

describe("one reset of a device's invention switches, once", () => {
  it("forgets every saved invention switch once, keeps settings, and never again", () => {
    const s = mem({ wm_ofProfileDna: "true", wm_ofTpoProfile: "true", wm_extHours: "true", wm_tourSeen: "true" });
    expect(resetInventionSwitchesOnce(s)).toBe(true);
    expect(s.m.has("wm_ofProfileDna")).toBe(false);
    expect(s.m.get("wm_extHours")).toBe("true");
    expect(s.m.get("wm_tourSeen")).toBe("true");
    expect(s.m.get(LAYER_RESET_MARK)).toBe(LAYER_RESET_EPOCH);
    s.setItem("wm_ofProfileDna", "true");
    expect(resetInventionSwitchesOnce(s)).toBe(false);
    expect(s.m.get("wm_ofProfileDna")).toBe("true");
  });
  it("never lists a setting that is not an invention", () => {
    expect(INVENTION_SWITCH_KEYS).not.toContain("wm_extHours");
    expect(resetInventionSwitchesOnce(null)).toBe(false);
  });
});
