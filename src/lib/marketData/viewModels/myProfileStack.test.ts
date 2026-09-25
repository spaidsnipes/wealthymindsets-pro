import { describe, expect, it } from "vitest";

import { captureMyStack, parseMyStack, stackableProfileIds } from "./myProfileStack";

describe("Save My Stack (P-110 family lock)", () => {
  it("only PROFILE-family switches are stackable — never a drawn range, never an order-flow tool", () => {
    const ids = stackableProfileIds();
    expect(ids).toContain("LIVING_PROFILE");
    expect(ids).toContain("TPO_PROFILE");
    expect(ids).not.toContain("DELTA_VP");
    expect(ids).not.toContain("ANCHORED_RANGE");
    expect(ids).not.toContain("ABSORPTION");
    expect(ids).not.toContain("QUESTION_LENS");
  });

  it("captures every stackable switch, on or off, and round-trips through storage", () => {
    const saved = captureMyStack({ LIVING_PROFILE: true, TPO_PROFILE: true, ABSORPTION: true });
    expect(saved.LIVING_PROFILE).toBe(true);
    expect(saved.SESSION).toBe(false);
    expect("ABSORPTION" in saved).toBe(false);
    expect(parseMyStack(JSON.stringify(saved))).toEqual(saved);
    expect(Object.values(saved).filter(Boolean)).toHaveLength(2);
  });

  it("drops junk and foreign keys instead of trusting them", () => {
    expect(parseMyStack("not json")).toBeNull();
    expect(parseMyStack(JSON.stringify({ ABSORPTION: true, NOPE: true }))).toBeNull();
    expect(parseMyStack(JSON.stringify({ LIVING_PROFILE: "yes", TPO_PROFILE: true }))).toEqual({ TPO_PROFILE: true });
  });
});
