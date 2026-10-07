import { describe, expect, it } from "vitest";
import { ZONE_STATE_WORDS, zoneStateWords } from "./selectZoneLifecycle";
import { MARKET_OBJECT_STATES } from "@/lib/marketData/marketObjectKinds";

describe("A9 — the zone state in the trader's words (2026-10-07)", () => {
  it("a swept-but-unbroken zone reads SWEPT · STILL VALID, never CONSUMED", () => {
    expect(zoneStateWords("CONSUMED")).toBe("SWEPT · STILL VALID");
    expect(Object.values(ZONE_STATE_WORDS)).not.toContain("CONSUMED");
  });
  it("every state has a word, and only INVALID says BROKEN", () => {
    for (const s of MARKET_OBJECT_STATES) expect(zoneStateWords(s).length).toBeGreaterThan(3);
    expect(MARKET_OBJECT_STATES.filter(s => zoneStateWords(s) === "BROKEN")).toEqual(["INVALID"]);
  });
});
