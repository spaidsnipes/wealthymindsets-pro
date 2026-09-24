import { describe, expect, it } from "vitest";

import { DEFAULT_STACK_PREFS, cycleOpacity, moveSpecies, orderStack, parseStackPrefs, stackOpacity } from "./profileStackPrefs";

describe("P-110 stack preferences — reorder and opacity, never geometry", () => {
  it("default order is the catalogue order; only present species are returned", () => {
    expect(orderStack(["VISIBLE_RANGE", "LIVING"], DEFAULT_STACK_PREFS)).toEqual(["LIVING", "VISIBLE_RANGE"]);
  });

  it("moving a lane changes the order the plan receives", () => {
    const p = moveSpecies(DEFAULT_STACK_PREFS, "VISIBLE_RANGE", -1);
    expect(orderStack(["LIVING", "COMPOSITE", "VISIBLE_RANGE"], p)).toEqual(["LIVING", "VISIBLE_RANGE", "COMPOSITE"]);
    expect(moveSpecies(DEFAULT_STACK_PREFS, "LIVING", -1)).toBe(DEFAULT_STACK_PREFS); // already innermost
  });

  it("opacity cycles 100 → 60 → 30 → 100 and never reaches zero (dim, never delete)", () => {
    let p = DEFAULT_STACK_PREFS;
    expect(stackOpacity("LIVING", p)).toBe(1);
    p = cycleOpacity(p, "LIVING"); expect(stackOpacity("LIVING", p)).toBe(0.6);
    p = cycleOpacity(p, "LIVING"); expect(stackOpacity("LIVING", p)).toBe(0.3);
    p = cycleOpacity(p, "LIVING"); expect(stackOpacity("LIVING", p)).toBe(1);
    expect(stackOpacity("COMPOSITE", parseStackPrefs(JSON.stringify({ opacity: { COMPOSITE: 0 } })))).toBe(0.3);
  });

  it("round-trips through storage and drops junk", () => {
    const p = cycleOpacity(moveSpecies(DEFAULT_STACK_PREFS, "COMPOSITE", -1), "COMPOSITE");
    expect(parseStackPrefs(JSON.stringify(p))).toEqual(p);
    expect(parseStackPrefs("nope")).toEqual(DEFAULT_STACK_PREFS);
    expect(parseStackPrefs(JSON.stringify({ order: ["BOGUS", "COMPOSITE"] })).order).toEqual(["COMPOSITE", "LIVING", "VISIBLE_RANGE"]);
  });
});

describe("H-601A · lane lock", () => {
  it("a locked lane's switch is removed from any preset / desk / restore set", async () => {
    const { toggleLock, withoutLocked, isLocked, parseStackPrefs, DEFAULT_STACK_PREFS } = await import("./profileStackPrefs");
    const locked = toggleLock(DEFAULT_STACK_PREFS, "LIVING");
    expect(isLocked("LIVING", locked)).toBe(true);
    const sent = withoutLocked({ LIVING_PROFILE: false, SESSION: true, COMPOSITE_PROFILE: true }, locked);
    expect(sent).toEqual({ SESSION: true, COMPOSITE_PROFILE: true });
    expect(isLocked("LIVING", toggleLock(locked, "LIVING"))).toBe(false);
    // Survives storage; unknown lanes are dropped.
    expect(parseStackPrefs(JSON.stringify({ ...locked, locked: ["LIVING", "BOGUS"] })).locked).toEqual(["LIVING"]);
  });
});
