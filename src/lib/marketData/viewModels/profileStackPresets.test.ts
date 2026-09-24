import { describe, expect, it } from "vitest";

import { stackableProfileIds } from "./myProfileStack";
import { PROFILE_FAMILY } from "./selectProfileMenu";
import { PROFILE_PRESETS, matchPreset, presetSwitches } from "./profileStackPresets";

describe("H-601A · profile stack presets", () => {
  it("names the Founder's six presets, in order", () => {
    expect(PROFILE_PRESETS.map(p => p.label)).toEqual(["Clean", "Day Trader", "Auction", "Order Flow", "Memory", "Research"]);
  });

  it("only ever switches PROFILE-family toggles — never a lens, a tool or a drawn range", () => {
    const stackable = new Set(stackableProfileIds());
    for (const p of PROFILE_PRESETS) {
      for (const id of p.on) {
        expect(PROFILE_FAMILY[id], `${p.id} · ${id}`).toBe("PROFILE");
        expect(stackable.has(id), `${p.id} · ${id} is a drag, not a toggle`).toBe(true);
      }
      expect(Object.keys(presetSwitches(p.id)).sort()).toEqual([...stackable].sort());
    }
  });

  it("Clean turns every profile off", () => {
    expect(Object.values(presetSwitches("CLEAN")).every(v => v === false)).toBe(true);
  });

  it("the lit preset is compiled from the switches, and a hand flip unlights it", () => {
    for (const p of PROFILE_PRESETS) expect(matchPreset(presetSwitches(p.id))).toBe(p.id);
    const auction = presetSwitches("AUCTION");
    expect(matchPreset({ ...auction, LIVING_PROFILE: true })).toBeNull();
  });

  it("no two presets are the same stack", () => {
    const keys = PROFILE_PRESETS.map(p => [...p.on].sort().join(","));
    expect(new Set(keys).size).toBe(keys.length);
  });
});
